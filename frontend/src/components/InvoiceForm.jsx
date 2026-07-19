import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { ArrowLeft, Plus, Trash2, Printer, ShieldCheck } from 'lucide-react';
import { useUI } from './UIContext';

export default function InvoiceForm({ 
  mode = 'create', 
  jobCard, 
  invoiceNoToOverwrite, 
  onBack, 
  onShowPDF 
}) {
  const isOverwrite = mode === 'overwrite';
  const { showAlert } = useUI();

  // Invoice Fields
  const [invoiceNo, setInvoiceNo] = useState('Loading...');
  const [jobNo, setJobNo] = useState('');
  
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mrMs, setMrMs] = useState('');
  const [dateIn, setDateIn] = useState('');
  
  // Read-only mapped fields
  const [phone, setPhone] = useState('');
  const [brandYear, setBrandYear] = useState('');
  const [plateNo, setPlateNo] = useState('');
  const [vinMileage, setVinMileage] = useState('');

  // Dynamic Line Items
  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }
  ]);

  const [applyVat, setApplyVat] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [vatVal, setVatVal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auto-complete descriptions
  const autocompleteOptions = [
    'Minor Service',
    'Major Service',
    'Oil Change (10k)',
    'Brake Pad Replacement',
    'AC Gas Refill'
  ];

  // Fetch Initial Data
  const initializeInvoice = async () => {
    try {
      setLoading(true);
      if (isOverwrite) {
        // Fetch invoice details
        const res = await fetch(`/api/invoice/${invoiceNoToOverwrite}`);
        if (res.ok) {
          const data = await res.json();
          setInvoiceNo(data.invoice_no);
          setJobNo(data.job_no);
          setMrMs(data.full_name || '');
          setPhone(data.phone_no || '');
          setBrandYear(`${data.make || ''} ${data.model || ''} ${data.year || ''}`.trim());
          setPlateNo(data.reg_no || '');
          setVinMileage(`${data.vin_no || ''} / ${data.mileage || ''}`);
          setApplyVat(!!data.vat_applied);

          if (data.invoice_date) {
            setInvoiceDate(data.invoice_date.split('T')[0]);
          }
          if (data.date_in) {
            setDateIn(data.date_in.split('T')[0]);
          }

          if (data.items && data.items.length > 0) {
            const formattedItems = data.items.map((item, index) => ({
              id: item.id || index + 1,
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: parseFloat(item.unit_price) || 0,
              discount: parseFloat(item.discount) || 0,
              total: parseFloat(item.total) || 0
            }));
            setItems(formattedItems);
          }
        } else {
          showAlert('Invoice not found.', 'warning');
          onBack();
        }
      } else {
        // Create Mode - Pre-fill from Job Card
        setJobNo(jobCard.job_no);
        setMrMs(jobCard.full_name || '');
        setPhone(jobCard.phone_no || '');
        setBrandYear(`${jobCard.make || ''} ${jobCard.model || ''} ${jobCard.year || ''}`.trim());
        setPlateNo(jobCard.reg_no || '');
        setVinMileage(`${jobCard.vin_no || ''} / ${jobCard.mileage || ''}`);
        
        if (jobCard.date_in) {
          setDateIn(jobCard.date_in.split('T')[0]);
        }

        // Fetch Next Invoice Number
        const invRes = await fetch('/api/next-invoice-no');
        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoiceNo(invData.nextId);
        }
      }
    } catch (err) {
      console.error('Invoice initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeInvoice();
  }, [mode, jobCard, invoiceNoToOverwrite]);

  // Recalculate row totals, subtotal, VAT, and grand total
  useEffect(() => {
    let sub = 0;
    const updatedItems = items.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const disc = parseFloat(item.discount) || 0;

      let rowTotal = qty * price;
      if (disc > 0) {
        rowTotal = rowTotal - (rowTotal * (disc / 100));
      }
      
      sub += rowTotal;
      return { ...item, total: rowTotal };
    });

    // We do NOT call setItems inside here directly to prevent loops,
    // instead we update calculations and only mutate items during explicit inputs.
    setSubtotal(sub);
    const vat = applyVat ? sub * 0.05 : 0;
    setVatVal(vat);
    setGrandTotal(sub + vat);
  }, [items, applyVat]);

  // Add Item Row
  const handleAddRow = () => {
    const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    setItems([
      ...items,
      { id: newId, description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }
    ]);
  };

  // Remove Item Row
  const handleRemoveRow = (id) => {
    if (items.length === 1) return; // Keep at least one row
    setItems(items.filter(item => item.id !== id));
  };

  // Update item field value
  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate total for this row immediately
        const qty = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(item.quantity) || 0;
        const price = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(item.unit_price) || 0;
        const disc = field === 'discount' ? parseFloat(value) || 0 : parseFloat(item.discount) || 0;
        let total = qty * price;
        if (disc > 0) {
          total = total - (total * (disc / 100));
        }
        updated.total = total;
        return updated;
      }
      return item;
    }));
  };

  // Compile PDF locally
  const generatePDFBytes = async (savedInvoiceNo, finalItems) => {
    let displayDate = invoiceDate.split('-').reverse().join('-');
    let displayDateIn = dateIn.split('-').reverse().join('-');

    try {
      const existingPdfBytes = await fetch('/resources/INVOICE_TEMPLATE.pdf').then(res => {
        if (!res.ok) throw new Error('INVOICE_TEMPLATE.pdf not found');
        return res.arrayBuffer();
      });

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const firstPage = pdfDoc.getPages()[0];

      const draw = (text, x, y) => {
        if (text === null || text === undefined || text === '') return;
        firstPage.drawText(String(text), { x, y, size: 11, color: rgb(0, 0, 0) });
      };

      // Header Mapping
      draw(mrMs, 120, 666);
      draw(phone, 120, 654);
      draw(displayDateIn, 120, 642);
      draw(brandYear, 380, 666);
      draw(plateNo, 380, 654);
      draw(savedInvoiceNo, 380, 642);
      draw(vinMileage, 380, 630);

      // Line Items (per row, starting at Y = 572)
      let startY = 572;
      finalItems.forEach((item, i) => {
        let y = startY - (i * 12.25);
        draw(String(i + 1), 50, y);
        draw(item.description, 100, y);
        draw(String(item.quantity), 325, y);
        draw(parseFloat(item.unit_price).toFixed(2), 395, y);
        if (parseFloat(item.discount) > 0) {
          draw(item.discount + '%', 440, y);
        }
        draw(parseFloat(item.total).toFixed(2), 500, y);
      });

      // Totals
      draw(subtotal.toFixed(2), 490, startY - 249);
      if (applyVat) {
        draw(vatVal.toFixed(2), 490, startY - 261.25);
      }
      draw(grandTotal.toFixed(2), 490, startY - 273.5);

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      return URL.createObjectURL(pdfBlob);
    } catch (err) {
      console.error('Invoice PDF Generation failed:', err);
      showAlert('Failed to generate PDF. Make sure INVOICE_TEMPLATE.pdf is uploaded to the resources folder!', 'error');
      return null;
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Filter out items that don't have a description
    const filteredItems = items
      .filter(item => item.description.trim() !== '')
      .map((item, index) => ({
        order_no: index + 1,
        description: item.description.trim(),
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        discount: parseFloat(item.discount) || 0,
        total: parseFloat(item.total) || 0
      }));

    if (filteredItems.length === 0) {
      showAlert('Invoice must contain at least one row with a description.', 'warning');
      setSaving(false);
      return;
    }

    const apiPayload = {
      job_no: jobNo,
      invoice_date: invoiceDate,
      subtotal: subtotal,
      vat_applied: applyVat,
      grand_total: grandTotal,
      items: filteredItems
    };

    const endpoint = isOverwrite ? `/api/update-invoice/${invoiceNo}` : '/api/create-invoice';
    const method = isOverwrite ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (response.ok) {
        // Compile PDF & show preview
        const pdfUrl = await generatePDFBytes(invoiceNo, filteredItems);
        if (pdfUrl) {
          const downloadName = `Invoice_${invoiceNo}_${mrMs}.pdf`;
          onShowPDF(pdfUrl, downloadName);
        }
        onBack();
      } else {
        const errData = await response.json();
        showAlert(errData.error || 'Failed to save Invoice.', 'error');
      }
    } catch (err) {
      console.error('Error submitting invoice:', err);
      showAlert('An error occurred while saving the invoice.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto glass-panel rounded-2xl p-12 text-center text-slate-500">
        <div className="flex flex-col items-center gap-2 justify-center">
          <div className="spinner text-green-500" />
          <span>Setting up Invoice workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto glass-panel glass-panel-glow-green rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
        <button 
          onClick={onBack} 
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-extrabold text-green-500 tracking-tight glow-text-green">
            {isOverwrite ? 'Overwrite Invoice' : 'Generate Invoice'}
          </h1>
          <div className="text-xs font-mono text-slate-400 mt-1 flex gap-4 justify-end">
            <span>Invoice ID: <span className="text-green-400 font-bold font-mono">#{invoiceNo}</span></span>
            <span>Job Card: <span className="text-slate-300 font-bold font-mono">#{jobNo}</span></span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Section: Editable Fields */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-green-500 pl-2">
            Editable Header Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Date</label>
              <input 
                type="date" 
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-green-500 text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Name (Mr. / Ms.)</label>
              <input 
                type="text" 
                value={mrMs}
                onChange={(e) => setMrMs(e.target.value)}
                placeholder="Name on Invoice"
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-green-500 text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date In</label>
              <input 
                type="date" 
                value={dateIn}
                onChange={(e) => setDateIn(e.target.value)}
                className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-green-500 text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* Section: Mapped Fields (Read-Only) */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-slate-700 pl-2">
            Mapped Job Profile (Read-Only)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/20 p-4 border border-slate-800 rounded-xl">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone No.</span>
              <span className="text-slate-300 font-semibold text-sm">{phone || '—'}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Brand / Year</span>
              <span className="text-slate-300 font-semibold text-sm">{brandYear || '—'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plate Number</span>
              <span className="text-slate-300 font-semibold text-sm">{plateNo || '—'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">VIN / Mileage</span>
              <span className="text-slate-300 font-semibold text-sm">{vinMileage || '—'}</span>
            </div>
          </div>
        </div>

        {/* Section: Services / Items */}
        <div>
          <div className="flex justify-between items-center mb-4 border-l-4 border-green-500 pl-2">
            <h2 className="text-lg font-bold text-slate-200">
              Services & Line Items
            </h2>
            <button 
              type="button" 
              onClick={handleAddRow}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-950/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>

          <datalist id="desc_options">
            {autocompleteOptions.map((opt, idx) => (
              <option key={idx} value={opt} />
            ))}
          </datalist>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/10">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs font-bold tracking-wider bg-slate-950/40 select-none">
                  <th className="p-3 w-12 text-center">No.</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 w-20">Qty</th>
                  <th className="p-3 w-28">Price (AED)</th>
                  <th className="p-3 w-24">Disc. (%)</th>
                  <th className="p-3 w-32 text-right">Total (AED)</th>
                  <th className="p-3 w-12 text-center text-red-500">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-900/10">
                    <td className="p-2 text-center text-slate-500 font-bold font-mono">
                      {index + 1}
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Service performed"
                        list="desc_options"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-green-500"
                        required={index === 0}
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-green-500 text-center"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(item.id, 'unit_price', e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-green-500 text-right"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-green-500 text-center"
                      />
                    </td>
                    <td className="p-2 text-right text-slate-200 font-bold font-mono">
                      {parseFloat(item.total).toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        type="button"
                        onClick={() => handleRemoveRow(item.id)}
                        disabled={items.length === 1}
                        className="text-slate-600 hover:text-red-500 disabled:opacity-20 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Totals */}
        <div className="flex flex-col items-end gap-3 border-t border-slate-800 pt-6 mt-4">
          <div className="flex items-center gap-4 w-72 justify-between">
            <span className="text-slate-400 font-semibold text-sm">Subtotal:</span>
            <span className="text-slate-300 font-bold font-mono text-sm">{subtotal.toFixed(2)} AED</span>
          </div>

          <div className="flex items-center gap-4 w-72 justify-between py-1 bg-slate-950/20 px-3 rounded-lg border border-slate-800/40">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={applyVat}
                onChange={(e) => setApplyVat(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-green-500 rounded border-slate-800 bg-slate-950"
              />
              <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Apply 5% VAT</span>
            </label>
            <span className="text-slate-400 font-medium font-mono text-xs">+{vatVal.toFixed(2)} AED</span>
          </div>

          <div className="flex items-center gap-4 w-72 justify-between pt-3 border-t border-slate-800/80">
            <span className="text-white font-extrabold text-base">Grand Total:</span>
            <span className="text-green-400 font-extrabold font-mono text-lg">{grandTotal.toFixed(2)} AED</span>
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
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-850 disabled:text-slate-500 font-bold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-green-950/30 hover:shadow-green-500/20 active:scale-95 text-white"
          >
            {saving ? (
              <>
                <div className="spinner text-white w-4 h-4 border-2" />
                <span>Saving Invoice...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                {isOverwrite ? 'Overwrite & Print' : 'Generate & Print Invoice'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
