import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldAlert, KeyRound, User, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const session = await login(username, password);
      
      // Redirect based on role
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
          navigate('/diagnostics/dashboard');
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic background glow rings */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-healthcare-100/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-sky-100/50 blur-[120px] pointer-events-none" />
      
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 relative z-10 space-y-6">
        
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-2">
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

        {/* Introduction Panel */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-slate-800">
            Sign In
          </h2>
          <p className="text-xs text-slate-400 font-semibold">
            Enter your credentials to access the Nexora ecosystem.
          </p>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs flex items-start space-x-2.5 animate-shake font-bold">
            <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form className="space-y-4 text-xs font-bold text-slate-500" onSubmit={handleSubmit}>
          
          {/* User ID Field */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-[10px] uppercase tracking-wider text-slate-400">
              User ID / Employee ID
            </label>
            <div className="relative rounded-2xl group transition-all duration-200">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-healthcare-600 transition" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition"
                placeholder="Enter your system ID"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[10px] uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative rounded-2xl group transition-all duration-200">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-healthcare-600 transition" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-350 bg-white text-healthcare-600 focus:ring-healthcare-500/20 focus:ring-offset-0 focus:ring-2 transition cursor-pointer"
              />
              <span className="text-slate-450 group-hover:text-slate-600 transition">Remember me</span>
            </label>
            
            <Link
              to="/forgot-password"
              className="text-healthcare-600 hover:text-healthcare-700 font-bold transition"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 mt-2 border border-transparent rounded-2xl shadow-lg shadow-healthcare-500/10 text-sm font-extrabold text-white bg-healthcare-600 hover:bg-healthcare-500 active:scale-[0.99] focus:outline-none disabled:opacity-50 transition"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
          <div className="text-center text-xs font-semibold text-slate-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-healthcare-600 hover:text-healthcare-700 font-bold transition">
              Register as Patient
            </Link>
          </div>
        </form>

        {/* Footer Support Info */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2 text-[9px] text-slate-400 font-black uppercase tracking-widest">
          <p>Support Helpline: Ext. 4357 (HELP)</p>
          <div className="flex items-center justify-center space-x-1 text-emerald-600">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
