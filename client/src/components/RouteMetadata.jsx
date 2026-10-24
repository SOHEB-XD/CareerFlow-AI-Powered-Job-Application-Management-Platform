import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Route-specific metadata mapping.
 * Public routes:
 *   - '/' : discoverable ('index, follow')
 * Private and authentication routes:
 *   - '/login', '/register', '/dashboard/*' : strictly protected from indexation ('noindex, nofollow')
 */
const ROUTE_METADATA = {
  '/': {
    title: 'CareerFlow — Job Application Tracker & AI Email Studio',
    noindex: false,
  },
  '/login': {
    title: 'Sign In — CareerFlow',
    noindex: true,
  },
  '/register': {
    title: 'Create Account — CareerFlow',
    noindex: true,
  },
  '/dashboard': {
    title: 'Dashboard Overview — CareerFlow',
    noindex: true,
  },
  '/dashboard/applications': {
    title: 'Applications Pipeline — CareerFlow',
    noindex: true,
  },
  '/dashboard/resume': {
    title: 'Resume Library — CareerFlow',
    noindex: true,
  },
  '/dashboard/communications': {
    title: 'AI Email Studio — CareerFlow',
    noindex: true,
  },
  '/dashboard/settings': {
    title: 'Settings — CareerFlow',
    noindex: true,
  },
};

/**
 * RouteMetadata
 * Headless component that synchronizes document.title and meta[name="robots"]
 * with client-side navigation.
 */
export default function RouteMetadata() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    
    // Check direct match or dashboard prefix
    let config = ROUTE_METADATA[pathname];
    if (!config) {
      if (pathname.startsWith('/dashboard')) {
        config = {
          title: 'Workspace — CareerFlow',
          noindex: true,
        };
      } else {
        // Fallback for unmatched/404 routes
        config = {
          title: 'Page Not Found — CareerFlow',
          noindex: true,
        };
      }
    }

    // Update document title
    document.title = config.title;

    // Locate or create meta[name="robots"] element
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }

    if (config.noindex) {
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else {
      robotsMeta.setAttribute('content', 'index, follow');
    }
  }, [location.pathname]);

  return null;
}
