import { Schema, model, Document, Types } from 'mongoose';

export interface IPatientTimeline extends Document {
  patientId: Types.ObjectId; // Ref Patient
  eventType: string; // e.g. "REGISTRATION", "DOCTOR_ASSIGNMENT", "CONSULTATION_STARTED", "ADMISSION_RECOMMENDED", etc.
  description: string;
  createdBy: string; // Name or role of operator
  timestamp: Date;
}

const PatientTimelineSchema = new Schema<IPatientTimeline>({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  eventType: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
});

export const PatientTimeline = model<IPatientTimeline>('PatientTimeline', PatientTimelineSchema);
