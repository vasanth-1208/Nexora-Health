import { Schema, model, Document, Types } from 'mongoose';

export interface IWard extends Document {
  name: string;
  departmentId: Types.ObjectId;
  floorId: Types.ObjectId;
  gender: 'MALE' | 'FEMALE' | 'GENERAL';
}

const WardSchema = new Schema<IWard>({
  name: { type: String, required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  floorId: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'GENERAL'], default: 'GENERAL' },
});

// Unique ward name per floor
WardSchema.index({ name: 1, floorId: 1 }, { unique: true });

export const Ward = model<IWard>('Ward', WardSchema);
