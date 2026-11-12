import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Layout = () => {
  const location = useLocation()
  const { admin, logout } = useAuth()
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Product & Services', path: '/products/add', icon: 'inventory_2' },
    // { name: 'Renewal Management', path: '/renewal', icon: 'list_alt' },
    { name: 'Customers', path: '/customers', icon: 'group' },
    // { name: 'Website Management', path: '/website', icon: 'web' },
    { name: 'Renewal Management', path: '/renewal', icon: 'list_alt' },
    { name: 'Invoices', path: '/invoices', icon: 'description' },
    { name: 'Proforma Invoice', path: '/proforma', icon: 'receipt' },
    { name: 'Revenue Management', path: '/revenue', icon: 'trending_up' },
    { name: 'Report Management', path: '/reports', icon: 'assessment' },
    { name: 'GST Setting', path: '/gst-settings', icon: 'receipt_long' },
    { name: 'Profile', path: '/profile', icon: 'person' },
    { name: 'SMTP Settings', path: '/smtp-settings', icon: 'settings'}
  ]

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState(['Products'])

  // Close sidebar on route change (for mobile)
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  // Dynamic Tab Title based on active route
  useEffect(() => {
    const routeTitles = {
      '/dashboard': 'Dashboard',
      '/products/add': 'Products & Services',
      '/customers': 'Customers',
      '/website': 'Website Management',
      '/renewal': 'Renewals',
      '/invoices': 'Invoices',
      '/proforma': 'Proforma Invoices',
      '/revenue': 'Revenue & Payments',
      '/reports': 'Report & Domains',
      '/gst-settings': 'GST Settings',
      '/profile': 'Admins & Users',
      '/smtp-settings': 'SMTP Settings',
    };

    const path = location.pathname;
    let title = 'Billing System';
    
    if (routeTitles[path]) {
      title = routeTitles[path];
    } else if (path.startsWith('/new-order')) {
      title = path.split('/').length > 3 ? 'Edit Service' : 'Create New Service';
    }

    document.title = `${title} | Jayam Web Solutions`;
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
  }

  const toggleMenu = (name) => {
    setExpandedMenus(prev => 
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    )
  }
  return (
    <div className="bg-background text-on-background min-h-screen relative overflow-x-hidden">
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-45 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <aside className={`h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-gutter px-sm z-50 shadow-sm transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isCollapsed ? 'lg:w-20 w-64' : 'w-64'}`}>
        <div className={`px-md mb-xl flex items-center ${isCollapsed ? 'lg:justify-center justify-between' : 'justify-between'}`}>
          <div className={`overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
            <h2 className="font-h2 text-h2 text-primary">BillingCorp</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest font-black opacity-80">Enterprise Billing</p>
          </div>
          
          <div 
            className={`w-10 h-10 bg-primary rounded-lg items-center justify-center text-on-primary font-bold text-xl cursor-pointer ${isCollapsed ? 'hidden lg:flex' : 'hidden'}`} 
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
        <nav className="grow space-y-unit overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(s => location.pathname === s.path))
            const isExpanded = expandedMenus.includes(item.name)

            if (item.subItems) {
              return (
                <div key={item.name} className="space-y-unit">
                  <button
                    onClick={() => {
                      if (isCollapsed && window.innerWidth >= 1024) setIsCollapsed(false);
                      toggleMenu(item.name);
                    }}
                    title={isCollapsed ? item.name : ''}
                    className={`w-full flex items-center transition-colors hover:bg-surface-container-high rounded-lg group ${
                      isActive ? 'text-primary font-bold bg-primary/5' : 'text-on-surface-variant'
                    } ${isCollapsed ? 'lg:justify-center lg:py-md justify-between px-md py-sm' : 'justify-between px-md py-sm'}`}
                  >
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <span className={`font-body-md text-body-md whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
                    </div>
                    <span className={`material-symbols-outlined transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isCollapsed ? 'lg:hidden' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  {isExpanded && (
                    <div className={`ml-xl mt-1 space-y-unit border-l border-outline-variant ${isCollapsed ? 'lg:hidden' : ''}`}>
                      {item.subItems.map((sub) => {
                        const isSubActive = location.pathname === sub.path
                        return (
                          <Link
                            key={sub.name}
                            to={sub.path}
                            className={`flex items-center gap-md px-md py-xs transition-colors hover:bg-surface-container-high rounded-r-lg border-l-2 ${
                              isSubActive 
                                ? 'text-primary font-bold border-primary bg-surface-container-low' 
                                : 'text-on-surface-variant font-normal border-transparent'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{sub.icon}</span>
                            <span className="font-body-md text-body-md">{sub.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                title={isCollapsed ? item.name : ''}
                className={`flex items-center gap-md transition-colors hover:bg-surface-container-high rounded-lg ${
                  isActive 
                    ? 'text-primary font-bold bg-primary/5 shadow-[inset_4px_0_0_0_rgb(var(--primary))]' 
                    : 'text-on-surface-variant font-normal'
                } ${isCollapsed ? 'lg:justify-center lg:py-md px-md py-sm' : 'px-md py-sm'}`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className={`font-body-md text-body-md whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto px-md pt-gutter border-t border-outline-variant space-y-sm">
          <button 
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : ''}
            className={`w-full flex items-center gap-md text-error font-bold hover:bg-error/10 transition-all rounded-lg group cursor-pointer mb-2 ${
              isCollapsed ? 'lg:justify-center lg:py-md px-md py-sm' : 'px-md py-sm'
            }`}
          >
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">logout</span>
            <span className={`font-body-md text-body-md whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className={`fixed top-0 right-0 left-0 h-16 bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center px-md lg:px-gutter z-40 transition-all duration-300 ${
        isCollapsed ? 'lg:left-20' : 'lg:left-64'
      }`}>
        <div className="flex items-center gap-md">
          <button 
            className="p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full active:scale-95 transition-transform"
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setIsCollapsed(!isCollapsed);
              } else {
                setIsSidebarOpen(true);
              }
            }}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          {/* <h3 className="hidden sm:block font-h3 text-h3 font-bold text-on-surface truncate">
            {navItems.find(item => location.pathname.includes(item.path))?.name || 'Dashboard'}
          </h3> */}
        </div>

        <div className="flex items-center gap-md">
          {/* <button className="p-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full active:scale-95">
            <span className="material-symbols-outlined">notifications</span>
          </button> */}
         
          {/* <div className="h-8 w-px bg-outline-variant mx-sm hidden xs:block"></div> */}
          <Link to="/profile" className="flex items-center gap-sm cursor-pointer hover:opacity-80 transition-opacity">
            <span className="text-body-sm font-bold text-on-surface hidden xs:block">{admin?.username || 'Admin'}</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">person</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`pt-24 px-md pb-gutter transition-all duration-300 min-w-0 ${
        isCollapsed ? 'lg:pl-26 lg:pr-gutter' : 'lg:pl-70 lg:pr-gutter'
      }`}>
        <div className="max-w-full p-1"> {/* Added p-1 to prevent shadow/border clipping */}
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
