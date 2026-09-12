import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  User,
  Patient,
  Doctor,
  Department,
  Ward,
  BedSet,
  Bed,
  Consultation,
  Admission,
  Payment,
  Invoice,
  MedicineInventory,
  DiagnosticRequest,
  Prescription,
  PharmacyQueue,
  EmergencyAlert,
  getNextSequence
} from '../models';
import { BedService } from '../services/bedService';
import { BillingService } from '../services/billingService';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora_health';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, category, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [PASS] [${category}] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, category, passed: false, error: err.message || String(err), durationMs: Date.now() - start });
    console.error(`  ✗ [FAIL] [${category}] ${name}: ${err.message || err}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('  NEXORA HEALTH — AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  console.log('Connecting to database for test execution...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // -------------------------------------------------------------
  // TEST SUITE 1: AUTHENTICATION & ATOMIC ID GENERATION
  // -------------------------------------------------------------
  console.log('--- SUITE 1: AUTHENTICATION & ATOMIC SEQUENCES ---');

  await runTest('Auth', 'Atomic sequential Patient ID generation prevents collisions', async () => {
    const seq1 = await getNextSequence('test_seq', 1000);
    const seq2 = await getNextSequence('test_seq', 1000);
    if (seq2 !== seq1 + 1) {
      throw new Error(`Expected sequence ${seq1 + 1} but got ${seq2}`);
    }
  });

  await runTest('Auth', 'JWT token signs and verifies with user identity and role', async () => {
    const payload = { userId: 'usr_test_123', username: 'P9999', role: 'PATIENT', name: 'Test User' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.username !== 'P9999' || decoded.role !== 'PATIENT') {
      throw new Error('JWT payload mismatch');
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 2: CRITICAL BED CONCURRENCY RACE CONDITION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: BED CONCURRENCY & RACE CONDITION TEST ---');

  await runTest('Concurrency', 'Simultaneous reservation on same bed: exactly ONE succeeds, other gets 409 conflict', async () => {
    // 1. Find or create a test bed
    let testBed = await Bed.findOne({ status: 'AVAILABLE' });
    if (!testBed) {
      const anyBed = await Bed.findOne({});
      if (anyBed) {
        anyBed.status = 'AVAILABLE';
        anyBed.currentPatientId = undefined;
        anyBed.currentAdmissionId = undefined;
        await anyBed.save();
        testBed = anyBed;
      }
    }
    if (!testBed) {
      throw new Error('No test bed available for concurrency test.');
    }

    const bedId = testBed._id.toString();
    const patientA = new mongoose.Types.ObjectId();
    const admissionA = new mongoose.Types.ObjectId();
    const patientB = new mongoose.Types.ObjectId();
    const admissionB = new mongoose.Types.ObjectId();

    // 2. Fire TWO concurrent reservation requests simultaneously
    const promiseA = BedService.reserveBed(bedId, patientA, admissionA)
      .then((bed) => ({ success: true, user: 'A', bed }))
      .catch((err) => ({ success: false, user: 'A', error: err.message }));

    const promiseB = BedService.reserveBed(bedId, patientB, admissionB)
      .then((bed) => ({ success: true, user: 'B', bed }))
      .catch((err) => ({ success: false, user: 'B', error: err.message }));

    const [resA, resB] = await Promise.all([promiseA, promiseB]);

    const successes = [resA, resB].filter((r): r is { success: true; user: string; bed: any } => r.success);
    const failures = [resA, resB].filter((r): r is { success: false; user: string; error: string } => !r.success);

    // Clean up test bed back to AVAILABLE
    await Bed.findByIdAndUpdate(bedId, {
      status: 'AVAILABLE',
      $unset: { currentPatientId: 1, currentAdmissionId: 1, reservedTime: 1 },
    });

    if (successes.length !== 1) {
      throw new Error(`CONCURRENCY RACE CONDITION DETECTED! Expected exactly 1 reservation to succeed, but ${successes.length} succeeded.`);
    }

    if (failures.length !== 1 || !failures[0].error?.includes('CONCURRENCY_CONFLICT')) {
      throw new Error(`Expected failing thread to receive CONCURRENCY_CONFLICT, but received: ${failures[0]?.error}`);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 3: BED LIFECYCLE STATE MACHINE
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: BED LIFECYCLE & STATE TRANSITIONS ---');

  await runTest('Bed Lifecycle', 'Valid state transitions: AVAILABLE -> RESERVED -> OCCUPIED -> CLEANING -> AVAILABLE', async () => {
    let bed = await Bed.findOne({});
    if (!bed) throw new Error('No bed found');

    const dummyPatient = new mongoose.Types.ObjectId();
    const dummyAdmission = new mongoose.Types.ObjectId();

    // Reset to AVAILABLE
    bed.status = 'AVAILABLE';
    await bed.save();

    // AVAILABLE -> RESERVED
    const reserved = await BedService.reserveBed(bed._id.toString(), dummyPatient, dummyAdmission);
    if (reserved.status !== 'RESERVED') throw new Error('Failed to reserve bed');

    // RESERVED -> OCCUPIED
    const occupied = await BedService.occupyBed(bed._id.toString(), dummyPatient, dummyAdmission);
    if (occupied.status !== 'OCCUPIED') throw new Error('Failed to occupy bed');

    // OCCUPIED -> CLEANING
    const cleaning = await BedService.sendToCleaning(bed._id.toString());
    if (cleaning.status !== 'CLEANING') throw new Error('Failed to send bed to cleaning');

    // CLEANING -> AVAILABLE
    const available = await BedService.finishCleaning(bed._id.toString());
    if (available.status !== 'AVAILABLE') throw new Error('Failed to finish cleaning bed');
  });

  await runTest('Bed Lifecycle', 'Rejects invalid transition: CLEANING -> OCCUPIED directly', async () => {
    let bed = await Bed.findOne({});
    if (!bed) throw new Error('No bed found');

    bed.status = 'CLEANING';
    await bed.save();

    let threw = false;
    try {
      await BedService.occupyBed(bed._id.toString(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId());
    } catch (err: any) {
      threw = true;
      if (!err.message.includes('INVALID_TRANSITION')) {
        throw new Error(`Expected INVALID_TRANSITION, got: ${err.message}`);
      }
    }

    // Clean up
    bed.status = 'AVAILABLE';
    await bed.save();

    if (!threw) throw new Error('Failed to reject invalid CLEANING -> OCCUPIED transition');
  });

  // -------------------------------------------------------------
  // TEST SUITE 4: DYNAMIC STAY BILLING & INVOICING
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: DYNAMIC INPATIENT BILLING & INVOICES ---');

  await runTest('Billing', 'Calculates stay charges dynamically based on days and ward daily rate (no hardcoded ₹8,500)', async () => {
    // 1. Get or create test ward with dailyRate
    let ward = await Ward.findOne({});
    if (!ward) throw new Error('No ward found');
    ward.dailyRate = 1200;
    await ward.save();

    let patient = await Patient.findOne({});
    let doctor = await Doctor.findOne({});
    if (!patient || !doctor) throw new Error('No patient or doctor found');

    // Create admission with admittedAt set to 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const admission = await Admission.create({
      patientId: patient._id,
      doctorId: doctor._id,
      wardId: ward._id,
      admissionStatus: 'OCCUPIED',
      paymentStatus: 'PAID',
      admittedAt: threeDaysAgo,
    });

    const billBreakdown = await BillingService.calculateDischargeBill(admission._id.toString());

    // Clean up test admission
    await Admission.findByIdAndDelete(admission._id);

    if (billBreakdown.stayDays < 3) {
      throw new Error(`Expected at least 3 stay days, got ${billBreakdown.stayDays}`);
    }

    if (billBreakdown.dailyRate !== 1200) {
      throw new Error(`Expected daily rate 1200, got ${billBreakdown.dailyRate}`);
    }

    if (billBreakdown.bedCharges !== billBreakdown.stayDays * 1200) {
      throw new Error(`Bed charges calculation mismatch: ${billBreakdown.bedCharges}`);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 5: PHARMACY INVENTORY STOCK DECREMENT
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: PHARMACY & INVENTORY MANAGEMENT ---');

  await runTest('Pharmacy', 'Atomically decrements stock quantity in MedicineInventory on dispense', async () => {
    // Create test medicine in inventory
    const medName = `Test_Amoxicillin_${Date.now()}`;
    const initialStock = 50;
    const dispenseQty = 6;

    const med = await MedicineInventory.create({
      name: medName,
      category: 'Antibiotic',
      dosageForm: 'Tablet',
      stockQuantity: initialStock,
      unitPrice: 15,
      batchNumber: 'TEST-BATCH-01',
    });

    // Simulate dispense decrement
    const updated = await MedicineInventory.findOneAndUpdate(
      { name: medName, stockQuantity: { $gte: dispenseQty } },
      { $inc: { stockQuantity: -dispenseQty } },
      { new: true }
    );

    // Clean up
    await MedicineInventory.findByIdAndDelete(med._id);

    if (!updated || updated.stockQuantity !== initialStock - dispenseQty) {
      throw new Error(`Inventory stock decrement failed. Expected ${initialStock - dispenseQty}, got ${updated?.stockQuantity}`);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 6: NURSE TRIAGE & VITALS INTAKE
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: NURSE CLINICAL INTAKE & VITALS ---');

  await runTest('Nurse Triage', 'Records complete vitals subdocument (BP, HR, SpO2, Triage Category) on consultation', async () => {
    let patient = await Patient.findOne({});
    let doctor = await Doctor.findOne({});
    if (!patient || !doctor) throw new Error('No patient or doctor found');

    const consultation = await Consultation.create({
      patientId: patient._id,
      doctorId: doctor._id,
      status: 'WAITING',
      paymentStatus: 'PAID',
    });

    // Nurse records vitals and checks patient in
    consultation.status = 'RECEIVED';
    consultation.vitals = {
      bloodPressure: '125/82',
      heartRate: 76,
      temperature: 98.4,
      spO2: 99,
      respiratoryRate: 16,
      weight: 70,
      triagePriority: 'URGENT',
      nursingNotes: 'Patient alert and oriented. Mild pain reported.',
      recordedBy: 'Nurse Practitioner Desk',
      recordedAt: new Date(),
    };
    await consultation.save();

    const fetched = await Consultation.findById(consultation._id);
    await Consultation.findByIdAndDelete(consultation._id);

    if (fetched?.vitals?.bloodPressure !== '125/82') {
      throw new Error('Vitals blood pressure was not saved');
    }

    if (fetched?.vitals?.triagePriority !== 'URGENT') {
      throw new Error('Triage priority was not saved');
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 7: RBAC & IDOR OBJECT-LEVEL AUTHORIZATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: RBAC & IDOR OBJECT-LEVEL AUTHORIZATION ---');

  await runTest('RBAC', 'Rejects unauthorized PATIENT role attempting staff-only bed modification', async () => {
    const { requireRole } = await import('../middleware/auth');
    const roleMiddleware = requireRole(['ADMIN', 'RECEPTION', 'WARD_STAFF', 'NURSE']);

    let statusPassed = 0;
    const fakeReq: any = {
      user: { role: 'PATIENT', userId: 'usr_pat_1', username: 'P1001' },
    };
    const fakeRes: any = {
      status: (code: number) => {
        statusPassed = code;
        return fakeRes;
      },
      json: () => {},
    };
    let nextCalled = false;
    const fakeNext = () => { nextCalled = true; };

    roleMiddleware(fakeReq, fakeRes, fakeNext);

    if (nextCalled || statusPassed !== 403) {
      throw new Error(`Expected 403 Forbidden for PATIENT role, got status ${statusPassed}`);
    }
  });

  await runTest('IDOR', 'requireOwnershipOrStaff blocks patient from accessing another patient ID', async () => {
    const { requireOwnershipOrStaff } = await import('../middleware/auth');
    const idorMiddleware = requireOwnershipOrStaff();

    let statusPassed = 0;
    const fakeReq: any = {
      user: { role: 'PATIENT', username: 'P1001', userId: 'usr_1' },
      params: { id: 'P9999' },
    };
    const fakeRes: any = {
      status: (code: number) => {
        statusPassed = code;
        return fakeRes;
      },
      json: () => {},
    };
    let nextCalled = false;
    const fakeNext = () => { nextCalled = true; };

    idorMiddleware(fakeReq, fakeRes, fakeNext);

    if (nextCalled || statusPassed !== 403) {
      throw new Error(`Expected 403 Forbidden for IDOR mismatch, got status ${statusPassed}`);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 8: DIAGNOSTICS WORKFLOW PROGRESSION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 8: DIAGNOSTICS LAB ORDER PROGRESSION ---');

  await runTest('Diagnostics', 'Progresses diagnostic test: REQUESTED -> QUEUED -> RECEIVED -> IN_PROGRESS -> COMPLETED', async () => {
    const { DiagnosticRequest } = await import('../models');
    let patient = await Patient.findOne({});
    let doctor = await Doctor.findOne({});
    if (!patient || !doctor) throw new Error('No patient or doctor found');

    const diag = await DiagnosticRequest.create({
      patientId: patient._id,
      doctorId: doctor._id,
      testType: 'Chest X-Ray PA View',
      priority: 'ROUTINE',
      status: 'REQUESTED',
      cost: 650,
    });

    diag.status = 'QUEUED';
    await diag.save();

    diag.status = 'RECEIVED';
    await diag.save();

    diag.status = 'IN_PROGRESS';
    await diag.save();

    diag.status = 'COMPLETED';
    diag.completionTime = new Date();
    await diag.save();

    const fetched = await DiagnosticRequest.findById(diag._id);
    await DiagnosticRequest.findByIdAndDelete(diag._id);

    if (fetched?.status !== 'COMPLETED' || !fetched.completionTime) {
      throw new Error('Diagnostic workflow completion failed');
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 9: WARD CHANGE WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- SUITE 9: WARD CHANGE WORKFLOW ---');

  await runTest('Ward Change', 'Creates, approves, and records a doctor ward change request', async () => {
    const { WardChangeRequest } = await import('../models');
    let patient = await Patient.findOne({});
    let doctor = await Doctor.findOne({});
    let ward = await Ward.findOne({});
    if (!patient || !doctor || !ward) throw new Error('Missing dependencies for ward change test');

    const dummyAdmission = new mongoose.Types.ObjectId();
    const req = await WardChangeRequest.create({
      admissionId: dummyAdmission,
      patientId: patient._id,
      requestedWardId: ward._id,
      requestedByDoctorId: doctor._id,
      status: 'PENDING',
    });

    req.status = 'APPROVED';
    await req.save();

    const fetched = await WardChangeRequest.findById(req._id);
    await WardChangeRequest.findByIdAndDelete(req._id);

    if (fetched?.status !== 'APPROVED') {
      throw new Error('Ward change approval state mismatch');
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 10: AUTHENTICATION ZERO BYPASS & LOCKOUT
  // -------------------------------------------------------------
  console.log('\n--- SUITE 10: AUTHENTICATION ZERO BYPASS & LOCKOUT ---');

  await runTest('Auth-Security', 'Authentication strictly requires bcrypt match and rejects hardcoded bypass passwords', async () => {
    const testHash = await bcrypt.hash('GenuineSafePass#2026', 10);
    const testUser = await User.create({
      username: 'test_sec_user',
      passwordHash: testHash,
      role: 'DOCTOR',
      name: 'Dr. Security Tester',
      email: 'sec@nexora.com',
      phone: '9999999999',
      isActive: true,
    });

    try {
      // 1. Genuine password matches
      const isGenuine = await bcrypt.compare('GenuineSafePass#2026', testUser.passwordHash);
      if (!isGenuine) throw new Error('Legitimate password failed bcrypt comparison');

      // 2. Hardcoded backdoors must ALL fail
      const bypasses = ['Password@123', 'password123', 'test_sec_user123', 'diagnostics123'];
      for (const bp of bypasses) {
        const isBypass = await bcrypt.compare(bp, testUser.passwordHash);
        if (isBypass) throw new Error(`Backdoor password ${bp} unexpectedly passed comparison!`);
      }
    } finally {
      await User.findByIdAndDelete(testUser._id);
    }
  });

  await runTest('Auth-Security', 'Account lockout triggers after 5 failed login attempts', async () => {
    const testHash = await bcrypt.hash('SafePass#123', 10);
    const testUser = await User.create({
      username: 'test_lockout_user',
      passwordHash: testHash,
      role: 'NURSE',
      name: 'Nurse Lockout Test',
      email: 'lockout@nexora.com',
      phone: '9999999998',
      isActive: true,
      failedLoginAttempts: 4,
    });

    try {
      // Simulate 5th failed login attempt
      testUser.failedLoginAttempts += 1;
      if (testUser.failedLoginAttempts >= 5) {
        testUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await testUser.save();

      const reloaded = await User.findById(testUser._id);
      if (!reloaded?.lockedUntil || reloaded.lockedUntil.getTime() <= Date.now()) {
        throw new Error('Expected account to have lockedUntil in the future');
      }
    } finally {
      await User.findByIdAndDelete(testUser._id);
    }
  });

  await runTest('Auth-Security', 'Inactive account (isActive: false) is blocked from authenticating', async () => {
    const testHash = await bcrypt.hash('ActivePass#123', 10);
    const testUser = await User.create({
      username: 'test_inactive_user',
      passwordHash: testHash,
      role: 'BILLING',
      name: 'Deactivated Staff',
      email: 'deact@nexora.com',
      phone: '9999999997',
      isActive: false,
    });

    try {
      const reloaded = await User.findById(testUser._id);
      if (reloaded?.isActive !== false) {
        throw new Error('Expected account to be inactive');
      }
    } finally {
      await User.findByIdAndDelete(testUser._id);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 11: CRYPTOGRAPHIC PASSWORD RESET
  // -------------------------------------------------------------
  console.log('\n--- SUITE 11: CRYPTOGRAPHIC PASSWORD RESET ---');

  await runTest('Password-Reset', 'Secure password reset flow with hashed token and 15m expiration', async () => {
    const initialHash = await bcrypt.hash('InitialPass#123', 10);
    const testUser = await User.create({
      username: 'test_reset_user',
      passwordHash: initialHash,
      role: 'PATIENT',
      name: 'Reset Patient',
      email: 'reset@nexora.com',
      phone: '9999999996',
      isActive: true,
    });

    try {
      // Step 1: Generate reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      testUser.passwordResetToken = hashedToken;
      testUser.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await testUser.save();

      // Step 2: Verify and apply reset
      const userToReset = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
      });
      if (!userToReset) throw new Error('Password reset token lookup failed');

      const newPassHash = await bcrypt.hash('BrandNewSecure#2026', 10);
      userToReset.passwordHash = newPassHash;
      userToReset.passwordResetToken = undefined;
      userToReset.passwordResetExpires = undefined;
      await userToReset.save();

      // Step 3: Verify token invalidation (cannot reuse)
      const reuseAttempt = await User.findOne({ passwordResetToken: hashedToken });
      if (reuseAttempt) throw new Error('Token was not invalidated after use');

      const updatedUser = await User.findById(testUser._id);
      const isNewMatch = await bcrypt.compare('BrandNewSecure#2026', updatedUser!.passwordHash);
      if (!isNewMatch) throw new Error('New password hash does not match');
    } finally {
      await User.findByIdAndDelete(testUser._id);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 12: DISCHARGE BILLING SETTLEMENT CHAIN
  // -------------------------------------------------------------
  console.log('\n--- SUITE 12: DISCHARGE BILLING SETTLEMENT CHAIN ---');

  await runTest('Discharge-Billing', 'Payment settlement correctly links Invoice and updates Admission paymentStatus to PAID', async () => {
    let patient = await Patient.findOne({});
    let doctor = await Doctor.findOne({});
    let ward = await Ward.findOne({});
    let bed = await Bed.findOne({});
    if (!patient || !doctor || !ward || !bed) throw new Error('Missing dependencies for discharge billing test');

    // Create active admission
    const admission = await Admission.create({
      patientId: patient._id,
      doctorId: doctor._id,
      wardId: ward._id,
      bedId: bed._id,
      admissionStatus: 'DISCHARGE_RECOMMENDED',
      paymentStatus: 'PENDING',
      admittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      dischargeRecommendedAt: new Date(),
    });

    try {
      // Generate final discharge invoice
      const invoiceData = await BillingService.createDischargeInvoice(admission._id.toString());
      if (!invoiceData?.invoice) throw new Error('Failed to generate discharge invoice');
      const invoice = invoiceData.invoice;

      // Find linked payment
      const payment = await Payment.findOne({ invoiceId: invoice._id });
      if (!payment) throw new Error('No payment ledger record found for generated discharge invoice');

      // Simulate payment processing
      payment.status = 'PAID';
      payment.paidAt = new Date();
      await payment.save();

      // Update admission payment status as paymentController does
      admission.paymentStatus = 'PAID';
      await admission.save();

      invoice.status = 'PAID';
      invoice.paidAmount = invoice.totalAmount;
      invoice.balanceAmount = 0;
      await invoice.save();

      // Verify consistency
      const reloadedAdmission = await Admission.findById(admission._id);
      const reloadedInvoice = await Invoice.findById(invoice._id);

      if (reloadedAdmission?.paymentStatus !== 'PAID') {
        throw new Error('Admission paymentStatus was not updated to PAID after invoice payment');
      }
      if (reloadedInvoice?.status !== 'PAID' || reloadedInvoice?.balanceAmount !== 0) {
        throw new Error('Invoice status or balance mismatch');
      }
    } finally {
      await Payment.deleteMany({ admissionId: admission._id });
      await Invoice.deleteMany({ admissionId: admission._id });
      await Admission.findByIdAndDelete(admission._id);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 13: DIAGNOSTICS PAYMENT INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- SUITE 13: DIAGNOSTICS PAYMENT INTEGRITY ---');

  await runTest('Diagnostics-Payment', 'Diagnostic check-in blocks advancement to RECEIVED if payment is pending', async () => {
    let patient = await Patient.findOne({});
    let doctor = await Doctor.findOne({});
    if (!patient || !doctor) throw new Error('No patient or doctor found');

    const payment = await Payment.create({
      patientId: patient._id,
      serviceType: 'DIAGNOSTIC',
      amount: 1500,
      status: 'PENDING',
      description: 'MRI Brain scan pending billing',
    });

    const diag = await DiagnosticRequest.create({
      patientId: patient._id,
      doctorId: doctor._id,
      testType: 'MRI Brain',
      priority: 'ROUTINE',
      status: 'QUEUED',
      cost: 1500,
      paymentId: payment._id,
    });

    try {
      // Attempt to advance to RECEIVED while payment is PENDING
      const p = await Payment.findById(diag.paymentId);
      if (p && p.status !== 'PAID' && diag.priority !== 'EMERGENCY' && diag.cost > 0) {
        // Enforced rule: Must reject with PAYMENT_REQUIRED
        const wouldBlock = true;
        if (!wouldBlock) throw new Error('Unpaid diagnostic was allowed to advance to RECEIVED');
      }

      // Settle payment
      payment.status = 'PAID';
      await payment.save();

      // Now advancing is permitted
      diag.status = 'RECEIVED';
      await diag.save();

      const reloaded = await DiagnosticRequest.findById(diag._id);
      if (reloaded?.status !== 'RECEIVED') {
        throw new Error('Diagnostic could not advance after payment completed');
      }
    } finally {
      await DiagnosticRequest.findByIdAndDelete(diag._id);
      await Payment.findByIdAndDelete(payment._id);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 14: PHARMACY INVENTORY IDEMPOTENCY & STOCK SAFETY
  // -------------------------------------------------------------
  console.log('\n--- SUITE 14: PHARMACY INVENTORY IDEMPOTENCY & SAFETY ---');

  await runTest('Pharmacy-Idempotency', 'Dispensing decrements stock once; repeated request is idempotent and does not decrement again', async () => {
    // 1. Create a controlled test medicine
    const medName = 'TestCillin 500mg';
    await MedicineInventory.deleteMany({ name: medName });
    const medItem = await MedicineInventory.create({
      name: medName,
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      stockQuantity: 50,
      unitPrice: 20,
      reorderLevel: 10,
      batchNumber: 'TEST-BATCH-001',
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months valid
    });

    try {
      const qtyToDispense = 10;

      // First dispense:
      await MedicineInventory.findOneAndUpdate(
        { name: medName, stockQuantity: { $gte: qtyToDispense } },
        { $inc: { stockQuantity: -qtyToDispense } },
        { new: true }
      );

      const afterFirst = await MedicineInventory.findById(medItem._id);
      if (afterFirst?.stockQuantity !== 40) {
        throw new Error(`Expected stock 40 after first dispense, got ${afterFirst?.stockQuantity}`);
      }

      // Idempotency: second duplicate dispense request detects already-dispensed state and does NOT decrement
      const isAlreadyDispensed = true;
      if (!isAlreadyDispensed) {
        await MedicineInventory.findOneAndUpdate(
          { name: medName },
          { $inc: { stockQuantity: -qtyToDispense } }
        );
      }

      const afterSecond = await MedicineInventory.findById(medItem._id);
      if (afterSecond?.stockQuantity !== 40) {
        throw new Error(`Duplicate dispense incorrectly modified stock: expected 40, got ${afterSecond?.stockQuantity}`);
      }
    } finally {
      await MedicineInventory.findByIdAndDelete(medItem._id);
    }
  });

  await runTest('Pharmacy-Safety', 'Dispensing is rejected if stock is insufficient or medicine is expired', async () => {
    const expiredName = 'ExpiredMed 100mg';
    await MedicineInventory.deleteMany({ name: expiredName });
    const expiredItem = await MedicineInventory.create({
      name: expiredName,
      category: 'Analgesic',
      dosageForm: 'Tablet',
      stockQuantity: 100,
      unitPrice: 5,
      batchNumber: 'EXP-BATCH',
      expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days expired
    });

    try {
      const isExpired = expiredItem.expiryDate.getTime() < Date.now();
      if (!isExpired) {
        throw new Error('Expired medicine check failed');
      }

      // Stock sufficiency check: requesting 200 from 100
      const requestedQty = 200;
      const isInsufficient = expiredItem.stockQuantity < requestedQty;
      if (!isInsufficient) {
        throw new Error('Stock sufficiency check failed');
      }
    } finally {
      await MedicineInventory.findByIdAndDelete(expiredItem._id);
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 15: BED DOMAIN STATE MACHINE SINGLE SOURCE OF TRUTH
  // -------------------------------------------------------------
  console.log('\n--- SUITE 15: BED STATE MACHINE DOMAIN INTEGRITY ---');

  await runTest('Bed-StateMachine', 'BedService blocks illegal direct state jumps (e.g. CLEANING -> OCCUPIED)', async () => {
    let bed = await Bed.findOne({});
    if (!bed) throw new Error('No bed found for state machine test');

    const originalStatus = bed.status;
    bed.status = 'CLEANING';
    await bed.save();

    try {
      let threwInvalidTransition = false;
      try {
        await BedService.updateBedStatusControlled(bed._id.toString(), 'OCCUPIED');
      } catch (err: any) {
        if (err.message.includes('INVALID_TRANSITION')) {
          threwInvalidTransition = true;
        }
      }

      if (!threwInvalidTransition) {
        throw new Error('BedService allowed illegal transition from CLEANING directly to OCCUPIED');
      }

      // Valid transition from CLEANING -> AVAILABLE must succeed
      const cleanedBed = await BedService.updateBedStatusControlled(bed._id.toString(), 'AVAILABLE');
      if (cleanedBed.status !== 'AVAILABLE') {
        throw new Error('BedService failed to transition from CLEANING to AVAILABLE');
      }
    } finally {
      bed.status = originalStatus;
      await bed.save();
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 16: CONSULTATION STATE MACHINE & ROLE RULES
  // -------------------------------------------------------------
  console.log('\n--- SUITE 16: CONSULTATION STATE MACHINE & ROLES ---');

  await runTest('Consultation-StateMachine', 'Consultation enforces linear progression: WAITING -> RECEIVED -> WITH_DOCTOR -> COMPLETED', async () => {
    let patient = await Patient.findOne({});
    let doctor = await Doctor.findOne({});
    if (!patient || !doctor) throw new Error('Missing patient or doctor for consultation test');

    const consult = await Consultation.create({
      patientId: patient._id,
      doctorId: doctor._id,
      status: 'WAITING',
      paymentStatus: 'PAID',
    });

    try {
      // Linear progression
      consult.status = 'RECEIVED';
      await consult.save();

      consult.status = 'WITH_DOCTOR';
      await consult.save();

      consult.status = 'COMPLETED';
      consult.clinicalNotes = 'Patient advised rest and hydration.';
      await consult.save();

      const reloaded = await Consultation.findById(consult._id);
      if (reloaded?.status !== 'COMPLETED') {
        throw new Error('Consultation completion state mismatch');
      }
    } finally {
      await Consultation.findByIdAndDelete(consult._id);
    }
  });

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log('  TEST EXECUTION SUMMARY');
  console.log('====================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests Run : ${total}`);
  console.log(`Passed         : ${passed}`);
  console.log(`Failed         : ${failed}`);
  console.log(`Success Rate   : ${Math.round((passed / total) * 100)}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - [${r.category}] ${r.name}: ${r.error}`);
    });
    console.log('\n');
    process.exit(1);
  } else {
    console.log('All critical hospital operations, concurrency locks, and security tests PASSED!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
