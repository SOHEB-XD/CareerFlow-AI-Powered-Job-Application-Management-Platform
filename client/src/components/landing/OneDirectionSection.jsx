import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import './OneDirectionSection.css';

// Transitioning elements mapping from Section 2 chaos positions into structured system slots
const TRANSITION_ELEMENTS = [
  { id: 'app', label: 'APPLICATION', startX: -36, startY: -26, targetSlot: 'metric-1', initR: -12 },
  { id: 'res', label: 'RESUME', startX: 38, startY: -28, targetSlot: 'card-doc', initR: 10 },
  { id: 'int', label: 'INTERVIEW', startX: -38, startY: 12, targetSlot: 'metric-2', initR: -8 },
  { id: 'eml', label: 'EMAIL', startX: 34, startY: -6, targetSlot: 'card-recruiter', initR: 15 },
  { id: 'fol', label: 'FOLLOW-UP', startX: -24, startY: 28, targetSlot: 'metric-3', initR: -16 },
  { id: 'cmp', label: 'COMPANY', startX: 32, startY: 24, targetSlot: 'card-company', initR: 8 },
  { id: 'tec', label: 'TECHNICAL', startX: -42, startY: 32, targetSlot: 'card-stage', initR: -10 },
  { id: 'hr', label: 'HR ROUND', startX: 26, startY: -32, targetSlot: 'metric-4', initR: 14 },
];

const METRIC_SYSTEM = [
  { id: '01', title: 'APPLICATIONS', count: '42', sub: 'Active Pipelines' },
  { id: '02', title: 'INTERVIEWS', count: '07', sub: 'Scheduled' },
  { id: '03', title: 'FOLLOW-UPS', count: '03', sub: 'Action Needed' },
  { id: '04', title: 'INTELLIGENCE', count: '94%', sub: 'Match Score' },
];

const TIMELINE_STAGES = [
  { label: 'Applied', status: 'completed' },
  { label: 'Screening', status: 'completed' },
  { label: 'Interview', status: 'active' },
  { label: 'Offer', status: 'upcoming' },
];

const TransitionTag = ({ item, progress, reducedMotion }) => {
  // Move from scatter start coordinate toward 0,0 (center system surface)
  const x = useTransform(progress, [0.0, 0.40, 0.60], [`${item.startX}vw`, '0vw', '0vw']);
  const y = useTransform(progress, [0.0, 0.40, 0.60], [`${item.startY}vh`, '0vh', '0vh']);
  const rotate = useTransform(progress, [0.0, 0.40], [item.initR, 0]);
  const scale = useTransform(progress, [0.0, 0.40, 0.60], [1, 0.85, 0.5]);
  // Visible from frame 0 (opacity 0.9) -> converges into central product surface
  const opacity = useTransform(progress, [0.0, 0.20, 0.45, 0.60], [0.9, 1, 0.6, 0]);

  if (reducedMotion) return null;

  return (
    <motion.div
      className="s3-transition-tag"
      style={{ x, y, rotate, scale, opacity }}
      aria-hidden="true"
    >
      {item.label}
    </motion.div>
  );
};

const OneDirectionSection = ({ mouseRef, reducedMotion }) => {
  const containerRef = useRef(null);

  // Section 3 viewport sticky scroll binding (synchronized start start -> end end)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  // Editorial Title Motion: Visible from frame 0 (0.70 opacity) -> full clarity (1.0)
  const titleOpacity = useTransform(smoothProgress, [0.0, 0.40], [0.70, 1.0]);
  const titleY = useTransform(smoothProgress, [0.0, 0.40], [12, 0]);

  // Product Surface Motion: EXISTS & VISIBLE FROM FRAME 0 (opacity 0.65, scale 0.94 -> full focus 1.0)
  const surfaceOpacity = useTransform(smoothProgress, [0.0, 0.45], [0.65, 1.0]);
  const surfaceScale = useTransform(smoothProgress, [0.0, 0.45], [0.94, 1.0]);
  const surfaceY = useTransform(smoothProgress, [0.0, 0.45], [12, 0]);

  // Internal System Cards Motion: VISIBLE FROM FRAME 0 (opacity 0.75 -> 1.0)
  const innerOpacity = useTransform(smoothProgress, [0.0, 0.40], [0.75, 1.0]);
  const innerY = useTransform(smoothProgress, [0.0, 0.40], [8, 0]);

  return (
    <section className="landing-section-3" ref={containerRef} aria-label="Section 3: One Direction">
      <div className="s3-sticky">
        {/* Transitioning scatter tags moving into structured system */}
        <div className="s3-transition-canvas" aria-hidden="true">
          {TRANSITION_ELEMENTS.map((item) => (
            <TransitionTag
              key={item.id}
              item={item}
              progress={smoothProgress}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        <div className="s3-container">
          {/* Header Block */}
          <motion.div
            className="s3-header"
            style={reducedMotion ? {} : { opacity: titleOpacity, y: titleY }}
          >
            <span className="s3-eyebrow">CONVERGENCE & CONTROL</span>
            <h2 className="s3-headline">ONE DIRECTION.</h2>
            <p className="s3-subtitle">
              Everything you need to move your job search forward.
            </p>
          </motion.div>

          {/* Central Physical CareerFlow Product Surface (EXISTS FROM FRAME 0) */}
          <motion.div
            className="s3-product-surface"
            style={
              reducedMotion
                ? {}
                : {
                    opacity: surfaceOpacity,
                    scale: surfaceScale,
                    y: surfaceY,
                  }
            }
          >
            {/* Top Bar: Structured Metrics Grid */}
            <div className="s3-metrics-grid">
              {METRIC_SYSTEM.map((metric) => (
                <div key={metric.id} className="s3-metric-col">
                  <div className="s3-metric-top">
                    <span className="s3-metric-idx">{metric.id}</span>
                    <span className="s3-metric-title">{metric.title}</span>
                  </div>
                  <div className="s3-metric-value-row">
                    <span className="s3-metric-count">{metric.count}</span>
                    <span className="s3-metric-sub">{metric.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Application Workspace Surface */}
            <motion.div
              className="s3-workspace-card"
              style={reducedMotion ? {} : { opacity: innerOpacity, y: innerY }}
            >
              {/* Featured Company Header */}
              <div className="s3-app-header">
                <div className="s3-app-brand">
                  <div className="s3-app-logo">G</div>
                  <div className="s3-app-meta">
                    <h3 className="s3-app-company">GOOGLE</h3>
                    <p className="s3-app-role">Software Engineer, L4</p>
                  </div>
                </div>
                <div className="s3-app-status-badge">
                  <span className="s3-status-dot" />
                  INTERVIEW SCHEDULED
                </div>
              </div>

              {/* Next Milestone */}
              <div className="s3-app-milestone">
                <span className="s3-milestone-label">NEXT MILESTONE</span>
                <span className="s3-milestone-value">Technical Architecture • Tomorrow, 2:00 PM</span>
              </div>

              {/* Timeline Track */}
              <div className="s3-timeline-section">
                <span className="s3-timeline-label">APPLICATION PIPELINE</span>
                <div className="s3-timeline-track">
                  {TIMELINE_STAGES.map((stage, idx) => (
                    <div key={idx} className={`s3-timeline-node ${stage.status}`}>
                      <div className="s3-node-dot" />
                      <span className="s3-node-label">{stage.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Context Pills */}
              <div className="s3-app-pills">
                <span className="s3-pill-item">Resume_v4.pdf</span>
                <span className="s3-pill-item">Referral Confirmed</span>
                <span className="s3-pill-item">Recruiter: Sarah M.</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OneDirectionSection;
