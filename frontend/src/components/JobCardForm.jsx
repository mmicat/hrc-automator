import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { ArrowLeft, RefreshCw, Printer, Trash } from 'lucide-react';

export default function JobCardForm({ 
  prefillPhone, 
  prefillVin, 
  onBack, 
  onShowPDF 
}) {
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
  
  const [dateIn, setDateIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  
  const [nextJobNo, setNextJobNo] = useState('Loading...');
  const [loading, setLoading] = useState(false);

  // Sync Next Job Number
  const fetchNextJobNumber = async () => {
    try {
      const response = await fetch('/api/next-job-no');
      if (response.ok) {
        const data = await response.json();
        setNextJobNo(data.nextId);
      }
    } catch (err) {
      console.error('Failed to sync job number:', err);
    }
  };

  // Pre-fill fields if requested
  const loadPrefillData = async () => {
    if (!prefillPhone) return;
    try {
      const url = prefillVin 
        ? `/api/search-client/${prefillPhone}?vin=${prefillVin}` 
        : `/api/search-client/${prefillPhone}`;
      const res = await fetch(url);
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
      }
    } catch (err) {
      console.error('Error fetching prefill data:', err);
    }
  };

  useEffect(() => {
    fetchNextJobNumber();
    loadPrefillData();
  }, [prefillPhone, prefillVin]);

  // Reset form
  const handleClear = () => {
    setFullName('');
    setPhoneNo('');
    setOilCardNo('');
    setVinNo('');
    setMake('');
    setModel('');
    setYear('');
    setColor('');
    setRegNo('');
    setDateIn(new Date().toISOString().split('T')[0]);
    setMileage('');
    fetchNextJobNumber();
  };

  // Compile PDF document locally
  const generatePDFBytes = async (jobNo) => {
    // Convert YYYY-MM-DD to DD-MM-YYYY for the template output
    let displayDate = dateIn;
    if (dateIn) {
      displayDate = dateIn.split('-').reverse().join('-');
    }

    try {
      const existingPdfBytes = await fetch('/resources/TEMPLATE.pdf').then(res => {
        if (!res.ok) throw new Error('TEMPLATE.pdf template not found');
        return res.arrayBuffer();
      });
      
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const firstPage = pdfDoc.getPages()[0];

      const draw = (text, x, y) => {
        if (text === null || text === undefined || text === '') return;
        firstPage.drawText(String(text), { x, y, size: 11, color: rgb(0, 0, 0) });
      };

      // Coordinate mapping from documentation
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
      alert('Failed to generate Job Card PDF. Verify resources/TEMPLATE.pdf is uploaded.');
      return null;
    }
  };

  // Submit and create job card record
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
      const response = await fetch('/api/create-job-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        // Generate PDF
        const pdfUrl = await generatePDFBytes(result.job_no);
        if (pdfUrl) {
          const downloadName = `${result.job_no} ${fullName} ${make} ${model} ${regNo}.pdf`;
          onShowPDF(pdfUrl, downloadName);
        }
        handleClear();
      } else {
        alert(result.error || 'Failed to create Job Card.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('An error occurred. Check your database connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto glass-panel glass-panel-glow-red rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-200">
      
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
          <h1 className="text-2xl font-extrabold text-red-500 tracking-tight glow-text-red">
            Create Job Card
          </h1>
          <div className="text-xs font-mono text-slate-400 mt-1">
            Next Job ID: <span className="text-red-400 font-bold ml-1 font-mono">#{nextJobNo}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Section: Client Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-l-4 border-red-500 pl-2">
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
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
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
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
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
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section: Vehicle Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-l-4 border-red-500 pl-2">
            Vehicle Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIN Number</label>
              <input 
                type="text" 
                value={vinNo}
                onChange={(e) => setVinNo(e.target.value)}
                placeholder="Chassis Number"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Make</label>
              <input 
                type="text" 
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Nissan"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
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
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
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
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Color</label>
              <input 
                type="text" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Color"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plate Number</label>
              <input 
                type="text" 
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="Registration Plate"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section: Job Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-l-4 border-red-500 pl-2">
            Job Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date In</label>
              <input 
                type="date" 
                value={dateIn}
                onChange={(e) => setDateIn(e.target.value)}
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
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
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-6">
          <button 
            type="button" 
            onClick={handleClear}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Clear
          </button>
          
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800/40 disabled:text-slate-500 font-bold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-red-950/30 hover:shadow-red-500/20 active:scale-95"
          >
            {loading ? (
              <>
                <div className="spinner text-white w-4 h-4 border-2" />
                <span>Generating Card...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Generate Job Card
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
