import React from 'react';
import SideBarMenus from './SideBarMenus';

const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  onLogout,
}) => {
  return (
    <>
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-35 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <aside
        className={`h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-gutter px-sm z-40 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'}`}
      >
        {/* Desktop Collapse / Expand Toggle Button on Sidebar Border */}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="hidden lg:flex items-center justify-center absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm text-on-surface-variant hover:text-primary hover:border-primary/40 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer z-40"
        >
          <span
            className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          >
            chevron_left
          </span>
        </button>
        <div
          className={`px-md mb-xl flex items-center ${
            isCollapsed ? 'lg:justify-center justify-between' : 'justify-between'
          }`}
        >
          <div className={`overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
            <h2 className="font-h2 text-h2 text-primary">BillingCorp</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest font-black opacity-80">
              Enterprise Billing
            </p>
          </div>

          <div
            className={`w-10 h-10 bg-primary rounded-lg items-center justify-center text-on-primary font-bold text-xl cursor-pointer ${
              isCollapsed ? 'hidden lg:flex' : 'hidden'
            }`}
            onClick={() => setIsCollapsed(false)}
          >
            B
          </div>

          <button
            className="lg:hidden p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full"
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <SideBarMenus
          isCollapsed={isCollapsed}
          onExpandSidebar={() => setIsCollapsed(false)}
        />

        <div className="mt-auto px-md pt-gutter border-t border-outline-variant space-y-sm">
          <button
            onClick={onLogout}
            title={isCollapsed ? 'Logout' : ''}
            className={`w-full flex items-center gap-md text-error font-bold hover:bg-error/10 transition-all rounded-lg group cursor-pointer mb-2 ${
              isCollapsed ? 'lg:justify-center lg:py-md px-md py-sm' : 'px-md py-sm'
            }`}
          >
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              logout
            </span>
            <span className={`font-body-md text-body-md whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

