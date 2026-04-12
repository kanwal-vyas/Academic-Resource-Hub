import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/sidebar.css";

const RESOURCES_PATHS = ["/browse", "/my-resources", "/upload"];

function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();

  const { user } = useAuth();
  
  // Auto-expand if we're on any resources path
  const isOnResourcesPath = RESOURCES_PATHS.includes(location.pathname);
  const [resourcesOpen, setResourcesOpen] = useState(isOnResourcesPath);

  const handleSubLinkClick = () => {
    toggleSidebar();
  };

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar} />
      )}

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <nav className="sidebar-nav">

          {/* Home */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
            onClick={toggleSidebar}
          >
            Home
          </NavLink>

          {/* Resources dropdown group */}
          <div className="sidebar-group">
            <button
              className={`sidebar-group-header ${isOnResourcesPath ? "sidebar-group-header--active" : ""}`}
              onClick={() => setResourcesOpen((prev) => !prev)}
              aria-expanded={resourcesOpen}
            >
              <span>Resources</span>
              <span className={`sidebar-chevron ${resourcesOpen ? "sidebar-chevron--open" : ""}`}>
                ‹
              </span>
            </button>

            <div className={`sidebar-dropdown ${resourcesOpen ? "sidebar-dropdown--open" : ""}`}>
              <NavLink
                to="/browse"
                className={({ isActive }) =>
                  `sidebar-link sidebar-sublink ${isActive ? "sidebar-link--active" : ""}`
                }
                onClick={handleSubLinkClick}
              >
                Browse Resources
              </NavLink>

              <NavLink
                to="/my-resources"
                className={({ isActive }) =>
                  `sidebar-link sidebar-sublink ${isActive ? "sidebar-link--active" : ""}`
                }
                onClick={handleSubLinkClick}
              >
                My Resources
              </NavLink>

              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  `sidebar-link sidebar-sublink ${isActive ? "sidebar-link--active" : ""}`
                }
                onClick={handleSubLinkClick}
              >
                Upload Resource
              </NavLink>
            </div>
          </div>

          {/* Faculty Directory */}
          <NavLink
            to="/faculty"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
            onClick={toggleSidebar}
          >
            Faculty Directory
          </NavLink>

          {/* My Profile (Faculty Only) */}
          {user?.role === 'faculty' && (
            <NavLink
              to={`/faculty/${user.id}`}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
              }
              onClick={toggleSidebar}
            >
              My Profile
            </NavLink>
          )}

        </nav>
      </aside>
    </>
  );
}

export default Sidebar;