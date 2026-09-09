import { Schema, model, Document, Types } from 'mongoose';

export interface IDoctor extends Document {
  userId: Types.ObjectId; // Ref User
  employeeId: string; // e.g. "D1001"
  departmentId: Types.ObjectId; // Ref Department
  specialization: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true, unique: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    specialization: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Doctor = model<IDoctor>('Doctor', DoctorSchema);
