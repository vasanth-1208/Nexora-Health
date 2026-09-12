import React, { useState } from 'react';
import { Activity, Heart, Thermometer, Wind, Weight } from 'lucide-react';
import { Modal } from './Modal';

interface VitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientIdCode: string;
  onSubmitVitals: (vitals: {
    bloodPressure: string;
    heartRate?: number;
    temperature?: number;
    spO2?: number;
    respiratoryRate?: number;
    weight?: number;
    triagePriority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
    nursingNotes: string;
  }) => Promise<void>;
}

export const VitalsModal: React.FC<VitalsModalProps> = ({
  isOpen,
  onClose,
  patientName,
  patientIdCode,
  onSubmitVitals,
}) => {
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [heartRate, setHeartRate] = useState<number | ''>(74);
  const [temperature, setTemperature] = useState<number | ''>(98.6);
  const [spO2, setSpO2] = useState<number | ''>(99);
  const [respiratoryRate, setRespiratoryRate] = useState<number | ''>(16);
  const [weight, setWeight] = useState<number | ''>(68);
  const [triagePriority, setTriagePriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [nursingNotes, setNursingNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmitVitals({
        bloodPressure,
        heartRate: heartRate === '' ? undefined : Number(heartRate),
        temperature: temperature === '' ? undefined : Number(temperature),
        spO2: spO2 === '' ? undefined : Number(spO2),
        respiratoryRate: respiratoryRate === '' ? undefined : Number(respiratoryRate),
        weight: weight === '' ? undefined : Number(weight),
        triagePriority,
        nursingNotes,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit clinical vitals.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinical Intake & Vitals Assessment"
      subtitle={`Recording baseline triage vitals for ${patientName} (${patientIdCode})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Triage Priority Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Triage Severity Category
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {(['ROUTINE', 'URGENT', 'EMERGENCY'] as const).map((p) => {
              const selected = triagePriority === p;
              const colorClasses = {
                ROUTINE: selected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                URGENT: selected ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border-amber-200',
                EMERGENCY: selected ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 border-rose-200',
              }[p];

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTriagePriority(p)}
                  className={`py-2 text-xs font-black rounded-xl border transition ${colorClasses}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vitals Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100">
          {/* BP */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center space-x-1">
              <Activity className="h-3 w-3 text-healthcare-600" />
              <span>Blood Pressure</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 120/80"
              value={bloodPressure}
              onChange={(e) => setBloodPressure(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-healthcare-500 font-mono"
            />
          </div>

          {/* Heart Rate */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center space-x-1">
              <Heart className="h-3 w-3 text-rose-600" />
              <span>Heart Rate (bpm)</span>
            </label>
            <input
              type="number"
              placeholder="74"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-healthcare-500 font-mono"
            />
          </div>

          {/* SpO2 */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center space-x-1">
              <Activity className="h-3 w-3 text-blue-600" />
              <span>SpO2 Oxygen (%)</span>
            </label>
            <input
              type="number"
              placeholder="99"
              value={spO2}
              onChange={(e) => setSpO2(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-healthcare-500 font-mono"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center space-x-1">
              <Thermometer className="h-3 w-3 text-amber-600" />
              <span>Temp (°F)</span>
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="98.6"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-healthcare-500 font-mono"
            />
          </div>

          {/* Respiratory Rate */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center space-x-1">
              <Wind className="h-3 w-3 text-teal-600" />
              <span>Resp Rate (/min)</span>
            </label>
            <input
              type="number"
              placeholder="16"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-healthcare-500 font-mono"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center space-x-1">
              <Weight className="h-3 w-3 text-indigo-600" />
              <span>Weight (kg)</span>
            </label>
            <input
              type="number"
              placeholder="68"
              value={weight}
              onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-healthcare-500 font-mono"
            />
          </div>
        </div>

        {/* Nursing Notes */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
            Clinical Observations / Nursing Notes
          </label>
          <textarea
            rows={2}
            value={nursingNotes}
            onChange={(e) => setNursingNotes(e.target.value)}
            placeholder="e.g. Patient presents with mild dizziness, ambulatory without assistance..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-healthcare-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-healthcare-600 hover:bg-healthcare-700 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Recording Vitals...' : 'Confirm Vitals & Check In'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
