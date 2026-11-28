import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  CreditCard,
  Users,
  Package,
  Download,
} from 'lucide-react';
import Table from '../../../UI/Components/Table';
import SearchBar from '../../../UI/Components/SearchBar';
import RevenueEmptyState from './RevenueEmptyState';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const PAYMENT_TYPE_STYLES = {
  base: {
    label: 'Order Revenue',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  renewal: {
    label: 'Renewal',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  updated: {
    label: 'Updated',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  oneTimePayment: {
    label: 'One-Time',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

const PAGE_SIZE = 5;

export const RevenueDataSection = ({
  orders = [],
  payments = [],
  customerSummary = [],
  productSummary = [],
  isLoading = false,
  hasActiveFilters = false,
  onResetFilters,
}) => {
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue' | 'payments' | 'customers' | 'products'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'amount_desc' | 'name_asc'
  const [currentPage, setCurrentPage] = useState(1);
  const searchWrapperRef = useRef(null);

  // Cmd/Ctrl + K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = searchWrapperRef.current?.querySelector('input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset pagination when tab, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (activeTab === 'revenue') {
      let list = orders.filter((row) => {
        if (!q) return true;
        return (
          (row.customerName || '').toLowerCase().includes(q) ||
          (row.productName || '').toLowerCase().includes(q) ||
          String(row.orderId || '').toLowerCase().includes(q) ||
          (row.paymentType || '').toLowerCase().includes(q)
        );
      });

      list = [...list].sort((a, b) => {
        if (sortBy === 'amount_desc') {
          return (Number(b.totalPrice) || 0) - (Number(a.totalPrice) || 0);
        }
        if (sortBy === 'name_asc') {
          return (a.customerName || '').localeCompare(b.customerName || '');
        }
        return String(b.orderDate || '').localeCompare(String(a.orderDate || ''));
      });
      return list;
    }

    if (activeTab === 'payments') {
      let list = payments.filter((row) => {
        if (!q) return true;
        return (
          (row.customerName || '').toLowerCase().includes(q) ||
          (row.productName || '').toLowerCase().includes(q) ||
          String(row.paymentId || '').toLowerCase().includes(q) ||
          (row.stage || '').toLowerCase().includes(q)
        );
      });

      list = [...list].sort((a, b) => {
        if (sortBy === 'amount_desc') {
          const amtB = (Number(b.amount) || 0) + (b.withGst ? Number(b.gstvalue) || 0 : 0);
          const amtA = (Number(a.amount) || 0) + (a.withGst ? Number(a.gstvalue) || 0 : 0);
          return amtB - amtA;
        }
        if (sortBy === 'name_asc') {
          return (a.customerName || '').localeCompare(b.customerName || '');
        }
        return String(b.date || '').localeCompare(String(a.date || ''));
      });
      return list;
    }

    if (activeTab === 'customers') {
      let list = customerSummary.filter((row) => {
        if (!q) return true;
        const prodMatch = (row.products || []).some((p) =>
          (p.productName || '').toLowerCase().includes(q)
        );
        return (
          (row.customerName || '').toLowerCase().includes(q) ||
          (row.paymentStatus || '').toLowerCase().includes(q) ||
          prodMatch
        );
      });

      list = [...list].sort((a, b) => {
        if (sortBy === 'name_asc') {
          return (a.customerName || '').localeCompare(b.customerName || '');
        }
        return (Number(b.totalSales) || 0) - (Number(a.totalSales) || 0);
      });
      return list;
    }

    // products
    let list = productSummary.filter((row) => {
      if (!q) return true;
      return (
        (row.productName || '').toLowerCase().includes(q) ||
        (row.product || '').toLowerCase().includes(q) ||
        (row.variant || '').toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.productName || '').localeCompare(b.productName || '');
      }
      return (Number(b.totalSales) || 0) - (Number(a.totalSales) || 0);
    });
    return list;
  }, [activeTab, orders, payments, customerSummary, productSummary, searchQuery, sortBy]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const handleExportCsv = () => {
    if (filteredData.length === 0) return;

    let headers = [];
    let rows = [];

    if (activeTab === 'revenue') {
      headers = ['Order ID', 'Customer', 'Service Category', 'Date', 'Type', 'Qty', 'Paid', 'Pending', 'Selling Price'];
      rows = filteredData.map((r) => [
        r.orderId || '',
        r.customerName || '',
        r.productName || '',
        r.orderDate || '',
        r.paymentType || 'base',
        Number(r.quantity) || 1,
        Number(r.paidAmount) || 0,
        Number(r.pendingAmount) || 0,
        Number(r.totalPrice) || 0,
      ]);
    } else if (activeTab === 'payments') {
      headers = ['Payment ID', 'Customer', 'Service Category', 'Date', 'Stage', 'GST', 'Total Amount'];
      rows = filteredData.map((r) => [
        r.invoiceNo || r.paymentId || '',
        r.customerName || '',
        r.productName || '',
        r.date || '',
        r.stage || r.paymentType || '',
        r.withGst ? Number(r.gstvalue) || 0 : 0,
        (Number(r.amount) || 0) + (r.withGst ? Number(r.gstvalue) || 0 : 0),
      ]);
    } else if (activeTab === 'customers') {
      headers = ['Customer', 'Products (Qty - Sales)', 'Orders', 'Total Qty', 'Received', 'Pending', 'Total Sales', 'Status'];
      rows = filteredData.map((r) => [
        r.customerName || '',
        (r.products || []).map((p) => `${p.productName} (${p.quantity}x: ${p.totalSales})`).join('; '),
        r.orderCount || 0,
        r.totalQuantity || 0,
        Number(r.receivedAmount) || 0,
        Number(r.pendingAmount) || 0,
        Number(r.totalSales) || 0,
        r.paymentStatus || '',
      ]);
    } else {
      headers = ['Product', 'Units Sold', 'Orders', 'Customers', 'Received', 'Pending', 'Total Sales'];
      rows = filteredData.map((r) => [
        r.productName || '',
        r.quantitySold || 0,
        r.salesCount || 0,
        r.customerCount || 0,
        Number(r.receivedAmount) || 0,
        Number(r.pendingAmount) || 0,
        Number(r.totalSales) || 0,
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const revenueColumns = useMemo(
    () => [
      {
        key: 'orderId',
        label: 'Transaction',
        render: (row) => (
          <div>
            <div className="font-sans text-xs font-medium text-blue-600 tabular-nums">
              #REV-{String(row.orderId || '').slice(-6).toUpperCase()}
            </div>
            <div className="text-[11px] text-slate-400 whitespace-nowrap mt-0.5">
              {formatDisplayDate(row.orderDate)}
            </div>
          </div>
        ),
      },
      {
        key: 'customerName',
        label: 'Customer',
        render: (row) => {
          const style = PAYMENT_TYPE_STYLES[row.paymentType] || PAYMENT_TYPE_STYLES.base;
          return (
            <div className="min-w-0 max-w-[160px]">
              <div className="font-medium text-slate-900 truncate">{row.customerName || '—'}</div>
              <div className="text-[11px] text-slate-400 truncate">{style.label}</div>
            </div>
          );
        },
      },
      {
        key: 'productName',
        label: 'Service Category',
        render: (row) => (
          <div className="text-slate-700 text-xs sm:text-sm max-w-[200px] truncate" title={row.productName || 'Service'}>
            {row.productName || 'Service'}
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => {
          const status = row.paymentStatus || 'Billed';
          const statusColor =
            status === 'Fully Paid'
              ? 'text-emerald-600'
              : status === 'Partially Paid'
              ? 'text-amber-600'
              : status === 'Unpaid'
              ? 'text-rose-600'
              : 'text-blue-600';
          return (
            <span className={`text-xs font-semibold whitespace-nowrap ${statusColor}`}>
              {status}
            </span>
          );
        },
      },
      {
        key: 'totalPrice',
        label: 'Amount (₹)',
        align: 'right',
        render: (row) => (
          <div className="text-right whitespace-nowrap">
            <div className="font-semibold text-slate-900">
              {formatCurrency(row.totalPrice)}
            </div>
            {Number(row.pendingAmount) > 0 && (
              <div className="text-[11px] text-amber-600 font-medium">
                Due: {formatCurrency(row.pendingAmount)}
              </div>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const paymentColumns = useMemo(
    () => [
      {
        key: 'paymentId',
        label: 'Payment',
        render: (row) => (
          <div>
            <div className="font-sans text-xs font-medium text-blue-600 tabular-nums">
              {row.invoiceNo || `#PAY-${String(row.paymentId || '').slice(-6).toUpperCase()}`}
            </div>
            <div className="text-[11px] text-slate-400 whitespace-nowrap mt-0.5">
              {formatDisplayDate(row.date)}
            </div>
          </div>
        ),
      },
      {
        key: 'customerName',
        label: 'Customer',
        render: (row) => (
          <div className="min-w-0 max-w-[140px]">
            <div className="font-medium text-slate-900 truncate">{row.customerName || '—'}</div>
            {row.stage && (
              <div className="text-[11px] text-slate-400 capitalize truncate">
                {row.stage === 'mid' ? 'Partial / Mid' : row.stage}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'productName',
        label: 'Service',
        render: (row) => (
          <div className="text-slate-700 text-xs sm:text-sm max-w-[160px] truncate" title={row.productName || 'Service'}>
            {row.productName || 'Service'}
          </div>
        ),
      },
      {
        key: 'withGst',
        label: 'Tax',
        render: (row) =>
          row.withGst ? (
            <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
              GST {formatCurrency(row.gstvalue)}
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Non-GST
            </span>
          ),
      },
      {
        key: 'amount',
        label: 'Paid (₹)',
        align: 'right',
        render: (row) => {
          const total = (Number(row.amount) || 0) + (row.withGst ? Number(row.gstvalue) || 0 : 0);
          return (
            <div className="text-right whitespace-nowrap">
              <div className="font-semibold text-slate-900">{formatCurrency(total)}</div>
              {row.withGst && (
                <div className="text-[11px] text-slate-400">
                  Base: {formatCurrency(row.amount)}
                </div>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  const customerColumns = useMemo(
    () => [
      {
        key: 'customerName',
        label: 'Customer',
        render: (row) => (
          <div className="min-w-0 max-w-[150px]">
            <div className="font-semibold text-slate-900 truncate">{row.customerName || '—'}</div>
            <div className="text-[11px] text-slate-400 whitespace-nowrap">
              {row.orderCount} {row.orderCount === 1 ? 'sale' : 'sales'} • {row.totalQuantity} units
            </div>
          </div>
        ),
      },
      {
        key: 'products',
        label: 'Products',
        render: (row) => {
          const list = row.products || [];
          const visible = list.slice(0, 2);
          const extra = list.length - visible.length;
          return (
            <div className="flex flex-wrap gap-1 max-w-[210px]">
              {visible.map((p, idx) => (
                <span
                  key={p.productName + idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 max-w-full"
                  title={`${p.productName} ×${p.quantity} (${formatCurrency(p.totalSales)})`}
                >
                  <span className="truncate max-w-[110px]">{p.productName}</span>
                  <span className="text-slate-400 shrink-0">×{p.quantity}</span>
                </span>
              ))}
              {extra > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                  +{extra} more
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'receivedAmount',
        label: 'Paid / Due',
        align: 'right',
        render: (row) => (
          <div className="text-right whitespace-nowrap">
            <div className="text-xs font-medium text-emerald-700">
              {formatCurrency(row.receivedAmount)}
            </div>
            <div
              className={`text-[11px] font-medium ${
                Number(row.pendingAmount) > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              Due: {formatCurrency(row.pendingAmount)}
            </div>
          </div>
        ),
      },
      {
        key: 'totalSales',
        label: 'Total (₹)',
        align: 'right',
        render: (row) => {
          const status = row.paymentStatus || 'Unpaid';
          const cls =
            status === 'Fully Paid'
              ? 'text-emerald-600'
              : status === 'Partially Paid'
              ? 'text-amber-600'
              : 'text-rose-600';
          return (
            <div className="text-right whitespace-nowrap">
              <div className="font-semibold text-slate-900">
                {formatCurrency(row.totalSales)}
              </div>
              <span className={`block mt-0.5 text-[11px] font-semibold ${cls}`}>
                {status}
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  const productColumns = useMemo(
    () => [
      {
        key: 'productName',
        label: 'Product',
        render: (row) => (
          <div className="min-w-0 max-w-[200px]">
            <div className="font-semibold text-slate-900 truncate" title={row.productName}>
              {row.productName || '—'}
            </div>
            <div className="text-[11px] text-slate-400">
              {row.customerCount} {row.customerCount === 1 ? 'customer' : 'customers'}
            </div>
          </div>
        ),
      },
      {
        key: 'quantitySold',
        label: 'Sold',
        align: 'center',
        render: (row) => (
          <div className="text-center whitespace-nowrap">
            <span className="text-xs font-semibold text-blue-600">
              ×{row.quantitySold}
            </span>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {row.salesCount} {row.salesCount === 1 ? 'order' : 'orders'}
            </div>
          </div>
        ),
      },
      {
        key: 'receivedAmount',
        label: 'Paid / Due',
        align: 'right',
        render: (row) => (
          <div className="text-right whitespace-nowrap">
            <div className="text-xs font-medium text-emerald-700">
              {formatCurrency(row.receivedAmount)}
            </div>
            <div
              className={`text-[11px] font-medium ${
                Number(row.pendingAmount) > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              Due: {formatCurrency(row.pendingAmount)}
            </div>
          </div>
        ),
      },
      {
        key: 'totalSales',
        label: 'Total (₹)',
        align: 'right',
        render: (row) => (
          <span className="font-semibold text-slate-900 whitespace-nowrap">
            {formatCurrency(row.totalSales)}
          </span>
        ),
      },
    ],
    []
  );

  const activeColumns =
    activeTab === 'revenue'
      ? revenueColumns
      : activeTab === 'payments'
      ? paymentColumns
      : activeTab === 'customers'
      ? customerColumns
      : productColumns;

  const tabs = [
    {
      id: 'revenue',
      label: 'Revenue',
      icon: TrendingUp,
      count: orders.length,
    },
    {
      id: 'payments',
      label: 'Customer Payments',
      icon: CreditCard,
      count: payments.length,
    },
    {
      id: 'customers',
      label: 'Customer Sales',
      icon: Users,
      count: customerSummary.length,
    },
    {
      id: 'products',
      label: 'Product Sales',
      icon: Package,
      count: productSummary.length,
    },
  ];

  return (
    <div
      className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden"
      data-purpose="revenue-data-card"
    >
      {/* Tab Navigation Bar */}
      <div className="border-b border-slate-200 px-4 pt-3 flex items-center justify-between bg-slate-50/50">
        <div className="flex flex-wrap gap-x-4 gap-y-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 pb-3 text-xs sm:text-[13px] border-b-2 transition-colors whitespace-nowrap cursor-pointer outline-none focus:outline-none ${
                  isActive
                    ? 'font-semibold text-blue-600 border-blue-600'
                    : 'font-medium text-slate-500 hover:text-slate-800 border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[11px] font-semibold ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-3 items-center justify-between bg-white">
        <div ref={searchWrapperRef} className="relative w-full md:w-96 flex items-center">
          <SearchBar
            value={searchQuery}
            onSearch={setSearchQuery}
            placeholder="Search customer, product, invoice..."
            className="!max-w-none"
          />
          {!searchQuery && (
            <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <kbd className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="date_desc">Sort by Date: Recent First</option>
            <option value="amount_desc">Sort by Amount: Highest</option>
            <option value="name_asc">Sort by Customer / Name</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredData.length === 0}
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table or Empty State */}
      {!isLoading && totalItems === 0 ? (
        <RevenueEmptyState
          title={
            activeTab === 'payments'
              ? 'No customer payments found'
              : 'No revenue data found'
          }
          description="There are no recorded incoming payments or billing cycles for the selected filters."
          hasActiveFilters={hasActiveFilters || Boolean(searchQuery)}
          onResetFilters={() => {
            setSearchQuery('');
            onResetFilters && onResetFilters();
          }}
        />
      ) : (
        <div className="border-t border-slate-100">
          <Table
            key={activeTab}
            columns={activeColumns}
            data={paginatedData}
            isLoading={isLoading}
            keyField={
              activeTab === 'payments'
                ? 'paymentId'
                : activeTab === 'customers'
                ? 'customerName'
                : activeTab === 'products'
                ? 'productName'
                : 'orderId'
            }
            className="!border-0 !rounded-none !shadow-none [&_table]:!min-w-0 [&_th]:!px-3 [&_th]:!py-2.5 [&_td]:!px-3 [&_td]:!py-2.5"
          />

          {/* Pagination & Meta */}
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing <strong>{paginatedData.length}</strong> of{' '}
              <strong>{totalItems}</strong> records
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-white disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Previous
              </button>
              <span className="px-2.5 py-1 border border-slate-200 rounded bg-white text-blue-600 font-semibold shadow-2xs">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-white disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueDataSection;
