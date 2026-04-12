import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import '../styles/sidebar.css';

function Sidebar({ active }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
    },

    {
      id: 'faculty-list',
      label: 'Faculty Directory',
      path: '/faculty-list',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 14c-4 0-6 2-6 3v1h12v-1c0-1-2-3-6-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M18 11c1.5.5 3 1.8 3 3v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="18" cy="7" r="2" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'All Users',
      path: '/users',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: 'content',
      label: 'Content Management',
      path: '/content',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: 'resources',
      label: 'Resource Verification',
      path: '/resources',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
    },
    {
      id: 'messages',
      label: 'Contact Messages',
      path: '/messages',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];


  return (
    <aside className="admin-sidebar">
      {/* Logo */}
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-icon">🛡️</div>
        <div>
          <div className="admin-sidebar-name">Admin Panel</div>
          <div className="admin-sidebar-sub">Academic Resource Hub</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="admin-sidebar-nav">
        <div className="admin-nav-section-label">Navigation</div>
        {navItems.map(item => (
          <Link
            key={item.id}
            to={item.path}
            className={`admin-nav-link ${active === item.id ? 'admin-nav-link--active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="admin-sidebar-user">
        <div className="admin-user-avatar">
          {user?.full_name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="admin-user-info">
          <div className="admin-user-name">{user?.full_name || 'Administrator'}</div>
          <div className="admin-user-role">System Admin</div>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout} title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
