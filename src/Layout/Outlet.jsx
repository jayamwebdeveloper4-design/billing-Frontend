import React from 'react';
import { Outlet as RouterOutlet, Link, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

const LayoutOutlet = ({ isCollapsed, onToggleSidebar, admin }) => {
  const location = useLocation();

  return (
    <>
      {/* TopNavBar */}
      <header
        className={`fixed top-0 right-0 left-0 h-16 bg-surface-container-lowest/95 backdrop-blur-xs border-b border-outline-variant flex justify-between items-center px-md lg:px-gutter z-30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCollapsed ? 'lg:left-20' : 'lg:left-64'
        }`}
      >
        <div className="flex items-center gap-md">
          <button
            type="button"
            className="lg:hidden p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full active:scale-95 transition-transform"
            onClick={onToggleSidebar}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        <div className="flex items-center gap-md">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <span className="text-body-sm font-medium text-on-surface hidden xs:block">
              {admin?.username || 'Admin'}
            </span>
            <div
              style={{ borderRadius: '9999px' }}
              className="w-8 h-8 flex items-center justify-center bg-[var(--brand-primary)] text-blue-900 bg-blue-100 shrink-0"
            >
              <User className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`pt-16 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-w-0 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div key={location.pathname} className="max-w-full p-6 animate-page-enter">
          <RouterOutlet />
        </div>
      </main>
    </>
  );
};

export default LayoutOutlet;

