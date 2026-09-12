import { Schema, model, Document, Types } from 'mongoose';

export interface IBed extends Document {
  bedId: string; // e.g. "GM-M-001"
  bedSetId: Types.ObjectId;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'BLOCKED';
  currentPatientId?: Types.ObjectId;
  currentAdmissionId?: Types.ObjectId;
  reservedTime?: Date;
  occupiedTime?: Date;
  maintenanceReason?: string;
}

const BedSchema = new Schema<IBed>({
  bedId: { type: String, required: true, unique: true, index: true },
  bedSetId: { type: Schema.Types.ObjectId, ref: 'BedSet', required: true, index: true },
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'BLOCKED'],
    default: 'AVAILABLE',
    required: true,
    index: true,
  },
  currentPatientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  currentAdmissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
  reservedTime: { type: Date },
  occupiedTime: { type: Date },
  maintenanceReason: { type: String },
});

BedSchema.index({ status: 1, bedSetId: 1 });

export const Bed = model<IBed>('Bed', BedSchema);
