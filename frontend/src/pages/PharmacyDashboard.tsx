import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

const PharmacyDashboard: React.FC = () => {
  const { socket } = useSocket();
  const [rxQueue, setRxQueue] = useState<any[]>([]);

  useEffect(() => {
    fetchRxQueue();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('pharmacy:queued', () => {
      fetchRxQueue();
    });

    socket.on('payment:updated', () => {
      fetchRxQueue();
    });

    return () => {
      socket.off('pharmacy:queued');
      socket.off('payment:updated');
    };
  }, [socket]);

  const fetchRxQueue = async () => {
    try {
      const res = await request('/pharmacy/queue');
      setRxQueue(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (queueId: string, status: string) => {
    try {
      await request(`/pharmacy/queue/${queueId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      fetchRxQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to update prescription status.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PROCESSING': return 'bg-amber-50 text-amber-800 border-amber-150 animate-pulse';
      case 'READY': return 'bg-indigo-50 text-indigo-800 border-indigo-150';
      case 'DISPENSED': return 'bg-emerald-100 text-emerald-850';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-850 flex items-center space-x-2">
            <FileText className="h-6 w-6 text-healthcare-600" />
            <span>Hospital Pharmacy portal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Verify clinical prescriptions, package medicines, and check-out patients.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-md font-bold text-slate-850 mb-4">Incoming Pharmacy Orders Queue</h2>
        
        {rxQueue.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center font-semibold">No active prescriptions in the queue.</p>
        ) : (
          <div className="space-y-4">
            {rxQueue.map((item) => {
              const rx = item.prescriptionId;
              const isPaid = rx?.paymentStatus === 'PAID';

              return (
                <div key={item._id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center text-xs font-semibold">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <h3 className="font-extrabold text-sm text-slate-850">
                        {item.patientId?.userId?.name || 'Patient'} ({item.patientId?.patientId})
                      </h3>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        isPaid ? 'bg-emerald-50 text-emerald-805 border-emerald-200' : 'bg-red-50 text-red-750 border-red-200'
                      }`}>
                        {isPaid ? 'PAID' : 'PAYMENT PENDING'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 max-w-xl text-[11px] text-slate-650 space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Prescribed Items</p>
                      {rx?.medicines?.map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between space-x-6">
                          <span>{m.name} x {m.quantity}</span>
                          <span className="text-slate-400">Cost: ₹{m.cost * m.quantity}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-100 pt-1 flex justify-between font-bold text-slate-800">
                        <span>Total Prescription Cost</span>
                        <span>₹{rx?.totalCost || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 flex gap-2 shrink-0 self-end md:self-center">
                    {item.status === 'WAITING' && (
                      <button
                        onClick={() => handleUpdateStatus(item._id, 'PROCESSING')}
                        className="bg-healthcare-650 hover:bg-healthcare-600 text-white font-bold px-3 py-2 rounded-lg text-xs transition shadow-sm"
                      >
                        Start Packaging
                      </button>
                    )}
                    {item.status === 'PROCESSING' && (
                      <button
                        onClick={() => handleUpdateStatus(item._id, 'READY')}
                        className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold px-3 py-2 rounded-lg text-xs transition shadow-sm"
                      >
                        Package Ready
                      </button>
                    )}
                    {item.status === 'READY' && (
                      <div>
                        {isPaid ? (
                          <button
                            onClick={() => handleUpdateStatus(item._id, 'DISPENSED')}
                            className="bg-emerald-600 hover:bg-emerald-550 text-white font-bold px-3 py-2 rounded-lg text-xs transition shadow-sm"
                          >
                            Dispense Medicines
                          </button>
                        ) : (
                          <span className="text-[10px] text-red-650 flex items-center space-x-1 font-bold bg-red-50 p-2 rounded-lg border border-red-200">
                            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                            <span>Await Cashier Payment</span>
                          </span>
                        )}
                      </div>
                    )}
                    {item.status === 'DISPENSED' && (
                      <span className="text-[10px] text-emerald-705 font-bold flex items-center space-x-1">
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <span>Dispensed & Collected</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyDashboard;
