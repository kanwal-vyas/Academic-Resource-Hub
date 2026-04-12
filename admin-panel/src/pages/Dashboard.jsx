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
    faculty: 0, students: 0,
    courses: 0, subjects: 0, total_resources: 0, pending_resources: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const statsRes = await fetch(`${API_BASE}/api/admin/stats`, { headers });
        if (statsRes.ok) {
          const result = await statsRes.json();
          setStats(result.data || result); // Fallback in case format is off
        }
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
                <StatsCard icon="✅" label="Total Faculty" value={stats.faculty} color="success" hint="Active faculty" to="/faculty-list" />
                <StatsCard icon="🎓" label="Total Students" value={stats.students} color="info" hint="Registered students" to="/users" />
                <StatsCard icon="📚" label="Courses" value={stats.courses} color="primary" hint="Total courses" to="/content" />
                <StatsCard icon="📖" label="Subjects" value={stats.subjects} color="primary" hint="Total subjects" to="/content" />
                <StatsCard icon="📁" label="Total Resources" value={stats.total_resources} color="info" hint="All uploads" to="/resources" />
                <StatsCard icon="🔍" label="Pending Verification" value={stats.pending_resources} color={stats.pending_resources > 0 ? 'warning' : 'success'} hint="Student uploads awaiting review" to="/resources" />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
