import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick, label = "Back to Dashboard" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase active:scale-95 border border-slate-700/40"
    >
      <ArrowLeft className="w-4 h-4 inline mr-2" />
      {label}
    </button>
  );
}
