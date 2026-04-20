import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastContext';
import { API_BASE_URL } from '../utils/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; // Match backend port

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- API Sync ---

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setNotifications(result.data);
        setUnreadCount(result.data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('[SocketContext] Fetch failed:', err);
    }
  }, [user]);

  const markAsRead = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[SocketContext] Mark read failed:', err);
    }
  };

  const markAllRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[SocketContext] Mark all read failed:', err);
    }
  };

  // --- Socket Lifecycle ---

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: {
        userId: user.id,
        courseId: user.course_id
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket.id);
    });

    socket.on('notification:new', (data) => {
      console.log('[Socket.IO] New Targeted Notification:', data);
      
      // Add to local state (optimistic)
      setNotifications(prev => [{ ...data, is_read: false, id: Date.now() }, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show Toast
      showToast(data.message, 'info', 5000);
    });

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications, showToast]);

  return (
    <SocketContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllRead, 
      refresh: fetchNotifications 
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}

