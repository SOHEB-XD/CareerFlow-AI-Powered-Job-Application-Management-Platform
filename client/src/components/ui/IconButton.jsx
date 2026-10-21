import React from 'react';
import { motion } from 'motion/react';
import './IconButton.css';

const IconButton = React.forwardRef(({ 
  icon: Icon,
  label,
  variant = 'ghost', 
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const baseClass = 'ui-icon-button';
  const variantClass = `ui-icon-button-${variant}`;
  const combinedClasses = [baseClass, variantClass, className].filter(Boolean).join(' ');

  return (
    <motion.button
      ref={ref}
      className={combinedClasses}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      <Icon size={20} strokeWidth={2} />
    </motion.button>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
