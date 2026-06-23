import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import JobCardForm from './components/JobCardForm';
import RecordForm from './components/RecordForm';
import OverwriteJobCard from './components/OverwriteJobCard';
import InvoiceEngine from './components/InvoiceEngine';
import InvoiceForm from './components/InvoiceForm';
import PDFPreviewModal from './components/PDFPreviewModal';
import LoyaltyTab from './components/LoyaltyTab';

export default function App() {
  const [view, setView] = useState('loading');
  const [prefillPhone, setPrefillPhone] = useState('');
  const [prefillVin, setPrefillVin] = useState('');
  const [activeEditRecord, setActiveEditRecord] = useState(null);
  const [activeJobNo, setActiveJobNo] = useState('');
  const [activeInvoiceJob, setActiveInvoiceJob] = useState(null);
  const [activeInvoiceNo, setActiveInvoiceNo] = useState('');
  const [invoiceFormMode, setInvoiceFormMode] = useState('create');

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfDownloadName, setPdfDownloadName] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Check login session status on startup
  const checkSession = async () => {
    try {
      const res = await fetch('/api/next-job-no');
      if (res.ok) {
        setView('dashboard');
      } else {
        setView('login');
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setView('login');
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    const baseTitle = 'Job Card & Invoice Automator - Hot Rides Customs Garage';
    const viewTitles = {
      loading: 'Loading - ' + baseTitle,
      login: 'Login - ' + baseTitle,
      dashboard: 'Dashboard - ' + baseTitle,
      'job-card-form': 'Create Job Card - ' + baseTitle,
      'record-form-add': 'Add Customer/Vehicle - ' + baseTitle,
      'record-form-edit': 'Edit Record - ' + baseTitle,
      'overwrite-job-card': 'Overwrite Job Card - ' + baseTitle,
      'invoice-engine': 'Invoices Engine - ' + baseTitle,
      'invoice-form': 'Invoice - ' + baseTitle,
      'loyalty-tab': 'Loyalty Cards - ' + baseTitle,
    };
    document.title = viewTitles[view] || baseTitle;
  }, [view]);

  const handleLoginSuccess = () => {
    setView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setView('login');
    }
  };

  // Navigates and resets prefills
  const navigateTo = (newView) => {
    setView(newView);
    // Reset temporary variables unless entering specific views
    if (newView !== 'job-card-form') {
      setPrefillPhone('');
      setPrefillVin('');
    }
    if (newView !== 'record-form-edit') {
      setActiveEditRecord(null);
    }
  };

  // Trigger creating a job card with client details prefilled
  const handleCreateJobPrefill = (phone, vin) => {
    setPrefillPhone(phone);
    setPrefillVin(vin);
    setView('job-card-form');
  };

  // Trigger editing a record
  const handleEditRecordTrigger = (record) => {
    setActiveEditRecord(record);
    setView('record-form-edit');
  };

  // Trigger overwriting a job card
  const handleOverwriteJobTrigger = (jobNo) => {
    setActiveJobNo(jobNo);
    setView('overwrite-job-card');
  };

  // Trigger invoicing a job card from history
  const handleOpenInvoiceTrigger = (jobCard) => {
    setActiveInvoiceJob(jobCard);
    setInvoiceFormMode('create');
    setView('invoice-form');
  };

  // Trigger overwriting an existing invoice
  const handleOverwriteInvoiceTrigger = (invoiceNo) => {
    setActiveInvoiceNo(invoiceNo);
    setInvoiceFormMode('overwrite');
    setView('invoice-form');
  };

  // Callback to display generated PDF preview modal
  const handleShowPDF = (url, name) => {
    setPdfUrl(url);
    setPdfDownloadName(name);
    setIsPdfModalOpen(true);
  };

  // Close PDF Modal
  const handleClosePDF = () => {
    setPdfUrl('');
    setPdfDownloadName('');
    setIsPdfModalOpen(false);
  };

  // View Switcher Router
  const renderView = () => {
    switch (view) {
      case 'loading':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 gap-2">
            <div className="spinner text-red-500 w-8 h-8 border-4" />
            <span className="font-semibold text-sm tracking-wider uppercase">Loading HRC Automator...</span>
          </div>
        );
      
      case 'login':
        return (
          <Login onLoginSuccess={handleLoginSuccess} />
        );
      
      case 'dashboard':
        return (
          <Dashboard 
            onNavigate={navigateTo}
            onLogout={handleLogout}
            onCreateJob={handleCreateJobPrefill}
            onEditRecord={handleEditRecordTrigger}
            onOverwriteJobCard={handleOverwriteJobTrigger}
          />
        );

      case 'job-card-form':
        return (
          <JobCardForm 
            prefillPhone={prefillPhone}
            prefillVin={prefillVin}
            onBack={() => navigateTo('dashboard')}
            onShowPDF={handleShowPDF}
          />
        );

      case 'record-form-add':
        return (
          <RecordForm 
            mode="add"
            onBack={() => navigateTo('dashboard')}
          />
        );

      case 'record-form-edit':
        return (
          <RecordForm 
            mode="edit"
            editRecord={activeEditRecord}
            onBack={() => navigateTo('dashboard')}
          />
        );

      case 'overwrite-job-card':
        return (
          <OverwriteJobCard 
            jobNo={activeJobNo}
            onBack={() => navigateTo('dashboard')}
            onShowPDF={handleShowPDF}
          />
        );

      case 'invoice-engine':
        return (
          <InvoiceEngine 
            onBack={() => navigateTo('dashboard')}
            onOpenInvoice={handleOpenInvoiceTrigger}
            onOverwriteInvoice={handleOverwriteInvoiceTrigger}
          />
        );

      case 'invoice-form':
        return (
          <InvoiceForm 
            mode={invoiceFormMode}
            jobCard={activeInvoiceJob}
            invoiceNoToOverwrite={activeInvoiceNo}
            onBack={() => navigateTo('invoice-engine')}
            onShowPDF={handleShowPDF}
          />
        );

      case 'loyalty-tab':
        return (
          <LoyaltyTab onBack={() => navigateTo('dashboard')} />
        );

      default:
        return (
          <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">
            View Error: Router state mismatch ({view})
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {renderView()}

      {/* Shared PDF Preview Modal */}
      <PDFPreviewModal 
        isOpen={isPdfModalOpen}
        pdfUrl={pdfUrl}
        downloadName={pdfDownloadName}
        onClose={handleClosePDF}
      />
    </div>
  );
}
