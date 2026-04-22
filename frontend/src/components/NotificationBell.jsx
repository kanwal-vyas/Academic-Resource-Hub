import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, BookOpen } from 'lucide-react';
import './NotificationBell.css';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}


export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useSocket();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleToggle = () => {
    setOpen((prev) => {
      if (!prev) markAllRead(); // mark read when opening
      return !prev;
    });
  };

  const handleNotifClick = async (n) => {
    setOpen(false);
    if (n.resource_id) {
      navigate('/browse');
    }
  };


  return (
    <div className="notif-bell-wrapper" ref={panelRef}>
      <button
        className="notif-bell-btn"
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
      >
        <div className="notif-bell-icon">
          <Bell size={20} strokeWidth={2.25} />
        </div>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {notifications.length > 0 && (
              <button className="notif-clear-btn" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <BellOff size={32} strokeWidth={1.5} />
                </div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                  onClick={() => handleNotifClick(n)}
                >
                  <div className="notif-item-icon">
                    <BookOpen size={18} strokeWidth={2} />
                  </div>
                  <div className="notif-item-content">
                    <p className="notif-item-title">{n.title}</p>
                    <p className="notif-item-text">{n.message}</p>
                    <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.is_read && <span className="notif-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
