import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  ShieldAlert,
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';

interface IDemoAccountRef {
  role: string;
  username: string;
  name: string;
  category: 'CLINICAL' | 'LAB' | 'ADMIN' | 'PATIENT';
}

const DEMO_REFERENCE_ACCOUNTS: IDemoAccountRef[] = [
  { role: 'Doctor (Internal Medicine)', username: 'doctor1', name: 'Dr. S. Karthikeyan', category: 'CLINICAL' },
  { role: 'Doctor (Cardiology)', username: 'doctor2', name: 'Dr. Meenakshi Sundaram', category: 'CLINICAL' },
  { role: 'System Admin', username: 'admin', name: 'Dr. K. Senthil Nathan', category: 'ADMIN' },
  { role: 'Reception Desk', username: 'reception', name: 'P. Malarvizhi', category: 'CLINICAL' },
  { role: 'Triage Nurse', username: 'nurse', name: 'Vimala Devi M.', category: 'CLINICAL' },
  { role: 'Ward Staff', username: 'ward', name: 'S. Arumugam', category: 'CLINICAL' },
  { role: 'Billing & Cashier', username: 'billing', name: 'K. Vijayalakshmi', category: 'ADMIN' },
  { role: 'Dispensary Pharmacy', username: 'pharmacy', name: 'G. Muthukumar', category: 'CLINICAL' },
  { role: 'X-Ray Lab Desk', username: 'xray', name: 'Radiology Modality', category: 'LAB' },
  { role: 'CT Scan Suite', username: 'ctscan', name: 'Tomography Modality', category: 'LAB' },
  { role: 'Pathology Lab', username: 'pathology', name: 'Biochemistry / Blood', category: 'LAB' },
  { role: 'Cardiology / ECG', username: 'ecg', name: 'Cardiac Diagnostics', category: 'LAB' },
  { role: 'MRI Scan Suite', username: 'mri', name: 'Magnetic Resonance', category: 'LAB' },
  { role: 'Chief Labs Lead', username: 'diagnostics', name: 'All Labs Supervisor', category: 'LAB' },
  { role: 'Patient Portal', username: 'P1001', name: 'Murugan K.', category: 'PATIENT' },
];

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const executeLogin = async (userVal: string, passVal: string) => {
    setError('');
    setLoading(true);

    if (!userVal || !passVal) {
      setError('Please enter your User ID and password.');
      setLoading(false);
      return;
    }

    try {
      const session = await login(userVal, passVal);
      
      switch (session.role) {
        case 'ADMIN':
          navigate('/admin/dashboard');
          break;
        case 'RECEPTION':
          navigate('/reception/dashboard');
          break;
        case 'DOCTOR':
          navigate('/doctor/dashboard');
          break;
        case 'NURSE':
          navigate('/nurse/dashboard');
          break;
        case 'WARD_STAFF':
          navigate('/ward/dashboard');
          break;
        case 'DIAGNOSTICS':
          if (session.labType === 'XRAY') {
            navigate('/diagnostics/xray');
          } else if (session.labType === 'CTSCAN') {
            navigate('/diagnostics/ctscan');
          } else if (session.labType === 'PATHOLOGY') {
            navigate('/diagnostics/pathology');
          } else if (session.labType === 'CARDIOLOGY') {
            navigate('/diagnostics/cardiology');
          } else if (session.labType === 'MRI') {
            navigate('/diagnostics/mri');
          } else {
            navigate('/diagnostics/dashboard');
          }
          break;
        case 'PHARMACY':
          navigate('/pharmacy/dashboard');
          break;
        case 'BILLING':
          navigate('/billing/dashboard');
          break;
        case 'PATIENT':
          navigate('/patient/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(username, password);
  };

  const handleQuickFill = (accUsername: string) => {
    setUsername(accUsername);
    setPassword('12345');
    setShowDemoModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 font-sans overflow-x-hidden selection:bg-healthcare-100 selection:text-healthcare-800">
      {/* Ambient background glows */}
      <div className="fixed top-[-15%] left-[20%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-sky-200/40 via-cyan-100/30 to-transparent blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-healthcare-200/30 via-indigo-100/20 to-transparent blur-[140px] pointer-events-none" />
      
      {/* Subtle modern dot-grid backdrop */}
      <div className="fixed inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Header Bar with Demo Modal Helper */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2 relative z-20">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-healthcare-600 flex items-center justify-center text-white shadow-md shadow-healthcare-600/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="font-black text-slate-900 text-base tracking-tight block leading-none">
              NEXORA HEALTH
            </span>
            <span className="text-[10px] font-bold text-healthcare-600 tracking-wider uppercase">
              Hospital Operations Platform
            </span>
          </div>
        </div>

        {/* Discreet Demo Reference Button */}
        <button
          type="button"
          onClick={() => setShowDemoModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
          title="View test account credentials"
        >
          <HelpCircle className="h-3.5 w-3.5 text-healthcare-600" />
          <span>Demo Accounts</span>
        </button>
      </header>

      {/* Main Centered Sign In Card */}
      <main className="w-full max-w-md my-auto relative z-20 py-6">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-900/5 p-7 sm:p-9 relative transition-all duration-200">
          {/* Top Accent Gradient Border Glow */}
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-healthcare-400 via-healthcare-600 to-indigo-600 rounded-full" />

          {/* Heading */}
          <div className="text-center mb-6 pt-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Sign In
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter your clinical ID or patient credentials to continue
            </p>
          </div>

          {/* Error Notification Alert */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-start space-x-2.5 animate-shake font-bold mb-5">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* User ID Field */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                User ID / Employee ID
              </label>
              <div className="relative rounded-2xl group transition-all duration-150">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-healthcare-600 transition">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white focus:ring-4 focus:ring-healthcare-500/10 transition text-xs font-semibold"
                  placeholder="e.g. doctor1, admin, P1001"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-healthcare-600 hover:text-healthcare-700 font-bold transition text-xs"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-2xl group transition-all duration-150">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-healthcare-600 transition">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white focus:ring-4 focus:ring-healthcare-500/10 transition text-xs font-semibold"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-healthcare-600 focus:ring-healthcare-500/20 focus:ring-offset-0 focus:ring-2 transition cursor-pointer"
                />
                <span className="text-slate-600 text-xs font-semibold">Remember this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 mt-2 border border-transparent rounded-2xl shadow-md shadow-healthcare-600/20 text-xs font-black tracking-wide text-white bg-healthcare-600 hover:bg-healthcare-700 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-healthcare-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <span>Sign In to Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </button>

            {/* Patient Self-Registration Link */}
            <div className="text-center text-xs font-medium text-slate-500 pt-2">
              New patient seeking care?{' '}
              <Link to="/register" className="text-healthcare-600 hover:text-healthcare-700 font-extrabold transition underline-offset-2 hover:underline">
                Register as Patient
              </Link>
            </div>
          </form>

          {/* Security Compliance Footer Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <div className="flex items-center space-x-1 text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-healthcare-600" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <div className="flex items-center space-x-1 text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>Operational</span>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="w-full max-w-5xl py-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-medium relative z-20 border-t border-slate-200/60">
        <div>
          <span>© 2026 Nexora Health Technologies. All rights reserved.</span>
        </div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0 font-semibold">
          <span>Role-Based Access Control</span>
          <span>•</span>
          <span>Hospital Operations Hub</span>
        </div>
      </footer>

      {/* Clean Demo Accounts Modal for Evaluators */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-healthcare-50 rounded-lg text-healthcare-600">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Demo Accounts Reference</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Click any account to auto-fill username and password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100 overflow-y-auto pr-1 flex-1">
              {DEMO_REFERENCE_ACCOUNTS.map((acc) => (
                <div
                  key={acc.username}
                  onClick={() => handleQuickFill(acc.username)}
                  className="py-2.5 px-2 hover:bg-slate-50 rounded-xl cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-healthcare-600 transition truncate">
                      {acc.role}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {acc.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                      ID: {acc.username}
                    </span>
                    <span className="text-[10px] font-extrabold text-healthcare-600 opacity-0 group-hover:opacity-100 transition">
                      Use →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>Select any account to test role-based access</span>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
