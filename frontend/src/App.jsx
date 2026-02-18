import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import UploadResource from "./pages/UploadResource";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App({ onToggleTheme, isDark }) {
  const { user } = useAuth();

  // If not logged in, show only login page
  if (!user) {
    return <Login isDark={isDark} onToggleTheme={onToggleTheme} />;
  }

  return (
    <div className="app">
      <Navbar isDark={isDark} onToggleTheme={onToggleTheme} />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadResource />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;