import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileText, CheckSquare, History, 
  Trash2, AlertTriangle, Calendar, User, Car, DollarSign 
} from 'lucide-react';

export default function InvoiceEngine({ 
  onBack, 
  onOpenInvoice, 
  onOverwriteInvoice 
}) {
  const [activeTab, setActiveTab] = useState('job-cards');
  const [jobCards, setJobCards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/all-job-cards');
      if (res.ok) {
        const data = await res.json();
        setJobCards(data);
      }
    } catch (err) {
      console.error('Failed to load job cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/all-invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'job-cards') {
      fetchJobCards();
    } else {
      fetchInvoices();
    }
  }, [activeTab]);

  // Handle deletion of last Job Card
  const handleDeleteLastJobCard = async () => {
    try {
      const res = await fetch('/api/last-job-card');
      if (!res.ok) {
        alert('No job cards available to delete.');
        return;
      }
      const data = await res.json();
      
      let displayDate = 'Unknown Date';
      if (data.date_in) {
        try { displayDate = data.date_in.split('T')[0]; } catch (e) {}
      }

      const vehicleStr = `${data.make || ''} ${data.model || ''}`.trim() || 'Unknown Vehicle';
      const confirmMsg = `Are you sure you want to delete job card no. #${data.job_no} for customer ${data.full_name} with vehicle ${vehicleStr} on ${displayDate}?`;

      if (window.confirm(confirmMsg)) {
        const delRes = await fetch(`/api/delete-job-card/${data.job_no}`, { method: 'DELETE' });
        if (delRes.ok) {
          alert(`Job card no. #${data.job_no} deleted successfully.`);
          fetchJobCards();
        } else {
          alert('Failed to delete job card.');
        }
      }
    } catch (err) {
      console.error('Error deleting last job card:', err);
      alert('An error occurred.');
    }
  };

  // Handle deletion of last Invoice
  const handleDeleteLastInvoice = async () => {
    try {
      const res = await fetch('/api/last-invoice');
      if (!res.ok) {
        alert('No invoices available to delete.');
        return;
      }
      const data = await res.json();
      
      let displayDate = 'Unknown Date';
      if (data.invoice_date) {
        try { displayDate = data.invoice_date.split('T')[0]; } catch (e) {}
      }

      const vehicleStr = `${data.make || ''} ${data.model || ''}`.trim() || 'Unknown Vehicle';
      const confirmMsg = `Are you sure you want to delete invoice no. #${data.invoice_no} for customer ${data.full_name} with vehicle ${vehicleStr} dated ${displayDate}?`;

      if (window.confirm(confirmMsg)) {
        const delRes = await fetch(`/api/delete-invoice/${data.invoice_no}`, { method: 'DELETE' });
        if (delRes.ok) {
          alert(`Invoice no. #${data.invoice_no} deleted successfully.`);
          fetchInvoices();
        } else {
          alert('Failed to delete invoice.');
        }
      }
    } catch (err) {
      console.error('Error deleting last invoice:', err);
      alert('An error occurred.');
    }
  };

  // Trigger Overwrite Invoice Prompt
  const handleOverwriteInvoicePrompt = () => {
    const invNo = window.prompt('Enter the exact Invoice Number to Overwrite & Reprint:');
    if (invNo) {
      onOverwriteInvoice(invNo);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto glass-panel glass-panel-glow-purple rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-purple-500 tracking-tight glow-text-purple">
            {activeTab === 'job-cards' ? 'Job Cards History' : 'Invoices History'}
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">
            Invoices Engine & Service Auditing
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          {activeTab === 'job-cards' ? (
            <button 
              onClick={handleDeleteLastJobCard}
              className="flex items-center gap-1.5 bg-slate-950/40 hover:bg-red-950/45 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/40 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Last Job Card
            </button>
          ) : (
            <>
              <button 
                onClick={handleDeleteLastInvoice}
                className="flex items-center gap-1.5 bg-slate-950/40 hover:bg-red-950/45 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/40 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete Last Invoice
              </button>
              
              <button 
                onClick={handleOverwriteInvoicePrompt}
                className="flex items-center gap-1.5 bg-slate-950/40 hover:bg-orange-950/45 text-slate-400 hover:text-orange-400 border border-slate-800 hover:border-orange-900/40 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all"
              >
                <AlertTriangle className="w-4 h-4" />
                Overwrite Invoice
              </button>
            </>
          )}

          <button 
            onClick={onBack} 
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm font-semibold ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800/80">
        <button 
          onClick={() => setActiveTab('job-cards')}
          className={`px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'job-cards' 
              ? 'border-purple-500 text-purple-400 bg-purple-950/10' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Job Cards
        </button>
        
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'invoices' 
              ? 'border-green-500 text-green-400 bg-green-950/10' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Invoices
        </button>
      </div>

      {/* List Display */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
        {activeTab === 'job-cards' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-bold tracking-wider bg-slate-950/40">
                <th className="p-4">Job No.</th>
                <th className="p-4"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Date In</div></th>
                <th className="p-4"><div className="flex items-center gap-2"><User className="w-4 h-4" />Customer</div></th>
                <th className="p-4"><div className="flex items-center gap-2"><Car className="w-4 h-4" />Vehicle</div></th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <div className="spinner text-purple-500" />
                      <span>Syncing history records...</span>
                    </div>
                  </td>
                </tr>
              ) : jobCards.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500 italic">
                    No job cards found in the archive.
                  </td>
                </tr>
              ) : (
                jobCards.map(j => (
                  <tr key={j.job_no} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-bold text-orange-400 text-sm">
                      #{j.job_no}
                    </td>
                    <td className="p-4 text-slate-400 font-medium text-sm">
                      {j.date_in ? j.date_in.split('T')[0] : 'N/A'}
                    </td>
                    <td className="p-4 font-semibold text-slate-200 text-sm">
                      {j.full_name || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-300 text-sm">
                      {j.make || j.model ? `${j.make || ''} ${j.model || ''}`.trim() : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => onOpenInvoice(j)} 
                        className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md shadow-green-950/20 active:scale-95"
                      >
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-bold tracking-wider bg-slate-950/40">
                <th className="p-4">Inv. No.</th>
                <th className="p-4"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Date</div></th>
                <th className="p-4"><div className="flex items-center gap-2"><User className="w-4 h-4" />Customer</div></th>
                <th className="p-4"><div className="flex items-center gap-2"><Car className="w-4 h-4" />Vehicle / Plate</div></th>
                <th className="p-4">Job Card</th>
                <th className="p-4 text-right"><div className="flex items-center gap-1 justify-end"><DollarSign className="w-4 h-4" />Total (AED)</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <div className="spinner text-green-500" />
                      <span>Syncing invoice archive...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500 italic">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map(i => (
                  <tr key={i.invoice_no} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-bold text-green-400 text-sm">
                      #{i.invoice_no}
                    </td>
                    <td className="p-4 text-slate-400 font-medium text-sm">
                      {i.invoice_date ? i.invoice_date.split('T')[0] : 'N/A'}
                    </td>
                    <td className="p-4 font-semibold text-slate-200 text-sm">
                      {i.full_name || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-300 text-sm">
                      {[i.make, i.model].filter(Boolean).join(' ')} {i.reg_no ? `· ${i.reg_no}` : ''}
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-sm">
                      #{i.job_no || '—'}
                    </td>
                    <td className="p-4 text-right font-bold text-green-300 text-sm">
                      {parseFloat(i.grand_total || 0).toFixed(2)}
                      {i.vat_applied === 1 && (
                        <span className="text-[10px] text-green-600 font-bold bg-green-950/30 px-1.5 py-0.5 rounded border border-green-900/30 ml-2">
                          +VAT
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
