import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
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

const router = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.post('/auth/login', authCtrl.login);
router.post('/auth/reset-password', authCtrl.resetPassword);

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
router.post('/patients/self-register', patientCtrl.selfRegisterPatient);
router.get('/patients/search', patientCtrl.searchPatients);
router.get('/patients/all', patientCtrl.getAllPatients);
router.get('/patients/timeline/all', requireRole('ADMIN'), patientCtrl.getAllTimelineEvents);
router.get('/patients/:id', patientCtrl.getPatientById);
router.get('/patients/:patientId/timeline', patientCtrl.getPatientTimeline);

// --- Doctor Routes ---
router.get('/doctors', doctorCtrl.getAllDoctors);
router.get('/doctors/:id', doctorCtrl.getDoctorById);
router.put('/doctors/:id/availability', requireRole(['ADMIN', 'DOCTOR']), doctorCtrl.updateAvailability);

// --- Hospital Structure & Beds ---
router.get('/beds', structureCtrl.getBeds);
router.get('/beds/hierarchy', structureCtrl.getHierarchy);
router.get('/beds/stats', structureCtrl.getStats);
router.get('/beds/:id', structureCtrl.getBedById);
router.put('/beds/:id/status', structureCtrl.updateBedStatus);
// Admin structure editing
router.post('/beds/blocks', requireRole('ADMIN'), structureCtrl.createBlock);
router.post('/beds/floors', requireRole('ADMIN'), structureCtrl.createFloor);
router.post('/beds/departments', requireRole('ADMIN'), structureCtrl.createDepartment);
router.post('/beds/wards', requireRole('ADMIN'), structureCtrl.createWard);
router.post('/beds/bedsets', requireRole('ADMIN'), structureCtrl.createBedSet);
router.post('/beds/create', requireRole('ADMIN'), structureCtrl.createBed);

// --- Consultation Routes ---
router.post('/consultations/create', requireRole('RECEPTION'), consultCtrl.createConsultation);
router.put('/consultations/:id/status', consultCtrl.updateConsultationStatus);
router.get('/consultations/doctor/:doctorId', consultCtrl.getDoctorConsultations);
router.get('/consultations/patient/:patientId', consultCtrl.getPatientAppointments);
router.get('/consultations/all', requireRole('ADMIN'), consultCtrl.getAllConsultations);

// --- Referral Routes ---
router.post('/referrals/create', requireRole('DOCTOR'), referralCtrl.createReferral);
router.post('/referrals', requireRole('DOCTOR'), referralCtrl.createReferral);
router.put('/referrals/:id', requireRole('DOCTOR'), referralCtrl.updateReferral);
router.delete('/referrals/:id', requireRole('DOCTOR'), referralCtrl.deleteReferral);
router.get('/referrals/doctor/:doctorId', referralCtrl.getDoctorReferrals);
router.get('/referrals/patient/:patientId', referralCtrl.getPatientReferrals);

// --- Admission Routes ---
router.post('/admissions/recommend', requireRole('DOCTOR'), admissionCtrl.recommendAdmission);
router.put('/admissions/:id/recommend', requireRole('DOCTOR'), admissionCtrl.updateAdmissionRecommendation);
router.delete('/admissions/:id/recommend', requireRole('DOCTOR'), admissionCtrl.cancelAdmissionRecommendation);
router.post('/admissions/pay-and-reserve', requireRole('RECEPTION'), admissionCtrl.payAndReserveAdmission);
router.post('/admissions/:id/admit', requireRole('WARD_STAFF'), admissionCtrl.confirmAdmission);
router.post('/admissions/ward-change-request', requireRole('RECEPTION'), admissionCtrl.createWardChangeRequest);
router.put('/admissions/ward-change-request/:requestId', requireRole('DOCTOR'), admissionCtrl.handleWardChangeRequest);
router.post('/admissions/:id/recommend-discharge', requireRole('DOCTOR'), admissionCtrl.recommendDischarge);
router.post('/admissions/:id/discharge', requireRole('WARD_STAFF'), admissionCtrl.confirmDischarge);
router.post('/admissions/:id/send-for-scan', requireRole('WARD_STAFF'), admissionCtrl.sendForScan);
router.post('/admissions/:id/return-from-scan', requireRole('WARD_STAFF'), admissionCtrl.returnFromScan);
router.post('/beds/finish-cleaning', requireRole(['WARD_STAFF', 'ADMIN']), admissionCtrl.finishCleaning);
router.get('/admissions/active', requireRole(['ADMIN', 'RECEPTION', 'WARD_STAFF', 'DOCTOR']), admissionCtrl.getActiveAdmissions);
router.get('/admissions/patient/:patientId', admissionCtrl.getPatientAdmissions);
router.get('/admissions/ward-change-requests', requireRole(['ADMIN', 'RECEPTION', 'DOCTOR']), admissionCtrl.getWardChangeRequests);

// --- Diagnostic Routes ---
router.post('/diagnostics/request', requireRole('DOCTOR'), diagCtrl.requestDiagnostic);
router.put('/diagnostics/:id', requireRole('DOCTOR'), diagCtrl.updateDiagnosticRequest);
router.delete('/diagnostics/:id', requireRole('DOCTOR'), diagCtrl.deleteDiagnosticRequest);
router.get('/diagnostics', diagCtrl.getAllDiagnostics);
router.get('/diagnostics/patient/:patientId', diagCtrl.getPatientDiagnostics);
router.put('/diagnostics/:id/status', diagCtrl.updateDiagnosticStatus);

// --- Pharmacy Routes ---
router.post('/prescriptions', requireRole('DOCTOR'), pharmacyCtrl.createPrescription);
router.put('/prescriptions/:id', requireRole('DOCTOR'), pharmacyCtrl.updatePrescription);
router.delete('/prescriptions/:id', requireRole('DOCTOR'), pharmacyCtrl.deletePrescription);
router.get('/pharmacy/queue', requireRole(['PHARMACY', 'BILLING']), pharmacyCtrl.getPharmacyQueue);
router.put('/pharmacy/queue/:id/status', requireRole('PHARMACY'), pharmacyCtrl.updatePharmacyQueueStatus);
router.get('/prescriptions/patient/:patientId', pharmacyCtrl.getPatientPrescriptions);

// --- Payment Routes ---
router.get('/payments/pending/:patientId', paymentCtrl.getPendingPayments);
router.get('/payments/history/:patientId', paymentCtrl.getPaymentHistory);
router.get('/payments', requireRole(['BILLING', 'ADMIN']), paymentCtrl.getAllPayments);
router.post('/payments/:id/pay', requireRole(['RECEPTION', 'BILLING']), paymentCtrl.processPayment);

// --- Emergency Routes ---
router.post('/emergency/alert', requireRole('DOCTOR'), emergencyCtrl.triggerEmergency);
router.get('/emergency/active', emergencyCtrl.getActiveEmergencies);
router.put('/emergency/:id/resolve', requireRole(['DOCTOR', 'NURSE']), emergencyCtrl.resolveEmergency);

// --- Notification Routes ---
router.get('/notifications/:targetId', notificationCtrl.getNotifications);
router.put('/notifications/:id/read', notificationCtrl.markAsRead);
router.post('/notifications/read-all', notificationCtrl.markAllRead);

export default router;
