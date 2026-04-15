import React from 'react';
import './SummaryModal.css';

const SummaryModal = ({ isOpen, onClose, summary, title }) => {
  if (!isOpen) return null;

  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div className="summary-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="summary-modal-header">
          <div className="summary-modal-title-group">
            <svg className="ai-sparkle pulse" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 001.9 1.38H21l-4.75 3.447a2 2 0 00-.727 2.233L17.435 21 12 17.056 6.565 21l1.912-5.127a2 2 0 00-.727-2.233L3 10.193h5.188a2 2 0 001.9-1.38L12 3z" />
            </svg>
            <h2>AI Quick Snapshot</h2>
          </div>
          <button className="summary-modal-close" onClick={onClose} aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        
        <div className="summary-modal-content">
          <div className="summary-resource-info">
            <span className="info-label">Resource:</span>
            <span className="info-value">{title}</span>
          </div>
          <div className="summary-text-container">
            {summary ? (
               <div className="markdown-content">{summary}</div>
            ) : (
              <div className="summary-loading">
                <div className="ai-pulse-ring"></div>
                <p>Gemini is anaylzing your document...</p>
              </div>
            )}
          </div>
        </div>
        
        <footer className="summary-modal-footer">
          <p>Powered by Gemini 1.5 Flash</p>
          <button className="summary-modal-action" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
};

export default SummaryModal;
