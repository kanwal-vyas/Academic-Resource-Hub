import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { Link } from "react-router-dom";
import FacultyCard from "../components/FacultyCard";
import { API_BASE_URL } from "../utils/api";
import "../styles/home.css";

function FacultyDirectory() {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchFaculty();
    }
  }, [user]);

  const fetchFaculty = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/faculty`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setFaculty(result.data || []);
    } catch (err) {
      console.error("Error fetching faculty:", err);
      setError("Failed to load faculty");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="home-page">
      <div className="container">
        <section className="faculty-section">
          <h2>Faculty Directory</h2>
          <p className="text-muted" style={{ marginBottom: "var(--space-xl)" }}>
            Browse all faculty members and their research interests
          </p>

          {!loading && !error && user?.role === "faculty" && !faculty.some(f => f.id === user.id) && (
            <div style={{
              background: "var(--surface)",
              border: "1px dashed var(--accent)",
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "var(--space-xl)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              boxShadow: "var(--shadow-sm)"
            }}>
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text)" }}>Looking to feature your research?</h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>Create your faculty profile to share your research interests and open opportunities with students.</p>
              </div>
              <Link
                to={`/faculty/${user.id}`}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "var(--interaction)",
                  color: "#fff",
                  borderRadius: "var(--radius-md)",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-block"
                }}
              >
                Create My Profile
              </Link>
            </div>
          )}

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
      </div>
    </main>
  );
}

export default FacultyDirectory;