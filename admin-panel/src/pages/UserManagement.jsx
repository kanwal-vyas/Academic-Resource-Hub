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

import ConfirmModal from '../components/ConfirmModal';

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
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const load = useCallback(async () => {
    if (users.length === 0) setLoading(true);
    try {
      const res = await api('/users');
      if (res.ok) {
        const data = (await res.json()).data;
        setUsers(data);
        
        // Update selectedUser if it's currently open to keep details fresh
        if (selectedUser) {
          const updated = data.find(u => u.id === selectedUser.id);
          if (updated) setSelectedUser(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      if (users.length === 0) setLoading(false);
    }
  }, [users.length, selectedUser]);

  useEffect(() => { 
    // Initial fetch only
    const initialLoad = async () => {
      setLoading(true);
      const res = await api('/users');
      if (res.ok) setUsers((await res.json()).data);
      setLoading(false);
    };
    initialLoad(); 
  }, []);

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

  const handleActionExec = async (type, userId, endpoint, method = 'POST') => {
    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await api(endpoint, { method });
      if (res.ok) {
        const isVerifiedUpdate = type === 'verify' ? true : type === 'unverify' ? false : null;
        const isSuspendedUpdate = type === 'suspend' ? true : type === 'unsuspend' ? false : null;

        setUsers(users.map(u => {
          if (u.id !== userId) return u;
          const updated = { ...u };
          if (isVerifiedUpdate !== null) updated.is_verified = isVerifiedUpdate;
          if (isSuspendedUpdate !== null) updated.is_suspended = isSuspendedUpdate;
          return updated;
        }));

        if (selectedUser?.id === userId) {
          setSelectedUser(prev => {
            const updated = { ...prev };
            if (isVerifiedUpdate !== null) updated.is_verified = isVerifiedUpdate;
            if (isSuspendedUpdate !== null) updated.is_suspended = isSuspendedUpdate;
            return updated;
          });
        }
        setConfirmConfig({ isOpen: false });
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Action failed');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setConfirmConfig(prev => ({ ...prev, isLoading: false }));
    }
  };

  const openConfirm = (type, userId) => {
    const configs = {
      verify: {
        title: 'Force Verify User',
        message: 'Are you sure you want to force verify this user\'s email? They will gain full access immediately.',
        confirmText: 'Verify User',
        type: 'primary',
        onConfirm: () => handleActionExec('verify', userId, `/users/${userId}/verify`)
      },
      unverify: {
        title: 'Remove Verification',
        message: 'This user will no longer be considered verified. They might be restricted from certain actions.',
        confirmText: 'Unverify',
        type: 'warning',
        onConfirm: () => handleActionExec('unverify', userId, `/users/${userId}/unverify`)
      },
      suspend: {
        title: 'Suspend Account',
        message: 'This user will be blocked from logging in or accessing any platform resources. Proceed with caution.',
        confirmText: 'Suspend User',
        type: 'danger',
        onConfirm: () => handleActionExec('suspend', userId, `/users/${userId}/suspend`)
      },
      unsuspend: {
        title: 'Unsuspend Account',
        message: 'Gives the user full access back to their account. They will be able to log in immediately.',
        confirmText: 'Unsuspend User',
        type: 'primary',
        onConfirm: () => handleActionExec('unsuspend', userId, `/users/${userId}/unsuspend`)
      }
    };
    setConfirmConfig({ ...configs[type], isOpen: true, isLoading: false });
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
                    onClick={() => openConfirm('unverify', selectedUser.id)}
                    className="ur-btn-unverify"
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Remove Verification
                  </button>
                ) : (
                  <button
                    onClick={() => openConfirm('verify', selectedUser.id)}
                    className="ur-btn-verify"
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Force Verify User
                  </button>
                )}

                {selectedUser.is_suspended ? (
                  <button
                    onClick={() => openConfirm('unsuspend', selectedUser.id)}
                    className="ur-btn-verify"
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(34,197,94,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Unsuspend Account
                  </button>
                ) : (
                  <button
                    onClick={() => openConfirm('suspend', selectedUser.id)}
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

      {/* Premium Confirm Modal */}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
        isLoading={confirmConfig.isLoading}
      />
    </div>
  );
}
