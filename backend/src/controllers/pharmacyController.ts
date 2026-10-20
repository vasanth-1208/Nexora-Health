import { Request, Response } from 'express';
import { Prescription, PharmacyQueue, Payment, PatientTimeline, Patient, MedicineInventory } from '../models';
import { emitSocketEvent } from '../config/socket';
import { PatientTimelineService } from '../services/patientTimelineService';

export const createPrescription = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, medicines } = req.body; // medicines: [{ name, quantity, cost }]

    if (!patientId || !doctorId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: 'Patient, Doctor, and at least one medicine are required.' });
    }

    // Map medicines to model structure
    const itemizedMedicines = medicines.map((m: any) => {
      const unitCost = Number(m.cost || m.unitPrice || 10);
      const qty = Number(m.quantity || 1);
      return {
        name: m.name,
        quantity: qty,
        cost: unitCost,
        status: 'WAITING',
        paymentStatus: 'PENDING',
        days: Number(m.days || 1),
        timing: m.timing || '1-0-1',
        dosagePerTime: Number(m.dosagePerTime || 1),
      };
    });

    const totalCost = Math.round(
      itemizedMedicines.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0) * 100
    ) / 100;

    // 1. Create Prescription
    const prescription = await Prescription.create({
      patientId,
      doctorId,
      medicines: itemizedMedicines,
      totalCost,
      paymentStatus: 'PENDING',
    });

    // 2. Create Payment transaction
    const payment = await Payment.create({
      patientId,
      serviceType: 'PHARMACY',
      amount: totalCost,
      status: 'PENDING',
      referenceId: prescription._id,
      description: `Pharmacy prescription checkout (${medicines.length} items)`,
    });

    prescription.paymentId = payment._id;
    await prescription.save();

    // 3. Add to Pharmacy queue
    const queueItem = await PharmacyQueue.create({
      patientId,
      prescriptionId: prescription._id,
      status: 'WAITING',
    });

    // 4. Timeline
    const operatorName = (req as any).user?.name || 'Doctor';
    const medNames = medicines.map(m => `${m.name} (x${m.quantity})`).join(', ');
    await PatientTimeline.create({
      patientId,
      eventType: 'MEDICINE_PRESCRIBED',
      description: `Medicines prescribed: ${medNames}. Pharmacy bill of ₹${totalCost} generated.`,
      createdBy: operatorName,
    });

    // Broadcast
    emitSocketEvent('pharmacy:queued', queueItem);
    emitSocketEvent('payment:updated', { patientId, payment });

    return res.status(201).json({
      message: 'Prescription generated and sent to pharmacy queue.',
      prescription,
      payment,
      queueItem,
    });
  } catch (error: any) {
    console.error('Create prescription error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getPharmacyQueue = async (req: Request, res: Response) => {
  try {
    const queue = await PharmacyQueue.find({})
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate('prescriptionId')
      .sort({ createdAt: 1 });
    return res.status(200).json(queue);
  } catch (error: any) {
    console.error('Get pharmacy queue error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updatePharmacyQueueStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Queue ID
    const { status } = req.body;

    const allowedStatuses = ['WAITING', 'PROCESSING', 'READY', 'DISPENSED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid queue status.' });
    }

    const queueItem = await PharmacyQueue.findById(id).populate('prescriptionId');
    if (!queueItem) {
      return res.status(404).json({ message: 'Pharmacy queue record not found.' });
    }

    const oldStatus = queueItem.status;

    // Idempotency: if status is already the requested status, return early without re-decrementing
    if (oldStatus === status) {
      return res.status(200).json({
        message: `Queue status is already ${status}.`,
        queueItem,
      });
    }

    const prescription = await Prescription.findById((queueItem.prescriptionId as any)._id);

    // Atomically validate and decrement inventory stock ONLY when moving to DISPENSED for the first time
    if (status === 'DISPENSED' && oldStatus !== 'DISPENSED') {
      if (prescription && prescription.medicines && prescription.medicines.length > 0) {
        // Step 1: Pre-validation of stock sufficiency and expiration for all medicines
        for (const med of prescription.medicines) {
          const invItem = await MedicineInventory.findOne({
            name: { $regex: new RegExp(`^${med.name.trim()}$`, 'i') }
          });

          if (invItem) {
            // Check expiry
            if (invItem.expiryDate && new Date(invItem.expiryDate).getTime() < Date.now()) {
              return res.status(400).json({
                message: `Cannot dispense expired medication: ${invItem.name} (Expired on ${invItem.expiryDate.toISOString().split('T')[0]}).`,
                code: 'MEDICINE_EXPIRED'
              });
            }
            // Check stock sufficiency
            if (invItem.stockQuantity < med.quantity) {
              return res.status(400).json({
                message: `Insufficient inventory stock for ${invItem.name}. Available: ${invItem.stockQuantity}, Requested: ${med.quantity}.`,
                code: 'INSUFFICIENT_STOCK'
              });
            }
          }
        }

        // Step 2: Atomic decrement with non-negative guarantee
        for (const med of prescription.medicines) {
          await MedicineInventory.findOneAndUpdate(
            {
              name: { $regex: new RegExp(`^${med.name.trim()}$`, 'i') },
              stockQuantity: { $gte: med.quantity }
            },
            { $inc: { stockQuantity: -med.quantity } }
          );
        }
      }
    }

    queueItem.status = status;
    await queueItem.save();

    if (prescription) {
      // Update statuses of medicines inside prescription
      prescription.medicines.forEach(m => {
        m.status = status;
      });
      await prescription.save();
    }

    const operatorName = (req as any).user?.name || 'Pharmacist';
    await PatientTimelineService.logEvent(
      queueItem.patientId._id,
      'PHARMACY_QUEUE_STATUS',
      `Pharmacy queue status updated from ${oldStatus} to ${status}.`,
      operatorName
    );

    if (status === 'READY') {
      // Notify patient
      emitSocketEvent('notification:new', {
        recipientId: queueItem.patientId.toString(),
        message: 'Your prescribed medicines are ready. Please pay at billing and collect at pharmacy counter.',
        type: 'SUCCESS'
      });

      emitSocketEvent('pharmacy:ready', {
        queueId: id,
        patientId: queueItem.patientId._id
      });
    } else if (status === 'DISPENSED') {
      await PatientTimeline.create({
        patientId: queueItem.patientId._id,
        eventType: 'MEDICINES_DISPENSED',
        description: `Prescribed medicines successfully collected by patient.`,
        createdBy: operatorName,
      });
    }

    return res.status(200).json({
      message: `Queue status updated to ${status}.`,
      queueItem,
    });
  } catch (error: any) {
    console.error('Update pharmacy queue status error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const getPatientPrescriptions = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    let queryPatientId: any = patientId;
    if (patientId && patientId.startsWith('P') && !isNaN(Number(patientId.substring(1)))) {
      const p = await Patient.findOne({ patientId });
      if (p) {
        queryPatientId = p._id;
      }
    }
    const prescriptions = await Prescription.find({ patientId: queryPatientId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return res.status(200).json(prescriptions);
  } catch (error: any) {
    console.error('Get patient prescriptions error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updatePrescription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { medicines } = req.body;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (prescription.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Cannot edit prescription once payment is completed.' });
    }

    const itemizedMedicines = medicines.map((m: any) => {
      const unitCost = Number(m.cost || m.unitPrice || 10);
      const qty = Number(m.quantity || 1);
      return {
        name: m.name,
        quantity: qty,
        cost: unitCost,
        status: 'WAITING',
        paymentStatus: 'PENDING',
        days: Number(m.days || 1),
        timing: m.timing || '1-0-1',
        dosagePerTime: Number(m.dosagePerTime || 1),
      };
    });

    const totalCost = Math.round(
      itemizedMedicines.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0) * 100
    ) / 100;

    prescription.medicines = itemizedMedicines;
    prescription.totalCost = totalCost;
    await prescription.save();

    // Update payment ledger
    if (prescription.paymentId) {
      await Payment.findByIdAndUpdate(prescription.paymentId, {
        amount: totalCost,
        description: `Pharmacy prescription checkout (${medicines.length} items)`,
      });
    }

    emitSocketEvent('pharmacy:updated', { patientId: prescription.patientId, prescription });

    return res.status(200).json({
      message: 'Prescription updated successfully.',
      prescription,
    });
  } catch (error: any) {
    console.error('Update prescription error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const deletePrescription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (prescription.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Cannot cancel prescription once payment is completed.' });
    }

    await PharmacyQueue.deleteMany({ prescriptionId: prescription._id });
    if (prescription.paymentId) {
      await Payment.findByIdAndDelete(prescription.paymentId);
    }
    await Prescription.findByIdAndDelete(id);

    emitSocketEvent('pharmacy:updated', { patientId: prescription.patientId, prescriptionId: id, deleted: true });

    return res.status(200).json({
      message: 'Prescription cancelled successfully.',
    });
  } catch (error: any) {
    console.error('Delete prescription error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
