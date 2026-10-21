import React from 'react';
import './Badge.css';

const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const baseClass = 'ui-badge';
  const variantClass = `ui-badge-${variant}`;
  const combinedClasses = [baseClass, variantClass, className].filter(Boolean).join(' ');

  return (
    <span className={combinedClasses}>
      {children}
    </span>
  );
};

export default Badge;
