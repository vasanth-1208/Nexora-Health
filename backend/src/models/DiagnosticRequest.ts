import { Schema, model, Document, Types } from 'mongoose';

export interface IDiagnosticRequest extends Document {
  patientId: Types.ObjectId; // Ref Patient
  doctorId: Types.ObjectId; // Ref Doctor
  testType: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'REQUESTED' | 'PAYMENT_PENDING' | 'PAID' | 'QUEUED' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED';
  completionTime?: Date;
  cost: number;
  notes?: string;
  paymentId?: Types.ObjectId; // Ref Payment
  createdAt: Date;
  updatedAt: Date;
}

const DiagnosticRequestSchema = new Schema<IDiagnosticRequest>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    testType: { type: String, required: true },
    priority: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
      default: 'ROUTINE',
      required: true,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'PAYMENT_PENDING', 'PAID', 'QUEUED', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'REQUESTED',
      required: true,
    },
    completionTime: { type: Date },
    cost: { type: Number, required: true, default: 0 },
    notes: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

export const DiagnosticRequest = model<IDiagnosticRequest>('DiagnosticRequest', DiagnosticRequestSchema);
