import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { LoadingState, ErrorState, EmptyState } from "./Browse";
import "../styles/browse.css";
import "../styles/my-resources.css";

const API_BASE_URL = "http://localhost:5000";

// ─── helper ────────────────────────────────────────────────────────────────
async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

// ─── hook: fetch only MY resources directly ────────────────────────────────
function useMyResources(user) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchMyResources();
  }, [user]);

  async function fetchMyResources() {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setError("Authentication required"); return; }

      const res = await fetch(`${API_BASE_URL}/resources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Filter client-side to only this user's resources
      const mine = (json.data || []).filter((r) => r.contributor_id === user.id);
      setResources(mine);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Optimistic remove — removes card instantly without refetch
  function removeLocally(id) {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  return { resources, loading, error, removeLocally };
}

// ─── main component ─────────────────────────────────────────────────────────
function MyResources() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { resources, loading, error, removeLocally } = useMyResources(user);

  // id of card showing the inline confirm banner
  const [confirmingId, setConfirmingId] = useState(null);
  // id of card currently being deleted (spinner)
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const handleView = async (resource) => {
    try {
      if (resource.content_type === "external_link") {
        const url = resource.external_url?.startsWith("http")
          ? resource.external_url
          : `https://${resource.external_url}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE_URL}/resources/signed-url/${resource.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch signed URL");
        const data = await res.json();
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Error viewing resource:", err);
    }
  };

  // Step 1: show inline confirm banner
  const handleDeleteClick = (id) => {
    setDeleteError("");
    setConfirmingId(id);
  };

  // Step 2: user confirmed — optimistic remove then API call
  const handleDeleteConfirm = async (id) => {
    setConfirmingId(null);
    setDeletingId(id);
    setDeleteError("");

    // Optimistic: remove card from UI instantly
    removeLocally(id);

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/resources/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Delete failed (${res.status})`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setDeleteError(`Delete failed: ${err.message}. Please refresh.`);
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <main className="browse-page">
        <div className="container">
          <div className="state-message"><p>Please log in to view your resources.</p></div>
        </div>
      </main>
    );
  }

  return (
    <main className="browse-page">
      <div className="container">
        <header className="page-header">
          <h1>My Resources</h1>
          <p className="page-subtitle">Manage the resources you have contributed</p>
        </header>

        {deleteError && (
          <div className="delete-error-banner">
            ⚠️ {deleteError}
            <button onClick={() => setDeleteError("")}>✕</button>
          </div>
        )}

        <section className="results-section">
          <div className="results-header">
            <h2>
              {resources.length}{" "}
              {resources.length === 1 ? "Resource" : "Resources"}
            </h2>
          </div>

          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}

          {!loading && !error && resources.length === 0 && (
            <EmptyState hasFilters={false} />
          )}

          {!loading && !error && resources.length > 0 && (
            <div className="resource-grid">
              {resources.map((resource) => (
                <MyResourceCard
                  key={resource.id}
                  resource={resource}
                  isDeleting={deletingId === resource.id}
                  isConfirming={confirmingId === resource.id}
                  onView={() => handleView(resource)}
                  onEdit={() => navigate(`/edit-resource/${resource.id}`)}
                  onDeleteClick={() => handleDeleteClick(resource.id)}
                  onDeleteConfirm={() => handleDeleteConfirm(resource.id)}
                  onDeleteCancel={() => setConfirmingId(null)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ─── card component ──────────────────────────────────────────────────────────
function MyResourceCard({
  resource,
  isDeleting,
  isConfirming,
  onView,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}) {
  const badgeClass = {
    lecture_notes: "resource-badge--fgreen",
    question_paper: "resource-badge--purple",
    research_paper: "resource-badge--orange",
    project_material: "resource-badge--yellow",
  }[resource.resource_type] || "resource-badge--grey";

  const typeLabel =
    resource.resource_type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
    "Other";

  return (
    <article className={`card resource-card ${isDeleting ? "card--deleting" : ""}`}>
      <header className="resource-header">
        <h3>{resource.title}</h3>
        <div className="chips">
          <span className={`resource-badge ${badgeClass}`}>{typeLabel}</span>
          <span className={`resource-badge ${resource.content_type === "external_link" ? "resource-badge--link" : "resource-badge--file"}`}>
            {resource.content_type === "external_link" ? "External Link" : "File"}
          </span>
          <span className="chip chip-year">{resource.start_year}</span>
        </div>
      </header>

      <p className="resource-description">{resource.description || "No description provided."}</p>

      <footer className="resource-meta">
        <div className="meta-left">
          <span className="meta-item">📘 {resource.subject_name}</span>
          {resource.faculty_name && (
            <span className="meta-item">🎓 Taught by {resource.faculty_name}</span>
          )}
          {resource.unit_number && (
            <span className="meta-item">📑 Unit {resource.unit_number}</span>
          )}
        </div>
        <div className="meta-right">
          {resource.contributor_is_verified ? (
            <span className="verified-badge">✔ Verified</span>
          ) : (
            <span className="unverified-badge">Unverified</span>
          )}
        </div>
      </footer>

      <button className="resource-action" onClick={onView} disabled={isDeleting}>
        {isDeleting ? "Deleting…" : "View Resource"}
      </button>

      {/* Inline confirm banner */}
      {isConfirming ? (
        <div className="delete-confirm-banner">
          <span>Delete <strong>{resource.title}</strong>? This cannot be undone.</span>
          <div className="delete-confirm-actions">
            <button className="btn-confirm-delete" onClick={onDeleteConfirm}>Yes, Delete</button>
            <button className="btn-cancel-delete" onClick={onDeleteCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="resource-owner-actions">
          <button className="resource-action-edit" onClick={onEdit} disabled={isDeleting}>
            Edit
          </button>
          <button className="resource-action-delete" onClick={onDeleteClick} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </article>
  );
}

export default MyResources;