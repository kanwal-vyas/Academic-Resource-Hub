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
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App({ onToggleTheme, isDark }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
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
                <SignUp />
              }
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
    </div>
  );
}

export default App;