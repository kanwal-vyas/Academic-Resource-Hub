import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import "../styles/navbar.css";

function Navbar({ isDark, onToggleTheme }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Left - Navigation */}
        <nav className="header-left">
          <button
            className="header-button button-secondary button-icon"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <NavLink
            to="/"
            className={({ isActive }) =>
              `header-button button-secondary ${isActive ? "active" : ""}`
            }
          >
            Home
          </NavLink>
        </nav>

        {/* Center - Title */}
        <div className="header-center">
          <Link to="/" className="app-title-link">
            <h1 className="app-title">The Academic Resource Hub</h1>
          </Link>
        </div>

        {/* Right - Theme & Auth */}
        <div className="header-right">
          <button
            className="header-button button-theme"
            onClick={onToggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="theme-icon">{isDark ? "☀️" : "🌙"}</span>
            <span className="theme-text">{isDark ? "Light" : "Dark"}</span>
          </button>

          <button
            className="header-button button-outline"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;