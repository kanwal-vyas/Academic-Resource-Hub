import { Link } from 'react-router-dom';

function StatsCard({ icon, label, value, color, hint, to }) {
  const content = (
    <>
      <div className="stats-card-icon">{icon}</div>
      <div className="stats-card-body">
        <div className="stats-card-value">{(value ?? 0).toLocaleString()}</div>
        <div className="stats-card-label">{label}</div>
        {hint && <div className="stats-card-hint">{hint}</div>}
      </div>
    </>
  );

  const className = `stats-card stats-card--${color}`;

  if (to) {
    return (
      <Link 
        to={to} 
        className={className} 
        style={{ textDecoration: 'none', color: 'inherit', display: 'flex', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

export default StatsCard;
