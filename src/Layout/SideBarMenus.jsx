import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'Product & Services', path: '/products/add', icon: 'inventory_2' },
  { name: 'Customers', path: '/customers', icon: 'group' },
  { name: 'Renewal Management', path: '/renewal', icon: 'list_alt' },
  { name: 'Invoices', path: '/invoices', icon: 'description' },
  { name: 'Proforma Invoice', path: '/proforma', icon: 'receipt' },
  { name: 'Expenses', path: '/expenses', icon: 'payments' },
  { name: 'Revenue Management', path: '/revenue', icon: 'trending_up' },
  { name: 'Report Management', path: '/reports', icon: 'assessment' },
  { name: 'GST Setting', path: '/gst-settings', icon: 'receipt_long' },
  { name: 'Profile', path: '/profile', icon: 'person' },
  { name: 'SMTP Settings', path: '/smtp-settings', icon: 'settings' },
];

export const routeTitles = {
  '/dashboard': 'Dashboard',
  '/products/add': 'Products & Services',
  '/customers': 'Customers',
  '/website': 'Website Management',
  '/renewal': 'Renewals',
  '/invoices': 'Invoices',
  '/proforma': 'Proforma Invoices',
  '/proformas': 'Proforma Invoices',
  '/expenses': 'Expenses',
  '/revenue': 'Revenue & Payments',
  '/reports': 'Report & Domains',
  '/gst-settings': 'GST Settings',
  '/gst-setting': 'GST Settings',
  '/profile': 'Admins & Users',
  '/smtp-settings': 'SMTP Settings',
  '/smtp-setting': 'SMTP Settings',
  '/smtp': 'SMTP Settings',
};

export const getPageTitle = (pathname) => {
  let title = 'Billing System';
  if (routeTitles[pathname]) {
    title = routeTitles[pathname];
  } else if (pathname.startsWith('/new-order')) {
    title = pathname.split('/').length > 3 ? 'Edit Service' : 'Create New Service';
  }
  return `${title} | Jayam Web Solutions`;
};

const SideBarMenus = ({ isCollapsed, onExpandSidebar }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState(['Products']);

  const toggleMenu = (name) => {
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  return (
    <nav className="grow space-y-unit overflow-y-auto overflow-x-hidden custom-scrollbar">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.subItems && item.subItems.some((s) => location.pathname === s.path));
        const isExpanded = expandedMenus.includes(item.name);

        if (item.subItems) {
          return (
            <div key={item.name} className="space-y-unit">
              <button
                onClick={() => {
                  if (isCollapsed && window.innerWidth >= 1024) onExpandSidebar?.();
                  toggleMenu(item.name);
                }}
                title={isCollapsed ? item.name : ''}
                className={`w-full flex items-center transition-colors hover:bg-surface-container-high rounded-lg group ${
                  isActive ? 'text-primary font-bold bg-primary/5' : 'text-on-surface-variant'
                } ${isCollapsed ? 'lg:justify-center lg:py-md justify-between px-md py-sm' : 'justify-between px-md py-sm'}`}
              >
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className={`font-body-md text-body-md whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
                    {item.name}
                  </span>
                </div>
                <span
                  className={`material-symbols-outlined transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  } ${isCollapsed ? 'lg:hidden' : ''}`}
                >
                  expand_more
                </span>
              </button>
              {isExpanded && (
                <div
                  className={`ml-xl mt-1 space-y-unit border-l border-outline-variant ${
                    isCollapsed ? 'lg:hidden' : ''
                  }`}
                >
                  {item.subItems.map((sub) => {
                    const isSubActive = location.pathname === sub.path;
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
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.name}
            to={item.path}
            title={isCollapsed ? item.name : ''}
            className={`group flex items-center gap-md transition-all duration-200 hover:bg-surface-container-high active:scale-[0.98] rounded-lg ${
              isActive
                ? 'text-primary font-bold bg-primary/5 shadow-[inset_4px_0_0_0_rgb(var(--primary))]'
                : 'text-on-surface-variant font-normal'
            } ${isCollapsed ? 'lg:justify-center lg:py-md px-md py-sm' : 'px-md py-sm'}`}
          >
            <span className="material-symbols-outlined transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
            <span className={`font-body-md text-body-md whitespace-nowrap transition-transform duration-200 group-hover:translate-x-0.5 ${isCollapsed ? 'lg:hidden' : ''}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default SideBarMenus;

