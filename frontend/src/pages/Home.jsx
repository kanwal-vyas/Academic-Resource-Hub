import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import "../styles/home.css";

// ===============================
// Constants
// ===============================
const API_BASE_URL = "http://localhost:5000";

const FACULTY_DATA = [
  {
    id: 1,
    initials: "DS",
    name: "Dr. Priya Sharma",
    designation: "Associate Professor",
    expertise: ["Data Structures", "Algorithms", "Machine Learning"],
    phdTopic: "Optimization Algorithms for Large-Scale Networks",
    researchInterests: "Graph Theory, Computational Complexity",
  },
  {
    id: 2,
    initials: "AM",
    name: "Prof. Arjun Mehta",
    designation: "Professor",
    expertise: ["DBMS", "Big Data", "Cloud Computing"],
    phdTopic: "Distributed Database Systems in Cloud Environments",
    researchInterests: "NoSQL, Query Optimization",
  },
];

// ===============================
// Utility Functions
// ===============================
const formatResourceType = (type) => {
  return (
    type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
    "Unknown"
  );
};

// ===============================
// Custom Hook
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

// ===============================
// Main Component
// ===============================
function Home() {
  const { user } = useAuth();
  const { resources, loading, error } = useLatestResources(user);
  const [selectedResourceId, setSelectedResourceId] = useState(null);

  const handleViewResource = async (resource) => {
    setSelectedResourceId(resource.id);

    try {
      if (resource.content_type === "link") {
        const url = formatUrl(resource.external_link);
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
      console.error("Error viewing resource:", err);
      alert("Unable to open resource. Please try again.");
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
          )}
        </section>

        <Divider />

        {/* Faculty Section */}
        <FacultySection />
      </div>
    </main>
  );
}

// ===============================
// Resource Components
// ===============================
function ResourceCard({ resource, isSelected, onView }) {
  const resourceTypeFormatted = formatResourceType(resource.resource_type);

  return (
    <article className="card resource-card">
      <header className="resource-header">
        <h3>{resource.title}</h3>
        <div className="chips">
          <span className="chip chip-type">{resourceTypeFormatted}</span>
          <span className="chip chip-year">{resource.academic_year}</span>
        </div>
      </header>

      <p className="resource-description">
        {resource.description || "No description provided."}
      </p>

      <footer className="resource-meta">
        <span className="meta-item">📘 {resource.subject_name}</span>
        <span className="meta-item">👤 {resource.contributor_role}</span>
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
function FacultySection() {
  return (
    <section className="faculty-section">
      <h2>Faculty Expertise</h2>
      <p className="text-muted">
        Connect with our distinguished faculty members
      </p>
      <div className="faculty-grid">
        {FACULTY_DATA.map((faculty) => (
          <FacultyCard key={faculty.id} faculty={faculty} />
        ))}
      </div>
    </section>
  );
}

function FacultyCard({ faculty }) {
  return (
    <article className="card faculty-card">
      <div
        className="faculty-avatar"
        aria-label={`Avatar for ${faculty.name}`}
      >
        {faculty.initials}
      </div>

      <h3>{faculty.name}</h3>
      <p className="faculty-designation">{faculty.designation}</p>

      <div className="chips">
        {faculty.expertise.map((skill) => (
          <span key={skill} className="chip">
            {skill}
          </span>
        ))}
      </div>

      <div className="faculty-info">
        <p>
          <strong>PhD Topic:</strong> {faculty.phdTopic}
        </p>
        <p>
          <strong>Research Interests:</strong> {faculty.researchInterests}
        </p>
      </div>

      <button
        className="faculty-button"
        aria-label={`View profile for ${faculty.name}`}
      >
        View Profile
      </button>
    </article>
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