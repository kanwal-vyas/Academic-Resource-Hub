import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import '../styles/admin.css';
import '../styles/users.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}/api/admin${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers
    },
  });
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', cls: 'ur-role--admin' },
  faculty: { label: 'Faculty', cls: 'ur-role--faculty' },
  student: { label: 'Student', cls: 'ur-role--student' },
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api('/users');
    if (res.ok) setUsers((await res.json()).data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts = {
    all: users.length,
    student: users.filter(u => u.role === 'student').length,
    faculty: users.filter(u => u.role === 'faculty').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  const handleForceVerify = async (userId) => {
    if (!window.confirm('Are you sure you want to force verify this user\'s email?')) return;
    try {
      const res = await api(`/users/${userId}/verify`, { method: 'POST' });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_verified: true } : u));
        if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, is_verified: true }));
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to verify user');
      }
    } catch (err) {
      alert('An error occurred while verifying the user');
    }
  };

  const handleForceUnverify = async (userId) => {
    if (!window.confirm('Are you sure you want to unverify this user?')) return;
    try {
      const res = await api(`/users/${userId}/unverify`, { method: 'POST' });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_verified: false } : u));
        if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, is_verified: false }));
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to unverify user');
      }
    } catch (err) {
      alert('An error occurred while unverifying the user');
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user? They will not be able to log in or access the platform.')) return;
    try {
      const res = await api(`/users/${userId}/suspend`, { method: 'POST' });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_suspended: true } : u));
        if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, is_suspended: true }));
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to suspend user');
      }
    } catch (err) {
      alert('An error occurred while suspending the user');
    }
  };

  const handleUnsuspend = async (userId) => {
    if (!window.confirm('Are you sure you want to unsuspend this user? They will regain full access.')) return;
    try {
      const res = await api(`/users/${userId}/unsuspend`, { method: 'POST' });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_suspended: false } : u));
        if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, is_suspended: false }));
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to unsuspend user');
      }
    } catch (err) {
      alert('An error occurred while unverifying the user');
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar active="users" />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">All Users</h1>
            <p className="admin-topbar-subtitle">
              {users.length} registered users across all roles
            </p>
          </div>
        </header>

        <div className="admin-content">
          {/* Role filter pills */}
          <div className="ur-filter-row">
            {['all', 'student', 'faculty', 'admin'].map(r => (
              <button
                key={r}
                className={`ur-pill ${roleFilter === r ? 'ur-pill--active' : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === 'all' ? '👥 All' : r === 'student' ? '🎓 Students' : r === 'faculty' ? '🏫 Faculty' : '🛡️ Admins'}
                <span className="ur-pill-count">{counts[r]}</span>
              </button>
            ))}

            <input
              className="ur-search"
              type="text"
              placeholder="Search by name, email or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="ur-loading">Loading users…</div>
          ) : (
            <div className="ur-table-wrapper">
              <table className="ur-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="7" className="ur-empty">No users match your search.</td></tr>
                  ) : filtered.map(u => {
                    const roleCfg = ROLE_CONFIG[u.role] || { label: u.role, cls: '' };
                    return (
                      <tr key={u.id}>
                        <td className="ur-name">
                          <div className="ur-avatar">{u.full_name?.[0]?.toUpperCase() || '?'}</div>
                          {u.full_name || '—'}
                        </td>
                        <td className="ur-email">{u.email}</td>
                        <td><span className={`ur-role-tag ${roleCfg.cls}`}>{roleCfg.label}</span></td>
                        <td>{u.department || <span className="ur-muted">—</span>}</td>
                        <td>
                          {u.is_suspended
                            ? <span className="ur-status" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>Suspended</span>
                            : <span className="ur-status" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Active</span>}
                        </td>
                        <td className="ur-date">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <button
                            className="ur-btn-view"
                            onClick={() => setSelectedUser(u)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="ur-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="ur-modal" onClick={e => e.stopPropagation()}>
            <div className="ur-modal-header">
              <h2>User Details</h2>
              <button className="ur-modal-close" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="ur-modal-body">
              <div className="ur-detail-grid">
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Full Name</span>
                  <span className="ur-detail-value">{selectedUser.full_name || '—'}</span>
                </div>
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Role</span>
                  <span className="ur-detail-value capitalize">{selectedUser.role}</span>
                </div>
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Email Address</span>
                  <span className="ur-detail-value">{selectedUser.email}</span>
                </div>
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Department</span>
                  <span className="ur-detail-value">{selectedUser.department || '—'}</span>
                </div>
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Joined Date</span>
                  <span className="ur-detail-value">{new Date(selectedUser.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                {selectedUser.role === 'faculty' && (
                  <div className="ur-detail-item">
                    <span className="ur-detail-label">Verification Status</span>
                    <span className="ur-detail-value">
                      {selectedUser.is_verified ? (
                         <span className="ur-verified">✔ Email Verified</span>
                      ) : (
                         <span className="ur-unverified">✘ Email Pending</span>
                      )}
                    </span>
                  </div>
                )}
                {selectedUser.role !== 'faculty' && (
                  <div className="ur-detail-item">
                    <span className="ur-detail-label">Email Verified</span>
                    <span className="ur-detail-value">
                      {selectedUser.is_verified ? (
                         <span className="ur-verified">✔ Yes</span>
                      ) : (
                         <span className="ur-unverified">✘ No</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Account Status</span>
                  <span className="ur-detail-value">
                    {selectedUser.is_suspended ? (
                       <span className="ur-status" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>Suspended</span>
                    ) : (
                       <span className="ur-status" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Active</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="ur-modal-actions">
                {selectedUser.is_verified ? (
                  <button
                    onClick={() => handleForceUnverify(selectedUser.id)}
                    className="ur-btn-unverify"
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Remove Verification
                  </button>
                ) : (
                  <button
                    onClick={() => handleForceVerify(selectedUser.id)}
                    className="ur-btn-verify"
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Force Verify User
                  </button>
                )}

                {selectedUser.is_suspended ? (
                  <button
                    onClick={() => handleUnsuspend(selectedUser.id)}
                    className="ur-btn-verify"
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Unsuspend Account
                  </button>
                ) : (
                  <button
                    onClick={() => handleSuspend(selectedUser.id)}
                    className="ur-btn-unverify"
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Suspend / Block User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
