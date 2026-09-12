import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { request } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Users,
  FileText,
  Plus,
  BedDouble,
  AlertTriangle,
  Stethoscope,
  Activity,
  Heart,
  Calendar,
  ClipboardList,
  Lock,
  Pill,
  CheckCircle2,
  Search,
  Trash2,
  Pencil,
  RefreshCw,
} from 'lucide-react';

const PREDEFINED_DIAGNOSTIC_TESTS = [
  { name: 'Complete Blood Count (CBC)', category: 'Pathology / Blood', cost: 350 },
  { name: 'Lipid Profile', category: 'Pathology / Blood', cost: 650 },
  { name: 'Liver Function Test (LFT)', category: 'Pathology / Blood', cost: 750 },
  { name: 'Kidney Function Test (KFT / RFT)', category: 'Pathology / Blood', cost: 700 },
  { name: 'Blood Sugar Fasting & PP', category: 'Pathology / Blood', cost: 200 },
  { name: 'Thyroid Profile (T3, T4, TSH)', category: 'Pathology / Blood', cost: 550 },
  { name: 'ECG (Electrocardiogram)', category: 'Cardiology', cost: 400 },
  { name: 'Echocardiogram (2D Echo)', category: 'Cardiology', cost: 2200 },
  { name: 'X-Ray Chest (PA View)', category: 'Radiology', cost: 500 },
  { name: 'X-Ray Bone / Extremity', category: 'Radiology', cost: 450 },
  { name: 'Ultrasound Abdomen & Pelvis', category: 'Radiology', cost: 1200 },
  { name: 'CT Scan Chest', category: 'Radiology', cost: 2500 },
  { name: 'CT Scan Brain / Head', category: 'Radiology', cost: 2800 },
  { name: 'MRI Brain', category: 'Radiology', cost: 4500 },
  { name: 'MRI Spine (Lumbar / Cervical)', category: 'Radiology', cost: 5000 },
];

export const TIMING_SCHEDULES = [
  { label: '1-0-1 (Morning & Night - After Food)', timesPerDay: 2, code: '1-0-1' },
  { label: '1-1-1 (Morning, Afternoon & Night - After Food)', timesPerDay: 3, code: '1-1-1' },
  { label: '1-0-0 (Morning only - Before Breakfast)', timesPerDay: 1, code: '1-0-0' },
  { label: '0-1-0 (Afternoon only - After Lunch)', timesPerDay: 1, code: '0-1-0' },
  { label: '0-0-1 (Night only - After Dinner / Bedtime)', timesPerDay: 1, code: '0-0-1' },
  { label: '1-0-1 (Before Food)', timesPerDay: 2, code: '1-0-1 BF' },
  { label: 'SOS / When Needed (Max 2/day)', timesPerDay: 1, code: 'SOS' },
  { label: 'Every 6 Hours (4 times/day)', timesPerDay: 4, code: 'QDS' },
];

export const HOSPITAL_MEDICINES_CATALOG = [
  { id: 'MED-001', name: 'Paracetamol 650mg (Dolo 650)', generic: 'Paracetamol', category: 'Antipyretic / Pain', form: 'Tablet', unitPrice: 3.5, defaultDays: 3, defaultTiming: '1-0-1 (Morning & Night - After Food)', timesPerDay: 2, defaultDosage: 1 },
  { id: 'MED-002', name: 'Amoxicillin + Clavulanate 625mg (Augmentin)', generic: 'Amoxicillin / Clav', category: 'Antibiotic', form: 'Tablet', unitPrice: 22.0, defaultDays: 5, defaultTiming: '1-0-1 (Morning & Night - After Food)', timesPerDay: 2, defaultDosage: 1 },
  { id: 'MED-003', name: 'Pantoprazole 40mg (Pan 40)', generic: 'Pantoprazole', category: 'Antacid / PPI', form: 'Tablet', unitPrice: 9.5, defaultDays: 7, defaultTiming: '1-0-0 (Morning only - Before Breakfast)', timesPerDay: 1, defaultDosage: 1 },
  { id: 'MED-004', name: 'Azithromycin 500mg (Azee 500)', generic: 'Azithromycin', category: 'Antibiotic', form: 'Tablet', unitPrice: 24.0, defaultDays: 3, defaultTiming: '1-0-0 (Morning only - Before Breakfast)', timesPerDay: 1, defaultDosage: 1 },
  { id: 'MED-005', name: 'Cetirizine 10mg (Cetzine)', generic: 'Cetirizine', category: 'Antihistamine / Allergy', form: 'Tablet', unitPrice: 4.0, defaultDays: 5, defaultTiming: '0-0-1 (Night only - After Dinner / Bedtime)', timesPerDay: 1, defaultDosage: 1 },
  { id: 'MED-006', name: 'Metformin 500mg (Glycomet 500)', generic: 'Metformin HCl', category: 'Antidiabetic', form: 'Tablet', unitPrice: 3.2, defaultDays: 30, defaultTiming: '1-0-1 (Morning & Night - After Food)', timesPerDay: 2, defaultDosage: 1 },
  { id: 'MED-007', name: 'Atorvastatin 20mg (Atorva 20)', generic: 'Atorvastatin', category: 'Lipid Lowering / Cardiac', form: 'Tablet', unitPrice: 14.5, defaultDays: 30, defaultTiming: '0-0-1 (Night only - After Dinner / Bedtime)', timesPerDay: 1, defaultDosage: 1 },
  { id: 'MED-008', name: 'Telmisartan 40mg (Telma 40)', generic: 'Telmisartan', category: 'Antihypertensive', form: 'Tablet', unitPrice: 11.0, defaultDays: 30, defaultTiming: '1-0-0 (Morning only - Before Breakfast)', timesPerDay: 1, defaultDosage: 1 },
  { id: 'MED-009', name: 'Ibuprofen 400mg (Brufen 400)', generic: 'Ibuprofen', category: 'NSAID / Pain Relief', form: 'Tablet', unitPrice: 2.8, defaultDays: 3, defaultTiming: '1-0-1 (Morning & Night - After Food)', timesPerDay: 2, defaultDosage: 1 },
  { id: 'MED-010', name: 'Ciprofloxacin 500mg (Ciplox 500)', generic: 'Ciprofloxacin', category: 'Antibiotic', form: 'Tablet', unitPrice: 8.5, defaultDays: 5, defaultTiming: '1-0-1 (Morning & Night - After Food)', timesPerDay: 2, defaultDosage: 1 },
  { id: 'MED-011', name: 'Ondansetron 4mg (Emeset 4)', generic: 'Ondansetron', category: 'Antiemetic / Nausea', form: 'Tablet', unitPrice: 6.5, defaultDays: 3, defaultTiming: '1-0-1 (Before Food)', timesPerDay: 2, defaultDosage: 1 },
  { id: 'MED-012', name: 'Montelukast + Levocetirizine (Montair LC)', generic: 'Montelukast / Levocetirizine', category: 'Anti-allergy / Respiratory', form: 'Tablet', unitPrice: 18.0, defaultDays: 10, defaultTiming: '0-0-1 (Night only - After Dinner / Bedtime)', timesPerDay: 1, defaultDosage: 1 },
  { id: 'MED-013', name: 'Multivitamin + Zinc (Becosules Z)', generic: 'B-Complex + Zinc', category: 'Vitamins / Supplements', form: 'Capsule', unitPrice: 5.0, defaultDays: 15, defaultTiming: '0-1-0 (Afternoon only - After Lunch)', timesPerDay: 1, defaultDosage: 1 },
  { id: 'MED-014', name: 'Diclofenac + Paracetamol (Voveran Plus)', generic: 'Diclofenac / Paracetamol', category: 'Analgesic', form: 'Tablet', unitPrice: 7.2, defaultDays: 3, defaultTiming: '1-0-1 (Morning & Night - After Food)', timesPerDay: 2, defaultDosage: 1 },
  { id: 'MED-015', name: 'Metronidazole 400mg (Flagyl 400)', generic: 'Metronidazole', category: 'Antibacterial / Amoebicide', form: 'Tablet', unitPrice: 4.5, defaultDays: 5, defaultTiming: '1-1-1 (Morning, Afternoon, Night - After Food)', timesPerDay: 3, defaultDosage: 1 },
  { id: 'MED-016', name: 'Tramadol 50mg (Ultracet)', generic: 'Tramadol', category: 'Severe Analgesic', form: 'Tablet', unitPrice: 16.0, defaultDays: 3, defaultTiming: 'SOS / When Needed (Max 2/day)', timesPerDay: 1, defaultDosage: 1 },
];

export interface IPrescriptionItem {
  id: string;
  name: string;
  generic?: string;
  category?: string;
  form?: string;
  unitPrice: number;
  days: number;
  timing: string;
  timesPerDay: number;
  tabletsPerTime: number;
  quantity: number;
  rowTotal: number;
  searchTerm: string;
  isSearchOpen: boolean;
}

const createDefaultMedItem = (): IPrescriptionItem => ({
  id: Math.random().toString(36).substring(2, 9),
  name: '',
  generic: '',
  category: '',
  form: 'Tablet',
  unitPrice: 0,
  days: 5,
  timing: '1-0-1 (Morning & Night - After Food)',
  timesPerDay: 2,
  tabletsPerTime: 1,
  quantity: 10,
  rowTotal: 0,
  searchTerm: '',
  isSearchOpen: false,
});

const recalculateRow = (item: Partial<IPrescriptionItem>): IPrescriptionItem => {
  const days = Math.max(1, Number(item.days) || 1);
  const timesPerDay = Math.max(1, Number(item.timesPerDay) || 1);
  const tabletsPerTime = Math.max(0.5, Number(item.tabletsPerTime) || 1);
  const unitPrice = Number(item.unitPrice) || 0;
  
  const quantity = Math.ceil(days * timesPerDay * tabletsPerTime);
  const rowTotal = Math.round(quantity * unitPrice * 100) / 100;

  return {
    id: item.id || Math.random().toString(36).substring(2, 9),
    name: item.name || '',
    generic: item.generic || '',
    category: item.category || '',
    form: item.form || 'Tablet',
    unitPrice,
    days,
    timing: item.timing || '1-0-1 (Morning & Night - After Food)',
    timesPerDay,
    tabletsPerTime,
    quantity,
    rowTotal,
    searchTerm: item.searchTerm !== undefined ? item.searchTerm : (item.name || ''),
    isSearchOpen: Boolean(item.isSearchOpen),
  };
};

const formatDoctorName = (name?: string) => {
  if (!name) return 'Doctor';
  const trimmed = name.trim();
  return trimmed.toLowerCase().startsWith('dr.') ? trimmed : `Dr. ${trimmed}`;
};

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, addSystemNotification } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'admissions' | 'ward-changes'>('queue');
  const [doctorProfile, setDoctorProfile] = useState<any | null>(null);

  // Sync active subtab with current route URL
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/admissions') || p.includes('/inpatients')) {
      setActiveSubTab('admissions');
    } else if (p.includes('/ward-changes')) {
      setActiveSubTab('ward-changes');
    } else {
      setActiveSubTab('queue');
    }
  }, [location.pathname]);

  // Lists
  const [patientQueue, setPatientQueue] = useState<any[]>([]);
  const [inpatients, setInpatients] = useState<any[]>([]);
  const [wardChangeRequests, setWardChangeRequests] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [wardsList, setWardsList] = useState<any[]>([]);

  // Selected Patient & Vitals
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<any | null>(null);
  const [activeConsultation, setActiveConsultation] = useState<any | null>(null);
  const [patientTimeline, setPatientTimeline] = useState<any[]>([]);
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(3);

  // Patient live records (History & statuses)
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [patientReferrals, setPatientReferrals] = useState<any[]>([]);
  const [patientAdmissions, setPatientAdmissions] = useState<any[]>([]);
  const [patientDiagnostics, setPatientDiagnostics] = useState<any[]>([]);

  // Consultation notes
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Referral / Edit
  const [referredDoctorId, setReferredDoctorId] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [editingReferralId, setEditingReferralId] = useState<string | null>(null);

  // Diagnostics Prescribe / Edit
  const [selectedPredefinedTest, setSelectedPredefinedTest] = useState('');
  const [testType, setTestType] = useState('');
  const [testPriority, setTestPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [testCost, setTestCost] = useState(350);
  const [testSuccess, setTestSuccess] = useState(false);
  const [editingDiagId, setEditingDiagId] = useState<string | null>(null);



  // Prescribe medicines / Edit
  const [medsList, setMedsList] = useState<IPrescriptionItem[]>([createDefaultMedItem()]);
  const [prescribeSuccess, setPrescribeSuccess] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);

  // Admission recommendation
  const [recommendedWardId, setRecommendedWardId] = useState('');
  const [admissionSuccess, setAdmissionSuccess] = useState(false);

  // Emergency Alert
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencySuccess, setEmergencySuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Fetch doctor profile first
    request(`/doctors/${user.userId}`).then((doc) => {
      setDoctorProfile(doc);
      fetchDoctorQueue(doc._id);
      fetchInpatients(doc._id);
      fetchWardChangeRequests(doc._id);
      fetchWards();
      fetchDoctors(doc._id);
    }).catch((err) => {
      console.error('Failed to fetch doctor profile:', err);
      fetchDoctors();
      fetchWards();
    });
  }, [user]);

  // Keep doctors list populated whenever doctorProfile is known
  useEffect(() => {
    if (doctorProfile?._id) {
      fetchDoctors(doctorProfile._id);
    }
  }, [doctorProfile?._id]);

  const selectedPatientRecordRef = useRef<any>(null);
  useEffect(() => {
    selectedPatientRecordRef.current = selectedPatientRecord;
  }, [selectedPatientRecord]);

  useEffect(() => {
    if (!socket || !doctorProfile) return;

    const handleDoctorAssigned = () => {
      fetchDoctorQueue(doctorProfile._id);
    };

    const handleDoctorReferred = (data?: any) => {
      fetchDoctorQueue(doctorProfile._id);
      if (selectedPatientRecordRef.current?._id) {
        if (!data?.patientId || data.patientId === selectedPatientRecordRef.current._id) {
          fetchPatientRecords(selectedPatientRecordRef.current._id);
        }
      }
    };

    const handlePatientStatus = (data?: any) => {
      fetchDoctorQueue(doctorProfile._id);
      if (selectedPatientRecordRef.current?._id) {
        if (!data?.patientId || data.patientId === selectedPatientRecordRef.current._id) {
          fetchPatientRecords(selectedPatientRecordRef.current._id);
        }
      }
    };

    const handleAdmissionUpdated = () => {
      fetchInpatients(doctorProfile._id);
      if (selectedPatientRecordRef.current?._id) {
        fetchPatientRecords(selectedPatientRecordRef.current._id);
      }
    };

    socket.on('doctor:assigned', handleDoctorAssigned);
    socket.on('doctor:referred', handleDoctorReferred);
    socket.on('patient:status', handlePatientStatus);
    socket.on('admission:updated', handleAdmissionUpdated);

    return () => {
      socket.off('doctor:assigned', handleDoctorAssigned);
      socket.off('doctor:referred', handleDoctorReferred);
      socket.off('patient:status', handlePatientStatus);
      socket.off('admission:updated', handleAdmissionUpdated);
    };
  }, [socket, doctorProfile]);

  const fetchDoctorQueue = async (docId: string) => {
    try {
      const res = await request(`/consultations/doctor/${docId}`);
      setPatientQueue(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInpatients = async (currentDocId?: string) => {
    try {
      const res = await request('/admissions/active');
      const docId = currentDocId || doctorProfile?._id;
      if (docId) {
        setInpatients(res.filter((adm: any) => adm.doctorId?._id === docId && adm.admissionStatus !== 'DISCHARGED'));
      } else {
        setInpatients(res.filter((adm: any) => adm.admissionStatus !== 'DISCHARGED'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWardChangeRequests = async (currentDocId?: string) => {
    try {
      const res = await request('/admissions/ward-change-requests');
      const docId = currentDocId || doctorProfile?._id;
      if (docId) {
        setWardChangeRequests(res.filter((req: any) => req.requestedByDoctorId?._id === docId));
      } else {
        setWardChangeRequests(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWards = async () => {
    try {
      const res = await request('/beds/hierarchy');
      setWardsList(res.wards || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctors = async (currentDocId?: string) => {
    try {
      const res = await request('/doctors');
      const activeDocId = currentDocId || doctorProfile?._id;
      if (Array.isArray(res)) {
        setDoctorsList(activeDocId ? res.filter((d: any) => d._id !== activeDocId) : res);
      }
    } catch (err) {
      console.error('Failed to fetch doctors list:', err);
    }
  };

  const fetchPatientRecords = async (patientId: string) => {
    try {
      const [tl, rx, refs, adms, diags] = await Promise.all([
        request(`/patients/${patientId}/timeline`).catch(() => []),
        request(`/prescriptions/patient/${patientId}`).catch(() => []),
        request(`/referrals/patient/${patientId}`).catch(() => []),
        request(`/admissions/patient/${patientId}`).catch(() => []),
        request(`/diagnostics/patient/${patientId}`).catch(() => []),
      ]);
      setPatientTimeline(Array.isArray(tl) ? tl : []);
      setPatientPrescriptions(Array.isArray(rx) ? rx : []);
      setPatientReferrals(Array.isArray(refs) ? refs : []);
      setPatientAdmissions(Array.isArray(adms) ? adms : []);
      setPatientDiagnostics(Array.isArray(diags) ? diags : []);
    } catch (err) {
      console.error('Failed to fetch patient records:', err);
    }
  };

  const handleSelectPredefinedTest = (val: string) => {
    setSelectedPredefinedTest(val);
    if (val === 'CUSTOM') {
      setTestType('');
      setTestCost(1000);
    } else {
      const found = PREDEFINED_DIAGNOSTIC_TESTS.find(t => t.name === val);
      if (found) {
        setTestType(found.name);
        setTestCost(found.cost);
      } else {
        setTestType('');
        setTestCost(350);
      }
    }
  };

  const getAdmissionStatusBadge = (status: string) => {
    switch (status) {
      case 'RECOMMENDED':
        return {
          label: 'Admission Recommended',
          sub: 'Awaiting bed allocation & fee processing at Reception',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'RESERVED':
        return {
          label: 'Bed Reserved',
          sub: 'Payment confirmed. Awaiting transfer & check-in by Ward Staff',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      case 'OCCUPIED':
        return {
          label: 'Admitted & Occupied',
          sub: 'Patient actively admitted in inpatient ward bed',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'DISCHARGE_RECOMMENDED':
        return {
          label: 'Discharge Recommended',
          sub: 'Discharge recommended by doctor; awaiting staff confirmation',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-300'
        };
      case 'DISCHARGED':
        return {
          label: 'Discharged',
          sub: 'Inpatient care completed and patient discharged',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
        };
      default:
        return {
          label: status || 'Unknown',
          sub: '',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
        };
    }
  };

  const selectPatient = async (consultation: any) => {
    setActiveConsultation(consultation);
    setSelectedPatientRecord(consultation.patientId);
    setClinicalNotes(consultation.clinicalNotes || '');
    setReferralSuccess(false);
    setTestSuccess(false);
    setPrescribeSuccess(false);
    setAdmissionSuccess(false);
    setEmergencySuccess(false);
    setEmergencyReason('');
    setVisibleTimelineCount(3);
    setSelectedPredefinedTest('');
    setTestType('');
    setTestCost(350);
    setEditingDiagId(null);
    setEditingReferralId(null);
    setEditingPrescriptionId(null);
    setRecommendedWardId('');
    setMedsList([createDefaultMedItem()]);

    if (doctorsList.length === 0) {
      fetchDoctors(doctorProfile?._id);
    }

    if (consultation.patientId?._id) {
      fetchPatientRecords(consultation.patientId._id);
    }
  };

  const updateQueueStatus = async (status: string) => {
    if (!activeConsultation) return;
    try {
      const res = await request(`/consultations/${activeConsultation._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, clinicalNotes })
      });
      setActiveConsultation(res.consultation);
      if (doctorProfile) fetchDoctorQueue(doctorProfile._id);
      
      // Refresh timeline & patient records
      if (selectedPatientRecord?._id) {
        fetchPatientRecords(selectedPatientRecord._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteConsultation = async () => {
    await updateQueueStatus('COMPLETED');
  };

  // Refer doctor (Create or Update)
  const handleReferDoctor = async () => {
    if (!referredDoctorId || !doctorProfile || !selectedPatientRecord) return;
    try {
      if (editingReferralId) {
        await request(`/referrals/${editingReferralId}`, {
          method: 'PUT',
          body: JSON.stringify({
            toDoctorId: referredDoctorId,
            notes: referralNotes,
          }),
        });
        addSystemNotification('Specialist referral updated successfully.', 'SUCCESS');
        setEditingReferralId(null);
      } else {
        // Prevent duplicate pending referral to the same doctor
        const existing = patientReferrals.find(
          (r) => (r.toDoctorId?._id === referredDoctorId || r.toDoctorId === referredDoctorId) && r.status === 'PENDING'
        );
        if (existing) {
          if (window.confirm('A pending referral to this specialist doctor already exists. Would you like to edit it instead of creating a duplicate?')) {
            handleStartEditReferral(existing);
            return;
          }
        }

        await request('/referrals', {
          method: 'POST',
          body: JSON.stringify({
            patientId: selectedPatientRecord._id,
            fromDoctorId: doctorProfile._id,
            toDoctorId: referredDoctorId,
            referringDoctorId: doctorProfile._id,
            referredDoctorId,
            notes: referralNotes,
          }),
        });
        addSystemNotification('Specialist referral created successfully.', 'SUCCESS');
      }

      setReferralSuccess(true);
      setReferralNotes('');
      setReferredDoctorId('');
      fetchPatientRecords(selectedPatientRecord._id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit referral.');
    }
  };

  const handleStartEditReferral = (ref: any) => {
    setEditingReferralId(ref._id);
    setReferredDoctorId(ref.toDoctorId?._id || ref.toDoctorId || '');
    setReferralNotes(ref.notes || '');
  };

  const handleCancelEditReferral = () => {
    setEditingReferralId(null);
    setReferredDoctorId('');
    setReferralNotes('');
  };

  const handleDeleteReferral = async (refId: string) => {
    if (!window.confirm('Are you sure you want to cancel this specialist referral?')) return;
    try {
      await request(`/referrals/${refId}`, { method: 'DELETE' });
      addSystemNotification('Specialist referral cancelled.', 'INFO');
      if (editingReferralId === refId) {
        handleCancelEditReferral();
      }
      if (selectedPatientRecord?._id) {
        fetchPatientRecords(selectedPatientRecord._id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to cancel referral.');
    }
  };

  // Prescribe / Update diagnostic scan
  const handlePrescribeDiagnostic = async () => {
    if (!testType || !doctorProfile || !selectedPatientRecord) return;
    try {
      if (editingDiagId) {
        await request(`/diagnostics/${editingDiagId}`, {
          method: 'PUT',
          body: JSON.stringify({
            testType,
            priority: testPriority,
            cost: testCost,
          }),
        });
        addSystemNotification('Diagnostic order updated successfully.', 'SUCCESS');
        setEditingDiagId(null);
      } else {
        // Prevent duplicate test order if already requested
        const existing = patientDiagnostics.find(
          (d) => d.testType.toLowerCase() === testType.toLowerCase() && d.status === 'REQUESTED'
        );
        if (existing) {
          if (window.confirm(`An order for "${testType}" is already pending. Would you like to edit that order instead of duplicating it?`)) {
            handleStartEditDiagnostic(existing);
            return;
          }
        }

        await request('/diagnostics/request', {
          method: 'POST',
          body: JSON.stringify({
            patientId: selectedPatientRecord._id,
            doctorId: doctorProfile._id,
            testType,
            priority: testPriority,
            cost: testCost,
          }),
        });
        addSystemNotification('Diagnostic test requested successfully.', 'SUCCESS');
      }

      setTestSuccess(true);
      setTestType('');
      setSelectedPredefinedTest('');
      fetchPatientRecords(selectedPatientRecord._id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save diagnostic request.');
    }
  };

  const handleStartEditDiagnostic = (diag: any) => {
    setEditingDiagId(diag._id);
    setTestType(diag.testType);
    const foundPredef = PREDEFINED_DIAGNOSTIC_TESTS.find((p) => p.name === diag.testType);
    if (foundPredef) {
      setSelectedPredefinedTest(diag.testType);
    } else {
      setSelectedPredefinedTest('CUSTOM');
    }
    setTestPriority(diag.priority || 'ROUTINE');
    setTestCost(diag.cost || 350);
  };

  const handleCancelEditDiagnostic = () => {
    setEditingDiagId(null);
    setTestType('');
    setSelectedPredefinedTest('');
    setTestPriority('ROUTINE');
    setTestCost(350);
  };

  const handleDeleteDiagnostic = async (diagId: string) => {
    if (!window.confirm('Are you sure you want to cancel this diagnostic test order?')) return;
    try {
      await request(`/diagnostics/${diagId}`, { method: 'DELETE' });
      addSystemNotification('Diagnostic test cancelled.', 'INFO');
      if (editingDiagId === diagId) {
        handleCancelEditDiagnostic();
      }
      if (selectedPatientRecord?._id) {
        fetchPatientRecords(selectedPatientRecord._id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to cancel diagnostic test.');
    }
  };

  // Prescribe medicines handlers
  const addMedInput = () => {
    setMedsList((prev) => [...prev, createDefaultMedItem()]);
  };

  const removeMedInput = (index: number) => {
    setMedsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectCatalogMed = (index: number, medCatalogItem: typeof HOSPITAL_MEDICINES_CATALOG[0]) => {
    setMedsList((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const days = current.days || medCatalogItem.defaultDays || 5;
      const timing = current.timing || medCatalogItem.defaultTiming;
      const timesPerDay = medCatalogItem.timesPerDay || current.timesPerDay || 2;
      const tabletsPerTime = current.tabletsPerTime || medCatalogItem.defaultDosage || 1;
      const unitPrice = medCatalogItem.unitPrice;

      updated[index] = recalculateRow({
        ...current,
        name: medCatalogItem.name,
        generic: medCatalogItem.generic,
        category: medCatalogItem.category,
        form: medCatalogItem.form,
        unitPrice,
        days,
        timing,
        timesPerDay,
        tabletsPerTime,
        searchTerm: medCatalogItem.name,
        isSearchOpen: false,
      });
      return updated;
    });
  };

  const handleMedFieldChange = (index: number, field: keyof IPrescriptionItem, val: any) => {
    setMedsList((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === 'timing') {
        const schedule = TIMING_SCHEDULES.find((s) => s.label === val);
        const timesPerDay = schedule ? schedule.timesPerDay : current.timesPerDay;
        updated[index] = recalculateRow({
          ...current,
          timing: val,
          timesPerDay,
        });
      } else if (field === 'days') {
        updated[index] = recalculateRow({
          ...current,
          days: Number(val),
        });
      } else if (field === 'tabletsPerTime') {
        updated[index] = recalculateRow({
          ...current,
          tabletsPerTime: Number(val),
        });
      } else if (field === 'searchTerm') {
        updated[index] = {
          ...current,
          searchTerm: val,
          isSearchOpen: true,
        };
      } else {
        updated[index] = recalculateRow({
          ...current,
          [field]: val,
        });
      }

      return updated;
    });
  };

  const handlePrescribeMeds = async () => {
    if (!doctorProfile || !selectedPatientRecord) return;
    const activeMeds = medsList.filter((m) => m.name.trim() !== '');
    if (activeMeds.length === 0) {
      alert('Please select at least one medicine from the catalog.');
      return;
    }

    try {
      const payloadMeds = activeMeds.map((m) => ({
        name: m.name,
        quantity: m.quantity,
        cost: m.unitPrice,
        days: m.days,
        timing: m.timing,
        dosagePerTime: m.tabletsPerTime,
      }));

      if (editingPrescriptionId) {
        await request(`/prescriptions/${editingPrescriptionId}`, {
          method: 'PUT',
          body: JSON.stringify({ medicines: payloadMeds }),
        });
        addSystemNotification('Prescription updated and synced with Pharmacy.', 'SUCCESS');
        setEditingPrescriptionId(null);
      } else {
        await request('/prescriptions', {
          method: 'POST',
          body: JSON.stringify({
            patientId: selectedPatientRecord._id,
            doctorId: doctorProfile._id,
            medicines: payloadMeds,
          }),
        });
        addSystemNotification('Prescription queued successfully and sent to Pharmacy.', 'SUCCESS');
      }

      setPrescribeSuccess(true);
      setMedsList([createDefaultMedItem()]);
      fetchPatientRecords(selectedPatientRecord._id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit prescription.');
    }
  };

  const handleStartEditPrescription = (rx: any) => {
    setEditingPrescriptionId(rx._id);
    if (rx.medicines && rx.medicines.length > 0) {
      const mapped: IPrescriptionItem[] = rx.medicines.map((m: any) => {
        const cat = HOSPITAL_MEDICINES_CATALOG.find((c) => c.name === m.name);
        return recalculateRow({
          id: Math.random().toString(36).substring(2, 9),
          name: m.name,
          generic: cat?.generic || '',
          category: cat?.category || '',
          form: cat?.form || 'Tablet',
          unitPrice: m.cost || cat?.unitPrice || 0,
          days: m.days || 5,
          timing: m.timing || '1-0-1 (Morning & Night - After Food)',
          timesPerDay: cat?.timesPerDay || 2,
          tabletsPerTime: m.dosagePerTime || 1,
          searchTerm: m.name,
          isSearchOpen: false,
        });
      });
      setMedsList(mapped);
    }
  };

  const handleCancelEditPrescription = () => {
    setEditingPrescriptionId(null);
    setMedsList([createDefaultMedItem()]);
  };

  const handleDeletePrescription = async (rxId: string) => {
    if (!window.confirm('Are you sure you want to cancel this prescription?')) return;
    try {
      await request(`/prescriptions/${rxId}`, { method: 'DELETE' });
      addSystemNotification('Prescription cancelled and removed from Pharmacy queue.', 'INFO');
      if (editingPrescriptionId === rxId) {
        handleCancelEditPrescription();
      }
      if (selectedPatientRecord?._id) {
        fetchPatientRecords(selectedPatientRecord._id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to cancel prescription.');
    }
  };

  // Recommend / Update admission (Avoids duplicate allocations!)
  const handleRecommendAdmission = async () => {
    if (!recommendedWardId || !doctorProfile || !selectedPatientRecord) return;
    try {
      if (activeAdmission && activeAdmission.admissionStatus === 'RECOMMENDED') {
        await request(`/admissions/${activeAdmission._id}/recommend`, {
          method: 'PUT',
          body: JSON.stringify({
            wardId: recommendedWardId,
            doctorId: doctorProfile._id,
          }),
        });
        addSystemNotification('Ward recommendation updated successfully.', 'SUCCESS');
      } else {
        await request('/admissions/recommend', {
          method: 'POST',
          body: JSON.stringify({
            patientId: selectedPatientRecord._id,
            doctorId: doctorProfile._id,
            wardId: recommendedWardId,
          }),
        });
        addSystemNotification('Admission recommended successfully.', 'SUCCESS');
      }

      setAdmissionSuccess(true);
      fetchPatientRecords(selectedPatientRecord._id);
      fetchInpatients(doctorProfile._id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to recommend admission.');
    }
  };

  const handleCancelAdmissionRecommendation = async (admissionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this admission recommendation?')) return;
    try {
      await request(`/admissions/${admissionId}/recommend`, { method: 'DELETE' });
      addSystemNotification('Admission recommendation cancelled.', 'INFO');
      setRecommendedWardId('');
      if (selectedPatientRecord?._id) {
        fetchPatientRecords(selectedPatientRecord._id);
      }
      fetchInpatients(doctorProfile._id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to cancel admission recommendation.');
    }
  };

  // Recommend discharge
  const handleRecommendDischarge = async (admissionId: string) => {
    try {
      await request(`/admissions/${admissionId}/recommend-discharge`, { method: 'POST' });
      fetchInpatients();
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Emergency Alert
  const handleTriggerEmergency = async () => {
    if (!emergencyReason || !doctorProfile) return;
    try {
      await request('/emergency/alert', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientRecord._id,
          doctorId: doctorProfile._id,
          description: emergencyReason,
        })
      });
      setEmergencySuccess(true);
      
      // Refresh timeline
      const tl = await request(`/patients/${selectedPatientRecord._id}/timeline`);
      setPatientTimeline(tl);
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Ward change requests
  const handleWardChangeDecision = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await request(`/admissions/ward-change-request/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      fetchWardChangeRequests();
      addSystemNotification(`Ward change request ${status.toLowerCase()} successfully.`, 'SUCCESS');
    } catch (err) {
      console.error(err);
    }
  };

  const activeAdmission = patientAdmissions.find((adm: any) =>
    ['RECOMMENDED', 'RESERVED', 'OCCUPIED', 'DISCHARGE_RECOMMENDED'].includes(adm.admissionStatus)
  ) || (patientAdmissions.length > 0 ? patientAdmissions[0] : null);

  const wholePrescriptionTotal = Math.round(
    medsList.reduce((sum, m) => sum + (m.rowTotal || 0), 0) * 100
  ) / 100;
  const wholeTabletsCount = medsList.reduce((sum, m) => sum + (m.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setActiveSubTab('queue');
              setSelectedPatientRecord(null);
              navigate('/doctor/dashboard');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeSubTab === 'queue'
                ? 'bg-healthcare-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Outpatient Queue ({patientQueue.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('admissions');
              setSelectedPatientRecord(null);
              navigate('/doctor/admissions');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeSubTab === 'admissions'
                ? 'bg-healthcare-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <BedDouble className="h-5 w-5" />
            <span>My Inpatient Stay Census ({inpatients.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('ward-changes');
              setSelectedPatientRecord(null);
              navigate('/doctor/ward-changes');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeSubTab === 'ward-changes'
                ? 'bg-healthcare-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            <span>Ward-Change Actions ({wardChangeRequests.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Stethoscope className="h-5 w-5 text-healthcare-600" />
          <span>{doctorProfile?.userId?.name || 'Loading physician details...'} ({doctorProfile?.specialization || 'Clinical Specialists'})</span>
        </div>
      </div>

      {/* SUBTAB 1: OUTPATIENT QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left list: Waiting Queue */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 h-fit">
            <h2 className="text-md font-bold text-slate-800 mb-4">Clinic Waiting Queue</h2>

            {patientQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                No patients waiting in queue today.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Arrived Patients */}
                {patientQueue.filter(item => item.status === 'RECEIVED' || item.status === 'WITH_DOCTOR').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>Arrived / Ready for Consult ({patientQueue.filter(item => item.status === 'RECEIVED' || item.status === 'WITH_DOCTOR').length})</span>
                    </p>
                    <div className="space-y-2">
                      {patientQueue.filter(item => item.status === 'RECEIVED' || item.status === 'WITH_DOCTOR').map((item) => {
                        let statusColor = item.status === 'WITH_DOCTOR' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-blue-100 text-blue-800 border-blue-200';
                        const isRef = Boolean(item.isReferral || item.referredByDoctorId);
                        return (
                          <button
                            key={item._id}
                            onClick={() => selectPatient(item)}
                            className={`w-full py-3 px-3 text-left hover:bg-slate-50 transition rounded-xl flex items-center justify-between border-l-4 shadow-sm ${
                              activeConsultation?._id === item._id
                                ? isRef ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-300' : 'border-healthcare-600 bg-slate-50'
                                : isRef ? 'border-purple-400 bg-purple-50/20' : 'border-healthcare-500 bg-white'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <p className="font-bold text-xs text-slate-800 truncate">{item.patientId?.userId?.name}</p>
                                {isRef && (
                                  <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                    REFERRAL
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-450 mt-0.5">ID: {item.patientId?.patientId}</p>
                              {item.referredByDoctorId && (
                                <p className="text-[9px] font-bold text-purple-700 mt-1 truncate">
                                  From: {formatDoctorName(item.referredByDoctorId.userId?.name || 'Physician')}
                                  {item.referredByDoctorId.specialization ? ` (${item.referredByDoctorId.specialization})` : ''}
                                </p>
                              )}
                            </div>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${statusColor}`}>
                              {item.status === 'RECEIVED' ? 'ARRIVED' : item.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Scheduled / Waiting for Check-in */}
                {patientQueue.filter(item => item.status === 'WAITING').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                      Scheduled / Waiting for Check-In ({patientQueue.filter(item => item.status === 'WAITING').length})
                    </p>
                    <div className="space-y-2">
                      {patientQueue.filter(item => item.status === 'WAITING').map((item) => {
                        const isRef = Boolean(item.isReferral || item.referredByDoctorId);
                        return (
                          <button
                            key={item._id}
                            onClick={() => selectPatient(item)}
                            className={`w-full py-3 px-3 text-left hover:bg-slate-50 transition rounded-xl flex items-center justify-between border-l-4 ${
                              activeConsultation?._id === item._id
                                ? isRef ? 'bg-purple-50/50 border-purple-500 ring-1 ring-purple-300' : 'bg-slate-50 border-slate-400'
                                : isRef ? 'bg-purple-50/15 border-purple-300' : 'bg-white border-slate-300'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <p className="font-bold text-xs text-slate-700 truncate">{item.patientId?.userId?.name}</p>
                                {isRef && (
                                  <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                    REFERRAL
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-450 mt-0.5">ID: {item.patientId?.patientId}</p>
                              {item.referredByDoctorId && (
                                <p className="text-[9px] font-bold text-purple-700 mt-1 truncate">
                                  From: {formatDoctorName(item.referredByDoctorId.userId?.name || 'Physician')}
                                  {item.referredByDoctorId.specialization ? ` (${item.referredByDoctorId.specialization})` : ''}
                                </p>
                              )}
                            </div>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                              isRef
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {isRef ? 'PENDING REF' : 'WAITING'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Completed Consultations */}
                {patientQueue.filter(item => item.status === 'COMPLETED').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Completed Today ({patientQueue.filter(item => item.status === 'COMPLETED').length})
                    </p>
                    <div className="space-y-2">
                      {patientQueue.filter(item => item.status === 'COMPLETED').map((item) => {
                        const isRef = Boolean(item.isReferral || item.referredByDoctorId);
                        return (
                          <button
                            key={item._id}
                            onClick={() => selectPatient(item)}
                            className={`w-full py-2.5 px-3 text-left hover:bg-slate-50 transition rounded-xl flex items-center justify-between border-l-4 border-emerald-300 opacity-75 ${
                              activeConsultation?._id === item._id ? 'bg-slate-50 border-emerald-500' : 'bg-white'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <p className="font-bold text-xs text-slate-600 truncate">{item.patientId?.userId?.name}</p>
                                {isRef && (
                                  <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                    REFERRAL
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-450 mt-0.5">ID: {item.patientId?.patientId}</p>
                              {item.referredByDoctorId && (
                                <p className="text-[9px] font-semibold text-purple-600 mt-0.5 truncate">
                                  From: {formatDoctorName(item.referredByDoctorId.userId?.name || 'Physician')}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                              COMPLETED
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right action desk */}
          <div className="lg:col-span-2">
            {selectedPatientRecord && activeConsultation ? (
              <div className="space-y-6">
                {/* Patient overview header card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  {/* Referral Details Alert Banner */}
                  {(activeConsultation.isReferral || activeConsultation.referredByDoctorId) && (
                    <div className="mb-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-2 border-purple-200 rounded-xl p-3.5 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0 mt-0.5 shadow-sm">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                              Specialist Referral Case
                            </span>
                            <span className="text-[10px] text-purple-700 font-semibold">
                              Referral Fee ₹300 Billed
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1">
                            Referred by:{' '}
                            <span className="text-purple-900 font-extrabold">
                              {formatDoctorName(activeConsultation.referredByDoctorId?.userId?.name || 'Referring Physician')}
                            </span>
                            {activeConsultation.referredByDoctorId?.specialization && (
                              <span className="text-slate-600 font-medium"> ({activeConsultation.referredByDoctorId.specialization})</span>
                            )}
                            {activeConsultation.referredByDoctorId?.departmentId?.name && (
                              <span className="text-slate-500 font-normal"> - {activeConsultation.referredByDoctorId.departmentId.name}</span>
                            )}
                          </p>
                          {activeConsultation.referralNotes && (
                            <div className="text-xs text-slate-800 mt-2 bg-white/90 p-2.5 rounded-lg border border-purple-150">
                              <span className="font-bold text-purple-900 block text-[10px] uppercase tracking-wider">
                                Clinical Reason / Referral Notes:
                              </span>
                              <p className="mt-0.5 font-medium text-slate-800">{activeConsultation.referralNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{selectedPatientRecord.userId?.name}</h2>
                      <span className="text-xs text-slate-400 font-semibold">
                        ID: {selectedPatientRecord.patientId} | DOB: {new Date(selectedPatientRecord.dob).toLocaleDateString()} ({selectedPatientRecord.gender})
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      {activeConsultation.status === 'WAITING' || activeConsultation.status === 'RECEIVED' ? (
                        <button
                          onClick={() => updateQueueStatus('WITH_DOCTOR')}
                          className="bg-healthcare-600 hover:bg-healthcare-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                        >
                          Start Consultation
                        </button>
                      ) : activeConsultation.status === 'WITH_DOCTOR' ? (
                        <button
                          onClick={handleCompleteConsultation}
                          className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition animate-pulse"
                        >
                          Complete Consult
                        </button>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                          Consultation Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nurse Triage & Vitals Banner */}
                  {activeConsultation?.vitals && (
                    <div className="mb-4 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-xs font-black text-blue-900">
                          <Activity className="h-4 w-4 text-healthcare-600" />
                          <span>NURSE TRIAGE & VITALS INTAKE</span>
                        </div>
                        <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border ${
                          activeConsultation.vitals.triagePriority === 'EMERGENCY'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : activeConsultation.vitals.triagePriority === 'URGENT'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          TRIAGE: {activeConsultation.vitals.triagePriority}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-semibold">
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">BP</span>
                          <span className="text-slate-800 font-mono font-black">{activeConsultation.vitals.bloodPressure || 'N/A'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Heart Rate</span>
                          <span className="text-slate-800 font-mono font-black">{activeConsultation.vitals.heartRate ? `${activeConsultation.vitals.heartRate} bpm` : 'N/A'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">SpO2</span>
                          <span className="text-slate-800 font-mono font-black">{activeConsultation.vitals.spO2 ? `${activeConsultation.vitals.spO2}%` : 'N/A'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Temp</span>
                          <span className="text-slate-800 font-mono font-black">{activeConsultation.vitals.temperature ? `${activeConsultation.vitals.temperature}°F` : 'N/A'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Resp Rate</span>
                          <span className="text-slate-800 font-mono font-black">{activeConsultation.vitals.respiratoryRate ? `${activeConsultation.vitals.respiratoryRate}/m` : 'N/A'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Weight</span>
                          <span className="text-slate-800 font-mono font-black">{activeConsultation.vitals.weight ? `${activeConsultation.vitals.weight} kg` : 'N/A'}</span>
                        </div>
                      </div>
                      {activeConsultation.vitals.nursingNotes && (
                        <p className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-blue-100 font-medium">
                          <span className="font-bold text-slate-700">Nurse Notes: </span>
                          {activeConsultation.vitals.nursingNotes}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Allergies</span>
                      <p className="mt-1 text-red-650 font-bold">{selectedPatientRecord.allergies || 'None listed'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Food Preference</span>
                      <p className="mt-1">{selectedPatientRecord.foodPreference}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Medical History</span>
                      <p className="mt-1 text-slate-500 font-semibold">{selectedPatientRecord.medicalHistory || 'No history'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase tracking-wider">Current Stay</span>
                      <p className="mt-1 text-slate-500">
                        {selectedPatientRecord.currentAdmissionId ? 'Admitted Inpatient' : 'Outpatient Visit'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clinical Actions */}
                {activeConsultation.status === 'WITH_DOCTOR' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Action 1: Write Intake Notes */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 md:col-span-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-healthcare-600" />
                        <span>Clinical Consultation Notes</span>
                      </h3>
                      <textarea
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-healthcare-500 focus:border-healthcare-500"
                        placeholder="Write details of diagnosis, vital stats, and checkup summaries here..."
                      />
                    </div>                    {/* Action 2: Prescribe Diagnostic Scans */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                          <Activity className="h-5 w-5 text-healthcare-600" />
                          <span>Order Diagnostic Scan / Test</span>
                        </h3>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <Lock className="h-3 w-3" />
                          <span>Fixed Tariff</span>
                        </span>
                      </div>

                      {editingDiagId && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center space-x-1.5">
                            <Pencil className="h-3.5 w-3.5 text-blue-600" />
                            <span>Editing Pending Diagnostic Request</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelEditDiagnostic}
                            className="text-[11px] text-blue-700 hover:text-blue-950 font-bold underline"
                          >
                            Cancel Edit
                          </button>
                        </div>
                      )}

                      {testSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Diagnostic test request saved and hospital billing ledger updated.</span>
                        </div>
                      )}

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Select Standard Test (Fixed Predefined Rate)
                          </label>
                          <select
                            value={selectedPredefinedTest}
                            onChange={(e) => handleSelectPredefinedTest(e.target.value)}
                            className="mt-1 block w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-healthcare-500 font-semibold text-slate-800"
                          >
                            <option value="">Select test or scan with fixed pricing...</option>
                            {PREDEFINED_DIAGNOSTIC_TESTS.map((t) => (
                              <option key={t.name} value={t.name}>
                                {t.name} ({t.category}) — ₹{t.cost}
                              </option>
                            ))}
                            <option value="CUSTOM">Custom / Other Test...</option>
                          </select>
                        </div>

                        {selectedPredefinedTest === 'CUSTOM' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Custom Test Name</label>
                            <input
                              type="text"
                              value={testType}
                              onChange={(e) => setTestType(e.target.value)}
                              className="mt-1 block w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-healthcare-500"
                              placeholder="e.g. 24hr Holter Monitoring, Doppler Study"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                            <select
                              value={testPriority}
                              onChange={(e: any) => setTestPriority(e.target.value)}
                              className="mt-1 block w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none font-semibold text-slate-800"
                            >
                              <option value="ROUTINE">Routine</option>
                              <option value="URGENT">Urgent</option>
                              <option value="EMERGENCY">Emergency</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                              <span>Cost (₹)</span>
                              <span className="text-[9px] text-slate-500 font-semibold">
                                {selectedPredefinedTest !== 'CUSTOM' ? 'Fixed Predefined' : 'Manual Cost'}
                              </span>
                            </label>
                            <input
                              type="number"
                              value={testCost}
                              readOnly={selectedPredefinedTest !== 'CUSTOM'}
                              onChange={(e) => setTestCost(Number(e.target.value))}
                              className={`mt-1 block w-full rounded-xl py-2 px-3 text-xs font-bold focus:outline-none ${
                                selectedPredefinedTest !== 'CUSTOM'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-300 cursor-not-allowed'
                                  : 'bg-slate-50 text-slate-800 border border-slate-300 focus:ring-2 focus:ring-healthcare-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handlePrescribeDiagnostic}
                            disabled={!testType}
                            className={`flex-1 ${
                              editingDiagId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-healthcare-600 hover:bg-healthcare-700'
                            } active:scale-[0.99] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5`}
                          >
                            {editingDiagId ? <RefreshCw className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                            <span>{editingDiagId ? `Update Diagnostic Order (₹${testCost})` : `Request Test (${testType ? `₹${testCost}` : 'Select Test'})`}</span>
                          </button>
                          {editingDiagId && (
                            <button
                              type="button"
                              onClick={handleCancelEditDiagnostic}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Diagnostic Orders History */}
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                            <Activity className="h-3.5 w-3.5 text-healthcare-600" />
                            <span>Ordered Diagnostic Tests ({patientDiagnostics.length})</span>
                          </h4>
                        </div>

                        {patientDiagnostics.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1">No diagnostic scans ordered yet for this patient.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {patientDiagnostics.map((diag: any) => (
                              <div key={diag._id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-bold text-slate-800">{diag.testType}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                      diag.priority === 'EMERGENCY'
                                        ? 'bg-red-100 text-red-700'
                                        : diag.priority === 'URGENT'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {diag.priority}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Fixed Rate: ₹{diag.cost} | Ordered: {new Date(diag.createdAt).toLocaleDateString()} {new Date(diag.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                    diag.status === 'COMPLETED'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : diag.status === 'IN_PROGRESS' || diag.status === 'RECEIVED'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : diag.status === 'QUEUED'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {diag.status || 'REQUESTED'}
                                  </span>
                                  {diag.status === 'REQUESTED' && (
                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditDiagnostic(diag)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                                        title="Edit this diagnostic request"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDiagnostic(diag._id)}
                                        className="p-1 text-red-500 hover:bg-red-100 rounded transition"
                                        title="Cancel this diagnostic request"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action 4: Specialist Referral */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                          <Users className="h-5 w-5 text-healthcare-600" />
                          <span>Refer to Specialist Doctor</span>
                        </h3>
                        {patientReferrals.length > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                            {patientReferrals.length} Referral{patientReferrals.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {editingReferralId && (
                        <div className="bg-purple-50 border border-purple-200 text-purple-900 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center space-x-1.5">
                            <Pencil className="h-3.5 w-3.5 text-purple-600" />
                            <span>Editing Specialist Referral</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelEditReferral}
                            className="text-[11px] text-purple-700 hover:text-purple-950 font-bold underline"
                          >
                            Cancel Edit
                          </button>
                        </div>
                      )}

                      {referralSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Specialist Referral submitted and queued.</span>
                        </div>
                      )}

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500">Select Specialist Doctor</label>
                          <select
                            value={referredDoctorId}
                            onChange={(e) => setReferredDoctorId(e.target.value)}
                            className="mt-1 block w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-healthcare-500 text-slate-800 font-medium"
                          >
                            <option value="">Select doctor...</option>
                            {doctorsList.length === 0 ? (
                              <option value="" disabled>No other specialist doctors available</option>
                            ) : (
                              doctorsList.map((d: any) => (
                                <option key={d._id} value={d._id}>
                                  {d.userId?.name || 'Doctor'} ({d.specialization || 'General'}) - {d.departmentId?.name || 'Department'}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500">Referral Notes / Clinical Indication</label>
                          <input
                            type="text"
                            value={referralNotes}
                            onChange={(e) => setReferralNotes(e.target.value)}
                            className="mt-1 block w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-healthcare-500 text-slate-800"
                            placeholder="Reason for specialist consulting (e.g. Cardiac evaluation, Surgical opinion)..."
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleReferDoctor}
                            disabled={!referredDoctorId}
                            className={`flex-1 ${
                              editingReferralId ? 'bg-purple-600 hover:bg-purple-700' : 'bg-healthcare-600 hover:bg-healthcare-700'
                            } active:scale-[0.99] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5`}
                          >
                            {editingReferralId ? <RefreshCw className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            <span>{editingReferralId ? 'Update Specialist Referral' : 'Submit Referral (₹300)'}</span>
                          </button>
                          {editingReferralId && (
                            <button
                              type="button"
                              onClick={handleCancelEditReferral}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Specialist Referrals Log - Show Who Referred with Edit/Cancel */}
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                            <Users className="h-3.5 w-3.5 text-healthcare-600" />
                            <span>Specialist Referrals Log</span>
                          </h4>
                        </div>

                        {patientReferrals.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1">No specialist referrals created yet for this patient.</p>
                        ) : (
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {patientReferrals.map((ref: any) => {
                              const referrerName = ref.fromDoctorId?.userId?.name || doctorProfile?.userId?.name || 'Doctor';
                              const referrerSpecialty = ref.fromDoctorId?.specialization || doctorProfile?.specialization || 'Attending Physician';
                              const referredName = ref.toDoctorId?.userId?.name || 'Specialist';
                              const referredSpecialty = ref.toDoctorId?.specialization || 'Consultant';
                              const referredDept = ref.toDoctorId?.departmentId?.name || '';

                              return (
                                <div key={ref._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">
                                        Referred by:
                                      </span>
                                      <p className="font-bold text-slate-900 text-xs">
                                        {formatDoctorName(referrerName)} <span className="font-medium text-slate-500">({referrerSpecialty})</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                        ref.status === 'COMPLETED'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}>
                                        {ref.status || 'PENDING'}
                                      </span>
                                      {ref.status === 'PENDING' && (
                                        <div className="flex items-center space-x-1">
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditReferral(ref)}
                                            className="p-1 text-purple-600 hover:bg-purple-100 rounded transition"
                                            title="Edit this referral"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteReferral(ref._id)}
                                            className="p-1 text-red-500 hover:bg-red-100 rounded transition"
                                            title="Cancel this referral"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-1.5 border-t border-slate-200/80">
                                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">
                                      Referred to Specialist:
                                    </span>
                                    <p className="font-bold text-slate-900 text-xs">
                                      {formatDoctorName(referredName)} <span className="font-medium text-slate-500">({referredSpecialty}{referredDept ? ` - ${referredDept}` : ''})</span>
                                    </p>
                                  </div>

                                  {ref.notes && (
                                    <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                      <span className="font-bold text-slate-500">Clinical Reason: </span>
                                      {ref.notes}
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                                    <span>Referral Fee: ₹{ref.fee || 300} (Billed)</span>
                                    <span>{new Date(ref.createdAt).toLocaleDateString()} {new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action 5: Recommend Ward Admission (Supports Update to avoid duplicate re-allocation!) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                          <BedDouble className="h-5 w-5 text-healthcare-600" />
                          <span>Recommend Ward Admission</span>
                        </h3>
                        {activeAdmission && (
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getAdmissionStatusBadge(activeAdmission.admissionStatus).badgeClass}`}>
                            {activeAdmission.admissionStatus}
                          </span>
                        )}
                      </div>

                      {admissionSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Admission recommendation saved successfully.</span>
                        </div>
                      )}

                      {/* Current Assigned Inpatient Status Box */}
                      {activeAdmission ? (
                        <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center space-x-1.5">
                              <BedDouble className="h-4 w-4 text-indigo-600" />
                              <span>Current Inpatient Status</span>
                            </span>
                            <span className="text-xs font-bold text-indigo-800 bg-white/90 px-2.5 py-0.5 rounded-full border border-indigo-200">
                              {getAdmissionStatusBadge(activeAdmission.admissionStatus).label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 pt-1">
                            <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Ward</span>
                              <span className="font-bold text-slate-900 text-xs">{activeAdmission.wardId?.name || 'Selected Ward'}</span>
                              {activeAdmission.wardId?.departmentId?.name && (
                                <span className="text-[10px] text-slate-500 block">({activeAdmission.wardId.departmentId.name})</span>
                              )}
                            </div>
                            <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Allocated Bed</span>
                              <span className="font-bold text-slate-900 text-xs">
                                {activeAdmission.bedId?.bedNumber ? (
                                  <span className="text-emerald-700 font-extrabold">{activeAdmission.bedId.bedNumber}</span>
                                ) : (
                                  <span className="text-amber-600 font-semibold">Pending Bed Allocation</span>
                                )}
                              </span>
                            </div>
                            <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Admitting Doctor</span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {formatDoctorName(activeAdmission.doctorId?.userId?.name || doctorProfile?.userId?.name || 'Self')}
                              </span>
                            </div>
                            <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Updated</span>
                              <span className="font-medium text-slate-600 text-xs">
                                {new Date(activeAdmission.createdAt).toLocaleDateString()} {new Date(activeAdmission.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 italic pt-1 border-t border-indigo-100">
                            {getAdmissionStatusBadge(activeAdmission.admissionStatus).sub}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                          No active admission record for this patient. Select a ward below to prescribe admission.
                        </div>
                      )}

                      {/* Ward selection & Update / Create button */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            {activeAdmission && activeAdmission.admissionStatus === 'RECOMMENDED'
                              ? 'Change / Update Recommended Ward (Rule 1)'
                              : 'Prescribe Ward for Inpatient Stay (Rule 1)'}
                          </label>
                          <select
                            value={recommendedWardId || (activeAdmission?.wardId?._id || '')}
                            onChange={(e) => setRecommendedWardId(e.target.value)}
                            className="block w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                          >
                            <option value="">Select ward...</option>
                            {wardsList.map((w: any) => (
                              <option key={w._id} value={w._id}>
                                {w.name} ({w.departmentId?.name || 'General'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex gap-2.5 pt-1">
                          {activeAdmission && activeAdmission.admissionStatus === 'RECOMMENDED' ? (
                            <>
                              <button
                                type="button"
                                onClick={handleRecommendAdmission}
                                disabled={!recommendedWardId && !activeAdmission?.wardId?._id}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                <span>Update Ward Recommendation</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelAdmissionRecommendation(activeAdmission._id)}
                                className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm flex items-center space-x-1"
                                title="Cancel this admission recommendation"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Cancel Recommendation</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={handleRecommendAdmission}
                              disabled={!recommendedWardId}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                              <BedDouble className="h-4 w-4" />
                              <span>Prescribe Stay & Ward</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action 3: Prescribe Medications (Full Width & Spacious Dosing Grid) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                          <Heart className="h-5 w-5 text-healthcare-600" />
                          <span>Prescribe Medications</span>
                        </h3>
                        {patientPrescriptions.length > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                            {patientPrescriptions.length} Prescription{patientPrescriptions.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {editingPrescriptionId && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center space-x-1.5">
                            <Pencil className="h-3.5 w-3.5 text-amber-600" />
                            <span>Editing Prescription (Pending at Pharmacy)</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelEditPrescription}
                            className="text-[11px] text-amber-700 hover:text-amber-950 font-bold underline"
                          >
                            Cancel Edit
                          </button>
                        </div>
                      )}

                      {prescribeSuccess && (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Prescription saved successfully and sent to Pharmacy.</span>
                        </div>
                      )}

                      {/* Prescribe Medication Form */}
                      <div className="space-y-3">
                        <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <span>
                            Select medicines from the catalog. Days count, frequency, and dose calculate the total cost automatically.
                          </span>
                          <span className="font-bold text-healthcare-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                            Fixed Unit Tariff
                          </span>
                        </div>

                        {medsList.map((med, idx) => (
                          <div key={med.id || idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 relative">
                            {/* Medicine Search & Selection Box */}
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <div className="relative">
                                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                                  <input
                                    type="text"
                                    value={med.name ? med.name : med.searchTerm}
                                    onChange={(e) => {
                                      handleMedFieldChange(idx, 'name', '');
                                      handleMedFieldChange(idx, 'searchTerm', e.target.value);
                                    }}
                                    onFocus={() => handleMedFieldChange(idx, 'isSearchOpen', true)}
                                    className="w-full pl-10 pr-32 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-healthcare-500 shadow-sm"
                                    placeholder="Type to search medicine (e.g. Paracetamol, Augmentin, Pan 40, Brufen)..."
                                  />
                                  {med.unitPrice > 0 && (
                                    <div className="absolute right-2.5 top-2 flex items-center space-x-1">
                                      <span className="text-[11px] font-bold text-healthcare-700 bg-healthcare-50 px-2.5 py-0.5 rounded-lg border border-healthcare-200">
                                        ₹{med.unitPrice.toFixed(2)} / {med.form || 'tab'}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Autocomplete dropdown */}
                                {med.isSearchOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => handleMedFieldChange(idx, 'isSearchOpen', false)}
                                    />
                                    <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 divide-y divide-slate-100">
                                      {HOSPITAL_MEDICINES_CATALOG.filter((cat) => {
                                        const query = (med.searchTerm || '').toLowerCase();
                                        if (!query) return true;
                                        return (
                                          cat.name.toLowerCase().includes(query) ||
                                          cat.generic.toLowerCase().includes(query) ||
                                          cat.category.toLowerCase().includes(query)
                                        );
                                      }).map((catItem) => (
                                        <button
                                          key={catItem.id}
                                          type="button"
                                          onClick={() => handleSelectCatalogMed(idx, catItem)}
                                          className="w-full text-left px-3.5 py-2.5 hover:bg-healthcare-50 transition flex items-center justify-between group"
                                        >
                                          <div>
                                            <div className="text-xs font-bold text-slate-800 group-hover:text-healthcare-700">
                                              {catItem.name}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                              {catItem.generic} • <span className="text-slate-400">{catItem.category}</span>
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0 ml-2">
                                            <div className="text-xs font-extrabold text-emerald-600">
                                              ₹{catItem.unitPrice.toFixed(2)}
                                            </div>
                                            <div className="text-[9px] text-slate-400">per {catItem.form || 'tab'}</div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              {medsList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMedInput(idx)}
                                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                  title="Remove medicine row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            {/* Dosing parameters: Spacious layout with ample width for frequency dropdown */}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              {/* 1. Days Count */}
                              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 flex-1 min-w-[130px]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Days Count
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={med.days}
                                    onChange={(e) => handleMedFieldChange(idx, 'days', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-healthcare-500"
                                  />
                                  <span className="text-xs font-medium text-slate-500">days</span>
                                </div>
                              </div>

                              {/* 2. Which times to eat (Frequency) */}
                              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 flex-[2] min-w-[260px]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Which Times (Frequency)
                                </label>
                                <select
                                  value={med.timing}
                                  onChange={(e) => handleMedFieldChange(idx, 'timing', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-healthcare-500"
                                >
                                  {TIMING_SCHEDULES.map((sched) => (
                                    <option key={sched.label} value={sched.label}>
                                      {sched.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 3. How many tablets per time */}
                              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 flex-1 min-w-[130px]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Tabs / Time
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    max="10"
                                    value={med.tabletsPerTime}
                                    onChange={(e) => handleMedFieldChange(idx, 'tabletsPerTime', Math.max(0.5, parseFloat(e.target.value) || 1))}
                                    className="w-16 bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-healthcare-500"
                                  />
                                  <span className="text-xs font-medium text-slate-500">tab/dose</span>
                                </div>
                              </div>

                              {/* 4. Total Amount for this tablet & Quantity */}
                              <div className="bg-emerald-50/80 px-4 py-2 rounded-xl border border-emerald-200 flex-1 min-w-[150px] flex flex-col justify-center text-right">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                                  Total ({med.quantity} tabs)
                                </span>
                                <span className="text-base font-black text-emerald-900">
                                  ₹{med.rowTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Whole Total and Actions bar */}
                        <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={addMedInput}
                              className="bg-white hover:bg-slate-50 active:bg-slate-100 text-healthcare-600 border border-healthcare-200 font-bold py-2 px-3.5 rounded-xl flex items-center space-x-1 text-xs shadow-sm transition"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add Row</span>
                            </button>
                            <span className="text-xs text-slate-600 font-semibold">
                              {medsList.filter(m => m.name).length} Selected • {wholeTabletsCount} Total Tablets
                            </span>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-[10px] uppercase font-bold text-slate-500">Whole Prescription Total</div>
                              <div className="text-lg font-black text-slate-900">₹{wholePrescriptionTotal.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {editingPrescriptionId && (
                                <button
                                  type="button"
                                  onClick={handleCancelEditPrescription}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handlePrescribeMeds}
                                className={`${
                                  editingPrescriptionId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-healthcare-600 hover:bg-healthcare-700'
                                } active:scale-[0.99] text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5`}
                              >
                                {editingPrescriptionId ? <RefreshCw className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                                <span>{editingPrescriptionId ? 'Update Prescription' : 'Send to Pharmacy'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Prescribed Medications History with detailed item cards and Edit/Cancel */}
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                            <Pill className="h-3.5 w-3.5 text-healthcare-600" />
                            <span>Prescribed Medications History</span>
                          </h4>
                          {patientPrescriptions.length > 0 && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {patientPrescriptions.reduce((sum: number, rx: any) => sum + (rx.medicines?.length || 0), 0)} items recorded
                            </span>
                          )}
                        </div>

                        {patientPrescriptions.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1">No medications prescribed yet for this patient.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {patientPrescriptions.map((rx: any) => (
                              <div key={rx._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-200 pb-1.5">
                                  <span className="font-semibold text-slate-700">
                                    Prescribed by {formatDoctorName(rx.doctorId?.userId?.name || doctorProfile?.userId?.name || 'Self')}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-1.5 py-0.5 rounded font-bold border ${
                                      rx.paymentStatus === 'PAID'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {rx.paymentStatus === 'PAID' ? 'PAID' : 'BILL PENDING'}
                                    </span>
                                    <span>{new Date(rx.createdAt).toLocaleDateString()} {new Date(rx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {rx.paymentStatus !== 'PAID' && (
                                      <div className="flex items-center space-x-1 pl-1">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditPrescription(rx)}
                                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                                          title="Edit this prescription"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePrescription(rx._id)}
                                          className="p-1 text-red-500 hover:bg-red-100 rounded transition"
                                          title="Cancel this prescription"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  {rx.medicines?.map((item: any, mIdx: number) => (
                                    <div key={mIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1.5 px-2.5 bg-white rounded-lg border border-slate-200">
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-bold text-slate-800">{item.name}</span>
                                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                            Qty: {item.quantity} tabs
                                          </span>
                                        </div>
                                        {(item.days || item.timing || item.dosagePerTime) && (
                                          <div className="text-[10px] text-slate-500 mt-0.5">
                                            Schedule: {item.days} days • {item.timing} • {item.dosagePerTime} tab/dose
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                                        <span className="text-xs font-bold text-slate-700">
                                          ₹{((item.cost || 0) * (item.quantity || 1)).toFixed(2)}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                                          item.status === 'DISPENSED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : item.status === 'READY'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : item.status === 'PROCESSING'
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                          {item.status || 'WAITING'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 pt-1">
                                  <span>Total Prescription Amount:</span>
                                  <span className="text-slate-900 font-extrabold text-xs">₹{rx.totalCost}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action 6: Trigger Flashing Emergency */}
                    <div className="bg-red-50 border border-red-200 p-6 rounded-2xl space-y-4 md:col-span-2">
                      <h3 className="text-sm font-bold text-red-800 flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                        <span>TRIGGER PATIENT CRITICAL EMERGENCY ALERT</span>
                      </h3>

                      {emergencySuccess && (
                        <div className="bg-red-650 text-white px-3 py-2 rounded-xl text-xs font-bold">
                          EMERGENCY SIREN BROADCASTED LOCALLY. Medical team is alerted!
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 items-end">
                        <div className="flex-1 w-full text-xs">
                          <label className="block text-xs font-bold text-red-800 uppercase">Emergency Reason / Code</label>
                          <input
                            type="text"
                            value={emergencyReason}
                            onChange={(e) => setEmergencyReason(e.target.value)}
                            className="mt-1 block w-full bg-white border border-red-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                            placeholder="e.g. Cardiac Arrest, Severe breathing collapse"
                          />
                        </div>
                        <button
                          onClick={handleTriggerEmergency}
                          disabled={!emergencyReason}
                          className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-2 px-6 rounded-xl text-xs transition disabled:opacity-50 h-10 w-full sm:w-auto shrink-0"
                        >
                          BROADCAST SIREN
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Patient journey timeline log</h3>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {patientTimeline.length} total event{patientTimeline.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {patientTimeline.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No timeline events recorded yet.</p>
                  ) : (
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {patientTimeline.slice(0, visibleTimelineCount).map((item, idx) => {
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
                                      <Calendar className="h-4 w-4 text-slate-400" />
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4 text-xs font-semibold text-slate-700">
                                    <div>
                                      <p className="font-bold text-slate-800">{item.description}</p>
                                      <span className="text-[10px] text-slate-400 font-medium">By: {item.createdBy}</span>
                                    </div>
                                    <div className="text-right text-[10px] whitespace-nowrap text-slate-400 font-semibold">
                                      {item.timestamp ? (
                                        <>
                                          <span className="block">{new Date(item.timestamp).toLocaleDateString()}</span>
                                          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </>
                                      ) : ''}
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
                            className="text-xs text-healthcare-600 hover:text-healthcare-700 font-extrabold flex items-center space-x-1"
                          >
                            <span>View More Events</span>
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => setVisibleTimelineCount(patientTimeline.length)}
                            className="text-xs text-healthcare-600 hover:text-healthcare-700 font-extrabold"
                          >
                            <span>View All Events ({patientTimeline.length})</span>
                          </button>
                        </div>
                      )}

                      {/* Collapse button (if all are shown) */}
                      {visibleTimelineCount >= patientTimeline.length && patientTimeline.length > 3 && (
                        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-center">
                          <button
                            onClick={() => setVisibleTimelineCount(3)}
                            className="text-xs text-slate-400 hover:text-slate-600 font-extrabold"
                          >
                            <span>Show Less</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 p-8 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col justify-center items-center text-center text-slate-400 py-24">
                <Stethoscope className="h-12 w-12 mb-3 text-slate-350" />
                <p className="font-bold">Select a patient from the queue directory to write notes, order tests, prescribe medicines, or recomend ward stays.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: INPATIENT STAY CENSUS */}
      {activeSubTab === 'admissions' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-md font-bold text-slate-800 mb-4">Admitted Inpatients stays</h2>
          
          {inpatients.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center font-semibold">No admitted inpatients currently assigned to you.</p>
          ) : (
            <div className="overflow-hidden border border-slate-200 rounded-2xl text-xs">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Patient</th>
                    <th className="px-6 py-3 text-left">Ward / Bed</th>
                    <th className="px-6 py-3 text-left">Admission Status</th>
                    <th className="px-6 py-3 text-left">Billing Balance</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-slate-700 font-semibold">
                  {inpatients.map((adm) => (
                    <tr key={adm._id}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-850">{(adm.patientId as any).userId?.name}</p>
                        <p className="text-[10px] text-slate-400">ID: {(adm.patientId as any).patientId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p>{adm.wardId?.name}</p>
                        <p className="text-[10px] text-healthcare-600 font-bold">Bed: {adm.bedId?.bedId || 'Not Allocated'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                          adm.admissionStatus === 'DISCHARGE_RECOMMENDED'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {adm.admissionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          adm.paymentStatus === 'PENDING'
                            ? 'bg-red-50 text-red-800 border-red-150'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-150'
                        }`}>
                          {adm.paymentStatus === 'PENDING' ? 'Balance Outstanding' : 'Stay Paid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {adm.admissionStatus === 'OCCUPIED' && (
                          <button
                            onClick={() => handleRecommendDischarge(adm._id)}
                            className="bg-healthcare-650 hover:bg-healthcare-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Recommend Discharge
                          </button>
                        )}
                        {adm.admissionStatus === 'DISCHARGE_RECOMMENDED' && (
                          <span className="text-[10px] text-slate-400 font-medium italic">Pending checkout payment...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: WARD CHANGE DECISION PANEL */}
      {activeSubTab === 'ward-changes' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-md font-bold text-slate-800 mb-4">Pending Ward-Change Requests</h2>
          
          {wardChangeRequests.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center font-semibold">No pending ward change approval requests found.</p>
          ) : (
            <div className="space-y-4">
              {wardChangeRequests.map((req) => (
                <div key={req._id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs">
                  <div>
                    <h3 className="font-bold text-sm text-slate-850">{(req.patientId as any).userId?.name}</h3>
                    <p className="text-slate-400 text-[10px]">Patient ID: {(req.patientId as any).patientId}</p>
                    <p className="mt-2 text-slate-600 font-semibold">
                      Requested Ward change to: <strong className="text-slate-900">{req.requestedWardId?.name}</strong>
                    </p>
                  </div>
                  <div className="flex space-x-2 mt-4 sm:mt-0 shrink-0">
                    <button
                      onClick={() => handleWardChangeDecision(req._id, 'APPROVED')}
                      className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Approve Change
                    </button>
                    <button
                      onClick={() => handleWardChangeDecision(req._id, 'REJECTED')}
                      className="bg-red-605 hover:bg-red-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Reject Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
