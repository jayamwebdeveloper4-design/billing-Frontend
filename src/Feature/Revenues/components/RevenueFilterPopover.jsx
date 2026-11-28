import React from 'react';
import { RotateCcw } from 'lucide-react';
import Button from '../../../UI/Components/Button';

export const RevenueFilterPopover = ({
  isOpen,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-40">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Date Range Filter
        </span>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
        <Button variant="primary" size="sm" onClick={onClose}>
          Apply
        </Button>
      </div>
    </div>
  );
};

export default RevenueFilterPopover;

