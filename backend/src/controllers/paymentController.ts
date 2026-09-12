import { Request, Response } from 'express';
import {
  Payment,
  Consultation,
  DoctorReferral,
  DiagnosticRequest,
  Prescription,
  Admission,
  PatientTimeline,
  Bed,
  Invoice,
} from '../models';
import { emitSocketEvent } from '../config/socket';

export const getPendingPayments = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params; // DB _id of Patient
    const payments = await Payment.find({ patientId, status: 'PENDING' }).sort({ createdAt: -1 });
    return res.status(200).json(payments);
  } catch (error: any) {
    console.error('Get pending payments error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const payments = await Payment.find({ patientId, status: 'PAID' }).sort({ createdAt: -1 });
    return res.status(200).json(payments);
  } catch (error: any) {
    console.error('Get payment history error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const payments = await Payment.find({})
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(payments);
  } catch (error: any) {
    console.error('Get all payments error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Payment DB ID
    const { paymentMethod = 'CASH' } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment transaction record not found.' });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({ message: 'Payment has already been processed.' });
    }

    const operatorName = (req as any).user?.name || 'Billing Officer';
    payment.status = 'PAID';
    payment.paymentMethod = paymentMethod;
    payment.paidAt = new Date();
    payment.processedBy = operatorName;
    await payment.save();

    const referenceId = payment.referenceId;

    // Update the associated entity based on serviceType
    if (payment.serviceType === 'CONSULTATION' && referenceId) {
      const consultation = await Consultation.findById(referenceId);
      if (consultation) {
        consultation.paymentStatus = 'PAID';
        await consultation.save();
      }
      await PatientTimeline.create({
        patientId: payment.patientId,
        eventType: 'CONSULTATION_PAID',
        description: `Payment of ₹${payment.amount} processed for Consultation via ${paymentMethod}. Waiting in queue.`,
        createdBy: operatorName,
      });
    } else if (payment.serviceType === 'REFERRAL' && referenceId) {
      const referral = await DoctorReferral.findById(referenceId);
      if (referral) {
        referral.status = 'PAID';
        await referral.save();
      }
      await PatientTimeline.create({
        patientId: payment.patientId,
        eventType: 'REFERRAL_PAID',
        description: `Payment of ₹${payment.amount} processed for doctor referral via ${paymentMethod}.`,
        createdBy: operatorName,
      });
    } else if (payment.serviceType === 'DIAGNOSTIC' && referenceId) {
      const diag = await DiagnosticRequest.findById(referenceId);
      if (diag) {
        diag.status = 'QUEUED'; // Automatically queue scan room once paid!
        await diag.save();
      }
      await PatientTimeline.create({
        patientId: payment.patientId,
        eventType: 'DIAGNOSTIC_PAID',
        description: `Payment of ₹${payment.amount} processed for diagnostic test: ${diag ? diag.testType : ''} via ${paymentMethod}. Scan is now QUEUED.`,
        createdBy: operatorName,
      });
    } else if (payment.serviceType === 'PHARMACY' && referenceId) {
      const rx = await Prescription.findById(referenceId);
      if (rx) {
        rx.paymentStatus = 'PAID';
        rx.medicines.forEach(m => {
          m.paymentStatus = 'PAID';
        });
        await rx.save();
      }
      await PatientTimeline.create({
        patientId: payment.patientId,
        eventType: 'PHARMACY_PAID',
        description: `Payment of ₹${payment.amount} processed for prescribed medications via ${paymentMethod}.`,
        createdBy: operatorName,
      });
    } else if (payment.serviceType === 'ADMISSION') {
      const admissionId = payment.admissionId || referenceId;
      let admission = await Admission.findById(admissionId);
      if (!admission && referenceId) {
        const inv = await Invoice.findById(referenceId);
        if (inv && inv.admissionId) {
          admission = await Admission.findById(inv.admissionId);
        }
      }

      if (admission) {
        if (admission.admissionStatus === 'DISCHARGE_RECOMMENDED') {
          admission.paymentStatus = 'PAID';
          await admission.save();

          await PatientTimeline.create({
            patientId: payment.patientId,
            eventType: 'FINAL_PAYMENT_COMPLETED',
            description: `Final stay payment of ₹${payment.amount} completed via ${paymentMethod}. Patient is READY FOR DISCHARGE.`,
            createdBy: operatorName,
          });

          // Send notification
          emitSocketEvent('notification:new', {
            recipientId: admission.patientId.toString(),
            message: 'Final payment completed. You are ready for discharge.',
            type: 'SUCCESS'
          });

          emitSocketEvent('notification:new', {
            recipientId: 'WARD_STAFF',
            message: `Final payment completed for patient admission ${admission._id}. Ready for discharge checkout.`,
            type: 'SUCCESS'
          });
        }
      }

      // Mark associated Invoice as PAID if exists
      const invId = payment.invoiceId || (payment.referenceModel === 'INVOICE' ? referenceId : null);
      if (invId) {
        await Invoice.findByIdAndUpdate(invId, {
          status: 'PAID',
          paidAmount: payment.amount,
          balanceAmount: 0,
          paymentMethod,
        });
      }
    }

    emitSocketEvent('payment:updated', { patientId: payment.patientId, payment });
    
    // Notify patient
    emitSocketEvent('notification:new', {
      recipientId: payment.patientId.toString(),
      message: `Payment of ₹${payment.amount} for ${payment.serviceType} was successfully processed.`,
      type: 'SUCCESS'
    });

    return res.status(200).json({
      message: 'Payment processed successfully.',
      payment,
    });
  } catch (error: any) {
    console.error('Process payment error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
