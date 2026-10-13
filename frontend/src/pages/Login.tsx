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
  CheckSquare,
  Layers,
  ArrowRight,
  Sparkles,
  Heart,
  Stethoscope,
  ClipboardList,
  CreditCard,
  Pill,
  Lock,
} from 'lucide-react';

interface IDemoAccount {
  title: string;
  category: 'LAB' | 'STAFF';
  username: string;
  password: string;
  role: string;
  labType?: string;
  badge: string;
  badgeClass: string;
  icon: any;
  description: string;
}

const DEMO_LAB_ACCOUNTS: IDemoAccount[] = [
  {
    title: 'X-Ray Lab Desk',
    category: 'LAB',
    username: 'xray',
    password: '12345',
    role: 'DIAGNOSTICS',
    labType: 'XRAY',
    badge: 'X-RAY LAB',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckSquare,
    description: 'Extremity, chest, PA views & bone radiology orders',
  },
  {
    title: 'CT Scan Lab Desk',
    category: 'LAB',
    username: 'ctscan',
    password: '12345',
    role: 'DIAGNOSTICS',
    labType: 'CTSCAN',
    badge: 'CT SCAN',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Activity,
    description: 'Computed tomography brain, chest & abdominal scans',
  },
  {
    title: 'Pathology & Blood Lab',
    category: 'LAB',
    username: 'pathology',
    password: '12345',
    role: 'DIAGNOSTICS',
    labType: 'PATHOLOGY',
    badge: 'PATHOLOGY',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: Activity,
    description: 'Blood CBC, Biochemistry (LFT, KFT), lipid profiles',
  },
  {
    title: 'Cardiology & ECG Lab',
    category: 'LAB',
    username: 'ecg',
    password: '12345',
    role: 'DIAGNOSTICS',
    labType: 'CARDIOLOGY',
    badge: 'CARDIOLOGY',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Heart,
    description: 'Electrocardiograms, 2D Echo, cardiac scan workflows',
  },
  {
    title: 'MRI Scan Suite Desk',
    category: 'LAB',
    username: 'mri',
    password: '12345',
    role: 'DIAGNOSTICS',
    labType: 'MRI',
    badge: 'MRI SUITE',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: CheckSquare,
    description: 'Magnetic resonance imaging for spine, brain & joints',
  },
  {
    title: 'All Labs Supervisor',
    category: 'LAB',
    username: 'diagnostics',
    password: '12345',
    role: 'DIAGNOSTICS',
    labType: 'ALL',
    badge: 'ALL LABS LEAD',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: Layers,
    description: 'M. Balasubramanian — General supervisor across all modalities',
  },
];

const DEMO_STAFF_ACCOUNTS: IDemoAccount[] = [
  {
    title: 'Doctor (Internal Medicine)',
    category: 'STAFF',
    username: 'doctor1',
    password: '12345',
    role: 'DOCTOR',
    badge: 'DOCTOR',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Stethoscope,
    description: 'Dr. S. Karthikeyan — Outpatient queue & inpatients census',
  },
  {
    title: 'Reception & Admissions',
    category: 'STAFF',
    username: 'reception',
    password: '12345',
    role: 'RECEPTION',
    badge: 'RECEPTION',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: ClipboardList,
    description: 'P. Malarvizhi — Patient check-in, appointments & bed allocations',
  },
  {
    title: 'Inpatient Ward Nursing',
    category: 'STAFF',
    username: 'ward',
    password: '12345',
    role: 'WARD_STAFF',
    badge: 'WARD STAFF',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Activity,
    description: 'S. Arumugam — Ward beds, admissions & scan tracking',
  },
  {
    title: 'Cashier & Billing Desk',
    category: 'STAFF',
    username: 'billing',
    password: '12345',
    role: 'BILLING',
    badge: 'BILLING',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CreditCard,
    description: 'K. Vijayalakshmi — Collections, invoices & settlements',
  },
  {
    title: 'Hospital Pharmacy',
    category: 'STAFF',
    username: 'pharmacy',
    password: '12345',
    role: 'PHARMACY',
    badge: 'PHARMACY',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
    icon: Pill,
    description: 'G. Muthukumar — Medicine dispense & pricing queue',
  },
  {
    title: 'System Administrator',
    category: 'STAFF',
    username: 'admin',
    password: '12345',
    role: 'ADMIN',
    badge: 'ADMIN',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Lock,
    description: 'Dr. K. Senthil Nathan — Full hospital structure, beds, staff & audit center',
  },
  {
    title: 'Patient Portal (Murugan K.)',
    category: 'STAFF',
    username: 'P1001',
    password: '12345',
    role: 'PATIENT',
    badge: 'PATIENT',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: User,
    description: 'Patient flow journey map, tests, meds & stay charges',
  },
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
  const [activeDirectoryTab, setActiveDirectoryTab] = useState<'LABS' | 'STAFF'>('LABS');

  const executeLogin = async (userVal: string, passVal: string) => {
    setError('');
    setLoading(true);

    if (!userVal || !passVal) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const session = await login(userVal, passVal);
      
      // Redirect based on role and specialized labType
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
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(username, password);
  };

  const handleSelectDemoAccount = (acc: IDemoAccount, autoLogin = false) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError('');
    if (autoLogin) {
      executeLogin(acc.username, acc.password);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Dynamic background glow rings */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-healthcare-100/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-sky-100/50 blur-[120px] pointer-events-none" />
      
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />

      {/* Main Container: Dual Panels on large screen */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-stretch justify-center gap-6 relative z-10">
        
        {/* LEFT PANEL: Standard Sign In Card */}
        <div className="w-full lg:w-[400px] bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-8 relative flex flex-col justify-between space-y-6 shrink-0">
          <div>
            {/* Branding Header */}
            <div className="flex flex-col items-center text-center space-y-2 mb-4">
              <div className="bg-healthcare-500/10 border border-healthcare-500/20 p-3 rounded-2xl inline-block shadow-sm">
                <Activity className="h-8 w-8 text-healthcare-600" />
              </div>
              <span className="text-xl font-black tracking-wider text-slate-900 uppercase">
                NEXORA HEALTH
              </span>
              <p className="text-[10px] uppercase font-black text-healthcare-700 tracking-widest">
                Clinical Operations Portal
              </p>
            </div>

            {/* Introduction */}
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-xl font-extrabold text-slate-800">
                Sign In
              </h2>
              <p className="text-xs text-slate-400 font-semibold">
                Enter your credentials or click a specialized desk from the directory.
              </p>
            </div>

            {/* Error Notification Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl text-xs flex items-start space-x-2.5 animate-shake font-bold mb-4">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Input Form */}
            <form className="space-y-3.5 text-xs font-bold text-slate-500" onSubmit={handleSubmit}>
              
              {/* User ID Field */}
              <div className="space-y-1">
                <label htmlFor="username" className="block text-[10px] uppercase tracking-wider text-slate-400">
                  User ID / Employee ID
                </label>
                <div className="relative rounded-2xl group transition-all duration-200">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 group-focus-within:text-healthcare-600 transition" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs font-semibold"
                    placeholder="e.g. xray, ctscan, doctor1"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-[10px] uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="relative rounded-2xl group transition-all duration-200">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400 group-focus-within:text-healthcare-600 transition" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs font-semibold"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-350 bg-white text-healthcare-600 focus:ring-healthcare-500/20 focus:ring-offset-0 focus:ring-2 transition cursor-pointer"
                  />
                  <span className="text-slate-500 text-[11px] group-hover:text-slate-700 transition">Remember me</span>
                </label>
                
                <Link
                  to="/forgot-password"
                  className="text-healthcare-600 hover:text-healthcare-700 font-bold transition text-[11px]"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 mt-2 border border-transparent rounded-2xl shadow-lg shadow-healthcare-500/10 text-xs font-extrabold text-white bg-healthcare-600 hover:bg-healthcare-500 active:scale-[0.99] focus:outline-none disabled:opacity-50 transition"
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
                  'Sign In'
                )}
              </button>

              {/* Patient Self-Registration Link */}
              <div className="text-center text-xs font-semibold text-slate-500 pt-1">
                Don't have an account?{' '}
                <Link to="/register" className="text-healthcare-600 hover:text-healthcare-700 font-bold transition">
                  Register as Patient
                </Link>
              </div>
            </form>
          </div>

          {/* Footer Support Info */}
          <div className="pt-3 border-t border-slate-100 text-center space-y-1 text-[9px] text-slate-400 font-black uppercase tracking-widest">
            <p>Support Helpline: Ext. 4357 (HELP)</p>
            <div className="flex items-center justify-center space-x-1 text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Specialized Lab & Clinical Accounts Directory */}
        <div className="flex-1 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-8 flex flex-col justify-between space-y-4">
          <div>
            {/* Header with Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <Sparkles className="h-4.5 w-4.5 text-healthcare-600" />
                  <span>Hospital Access Directory</span>
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Click any specialized lab desk or clinical staff profile for instant demo access.
                </p>
              </div>

              {/* Category Segmented Control */}
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveDirectoryTab('LABS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeDirectoryTab === 'LABS'
                      ? 'bg-white text-healthcare-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Diagnostic Labs ({DEMO_LAB_ACCOUNTS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDirectoryTab('STAFF')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeDirectoryTab === 'STAFF'
                      ? 'bg-white text-healthcare-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Clinical Staff ({DEMO_STAFF_ACCOUNTS.length})
                </button>
              </div>
            </div>

            {/* DIRECTORY GRID */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              {(activeDirectoryTab === 'LABS' ? DEMO_LAB_ACCOUNTS : DEMO_STAFF_ACCOUNTS).map((acc) => {
                const isSelected = username === acc.username;
                const Icon = acc.icon;

                return (
                  <div
                    key={acc.username}
                    onClick={() => handleSelectDemoAccount(acc, false)}
                    className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-healthcare-50/50 border-healthcare-300 ring-2 ring-healthcare-400/30 shadow-sm'
                        : 'bg-slate-50 hover:bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-700 shrink-0">
                            <Icon className="h-4 w-4 text-healthcare-600" />
                          </div>
                          <span className="text-xs font-black text-slate-850 truncate">
                            {acc.title}
                          </span>
                        </div>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 uppercase ${acc.badgeClass}`}>
                          {acc.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed mb-3">
                        {acc.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                      <div className="text-[10px] space-x-2 font-mono text-slate-600">
                        <span>ID: <strong className="text-slate-900 font-bold">{acc.username}</strong></span>
                        <span>•</span>
                        <span>Pass: <strong className="text-slate-900 font-bold">{acc.password}</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDemoAccount(acc, true);
                        }}
                        className="bg-white group-hover:bg-healthcare-600 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-healthcare-600 font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition flex items-center space-x-1 shadow-2xs shrink-0"
                        title={`Sign in immediately as ${acc.title}`}
                      >
                        <span>Sign In</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Directory Footnote */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="font-semibold">
              💡 <strong>Fast Access:</strong> Clicking "Sign In" on any credential card signs into that portal directly.
            </span>
            <span className="font-bold text-healthcare-700 shrink-0">
              Role-Based Access Control Enabled
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
