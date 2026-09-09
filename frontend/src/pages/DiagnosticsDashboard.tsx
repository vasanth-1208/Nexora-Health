import React, { useState, useEffect, useMemo } from 'react';
import { request } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  CheckSquare,
  Play,
  CheckCircle,
  UserCheck,
  Search,
  X,
  RefreshCw,
  Clock,
  Activity,
  AlertCircle,
  Layers,
  Filter,
} from 'lucide-react';

export type LabCategory = 'ALL' | 'XRAY' | 'CTSCAN' | 'MRI' | 'PATHOLOGY' | 'CARDIOLOGY' | 'OTHER';

export const getLabCategory = (testType: string): LabCategory => {
  const t = (testType || '').toLowerCase().trim();
  if (t.includes('x-ray') || t.includes('xray') || t.includes('x ray') || t.startsWith('xr')) return 'XRAY';
  if (t.includes('ct scan') || t.includes('ct-scan') || t.includes('ct ') || t.startsWith('ct')) return 'CTSCAN';
  if (t.includes('mri')) return 'MRI';
  if (t.includes('ultrasound') || t.includes('usg') || t.includes('sonography')) return 'OTHER';
  if (t.includes('ecg') || t.includes('echo') || t.includes('cardio') || t.includes('holter') || t.includes('tmt')) return 'CARDIOLOGY';
  if (
    t.includes('blood') ||
    t.includes('cbc') ||
    t.includes('lipid') ||
    t.includes('lft') ||
    t.includes('kft') ||
    t.includes('rft') ||
    t.includes('sugar') ||
    t.includes('thyroid') ||
    t.includes('urine') ||
    t.includes('pathology')
  ) {
    return 'PATHOLOGY';
  }
  return 'OTHER';
};

const formatDoctorName = (name?: string) => {
  if (!name) return 'Doctor';
  const trimmed = name.trim();
  return trimmed.toLowerCase().startsWith('dr.') ? trimmed : `Dr. ${trimmed}`;
};

const DiagnosticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, addSystemNotification } = useSocket();
  const [scanQueue, setScanQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_ARRIVAL' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'EMERGENCY' | 'URGENT' | 'ROUTINE'>('ALL');

  // Active Modality / Lab Tab
  const [activeLabTab, setActiveLabTab] = useState<LabCategory>(() => {
    if (user?.labType === 'XRAY') return 'XRAY';
    if (user?.labType === 'CTSCAN') return 'CTSCAN';
    if (user?.labType === 'PATHOLOGY') return 'PATHOLOGY';
    if (user?.labType === 'CARDIOLOGY') return 'CARDIOLOGY';
    return 'ALL';
  });

  // Sync tab with user profile on mount
  useEffect(() => {
    if (user?.labType && user.labType !== 'ALL') {
      setActiveLabTab(user.labType as LabCategory);
    }
  }, [user?.labType]);

  useEffect(() => {
    fetchScanQueue();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      fetchScanQueue(true);
    };

    socket.on('diagnostic:requested', handleRefresh);
    socket.on('diagnostic:updated', handleRefresh);
    socket.on('payment:updated', handleRefresh);
    socket.on('patient:status', handleRefresh);

    return () => {
      socket.off('diagnostic:requested', handleRefresh);
      socket.off('diagnostic:updated', handleRefresh);
      socket.off('payment:updated', handleRefresh);
      socket.off('patient:status', handleRefresh);
    };
  }, [socket]);

  const fetchScanQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await request('/diagnostics');
      setScanQueue(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch scan queue:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleUpdateStatus = async (scanId: string, status: string) => {
    setActionLoadingId(scanId);
    try {
      await request(`/diagnostics/${scanId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      addSystemNotification(`Scan order status updated to ${status}.`, 'SUCCESS');
      await fetchScanQueue(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update scan status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Modality Counts across entire queue
  const labCounts = useMemo(() => {
    const counts: Record<LabCategory, number> = {
      ALL: scanQueue.length,
      XRAY: 0,
      CTSCAN: 0,
      MRI: 0,
      PATHOLOGY: 0,
      CARDIOLOGY: 0,
      OTHER: 0,
    };

    for (const item of scanQueue) {
      const cat = getLabCategory(item.testType);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.OTHER++;
      }
    }
    return counts;
  }, [scanQueue]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return scanQueue.filter((scan) => {
      // 1. Modality / Lab filter
      if (activeLabTab !== 'ALL') {
        const cat = getLabCategory(scan.testType);
        if (cat !== activeLabTab) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING_ARRIVAL') {
          if (scan.status !== 'REQUESTED' && scan.status !== 'QUEUED') return false;
        } else if (scan.status !== statusFilter) {
          return false;
        }
      }

      // 3. Priority filter
      if (priorityFilter !== 'ALL' && scan.priority !== priorityFilter) {
        return false;
      }

      // 4. Search text filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const test = (scan.testType || '').toLowerCase();
        const patientName = (scan.patientId?.userId?.name || '').toLowerCase();
        const patientCode = (scan.patientId?.patientId || '').toLowerCase();
        const doctorName = (scan.doctorId?.userId?.name || '').toLowerCase();
        const orderId = (scan._id || '').toLowerCase();

        return (
          test.includes(query) ||
          patientName.includes(query) ||
          patientCode.includes(query) ||
          doctorName.includes(query) ||
          orderId.includes(query)
        );
      }

      return true;
    });
  }, [scanQueue, activeLabTab, statusFilter, priorityFilter, searchTerm]);

  // Metric Stats for active lab tab view
  const activeMetrics = useMemo(() => {
    const activeScans = activeLabTab === 'ALL'
      ? scanQueue
      : scanQueue.filter(s => getLabCategory(s.testType) === activeLabTab);

    return {
      total: activeScans.length,
      pendingArrival: activeScans.filter(s => s.status === 'REQUESTED' || s.status === 'QUEUED').length,
      inLab: activeScans.filter(s => s.status === 'RECEIVED' || s.status === 'IN_PROGRESS').length,
      completed: activeScans.filter(s => s.status === 'COMPLETED').length,
    };
  }, [scanQueue, activeLabTab]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800 border-red-200 animate-pulse';
      case 'URGENT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return { label: 'REQUESTED', className: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'QUEUED':
        return { label: 'QUEUED', className: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'RECEIVED':
        return { label: 'IN LAB', className: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-extrabold' };
      case 'IN_PROGRESS':
        return { label: 'SCANNING', className: 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse' };
      case 'COMPLETED':
        return { label: 'COMPLETED', className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold' };
      default:
        return { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Helper for dynamic portal title
  const getLabTitle = () => {
    if (activeLabTab === 'XRAY') return 'X-Ray Lab & Radiology Desk';
    if (activeLabTab === 'CTSCAN') return 'CT Scan Imaging Desk';
    if (activeLabTab === 'MRI') return 'MRI Scanning Room Desk';
    if (activeLabTab === 'PATHOLOGY') return 'Pathology & Blood Analysis Lab';
    if (activeLabTab === 'CARDIOLOGY') return 'Cardiology & ECG Scan Desk';
    return 'Diagnostics Lab & Scan Desk';
  };

  const getLabSubtitle = () => {
    if (activeLabTab === 'XRAY') return 'Manage X-Ray extremity, chest, and skeletal scan queues and arrival checks.';
    if (activeLabTab === 'CTSCAN') return 'Manage CT Scan tomography requests, patient arrival, and scan completion.';
    if (activeLabTab === 'MRI') return 'Manage magnetic resonance imaging scans and clinical completions.';
    if (activeLabTab === 'PATHOLOGY') return 'Manage blood, biochemistry, and pathological laboratory orders.';
    if (activeLabTab === 'CARDIOLOGY') return 'Manage electrocardiogram (ECG), echocardiogram, and cardiac tests.';
    return 'Unified diagnostics operations portal. Filter by specialized lab or manage all hospital scans.';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-healthcare-50 text-healthcare-600 rounded-xl border border-healthcare-100">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                <span>{getLabTitle()}</span>
                {user?.labType && user.labType !== 'ALL' && (
                  <span className="text-[10px] font-extrabold uppercase bg-healthcare-100 text-healthcare-800 px-2 py-0.5 rounded-full border border-healthcare-200">
                    Dedicated Desk: {user.userId}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                {getLabSubtitle()}
              </p>
            </div>
          </div>
        </div>

        {/* User Identity & Live Refresh Button */}
        <div className="flex items-center space-x-3 self-end md:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-bold text-slate-800 block">
              {user?.name || 'Diagnostics Operator'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              ID: {user?.userId || 'N/A'} {user?.labType ? `(${user.labType})` : ''}
            </span>
          </div>

          <button
            onClick={() => fetchScanQueue(false)}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
            title="Refresh Scan Queue"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-healthcare-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Modality / Lab Tabs */}
      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveLabTab('ALL')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeLabTab === 'ALL'
                ? 'bg-healthcare-600 text-white shadow-md shadow-healthcare-600/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Labs</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeLabTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {labCounts.ALL}
            </span>
          </button>

          <button
            onClick={() => setActiveLabTab('XRAY')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeLabTab === 'XRAY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-400/40'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>🩻 X-Ray Lab</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeLabTab === 'XRAY' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {labCounts.XRAY}
            </span>
          </button>

          <button
            onClick={() => setActiveLabTab('CTSCAN')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeLabTab === 'CTSCAN'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 ring-2 ring-purple-400/40'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>⚡ CT Scan Lab</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeLabTab === 'CTSCAN' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {labCounts.CTSCAN}
            </span>
          </button>

          <button
            onClick={() => setActiveLabTab('PATHOLOGY')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeLabTab === 'PATHOLOGY'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-2 ring-rose-400/40'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>🩸 Pathology Lab</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeLabTab === 'PATHOLOGY' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {labCounts.PATHOLOGY}
            </span>
          </button>

          <button
            onClick={() => setActiveLabTab('CARDIOLOGY')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeLabTab === 'CARDIOLOGY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-400/40'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>❤️ ECG / Cardiology</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeLabTab === 'CARDIOLOGY' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {labCounts.CARDIOLOGY}
            </span>
          </button>

          <button
            onClick={() => setActiveLabTab('MRI')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeLabTab === 'MRI'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>🧲 MRI Scan</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeLabTab === 'MRI' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {labCounts.MRI}
            </span>
          </button>

          {labCounts.OTHER > 0 && (
            <button
              onClick={() => setActiveLabTab('OTHER')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeLabTab === 'OTHER'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>Other Tests</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeLabTab === 'OTHER' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {labCounts.OTHER}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Metric Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Scans</span>
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeMetrics.total}</p>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Total logged in this view</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Awaiting Arrival</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{activeMetrics.pendingArrival}</p>
          <span className="text-[10px] text-amber-700/80 font-semibold mt-0.5 block">Need Confirm Arrival check-in</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">In Scan Room</span>
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-900 mt-2">{activeMetrics.inLab}</p>
          <span className="text-[10px] text-indigo-700/80 font-semibold mt-0.5 block">Arrived / Scanning in progress</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Completed</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{activeMetrics.completed}</p>
          <span className="text-[10px] text-emerald-700/80 font-semibold mt-0.5 block">Finished & logged</span>
        </div>
      </div>

      {/* 4. Search Bar & Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, patient ID (e.g. P1001), order number, test name, doctor..."
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-healthcare-500/20 focus:border-healthcare-500 transition font-medium text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_ARRIVAL">Needs Arrival (Requested / Queued)</option>
                <option value="RECEIVED">Received in Lab</option>
                <option value="IN_PROGRESS">Scanning In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="EMERGENCY">Emergency Only</option>
              <option value="URGENT">Urgent Only</option>
              <option value="ROUTINE">Routine Only</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators / Clear */}
        {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
          <div className="flex items-center space-x-2 text-[11px] pt-2 border-t border-slate-100 text-slate-500">
            <span className="font-semibold">Active filters:</span>
            {searchTerm && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                Query: "{searchTerm}"
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                Status: {statusFilter}
              </span>
            )}
            {priorityFilter !== 'ALL' && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                Priority: {priorityFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
              }}
              className="text-healthcare-600 hover:text-healthcare-700 font-bold ml-auto hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* 5. Main Scan Queue Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-slate-850">
              {getLabTitle()} Queue
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold">
              Showing {filteredQueue.length} of {scanQueue.length} total diagnostic requests
            </p>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No matching scan requests found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter options.'
                : `No diagnostic tests currently assigned to this ${activeLabTab === 'ALL' ? 'portal' : 'specialized lab tab'}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl text-xs font-semibold">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 text-left">Scan / Test</th>
                  <th className="px-5 py-3 text-left">Patient Details</th>
                  <th className="px-5 py-3 text-left">Ordering Doctor</th>
                  <th className="px-5 py-3 text-left">Priority</th>
                  <th className="px-5 py-3 text-left">Flow Status</th>
                  <th className="px-5 py-3 text-center">Operation Checks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-slate-700 font-semibold">
                {filteredQueue.map((scan) => {
                  const cat = getLabCategory(scan.testType);
                  const statusInfo = getStatusBadge(scan.status);
                  const isActionBusy = actionLoadingId === scan._id;

                  return (
                    <tr key={scan._id} className="hover:bg-slate-50/70 transition">
                      {/* 1. Scan / Test Type */}
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            cat === 'XRAY'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : cat === 'CTSCAN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : cat === 'PATHOLOGY'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : cat === 'CARDIOLOGY'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {cat}
                          </span>
                          <p className="font-bold text-slate-900 text-xs">{scan.testType}</p>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                          <span>Order: #{scan._id.substring(scan._id.length - 6)}</span>
                          <span>•</span>
                          <span>₹{scan.cost || 350}</span>
                        </div>
                      </td>

                      {/* 2. Patient Details */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-850 text-xs">
                          {scan.patientId?.userId?.name || 'Patient'}
                        </p>
                        <p className="text-[10px] text-healthcare-700 font-extrabold mt-0.5">
                          ID: {scan.patientId?.patientId || 'N/A'}
                        </p>
                      </td>

                      {/* 3. Ordering Doctor */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 text-xs">
                          {formatDoctorName(scan.doctorId?.userId?.name)}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {scan.doctorId?.specialization || 'Attending Physician'}
                        </span>
                      </td>

                      {/* 4. Priority */}
                      <td className="px-5 py-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityColor(scan.priority)}`}>
                          {scan.priority}
                        </span>
                      </td>

                      {/* 5. Flow Status */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                          {scan.status === 'REQUESTED' && (
                            <span className="block text-[9px] text-amber-700 font-bold">
                              Cashier Billing Pending
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Operation Checks (Fix: Confirm Arrival is ALWAYS visible when pending!) */}
                      <td className="px-5 py-4 text-center">
                        {/* A: Needs Arrival Check-In (Both QUEUED and REQUESTED can be confirmed!) */}
                        {(scan.status === 'QUEUED' || scan.status === 'REQUESTED') && (
                          <div className="flex flex-col items-center space-y-1">
                            <button
                              onClick={() => handleUpdateStatus(scan._id, 'RECEIVED')}
                              disabled={isActionBusy}
                              className="bg-healthcare-600 hover:bg-healthcare-550 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 mx-auto disabled:opacity-50"
                              title="Confirm patient has arrived at the scan desk"
                            >
                              <UserCheck className="h-4 w-4 shrink-0" />
                              <span>{isActionBusy ? 'Updating...' : 'Confirm Arrival'}</span>
                            </button>
                            {scan.status === 'REQUESTED' && (
                              <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Direct Check-In Allowed
                              </span>
                            )}
                          </div>
                        )}

                        {/* B: In Lab -> Start Scanning */}
                        {scan.status === 'RECEIVED' && (
                          <button
                            onClick={() => handleUpdateStatus(scan._id, 'IN_PROGRESS')}
                            disabled={isActionBusy}
                            className="bg-indigo-600 hover:bg-indigo-550 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 mx-auto animate-pulse disabled:opacity-50"
                            title="Start scan in progress"
                          >
                            <Play className="h-3.5 w-3.5 shrink-0 text-white fill-white" />
                            <span>{isActionBusy ? 'Starting...' : 'Start Scanning'}</span>
                          </button>
                        )}

                        {/* C: Scanning in progress -> Mark Completed */}
                        {scan.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleUpdateStatus(scan._id, 'COMPLETED')}
                            disabled={isActionBusy}
                            className="bg-emerald-600 hover:bg-emerald-550 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 mx-auto disabled:opacity-50"
                            title="Complete examination and notify ward/portal"
                          >
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            <span>{isActionBusy ? 'Completing...' : 'Scan Completed'}</span>
                          </button>
                        )}

                        {/* D: Completed */}
                        {scan.status === 'COMPLETED' && (
                          <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>Completed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticsDashboard;
