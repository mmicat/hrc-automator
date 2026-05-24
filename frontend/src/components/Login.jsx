import React, { useState } from 'react';
import { Lock, User, AlertCircle, Key } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess();
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-md glass-panel glass-panel-glow-red rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-300">
        
        {/* Glow Header Accent */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-red-600 w-full" />
        
        <div className="p-8 sm:p-10 flex flex-col items-center">
          {/* Logo / Badge */}
          <div className="w-16 h-16 bg-red-950/40 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-red-500/10">
            <Key className="w-8 h-8 text-red-500 animate-pulse-glow" />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight text-center mb-2">
            HRC Automator
          </h1>
          <p className="text-slate-400 text-sm mb-8 text-center font-medium tracking-wide">
            Automotive Job Cards & Invoices Engine
          </p>

          {error && (
            <div className="w-full mb-6 p-4 rounded-lg bg-red-950/40 border border-red-500/20 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span className="text-sm text-red-200 font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            {/* Username Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400">
                  <User className="w-5 h-5" />
                </span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter system username"
                  className="w-full bg-slate-950/60 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-slate-200 font-medium placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full bg-slate-950/60 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-slate-200 font-medium placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-800/40 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-300 uppercase tracking-widest mt-4 shadow-lg shadow-red-950/30 hover:shadow-red-500/10 active:scale-[0.98] text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner text-white w-4 h-4 border-2" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Enter System</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
