import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

/**
 * CustomSelect Component
 * A premium, theme-aware dropdown with a scrollable list.
 * 
 * @param {Array} options - Array of { value, label }
 * @param {string} value - Current selected value
 * @param {function} onChange - Callback when value changes
 * @param {string} placeholder - Text when no value is selected
 * @param {string} label - Optional label above the select
 */
const CustomSelect = ({ options, value, onChange, placeholder = "Select...", label, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Find the label for the current value
  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleSelect = (val) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`} ref={containerRef}>
      {label && <label className="custom-select-label">{label}</label>}
      
      <div className="custom-select-trigger" onClick={handleToggle}>
        <span className={`custom-select-value ${!selectedOption ? 'is-placeholder' : ''}`}>
          {displayLabel}
        </span>
        <div className="custom-select-icon">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1L5 5L9 1" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          <ul className="custom-select-list">
            {options.map((option, idx) => (
              <li 
                key={`${option.value}-${idx}`}
                className={`custom-select-option ${String(option.value) === String(value) ? 'is-selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </li>
            ))}
            {options.length === 0 && (
              <li className="custom-select-option is-empty">No options available</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
