import { Schema, model, Document, Types } from 'mongoose';

export interface IWard extends Document {
  name: string;
  departmentId: Types.ObjectId;
  floorId: Types.ObjectId;
  gender: 'MALE' | 'FEMALE' | 'GENERAL';
  type: 'GENERAL' | 'SEMI_PRIVATE' | 'PRIVATE' | 'ICU' | 'EMERGENCY';
  dailyRate: number; // Charges in INR per 24 hours of occupancy
  capacity: number;
}

const WardSchema = new Schema<IWard>({
  name: { type: String, required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  floorId: { type: Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'GENERAL'], default: 'GENERAL' },
  type: {
    type: String,
    enum: ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'EMERGENCY'],
    default: 'GENERAL',
    required: true,
  },
  dailyRate: { type: Number, required: true, default: 1000, min: 0 },
  capacity: { type: Number, required: true, default: 10, min: 1 },
});

// Unique ward name per floor
WardSchema.index({ name: 1, floorId: 1 }, { unique: true });

export const Ward = model<IWard>('Ward', WardSchema);
