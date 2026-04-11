import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../supabaseClient";
import {
  useResources,
  ResourceCard,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./Browse";
import "../styles/browse.css";

const API_BASE_URL = "http://localhost:5000";

function MyResources() {
  const { user } = useAuth();
  const { resources, loading, error, refetch } = useResources(user);
  const [selectedResourceId, setSelectedResourceId] = useState(null);

  // Filter to only this user's resources
  const myResources = resources.filter(
    (r) => r.contributor_id === user?.id
  );

  if (!user) {
    return (
      <main className="browse-page">
        <div className="container">
          <div className="state-message">
            <p>Please log in to view your resources.</p>
          </div>
        </div>
      </main>
    );
  }

  const handleView = async (resource) => {
    setSelectedResourceId(resource.id);
    try {
      if (resource.content_type === "external_link") {
        const url = resource.external_url?.startsWith("http")
          ? resource.external_url
          : `https://${resource.external_url}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await fetch(
          `${API_BASE_URL}/resources/signed-url/${resource.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch signed URL");
        const data = await res.json();
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      alert("Unable to open resource. Please try again.");
    }
  };

  const handleDelete = async (resource) => {
    if (!confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${API_BASE_URL}/resources/${resource.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      refetch();
    } catch {
      alert("Failed to delete resource. Please try again.");
    }
  };

  return (
    <main className="browse-page">
      <div className="container">
        <header className="page-header">
          <h1>My Resources</h1>
          <p className="page-subtitle">
            Resources you have uploaded — edit or delete them here
          </p>
        </header>

        <section className="results-section">
          <div className="results-header">
            <h2>
              {myResources.length}{" "}
              {myResources.length === 1 ? "Resource" : "Resources"} Found
            </h2>
          </div>

          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}

          {!loading && !error && myResources.length === 0 && (
            <EmptyState hasFilters={false} />
          )}

          {!loading && !error && myResources.length > 0 && (
            <div className="resource-grid">
              {myResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  isSelected={selectedResourceId === resource.id}
                  onView={handleView}
                  canModify={true}
                  onEdit={() => {/* wire up edit modal/page when ready */}}
                  onDelete={() => handleDelete(resource)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default MyResources;