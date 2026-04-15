import React from 'react';
import '../styles/confirm-modal.css';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Are you sure?', 
  message = 'Once confirmed, this action cannot be undone.', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'primary', // 'primary' | 'danger' | 'warning'
  isLoading = false
}) => {
  if (!isOpen) return null;

  const iconMap = {
    primary: '🛡️',
    danger: '⚠️',
    warning: '💡'
  };

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div 
        className={`confirm-modal-card confirm-modal--${type}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon-ring">
            <span className="confirm-modal-icon">{iconMap[type]}</span>
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        
        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>

        <div className="confirm-modal-footer">
          <button 
            className="confirm-modal-btn confirm-modal-btn--cancel" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-modal-btn confirm-modal-btn--confirm confirm-modal-btn--${type}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="confirm-btn-spinner"></span>
            ) : (
              confirmText
            )}
          </button>
        </div>
        
        <button className="confirm-modal-close-icon" onClick={onClose}>✕</button>
      </div>
    </div>
  );
};

export default ConfirmModal;
