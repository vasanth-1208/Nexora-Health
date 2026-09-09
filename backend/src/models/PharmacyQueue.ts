import { Schema, model, Document, Types } from 'mongoose';

export interface IPharmacyQueue extends Document {
  patientId: Types.ObjectId; // Ref Patient
  prescriptionId: Types.ObjectId; // Ref Prescription
  status: 'WAITING' | 'PROCESSING' | 'READY' | 'DISPENSED';
  createdAt: Date;
  updatedAt: Date;
}

const PharmacyQueueSchema = new Schema<IPharmacyQueue>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription', required: true },
    status: {
      type: String,
      enum: ['WAITING', 'PROCESSING', 'READY', 'DISPENSED'],
      default: 'WAITING',
      required: true,
    },
  },
  { timestamps: true }
);

export const PharmacyQueue = model<IPharmacyQueue>('PharmacyQueue', PharmacyQueueSchema);
