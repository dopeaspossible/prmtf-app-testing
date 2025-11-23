import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { checkFirebaseStatus } from '../services/firebaseService';

interface HeaderProps {
  onTemplateUpload: () => void;
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onTemplateUpload, 
  currentView, 
  onChangeView,
  isAdmin,
  onToggleAdmin
}) => {
  const [dbStatus, setDbStatus] = useState<{ available: boolean; disabled: boolean }>({ available: false, disabled: false });

  useEffect(() => {
    const updateStatus = () => {
      setDbStatus(checkFirebaseStatus());
    };

    // Check status on mount
    updateStatus();

    // Listen for changes
    window.addEventListener('firebase-quota-exceeded', updateStatus);
    window.addEventListener('firebase-re-enabled', updateStatus);

    return () => {
      window.removeEventListener('firebase-quota-exceeded', updateStatus);
      window.removeEventListener('firebase-re-enabled', updateStatus);
    };
  }, []);

  const getDatabaseText = () => {
    if (!dbStatus.available) {
      return 'DB: LocalStorage';
    }
    if (dbStatus.disabled) {
      return 'DB: LocalStorage (Firebase disabled)';
    }
    return 'DB: Firebase';
  };

  const getDatabaseColor = () => {
    if (!dbStatus.available || dbStatus.disabled) {
      return 'text-[#8E8E93]';
    }
    return 'text-[#34C759]';
  };

  return (
    <header className="ios-blur sticky top-0 z-50 border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center gap-3 cursor-pointer ios-button" 
            onClick={() => onChangeView(ViewMode.EDITOR)}
          >
            {/* Logo - iOS style */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#000000] tracking-tight">CaseCraft</h1>
              <p className="text-xs text-[#8E8E93] -mt-0.5">v1.0 - made by Primitif</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            {/* iOS-style segmented control for navigation */}
            <div className="flex items-center bg-[#E5E5EA] rounded-xl p-1 gap-1">
              <button 
                onClick={() => onChangeView(ViewMode.EDITOR)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ios-button ${
                  currentView === ViewMode.EDITOR 
                    ? 'bg-white text-[#007AFF] shadow-sm' 
                    : 'text-[#8E8E93]'
                }`}
              >
                Editor
              </button>
              
              {/* Admin Only Links */}
              {isAdmin && (
                <>
                  <button 
                    onClick={() => onChangeView(ViewMode.TEMPLATES)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ios-button ${
                      currentView === ViewMode.TEMPLATES 
                        ? 'bg-white text-[#007AFF] shadow-sm' 
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    Šablóny
                  </button>
                  <button 
                    onClick={() => onChangeView(ViewMode.ORDERS)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ios-button ${
                      currentView === ViewMode.ORDERS 
                        ? 'bg-white text-[#007AFF] shadow-sm' 
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    Objednávky
                  </button>
                </>
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <button 
                onClick={onTemplateUpload}
                className="ios-button flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5] transition-colors"
                title="Nahrať SVG súbor"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}

            {/* Admin Status Badge */}
            {isAdmin && (
              <div className="hidden sm:flex flex-col items-end mr-2 px-3 py-1.5 bg-[#F2F2F7] rounded-xl">
                <span className="text-xs font-medium text-[#000000]">
                  Admin
                </span>
                <span className={`text-[10px] ${getDatabaseColor()} font-mono`}>
                  {getDatabaseText()}
                </span>
              </div>
            )}

            {/* Admin Login Toggle - iOS style */}
            <button 
              onClick={onToggleAdmin}
              type="button"
              className={`ios-button flex items-center justify-center rounded-xl transition-all duration-200 ${
                isAdmin 
                  ? 'w-10 h-10 bg-[#FF3B30] text-white shadow-sm' 
                  : 'w-10 h-10 bg-[#E5E5EA] text-[#8E8E93]'
              }`}
              title={isAdmin ? "Odhlásiť sa" : "Prihlásiť sa"}
              aria-label={isAdmin ? "Odhlásiť admina" : "Prihlásiť admina"}
            >
              {isAdmin ? (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
              ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                 </svg>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};