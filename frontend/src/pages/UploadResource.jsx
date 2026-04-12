import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../utils/api";
import "../styles/upload.css";

// ─── API Layer ────────────────────────────────────────────────────────────────

async function getAuthToken() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Authentication required");
  return token;
}

async function apiFetch(path, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${path}`);
  const json = await response.json();
  return json.data ?? json;
}

async function fetchCourses(token) {
  return apiFetch("/courses", token);
}

async function fetchSubjects(courseId, token) {
  return apiFetch(`/subjects?course_id=${courseId}`, token);
}

async function fetchAcademicYears(token) {
  return apiFetch("/academic-years", token);
}

async function fetchUnits(subjectId, academicYearId, token) {
  return apiFetch(`/units?subject_id=${subjectId}&academic_year_id=${academicYearId}`, token);
}

async function fetchResourceById(id, token) {
  return apiFetch(`/resources/${id}`, token);
}

async function submitLinkResource(payload, token) {
  const response = await fetch(`${API_BASE_URL}/resources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.log("BACKEND ERROR:", errorData);
    throw new Error(errorData.error || "Upload failed");
  }
}

async function updateLinkResource(id, payload, token) {
  const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Update failed");
  }
}

async function submitFileResource(formData, token) {
  const response = await fetch(`${API_BASE_URL}/resources/file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Upload failed");
  }
}

async function updateFileResource(id, formData, token) {
  const response = await fetch(`${API_BASE_URL}/resources/file/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Update failed");
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm({ title, course, subject, academicYear, resourceType, visibility, contentType, externalLink, file, isEditMode }) {
  if (!title.trim())     return "Title is required";
  if (!course)           return "Please select a course";
  if (!subject)          return "Please select a subject";
  if (!academicYear)     return "Please select an academic year";
  if (!resourceType)     return "Please select a resource type";
  if (!visibility)       return "Please select visibility";
  if (contentType === "link" && !externalLink.trim()) return "External link is required";
  // In edit mode, file is optional (keep existing file if none selected)
  if (contentType === "file" && !file && !isEditMode) return "Please select a PDF file";
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

function UploadResource() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Form meta
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [loadingResource, setLoadingResource] = useState(isEditMode);

  // Resource info
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [resourceType, setResourceType] = useState("");
  const [visibility, setVisibility]     = useState("");

  // Classification
  const [course, setCourse]             = useState("");
  const [subject, setSubject]           = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [unit, setUnit]                 = useState("");

  // Dropdown options
  const [courses, setCourses]             = useState([]);
  const [subjects, setSubjects]           = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [units, setUnits]                 = useState([]);

  // Content
  const [contentType, setContentType]   = useState("file");
  const [file, setFile]                 = useState(null);
  const [externalLink, setExternalLink] = useState("");

  // ─── Derived ───────────────────────────────────────────────────────────────

  const selectedSubject      = subjects.find((s) => String(s.id) === String(subject));
  const selectedAcademicYear = academicYears.find((y) => String(y.id) === String(academicYear));

  const canSelectSubject = Boolean(course);
  const canSelectUnit    = Boolean(subject) && Boolean(academicYear);

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Initial load: courses + academic years
  useEffect(() => {
    async function loadInitial() {
      try {
        const token = await getAuthToken();
        const [courseData, yearData] = await Promise.all([
          fetchCourses(token),
          fetchAcademicYears(token),
        ]);
        setCourses(courseData);
        setAcademicYears(yearData);
      } catch (err) {
        setError("Failed to load initial data");
      }
    }
    loadInitial();
  }, []);

  // Prefill form when editing — runs after courses/years are loaded
  useEffect(() => {
    if (!isEditMode) return;
    if (courses.length === 0 || academicYears.length === 0) return;

    async function loadResource() {
      try {
        const token = await getAuthToken();
        const resource = await fetchResourceById(id, token);

        setTitle(resource.title || "");
        setDescription(resource.description || "");
        setResourceType(resource.resource_type || "");
        setVisibility(resource.visibility || "");

        // content type
        if (resource.content_type === "external_link") {
          setContentType("link");
          setExternalLink(resource.external_url || "");
        } else {
          setContentType("file");
        }

        // Match academic year by start_year + end_year
        const matchedYear = academicYears.find(
          (y) =>
            String(y.start_year) === String(resource.start_year) &&
            String(y.end_year)   === String(resource.end_year)
        );
        if (matchedYear) setAcademicYear(String(matchedYear.id));

        // Load subjects for the matched course, then set subject + unit
        if (resource.course_id) {
          setCourse(String(resource.course_id));
          const subjectData = await fetchSubjects(resource.course_id, token);
          setSubjects(subjectData);

          const matchedSubject = subjectData.find(
            (s) => s.code === resource.subject_code
          );
          if (matchedSubject) {
            setSubject(String(matchedSubject.id));

            if (matchedYear && resource.unit_number) {
              const unitData = await fetchUnits(matchedSubject.id, matchedYear.id, token);
              setUnits(unitData);
              setUnit(String(resource.unit_number));
            }
          }
        }
      } catch (err) {
        setError("Failed to load resource for editing");
      } finally {
        setLoadingResource(false);
      }
    }

    loadResource();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, id, courses.length, academicYears.length]);

  // Subjects depend on course (upload mode only — edit mode handles its own load)
  useEffect(() => {
    if (isEditMode) return;
    if (!course) {
      setSubjects([]);
      setSubject("");
      setUnit("");
      return;
    }
    async function loadSubjects() {
      try {
        const token = await getAuthToken();
        const data = await fetchSubjects(course, token);
        setSubjects(data);
        setSubject("");
        setUnit("");
      } catch (err) {
        setError("Failed to load subjects");
      }
    }
    loadSubjects();
  }, [course, isEditMode]);

  // Units depend on subject + academic year
  useEffect(() => {
    if (!subject || !academicYear) {
      setUnits([]);
      setUnit("");
      return;
    }
    async function loadUnits() {
      try {
        const token = await getAuthToken();
        const data = await fetchUnits(subject, academicYear, token);
        setUnits(data);
        if (!isEditMode) setUnit("");
      } catch (err) {
        setError("Failed to load units");
      }
    }
    loadUnits();
  }, [subject, academicYear, isEditMode]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleCourseChange(e) {
    setCourse(e.target.value);
    setSubjects([]);
    setSubject("");
    setUnit("");
    setError("");
  }

  function handleSubjectChange(e) {
    setSubject(e.target.value);
    setUnit("");
    setError("");
  }

  function handleAcademicYearChange(e) {
    setAcademicYear(e.target.value);
    setUnit("");
    setError("");
  }

  function handleContentTypeChange(value) {
    setContentType(value);
    setFile(null);
    setExternalLink("");
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    setError("");

    const validationError = validateForm({
      title, course, subject, academicYear, resourceType,
      visibility, contentType, externalLink, file, isEditMode,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();

      const subject_code = selectedSubject.code;
      const start_year   = selectedAcademicYear.start_year;
      const end_year     = selectedAcademicYear.end_year;
      const unit_number  = unit || undefined;

      if (contentType === "link") {
        const payload = {
          title: title.trim(),
          description: description.trim() || "No description provided",
          subject_code,
          start_year,
          end_year,
          unit_number,
          external_url: externalLink.trim(),
          resource_type: resourceType,
          visibility,
        };
        if (isEditMode) {
          await updateLinkResource(id, payload, token);
        } else {
          await submitLinkResource(payload, token);
        }
      } else {
        const formData = new FormData();
        if (file) formData.append("file", file);
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("subject_code", subject_code);
        formData.append("start_year", start_year);
        formData.append("end_year", end_year);
        formData.append("resource_type", resourceType);
        formData.append("visibility", visibility);
        if (unit_number) formData.append("unit_number", unit_number);

        if (isEditMode) {
          await updateFileResource(id, formData, token);
        } else {
          await submitFileResource(formData, token);
        }
      }

      navigate(isEditMode ? "/my-resources" : "/browse");
    } catch (err) {
      setError(err.message || (isEditMode ? "Update failed. Please try again." : "Upload failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── JSX ───────────────────────────────────────────────────────────────────

  if (loadingResource) {
    return (
      <div className="upload-page">
        <div className="upload-card">
          <p style={{ padding: "2rem", textAlign: "center" }}>Loading resource…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <div style={{ padding: '0 0 1rem 0' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.2sease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#fff'}
            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        </div>
        <header className="page-header-upload">
          <h1 className="page-title">
            {isEditMode ? "Edit Resource" : "Upload Resource"}
          </h1>
          <p className="page-subtitle">
            {isEditMode
              ? "Update the details of your resource"
              : "Contribute to the institutional knowledge repository"}
          </p>
        </header>

        <form className="upload-form" onSubmit={handleSubmit}>

          {/* ── Section: Resource Information ── */}
          <section className="form-section">
            <h2 className="section-title">Resource Information</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="title">Title *</label>
              <input
                id="title"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter resource title"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="form-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the resource (optional)"
                disabled={submitting}
              />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Section: Classification ── */}
          <section className="form-section">
            <h2 className="section-title">Classification</h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="course">Course *</label>
                <select
                  id="course"
                  className="form-select"
                  value={course}
                  onChange={handleCourseChange}
                  disabled={submitting}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subject">Subject *</label>
                <select
                  id="subject"
                  className="form-select"
                  value={subject}
                  onChange={handleSubjectChange}
                  disabled={submitting || !canSelectSubject}
                >
                  <option value="">
                    {canSelectSubject ? "Select subject" : "Select a course first"}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="academic-year">Academic Year *</label>
                <select
                  id="academic-year"
                  className="form-select"
                  value={academicYear}
                  onChange={handleAcademicYearChange}
                  disabled={submitting}
                >
                  <option value="">Select year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.start_year} – {y.end_year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="unit">Unit (optional)</label>
                <select
                  id="unit"
                  className="form-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={submitting || !canSelectUnit}
                >
                  <option value="">
                    {canSelectUnit ? "Select unit (optional)" : "Select subject & year first"}
                  </option>
                  {units.map((u) => (
                    <option key={u.id} value={u.unit_number}>Unit {u.unit_number}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="resource-type">Resource Type *</label>
                <select
                  id="resource-type"
                  className="form-select"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select type</option>
                  <option value="lecture_notes">Lecture Notes</option>
                  <option value="question_paper">Question Paper</option>
                  <option value="research_paper">Research Paper</option>
                  <option value="project_material">Project Material</option>
                </select>
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Section: Content Source ── */}
          <section className="form-section">
            <h2 className="section-title">Content Source</h2>

            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  className="radio-input"
                  checked={contentType === "file"}
                  onChange={() => handleContentTypeChange("file")}
                  disabled={submitting}
                />
                <span>File Upload (PDF)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  className="radio-input"
                  checked={contentType === "link"}
                  onChange={() => handleContentTypeChange("link")}
                  disabled={submitting}
                />
                <span>External Link</span>
              </label>
            </div>

            {contentType === "file" && (
              <div className="form-group">
                <label className="form-label" htmlFor="file-upload">
                  {isEditMode ? "Replace PDF File (optional)" : "Upload PDF File *"}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="form-file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  disabled={submitting}
                />
                {file && <p className="file-hint">Selected: {file.name}</p>}
                {isEditMode && !file && (
                  <p className="file-hint">No file selected — existing file will be kept.</p>
                )}
              </div>
            )}

            {contentType === "link" && (
              <div className="form-group">
                <label className="form-label" htmlFor="external-link">External Link *</label>
                <input
                  id="external-link"
                  className="form-input"
                  type="url"
                  placeholder="https://example.com/resource"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}
          </section>

          <div className="section-divider" />

          {/* ── Section: Visibility ── */}
          <section className="form-section">
            <h2 className="section-title">Visibility</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="visibility">Who can access this resource? *</label>
              <select
                id="visibility"
                className="form-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select visibility</option>
                <option value="public">Public – Everyone</option>
                <option value="private">Private – Verified users only</option>
                <option value="faculty">Faculty only</option>
              </select>
            </div>
          </section>

          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="form-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={() => navigate(isEditMode ? "/my-resources" : "/")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><span className="spinner" /><span>{isEditMode ? "Updating…" : "Uploading…"}</span></>
              ) : (
                isEditMode ? "Update Resource" : "Upload Resource"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default UploadResource;