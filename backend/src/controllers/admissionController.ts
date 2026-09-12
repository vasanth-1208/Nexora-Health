import { Request, Response } from 'express';
import { Admission, Bed, Payment, Patient, Ward, WardChangeRequest, PatientTimeline, Invoice } from '../models';
import { emitSocketEvent } from '../config/socket';
import { BedService } from '../services/bedService';
import { BillingService } from '../services/billingService';
import { PatientTimelineService } from '../services/patientTimelineService';

export const recommendAdmission = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, wardId } = req.body;

    if (!patientId || !doctorId || !wardId) {
      return res.status(400).json({ message: 'Patient, Doctor, and Ward are required.' });
    }

    const ward = await Ward.findById(wardId).populate('departmentId');
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found.' });
    }

    // Check if patient already has a RECOMMENDED admission to avoid repeated duplicate creations
    let admission = await Admission.findOne({ patientId, admissionStatus: 'RECOMMENDED' });
    let isUpdate = false;

    if (admission) {
      admission.wardId = wardId;
      admission.doctorId = doctorId;
      await admission.save();
      isUpdate = true;
    } else {
      admission = await Admission.create({
        patientId,
        doctorId,
        wardId,
        admissionStatus: 'RECOMMENDED',
        paymentStatus: 'PENDING',
      });
    }

    // Link admission recommendation to Patient record so currentAdmissionId is immediately updated
    await Patient.findByIdAndUpdate(patientId, { currentAdmissionId: admission._id });

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId,
      eventType: 'ADMISSION_RECOMMENDED',
      description: `${isUpdate ? 'Updated admission recommendation' : 'Admission recommended'} to ${ward.name} (${(ward.departmentId as any).name}) by physician.`,
      createdBy: operatorName,
    });

    emitSocketEvent('admission:updated', { patientId, admission });

    return res.status(isUpdate ? 200 : 201).json({
      message: isUpdate ? 'Admission recommendation updated successfully.' : 'Admission recommended successfully.',
      admission,
    });
  } catch (error: any) {
    console.error('Recommend admission error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const updateAdmissionRecommendation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { wardId, doctorId } = req.body;

    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    if (admission.admissionStatus !== 'RECOMMENDED') {
      return res.status(400).json({ message: `Cannot change ward recommendation. Current admission status is ${admission.admissionStatus}.` });
    }

    const ward = await Ward.findById(wardId).populate('departmentId');
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found.' });
    }

    admission.wardId = wardId;
    if (doctorId) admission.doctorId = doctorId;
    await admission.save();

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId: admission.patientId,
      eventType: 'ADMISSION_RECOMMENDED',
      description: `Admission recommendation updated to ${ward.name} (${(ward.departmentId as any).name}) by physician.`,
      createdBy: operatorName,
    });

    emitSocketEvent('admission:updated', { patientId: admission.patientId, admission });

    return res.status(200).json({
      message: 'Admission recommendation updated successfully.',
      admission,
    });
  } catch (error: any) {
    console.error('Update admission error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const cancelAdmissionRecommendation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    if (admission.admissionStatus !== 'RECOMMENDED') {
      return res.status(400).json({ message: `Cannot cancel admission in ${admission.admissionStatus} status.` });
    }

    await Admission.findByIdAndDelete(id);
    await Patient.findByIdAndUpdate(admission.patientId, { $unset: { currentAdmissionId: 1 } });

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId: admission.patientId,
      eventType: 'ADMISSION_RECOMMENDED',
      description: `Admission recommendation cancelled by physician.`,
      createdBy: operatorName,
    });

    emitSocketEvent('admission:updated', { patientId: admission.patientId, admission: null });

    return res.status(200).json({
      message: 'Admission recommendation cancelled successfully.',
    });
  } catch (error: any) {
    console.error('Cancel admission error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const payAndReserveAdmission = async (req: Request, res: Response) => {
  try {
    const { admissionId, bedId, amount = 2000 } = req.body;

    if (!admissionId || !bedId) {
      return res.status(400).json({ message: 'Admission ID and Bed ID are required.' });
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    const bed = await Bed.findById(bedId).populate({
      path: 'bedSetId',
      populate: { path: 'wardId' }
    });
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found.' });
    }

    if (bed.status !== 'AVAILABLE') {
      return res.status(400).json({ message: `Bed is not available. Current status: ${bed.status}` });
    }

    // RULE 2: Patient/relation can select a bed only from the doctor-approved ward.
    const bedWardId = (bed.bedSetId as any).wardId._id.toString();
    const recommendedWardId = admission.wardId.toString();

    if (bedWardId !== recommendedWardId) {
      return res.status(400).json({
        message: 'Rule Violation: Patient can only select a bed from the doctor-approved ward.',
        recommendedWardId,
        selectedBedWardId: bedWardId
      });
    }

    // 1. Concurrency-Safe Atomic Bed Reservation
    let reservedBed;
    try {
      reservedBed = await BedService.reserveBed(bedId, admission.patientId, admission._id);
    } catch (err: any) {
      if (err.message && err.message.includes('CONCURRENCY_CONFLICT')) {
        return res.status(409).json({
          message: 'Concurrency Conflict: This bed was just reserved by another receptionist. Please select an alternate bed.',
        });
      }
      throw err;
    }

    // 2. Process payment (mark PAID immediately for admission reservation deposit)
    const payment = await Payment.create({
      patientId: admission.patientId,
      serviceType: 'ADMISSION',
      amount: Number(amount),
      status: 'PAID',
      referenceId: admission._id,
      description: `Initial admission deposit and bed reservation for bed ${reservedBed.bedId}`,
    });

    // 3. Update Admission status to RESERVED and set bedId
    admission.admissionStatus = 'RESERVED';
    admission.paymentStatus = 'PAID';
    admission.paymentId = payment._id;
    admission.bedId = reservedBed._id;
    await admission.save();

    // Link admission to Patient currentAdmissionId
    await Patient.findByIdAndUpdate(admission.patientId, { currentAdmissionId: admission._id });

    // 4. Create timeline event
    const operatorName = (req as any).user?.name || 'Receptionist';
    await PatientTimelineService.logEvent(
      admission.patientId,
      'BED_RESERVED',
      `Initial admission payment of ₹${amount} received. Bed ${reservedBed.bedId} reserved in ${(reservedBed.bedSetId as any)?.wardId?.name || 'Ward'}.`,
      operatorName
    );

    // 5. Broadcast Socket.IO events
    emitSocketEvent('admission:updated', { patientId: admission.patientId, admission });
    emitSocketEvent('payment:updated', { patientId: admission.patientId, payment });

    return res.status(200).json({
      message: 'Admission payment received and bed reserved successfully.',
      admission,
      bed: reservedBed,
      payment,
    });
  } catch (error: any) {
    console.error('Pay and reserve admission error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const confirmAdmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Admission ID

    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    if (admission.admissionStatus !== 'RESERVED') {
      return res.status(400).json({ message: `Cannot admit. Current status is ${admission.admissionStatus}. Bed must be reserved first.` });
    }

    if (!admission.bedId) {
      return res.status(400).json({ message: 'Associated bed not found on admission record.' });
    }

    // 1. Set Bed to OCCUPIED atomically via BedService
    const occupiedBed = await BedService.occupyBed(admission.bedId.toString(), admission.patientId, admission._id);

    // 2. Set Admission to OCCUPIED
    admission.admissionStatus = 'OCCUPIED';
    admission.admittedAt = new Date();
    await admission.save();

    // 3. Create timeline event
    const operatorName = (req as any).user?.name || 'Ward Staff';
    await PatientTimelineService.logEvent(
      admission.patientId,
      'PATIENT_ADMITTED',
      `Patient physically arrived at ward. Bed ${occupiedBed.bedId} status updated to OCCUPIED.`,
      operatorName
    );

    // Broadcast
    emitSocketEvent('admission:updated', { patientId: admission.patientId, admission });

    return res.status(200).json({
      message: 'Physical admission confirmed. Bed is now OCCUPIED.',
      admission,
      bed: occupiedBed,
    });
  } catch (error: any) {
    console.error('Confirm admission error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const sendForScan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admission = await Admission.findById(id)
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate('wardId')
      .populate('bedId');

    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    if (admission.inDiagnostics) {
      return res.status(200).json({
        message: 'Patient is already recorded as out for diagnostics scan.',
        admission,
      });
    }

    admission.inDiagnostics = true;
    admission.diagnosticsLeftAt = new Date();
    await admission.save();

    const operatorName = (req as any).user?.name || 'Ward Staff';
    const patientName = (admission.patientId as any)?.userId?.name || 'Patient';
    const bedName = (admission.bedId as any)?.bedId || 'ward bed';

    await PatientTimeline.create({
      patientId: (admission.patientId as any)._id,
      eventType: 'WARD_DEPARTURE_DIAGNOSTICS',
      description: `Patient ${patientName} temporarily left bed ${bedName} for diagnostic scanning.`,
      createdBy: operatorName,
    });

    emitSocketEvent('admission:updated', { patientId: (admission.patientId as any)._id, admission });
    emitSocketEvent('diagnostic:departed', {
      admissionId: admission._id,
      patientId: (admission.patientId as any)._id,
      patientIdCode: (admission.patientId as any).patientId,
      name: patientName,
      bedId: bedName,
      leftAt: admission.diagnosticsLeftAt,
    });

    return res.status(200).json({
      message: 'Patient dispatched for diagnostic scan.',
      admission,
    });
  } catch (error: any) {
    console.error('Send for scan error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const returnFromScan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admission = await Admission.findById(id)
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate('wardId')
      .populate('bedId');

    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    admission.inDiagnostics = false;
    admission.diagnosticsLeftAt = undefined;
    await admission.save();

    const operatorName = (req as any).user?.name || 'Ward Staff';
    const patientName = (admission.patientId as any)?.userId?.name || 'Patient';
    const bedName = (admission.bedId as any)?.bedId || 'ward bed';

    await PatientTimeline.create({
      patientId: (admission.patientId as any)._id,
      eventType: 'WARD_RETURN_DIAGNOSTICS',
      description: `Patient ${patientName} returned to bed ${bedName} from diagnostic scan.`,
      createdBy: operatorName,
    });

    emitSocketEvent('admission:updated', { patientId: (admission.patientId as any)._id, admission });
    emitSocketEvent('diagnostic:returned', {
      admissionId: admission._id,
      patientId: (admission.patientId as any)._id,
      patientIdCode: (admission.patientId as any).patientId,
      name: patientName,
      bedId: bedName,
    });

    return res.status(200).json({
      message: 'Patient returned to ward bed.',
      admission,
    });
  } catch (error: any) {
    console.error('Return from scan error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const createWardChangeRequest = async (req: Request, res: Response) => {
  try {
    const { admissionId, requestedWardId } = req.body;

    if (!admissionId || !requestedWardId) {
      return res.status(400).json({ message: 'Admission ID and Requested Ward ID are required.' });
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    const requestedWard = await Ward.findById(requestedWardId);
    if (!requestedWard) {
      return res.status(404).json({ message: 'Requested Ward not found.' });
    }

    // Create the change request (requires doctor approval)
    const changeRequest = await WardChangeRequest.create({
      admissionId,
      patientId: admission.patientId,
      requestedWardId,
      status: 'PENDING',
      requestedByDoctorId: admission.doctorId, // Doctor responsible for patient case
    });

    const operatorName = (req as any).user?.name || 'Receptionist';
    await PatientTimeline.create({
      patientId: admission.patientId,
      eventType: 'WARD_CHANGE_REQUESTED',
      description: `Requested recommended ward change to ${requestedWard.name}. Pending doctor approval.`,
      createdBy: operatorName,
    });

    // Notify doctors
    emitSocketEvent('notification:new', {
      recipientId: admission.doctorId.toString(),
      message: `Ward change request submitted for patient in admission ${admissionId}.`,
      type: 'INFO'
    });

    return res.status(201).json({
      message: 'Ward change request submitted. Pending doctor approval.',
      changeRequest,
    });
  } catch (error: any) {
    console.error('Create ward change request error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const handleWardChangeRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be APPROVED or REJECTED.' });
    }

    const changeRequest = await WardChangeRequest.findById(requestId)
      .populate('requestedWardId')
      .populate('patientId');
    if (!changeRequest) {
      return res.status(404).json({ message: 'Ward change request not found.' });
    }

    if (changeRequest.status !== 'PENDING') {
      return res.status(400).json({ message: `Request is already ${changeRequest.status}.` });
    }

    changeRequest.status = status;
    await changeRequest.save();

    const admission = await Admission.findById(changeRequest.admissionId);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    const wardName = (changeRequest.requestedWardId as any).name;
    const doctorName = (req as any).user?.name || 'Doctor';

    if (status === 'APPROVED') {
      // RULE 4: Ward change requires doctor approval. Update recommended ward
      admission.wardId = changeRequest.requestedWardId._id;
      // If the patient already reserved a bed in the old ward, we release the bed atomically!
      if (admission.bedId) {
        await BedService.releaseReservation(admission.bedId);
        admission.bedId = undefined;
        admission.admissionStatus = 'RECOMMENDED';
      }
      await admission.save();
    }

    await PatientTimeline.create({
      patientId: changeRequest.patientId._id,
      eventType: status === 'APPROVED' ? 'WARD_CHANGE_APPROVED' : 'WARD_CHANGE_REJECTED',
      description: `Ward change request to ${wardName} ${status === 'APPROVED' ? 'APPROVED' : 'REJECTED'} by ${doctorName}.`,
      createdBy: doctorName,
    });

    emitSocketEvent('admission:updated', { patientId: changeRequest.patientId._id, admission });

    return res.status(200).json({
      message: `Ward change request has been ${status.toLowerCase()}.`,
      changeRequest,
      admission,
    });
  } catch (error: any) {
    console.error('Handle ward change request error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const recommendDischarge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Admission ID

    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    admission.admissionStatus = 'DISCHARGE_RECOMMENDED';
    await admission.save();

    // Dynamic Billing: Calculate length-of-stay charges and generate itemized invoice
    const operatorName = (req as any).user?.name || 'Doctor';
    const { invoice, payment, breakdown } = await BillingService.createDischargeInvoice(admission._id.toString(), operatorName);

    await PatientTimelineService.logEvent(
      admission.patientId,
      'DISCHARGE_RECOMMENDED',
      `Discharge recommended by physician. Inpatient stay of ${breakdown.stayDays} days calculated. Final balance payable: ₹${breakdown.balancePayable} (${invoice.invoiceNumber}).`,
      operatorName
    );

    emitSocketEvent('admission:updated', { patientId: admission.patientId, admission });

    return res.status(200).json({
      message: 'Discharge recommended. Dynamic inpatient bill generated successfully.',
      admission,
      invoice,
      payment,
      breakdown,
    });
  } catch (error: any) {
    console.error('Recommend discharge error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const confirmDischarge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Admission ID

    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission record not found.' });
    }

    // RULE 7: Discharge requires final payment.
    // Check if there are any pending payments associated with this admission
    const pendingPayments = await Payment.find({
      patientId: admission.patientId,
      status: 'PENDING'
    });

    if (pendingPayments.length > 0) {
      return res.status(400).json({
        message: 'Rule Violation: Cannot discharge patient. Final payments are pending.',
        pendingPayments
      });
    }

    // Physical checkout from ward
    if (!admission.bedId) {
      return res.status(400).json({ message: 'No bed assigned to this admission.' });
    }

    // RULE 8: After patient leaves the ward: OCCUPIED → CLEANING atomically via BedService
    const cleanedBed = await BedService.sendToCleaning(admission.bedId.toString());

    admission.admissionStatus = 'DISCHARGED';
    admission.dischargedAt = new Date();
    await admission.save();

    // Clear patient currentAdmissionId
    await Patient.findByIdAndUpdate(admission.patientId, { $unset: { currentAdmissionId: 1 } });

    const operatorName = (req as any).user?.name || 'Ward Staff';
    await PatientTimelineService.logEvent(
      admission.patientId,
      'PATIENT_LEFT_WARD',
      `Patient physically checked out and left ward. Bed ${cleanedBed.bedId} moved to CLEANING.`,
      operatorName
    );

    emitSocketEvent('admission:updated', { patientId: admission.patientId, admission });

    return res.status(200).json({
      message: 'Patient discharged. Bed has been sent for CLEANING.',
      admission,
      bed: cleanedBed,
    });
  } catch (error: any) {
    console.error('Confirm discharge error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const finishCleaning = async (req: Request, res: Response) => {
  try {
    const { bedId } = req.body; // Bed _id or bedId string

    // RULE 9: After cleaning: CLEANING → AVAILABLE atomically via BedService
    const bed = await BedService.finishCleaning(bedId);

    const operatorName = (req as any).user?.name || 'Ward Staff';
    return res.status(200).json({
      message: 'Bed cleaning completed. Bed is now AVAILABLE.',
      bed,
    });
  } catch (error: any) {
    console.error('Finish cleaning error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getActiveAdmissions = async (req: Request, res: Response) => {
  try {
    const admissions = await Admission.find({
      admissionStatus: { $in: ['RECOMMENDED', 'RESERVED', 'OCCUPIED', 'DISCHARGE_RECOMMENDED'] }
    })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate('wardId')
      .populate('bedId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      });
    return res.status(200).json(admissions);
  } catch (error: any) {
    console.error('Get active admissions error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getWardChangeRequests = async (req: Request, res: Response) => {
  try {
    const requests = await WardChangeRequest.find({ status: 'PENDING' })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name' }
      })
      .populate('requestedWardId')
      .populate({
        path: 'requestedByDoctorId',
        populate: { path: 'userId', select: 'name' }
      });
    return res.status(200).json(requests);
  } catch (error: any) {
    console.error('Get ward change requests error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getPatientAdmissions = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    let queryPatientId: any = patientId;
    if (patientId.startsWith('P') && !isNaN(Number(patientId.substring(1)))) {
      const p = await Patient.findOne({ patientId });
      if (p) {
        queryPatientId = p._id;
      }
    }
    const admissions = await Admission.find({ patientId: queryPatientId })
      .populate({
        path: 'wardId',
        populate: { path: 'departmentId' },
      })
      .populate('bedId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(admissions);
  } catch (error: any) {
    console.error('Get patient admissions error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
