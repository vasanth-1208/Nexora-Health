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
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGlobalRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event('nexora-refresh-data'));
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DOCTOR': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NURSE': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'RECEPTION': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'WARD_STAFF': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DIAGNOSTICS': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'PHARMACY': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'BILLING': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PATIENT': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
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
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden selection:bg-healthcare-100 selection:text-healthcare-800">
      {/* Real-time Emergency Alert Banner */}
      {activeEmergencies.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-3 shadow-md flex items-center justify-between animate-pulse sticky top-0 z-50">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-1 bg-white/20 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="truncate">
              <span className="font-black uppercase text-[10px] tracking-wider bg-black/30 px-2 py-0.5 rounded-md mr-2">
                CRITICAL EMERGENCY
              </span>
              <span className="font-bold text-xs sm:text-sm">
                {activeEmergencies[0].patientName} ({activeEmergencies[0].patientIdCode}) — {activeEmergencies[0].description}
              </span>
              <span className="text-xs ml-2 opacity-90 hidden md:inline">
                (Attending: {activeEmergencies[0].doctorName})
              </span>
            </div>
          </div>
          {(user.role === 'DOCTOR' || user.role === 'NURSE' || user.role === 'ADMIN') && (
            <button
              onClick={() => handleResolveEmergency(activeEmergencies[0].alertId || activeEmergencies[0]._id)}
              className="bg-white text-rose-700 hover:bg-slate-100 font-extrabold px-3 py-1.5 rounded-xl text-xs transition shrink-0 shadow-xs ml-3"
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
          className={`bg-white text-slate-600 border-r border-slate-200/80 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out h-full overflow-hidden ${
            sidebarOpen ? 'w-64' : 'w-0 border-r-0'
          }`}
        >
          <div className="flex flex-col h-full overflow-hidden justify-between w-64">
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Brand Header & Sidebar Collapse Button */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-healthcare-600 to-sky-500 flex items-center justify-center text-white shadow-xs">
                    <Activity className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-black text-sm tracking-tight text-slate-900 block truncate leading-none">
                      NEXORA HEALTH
                    </span>
                    <span className="text-[9px] font-bold text-healthcare-600 uppercase tracking-widest block mt-0.5">
                      Smart Operations
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  title="Hide menu column"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 ml-1 cursor-pointer"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto no-scrollbar">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  const Icon = link.icon;
                  const isNotificationLink = user.role === 'ADMIN' && link.path === '/admin/notifications';

                  return (
                    <React.Fragment key={link.path}>
                      {isNotificationLink && (
                        <div className="border-t border-slate-100 my-3" />
                      )}
                      <Link
                        to={link.path}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition duration-150 ${
                          isActive
                            ? 'bg-healthcare-50/90 text-healthcare-700 font-black border-l-4 border-healthcare-600 rounded-l-none shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-healthcare-600' : 'text-slate-400'}`} />
                        <span className="truncate">{link.name}</span>
                      </Link>
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>

            {/* User Footer Card in Sidebar */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/60">
              <div className="flex items-center space-x-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="h-9 w-9 rounded-xl bg-healthcare-50 text-healthcare-700 font-bold flex items-center justify-center shrink-0 border border-healthcare-100">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate leading-snug">{user.name}</p>
                  <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded border mt-0.5 uppercase tracking-wide ${getRoleBadgeColor(user.role)}`}>
                    {user.role === 'DIAGNOSTICS' && user.labType && user.labType !== 'ALL'
                      ? `${user.labType} LAB`
                      : user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2.5 w-full flex items-center justify-center space-x-2 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 text-slate-600 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Header Bar */}
          <header className="h-15 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
            <div className="flex items-center space-x-3">
              {/* Show / Hide Sidebar Toggle */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border active:scale-95 shrink-0 cursor-pointer ${
                  sidebarOpen
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-healthcare-600 hover:bg-healthcare-700 text-white border-healthcare-600 shadow-xs'
                }`}
              >
                {sidebarOpen ? (
                  <>
                    <PanelLeftClose className="h-3.5 w-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Hide Sidebar</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="h-3.5 w-3.5 text-white" />
                    <span>Menu</span>
                  </>
                )}
              </button>

              <div className="flex items-center space-x-2 pl-1">
                <span className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight truncate">
                  {user.role} Operations Hub
                </span>
              </div>
              
              <span className="text-slate-300 hidden md:inline">|</span>

              <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Operational Network</span>
              </div>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center space-x-2 relative">
              {/* Global Page Refresh Action */}
              <button
                onClick={handleGlobalRefresh}
                title="Refresh Analytics & Lists"
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-healthcare-600 transition cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-healthcare-600' : ''}`} />
              </button>

              {/* Notification Center */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-healthcare-600 relative transition cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/90 shadow-2xl rounded-2xl py-2 z-50 max-h-96 overflow-y-auto animate-in fade-in duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-black text-xs text-slate-900 uppercase tracking-wide">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={clearNotifications}
                          className="text-[11px] font-bold text-healthcare-600 hover:text-healthcare-700 transition"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                          No unread notifications.
                        </div>
                      ) : (
                        notifications.map((n, idx) => (
                          <div
                            key={idx}
                            className={`px-4 py-3 text-xs transition ${
                              n.type === 'EMERGENCY'
                                ? 'bg-rose-50 border-l-2 border-rose-500'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <p className="text-slate-800 font-semibold leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Logout Icon */}
              <div className="flex md:hidden items-center pl-1">
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
                  title="Log Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Workspace Body Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
