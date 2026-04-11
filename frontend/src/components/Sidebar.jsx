import { NavLink } from "react-router-dom";
import "../styles/sidebar.css";

function Sidebar({ isOpen, toggleSidebar }) {
  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar} />
      )}

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
            onClick={toggleSidebar}
          >
            Home
          </NavLink>

          <NavLink
            to="/browse"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
            onClick={toggleSidebar}
          >
            Browse Resources
          </NavLink>

          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
            onClick={toggleSidebar}
          >
            Upload Resource
          </NavLink>

          <NavLink
  to="/my-resources"
  className={({ isActive }) =>
    `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
  }
  onClick={toggleSidebar}
>
  My Resources
</NavLink>

          <NavLink
            to="/faculty"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
            onClick={toggleSidebar}
          >
            Faculty Directory
          </NavLink>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;