import { Schema, model, Document, Types } from 'mongoose';

export interface IDoctorReferral extends Document {
  patientId: Types.ObjectId; // Ref Patient
  fromDoctorId: Types.ObjectId; // Ref Doctor
  toDoctorId: Types.ObjectId; // Ref Doctor
  status: 'PENDING' | 'PAID' | 'COMPLETED';
  notes?: string;
  paymentId?: Types.ObjectId; // Ref Payment
  createdAt: Date;
  updatedAt: Date;
}

const DoctorReferralSchema = new Schema<IDoctorReferral>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    fromDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    toDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'COMPLETED'],
      default: 'PENDING',
      required: true,
    },
    notes: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

export const DoctorReferral = model<IDoctorReferral>('DoctorReferral', DoctorReferralSchema);
