import { Schema, model, Document, Types } from 'mongoose';

export interface IEmergencyAlert extends Document {
  patientId: Types.ObjectId; // Ref Patient
  doctorId: Types.ObjectId; // Ref Doctor (assigned doctor)
  wardId?: Types.ObjectId; // Ref Ward (if admitted)
  admissionId?: Types.ObjectId; // Ref Admission (if admitted)
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyAlertSchema = new Schema<IEmergencyAlert>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true }
);

export const EmergencyAlert = model<IEmergencyAlert>('EmergencyAlert', EmergencyAlertSchema);
