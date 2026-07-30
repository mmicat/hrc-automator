import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Plus, Trash2, Filter, Calculator, 
  Calendar, FileText, CheckCircle, Tag, DollarSign, Loader2
} from 'lucide-react';
import BackButton from './BackButton';
import { useUI } from './UIContext';

export default function AccountingTab({ onBack }) {
  const { showAlert, showConfirm } = useUI();
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'expenses'
  
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterCategory, setFilterCategory] = useState('');
  
  // Inline add state
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newAed, setNewAed] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newTotal, setNewTotal] = useState('');

  // Auto calculate total
  useEffect(() => {
    if (newAed) {
      const qty = parseInt(newQty) || 1;
      setNewTotal((parseFloat(newAed) * qty).toFixed(2));
    } else {
      setNewTotal('');
    }
  }, [newAed, newQty]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, expensesRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/expenses')
      ]);
      if (salesRes.ok) setSales(await salesRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
    } catch (err) {
      console.error('Error fetching accounting data:', err);
      showAlert('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(expenses.map(e => e.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [expenses]);

  const displayedData = useMemo(() => {
    if (activeTab === 'sales') return sales;
    if (filterCategory) return expenses.filter(e => e.category === filterCategory);
    return expenses;
  }, [activeTab, sales, expenses, filterCategory]);



  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDate || !newDesc || !newAed || !newTotal || (activeTab === 'expenses' && !newCat)) {
      showAlert('Please fill in all required fields.', 'warning');
      return;
    }

    const payload = {
      date: newDate,
      description: newDesc,
      aed: parseFloat(newAed),
      quantity: parseInt(newQty) || 1,
      total: parseFloat(newTotal)
    };
    if (activeTab === 'expenses') payload.category = newCat;

    try {
      const res = await fetch(`/api/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showAlert(`${activeTab === 'sales' ? 'Sale' : 'Expense'} added successfully.`, 'success');
        fetchData();
        setNewDesc('');
        setNewAed('');
        setNewQty('');
        if (activeTab === 'expenses') setNewCat('');
      } else {
        showAlert('Failed to save entry.', 'error');
      }
    } catch (err) {
      console.error('Error saving entry:', err);
      showAlert('An error occurred.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (await showConfirm('Are you sure you want to delete this entry?')) {
      try {
        const res = await fetch(`/api/${activeTab}/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('Entry deleted.', 'success');
          fetchData();
        } else {
          showAlert('Failed to delete entry.', 'error');
        }
      } catch (err) {
        console.error('Error deleting entry:', err);
        showAlert('An error occurred.', 'error');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-300">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-500 tracking-tight glow-text-blue">
            Accounting
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">
            Sales & Expenses Tracker
          </p>
        </div>

        <BackButton onClick={onBack} label="Back to Dashboard" />
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm tracking-wide transition-all ${
              activeTab === 'sales'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Sales
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm tracking-wide transition-all ${
              activeTab === 'expenses'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Expenses
          </button>
        </div>

        {activeTab === 'expenses' && (
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none bg-slate-950/40 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-sm min-w-[200px]"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20 relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-bold tracking-wider bg-slate-950/40 select-none">
              <th className="p-4"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</div></th>
              {activeTab === 'expenses' && <th className="p-4"><div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Category</div></th>}
              <th className="p-4"><div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Description</div></th>
              <th className="p-4"><div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> AED</div></th>
              <th className="p-4"><div className="flex items-center gap-2"><Calculator className="w-4 h-4" /> Qty</div></th>
              <th className="p-4"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Total</div></th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {/* INLINE ADD ROW */}
            <tr className="bg-slate-900/60">
              <td className="p-3">
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </td>
              {activeTab === 'expenses' && (
                <td className="p-3">
                  <input type="text" placeholder="Category" value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                </td>
              )}
              <td className="p-3">
                <input type="text" placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </td>
              <td className="p-3">
                <input type="number" step="0.01" placeholder="AED" value={newAed} onChange={e => setNewAed(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </td>
              <td className="p-3">
                <input type="number" placeholder="Qty" value={newQty} onChange={e => setNewQty(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </td>
              <td className="p-3">
                <input type="number" step="0.01" placeholder="Total" value={newTotal} readOnly className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-slate-400 font-bold cursor-not-allowed" />
              </td>
              <td className="p-3 text-right">
                <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
                  <Plus className="w-4 h-4" />
                </button>
              </td>
            </tr>

            {/* DATA ROWS */}
            {(() => {
              const rows = [];
              let currentMonth = null;
              let currentMonthTotal = 0;

              displayedData.forEach((item, i) => {
                let itemMonth = null;
                if (item.date) {
                  try {
                    itemMonth = new Date(item.date).toLocaleString('default', { month: 'long', year: 'numeric' });
                  } catch (e) {}
                }

                if (currentMonth !== null && currentMonth !== itemMonth) {
                  rows.push(
                    <tr key={`summary-${currentMonth}-${i}`} className="bg-slate-950/80 border-y-2 border-slate-700/50">
                      <td colSpan={activeTab === 'expenses' ? 5 : 4} className="p-4 text-right text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Total for {currentMonth}
                      </td>
                      <td className={`p-4 font-bold font-mono text-sm ${activeTab === 'sales' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currentMonthTotal.toFixed(2)}
                      </td>
                      <td className="p-4"></td>
                    </tr>
                  );
                  currentMonthTotal = 0;
                }

                currentMonth = itemMonth;
                currentMonthTotal += parseFloat(item.total) || 0;

                rows.push(
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 text-slate-300 text-sm whitespace-nowrap">
                      {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    {activeTab === 'expenses' && (
                      <td className="p-4">
                        <span className="bg-slate-800 text-blue-300 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-slate-700">{item.category}</span>
                      </td>
                    )}
                    <td className="p-4 text-slate-200 font-medium text-sm">
                      {item.description}
                    </td>
                    <td className="p-4 text-slate-400 text-sm font-mono">
                      {item.aed}
                    </td>
                    <td className="p-4 text-slate-400 text-sm font-mono">
                      {item.quantity || 1}
                    </td>
                    <td className="p-4 text-slate-200 font-bold text-sm font-mono">
                      {item.total}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(item.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                );
              });

              if (currentMonth !== null) {
                rows.push(
                  <tr key={`summary-${currentMonth}-end`} className="bg-slate-950/80 border-y-2 border-slate-700/50">
                    <td colSpan={activeTab === 'expenses' ? 5 : 4} className="p-4 text-right text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Total for {currentMonth}
                    </td>
                    <td className={`p-4 font-bold font-mono text-sm ${activeTab === 'sales' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentMonthTotal.toFixed(2)}
                    </td>
                    <td className="p-4"></td>
                  </tr>
                );
              }

              return rows;
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
