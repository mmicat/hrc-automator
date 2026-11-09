import React, { useState, useEffect } from 'react';
import { Search, Save, Trash2, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import BackButton from './BackButton';
import { useUI } from './UIContext';

export default function RecordForm({ mode, editRecord, onBack }) {
  const isEdit = mode === 'edit';
  const { showAlert, showConfirm } = useUI();

  // Client Details
  const [customerId, setCustomerId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [oilCardNo, setOilCardNo] = useState('');

  // Vehicle Details
  const [vinNo, setVinNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [regNo, setRegNo] = useState('');

  // Search state (for Add Mode client linking)
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Transfer ownership (edit mode, existing vehicle only)
  const [transferPhone, setTransferPhone] = useState('');
  const [transferPreview, setTransferPreview] = useState(null);
  const [transferring, setTransferring] = useState(false);

  // Setup form states when entering edit mode or resetting
  useEffect(() => {
    if (isEdit && editRecord) {
      setCustomerId(editRecord.customer_id || '');
      setFullName(editRecord.full_name || '');
      setPhoneNo(editRecord.phone_no || '');
      setOilCardNo(editRecord.oil_card_no || '');
      setVinNo(editRecord.vin_no || '');
      setMake(editRecord.make || '');
      setModel(editRecord.model || '');
      setYear(editRecord.year || '');
      setColor(editRecord.color || '');
      setRegNo(editRecord.reg_no || '');
      setTransferPhone('');
      setTransferPreview(null);
    } else {
      handleClear();
    }
  }, [mode, editRecord]);

  const handleClear = () => {
    setCustomerId('');
    setFullName('');
    setPhoneNo('');
    setOilCardNo('');
    setVinNo('');
    setMake('');
    setModel('');
    setYear('');
    setColor('');
    setRegNo('');
    setSearchPhone('');
    setTransferPhone('');
    setTransferPreview(null);
  };

  // Client Search in Add Mode
  const handleClientSearch = async () => {
    if (!searchPhone) {
      showAlert('Enter a phone number to search.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/search-client/${searchPhone}`);
      if (res.ok) {
        const data = await res.json();
        setFullName(data.full_name || '');
        setPhoneNo(data.phone_no || '');
        setOilCardNo(data.oil_card_no || '');
        showAlert(`Found existing customer profile for: ${data.full_name}! You can now update or add vehicle details.`, 'success');
      } else {
        showAlert('Customer profile not found. You can fill out a new profile below.', 'info');
      }
    } catch (err) {
      console.error('Error searching client:', err);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    if (!customerId) return;
    const confirmMsg = 'CRITICAL: Are you sure you want to permanently delete this Customer Profile and potentially all tied vehicles? This cannot be undone.';
    if (await showConfirm(confirmMsg)) {
      try {
        const res = await fetch(`/api/delete-customer/${customerId}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('Customer deleted.', 'success');
          onBack();
        } else {
          showAlert('Failed to delete customer.', 'error');
        }
      } catch (err) {
        console.error('Delete customer error:', err);
      }
    }
  };

  const handleFindNewOwner = async () => {
    if (!vinNo) {
      showAlert('This record has no vehicle to transfer.', 'warning');
      return;
    }
    if (!transferPhone.trim()) {
      showAlert('Enter the new owner\'s phone number.', 'warning');
      return;
    }

    setTransferring(true);
    setTransferPreview(null);
    try {
      const res = await fetch('/api/transfer-vehicle/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin_no: vinNo, phone_no: transferPhone.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || 'Could not find that customer.', 'error');
        return;
      }
      setTransferPreview(data);
    } catch (err) {
      console.error('Transfer preview error:', err);
      showAlert('Could not look up that customer.', 'error');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferPreview) return;
    const vehicleLabel = [transferPreview.vehicle.make, transferPreview.vehicle.model, transferPreview.vehicle.reg_no]
      .filter(Boolean)
      .join(' ');
    const confirmMsg = `Transfer ${vehicleLabel} from ${transferPreview.from.full_name} to ${transferPreview.to.full_name} (${transferPreview.to.phone_no})? Past job cards stay with ${transferPreview.from.full_name}.`;
    if (!(await showConfirm(confirmMsg))) return;

    setTransferring(true);
    try {
      const res = await fetch('/api/transfer-vehicle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin_no: vinNo, phone_no: transferPhone.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || 'Transfer failed.', 'error');
        return;
      }
      const historyNote = data.job_cards_unchanged
        ? ` ${data.job_cards_unchanged} existing job card${data.job_cards_unchanged === 1 ? '' : 's'} still show the previous owner.`
        : '';
      showAlert(`Ownership moved to ${data.to.full_name}.${historyNote}`, 'success');
      onBack();
    } catch (err) {
      console.error('Transfer error:', err);
      showAlert('An error occurred during the transfer.', 'error');
    } finally {
      setTransferring(false);
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = async () => {
    if (!vinNo) {
      showAlert('No vehicle to delete for this record.', 'warning');
      return;
    }
    const confirmMsg = 'Are you sure you want to permanently delete this Vehicle? This cannot be undone.';
    if (await showConfirm(confirmMsg)) {
      try {
        const res = await fetch(`/api/delete-vehicle/${vinNo}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('Vehicle deleted.', 'success');
          onBack();
        } else {
          showAlert('Failed to delete vehicle.', 'error');
        }
      } catch (err) {
        console.error('Delete vehicle error:', err);
      }
    }
  };

  // Submit Save or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = {
      customer_id: customerId || null,
      full_name: fullName,
      phone_no: phoneNo,
      oil_card_no: oilCardNo,
      vin_no: vinNo,
      make,
      model,
      year: year ? parseInt(year) : null,
      color,
      reg_no: regNo
    };

    const endpoint = isEdit ? '/api/update-record' : '/api/add-customer-record';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        showAlert(isEdit ? 'Record updated successfully!' : 'Customer / Vehicle record added successfully!', 'success');
        handleClear();
        onBack();
      } else {
        showAlert(result.error || 'Failed to save record.', 'error');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showAlert('An error occurred. Check your database connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-200 ${
      isEdit ? 'glass-panel-glow-yellow' : 'glass-panel-glow-blue'
    }`}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
        <BackButton onClick={onBack} label="Back to Dashboard" />
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${
            isEdit ? 'text-yellow-500 glow-text-yellow' : 'text-blue-500 glow-text-blue'
          }`}>
            {isEdit ? 'Edit Customer / Vehicle' : 'Add Customer / Vehicle'}
          </h1>
        </div>
      </div>

      {/* Lookup Bar (only in Add Mode) */}
      {!isEdit && (
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          <div className="flex-grow flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Search Existing Client</span>
            <input 
              type="text" 
              placeholder="Search by client phone number"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 outline-none focus:border-blue-500 text-sm font-medium"
            />
          </div>
          <button 
            type="button" 
            onClick={handleClientSearch}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all h-[38px] active:scale-95 shrink-0"
          >
            <Search className="w-4 h-4" />
            Search Phone
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Section: Client Details */}
        <div>
          <div className="flex justify-between items-center mb-4 border-l-4 pl-2 border-blue-500">
            <h2 className="text-lg font-bold text-slate-200">
              Client Details
            </h2>
            {isEdit && (
              <button 
                type="button" 
                onClick={handleDeleteCustomer}
                className="text-xs font-bold text-red-500 hover:underline px-2 py-1.5 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Profile
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Customer Name"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
              <input 
                type="text" 
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
                placeholder="Phone Number"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* Section: Vehicle Details */}
        <div>
          <div className="flex justify-between items-center mb-4 border-l-4 pl-2 border-blue-500">
            <h2 className="text-lg font-bold text-slate-200">
              Vehicle Details {!isEdit && <span className="text-slate-500 font-normal text-sm ml-1">(Optional)</span>}
            </h2>
            {isEdit && vinNo && (
              <button 
                type="button" 
                onClick={handleDeleteVehicle}
                className="text-xs font-bold text-red-500 hover:underline px-2 py-1.5 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Vehicle
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIN (Chassis Number)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={vinNo}
                  onChange={(e) => setVinNo(e.target.value)}
                  placeholder="Chassis Number"
                  className={`w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none ${
                    isEdit 
                      ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-slate-950/40 border-slate-800 text-slate-200 focus:border-blue-500'
                  }`}
                  required={isEdit || !!make || !!model || !!regNo}
                  readOnly={isEdit}
                  title={isEdit ? 'VIN is the unique primary key and cannot be edited.' : ''}
                />
                {isEdit && (
                  <span className="absolute right-4 top-3 text-slate-500 text-xs italic flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-yellow-500" />
                    Read-only
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Make</label>
              <input 
                type="text" 
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Nissan"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model</label>
              <input 
                type="text" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Patrol"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Year</label>
              <input 
                type="number" 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Year"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Color</label>
              <input 
                type="text" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Color"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plate Number</label>
              <input 
                type="text" 
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="Registration Plate"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oil Card Number</label>
              <input 
                type="text" 
                value={oilCardNo}
                onChange={(e) => setOilCardNo(e.target.value)}
                placeholder="Optional Reference"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {isEdit && vinNo && (
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-yellow-500" />
              <h2 className="text-sm font-bold text-slate-200">Transfer Ownership</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Moves this vehicle to another existing customer. Job cards and invoices stay with the owner they were created for.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
              <input
                type="text"
                value={transferPhone}
                onChange={(e) => {
                  setTransferPhone(e.target.value);
                  setTransferPreview(null);
                }}
                placeholder="New owner's phone number"
                className="flex-grow w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 outline-none focus:border-yellow-500 text-sm font-medium"
              />
              <button
                type="button"
                onClick={handleFindNewOwner}
                disabled={transferring}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all h-[38px] active:scale-95 shrink-0"
              >
                <Search className="w-4 h-4" />
                Find Owner
              </button>
            </div>
            {transferPreview && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-yellow-900/40 bg-yellow-950/20 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-300">
                  Move to <span className="font-bold text-yellow-400">{transferPreview.to.full_name}</span>
                  <span className="text-slate-500"> · {transferPreview.to.phone_no}</span>
                </p>
                <button
                  type="button"
                  onClick={handleTransferOwnership}
                  disabled={transferring}
                  className="bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider shrink-0"
                >
                  {transferring ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-6">
          <button 
            type="button" 
            onClick={onBack}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
          
          <button 
            type="submit" 
            disabled={loading}
            className={`flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-lg active:scale-95 ${
              isEdit 
                ? 'bg-yellow-600 hover:bg-yellow-500 text-slate-950 shadow-yellow-950/30' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/30'
            }`}
          >
            {loading ? (
              <>
                <div className="spinner text-slate-950 w-4 h-4 border-2" />
                <span>Saving Record...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Update Record' : 'Save Record'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
