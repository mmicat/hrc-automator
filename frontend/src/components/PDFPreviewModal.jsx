import React from 'react';
import { X, Download, Eye } from 'lucide-react';

export default function PDFPreviewModal({ pdfUrl, downloadName, isOpen, onClose }) {
  if (!isOpen) return null;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = downloadName || 'document.pdf';
    link.click();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-red-500 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-100 tracking-wide">
              Print Preview & Export
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            aria-label="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Frame */}
        <div className="flex-grow p-4 bg-slate-950/40">
          {pdfUrl ? (
            <iframe 
              src={pdfUrl} 
              className="w-full h-full rounded-lg border border-slate-800 bg-slate-900"
              title="PDF Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
              <div className="spinner text-red-500" />
              <span>Generating document preview...</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleDownload} 
            disabled={!pdfUrl}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-800/40 disabled:text-slate-500 text-white font-bold rounded-lg transition-all text-sm flex items-center gap-2 shadow-lg shadow-red-950/30 hover:shadow-red-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download & Print
          </button>
        </div>
      </div>
    </div>
  );
}
