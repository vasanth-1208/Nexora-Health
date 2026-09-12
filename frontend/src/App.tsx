import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import ReceptionDashboard from './pages/ReceptionDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import NurseDashboard from './pages/NurseDashboard';
import WardDashboard from './pages/WardDashboard';
import DiagnosticsDashboard from './pages/DiagnosticsDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import BillingDashboard from './pages/BillingDashboard';
import PatientDashboard from './pages/PatientDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold">Verifying Session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to their own dashboard
    switch (user.role) {
      case 'ADMIN': return <Navigate to="/admin/dashboard" replace />;
      case 'RECEPTION': return <Navigate to="/reception/dashboard" replace />;
      case 'DOCTOR': return <Navigate to="/doctor/dashboard" replace />;
      case 'NURSE': return <Navigate to="/nurse/dashboard" replace />;
      case 'WARD_STAFF': return <Navigate to="/ward/dashboard" replace />;
      case 'DIAGNOSTICS':
        if (user.labType === 'XRAY') return <Navigate to="/diagnostics/xray" replace />;
        if (user.labType === 'CTSCAN') return <Navigate to="/diagnostics/ctscan" replace />;
        if (user.labType === 'PATHOLOGY') return <Navigate to="/diagnostics/pathology" replace />;
        if (user.labType === 'CARDIOLOGY') return <Navigate to="/diagnostics/cardiology" replace />;
        if (user.labType === 'MRI') return <Navigate to="/diagnostics/mri" replace />;
        return <Navigate to="/diagnostics/dashboard" replace />;
      case 'PHARMACY': return <Navigate to="/pharmacy/dashboard" replace />;
      case 'BILLING': return <Navigate to="/billing/dashboard" replace />;
      case 'PATIENT': return <Navigate to="/patient/dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Role-Based Routers */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="patients" element={<AdminDashboard />} />
              <Route path="patient-flow" element={<AdminDashboard />} />
              <Route path="operations" element={<AdminDashboard />} />
              <Route path="clinical-services" element={<AdminDashboard />} />
              <Route path="users" element={<AdminDashboard />} />
              <Route path="hospital-structure" element={<AdminDashboard />} />
              <Route path="beds" element={<AdminDashboard />} />
              <Route path="departments" element={<AdminDashboard />} />
              <Route path="appointments" element={<AdminDashboard />} />
              <Route path="admissions" element={<AdminDashboard />} />
              <Route path="diagnostics" element={<AdminDashboard />} />
              <Route path="pharmacy" element={<AdminDashboard />} />
              <Route path="payments" element={<AdminDashboard />} />
              <Route path="emergency" element={<AdminDashboard />} />
              <Route path="notifications" element={<AdminDashboard />} />
              <Route path="reports" element={<AdminDashboard />} />
              <Route path="audit-logs" element={<AdminDashboard />} />
            </Route>

            <Route
              path="/reception"
              element={
                <ProtectedRoute roles={['RECEPTION']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<ReceptionDashboard />} />
              <Route path="patients" element={<ReceptionDashboard />} />
              <Route path="register" element={<ReceptionDashboard />} />
              <Route path="beds" element={<ReceptionDashboard />} />
              <Route path="billing" element={<ReceptionDashboard />} />
            </Route>

            <Route
              path="/doctor"
              element={
                <ProtectedRoute roles={['DOCTOR']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="admissions" element={<DoctorDashboard />} />
              <Route path="inpatients" element={<DoctorDashboard />} />
              <Route path="ward-changes" element={<DoctorDashboard />} />
            </Route>

            <Route
              path="/nurse"
              element={
                <ProtectedRoute roles={['NURSE']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<NurseDashboard />} />
            </Route>

            <Route
              path="/ward"
              element={
                <ProtectedRoute roles={['WARD_STAFF']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Navigate to="/ward/beds" replace />} />
              <Route path="beds" element={<WardDashboard />} />
              <Route path="inpatients" element={<WardDashboard />} />
              <Route path="diagnostics" element={<WardDashboard />} />
            </Route>

            <Route
              path="/diagnostics"
              element={
                <ProtectedRoute roles={['DIAGNOSTICS']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DiagnosticsDashboard />} />
              <Route path="all" element={<DiagnosticsDashboard />} />
              <Route path="xray" element={<DiagnosticsDashboard />} />
              <Route path="ctscan" element={<DiagnosticsDashboard />} />
              <Route path="pathology" element={<DiagnosticsDashboard />} />
              <Route path="cardiology" element={<DiagnosticsDashboard />} />
              <Route path="ecg" element={<DiagnosticsDashboard />} />
              <Route path="mri" element={<DiagnosticsDashboard />} />
              <Route path="ultrasound" element={<DiagnosticsDashboard />} />
            </Route>

            <Route
              path="/pharmacy"
              element={
                <ProtectedRoute roles={['PHARMACY']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<PharmacyDashboard />} />
            </Route>

            <Route
              path="/billing"
              element={
                <ProtectedRoute roles={['BILLING']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<BillingDashboard />} />
            </Route>

            <Route
              path="/patient"
              element={
                <ProtectedRoute roles={['PATIENT']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<PatientDashboard />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
