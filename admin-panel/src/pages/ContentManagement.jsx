import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import '../styles/admin.css';
import '../styles/content.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}/api/admin${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
}

// ── Generic Modal ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={e => e.stopPropagation()}>
        <div className="cm-modal-header">
          <h3>{title}</h3>
          <button className="cm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cm-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ item, onConfirm, onClose, loading }) {
  return (
    <Modal title="Confirm Delete" onClose={onClose}>
      <p className="cm-confirm-text">
        Are you sure you want to delete <strong>"{item.name || item.code || `Unit ${item.unit_number}`}"</strong>?
        This may fail if related records exist.
      </p>
      <div className="cm-modal-actions">
        <button className="cm-btn cm-btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting...' : '🗑 Delete'}
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ============================================================================
// TAB: COURSES
// ============================================================================
function CoursesTab() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', degree_type: '', department: '' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    if (courses.length === 0) setLoading(true);
    const res = await api('/courses');
    if (res.ok) setCourses((await res.json()).data);
    setLoading(false);
  }, [courses.length]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await api('/courses', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ code: '', name: '', degree_type: '', department: '' }); load(); showToast('Course created!'); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleDelete = async () => {
    setDeleting(confirmDelete.id);
    const res = await api(`/courses/${confirmDelete.id}`, { method: 'DELETE' });
    setDeleting(null); setConfirmDelete(null);
    if (res.ok) { load(); showToast('Course deleted'); }
    else { const d = await res.json(); showToast(d.error || 'Failed to delete', 'error'); }
  };

  return (
    <div className="cm-tab-content">
      <div className="cm-tab-header">
        <h3 className="cm-tab-title">Courses <span className="cm-count">{courses.length}</span></h3>
        <button className="cm-btn cm-btn-primary" onClick={() => setShowAdd(true)}>+ Add Course</button>
      </div>

      {loading ? <div className="cm-loading">Loading...</div> : (
        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead><tr><th>Code</th><th>Name</th><th>Degree</th><th>Department</th><th>Subjects</th><th>Actions</th></tr></thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan="6" className="cm-empty">No courses yet. Add one to get started.</td></tr>
              ) : courses.map(c => (
                <tr key={c.id}>
                  <td><span className="cm-code-badge">{c.code}</span></td>
                  <td className="cm-name">{c.name}</td>
                  <td>{c.degree_type || '—'}</td>
                  <td>{c.department || '—'}</td>
                  <td><span className="cm-count-small">{c.subject_count}</span></td>
                  <td>
                    <button className="cm-icon-btn cm-icon-btn--danger" onClick={() => setConfirmDelete(c)} title="Delete">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Course" onClose={() => setShowAdd(false)}>
          <form className="cm-form" onSubmit={handleAdd}>
            <div className="cm-form-row">
              <div className="cm-field"><label>Course Code *</label><input required placeholder="e.g. BCA" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
              <div className="cm-field"><label>Degree Type</label><input placeholder="e.g. Bachelors" value={form.degree_type} onChange={e => setForm(p => ({ ...p, degree_type: e.target.value }))} /></div>
            </div>
            <div className="cm-field"><label>Course Name *</label><input required placeholder="e.g. Bachelor of Computer Applications" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="cm-field"><label>Department</label><input placeholder="e.g. Computer Science" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
            <div className="cm-modal-actions">
              <button type="submit" className="cm-btn cm-btn-primary">Create Course</button>
              <button type="button" className="cm-btn cm-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <DeleteConfirm item={confirmDelete} onConfirm={handleDelete} onClose={() => setConfirmDelete(null)} loading={deleting === confirmDelete.id} />
      )}

      {toast && <div className={`cm-toast cm-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

// ============================================================================
// TAB: SUBJECTS
// ============================================================================
function SubjectsTab() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filterCourse, setFilterCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', course_id: '' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    if (subjects.length === 0) setLoading(true);
    const [sRes, cRes] = await Promise.all([
      api(`/subjects${filterCourse ? `?course_id=${filterCourse}` : ''}`),
      api('/courses'),
    ]);
    if (sRes.ok) setSubjects((await sRes.json()).data);
    if (cRes.ok) setCourses((await cRes.json()).data);
    setLoading(false);
  }, [filterCourse, subjects.length]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await api('/subjects', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ code: '', name: '', course_id: '' }); load(); showToast('Subject created!'); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleDelete = async () => {
    setDeleting(confirmDelete.id);
    const res = await api(`/subjects/${confirmDelete.id}`, { method: 'DELETE' });
    setDeleting(null); setConfirmDelete(null);
    if (res.ok) { load(); showToast('Subject deleted'); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  return (
    <div className="cm-tab-content">
      <div className="cm-tab-header">
        <h3 className="cm-tab-title">Subjects <span className="cm-count">{subjects.length}</span></h3>
        <div className="cm-tab-header-actions">
          <select className="cm-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
          <button className="cm-btn cm-btn-primary" onClick={() => setShowAdd(true)}>+ Add Subject</button>
        </div>
      </div>

      {loading ? <div className="cm-loading">Loading...</div> : (
        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead><tr><th>Code</th><th>Subject Name</th><th>Course</th><th>Actions</th></tr></thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr><td colSpan="4" className="cm-empty">No subjects found.</td></tr>
              ) : subjects.map(s => (
                <tr key={s.id}>
                  <td><span className="cm-code-badge">{s.code}</span></td>
                  <td className="cm-name">{s.name}</td>
                  <td>{s.course_name}</td>
                  <td><button className="cm-icon-btn cm-icon-btn--danger" onClick={() => setConfirmDelete(s)} title="Delete">🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Subject" onClose={() => setShowAdd(false)}>
          <form className="cm-form" onSubmit={handleAdd}>
            <div className="cm-field">
              <label>Course *</label>
              <select required value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}>
                <option value="">Select a course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="cm-form-row">
              <div className="cm-field"><label>Subject Code *</label><input required placeholder="e.g. CS301" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
            </div>
            <div className="cm-field"><label>Subject Name *</label><input required placeholder="e.g. Data Structures" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="cm-modal-actions">
              <button type="submit" className="cm-btn cm-btn-primary">Create Subject</button>
              <button type="button" className="cm-btn cm-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && <DeleteConfirm item={confirmDelete} onConfirm={handleDelete} onClose={() => setConfirmDelete(null)} loading={deleting === confirmDelete.id} />}
      {toast && <div className={`cm-toast cm-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

// ============================================================================
// TAB: ACADEMIC YEARS
// ============================================================================
function AcademicYearsTab() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ start_year: '', end_year: '' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  const load = useCallback(async () => { if (years.length === 0) setLoading(true); const res = await api('/academic-years'); if (res.ok) setYears((await res.json()).data); setLoading(false); }, [years.length]);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await api('/academic-years', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ start_year: '', end_year: '' }); load(); showToast('Academic year added!'); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleDelete = async () => {
    setDeleting(confirmDelete.id);
    const res = await api(`/academic-years/${confirmDelete.id}`, { method: 'DELETE' });
    setDeleting(null); setConfirmDelete(null);
    if (res.ok) { load(); showToast('Deleted'); } else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  return (
    <div className="cm-tab-content">
      <div className="cm-tab-header">
        <h3 className="cm-tab-title">Academic Years <span className="cm-count">{years.length}</span></h3>
        <button className="cm-btn cm-btn-primary" onClick={() => setShowAdd(true)}>+ Add Year</button>
      </div>
      {loading ? <div className="cm-loading">Loading...</div> : (
        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead><tr><th>Start Year</th><th>End Year</th><th>Label</th><th>Actions</th></tr></thead>
            <tbody>
              {years.length === 0 ? <tr><td colSpan="4" className="cm-empty">No academic years yet.</td></tr>
                : years.map(y => (
                  <tr key={y.id}>
                    <td>{y.start_year}</td>
                    <td>{y.end_year}</td>
                    <td><span className="cm-code-badge">{y.start_year}–{y.end_year}</span></td>
                    <td><button className="cm-icon-btn cm-icon-btn--danger" onClick={() => setConfirmDelete({ ...y, name: `${y.start_year}–${y.end_year}` })}>🗑</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && (
        <Modal title="Add Academic Year" onClose={() => setShowAdd(false)}>
          <form className="cm-form" onSubmit={handleAdd}>
            <div className="cm-form-row">
              <div className="cm-field"><label>Start Year *</label><input required type="number" placeholder="2024" value={form.start_year} onChange={e => setForm(p => ({ ...p, start_year: e.target.value }))} /></div>
              <div className="cm-field"><label>End Year *</label><input required type="number" placeholder="2025" value={form.end_year} onChange={e => setForm(p => ({ ...p, end_year: e.target.value }))} /></div>
            </div>
            <div className="cm-modal-actions">
              <button type="submit" className="cm-btn cm-btn-primary">Add Year</button>
              <button type="button" className="cm-btn cm-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDelete && <DeleteConfirm item={confirmDelete} onConfirm={handleDelete} onClose={() => setConfirmDelete(null)} loading={deleting === confirmDelete.id} />}
      {toast && <div className={`cm-toast cm-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

// ============================================================================
// TAB: SUBJECT OFFERINGS
// ============================================================================
function OfferingsTab() {
  const [offerings, setOfferings] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ subject_id: '', academic_year_id: '', faculty_id: '' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    if (offerings.length === 0) setLoading(true);
    const [oRes, sRes, yRes, fRes] = await Promise.all([
      api('/subject-offerings'),
      api('/subjects'),
      api('/academic-years'),
      fetch(`${API}/faculty`),
    ]);
    if (oRes.ok) setOfferings((await oRes.json()).data);
    if (sRes.ok) setSubjects((await sRes.json()).data);
    if (yRes.ok) setYears((await yRes.json()).data);
    if (fRes.ok) { const fd = await fRes.json(); setFaculty(fd.data || []); }
    setLoading(false);
  }, [offerings.length]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await api('/subject-offerings', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ subject_id: '', academic_year_id: '', faculty_id: '' }); load(); showToast('Offering created!'); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleDelete = async () => {
    setDeleting(confirmDelete.id);
    const res = await api(`/subject-offerings/${confirmDelete.id}`, { method: 'DELETE' });
    setDeleting(null); setConfirmDelete(null);
    if (res.ok) { load(); showToast('Deleted'); } else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  return (
    <div className="cm-tab-content">
      <div className="cm-tab-header">
        <h3 className="cm-tab-title">Subject Offerings <span className="cm-count">{offerings.length}</span></h3>
        <button className="cm-btn cm-btn-primary" onClick={() => setShowAdd(true)}>+ Add Offering</button>
      </div>
      {loading ? <div className="cm-loading">Loading...</div> : (
        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead><tr><th>Subject</th><th>Year</th><th>Faculty</th><th>Units</th><th>Actions</th></tr></thead>
            <tbody>
              {offerings.length === 0 ? <tr><td colSpan="5" className="cm-empty">No offerings yet.</td></tr>
                : offerings.map(o => (
                  <tr key={o.id}>
                    <td><span className="cm-code-badge">{o.subject_code}</span> {o.subject_name}</td>
                    <td>{o.start_year}–{o.end_year}</td>
                    <td>{o.faculty_name || <span className="cm-muted">Unassigned</span>}</td>
                    <td><span className="cm-count-small">{o.unit_count}</span></td>
                    <td><button className="cm-icon-btn cm-icon-btn--danger" onClick={() => setConfirmDelete({ ...o, name: `${o.subject_code} ${o.start_year}–${o.end_year}` })}>🗑</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && (
        <Modal title="Add Subject Offering" onClose={() => setShowAdd(false)}>
          <form className="cm-form" onSubmit={handleAdd}>
            <div className="cm-field">
              <label>Subject *</label>
              <select required value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
            <div className="cm-field">
              <label>Academic Year *</label>
              <select required value={form.academic_year_id} onChange={e => setForm(p => ({ ...p, academic_year_id: e.target.value }))}>
                <option value="">Select year</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.start_year}–{y.end_year}</option>)}
              </select>
            </div>
            <div className="cm-field">
              <label>Assign Faculty</label>
              <select value={form.faculty_id} onChange={e => setForm(p => ({ ...p, faculty_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {faculty.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
              </select>
            </div>
            <div className="cm-modal-actions">
              <button type="submit" className="cm-btn cm-btn-primary">Create Offering</button>
              <button type="button" className="cm-btn cm-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDelete && <DeleteConfirm item={confirmDelete} onConfirm={handleDelete} onClose={() => setConfirmDelete(null)} loading={deleting === confirmDelete.id} />}
      {toast && <div className={`cm-toast cm-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

// ============================================================================
// TAB: UNITS
// ============================================================================
function UnitsTab() {
  const [units, setUnits] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [filterOffering, setFilterOffering] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ subject_offering_id: '', unit_number: '' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    if (units.length === 0) setLoading(true);
    const [uRes, oRes] = await Promise.all([
      api(`/units${filterOffering ? `?offering_id=${filterOffering}` : ''}`),
      api('/subject-offerings'),
    ]);
    if (uRes.ok) setUnits((await uRes.json()).data);
    if (oRes.ok) setOfferings((await oRes.json()).data);
    setLoading(false);
  }, [filterOffering, units.length]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await api('/units', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ subject_offering_id: '', unit_number: '' }); load(); showToast('Unit added!'); }
    else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  const handleDelete = async () => {
    setDeleting(confirmDelete.id);
    const res = await api(`/units/${confirmDelete.id}`, { method: 'DELETE' });
    setDeleting(null); setConfirmDelete(null);
    if (res.ok) { load(); showToast('Deleted'); } else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
  };

  return (
    <div className="cm-tab-content">
      <div className="cm-tab-header">
        <h3 className="cm-tab-title">Units <span className="cm-count">{units.length}</span></h3>
        <div className="cm-tab-header-actions">
          <select className="cm-select" value={filterOffering} onChange={e => setFilterOffering(e.target.value)}>
            <option value="">All Offerings</option>
            {offerings.map(o => <option key={o.id} value={o.id}>{o.subject_code} — {o.start_year}–{o.end_year}</option>)}
          </select>
          <button className="cm-btn cm-btn-primary" onClick={() => setShowAdd(true)}>+ Add Unit</button>
        </div>
      </div>
      {loading ? <div className="cm-loading">Loading...</div> : (
        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead><tr><th>Unit #</th><th>Subject</th><th>Year</th><th>Actions</th></tr></thead>
            <tbody>
              {units.length === 0 ? <tr><td colSpan="4" className="cm-empty">No units found.</td></tr>
                : units.map(u => (
                  <tr key={u.id}>
                    <td><span className="cm-code-badge">Unit {u.unit_number}</span></td>
                    <td>{u.subject_code} — {u.subject_name}</td>
                    <td>{u.start_year}–{u.end_year}</td>
                    <td><button className="cm-icon-btn cm-icon-btn--danger" onClick={() => setConfirmDelete(u)}>🗑</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && (
        <Modal title="Add Unit" onClose={() => setShowAdd(false)}>
          <form className="cm-form" onSubmit={handleAdd}>
            <div className="cm-field">
              <label>Subject Offering *</label>
              <select required value={form.subject_offering_id} onChange={e => setForm(p => ({ ...p, subject_offering_id: e.target.value }))}>
                <option value="">Select offering</option>
                {offerings.map(o => <option key={o.id} value={o.id}>{o.subject_code} — {o.start_year}–{o.end_year} {o.faculty_name ? `(${o.faculty_name})` : ''}</option>)}
              </select>
            </div>
            <div className="cm-field"><label>Unit Number *</label><input required type="number" min="1" max="10" placeholder="e.g. 1" value={form.unit_number} onChange={e => setForm(p => ({ ...p, unit_number: e.target.value }))} /></div>
            <div className="cm-modal-actions">
              <button type="submit" className="cm-btn cm-btn-primary">Add Unit</button>
              <button type="button" className="cm-btn cm-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDelete && <DeleteConfirm item={confirmDelete} onConfirm={handleDelete} onClose={() => setConfirmDelete(null)} loading={deleting === confirmDelete.id} />}
      {toast && <div className={`cm-toast cm-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
const TABS = [
  { id: 'courses', label: '📚 Courses', Component: CoursesTab },
  { id: 'subjects', label: '📖 Subjects', Component: SubjectsTab },
  { id: 'years', label: '📅 Academic Years', Component: AcademicYearsTab },
  { id: 'offerings', label: '🔗 Offerings', Component: OfferingsTab },
  { id: 'units', label: '📋 Units', Component: UnitsTab },
];

function ContentManagement() {
  const [active, setActive] = useState('courses');
  const ActiveComponent = TABS.find(t => t.id === active)?.Component;

  return (
    <div className="admin-layout">
      <Sidebar active="content" />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Content Management</h1>
            <p className="admin-topbar-subtitle">Manage courses, subjects, academic years, offerings and units</p>
          </div>
        </header>
        <div className="admin-content">
          <div className="cm-tabs-bar">
            {TABS.map(t => (
              <button key={t.id} className={`cm-tab-btn ${active === t.id ? 'cm-tab-btn--active' : ''}`} onClick={() => setActive(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {ActiveComponent && <ActiveComponent />}
        </div>
      </main>
    </div>
  );
}

export default ContentManagement;
