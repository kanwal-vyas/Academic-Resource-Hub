import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
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
  const [deletingId, setDeletingId] = useState(null);

  const myResources = resources.filter(
    (r) => r.contributor_id === user?.id
  );

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
        const response = await fetch(
          `${API_BASE_URL}/resources/signed-url/${resource.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to fetch signed URL");
        const data = await response.json();
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Error viewing resource:", err);
      alert("Unable to open resource. Please try again.");
    }
  };

  const handleEdit = (resource) => {
    // Wire to your edit flow when ready
    alert(`Edit: ${resource.title}`);
  };

  const handleDelete = async (resource) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${resource.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(resource.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/resources/${resource.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

      await refetch();
    } catch (err) {
      console.error("Error deleting resource:", err);
      alert("Failed to delete resource. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <main className="browse-page">
      <div className="container">
        <header className="page-header">
          <h1>My Resources</h1>
          <p className="page-subtitle">
            Manage the resources you have contributed
          </p>
        </header>

        <section className="results-section">
          <div className="results-header">
            <h2>
              {myResources.length}{" "}
              {myResources.length === 1 ? "Resource" : "Resources"}
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
                  onEdit={() => handleEdit(resource)}
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