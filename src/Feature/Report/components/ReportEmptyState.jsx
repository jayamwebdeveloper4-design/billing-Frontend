import React from 'react';
import { BarChart3 } from 'lucide-react';
import Button from '../../../UI/Components/Button';

export const ReportEmptyState = ({
  title = 'No report records found',
  description = 'No records match the selected filter criteria or search query.',
  hasActiveFilters = false,
  onResetFilters,
}) => {
  return (
    <div className="py-12 px-md text-center bg-surface-container-lowest border-t border-outline-variant/30">
      <div className="w-14 h-14 mx-auto mb-md rounded-2xl bg-primary-fixed/40 border border-outline-variant/40 flex items-center justify-center text-primary">
        <BarChart3 className="w-7 h-7 stroke-[1.6]" />
      </div>
      <h3 className="text-body-lg font-semibold text-on-surface tracking-tight">
        {title}
      </h3>
      <p className="text-body-sm text-on-surface-variant max-w-[384px] mx-auto mt-xs mb-md">
        {description}
      </p>
      {hasActiveFilters && onResetFilters && (
        <div className="flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="border-outline-variant text-on-surface hover:bg-surface-container-low rounded-xl"
          >
            Reset Filter
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReportEmptyState;

