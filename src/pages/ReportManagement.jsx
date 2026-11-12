import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReportData, exportReportExcelApi } from '../api/customerApi';
import toast from 'react-hot-toast';

const ReportManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterMode, setFilterMode] = useState('year'); // 'month' | 'year' | 'all'
  const currentDate = new Date();
  const currentYearStr = currentDate.getFullYear().toString();
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [reportData, setReportData] = useState({
    totalCustomersCount: 0,
    totalOrdersCount: 0,
    activeDomainsCount: 0,
    deactiveDomainsCount: 0,
    filteredCustomerList: [],
    filteredOrderList: [],
    filteredActiveDomainList: [],
    filteredDeactiveDomainList: [],
    chartBuckets: [],
    availableYears: [currentYearStr],
    allYearsRange: [currentYearStr],
  });

  // Active Series Toggle for Line Chart
  const [visibleSeries, setVisibleSeries] = useState({
    customers: true,
    orders: true,
    activeDomains: true,
    deactiveDomains: true,
  });

  const [hoveredPointIdx, setHoveredPointIdx] = useState(null);

  // Tab State: 'customers' | 'orders' | 'activeDomains' | 'deactiveDomains'
  const [activeTab, setActiveTab] = useState('customers');

  const [searchQuery, setSearchQuery] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [activeDomainPage, setActiveDomainPage] = useState(1);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterPopoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [deactiveDomainPage, setDeactiveDomainPage] = useState(1);
  const PAGE_SIZE = 10;

  const monthNames = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const data = await getReportData({
        filterMode,
        year: selectedYear,
        month: selectedMonth,
      });
      if (data) {
        setReportData(data);
      }
    } catch (err) {
      console.error('Error fetching report analytics:', err);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [filterMode, selectedYear, selectedMonth]);

  const availableYears = reportData.availableYears || [currentYearStr];
  const allYearsRange = reportData.allYearsRange || [currentYearStr];

  // Helper to parse year, month, day from various date formats
  const parseDateParts = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim().replace(/\//g, '-');

    if (/^\d{4}$/.test(str)) {
      return { year: str, month: null, day: null };
    }

    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return { year: parts[0], month: parts[1].padStart(2, '0'), day: parseInt(parts[2], 10) || null };
      }
      if (parts[2].length === 4) {
        return { year: parts[2], month: parts[1].padStart(2, '0'), day: parseInt(parts[0], 10) || null };
      }
    } else if (parts.length === 2) {
      if (parts[0].length === 4) {
        return { year: parts[0], month: parts[1].padStart(2, '0'), day: null };
      }
      if (parts[1].length === 4) {
        return { year: parts[1], month: parts[0].padStart(2, '0'), day: null };
      }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = d.getDate();
      return { year, month, day };
    }

    return null;
  };

  // Helper to format date cleanly
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const parsed = parseDateParts(dateStr);
    if (parsed) {
      const { year, month, day } = parsed;
      if (year && month && day) {
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        }
      }
      if (year && month) {
        const mObj = monthNames.find((m) => m.value === month);
        const mLabel = mObj ? mObj.label.substring(0, 3) : month;
        return `${mLabel} ${year}`;
      }
      if (year) {
        return year;
      }
    }
    return String(dateStr);
  };

  // Helper to format deactive date as DD-MM-YYYY
  const formatDeactiveDate = (dateStr) => {
    if (!dateStr) return '—';
    const parsed = parseDateParts(dateStr);
    if (parsed) {
      const { year, month, day } = parsed;
      if (year && month && day) {
        return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
      }
      if (year && month) {
        return `01-${String(month).padStart(2, '0')}-${year}`;
      }
      if (year) {
        return `01-01-${year}`;
      }
    }
    return String(dateStr);
  };

  // Search Filtering for Lists
  const searchedCustomers = useMemo(() => {
    if (!searchQuery.trim()) return reportData.filteredCustomerList;
    const q = searchQuery.toLowerCase();
    return reportData.filteredCustomerList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
    );
  }, [reportData.filteredCustomerList, searchQuery]);

  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return reportData.filteredOrderList;
    const q = searchQuery.toLowerCase();
    return reportData.filteredOrderList.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        (o.domainUrl && o.domainUrl.toLowerCase().includes(q)) ||
        o.products.some((p) => p.product.toLowerCase().includes(q)) ||
        o.paymentStatus.toLowerCase().includes(q)
    );
  }, [reportData.filteredOrderList, searchQuery]);

  const searchedActiveDomains = useMemo(() => {
    if (!searchQuery.trim()) return reportData.filteredActiveDomainList;
    const q = searchQuery.toLowerCase();
    return reportData.filteredActiveDomainList.filter(
      (d) =>
        d.customerName.toLowerCase().includes(q) ||
        d.domainUrl.toLowerCase().includes(q) ||
        d.product.toLowerCase().includes(q)
    );
  }, [reportData.filteredActiveDomainList, searchQuery]);

  const searchedDeactiveDomains = useMemo(() => {
    if (!searchQuery.trim()) return reportData.filteredDeactiveDomainList;
    const q = searchQuery.toLowerCase();
    return reportData.filteredDeactiveDomainList.filter(
      (d) =>
        d.customerName.toLowerCase().includes(q) ||
        d.domainUrl.toLowerCase().includes(q) ||
        d.product.toLowerCase().includes(q)
    );
  }, [reportData.filteredDeactiveDomainList, searchQuery]);

  // Pagination Data
  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * PAGE_SIZE;
    return searchedCustomers.slice(start, start + PAGE_SIZE);
  }, [searchedCustomers, customerPage]);

  const totalCustomerPages = Math.ceil(searchedCustomers.length / PAGE_SIZE) || 1;

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * PAGE_SIZE;
    return searchedOrders.slice(start, start + PAGE_SIZE);
  }, [searchedOrders, orderPage]);

  const totalOrderPages = Math.ceil(searchedOrders.length / PAGE_SIZE) || 1;

  const paginatedActiveDomains = useMemo(() => {
    const start = (activeDomainPage - 1) * PAGE_SIZE;
    return searchedActiveDomains.slice(start, start + PAGE_SIZE);
  }, [searchedActiveDomains, activeDomainPage]);

  const paginatedDeactiveDomains = useMemo(() => {
    const start = (deactiveDomainPage - 1) * PAGE_SIZE;
    return searchedDeactiveDomains.slice(start, start + PAGE_SIZE);
  }, [searchedDeactiveDomains, deactiveDomainPage]);

  // Max value for Chart scaling
  const maxChartValue = useMemo(() => {
    let max = 1;
    reportData.chartBuckets.forEach((b) => {
      max = Math.max(max, b.customers, b.orders, b.activeDomains, b.deactiveDomains);
    });
    return max + Math.ceil(max * 0.15) + 1;
  }, [reportData.chartBuckets]);

  // Toggle Series Helper
  const toggleSeries = (key) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Excel Export Handler for Currently Selected Tab (Handled on Backend Side)
  const exportSelectedTabExcel = async () => {
    const loadingToast = toast.loading('Generating Excel file on backend...');
    try {
      await exportReportExcelApi({
        filterMode,
        year: selectedYear,
        month: selectedMonth,
        activeTab,
      });
      toast.success('Excel file exported successfully!', { id: loadingToast });
    } catch (err) {
      console.error('Error exporting report Excel from backend:', err);
      toast.error('Failed to export Excel file', { id: loadingToast });
    }
  };

  // SVG Chart Geometry Calculations
  const svgWidth = 1000;
  const svgHeight = 320;
  const paddingX = 45;
  const paddingY = 45;
  const chartW = svgWidth - 2 * paddingX;
  const chartH = svgHeight - 2 * paddingY;

  const buckets = reportData.chartBuckets;
  const numBuckets = buckets.length;

  const getX = (index) => {
    if (numBuckets <= 1) return paddingX + chartW / 2;
    return paddingX + (index / (numBuckets - 1)) * chartW;
  };

  const getY = (val) => {
    return svgHeight - paddingY - (val / maxChartValue) * chartH;
  };

  // Helper to create smooth Bezier curves connecting point arrays
  const createCurvedPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      d += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const createCurvedAreaPath = (pts, baselineY) => {
    if (!pts || pts.length === 0) return '';
    const curve = createCurvedPath(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `${curve} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  };

  // Professional color palette definitions matching clean curve styling (Turquoise, Blue, Violet, Rose)
  const seriesDefs = [
    {
      key: 'activeDomains',
      label: 'Active Domains',
      color: '#2dd4bf', // Turquoise Teal (matching image)
      dotColor: '#0d9488',
      bgClass: 'bg-teal-400',
      textClass: 'text-teal-400',
      gradientId: 'gradActiveDomainsProf',
      filterId: 'glowActiveDomains',
    },
    {
      key: 'customers',
      label: 'Customers',
      color: '#3b82f6', // Sapphire Blue
      dotColor: '#2563eb',
      bgClass: 'bg-blue-500',
      textClass: 'text-blue-500',
      gradientId: 'gradCustomersProf',
      filterId: 'glowCustomers',
    },
    {
      key: 'orders',
      label: 'Orders',
      color: '#c084fc', // Soft Lavender Violet (matching image)
      dotColor: '#9333ea',
      bgClass: 'bg-purple-400',
      textClass: 'text-purple-400',
      gradientId: 'gradOrdersProf',
      filterId: 'glowOrders',
    },
    {
      key: 'deactiveDomains',
      label: 'Deactive Domains',
      color: '#fb7185', // Soft Rose Coral
      dotColor: '#e11d48',
      bgClass: 'bg-rose-400',
      textClass: 'text-rose-400',
      gradientId: 'gradDeactiveDomainsProf',
      filterId: 'glowDeactiveDomains',
    },
  ];

  return (
    <div className="space-y-lg md:space-y-xl animate-in fade-in duration-300">
      {/* Header & Main Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <h1 className="text-xl md:text-h1 font-black text-on-surface flex items-center gap-sm tracking-tight">
            Report Management
          </h1>
          <p className="text-on-surface-variant text-xs md:text-body-md mt-1">
            Comprehensive analytics and report insights for customers, orders, and domains.
          </p>
        </div>

        {/* Filter Popover Dropdown (matching design) */}
        <div className="relative shrink-0 self-end md:self-auto" ref={filterPopoverRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen(prev => !prev)}
            className={`h-[42px] px-4 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer shadow-xs ${
              isFilterOpen
                ? "bg-primary text-on-primary border-primary shadow-sm"
                : "bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filter
            {filterMode !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-lowest"></span>
            )}
          </button>

          {/* Filter Popover Card */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              {/* Caret Arrow Notch */}
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-surface-container-lowest border-t border-l border-outline-variant/60 rotate-45"></div>

              {/* Filter Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">Filter Range</label>
                <div className="relative">
                  <select
                    value={filterMode}
                    onChange={(e) => {
                      setFilterMode(e.target.value);
                      setCustomerPage(1);
                      setOrderPage(1);
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8"
                  >
                    <option value="year">📅 Year-wise</option>
                    <option value="month">📆 Month-wise</option>
                    <option value="all">🌐 All Time</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Year Select (if year or month mode) */}
              {(filterMode === 'month' || filterMode === 'year') && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-on-surface">Year</label>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setCustomerPage(1);
                        setOrderPage(1);
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
              )}

              {/* Month Select (if month mode) */}
              {filterMode === 'month' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-on-surface">Month</label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setCustomerPage(1);
                        setOrderPage(1);
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8"
                    >
                      {monthNames.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('all');
                    setSelectedYear(currentYearStr);
                    setSelectedMonth(currentMonthStr);
                    setCustomerPage(1);
                    setOrderPage(1);
                  }}
                  className="w-1/2 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl border border-outline-variant transition-colors cursor-pointer text-center"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="w-1/2 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl shadow-md hover:bg-primary/90 transition-colors cursor-pointer text-center"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-md">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-on-surface-variant font-bold text-sm">Generating Report Analytics...</p>
        </div>
      ) : (
        <>
          {/* Top Key Metrics Display (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md md:gap-lg">
            {/* Card 1: Total Customers */}
            <div
              onClick={() => setActiveTab('customers')}
              className={`bg-surface-container-lowest border rounded-2xl p-md md:p-lg shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${activeTab === 'customers' ? 'ring-2 ring-blue-500 border-transparent' : 'border-outline-variant'
                }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">
                  Total Customers
                </span>
                <div className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                  {reportData.totalCustomersCount.toLocaleString()}
                </div>
                <span className="inline-block text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {filterMode === 'month'
                    ? `${monthNames.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
                    : filterMode === 'year'
                      ? `Year ${selectedYear}`
                      : 'All Time'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
            </div>

            {/* Card 2: Total Orders */}
            <div
              onClick={() => setActiveTab('orders')}
              className={`bg-surface-container-lowest border rounded-2xl p-md md:p-lg shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${activeTab === 'orders' ? 'ring-2 ring-purple-500 border-transparent' : 'border-outline-variant'
                }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">
                  Total Orders
                </span>
                <div className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                  {reportData.totalOrdersCount.toLocaleString()}
                </div>
                <span className="inline-block text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  Orders Processed
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
              </div>
            </div>

            {/* Card 3: Active Domains Only */}
            <div
              onClick={() => setActiveTab('activeDomains')}
              className={`bg-surface-container-lowest border rounded-2xl p-md md:p-lg shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${activeTab === 'activeDomains' ? 'ring-2 ring-emerald-500 border-transparent' : 'border-outline-variant'
                }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">
                  Active Domains
                </span>
                <div className="text-2xl md:text-3xl font-black text-emerald-500 tracking-tight">
                  {reportData.activeDomainsCount.toLocaleString()}
                </div>
                <span className="inline-block text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Active Services
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
              </div>
            </div>

            {/* Card 4: Deactive Domains Only */}
            <div
              onClick={() => setActiveTab('deactiveDomains')}
              className={`bg-surface-container-lowest border rounded-2xl p-md md:p-lg shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${activeTab === 'deactiveDomains' ? 'ring-2 ring-rose-500 border-transparent' : 'border-outline-variant'
                }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">
                  Deactive Domains
                </span>
                <div className="text-2xl md:text-3xl font-black text-rose-500 tracking-tight">
                  {reportData.deactiveDomainsCount.toLocaleString()}
                </div>
                <span className="inline-block text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  Deactivated Services
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">cancel</span>
              </div>
            </div>
          </div>

          {/* Professional Curved Analytics Line Graph Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-xl space-y-md shadow-sm overflow-visible relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant/30 pb-md">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    analytics
                  </span>
                  Analysis Report
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Smooth Bezier curves showing trends for{' '}
                  {filterMode === 'year'
                    ? `Year ${selectedYear}`
                    : filterMode === 'month'
                      ? `${monthNames.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
                      : 'All Time Period'}
                </p>
              </div>

              {/* Interactive Series Filter Toggles */}
              <div className="flex flex-wrap items-center gap-4">
                {seriesDefs.map((series) => {
                  const isActive = visibleSeries[series.key];
                  return (
                    <button
                      key={series.key}
                      type="button"
                      onClick={() => toggleSeries(series.key)}
                      className={`flex items-center gap-2 py-1 transition-all cursor-pointer text-xs font-bold ${isActive
                        ? 'text-on-surface'
                        : 'opacity-40 hover:opacity-80 text-on-surface-variant'
                        }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: series.color }}
                      ></span>
                      <span>{series.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Professional SVG Curved Line Graph Container */}
            <div className="relative pt-sm pb-sm overflow-x-auto custom-scrollbar">
              <div className="min-w-[680px] w-full relative">
                {/* Floating Interactive Hover Tooltip Clamped Safely inside Graph Container */}
                {hoveredPointIdx !== null && buckets[hoveredPointIdx] && (() => {
                  const rawLeft = (getX(hoveredPointIdx) / svgWidth) * 100;
                  // Clamp tooltip left position between 12% and 88% to prevent edge clipping
                  const clampedLeft = Math.max(12, Math.min(88, rawLeft));

                  return (
                    <div
                      className="absolute top-2 bg-surface-container-lowest text-on-surface text-[10px] p-3 rounded-2xl shadow-xl z-30 pointer-events-none whitespace-nowrap space-y-1.5 transform -translate-x-1/2 border border-outline-variant/60 backdrop-blur-md"
                      style={{
                        left: `${clampedLeft}%`,
                      }}
                    >
                      <div className="font-black border-b border-outline-variant/30 pb-1 text-on-surface flex items-center justify-between gap-3">
                        <span>
                          {filterMode === 'month'
                            ? `Day ${buckets[hoveredPointIdx].label}`
                            : filterMode === 'all'
                              ? `Year ${buckets[hoveredPointIdx].label}`
                              : buckets[hoveredPointIdx].label}
                        </span>
                        <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">
                          {filterMode === 'month' ? 'Daily Details' : filterMode === 'all' ? 'Yearly Details' : 'Monthly Details'}
                        </span>
                      </div>
                      {visibleSeries.activeDomains && (
                        <div className="flex justify-between gap-5 text-emerald-600 font-bold">
                          <span>Active Domains:</span>
                          <span className="font-black text-emerald-700">{buckets[hoveredPointIdx].activeDomains}</span>
                        </div>
                      )}
                      {visibleSeries.customers && (
                        <div className="flex justify-between gap-5 text-blue-600 font-bold">
                          <span>Customers:</span>
                          <span className="font-black text-blue-700">{buckets[hoveredPointIdx].customers}</span>
                        </div>
                      )}
                      {visibleSeries.orders && (
                        <div className="flex justify-between gap-5 text-purple-600 font-bold">
                          <span>Orders:</span>
                          <span className="font-black text-purple-700">{buckets[hoveredPointIdx].orders}</span>
                        </div>
                      )}
                      {visibleSeries.deactiveDomains && (
                        <div className="flex justify-between gap-5 text-rose-600 font-bold">
                          <span>Deactive Domains:</span>
                          <span className="font-black text-rose-700">{buckets[hoveredPointIdx].deactiveDomains}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-[320px] overflow-visible"
                >
                  <defs>
                    {/* Soft Professional Area Gradients */}
                    {seriesDefs.map((series) => (
                      <linearGradient
                        key={series.gradientId}
                        id={series.gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={series.color} stopOpacity="0.28" />
                        <stop offset="70%" stopColor={series.color} stopOpacity="0.05" />
                        <stop offset="100%" stopColor={series.color} stopOpacity="0.0" />
                      </linearGradient>
                    ))}

                    {/* Glowing Filters */}
                    {seriesDefs.map((series) => (
                      <filter
                        key={series.filterId}
                        id={series.filterId}
                        x="-10%"
                        y="-10%"
                        width="120%"
                        height="120%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="3"
                          stdDeviation="3"
                          floodColor={series.color}
                          floodOpacity="0.4"
                        />
                      </filter>
                    ))}
                  </defs>

                  {/* Vertical Hover Line Indicator */}
                  {hoveredPointIdx !== null && (
                    <line
                      x1={getX(hoveredPointIdx)}
                      y1={paddingY}
                      x2={getX(hoveredPointIdx)}
                      y2={svgHeight - paddingY}
                      stroke="currentColor"
                      className="text-primary/40"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const yVal = svgHeight - paddingY - ratio * chartH;
                    const gridVal = Math.round(ratio * maxChartValue);
                    return (
                      <g key={i}>
                        <line
                          x1={paddingX}
                          y1={yVal}
                          x2={svgWidth - paddingX}
                          y2={yVal}
                          stroke="currentColor"
                          className="text-outline-variant/20"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 12}
                          y={yVal + 4}
                          className="text-[10px] fill-on-surface-variant font-bold text-right"
                          textAnchor="end"
                        >
                          {gridVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Render Curved Area & Lines for Active Series */}
                  {seriesDefs.map((series) => {
                    if (!visibleSeries[series.key]) return null;

                    const pts = buckets.map((b, i) => ({
                      x: getX(i),
                      y: getY(b[series.key]),
                    }));

                    const curveD = createCurvedPath(pts);
                    const areaD = createCurvedAreaPath(pts, svgHeight - paddingY);

                    return (
                      <g key={series.key}>
                        {/* Soft Area Gradient Fill */}
                        <path d={areaD} fill={`url(#${series.gradientId})`} />

                        {/* Smooth Curved Line Path with Glow Filter */}
                        <path
                          d={curveD}
                          fill="none"
                          stroke={series.color}
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter={`url(#${series.filterId})`}
                        />
                      </g>
                    );
                  })}

                  {/* Interactive Column Hover Triggers (Clean line without static dots) */}
                  {buckets.map((b, i) => {
                    const cx = getX(i);
                    const colWidth = numBuckets > 1 ? chartW / numBuckets : chartW;
                    return (
                      <rect
                        key={`hover-col-${i}`}
                        x={cx - colWidth / 2}
                        y={paddingY}
                        width={colWidth}
                        height={chartH}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIdx(i)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                      />
                    );
                  })}

                  {/* X-Axis Month / Day Labels */}
                  {buckets.map((b, i) => {
                    const cx = getX(i);
                    const isSparse = filterMode === 'month' && numBuckets > 20;
                    const showLabel = !isSparse || i % 2 === 0 || i === numBuckets - 1;

                    if (!showLabel) return null;

                    return (
                      <text
                        key={i}
                        x={cx}
                        y={svgHeight - 12}
                        className={`text-[10px] font-bold text-center ${hoveredPointIdx === i
                          ? 'fill-primary font-black text-[11px]'
                          : 'fill-on-surface-variant'
                          }`}
                        textAnchor="middle"
                      >
                        {b.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Tabs: Customer List vs Order List */}
          <div className="space-y-md">
            {/* Tab Navigation Header & Search Bar */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-lg space-y-md shadow-sm">
              {/* 4 Tabs Buttons */}
              <div className="border-b border-outline-variant/30 pb-md">
                <div className="flex flex-wrap items-center justify-between gap-xs bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('customers');
                      setCustomerPage(1);
                    }}
                    className={`flex items-center gap-2 px-md md:px-lg py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer ${activeTab === 'customers'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>Customer List ({searchedCustomers.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderPage(1);
                    }}
                    className={`flex items-center gap-2 px-md md:px-lg py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer ${activeTab === 'orders'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                    <span>Order List ({searchedOrders.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('activeDomains');
                      setActiveDomainPage(1);
                    }}
                    className={`flex items-center gap-2 px-md md:px-lg py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer ${activeTab === 'activeDomains'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Active Domains ({searchedActiveDomains.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('deactiveDomains');
                      setDeactiveDomainPage(1);
                    }}
                    className={`flex items-center gap-2 px-md md:px-lg py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer ${activeTab === 'deactiveDomains'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    <span>Deactive Domains ({searchedDeactiveDomains.length})</span>
                  </button>
                </div>
              </div>

              {/* Quick Search Input & Export Button Bar */}
              <div className="pt-xs flex flex-col sm:flex-row sm:items-center justify-between gap-md">
                <div className="relative min-w-[240px] max-w-md w-full">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCustomerPage(1);
                      setOrderPage(1);
                      setActiveDomainPage(1);
                      setDeactiveDomainPage(1);
                    }}
                    placeholder={
                      activeTab === 'customers'
                        ? 'Search customer by name, email, phone...'
                        : activeTab === 'orders'
                          ? 'Search order by domain, service, customer...'
                          : activeTab === 'activeDomains'
                            ? 'Search active domain URL, customer...'
                            : 'Search deactive domain URL, customer...'
                    }
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-md py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>

                {/* Export Excel Button for Active Tab */}
                <button
                  type="button"
                  onClick={exportSelectedTabExcel}
                  className="flex items-center gap-2 px-md py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">file_download</span>
                  <span>
                    Export Excel (
                    {activeTab === 'customers'
                      ? 'Customers'
                      : activeTab === 'orders'
                        ? 'Orders'
                        : activeTab === 'activeDomains'
                          ? 'Active Domains'
                          : 'Deactive Domains'}
                    )
                  </span>
                </button>
              </div>

              {/* Tab 1 Content: Customer List */}
              {activeTab === 'customers' && (
                <div className="space-y-md">
                  <div className="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/30">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant/30 text-[11px] uppercase font-label-caps text-on-surface-variant">
                          <th className="px-md py-3">Created Date</th>
                          <th className="px-md py-3">Customer Name</th>
                          <th className="px-md py-3">Contact Email</th>
                          <th className="px-md py-3">Phone</th>
                          <th className="px-md py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 text-xs">
                        {paginatedCustomers.length === 0 ? (
                          <tr>
                            <td
                              colSpan="9"
                              className="px-md py-12 text-center text-on-surface-variant italic"
                            >
                              No customer records match the selected filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedCustomers.map((cust) => (
                            <tr
                              key={cust.customerId}
                              className="hover:bg-surface-container-low transition-colors"
                            >
                              <td className="px-md py-3.5 font-medium text-on-surface-variant">
                                {formatDate(cust.createdAt)}
                              </td>
                              <td className="px-md py-3.5 font-bold text-on-surface">
                                {cust.name}
                              </td>
                              <td className="px-md py-3.5 font-medium text-on-surface-variant">
                                {cust.email}
                              </td>
                              <td className="px-md py-3.5 font-medium text-on-surface-variant">
                                {cust.phone}
                              </td>
                              <td className="px-md py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate('/customers', {
                                      state: { customerId: cust.customerId, editMode: true },
                                    })
                                  }
                                  title="Edit Customer"
                                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    visibility
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Customer Pagination */}
                  {searchedCustomers.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-xs text-xs font-bold">
                      <span className="text-on-surface-variant">
                        Showing {(customerPage - 1) * PAGE_SIZE + 1} to{' '}
                        {Math.min(customerPage * PAGE_SIZE, searchedCustomers.length)} of{' '}
                        {searchedCustomers.length} customers
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                          disabled={customerPage === 1}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-on-surface-variant">
                          Page {customerPage} of {totalCustomerPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomerPage((p) => Math.min(totalCustomerPages, p + 1))
                          }
                          disabled={customerPage >= totalCustomerPages}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2 Content: Order List */}
              {activeTab === 'orders' && (
                <div className="space-y-md">
                  <div className="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/30">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant/30 text-[11px] uppercase font-label-caps text-on-surface-variant">
                          <th className="px-md py-3">Order Date</th>
                          <th className="px-md py-3">Customer</th>
                          <th className="px-md py-3">Services / Products</th>
                          <th className="px-md py-3">Domain</th>
                          <th className="px-md py-3 text-right">Total Price</th>
                          <th className="px-md py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 text-xs">
                        {paginatedOrders.length === 0 ? (
                          <tr>
                            <td
                              colSpan="9"
                              className="px-md py-12 text-center text-on-surface-variant italic"
                            >
                              No order records match the selected filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedOrders.map((ord) => (
                            <tr
                              key={ord.orderId}
                              className="hover:bg-surface-container-low transition-colors"
                            >
                              <td className="px-md py-3.5 font-bold text-on-surface">
                                {formatDate(ord.orderDate)}
                              </td>
                              <td className="px-md py-3.5 font-bold text-on-surface">
                                <div>{ord.customerName}</div>
                                <div className="text-[10px] text-on-surface-variant font-medium">
                                  {ord.email}
                                </div>
                              </td>
                              <td className="px-md py-3.5 font-bold text-on-surface">
                                <div className="flex flex-wrap gap-1">
                                  {ord.products.map((p, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className={`inline-block px-2 py-0.5 rounded text-[10px] ${p.deactive
                                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                        : 'bg-surface-container-high text-on-surface'
                                        }`}
                                    >
                                      {p.product}
                                      {p.deactive ? ' (Deactive)' : ''}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-md py-3.5 font-bold text-primary">
                                {ord.domainUrl ? (
                                  <a
                                    href={
                                      ord.domainUrl.startsWith('http')
                                        ? ord.domainUrl
                                        : `http://${ord.domainUrl}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {ord.domainUrl}
                                  </a>
                                ) : (
                                  <span className="text-on-surface-variant/40">—</span>
                                )}
                              </td>
                              <td className="px-md py-3.5 text-right font-black text-on-surface">
                                ₹{ord.totalPrice.toLocaleString()}
                              </td>
                              <td className="px-md py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate('/customers', {
                                      state: { customerId: ord.customerId, editMode: true },
                                    })
                                  }
                                  title="Edit Customer"
                                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    visibility
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Pagination */}
                  {searchedOrders.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-xs text-xs font-bold">
                      <span className="text-on-surface-variant">
                        Showing {(orderPage - 1) * PAGE_SIZE + 1} to{' '}
                        {Math.min(orderPage * PAGE_SIZE, searchedOrders.length)} of{' '}
                        {searchedOrders.length} orders
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                          disabled={orderPage === 1}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-on-surface-variant">
                          Page {orderPage} of {totalOrderPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setOrderPage((p) => Math.min(totalOrderPages, p + 1))
                          }
                          disabled={orderPage >= totalOrderPages}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3 Content: Active Domains List */}
              {activeTab === 'activeDomains' && (
                <div className="space-y-md">
                  <div className="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/30">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant/30 text-[11px] uppercase font-label-caps text-on-surface-variant">
                          <th className="px-md py-3">Create Date</th>
                          <th className="px-md py-3">Domain URL</th>
                          <th className="px-md py-3">Customer Name</th>
                          <th className="px-md py-3">Start Date</th>
                          <th className="px-md py-3">End Date</th>
                          <th className="px-md py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 text-xs">
                        {paginatedActiveDomains.length === 0 ? (
                          <tr>
                            <td
                              colSpan="8"
                              className="px-md py-12 text-center text-on-surface-variant italic"
                            >
                              No active domain records match the selected filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedActiveDomains.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-surface-container-low transition-colors"
                            >
                              <td className="px-md py-3.5 font-medium text-on-surface-variant">
                                {formatDate(item.orderDate)}
                              </td>
                              <td className="px-md py-3.5 font-bold text-primary">
                                {item.domainUrl && item.domainUrl !== '—' ? (
                                  <a
                                    href={
                                      item.domainUrl.startsWith('http')
                                        ? item.domainUrl
                                        : `http://${item.domainUrl}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {item.domainUrl}
                                  </a>
                                ) : (
                                  <span className="text-on-surface-variant/40">—</span>
                                )}
                              </td>
                              <td className="px-md py-3.5 font-bold text-on-surface">
                                {item.customerName}
                              </td>
                              <td className="px-md py-3.5 font-medium text-on-surface-variant">
                                {formatDate(item.startDate)}
                              </td>
                              <td className="px-md py-3.5 font-medium text-on-surface-variant">
                                {formatDate(item.endDate)}
                              </td>
                              <td className="px-md py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate('/customers', {
                                      state: { customerId: item.customerId, editMode: true },
                                    })
                                  }
                                  title="Edit Customer"
                                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    visibility
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Active Domain Pagination */}
                  {searchedActiveDomains.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-xs text-xs font-bold">
                      <span className="text-on-surface-variant">
                        Showing {(activeDomainPage - 1) * PAGE_SIZE + 1} to{' '}
                        {Math.min(activeDomainPage * PAGE_SIZE, searchedActiveDomains.length)} of{' '}
                        {searchedActiveDomains.length} active domains
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveDomainPage((p) => Math.max(1, p - 1))}
                          disabled={activeDomainPage === 1}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-on-surface-variant">
                          Page {activeDomainPage} of {Math.ceil(searchedActiveDomains.length / PAGE_SIZE)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveDomainPage((p) => Math.min(Math.ceil(searchedActiveDomains.length / PAGE_SIZE), p + 1))}
                          disabled={activeDomainPage >= Math.ceil(searchedActiveDomains.length / PAGE_SIZE)}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4 Content: Deactive Domains List */}
              {activeTab === 'deactiveDomains' && (
                <div className="space-y-md">
                  <div className="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/30">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant/30 text-[11px] uppercase font-label-caps text-on-surface-variant">
                          <th className="px-md py-3">Create Date</th>
                          <th className="px-md py-3">Domain URL</th>
                          <th className="px-md py-3">Customer Name</th>
                          <th className="px-md py-3">Deactivate Date</th>
                          <th className="px-md py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 text-xs">
                        {paginatedDeactiveDomains.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-md py-12 text-center text-on-surface-variant italic"
                            >
                              No deactive domain records match the selected filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedDeactiveDomains.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-surface-container-low transition-colors"
                            >
                              <td className="px-md py-3.5 font-medium text-on-surface-variant">
                                {formatDate(item.orderDate)}
                              </td>
                              <td className="px-md py-3.5 font-bold text-rose-500">
                                {item.domainUrl && item.domainUrl !== '—' ? (
                                  <a
                                    href={
                                      item.domainUrl.startsWith('http')
                                        ? item.domainUrl
                                        : `http://${item.domainUrl}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {item.domainUrl}
                                  </a>
                                ) : (
                                  <span className="text-on-surface-variant/40">—</span>
                                )}
                              </td>
                              <td className="px-md py-3.5 font-bold text-on-surface">
                                {item.customerName}
                              </td>
                              <td className="px-md py-3.5 font-bold text-rose-500">
                                {/* Strictly the deactivate date — no fallback to endDate */}
                                {formatDeactiveDate(item.deactiveDate || item.deactiveYear)}
                              </td>
                              <td className="px-md py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate('/customers', {
                                      state: { customerId: item.customerId, editMode: true },
                                    })
                                  }
                                  title="Edit Customer"
                                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    visibility
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Deactive Domain Pagination */}
                  {searchedDeactiveDomains.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-xs text-xs font-bold">
                      <span className="text-on-surface-variant">
                        Showing {(deactiveDomainPage - 1) * PAGE_SIZE + 1} to{' '}
                        {Math.min(deactiveDomainPage * PAGE_SIZE, searchedDeactiveDomains.length)} of{' '}
                        {searchedDeactiveDomains.length} deactive domains
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeactiveDomainPage((p) => Math.max(1, p - 1))}
                          disabled={deactiveDomainPage === 1}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-on-surface-variant">
                          Page {deactiveDomainPage} of {Math.ceil(searchedDeactiveDomains.length / PAGE_SIZE)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeactiveDomainPage((p) => Math.min(Math.ceil(searchedDeactiveDomains.length / PAGE_SIZE), p + 1))}
                          disabled={deactiveDomainPage >= Math.ceil(searchedDeactiveDomains.length / PAGE_SIZE)}
                          className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportManagement;