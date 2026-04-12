function StatsCard({ icon, label, value, color, hint }) {
  return (
    <div className={`stats-card stats-card--${color}`}>
      <div className="stats-card-icon">{icon}</div>
      <div className="stats-card-body">
        <div className="stats-card-value">{(value ?? 0).toLocaleString()}</div>
        <div className="stats-card-label">{label}</div>
        {hint && <div className="stats-card-hint">{hint}</div>}
      </div>
    </div>
  );
}

export default StatsCard;
