import React from 'react';
import Button from '../../../UI/Components/Button';

export const ReportFilterPopover = ({
  isOpen = false,
  filterMode = 'year',
  selectedYear = '',
  selectedMonth = '',
  availableYears = [],
  monthNames = [],
  onFilterModeChange,
  onYearChange,
  onMonthChange,
  onReset,
  onApply,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xl p-md space-y-md">
      {/* Caret Arrow Notch */}
      <div className="absolute -top-1.5 right-6 w-3 h-3 bg-surface-container-lowest border-t border-l border-outline-variant/60 rotate-45" />

      {/* Filter Range */}
      <div className="space-y-xs">
        <label className="block text-xs font-bold text-on-surface">
          Filter Range
        </label>
        <div className="relative">
          <select
            value={filterMode}
            onChange={(e) => onFilterModeChange?.(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8"
          >
            <option value="year">Year-wise</option>
            <option value="month">Month-wise</option>
            <option value="all">All Time</option>
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
            expand_more
          </span>
        </div>
      </div>

      {/* Year Select */}
      {(filterMode === 'month' || filterMode === 'year') && (
        <div className="space-y-xs">
          <label className="block text-xs font-bold text-on-surface">Year</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => onYearChange?.(e.target.value)}
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

      {/* Month Select */}
      {filterMode === 'month' && (
        <div className="space-y-xs">
          <label className="block text-xs font-bold text-on-surface">Month</label>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange?.(e.target.value)}
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
      <div className="flex items-center gap-sm pt-3 border-t border-outline-variant/30">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-1/2 rounded-xl border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
        >
          Clear
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onApply}
          className="w-1/2 rounded-xl bg-primary text-on-primary hover:bg-primary/90"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

export default ReportFilterPopover;

