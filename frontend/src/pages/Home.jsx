import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import FacultyCard from "../components/FacultyCard";
import { useToast } from "../context/ToastContext";
import { API_BASE_URL } from "../utils/api";
import "../styles/home.css";

// ===============================
// Utility Functions
// ===============================
const formatResourceType = (type) => {
  return (
    type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
    "Unknown"
  );
};

const formatContributorType = (type) => {
  return (
    type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
    "Unknown"
  );
};

// ===============================
// Custom Hooks
// ===============================
function useLatestResources(user) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      fetchLatestResources();
    }
  }, [user]);

  const fetchLatestResources = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/resources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Get latest 3 resources sorted by created_at DESC
      const latest = result.data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);

      setResources(latest);
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { resources, loading, error };
}

function useLatestFaculty(user) {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchLatestFaculty();
    }
  }, [user]);

  const fetchLatestFaculty = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/faculty/recent`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseJson = await response.json();
      setFaculty(responseJson.data || []);
    } catch (err) {
      console.error("Error fetching faculty:", err);
      setError("Failed to load faculty");
    } finally {
      setLoading(false);
    }
  };

  return { faculty, loading, error };
}

// ===============================
// Main Component
// ===============================
function Home() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { resources, loading, error } = useLatestResources(user);
  const { faculty, loading: facultyLoading, error: facultyError } = useLatestFaculty(user);
  const [selectedResourceId, setSelectedResourceId] = useState(null);

  const handleViewResource = async (resource) => {
    setSelectedResourceId(resource.id);

    try {
      if (resource.content_type === "external_link") {
        const url = formatUrl(resource.external_url);
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const response = await fetch(
          `${API_BASE_URL}/resources/signed-url/${resource.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch signed URL");
        }

        const data = await response.json();
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("View failed", err);
      showToast("Unable to open resource. Please try again.", "error");
    }
  };

  const formatUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  };

  return (
    <main className="home-page">
      <div className="container">
        {/* Latest Resources Section */}
        <section className="resources-section">
          <h2>Latest Resources</h2>
          <p className="text-muted">
            Recently added academic materials from our community
          </p>

          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}

          {!loading && !error && resources.length === 0 && <EmptyState />}

          {!loading && !error && resources.length > 0 && (
            <>
              <div className="resource-list">
                {resources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    isSelected={selectedResourceId === resource.id}
                    onView={handleViewResource}
                  />
                ))}
              </div>
              <div className="view-all-container">
                <Link to="/browse" className="view-all-button">
                  View All Resources
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </>
          )}
        </section>

        <Divider />

        {/* Faculty Section */}
        <FacultySection faculty={faculty} loading={facultyLoading} error={facultyError} />
      </div>
    </main>
  );
}

// ===============================
// Resource Components
// ===============================
const typeClassMap = {
  lecture_notes: "resource-badge--fgreen",
  question_paper: "resource-badge--purple",
  research_paper: "resource-badge--orange",
  project_material: "resource-badge--yellow",
  other: "resource-badge--grey",
};

function ResourceCard({ resource, isSelected, onView }) {
  const resourceTypeFormatted = formatResourceType(resource.resource_type);
  const contributorTypeFormatted = formatContributorType(resource.contributor_type);
  const badgeClass = typeClassMap[resource.resource_type] || "";
  const contentTypeClass = resource.content_type === "external_link"
    ? "resource-badge--link"
    : "resource-badge--file";
  const contentTypeLabel = resource.content_type === "external_link"
    ? "External Link"
    : "File";

  return (
    <article className="card resource-card">
      <header className="resource-header">
        <h3>{resource.title}</h3>
        <div className="chips">
          {badgeClass ? (
            <span className={`resource-badge ${badgeClass}`}>
              {resourceTypeFormatted}
            </span>
          ) : (
            <span className="chip chip-type">{resourceTypeFormatted}</span>
          )}
          <span className={`resource-badge ${contentTypeClass}`}>
            {contentTypeLabel}
          </span>
          <span className="chip chip-year">{resource.academic_year}</span>
        </div>
      </header>

      <p className="resource-description">
        {resource.description || "No description provided."}
      </p>

      <footer className="resource-meta">
        <div className="meta-left">
          <span className="meta-item">📘 {resource.subject_name}</span>
          {resource.faculty_name && (
            <span className="meta-item">🎓 Taught by {resource.faculty_name}</span>
          )}
        </div>
        <div className="meta-right">
          <span className="meta-item">{contributorTypeFormatted}</span>
          {resource.contributor_is_verified ? (
            <span className="verified-badge" title="Verified Contributor">✔ Verified</span>
          ) : (
            <span className="unverified-badge" title="Unverified Contributor">Unverified</span>
          )}
        </div>
      </footer>

      <button
        className={`resource-button ${isSelected ? "selected" : ""}`}
        onClick={() => onView(resource)}
        aria-label={`View ${resource.title}`}
      >
        {isSelected ? "Opened ✓" : "View Resource"}
      </button>
    </article>
  );
}

// ===============================
// Faculty Components
// ===============================
function FacultySection({ faculty, loading, error }) {
  return (
    <section className="faculty-section">
      <h2>Faculty Expertise</h2>
      <p className="text-muted">
        Connect with our distinguished faculty members
      </p>

      {loading && <p>Loading...</p>}
      {error && <p>Failed to load faculty</p>}

      {!loading && !error && (
        <div className="faculty-grid">
          {faculty.map((f) => (
            <FacultyCard key={f.id} faculty={f} />
          ))}
        </div>
      )}
    </section>
  );
}

// ===============================
// UI State Components
// ===============================
function LoadingState() {
  return (
    <div className="state-message">
      <p>Loading resources...</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="state-message error-message">
      <p>⚠️ {message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="state-message">
      <p>No resources available yet. Check back soon!</p>
    </div>
  );
}

function Divider() {
  return <div className="divider" aria-hidden="true" />;
}

export default Home;