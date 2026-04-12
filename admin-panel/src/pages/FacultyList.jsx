import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import '../styles/admin.css';
import '../styles/users.css';
import '../styles/faculty-list.css';

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


export default function FacultyList() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Edit State
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api('/faculty/list');
    if (res.ok) setFaculty((await res.json()).data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = faculty.filter(f => {
    const q = search.toLowerCase();
    return !q ||
      f.full_name?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.department?.toLowerCase().includes(q) ||
      f.research_interests?.toLowerCase().includes(q);
  });

  const handleEditClick = (f, e) => {
    e.stopPropagation();
    setEditingFaculty(f);
    setEditFormData({
      department: f.department || '',
      employee_id: f.employee_id || '',
      education: f.education || '',
      research_interests: f.research_interests || '',
      phd_topic: f.phd_topic || '',
      open_for_interns: !!f.open_for_interns,
      open_for_research: !!f.open_for_research,
      open_for_mentoring: !!f.open_for_mentoring,
      internship_details: f.internship_details || '',
      research_details: f.research_details || '',
      mentoring_details: f.mentoring_details || ''
    });
  };

  const handleEditSave = async () => {
    try {
      const res = await api(`/faculty/${editingFaculty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setEditingFaculty(null);
        load(); // Reload the whole list to show updated data
        alert('Faculty profile updated successfully!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to update profile');
      }
    } catch (err) {
      alert('An error occurred during update');
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar active="faculty-list" />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Faculty Directory</h1>
            <p className="admin-topbar-subtitle">{faculty.length} faculty members registered</p>
          </div>
        </header>

        <div className="admin-content">
          {/* Filter row */}
          <div className="ur-filter-row">
            <input
              className="ur-search"
              type="text"
              placeholder="Search by name, email, department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="ur-loading">Loading faculty…</div>
          ) : filtered.length === 0 ? (
            <div className="fl-empty">
              <span>🏫</span>
              <p>No faculty members found.</p>
            </div>
          ) : (
            <div className="fl-grid">
              {filtered.map(f => {
                const isOpen = expanded === f.id;
                return (
                  <div key={f.id} className={`fl-card ${isOpen ? 'fl-card--open' : ''}`}>
                    <div className="fl-card-header" onClick={() => setExpanded(isOpen ? null : f.id)}>
                      <div className="fl-avatar">{f.full_name?.[0]?.toUpperCase() || '?'}</div>
                      <div className="fl-info">
                        <div className="fl-name">{f.full_name}</div>
                        <div className="fl-email">{f.email}</div>
                        <div className="fl-meta">
                          {f.department && <span className="fl-dept">{f.department}</span>}
                          {f.is_verified && <span className="ur-verified" style={{ fontSize: '0.72rem' }}>✔ Verified</span>}
                        </div>
                      </div>
                      <div className="fl-stats">
                        <div className="fl-stat"><strong>{f.subjects_count}</strong><span>Subjects</span></div>
                        <div className="fl-stat"><strong>{f.resources_count}</strong><span>Resources</span></div>
                      </div>
                      <span className="fl-chevron">{isOpen ? '▲' : '▼'}</span>
                    </div>

                    {isOpen && (
                      <div className="fl-card-body">
                        {f.employee_id && (
                          <div className="fl-detail-row">
                            <span className="fl-detail-label">Employee ID</span>
                            <span>{f.employee_id}</span>
                          </div>
                        )}
                        {f.education && (
                          <div className="fl-detail-row">
                            <span className="fl-detail-label">Education</span>
                            <span>{f.education}</span>
                          </div>
                        )}
                        {f.research_interests && (
                          <div className="fl-detail-row">
                            <span className="fl-detail-label">Research Interests</span>
                            <span>{f.research_interests}</span>
                          </div>
                        )}
                        {f.phd_topic && (
                          <div className="fl-detail-row">
                            <span className="fl-detail-label">PhD Topic</span>
                            <span>{f.phd_topic}</span>
                          </div>
                        )}
                        <div className="fl-availability">
                          <span className="fl-detail-label">Availability</span>
                          <div className="fl-avail-chips">
                            <span className={`fl-avail-chip ${f.open_for_interns ? 'fl-avail--on' : 'fl-avail--off'}`}>
                              🎯 Internships
                            </span>
                            <span className={`fl-avail-chip ${f.open_for_research ? 'fl-avail--on' : 'fl-avail--off'}`}>
                              🔬 Research
                            </span>
                            <span className={`fl-avail-chip ${f.open_for_mentoring ? 'fl-avail--on' : 'fl-avail--off'}`}>
                              💬 Mentoring
                            </span>
                          </div>
                        </div>
                        <div className="fl-detail-row fl-detail-row--muted">
                          <span className="fl-detail-label">Last updated</span>
                          <span>{f.updated_at ? new Date(f.updated_at).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="fl-detail-row mt-3" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                          <button
                            className="ur-btn-verify"
                            style={{
                              background: 'var(--accent-glow)', color: 'var(--accent)',
                              border: '1px solid var(--accent)', padding: '6px 16px',
                              borderRadius: 'var(--radius)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                            }}
                            onClick={(e) => handleEditClick(f, e)}
                          >
                            ✏️ Edit Profile Details
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingFaculty && (
        <div className="ur-modal-overlay" onClick={() => setEditingFaculty(null)}>
          <div className="ur-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="ur-modal-header">
              <h2>Edit Profile: {editingFaculty.full_name}</h2>
              <button className="ur-modal-close" onClick={() => setEditingFaculty(null)}>✕</button>
            </div>

            <div className="ur-modal-body" style={{ overflowY: 'auto', padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="ur-detail-item">
                  <label className="ur-detail-label">Department</label>
                  <input className="ur-search" style={{ width: '100%', borderRadius: '6px' }} value={editFormData.department} onChange={e => setEditFormData({ ...editFormData, department: e.target.value })} />
                </div>
                <div className="ur-detail-item">
                  <label className="ur-detail-label">Employee ID</label>
                  <input className="ur-search" style={{ width: '100%', borderRadius: '6px' }} value={editFormData.employee_id} onChange={e => setEditFormData({ ...editFormData, employee_id: e.target.value })} />
                </div>
                <div className="ur-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <label className="ur-detail-label">Education</label>
                  <input className="ur-search" style={{ width: '100%', borderRadius: '6px' }} value={editFormData.education} onChange={e => setEditFormData({ ...editFormData, education: e.target.value })} />
                </div>
                <div className="ur-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <label className="ur-detail-label">Research Interests</label>
                  <input className="ur-search" style={{ width: '100%', borderRadius: '6px' }} value={editFormData.research_interests} onChange={e => setEditFormData({ ...editFormData, research_interests: e.target.value })} />
                </div>
                <div className="ur-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <label className="ur-detail-label">PhD Topic</label>
                  <input className="ur-search" style={{ width: '100%', borderRadius: '6px' }} value={editFormData.phd_topic} onChange={e => setEditFormData({ ...editFormData, phd_topic: e.target.value })} />
                </div>

                {/* Availability Toggles & Details */}
                <div className="ur-detail-item" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', color: 'var(--text)' }}>Availability & Details</h3>
                </div>

                <div className="ur-detail-item" style={{ gridColumn: '1 / -1', background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editFormData.open_for_interns} onChange={e => setEditFormData({ ...editFormData, open_for_interns: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    Open for Interns
                  </label>
                  {editFormData.open_for_interns && (
                    <textarea className="ur-search" style={{ width: '100%', borderRadius: '6px', height: '60px', padding: '0.5rem', resize: 'vertical' }} placeholder="Internship criteria or details..." value={editFormData.internship_details} onChange={e => setEditFormData({ ...editFormData, internship_details: e.target.value })} />
                  )}
                </div>

                <div className="ur-detail-item" style={{ gridColumn: '1 / -1', background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editFormData.open_for_research} onChange={e => setEditFormData({ ...editFormData, open_for_research: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    Open for Research Collaborations
                  </label>
                  {editFormData.open_for_research && (
                    <textarea className="ur-search" style={{ width: '100%', borderRadius: '6px', height: '60px', padding: '0.5rem', resize: 'vertical' }} placeholder="Research requirements or details..." value={editFormData.research_details} onChange={e => setEditFormData({ ...editFormData, research_details: e.target.value })} />
                  )}
                </div>

                <div className="ur-detail-item" style={{ gridColumn: '1 / -1', background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editFormData.open_for_mentoring} onChange={e => setEditFormData({ ...editFormData, open_for_mentoring: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    Open for Mentoring
                  </label>
                  {editFormData.open_for_mentoring && (
                    <textarea className="ur-search" style={{ width: '100%', borderRadius: '6px', height: '60px', padding: '0.5rem', resize: 'vertical' }} placeholder="Mentoring focus areas..." value={editFormData.mentoring_details} onChange={e => setEditFormData({ ...editFormData, mentoring_details: e.target.value })} />
                  )}
                </div>
              </div>
            </div>

            <div className="ur-modal-actions" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => setEditingFaculty(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#0f172a', fontWeight: '600', cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
