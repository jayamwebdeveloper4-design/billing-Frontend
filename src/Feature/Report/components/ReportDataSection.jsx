import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Table from '../../../UI/Components/Table';
import SearchBar from '../../../UI/Components/SearchBar';
import Button from '../../../UI/Components/Button';
import ReportEmptyState from './ReportEmptyState';

const TABS = [
  { key: 'customers', label: 'Customer List', icon: 'group' },
  { key: 'orders', label: 'Order List', icon: 'shopping_bag' },
  { key: 'activeDomains', label: 'Active Domains', icon: 'check_circle' },
  { key: 'deactiveDomains', label: 'Deactive Domains', icon: 'cancel' },
];

const PAGE_SIZE = 10;

export const ReportDataSection = ({
  customers = [],
  orders = [],
  activeDomains = [],
  deactiveDomains = [],
  isLoading = false,
  hasActiveFilters = false,
  onResetFilters,
  onExportExcel,
}) => {
  const [activeTab, setActiveTab] = useState('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const tabCounts = {
    customers: customers.length,
    orders: orders.length,
    activeDomains: activeDomains.length,
    deactiveDomains: deactiveDomains.length,
  };

  const activeList = useMemo(() => {
    if (activeTab === 'customers') return customers;
    if (activeTab === 'orders') return orders;
    if (activeTab === 'activeDomains') return activeDomains;
    return deactiveDomains;
  }, [activeTab, customers, orders, activeDomains, deactiveDomains]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  const columns = useMemo(() => {
    if (activeTab === 'customers') {
      return [
        { key: 'createdAt', label: 'Created Date' },
        { key: 'name', label: 'Customer Name' },
        { key: 'email', label: 'Contact Email' },
        { key: 'phone', label: 'Phone' },
      ];
    }
    if (activeTab === 'orders') {
      return [
        { key: 'orderDate', label: 'Order Date' },
        { key: 'customerName', label: 'Customer' },
        { key: 'productName', label: 'Service / Product' },
        { key: 'domainUrl', label: 'Domain' },
        { key: 'totalPrice', label: 'Amount', align: 'right' },
      ];
    }
    if (activeTab === 'activeDomains') {
      return [
        { key: 'orderDate', label: 'Start Date' },
        { key: 'domainUrl', label: 'Domain URL' },
        { key: 'customerName', label: 'Customer' },
        { key: 'endDate', label: 'Expiry Date' },
      ];
    }
    return [
      { key: 'orderDate', label: 'Order Date' },
      { key: 'domainUrl', label: 'Domain URL' },
      { key: 'customerName', label: 'Customer' },
      { key: 'deactiveDate', label: 'Deactive Date' },
    ];
  }, [activeTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  const activeTabLabel =
    TABS.find((t) => t.key === activeTab)?.label || 'Report';

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-lg space-y-md">
      {/* Tab Navigation Bar */}
      <div className="border-b border-outline-variant/30 pb-md">
        <div className="flex flex-wrap items-center justify-between gap-xs bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-sm px-md py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {tab.icon}
                </span>
                <span>
                  {tab.label} ({tabCounts[tab.key]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <SearchBar
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          placeholder={`Search ${activeTabLabel.toLowerCase()}...`}
          className="max-w-[448px]"
        />

        <Button
          variant="primary"
          size="sm"
          icon={Download}
          onClick={() => onExportExcel?.(activeTab)}
          className="bg-success hover:bg-success/90 text-on-primary rounded-xl shrink-0 self-start sm:self-auto"
        >
          Export Excel ({activeTabLabel})
        </Button>
      </div>

      {/* Table or Empty State */}
      {!isLoading && paginatedData.length === 0 ? (
        <ReportEmptyState
          hasActiveFilters={hasActiveFilters || Boolean(searchQuery.trim())}
          onResetFilters={() => {
            setSearchQuery('');
            onResetFilters?.();
          }}
        />
      ) : (
        <Table
          columns={columns}
          data={paginatedData}
          isLoading={isLoading}
          keyField="id"
          className="border-outline-variant/40"
        />
      )}

      {/* Pagination */}
      {filteredList.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-xs text-xs font-bold">
          <span className="text-on-surface-variant">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filteredList.length)} of{' '}
            {filteredList.length} records
          </span>
          <div className="flex items-center gap-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border-outline-variant text-on-surface"
            >
              Previous
            </Button>
            <span className="text-on-surface-variant">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border-outline-variant text-on-surface"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportDataSection;

