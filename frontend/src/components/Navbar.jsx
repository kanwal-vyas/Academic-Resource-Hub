import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/navbar.css";

function Navbar({ isDark, onToggleTheme }) {
  const { user, logout } = useAuth();

  const canUpload = !!user;

    console.log("USER:", user);
    console.log("CAN UPLOAD:", canUpload);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Left - Navigation */}
        <nav className="header-left">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `header-button button-secondary ${isActive ? "active" : ""}`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/browse"
            className={({ isActive }) =>
              `header-button button-secondary ${isActive ? "active" : ""}`
            }
          >
            Browse
          </NavLink>

          {canUpload && (
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                `header-button button-primary ${isActive ? "active" : ""}`
              }
            >
              + Add Resource
            </NavLink>
          )}
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