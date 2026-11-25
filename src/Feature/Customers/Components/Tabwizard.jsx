import React from 'react';

export const Tabwizard = ({ activeTab, onTabChange, hasInvoices = true }) => {
  const tabs = [
    { key: 'customer', label: 'Customer', icon: 'person' },
    { key: 'service', label: 'Service', icon: 'service_toolbox' },
    { key: 'payment', label: 'Payment', icon: 'payments' },
    ...(hasInvoices ? [{ key: 'invoice', label: 'Invoice', icon: 'receipt_long' }] : []),
  ];

  return (
    <div className="flex items-center gap-1.5 bg-[#edeef0]/60 p-1 rounded-xl border border-[#c3c6d6]/60">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
              isActive
                ? 'bg-[#003d9b] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabwizard;
