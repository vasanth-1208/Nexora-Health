import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { request } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  BedDouble,
  Users,
  Sparkles,
  Activity,
  Apple,
  CheckCircle2,
  Wrench,
  Search,
  Info,
  X,
  Clock,
  AlertTriangle,
} from 'lucide-react';

const WardDashboard: React.FC = () => {
  const { socket, addSystemNotification } = useSocket();
  const location = useLocation();

  // Derive activeTab from route path
  let activeTab: 'beds' | 'inpatients' | 'diagnostics' = 'beds';
  if (location.pathname.includes('/ward/inpatients')) {
    activeTab = 'inpatients';
  } else if (location.pathname.includes('/ward/diagnostics')) {
    activeTab = 'diagnostics';
  }
  
  // Lists
  const [beds, setBeds] = useState<any[]>([]);
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [incomingReservations, setIncomingReservations] = useState<any[]>([]);
  const [diagnosticLeaves, setDiagnosticLeaves] = useState<any[]>([]); // Track patients currently at scan
  const [returnNotifications, setReturnNotifications] = useState<any[]>([]);

  // Bed Filters & Details
  const [hierarchy, setHierarchy] = useState<any>({});
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedBedSet, setSelectedBedSet] = useState('');
  const [bedSearch, setBedSearch] = useState('');
  const [stats, setStats] = useState<any>({});
  const [selectedBedDetails, setSelectedBedDetails] = useState<any | null>(null);
  const [manualStatusSelection, setManualStatusSelection] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('');

  const fetchStats = async () => {
    try {
      const res = await request('/beds/stats');
      setStats(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const res = await request('/beds/hierarchy');
      setHierarchy(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBeds = async () => {
    try {
      let params = `?search=${bedSearch}`;
      if (selectedBedSet) params += `&bedSetId=${selectedBedSet}`;
      else if (selectedWard) params += `&wardId=${selectedWard}`;
      else if (selectedFloor) params += `&floorId=${selectedFloor}`;
      else if (selectedBlock) params += `&blockId=${selectedBlock}`;

      const res = await request(`/beds${params}`);
      setBeds(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInpatients = async () => {
    try {
      const res = await request('/admissions/active');
      // Admitted inpatients (OCCUPIED, RESERVED, DISCHARGE_RECOMMENDED)
      setInpatients(res.filter((a: any) => a.admissionStatus === 'OCCUPIED' || a.admissionStatus === 'DISCHARGE_RECOMMENDED'));
      setIncomingReservations(res.filter((a: any) => a.admissionStatus === 'RESERVED'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHierarchy();
    fetchBeds();
    fetchInpatients();
  }, [selectedBlock, selectedFloor, selectedWard, selectedBedSet, bedSearch]);

  useEffect(() => {
    if (!socket) return;

    socket.on('bed:updated', (updatedBed: any) => {
      fetchStats();
      // Update local beds array
      setBeds((prevBeds) =>
        prevBeds.map((b) => (b._id === updatedBed._id ? updatedBed : b))
      );
      // Update selected bed details modal if open
      setSelectedBedDetails((prevDetails: any) => {
        if (prevDetails && prevDetails.bed && prevDetails.bed._id === updatedBed._id) {
          request(`/beds/${updatedBed._id}`).then(res => {
            setSelectedBedDetails(res);
          });
        }
        return prevDetails;
      });
      addSystemNotification(`Bed ${updatedBed.bedId} status updated to ${updatedBed.status}.`, 'INFO');
    });

    socket.on('admission:updated', () => {
      fetchInpatients();
    });

    socket.on('diagnostic:departed', () => {
      fetchInpatients();
    });

    socket.on('diagnostic:returned', () => {
      fetchInpatients();
    });

    socket.on('diagnostic:completed', (info: any) => {
      setReturnNotifications((prev) => [info, ...prev]);
      addSystemNotification(`Patient ${info.name} (${info.patientIdCode}) completed scan ${info.testType}. Returning to ward bed.`, 'SUCCESS');
      setDiagnosticLeaves((prev) => prev.filter(p => p.patientIdCode !== info.patientIdCode));
      fetchInpatients();
    });

    return () => {
      socket.off('bed:updated');
      socket.off('admission:updated');
      socket.off('diagnostic:departed');
      socket.off('diagnostic:returned');
      socket.off('diagnostic:completed');
    };
  }, [socket]);

  const handleBedClick = async (bedId: string) => {
    try {
      const res = await request(`/beds/${bedId}`);
      setSelectedBedDetails(res);
      setManualStatusSelection(res.bed.status);
      setManualReason(res.bed.maintenanceReason || '');
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualBedStatusUpdate = async (bedId: string, status: string, reason?: string) => {
    try {
      await request(`/beds/${bedId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, maintenanceReason: reason }),
      });
      setSelectedBedDetails(null);
      fetchBeds();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update bed status.');
    }
  };

  // 1. Confirm physical admission check-in (RESERVED -> OCCUPIED)
  const handleConfirmAdmission = async (admissionId: string) => {
    try {
      await request(`/admissions/${admissionId}/admit`, { method: 'POST' });
      fetchInpatients();
      fetchBeds();
    } catch (err: any) {
      alert(err.message || 'Admission confirmation failed.');
    }
  };

  // 2. Patient leaves ward for diagnostic scan
  const handleLeaveForDiagnostics = async (admission: any) => {
    try {
      if (admission.inDiagnostics) return;

      const patId = admission.patientId?._id || admission.patientId;
      const patCode = admission.patientId?.patientId || admission.patientId;
      const patName = admission.patientId?.userId?.name || 'Patient';
      const bedCode = admission.bedId?.bedId || 'Bed';
      const wardTitle = admission.wardId?.name || '';

      // Immediately record locally with deduplication
      setDiagnosticLeaves((prev) => {
        if (prev.some(p => p.admissionId === admission._id || p.patientId === patId || p.patientIdCode === patCode)) {
          return prev;
        }
        return [
          {
            admissionId: admission._id,
            patientId: patId,
            patientIdCode: patCode,
            name: patName,
            bedId: bedCode,
            wardName: wardTitle,
            leftAt: new Date(),
          },
          ...prev,
        ];
      });

      // Persist to backend
      await request(`/admissions/${admission._id}/send-for-scan`, { method: 'POST' });
      addSystemNotification(`Patient ${patName} dispatched for diagnostic scan.`, 'INFO');
      fetchInpatients();
    } catch (err) {
      console.error(err);
      fetchInpatients();
    }
  };

  // Confirm patient returned from diagnostics
  const handleReturnFromDiagnostics = async (admissionId: string) => {
    try {
      await request(`/admissions/${admissionId}/return-from-scan`, { method: 'POST' });
      setDiagnosticLeaves((prev) => prev.filter(p => p.admissionId !== admissionId));
      addSystemNotification('Patient safely returned to ward bed.', 'SUCCESS');
      fetchInpatients();
    } catch (err) {
      console.error(err);
      setDiagnosticLeaves((prev) => prev.filter(p => p.admissionId !== admissionId));
      fetchInpatients();
    }
  };

  const handleReturnConfirm = (idxToRemove: number) => {
    setReturnNotifications((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // 3. Confirm discharge & checkout (DISCHARGE_RECOMMENDED + PAID -> CLEANING)
  const handleConfirmDischarge = async (admissionId: string) => {
    try {
      await request(`/admissions/${admissionId}/discharge`, { method: 'POST' });
      fetchInpatients();
      fetchBeds();
    } catch (err: any) {
      alert(err.message || 'Discharge failed. Outstanding payment balance might be pending.');
    }
  };

  // 4. Sanitization and cleaning finished (CLEANING -> AVAILABLE)
  const handleFinishCleaning = async (bedId: string) => {
    try {
      await request('/beds/finish-cleaning', {
        method: 'POST',
        body: JSON.stringify({ bedId }),
      });
      setSelectedBedDetails(null);
      fetchBeds();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to complete cleaning.');
    }
  };

  // Diagnostics Tracking - deduplicated live list
  const activeDiagnosticsPatients = React.useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. From active inpatients where inDiagnostics is true
    inpatients
      .filter((adm: any) => adm.inDiagnostics)
      .forEach((adm: any) => {
        const key = String(adm.patientId?._id || (adm.patientId as any)?.patientId || adm._id);
        if (!seenIds.has(key)) {
          seenIds.add(key);
          list.push({
            admissionId: adm._id,
            patientId: adm.patientId?._id,
            patientIdCode: (adm.patientId as any)?.patientId || 'P-ID',
            name: (adm.patientId as any)?.userId?.name || 'Patient',
            bedId: adm.bedId?.bedId || 'Assigned Bed',
            wardName: adm.wardId?.name,
            leftAt: adm.diagnosticsLeftAt ? new Date(adm.diagnosticsLeftAt) : new Date(),
          });
        }
      });

    // 2. From local diagnosticLeaves state (if not already added)
    diagnosticLeaves.forEach((pat: any) => {
      const key = String(pat.patientId || pat.patientIdCode || pat.admissionId);
      if (!seenIds.has(key)) {
        seenIds.add(key);
        list.push({
          admissionId: pat.admissionId,
          patientId: pat.patientId,
          patientIdCode: pat.patientIdCode,
          name: pat.name,
          bedId: pat.bedId,
          wardName: pat.wardName,
          leftAt: pat.leftAt ? new Date(pat.leftAt) : new Date(),
        });
      }
    });

    return list;
  }, [inpatients, diagnosticLeaves]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-50 text-emerald-800 border-emerald-250';
      case 'RESERVED': return 'bg-indigo-50 text-indigo-800 border-indigo-250';
      case 'OCCUPIED': return 'bg-blue-50 text-blue-800 border-blue-250';
      case 'CLEANING': return 'bg-amber-50 text-amber-800 border-amber-250';
      case 'MAINTENANCE': return 'bg-red-50 text-red-800 border-red-250';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-850 flex items-center space-x-2">
            {activeTab === 'beds' ? (
              <>
                <BedDouble className="h-6 w-6 text-healthcare-600" />
                <span>Ward Bed Directory</span>
              </>
            ) : activeTab === 'inpatients' ? (
              <>
                <Users className="h-6 w-6 text-healthcare-600" />
                <span>Inpatient Stay Board</span>
              </>
            ) : (
              <>
                <Activity className="h-6 w-6 text-healthcare-600" />
                <span>Diagnostics Tracking</span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            {activeTab === 'beds'
              ? 'Manage hospital bed assignments, sanitization status, and availability.'
              : activeTab === 'inpatients'
              ? 'Monitor currently admitted patients and pending reservations.'
              : 'Track active patient diagnostics transfers and laboratory scan leaves.'}
          </p>
        </div>
      </div>

      {/* Return notifications alerts */}
      {returnNotifications.length > 0 && (
        <div className="space-y-2">
          {returnNotifications.map((notif, idx) => (
            <div key={idx} className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-900 animate-bounce">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>
                  PATIENT RETURN NOTIFICATION: Admitted patient <strong>{notif.name}</strong> ({notif.patientIdCode}) completed scan ({notif.testType}) and is returning to bed.
                </span>
              </div>
              <button
                onClick={() => handleReturnConfirm(idx)}
                className="bg-white hover:bg-slate-105 border border-slate-200 text-slate-800 font-bold px-3 py-1 rounded-lg text-[10px] transition shadow-sm"
              >
                Acknowledge Return
              </button>
            </div>
          ))}
        </div>
      )}

      {/* BEDS DIRECTORY TAB */}
      {activeTab === 'beds' && (
        <div className="space-y-6">
          {/* Bed stats tiles */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Beds</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalBeds || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><BedDouble className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Available</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.available || 0}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Reserved</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.reserved || 0}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Clock className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Occupied</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.occupied || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Activity className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cleaning</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.cleaning || 0}</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Sparkles className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Maintenance</p>
                <p className="text-2xl font-bold text-red-650 mt-1">{stats.maintenance || 0}</p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Wrench className="h-6 w-6" /></div>
            </div>
          </div>

          {/* Hierarchy Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Block</label>
              <select
                value={selectedBlock}
                onChange={(e) => {
                  setSelectedBlock(e.target.value);
                  setSelectedFloor('');
                  setSelectedWard('');
                  setSelectedBedSet('');
                }}
                className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
              >
                <option value="">All Blocks</option>
                {hierarchy.blocks?.map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Floor</label>
              <select
                value={selectedFloor}
                onChange={(e) => {
                  const floorId = e.target.value;
                  setSelectedFloor(floorId);
                  setSelectedWard('');
                  setSelectedBedSet('');
                  if (floorId) {
                    const fl = hierarchy.floors?.find((f: any) => f._id === floorId);
                    if (fl?.blockId) {
                      setSelectedBlock(fl.blockId._id || fl.blockId);
                    }
                  }
                }}
                className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
              >
                <option value="">All Floors</option>
                {hierarchy.floors
                  ?.filter((f: any) => !selectedBlock || (f.blockId?._id || f.blockId) === selectedBlock)
                  .map((f: any) => (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Department / Ward</label>
              <select
                value={selectedWard}
                onChange={(e) => {
                  const wardId = e.target.value;
                  setSelectedWard(wardId);
                  setSelectedBedSet('');
                  if (wardId) {
                    const wd = hierarchy.wards?.find((w: any) => w._id === wardId);
                    if (wd?.floorId) {
                      const fId = wd.floorId._id || wd.floorId;
                      setSelectedFloor(fId);
                      const fl = hierarchy.floors?.find((f: any) => f._id === fId);
                      if (fl?.blockId) {
                        setSelectedBlock(fl.blockId._id || fl.blockId);
                      }
                    }
                  }
                }}
                className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
              >
                <option value="">All Wards</option>
                {hierarchy.wards
                  ?.filter((w: any) => !selectedFloor || (w.floorId?._id || w.floorId) === selectedFloor)
                  .map((w: any) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bed Set</label>
              <select
                value={selectedBedSet}
                onChange={(e) => {
                  const bsId = e.target.value;
                  setSelectedBedSet(bsId);
                  if (bsId) {
                    const bs = hierarchy.bedSets?.find((b: any) => b._id === bsId);
                    if (bs?.wardId) {
                      const wId = bs.wardId._id || bs.wardId;
                      setSelectedWard(wId);
                      const wd = hierarchy.wards?.find((w: any) => w._id === wId);
                      if (wd?.floorId) {
                        const fId = wd.floorId._id || wd.floorId;
                        setSelectedFloor(fId);
                        const fl = hierarchy.floors?.find((f: any) => f._id === fId);
                        if (fl?.blockId) {
                          setSelectedBlock(fl.blockId._id || fl.blockId);
                        }
                      }
                    }
                  }
                }}
                className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
              >
                <option value="">All Bed Sets</option>
                {hierarchy.bedSets
                  ?.filter((bs: any) => !selectedWard || (bs.wardId?._id || bs.wardId) === selectedWard)
                  .map((bs: any) => (
                    <option key={bs._id} value={bs._id}>{bs.name}</option>
                  ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Search Bed ID</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. GM-M-001"
                  value={bedSearch}
                  onChange={(e) => setBedSearch(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Ward Details Card */}
          {selectedWard && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              {(() => {
                const ward = hierarchy.wards?.find((w: any) => w._id === selectedWard);
                if (!ward) return <p className="text-slate-400 italic text-xs">Ward specifications not found.</p>;
                
                const wardBeds = beds.filter((b) => {
                  const wId = b.bedSetId?.wardId?._id || b.bedSetId?.wardId;
                  return wId && String(wId) === String(selectedWard);
                });
                const totalBedsCount = wardBeds.length;
                const occupiedBedsCount = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
                const availableBedsCount = wardBeds.filter((b) => b.status === 'AVAILABLE').length;
                const cleaningBedsCount = wardBeds.filter((b) => b.status === 'CLEANING').length;
                const maintenanceBedsCount = wardBeds.filter((b) => b.status === 'MAINTENANCE').length;
                const occupancyPct = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;
                const wardBedSets = hierarchy.bedSets?.filter((bs: any) => {
                  const wId = bs.wardId?._id || bs.wardId;
                  return wId && String(wId) === String(selectedWard);
                }) || [];

                const floorObj = hierarchy.floors?.find((f: any) => f._id === (ward.floorId?._id || ward.floorId));
                const blockName = floorObj?.blockId?.name || ward.floorId?.blockId?.name || 'Main Block';

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-healthcare-50 text-healthcare-600 rounded-xl">
                          <Info className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-bold text-slate-900">{ward.name}</h3>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              ward.gender === 'FEMALE' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                              ward.gender === 'MALE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {ward.gender || 'GENERAL'} WARD
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {ward.departmentId?.name || 'General Medicine'} &bull; {ward.floorId?.name || 'Floor 1'} ({blockName})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Occupancy</span>
                          <span className="text-sm font-extrabold text-slate-800">{occupancyPct}% Full</span>
                        </div>
                        <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              occupancyPct > 85 ? 'bg-red-500' : occupancyPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Beds</span>
                        <span className="text-lg font-black text-slate-800">{totalBedsCount}</span>
                      </div>
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Available</span>
                        <span className="text-lg font-black text-emerald-700">{availableBedsCount}</span>
                      </div>
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Occupied</span>
                        <span className="text-lg font-black text-blue-700">{occupiedBedsCount}</span>
                      </div>
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Cleaning</span>
                        <span className="text-lg font-black text-amber-700">{cleaningBedsCount}</span>
                      </div>
                      <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Maintenance</span>
                        <span className="text-lg font-black text-rose-700">{maintenanceBedsCount}</span>
                      </div>
                    </div>

                    {wardBedSets.length > 0 && (
                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-400">Bed Sets:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {wardBedSets.map((bs: any) => (
                            <span
                              key={bs._id}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                                selectedBedSet === bs._id
                                  ? 'bg-healthcare-600 text-white border-healthcare-600'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {bs.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Interactive Bed Grid Directory */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-md font-bold text-slate-850">Bed Grid Directory</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Click on any bed to view details and update cleaning, maintenance, or operational status.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {beds.length} Bed{beds.length === 1 ? '' : 's'}
              </span>
            </div>

            {beds.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                No beds match your filter options.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {beds.map((bed: any) => (
                  <button
                    key={bed._id}
                    onClick={() => handleBedClick(bed._id)}
                    className="bg-white border border-slate-200 hover:border-healthcare-400 p-4 rounded-xl text-left space-y-3 transition shadow-sm hover:shadow-md group flex flex-col justify-between cursor-pointer"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-450 block uppercase font-bold tracking-wider">
                        {bed.bedSetId?.wardId?.departmentId?.name || 'Clinic'}
                      </span>
                      <p className="font-extrabold text-sm text-slate-800 font-mono group-hover:text-healthcare-650 transition">
                        {bed.bedId}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100/60 w-full">
                      <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${getStatusBadge(bed.status)}`}>
                        {bed.status}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {bed.bedSetId?.wardId?.floorId?.name || 'Floor 1'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INPATIENTS CENSUS BOARD */}
      {activeTab === 'inpatients' && (
        <div className="grid grid-cols-1 gap-6">
          {/* Active stays table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-md font-bold text-slate-850 mb-4">Admitted stays and incoming reservations</h2>

            <div className="overflow-hidden border border-slate-200 rounded-2xl text-xs font-semibold">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Patient Details</th>
                    <th className="px-6 py-3 text-left">Ward / Bed</th>
                    <th className="px-6 py-3 text-left">Food Diet</th>
                    <th className="px-6 py-3 text-left">Stay Status</th>
                    <th className="px-6 py-3 text-center">Checkout Operations</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-slate-700 font-semibold">
                  {/* Incoming reservations */}
                  {incomingReservations.map((adm) => (
                    <tr key={adm._id} className="bg-indigo-50/30">
                      <td className="px-6 py-4">
                        <p className="font-bold text-indigo-900">{(adm.patientId as any).userId?.name} (Incoming)</p>
                        <p className="text-[10px] text-slate-400">ID: {(adm.patientId as any).patientId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p>{adm.wardId?.name}</p>
                        <p className="text-[10px] text-healthcare-600 font-bold">Reserved Bed: {adm.bedId?.bedId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center space-x-1 text-[10px]">
                          <Apple className="h-4.5 w-4.5 text-slate-500" />
                          <span>{(adm.patientId as any).foodPreference}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-100 text-indigo-850 px-2 py-0.5 rounded text-[10px] border border-indigo-200">
                          BED RESERVED
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleConfirmAdmission(adm._id)}
                          className="bg-healthcare-650 hover:bg-healthcare-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
                        >
                          Confirm Physical Admission
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Active stay cases */}
                  {inpatients.map((adm) => {
                    const isReadyForDischarge = adm.admissionStatus === 'DISCHARGE_RECOMMENDED' && adm.paymentStatus === 'PAID';
                    const isOutForScan = Boolean(
                      adm.inDiagnostics ||
                      diagnosticLeaves.some((p: any) =>
                        p.admissionId === adm._id ||
                        p.patientId === adm.patientId?._id ||
                        p.patientIdCode === (adm.patientId as any)?.patientId
                      )
                    );

                    return (
                      <tr key={adm._id}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-850">{(adm.patientId as any).userId?.name}</p>
                          <p className="text-[10px] text-slate-400">ID: {(adm.patientId as any).patientId}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p>{adm.wardId?.name}</p>
                          <p className="text-[10px] text-healthcare-600 font-bold">Bed: {adm.bedId?.bedId}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center space-x-1 text-[10px]">
                            <Apple className="h-4.5 w-4.5 text-slate-500" />
                            <span>{(adm.patientId as any).foodPreference}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isOutForScan ? (
                            <div className="flex flex-col space-y-1">
                              <span className="inline-flex items-center space-x-1.5 text-[10px] font-black px-2.5 py-1 rounded-md uppercase bg-amber-100 text-amber-850 border border-amber-300 animate-pulse shadow-xs">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                                <span>IN DIAGNOSTICS ROOM</span>
                              </span>
                              {adm.diagnosticsLeftAt && (
                                <span className="text-[10px] text-amber-700 font-semibold flex items-center space-x-1">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>Left: {new Date(adm.diagnosticsLeftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              isReadyForDischarge
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-250 animate-pulse'
                                : adm.admissionStatus === 'DISCHARGE_RECOMMENDED'
                                ? 'bg-amber-100 text-amber-800 border-amber-250'
                                : 'bg-blue-100 text-blue-800 border-blue-250'
                            }`}>
                              {isReadyForDischarge ? 'READY FOR DISCHARGE' : adm.admissionStatus}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isReadyForDischarge ? (
                            <button
                              onClick={() => handleConfirmDischarge(adm._id)}
                              className="bg-emerald-650 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
                            >
                              Patient Left Ward
                            </button>
                          ) : adm.admissionStatus === 'DISCHARGE_RECOMMENDED' ? (
                            <span className="text-[10px] text-amber-600 font-semibold italic">Pending final payment...</span>
                          ) : isOutForScan ? (
                            <button
                              onClick={() => handleReturnFromDiagnostics(adm._id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1 shadow-sm mx-auto active:scale-95"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Confirm Return to Ward</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLeaveForDiagnostics(adm)}
                              className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1 mx-auto active:scale-95"
                            >
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>Send for Scan</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTICS DEPARTURES AND RETURNS */}
      {activeTab === 'diagnostics' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-md font-bold text-slate-850">Diagnostics Tracking Board</h2>
              <p className="text-xs text-slate-400">Live monitor of admitted patients currently attending diagnostic scans or tests.</p>
            </div>
            <span className="bg-healthcare-50 text-healthcare-700 border border-healthcare-200 text-xs font-bold px-2.5 py-1 rounded-full">
              {activeDiagnosticsPatients.length} Active {activeDiagnosticsPatients.length === 1 ? 'Transfer' : 'Transfers'}
            </span>
          </div>
          
          {activeDiagnosticsPatients.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-700">All Admitted Patients In Wards</p>
              <p className="text-xs text-slate-400 mt-1">No patients currently out of ward for diagnostic scans.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDiagnosticsPatients.map((pat) => (
                <div
                  key={pat.patientIdCode || pat.patientId || pat.admissionId}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-slate-900">{pat.name}</h3>
                      <span className="text-[10px] font-bold text-healthcare-600 bg-healthcare-50 px-2 py-0.5 rounded border border-healthcare-200">
                        {pat.patientIdCode}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs font-semibold">
                      Bed: <span className="text-slate-800 font-bold">{pat.bedId}</span> {pat.wardName ? `• Ward: ${pat.wardName}` : ''}
                    </p>
                    <p className="text-slate-400 text-[11px] font-medium flex items-center space-x-1 pt-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Left ward at: {pat.leftAt ? pat.leftAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recently'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="bg-amber-50 text-amber-850 px-3 py-1.5 rounded-xl border border-amber-250 text-xs font-black flex items-center space-x-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>IN DIAGNOSTICS ROOM</span>
                    </span>

                    {pat.admissionId && (
                      <button
                        onClick={() => handleReturnFromDiagnostics(pat.admissionId)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirm Return to Ward</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bed Detail Card Modal */}
      {selectedBedDetails && (
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-155">
            <button
              onClick={() => setSelectedBedDetails(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 space-y-6 text-slate-805">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded border uppercase ${getStatusBadge(selectedBedDetails.bed.status)}`}>
                    {selectedBedDetails.bed.status}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                    {selectedBedDetails.bed.bedSetId?.wardId?.departmentId?.name || 'Department'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Bed ID: {selectedBedDetails.bed.bedId}</h3>
                <p className="text-xs text-slate-505 font-medium">
                  Location: {selectedBedDetails.bed.bedSetId?.wardId?.floorId?.blockId?.name} &rarr;{' '}
                  {selectedBedDetails.bed.bedSetId?.wardId?.floorId?.name} &rarr;{' '}
                  {selectedBedDetails.bed.bedSetId?.wardId?.name} &rarr;{' '}
                  {selectedBedDetails.bed.bedSetId?.name}
                </p>
              </div>

              {/* Patient info or maintenance alerts */}
              {(selectedBedDetails.bed.status === 'OCCUPIED' || selectedBedDetails.bed.status === 'RESERVED') && selectedBedDetails.admission ? (
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2.5 text-xs text-slate-655 font-semibold">
                  <h4 className="text-[10px] text-healthcare-650 font-extrabold uppercase tracking-widest border-b border-slate-200 pb-1">
                    Active Patient Info
                  </h4>
                  <p>Patient Name: <span className="text-slate-900 font-bold">{selectedBedDetails.admission.patientId?.userId?.name}</span></p>
                  <p>Patient Code ID: <span className="text-slate-800 font-bold">{selectedBedDetails.admission.patientId?.patientId}</span></p>
                  <p>Primary Doctor: <span className="text-slate-800 font-semibold">{selectedBedDetails.admission.doctorId?.userId?.name || 'Unassigned'}</span></p>
                  <p>Admitted on: <span className="text-slate-550 font-medium">
                    {selectedBedDetails.bed.occupiedTime ? new Date(selectedBedDetails.bed.occupiedTime).toLocaleDateString() : new Date(selectedBedDetails.admission.createdAt).toLocaleDateString()}
                  </span></p>
                </div>
              ) : selectedBedDetails.bed.status === 'MAINTENANCE' ? (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs space-y-1.5 font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                    <h4 className="font-extrabold uppercase text-[10px] tracking-wider">Maintenance Details</h4>
                  </div>
                  <p className="text-slate-605">{selectedBedDetails.bed.maintenanceReason || 'Routine equipment safety check.'}</p>
                </div>
              ) : selectedBedDetails.bed.status === 'CLEANING' ? (
                <div className="p-4 bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl text-xs space-y-1.5 font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-amber-600 animate-spin" />
                    <h4 className="font-extrabold uppercase text-[10px] tracking-wider">Cleaning Status</h4>
                  </div>
                  <p className="text-slate-605">Sanitization and bed sheets replacement in progress.</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-2 text-xs text-slate-505 font-medium">
                  <Info className="h-4.5 w-4.5 text-slate-400" />
                  <span>This bed has no active patient assigned.</span>
                </div>
              )}

              {/* Status Transition Panel */}
              {/* Status Transition & All Permissions Panel */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Status Transition Panel (All Permissions)
                  </label>
                  <p className="text-[10px] text-slate-550 font-medium">Change capacity and operational state of this bed.</p>
                </div>

                {/* 1-Click Common Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {selectedBedDetails.bed.status !== 'CLEANING' && (
                    <button
                      onClick={() => handleManualBedStatusUpdate(selectedBedDetails.bed._id, 'CLEANING')}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Start Cleaning</span>
                    </button>
                  )}
                  {selectedBedDetails.bed.status === 'CLEANING' && (
                    <button
                      onClick={() => handleFinishCleaning(selectedBedDetails.bed._id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Complete Sanitization</span>
                    </button>
                  )}
                  {selectedBedDetails.bed.status !== 'MAINTENANCE' && (
                    <button
                      onClick={() => {
                        const reason = window.prompt('Enter reason for maintenance:', 'Routine equipment maintenance');
                        if (reason !== null) {
                          handleManualBedStatusUpdate(selectedBedDetails.bed._id, 'MAINTENANCE', reason || 'Routine equipment maintenance');
                        }
                      }}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Put in Maintenance</span>
                    </button>
                  )}
                  {selectedBedDetails.bed.status === 'MAINTENANCE' && (
                    <button
                      onClick={() => handleManualBedStatusUpdate(selectedBedDetails.bed._id, 'AVAILABLE')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Maintenance Complete</span>
                    </button>
                  )}
                  {selectedBedDetails.bed.status !== 'AVAILABLE' && (
                    <button
                      onClick={() => handleManualBedStatusUpdate(selectedBedDetails.bed._id, 'AVAILABLE')}
                      className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Set Available</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedBedDetails(null)}
                    className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    Close
                  </button>
                </div>

                {/* Direct Manual Status Override with Reason */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Change Status (Select Any State)
                  </span>
                  <div className="flex items-center space-x-2">
                    <select
                      value={manualStatusSelection || selectedBedDetails.bed.status}
                      onChange={(e) => setManualStatusSelection(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-healthcare-500 flex-1"
                    >
                      <option value="AVAILABLE">AVAILABLE (Vacant & Ready)</option>
                      <option value="CLEANING">CLEANING (Sanitization in progress)</option>
                      <option value="MAINTENANCE">MAINTENANCE (Out of order)</option>
                      <option value="RESERVED">RESERVED (Pending arrival)</option>
                      <option value="OCCUPIED">OCCUPIED (In-use)</option>
                    </select>
                    <button
                      onClick={() => {
                        const targetStatus = manualStatusSelection || selectedBedDetails.bed.status;
                        handleManualBedStatusUpdate(selectedBedDetails.bed._id, targetStatus, manualReason);
                      }}
                      className="bg-healthcare-600 hover:bg-healthcare-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition shadow-sm shrink-0"
                    >
                      Apply Status
                    </button>
                  </div>
                  {(manualStatusSelection === 'MAINTENANCE' || selectedBedDetails.bed.status === 'MAINTENANCE') && (
                    <input
                      type="text"
                      placeholder="Reason for maintenance (e.g. Broken frame, monitor check)..."
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-healthcare-500"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardDashboard;
