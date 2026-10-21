import { motion } from 'motion/react';

const ScrollIndicator = ({ reducedMotion }) => (
  <div className="scroll-indicator" aria-label="Scroll to explore">
    <span className="scroll-label">SCROLL TO EXPLORE</span>
    <div className="scroll-line-container" aria-hidden="true">
      <motion.div
        className="scroll-line-fill"
        initial={{ scaleY: 0 }}
        animate={reducedMotion ? { scaleY: 1 } : { scaleY: [0, 1, 0] }}
        transition={reducedMotion ? { duration: 0 } : {
          duration: 2,
          repeat: Infinity,
          repeatDelay: 0.6,
          ease: 'easeInOut',
        }}
        style={{ transformOrigin: 'top' }}
      />
    </div>
    <span className="scroll-arrow" aria-hidden="true">↓</span>
  </div>
);

export default ScrollIndicator;
