import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import FacultyRequestCard from '../components/FacultyRequestCard';
import RejectModal from '../components/RejectModal';
import '../styles/admin.css';
import '../styles/faculty-management.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function FacultyManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [allFaculty, setAllFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, faculty: null });
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  async function loadFaculty() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${API_BASE}/api/admin/faculty/all`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setAllFaculty(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadFaculty(); }, []);

  const handleApprove = async (facultyId, name) => {
    setActionLoading(facultyId + '-approve');
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${API_BASE}/api/admin/faculty/${facultyId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        showToast(`✅ ${name} approved successfully!`);
        await loadFaculty();
      } else {
        showToast('Failed to approve', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (facultyId, reason) => {
    setActionLoading(facultyId + '-reject');
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${API_BASE}/api/admin/faculty/${facultyId}/reject`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        showToast('Application rejected', 'warning');
        await loadFaculty();
      } else {
        showToast('Failed to reject', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(null);
      setRejectModal({ open: false, faculty: null });
    }
  };

  const pending = allFaculty.filter(f => f.status === 'pending');
  const approved = allFaculty.filter(f => f.status === 'approved');
  const rejected = allFaculty.filter(f => f.status === 'rejected');

  const displayed = activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected;

  return (
    <div className="admin-layout">
      <Sidebar active="faculty" />

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Faculty Management</h1>
            <p className="admin-topbar-subtitle">Review and manage faculty registration requests</p>
          </div>
          <div className="fm-counts">
            <span className="fm-count fm-count--pending">{pending.length} pending</span>
            <span className="fm-count fm-count--approved">{approved.length} approved</span>
          </div>
        </header>

        <div className="admin-content">
          {/* Tabs */}
          <div className="fm-tabs">
            {['pending', 'approved', 'rejected'].map(tab => (
              <button
                key={tab}
                className={`fm-tab ${activeTab === tab ? 'fm-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'pending' ? '⏳' : tab === 'approved' ? '✅' : '❌'}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="fm-tab-count">
                  {tab === 'pending' ? pending.length : tab === 'approved' ? approved.length : rejected.length}
                </span>
              </button>
            ))}
          </div>

          {/* Faculty list */}
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Loading faculty data...</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{activeTab === 'pending' ? '🎉' : activeTab === 'approved' ? '👥' : '📭'}</div>
              <p>
                {activeTab === 'pending' ? 'No pending requests — all caught up!' :
                 activeTab === 'approved' ? 'No approved faculty yet' :
                 'No rejected applications'}
              </p>
            </div>
          ) : (
            <div className="faculty-cards">
              {displayed.map(faculty => (
                <FacultyRequestCard
                  key={faculty.id}
                  faculty={faculty}
                  showActions={activeTab === 'pending'}
                  actionLoading={actionLoading}
                  onApprove={() => handleApprove(faculty.id, faculty.full_name)}
                  onReject={() => setRejectModal({ open: true, faculty })}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModal.open && (
        <RejectModal
          faculty={rejectModal.faculty}
          loading={actionLoading === rejectModal.faculty?.id + '-reject'}
          onConfirm={(reason) => handleReject(rejectModal.faculty.id, reason)}
          onClose={() => setRejectModal({ open: false, faculty: null })}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default FacultyManagement;
