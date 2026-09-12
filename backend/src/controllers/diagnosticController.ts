import { Request, Response } from 'express';
import { DiagnosticRequest, Payment, Patient, PatientTimeline, Admission } from '../models';
import { emitSocketEvent } from '../config/socket';

export const requestDiagnostic = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, testType, priority = 'ROUTINE', cost = 1500, notes } = req.body;

    if (!patientId || !doctorId || !testType) {
      return res.status(400).json({ message: 'Patient, Doctor, and Test Type are required.' });
    }

    // 1. Create request
    const diagRequest = await DiagnosticRequest.create({
      patientId,
      doctorId,
      testType,
      priority,
      status: 'REQUESTED',
      cost: Number(cost),
      notes,
    });

    // 2. Create Payment ledger
    const payment = await Payment.create({
      patientId,
      serviceType: 'DIAGNOSTIC',
      amount: Number(cost),
      status: 'PENDING',
      referenceId: diagRequest._id,
      description: `Diagnostic Test: ${testType} (${priority})`,
    });

    diagRequest.paymentId = payment._id;
    await diagRequest.save();

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId,
      eventType: 'DIAGNOSTIC_REQUESTED',
      description: `${priority} diagnostic request created for ${testType}. Fee ₹${cost} generated.`,
      createdBy: operatorName,
    });

    emitSocketEvent('diagnostic:requested', { patientId, diagnostic: diagRequest });
    emitSocketEvent('payment:updated', { patientId, payment });

    return res.status(201).json({
      message: 'Diagnostic test requested successfully.',
      diagnostic: diagRequest,
      payment,
    });
  } catch (error: any) {
    console.error('Request diagnostic error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getAllDiagnostics = async (req: Request, res: Response) => {
  try {
    const diagnostics = await DiagnosticRequest.find({})
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(diagnostics);
  } catch (error: any) {
    console.error('Get diagnostics error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getPatientDiagnostics = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const diagnostics = await DiagnosticRequest.find({ patientId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(diagnostics);
  } catch (error: any) {
    console.error('Get patient diagnostics error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateDiagnosticStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, findings, impression, reportText, modality, attachmentUrl } = req.body;

    const allowedStatuses = ['QUEUED', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid diagnostic status.' });
    }

    const request = await DiagnosticRequest.findById(id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      });

    if (!request) {
      return res.status(404).json({ message: 'Diagnostic request not found.' });
    }

    // Diagnostics Payment Integrity: Check payment requirement before advancing to RECEIVED or beyond
    if (['RECEIVED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      if (request.priority !== 'EMERGENCY' && request.cost > 0 && request.paymentId) {
        const payment = await Payment.findById(request.paymentId);
        if (payment && payment.status !== 'PAID') {
          return res.status(400).json({
            message: 'PAYMENT_REQUIRED: Diagnostic scan requires settled payment prior to lab check-in.',
            code: 'PAYMENT_REQUIRED'
          });
        }
      }
    }

    const oldStatus = request.status;
    request.status = status;
    
    if (modality) request.modality = modality;
    if (findings) request.findings = findings;
    if (impression) request.impression = impression;
    if (reportText) request.reportText = reportText;
    if (attachmentUrl) request.attachmentUrl = attachmentUrl;
    if ((req as any).user?.name) request.technician = (req as any).user.name;
    
    if (status === 'COMPLETED') {
      request.completionTime = new Date();
      request.reportTimestamp = new Date();
    }
    
    await request.save();

    // Timeline event
    const operatorName = (req as any).user?.name || 'Diagnostics Staff';
    let timelineDesc = `Diagnostic scan ${request.testType} status updated to ${status}.`;
    let timelineEvent = 'DIAGNOSTIC_STATUS';

    if (status === 'RECEIVED') {
      timelineEvent = 'DIAGNOSTIC_RECEIVED';
      timelineDesc = `Patient received in diagnostics lab for ${request.testType}.`;
      
      // If patient is admitted, notify ward staff they arrived at scan room
      const patientProfile = await Patient.findById(request.patientId._id);
      if (patientProfile?.currentAdmissionId) {
        emitSocketEvent('notification:new', {
          recipientId: 'WARD_STAFF',
          message: `Admitted patient ${patientProfile.patientId} (${(patientProfile.userId as any).name || 'Patient'}) received in diagnostics room for ${request.testType}.`,
          type: 'INFO'
        });
        
        // Log on timeline that patient left ward for scan
        await PatientTimeline.create({
          patientId: request.patientId._id,
          eventType: 'WARD_DEPARTURE_DIAGNOSTICS',
          description: `Patient temporarily left ward for diagnostic scan: ${request.testType}.`,
          createdBy: 'Ward Staff',
        });
      }
    } else if (status === 'COMPLETED') {
      timelineEvent = 'DIAGNOSTIC_COMPLETED';
      timelineDesc = `Diagnostic scan ${request.testType} completed. Patient left diagnostic room.`;

      // Check if patient is admitted, send real-time return notification to ward
      const patientProfile = await Patient.findById(request.patientId._id).populate('userId');
      if (patientProfile?.currentAdmissionId) {
        const admission = await Admission.findById(patientProfile.currentAdmissionId).populate('wardId');
        const wardName = (admission?.wardId as any)?.name || 'ward';

        // Emit Socket.IO notification to WARD_STAFF
        emitSocketEvent('notification:new', {
          recipientId: 'WARD_STAFF',
          message: `Scan completed for admitted patient ${patientProfile.patientId} (${(patientProfile.userId as any).name}). Returning to ${wardName}.`,
          type: 'SUCCESS'
        });

        // Broadcast to trigger Ward Dashboard "Patient Return Notification"
        emitSocketEvent('diagnostic:completed', {
          patientId: patientProfile._id,
          patientIdCode: patientProfile.patientId,
          name: (patientProfile.userId as any).name,
          testType: request.testType,
          wardId: (admission?.wardId as any)?._id
        });

        await PatientTimeline.create({
          patientId: request.patientId._id,
          eventType: 'WARD_RETURN_DIAGNOSTICS',
          description: `Patient scan completed. Patient returned to assigned ward bed.`,
          createdBy: 'Ward Staff',
        });
      }

      // Notify patient portal
      emitSocketEvent('notification:new', {
        recipientId: request.patientId.toString(),
        message: `Your diagnostic scan (${request.testType}) has been completed.`,
        type: 'SUCCESS'
      });
    }

    await PatientTimeline.create({
      patientId: request.patientId._id,
      eventType: timelineEvent,
      description: timelineDesc,
      createdBy: operatorName,
    });

    emitSocketEvent('patient:status', { request: id, status, patientId: request.patientId._id });
    emitSocketEvent('diagnostic:updated', { diagnostic: request, patientId: request.patientId._id, status });

    return res.status(200).json({
      message: `Diagnostic request updated to ${status}.`,
      diagnostic: request,
    });
  } catch (error: any) {
    console.error('Update diagnostic status error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const updateDiagnosticRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { testType, priority = 'ROUTINE', cost = 350, notes } = req.body;

    const diag = await DiagnosticRequest.findById(id);
    if (!diag) {
      return res.status(404).json({ message: 'Diagnostic request not found.' });
    }

    if (diag.status !== 'REQUESTED') {
      return res.status(400).json({ message: `Cannot edit diagnostic request in ${diag.status} status.` });
    }

    diag.testType = testType || diag.testType;
    diag.priority = priority || diag.priority;
    diag.cost = Number(cost);
    if (notes !== undefined) diag.notes = notes;
    await diag.save();

    // Update payment ledger if pending
    if (diag.paymentId) {
      await Payment.findByIdAndUpdate(diag.paymentId, {
        amount: Number(cost),
        description: `Diagnostic Test: ${diag.testType} (${diag.priority})`,
      });
    }

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId: diag.patientId,
      eventType: 'DIAGNOSTIC_REQUESTED',
      description: `Diagnostic request updated: ${diag.testType} (${diag.priority}). Fee ₹${cost}.`,
      createdBy: operatorName,
    });

    emitSocketEvent('diagnostic:updated', { patientId: diag.patientId, diagnostic: diag });

    return res.status(200).json({
      message: 'Diagnostic request updated successfully.',
      diagnostic: diag,
    });
  } catch (error: any) {
    console.error('Update diagnostic error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const deleteDiagnosticRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diag = await DiagnosticRequest.findById(id);
    if (!diag) {
      return res.status(404).json({ message: 'Diagnostic request not found.' });
    }

    if (diag.status !== 'REQUESTED') {
      return res.status(400).json({ message: `Cannot cancel diagnostic request in ${diag.status} status.` });
    }

    if (diag.paymentId) {
      await Payment.findByIdAndDelete(diag.paymentId);
    }

    await DiagnosticRequest.findByIdAndDelete(id);

    const operatorName = (req as any).user?.name || 'Doctor';
    await PatientTimeline.create({
      patientId: diag.patientId,
      eventType: 'DIAGNOSTIC_REQUESTED',
      description: `Diagnostic request for ${diag.testType} cancelled by doctor.`,
      createdBy: operatorName,
    });

    emitSocketEvent('diagnostic:cancelled', { patientId: diag.patientId, diagnosticId: id });

    return res.status(200).json({
      message: 'Diagnostic request cancelled successfully.',
    });
  } catch (error: any) {
    console.error('Delete diagnostic error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
