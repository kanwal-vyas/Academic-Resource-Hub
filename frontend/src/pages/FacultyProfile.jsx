import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import "../styles/home.css";
import "../styles/faculty-profile.css";

const API_BASE_URL = "http://localhost:5000";

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
  const { user } = useAuth();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setFaculty(data);
      }
    } catch (err) {
      console.error("Error fetching faculty profile:", err);
      setError("Faculty not found");
    } finally {
      setLoading(false);
    }
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
            <p>⚠️ Faculty not found</p>
          </div>
        </div>
      </main>
    );
  }

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
    { label: "Internships", available: faculty.open_for_interns },
    { label: "Research",    available: faculty.open_for_research },
    { label: "Mentoring",   available: faculty.open_for_mentoring },
  ];

  return (
    <main className="home-page">
      <div className="container">
        <div className="fp-layout">

          <div className="fp-header-card">
            <div className="fp-avatar">
              {getInitials(faculty.full_name)}
            </div>
            <div className="fp-header-text">
              <h1 className="fp-name">{faculty.full_name}</h1>
              {faculty.education && (
                <p className="fp-subtitle">{faculty.education}</p>
              )}
            </div>
          </div>

          <div className="fp-info-grid">
            {infoItems.map((item) => (
              <div key={item.key} className={item.className}>
                <h3 className="fp-info-label">{item.title}</h3>
                <p className="fp-info-value">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="fp-availability-card">
            <h3 className="fp-info-label">Availability</h3>
            <div className="fp-availability-chips">
              {availabilityItems.map(({ label, available }) => (
                <span
                  key={label}
                  className={`fp-availability-badge ${available ? "fp-badge--open" : "fp-badge--closed"}`}
                >
                  {available ? "✓" : "✕"} {label}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

export default FacultyProfile;