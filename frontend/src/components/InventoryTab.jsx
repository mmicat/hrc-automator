import React, { useState, useEffect } from 'react';
import { Package, Plus, Save, ArrowLeft, Calendar, Info, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function InventoryTab({ onBack }) {
  const [mode, setMode] = useState('view'); // 'view' or 'add'
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // For Add Mode
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [editItems, setEditItems] = useState([]); // Temporary items being edited

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/dates');
      if (res.ok) {
        const data = await res.json();
        setDates(data);
        if (data.length > 0) {
          setSelectedDate(data[0].date_checked.split('T')[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && mode === 'view') {
      fetchLog(selectedDate);
    }
  }, [selectedDate, mode]);

  const fetchLog = async (dateStr) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/log/${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAddMode = async () => {
    setMode('add');
    setNewLogDate(new Date().toISOString().split('T')[0]);
    // Pre-fill with the latest log if available
    if (dates.length > 0) {
      const latestDate = dates[0].date_checked.split('T')[0];
      try {
        const res = await fetch(`/api/inventory/log/${latestDate}`);
        if (res.ok) {
          const data = await res.json();
          // Reset quantities to their current values, or keep them as template
          setEditItems(data.map(item => ({ ...item, id: Math.random().toString() })));
        }
      } catch (err) {
        setEditItems([]);
      }
    } else {
      setEditItems([]);
    }
  };

  const handleSaveLog = async () => {
    if (!newLogDate) {
      alert("Please select a date.");
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        date_checked: newLogDate,
        items: editItems
      };
      const res = await fetch('/api/inventory/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Inventory log saved successfully!");
        setMode('view');
        await fetchDates();
        setSelectedDate(newLogDate);
      } else {
        alert("Failed to save inventory.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleItemChange = (id, field, value) => {
    setEditItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    setEditItems([...editItems, { id: Math.random().toString(), category: '', item_name: '', quantity: 0 }]);
  };

  const handleRemoveItem = (id) => {
    setEditItems(prev => prev.filter(item => item.id !== id));
  };

  const isGallonsCategory = (cat) => {
    const c = (cat || '').toLowerCase();
    return c.includes('oil') || c.includes('coolant') || c.includes('gear') || c.includes('brake');
  };

  // Group items by category for View Mode
  const groupedViewItems = inventoryItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const currentIndex = dates.findIndex(d => d.date_checked.split('T')[0] === selectedDate);

  const handlePreviousDate = () => {
    if (currentIndex < dates.length - 1) {
      setSelectedDate(dates[currentIndex + 1].date_checked.split('T')[0]);
    }
  };

  const handleNextDate = () => {
    if (currentIndex > 0) {
      setSelectedDate(dates[currentIndex - 1].date_checked.split('T')[0]);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-500 tracking-tight flex items-center gap-3 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
            <Package className="w-8 h-8 text-indigo-400" />
            Inventory Tracking
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">
            Manage Garage Stock & Logs
          </p>
        </div>

        <button
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase active:scale-95 border border-slate-700/40"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back to Dashboard
        </button>
      </div>

      {mode === 'view' ? (
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePreviousDate}
                disabled={currentIndex === -1 || currentIndex >= dates.length - 1}
                className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-indigo-400 hover:border-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg px-6 py-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span className="text-slate-200 font-bold tracking-wider">
                  {selectedDate || "No logs found"}
                </span>
              </div>

              <button
                onClick={handleNextDate}
                disabled={currentIndex <= 0}
                className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-indigo-400 hover:border-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleStartAddMode}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase shadow-lg shadow-indigo-950/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Inventory Log
            </button>
          </div>

          {/* View Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-bold tracking-wider bg-slate-950/40 select-none">
                  <th className="p-4">Item Name / Description</th>
                  <th className="p-4 text-center">Quantity in Stock</th>
                </tr>
              </thead>
              
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan="2" className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2 justify-center">
                        <div className="spinner text-indigo-500 border-4 w-8 h-8 rounded-full border-t-indigo-500 animate-spin" />
                        <span>Loading inventory data...</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : Object.keys(groupedViewItems).length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan="2" className="p-12 text-center text-slate-500 italic">
                      No inventory items found for this date.
                    </td>
                  </tr>
                </tbody>
              ) : (
                Object.entries(groupedViewItems).map(([category, items]) => (
                  <tbody key={category} className="divide-y divide-slate-800/30">
                    <tr className="bg-slate-900/60 border-t-2 border-slate-800">
                      <td colSpan="2" className="p-3 pl-4 border-l-4 border-indigo-500 font-bold text-slate-200 text-sm tracking-wider uppercase">
                        {category}
                      </td>
                    </tr>
                    {items.map((c, i) => {
                      const isGal = isGallonsCategory(c.category) && !c.category.toUpperCase().includes('FILTER');
                      return (
                        <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 pl-8 text-slate-300 text-sm font-medium">
                            {c.item_name}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-4 py-1.5 rounded-lg text-sm font-bold font-mono">
                                {c.quantity} {isGal && <span className="ml-1 text-xs text-indigo-300/50">Gal</span>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))
              )}
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Add Form */}
          <div className="bg-slate-950/40 p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Add / Update Inventory Log
              </h2>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-400">Date Checked:</label>
                <input 
                  type="date"
                  value={newLogDate}
                  onChange={(e) => setNewLogDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 pb-4">
              {editItems.map((item, idx) => {
                const isGal = isGallonsCategory(item.category) && !item.category.toUpperCase().includes('FILTER');
                return (
                  <div key={item.id} className="flex flex-col md:flex-row gap-3 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="w-full md:w-1/3 flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                      <input 
                        type="text"
                        value={item.category}
                        onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                        placeholder="e.g. COOLANT"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="w-full md:w-1/3 flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Item Description</label>
                      <input 
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(item.id, 'item_name', e.target.value)}
                        placeholder="e.g. RED"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="w-full md:w-1/4 flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                        Quantity
                        {isGal && <span className="text-indigo-400 bg-indigo-900/30 px-1 rounded">Gallons</span>}
                      </label>
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono font-bold focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="w-full md:w-auto flex flex-col justify-end pt-5">
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 bg-red-950/40 text-red-400 rounded-lg hover:bg-red-900/60 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              <button 
                onClick={handleAddItem}
                className="mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 py-4 rounded-xl transition-all font-bold text-sm uppercase tracking-wider"
              >
                <Plus className="w-5 h-5" />
                Add Row
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-6">
              <button 
                onClick={() => setMode('view')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveLog}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white font-bold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/30 active:scale-95"
              >
                {saving ? (
                  <div className="spinner text-white w-4 h-4 border-2" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
