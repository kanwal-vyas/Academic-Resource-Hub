import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import SummaryModal from '../components/SummaryModal';
import '../styles/admin.css';
import '../styles/browse.css';
import '../styles/my-resources.css';
import '../styles/my-resources-admin.css';
import '../styles/resource-verify.css'; // tabs, search bar, stats strip, modals

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── API helpers ──────────────────────────────────────────────
async function adminApiFetch(path, options = {}) {
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

async function generalApiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });
}

// ── Resource type config (mirrored from MyResources) ─────────
const RESOURCE_TYPE_CONFIG = {
  question_paper: { className: 'chip-question', label: 'Question Paper' },
  lecture_notes: { className: 'chip-notes', label: 'Lecture Notes' },
  research_paper: { className: 'chip-research', label: 'Research Paper' },
  project_material: { className: 'chip-notes', label: 'Project Material' },
  notes: { className: 'chip-notes', label: 'Notes' },
};

const typeClassMap = {
  lecture_notes: 'resource-badge--fgreen',
  question_paper: 'resource-badge--purple',
  research_paper: 'resource-badge--orange',
  project_material: 'resource-badge--yellow',
  other: 'resource-badge--grey',
};

function getResourceTypeDisplay(type) {
  const config = RESOURCE_TYPE_CONFIG[type];
  if (config) return config;
  return {
    className: 'chip-notes',
    label: type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
  };
}

// ── Edit Modal (full 3-tab) ───────────────────────────────────
const TYPE_LABELS = { pdf: 'PDF Document', video: 'Video', note: 'Note / Article', slides: 'Slides / PPT', link: 'External Link', other: 'Other' };
const VISIBILITY_OPTS = [
  { value: 'public', label: '🌐 Public' },
  { value: 'faculty', label: '👨‍🏫 Faculty Only' },
  { value: 'private', label: '🔒 Private - only visible to verified user' },
];

function EditModal({ resource, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', resourceType: 'other', visibility: 'public', courseId: '', subjectCode: '', startYear: '', endYear: '', unitNumber: '', contentType: 'file', externalUrl: '' });
  const [newFile, setNewFile] = useState(null);
  const [existingFileName, setExistingFileName] = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [rRes, cRes, yRes] = await Promise.all([
          generalApiFetch(`/resources/${resource.id}`),
          adminApiFetch('/courses'),
          adminApiFetch('/academic-years'),
        ]);
        const [dR, dC, dY] = await Promise.all([rRes.json(), cRes.json(), yRes.json()]);
        const r = dR.data;
        setCourses(dC.data || []);
        setAcademicYears(dY.data || []);
        if (r.storage_path) {
          const fn = r.storage_path.split('/').pop() || '';
          const di = fn.indexOf('-');
          setExistingFileName(di !== -1 ? fn.slice(di + 1) : fn);
        }
        setForm({ title: r.title || '', description: r.description || '', resourceType: r.resource_type || 'other', visibility: r.visibility || 'public', courseId: r.course_id || '', subjectCode: r.subject_code || '', startYear: r.start_year ? String(r.start_year) : '', endYear: r.end_year ? String(r.end_year) : '', unitNumber: r.unit_number ? String(r.unit_number) : '', contentType: r.content_type === 'file' ? 'file' : 'link', externalUrl: r.external_url || '' });
        if (r.course_id) {
          setSubjectsLoading(true);
          const sR = await adminApiFetch(`/subjects?course_id=${r.course_id}`);
          const sD = await sR.json();
          setSubjects(sD.data || []);
          setSubjectsLoading(false);
        }
      } catch (e) { setError('Failed to load. Close and retry.'); }
      finally { setInitLoading(false); }
    };
    loadAll();
  }, []);

  const handleCourseChange = async (courseId) => {
    set('courseId', courseId); set('subjectCode', ''); setSubjects([]);
    if (!courseId) return;
    setSubjectsLoading(true);
    try { const r = await adminApiFetch(`/subjects?course_id=${courseId}`); const d = await r.json(); setSubjects(d.data || []); }
    catch (e) { console.error(e); }
    finally { setSubjectsLoading(false); }
  };

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); setActiveTab('basic'); return; }
    if (!form.subjectCode) { setError('Please select a subject.'); setActiveTab('academic'); return; }
    if (!form.startYear || !form.endYear) { setError('Please select an academic year.'); setActiveTab('academic'); return; }
    if (form.contentType === 'link' && !form.externalUrl.trim()) { setError('External URL is required.'); setActiveTab('content'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let res;
      if (form.contentType === 'file') {
        const fd = new FormData();
        fd.append('title', form.title.trim()); fd.append('description', form.description.trim());
        fd.append('resource_type', form.resourceType); fd.append('visibility', form.visibility);
        fd.append('subject_code', form.subjectCode); fd.append('start_year', form.startYear); fd.append('end_year', form.endYear);
        if (form.unitNumber) fd.append('unit_number', form.unitNumber);
        if (newFile) fd.append('file', newFile);
        res = await fetch(`${API}/resources/file/${resource.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}` }, body: fd });
      } else {
        res = await fetch(`${API}/resources/${resource.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title.trim(), description: form.description.trim(), resource_type: form.resourceType, visibility: form.visibility, subject_code: form.subjectCode, start_year: form.startYear, end_year: form.endYear, unit_number: form.unitNumber || '', external_url: form.externalUrl.trim() }) });
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save.'); return; }
      onSaved(data.data);
    } catch (e) { setError('Network error.'); }
    finally { setSaving(false); }
  };

  const tabs = [{ id: 'basic', label: '📝 Basic Info' }, { id: 'academic', label: '🎓 Academic' }, { id: 'content', label: '📁 Content' }];

  return (
    <div className="rv-modal-overlay" onClick={onClose}>
      <div className="rv-modal-card rv-modal--edit-full" onClick={e => e.stopPropagation()}>
        <div className="rv-modal-header">
          <div className="rv-modal-header-left">
            <span className="rv-modal-type-icon">✏️</span>
            <div><p className="rv-modal-eyebrow">Admin · Full Edit</p><h2 className="rv-modal-title" style={{ fontSize: '1rem' }}>{resource.title}</h2></div>
          </div>
          <button className="rv-modal-close" onClick={onClose} disabled={saving}>✕</button>
        </div>

        {initLoading ? (
          <div className="rv-edit-loading"><div className="rv-spinner" /><p>Loading resource details…</p></div>
        ) : (
          <>
            <div className="rv-edit-tabs">
              {tabs.map(t => (
                <button key={t.id} className={`rv-edit-tab ${activeTab === t.id ? 'rv-edit-tab--active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
              ))}
            </div>

            <div className="rv-modal-body rv-edit-body">
              {activeTab === 'basic' && (
                <div className="rv-edit-section">
                  <div className="rv-edit-field"><label className="rv-edit-label">Title <span className="rv-edit-required">*</span></label><input className="rv-edit-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Resource title" /></div>
                  <div className="rv-edit-field"><label className="rv-edit-label">Description</label><textarea className="rv-edit-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe this resource…" rows={4} /></div>
                  <div className="rv-edit-row-2">
                    <div className="rv-edit-field"><label className="rv-edit-label">Type</label><select className="rv-edit-select" value={form.resourceType} onChange={e => set('resourceType', e.target.value)}>{Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                    <div className="rv-edit-field"><label className="rv-edit-label">Visibility</label><select className="rv-edit-select" value={form.visibility} onChange={e => set('visibility', e.target.value)}>{VISIBILITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                  </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="rv-edit-section">
                  <div className="rv-edit-field"><label className="rv-edit-label">Course <span className="rv-edit-required">*</span></label><select className="rv-edit-select" value={form.courseId} onChange={e => handleCourseChange(e.target.value)}><option value="">— Select a course —</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></div>
                  <div className="rv-edit-field"><label className="rv-edit-label">Subject <span className="rv-edit-required">*</span>{subjectsLoading && ' ⏳'}</label><select className="rv-edit-select" value={form.subjectCode} onChange={e => set('subjectCode', e.target.value)} disabled={!form.courseId || subjectsLoading}><option value="">— Select a subject —</option>{subjects.map(s => <option key={s.id} value={s.code}>{s.name} ({s.code})</option>)}</select>{!form.courseId && <p className="rv-edit-hint">Select a course first.</p>}</div>
                  <div className="rv-edit-field"><label className="rv-edit-label">Academic Year <span className="rv-edit-required">*</span></label><select className="rv-edit-select" value={form.startYear && form.endYear ? `${form.startYear}-${form.endYear}` : ''} onChange={e => { const [sy, ey] = e.target.value.split('-'); set('startYear', sy); set('endYear', ey); }}><option value="">— Select year —</option>{academicYears.map(y => <option key={y.id} value={`${y.start_year}-${y.end_year}`}>{y.start_year} – {y.end_year}</option>)}</select></div>
                  <div className="rv-edit-field"><label className="rv-edit-label">Unit Number <span className="rv-edit-optional">(optional)</span></label><input className="rv-edit-input" type="number" min="1" max="10" value={form.unitNumber} onChange={e => set('unitNumber', e.target.value)} placeholder="e.g. 1, 2, 3…" /><p className="rv-edit-hint">Leave blank if it covers the whole subject.</p></div>
                </div>
              )}

              {activeTab === 'content' && (
                <div className="rv-edit-section">
                  <div className="rv-edit-field">
                    <label className="rv-edit-label">Content Type</label>
                    <div className="rv-content-toggle">
                      <button className={`rv-toggle-btn ${form.contentType === 'file' ? 'rv-toggle-btn--active' : ''}`} onClick={() => set('contentType', 'file')} type="button">📁 File Upload</button>
                      <button className={`rv-toggle-btn ${form.contentType === 'link' ? 'rv-toggle-btn--active' : ''}`} onClick={() => set('contentType', 'link')} type="button">🔗 External Link</button>
                    </div>
                    {form.contentType !== (resource.content_type === 'file' ? 'file' : 'link') && (
                      <div className="rv-edit-warning">⚠️ Switching content type. {form.contentType === 'link' ? 'The existing file will be permanently deleted.' : 'The external URL will be removed.'}</div>
                    )}
                  </div>

                  {form.contentType === 'link' && (
                    <div className="rv-edit-field">
                      <label className="rv-edit-label">External URL <span className="rv-edit-required">*</span></label>
                      <input className="rv-edit-input" value={form.externalUrl} onChange={e => set('externalUrl', e.target.value)} placeholder="https://..." type="url" />
                      {form.externalUrl && <a className="rv-edit-preview-link" href={form.externalUrl} target="_blank" rel="noopener noreferrer">Preview ↗</a>}
                    </div>
                  )}

                  {form.contentType === 'file' && (
                    <div className="rv-edit-field">
                      <label className="rv-edit-label">File</label>
                      {existingFileName && !newFile && <div className="rv-edit-existing-file"><span>📄</span><span className="rv-edit-filename">{existingFileName}</span><span className="rv-edit-file-tag">Current file</span></div>}
                      {newFile && <div className="rv-edit-existing-file rv-edit-existing-file--new"><span>📄</span><span className="rv-edit-filename">{newFile.name}</span><span className="rv-edit-file-tag rv-edit-file-tag--new">New file ✓</span><button className="rv-edit-file-remove" onClick={() => setNewFile(null)}>✕</button></div>}
                      <label className="rv-edit-file-btn">{newFile ? '🔄 Change File' : existingFileName ? '🔄 Replace File' : '📂 Choose File'}<input type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.zip" onChange={e => { const f = e.target.files[0]; if (f) setNewFile(f); }} /></label>
                      <p className="rv-edit-hint">Accepted: PDF, Word, PowerPoint, MP4, ZIP{existingFileName && !newFile ? '. Leave unchanged to keep current file.' : ''}</p>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="rv-edit-error">{error}</div>}
            </div>

            <div className="rv-modal-footer">
              <div className="rv-footer-tab-nav">
                <button className="rv-footer-tab-btn" onClick={() => { const i = tabs.findIndex(t => t.id === activeTab); if (i > 0) setActiveTab(tabs[i - 1].id); }} disabled={activeTab === tabs[0].id || saving}>← Prev</button>
                <span className="rv-footer-tab-dots">{tabs.map(t => <span key={t.id} className={`rv-tab-dot ${activeTab === t.id ? 'rv-tab-dot--active' : ''}`} />)}</span>
                <button className="rv-footer-tab-btn" onClick={() => { const i = tabs.findIndex(t => t.id === activeTab); if (i < tabs.length - 1) setActiveTab(tabs[i + 1].id); }} disabled={activeTab === tabs[tabs.length - 1].id || saving}>Next →</button>
              </div>
              <div className="rv-footer-actions">
                <button className="rv-footer-btn rv-footer-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
                <button className="rv-footer-btn rv-footer-btn--save" onClick={handleSave} disabled={saving}>{saving ? <><span className="rv-spinner-sm" /> Saving…</> : '💾 Save All Changes'}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Admin Resource Card (identical to MyResourceCard + Verify) ──
function AdminResourceCard({
  resource,
  isDeleting,
  isConfirming,
  isVerifying,
  onView,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  onVerify,
  onSummarize,
  onViewSummary,
}) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const aiSummary = resource.ai_summary;

  const handleSummarizeClick = async (e) => {
    e.stopPropagation();
    setIsSummarizing(true);
    await onSummarize();
    setIsSummarizing(false);
  };

  const resourceType = getResourceTypeDisplay(resource.resource_type);
  const badgeClass = typeClassMap[resource.resource_type] || '';
  const contentTypeClass = resource.content_type === 'external_link' ? 'resource-badge--link' : 'resource-badge--file';
  const contentTypeLabel = resource.content_type === 'external_link' ? 'External Link' : 'File';

  return (
    <article className={`card resource-card ${isDeleting ? 'card--deleting' : ''} ${badgeClass ? `stripe-${resource.resource_type}` : ''}`}>
      <div className="resource-stripe" />

      <header className="resource-header">
        <div className="resource-title-group">
          <h3 className="resource-title">{resource.title}</h3>
          <div className="resource-chips">
            {badgeClass ? (
              <span className={`resource-badge ${badgeClass}`}>{resourceType.label}</span>
            ) : (
              <span className={`chip ${resourceType.className}`}>{resourceType.label}</span>
            )}
            <span className={`resource-badge ${contentTypeClass}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                {resource.content_type === 'external_link' ? (
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                ) : (
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7" />
                )}
              </svg>
              {contentTypeLabel}
            </span>
          </div>
        </div>

        {/* Verification badge in top-right */}
        <span className={`resource-badge ${resource.is_verified ? 'resource-badge--verified-admin' : 'resource-badge--unverified'}`}>
          {resource.is_verified ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              Pending
            </>
          )}
        </span>
      </header>

      <p className="resource-description">{resource.description || 'No description provided.'}</p>

      {/* AI Summary Section — only for PDF files */}
      {resource.content_type === 'file' && resource.storage_path?.toLowerCase().endsWith('.pdf') && (
        <div className="ai-summary-section">
          <div className="ai-summary-header">
            <h4 className="ai-summary-title">
              <svg className="ai-sparkle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.9 1.38H21l-4.75 3.447a2 2 0 00-.727 2.233L17.435 21 12 17.056 6.565 21l1.912-5.127a2 2 0 00-.727-2.233L3 10.193h5.188a2 2 0 001.9-1.38L12 3z" />
              </svg>
              Quick AI Snapshot
            </h4>
            <div className="ai-summary-actions">
              {!aiSummary ? (
                <button className="summarize-button" onClick={handleSummarizeClick} disabled={isSummarizing}>
                  {isSummarizing ? (
                    <span className="ai-loading-text"><span className="pulse-dot" />Analyzing...</span>
                  ) : 'View Snapshot'}
                </button>
              ) : (
                <button className="summarize-button" onClick={(e) => { e.stopPropagation(); onViewSummary(aiSummary); }}>
                  View Snapshot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="resource-metadata-grid">
        <div className="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v14.5" />
          </svg>
          <span>{resource.subject_name}</span>
        </div>
        {resource.faculty_name && (
          <div className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <span>{resource.faculty_name}</span>
          </div>
        )}
        {resource.start_year && (
          <div className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>AY {resource.start_year}</span>
          </div>
        )}
        {resource.unit_number && (
          <div className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Unit {resource.unit_number}</span>
          </div>
        )}
        {/* Contributor always shown */}
        <div className="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span>{resource.contributor_name}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mr-actions-group">
        <button className="mr-btn mr-btn--view" onClick={onView} disabled={isDeleting || isVerifying}>
          {isDeleting ? <span className="mr-btn-loading" /> : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              View Resource
            </>
          )}
        </button>

        {isConfirming ? (
          <div className="delete-confirm-banner">
            <span>Delete <strong>{resource.title}</strong>? This cannot be undone.</span>
            <div className="delete-confirm-actions">
              <button className="btn-confirm-delete" onClick={onDeleteConfirm}>Yes, Delete</button>
              <button className="btn-cancel-delete" onClick={onDeleteCancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="mr-actions-secondary">
            <button className="mr-btn mr-btn--edit" onClick={onEdit} disabled={isDeleting || isVerifying}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>

            {/* Admin-only: Verify button */}
            {!resource.is_verified && (
              <button className="mr-btn mr-btn--verify-admin" onClick={onVerify} disabled={isDeleting || isVerifying}>
                {isVerifying ? <span className="mr-btn-loading" /> : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Verify
                  </>
                )}
              </button>
            )}

            <button className="mr-btn mr-btn--delete" onClick={onDeleteClick} disabled={isDeleting || isVerifying}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ResourceVerification() {
  const [tab, setTab] = useState('pending');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [editResource, setEditResource] = useState(null);
  const [activeSummary, setActiveSummary] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    const isFirst = resources.length === 0;
    if (isFirst) setLoading(true);
    try {
      const res = await adminApiFetch(tab === 'pending' ? '/resources/pending' : '/resources/all');
      if (res.ok) setResources((await res.json()).data);
    } catch (err) { console.error(err); }
    finally { if (isFirst) setLoading(false); }
  }, [tab, resources.length]);

  useEffect(() => { setResources([]); }, [tab]);
  useEffect(() => { load(); }, [tab]);

  const handleVerify = async (id) => {
    setVerifyingId(id);
    const res = await adminApiFetch(`/resources/${id}/verify`, { method: 'PUT' });
    setVerifyingId(null);
    if (res.ok) { showToast('✅ Verified! Students will be notified.'); load(); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleView = async (resource) => {
    try {
      if (resource.content_type === 'external_link') {
        const url = resource.external_url?.startsWith('http') ? resource.external_url : `https://${resource.external_url}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const res = await generalApiFetch(`/resources/signed-url/${resource.id}`);
        if (!res.ok) throw new Error('Failed to fetch signed URL');
        const data = await res.json();
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) { showToast('Could not open resource', 'error'); }
  };

  const handleDeleteClick = (id) => { setConfirmingId(id); };
  const handleDeleteCancel = () => setConfirmingId(null);

  const handleDeleteConfirm = async (id) => {
    setConfirmingId(null);
    setDeletingId(id);
    const res = await adminApiFetch(`/resources/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) { setResources(prev => prev.filter(r => r.id !== id)); showToast('🗑 Resource deleted'); }
    else { const d = await res.json(); showToast(d.error || 'Delete failed', 'error'); }
  };

  const handleSummarize = async (resourceId) => {
    try {
      setActiveSummary({ title: '', summary: null });
      const res = await generalApiFetch(`/resources/${resourceId}/summarize`, { method: 'POST' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const result = await res.json();
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, ai_summary: result.summary } : r));
      const rsc = resources.find(r => r.id === resourceId);
      setActiveSummary({ title: rsc?.title || 'Resource Snapshot', summary: result.summary });
    } catch (err) { setActiveSummary(null); showToast(err.message, 'error'); }
  };

  const handleEditSaved = (updated) => {
    setResources(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
    setEditResource(null);
    showToast('✏️ Resource updated!');
  };

  const visible = resources.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.title?.toLowerCase().includes(q) || r.contributor_name?.toLowerCase().includes(q) || r.subject_name?.toLowerCase().includes(q) || r.course_name?.toLowerCase().includes(q);
  });

  const pendingCount = resources.filter(r => !r.is_verified).length;
  const verifiedCount = resources.filter(r => r.is_verified).length;

  return (
    <div className="admin-layout">
      <Sidebar active="resources" />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Resource Verification</h1>
            <p className="admin-topbar-subtitle">Review, verify, edit and manage all platform resources</p>
          </div>
          <div className="rv-search-wrap">
            <span className="rv-search-icon">🔍</span>
            <input className="rv-search-input" placeholder="Search by title, contributor, subject…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="rv-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
        </header>

        <div className="admin-content">
          {/* Stats strip */}
          {tab === 'all' && !loading && resources.length > 0 && (
            <div className="rv-stats-strip">
              <div className="rv-stat rv-stat--total"><span className="rv-stat-num">{resources.length}</span><span className="rv-stat-lbl">Total</span></div>
              <div className="rv-stat-divider" />
              <div className="rv-stat rv-stat--verified"><span className="rv-stat-num">{verifiedCount}</span><span className="rv-stat-lbl">Verified</span></div>
              <div className="rv-stat-divider" />
              <div className="rv-stat rv-stat--pending"><span className="rv-stat-num">{pendingCount}</span><span className="rv-stat-lbl">Pending</span></div>
            </div>
          )}

          {/* Tabs */}
          <div className="rv-tabs">
            <button className={`rv-tab ${tab === 'pending' ? 'rv-tab--active' : ''}`} onClick={() => setTab('pending')}>
              <span>⏳</span> Pending Verification
              {tab === 'pending' && resources.length > 0 && <span className="rv-tab-count">{resources.length}</span>}
            </button>
            <button className={`rv-tab ${tab === 'all' ? 'rv-tab--active' : ''}`} onClick={() => setTab('all')}>
              <span>📋</span> All Resources
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="rv-loading"><div className="rv-spinner" /><p>Loading resources…</p></div>
          ) : visible.length === 0 ? (
            <div className="rv-empty">
              <span className="rv-empty-icon">{search ? '🔎' : '✅'}</span>
              <p className="rv-empty-title">{search ? `No results for "${search}"` : tab === 'pending' ? 'All clear!' : 'No resources yet'}</p>
              <p className="rv-empty-sub">{search ? 'Try a different term.' : tab === 'pending' ? 'All uploads have been reviewed.' : 'No resources exist yet.'}</p>
            </div>
          ) : (
            <div className="resource-grid">
              {visible.map(r => (
                <AdminResourceCard
                  key={r.id}
                  resource={r}
                  isDeleting={deletingId === r.id}
                  isConfirming={confirmingId === r.id}
                  isVerifying={verifyingId === r.id}
                  onView={() => handleView(r)}
                  onEdit={() => setEditResource(r)}
                  onDeleteClick={() => handleDeleteClick(r.id)}
                  onDeleteConfirm={() => handleDeleteConfirm(r.id)}
                  onDeleteCancel={handleDeleteCancel}
                  onVerify={() => handleVerify(r.id)}
                  onSummarize={() => handleSummarize(r.id)}
                  onViewSummary={(summary) => setActiveSummary({ title: r.title, summary })}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editResource && <EditModal resource={editResource} onClose={() => setEditResource(null)} onSaved={handleEditSaved} />}

      {/* AI Summary Modal */}
      <SummaryModal isOpen={!!activeSummary} onClose={() => setActiveSummary(null)} title={activeSummary?.title} summary={activeSummary?.summary} />

      {/* Toast */}
      {toast && <div className={`admin-toast admin-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
