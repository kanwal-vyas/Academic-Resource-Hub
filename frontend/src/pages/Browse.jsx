import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import "../styles/browse.css";

// ===============================
// Constants
// ===============================
const API_BASE_URL = "http://localhost:5000";

const RESOURCE_TYPE_CONFIG = {
  question_paper: {
    className: "chip-question",
    label: "Question Paper",
  },
  lecture_notes: {
    className: "chip-notes",
    label: "Lecture Notes",
  },
  research_paper: {
    className: "chip-research",
    label: "Research Paper",
  },
  project_material: {
    className: "chip-notes",
    label: "Project Material",
  },
  notes: {
    className: "chip-notes",
    label: "Notes",
  },
};

// ===============================
// Utility Functions
// ===============================
const getResourceTypeDisplay = (type) => {
  const config = RESOURCE_TYPE_CONFIG[type];
  if (config) return config;

  return {
    className: "chip-notes",
    label:
      type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "Unknown",
  };
};

// ===============================
// Custom Hook
// ===============================
function useResources(user) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user]);

  const fetchResources = async () => {
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
      setResources(result.data || []);
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { resources, loading, error, refetch: fetchResources };
}

// ===============================
// Main Component
// ===============================
function Browse() {
  const { user } = useAuth();
  const { resources, loading, error } = useResources(user);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const [selectedResourceId, setSelectedResourceId] = useState(null);

  // Derive unique courses from resources
  const courses = Array.from(
    new Set(resources.map((r) => r.course_name).filter(Boolean))
  ).sort();

  // Derive units for selected course
  const unitsForCourse = selectedCourse
    ? Array.from(
        new Map(
          resources
            .filter((r) => r.course_name === selectedCourse)
            .filter((r) => r.unit_number && r.unit_title)
            .map((r) => [
              r.unit_id,
              {
                unit_id: r.unit_id,
                unit_number: r.unit_number,
                unit_title: r.unit_title,
              },
            ])
        ).values()
      ).sort((a, b) => a.unit_number - b.unit_number)
    : [];

  // Derive unique academic years
  const academicYears = Array.from(
    new Set(resources.map((r) => r.academic_year).filter(Boolean))
  ).sort((a, b) => b - a);

  // Derive unique resource types
  const resourceTypes = Array.from(
    new Set(resources.map((r) => r.resource_type).filter(Boolean))
  );

  // Filter resources
  const filteredResources = resources
    .filter((r) => !selectedCourse || r.course_name === selectedCourse)
    .filter((r) => !selectedUnit || r.unit_id === selectedUnit)
    .filter((r) => typeFilter === "all" || r.resource_type === typeFilter)
    .filter(
      (r) => yearFilter === "all" || r.academic_year === Number(yearFilter)
    );

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

  const handleCourseChange = (course) => {
    setSelectedCourse(course);
    setSelectedUnit("");
    setTypeFilter("all");
    setYearFilter("all");
  };

  const handleUnitChange = (unit) => {
    setSelectedUnit(unit);
    setTypeFilter("all");
    setYearFilter("all");
  };

  return (
    <main className="browse-page">
      <div className="container">
        <header className="page-header">
          <h1>Browse Resources</h1>
          <p className="page-subtitle">
            Explore academic materials by course, unit, and resource type
          </p>
        </header>

        {/* Filters Section */}
        <section className="filters-section">
          <div className="card filters-card">
            <h2 className="filters-title">Filter Resources</h2>

            <div className="filter-grid">
              {/* Course Filter */}
              <FilterGroup label="Course">
                <select
                  className="filter-select"
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </FilterGroup>

              {/* Unit Filter */}
              <FilterGroup label="Syllabus Unit">
                <select
                  className="filter-select"
                  value={selectedUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  disabled={!selectedCourse}
                >
                  <option value="">All Units</option>
                  {unitsForCourse.map((unit) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      Unit {unit.unit_number}: {unit.unit_title}
                    </option>
                  ))}
                </select>
              </FilterGroup>

              {/* Type Filter */}
              <FilterGroup label="Resource Type">
                <select
                  className="filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {getResourceTypeDisplay(type).label}
                    </option>
                  ))}
                </select>
              </FilterGroup>

              {/* Year Filter */}
              <FilterGroup label="Academic Year">
                <select
                  className="filter-select"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="all">All Years</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </FilterGroup>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="results-section">
          <div className="results-header">
            <h2>
              {filteredResources.length}{" "}
              {filteredResources.length === 1 ? "Resource" : "Resources"} Found
            </h2>
            {(selectedCourse || typeFilter !== "all" || yearFilter !== "all") && (
              <button
                className="clear-filters-button"
                onClick={() => {
                  setSelectedCourse("");
                  setSelectedUnit("");
                  setTypeFilter("all");
                  setYearFilter("all");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}

          {!loading && !error && filteredResources.length === 0 && (
            <EmptyState hasFilters={selectedCourse || typeFilter !== "all"} />
          )}

          {!loading && !error && filteredResources.length > 0 && (
            <div className="resource-grid">
              {filteredResources.map((resource) => (
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
      </div>
    </main>
  );
}

// ===============================
// Filter Components
// ===============================
function FilterGroup({ label, children }) {
  return (
    <div className="filter-group">
      <label className="filter-label">{label}</label>
      {children}
    </div>
  );
}

// ===============================
// Resource Card
// ===============================
function ResourceCard({ resource, isSelected, onView }) {
  const resourceType = getResourceTypeDisplay(resource.resource_type);

  return (
    <article className={`card resource-card ${isSelected ? "selected" : ""}`}>
      <header className="resource-header">
        <h3>{resource.title}</h3>
        <div className="chips">
          <span className={`chip ${resourceType.className}`}>
            {resourceType.label}
          </span>
          <span className="chip chip-year">{resource.academic_year}</span>
        </div>
      </header>

      <p className="resource-description">
        {resource.description || "No description provided."}
      </p>

      <footer className="resource-meta">
        <span className="meta-item">📘 {resource.subject_name}</span>
        {resource.unit_number && (
          <span className="meta-item">📑 Unit {resource.unit_number}</span>
        )}
        <span className="meta-item">👤 {resource.contributor_role}</span>
      </footer>

      <button
        className="resource-action"
        onClick={() => onView(resource)}
        aria-label={`View ${resource.title}`}
      >
        {isSelected ? "Opened ✓" : "View Resource"}
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
      <div className="spinner-large"></div>
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

function EmptyState({ hasFilters }) {
  return (
    <div className="state-message empty-state">
      <div className="empty-icon">📚</div>
      <h3>No resources found</h3>
      <p>
        {hasFilters
          ? "Try adjusting your filters to see more results"
          : "No resources are available at the moment"}
      </p>
    </div>
  );
}

export default Browse;