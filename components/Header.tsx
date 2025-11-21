import React from 'react';
import { ViewMode } from '../types';

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
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => onChangeView(ViewMode.EDITOR)}
          >
            {/* Logo */}
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CaseCraft <span className="text-xs font-normal text-slate-400 ml-1">SK</span></h1>
          </div>
          
          <nav className="flex items-center gap-2 sm:gap-4">
            <ul className="flex space-x-2 sm:space-x-6 text-sm font-medium text-slate-600 items-center">
               <li>
                <button 
                  onClick={() => onChangeView(ViewMode.EDITOR)}
                  className={`transition-colors px-2 py-1 rounded-md ${currentView === ViewMode.EDITOR ? 'text-indigo-600 font-bold bg-indigo-50' : 'hover:text-indigo-600'}`}
                >
                  Editor
                </button>
              </li>
              
              {/* Admin Only Links */}
              {isAdmin && (
                <>
                  <li>
                    <button 
                      onClick={() => onChangeView(ViewMode.TEMPLATES)}
                      className={`transition-colors px-2 py-1 rounded-md ${currentView === ViewMode.TEMPLATES ? 'text-indigo-600 font-bold bg-indigo-50' : 'hover:text-indigo-600'}`}
                    >
                      Šablóny
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => onChangeView(ViewMode.ORDERS)}
                      className={`transition-colors px-2 py-1 rounded-md ${currentView === ViewMode.ORDERS ? 'text-indigo-600 font-bold bg-indigo-50' : 'hover:text-indigo-600'}`}
                    >
                      Objednávky
                    </button>
                  </li>
                  <li className="hidden sm:block">
                    <button 
                      onClick={onTemplateUpload}
                      className="hover:text-indigo-600 cursor-pointer transition-colors flex items-center gap-1 border border-slate-200 rounded-full px-3 py-1.5 hover:border-indigo-300 bg-indigo-50 text-indigo-700"
                      title="Admin: Nahrať SVG súbor"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <span className="hidden md:inline">Importovať šablónu</span>
                    </button>
                  </li>
                </>
              )}
            </ul>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            {/* Admin Status Message */}
            {isAdmin && (
              <span className="text-sm text-slate-600 font-medium mr-2">
                Logged as admin
              </span>
            )}

            {/* Admin Login Toggle */}
            <button 
              onClick={onToggleAdmin}
              type="button"
              className={`flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation ${
                isAdmin 
                  ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                  : 'text-slate-500 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
              style={{ width: '44px', height: '44px' }}
              title={isAdmin ? "Odhlásiť sa z Admin zóny" : "Prihlásiť sa ako Admin"}
              aria-label={isAdmin ? "Odhlásiť admina" : "Prihlásiť admina"}
            >
              {isAdmin ? (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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