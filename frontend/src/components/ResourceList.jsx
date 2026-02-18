import { useState } from "react";

// ===============================
// Constants
// ===============================
const API_BASE_URL = "http://localhost:5000";

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
};

// ===============================
// Utility Functions
// ===============================
const formatUrl = (url) => {
  if (!url) return null;
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
};

const getResourceTypeDisplay = (type) => {
  const config = RESOURCE_TYPE_CONFIG[type];
  if (config) return config;
  
  // Fallback for unknown types
  return {
    className: "chip-notes",
    label: type?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown",
  };
};

// ===============================
// API Functions
// ===============================
const fetchSignedUrl = async (resourceId) => {
  const response = await fetch(`${API_BASE_URL}/resources/signed-url/${resourceId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch signed URL: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data?.signedUrl) {
    throw new Error("Signed URL not found in response");
  }
  
  return data.signedUrl;
};

// ===============================
// Main Component
// ===============================
function ResourceList({ resources }) {
  const [activeResourceId, setActiveResourceId] = useState(null);
  const [error, setError] = useState(null);

  const handleViewResource = async (resource) => {
    setActiveResourceId(resource.id);
    setError(null);

    try {
      if (resource.resource_type === "file") {
        await handleFileResource(resource.id);
      } else if (resource.resource_type === "external_link") {
        handleLinkResource(resource.external_url);
      } else {
        throw new Error("Unknown resource type");
      }
    } catch (err) {
      console.error("Error viewing resource:", err);
      setError(`Unable to open resource: ${err.message}`);
      alert("Unable to open resource. Please try again.");
    }
  };

  const handleFileResource = async (resourceId) => {
    const signedUrl = await fetchSignedUrl(resourceId);
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleLinkResource = (externalUrl) => {
    const url = formatUrl(externalUrl);
    
    if (!url) {
      throw new Error("Invalid external URL");
    }
    
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Empty state
  if (!Array.isArray(resources) || resources.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="resource-grid">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          isActive={activeResourceId === resource.id}
          onView={handleViewResource}
        />
      ))}
    </div>
  );
}

// ===============================
// ResourceCard Component
// ===============================
function ResourceCard({ resource, isActive, onView }) {
  const resourceType = getResourceTypeDisplay(resource.resource_type);

  return (
    <article className={`resource-card ${isActive ? "selected" : ""}`}>
      <header className="resource-header">
        <h3>{resource.title}</h3>
        <div className="chips">
          <span className={`chip ${resourceType.className}`}>
            {resourceType.label}
          </span>
        </div>
      </header>

      <p className="resource-description">
        {resource.description || "No description provided."}
      </p>

      <button
        className="resource-action"
        onClick={() => onView(resource)}
        aria-label={`View ${resource.title}`}
      >
        View Resource
      </button>
    </article>
  );
}

// ===============================
// UI State Components
// ===============================
function EmptyState() {
  return (
    <div className="empty-state">
      <p>No resources available</p>
    </div>
  );
}

function ErrorMessage({ message, onDismiss }) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss error">
        ✕
      </button>
    </div>
  );
}

export default ResourceList;