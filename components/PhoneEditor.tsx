
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhoneModel, DesignState } from '../types';

interface PhoneEditorProps {
  model: PhoneModel;
  design: DesignState;
  onDesignChange: (newDesign: DesignState) => void;
  onUploadClick?: () => void;
  onTextSelect?: (textId: string | null) => void;
  selectedTextId?: string | null;
}

export const PhoneEditor: React.FC<PhoneEditorProps> = ({
  model,
  design,
  onDesignChange,
  onUploadClick,
  onTextSelect,
  selectedTextId: externalSelectedTextId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Drag State for Image
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialDesignX: number; initialDesignY: number } | null>(null);

  // Text Drag State
  const [draggedTextId, setDraggedTextId] = useState<string | null>(null);
  const textDragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number } | null>(null);
  const [internalSelectedTextId, setInternalSelectedTextId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const justFinishedRotatingRef = useRef(false);
  
  // Use external selectedTextId if provided, otherwise use internal state
  const selectedTextId = externalSelectedTextId !== undefined ? externalSelectedTextId : internalSelectedTextId;
  
  const setSelectedTextId = (id: string | null) => {
    setInternalSelectedTextId(id);
    if (onTextSelect) onTextSelect(id);
  };
  
  // Sync internal state when external prop changes
  useEffect(() => {
    if (externalSelectedTextId !== undefined) {
      setInternalSelectedTextId(externalSelectedTextId);
    }
  }, [externalSelectedTextId]);

  // Pinch Zoom State
  const [startDistance, setStartDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState<number>(1);

  // Auto-resize logic: Use ResizeObserver to strictly monitor container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect for accurate inner dimensions
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate the scale to fit the phone into 85% of the container height
  const editorScale = React.useMemo(() => {
    if (containerSize.height === 0 || model.height === 0) return 1;
    
    // Available space calculation
    const availableH = containerSize.height * 0.85;
    const availableW = containerSize.width * 0.85;

    const heightRatio = availableH / model.height;
    const widthRatio = availableW / model.width;
    
    // Use the smaller ratio to ensure it fits entirely
    return Math.min(heightRatio, widthRatio);
  }, [containerSize, model.width, model.height]);


  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    // Determine zoom speed based on modifier
    const scaleFactor = (e.ctrlKey || e.metaKey) ? 0.1 : 0.05;
    
    const delta = -Math.sign(e.deltaY);
    const newScale = Math.max(0.1, Math.min(10, design.scale + delta * scaleFactor));
    
    onDesignChange({ ...design, scale: newScale });
  }, [design, onDesignChange]);

  // Attach non-passive event listener for wheel zoom to prevent browser scroll
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // --- DRAG LOGIC (MOUSE) ---

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't handle image drag if we're clicking on text or if text is being dragged
    if (draggedTextId || selectedTextId) {
      return;
    }
    
    // Check if the click target is a text element or its child
    const target = e.target as HTMLElement | SVGElement;
    const targetElement = target as any;
    
    // Check for text element data attribute
    if (targetElement?.getAttribute?.('data-text-element')) {
      return;
    }
    
    // Check if target is inside a text element group
    let parent = targetElement?.parentElement;
    while (parent) {
      if (parent.getAttribute?.('data-text-element')) {
        return;
      }
      if (parent.tagName === 'svg') break;
      parent = parent.parentElement;
    }
    
    if (!design.imageSrc) {
      // If no image, let the click bubble up to trigger upload
      if (onUploadClick) {
        onUploadClick();
      }
      return;
    }
    e.preventDefault(); 
    setIsDragging(true);
    // Store initial state to avoid closure staleness issues during drag
    dragStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      initialDesignX: design.x, 
      initialDesignY: design.y 
    };
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // Don't move image if text is being dragged
      if (draggedTextId) {
        setIsDragging(false);
        dragStartRef.current = null;
        return;
      }
      
      if (!isDragging || !dragStartRef.current) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // CRITICAL: Adjust delta by editorScale to ensure 1:1 visual tracking
      const scaledDx = dx / editorScale;
      const scaledDy = dy / editorScale;

      onDesignChange({ 
        ...design, 
        x: dragStartRef.current.initialDesignX + scaledDx, 
        y: dragStartRef.current.initialDesignY + scaledDy 
      });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging && !draggedTextId) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, design, onDesignChange, editorScale, draggedTextId]);


  // --- TOUCH LOGIC (MOBILE) ---

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
     if (!design.imageSrc) return;
     
     // Pinch Zoom Start
     if (e.touches.length === 2) {
        setIsDragging(false); 
        dragStartRef.current = null;
        
        const dist = getTouchDistance(e.touches);
        setStartDistance(dist);
        setInitialScale(design.scale);
        return;
     }

     // Pan Start
     if (e.touches.length === 1) {
         setIsDragging(true);
         const touch = e.touches[0];
         dragStartRef.current = { 
            x: touch.clientX, 
            y: touch.clientY, 
            initialDesignX: design.x, 
            initialDesignY: design.y 
        };
     }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Pinch Zoom Move
    if (e.touches.length === 2 && startDistance !== null) {
        e.preventDefault(); // Prevent default browser zoom
        const currentDist = getTouchDistance(e.touches);
        const ratio = currentDist / startDistance;
        const newScale = Math.max(0.1, Math.min(10, initialScale * ratio));
        onDesignChange({ ...design, scale: newScale });
        return;
    }

    // Pan Move
    if (isDragging && e.touches.length === 1 && dragStartRef.current) {
        const touch = e.touches[0];
        const dx = touch.clientX - dragStartRef.current.x;
        const dy = touch.clientY - dragStartRef.current.y;

        const scaledDx = dx / editorScale;
        const scaledDy = dy / editorScale;

        onDesignChange({ 
            ...design, 
            x: dragStartRef.current.initialDesignX + scaledDx, 
            y: dragStartRef.current.initialDesignY + scaledDy 
        });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setStartDistance(null);
    dragStartRef.current = null;
  };

  // --- TEXT DRAG LOGIC ---
  const handleTextMouseDown = (e: React.MouseEvent, textId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Prevent image drag from starting
    setIsDragging(false);
    dragStartRef.current = null;
    
    const textEl = design.textElements?.find(t => t.id === textId);
    if (!textEl) return;
    
    setDraggedTextId(textId);
    setSelectedTextId(textId);
    if (onTextSelect) onTextSelect(textId);
    textDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: textEl.x,
      initialY: textEl.y
    };
  };

  useEffect(() => {
    const handleTextMouseMove = (e: MouseEvent) => {
      if (!draggedTextId || !textDragStartRef.current) return;
      
      const dx = e.clientX - textDragStartRef.current.x;
      const dy = e.clientY - textDragStartRef.current.y;
      
      const scaledDx = dx / editorScale;
      const scaledDy = dy / editorScale;
      
      const updatedTextElements = design.textElements?.map(textEl => {
        if (textEl.id === draggedTextId) {
          return {
            ...textEl,
            x: textDragStartRef.current!.initialX + scaledDx,
            y: textDragStartRef.current!.initialY + scaledDy
          };
        }
        return textEl;
      });
      
      onDesignChange({
        ...design,
        textElements: updatedTextElements
      });
    };

    const handleTextMouseUp = () => {
      setDraggedTextId(null);
      textDragStartRef.current = null;
    };

    if (draggedTextId) {
      window.addEventListener('mousemove', handleTextMouseMove);
      window.addEventListener('mouseup', handleTextMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleTextMouseMove);
      window.removeEventListener('mouseup', handleTextMouseUp);
    };
  }, [draggedTextId, design, onDesignChange, editorScale]);

  const handleTextWheel = (e: React.WheelEvent, textId: string) => {
    e.stopPropagation();
    const textEl = design.textElements?.find(t => t.id === textId);
    if (!textEl) return;
    
    const scaleFactor = e.ctrlKey || e.metaKey ? 0.05 : 0.1;
    const delta = -Math.sign(e.deltaY);
    const newScale = Math.max(0.1, Math.min(5, textEl.scale + delta * scaleFactor));
    
    const updatedTextElements = design.textElements?.map(t => 
      t.id === textId ? { ...t, scale: newScale } : t
    );
    
    onDesignChange({
      ...design,
      textElements: updatedTextElements
    });
  };


  // Calculate Center Point for Image Placement
  const centerX = (model.minX || 0) + model.width / 2;
  const centerY = (model.minY || 0) + model.height / 2;
  
  // Default image size if not loaded yet (fallback)
  const imgW = design.imgWidth || 300;
  const imgH = design.imgHeight || 500;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-[#E5E5EA]/50 overflow-hidden select-none"
      onClick={(e) => {
        // Don't deselect if we're currently rotating or just finished rotating
        if (isRotating || justFinishedRotatingRef.current) return;
        
        // Only deselect if clicking on background, not on text elements
        const target = e.target as HTMLElement;
        if (!target.closest('[data-text-element]') && !target.closest('g[data-text-element]')) {
          setSelectedTextId(null);
          if (onTextSelect) onTextSelect(null);
        }
      }}
    >
      
      {/* Main SVG Container */}
      <div 
        className="relative shadow-2xl transition-transform duration-75 ease-out origin-center"
        style={{ 
          width: `${model.width}px`, 
          height: `${model.height}px`,
          transform: `scale(${editorScale})`
        }}
      >
        <svg 
          viewBox={`${model.minX || 0} ${model.minY || 0} ${model.width} ${model.height}`}
          width={model.width}
          height={model.height}
          className="block overflow-visible"
        >
          <defs>
            <clipPath id="phoneMask">
              <path d={model.svgPath} />
            </clipPath>
            
            {model.safeZonePath && (
              <mask id="unsafeZoneMask">
                <path d={model.svgPath} fill="white" />
                <path d={model.safeZonePath} fill="black" />
              </mask>
            )}
            
            {/* Hatching pattern for unsafe zone */}
            <pattern id="unsafeZonePattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="8" y2="8" stroke="#FF3B30" strokeWidth="0.8" opacity="0.85" />
            </pattern>
            
            <linearGradient id="glossGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="50%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Drop shadow filter for text and rotation icon */}
            <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* --- LAYER 1: User Image (Clipped) --- */}
          <g 
            clipPath="url(#phoneMask)"
            className="cursor-move"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
             {/* Invisible Rect to catch events even if image is small/missing */}
             <rect 
               x={model.minX} 
               y={model.minY} 
               width={model.width} 
               height={model.height} 
               fill="transparent"
               style={{ 
                 pointerEvents: draggedTextId || selectedTextId ? 'none' : 'all'
               }}
             />

             {design.imageSrc ? (
               <image
                 href={design.imageSrc}
                 x={0}
                 y={0}
                 width={imgW}
                 height={imgH}
                 transform={`translate(${centerX}, ${centerY}) translate(${design.x}, ${design.y}) rotate(${design.rotation}) scale(${design.scale}) translate(${-imgW/2}, ${-imgH/2})`}
                 style={{ pointerEvents: 'none' }} // Let the Group catch events
               />
             ) : (
                // Placeholder Background if no image - Clickable
                <rect 
                  x={model.minX} y={model.minY} 
                  width={model.width} height={model.height} 
                  fill="#f8fafc" 
                  className="cursor-pointer"
                  onClick={onUploadClick}
                />
             )}
          </g>

          {/* --- LAYER 2: Empty State Overlay (Text) - Clickable --- */}
          {!design.imageSrc && (
             <foreignObject 
               x={model.minX} 
               y={model.minY} 
               width={model.width} 
               height={model.height} 
               className="cursor-pointer"
               onClick={onUploadClick}
             >
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center hover:text-indigo-500 transition-colors">
                    <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium">Nahrať obrázok</p>
                </div>
             </foreignObject>
          )}

          {/* --- LAYER 2.5: Text Elements --- */}
          <g 
            clipPath="url(#phoneMask)"
            style={{ pointerEvents: 'all' }}
          >
            {design.textElements && design.textElements.map((textEl) => {
              const textX = centerX + textEl.x;
              const textY = centerY + textEl.y;
              const fontSize = textEl.fontSize * textEl.scale;
              
              return (
                <g
                  key={textEl.id}
                  data-text-element={textEl.id}
                  transform={`translate(${textX}, ${textY}) rotate(${textEl.rotation})`}
                  className="cursor-move"
                  onMouseDown={(e) => handleTextMouseDown(e, textEl.id)}
                  onWheel={(e) => handleTextWheel(e, textEl.id)}
                  style={{ pointerEvents: 'all' }}
                >
                <text
                  x="0"
                  y="0"
                  fontSize={fontSize}
                  fontFamily={textEl.fontFamily}
                  fill={textEl.color || '#1e293b'}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  data-text-element={textEl.id}
                  style={{ 
                    userSelect: 'none',
                    pointerEvents: 'all',
                    fontWeight: 600
                  }}
                >
                  {textEl.text}
                </text>
                
                {/* Selection indicator - rectangle matching text bounds */}
                {selectedTextId === textEl.id && (() => {
                  // Estimate text width more accurately
                  // For most fonts, average character width is about 0.55-0.65 of fontSize
                  const avgCharWidth = fontSize * 0.6; // Conservative estimate
                  const estimatedTextWidth = Math.max(textEl.text.length * avgCharWidth, fontSize * 0.8);
                  const textHeight = fontSize * 1.2; // Account for ascenders/descenders
                  const padding = fontSize * 0.3; // Padding around text
                  
                  return (
                    <rect
                      x={-estimatedTextWidth / 2 - padding}
                      y={-textHeight / 2 - padding}
                      width={estimatedTextWidth + padding * 2}
                      height={textHeight + padding * 2}
                      fill="none"
                      stroke="#FF3B30"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      rx="6"
                      ry="6"
                      style={{ 
                        pointerEvents: 'none',
                        opacity: 0.8
                      }}
                    />
                  );
                })()}
                
                {/* Rotation controls - More visible and user-friendly */}
                {selectedTextId === textEl.id && (
                  <g style={{ pointerEvents: 'all' }}>
                    {/* Rotation line - longer and more visible */}
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2={-fontSize * 1.2 - 25}
                      stroke="white"
                      strokeWidth="3"
                      strokeDasharray="5 3"
                      filter="url(#textShadow)"
                      style={{ pointerEvents: 'none', opacity: 0.8 }}
                    />
                    
                    {/* Outer glow circle for better visibility */}
                    <circle
                      cx="0"
                      cy={-fontSize * 1.2 - 25}
                      r="12"
                      fill="#007AFF"
                      opacity="0.2"
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    {/* Rotation icon - circular arrow (clickable) */}
                    <g
                      transform={`translate(0, ${-fontSize * 1.2 - 25})`}
                      className="cursor-grab active:cursor-grabbing"
                      style={{ pointerEvents: 'all' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        setIsRotating(true);
                        
                        const svgElement = (e.currentTarget as SVGGElement).ownerSVGElement;
                        if (!svgElement) return;
                        
                        // Get the text center in SVG coordinates
                        const textX = centerX + textEl.x;
                        const textY = centerY + textEl.y;
                        
                        // Convert SVG point to screen coordinates
                        const svgPoint = svgElement.createSVGPoint();
                        svgPoint.x = textX;
                        svgPoint.y = textY;
                        const ctm = svgElement.getScreenCTM();
                        if (!ctm) return;
                        
                        const screenPoint = svgPoint.matrixTransform(ctm);
                        const centerScreenX = screenPoint.x;
                        const centerScreenY = screenPoint.y;
                        
                        const startRotation = textEl.rotation;
                        
                        // Calculate angle from center to mouse position
                        const getAngle = (mouseX: number, mouseY: number) => {
                          return Math.atan2(mouseY - centerScreenY, mouseX - centerScreenX) * (180 / Math.PI);
                        };
                        
                        const initialAngle = getAngle(e.clientX, e.clientY);
                        
                        const handleRotateMove = (moveEvent: MouseEvent) => {
                          const currentAngle = getAngle(moveEvent.clientX, moveEvent.clientY);
                          let angleDiff = currentAngle - initialAngle;
                          
                          // Normalize angle difference to handle wrap-around
                          while (angleDiff > 180) angleDiff -= 360;
                          while (angleDiff < -180) angleDiff += 360;
                          
                          const newRotation = (startRotation + angleDiff + 360) % 360;
                          
                          const updatedTextElements = design.textElements?.map(t => 
                            t.id === textEl.id ? { ...t, rotation: newRotation } : t
                          );
                          
                          onDesignChange({
                            ...design,
                            textElements: updatedTextElements
                          });
                        };
                        
                        const handleRotateUp = () => {
                          setIsRotating(false);
                          // Ensure text remains selected after rotation
                          setSelectedTextId(textEl.id);
                          // Prevent deselection for a brief moment after rotation ends
                          justFinishedRotatingRef.current = true;
                          setTimeout(() => {
                            justFinishedRotatingRef.current = false;
                          }, 100);
                          window.removeEventListener('mousemove', handleRotateMove);
                          window.removeEventListener('mouseup', handleRotateUp);
                        };
                        
                        window.addEventListener('mousemove', handleRotateMove);
                        window.addEventListener('mouseup', handleRotateUp);
                      }}
                    >
                      {/* Rotation icon - circular arrow (almost complete circle) */}
                      <path
                        d="M 0 -4.5 A 4.5 4.5 0 1 1 -1.5 4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                        filter="url(#textShadow)"
                      />
                      {/* Arrow head pointing clockwise */}
                      <path
                        d="M -2.5 3.5 L -1.5 4 L -1 3"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        filter="url(#textShadow)"
                      />
                    </g>
                    
                    {/* Helpful text label */}
                    <text
                      x="0"
                      y={-fontSize * 1.2 - 40}
                      fontSize="11"
                      fill="white"
                      textAnchor="middle"
                      fontWeight="600"
                      filter="url(#textShadow)"
                      style={{ 
                        pointerEvents: 'none', 
                        userSelect: 'none',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif'
                      }}
                    >
                      Otočiť
                    </text>
                    
                  </g>
                )}
                </g>
              );
            })}
          </g>

          {/* --- LAYER 3: Phone Overlays (Borders, Camera, Gloss) --- */}
          <g className="pointer-events-none">
             {/* Unsafe Zone Pattern (Thin diagonal lines showing area between phone edge and safe zone) */}
             {model.safeZonePath && (
                <path 
                   d={model.svgPath} 
                   fill="url(#unsafeZonePattern)" 
                   mask="url(#unsafeZoneMask)"
                />
             )}
             
             {/* Phone Outline Border */}
             <path 
               d={model.svgPath} 
               fill="none" 
               stroke="#000000" 
               strokeWidth="2"
               className="drop-shadow-sm"
             />
            
             {/* Camera Bump */}
             <path 
               d={model.cameraPath} 
               fill="#000000" 
               className="opacity-90"
             />

             {/* Glossy Overlay Reflection */}
             <path
                d={model.svgPath}
                fill="url(#glossGradient)"
                className="opacity-10 mix-blend-screen"
             />

             {/* Safe Zone (Dashed Red Line) */}
             {model.safeZonePath && (
                <path 
                   d={model.safeZonePath} 
                   fill="none" 
                   stroke="#FF3B30" 
                   strokeWidth="2.5" 
                   strokeDasharray="4 2"
                   className="opacity-100"
                />
             )}
          </g>
        </svg>
      </div>
    </div>
  );
};
