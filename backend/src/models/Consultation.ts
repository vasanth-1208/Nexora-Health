import { Schema, model, Document, Types } from 'mongoose';

export interface INurseVitals {
  bloodPressure?: string; // e.g. "120/80"
  heartRate?: number; // e.g. 74 bpm
  temperature?: number; // e.g. 98.6 F
  spO2?: number; // e.g. 99%
  respiratoryRate?: number;
  weight?: number; // kg
  triagePriority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  nursingNotes?: string;
  recordedBy?: string;
  recordedAt?: Date;
}

export interface IConsultation extends Document {
  patientId: Types.ObjectId; // Ref Patient
  doctorId: Types.ObjectId; // Ref Doctor
  status: 'WAITING' | 'RECEIVED' | 'WITH_DOCTOR' | 'COMPLETED' | 'CANCELLED';
  clinicalNotes?: string;
  paymentStatus: 'PENDING' | 'PAID';
  paymentId?: Types.ObjectId; // Ref Payment
  isReferral?: boolean;
  referralId?: Types.ObjectId; // Ref DoctorReferral
  referredByDoctorId?: Types.ObjectId; // Ref Doctor
  referralNotes?: string;
  vitals?: INurseVitals;
  createdAt: Date;
  updatedAt: Date;
}

const NurseVitalsSchema = new Schema<INurseVitals>({
  bloodPressure: { type: String },
  heartRate: { type: Number },
  temperature: { type: Number },
  spO2: { type: Number },
  respiratoryRate: { type: Number },
  weight: { type: Number },
  triagePriority: {
    type: String,
    enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
    default: 'ROUTINE',
    required: true,
  },
  nursingNotes: { type: String },
  recordedBy: { type: String },
  recordedAt: { type: Date, default: Date.now },
});

const ConsultationSchema = new Schema<IConsultation>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    status: {
      type: String,
      enum: ['WAITING', 'RECEIVED', 'WITH_DOCTOR', 'COMPLETED', 'CANCELLED'],
      default: 'WAITING',
      required: true,
      index: true,
    },
    clinicalNotes: { type: String },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    isReferral: { type: Boolean, default: false },
    referralId: { type: Schema.Types.ObjectId, ref: 'DoctorReferral' },
    referredByDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    referralNotes: { type: String },
    vitals: { type: NurseVitalsSchema },
  },
  { timestamps: true }
);

export const Consultation = model<IConsultation>('Consultation', ConsultationSchema);
