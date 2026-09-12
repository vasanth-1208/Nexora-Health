import { PatientTimeline } from '../models';
import { emitSocketEvent } from '../config/socket';

export class PatientTimelineService {
  /**
   * Log an immutable patient journey event and broadcast to timeline listeners.
   */
  static async logEvent(
    patientId: any,
    eventType: string,
    description: string,
    createdBy: string = 'System'
  ) {
    try {
      const event = await PatientTimeline.create({
        patientId,
        eventType,
        description,
        createdBy,
        timestamp: new Date(),
      });

      emitSocketEvent('timeline:new_event', { patientId, event }, `room:patient_${patientId}`);
      return event;
    } catch (err) {
      console.error('[TimelineService] Failed to record timeline event:', err);
    }
  }
}
