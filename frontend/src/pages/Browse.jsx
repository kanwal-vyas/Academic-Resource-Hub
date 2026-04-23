import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../utils/api";
import SummaryModal from "../components/SummaryModal";
import { useResourceContext } from "../context/ResourceContext";
import { useToast } from "../context/ToastContext";
import CustomSelect from "../components/CustomSelect";
import "../styles/browse.css";

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

const typeClassMap = {
  lecture_notes: "resource-badge--fgreen",
  question_paper: "resource-badge--purple",
  research_paper: "resource-badge--orange",
  project_material: "resource-badge--yellow",
  other: "resource-badge--grey",
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

const formatContributorType = (type) => {
  return (
    type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
    "Unknown"
  );
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { resources, loading, error, refetch } = useResources(user);
  const { setContextResource, clearContextResource } = useResourceContext();

  const [dbRole, setDbRole] = useState(null);
  const [allFaculties, setAllFaculties] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allUnits, setAllUnits] = useState([]);

  useEffect(() => {
    async function fetchMe() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const me = await res.json();
          setDbRole(me.role);
        }
      } catch (err) {
        console.error("Failed to fetch /me:", err);
      }
    }
    if (user) fetchMe();
  }, [user]);

  const isAdmin = dbRole === "admin";

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        // Fetch Faculties
        const facRes = await fetch(`${API_BASE_URL}/faculty`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (facRes.ok) {
          const result = await facRes.json();
          setAllFaculties(result.data || []);
        }

        // Fetch Courses
        const courseRes = await fetch(`${API_BASE_URL}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (courseRes.ok) {
          const result = await courseRes.json();
          setAllCourses(result.data || []);
        }

        // Fetch All Subjects (Taxonomy)
        const subRes = await fetch(`${API_BASE_URL}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subRes.ok) {
          const result = await subRes.json();
          setAllSubjects(result.data || []);
        }

        // Fetch All Units (Taxonomy)
        const unitRes = await fetch(`${API_BASE_URL}/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (unitRes.ok) {
          const result = await unitRes.json();
          setAllUnits(result.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch filters data:", err);
      }
    }
    if (user) fetchData();
  }, [user]);

  const handleDelete = async (resourceId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this resource?"
    );
    if (!confirmDelete) return;

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/resources/${resourceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await refetch();
      } else {
        console.error("Delete failed");
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSummarize = async (resourceId) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast("Please log in to use the AI summarizer.", "warning");
        return;
      }

      const res = resources.find(r => r.id === resourceId);
      setActiveSummary({ title: res?.title || "Resource", summary: null });

      const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/summarize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          showToast("Your session has expired. Please log in again.", "error");
          throw new Error("Session expired");
        }
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate summary");
      }

      const result = await response.json();
      const newSummary = result.summary;

      await refetch();
      setContextResource(res); 

      setActiveSummary({
        title: res?.title || "Resource Snapshot",
        summary: newSummary
      });
      showToast("AI Snapshot generated successfully!", "success");
    } catch (err) {
      console.error("Summarization failed:", err);
      setActiveSummary(null);
      if (err.message !== "Session expired") {
        showToast(err.message, "error");
      }
    }
  };

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [activeSummary, setActiveSummary] = useState(null); // { title: string, summary: string }

  // Combine all available courses with any mentioned in resources
  const courses = Array.from(
    new Set([
      ...allCourses.map(c => c.name),
      ...resources.map((r) => r.course_name)
    ].filter(Boolean))
  ).sort();

  // Derive unique subjects from taxonomy and resources
  const subjects = Array.from(
    new Set([
      ...allSubjects
        .filter(s => !selectedCourse || s.course_name === selectedCourse)
        .map(s => s.name),
      ...resources
        .filter(r => !selectedCourse || r.course_name === selectedCourse)
        .map(r => r.subject_name)
    ].filter(Boolean))
  ).sort();

  // Derive units for selected subject from taxonomy and resources
  const unitsForCourse = !selectedSubject ? [] : Array.from(
    new Map(
      [
        ...allUnits
          .filter(u => u.subject_name === selectedSubject)
          .map(u => [u.unit_number, { unit_number: u.unit_number, unit_title: "" }]),
        ...resources
          .filter(r => r.unit_number && r.subject_name === selectedSubject)
          .map(r => [r.unit_number, { unit_number: r.unit_number, unit_title: r.unit_title }])
      ]
    ).values()
  ).sort((a, b) => a.unit_number - b.unit_number);

  // Derive unique academic years
  const academicYears = Array.from(
    new Set(resources.map((r) => r.start_year).filter(Boolean))
  ).sort((a, b) => b - a);

  // Derive unique resource types
  const resourceTypes = Array.from(
    new Set(resources.map((r) => r.resource_type).filter(Boolean))
  );

  // Derive unique faculty from resources (as fallback/active list)
  const activeFacultiesFromResources = Array.from(
    new Set(resources.map((r) => r.faculty_name).filter(Boolean))
  ).sort();

  // Combine with full list from DB to ensure everyone shows up
  const faculties = Array.from(
    new Set([
      ...allFaculties.map(f => f.full_name),
      ...activeFacultiesFromResources
    ])
  ).sort();

  // Helper to format options for CustomSelect
  const formatOptions = (list, allLabel) => [
    { value: "", label: allLabel },
    ...list.map(item => ({ value: item, label: item }))
  ];

  // Filter resources
  const filteredResources = resources
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.course_name && r.course_name.toLowerCase().includes(q)) ||
        (r.subject_name && r.subject_name.toLowerCase().includes(q)) ||
        (r.faculty_name && r.faculty_name.toLowerCase().includes(q)) ||
        (r.resource_type && r.resource_type.toLowerCase().replace(/_/g, ' ').includes(q))
      );
    })
    .filter(
      (r) =>
        selectedCourse === "" ||
        r.course_name?.toLowerCase().trim() ===
        selectedCourse.toLowerCase().trim()
    )
    .filter(
      (r) =>
        selectedUnit === "" || String(r.unit_number) === String(selectedUnit)
    )
    .filter((r) => !selectedSubject || r.subject_name === selectedSubject)
    .filter((r) => !selectedFaculty || r.faculty_name === selectedFaculty)
    .filter((r) => typeFilter === "all" || r.resource_type === typeFilter)
    .filter(
      (r) =>
        yearFilter === "all" || String(r.start_year) === String(yearFilter)
    );

  const handleViewResource = async (resource) => {
    setSelectedResourceId(resource.id);
    setContextResource(resource); // Set context for chatbot

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

  const handleCourseChange = (course) => {
    setSelectedCourse(course);
    setSelectedSubject("");
    setSelectedUnit("");
    setSelectedFaculty("");
    setTypeFilter("all");
    setYearFilter("all");
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    setSelectedUnit("");
    setSelectedFaculty("");
    setTypeFilter("all");
    setYearFilter("all");
  };

  const handleUnitChange = (unit) => {
    setSelectedUnit(unit);
    setSelectedFaculty("");
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 className="filters-title" style={{ margin: 0 }}>Filter Resources</h2>

              <div className="search-bar-container">
                <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by title, subject, or faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-grid">
              {/* Course Filter */}
              <FilterGroup label="Course">
                <CustomSelect
                  options={formatOptions(courses, "All Courses")}
                  value={selectedCourse}
                  onChange={handleCourseChange}
                  placeholder="All Courses"
                />
              </FilterGroup>

              {/* Subject Filter */}
              <FilterGroup label="Subject">
                <CustomSelect
                  options={formatOptions(subjects, "All Subjects")}
                  value={selectedSubject}
                  onChange={handleSubjectChange}
                  placeholder="All Subjects"
                />
              </FilterGroup>

              {/* Unit Filter */}
              <FilterGroup label="Syllabus Unit">
                <CustomSelect
                  options={[
                    { value: "", label: selectedSubject ? "All Units" : "Select a subject first" },
                    ...unitsForCourse.map((u) => ({
                      value: u.unit_number,
                      label: `Unit ${u.unit_number}${u.unit_title ? ': ' + u.unit_title : ''}`,
                    })),
                  ]}
                  value={selectedUnit}
                  onChange={handleUnitChange}
                  placeholder={selectedSubject ? "All Units" : "Select a subject first"}
                  disabled={!selectedSubject}
                />
              </FilterGroup>

              {/* Faculty Filter */}
              <FilterGroup label="Faculty">
                <CustomSelect
                  options={formatOptions(faculties, "All Faculty")}
                  value={selectedFaculty}
                  onChange={setSelectedFaculty}
                  placeholder="All Faculty"
                />
              </FilterGroup>

              {/* Resource Type Filter */}
              <FilterGroup label="Resource Type">
                <CustomSelect
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "lecture_notes", label: "Lecture Notes" },
                    { value: "question_paper", label: "Question Paper" },
                    { value: "research_paper", label: "Research Paper" },
                    { value: "project_material", label: "Project Material" },
                    { value: "other", label: "Other" },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  placeholder="All Types"
                />
              </FilterGroup>

              {/* Year Filter */}
              <FilterGroup label="Academic Year">
                <CustomSelect
                  options={[
                    { value: "all", label: "All Years" },
                    ...academicYears.map((year) => ({
                      value: String(year),
                      label: `AY ${year}`,
                    })),
                  ]}
                  value={String(yearFilter)}
                  onChange={setYearFilter}
                  placeholder="All Years"
                />
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
            {(selectedCourse ||
              selectedSubject ||
              selectedFaculty ||
              typeFilter !== "all" ||
              yearFilter !== "all") && (
                <button
                  className="clear-filters-button"
                  onClick={() => {
                    setSelectedCourse("");
                    setSelectedUnit("");
                    setSelectedSubject("");
                    setSelectedFaculty("");
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
              {filteredResources.map((resource) => {
                return (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    isSelected={selectedResourceId === resource.id}
                    onView={handleViewResource}
                    canModify={isAdmin}
                    onEdit={() => navigate(`/edit-resource/${resource.id}`)}
                    onDelete={() => handleDelete(resource.id)}
                    onSummarize={() => handleSummarize(resource.id)}
                    onViewSummary={(summary) => setActiveSummary({
                      title: resource.title,
                      summary: summary
                    })}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Global Floating Summary Board */}
        <SummaryModal 
          isOpen={!!activeSummary}
          onClose={() => {
            setActiveSummary(null);
            clearContextResource();
          }}
          title={activeSummary?.title}
          summary={activeSummary?.summary}
        />
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
function ResourceCard({
  resource,
  isSelected,
  onView,
  canModify,
  onEdit,
  onDelete,
  onSummarize,
  onViewSummary,
}) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const aiSummary = resource.ai_summary;

  const handleSummarizeClick = async (e) => {
    e.stopPropagation();
    setIsSummarizing(true);
    await onSummarize();
    setIsSummarizing(false);
  };
  const resourceType = getResourceTypeDisplay(resource.resource_type);
  const contributorTypeFormatted = formatContributorType(
    resource.contributor_type
  );
  const badgeClass = typeClassMap[resource.resource_type] || "";
  const contentTypeClass =
    resource.content_type === "external_link"
      ? "resource-badge--link"
      : "resource-badge--file";
  const contentTypeLabel =
    resource.content_type === "external_link" ? "External Link" : "File";

  return (
    <article className={`card resource-card ${isSelected ? "selected" : ""} ${badgeClass ? `stripe-${resource.resource_type}` : ''}`}>
      <div className="resource-stripe"></div>

      <header className="resource-header">
        <div className="resource-title-group">
          <h3 className="resource-title">{resource.title}</h3>
          <div className="resource-chips">
            {badgeClass ? (
              <span className={`resource-badge ${badgeClass}`}>
                {resourceType.label}
              </span>
            ) : (
              <span className={`chip ${resourceType.className}`}>
                {resourceType.label}
              </span>
            )}
            <span className={`resource-badge ${contentTypeClass}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                {resource.content_type === "external_link" ? (
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                ) : (
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7" />
                )}
              </svg>
              {contentTypeLabel}
            </span>
          </div>
        </div>

        {resource.is_verified === false && (
          <span
            className="resource-badge resource-badge--unverified"
            title="Pending admin verification"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
            </svg>
            Unverified
          </span>
        )}
      </header>

      <p className="resource-description">
        {resource.description || "No description provided."}
      </p>

      {/* AI Summary Section */}
      {resource.content_type === "file" && resource.storage_path?.toLowerCase().endsWith(".pdf") && (
        <div className="ai-summary-section">
          <div className="ai-summary-header">
            <h4 className="ai-summary-title">
              <svg className="ai-sparkle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.9 1.38H21l-4.75 3.447a2 2 0 00-.727 2.233L17.435 21 12 17.056 6.565 21l1.912-5.127a2 2 0 00-.727-2.233L3 10.193h5.188a2 2 0 001.9-1.38L12 3z" />
              </svg>
              Quick AI Snapshot
            </h4>
            
            <div className="ai-summary-actions">
              {!aiSummary && (
                <button 
                  className="summarize-button" 
                  onClick={handleSummarizeClick}
                  disabled={isSummarizing}
                >
                  {isSummarizing ? (
                    <span className="ai-loading-text">
                      <span className="pulse-dot"></span>
                      Analyzing...
                    </span>
                  ) : (
                    "Summarize"
                  )}
                </button>
              )}

              {aiSummary && (
                <button 
                  className="summarize-button" 
                  onClick={(e) => { e.stopPropagation(); onViewSummary(aiSummary); }}
                >
                  View Snapshot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="resource-metadata-grid">
        <div className="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v14.5" />
          </svg>
          <span>{resource.subject_name}</span>
        </div>
        {resource.faculty_name && (
          <div className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <span>{resource.faculty_name}</span>
          </div>
        )}
        <div className="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>AY {resource.start_year}</span>
        </div>
        {resource.unit_number && (
          <div className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Unit {resource.unit_number}</span>
          </div>
        )}
      </div>

      <footer className="resource-footer">
        <div className="contributor-info">
          <span className="contributor-label">{contributorTypeFormatted}</span>
          {resource.contributor_is_verified ? (
            <span className="verified-badge" title="Verified Contributor">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified
            </span>
          ) : (
            <span className="unverified-badge">Partially Verified</span>
          )}
        </div>

        <div className="resource-actions">
          <button
            className={`resource-action-primary ${isSelected ? "selected" : ""}`}
            onClick={() => onView(resource)}
            aria-label={`View ${resource.title}`}
          >
            {isSelected ? "Opened" : "View Resource"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </button>

          {canModify && (
            <div className="owner-menu">
              <button
                className="owner-action edit"
                onClick={onEdit}
                title="Edit Resource"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
              <button
                className="owner-action delete"
                onClick={onDelete}
                title="Delete Resource"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </footer>
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

export { useResources, ResourceCard, LoadingState, ErrorState, EmptyState };
export default Browse;