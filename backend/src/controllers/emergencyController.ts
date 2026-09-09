import { Request, Response } from 'express';
import { EmergencyAlert, Patient, PatientTimeline, Notification, Doctor } from '../models';
import { emitSocketEvent } from '../config/socket';

export const triggerEmergency = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, description } = req.body;

    if (!patientId || !doctorId || !description) {
      return res.status(400).json({ message: 'Patient, Doctor, and description are required.' });
    }

    const patient = await Patient.findById(patientId).populate('userId', 'name');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const patientName = (patient.userId as any).name;
    const doctorName = (doctor.userId as any).name;

    // Create the alert
    const alert = await EmergencyAlert.create({
      patientId,
      doctorId,
      wardId: patient.currentAdmissionId ? (patient as any).wardId : undefined,
      description,
      isActive: true,
    });

    // Create timeline event
    await PatientTimeline.create({
      patientId,
      eventType: 'EMERGENCY_ALERT',
      description: `CRITICAL: Emergency alert triggered by ${doctorName}. Condition: ${description}`,
      createdBy: doctorName,
    });

    // Save Notifications for role dashboards
    const message = `EMERGENCY ALERT: Patient ${patientName} (${patient.patientId}) - ${description}`;
    
    await Notification.create([
      { recipientId: 'DOCTOR', message, type: 'EMERGENCY' },
      { recipientId: 'WARD_STAFF', message, type: 'EMERGENCY' },
      { recipientId: 'NURSE', message, type: 'EMERGENCY' },
      { recipientId: patientId.toString(), message: `Emergency team has been alerted for your location.`, type: 'EMERGENCY' }
    ]);

    // Broadcast Socket.IO events
    emitSocketEvent('emergency:alert', {
      alertId: alert._id,
      patientId,
      patientIdCode: patient.patientId,
      patientName,
      doctorName,
      description,
      timestamp: alert.createdAt
    });

    emitSocketEvent('notification:new', { recipientId: 'DOCTOR', message, type: 'EMERGENCY' });
    emitSocketEvent('notification:new', { recipientId: 'WARD_STAFF', message, type: 'EMERGENCY' });
    emitSocketEvent('notification:new', { recipientId: 'NURSE', message, type: 'EMERGENCY' });

    return res.status(201).json({
      message: 'Emergency alert triggered and broadcast successfully.',
      alert,
    });
  } catch (error: any) {
    console.error('Trigger emergency error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getActiveEmergencies = async (req: Request, res: Response) => {
  try {
    const alerts = await EmergencyAlert.find({ isActive: true })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(alerts);
  } catch (error: any) {
    console.error('Get active emergencies error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const resolveEmergency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Alert ID

    const alert = await EmergencyAlert.findById(id);
    if (!alert) {
      return res.status(404).json({ message: 'Emergency alert not found.' });
    }

    alert.isActive = false;
    await alert.save();

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId: alert.patientId,
      eventType: 'EMERGENCY_RESOLVED',
      description: `Emergency alert resolved by medical staff.`,
      createdBy: operatorName,
    });

    emitSocketEvent('emergency:resolved', { alertId: id, patientId: alert.patientId });

    return res.status(200).json({
      message: 'Emergency alert resolved successfully.',
      alert,
    });
  } catch (error: any) {
    console.error('Resolve emergency error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
