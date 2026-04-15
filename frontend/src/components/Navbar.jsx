import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import NotificationBell from "./NotificationBell";
import "../styles/navbar.css";

function Navbar({ isDark, onToggleTheme, toggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-container">
        <nav className="header-left">
          <button
            className="header-button button-secondary button-icon"
            onClick={toggleSidebar}
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

        <div className="header-center">
          <Link to="/" className="app-title-link">
            <h1 className="app-title">The Academic Resource Hub</h1>
          </Link>
        </div>

        <div className="header-right">
          <NotificationBell />

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
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;