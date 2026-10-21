import React from 'react';
import { motion } from 'motion/react';
import './Button.css';

const Button = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const baseClass = 'ui-button';
  const variantClass = `ui-button-${variant}`;
  const loadingClass = isLoading ? 'ui-button-loading' : '';
  const combinedClasses = [baseClass, variantClass, loadingClass, className].filter(Boolean).join(' ');

  return (
    <motion.button
      ref={ref}
      className={combinedClasses}
      disabled={disabled || isLoading}
      whileTap={!(disabled || isLoading) ? { scale: 0.97 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {isLoading && (
        <span className="ui-button-spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      )}
      <span className="ui-button-content" style={{ opacity: isLoading ? 0 : 1 }}>
        {children}
      </span>
    </motion.button>
  );
});

Button.displayName = 'Button';
export default Button;
