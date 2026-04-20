import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import UploadResource from "./pages/UploadResource";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import FacultyDirectory from "./pages/FacultyDirectory";
import FacultyProfile from "./pages/FacultyProfile";
import MyResources from "./pages/MyResources";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ContactAdmin from "./pages/ContactAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import { ResourceProvider } from "./context/ResourceContext";
import { ToastProvider } from "./context/ToastContext";
import ChatBot from "./components/ChatBot";
import CourseOnboardingModal from "./components/CourseOnboardingModal";


import "./App.css";
import "./styles/toast.css";

function App({ onToggleTheme, isDark }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
      </div>
    );
  }

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <ToastProvider>
      <ResourceProvider>
        <div className="app">

          {user && (
          <Navbar
            isDark={isDark}
            onToggleTheme={onToggleTheme}
            toggleSidebar={toggleSidebar}
          />
        )}

        <div className="layout-wrapper">
          {user && (
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
          )}

          <main className="main-content">
            <Routes>

              {/* Public */}
              <Route
                path="/login"
                element={
                  user ? <Navigate to="/" replace /> :
                  <Login isDark={isDark} onToggleTheme={onToggleTheme} />
                }
              />

              <Route
    path="/signup"
    element={
      user ? <Navigate to="/" replace /> :
      <SignUp isDark={isDark} onToggleTheme={onToggleTheme} />
    }
  />

              <Route
                path="/forgot-password"
                element={<ForgotPassword isDark={isDark} onToggleTheme={onToggleTheme} />}
              />

              <Route
                path="/reset-password"
                element={<ResetPassword isDark={isDark} onToggleTheme={onToggleTheme} />}
              />

              <Route
                path="/contact"
                element={<ContactAdmin isDark={isDark} onToggleTheme={onToggleTheme} />}
              />

              {/* Protected */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/browse"
                element={
                  <ProtectedRoute>
                    <Browse />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadResource />
                  </ProtectedRoute>
                }
              />

              <Route
    path="/edit-resource/:id"
    element={
      <ProtectedRoute>
        <UploadResource />
      </ProtectedRoute>
    }
  />

              <Route
    path="/my-resources"
    element={
      <ProtectedRoute>
        <MyResources />
      </ProtectedRoute>
    }
  />

              <Route
                path="/faculty"
                element={
                  <ProtectedRoute>
                    <FacultyDirectory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty/:id"
                element={
                  <ProtectedRoute>
                    <FacultyProfile />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route
                path="*"
                element={<Navigate to={user ? "/" : "/login"} replace />}
              />

            </Routes>
          </main>
          </div>
          {user && <ChatBot />}
          {user && 
           user.role !== 'faculty' && 
           user.role !== 'admin' && 
           !user.course_id && 
           !user.preferred_course && (
            <CourseOnboardingModal />
          )}
        </div>

      </ResourceProvider>
    </ToastProvider>
  );
}

export default App;