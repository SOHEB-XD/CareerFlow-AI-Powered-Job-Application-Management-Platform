import { NavLink, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Mail, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/dashboard/applications', label: 'Applications', icon: Briefcase, end: false },
  { path: '/dashboard/resume', label: 'Resume', icon: FileText, end: false },
  { path: '/dashboard/communications', label: 'AI Email Studio', icon: Mail, end: false },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  // Desktop sidebar is persistent. Mobile uses framer-motion for smooth drawer entry.
  // We handle the visual toggle with CSS media queries where possible, but for the drawer
  // motion helps if we render conditionally. For simplicity and keeping desktop persistent,
  // we'll use CSS classes to manage the mobile transform, enhanced by transition.

  const sidebarClasses = `app-sidebar ${isOpen ? 'mobile-open' : ''}`;

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="app-sidebar-backdrop"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses} aria-label="Main Navigation">
        <div className="sidebar-header">
          <Link to="/dashboard" className="brand-logo" onClick={onClose} aria-label="CareerFlow Dashboard">
            <div className="brand-icon" aria-hidden="true" />
            <span className="brand-text">CareerFlow</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.path} className="nav-item">
                <NavLink 
                  to={item.path} 
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <item.icon size={18} strokeWidth={1.8} className="nav-icon" aria-hidden="true" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <ul className="nav-list" style={{ marginBottom: '0.75rem' }}>
            <li className="nav-item">
              <NavLink 
                to="/dashboard/settings" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} 
                onClick={onClose}
              >
                <Settings size={18} strokeWidth={1.8} className="nav-icon" aria-hidden="true" />
                <span className="nav-label">Settings</span>
              </NavLink>
            </li>
          </ul>

          <div className="user-area">
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email || ''}</span>
            </div>
            <button 
              onClick={() => {
                logout();
                onClose();
              }} 
              className="logout-button"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
