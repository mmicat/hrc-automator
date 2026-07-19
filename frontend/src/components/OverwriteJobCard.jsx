import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { ArrowLeft, Save, ShieldAlert, Printer } from 'lucide-react';
import { useUI } from './UIContext';

export default function OverwriteJobCard({ jobNo, onBack, onShowPDF }) {
  const { showAlert } = useUI();
  // Job Card Fields
  const [fullName, setFullName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [oilCardNo, setOilCardNo] = useState('');
  
  const [vinNo, setVinNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [regNo, setRegNo] = useState('');
  
  const [dateIn, setDateIn] = useState('');
  const [mileage, setMileage] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch the job card details on load
  const fetchJobCard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/job-card/${jobNo}`);
      if (res.ok) {
        const data = await res.json();
        setFullName(data.full_name || '');
        setPhoneNo(data.phone_no || '');
        setOilCardNo(data.oil_card_no || '');
        setVinNo(data.vin_no || '');
        setMake(data.make || '');
        setModel(data.model || '');
        setYear(data.year || '');
        setColor(data.color || '');
        setRegNo(data.reg_no || '');
        setMileage(data.mileage || '');
        if (data.date_in) {
          setDateIn(data.date_in.split('T')[0]);
        }
      } else {
        showAlert('Job Card Not Found.', 'warning');
        onBack();
      }
    } catch (err) {
      console.error('Error fetching job card:', err);
      showAlert('An error occurred while loading the job card.', 'error');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobNo) {
      fetchJobCard();
    }
  }, [jobNo]);

  // Compile updated PDF document locally
  const generatePDFBytes = async () => {
    let displayDate = dateIn;
    if (dateIn) {
      displayDate = dateIn.split('-').reverse().join('-');
    }

    try {
      const existingPdfBytes = await fetch('/resources/TEMPLATE.pdf').then(res => {
        if (!res.ok) throw new Error('TEMPLATE.pdf not found');
        return res.arrayBuffer();
      });
      
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const firstPage = pdfDoc.getPages()[0];

      const draw = (text, x, y) => {
        if (text === null || text === undefined || text === '') return;
        firstPage.drawText(String(text), { x, y, size: 11, color: rgb(0, 0, 0) });
      };

      // Coordinates mapping from system documentation
      draw(jobNo, 492, 688);
      draw(displayDate, 492, 675);
      draw(fullName, 20, 605);
      draw(phoneNo, 350, 605);
      draw(make, 20, 552);
      draw(model, 220, 552);
      draw(year, 416, 552);
      draw(color, 20, 497);
      draw(regNo, 220, 497);
      draw(`${mileage} km`, 416, 497);
      draw(vinNo, 20, 458);

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      return URL.createObjectURL(pdfBlob);
    } catch (err) {
      console.error('PDF generation error:', err);
      showAlert('Failed to generate Job Card PDF. Verify resources/TEMPLATE.pdf is uploaded.', 'error');
      return null;
    }
  };

  // Submit and update job card record
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = {
      full_name: fullName,
      phone_no: phoneNo,
      oil_card_no: oilCardNo,
      vin_no: vinNo,
      make,
      model,
      year: year ? parseInt(year) : null,
      color,
      reg_no: regNo,
      date_in: dateIn,
      mileage: mileage ? parseInt(mileage) : null
    };

    try {
      const response = await fetch(`/api/update-job-card/${jobNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        // Generate PDF
        const pdfUrl = await generatePDFBytes();
        if (pdfUrl) {
          const downloadName = `${jobNo} ${fullName} ${make} ${model} ${regNo}.pdf`;
          onShowPDF(pdfUrl, downloadName);
        }
        onBack();
      } else {
        showAlert(result.error || 'Failed to update Job Card.', 'error');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showAlert('An error occurred while updating the Job Card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto glass-panel rounded-2xl p-12 text-center text-slate-500">
        <div className="flex flex-col items-center gap-2 justify-center">
          <div className="spinner text-orange-500" />
          <span>Fetching Job Card details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto glass-panel glass-panel-glow-orange rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
        <button 
          onClick={onBack} 
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-extrabold text-orange-500 tracking-tight glow-text-orange">
            Overwrite & Reprint
          </h1>
          <div className="text-xs font-mono text-slate-400 mt-1">
            Editing Job Card: <span className="text-orange-400 font-bold ml-1 text-sm font-mono">#{jobNo}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Section: Client Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-l-4 border-orange-500 pl-2">
            Client Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Customer Name"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
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
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oil Card No</label>
              <input 
                type="text" 
                value={oilCardNo}
                onChange={(e) => setOilCardNo(e.target.value)}
                placeholder="Optional Reference"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section: Vehicle Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-l-4 border-orange-500 pl-2">
            Vehicle Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIN Number</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={vinNo}
                  onChange={(e) => setVinNo(e.target.value)}
                  placeholder="Chassis Number"
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium pr-28"
                  required
                />
                <span className="absolute right-4 top-3 text-slate-500 text-xs italic flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
                  Assigned VIN
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Make</label>
              <input 
                type="text" 
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Nissan"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model</label>
              <input 
                type="text" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Patrol"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Year</label>
              <input 
                type="number" 
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Year"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Color</label>
              <input 
                type="text" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Color"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plate Number</label>
              <input 
                type="text" 
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="Registration Plate"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section: Job Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-l-4 border-orange-500 pl-2">
            Job Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date In</label>
              <input 
                type="date" 
                value={dateIn}
                onChange={(e) => setDateIn(e.target.value)}
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Mileage (km)</label>
              <input 
                type="number" 
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="Odometer reading"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-orange-500 text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

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
            disabled={saving}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-850 disabled:text-slate-500 font-bold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-orange-950/30 hover:shadow-orange-500/20 active:scale-95 text-slate-950"
          >
            {saving ? (
              <>
                <div className="spinner text-slate-950 w-4 h-4 border-2" />
                <span>Overwriting...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Overwrite & Reprint
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
