function FacultyRequestCard({ faculty, showActions, actionLoading, onApprove, onReject }) {
  const isApproving = actionLoading === faculty.id + '-approve';
  const isRejecting = actionLoading === faculty.id + '-reject';

  const statusColors = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
  };

  return (
    <div className="faculty-card">
      <div className="faculty-card-header">
        <div className="faculty-card-avatar">
          {faculty.full_name?.charAt(0).toUpperCase()}
        </div>
        <div className="faculty-card-identity">
          <div className="faculty-card-name">{faculty.full_name}</div>
          <div className="faculty-card-email">{faculty.email}</div>
        </div>
        <span className={`badge ${statusColors[faculty.status] || 'badge-pending'}`}>
          {faculty.status}
        </span>
      </div>

      <div className="faculty-card-details">
        <div className="fcd-item">
          <span className="fcd-label">Department</span>
          <span className="fcd-value">{faculty.department || '—'}</span>
        </div>
        <div className="fcd-item">
          <span className="fcd-label">Employee ID</span>
          <span className="fcd-value">{faculty.employee_id || '—'}</span>
        </div>
        {faculty.education && (
          <div className="fcd-item fcd-item--full">
            <span className="fcd-label">Education</span>
            <span className="fcd-value">{faculty.education}</span>
          </div>
        )}
        {faculty.research_interests && (
          <div className="fcd-item fcd-item--full">
            <span className="fcd-label">Research Interests</span>
            <span className="fcd-value">{faculty.research_interests}</span>
          </div>
        )}
        {faculty.rejection_reason && (
          <div className="fcd-item fcd-item--full">
            <span className="fcd-label" style={{ color: 'var(--danger)' }}>Rejection Reason</span>
            <span className="fcd-value" style={{ color: 'var(--danger)', fontStyle: 'italic' }}>"{faculty.rejection_reason}"</span>
          </div>
        )}
        <div className="fcd-item">
          <span className="fcd-label">Registered</span>
          <span className="fcd-value">{new Date(faculty.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {showActions && (
        <div className="faculty-card-actions">
          <button
            className="fca-approve"
            onClick={onApprove}
            disabled={isApproving || isRejecting}
          >
            {isApproving ? (
              <><span className="spinner-sm-dark"></span> Approving...</>
            ) : (
              <>✓ Approve</>
            )}
          </button>
          <button
            className="fca-reject"
            onClick={onReject}
            disabled={isApproving || isRejecting}
          >
            {isRejecting ? (
              <><span className="spinner-sm-light"></span> Rejecting...</>
            ) : (
              <>✗ Reject</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default FacultyRequestCard;
