import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Users, Stethoscope, Clock, CheckCircle, ClipboardCheck, Activity } from 'lucide-react';
import { VitalsModal } from '../components/VitalsModal';

const NurseDashboard: React.FC = () => {
  const { socket } = useSocket();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [queue, setQueue] = useState<any[]>([]);
  const [expandedQueueId, setExpandedQueueId] = useState<string | null>(null);
  const [selectedConsultForVitals, setSelectedConsultForVitals] = useState<any | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchQueue(selectedDoctorId);
      setExpandedQueueId(null); // Reset when doctor changes
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!socket || !selectedDoctorId) return;

    socket.on('doctor:assigned', () => {
      fetchQueue(selectedDoctorId);
    });

    socket.on('patient:status', () => {
      fetchQueue(selectedDoctorId);
    });

    return () => {
      socket.off('doctor:assigned');
      socket.off('patient:status');
    };
  }, [socket, selectedDoctorId]);

  const fetchDoctors = async () => {
    try {
      const res = await request('/doctors');
      setDoctors(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQueue = async (docId: string) => {
    try {
      const res = await request(`/consultations/doctor/${docId}`);
      // Show waiting queue (WAITING or RECEIVED)
      setQueue(res.filter((q: any) => q.status === 'WAITING' || q.status === 'RECEIVED'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVitalsSubmit = async (vitalsData: any) => {
    if (!selectedConsultForVitals) return;
    try {
      await request(`/consultations/${selectedConsultForVitals._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'RECEIVED',
          vitals: vitalsData,
        }),
      });
      fetchQueue(selectedDoctorId);
    } catch (err: any) {
      alert(err.message || 'Check-in with vitals failed.');
    }
  };

  const totalQueue = queue.length;
  const arrivedQueue = queue.filter((q) => q.status === 'RECEIVED').length;
  const pendingQueue = queue.filter((q) => q.status === 'WAITING').length;

  return (
    <div className="space-y-6 w-full">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-850 flex items-center space-x-2">
            <Users className="h-6 w-6 text-healthcare-600 animate-pulse" />
            <span>Nurse Check-In Desk</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Monitor clinic door queues and verify patient arrivals in real time.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">Total Door Queue</p>
            <p className="text-2xl font-black text-slate-850 mt-1">{totalQueue}</p>
          </div>
          <div className="p-3 bg-blue-50 text-healthcare-600 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">Verified Arrived</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{arrivedQueue}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ClipboardCheck className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">Pending Arrival</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingQueue}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Clock className="h-5 w-5 animate-spin-slow" />
          </div>
        </div>
      </div>

      {/* Split Workstation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Room Selector & Physician Profile */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 h-fit space-y-6">
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Room Selection</h2>
            <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Active Consultation Room</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="block w-full bg-slate-50 border border-slate-250 rounded-xl py-2.5 px-3 text-xs focus:outline-none text-slate-750 font-bold transition hover:border-slate-350"
            >
              <option value="">Choose doctor room queue...</option>
              {doctors.map((d: any) => (
                <option key={d._id} value={d._id}>
                  {d.userId?.name} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          {selectedDoctorId && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Room Information</h3>
              {(() => {
                const doc = doctors.find((d: any) => d._id === selectedDoctorId);
                if (!doc) return null;
                return (
                  <div className="text-xs space-y-2.5 text-slate-600 font-semibold bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <p>Physician: <span className="text-slate-800 font-bold">{doc.userId?.name}</span></p>
                    <p>Specialty: <span className="text-slate-700 font-medium">{doc.specialization}</span></p>
                    <p>Department: <span className="text-slate-700 font-medium">{doc.departmentId?.name || 'General Clinic'}</span></p>
                    <p>Status: <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-150 uppercase font-extrabold font-mono">ONLINE</span></p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Side: Waiting Queue */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          {selectedDoctorId ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-healthcare-650" />
                  <span>Door Waiting Queue</span>
                </h2>
                <span className="text-[10px] text-slate-400 font-bold">Click card to expand patient profile</span>
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs font-semibold italic">
                  <ClipboardCheck className="h-8 w-8 mb-2 mx-auto text-slate-300" />
                  <span>No patients currently waiting at this room door.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {queue.map((item) => {
                    const isExpanded = expandedQueueId === item._id;
                    return (
                      <div
                        key={item._id}
                        className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 cursor-pointer hover:bg-slate-100/40 transition-all duration-150 shadow-sm"
                        onClick={() => setExpandedQueueId(isExpanded ? null : item._id)}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div>
                            <p className="font-bold text-slate-850 flex items-center space-x-1.5">
                              <span>{item.patientId?.userId?.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium font-mono">({item.patientId?.patientId})</span>
                            </p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                              Appt Booked: {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              item.status === 'RECEIVED'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.status === 'RECEIVED' ? 'ARRIVED' : item.status}
                            </span>
                            
                            {item.status === 'WAITING' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedConsultForVitals(item);
                                }}
                                className="bg-healthcare-600 hover:bg-healthcare-550 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-sm flex items-center space-x-1"
                              >
                                <Activity className="h-3.5 w-3.5" />
                                <span>Record Vitals & Check In</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2">
                                {item.vitals && (
                                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                                    BP {item.vitals.bloodPressure || 'N/A'} | {item.vitals.heartRate || 'N/A'} bpm
                                  </span>
                                )}
                                <span className="text-[10px] text-blue-700 font-bold flex items-center space-x-1 bg-blue-50/50 p-1 rounded-lg border border-blue-150" onClick={(e) => e.stopPropagation()}>
                                  <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                                  <span>Checked In</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Details Section */}
                        {isExpanded && (
                          <div className="mt-2 pt-3 border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] text-slate-600 animate-in fade-in slide-in-from-top-1 duration-150 font-semibold">
                            <div>
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">DOB / Gender</span>
                              <span className="font-extrabold text-slate-750">
                                {new Date(item.patientId?.dob).toLocaleDateString()} ({item.patientId?.gender})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Blood Group</span>
                              <span className="font-extrabold text-slate-750">{item.patientId?.bloodGroup || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Allergies</span>
                              <span className="font-extrabold text-rose-700">{item.patientId?.allergies || 'None listed'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Food Preference</span>
                              <span className="font-extrabold text-slate-750">{item.patientId?.foodPreference || 'Normal'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Ongoing Medications</span>
                              <span className="font-extrabold text-slate-750">{item.patientId?.ongoingMedications || 'None'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Medical History</span>
                              <span className="font-extrabold text-slate-750">{item.patientId?.medicalHistory || 'No previous history recorded.'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-xs text-slate-400 font-semibold italic border border-dashed border-slate-200 rounded-2xl flex flex-col justify-center items-center">
              <Stethoscope className="h-10 w-10 mb-2 text-slate-300" />
              <span>Select a consultation room from the left selection panel to display its door waiting queue.</span>
            </div>
          )}
        </div>
      </div>

      {/* Vitals Intake Modal */}
      <VitalsModal
        isOpen={!!selectedConsultForVitals}
        onClose={() => setSelectedConsultForVitals(null)}
        patientName={selectedConsultForVitals?.patientId?.userId?.name || 'Patient'}
        patientIdCode={selectedConsultForVitals?.patientId?.patientId || 'P1001'}
        onSubmitVitals={handleVitalsSubmit}
      />
    </div>
  );
};

export default NurseDashboard;
