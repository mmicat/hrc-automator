import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';

export default function SessionTimeout() {
  const [isWarning, setIsWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  
  // Timers
  // For development testing, you can change these to 5000 and 10000 respectively
  const WARNING_TIME_MS = 10 * 60 * 1000; // 10 minutes
  const EXPIRED_TIME_MS = 15 * 60 * 1000; // 15 minutes
  
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);

  // Update activity timestamp
  useEffect(() => {
    const handleActivity = () => {
      // Only reset activity if we are not in a warning or expired state
      // If warning is showing, they MUST click the button to ping the server.
      if (!isWarning && !isExpired) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(event => document.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [isWarning, isExpired]);

  // Check timers
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (isExpired) return; // Stop checking if already expired

      const inactiveDuration = Date.now() - lastActivityRef.current;

      if (inactiveDuration >= EXPIRED_TIME_MS) {
        setIsExpired(true);
        setIsWarning(false);
      } else if (inactiveDuration >= WARNING_TIME_MS && !isWarning) {
        setIsWarning(true);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isWarning, isExpired, EXPIRED_TIME_MS, WARNING_TIME_MS]);

  const handleImHere = async () => {
    try {
      // Ping backend to wake it up / keep session alive
      await fetch('/api/health');
    } catch (err) {
      console.error('Failed to ping server:', err);
    }
    // Reset state and timers
    lastActivityRef.current = Date.now();
    setIsWarning(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isWarning && !isExpired) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        
        {isExpired ? (
          <>
            <div className="mx-auto w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-red-500 mb-3">Session Expired</h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              You have been inactive for over 15 minutes. To protect your data and save server resources, your session has been disconnected. 
              <br/><br/>
              Please refresh the page to log back in.
            </p>
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 uppercase tracking-wide"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Page
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-500 mb-3">Are you still there?</h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              Your session will expire soon due to inactivity. Click the button below to keep your session active without losing any unsaved work.
            </p>
            <button
              onClick={handleImHere}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 uppercase tracking-wide"
            >
              I'm still here
            </button>
          </>
        )}

      </div>
    </div>
  );
}
