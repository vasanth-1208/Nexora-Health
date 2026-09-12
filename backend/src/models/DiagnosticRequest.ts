import { Schema, model, Document, Types } from 'mongoose';

export interface IDiagnosticRequest extends Document {
  patientId: Types.ObjectId; // Ref Patient
  doctorId: Types.ObjectId; // Ref Doctor
  testType: string;
  modality?: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'REQUESTED' | 'PAYMENT_PENDING' | 'PAID' | 'QUEUED' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED';
  completionTime?: Date;
  cost: number;
  notes?: string;
  paymentId?: Types.ObjectId; // Ref Payment
  technician?: string;
  findings?: string;
  impression?: string;
  reportText?: string;
  reportTimestamp?: Date;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DiagnosticRequestSchema = new Schema<IDiagnosticRequest>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    testType: { type: String, required: true },
    modality: { type: String },
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
      index: true,
    },
    completionTime: { type: Date },
    cost: { type: Number, required: true, default: 0 },
    notes: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', index: true },
    technician: { type: String },
    findings: { type: String },
    impression: { type: String },
    reportText: { type: String },
    reportTimestamp: { type: Date },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

export const DiagnosticRequest = model<IDiagnosticRequest>('DiagnosticRequest', DiagnosticRequestSchema);
