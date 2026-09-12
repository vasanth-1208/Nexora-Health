import { Router } from 'express';
import { authenticateToken, requireRole, requireOwnershipOrStaff } from '../middleware/auth';
import * as authCtrl from '../controllers/authController';
import * as userCtrl from '../controllers/userController';
import * as patientCtrl from '../controllers/patientController';
import * as doctorCtrl from '../controllers/doctorController';
import * as structureCtrl from '../controllers/structureController';
import * as consultCtrl from '../controllers/consultationController';
import * as referralCtrl from '../controllers/referralController';
import * as admissionCtrl from '../controllers/admissionController';
import * as diagCtrl from '../controllers/diagnosticController';
import * as pharmacyCtrl from '../controllers/pharmacyController';
import * as paymentCtrl from '../controllers/paymentController';
import * as emergencyCtrl from '../controllers/emergencyController';
import * as notificationCtrl from '../controllers/notificationController';
import * as analyticsCtrl from '../controllers/analyticsController';

const router = Router();

// ==========================================
// PUBLIC ROUTES (Unauthenticated)
// ==========================================
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
router.post('/auth/login', authCtrl.login);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);
// Allow public self-registration for new patients
router.post('/patients/self-register', patientCtrl.selfRegisterPatient);

// ==========================================
// PROTECTED ROUTES (Requires authentication)
// ==========================================
router.use(authenticateToken);

router.get('/auth/me', authCtrl.getMe);

// --- User Management (Admin Staff creation) ---
router.post('/users/register-staff', requireRole('ADMIN'), userCtrl.registerStaff);
router.get('/users/staff', requireRole(['ADMIN', 'RECEPTION']), userCtrl.getAllStaff);

// --- Patient Routes ---
router.post('/patients/register', requireRole('RECEPTION'), patientCtrl.registerPatient);
router.get('/patients/search', requireRole(['ADMIN', 'RECEPTION', 'DOCTOR', 'NURSE', 'WARD_STAFF', 'BILLING']), patientCtrl.searchPatients);
router.get('/patients/all', requireRole(['ADMIN', 'RECEPTION', 'DOCTOR', 'NURSE', 'BILLING']), patientCtrl.getAllPatients);
router.get('/patients/timeline/all', requireRole('ADMIN'), patientCtrl.getAllTimelineEvents);
router.get('/patients/:id', requireOwnershipOrStaff(), patientCtrl.getPatientById);
router.get('/patients/:patientId/timeline', requireOwnershipOrStaff(), patientCtrl.getPatientTimeline);

// --- Doctor Routes ---
router.get('/doctors', doctorCtrl.getAllDoctors);
router.get('/doctors/:id', doctorCtrl.getDoctorById);
router.put('/doctors/:id/availability', requireRole(['ADMIN', 'DOCTOR']), doctorCtrl.updateAvailability);

// --- Hospital Structure & Beds ---
router.get('/beds', structureCtrl.getBeds);
router.get('/beds/hierarchy', structureCtrl.getHierarchy);
router.get('/beds/stats', structureCtrl.getStats);
router.get('/beds/:id', structureCtrl.getBedById);
router.put('/beds/:id/status', requireRole(['ADMIN', 'WARD_STAFF']), structureCtrl.updateBedStatus);

// Admin structure editing
router.post('/beds/blocks', requireRole('ADMIN'), structureCtrl.createBlock);
router.post('/beds/floors', requireRole('ADMIN'), structureCtrl.createFloor);
router.post('/beds/departments', requireRole('ADMIN'), structureCtrl.createDepartment);
router.post('/beds/wards', requireRole('ADMIN'), structureCtrl.createWard);
router.post('/beds/bedsets', requireRole('ADMIN'), structureCtrl.createBedSet);
router.post('/beds/create', requireRole('ADMIN'), structureCtrl.createBed);

// --- Consultation Routes ---
router.post('/consultations/create', requireRole('RECEPTION'), consultCtrl.createConsultation);
router.put('/consultations/:id/status', requireRole(['DOCTOR', 'NURSE', 'RECEPTION', 'ADMIN']), consultCtrl.updateConsultationStatus);
router.get('/consultations/doctor/:doctorId', requireRole(['DOCTOR', 'NURSE', 'RECEPTION', 'ADMIN']), consultCtrl.getDoctorConsultations);
router.get('/consultations/patient/:patientId', requireOwnershipOrStaff(), consultCtrl.getPatientAppointments);
router.get('/consultations/all', requireRole('ADMIN'), consultCtrl.getAllConsultations);

// --- Referral Routes ---
router.post('/referrals', requireRole(['DOCTOR', 'ADMIN']), referralCtrl.createReferral);
router.put('/referrals/:id', requireRole(['DOCTOR', 'ADMIN']), referralCtrl.updateReferral);
router.delete('/referrals/:id', requireRole(['DOCTOR', 'ADMIN']), referralCtrl.deleteReferral);
router.get('/referrals/doctor/:doctorId', requireRole(['DOCTOR', 'RECEPTION', 'ADMIN']), referralCtrl.getDoctorReferrals);
router.get('/referrals/patient/:patientId', requireOwnershipOrStaff(), referralCtrl.getPatientReferrals);

// --- Admission Routes ---
router.post('/admissions/recommend', requireRole(['DOCTOR', 'ADMIN']), admissionCtrl.recommendAdmission);
router.put('/admissions/:id/recommend', requireRole(['DOCTOR', 'ADMIN']), admissionCtrl.updateAdmissionRecommendation);
router.delete('/admissions/:id/recommend', requireRole(['DOCTOR', 'ADMIN']), admissionCtrl.cancelAdmissionRecommendation);
router.post('/admissions/pay-and-reserve', requireRole(['RECEPTION', 'ADMIN']), admissionCtrl.payAndReserveAdmission);
router.post('/admissions/:id/admit', requireRole(['WARD_STAFF', 'ADMIN']), admissionCtrl.confirmAdmission);
router.post('/admissions/ward-change-request', requireRole(['RECEPTION', 'ADMIN', 'DOCTOR']), admissionCtrl.createWardChangeRequest);
router.put('/admissions/ward-change-request/:requestId', requireRole(['DOCTOR', 'ADMIN']), admissionCtrl.handleWardChangeRequest);
router.post('/admissions/:id/recommend-discharge', requireRole(['DOCTOR', 'ADMIN']), admissionCtrl.recommendDischarge);
router.post('/admissions/:id/discharge', requireRole(['WARD_STAFF', 'ADMIN']), admissionCtrl.confirmDischarge);
router.post('/admissions/:id/send-for-scan', requireRole(['WARD_STAFF', 'ADMIN']), admissionCtrl.sendForScan);
router.post('/admissions/:id/return-from-scan', requireRole(['WARD_STAFF', 'ADMIN']), admissionCtrl.returnFromScan);
router.post('/beds/finish-cleaning', requireRole(['WARD_STAFF', 'ADMIN']), admissionCtrl.finishCleaning);
router.get('/admissions/active', requireRole(['ADMIN', 'RECEPTION', 'WARD_STAFF', 'DOCTOR']), admissionCtrl.getActiveAdmissions);
router.get('/admissions/patient/:patientId', requireOwnershipOrStaff(), admissionCtrl.getPatientAdmissions);
router.get('/admissions/ward-change-requests', requireRole(['ADMIN', 'RECEPTION', 'DOCTOR']), admissionCtrl.getWardChangeRequests);

// --- Diagnostic Routes ---
router.post('/diagnostics/request', requireRole(['DOCTOR', 'ADMIN']), diagCtrl.requestDiagnostic);
router.put('/diagnostics/:id', requireRole(['DOCTOR', 'ADMIN']), diagCtrl.updateDiagnosticRequest);
router.delete('/diagnostics/:id', requireRole(['DOCTOR', 'ADMIN']), diagCtrl.deleteDiagnosticRequest);
router.get('/diagnostics', requireRole(['DIAGNOSTICS', 'DOCTOR', 'WARD_STAFF', 'ADMIN']), diagCtrl.getAllDiagnostics);
router.get('/diagnostics/patient/:patientId', requireOwnershipOrStaff(), diagCtrl.getPatientDiagnostics);
router.put('/diagnostics/:id/status', requireRole(['DIAGNOSTICS', 'ADMIN']), diagCtrl.updateDiagnosticStatus);

// --- Pharmacy Routes ---
router.post('/prescriptions', requireRole(['DOCTOR', 'ADMIN']), pharmacyCtrl.createPrescription);
router.put('/prescriptions/:id', requireRole(['DOCTOR', 'ADMIN']), pharmacyCtrl.updatePrescription);
router.delete('/prescriptions/:id', requireRole(['DOCTOR', 'ADMIN']), pharmacyCtrl.deletePrescription);
router.get('/pharmacy/queue', requireRole(['PHARMACY', 'BILLING', 'ADMIN']), pharmacyCtrl.getPharmacyQueue);
router.put('/pharmacy/queue/:id/status', requireRole(['PHARMACY', 'ADMIN']), pharmacyCtrl.updatePharmacyQueueStatus);
router.get('/prescriptions/patient/:patientId', requireOwnershipOrStaff(), pharmacyCtrl.getPatientPrescriptions);

// --- Payment & Billing Routes ---
router.get('/payments/pending/:patientId', requireOwnershipOrStaff(), paymentCtrl.getPendingPayments);
router.get('/payments/history/:patientId', requireOwnershipOrStaff(), paymentCtrl.getPaymentHistory);
router.get('/payments', requireRole(['BILLING', 'ADMIN']), paymentCtrl.getAllPayments);
router.post('/payments/:id/pay', requireRole(['RECEPTION', 'BILLING', 'ADMIN']), paymentCtrl.processPayment);

// --- Emergency Routes ---
router.post('/emergency/alert', requireRole(['DOCTOR', 'ADMIN', 'NURSE']), emergencyCtrl.triggerEmergency);
router.get('/emergency/active', emergencyCtrl.getActiveEmergencies);
router.put('/emergency/:id/resolve', requireRole(['DOCTOR', 'NURSE', 'ADMIN']), emergencyCtrl.resolveEmergency);

// --- Notification Routes ---
router.get('/notifications/:targetId', requireOwnershipOrStaff(), notificationCtrl.getNotifications);
router.put('/notifications/:id/read', notificationCtrl.markAsRead);
router.post('/notifications/read-all', notificationCtrl.markAllRead);

// --- Analytics Routes ---
router.get('/analytics/metrics', requireRole(['ADMIN', 'RECEPTION', 'DOCTOR', 'BILLING']), analyticsCtrl.getHospitalMetrics);

export default router;
