import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import './Layout.css';

const AppLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
      <div className="app-main">
        <TopNav onMenuClick={toggleMobileMenu} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
