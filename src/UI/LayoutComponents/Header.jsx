import React from 'react';

export const Header = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 ${className}`}>
      <div>
        {title && <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h1>}
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
};

export default Header;

