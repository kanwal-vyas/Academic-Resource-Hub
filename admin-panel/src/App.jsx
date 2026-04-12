import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import ContentManagement from './pages/ContentManagement';
import ResourceVerification from './pages/ResourceVerification';
import UserManagement from './pages/UserManagement';
import FacultyList from './pages/FacultyList';
import Messages from './pages/Messages';

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16,
        background: '#0a0f1e',
        color: '#94a3b8',
        zIndex: 9999,
      }}>
        <div style={{
          width: 48, height: 48,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#d4af37',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '0.9rem', margin: 0, letterSpacing: '0.04em' }}>
          Authenticating…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }


  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !loading && user
            ? <Navigate to="/" replace />
            : <AdminLogin />
        }
      />

      <Route
        path="/"
        element={
          <AdminRoute>
            <Dashboard />
          </AdminRoute>
        }
      />

      <Route path="/faculty-list" element={<AdminRoute><FacultyList /></AdminRoute>} />
      <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
      <Route path="/content" element={<AdminRoute><ContentManagement /></AdminRoute>} />
      <Route path="/resources" element={<AdminRoute><ResourceVerification /></AdminRoute>} />
      <Route path="/messages" element={<AdminRoute><Messages /></AdminRoute>} />

      <Route
        path="*"
        element={
          loading ? null :
          user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default App;
