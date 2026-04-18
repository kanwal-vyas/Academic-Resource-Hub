import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/admin.css';
import '../styles/resource-verify.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}/api/admin${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

const TYPE_ICONS = { pdf: '📄', video: '🎬', note: '📝', slides: '📊', link: '🔗', other: '📎' };
const TYPE_LABELS = { pdf: 'PDF', video: 'Video', note: 'Note', slides: 'Slides', link: 'Link', other: 'Other' };
const ROLE_COLORS = { student: 'rv-role--student', faculty: 'rv-role--faculty', admin: 'rv-role--admin' };

// ── View Modal ─────────────────────────────────────────────────
function ViewModal({ resource, onClose }) {
  if (!resource) return null;
  return (
    <div className="rv-modal-overlay" onClick={onClose}>
      <div className="rv-modal-card rv-modal--view" onClick={e => e.stopPropagation()}>
        <div className="rv-modal-header">
          <div className="rv-modal-header-left">
            <span className="rv-modal-type-icon">{TYPE_ICONS[resource.resource_type] || '📎'}</span>
            <div>
              <p className="rv-modal-eyebrow">{resource.course_name} · {resource.subject_code}</p>
              <h2 className="rv-modal-title">{resource.title}</h2>
            </div>
          </div>
          <button className="rv-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="rv-modal-body">
          {/* Status strip */}
          <div className={`rv-view-status-strip ${resource.is_verified ? 'rv-view-status--verified' : 'rv-view-status--pending'}`}>
            <span>{resource.is_verified ? '✔ Verified' : '⏳ Pending Verification'}</span>
            {resource.is_verified && resource.verified_at && (
              <span>on {new Date(resource.verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            )}
          </div>

          {/* Description */}
          {resource.description && (
            <div className="rv-view-field">
              <label className="rv-view-label">Description</label>
              <p className="rv-view-value">{resource.description}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="rv-view-meta-grid">
            <div className="rv-view-meta-item">
              <label className="rv-view-label">Subject</label>
              <span className="rv-view-value">{resource.subject_name}</span>
            </div>
            <div className="rv-view-meta-item">
              <label className="rv-view-label">Course</label>
              <span className="rv-view-value">{resource.course_name}</span>
            </div>
            <div className="rv-view-meta-item">
              <label className="rv-view-label">Type</label>
              <span className="rv-view-value">{TYPE_LABELS[resource.resource_type] || resource.resource_type}</span>
            </div>
            <div className="rv-view-meta-item">
              <label className="rv-view-label">Content</label>
              <span className="rv-view-value">{resource.content_type === 'file' ? '📁 File Upload' : '🔗 External Link'}</span>
            </div>
            <div className="rv-view-meta-item">
              <label className="rv-view-label">Uploaded By</label>
              <span className="rv-view-value">
                {resource.contributor_name}
                <span className={`rv-role-tag ${ROLE_COLORS[resource.contributor_role] || ''}`}>{resource.contributor_role}</span>
              </span>
            </div>
            <div className="rv-view-meta-item">
              <label className="rv-view-label">Uploaded On</label>
              <span className="rv-view-value">
                {new Date(resource.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* AI Summary */}
          {resource.ai_summary && (
            <div className="rv-view-field rv-view-field--summary">
              <label className="rv-view-label">🤖 AI Summary</label>
              <p className="rv-view-value rv-view-summary-text">{resource.ai_summary}</p>
            </div>
          )}

          {/* Link */}
          {resource.external_url && (
            <a className="rv-view-resource-link" href={resource.external_url} target="_blank" rel="noopener noreferrer">
              🔗 Open Resource
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────
function EditModal({ resource, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: resource.title || '',
    description: resource.description || '',
    resource_type: resource.resource_type || 'other',
    external_url: resource.external_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API}/resources/${resource.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          resource_type: form.resource_type,
          ...(form.external_url.trim() ? { external_url: form.external_url.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save.'); return; }
      onSaved(data.data);
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rv-modal-overlay" onClick={onClose}>
      <div className="rv-modal-card rv-modal--edit" onClick={e => e.stopPropagation()}>
        <div className="rv-modal-header">
          <div className="rv-modal-header-left">
            <span className="rv-modal-type-icon">✏️</span>
            <div>
              <p className="rv-modal-eyebrow">Admin Edit</p>
              <h2 className="rv-modal-title">Edit Resource</h2>
            </div>
          </div>
          <button className="rv-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="rv-modal-body">
          <div className="rv-edit-field">
            <label className="rv-edit-label">Title <span className="rv-edit-required">*</span></label>
            <input
              className="rv-edit-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Resource title"
            />
          </div>

          <div className="rv-edit-field">
            <label className="rv-edit-label">Description</label>
            <textarea
              className="rv-edit-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Resource description"
              rows={3}
            />
          </div>

          <div className="rv-edit-row">
            <div className="rv-edit-field">
              <label className="rv-edit-label">Resource Type</label>
              <select className="rv-edit-select" value={form.resource_type} onChange={e => set('resource_type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
          </div>

          {resource.content_type !== 'file' && (
            <div className="rv-edit-field">
              <label className="rv-edit-label">External URL</label>
              <input
                className="rv-edit-input"
                value={form.external_url}
                onChange={e => set('external_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {resource.content_type === 'file' && (
            <div className="rv-edit-note">
              <span>📁</span> This resource is a file upload. To replace the file, ask the contributor to re-upload.
            </div>
          )}

          {error && <p className="rv-edit-error">{error}</p>}
        </div>

        <div className="rv-modal-footer">
          <button className="rv-footer-btn rv-footer-btn--cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="rv-footer-btn rv-footer-btn--save" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="rv-spinner-sm" /> Saving…</> : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function ResourceVerification() {
  const [tab, setTab] = useState('pending');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [viewResource, setViewResource] = useState(null);
  const [editResource, setEditResource] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    const isFirst = resources.length === 0;
    if (isFirst) setLoading(true);
    try {
      const endpoint = tab === 'pending' ? '/resources/pending' : '/resources/all';
      const res = await api(endpoint);
      if (res.ok) setResources((await res.json()).data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      if (isFirst) setLoading(false);
    }
  }, [tab, resources.length]);

  useEffect(() => { setResources([]); }, [tab]);
  useEffect(() => { load(); }, [tab]);

  const handleVerify = async (id) => {
    setActionId(id);
    const res = await api(`/resources/${id}/verify`, { method: 'PUT' });
    setActionId(null);
    if (res.ok) { showToast('✅ Resource verified and notification sent!'); load(); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleDelete = (id, title) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Resource',
      message: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      confirmText: '🗑 Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        const res = await api(`/resources/${id}`, { method: 'DELETE' });
        setConfirmConfig({ isOpen: false });
        if (res.ok) { showToast('🗑 Resource deleted'); load(); }
        else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
      },
    });
  };

  const handleEditSaved = (updated) => {
    setResources(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
    setEditResource(null);
    showToast('✏️ Resource updated successfully!');
  };

  const visible = (tab === 'pending' ? resources : resources).filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.contributor_name?.toLowerCase().includes(q) ||
      r.subject_name?.toLowerCase().includes(q) ||
      r.course_name?.toLowerCase().includes(q)
    );
  });

  const pendingCount = resources.filter(r => !r.is_verified).length;
  const verifiedCount = resources.filter(r => r.is_verified).length;

  return (
    <div className="admin-layout">
      <Sidebar active="resources" />
      <main className="admin-main">
        {/* ── Topbar ── */}
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Resource Verification</h1>
            <p className="admin-topbar-subtitle">
              Review, approve, edit and manage all platform resources
            </p>
          </div>
          {/* Search */}
          <div className="rv-search-wrap">
            <span className="rv-search-icon">🔍</span>
            <input
              className="rv-search-input"
              placeholder="Search by title, contributor, subject…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="rv-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </header>

        <div className="admin-content">

          {/* ── Stats strip ── */}
          {tab === 'all' && !loading && resources.length > 0 && (
            <div className="rv-stats-strip">
              <div className="rv-stat rv-stat--total">
                <span className="rv-stat-num">{resources.length}</span>
                <span className="rv-stat-lbl">Total</span>
              </div>
              <div className="rv-stat-divider" />
              <div className="rv-stat rv-stat--verified">
                <span className="rv-stat-num">{verifiedCount}</span>
                <span className="rv-stat-lbl">Verified</span>
              </div>
              <div className="rv-stat-divider" />
              <div className="rv-stat rv-stat--pending">
                <span className="rv-stat-num">{pendingCount}</span>
                <span className="rv-stat-lbl">Pending</span>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="rv-tabs">
            <button
              className={`rv-tab ${tab === 'pending' ? 'rv-tab--active' : ''}`}
              onClick={() => setTab('pending')}
            >
              <span>⏳</span>
              Pending Verification
              {tab === 'pending' && resources.length > 0 && (
                <span className="rv-tab-count">{resources.length}</span>
              )}
            </button>
            <button
              className={`rv-tab ${tab === 'all' ? 'rv-tab--active' : ''}`}
              onClick={() => setTab('all')}
            >
              <span>📋</span>
              All Resources
            </button>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="rv-loading">
              <div className="rv-spinner" />
              <p>Loading resources…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rv-empty">
              <span className="rv-empty-icon">{search ? '🔎' : '✅'}</span>
              <p className="rv-empty-title">
                {search ? `No results for "${search}"` : tab === 'pending' ? 'All clear!' : 'No resources yet'}
              </p>
              <p className="rv-empty-sub">
                {search
                  ? 'Try a different search term.'
                  : tab === 'pending'
                  ? 'All uploaded resources have been reviewed.'
                  : 'No resources exist in the system yet.'}
              </p>
            </div>
          ) : (
            <div className="rv-grid">
              {visible.map(r => (
                <div
                  key={r.id}
                  className={`rv-card ${!r.is_verified ? 'rv-card--pending' : 'rv-card--verified'}`}
                >
                  {/* Card top accent bar */}
                  <div className={`rv-card-accent ${r.is_verified ? 'rv-accent--verified' : 'rv-accent--pending'}`} />

                  {/* ── Card Header ── */}
                  <div className="rv-card-header">
                    <div className="rv-card-header-left">
                      <div className="rv-type-badge">
                        <span className="rv-type-icon">{TYPE_ICONS[r.resource_type] || '📎'}</span>
                      </div>
                      <div className="rv-card-meta">
                        <span className="rv-course">{r.course_name}</span>
                        <span className="rv-subject">{r.subject_code} — {r.subject_name}</span>
                      </div>
                    </div>
                    <span className={`rv-status-badge ${r.is_verified ? 'rv-status--verified' : 'rv-status--pending'}`}>
                      {r.is_verified ? '✔ Verified' : '⏳ Pending'}
                    </span>
                  </div>

                  {/* ── Card Body ── */}
                  <div className="rv-card-body">
                    <h4 className="rv-title">{r.title}</h4>
                    {r.description && (
                      <p className="rv-desc">{r.description}</p>
                    )}
                  </div>

                  {/* ── Contributor ── */}
                  <div className="rv-contributor-row">
                    <div className="rv-contributor-avatar">
                      {(r.contributor_name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="rv-contributor-info">
                      <span className="rv-contributor-name">{r.contributor_name}</span>
                      <span className={`rv-role-tag ${ROLE_COLORS[r.contributor_role] || ''}`}>
                        {r.contributor_role}
                      </span>
                    </div>
                    <span className="rv-date">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* ── Content Type Pill ── */}
                  <div className="rv-content-type-row">
                    {r.content_type === 'file' ? (
                      <span className="rv-content-pill rv-content-pill--file">📁 File Upload</span>
                    ) : (
                      <span className="rv-content-pill rv-content-pill--link">🔗 External Link</span>
                    )}
                    {r.ai_summary && (
                      <span className="rv-content-pill rv-content-pill--ai">🤖 AI Summary</span>
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <div className="rv-actions">
                    {/* View */}
                    <button
                      className="rv-btn rv-btn--view"
                      onClick={() => setViewResource(r)}
                      title="View details"
                    >
                      👁 View
                    </button>

                    {/* Edit */}
                    <button
                      className="rv-btn rv-btn--edit"
                      onClick={() => setEditResource(r)}
                      title="Edit resource"
                    >
                      ✏️ Edit
                    </button>

                    {/* Verify (only for unverified) */}
                    {!r.is_verified && (
                      <button
                        className="rv-btn rv-btn--verify"
                        onClick={() => handleVerify(r.id)}
                        disabled={actionId === r.id}
                        title="Verify resource"
                      >
                        {actionId === r.id
                          ? <><span className="rv-spinner-sm" /> Verifying…</>
                          : '✓ Verify'}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      className="rv-btn rv-btn--delete"
                      onClick={() => handleDelete(r.id, r.title)}
                      disabled={actionId === r.id}
                      title="Delete resource"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {viewResource && <ViewModal resource={viewResource} onClose={() => setViewResource(null)} />}
      {editResource && (
        <EditModal
          resource={editResource}
          onClose={() => setEditResource(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`cm-toast cm-toast--${toast.type}`}>{toast.msg}</div>
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
