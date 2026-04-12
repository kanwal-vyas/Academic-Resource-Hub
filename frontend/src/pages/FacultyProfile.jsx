import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../utils/api";
import "../styles/home.css";
import "../styles/faculty-profile.css";

const getInitials = (fullName) => {
  if (!fullName) return "?";
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
};

function FacultyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedDetail, setExpandedDetail] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchFaculty();
    }
  }, [user, id]);

  const fetchFaculty = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/faculty/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setFaculty(result.data || null);
        setEditForm(result.data || {});
      }
    } catch (err) {
      console.error("Error fetching faculty profile:", err);
      setError("Faculty not found");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/faculty/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      const updatedData = await response.json();
      setFaculty({ ...faculty, ...updatedData });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setSaveError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  if (loading) {
    return (
      <main className="home-page">
        <div className="container">
          <div className="state-message">
            <p>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !faculty) {
    return (
      <main className="home-page">
        <div className="container">
          <div className="state-message error-message">
            <p>⚠️ {error || "Faculty not found"}</p>
          </div>
        </div>
      </main>
    );
  }

  const isOwner = user?.id === faculty.id || user?.role === "admin";

  const infoItems = [
    faculty.research_interests && {
      key: "research",
      title: "Research Interests",
      value: faculty.research_interests,
      className: "fp-info-card research-interests",
    },
    faculty.phd_topic && {
      key: "phd",
      title: "PhD Topic",
      value: faculty.phd_topic,
      className: "fp-info-card phd-topic",
    },
  ].filter(Boolean);

  const availabilityItems = [
    { label: "Internships", icon: "🎯", key: "Internships", available: faculty.open_for_interns,  details: faculty.internship_details },
    { label: "Research",    icon: "🔬", key: "Research",    available: faculty.open_for_research, details: faculty.research_details },
    { label: "Mentoring",   icon: "🧑‍🏫", key: "Mentoring",   available: faculty.open_for_mentoring,details: faculty.mentoring_details },
  ];

  // Only items the faculty is actually open for
  const openItems = availabilityItems.filter((a) => a.available);

  return (
    <main className="home-page">
      <div className="container">
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.95rem',
            cursor: 'pointer',
            padding: '0 0 1.5rem 0',
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
        <div className="fp-layout">
          <div className="fp-header-card">
            <div className="fp-header-content">
              <div className="fp-avatar">{getInitials(faculty.full_name)}</div>
              <div className="fp-header-text">
                <h1 className="fp-name">{faculty.full_name}</h1>
                {faculty.education && (
                  <p className="fp-subtitle">{faculty.education}</p>
                )}
              </div>
            </div>
            {isOwner && !isEditing && (
              <button className="fp-edit-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="fp-edit-form">
              <h2>Edit Profile</h2>
              {saveError && <p className="error-message">{saveError}</p>}
              
              <div className="form-group">
                <label>Education</label>
                <input
                  type="text"
                  name="education"
                  value={editForm.education || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Research Interests</label>
                <textarea
                  name="research_interests"
                  value={editForm.research_interests || ""}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="form-group">
                <label>PhD Topic</label>
                <input
                  type="text"
                  name="phd_topic"
                  value={editForm.phd_topic || ""}
                  onChange={handleChange}
                />
              </div>

              <h3>Availability & Study Details</h3>
              
              <div className="form-group form-group-checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="open_for_interns"
                    checked={!!editForm.open_for_interns}
                    onChange={handleChange}
                  />
                  Open for Internships
                </label>
                {editForm.open_for_interns && (
                  <textarea
                    placeholder="Provide details about internship opportunities..."
                    name="internship_details"
                    value={editForm.internship_details || ""}
                    onChange={handleChange}
                  ></textarea>
                )}
              </div>

              <div className="form-group form-group-checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="open_for_research"
                    checked={!!editForm.open_for_research}
                    onChange={handleChange}
                  />
                  Open for Research
                </label>
                {editForm.open_for_research && (
                  <textarea
                    placeholder="Provide details about research opportunities..."
                    name="research_details"
                    value={editForm.research_details || ""}
                    onChange={handleChange}
                  ></textarea>
                )}
              </div>

              <div className="form-group form-group-checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="open_for_mentoring"
                    checked={!!editForm.open_for_mentoring}
                    onChange={handleChange}
                  />
                  Open for Mentoring
                </label>
                {editForm.open_for_mentoring && (
                  <textarea
                    placeholder="Provide details about mentoring availability..."
                    name="mentoring_details"
                    value={editForm.mentoring_details || ""}
                    onChange={handleChange}
                  ></textarea>
                )}
              </div>

              <div className="fp-form-actions">
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setEditForm(faculty);
                    setIsEditing(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {infoItems.length > 0 && (
                <div className="fp-info-grid">
                  {infoItems.map((item) => (
                    <div key={item.key} className={item.className}>
                      <h3 className="fp-info-label">{item.title}</h3>
                      <p className="fp-info-value">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="fp-availability-card">
                <h3 className="fp-info-label">Availability</h3>

                {openItems.length === 0 ? (
                  /* ── Nothing available ── */
                  <div className="fp-unavailable-notice">
                    <span className="fp-unavailable-icon">🔕</span>
                    <div>
                      <p className="fp-unavailable-title">
                        Not accepting requests currently
                      </p>
                      <p className="fp-unavailable-sub">
                        {faculty.full_name?.split(" ")[0] || "This faculty"} is not open for internships, research, or mentoring at the moment. Check back later.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* ── Show only open opportunities ── */
                  <div className="fp-availability-chips">
                    {openItems.map(({ label, icon, key, details }) => {
                      const isExpanded = expandedDetail === key;
                      const canExpand = !!details;
                      return (
                        <div key={key} className="fp-availability-item">
                          <span
                            className={`fp-availability-badge fp-badge--open ${
                              canExpand ? "fp-badge--clickable" : ""
                            }`}
                            onClick={() => {
                              if (canExpand) {
                                setExpandedDetail(isExpanded ? null : key);
                              }
                            }}
                          >
                            <span className="fp-badge-icon">{icon}</span>
                            {label}
                            {canExpand && (
                              <span className="fp-badge-arrow">
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            )}
                          </span>

                          {isExpanded && canExpand && (
                            <div className="fp-availability-details">
                              <p>{details}</p>
                              <div className="fp-contact-notice">
                                ℹ️ Interested? Kindly contact the faculty directly.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="fp-availability-hint">
                      Click an option to see more details.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default FacultyProfile;