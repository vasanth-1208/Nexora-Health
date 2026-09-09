import { Schema, model, Document, Types } from 'mongoose';

export interface IConsultation extends Document {
  patientId: Types.ObjectId; // Ref Patient
  doctorId: Types.ObjectId; // Ref Doctor
  status: 'WAITING' | 'RECEIVED' | 'WITH_DOCTOR' | 'COMPLETED';
  clinicalNotes?: string;
  paymentStatus: 'PENDING' | 'PAID';
  paymentId?: Types.ObjectId; // Ref Payment
  isReferral?: boolean;
  referralId?: Types.ObjectId; // Ref DoctorReferral
  referredByDoctorId?: Types.ObjectId; // Ref Doctor
  referralNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationSchema = new Schema<IConsultation>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    status: {
      type: String,
      enum: ['WAITING', 'RECEIVED', 'WITH_DOCTOR', 'COMPLETED'],
      default: 'WAITING',
      required: true,
    },
    clinicalNotes: { type: String },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    isReferral: { type: Boolean, default: false },
    referralId: { type: Schema.Types.ObjectId, ref: 'DoctorReferral' },
    referredByDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    referralNotes: { type: String },
  },
  { timestamps: true }
);

export const Consultation = model<IConsultation>('Consultation', ConsultationSchema);
