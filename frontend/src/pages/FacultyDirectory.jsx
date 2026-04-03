import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import FacultyCard from "../components/FacultyCard";
import "../styles/home.css";

const API_BASE_URL = "http://localhost:5000";

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

      const data = await response.json();
      setFaculty(data);
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
          <p className="text-muted">
            Browse all faculty members and their research interests
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
      </div>
    </main>
  );
}

export default FacultyDirectory;