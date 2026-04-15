import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState(() => {
    // Persist notifications across page refreshes via sessionStorage
    try {
      return JSON.parse(sessionStorage.getItem('arh_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    return parseInt(sessionStorage.getItem('arh_unread') || '0', 10);
  });

  useEffect(() => {
    if (!user) {
      // User logged out — disconnect and reset
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect once per authenticated session
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket.id);
    });

    socket.on('resource:verified', (data) => {
      const notification = {
        id: `${data.resourceId}-${Date.now()}`,
        type: 'resource_verified',
        title: `📚 New Resource Available!`,
        body: `"${data.title}" by ${data.contributorName} — ${data.subjectName}`,
        resourceId: data.resourceId,
        timestamp: data.verifiedAt,
        read: false,
      };

      setNotifications((prev) => {
        const updated = [notification, ...prev].slice(0, 50); // keep last 50
        sessionStorage.setItem('arh_notifications', JSON.stringify(updated));
        return updated;
      });

      setUnreadCount((prev) => {
        const next = prev + 1;
        sessionStorage.setItem('arh_unread', String(next));
        return next;
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const markAllRead = () => {
    setUnreadCount(0);
    sessionStorage.setItem('arh_unread', '0');
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      sessionStorage.setItem('arh_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    sessionStorage.removeItem('arh_notifications');
    sessionStorage.removeItem('arh_unread');
  };

  return (
    <SocketContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
