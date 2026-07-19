import React, { useState, useEffect } from 'react';
import {
  Search, Plus, LogOut, History, FileText,
  Trash2, Edit, AlertTriangle, UserCheck, Car, Phone, Hash, Gift
} from 'lucide-react';
import { useUI } from './UIContext';

export default function Dashboard({
  onNavigate,
  onLogout,
  onCreateJob,
  onEditRecord,
  onOverwriteJobCard
}) {
  const { showAlert, showConfirm, showPrompt } = useUI();
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch clients & vehicles from the server
  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/all-clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filter clients based on search term
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.full_name || '').toLowerCase().includes(term) ||
      (c.phone_no || '').toLowerCase().includes(term) ||
      (c.reg_no || '').toLowerCase().includes(term) ||
      (c.make || '').toLowerCase().includes(term) ||
      (c.model || '').toLowerCase().includes(term)
    );
  });

  // Prompt to delete the last job card created
  const handleDeleteLastJobCard = async () => {
    try {
      const res = await fetch('/api/last-job-card');
      if (!res.ok) {
        showAlert('No job cards available to delete.', 'warning');
        return;
      }
      const data = await res.json();

      let displayDate = 'Unknown Date';
      if (data.date_in) {
        try { displayDate = data.date_in.split('T')[0]; } catch (e) { }
      }

      const vehicleStr = `${data.make || ''} ${data.model || ''}`.trim() || 'Unknown Vehicle';
      const confirmMsg = `Are you sure you would like to delete job card no. #${data.job_no} for customer ${data.full_name} with vehicle ${vehicleStr} on ${displayDate}?`;

      if (await showConfirm(confirmMsg)) {
        const deleteRes = await fetch(`/api/delete-job-card/${data.job_no}`, { method: 'DELETE' });
        if (deleteRes.ok) {
          showAlert(`Job card no. #${data.job_no} has been deleted successfully.`, 'success');
          fetchClients();
        } else {
          showAlert('Failed to delete the job card.', 'error');
        }
      }
    } catch (err) {
      console.error('Error deleting last job card:', err);
      showAlert('An error occurred while deleting the job card.', 'error');
    }
  };

  // Prompt to overwrite a job card
  const handleOverwritePrompt = async () => {
    const jobNo = await showPrompt('Enter the exact Job Card Number to Overwrite & Reprint:');
    if (jobNo) {
      onOverwriteJobCard(jobNo);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-300">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-red-500 tracking-tight glow-text-red">
            Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">
            Customer Database & Active Profiles
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('invoice-engine')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase shadow-lg shadow-purple-950/20 active:scale-95"
          >
            <History className="w-4 h-4" />
            Invoices Engine
          </button>

          <button
            onClick={() => onNavigate('loyalty-tab')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase shadow-lg shadow-amber-950/20 active:scale-95"
          >
            <Gift className="w-4 h-4" />
            Loyalty
          </button>

          <button
            onClick={() => onNavigate('record-form-add')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase shadow-lg shadow-blue-950/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Customer / Vehicle
          </button>

          <button
            onClick={() => onNavigate('job-card-form')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase shadow-lg shadow-red-950/20 active:scale-95"
          >
            <FileText className="w-4 h-4" />
            Job Card
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase active:scale-95 border border-slate-700/40"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Control / Search Area */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <span className="absolute left-4 top-3.5 text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Search by Name, Phone, Vehicle, or Plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium text-sm"
          />
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDeleteLastJobCard}
            className="flex items-center gap-2 bg-slate-950/40 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/50 px-5 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300"
          >
            <Trash2 className="w-4 h-4" />
            Delete Last Job Card
          </button>

          <button
            type="button"
            onClick={handleOverwritePrompt}
            className="flex items-center gap-2 bg-slate-950/40 hover:bg-orange-950/40 text-slate-400 hover:text-orange-400 border border-slate-800 hover:border-orange-900/50 px-5 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300"
          >
            <AlertTriangle className="w-4 h-4" />
            Overwrite Job Card
          </button>
        </div>
      </div>

      {/* Client Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-bold tracking-wider bg-slate-950/40 select-none">
              <th className="p-4"><div className="flex items-center gap-2"><UserCheck className="w-4 h-4" />Customer</div></th>
              <th className="p-4"><div className="flex items-center gap-2"><Phone className="w-4 h-4" />Contact</div></th>
              <th className="p-4"><div className="flex items-center gap-2"><Car className="w-4 h-4" />Vehicle</div></th>
              <th className="p-4"><div className="flex items-center gap-2"><Hash className="w-4 h-4" />Plate No</div></th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <div className="spinner text-red-500" />
                    <span>Syncing database records...</span>
                  </div>
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-500 italic">
                  No customer records matched your query.
                </td>
              </tr>
            ) : (
              filteredClients.map((c, i) => (
                <tr key={`${c.customer_id}-${c.vin_no || i}`} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-semibold text-slate-200 text-sm">
                    {c.full_name || 'N/A'}
                  </td>
                  <td className="p-4 text-slate-400 font-medium text-sm">
                    {c.phone_no || 'N/A'}
                  </td>
                  <td className="p-4 text-slate-300 text-sm">
                    {c.make || c.model ? `${c.make || ''} ${c.model || ''}`.trim() : <span className="text-slate-600 italic">No Vehicle</span>}
                  </td>
                  <td className="p-4 text-sm font-mono text-red-400/90 font-bold">
                    {c.reg_no || '—'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => onCreateJob(c.phone_no, c.vin_no || '')}
                        className="text-red-500 hover:text-red-400 font-bold text-xs uppercase tracking-wider hover:underline"
                      >
                        Create Job &rarr;
                      </button>
                      <button
                        onClick={() => onEditRecord(c)}
                        className="text-yellow-500 hover:text-yellow-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1 hover:underline"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
