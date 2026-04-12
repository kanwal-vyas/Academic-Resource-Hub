import { useState } from 'react';
import '../styles/modal.css';

function RejectModal({ faculty, loading, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon modal-icon--danger">❌</div>
          <div>
            <h2 className="modal-title">Reject Application</h2>
            <p className="modal-subtitle">
              You are rejecting <strong>{faculty?.full_name}</strong>'s faculty registration
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <label className="modal-label">Rejection Reason *</label>
          <textarea
            className="modal-textarea"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="Explain why this application is being rejected. This message will be shown to the faculty member."
            autoFocus
          />
          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="modal-confirm" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <><span className="spinner-sm-light"></span> Rejecting...</>
            ) : '✗ Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectModal;
