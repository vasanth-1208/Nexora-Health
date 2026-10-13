import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Consultation, Payment, Patient, Doctor, PatientTimeline, User, DoctorReferral } from '../models';
import { emitSocketEvent } from '../config/socket';

export const createConsultation = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, fee = 500 } = req.body; // DB _ids

    if (!patientId || !doctorId) {
      return res.status(400).json({ message: 'Patient ID and Doctor ID are required.' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // 1. Create Consultation
    const consultation = await Consultation.create({
      patientId,
      doctorId,
      status: 'WAITING',
      paymentStatus: 'PENDING',
    });

    // 2. Create Payment Transaction
    const payment = await Payment.create({
      patientId,
      serviceType: 'CONSULTATION',
      amount: Number(fee),
      status: 'PENDING',
      referenceId: consultation._id,
      description: `Outpatient consultation with ${(doctor.userId as any).name}`,
    });

    // Link payment to consultation
    consultation.paymentId = payment._id;
    await consultation.save();

    // 3. Register doctor to patient's assignedDoctors if not already in there
    if (!patient.assignedDoctors.includes(doctorId)) {
      patient.assignedDoctors.push(doctorId);
      await patient.save();
    }

    // 4. Create timeline event
    const operatorName = (req as any).user?.name || 'Reception Staff';
    await PatientTimeline.create({
      patientId,
      eventType: 'DOCTOR_ASSIGNMENT',
      description: `Assigned to ${(doctor.userId as any).name} (Specialization: ${doctor.specialization}). Consultation fee ₹${fee} generated.`,
      createdBy: operatorName,
    });

    // 5. Broadcast socket updates
    emitSocketEvent('doctor:assigned', { patientId, doctorId, consultation });
    emitSocketEvent('payment:updated', { patientId, payment });

    return res.status(201).json({
      message: 'Consultation created and doctor assigned successfully.',
      consultation,
      payment,
    });
  } catch (error: any) {
    console.error('Create consultation error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const updateConsultationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Consultation ID
    const { status, clinicalNotes } = req.body;

    const allowedStatuses = ['WAITING', 'RECEIVED', 'WITH_DOCTOR', 'COMPLETED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid consultation status: ${status}` });
    }

    const consultation = await Consultation.findById(id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      });

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    const userRole = (req as any).user?.role;
    const oldStatus = consultation.status;

    // Idempotent check
    if (oldStatus === status) {
      return res.status(200).json({ message: `Consultation already in ${status} status.`, consultation });
    }

    // Terminal states cannot be transitioned out of
    if (oldStatus === 'COMPLETED' || oldStatus === 'CANCELLED') {
      return res.status(400).json({
        message: `INVALID_TRANSITION: Cannot modify consultation in terminal state (${oldStatus}).`,
        code: 'INVALID_TRANSITION'
      });
    }

    // Allowed transition map
    const allowedTransitions: Record<string, string[]> = {
      WAITING: ['RECEIVED', 'WITH_DOCTOR', 'CANCELLED'],
      RECEIVED: ['WITH_DOCTOR', 'CANCELLED'],
      WITH_DOCTOR: ['COMPLETED', 'CANCELLED'],
    };

    const validNextStates = allowedTransitions[oldStatus] || [];
    if (!validNextStates.includes(status)) {
      return res.status(400).json({
        message: `INVALID_TRANSITION: Illegal transition from ${oldStatus} to ${status}.`,
        code: 'INVALID_TRANSITION'
      });
    }

    // Role restrictions:
    // Only DOCTOR or ADMIN can complete clinical consultation
    if (status === 'COMPLETED' && !['DOCTOR', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({
        message: 'Only medical doctors or administrative supervisors can complete clinical consultations.',
        code: 'UNAUTHORIZED_ROLE'
      });
    }

    // Only DOCTOR or ADMIN can start consultation (WITH_DOCTOR)
    if (status === 'WITH_DOCTOR' && !['DOCTOR', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({
        message: 'Only medical doctors can conduct active clinical consultations.',
        code: 'UNAUTHORIZED_ROLE'
      });
    }

    const doctorName = (consultation.doctorId as any)?.userId?.name || 'Doctor';
    consultation.status = status;

    if (clinicalNotes !== undefined) {
      consultation.clinicalNotes = clinicalNotes;
    }

    const operatorName = (req as any).user?.name || 'Hospital Staff';

    if (req.body.vitals) {
      consultation.vitals = {
        bloodPressure: req.body.vitals.bloodPressure,
        heartRate: req.body.vitals.heartRate ? Number(req.body.vitals.heartRate) : undefined,
        temperature: req.body.vitals.temperature ? Number(req.body.vitals.temperature) : undefined,
        spO2: req.body.vitals.spO2 ? Number(req.body.vitals.spO2) : undefined,
        respiratoryRate: req.body.vitals.respiratoryRate ? Number(req.body.vitals.respiratoryRate) : undefined,
        weight: req.body.vitals.weight ? Number(req.body.vitals.weight) : undefined,
        triagePriority: req.body.vitals.triagePriority || 'ROUTINE',
        nursingNotes: req.body.vitals.nursingNotes || '',
        recordedBy: operatorName,
        recordedAt: new Date(),
      };
    }

    await consultation.save();

    // Log timeline event depending on status transition
    let timelineDesc = `Consultation status changed from ${oldStatus} to ${status}.`;
    let timelineEvent = 'CONSULTATION_STATUS';

    if (status === 'RECEIVED') {
      timelineEvent = 'PATIENT_RECEIVED';
      const v = consultation.vitals;
      const vitalsSummary = v ? ` [Vitals: BP ${v.bloodPressure || 'N/A'}, HR ${v.heartRate || 'N/A'} bpm, SpO2 ${v.spO2 || 'N/A'}%, Triage: ${v.triagePriority}]` : '';
      timelineDesc = `Patient checked in by nurse at ${doctorName}'s clinic room door.${vitalsSummary}`;
    } else if (status === 'WITH_DOCTOR') {
      timelineEvent = 'CONSULTATION_STARTED';
      timelineDesc = `Consultation started with ${doctorName}.`;
    } else if (status === 'COMPLETED') {
      timelineEvent = 'CONSULTATION_COMPLETED';
      timelineDesc = `Consultation completed by ${doctorName}.${clinicalNotes ? ' Notes: ' + clinicalNotes : ''}`;

      const pId = consultation.patientId?._id || consultation.patientId;
      const dId = (consultation.doctorId as any)?._id || consultation.doctorId;

      // Update associated referral if exists
      if (consultation.referralId) {
        await DoctorReferral.findByIdAndUpdate(consultation.referralId, { status: 'COMPLETED' });
      }

      // Also update any pending referrals for this patient assigned to this doctor
      await DoctorReferral.updateMany(
        { patientId: pId, toDoctorId: dId, status: 'PENDING' },
        { status: 'COMPLETED' }
      );

      emitSocketEvent('doctor:referred', {
        patientId: pId,
        status: 'COMPLETED',
        consultationId: id,
      });
    }

    await PatientTimeline.create({
      patientId: consultation.patientId._id,
      eventType: timelineEvent,
      description: timelineDesc,
      createdBy: operatorName,
    });

    // Broadcast update
    emitSocketEvent('patient:status', { consultationId: id, status, patientId: consultation.patientId._id });
    if (status === 'RECEIVED') {
      emitSocketEvent('patient:received', { patientId: consultation.patientId._id, doctorName });
    }

    return res.status(200).json({
      message: 'Consultation status updated successfully.',
      consultation,
    });
  } catch (error: any) {
    console.error('Update consultation status error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getDoctorConsultations = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    let effectiveDocId: any = doctorId;

    // Resolve if doctorId passed is username (e.g. 'doctor1') or employeeId
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      const u = await User.findOne({ username: doctorId });
      if (u) {
        const d = await Doctor.findOne({ userId: u._id });
        if (d) effectiveDocId = d._id;
      } else {
        const d = await Doctor.findOne({ employeeId: new RegExp(`^${doctorId}$`, 'i') });
        if (d) effectiveDocId = d._id;
      }
    }

    // Self-healing: if any DoctorReferrals exist for this referee doctor without a consultation, create it
    const incomingReferrals = await DoctorReferral.find({ toDoctorId: effectiveDocId });
    for (const ref of incomingReferrals) {
      const existing = await Consultation.findOne({
        patientId: ref.patientId,
        doctorId: effectiveDocId,
        referralId: ref._id,
      });
      if (!existing) {
        await Consultation.create({
          patientId: ref.patientId,
          doctorId: effectiveDocId,
          status: ref.status === 'COMPLETED' ? 'COMPLETED' : 'WAITING',
          paymentStatus: 'PENDING',
          paymentId: ref.paymentId,
          isReferral: true,
          referralId: ref._id,
          referredByDoctorId: ref.fromDoctorId,
          referralNotes: ref.notes,
        });
        await Patient.findByIdAndUpdate(ref.patientId, {
          $addToSet: { assignedDoctors: effectiveDocId }
        });
      } else if (existing.status === 'COMPLETED' && ref.status === 'PENDING') {
        ref.status = 'COMPLETED';
        await ref.save();
      }
    }

    const consultations = await Consultation.find({ doctorId: effectiveDocId })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate({
        path: 'referredByDoctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'departmentId', select: 'name code' },
        ]
      })
      .populate('referralId')
      .sort({ createdAt: 1 }); // FIFO queue
    return res.status(200).json(consultations);
  } catch (error: any) {
    console.error('Get doctor queue error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getPatientAppointments = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const consultations = await Consultation.find({ patientId })
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'departmentId', select: 'name code' }
        ]
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(consultations);
  } catch (error: any) {
    console.error('Get patient appointments error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getAllConsultations = async (req: Request, res: Response) => {
  try {
    const consultations = await Consultation.find({})
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name' }
      })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(consultations);
  } catch (error: any) {
    console.error('Get all consultations error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
