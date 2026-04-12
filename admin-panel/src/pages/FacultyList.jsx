import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import '../styles/admin.css';
import '../styles/users.css';
import '../styles/faculty-list.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}/api/admin${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}

const STATUS_CONFIG = {
  approved: { label: '✔ Approved', cls: 'ur-status--approved' },
  pending:  { label: '⏳ Pending',  cls: 'ur-status--pending' },
  rejected: { label: '✘ Rejected', cls: 'ur-status--rejected' },
};

export default function FacultyList() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api('/faculty/list');
    if (res.ok) setFaculty((await res.json()).data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = faculty.filter(f => {
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      f.full_name?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.department?.toLowerCase().includes(q) ||
      f.research_interests?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: faculty.length,
    approved: faculty.filter(f => f.status === 'approved').length,
    pending: faculty.filter(f => f.status === 'pending').length,
    rejected: faculty.filter(f => f.status === 'rejected').length,
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
            {['all', 'approved', 'pending', 'rejected'].map(s => (
              <button
                key={s}
                className={`ur-pill ${statusFilter === s ? 'ur-pill--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? '🏫 All Faculty' : s === 'approved' ? '✔ Approved' : s === 'pending' ? '⏳ Pending' : '✘ Rejected'}
                <span className="ur-pill-count">{counts[s]}</span>
              </button>
            ))}
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
                const statusCfg = STATUS_CONFIG[f.status] || { label: f.status, cls: '' };
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
                          <span className={`ur-status ${statusCfg.cls}`}>{statusCfg.label}</span>
                          {f.is_verified && <span className="ur-verified" style={{fontSize:'0.72rem'}}>✔ Verified</span>}
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
