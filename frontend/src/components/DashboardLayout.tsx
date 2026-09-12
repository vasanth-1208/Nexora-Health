import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { request } from '../services/api';
import {
  LayoutDashboard,
  Building,
  BedDouble,
  LogOut,
  Bell,
  Activity,
  AlertTriangle,
  User,
  Users,
  Search,
  CheckSquare,
  FileText,
  CreditCard,
  RefreshCw,
  BarChart2,
  UserPlus,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, activeEmergencies, clearNotifications, resolveEmergencyLocal } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DOCTOR': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'NURSE': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'RECEPTION': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'WARD_STAFF': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DIAGNOSTICS': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'PHARMACY': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'BILLING': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PATIENT': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getNavigationLinks = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Patients', path: '/admin/patients', icon: Users },
          { name: 'Structure', path: '/admin/hospital-structure', icon: Building },
          { name: 'Bed Overview', path: '/admin/beds', icon: BedDouble },
          { name: 'Staff & Access', path: '/admin/users', icon: Users },
          { name: 'Billing & Payments', path: '/admin/payments', icon: CreditCard },
          { name: 'Emergency Center', path: '/admin/emergency', icon: AlertTriangle },
          { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart2 },
          { name: 'Notifications', path: '/admin/notifications', icon: Bell },
        ];
      case 'RECEPTION':
        return [
          { name: 'Bed Occupancy Grid', path: '/reception/beds', icon: BedDouble },
          { name: 'Register Patient', path: '/reception/register', icon: UserPlus },
          { name: 'Patient Flow Desk', path: '/reception/patients', icon: Search },
          { name: 'Cashier Billing Desk', path: '/reception/billing', icon: CreditCard },
        ];
      case 'DOCTOR':
        return [
          { name: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
          { name: 'Inpatients', path: '/doctor/admissions', icon: BedDouble },
          { name: 'Ward Actions', path: '/doctor/ward-changes', icon: ClipboardList },
        ];
      case 'NURSE':
        return [
          { name: 'Dashboard', path: '/nurse/dashboard', icon: LayoutDashboard },
        ];
      case 'WARD_STAFF':
        return [
          { name: 'Ward Bed Directory', path: '/ward/beds', icon: BedDouble },
          { name: 'Inpatient Stay Board', path: '/ward/inpatients', icon: Users },
          { name: 'Diagnostics Tracking', path: '/ward/diagnostics', icon: Activity },
        ];
      case 'DIAGNOSTICS':
        return [
          { name: 'Lab Queue Desk', path: '/diagnostics/dashboard', icon: CheckSquare },
        ];
      case 'PHARMACY':
        return [
          { name: 'Prescription Queue', path: '/pharmacy/dashboard', icon: FileText },
        ];
      case 'BILLING':
        return [
          { name: 'Billing Centre', path: '/billing/dashboard', icon: CreditCard },
        ];
      case 'PATIENT':
        return [
          { name: 'My Patient Portal', path: '/patient/dashboard', icon: User },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavigationLinks(user.role);

  const handleResolveEmergency = async (alertId: string) => {
    try {
      await request(`/emergency/${alertId}/resolve`, { method: 'PUT' });
      resolveEmergencyLocal(alertId);
    } catch (error) {
      console.error('Failed to resolve emergency:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Real-time Emergency Alert Banner */}
      {activeEmergencies.length > 0 && (
        <div className="bg-red-600 text-white px-4 py-3 shadow-md flex items-center justify-between animate-pulse sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-white shrink-0" />
            <div>
              <span className="font-extrabold uppercase text-xs tracking-wider bg-red-800 px-2 py-0.5 rounded mr-2">
                CRITICAL EMERGENCY
              </span>
              <span className="font-medium">
                {activeEmergencies[0].patientName} ({activeEmergencies[0].patientIdCode}) - {activeEmergencies[0].description}
              </span>
              <span className="text-xs ml-2 opacity-80">
                (Physician alerted: {activeEmergencies[0].doctorName})
              </span>
            </div>
          </div>
          {(user.role === 'DOCTOR' || user.role === 'NURSE') && (
            <button
              onClick={() => handleResolveEmergency(activeEmergencies[0].alertId || activeEmergencies[0]._id)}
              className="bg-white text-red-600 hover:bg-slate-100 font-bold px-3 py-1 rounded-lg text-xs transition shrink-0"
            >
              Mark Resolved
            </button>
          )}
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside
          className={`bg-white text-slate-600 border-r border-slate-200 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out h-full overflow-hidden ${
            sidebarOpen ? 'w-64' : 'w-0 border-r-0'
          }`}
        >
          <div className="flex flex-col h-full overflow-hidden justify-between w-64">
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Logo & Collapse Button */}
              <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <Activity className="h-6 w-6 text-healthcare-650 shrink-0" />
                  <span className="font-extrabold text-lg tracking-tight text-slate-900 truncate">NEXORA HEALTH</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  title="Hide menu column"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 ml-1"
                >
                  <PanelLeftClose className="h-5 w-5" />
                </button>
              </div>

              {/* Nav Menu */}
              <nav className="mt-6 px-4 space-y-1 flex-1 overflow-y-auto no-scrollbar">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  const Icon = link.icon;
                const isNotificationLink = user.role === 'ADMIN' && link.path === '/admin/notifications';

                return (
                  <React.Fragment key={link.path}>
                    {isNotificationLink && (
                      <div className="border-t border-slate-200 my-4" />
                    )}
                    <Link
                      to={link.path}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                        isActive
                          ? 'bg-healthcare-50 text-healthcare-650 font-bold border-l-2 border-healthcare-500 rounded-l-none'
                          : 'hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* User Footer Panel */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-650 border border-slate-200">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${getRoleBadgeColor(user.role)}`}>
                  {user.role === 'DIAGNOSTICS' && user.labType && user.labType !== 'ALL'
                    ? `${user.labType} LAB`
                    : user.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center space-x-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-slate-650 py-2 rounded-lg text-xs font-bold transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

        {/* Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
            <div className="flex items-center space-x-3">
              {/* Show / Hide Sidebar Column Toggle Button right next to NEXORA HEALTH */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Hide sidebar column" : "Show sidebar column"}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border active:scale-95 shrink-0 ${
                  sidebarOpen
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-healthcare-600 hover:bg-healthcare-700 text-white border-healthcare-600 ring-2 ring-healthcare-400/30 shadow-sm'
                }`}
              >
                {sidebarOpen ? (
                  <>
                    <PanelLeftClose className="h-4 w-4 text-slate-500" />
                    <span className="hidden sm:inline">Hide Column</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="h-4 w-4 text-white" />
                    <span>Show Column</span>
                  </>
                )}
              </button>

              <div className="flex items-center space-x-1.5 pl-1">
                <Activity className="h-5 w-5 text-healthcare-600" />
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight whitespace-nowrap">
                  NEXORA HEALTH
                </span>
              </div>
              
              <span className="text-slate-300 hidden md:inline">|</span>

              <div className="hidden md:block">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Unified Operations Portal
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 relative">
              {/* Global Page Refresh Action */}
              <button
                onClick={() => window.dispatchEvent(new Event('nexora-refresh-data'))}
                title="Refresh Analytics & Lists"
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-healthcare-600 transition"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>

              {/* Notification Center */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-600 relative transition"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-xl py-2 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={clearNotifications}
                          className="text-xs font-semibold text-healthcare-600 hover:text-healthcare-750"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-400">
                          No notifications.
                        </div>
                      ) : (
                        notifications.map((n, idx) => (
                          <div
                            key={idx}
                            className={`px-4 py-3 text-xs transition ${
                              n.type === 'EMERGENCY'
                                ? 'bg-red-50 border-l-2 border-red-500'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <p className="text-slate-700 font-medium">{n.message}</p>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar panel for mobile */}
              <div className="flex md:hidden items-center space-x-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-slate-100 text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Page Body content */}
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
