import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../services/api';
import { Activity, ShieldAlert, CheckCircle, ArrowLeft, KeyRound, User, Lock } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  // Workflow steps: 'REQUEST_OTP' | 'VERIFY_OTP' | 'RESET_PASSWORD' | 'SUCCESS'
  const [step, setStep] = useState<'REQUEST_OTP' | 'VERIFY_OTP' | 'RESET_PASSWORD' | 'SUCCESS'>('REQUEST_OTP');
  
  // Input states
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username) {
      setError('Please enter your User ID.');
      return;
    }
    setLoading(true);
    // Simulate sending OTP
    setTimeout(() => {
      setLoading(false);
      setStep('VERIFY_OTP');
    }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp) {
      setError('Please enter verification code.');
      return;
    }
    if (otp !== '123456') {
      setError('Invalid verification code. Please try again.');
      return;
    }
    setStep('RESET_PASSWORD');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ username, newPassword })
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Reset password failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Glow rings */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-healthcare-100/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-sky-100/50 blur-[120px] pointer-events-none" />

      {/* Central Reset Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 relative z-10 space-y-6">
        
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="bg-healthcare-500/10 border border-healthcare-500/20 p-2.5 rounded-2xl inline-block">
            <Activity className="h-6.5 w-6.5 text-healthcare-600 animate-pulse" />
          </div>
          <span className="text-lg font-black tracking-wider text-slate-900">NEXORA HEALTH</span>
          <p className="text-[10px] uppercase font-bold text-healthcare-700 tracking-widest">
            Password Recovery
          </p>
        </div>

        {/* Step 1: Request OTP */}
        {step === 'REQUEST_OTP' && (
          <form className="space-y-4 text-xs font-bold text-slate-500" onSubmit={handleRequestOtp}>
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-slate-800">Identify Account</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Enter your User ID or Employee ID to receive a verification OTP.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start space-x-2 animate-shake">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[10px] uppercase tracking-wider text-slate-400">
                User ID / Employee ID
              </label>
              <div className="relative rounded-2xl group transition-all duration-200">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition"
                  placeholder="Enter system User ID"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-healthcare-600 hover:bg-healthcare-500 text-white font-extrabold rounded-2xl shadow-lg transition active:scale-[0.99] disabled:opacity-50">
              {loading ? 'Processing...' : 'Send Verification OTP'}
            </button>

            <button type="button" onClick={() => navigate('/login')} className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-2xl flex items-center justify-center space-x-1 transition">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 'VERIFY_OTP' && (
          <form className="space-y-4 text-xs font-bold text-slate-500" onSubmit={handleVerifyOtp}>
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-slate-805">Enter OTP Code</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Verification code sent to contact details registered under ID {username}.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start space-x-2 animate-shake">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="otp" className="block text-[10px] uppercase tracking-wider text-slate-400">
                6-Digit OTP Code
              </label>
              <div className="relative rounded-2xl group transition duration-200">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-center tracking-widest font-black text-sm"
                  placeholder="••••••"
                  maxLength={6}
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3.5 bg-healthcare-600 hover:bg-healthcare-500 text-white font-extrabold rounded-2xl shadow-lg transition active:scale-[0.99]">
              Verify & Proceed
            </button>

            <button type="button" onClick={() => setStep('REQUEST_OTP')} className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-2xl flex items-center justify-center space-x-1 transition">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 'RESET_PASSWORD' && (
          <form className="space-y-4 text-xs font-bold text-slate-500" onSubmit={handleResetPassword}>
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-slate-805">Reset Password</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Enter a new secure password for account {username}.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start space-x-2 animate-shake">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="newPass" className="block text-[10px] uppercase tracking-wider text-slate-400">
                New Password
              </label>
              <div className="relative rounded-2xl group transition duration-200">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="newPass"
                  name="newPass"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-healthcare-500 focus:bg-white transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPass" className="block text-[10px] uppercase tracking-wider text-slate-400">
                Confirm Password
              </label>
              <div className="relative rounded-2xl group transition duration-200">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="confirmPass"
                  name="confirmPass"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-healthcare-500 focus:bg-white transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-healthcare-600 hover:bg-healthcare-500 text-white font-extrabold rounded-2xl shadow-lg transition active:scale-[0.99] disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Step 4: Success feedback */}
        {step === 'SUCCESS' && (
          <div className="space-y-5 text-center text-xs font-bold text-slate-600">
            <div className="flex flex-col items-center space-y-2 bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
              <CheckCircle className="h-10 w-10 text-emerald-600 animate-bounce" />
              <h3 className="text-base font-black text-emerald-805 mt-2">Password Reset Complete</h3>
              <p className="text-slate-655 font-semibold leading-relaxed">
                Your login credentials have been updated successfully. You can now sign in using your new password.
              </p>
            </div>
            <button onClick={() => navigate('/login')} className="w-full py-3.5 bg-healthcare-600 hover:bg-healthcare-500 text-white font-extrabold rounded-2xl shadow-lg transition active:scale-[0.99]">
              Proceed to Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
