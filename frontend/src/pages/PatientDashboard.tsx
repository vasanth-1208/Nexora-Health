import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Clock,
  Activity,
  CreditCard,
  Calendar,
  Building,
  FileText,
  Apple,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [profile, setProfile] = useState<any | null>(null);
  
  // Dashboard details
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [paidBills, setPaidBills] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  // Show More / Show Less toggles
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showAllPrescriptions, setShowAllPrescriptions] = useState(false);
  const [showAllScans, setShowAllScans] = useState(false);
  const [showAllBills, setShowAllBills] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPatientProfile();
  }, [user]);

  useEffect(() => {
    if (!socket || !profile) return;

    const handleUpdate = () => {
      refreshData(profile._id);
      fetchPatientProfile();
    };

    socket.on('patient:status', handleUpdate);
    socket.on('payment:updated', handleUpdate);
    socket.on('bed:updated', handleUpdate);
    socket.on('admission:updated', handleUpdate);
    socket.on('diagnostic:departed', handleUpdate);
    socket.on('diagnostic:returned', handleUpdate);
    socket.on('diagnostic:completed', handleUpdate);

    return () => {
      socket.off('patient:status', handleUpdate);
      socket.off('payment:updated', handleUpdate);
      socket.off('bed:updated', handleUpdate);
      socket.off('admission:updated', handleUpdate);
      socket.off('diagnostic:departed', handleUpdate);
      socket.off('diagnostic:returned', handleUpdate);
      socket.off('diagnostic:completed', handleUpdate);
    };
  }, [socket, profile]);

  const fetchPatientProfile = async () => {
    try {
      const pat = await request(`/patients/${user?.userId}`);
      setProfile(pat);
      const effectiveId = pat?.patientId || user?.userId || pat?._id;
      const dbId = pat?._id || user?.userId;
      refreshData(effectiveId, dbId);
    } catch (err) {
      console.error('Failed to load patient profile:', err);
    }
  };

  const refreshData = async (targetId: string, fallbackId?: string) => {
    try {
      const fetchWithFallback = async (endpointFn: (id: string) => string) => {
        try {
          const res = await request(endpointFn(targetId));
          return res || [];
        } catch {
          if (fallbackId && fallbackId !== targetId) {
            try {
              const res2 = await request(endpointFn(fallbackId));
              return res2 || [];
            } catch {
              return [];
            }
          }
          return [];
        }
      };

      const [appts, rx, scansList, pendings, history, tl] = await Promise.all([
        fetchWithFallback((id) => `/consultations/patient/${id}`),
        fetchWithFallback((id) => `/prescriptions/patient/${id}`),
        fetchWithFallback((id) => `/diagnostics/patient/${id}`),
        fetchWithFallback((id) => `/payments/pending/${id}`),
        fetchWithFallback((id) => `/payments/history/${id}`),
        fetchWithFallback((id) => `/patients/${id}/timeline`),
      ]);

      setAppointments(Array.isArray(appts) ? appts : []);
      setPrescriptions(Array.isArray(rx) ? rx : []);
      setScans(Array.isArray(scansList) ? scansList : []);
      setBills(Array.isArray(pendings) ? pendings : []);
      setPaidBills(Array.isArray(history) ? history : []);
      setTimeline(Array.isArray(tl) ? tl : []);
    } catch (err) {
      console.error('Failed to refresh patient dashboard data:', err);
    }
  };

  const calculateTotalCharges = () => {
    const pendingSum = bills.reduce((sum, p) => sum + p.amount, 0);
    const paidSum = paidBills.reduce((sum, p) => sum + p.amount, 0);
    return pendingSum + paidSum;
  };

  const calculatePendingSum = () => {
    return bills.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculatePaidSum = () => {
    return paidBills.reduce((sum, p) => sum + p.amount, 0);
  };

  // Determine current active flow index for progress stepper
  // Steps: Registration (0) -> Consultation (1) -> Diagnostics (2) -> Admission (3) -> Inpatient stay (4) -> Discharge (5)
  const getActiveStepIndex = () => {
    if (!profile) return 0;
    if (profile.currentAdmissionId) {
      const status = profile.currentAdmissionId.admissionStatus;
      if (status === 'DISCHARGED') return 5;
      if (status === 'DISCHARGE_RECOMMENDED') return 5;
      if (status === 'OCCUPIED') return 4;
      if (status === 'RESERVED' || status === 'RECOMMENDED') return 3;
    }
    if (scans.length > 0) return 2;
    if (appointments.length > 0) return 1;
    return 0;
  };

  const stepsList = [
    { title: 'Registration', desc: 'Check-in completed' },
    { title: 'Consultation', desc: 'Doctor examination' },
    { title: 'Diagnostics', desc: 'Clinical scan queues' },
    { title: 'Admission', desc: 'Stay recommended' },
    { title: 'Inpatient stay', desc: 'Ward bed care' },
    { title: 'Discharge', desc: 'Checked out' },
  ];

  const currentStep = getActiveStepIndex();

  // Process timeline: reverse chronological order (newest first) + group consecutive repetitive events
  const processedTimeline = React.useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    // Sort descending (newest first)
    const sorted = [...timeline].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const grouped: any[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = grouped[grouped.length - 1];

      if (prev && prev.description === current.description && prev.createdBy === current.createdBy) {
        prev.count = (prev.count || 1) + 1;
      } else {
        grouped.push({
          ...current,
          count: 1,
        });
      }
    }
    return grouped;
  }, [timeline]);

  const displayedTimeline = showAllTimeline ? processedTimeline : processedTimeline.slice(0, 5);
  const displayedAppointments = showAllAppointments ? appointments : appointments.slice(0, 3);
  const displayedPrescriptions = showAllPrescriptions ? prescriptions : prescriptions.slice(0, 3);
  const displayedScans = showAllScans ? scans : scans.slice(0, 3);
  const displayedBills = showAllBills ? bills : bills.slice(0, 4);

  return (
    <div className="space-y-6">
      {profile ? (
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg border border-slate-700">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-healthcare-600 px-2 py-0.5 rounded mr-2">
                PATIENT PORTAL
              </span>
              <h1 className="text-xl font-bold mt-2">{profile.userId?.name}</h1>
              <p className="text-slate-400 text-xs font-semibold mt-1">
                Patient ID: {profile.patientId} | DOB: {new Date(profile.dob).toLocaleDateString()} ({profile.gender})
              </p>
            </div>
            {profile.currentAdmissionId && profile.currentAdmissionId.bedId && (
              <div className="mt-4 md:mt-0 p-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl flex items-center space-x-3 text-xs shadow-inner">
                <Building className="h-6 w-6 text-healthcare-400 shrink-0" />
                <div className="font-semibold space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      {profile.currentAdmissionId.wardId?.name || 'Assigned Ward'}
                    </p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      profile.currentAdmissionId.inDiagnostics
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {profile.currentAdmissionId.inDiagnostics ? 'In Diagnostics Room' : 'In Ward Bed'}
                    </span>
                  </div>
                  <p className="text-white font-bold text-sm">
                    Bed: {profile.currentAdmissionId.bedId.bedId}
                  </p>
                  {profile.currentAdmissionId.doctorId?.userId?.name && (
                    <p className="text-[11px] text-slate-400 font-normal">
                      Doctor: {profile.currentAdmissionId.doctorId.userId.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stepper progress journey */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Patient Flow Journey Map</h2>
            
            <div className="flex flex-col sm:flex-row justify-between relative text-xs">
              {stepsList.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={idx} className="flex-1 flex flex-col sm:items-center text-left sm:text-center relative mb-4 sm:mb-0">
                    {/* Stepper Circle */}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border transition ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-healthcare-600 border-healthcare-600 text-white animate-pulse ring-4 ring-healthcare-100'
                        : 'bg-slate-50 border-slate-250 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>

                    <p className={`mt-2 font-bold ${isCurrent ? 'text-healthcare-650' : 'text-slate-700'}`}>{step.title}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{step.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Portal Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Queue & clinical records */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active appointments */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-healthcare-600" />
                    <span>Today's Consultation Appointments</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {appointments.length} Total
                  </span>
                </div>
                
                {appointments.length === 0 ? (
                  <p className="text-xs text-slate-405 italic py-4">No appointments scheduled for today.</p>
                ) : (
                  <div className="space-y-3">
                    {displayedAppointments.map((appt) => {
                      let statusText = 'WAITING';
                      let statusStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (appt.status === 'RECEIVED') {
                        statusText = 'Check-In Room door';
                        statusStyle = 'bg-blue-50 text-blue-800 border-blue-200';
                      } else if (appt.status === 'WITH_DOCTOR') {
                        statusText = 'In consultation room';
                        statusStyle = 'bg-indigo-55 text-indigo-800 border-indigo-200 animate-pulse';
                      } else if (appt.status === 'COMPLETED') {
                        statusText = 'Consultation Completed';
                        statusStyle = 'bg-emerald-50 text-emerald-805 border-emerald-200';
                      }

                      const docName = appt.doctorId?.userId?.name || 'Doctor';
                      const deptName = appt.doctorId?.departmentId?.name || appt.doctorId?.specialization || 'General Medicine';

                      return (
                        <div key={appt._id} className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold transition">
                          <div>
                            <p className="font-bold text-slate-850">{docName}</p>
                            <p className="text-[10px] text-slate-400">
                              Department: {deptName}
                              {appt.createdAt && ` • ${new Date(appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                          <span className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded border uppercase ${statusStyle}`}>
                            {statusText}
                          </span>
                        </div>
                      );
                    })}

                    {appointments.length > 3 && (
                      <button
                        onClick={() => setShowAllAppointments(!showAllAppointments)}
                        className="w-full mt-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                      >
                        {showAllAppointments ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            <span>Show Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>Show More ({appointments.length - 3} older appointments)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Prescriptions */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-855 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-healthcare-600" />
                    <span>Prescribed Medications</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {prescriptions.length} Prescriptions
                  </span>
                </div>
                
                {prescriptions.length === 0 ? (
                  <p className="text-xs text-slate-405 italic py-4">No medications prescribed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {displayedPrescriptions.map((rx) => (
                      <div key={rx._id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-semibold">
                        <div className="flex justify-between items-center text-[10px] text-slate-450 border-b border-slate-200/60 pb-1.5">
                          <span>Doctor: {rx.doctorId?.userId?.name || 'Physician'}</span>
                          <span>Date: {new Date(rx.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="space-y-1.5">
                          {rx.medicines?.map((med: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-bold text-xs">{med.name} <span className="text-slate-400 font-normal">x {med.quantity}</span></span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                med.status === 'DISPENSED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : med.status === 'READY'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200 animate-pulse'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {med.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {prescriptions.length > 3 && (
                      <button
                        onClick={() => setShowAllPrescriptions(!showAllPrescriptions)}
                        className="w-full mt-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                      >
                        {showAllPrescriptions ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            <span>Show Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>Show More ({prescriptions.length - 3} older prescriptions)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Scans */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-855 flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-healthcare-600" />
                    <span>Requested Scans & Diagnostic Tests</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {scans.length} Tests
                  </span>
                </div>
                
                {scans.length === 0 ? (
                  <p className="text-xs text-slate-405 italic py-4">No scan requests found.</p>
                ) : (
                  <div className="space-y-3">
                    {displayedScans.map((scan) => (
                      <div key={scan._id} className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-250 rounded-xl flex items-center justify-between text-xs font-semibold transition">
                        <div>
                          <p className="font-bold text-slate-850">{scan.testType}</p>
                          <p className="text-[10px] text-slate-400">Order: {scan._id.substring(18)}</p>
                        </div>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                          scan.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : scan.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                            : 'bg-slate-100 text-slate-650 border-slate-200'
                        }`}>
                          {scan.status}
                        </span>
                      </div>
                    ))}

                    {scans.length > 3 && (
                      <button
                        onClick={() => setShowAllScans(!showAllScans)}
                        className="w-full mt-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                      >
                        {showAllScans ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            <span>Show Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>Show More ({scans.length - 3} more scans)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: payments, details, timeline */}
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-healthcare-600" />
                  <span>Outstanding Payment Summary</span>
                </h2>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <span>Total Charges</span>
                      <span>₹{calculateTotalCharges().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-700/60 pt-2 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                      <span>Amount Paid</span>
                      <span className="text-emerald-450">₹{calculatePaidSum().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-700/60 pt-2 text-[10px] uppercase font-bold tracking-wider">
                      <span>Amount Pending</span>
                      <span className="text-red-400 font-black text-sm">₹{calculatePendingSum().toLocaleString()}</span>
                    </div>
                  </div>

                  {bills.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Unpaid Invoices</span>
                        <span>{bills.length} Items</span>
                      </div>
                      {displayedBills.map((b) => (
                        <div key={b._id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-[10px]">
                          <span className="truncate max-w-[170px]" title={b.description}>{b.description}</span>
                          <span className="font-bold text-red-650 shrink-0">₹{b.amount.toLocaleString()}</span>
                        </div>
                      ))}

                      {bills.length > 4 && (
                        <button
                          onClick={() => setShowAllBills(!showAllBills)}
                          className="w-full mt-1.5 py-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition flex items-center justify-center space-x-1"
                        >
                          {showAllBills ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              <span>Show Less</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              <span>Show More ({bills.length - 4} more invoices)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Diet Preferences */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 text-xs font-semibold">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <Apple className="h-5 w-5 text-healthcare-600" />
                  <span>Patient Food Diet Preference</span>
                </h3>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl font-extrabold text-healthcare-700 text-center uppercase tracking-wide">
                  {profile.foodPreference} DIET
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-healthcare-600" />
                    <span>Timeline Journey History</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {processedTimeline.length} Events
                  </span>
                </div>
                
                {processedTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 italic">No timeline events recorded yet.</p>
                ) : (
                  <div className="flow-root text-xs">
                    <ul className="-mb-8">
                      {displayedTimeline.map((item, idx) => (
                        <li key={item._id || idx}>
                          <div className="relative pb-6">
                            {idx !== displayedTimeline.length - 1 && (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true"></span>
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white shadow-xs">
                                  <Clock className="h-4 w-4 text-slate-500" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1 flex justify-between space-x-2 text-slate-700 font-semibold">
                                <div>
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <p className="font-bold text-slate-800 text-xs">{item.description}</p>
                                    {item.count > 1 && (
                                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-md">
                                        x{item.count}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">By: {item.createdBy}</span>
                                </div>
                                <div className="text-right text-[10px] whitespace-nowrap text-slate-400 font-semibold">
                                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {processedTimeline.length > 5 && (
                      <button
                        onClick={() => setShowAllTimeline(!showAllTimeline)}
                        className="w-full mt-4 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs"
                      >
                        {showAllTimeline ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            <span>Show Less (Recent Only)</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            <span>Show More ({processedTimeline.length - 5} earlier events)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">Loading patient portal profiles...</div>
      )}
    </div>
  );
};

export default PatientDashboard;
