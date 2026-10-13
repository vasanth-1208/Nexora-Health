import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../services/api';
import { Activity, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'GENERAL'>('GENERAL');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  
  // Emergency Contact
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRel, setEcRel] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ patientId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await request('/patients/self-register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          dob,
          gender,
          phone,
          email,
          address,
          bloodGroup,
          emergencyContact: {
            name: ecName,
            phone: ecPhone,
            relationship: ecRel
          }
        })
      });
      setSuccessData({ patientId: res.patientId });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Glow rings */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-healthcare-100/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-sky-100/50 blur-[120px] pointer-events-none" />

      {/* Central Register Card */}
      <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="bg-healthcare-500/10 border border-healthcare-500/20 p-2.5 rounded-2xl inline-block">
            <Activity className="h-6.5 w-6.5 text-healthcare-600" />
          </div>
          <span className="text-lg font-black tracking-wider text-slate-900">NEXORA HEALTH</span>
          <p className="text-[10px] uppercase font-bold text-healthcare-700 tracking-widest">
            Patient Self-Registration
          </p>
        </div>

        {successData ? (
          /* Success message block */
          <div className="space-y-6 text-center text-xs font-bold text-slate-600">
            <div className="flex flex-col items-center space-y-3 bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
              <h3 className="text-base font-black text-emerald-800">Registration Successful!</h3>
              <p className="text-slate-600 leading-relaxed font-semibold">
                Your patient file has been created. Please note down your User ID Code to sign in.
              </p>
              <div className="bg-white border border-emerald-200 px-6 py-3.5 rounded-xl font-mono text-lg font-black text-emerald-700 mt-2 select-all shadow-sm">
                {successData.patientId}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-slate-500">
              <p>🔑 Default Initial Password: <span className="text-slate-900 font-mono font-bold">12345</span></p>
              <p className="text-[10px] font-semibold text-slate-400">(Sign in with your User ID Code and default password 12345)</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 bg-healthcare-600 hover:bg-healthcare-500 text-white font-extrabold rounded-2xl shadow-lg transition active:scale-[0.99]"
            >
              Proceed to Sign In
            </button>
          </div>
        ) : (
          /* Input Form */
          <form className="space-y-5 text-xs font-bold text-slate-500" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-2 animate-shake">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 custom-scroll">
              
              {/* Basic Information */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] text-healthcare-650 uppercase tracking-widest border-b border-slate-100 pb-1">Basic Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                      placeholder="e.g. Kavitha S."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-850 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Gender</label>
                    <select
                      value={gender}
                      onChange={(e: any) => setGender(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3 text-slate-800 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                    >
                      <option value="GENERAL">General</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Blood Group</label>
                    <input
                      type="text"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                      placeholder="e.g. O+"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3.5 pt-2">
                <h4 className="text-[10px] text-healthcare-650 uppercase tracking-widest border-b border-slate-100 pb-1">Contact Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                      placeholder="kavitha@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Physical Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                    placeholder="Enter permanent address..."
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3.5 pt-2">
                <h4 className="text-[10px] text-healthcare-650 uppercase tracking-widest border-b border-slate-100 pb-1">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Contact Name</label>
                    <input
                      type="text"
                      required
                      value={ecName}
                      onChange={(e) => setEcName(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400">Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={ecPhone}
                      onChange={(e) => setEcPhone(e.target.value)}
                      className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400">Relationship</label>
                  <input
                    type="text"
                    required
                    value={ecRel}
                    onChange={(e) => setEcRel(e.target.value)}
                    className="mt-1.5 block w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-healthcare-500 focus:bg-white transition text-xs"
                    placeholder="e.g. Spouse, Parent"
                  />
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="space-y-3 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-healthcare-600 hover:bg-healthcare-500 text-white font-extrabold rounded-2xl shadow-lg transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Profile'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-2xl flex items-center justify-center space-x-1.5 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default Register;
