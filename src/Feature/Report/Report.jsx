import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../../UI/LayoutComponents/Header';
import { useGetReportDataQuery } from '../../Redux/Report';
import {
  ReportAnalyticsChart,
  ReportDataSection,
} from './components';

const MONTH_OPTIONS = [
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

export const Report = () => {
  const currentDate = new Date();
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');

  // Filter States
  const [filterMode, setFilterMode] = useState('year'); // 'month' | 'year' | 'all'
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const queryParams = useMemo(() => {
    if (filterMode === 'all') return { filterMode: 'all' };
    if (filterMode === 'month') {
      return { filterMode: 'month', year: selectedYear, month: selectedMonth };
    }
    return { filterMode: 'year', year: selectedYear };
  }, [filterMode, selectedYear, selectedMonth]);

  const {
    data: reportRes,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetReportDataQuery(queryParams);

  useEffect(() => {
    if (isError) {
      toast.error(error?.data?.message || 'Failed to load report data');
    }
  }, [isError, error]);

  const buckets = useMemo(
    () => (Array.isArray(reportRes?.buckets) ? reportRes.buckets : []),
    [reportRes]
  );
  const customers = useMemo(
    () => (Array.isArray(reportRes?.customers) ? reportRes.customers : []),
    [reportRes]
  );
  const orders = useMemo(
    () => (Array.isArray(reportRes?.orders) ? reportRes.orders : []),
    [reportRes]
  );
  const activeDomains = useMemo(
    () => (Array.isArray(reportRes?.activeDomains) ? reportRes.activeDomains : []),
    [reportRes]
  );
  const deactiveDomains = useMemo(
    () => (Array.isArray(reportRes?.deactiveDomains) ? reportRes.deactiveDomains : []),
    [reportRes]
  );
  const availableYears = useMemo(
    () =>
      Array.isArray(reportRes?.availableYears) && reportRes.availableYears.length > 0
        ? reportRes.availableYears
        : [currentYearStr],
    [reportRes, currentYearStr]
  );

  const handleResetFilters = () => {
    setFilterMode('all');
    setSelectedYear(currentYearStr);
    setSelectedMonth(currentMonthStr);
  };

  return (
    <div className="space-y-lg md:space-y-xl bg-background min-h-full">
      {/* Page Header + Separate Month / Year Controls */}
      <Header
        title="Report Management"
        subtitle="Comprehensive analytics and report insights for customers, orders, and domains."
        action={
          <div className="flex flex-wrap items-center gap-sm shrink-0">
            {/* Month Select (shown when Month mode is active) */}
            {filterMode === 'month' && (
              <div className="relative">
                <select
                  aria-label="Select Month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">
                  expand_more
                </span>
              </div>
            )}

            {/* Year Select (shown when Month or Year mode is active) */}
            {(filterMode === 'month' || filterMode === 'year') && (
              <div className="relative">
                <select
                  aria-label="Select Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">
                  expand_more
                </span>
              </div>
            )}

            {/* Separate Mode Buttons: Month | Year | All */}
            <div className="inline-flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  filterMode === 'month'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('year')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  filterMode === 'year'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Year
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  filterMode === 'all'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All
              </button>
            </div>
          </div>
        }
      />

      {/* Analytics Line Chart (no KPI cards) */}
      <ReportAnalyticsChart
        buckets={buckets}
        subtitle={
          filterMode === 'year'
            ? `Trends for Year ${selectedYear}`
            : filterMode === 'month'
              ? `Trends for ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
              : 'Trends for All Time Period'
        }
      />

      {/* Tabbed Data Section */}
      <ReportDataSection
        customers={customers}
        orders={orders}
        activeDomains={activeDomains}
        deactiveDomains={deactiveDomains}
        isLoading={isLoading || isFetching}
        hasActiveFilters={filterMode !== 'all'}
        onResetFilters={handleResetFilters}
        onExportExcel={() => {}}
      />
    </div>
  );
};

export default Report;

