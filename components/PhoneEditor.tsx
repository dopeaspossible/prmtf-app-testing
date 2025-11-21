
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhoneModel, DesignState } from '../types';

interface PhoneEditorProps {
  model: PhoneModel;
  design: DesignState;
  onDesignChange: (newDesign: DesignState) => void;
  onUploadClick?: () => void;
}

export const PhoneEditor: React.FC<PhoneEditorProps> = ({
  model,
  design,
  onDesignChange,
  onUploadClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialDesignX: number; initialDesignY: number } | null>(null);

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

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, design, onDesignChange, editorScale]);


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

  // Calculate Center Point for Image Placement
  const centerX = (model.minX || 0) + model.width / 2;
  const centerY = (model.minY || 0) + model.height / 2;
  
  // Default image size if not loaded yet (fallback)
  const imgW = design.imgWidth || 300;
  const imgH = design.imgHeight || 500;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-slate-200/50 overflow-hidden select-none"
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
              <line x1="0" y1="0" x2="8" y2="8" stroke="#f87171" strokeWidth="0.8" opacity="0.85" />
            </pattern>
            
            <linearGradient id="glossGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="50%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
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
             <rect x={model.minX} y={model.minY} width={model.width} height={model.height} fill="transparent" />

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
               stroke="#1e293b" 
               strokeWidth="2"
               className="drop-shadow-lg"
             />
            
             {/* Camera Bump */}
             <path 
               d={model.cameraPath} 
               fill="#0f172a" 
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
                   stroke="#ef4444" 
                   strokeWidth="2" 
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
