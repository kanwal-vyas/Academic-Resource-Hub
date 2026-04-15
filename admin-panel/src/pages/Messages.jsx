import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/admin.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}/api/admin${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api('/messages');
    if (res.ok) setMessages((await res.json()).data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await api(`/messages/${id}/read`, { method: 'PATCH' });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    if (selected?.id === id) setSelected(prev => ({ ...prev, is_read: true }));
  };

  const deleteMsg = (id) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Message',
      message: 'Are you sure you want to delete this contact message? This action is irreversible.',
      confirmText: '🗑 Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        const res = await api(`/messages/${id}`, { method: 'DELETE' });
        setConfirmConfig({ isOpen: false });
        if (res.ok) {
          setMessages(prev => prev.filter(m => m.id !== id));
          if (selected?.id === id) setSelected(null);
        }
      }
    });
  };

  const openMessage = (msg) => {
    setSelected(msg);
    if (!msg.is_read) markRead(msg.id);
  };

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.is_read;
    if (filter === 'read') return m.is_read;
    return true;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="admin-layout">
      <Sidebar active="messages" />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Contact Messages</h1>
            <p className="admin-topbar-subtitle">
              {messages.length} total message{messages.length !== 1 ? 's' : ''}
              {unreadCount > 0 && <span style={{ color: 'var(--warning, #f59e0b)', marginLeft: 8 }}>• {unreadCount} unread</span>}
            </p>
          </div>
        </header>

        <div className="admin-content">
          {/* Filter pills */}
          <div className="ur-filter-row" style={{ marginBottom: '1.5rem' }}>
            {[
              { id: 'all', label: `📬 All`, count: messages.length },
              { id: 'unread', label: `🔵 Unread`, count: unreadCount },
              { id: 'read', label: `✅ Read`, count: messages.length - unreadCount },
            ].map(f => (
              <button
                key={f.id}
                className={`ur-pill ${filter === f.id ? 'ur-pill--active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                <span className="ur-pill-count">{f.count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="ur-loading">Loading messages…</div>
          ) : filtered.length === 0 ? (
            <div className="ur-empty" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              📭 No messages here.
            </div>
          ) : (
            <div className="ur-table-wrapper">
              <table className="ur-table">
                <thead>
                  <tr>
                    <th style={{ width: 12 }}></th>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(msg => (
                    <tr
                      key={msg.id}
                      style={{
                        cursor: 'pointer',
                        fontWeight: msg.is_read ? 400 : 700,
                        opacity: msg.is_read ? 0.85 : 1,
                      }}
                      onClick={() => openMessage(msg)}
                    >
                      <td>
                        {!msg.is_read && (
                          <span style={{
                            display: 'inline-block', width: 8, height: 8,
                            borderRadius: '50%', background: 'var(--warning, #f59e0b)',
                          }} />
                        )}
                      </td>
                      <td>
                        <div className="ur-name">
                          <div className="ur-avatar">{msg.name?.[0]?.toUpperCase() || '?'}</div>
                          <div>
                            <div>{msg.name}</div>
                            <div className="ur-email" style={{ fontSize: '0.78rem' }}>{msg.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {msg.subject || <em style={{ opacity: 0.5 }}>No subject</em>}
                      </td>
                      <td className="ur-date">{fmtDate(msg.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="ur-btn-view" onClick={() => openMessage(msg)}>View</button>
                          <button
                            onClick={() => deleteMsg(msg.id)}
                            style={{
                              padding: '6px 12px', fontSize: '0.8rem',
                              background: 'var(--danger-bg)', color: 'var(--danger)',
                              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)',
                              cursor: 'pointer', fontWeight: 600,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Message Detail Modal */}
      {selected && (
        <div className="ur-modal-overlay" onClick={() => setSelected(null)}>
          <div className="ur-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="ur-modal-header">
              <h2>Message Details</h2>
              <button className="ur-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="ur-modal-body">
              <div className="ur-detail-grid">
                <div className="ur-detail-item">
                  <span className="ur-detail-label">From</span>
                  <span className="ur-detail-value">{selected.name}</span>
                </div>
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Email</span>
                  <span className="ur-detail-value">
                    <a href={`mailto:${selected.email}`} style={{ color: 'var(--accent)' }}>
                      {selected.email}
                    </a>
                  </span>
                </div>
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Subject</span>
                  <span className="ur-detail-value">{selected.subject || '—'}</span>
                </div>
                <div className="ur-detail-item">
                  <span className="ur-detail-label">Received</span>
                  <span className="ur-detail-value">{fmtDate(selected.created_at)}</span>
                </div>
              </div>

              <div style={{
                marginTop: '1.25rem',
                background: 'var(--bg-tertiary, rgba(255,255,255,0.04))',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                fontSize: '0.92rem',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                color: 'var(--text-primary)',
              }}>
                {selected.message}
              </div>

              <div className="ur-modal-actions" style={{ marginTop: '1.25rem' }}>
                <a
                  href={`mailto:${selected.email}?subject=Re: ${selected.subject || 'Your message'}`}
                  style={{
                    padding: '10px 14px', fontSize: '0.85rem',
                    background: 'rgba(34,197,94,0.12)', color: 'var(--success)',
                    border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)',
                    cursor: 'pointer', fontWeight: 600, textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  ✉️ Reply via Email
                </a>
                <button
                  onClick={() => deleteMsg(selected.id)}
                  style={{
                    padding: '10px 14px', fontSize: '0.85rem',
                    background: 'var(--danger-bg)', color: 'var(--danger)',
                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  🗑️ Delete Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
