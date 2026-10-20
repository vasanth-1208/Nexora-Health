import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { request } from '../services/api';

interface RealTimeNotification {
  _id?: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'EMERGENCY';
  createdAt: Date | string;
  isRead?: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: RealTimeNotification[];
  activeEmergencies: any[];
  addSystemNotification: (msg: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'EMERGENCY') => void;
  clearNotifications: () => void;
  resolveEmergencyLocal: (alertId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);

  // Fetch initial notifications and active emergencies when user logs in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setActiveEmergencies([]);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to WebSocket Server with JWT Authentication Token
    const token = localStorage.getItem('token');
    const rawApiUrl = import.meta.env.VITE_API_URL;
    let socketHost: string;
    if (rawApiUrl) {
      socketHost = rawApiUrl.replace(/\/api$/, '') || 'https://nexora-health-backend.onrender.com';
    } else if (
      import.meta.env.PROD ||
      (typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1')
    ) {
      socketHost = 'https://nexora-health-backend.onrender.com';
    } else {
      socketHost = 'http://localhost:5000';
    }

    const socketInstance = io(socketHost, {
      transports: ['websocket', 'polling'],
      auth: {
        token: token || undefined,
      },
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket note (polling fallback active):', err.message);
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket.IO connected:', socketInstance.id);
      
      // Join role room
      socketInstance.emit('join_room', user.role);

      // If patient, join personal patientId room
      if (user.role === 'PATIENT') {
        socketInstance.emit('join_room', user.userId);
      }
    });

    // Load existing notifications
    request(`/notifications/${user.userId}`).then((res) => {
      if (res && Array.isArray(res)) {
        setNotifications(res);
      }
    });

    // Load active emergencies
    request('/emergency/active').then((res) => {
      if (res && Array.isArray(res)) {
        setActiveEmergencies(res);
      }
    });

    // Handle incoming real-time notifications
    socketInstance.on('notification:new', (notif: RealTimeNotification) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    // Handle emergency alerts
    socketInstance.on('emergency:alert', (alert: any) => {
      setActiveEmergencies((prev) => [alert, ...prev]);
      // Also add to local notification banners
      setNotifications((prev) => [
        {
          message: `CRITICAL EMERGENCY: Patient ${alert.patientName} (${alert.patientIdCode}) - ${alert.description}`,
          type: 'EMERGENCY',
          createdAt: new Date(),
        },
        ...prev,
      ]);
    });

    socketInstance.on('emergency:resolved', ({ alertId }) => {
      setActiveEmergencies((prev) => prev.filter((a) => a.alertId !== alertId && a._id !== alertId));
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const addSystemNotification = (message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'EMERGENCY') => {
    setNotifications((prev) => [
      {
        message,
        type,
        createdAt: new Date(),
      },
      ...prev,
    ]);
  };

  const clearNotifications = async () => {
    if (!user) return;
    try {
      await request('/notifications/read-all', {
        method: 'POST',
        body: JSON.stringify({ targetId: user.userId })
      });
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const resolveEmergencyLocal = (alertId: string) => {
    setActiveEmergencies((prev) => prev.filter((a) => a.alertId !== alertId && a._id !== alertId));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        activeEmergencies,
        addSystemNotification,
        clearNotifications,
        resolveEmergencyLocal,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
