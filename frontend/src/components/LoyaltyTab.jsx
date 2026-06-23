import React, { useState, useEffect } from 'react';
import { Search, Gift, Award, CheckCircle, Car, UserCheck, Phone, CreditCard } from 'lucide-react';

export default function LoyaltyTab({ onBack }) {
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLoyaltyCards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/loyalty-cards');
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      console.error('Failed to load loyalty cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyCards();
  }, []);

  const handleIncrement = async (vin_no, currentName) => {
    try {
        const res = await fetch(`/api/loyalty-cards/${vin_no}/increment`, { method: 'PUT' });
        if (res.ok) {
            setCards(cards.map(c => c.vin_no === vin_no ? { ...c, loyalty_visits: (c.loyalty_visits || 0) + 1 } : c));
        } else {
            alert('Failed to increment loyalty visits');
        }
    } catch(e) {
        console.error(e);
        alert('An error occurred');
    }
  };

  const filteredCards = cards.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.full_name || '').toLowerCase().includes(term) ||
      (c.phone_no || '').toLowerCase().includes(term) ||
      (c.make || '').toLowerCase().includes(term) ||
      (c.model || '').toLowerCase().includes(term) ||
      (c.oil_card_no || '').toLowerCase().includes(term)
    );
  });

  const groupedCards = filteredCards.reduce((acc, card) => {
    const key = card.customer_id || card.full_name || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        customer_id: card.customer_id,
        full_name: card.full_name,
        phone_no: card.phone_no,
        vehicles: []
      };
    }
    acc[key].vehicles.push(card);
    return acc;
  }, {});

  return (
    <div className="w-full max-w-6xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-amber-500 tracking-tight flex items-center gap-3 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
            <Gift className="w-8 h-8 text-amber-400" />
            Loyalty Cards
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">
            Customer Rewards & Visit Tracking
          </p>
        </div>

        <button
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase active:scale-95 border border-slate-700/40"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="relative flex-grow mb-6">
        <span className="absolute left-4 top-3.5 text-slate-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          placeholder="Search by Name, Card No, Phone, or Vehicle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-bold tracking-wider bg-slate-950/40 select-none">
              <th className="p-4"><div className="flex items-center gap-2"><Car className="w-4 h-4" />Vehicle</div></th>
              <th className="p-4"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-500" />Card No.</div></th>
              <th className="p-4 text-center"><div className="flex items-center justify-center gap-2"><Award className="w-4 h-4 text-amber-500" />Visits</div></th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          
          {loading ? (
            <tbody>
              <tr>
                <td colSpan="4" className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <div className="spinner text-amber-500 border-4 w-8 h-8 rounded-full border-t-amber-500 animate-spin" />
                    <span>Loading loyalty data...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : Object.keys(groupedCards).length === 0 ? (
            <tbody>
              <tr>
                <td colSpan="4" className="p-12 text-center text-slate-500 italic">
                  No loyalty records found.
                </td>
              </tr>
            </tbody>
          ) : (
            Object.values(groupedCards).map(group => (
              <tbody key={group.customer_id || group.full_name} className="divide-y divide-slate-800/30">
                <tr className="bg-slate-900/60 border-t-2 border-slate-800">
                  <td colSpan="4" className="p-3 pl-4 border-l-4 border-amber-500">
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        {group.full_name || 'Unknown Customer'}
                      </div>
                      <div className="text-slate-400 text-xs flex items-center gap-1 font-mono bg-slate-950/50 px-2 py-1 rounded-md border border-slate-800">
                        <Phone className="w-3 h-3" /> {group.phone_no || 'N/A'}
                      </div>
                    </div>
                  </td>
                </tr>
                {group.vehicles.map((c, i) => (
                  <tr key={`${c.vin_no}-${i}`} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 pl-8 text-slate-300 text-sm font-medium">
                      {c.make || c.model ? `${c.make || ''} ${c.model || ''}`.trim() : <span className="text-slate-500 italic">Unknown Vehicle</span>}
                    </td>
                    <td className="p-4 text-sm font-mono text-amber-400/90 font-bold">
                      {c.oil_card_no}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold">
                          {c.loyalty_visits || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleIncrement(c.vin_no, c.full_name)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/50 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        +1 Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))
          )}
        </table>
      </div>
    </div>
  );
}
