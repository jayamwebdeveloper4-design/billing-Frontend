import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './sidebar';
import LayoutOutlet from './Outlet';
import { getPageTitle } from './SideBarMenus';

const Layout = () => {
  const location = useLocation();
  const { admin, logout } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close sidebar on route change (for mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Dynamic Tab Title based on active route
  useEffect(() => {
    document.title = getPageTitle(location.pathname);
  }, [location.pathname]);

  const handleToggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setIsCollapsed((prev) => !prev);
    } else {
      setIsSidebarOpen(true);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="bg-background text-on-background min-h-screen relative overflow-x-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onLogout={handleLogout}
      />

      <LayoutOutlet
        isCollapsed={isCollapsed}
        onToggleSidebar={handleToggleSidebar}
        admin={admin}
      />
    </div>
  );
};

export default Layout;

