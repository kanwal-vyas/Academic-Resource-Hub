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
    faculty.open_for_interns && "Interns",
    faculty.open_for_research && "Research",
    faculty.open_for_mentoring && "Mentoring",
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
          {availability.map((label) => (
            <span 
              key={label} 
              className={`chip ${label === "Interns" ? "chip-interns" : ""}`}
            >
              {label === "Interns" && <span className="status-dot"></span>}
              {label}
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
        View Profile
      </button>
    </article>
  );
}

export default FacultyCard;