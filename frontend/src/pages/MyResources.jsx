import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { LoadingState, ErrorState, EmptyState } from "./Browse";
import SummaryModal from "../components/SummaryModal";
import { API_BASE_URL } from "../utils/api";
import "../styles/browse.css";
import "../styles/my-resources.css";
import "../styles/my-resources-admin.css";

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

      const res = await fetch(`${API_BASE_URL}/resources/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      setResources(json.data || []);
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

  return { resources, loading, error, removeLocally, refetch: fetchMyResources };
}

// ─── main component ─────────────────────────────────────────────────────────
function MyResources() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { resources, loading, error, removeLocally, refetch } = useMyResources(user);

  // id of card showing the inline confirm banner
  const [confirmingId, setConfirmingId] = useState(null);
  // id of card currently being deleted (spinner)
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [activeSummary, setActiveSummary] = useState(null); // { title: string, summary: string }

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

      setActiveSummary({
        title: res?.title || "Resource Snapshot",
        summary: newSummary
      });
    } catch (err) {
      console.error("Summarization failed:", err);
      setActiveSummary(null);
      if (err.message !== "Session expired") {
        showToast(err.message, "error");
      }
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
                  onSummarize={() => handleSummarize(resource.id)}
                  onViewSummary={(summary) => setActiveSummary({
                    title: resource.title,
                    summary: summary
                  })}
                />
              ))}
            </div>
          )}
        </section>

        {/* Global Floating Summary Board */}
        <SummaryModal 
          isOpen={!!activeSummary}
          onClose={() => setActiveSummary(null)}
          title={activeSummary?.title}
          summary={activeSummary?.summary}
        />
      </div>
    </main>
  );
}

function MyResourceCard({
  resource,
  isDeleting,
  isConfirming,
  onView,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
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
  const badgeClass = typeClassMap[resource.resource_type] || "";
  const contentTypeClass =
    resource.content_type === "external_link"
      ? "resource-badge--link"
      : "resource-badge--file";
  const contentTypeLabel =
    resource.content_type === "external_link" ? "External Link" : "File";

  return (
    <article className={`card resource-card ${isDeleting ? "card--deleting" : ""} ${badgeClass ? `stripe-${resource.resource_type}` : ''}`}>
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
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                ) : (
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7" />
                )}
              </svg>
              {contentTypeLabel}
            </span>
          </div>
        </div>

        {!resource.is_verified && (
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

      <p className="resource-description">{resource.description || "No description provided."}</p>

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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v14.5" />
          </svg>
          <span>{resource.subject_name}</span>
        </div>
        {resource.faculty_name && (
          <div className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <span>{resource.faculty_name}</span>
          </div>
        )}
        <div className="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>AY {resource.start_year}</span>
        </div>
        {resource.unit_number && (
          <div className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

      <div className="mr-actions-group">
        <button className="mr-btn mr-btn--view" onClick={onView} disabled={isDeleting}>
          {isDeleting ? <span className="mr-btn-loading" /> : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View Resource
            </>
          )}
        </button>

        {/* Inline confirm banner */}
        {isConfirming ? (
          <div className="delete-confirm-banner">
            <span>Delete <strong>{resource.title}</strong>? This cannot be undone.</span>
            <div className="delete-confirm-actions">
              <button className="btn-confirm-delete" onClick={onDeleteConfirm}>Yes, Delete</button>
              <button className="btn-cancel-delete" onClick={() => onDeleteCancel()}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="mr-actions-secondary">
            <button className="mr-btn mr-btn--edit" onClick={onEdit} disabled={isDeleting}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button className="mr-btn mr-btn--delete" onClick={onDeleteClick} disabled={isDeleting}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default MyResources;