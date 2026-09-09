import { Schema, model, Document, Types } from 'mongoose';

export interface IPrescribedMedicine {
  name: string;
  quantity: number;
  status: 'WAITING' | 'PROCESSING' | 'READY' | 'DISPENSED';
  cost: number;
  paymentStatus: 'PENDING' | 'PAID';
  days?: number;
  timing?: string;
  dosagePerTime?: number;
}

export interface IPrescription extends Document {
  patientId: Types.ObjectId; // Ref Patient
  doctorId: Types.ObjectId; // Ref Doctor
  medicines: IPrescribedMedicine[];
  totalCost: number;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID';
  paymentId?: Types.ObjectId; // Ref Payment
  createdAt: Date;
  updatedAt: Date;
}

const PrescribedMedicineSchema = new Schema<IPrescribedMedicine>({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: {
    type: String,
    enum: ['WAITING', 'PROCESSING', 'READY', 'DISPENSED'],
    default: 'WAITING',
    required: true,
  },
  cost: { type: Number, required: true, default: 0 },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING', required: true },
  days: { type: Number, default: 1 },
  timing: { type: String, default: '1-0-1 (Morning & Night - After Food)' },
  dosagePerTime: { type: Number, default: 1 },
});

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    medicines: [PrescribedMedicineSchema],
    totalCost: { type: Number, required: true, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'PARTIALLY_PAID'],
      default: 'PENDING',
      required: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

export const Prescription = model<IPrescription>('Prescription', PrescriptionSchema);
