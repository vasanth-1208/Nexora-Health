import { Schema, model, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string; // e.g. "GM" for General Medicine
}

const DepartmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
});

export const Department = model<IDepartment>('Department', DepartmentSchema);
