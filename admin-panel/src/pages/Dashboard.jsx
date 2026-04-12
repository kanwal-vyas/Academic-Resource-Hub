import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import StatsCard from '../components/StatsCard';
import '../styles/admin.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pending: 0, approved: 0, rejected: 0, students: 0,
    courses: 0, subjects: 0, total_resources: 0, pending_resources: 0,
  });
  const [pendingFaculty, setPendingFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [statsRes, pendingRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/stats`, { headers }),
          fetch(`${API_BASE}/api/admin/faculty/pending`, { headers }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (pendingRes.ok) setPendingFaculty(await pendingRes.json());
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar active="dashboard" />

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">Dashboard</h1>
            <p className="admin-topbar-subtitle">Welcome back, {user?.full_name || 'Admin'} 👋</p>
          </div>
          <div className="admin-topbar-badge">Admin Panel</div>
        </header>

        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="stats-grid">
                <StatsCard icon="⏳" label="Pending Faculty" value={stats.pending} color="warning" hint="Awaiting review" />
                <StatsCard icon="✅" label="Approved Faculty" value={stats.approved} color="success" hint="Active faculty" />
                <StatsCard icon="🎓" label="Total Students" value={stats.students} color="info" hint="Registered students" />
                <StatsCard icon="📚" label="Courses" value={stats.courses} color="primary" hint="Total courses" />
                <StatsCard icon="📖" label="Subjects" value={stats.subjects} color="primary" hint="Total subjects" />
                <StatsCard icon="📁" label="Total Resources" value={stats.total_resources} color="info" hint="All uploads" />
                <StatsCard icon="🔍" label="Pending Verification" value={stats.pending_resources} color={stats.pending_resources > 0 ? 'warning' : 'success'} hint="Student uploads awaiting review" />
                <StatsCard icon="❌" label="Rejected Faculty" value={stats.rejected} color="danger" hint="Not approved" />
              </div>

              {/* Pending faculty */}
              <div className="dashboard-section">
                <div className="section-header">
                  <h2 className="section-title">
                    Pending Faculty Requests
                    {stats.pending > 0 && <span className="section-badge">{stats.pending}</span>}
                  </h2>
                  <Link to="/faculty" className="view-all-link">View All →</Link>
                </div>

                {pendingFaculty.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🎉</div>
                    <p>No pending requests — all caught up!</p>
                  </div>
                ) : (
                  <div className="pending-list">
                    {pendingFaculty.slice(0, 5).map(faculty => (
                      <div key={faculty.id} className="pending-row">
                        <div className="pending-avatar">
                          {faculty.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="pending-info">
                          <div className="pending-name">{faculty.full_name}</div>
                          <div className="pending-meta">{faculty.email} · {faculty.department}</div>
                        </div>
                        <div className="pending-right">
                          <span className="badge badge-pending">Pending</span>
                          <Link to="/faculty" className="review-btn">Review →</Link>
                        </div>
                      </div>
                    ))}
                    {pendingFaculty.length > 5 && (
                      <div className="pending-more">
                        <Link to="/faculty">+ {pendingFaculty.length - 5} more pending requests</Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
