import { Request, Response } from 'express';
import { DoctorReferral, Payment, Patient, Doctor, PatientTimeline, Consultation } from '../models';
import { emitSocketEvent } from '../config/socket';

export const createReferral = async (req: Request, res: Response) => {
  try {
    const { patientId, notes, fee = 300 } = req.body;
    const fromDoctorId = req.body.fromDoctorId || req.body.referringDoctorId;
    const toDoctorId = req.body.toDoctorId || req.body.referredDoctorId;

    if (!patientId || !fromDoctorId || !toDoctorId) {
      return res.status(400).json({ message: 'Patient, From Doctor, and To Doctor are required.' });
    }

    const fromDoc = await Doctor.findById(fromDoctorId).populate('userId', 'name');
    const toDoc = await Doctor.findById(toDoctorId).populate('userId', 'name');

    if (!fromDoc || !toDoc) {
      return res.status(404).json({ message: 'Referrer or Referee doctor not found.' });
    }

    // 1. Create Referral
    const referral = await DoctorReferral.create({
      patientId,
      fromDoctorId,
      toDoctorId,
      status: 'PENDING',
      notes,
    });

    // 2. Create Payment ledger
    const payment = await Payment.create({
      patientId,
      serviceType: 'REFERRAL',
      amount: Number(fee),
      status: 'PENDING',
      referenceId: referral._id,
      description: `Doctor Referral: from ${(fromDoc.userId as any).name} to ${(toDoc.userId as any).name}`,
    });

    referral.paymentId = payment._id;
    await referral.save();

    // 3. Create Consultation in referee doctor's queue so patient appears in their patient list
    const consultation = await Consultation.create({
      patientId,
      doctorId: toDoctorId,
      status: 'WAITING',
      paymentStatus: 'PENDING',
      paymentId: payment._id,
      isReferral: true,
      referralId: referral._id,
      referredByDoctorId: fromDoctorId,
      referralNotes: notes,
    });

    // 4. Add to referee doctor's assigned list in patient profile
    const patientObj = await Patient.findById(patientId);
    if (patientObj && !patientObj.assignedDoctors.includes(toDoctorId)) {
      patientObj.assignedDoctors.push(toDoctorId);
      await patientObj.save();
    }

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId,
      eventType: 'DOCTOR_REFERRED',
      description: `Referred to ${(toDoc.userId as any).name} (Specialization: ${toDoc.specialization}) by ${(fromDoc.userId as any).name}. Referral fee ₹${fee} generated.`,
      createdBy: operatorName,
    });

    emitSocketEvent('doctor:referred', { patientId, referral, consultation });
    emitSocketEvent('doctor:assigned', { patientId, doctorId: toDoctorId, consultation });
    emitSocketEvent('payment:updated', { patientId, payment });

    return res.status(201).json({
      message: 'Doctor referral created successfully.',
      referral,
      consultation,
      payment,
    });
  } catch (error: any) {
    console.error('Create referral error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getDoctorReferrals = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    
    // Auto-sync any PENDING referral whose referee consultation is already COMPLETED
    const pendingReferrals = await DoctorReferral.find({ toDoctorId: doctorId, status: 'PENDING' });
    for (const ref of pendingReferrals) {
      const compConsult = await Consultation.findOne({
        patientId: ref.patientId,
        doctorId,
        status: 'COMPLETED',
      });
      if (compConsult) {
        ref.status = 'COMPLETED';
        await ref.save();
      }
    }

    // Get referrals where doctor is the referee
    const referrals = await DoctorReferral.find({ toDoctorId: doctorId })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate({
        path: 'fromDoctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'departmentId', select: 'name code' },
        ]
      })
      .populate({
        path: 'toDoctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'departmentId', select: 'name code' },
        ]
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(referrals);
  } catch (error: any) {
    console.error('Get doctor referrals error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getPatientReferrals = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Auto-sync any PENDING referral whose referee consultation is already COMPLETED
    const pendingReferrals = await DoctorReferral.find({ patientId, status: 'PENDING' });
    for (const ref of pendingReferrals) {
      const compConsult = await Consultation.findOne({
        patientId,
        doctorId: ref.toDoctorId,
        status: 'COMPLETED',
      });
      if (compConsult) {
        ref.status = 'COMPLETED';
        await ref.save();
      }
    }

    const referrals = await DoctorReferral.find({ patientId })
      .populate({
        path: 'fromDoctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'departmentId', select: 'name code' },
        ]
      })
      .populate({
        path: 'toDoctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'departmentId', select: 'name code' },
        ]
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(referrals);
  } catch (error: any) {
    console.error('Get patient referrals error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateReferral = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const toDoctorId = req.body.toDoctorId || req.body.referredDoctorId;

    const referral = await DoctorReferral.findById(id);
    if (!referral) {
      return res.status(404).json({ message: 'Referral record not found.' });
    }

    if (referral.status !== 'PENDING') {
      return res.status(400).json({ message: `Cannot edit referral in ${referral.status} status.` });
    }

    if (toDoctorId && toDoctorId !== referral.toDoctorId.toString()) {
      const toDoc = await Doctor.findById(toDoctorId).populate('userId', 'name');
      if (!toDoc) return res.status(404).json({ message: 'Referred doctor not found.' });
      referral.toDoctorId = toDoctorId;

      // Update associated consultation doctor
      await Consultation.findOneAndUpdate(
        { referralId: referral._id },
        { doctorId: toDoctorId, referralNotes: notes || referral.notes }
      );

      // Add to doctor's assigned doctors in patient
      const patientObj = await Patient.findById(referral.patientId);
      if (patientObj && !patientObj.assignedDoctors.includes(toDoctorId)) {
        patientObj.assignedDoctors.push(toDoctorId);
        await patientObj.save();
      }

      emitSocketEvent('doctor:assigned', { patientId: referral.patientId, doctorId: toDoctorId });
    }

    if (notes !== undefined) {
      referral.notes = notes;
      await Consultation.findOneAndUpdate(
        { referralId: referral._id },
        { referralNotes: notes }
      );
    }

    await referral.save();

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId: referral.patientId,
      eventType: 'DOCTOR_REFERRED',
      description: `Specialist referral updated by ${operatorName}.`,
      createdBy: operatorName,
    });

    emitSocketEvent('doctor:referred', { patientId: referral.patientId, referral });

    return res.status(200).json({
      message: 'Referral updated successfully.',
      referral,
    });
  } catch (error: any) {
    console.error('Update referral error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const deleteReferral = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const referral = await DoctorReferral.findById(id);
    if (!referral) {
      return res.status(404).json({ message: 'Referral record not found.' });
    }

    if (referral.status !== 'PENDING') {
      return res.status(400).json({ message: `Cannot cancel referral in ${referral.status} status.` });
    }

    // Delete consultation created for referee doctor
    await Consultation.deleteMany({ referralId: referral._id });

    // Delete payment ledger if unpaid
    if (referral.paymentId) {
      await Payment.findByIdAndDelete(referral.paymentId);
    }

    await DoctorReferral.findByIdAndDelete(id);

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId: referral.patientId,
      eventType: 'DOCTOR_REFERRED',
      description: `Specialist referral cancelled by ${operatorName}.`,
      createdBy: operatorName,
    });

    emitSocketEvent('doctor:referred', { patientId: referral.patientId, referralId: id, deleted: true });

    return res.status(200).json({
      message: 'Referral cancelled successfully.',
    });
  } catch (error: any) {
    console.error('Delete referral error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

