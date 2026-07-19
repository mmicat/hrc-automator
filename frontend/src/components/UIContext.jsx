import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, Check } from 'lucide-react';

const UIContext = createContext();

let toastIdCounter = 0;

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });
  const [promptState, setPromptState] = useState({ isOpen: false, message: '', defaultValue: '', onConfirm: null, onCancel: null });
  const promptInputRef = useRef(null);

  // Toast Functionality
  const showAlert = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Confirm Modal Functionality
  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        onConfirm: () => {
          setConfirmState({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          resolve(true);
        },
        onCancel: () => {
          setConfirmState({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          resolve(false);
        }
      });
    });
  }, []);

  // Prompt Modal Functionality
  const showPrompt = useCallback((message, defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        message,
        defaultValue,
        onConfirm: (val) => {
          setPromptState({ isOpen: false, message: '', defaultValue: '', onConfirm: null, onCancel: null });
          resolve(val);
        },
        onCancel: () => {
          setPromptState({ isOpen: false, message: '', defaultValue: '', onConfirm: null, onCancel: null });
          resolve(null);
        }
      });
    });
  }, []);

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (promptState.onConfirm) {
      promptState.onConfirm(promptInputRef.current.value);
    }
  };

  return (
    <UIContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      {/* Toasts Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl shadow-black/50 border flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${
              toast.type === 'error' ? 'bg-red-950/90 border-red-900/50 text-red-100' :
              toast.type === 'success' ? 'bg-green-950/90 border-green-900/50 text-green-100' :
              toast.type === 'warning' ? 'bg-yellow-950/90 border-yellow-900/50 text-yellow-100' :
              'bg-slate-900/90 border-slate-700/50 text-slate-100 backdrop-blur-md'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />}
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-green-500 mt-0.5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-500 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />}
            
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {toast.message}
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Confirm Action</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-8">
                {confirmState.message}
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={confirmState.onCancel}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmState.onConfirm}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-wider shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <Check className="w-4 h-4" />
                  Yes, Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handlePromptSubmit} className="p-6">
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">Input Required</h3>
              <p className="text-slate-300 text-sm mb-5">
                {promptState.message}
              </p>
              
              <input 
                ref={promptInputRef}
                type="text" 
                defaultValue={promptState.defaultValue}
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm mb-8"
              />
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={promptState.onCancel}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
