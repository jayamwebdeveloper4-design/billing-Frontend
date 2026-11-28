import React from 'react';
import { FileBarChart2, Plus } from 'lucide-react';
import Button from '../../../UI/Components/Button';

export const RevenueEmptyState = ({
  title = 'No revenue data found',
  description = 'There are no recorded incoming payments or billing cycles for the selected filters.',
  onAddAction,
  addLabel = 'Add First Express Entry',
  onResetFilters,
  hasActiveFilters = false,
}) => {
  return (
    <div className="py-16 px-6 text-center border-t border-slate-100 bg-white">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50/80 border border-blue-100/60 flex items-center justify-center text-blue-600">
        <FileBarChart2 className="w-8 h-8 stroke-[1.6]" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-[384px] mx-auto mt-1 mb-5">
        {description}
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {onAddAction && (
          <Button variant="primary" size="sm" icon={Plus} onClick={onAddAction}>
            {addLabel}
          </Button>
        )}
        {hasActiveFilters && onResetFilters && (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Reset Filter
          </Button>
        )}
      </div>
    </div>
  );
};

export default RevenueEmptyState;

