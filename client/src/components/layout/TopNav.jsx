import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import IconButton from '../ui/IconButton';

const ROUTE_TITLES = {
  '/dashboard': 'Overview',
  '/dashboard/applications': 'Applications',
  '/dashboard/resume': 'Resume',
  '/dashboard/communications': 'AI Email Studio',
  '/dashboard/settings': 'Settings',
};

const TopNav = ({ onMenuClick }) => {
  const location = useLocation();

  const currentTitle = ROUTE_TITLES[location.pathname] || 'Workspace';

  return (
    <header className="app-topnav" aria-label="Top Bar">
      <div className="topnav-left">
        <div className="mobile-menu-btn">
          <IconButton 
            icon={Menu} 
            label="Open Navigation" 
            onClick={onMenuClick}
          />
        </div>
        <div className="topnav-context" aria-label="Breadcrumb">
          <span className="topnav-brand-crumb">CareerFlow</span>
          <span className="topnav-crumb-sep" aria-hidden="true">/</span>
          <span className="topnav-active-crumb">{currentTitle}</span>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
