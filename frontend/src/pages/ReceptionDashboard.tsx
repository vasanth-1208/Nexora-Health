import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { request } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  UserPlus,
  Search,
  BedDouble,
  CreditCard,
  UserCheck,
  Building,
  DollarSign,
  AlertCircle,
  Activity,
  CheckCircle2,
  CheckCircle,
  Clock,
  Wrench,
  Sparkles,
  Info,
  X,
  Lock,
} from 'lucide-react';

const ReceptionDashboard: React.FC = () => {
  const location = useLocation();
  const { socket, addSystemNotification } = useSocket();

  const getTabFromPath = (path: string) => {
    if (path.endsWith('/patients')) return 'search';
    if (path.endsWith('/register')) return 'register';
    if (path.endsWith('/billing')) return 'billing';
    return 'beds';
  };

  const activeTab = getTabFromPath(location.pathname);

  // Stats
  const [stats, setStats] = useState({
    totalBeds: 0,
    available: 0,
    reserved: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
  });

  // Bed filtering & listing
  const [beds, setBeds] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any>({
    blocks: [],
    floors: [],
    departments: [],
    wards: [],
    bedSets: [],
  });

  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedBedSet, setSelectedBedSet] = useState('');
  const [bedSearch, setBedSearch] = useState('');
  const [selectedBedDetails, setSelectedBedDetails] = useState<any | null>(null);

  // New Patient Registration
  const [regName, setRegName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState('MALE');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmergName, setRegEmergName] = useState('');
  const [regEmergPhone, setRegEmergPhone] = useState('');
  const [regEmergRel, setRegEmergRel] = useState('');
  const [regBlood, setRegBlood] = useState('O+');
  const [regHistory, setRegHistory] = useState('');
  const [regAllergies, setRegAllergies] = useState('');
  const [regFood, setRegFood] = useState('NORMAL');
  const [regMaritalStatus, setRegMaritalStatus] = useState('SINGLE');
  const [regAlternatePhone, setRegAlternatePhone] = useState('');
  const [regIdentType, setRegIdentType] = useState('AADHAR');
  const [regIdentNum, setRegIdentNum] = useState('');
  const [regOccupation, setRegOccupation] = useState('');
  const [regOngoingMeds, setRegOngoingMeds] = useState('');
  const [regInsuranceProvider, setRegInsuranceProvider] = useState('');
  const [regInsurancePolicy, setRegInsurancePolicy] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Patient Search & Action Panel
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientTimeline, setPatientTimeline] = useState<any[]>([]);
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(3);
  const [allocatingBed, setAllocatingBed] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  
  // Assign Doctor (Fixed Standard Tariff)
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const consultFee = 500;
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Ward Change request
  const [selectedAdmittedWard, setSelectedAdmittedWard] = useState('');
  const [wardChangeSuccess, setWardChangeSuccess] = useState(false);

  // Bed allocation & Inpatient Admissions
  const [availableBedsInWard, setAvailableBedsInWard] = useState<any[]>([]);
  const [selectedBedToAllocate, setSelectedBedToAllocate] = useState('');
  const [allocationSuccess, setAllocationSuccess] = useState(false);
  const [allocationError, setAllocationError] = useState('');
  const [patientAdmissions, setPatientAdmissions] = useState<any[]>([]);
  const [selectedPatientAdmission, setSelectedPatientAdmission] = useState<any | null>(null);

  const selectedPatientRef = useRef<any>(null);
  useEffect(() => {
    selectedPatientRef.current = selectedPatient;
  }, [selectedPatient]);

  const activeAdmission = selectedPatientAdmission || patientAdmissions.find((adm: any) =>
    ['RECOMMENDED', 'RESERVED', 'OCCUPIED', 'DISCHARGE_RECOMMENDED'].includes(adm.admissionStatus)
  ) || (selectedPatient?.currentAdmissionId && typeof selectedPatient.currentAdmissionId === 'object' ? selectedPatient.currentAdmissionId : null);

  // Centralized Payments
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [paidPayments, setPaidPayments] = useState<any[]>([]);
  const [billingPatientId, setBillingPatientId] = useState('');
  const [billingPatientDetails, setBillingPatientDetails] = useState<any | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [billingSearchResults, setBillingSearchResults] = useState<any[]>([]);
  const [billingHasSearched, setBillingHasSearched] = useState(false);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 text-emerald-700';
      case 'OCCUPIED':
        return 'bg-sky-500/10 text-sky-700';
      case 'RESERVED':
        return 'bg-purple-500/10 text-purple-700';
      case 'CLEANING':
        return 'bg-amber-500/10 text-amber-700';
      case 'MAINTENANCE':
        return 'bg-red-500/10 text-red-700';
      default:
        return 'bg-slate-500/10 text-slate-700';
    }
  };

  const extractWardId = (wardRef: any): string => {
    if (!wardRef) return '';
    if (typeof wardRef === 'string') return wardRef !== '[object Object]' ? wardRef : '';
    if (typeof wardRef === 'object' && wardRef._id) return String(wardRef._id);
    return '';
  };

  const getWardDisplay = (wardRef: any) => {
    if (!wardRef) return { name: 'Prescribed Inpatient Ward', dept: 'Inpatient Care' };
    if (typeof wardRef === 'object' && wardRef.name) {
      return {
        name: wardRef.name,
        dept: wardRef.departmentId?.name || (typeof wardRef.departmentId === 'string' ? '' : 'Inpatient Care')
      };
    }
    const wardIdStr = extractWardId(wardRef);
    const found = hierarchy.wards?.find((w: any) => String(w._id) === wardIdStr);
    if (found) {
      return {
        name: found.name,
        dept: found.departmentId?.name || 'Inpatient Care'
      };
    }
    return { name: 'Prescribed Inpatient Ward', dept: 'Inpatient Care' };
  };

  useEffect(() => {
    fetchStats();
    fetchHierarchy();
    fetchBeds();
    fetchDoctors();
  }, [selectedBlock, selectedFloor, selectedWard, selectedBedSet, bedSearch]);

  // Real-time Bed updates
  useEffect(() => {
    if (!socket) return;

    socket.on('bed:updated', (updatedBed: any) => {
      // Update stats
      fetchStats();
      // Update local beds array
      setBeds((prevBeds) =>
        prevBeds.map((b) => (b._id === updatedBed._id ? updatedBed : b))
      );
      // Update selected bed details modal if open
      setSelectedBedDetails((prevDetails: any) => {
        if (prevDetails && prevDetails.bed && prevDetails.bed._id === updatedBed._id) {
          // Re-fetch bed details to sync admission Info
          request(`/beds/${updatedBed._id}`).then(res => {
            setSelectedBedDetails(res);
          });
        }
        return prevDetails;
      });

      addSystemNotification(`Bed ${updatedBed.bedId} status updated to ${updatedBed.status}.`, 'INFO');
    });

    const handleAdmissionUpdated = (data: any) => {
      fetchStats();
      fetchBeds();
      if (selectedPatientRef.current) {
        const curId = selectedPatientRef.current._id;
        const curPatId = selectedPatientRef.current.patientId;
        if (!data?.patientId || data.patientId === curId || data.patientId === curPatId) {
          selectPatientForActions(selectedPatientRef.current);
        }
      }
    };

    socket.on('admission:updated', handleAdmissionUpdated);

    return () => {
      socket.off('bed:updated');
      socket.off('admission:updated', handleAdmissionUpdated);
    };
  }, [socket]);

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

  const fetchDoctors = async () => {
    try {
      const res = await request('/doctors');
      setDoctors(res);
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Bed Detail Card/Modal Trigger
  const handleBedClick = async (bedId: string) => {
    try {
      const res = await request(`/beds/${bedId}`);
      setSelectedBedDetails(res);
    } catch (err) {
      console.error(err);
    }
  };

  // Bed status updates (MAINTENANCE, CLEANING, etc.)
  const handleManualBedStatusUpdate = async (bedId: string, status: string, reason?: string) => {
    try {
      await request(`/beds/${bedId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, maintenanceReason: reason }),
      });
      // Close modal
      setSelectedBedDetails(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update bed status.');
    }
  };

  // 2. Register Patient
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccess(null);
    setRegError(null);

    const body = {
      name: regName,
      dob: regDob,
      gender: regGender,
      phone: regPhone,
      email: regEmail,
      address: regAddress,
      emergencyContact: {
        name: regEmergName,
        phone: regEmergPhone,
        relationship: regEmergRel,
      },
      bloodGroup: regBlood,
      medicalHistory: regHistory,
      allergies: regAllergies,
      foodPreference: regFood,
      maritalStatus: regMaritalStatus,
      alternatePhone: regAlternatePhone,
      identificationType: regIdentType,
      identificationNumber: regIdentNum,
      occupation: regOccupation,
      ongoingMedications: regOngoingMeds,
      insuranceProvider: regInsuranceProvider,
      insurancePolicyNumber: regInsurancePolicy,
    };

    try {
      const res = await request('/patients/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setRegSuccess(`Patient registered successfully! Patient ID: ${res.patientId}. Initial password: ${regDob.split('-').reverse().join('')}`);
      // Clear forms
      setRegName('');
      setRegDob('');
      setRegPhone('');
      setRegEmail('');
      setRegAddress('');
      setRegEmergName('');
      setRegEmergPhone('');
      setRegEmergRel('');
      setRegHistory('');
      setRegAllergies('');
      setRegMaritalStatus('SINGLE');
      setRegAlternatePhone('');
      setRegIdentType('AADHAR');
      setRegIdentNum('');
      setRegOccupation('');
      setRegOngoingMeds('');
      setRegInsuranceProvider('');
      setRegInsurancePolicy('');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    }
  };

  // 3. Search Patient
  const handleSearchPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;

    try {
      const res = await request(`/patients/search?query=${searchQuery}`);
      setSearchResults(res);
      setSelectedPatient(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Select patient from search list to perform appointments or bed allocations
  const selectPatientForActions = async (patient: any) => {
    setSelectedPatient(patient);
    setVisibleTimelineCount(3);
    setAssignSuccess(false);
    setWardChangeSuccess(false);
    setAllocationSuccess(false);
    setAllocationError('');
    setSelectedBedToAllocate('');
    setAvailableBedsInWard([]);

    try {
      // 1. Fetch fresh patient details
      const freshPatient = await request(`/patients/${patient._id}`).catch(() => patient);
      setSelectedPatient(freshPatient);

      // 2. Fetch timeline
      const tl = await request(`/patients/${patient._id}/timeline`).catch(() => []);
      setPatientTimeline(Array.isArray(tl) ? tl : []);

      // 3. Fetch patient admissions (to get active or recommended admission)
      const adms = await request(`/admissions/patient/${patient._id}`).catch(() => []);
      const admList = Array.isArray(adms) ? adms : [];
      setPatientAdmissions(admList);

      const active = admList.find((a: any) =>
        ['RECOMMENDED', 'RESERVED', 'OCCUPIED', 'DISCHARGE_RECOMMENDED'].includes(a.admissionStatus)
      ) || (freshPatient.currentAdmissionId && typeof freshPatient.currentAdmissionId === 'object' ? freshPatient.currentAdmissionId : null);

      setSelectedPatientAdmission(active || null);

      // If patient has a recommended or active admission, check available beds in recommended ward
      if (active) {
        const targetWardId = extractWardId(active.wardId);
        if (targetWardId) {
          const allBeds = await request(`/beds?wardId=${targetWardId}&status=AVAILABLE`).catch(() => []);
          setAvailableBedsInWard(Array.isArray(allBeds) ? allBeds : []);
        }
      }
    } catch (err) {
      console.error('Failed to load patient details for actions:', err);
    }
  };

  // Doctor Assignment (Fixed standard fee ₹500)
  const handleAssignDoctor = async () => {
    if (!selectedDoctor || !selectedPatient) return;
    try {
      const selectedDocObj = doctors.find((d: any) => d._id === selectedDoctor);
      await request('/consultations/create', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatient._id,
          doctorId: selectedDoctor,
          fee: consultFee, // Fixed standard doctor consultation fee
        }),
      });
      showToast(`Appointment successfully booked for ${selectedDocObj?.userId?.name || 'Physician'}! Consultation fee: ₹500.`, 'success');
      setAssignSuccess(true);
      // Re-trigger timeline & patient refresh
      selectPatientForActions(selectedPatient);
    } catch (err: any) {
      showToast(err.message || 'Booking failed.', 'error');
    }
  };

  // Request Ward Change
  const handleRequestWardChange = async () => {
    const targetAdmissionId = activeAdmission?._id || selectedPatient?.currentAdmissionId?._id || selectedPatient?.currentAdmissionId;
    if (!selectedAdmittedWard || !targetAdmissionId) return;
    try {
      await request('/admissions/ward-change-request', {
        method: 'POST',
        body: JSON.stringify({
          admissionId: targetAdmissionId,
          requestedWardId: selectedAdmittedWard,
        }),
      });
      setWardChangeSuccess(true);
      showToast('Ward change request submitted successfully. Pending doctor review.', 'success');
      if (selectedPatient?._id) {
        selectPatientForActions(selectedPatient);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to submit ward change request.', 'error');
    }
  };

  // Bed allocation checkouts (Selection + payment = RESERVED)
  const handleBedAllocation = async () => {
    const targetAdmissionId = activeAdmission?._id || selectedPatient?.currentAdmissionId?._id || selectedPatient?.currentAdmissionId;
    if (!selectedBedToAllocate || !targetAdmissionId || allocatingBed) return;
    setAllocationError('');
    setAllocationSuccess(false);
    setAllocatingBed(true);

    try {
      await request('/admissions/pay-and-reserve', {
        method: 'POST',
        body: JSON.stringify({
          admissionId: targetAdmissionId,
          bedId: selectedBedToAllocate,
          amount: 2000 // Initial reserve checkout charge
        }),
      });
      setAllocationSuccess(true);
      showToast('Bed Reserved successfully. Initial stay bill recorded.', 'success');
      // Refresh patient profile details
      if (selectedPatient?._id) {
        selectPatientForActions(selectedPatient);
      }
      fetchStats();
      fetchBeds();
    } catch (err: any) {
      setAllocationError(err.message || 'Bed reservation failed.');
      showToast(err.message || 'Bed reservation failed.', 'error');
    } finally {
      setAllocatingBed(false);
    }
  };

  // 4. Billing & Cashier Desk
  const fetchPatientBillingData = async (dbPatientId: string) => {
    try {
      const [pendings, history] = await Promise.all([
        request(`/payments/pending/${dbPatientId}`).catch(() => []),
        request(`/payments/history/${dbPatientId}`).catch(() => []),
      ]);
      setPendingPayments(Array.isArray(pendings) ? pendings : []);
      setPaidPayments(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBillingSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentSuccess(false);
    setAmountTendered('');
    setBillingHasSearched(true);
    if (!billingPatientId || !billingPatientId.trim()) return;

    try {
      const searchRes = await request(`/patients/search?query=${encodeURIComponent(billingPatientId.trim())}`);
      const list = Array.isArray(searchRes) ? searchRes : [];
      if (list.length === 0) {
        // Fallback to direct ID query if search returns empty
        try {
          const patient = await request(`/patients/${billingPatientId.trim()}`);
          if (patient && patient._id) {
            setBillingSearchResults([patient]);
            setBillingPatientDetails(null);
          } else {
            setBillingSearchResults([]);
            setBillingPatientDetails(null);
          }
        } catch {
          setBillingSearchResults([]);
          setBillingPatientDetails(null);
        }
      } else {
        setBillingSearchResults(list);
        setBillingPatientDetails(null); // Explicit choice for cashier!
      }
    } catch (err) {
      console.error(err);
      alert('Search failed.');
      setBillingSearchResults([]);
      setBillingPatientDetails(null);
    }
  };

  const handleSelectBillingPatient = async (patient: any) => {
    setBillingPatientDetails(patient);
    setBillingSearchResults([]);
    setBillingHasSearched(false);
    setBillingPatientId(`${patient.userId?.name || 'Patient'} (${patient.patientId})`);
    setAmountTendered('');
    await fetchPatientBillingData(patient._id);
  };

  const handleClearBillingPatient = () => {
    setBillingPatientDetails(null);
    setBillingPatientId('');
    setBillingSearchResults([]);
    setBillingHasSearched(false);
    setPendingPayments([]);
    setPaidPayments([]);
    setAmountTendered('');
    setPaymentSuccess(false);
  };

  const handlePayBill = async (paymentId: string) => {
    try {
      await request(`/payments/${paymentId}/pay`, { method: 'POST' });
      setPaymentSuccess(true);
      addSystemNotification('Payment recorded successfully.', 'SUCCESS');
      if (billingPatientDetails) {
        await fetchPatientBillingData(billingPatientDetails._id);
      }
    } catch (err: any) {
      alert(err.message || 'Payment failed.');
    }
  };

  const handlePayAll = async () => {
    if (pendingPayments.length === 0 || !billingPatientDetails) return;
    if (!window.confirm(`Confirm recording cash payment of ₹${calculatePendingTotal().toLocaleString()} for all ${pendingPayments.length} pending bill(s)?`)) return;

    setIsProcessingBulk(true);
    setPaymentSuccess(false);
    try {
      for (const bill of pendingPayments) {
        await request(`/payments/${bill._id}/pay`, { method: 'POST' });
      }
      setPaymentSuccess(true);
      setAmountTendered('');
      addSystemNotification(`Successfully settled ${pendingPayments.length} bills in cash.`, 'SUCCESS');
      await fetchPatientBillingData(billingPatientDetails._id);
    } catch (err: any) {
      alert(err.message || 'Failed to settle all bills.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkPayCash = async () => {
    if (pendingPayments.length === 0 || !billingPatientDetails) return;
    setIsProcessingBulk(true);
    setPaymentSuccess(false);

    try {
      let remainingTender = parseFloat(amountTendered);
      const billsToPay: any[] = [];

      if (!isNaN(remainingTender) && remainingTender > 0) {
        for (const bill of pendingPayments) {
          if (remainingTender >= bill.amount) {
            billsToPay.push(bill);
            remainingTender -= bill.amount;
          } else {
            break;
          }
        }
      }

      if (billsToPay.length === 0) {
        alert('Amount entered is insufficient to cover the first pending bill.');
        setIsProcessingBulk(false);
        return;
      }

      for (const bill of billsToPay) {
        await request(`/payments/${bill._id}/pay`, { method: 'POST' });
      }

      setPaymentSuccess(true);
      setAmountTendered('');
      addSystemNotification(`Recorded cash for ${billsToPay.length} bill(s).`, 'SUCCESS');
      await fetchPatientBillingData(billingPatientDetails._id);
    } catch (err: any) {
      alert(err.message || 'Failed to record cash payment.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const calculatePendingTotal = () => {
    return pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculatePaidTotal = () => {
    return paidPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateGrandTotal = () => {
    return calculatePendingTotal() + calculatePaidTotal();
  };

  return (
    <div className="space-y-6">

      {/* RENDER TAB 1: BEDS MANAGEMENT MAP */}
      {activeTab === 'beds' && (
        <div className="space-y-6">
          {/* Bed stats tiles */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Beds</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalBeds}</p>
              </div>
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><BedDouble className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Available</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.available}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Reserved</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.reserved}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Clock className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Occupied</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.occupied}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Activity className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cleaning</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.cleaning}</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Sparkles className="h-6 w-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Maintenance</p>
                <p className="text-2xl font-bold text-red-650 mt-1">{stats.maintenance}</p>
              </div>
              <div className="p-3 bg-red-55 text-red-650 rounded-xl"><Wrench className="h-6 w-6" /></div>
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
                  setSelectedFloor(e.target.value);
                  setSelectedWard('');
                  setSelectedBedSet('');
                }}
                className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
                disabled={!selectedBlock}
              >
                <option value="">All Floors</option>
                {hierarchy.floors
                  ?.filter((f: any) => f.blockId?._id === selectedBlock)
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
                  setSelectedWard(e.target.value);
                  setSelectedBedSet('');
                }}
                className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
                disabled={!selectedFloor}
              >
                <option value="">All Wards</option>
                {hierarchy.wards
                  ?.filter((w: any) => w.floorId?._id === selectedFloor)
                  .map((w: any) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bed Set</label>
              <select
                value={selectedBedSet}
                onChange={(e) => setSelectedBedSet(e.target.value)}
                className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 text-sm font-semibold"
                disabled={!selectedWard}
              >
                <option value="">All Bed Sets</option>
                {hierarchy.bedSets
                  ?.filter((bs: any) => bs.wardId?._id === selectedWard)
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

          {/* Interactive Bed Grid */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-md font-bold text-slate-800 mb-4">Bed Grid Directory</h3>
            
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
                    className="bg-white border border-slate-200 hover:border-healthcare-300 p-4 rounded-xl text-left space-y-3 transition shadow-sm hover:shadow-md group flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        {bed.bedSetId?.wardId?.departmentId?.code || 'WARD'}{' '}
                        {bed.bedSetId?.wardId?.floorId?.name || ''}
                      </span>
                      <h4 className="text-sm font-black text-slate-850 group-hover:text-healthcare-600 transition">
                        {bed.bedId}
                      </h4>
                    </div>
                    
                    <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded ${getStatusStyle(bed.status)}`}>
                        {bed.status}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        {bed.bedSetId?.wardId?.gender || 'GEN'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          
        </div>
      )}

      {/* RENDER TAB 2: REGISTER PATIENT */}
      {activeTab === 'register' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-6">
            <UserPlus className="h-6 w-6 text-healthcare-600" />
            <h2 className="text-lg font-bold text-slate-800">New Patient Registration</h2>
          </div>

          <form onSubmit={handleRegisterPatient} className="space-y-6">
            {regSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}
            {regError && (
              <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2 font-semibold">
                <AlertCircle className="h-5 w-5 text-red-650 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Section 1: Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-healthcare-600"></span>
                <span>Personal Information</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. Murugan K."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Gender</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Blood Group</label>
                  <select
                    value={regBlood}
                    onChange={(e) => setRegBlood(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Marital Status</label>
                  <select
                    value={regMaritalStatus}
                    onChange={(e) => setRegMaritalStatus(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Occupation</label>
                  <input
                    type="text"
                    value={regOccupation}
                    onChange={(e) => setRegOccupation(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. Engineer, Business"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Identification */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-healthcare-600"></span>
                <span>Contact & Identification</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Primary Phone</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. 9988776655"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Alternate Phone</label>
                  <input
                    type="tel"
                    value={regAlternatePhone}
                    onChange={(e) => setRegAlternatePhone(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. 9988776656"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. murugan.k@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">ID Document Type</label>
                  <select
                    value={regIdentType}
                    onChange={(e) => setRegIdentType(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                  >
                    <option value="AADHAR">Aadhar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="VOTER_ID">Voter ID</option>
                    <option value="DRIVING_LICENSE">Driver's License</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">ID Document Number</label>
                  <input
                    type="text"
                    value={regIdentNum}
                    onChange={(e) => setRegIdentNum(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="Enter national ID number"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Residential Address</label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. 45/2, Anna Salai, T. Nagar, Chennai"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Emergency Contacts */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center space-x-1.5">
                <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
                <span>Emergency Contact Information</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={regEmergName}
                    onChange={(e) => setRegEmergName(e.target.value)}
                    className="mt-1 block w-full bg-white border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 font-semibold"
                    placeholder="Valli Murugan"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={regEmergPhone}
                    onChange={(e) => setRegEmergPhone(e.target.value)}
                    className="mt-1 block w-full bg-white border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 font-semibold"
                    placeholder="9988776600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Relationship</label>
                  <input
                    type="text"
                    required
                    value={regEmergRel}
                    onChange={(e) => setRegEmergRel(e.target.value)}
                    className="mt-1 block w-full bg-white border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 font-semibold"
                    placeholder="Spouse, Parent"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Clinical Profile & Diet */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-healthcare-600"></span>
                <span>Clinical Profile & Diet</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Food Preference</label>
                  <select
                    value={regFood}
                    onChange={(e) => setRegFood(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                  >
                    <option value="NORMAL">Normal Diet</option>
                    <option value="VEGETARIAN">Vegetarian</option>
                    <option value="NON_VEGETARIAN">Non Vegetarian</option>
                    <option value="DIABETIC">Diabetic</option>
                    <option value="CUSTOM">Custom diet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Allergies</label>
                  <input
                    type="text"
                    value={regAllergies}
                    onChange={(e) => setRegAllergies(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. Penicillin, nuts"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Ongoing Medications</label>
                  <input
                    type="text"
                    value={regOngoingMeds}
                    onChange={(e) => setRegOngoingMeds(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. Metformin, none"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Medical History Summary</label>
                  <input
                    type="text"
                    value={regHistory}
                    onChange={(e) => setRegHistory(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. Hypertension, Asthma"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Billing & Insurance */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-healthcare-600"></span>
                <span>Billing & Insurance Details</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Insurance Provider Name</label>
                  <input
                    type="text"
                    value={regInsuranceProvider}
                    onChange={(e) => setRegInsuranceProvider(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. Star Health, BlueShield"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Policy / Group ID Number</label>
                  <input
                    type="text"
                    value={regInsurancePolicy}
                    onChange={(e) => setRegInsurancePolicy(e.target.value)}
                    className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500 font-semibold"
                    placeholder="e.g. POL-9988-77"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="bg-healthcare-600 hover:bg-healthcare-550 text-white font-extrabold px-6 py-3 rounded-xl text-sm transition shadow-sm"
              >
                Register & Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RENDER TAB 3: PATIENT FLOW DESK */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Search & results */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 h-fit">
            <h2 className="text-md font-bold text-slate-800 mb-4">Patient Search</h2>
            <form onSubmit={handleSearchPatient} className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none text-sm font-semibold"
                  placeholder="Search by ID, Phone, Name"
                />
              </div>
              <button
                type="submit"
                className="bg-healthcare-600 hover:bg-healthcare-550 text-white font-bold px-4 py-2 rounded-xl text-sm transition shrink-0"
              >
                Search
              </button>
            </form>

            <div className="mt-6 divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Search results will appear here.
                </div>
              ) : (
                searchResults.map((pat) => (
                  <button
                    key={pat._id}
                    onClick={() => selectPatientForActions(pat)}
                    className={`w-full py-3 px-2 text-left hover:bg-slate-50 transition rounded-xl flex items-center justify-between border-l-4 mt-2 ${
                      selectedPatient?._id === pat._id ? 'border-healthcare-500 bg-slate-50/50' : 'border-transparent'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800">{pat.userId?.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Patient ID: {pat.patientId}</p>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{pat.gender}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel: actions */}
          <div className="lg:col-span-2 space-y-6">
            {selectedPatient ? (
              <div className="space-y-6">
                {/* Patient Summary Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{selectedPatient.userId?.name}</h2>
                      <span className="text-xs text-slate-400 font-semibold">ID: {selectedPatient.patientId} | DOB: {new Date(selectedPatient.dob).toLocaleDateString()}</span>
                    </div>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                      activeAdmission?.admissionStatus === 'OCCUPIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeAdmission?.admissionStatus === 'RESERVED'
                        ? 'bg-blue-100 text-blue-800'
                        : activeAdmission?.admissionStatus === 'RECOMMENDED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {activeAdmission?.admissionStatus === 'OCCUPIED'
                        ? 'Admitted Inpatient'
                        : activeAdmission?.admissionStatus === 'RESERVED'
                        ? 'Bed Reserved'
                        : activeAdmission?.admissionStatus === 'RECOMMENDED'
                        ? 'Stay Recommended'
                        : 'Outpatient'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Blood Group</span>
                      <p className="font-bold text-slate-700 mt-1">{selectedPatient.bloodGroup || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Allergies</span>
                      <p className="font-bold text-slate-700 mt-1">{selectedPatient.allergies || 'None listed'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Food Preference</span>
                      <p className="font-bold text-slate-700 mt-1">{selectedPatient.foodPreference}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Emerg. Contact</span>
                      <p className="font-bold text-slate-700 mt-1">
                        {selectedPatient.emergencyContact?.name} ({selectedPatient.emergencyContact?.relationship})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Action 1: Assign Doctor (Consultation Setup) */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-healthcare-600" />
                      <span>Assign Doctor / Consultation</span>
                    </h3>

                    {assignSuccess && (
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold">
                        Doctor assigned successfully. Booking fee ledger registered.
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500">Select Physician</label>
                        <select
                          value={selectedDoctor}
                          onChange={(e) => setSelectedDoctor(e.target.value)}
                          className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-healthcare-500"
                        >
                          <option value="">Select Doctor...</option>
                          {doctors.map((d: any) => (
                            <option key={d._id} value={d._id}>
                              {d.userId?.name} ({d.specialization}) - {d.departmentId?.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-500">Consultation Fee (₹)</label>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                            <Lock className="h-2.5 w-2.5 mr-0.5 inline" />
                            <span>Fixed Standard Tariff</span>
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={`₹ ${consultFee} (Fixed Standard Tariff)`}
                            readOnly
                            disabled
                            className="block w-full bg-slate-100/90 border border-slate-200 text-slate-700 font-bold rounded-xl py-2 px-3 text-xs cursor-not-allowed select-none"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Doctor consultation fee is fixed standard tariff ₹500 across all physicians.</p>
                      </div>

                      <button
                        onClick={handleAssignDoctor}
                        disabled={!selectedDoctor}
                        className="w-full bg-healthcare-600 hover:bg-healthcare-550 text-white font-bold py-2 rounded-xl text-xs transition disabled:opacity-50"
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>

                  {/* Action 2: Bed Reservation (Inpatient Admission Checkout) */}
                  {activeAdmission ? (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                          <BedDouble className="h-5 w-5 text-healthcare-600" />
                          <span>Bed Reservation & Check-In</span>
                        </h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          activeAdmission.admissionStatus === 'RECOMMENDED'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : activeAdmission.admissionStatus === 'RESERVED'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {activeAdmission.admissionStatus === 'RECOMMENDED'
                            ? 'Admission Recommended'
                            : activeAdmission.admissionStatus === 'RESERVED'
                            ? 'Bed Reserved'
                            : 'Patient Admitted'}
                        </span>
                      </div>

                      {/* Display Recommended Ward Details */}
                      {(() => {
                        const wardInfo = getWardDisplay(activeAdmission.wardId);
                        return (
                          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 font-semibold space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Prescribed Ward</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                                {wardInfo.dept}
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 font-extrabold">
                              {wardInfo.name}
                            </p>
                            {activeAdmission.doctorId?.userId?.name && (
                              <p className="text-[11px] text-slate-500 font-normal">
                                Prescribed by: <span className="font-semibold text-slate-700">{activeAdmission.doctorId.userId.name}</span>
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {allocationSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold">
                          Bed Reserved successfully! Initial stay bill paid.
                        </div>
                      )}

                      {allocationError && (
                        <div className="bg-red-50 text-red-800 border border-red-200 px-3 py-2 rounded-xl text-xs font-semibold">
                          {allocationError}
                        </div>
                      )}

                      {activeAdmission.admissionStatus === 'RECOMMENDED' ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-slate-600">
                                Choose Bed (Prescribed Ward Only)
                              </label>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {availableBedsInWard.length} Available
                              </span>
                            </div>
                            <select
                              value={selectedBedToAllocate}
                              onChange={(e) => setSelectedBedToAllocate(e.target.value)}
                              className="mt-1 block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-healthcare-500 font-medium"
                            >
                              <option value="">Select available bed...</option>
                              {availableBedsInWard.map((b: any) => (
                                <option key={b._id} value={b._id}>
                                  Bed {b.bedId} (Set: {b.bedSetId?.name || 'General'})
                                </option>
                              ))}
                            </select>
                            {availableBedsInWard.length === 0 && (
                              <p className="mt-1 text-[11px] text-amber-700 font-medium">
                                ⚠️ No beds currently AVAILABLE in this ward. Please clean or release occupied beds.
                              </p>
                            )}
                          </div>

                          <button
                            onClick={handleBedAllocation}
                            disabled={!selectedBedToAllocate || allocatingBed}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center justify-center space-x-1.5"
                          >
                            <span>{allocatingBed ? 'Securing Bed Reservation...' : 'Checkout & Reserve Bed (Deposit ₹2,000)'}</span>
                          </button>
                        </div>
                      ) : activeAdmission.admissionStatus === 'RESERVED' ? (
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                          <p className="font-bold">Bed Reserved: {activeAdmission.bedId?.bedId || 'Assigned'}</p>
                          <p className="text-[11px] text-indigo-700">Initial stay deposit confirmed. Awaiting check-in and transfer by Ward Staff.</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 space-y-1">
                          <p className="font-bold">Patient is Admitted: Bed {activeAdmission.bedId?.bedId || 'Assigned'}</p>
                          <p className="text-[11px] text-emerald-700">Admitted in {activeAdmission.wardId?.name}. Status: {activeAdmission.admissionStatus}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center text-slate-400 text-xs py-12">
                      <Info className="h-8 w-8 mb-2 text-slate-350" />
                      <p className="font-semibold max-w-xs">No active inpatient recommendations. Reserve option is disabled until recommended by a doctor.</p>
                    </div>
                  )}

                  {/* Action 3: Ward Change Request Submission */}
                  {activeAdmission && ['RECOMMENDED', 'RESERVED', 'OCCUPIED'].includes(activeAdmission.admissionStatus) && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                          <Building className="h-5 w-5 text-healthcare-600" />
                          <span>Submit Ward Change Request</span>
                        </h3>
                        <span className="text-[11px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                          Current: {getWardDisplay(activeAdmission.wardId).name}
                        </span>
                      </div>

                      {wardChangeSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold">
                          Ward change request submitted successfully. Pending doctor review.
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 items-end">
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Request Ward Change to:</label>
                          <select
                            value={selectedAdmittedWard}
                            onChange={(e) => setSelectedAdmittedWard(e.target.value)}
                            className="block w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-healthcare-500 font-semibold text-slate-800"
                          >
                            <option value="">Select target ward to transfer...</option>
                            {hierarchy.wards
                              ?.filter((w: any) => String(w._id) !== extractWardId(activeAdmission.wardId))
                              .map((w: any) => (
                                <option key={w._id} value={w._id}>
                                  {w.name} ({w.departmentId?.name || 'Inpatient Care'})
                                </option>
                              ))}
                          </select>
                        </div>
                        <button
                          onClick={handleRequestWardChange}
                          disabled={!selectedAdmittedWard}
                          className="bg-healthcare-600 hover:bg-healthcare-550 text-white font-bold py-2 px-4 rounded-xl text-xs transition disabled:opacity-50 h-10 w-full sm:w-auto shrink-0 shadow-sm"
                        >
                          Submit Request
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-slate-100 p-8 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col justify-center items-center text-center text-slate-400 py-10">
                <UserCheck className="h-12 w-12 mb-3 text-slate-300" />
                <p className="font-bold">Select a patient from the directory search panel to operate consult bookings, bed reservations, and approvals.</p>
              </div>
            )}
          </div>
        </div>

        {/* Patient Journey History Timeline - Inline Full Width */}
        {selectedPatient && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Activity className="h-5 w-5 text-healthcare-650 animate-pulse" />
                <span>Patient Journey History Timeline ({selectedPatient.userId?.name})</span>
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                Showing {Math.min(visibleTimelineCount, patientTimeline.length)} of {patientTimeline.length} events
              </span>
            </div>

            {patientTimeline.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center font-semibold">No timeline history recorded for this patient.</p>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {patientTimeline.slice(0, visibleTimelineCount).map((item: any, idx: number) => {
                    const isLast = idx === Math.min(visibleTimelineCount, patientTimeline.length) - 1;
                    return (
                      <li key={item._id}>
                        <div className="relative pb-8">
                          {!isLast && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true"></span>
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white">
                                <Clock className="h-4 w-4 text-slate-500" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-xs text-slate-800 font-bold">{item.description}</p>
                                <span className="text-[10px] text-slate-400 font-medium">By: {item.createdBy}</span>
                              </div>
                              <div className="text-right text-[10px] whitespace-nowrap text-slate-400 font-semibold">
                                {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* View More / View All buttons */}
                {visibleTimelineCount < patientTimeline.length && (
                  <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center space-x-4">
                    <button
                      onClick={() => setVisibleTimelineCount(prev => prev + 5)}
                      className="text-xs text-healthcare-605 hover:text-healthcare-700 font-extrabold flex items-center space-x-1"
                    >
                      <span>View More Events</span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => setVisibleTimelineCount(patientTimeline.length)}
                      className="text-xs text-healthcare-650 hover:text-healthcare-700 font-extrabold"
                    >
                      <span>View All Events</span>
                    </button>
                  </div>
                )}

                {/* Collapse button (if all are shown) */}
                {visibleTimelineCount >= patientTimeline.length && patientTimeline.length > 3 && (
                  <div className="mt-8 pt-4 border-t border-slate-100 flex justify-center">
                    <button
                      onClick={() => setVisibleTimelineCount(3)}
                      className="text-xs text-slate-400 hover:text-slate-650 font-extrabold"
                    >
                      <span>Show Less</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {/* RENDER TAB 4: CENTRAL CASHIER BILLING DESK */}
      {activeTab === 'billing' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
            <CreditCard className="h-6 w-6 text-healthcare-600" />
            <h2 className="text-lg font-bold text-slate-800">Hospital Checkout Cashier Desk</h2>
          </div>

          <form onSubmit={handleBillingSearch} className="flex space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={billingPatientId}
                onChange={(e) => setBillingPatientId(e.target.value)}
                className="block w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none text-sm font-semibold"
                placeholder="Search by Patient ID, Name, or Phone Number"
              />

              {/* Dropdown search suggestions for billing */}
              {billingSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl p-3 shadow-lg max-h-40 overflow-y-auto space-y-1 z-10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Multiple matching patients found:</p>
                  {billingSearchResults.map((pat) => (
                    <button
                      key={pat._id}
                      type="button"
                      onClick={() => handleSelectBillingPatient(pat)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 flex justify-between items-center transition border border-slate-105"
                    >
                      <span>{pat.userId?.name} ({pat.patientId})</span>
                      <span className="text-[10px] text-slate-450 font-medium">{pat.userId?.phone || 'No phone'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-healthcare-600 hover:bg-healthcare-550 text-white font-extrabold px-6 py-2 rounded-xl text-sm transition shrink-0"
            >
              Retrieve Ledger
            </button>
            {billingPatientDetails && (
              <button
                type="button"
                onClick={handleClearBillingPatient}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition shrink-0"
              >
                Choose Different Patient
              </button>
            )}
          </form>

          {paymentSuccess && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-3 rounded-xl text-sm font-bold flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Bill transaction payment recorded successfully!</span>
            </div>
          )}

          {!billingPatientDetails && billingHasSearched && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Search Results — Choose Patient to Open Cashier Ledger
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Found {billingSearchResults.length} patient{billingSearchResults.length === 1 ? '' : 's'} matching &ldquo;{billingPatientId}&rdquo;. Please click the patient you wish to bill:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearBillingPatient}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Clear Search
                </button>
              </div>

              {billingSearchResults.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No matching patients found. Please verify the Patient ID or Name.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {billingSearchResults.map((pat) => (
                    <div
                      key={pat._id}
                      className="p-4 bg-white border-2 border-slate-200 hover:border-healthcare-400 rounded-xl transition shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-slate-900 text-sm">{pat.userId?.name}</span>
                            <span className="text-[10px] font-extrabold text-healthcare-700 bg-healthcare-50 border border-healthcare-200 px-1.5 py-0.5 rounded">
                              {pat.patientId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {pat.gender} • Phone: {pat.userId?.phone || 'N/A'} • DOB: {new Date(pat.dob).toLocaleDateString()}
                          </p>
                        </div>
                        {pat.currentAdmissionId ? (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            {pat.currentAdmissionId.bedId?.bedId || pat.currentAdmissionId.wardId?.name || 'Inpatient'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Outpatient
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSelectBillingPatient(pat)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs transition active:scale-95 flex items-center space-x-1"
                        >
                          <span>Select Patient & Retrieve Ledger →</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {billingPatientDetails ? (
            <div className="space-y-6">
              {/* 3-Stat Financial Overview Card (Total Billed, Total Paid, Balance Due) */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-lg text-slate-900">{billingPatientDetails.userId?.name}</h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        ID: {billingPatientDetails.patientId}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5">
                      Phone: {billingPatientDetails.userId?.phone || 'N/A'} • DOB: {new Date(billingPatientDetails.dob).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-bold">
                      Ledger Items: <span className="text-slate-900 font-black">{pendingPayments.length + paidPayments.length} total</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Total Incurred */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Total Billed Charges
                    </span>
                    <span className="text-xl font-black text-slate-800 mt-1 block">
                      ₹{calculateGrandTotal().toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      All generated hospital services
                    </span>
                  </div>

                  {/* Total Paid So Far */}
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                        Total Paid to Date
                      </span>
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        {paidPayments.length} paid
                      </span>
                    </div>
                    <span className="text-xl font-black text-emerald-800 mt-1 block">
                      ₹{calculatePaidTotal().toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Cleared & recorded receipts
                    </span>
                  </div>

                  {/* Outstanding Balance */}
                  <div className="bg-amber-50/70 border border-amber-300 p-3.5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                        Outstanding Balance Due
                      </span>
                      <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                        {pendingPayments.length} pending
                      </span>
                    </div>
                    <span className="text-2xl font-black text-amber-900 mt-1 block">
                      ₹{calculatePendingTotal().toLocaleString()}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold">
                      {calculatePendingTotal() === 0 ? '✓ Fully Cleared' : 'Requires cashier settlement'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending bills list */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-850">Itemized Pending Ledger</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Click Record Cash on individual items or use the bottom desk to settle at once.</p>
                  </div>
                  {pendingPayments.length > 0 && (
                    <button
                      type="button"
                      onClick={handlePayAll}
                      disabled={isProcessingBulk}
                      className="bg-emerald-600 hover:bg-emerald-550 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition shadow-sm flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Settle All ({pendingPayments.length})</span>
                    </button>
                  )}
                </div>
                
                {pendingPayments.length === 0 ? (
                  <div className="bg-slate-50 text-center py-10 text-sm text-slate-400 font-semibold rounded-2xl border border-slate-100">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
                    <p className="font-bold text-slate-700">All accounts paid! No pending charges.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="min-w-full divide-y divide-slate-200 text-xs font-semibold">
                      <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-5 py-3 text-left">Service Type</th>
                          <th className="px-5 py-3 text-left">Description</th>
                          <th className="px-5 py-3 text-left">Generated Date</th>
                          <th className="px-5 py-3 text-right">Amount (₹)</th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                        {pendingPayments.map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase">
                                {p.serviceType}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-slate-850 text-xs">{p.description}</p>
                              <span className="text-[10px] text-slate-400">Ref: #{p._id.substring(p._id.length - 6)}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 text-xs">
                              {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3.5 text-right text-slate-900 font-black text-sm">
                              ₹{p.amount.toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <button
                                onClick={() => handlePayBill(p._id)}
                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm inline-flex items-center space-x-1.5"
                                title="Record cash payment for this item"
                              >
                                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>Record Cash</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick Cash Tender & Bulk Settlement Desk at bottom */}
              {pendingPayments.length > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white">Cash Tender & Quick Settlement Desk</h4>
                        <p className="text-[11px] text-slate-400">Enter cash amount handed by patient to calculate change and settle accounts.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Due</span>
                      <span className="text-xl font-black text-emerald-400">₹{calculatePendingTotal().toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* 1. Cash Tender Input */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-300">
                        Enter Amount Paid by Patient (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value)}
                          placeholder={`e.g. ${calculatePendingTotal()}`}
                          className="w-full pl-8 pr-4 py-2.5 bg-slate-800/80 border border-slate-600 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                        />
                      </div>
                      {/* Quick Amount Buttons */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setAmountTendered(calculatePendingTotal().toString())}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold transition"
                        >
                          Exact (₹{calculatePendingTotal()})
                        </button>
                        {[500, 1000, 2000, 5000].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAmountTendered(val.toString())}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-medium transition"
                          >
                            ₹{val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Change / Balance Calculator */}
                    <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Amount Handed:</span>
                        <span className="font-bold text-white">
                          ₹{amountTendered ? Number(amountTendered).toLocaleString() : '0'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Total Balance Due:</span>
                        <span className="font-bold text-amber-400">
                          ₹{calculatePendingTotal().toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-slate-700">
                        <span className="text-slate-300">
                          {Number(amountTendered || 0) >= calculatePendingTotal() ? 'Change to Return:' : 'Remaining Due:'}
                        </span>
                        <span className={`font-black text-sm ${
                          Number(amountTendered || 0) >= calculatePendingTotal()
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}>
                          ₹{Math.abs(Number(amountTendered || 0) - calculatePendingTotal()).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* 3. Action Buttons */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handlePayAll}
                        disabled={isProcessingBulk || pendingPayments.length === 0}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-emerald-500/20 active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>
                          {isProcessingBulk
                            ? 'Processing Settle...'
                            : `Settle All (${pendingPayments.length} Bills • ₹${calculatePendingTotal().toLocaleString()})`}
                        </span>
                      </button>

                      {Number(amountTendered || 0) > 0 && Number(amountTendered || 0) < calculatePendingTotal() && (
                        <button
                          type="button"
                          onClick={handleBulkPayCash}
                          disabled={isProcessingBulk}
                          className="w-full bg-healthcare-600 hover:bg-healthcare-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition active:scale-98 disabled:opacity-50"
                        >
                          Settle Partial (₹{Number(amountTendered).toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment History Log Section */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-850">Payment History & Cleared Receipts Log</h4>
                      <p className="text-[11px] text-slate-400">All previous cleared transactions and payments recorded for this patient.</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {paidPayments.length} Cleared Payment{paidPayments.length === 1 ? '' : 's'}
                  </span>
                </div>

                {paidPayments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">
                    No completed payment transactions recorded yet for this patient.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl text-xs font-semibold">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-5 py-3 text-left">Service Type</th>
                          <th className="px-5 py-3 text-left">Description</th>
                          <th className="px-5 py-3 text-left">Date & Time Cleared</th>
                          <th className="px-5 py-3 text-right">Amount Paid (₹)</th>
                          <th className="px-5 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200 text-slate-700 font-semibold">
                        {paidPayments.map((paid) => (
                          <tr key={paid._id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase">
                                {paid.serviceType}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-slate-800 text-xs">{paid.description}</p>
                              <span className="text-[10px] text-slate-400">Ref: #{paid._id.substring(paid._id.length - 6)}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs">
                              {new Date(paid.updatedAt || paid.createdAt).toLocaleDateString()} {new Date(paid.updatedAt || paid.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-sm">
                              ₹{paid.amount.toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-lg inline-flex items-center space-x-1">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>PAID (CASH)</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-250 flex flex-col justify-center items-center text-center text-slate-400 text-xs py-12">
              <DollarSign className="h-8 w-8 mb-2 text-slate-350" />
              <p className="font-semibold max-w-xs">Search for a patient using their ID to collect payments.</p>
            </div>
          )}
        </div>
      )}

      {/* Bed Detail Card Modal */}
      {selectedBedDetails && (
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
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
                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded ${getStatusStyle(selectedBedDetails.bed.status)}`}>
                    {selectedBedDetails.bed.status}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                    {selectedBedDetails.bed.bedSetId?.wardId?.departmentId?.name || 'Department'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Bed ID: {selectedBedDetails.bed.bedId}</h3>
                <p className="text-xs text-slate-505">
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
                    <AlertCircle className="h-4.5 w-4.5 text-rose-600" />
                    <h4 className="font-extrabold uppercase text-[10px] tracking-wider">Maintenance Details</h4>
                  </div>
                  <p className="text-slate-605">{selectedBedDetails.bed.maintenanceReason || 'Routine equipment safety check.'}</p>
                </div>
              ) : selectedBedDetails.bed.status === 'CLEANING' ? (
                <div className="p-4 bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl text-xs space-y-1.5 font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-amber-600" />
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
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Status Transition Panel
                  </label>
                  <p className="text-[10px] text-slate-550 font-medium">Change capacity state of this clinical asset.</p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {selectedBedDetails.bed.status === 'AVAILABLE' && (
                    <button
                      onClick={() => handleManualBedStatusUpdate(selectedBedDetails.bed._id, 'MAINTENANCE', 'Equipment upgrade check')}
                      className="bg-rose-605 hover:bg-rose-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Put in Maintenance
                    </button>
                  )}
                  {selectedBedDetails.bed.status === 'MAINTENANCE' && (
                    <button
                      onClick={() => handleManualBedStatusUpdate(selectedBedDetails.bed._id, 'AVAILABLE')}
                      className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Make Available
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedBedDetails(null)}
                    className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-extrabold border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-250'
              : 'bg-indigo-50 text-indigo-850 border-indigo-250'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-650 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionDashboard;
