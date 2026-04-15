import { useNavigate } from "react-router-dom";

const getInitials = (fullName) => {
  if (!fullName) return "?";
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
};

function FacultyCard({ faculty }) {
  const navigate = useNavigate();

  const availability = [
    faculty.open_for_interns && { label: "Interns", className: "chip-interns", icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )},
    faculty.open_for_research && { label: "Research", className: "chip-research", icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 22l7-5M9 7l5 5-5 5-5-5 5-5zM22 2l-8 8" />
        <path d="M17 2l5 5" />
      </svg>
    )},
    faculty.open_for_mentoring && { label: "Mentoring", className: "chip-mentoring", icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    )},
  ].filter(Boolean);

  return (
    <article className="card faculty-card">
      <div
        className="faculty-avatar"
        aria-label={`Avatar for ${faculty.full_name}`}
      >
        {getInitials(faculty.full_name)}
      </div>

      <h3>{faculty.full_name}</h3>

      {availability.length > 0 && (
        <div className="chips">
          {availability.map((item) => (
            <span
              key={item.label}
              className={`chip ${item.className}`}
            >
              <span className="status-dot"></span>
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
      )}

      <div className="faculty-info">
        {faculty.education && (
          <p>
            <strong>Education:</strong> {faculty.education}
          </p>
        )}
        {faculty.research_interests && (
          <p>
            <strong>Research Interests:</strong> {faculty.research_interests}
          </p>
        )}
      </div>

      <button
        className="faculty-button"
        aria-label={`View profile for ${faculty.full_name}`}
        onClick={() => navigate(`/faculty/${faculty.id}`)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        View Profile
      </button>
    </article>
  );
}

export default FacultyCard;