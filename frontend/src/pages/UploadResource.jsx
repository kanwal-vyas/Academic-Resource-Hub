import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/upload.css";

const API_BASE_URL = "http://localhost:5000";

function UploadResource() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [resourceType, setResourceType] = useState("");
  const [visibility, setVisibility] = useState("");

  const [contentType, setContentType] = useState("file");
  const [file, setFile] = useState(null);
  const [externalLink, setExternalLink] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (course) {
      fetchSubjects(course);
    } else {
      setSubjects([]);
      setSubject("");
    }
  }, [course]);

  const fetchCourses = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load courses");
      }

      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses");
    }
  };

  const fetchSubjects = async (courseId) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/subjects?course_id=${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load subjects");
      }

      const data = await response.json();
      setSubjects(data);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setError("Failed to load subjects");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!course) {
      setError("Please select a course");
      return;
    }

    if (!subject) {
      setError("Please select a subject");
      return;
    }

    if (!semester) {
      setError("Please select a semester");
      return;
    }

    if (!academicYear) {
      setError("Please select an academic year");
      return;
    }

    if (!resourceType) {
      setError("Please select a resource type");
      return;
    }

    if (!visibility) {
      setError("Please select visibility scope");
      return;
    }

    if (contentType === "link" && !externalLink.trim()) {
      setError("External link is required");
      return;
    }

    if (contentType === "file" && !file) {
      setError("Please select a PDF file");
      return;
    }

    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      if (contentType === "link") {
        // Submit link resource
        const payload = {
          title: title.trim(),
          description: description.trim(),
          resource_type: resourceType,
          academic_year: Number(academicYear),
          semester: Number(semester),
          course_id: Number(course),
          subject_id: Number(subject),
          contributor_id: 1,
          visibility_scope: visibility,
          external_url: externalLink.trim(),
        };

        const res = await fetch(`${API_BASE_URL}/resources`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Upload failed");
        }
      } else {
        // Submit file resource
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("resource_type", resourceType);
        formData.append("academic_year", academicYear);
        formData.append("semester", semester);
        formData.append("course_id", course);
        formData.append("subject_id", subject);
        formData.append("contributor_id", 1);
        formData.append("visibility_scope", visibility);

        const res = await fetch(`${API_BASE_URL}/resources/file`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Upload failed");
        }
      }

      // Success - navigate to browse page
      navigate("/browse");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <header className="page-header-upload">
          <h1 className="page-title">Upload Resource</h1>
          <p className="page-subtitle">
            Contribute to the institutional knowledge repository
          </p>
        </header>

        <form className="upload-form" onSubmit={handleSubmit}>
          {/* Resource Metadata */}
          <section className="form-section">
            <h2 className="section-title">Resource Information</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="title">
                Title *
              </label>
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
              <label className="form-label" htmlFor="description">
                Description
              </label>
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

          {/* Classification */}
          <section className="form-section">
            <h2 className="section-title">Classification</h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="resource-type">
                  Resource Type *
                </label>
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

              <div className="form-group">
                <label className="form-label" htmlFor="academic-year">
                  Academic Year *
                </label>
                <select
                  id="academic-year"
                  className="form-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select year</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="semester">
                  Semester *
                </label>
                <select
                  id="semester"
                  className="form-select"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select semester</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="course">
                  Course *
                </label>
                <select
                  id="course"
                  className="form-select"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="subject">
                  Subject *
                </label>
                <select
                  id="subject"
                  className="form-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting || !course}
                >
                  <option value="">
                    {course ? "Select subject" : "Select a course first"}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* Content Source */}
          <section className="form-section">
            <h2 className="section-title">Content Source</h2>

            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  className="radio-input"
                  checked={contentType === "file"}
                  onChange={() => setContentType("file")}
                  disabled={submitting}
                />
                <span>File Upload (PDF)</span>
              </label>

              <label className="radio-label">
                <input
                  type="radio"
                  className="radio-input"
                  checked={contentType === "link"}
                  onChange={() => setContentType("link")}
                  disabled={submitting}
                />
                <span>External Link</span>
              </label>
            </div>

            {contentType === "file" && (
              <div className="form-group">
                <label className="form-label" htmlFor="file-upload">
                  Upload PDF File *
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="form-file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  disabled={submitting}
                />
                {file && (
                  <p className="file-hint">Selected: {file.name}</p>
                )}
              </div>
            )}

            {contentType === "link" && (
              <div className="form-group">
                <label className="form-label" htmlFor="external-link">
                  External Link *
                </label>
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

          {/* Visibility */}
          <section className="form-section">
            <h2 className="section-title">Visibility</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="visibility">
                Who can access this resource? *
              </label>
              <select
                id="visibility"
                className="form-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select visibility</option>
                <option value="public">Public - Everyone</option>
                <option value="course">Course Only - Enrolled students</option>
                <option value="restricted">Restricted - Approved users</option>
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
              className="button-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner"></span>
                  <span>Uploading...</span>
                </>
              ) : (
                "Upload Resource"
              )}
            </button>

            <button
              className="button-secondary"
              type="button"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadResource;