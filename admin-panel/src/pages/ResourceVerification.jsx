import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import '../styles/admin.css';
import '../styles/resource-verify.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}/api/admin${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
}

const TYPE_ICONS = { pdf: '📄', video: '🎬', note: '📝', slides: '📊', link: '🔗', other: '📎' };
const ROLE_COLORS = { student: 'rv-role--student', faculty: 'rv-role--faculty', admin: 'rv-role--admin' };

export default function ResourceVerification() {
  const [tab, setTab] = useState('pending');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionId, setActionId] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const endpoint = tab === 'pending' ? '/resources/pending' : '/resources/all';
    const res = await api(endpoint);
    if (res.ok) setResources((await res.json()).data);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (id) => {
    setActionId(id);
    const res = await api(`/resources/${id}/verify`, { method: 'PUT' });
    setActionId(null);
    if (res.ok) { showToast('✅ Resource verified!'); load(); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This is irreversible.`)) return;
    setActionId(id);
    const res = await api(`/resources/${id}`, { method: 'DELETE' });
    setActionId(null);
    if (res.ok) { showToast('🗑 Resource deleted'); load(); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const pending = tab === 'pending' ? resources : resources.filter(r => !r.is_verified);
  const visible = tab === 'pending' ? pending : resources;

  return (
    <div className="admin-layout">
      <Sidebar active="resources" />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Resource Verification</h1>
            <p className="admin-topbar-subtitle">
              Review and approve student-uploaded resources
              {tab === 'pending' && resources.length > 0 && (
                <span className="rv-pending-badge">{resources.length} pending</span>
              )}
            </p>
          </div>
        </header>

        <div className="admin-content">
          {/* Tabs */}
          <div className="rv-tabs">
            <button className={`rv-tab ${tab === 'pending' ? 'rv-tab--active' : ''}`} onClick={() => setTab('pending')}>
              ⏳ Pending Verification
            </button>
            <button className={`rv-tab ${tab === 'all' ? 'rv-tab--active' : ''}`} onClick={() => setTab('all')}>
              📋 All Resources
            </button>
          </div>

          {loading ? (
            <div className="rv-loading">
              <div className="rv-spinner" />
              <p>Loading resources...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rv-empty">
              <span className="rv-empty-icon">✅</span>
              <p className="rv-empty-title">
                {tab === 'pending' ? 'No pending resources!' : 'No resources found'}
              </p>
              <p className="rv-empty-sub">
                {tab === 'pending' ? 'All student uploads have been reviewed.' : 'No resources exist in the system yet.'}
              </p>
            </div>
          ) : (
            <div className="rv-grid">
              {visible.map(r => (
                <div key={r.id} className={`rv-card ${!r.is_verified ? 'rv-card--pending' : ''}`}>
                  <div className="rv-card-header">
                    <span className="rv-type-icon">{TYPE_ICONS[r.resource_type] || '📎'}</span>
                    <div className="rv-card-meta">
                      <span className="rv-course">{r.course_name}</span>
                      <span className="rv-subject">{r.subject_code} — {r.subject_name}</span>
                    </div>
                    {tab === 'all' && (
                      <span className={`rv-status-badge ${r.is_verified ? 'rv-status--verified' : 'rv-status--pending'}`}>
                        {r.is_verified ? '✔ Verified' : '⏳ Pending'}
                      </span>
                    )}
                  </div>

                  <h4 className="rv-title">{r.title}</h4>
                  {r.description && <p className="rv-desc">{r.description}</p>}

                  <div className="rv-info-row">
                    <span>
                      Uploaded by{' '}
                      <strong>{r.contributor_name}</strong>
                      <span className={`rv-role-tag ${ROLE_COLORS[r.contributor_role] || ''}`}>
                        {r.contributor_role}
                      </span>
                    </span>
                    <span className="rv-date">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>

                  {r.external_url && (
                    <a className="rv-link" href={r.external_url} target="_blank" rel="noopener noreferrer">
                      🔗 View Resource
                    </a>
                  )}

                  {r.content_type === 'file' && (
                    <span className="rv-file-badge">📁 File Upload</span>
                  )}

                  <div className="rv-actions">
                    {!r.is_verified && (
                      <button
                        className="rv-btn rv-btn--verify"
                        onClick={() => handleVerify(r.id)}
                        disabled={actionId === r.id}
                      >
                        {actionId === r.id ? 'Verifying...' : '✓ Verify'}
                      </button>
                    )}
                    <button
                      className="rv-btn rv-btn--delete"
                      onClick={() => handleDelete(r.id, r.title)}
                      disabled={actionId === r.id}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && <div className={`cm-toast cm-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
