
import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { PhoneEditor } from './components/PhoneEditor';
import { PhoneModel, DesignState, ViewMode, OrderSubmission } from './types';
import { syncTemplates, syncOrders, syncAllOrders } from './services/firebaseService';

const INITIAL_DESIGN: DesignState = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
  imageSrc: null
};

// Storage Keys
const STORAGE_KEYS = {
  MODELS: 'casecraft_models_v1',
  ORDERS: 'casecraft_orders_v1'
};


const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDITOR);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [_firebaseDisabled, setFirebaseDisabled] = useState(false);
  const [showQuotaWarning, setShowQuotaWarning] = useState(false);
  
  // State for models - Init from LocalStorage or empty array
  const [availableModels, setAvailableModels] = useState<PhoneModel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODELS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading models", e);
      return [];
    }
  });

  const [selectedModel, setSelectedModel] = useState<PhoneModel | null>(availableModels[0] || null);
  
  const [design, setDesign] = useState<DesignState>(INITIAL_DESIGN);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Orders State - Init from LocalStorage
  const [orders, setOrders] = useState<OrderSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading orders", e);
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [, setIsSyncing] = useState(false);
  const isUpdatingFromFirebase = useRef(false);
  const isUpdatingTemplatesFromFirebase = useRef(false);

  // --- FIREBASE SYNC: Load data on mount ---
  useEffect(() => {
    const loadFromFirebase = async () => {
      setIsSyncing(true);
      try {
        // Load templates from Firebase
        const firebaseTemplates = await syncTemplates.load();
        if (firebaseTemplates && firebaseTemplates.length > 0) {
          setAvailableModels(firebaseTemplates);
          if (firebaseTemplates[0]) {
            setSelectedModel(firebaseTemplates[0]);
          }
          // Also save to localStorage as backup
          localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(firebaseTemplates));
        } else {
          // Fallback to localStorage if Firebase is empty
          const localTemplates = localStorage.getItem(STORAGE_KEYS.MODELS);
          if (localTemplates) {
            const parsed = JSON.parse(localTemplates);
            if (parsed.length > 0) {
              // Sync local templates to Firebase
              await syncTemplates.save(parsed);
            }
          }
        }

        // Load orders from Firebase
        const firebaseOrders = await syncOrders.load();
        if (firebaseOrders && firebaseOrders.length > 0) {
          setOrders(firebaseOrders);
          // Also save to localStorage as backup
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(firebaseOrders));
        } else {
          // Fallback to localStorage if Firebase is empty
          const localOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
          if (localOrders) {
            const parsed = JSON.parse(localOrders);
            if (parsed.length > 0) {
              // Sync local orders to Firebase
              await syncAllOrders(parsed);
            }
          }
        }
      } catch (error) {
        console.error('Error loading from Firebase:', error);
        // Fallback to localStorage
        const localTemplates = localStorage.getItem(STORAGE_KEYS.MODELS);
        const localOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
        if (localTemplates) {
          setAvailableModels(JSON.parse(localTemplates));
        }
        if (localOrders) {
          setOrders(JSON.parse(localOrders));
        }
      } finally {
        setIsSyncing(false);
      }
    };

    loadFromFirebase();

    // Set up real-time subscriptions
    const unsubscribeTemplates = syncTemplates.subscribe((templates) => {
      if (templates && templates.length >= 0) {
        isUpdatingTemplatesFromFirebase.current = true;
        setAvailableModels(templates);
        localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(templates));
        // Reset flag after a short delay to allow state update
        setTimeout(() => {
          isUpdatingTemplatesFromFirebase.current = false;
        }, 100);
      }
    });

    const unsubscribeOrders = syncOrders.subscribe((firebaseOrders) => {
      if (firebaseOrders && firebaseOrders.length >= 0) {
        isUpdatingFromFirebase.current = true;
        setOrders(firebaseOrders);
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(firebaseOrders));
        // Reset flag after a short delay to allow state update
        setTimeout(() => {
          isUpdatingFromFirebase.current = false;
        }, 100);
      }
    });

    // Check initial Firebase status
    const checkStatus = () => {
      try {
        const status = localStorage.getItem('casecraft_firebase_disabled');
        if (status === 'true') {
          setFirebaseDisabled(true);
        }
      } catch {
        // Ignore
      }
    };
    checkStatus();

    // Listen for quota exceeded events
    const handleQuotaExceeded = () => {
      setFirebaseDisabled(true);
      setShowQuotaWarning(true);
      // Auto-hide warning after 15 seconds
      setTimeout(() => setShowQuotaWarning(false), 15000);
    };

    const handleReEnabled = () => {
      setFirebaseDisabled(false);
      setShowQuotaWarning(false);
    };

    window.addEventListener('firebase-quota-exceeded', handleQuotaExceeded);
    window.addEventListener('firebase-re-enabled', handleReEnabled);

    return () => {
      if (unsubscribeTemplates) unsubscribeTemplates();
      if (unsubscribeOrders) unsubscribeOrders();
      window.removeEventListener('firebase-quota-exceeded', handleQuotaExceeded);
      window.removeEventListener('firebase-re-enabled', handleReEnabled);
    };
  }, []);

  // --- PERSISTENCE EFFECTS: Save to both Firebase and localStorage ---
  useEffect(() => {
    // Skip if this update came from Firebase (to prevent circular sync)
    if (isUpdatingTemplatesFromFirebase.current) {
      return;
    }

    // Save to localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(availableModels));
    } catch (error) {
      console.error("Failed to save models to localStorage:", error);
    }

    // Save to Firebase (async, don't block)
    syncTemplates.save(availableModels).catch(error => {
      console.error("Failed to save models to Firebase:", error);
    });
  }, [availableModels]);

  useEffect(() => {
    // Skip if this update came from Firebase (to prevent circular sync)
    if (isUpdatingFromFirebase.current) {
      return;
    }

    // Save to localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (error) {
      console.error("Failed to save orders to localStorage:", error);
      const e = error as DOMException;
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert("UPOZORNENIE: Lokálne úložisko je plné. Vaše posledné zmeny alebo nové objednávky sa neuložili trvalo. Pre uvoľnenie miesta vymažte staré objednávky v sekcii Admin.");
      }
    }

    // Save individual orders to Firebase (not bulk sync to avoid loops)
    // Only sync if we have orders and Firebase is available
    if (orders.length > 0) {
      orders.forEach(order => {
        syncOrders.save(order).catch(error => {
          console.error(`Failed to save order ${order.id} to Firebase:`, error);
        });
      });
    }
  }, [orders]);

  // Ensure selectedModel is valid if availableModels changes (e.g., deletion)
  useEffect(() => {
    if (selectedModel && !availableModels.find(m => m.id === selectedModel.id)) {
      setSelectedModel(availableModels[0] || null);
    } else if (!selectedModel && availableModels.length > 0) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);


  // --- ADMIN ACTIONS ---
  const handleToggleAdmin = () => {
    if (isAdmin) {
        setIsAdmin(false);
        setViewMode(ViewMode.EDITOR); // Force back to editor if logging out
    } else {
        setIsLoginModalOpen(true);
        // Small delay to ensure modal is rendered before focusing
        setTimeout(() => {
            passwordInputRef.current?.focus();
        }, 50);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const password = passwordInputRef.current?.value;
    
    if (password === "Roznavska1992") {
        setIsAdmin(true);
        setIsLoginModalOpen(false);
        setViewMode(ViewMode.TEMPLATES); // Go straight to templates management
    } else {
        alert("Nesprávne heslo");
        if (passwordInputRef.current) {
            passwordInputRef.current.value = '';
            passwordInputRef.current.focus();
        }
    }
  };

  const handleDeleteModel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedModel) return;
    if (availableModels.length <= 1) {
      alert("Nemožno odstrániť posledný model. Aplikácia potrebuje aspoň jednu šablónu.");
      return;
    }
    
    if (window.confirm(`Naozaj chcete odstrániť šablónu "${selectedModel.name}"?`)) {
       setAvailableModels(prev => {
         const updated = prev.filter(m => m.id !== selectedModel.id);
         if (selectedModel.id === selectedModel.id) {
           setSelectedModel(updated[0] || null);
         }
         return updated;
       });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Naozaj chcete vymazať túto objednávku?")) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      // Also delete from Firebase
      try {
        await syncOrders.delete(orderId);
      } catch (error) {
        console.error("Failed to delete order from Firebase:", error);
      }
    }
  };

  const handleExportOrders = () => {
    const dataStr = JSON.stringify(orders, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `casecraft-orders-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportOrders = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            if (window.confirm(`Naozaj chcete importovať ${imported.length} objednávok? Toto prepíše všetky existujúce objednávky.`)) {
              setOrders(imported);
              // Also sync to Firebase
              syncAllOrders(imported).catch(error => {
                console.error("Failed to sync imported orders to Firebase:", error);
              });
              alert(`Úspešne importované ${imported.length} objednávok.`);
            }
          } else {
            alert("Neplatný formát súboru. Očakáva sa pole objednávok.");
          }
        } catch (error) {
          alert("Chyba pri načítaní súboru. Skontrolujte, či je súbor platný JSON.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportTemplates = () => {
    const dataStr = JSON.stringify(availableModels, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `casecraft-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            if (window.confirm(`Naozaj chcete importovať ${imported.length} šablón? Toto prepíše všetky existujúce šablóny.`)) {
              setAvailableModels(imported);
              if (imported.length > 0) {
                setSelectedModel(imported[0]);
              }
              // Also sync to Firebase
              syncTemplates.save(imported).catch(error => {
                console.error("Failed to sync imported templates to Firebase:", error);
              });
              alert(`Úspešne importované ${imported.length} šablón.`);
            }
          } else {
            alert("Neplatný formát súboru. Očakáva sa pole šablón.");
          }
        } catch (error) {
          alert("Chyba pri načítaní súboru. Skontrolujte, či je súbor platný JSON.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };


  // --- EDITOR HANDLERS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedModel) return;

    // Check if file is PDF
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        // Dynamically import pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');
        // Use CDN for worker to avoid build issues
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1); // Get first page
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          alert("Nepodarilo sa načítať PDF. Skúste iný súbor.");
          return;
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        } as any).promise;
        
        const finalSrc = canvas.toDataURL('image/jpeg', 0.9);
        const finalWidth = canvas.width;
        const finalHeight = canvas.height;
        
        if (finalWidth < 300 || finalHeight < 500) {
          alert("Rozlíšenie PDF je príliš nízke. Prosím, nahrajte PDF s minimálnymi rozmermi 300x500px pre najlepšiu kvalitu tlače.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        
        // Optimization: If PDF is extremely large (>2000px), resize it
        let optimizedSrc = finalSrc;
        let optimizedWidth = finalWidth;
        let optimizedHeight = finalHeight;
        
        if (finalWidth > 2000 || finalHeight > 2000) {
          const maxDim = 1500;
          let width = finalWidth;
          let height = finalHeight;
          
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          
          const resizeCanvas = document.createElement('canvas');
          const resizeCtx = resizeCanvas.getContext('2d');
          if (resizeCtx) {
            resizeCanvas.width = width;
            resizeCanvas.height = height;
            const img = new Image();
            img.onload = () => {
              resizeCtx.drawImage(img, 0, 0, width, height);
              optimizedSrc = resizeCanvas.toDataURL('image/jpeg', 0.9);
              optimizedWidth = width;
              optimizedHeight = height;
              
              const scaleX = selectedModel.width / optimizedWidth;
              const scaleY = selectedModel.height / optimizedHeight;
              const initialScale = Math.max(scaleX, scaleY);
              
              setDesign({
                ...INITIAL_DESIGN,
                scale: initialScale,
                imageSrc: optimizedSrc,
                imgWidth: optimizedWidth,
                imgHeight: optimizedHeight
              });
            };
            img.src = finalSrc;
          }
        } else {
          const scaleX = selectedModel.width / optimizedWidth;
          const scaleY = selectedModel.height / optimizedHeight;
          const initialScale = Math.max(scaleX, scaleY);
          
          setDesign({
            ...INITIAL_DESIGN,
            scale: initialScale,
            imageSrc: optimizedSrc,
            imgWidth: optimizedWidth,
            imgHeight: optimizedHeight
          });
        }
      } catch (error) {
        console.error("PDF loading error:", error);
        alert("Nepodarilo sa načítať PDF súbor. Skúste iný súbor alebo skonvertujte PDF na obrázok.");
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    // Handle image files
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;

      // Validate Image Dimensions
      const img = new Image();
      img.onload = () => {
        if (img.width < 300 || img.height < 500) {
          alert("Rozlíšenie obrázka je príliš nízke. Prosím, nahrajte obrázok s minimálnymi rozmermi 300x500px pre najlepšiu kvalitu tlače.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Optimization: If image is extremely large (>2000px), resize it for memory efficiency
        let finalSrc = result;
        let finalWidth = img.width;
        let finalHeight = img.height;

        if (img.width > 2000 || img.height > 2000) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxDim = 1500;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            finalSrc = canvas.toDataURL('image/jpeg', 0.9);
            finalWidth = width;
            finalHeight = height;
        }
        
        const scaleX = selectedModel.width / finalWidth;
        const scaleY = selectedModel.height / finalHeight;
        const initialScale = Math.max(scaleX, scaleY);

        setDesign({
          ...INITIAL_DESIGN,
          scale: initialScale,
          imageSrc: finalSrc,
          imgWidth: finalWidth,
          imgHeight: finalHeight
        });
      };
      img.onerror = () => {
        alert("Nepodarilo sa načítať obrázok. Skúste iný súbor.");
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleAutoFill = () => {
    if (!design.imageSrc || !design.imgWidth || !design.imgHeight || !selectedModel) return;
    
    const scaleX = selectedModel.width / design.imgWidth;
    const scaleY = selectedModel.height / design.imgHeight;
    const newScale = Math.max(scaleX, scaleY);
      
    setDesign(prev => ({
      ...prev,
      scale: newScale,
      x: 0,
      y: 0,
      rotation: 0
    }));
  };

  const handleCenter = () => {
    setDesign(prev => ({
      ...prev,
      x: 0,
      y: 0
    }));
  };

  // --- SVG PARSING LOGIC ---

  // Helper to check if a color matches our target groups using computed styles
  const getShapeColorType = (el: Element): 'magenta' | 'cyan' | 'red' | 'unknown' => {
    const style = window.getComputedStyle(el);
    // We check both fill and stroke, as users might outline or fill shapes
    const candidates = [style.fill, style.stroke];

    const parseRGB = (str: string) => {
        const match = str.match(/\d+/g);
        if (!match || match.length < 3) return null;
        return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
    };

    for (const c of candidates) {
        if (!c || c === 'none' || c === 'transparent') continue;
        
        const rgb = parseRGB(c);
        if (!rgb) continue;

        // Magenta: #FF00FF (255,0,255) OR #EC008C (236,0,140)
        if ((rgb.r === 255 && rgb.g === 0 && rgb.b === 255) || 
            (rgb.r === 236 && rgb.g === 0 && rgb.b === 140)) return 'magenta';
            
        // Cyan: #00FFFF (0,255,255) OR #00AEEF (0,174,239)
        if ((rgb.r === 0 && rgb.g === 255 && rgb.b === 255) || 
            (rgb.r === 0 && rgb.g === 174 && rgb.b === 239)) return 'cyan';
            
        // Red: #FF0000 (255,0,0) OR #ED1C24 (237,28,36)
        if ((rgb.r === 255 && rgb.g === 0 && rgb.b === 0) || 
            (rgb.r === 237 && rgb.g === 28 && rgb.b === 36)) return 'red';
    }

    return 'unknown';
  };

  // Helper to convert SVG shapes to path data
  const shapeToPath = (el: Element): string => {
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'path') {
      return el.getAttribute('d') || '';
    }
    
    if (tagName === 'rect') {
      const x = parseFloat(el.getAttribute('x') || '0');
      const y = parseFloat(el.getAttribute('y') || '0');
      const width = parseFloat(el.getAttribute('width') || '0');
      const height = parseFloat(el.getAttribute('height') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '0');
      const ry = parseFloat(el.getAttribute('ry') || el.getAttribute('rx') || '0');
      
      if (rx > 0 || ry > 0) {
        // Rounded rectangle
        const maxRx = Math.min(rx, width / 2);
        const maxRy = Math.min(ry, height / 2);
        return `M ${x + maxRx} ${y} L ${x + width - maxRx} ${y} Q ${x + width} ${y} ${x + width} ${y + maxRy} L ${x + width} ${y + height - maxRy} Q ${x + width} ${y + height} ${x + width - maxRx} ${y + height} L ${x + maxRx} ${y + height} Q ${x} ${y + height} ${x} ${y + height - maxRy} L ${x} ${y + maxRy} Q ${x} ${y} ${x + maxRx} ${y} Z`;
      } else {
        // Simple rectangle
        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      }
    }
    
    if (tagName === 'circle') {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r} Z`;
    }
    
    if (tagName === 'ellipse') {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '0');
      const ry = parseFloat(el.getAttribute('ry') || '0');
      return `M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx} ${cy - ry} Z`;
    }
    
    return '';
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return; // Security check

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const svgContent = event.target?.result as string;
        
        // Create a hidden sandbox to render SVG and get exact BBox and Computed Styles
        const sandbox = document.createElement('div');
        sandbox.style.position = 'absolute';
        sandbox.style.top = '-9999px';
        sandbox.style.left = '-9999px';
        sandbox.style.visibility = 'hidden';
        sandbox.innerHTML = svgContent;
        document.body.appendChild(sandbox);

        const svgElement = sandbox.querySelector('svg');
        if (!svgElement) throw new Error("Invalid SVG");

        // Find shapes
        const shapeElements = sandbox.querySelectorAll('path, rect, circle, ellipse');
        
        let caseElement: SVGGraphicsElement | null = null;
        const cameraElements: SVGGraphicsElement[] = [];
        const safeZoneElements: SVGGraphicsElement[] = [];

        shapeElements.forEach(el => {
           const colorType = getShapeColorType(el);
           
           if (colorType === 'magenta') caseElement = el as SVGGraphicsElement;
           else if (colorType === 'cyan') cameraElements.push(el as SVGGraphicsElement);
           else if (colorType === 'red') safeZoneElements.push(el as SVGGraphicsElement);
        });

        if (!caseElement) {
          throw new Error("Chyba šablóny: Nepodarilo sa nájsť Magentový tvar (#ec008c alebo #ff00ff). Skontrolujte či má tvar správnu farbu výplne alebo obrysu.");
        }

        // Get precise bounding box using browser's native calculation
        const bbox = (caseElement as SVGGraphicsElement).getBBox();
        
        // Convert case element to path (handles rect, circle, ellipse, or existing path)
        const casePath = shapeToPath(caseElement);
        if (!casePath) {
            alert("Chyba: Nepodarilo sa konvertovať tvar na cestu. Skontrolujte, či SVG obsahuje platný tvar.");
            document.body.removeChild(sandbox);
            return;
        }

        // Convert camera elements to paths
        let combinedCameraPath = '';
        cameraElements.forEach(el => {
             const path = shapeToPath(el);
             if (path) {
                 combinedCameraPath += ` ${path}`;
             }
        });

        // Convert safe zone elements to paths, or generate if missing
        let safeZonePath = '';
        if (safeZoneElements.length > 0) {
            safeZoneElements.forEach(el => {
                const path = shapeToPath(el);
                if (path) {
                    safeZonePath += ` ${path}`;
                }
            });
        } else {
            // Generate safe zone if missing
            const inset = bbox.width * 0.05; 
            safeZonePath = `M ${bbox.x + inset} ${bbox.y + inset} h ${bbox.width - 2*inset} v ${bbox.height - 2*inset} h -${bbox.width - 2*inset} Z`;
        }

        const newModel: PhoneModel = {
          id: `custom-${Date.now()}`,
          name: file.name.replace('.svg', ''),
          brand: 'Vlastná šablóna',
          width: bbox.width,
          height: bbox.height,
          minX: bbox.x,
          minY: bbox.y,
          screenRatio: bbox.width / bbox.height,
          svgPath: casePath,
          cameraPath: combinedCameraPath, 
          safeZonePath: safeZonePath
        };

        document.body.removeChild(sandbox);

        setAvailableModels(prev => [...prev, newModel]);
        setSelectedModel(newModel);
        alert(`Úspech! Šablóna "${newModel.name}" bola pridaná.`);
        
      } catch (error: any) {
        console.error("Failed to load template", error);
        alert(error.message || "Chyba pri spracovaní SVG súboru.");
        // Cleanup if error
        const sb = document.querySelector('div[style*="-9999px"]');
        if(sb) document.body.removeChild(sb);
      } finally {
         if (templateInputRef.current) templateInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerTemplateUpload = () => {
    if (templateInputRef.current) {
        templateInputRef.current.click();
    }
  };

  const generatePrintFile = async (model: PhoneModel, currentDesign: DesignState): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject("No canvas context");
        return;
      }

      const scaleFactor = 2.5; 
      canvas.width = model.width * scaleFactor;
      canvas.height = model.height * scaleFactor;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.scale(scaleFactor, scaleFactor);
        
        // Normalize the coordinate system so the model starts at 0,0
        const offsetX = model.minX ?? 0;
        const offsetY = model.minY ?? 0;
        ctx.translate(-offsetX, -offsetY);

        const path = new Path2D(model.svgPath);
        ctx.save();
        ctx.clip(path);

        // Draw logic matching SVG transform
        // Center point of the "Window" (Phone case bounding box center)
        const cx = offsetX + model.width / 2;
        const cy = offsetY + model.height / 2;

        // 1. Move to center of phone case
        ctx.translate(cx, cy);
        
        // 2. Apply User Transforms
        ctx.translate(currentDesign.x, currentDesign.y);
        ctx.rotate((currentDesign.rotation * Math.PI) / 180);
        ctx.scale(currentDesign.scale, currentDesign.scale);

        // 3. Draw Image centered at current origin
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        ctx.restore();
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = currentDesign.imageSrc || '';
    });
  };

  const handleSubmitOrder = async () => {
    if (!design.imageSrc || !selectedModel) return;

    setIsUploading(true);

    try {
      const printFileUrl = await generatePrintFile(selectedModel, design);

      // Do NOT save the original high-res design image to localStorage to save space
      const sanitizedDesign = { ...design, imageSrc: null };

      if (!selectedModel) return;

      const order: OrderSubmission = {
        id: `ORD-${Date.now()}`,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        design: sanitizedDesign, // Save sanitized design
        timestamp: Date.now(),
        printFileUrl: printFileUrl
      };

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setOrders(prev => [order, ...prev]);
      
      // Save to Firebase immediately
      try {
        await syncOrders.save(order);
      } catch (error) {
        console.error("Failed to save order to Firebase:", error);
        // Continue anyway - it's saved to localStorage
      }
      
      setViewMode(ViewMode.SUCCESS);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Nepodarilo sa vygenerovať tlačový súbor.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadPrintFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Common elements for all views (Admin Modal + Inputs)
  const adminElements = (
    <>
      {showQuotaWarning && (
        <div className="fixed top-4 right-4 z-[200] bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg max-w-md animate-slide-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Firebase Quota Exceeded</h3>
              <p className="mt-1 text-sm text-yellow-700">
                App has automatically switched to local storage. Data will be saved locally only.
              </p>
            </div>
            <button
              onClick={() => setShowQuotaWarning(false)}
              className="ml-4 flex-shrink-0 text-yellow-400 hover:text-yellow-600"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <form onSubmit={handleLoginSubmit} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Prihlásenie do administrácie</h3>
                    <button type="button" onClick={() => setIsLoginModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <input 
                    ref={passwordInputRef}
                    type="password" 
                    placeholder="Heslo" 
                    className="w-full p-3 border border-slate-300 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-lg"
                />
                <div className="flex gap-3">
                    <button 
                        type="button"
                        onClick={() => setIsLoginModalOpen(false)}
                        className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Zrušiť
                    </button>
                    <button 
                        type="submit"
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                        Prihlásiť
                    </button>
                </div>
            </form>
        </div>
      )}

      {isAdmin && (
        <input 
          type="file" 
          accept=".svg" 
          ref={templateInputRef} 
          onChange={handleTemplateUpload} 
          className="hidden" 
        />
      )}
    </>
  );

  // --- VIEW: TEMPLATES PAGE (ADMIN ONLY) ---
  if (viewMode === ViewMode.TEMPLATES) {
    if (!isAdmin) {
       // Fallback if accessed improperly
       setViewMode(ViewMode.EDITOR);
       return null;
    }

    return (
       <div className="min-h-screen bg-slate-50 flex flex-col">
        {adminElements}
        <Header 
          onTemplateUpload={triggerTemplateUpload} 
          currentView={viewMode}
          onChangeView={setViewMode}
          isAdmin={isAdmin}
          onToggleAdmin={handleToggleAdmin}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-slate-900">Správa Šablón</h2>
             <div className="flex gap-2">
               <button 
                 onClick={triggerTemplateUpload}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 Pridať šablónu
               </button>
               <button 
                 onClick={handleExportTemplates}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Exportovať
               </button>
               <button 
                 onClick={handleImportTemplates}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 Importovať
               </button>
             </div>
           </div>
           
           {/* All Templates in Single Column */}
           {availableModels.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 mb-4">Zatiaľ neboli nahrané žiadne šablóny.</div>
                <button 
                  onClick={triggerTemplateUpload}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  Pridať prvú šablónu
                </button>
             </div>
           ) : (
             <div className="space-y-3">
               {availableModels.map(template => {
                 return (
                   <div 
                     key={template.id} 
                     className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex items-center"
                     style={{ height: '120px' }}
                   >
                      {/* SVG Preview */}
                      <div className="h-full w-32 bg-slate-100 p-3 flex items-center justify-center flex-shrink-0">
                         <svg 
                           viewBox={`${template.minX || 0} ${template.minY || 0} ${template.width} ${template.height}`}
                           className="w-full h-full"
                           style={{ maxHeight: '100%', maxWidth: '100%' }}
                         >
                           <defs>
                             <clipPath id={`preview-${template.id}`}>
                               <path d={template.svgPath} />
                             </clipPath>
                           </defs>
                           <g clipPath={`url(#preview-${template.id})`}>
                             <rect 
                               x={template.minX || 0} 
                               y={template.minY || 0} 
                               width={template.width} 
                               height={template.height} 
                               fill="#f1f5f9" 
                             />
                           </g>
                           <path 
                             d={template.svgPath} 
                             fill="none" 
                             stroke="#1e293b" 
                             strokeWidth="2"
                           />
                           {template.cameraPath && (
                             <path 
                               d={template.cameraPath} 
                               fill="#0f172a" 
                               className="opacity-90"
                             />
                           )}
                           {template.safeZonePath && (
                             <path 
                               d={template.safeZonePath} 
                               fill="none" 
                               stroke="#ef4444" 
                               strokeWidth="1" 
                               strokeDasharray="4 2"
                             />
                           )}
                         </svg>
                      </div>
                      
                      {/* Template Info */}
                      <div className="flex-grow px-6 py-4 flex items-center justify-between">
                         <div className="flex-grow">
                           <div className="flex items-center gap-3 mb-1">
                             <h3 className="font-bold text-slate-900 text-lg">{template.name}</h3>
                           </div>
                           <p className="text-sm text-slate-500 mb-1">{template.brand}</p>
                           <div className="text-xs text-slate-400">
                             Rozmery: {Math.round(template.width)} × {Math.round(template.height)}
                             <span className="ml-3">ID: {template.id}</span>
                           </div>
                         </div>
                         
                         {/* Delete Button / Confirmation */}
                         {pendingDeleteId === template.id ? (
                           <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                             <button 
                               onClick={() => {
                                 if (availableModels.length <= 1) {
                                   alert("Nemožno odstrániť posledný model. Aplikácia potrebuje aspoň jednu šablónu.");
                                   setPendingDeleteId(null);
                                   return;
                                 }
                                 setAvailableModels(prev => {
                                   const updated = prev.filter(m => m.id !== template.id);
                                   if (selectedModel && selectedModel.id === template.id) {
                                     setSelectedModel(updated[0] || null);
                                   }
                                   return updated;
                                 });
                                 setPendingDeleteId(null);
                               }}
                               className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg font-medium transition-colors text-sm"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                               Potvrdiť
                             </button>
                             <button 
                               onClick={() => setPendingDeleteId(null)}
                               className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors text-sm"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                               Zrušiť
                             </button>
                           </div>
                         ) : (
                           <button 
                             onClick={() => setPendingDeleteId(template.id)}
                             className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors text-sm flex-shrink-0 ml-4"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             Vymazať
                           </button>
                         )}
                      </div>
                   </div>
                 );
               })}
             </div>
           )}
        </main>
       </div>
    );
  }

  // --- VIEW: ORDERS PAGE (ADMIN ONLY) ---
  if (viewMode === ViewMode.ORDERS) {
    if (!isAdmin) {
       // Fallback if accessed improperly
       setViewMode(ViewMode.EDITOR);
       return null;
    }

    return (
       <div className="min-h-screen bg-slate-50 flex flex-col">
        {adminElements}
        <Header 
          onTemplateUpload={triggerTemplateUpload} 
          currentView={viewMode}
          onChangeView={setViewMode}
          isAdmin={isAdmin}
          onToggleAdmin={handleToggleAdmin}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-slate-900">Správa Objednávok</h2>
             <div className="flex gap-2">
               <button 
                 onClick={handleExportOrders}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Exportovať
               </button>
               <button 
                 onClick={handleImportOrders}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 Importovať
               </button>
             </div>
           </div>
           
           {orders.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 mb-4">Zatiaľ žiadne objednávky.</div>
                <button 
                  onClick={() => setViewMode(ViewMode.EDITOR)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  Vytvoriť nový návrh
                </button>
             </div>
           ) : (
             <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
               {orders.map(order => (
                 <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="h-64 bg-slate-100 p-4 flex items-center justify-center relative overflow-hidden group">
                        <img 
                          src={order.printFileUrl} 
                          alt="Print Ready" 
                          className="h-full object-contain shadow-lg" 
                        />
                        <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                          Pripravené
                        </div>
                    </div>
                    <div className="p-5 flex-grow">
                       <div className="flex justify-between items-start mb-2">
                         <div>
                           <h3 className="font-bold text-slate-900">{order.modelName}</h3>
                           <p className="text-xs text-slate-500">{new Date(order.timestamp).toLocaleString()}</p>
                         </div>
                         <span className="text-xs font-mono text-slate-400">{order.id.split('-')[1]}</span>
                       </div>
                    </div>
                    <div className="p-5 pt-0 mt-auto grid grid-cols-1 gap-2">
                        <button 
                          onClick={() => handleDownloadPrintFile(order.printFileUrl, `${order.id}_${order.modelName}_PRINT.jpg`)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                           Stiahnuť tlačový súbor
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors text-sm"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           Vymazať objednávku
                        </button>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </main>
       </div>
    );
  }

  // --- VIEW: SUCCESS SCREEN ---
  if (viewMode === ViewMode.SUCCESS) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {adminElements}
        <Header 
          onTemplateUpload={triggerTemplateUpload} 
          currentView={viewMode}
          onChangeView={setViewMode}
          isAdmin={isAdmin}
          onToggleAdmin={handleToggleAdmin}
        />
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-indigo-50">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Objednávka prijatá!</h2>
            <p className="text-slate-600 mb-6">Váš návrh pre {selectedModel?.name || 'šablónu'} bol úspešne odoslaný na spracovanie.</p>
            
            {isAdmin && (
                 <p className="text-xs text-slate-400 mb-6 bg-slate-100 p-2 rounded">Admin Info: Súbor bol uložený do LocalStorage.</p>
            )}

            <div className="flex gap-3">
              {isAdmin && (
                <button 
                  onClick={() => setViewMode(ViewMode.ORDERS)}
                  className="flex-1 py-3 px-4 bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
                >
                  Zobraziť objednávky
                </button>
              )}
              <button 
                onClick={() => {
                  setDesign(INITIAL_DESIGN);
                  setViewMode(ViewMode.EDITOR);
                }}
                className={`flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors ${!isAdmin ? 'w-full' : ''}`}
              >
                Vytvoriť ďalší
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- VIEW: EDITOR ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {adminElements}
      <Header 
        onTemplateUpload={triggerTemplateUpload} 
        currentView={viewMode}
        onChangeView={setViewMode}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
      />
      
      <main className="flex-grow flex flex-col-reverse xl:flex-row h-[calc(100dvh-4rem)] overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="w-full xl:w-96 bg-white border-r border-slate-200 p-2 xl:p-6 flex flex-col gap-2 xl:gap-8 overflow-y-auto z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] xl:shadow-none flex-shrink-0 max-h-[35vh] xl:max-h-none">
          
          <section>
            <h3 className="text-[10px] xl:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 xl:mb-3">1. Vyberte model</h3>
            <div className="relative">
              <select
                value={selectedModel?.id || ''}
                onChange={(e) => {
                  const model = availableModels.find(m => m.id === e.target.value);
                  if (model) setSelectedModel(model);
                }}
                disabled={availableModels.length === 0}
                className="w-full p-2 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg xl:rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer transition-shadow shadow-sm text-sm xl:text-base"
              >
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.brand})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4 xl:w-5 xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            
            {/* ADMIN DELETE MODEL BUTTON */}
            {isAdmin && (
                <button 
                    onClick={handleDeleteModel}
                    className="mt-2 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 ml-1"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Odstrániť tento model
                </button>
            )}
          </section>

          <section className="flex-grow-0">
             <h3 className="text-[10px] xl:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 xl:mb-3">2. Pridajte dizajn</h3>
             
             <div className={`w-full h-12 xl:h-auto xl:aspect-square border-2 border-dashed rounded-lg xl:rounded-xl transition-all relative overflow-hidden group
                ${design.imageSrc ? 'border-green-500 bg-slate-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
                
                <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden" 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 w-full h-full flex xl:flex-col flex-row items-center justify-center text-slate-500 gap-2 xl:gap-2 z-10"
                >
                  {!design.imageSrc && (
                    <>
                      <svg className="w-5 h-5 xl:w-10 xl:h-10 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="text-xs xl:text-sm font-medium">Nahrať fotku</span>
                    </>
                  )}
                </button>

                {design.imageSrc && (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                      style={{ backgroundImage: `url(${design.imageSrc})` }}
                    ></div>
                    
                    <div className="absolute inset-0 flex xl:flex-col flex-row items-center justify-between xl:justify-center z-20 pointer-events-none gap-3 xl:gap-0 px-4 xl:px-0">
                      <div className="flex items-center gap-2 xl:flex-col xl:gap-0">
                          <div className="w-6 h-6 xl:w-12 xl:h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg xl:mb-2 animate-bounce-short flex-shrink-0">
                            <svg className="w-3 h-3 xl:w-6 xl:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span className="text-green-700 font-bold text-xs xl:text-sm bg-white/80 px-2 py-0.5 xl:px-3 xl:py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
                            <span className="xl:hidden">Nahrané</span>
                            <span className="hidden xl:inline">Fotka nahraná</span>
                          </span>
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          fileInputRef.current?.click();
                        }}
                        className="text-[10px] xl:text-xs text-slate-600 hover:text-indigo-600 underline pointer-events-auto font-medium bg-white/80 px-2 py-1 rounded"
                      >
                        Zmeniť
                      </button>
                    </div>
                  </>
                )}
             </div>
             <p className="text-[9px] xl:text-xs text-slate-400 mt-1 xl:mt-2 text-center">Odporúčané formáty: JPG, PNG, PDF. Min. rozmer dizajnu musí byť aspoň 300 x 500px (Š x V).</p>
          </section>

          <section className="mt-auto border-t border-slate-100 pt-2 xl:pt-4 pb-2 xl:pb-0">
             <button
              onClick={handleSubmitOrder}
              disabled={!design.imageSrc || isUploading}
              className="w-full py-2.5 xl:py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg xl:rounded-xl font-bold text-sm xl:text-lg shadow-lg shadow-slate-300/50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide xl:normal-case xl:tracking-normal"
             >
               {isUploading ? (
                 <>
                   <svg className="animate-spin h-4 w-4 xl:h-5 xl:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Spracovávam...
                 </>
               ) : (
                 'ODOSLAŤ MÔJ DIZAJN'
               )}
             </button>
          </section>

        </div>

        {/* RIGHT PANEL: Editor Area */}
        <div className="flex-grow bg-slate-200 relative overflow-hidden flex flex-col h-full">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
            backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }}></div>
          
          {design.imageSrc && (
            <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-3 py-2 flex justify-between items-center z-20 shrink-0 shadow-sm gap-2">
               <div className="flex text-[10px] xl:text-xs text-slate-600 items-center gap-1.5 font-medium min-w-0">
                  <svg className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                  <span className="hidden xl:inline truncate">Ťahaním posuňte • Skrolovaním zväčšite</span>
                  <span className="xl:hidden truncate">Posun: 1 prst • Zoom: 2 prsty</span>
               </div>

               <div className="text-[10px] xl:text-xs font-bold text-red-500 flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-full border border-red-100 whitespace-nowrap shrink-0">
                  <span className="w-2 h-2 border border-red-500 border-dashed block bg-white shrink-0"></span>
                  <span className="hidden sm:inline">Červená = Bezpečná zóna (5mm)</span>
                  <span className="sm:hidden">Bezpečná zóna</span>
               </div>
            </div>
          )}

          <div className="flex-grow p-4 xl:p-8 flex items-center justify-center relative z-10 overflow-hidden">
             {selectedModel ? (
               <PhoneEditor 
                 model={selectedModel} 
                 design={design} 
                 onDesignChange={setDesign}
                 onUploadClick={() => fileInputRef.current?.click()}
               />
             ) : (
               <div className="text-center text-slate-400">
                 <p className="text-lg font-medium mb-2">Žiadne šablóny</p>
                 <p className="text-sm">Prosím, nahrajte aspoň jednu šablónu v sekcii Admin → Šablóny</p>
               </div>
             )}
          </div>
          
          {design.imageSrc && (
            <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 xl:p-4 flex flex-col xl:flex-row justify-center gap-2 xl:gap-8 z-20 items-center shadow-lg xl:shadow-none flex-shrink-0 pb-safe">
               
               <div className="flex gap-2 w-full xl:w-auto justify-center">
                   <button
                     onClick={handleCenter}
                     className="flex-1 xl:flex-none px-3 py-1.5 xl:px-4 xl:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] xl:text-xs font-bold uppercase tracking-wider transition-colors text-center shadow-sm"
                   >
                     Vycentrovať
                   </button>

                   <button
                     onClick={handleAutoFill}
                     className="flex-1 xl:flex-none px-3 py-1.5 xl:px-4 xl:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] xl:text-xs font-bold uppercase tracking-wider transition-colors text-center"
                   >
                     PRISPÔSOBIŤ PUZDRU
                   </button>
               </div>

               <div className="flex w-full xl:w-auto gap-4 justify-center">
                  <div className="flex flex-col items-center gap-0.5 xl:gap-1 flex-1 xl:flex-none">
                    <label className="text-[9px] xl:text-[10px] font-bold uppercase text-slate-500 tracking-wide">Mierka</label>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="5" 
                      step="0.05" 
                      value={design.scale}
                      onChange={(e) => setDesign({...design, scale: parseFloat(e.target.value)})}
                      className="w-full xl:w-40 accent-indigo-600 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-0.5 xl:gap-1 flex-1 xl:flex-none">
                    <label className="text-[9px] xl:text-[10px] font-bold uppercase text-slate-500 tracking-wide">Otočenie</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      step="1" 
                      value={design.rotation}
                      onChange={(e) => setDesign({...design, rotation: parseInt(e.target.value)})}
                      className="w-full xl:w-40 accent-indigo-600 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
               </div> 
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;
