import React, { useState, useEffect, useMemo, useRef } from 'react';
import { request } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  CreditCard,
  DollarSign,
  Search,
  CheckCircle,
  FileText,
  CheckCircle2,
  X,
  Building,
  ArrowRight,
  Receipt,
  User,
  Users,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

const BillingDashboard: React.FC = () => {
  const { socket, addSystemNotification } = useSocket();

  // Search & active patient
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [patientDetails, setPatientDetails] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Billing ledger data
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [paidBills, setPaidBills] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  // Cash tender calculator
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ledger filters
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [ledgerServiceFilter, setLedgerServiceFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handlePaymentUpdate = () => {
      fetchAllTransactions();
      if (patientDetails) {
        refreshPatientBilling(patientDetails._id);
      }
    };

    socket.on('payment:updated', handlePaymentUpdate);
    socket.on('admission:updated', handlePaymentUpdate);
    socket.on('diagnostic:requested', handlePaymentUpdate);

    return () => {
      socket.off('payment:updated', handlePaymentUpdate);
      socket.off('admission:updated', handlePaymentUpdate);
      socket.off('diagnostic:requested', handlePaymentUpdate);
    };
  }, [socket, patientDetails]);

  // Debounced search query for live suggestions
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      if (!hasSearched) {
        setSearchResults([]);
      }
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await request(`/patients/search?query=${encodeURIComponent(searchQuery.trim())}`);
        const list = Array.isArray(res) ? res : [];
        setSearchResults(list);
        if (!hasSearched) {
          setShowSuggestions(list.length > 0);
        }
      } catch (err) {
        console.error('Failed to search patients:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, hasSearched]);

  const fetchAllTransactions = async () => {
    try {
      const res = await request('/payments');
      setAllTransactions(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshPatientBilling = async (dbPatientId: string) => {
    try {
      const [pendings, history, updatedPatient] = await Promise.all([
        request(`/payments/pending/${dbPatientId}`).catch(() => []),
        request(`/payments/history/${dbPatientId}`).catch(() => []),
        request(`/patients/${dbPatientId}`).catch(() => null),
      ]);
      setPendingBills(Array.isArray(pendings) ? pendings : []);
      setPaidBills(Array.isArray(history) ? history : []);
      if (updatedPatient) {
        setPatientDetails(updatedPatient);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to calculate pending summary for any patient from allTransactions
  const getPatientPendingSummary = (patient: any) => {
    if (!patient) return { count: 0, totalDue: 0 };
    const pDbId = String(patient._id || '');
    const pCode = String(patient.patientId || '');
    let count = 0;
    let totalDue = 0;
    allTransactions.forEach((tx) => {
      if (tx.status === 'PENDING' && tx.patientId) {
        const txPId = String(tx.patientId._id || tx.patientId);
        const txPCode = String(tx.patientId.patientId || '');
        if ((pDbId && txPId === pDbId) || (pCode && txPCode === pCode)) {
          count++;
          totalDue += tx.amount;
        }
      }
    });
    return { count, totalDue };
  };

  // User explicitly selects a patient from search choices or pending queue
  const handleSelectPatient = async (patient: any) => {
    setPatientDetails(patient);
    setSearchQuery(`${patient.userId?.name || 'Patient'} (${patient.patientId})`);
    setShowSuggestions(false);
    setHasSearched(false);
    setAmountTendered('');
    setSuccessMessage(null);
    await refreshPatientBilling(patient._id);
  };

  // Clear patient to return to search results or queue
  const handleClearPatient = () => {
    setPatientDetails(null);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setShowSuggestions(false);
    setPendingBills([]);
    setPaidBills([]);
    setAmountTendered('');
    setSuccessMessage(null);
  };

  // Form submit: do NOT automatically choose res[0]! Show choices explicitly.
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setShowSuggestions(false);
    setPatientDetails(null); // Clear active counter so user sees the search choices
    try {
      const res = await request(`/patients/search?query=${encodeURIComponent(searchQuery.trim())}`);
      const list = Array.isArray(res) ? res : [];
      setSearchResults(list);
    } catch (err: any) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Process single bill payment
  const handleProcessPayment = async (paymentId: string) => {
    try {
      await request(`/payments/${paymentId}/pay`, { method: 'POST' });
      setSuccessMessage('Payment recorded in cash successfully.');
      addSystemNotification('Payment recorded successfully.', 'SUCCESS');
      if (patientDetails) {
        await refreshPatientBilling(patientDetails._id);
      }
      fetchAllTransactions();
    } catch (err: any) {
      alert(err.message || 'Payment failed.');
    }
  };

  // Bulk pay all pending bills
  const handlePayAll = async () => {
    if (pendingBills.length === 0 || !patientDetails) return;
    const totalDue = calculateTotalPending();
    if (!window.confirm(`Confirm settling all ${pendingBills.length} pending bill(s) for ₹${totalDue.toLocaleString()} in cash?`)) return;

    setIsProcessingBulk(true);
    setSuccessMessage(null);
    try {
      for (const bill of pendingBills) {
        await request(`/payments/${bill._id}/pay`, { method: 'POST' });
      }
      setSuccessMessage(`Settled all ${pendingBills.length} pending bills (₹${totalDue.toLocaleString()}).`);
      setAmountTendered('');
      addSystemNotification(`Settled ${pendingBills.length} bills in cash.`, 'SUCCESS');
      await refreshPatientBilling(patientDetails._id);
      fetchAllTransactions();
    } catch (err: any) {
      alert(err.message || 'Failed to settle bills.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Partial payment FIFO
  const handleBulkPayCash = async () => {
    const cash = Number(amountTendered || 0);
    if (cash <= 0 || !patientDetails) return;

    setIsProcessingBulk(true);
    setSuccessMessage(null);
    try {
      let remainingCash = cash;
      let settledCount = 0;
      for (const bill of pendingBills) {
        if (remainingCash >= bill.amount) {
          await request(`/payments/${bill._id}/pay`, { method: 'POST' });
          remainingCash -= bill.amount;
          settledCount++;
        }
      }
      if (settledCount > 0) {
        setSuccessMessage(`Settled ${settledCount} bills using tendered cash. Change: ₹${remainingCash.toLocaleString()}`);
        addSystemNotification(`Settled ${settledCount} bills partially.`, 'SUCCESS');
        setAmountTendered('');
        await refreshPatientBilling(patientDetails._id);
        fetchAllTransactions();
      } else {
        alert(`Tendered amount ₹${cash} is less than the smallest pending invoice.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to settle partial bills.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Math calculations
  const calculateTotalPending = () => {
    return pendingBills.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateTotalPaid = () => {
    return paidBills.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateGrandTotal = () => {
    return calculateTotalPending() + calculateTotalPaid();
  };

  // Hospital-wide stats
  const hospitalStats = useMemo(() => {
    let paidTotal = 0;
    let pendingTotal = 0;
    const pendingPatientsMap = new Map<string, { patient: any; totalDue: number; count: number }>();

    allTransactions.forEach((tx) => {
      if (tx.status === 'PAID') {
        paidTotal += tx.amount;
      } else if (tx.status === 'PENDING') {
        pendingTotal += tx.amount;
        if (tx.patientId) {
          const pKey = String(tx.patientId._id || tx.patientId.patientId);
          const existing = pendingPatientsMap.get(pKey);
          if (existing) {
            existing.totalDue += tx.amount;
            existing.count += 1;
          } else {
            pendingPatientsMap.set(pKey, {
              patient: tx.patientId,
              totalDue: tx.amount,
              count: 1,
            });
          }
        }
      }
    });

    return {
      paidTotal,
      pendingTotal,
      pendingQueue: Array.from(pendingPatientsMap.values()),
    };
  }, [allTransactions]);

  // Filtered Hospital Transactions Ledger
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (ledgerStatusFilter !== 'ALL' && tx.status !== ledgerStatusFilter) {
        return false;
      }
      if (ledgerServiceFilter !== 'ALL' && tx.serviceType !== ledgerServiceFilter) {
        return false;
      }
      return true;
    });
  }, [allTransactions, ledgerStatusFilter, ledgerServiceFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-850 flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-healthcare-600" />
            <span>Centralized Hospital Cash Counter & Billing Desk</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Collect cash payments, calculate patient change, reconcile outstanding hospital ledgers, and issue cleared receipts.
          </p>
        </div>

        {/* Global Stats Badges */}
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[9px] uppercase font-bold text-emerald-700 block">Total Cleared</span>
            <span className="text-sm font-black text-emerald-800">₹{hospitalStats.paidTotal.toLocaleString()}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[9px] uppercase font-bold text-amber-700 block">Pending Due</span>
            <span className="text-sm font-black text-amber-800">₹{hospitalStats.pendingTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* TOP PROMINENT CASHIER SEARCH BAR */}
      <div ref={searchContainerRef} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (searchResults.length > 0 && !hasSearched) {
                  setShowSuggestions(true);
                }
              }}
              className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-healthcare-500 focus:border-healthcare-500 transition"
              placeholder="Search patient by Name (e.g. Selvam R. / Kavitha S.), Patient ID (e.g. P1002), or Phone..."
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                  setShowSuggestions(false);
                }}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Live Typing Suggestions Dropdown */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xl max-h-80 overflow-y-auto space-y-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-3 py-1 border-b border-slate-100 mb-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Matching Patients ({searchResults.length}) — Click to Select:
                  </span>
                  <span className="text-[10px] text-healthcare-600 font-bold">Press Enter to view all</span>
                </div>
                {searchResults.map((pat) => {
                  const summary = getPatientPendingSummary(pat);
                  return (
                    <button
                      key={pat._id}
                      type="button"
                      onClick={() => handleSelectPatient(pat)}
                      className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-healthcare-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full bg-healthcare-50 text-healthcare-700 flex items-center justify-center font-black text-xs shrink-0 border border-healthcare-200">
                          {pat.userId?.name ? pat.userId.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-slate-900 text-sm">{pat.userId?.name}</span>
                            <span className="text-healthcare-700 font-extrabold bg-healthcare-50 border border-healthcare-200 px-1.5 py-0.5 rounded text-[10px]">
                              {pat.patientId}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                            {pat.gender} • Phone: {pat.userId?.phone || 'N/A'} • DOB: {new Date(pat.dob).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5 self-end sm:self-center">
                        {/* Ward Location */}
                        {pat.currentAdmissionId ? (
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{pat.currentAdmissionId.bedId?.bedId || pat.currentAdmissionId.wardId?.name || 'Inpatient'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            Outpatient
                          </span>
                        )}

                        {/* Pending Due Badge */}
                        {summary.totalDue > 0 ? (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg">
                            ₹{summary.totalDue.toLocaleString()} Due ({summary.count})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                            ✓ Cleared
                          </span>
                        )}

                        <span className="text-xs font-black text-healthcare-600 pl-1">
                          Select →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="bg-healthcare-600 hover:bg-healthcare-550 text-white font-extrabold px-6 py-3 rounded-xl text-sm transition shadow-sm active:scale-95 shrink-0 flex items-center justify-center space-x-1.5"
          >
            <Search className="h-4 w-4" />
            <span>{isSearching ? 'Searching...' : 'Find Ledger'}</span>
          </button>

          {patientDetails && (
            <button
              type="button"
              onClick={handleClearPatient}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shrink-0"
            >
              <X className="h-4 w-4" />
              <span>Choose Different Patient</span>
            </button>
          )}
        </form>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: EXPLICIT PATIENT SELECTION CHOICES (When search submitted and multiple/any patients match) */}
      {!patientDetails && hasSearched && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-healthcare-50 text-healthcare-600 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Search Results — Choose Patient to Open Cash Counter
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Found {searchResults.length} patient{searchResults.length === 1 ? '' : 's'} matching &ldquo;<span className="text-slate-700 font-bold">{searchQuery}</span>&rdquo;. Please click the patient you wish to bill:
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setHasSearched(false);
                setSearchResults([]);
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to All Queues</span>
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No matching patients found</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No patient matched &ldquo;{searchQuery}&rdquo;. Check the Patient ID (e.g. P1001, P1002) or patient name, or check the queue below.
              </p>
              <button
                onClick={() => {
                  setHasSearched(false);
                  setSearchQuery('');
                }}
                className="mt-2 text-xs font-black text-healthcare-600 hover:text-healthcare-700 underline"
              >
                Clear Search & View Queues
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {searchResults.map((pat) => {
                const summary = getPatientPendingSummary(pat);
                return (
                  <div
                    key={pat._id}
                    className="p-5 bg-slate-50 hover:bg-white border-2 border-slate-200 hover:border-healthcare-400 rounded-2xl transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Header with Name and ID */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-xl bg-healthcare-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                            {pat.userId?.name ? pat.userId.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="font-black text-base text-slate-900">{pat.userId?.name}</h3>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[11px] font-extrabold text-healthcare-700 bg-healthcare-50 border border-healthcare-200 px-2 py-0.5 rounded-md">
                                ID: {pat.patientId}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 uppercase">
                                {pat.gender}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Location Badge */}
                        {pat.currentAdmissionId ? (
                          <div className="text-right">
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md block">
                              {pat.currentAdmissionId.wardId?.name || 'Inpatient'}
                            </span>
                            <span className="text-[10px] text-healthcare-600 font-extrabold block mt-0.5">
                              Bed: {pat.currentAdmissionId.bedId?.bedId || 'Unassigned'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-1 rounded-md">
                            Outpatient
                          </span>
                        )}
                      </div>

                      {/* Contact & Demographics */}
                      <div className="text-xs text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/80">
                        <p><span className="font-semibold text-slate-600">Phone:</span> {pat.userId?.phone || 'Not provided'}</p>
                        <p><span className="font-semibold text-slate-600">DOB:</span> {new Date(pat.dob).toLocaleDateString()} • <span className="font-semibold text-slate-600">Blood:</span> {pat.bloodGroup || 'N/A'}</p>
                        {pat.allergies && (
                          <p className="text-[11px] text-rose-600 font-medium truncate">Allergies: {pat.allergies}</p>
                        )}
                      </div>
                    </div>

                    {/* Pending Dues & Select Action */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Charges</span>
                        {summary.totalDue > 0 ? (
                          <span className="text-base font-black text-amber-800">
                            ₹{summary.totalDue.toLocaleString()} <span className="text-xs font-semibold text-slate-500">({summary.count} bill{summary.count === 1 ? '' : 's'})</span>
                          </span>
                        ) : (
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            ✓ All Accounts Settled
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectPatient(pat)}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5"
                      >
                        <span>Select & Open Counter</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ACTIVE PATIENT CASH COUNTER */}
      {patientDetails && (
        <div className="space-y-6">
          {/* Active Navigation Header */}
          <div className="bg-healthcare-50 border border-healthcare-200 px-5 py-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-healthcare-700 uppercase tracking-wider">Active Counter:</span>
              <span className="text-sm font-black text-slate-900">{patientDetails.userId?.name}</span>
              <span className="text-xs font-bold text-healthcare-700 bg-white border border-healthcare-200 px-2 py-0.5 rounded-full">
                ID: {patientDetails.patientId}
              </span>
            </div>
            <button
              onClick={handleClearPatient}
              className="text-xs font-black text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center space-x-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Choose Another Patient / Search</span>
            </button>
          </div>

          {/* Patient Overview Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h2 className="font-black text-xl text-slate-900">{patientDetails.userId?.name}</h2>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-250">
                    ID: {patientDetails.patientId}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {patientDetails.gender} • DOB: {new Date(patientDetails.dob).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-400 text-xs font-semibold">
                  Phone: {patientDetails.userId?.phone || 'N/A'} • Blood: {patientDetails.bloodGroup || 'N/A'} • Diet: {patientDetails.foodPreference || 'REGULAR'}
                </p>
              </div>

              {/* Admission & Bed Location Tag if Admitted */}
              {patientDetails.currentAdmissionId ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3 text-xs">
                  <Building className="h-5 w-5 text-healthcare-600 shrink-0" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-800">
                        {patientDetails.currentAdmissionId.wardId?.name || 'Assigned Ward'}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        patientDetails.currentAdmissionId.inDiagnostics
                          ? 'bg-amber-100 text-amber-850 border border-amber-300 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {patientDetails.currentAdmissionId.inDiagnostics ? 'In Diagnostics Room' : 'In Ward Bed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-healthcare-600 font-bold mt-0.5">
                      Bed: {patientDetails.currentAdmissionId.bedId?.bedId || 'Unassigned'}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                  Outpatient Account
                </span>
              )}
            </div>

            {/* 3-Stat Financial Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Charges */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Total Incurred Charges
                </span>
                <span className="text-2xl font-black text-slate-850 mt-1 block">
                  ₹{calculateGrandTotal().toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  All consultations, diagnostics, pharmacy & ward services
                </span>
              </div>

              {/* Cleared to Date */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                    Total Cleared to Date
                  </span>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    {paidBills.length} Paid
                  </span>
                </div>
                <span className="text-2xl font-black text-emerald-800 mt-1 block">
                  ₹{calculateTotalPaid().toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  Verified cash & receipts received
                </span>
              </div>

              {/* Outstanding Balance Due */}
              <div className="bg-amber-50/70 border border-amber-300 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                    Outstanding Balance Due
                  </span>
                  <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    {pendingBills.length} Pending
                  </span>
                </div>
                <span className="text-3xl font-black text-amber-900 mt-1 block">
                  ₹{calculateTotalPending().toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-700 font-bold">
                  {calculateTotalPending() === 0 ? '✓ Account Fully Settled' : 'Action Required: Cash Tender Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Pending Ledger Table */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-healthcare-600" />
                  <span>Itemized Unpaid Invoices Ledger</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Click Record Cash on individual items or use the tender desk below for bulk settlement.
                </p>
              </div>

              {pendingBills.length > 0 && (
                <button
                  type="button"
                  onClick={handlePayAll}
                  disabled={isProcessingBulk}
                  className="bg-emerald-600 hover:bg-emerald-550 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-sm flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Settle All ({pendingBills.length} • ₹{calculateTotalPending().toLocaleString()})</span>
                </button>
              )}
            </div>

            {pendingBills.length === 0 ? (
              <div className="bg-slate-50 text-center py-10 rounded-2xl border border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">All Accounts Settled!</p>
                <p className="text-xs text-slate-400 mt-0.5">This patient currently has no outstanding unpaid invoices.</p>
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
                      <th className="px-5 py-3 text-center">Operation</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                    {pendingBills.map((bill) => (
                      <tr key={bill._id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${
                            bill.serviceType === 'DIAGNOSTIC'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : bill.serviceType === 'PHARMACY'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : bill.serviceType === 'ADMISSION'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : bill.serviceType === 'REFERRAL'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-slate-800 border-slate-250'
                          }`}>
                            {bill.serviceType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-850 text-xs">{bill.description}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Invoice #{bill._id.substring(bill._id.length - 6)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">
                          {new Date(bill.createdAt).toLocaleDateString()} {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-900 font-black text-sm">
                          ₹{bill.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleProcessPayment(bill._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition shadow-xs inline-flex items-center space-x-1.5"
                            title="Collect cash payment for this item"
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

          {/* REAL CASH COUNTER TENDER & SETTLEMENT DESK */}
          {pendingBills.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-white">Cash Tender & Quick Settlement Counter</h4>
                    <p className="text-xs text-slate-400">Enter cash handed by patient to automatically calculate change and settle outstanding accounts.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Due</span>
                  <span className="text-2xl font-black text-emerald-400">₹{calculateTotalPending().toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                {/* 1. Cash Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-300">
                    Amount Handed by Patient (₹)
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
                      placeholder={`e.g. ${calculateTotalPending()}`}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-800/80 border border-slate-600 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                    />
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center space-x-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAmountTendered(calculateTotalPending().toString())}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold transition"
                    >
                      Exact (₹{calculateTotalPending()})
                    </button>
                    {[500, 1000, 2000, 5000].map((val) => (
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
                <div className="bg-slate-800/60 border border-slate-700 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Amount Handed:</span>
                    <span className="font-bold text-white">
                      ₹{amountTendered ? Number(amountTendered).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Total Balance Due:</span>
                    <span className="font-bold text-amber-400">
                      ₹{calculateTotalPending().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-2 border-t border-slate-700">
                    <span className="text-slate-300">
                      {Number(amountTendered || 0) >= calculateTotalPending() ? 'Change to Return:' : 'Remaining Due:'}
                    </span>
                    <span className={`font-black text-base ${
                      Number(amountTendered || 0) >= calculateTotalPending()
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}>
                      ₹{Math.abs(Number(amountTendered || 0) - calculateTotalPending()).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 3. Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handlePayAll}
                    disabled={isProcessingBulk || pendingBills.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition shadow-md shadow-emerald-500/20 active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {isProcessingBulk
                        ? 'Processing Settle...'
                        : `Settle All (${pendingBills.length} Bills • ₹${calculateTotalPending().toLocaleString()})`}
                    </span>
                  </button>

                  {Number(amountTendered || 0) > 0 && Number(amountTendered || 0) < calculateTotalPending() && (
                    <button
                      type="button"
                      onClick={handleBulkPayCash}
                      disabled={isProcessingBulk}
                      className="w-full bg-healthcare-600 hover:bg-healthcare-550 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition active:scale-98 disabled:opacity-50"
                    >
                      Settle Partial (₹{Number(amountTendered).toLocaleString()})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment History & Cleared Receipts Log */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-850">Payment History & Cleared Receipts Log</h4>
                  <p className="text-[11px] text-slate-400">All previous completed transactions and payments recorded for this patient.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {paidBills.length} Cleared Payment{paidBills.length === 1 ? '' : 's'}
              </span>
            </div>

            {paidBills.length === 0 ? (
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
                    {paidBills.map((paid) => (
                      <tr key={paid._id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded font-extrabold text-[9px] uppercase">
                            {paid.serviceType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-800 text-xs">{paid.description}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Ref #{paid._id.substring(paid._id.length - 6)}</span>
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
      )}

      {/* VIEW 3: GENERAL COUNTER DESK WITH QUEUE & GLOBAL LEDGER (When no patient selected and not viewing search results) */}
      {!patientDetails && !hasSearched && (
        <div className="space-y-6">
          {/* Active Patients with Pending Balances Queue */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-850 flex items-center space-x-2">
                  <Receipt className="h-5 w-5 text-healthcare-600" />
                  <span>Patients with Pending Balances at Cash Counter</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Click any patient to instantly open their cash counter, view itemized charges, and record cash.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                {hospitalStats.pendingQueue.length} Patients Pending Settlement
              </span>
            </div>

            {hospitalStats.pendingQueue.length === 0 ? (
              <div className="bg-slate-50 text-center py-8 rounded-2xl border border-slate-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-bold text-slate-700 text-xs">All hospital patient bills are settled.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {hospitalStats.pendingQueue.map((item) => (
                  <div
                    key={item.patient?._id || item.patient?.patientId}
                    className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-healthcare-300 rounded-2xl transition shadow-2xs hover:shadow-md flex flex-col justify-between space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-slate-900 text-sm">{item.patient?.userId?.name || 'Patient'}</h3>
                        <p className="text-[10px] text-healthcare-600 font-extrabold mt-0.5">
                          ID: {item.patient?.patientId}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-250 px-2 py-0.5 rounded-full">
                        {item.count} Invoices
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Due</span>
                        <span className="text-base font-black text-amber-900">₹{item.totalDue.toLocaleString()}</span>
                      </div>

                      <button
                        onClick={() => handleSelectPatient(item.patient)}
                        className="bg-healthcare-600 hover:bg-healthcare-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center space-x-1 shadow-xs active:scale-95"
                      >
                        <span>Open Counter</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Hospital Collections History Ledger */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-black text-slate-850 flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-healthcare-600" />
                  <span>Hospital-Wide Transactions & Collections Ledger</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Complete ledger history across admissions, consultations, diagnostic scans, and pharmacy.
                </p>
              </div>

              {/* Status and Service Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                  {(['ALL', 'PENDING', 'PAID'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setLedgerStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg transition ${
                        ledgerStatusFilter === st
                          ? 'bg-white text-slate-900 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <select
                  value={ledgerServiceFilter}
                  onChange={(e) => setLedgerServiceFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-250 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Services</option>
                  <option value="ADMISSION">Admission</option>
                  <option value="DIAGNOSTIC">Diagnostic</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="CONSULTATION">Consultation</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl text-xs font-semibold">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3 text-left">Patient</th>
                    <th className="px-5 py-3 text-left">Service</th>
                    <th className="px-5 py-3 text-left">Description</th>
                    <th className="px-5 py-3 text-left">Invoice Status</th>
                    <th className="px-5 py-3 text-right">Amount (₹)</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                  {filteredTransactions.slice(0, 30).map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{tx.patientId?.userId?.name || 'Patient'}</p>
                        <p className="text-[10px] text-healthcare-700 font-extrabold">ID: {tx.patientId?.patientId}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border uppercase text-[9px] font-extrabold">
                          {tx.serviceType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 truncate max-w-xs text-xs text-slate-600">
                        {tx.description}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded border uppercase ${
                          tx.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-900 font-black text-sm">
                        ₹{tx.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {tx.status === 'PENDING' ? (
                          <button
                            onClick={() => tx.patientId && handleSelectPatient(tx.patientId)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shadow-2xs inline-flex items-center space-x-1"
                          >
                            <DollarSign className="h-3 w-3" />
                            <span>Collect Cash</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => tx.patientId && handleSelectPatient(tx.patientId)}
                            className="text-healthcare-600 hover:text-healthcare-800 font-bold text-xs underline"
                          >
                            View Account
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;
