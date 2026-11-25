import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, ArrowLeft, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import SearchBar from '../../../UI/Components/SearchBar';
import Table from '../../../UI/Components/Table';
import Header from '../../../UI/LayoutComponents/Header';
import AddPlan from './AddPlan';
import { useUpdateSubCategoryMutation } from '../../../Redux/Product';

export const Manageplan = ({
  category,
  subCategory,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [editingPlanIndex, setEditingPlanIndex] = useState(null);

  // Delete Confirmation State
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);

  const [updateSubCategory, { isLoading: isSaving }] = useUpdateSubCategoryMutation();

  const plans = subCategory?.plans || [];

  // Filtered plans
  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const q = searchQuery.toLowerCase().trim();
    return plans.filter((p) => p.name?.toLowerCase().includes(q));
  }, [plans, searchQuery]);

  // Handle Open Add
  const handleOpenAdd = () => {
    setEditingPlanIndex(null);
    setIsAddPlanModalOpen(true);
  };

  // Handle Open Edit
  const handleOpenEdit = (plan, idx) => {
    setEditingPlanIndex(idx);
    setIsAddPlanModalOpen(true);
  };

  // Handle Save (Add or Update)
  const handleSavePlan = async (planPayload) => {
    try {
      const currentPlans = [...plans];
      if (editingPlanIndex !== null) {
        currentPlans[editingPlanIndex] = planPayload;
      } else {
        currentPlans.push(planPayload);
      }

      await updateSubCategory({
        categoryId: category._id,
        subCategoryId: subCategory._id || subCategory.id,
        name: subCategory.name,
        oneTimePayment: subCategory.oneTimePayment,
        hasPlan: true,
        hasRenewal: subCategory.hasRenewal,
        plans: currentPlans,
      }).unwrap();

      toast.success(editingPlanIndex !== null ? 'Plan updated successfully!' : 'Plan added successfully!');
      setIsAddPlanModalOpen(false);
      setEditingPlanIndex(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || err?.message || 'Failed to save plan');
    }
  };

  // Handle Delete Plan
  const handleConfirmDelete = async () => {
    if (deleteTargetIndex === null) return;
    try {
      const currentPlans = plans.filter((_, idx) => idx !== deleteTargetIndex);

      await updateSubCategory({
        categoryId: category._id,
        subCategoryId: subCategory._id || subCategory.id,
        name: subCategory.name,
        oneTimePayment: subCategory.oneTimePayment,
        hasPlan: true,
        hasRenewal: subCategory.hasRenewal,
        plans: currentPlans,
      }).unwrap();

      toast.success('Plan deleted successfully!');
      setDeleteTargetIndex(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || err?.message || 'Failed to delete plan');
    }
  };

  // Table Columns
  const columns = [
    {
      key: 'name',
      label: 'Plan Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
            {row.name?.slice(0, 2)?.toUpperCase() || 'PL'}
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm block">{row.name}</span>
            <span className="text-[11px] text-gray-500">Tier Configuration</span>
          </div>
        </div>
      ),
    },
    {
      key: 'pricing',
      label: 'Initial Purchase (₹)',
      render: (row) => {
        const cost = Number(row.costPrice) || 0;
        const sell = Number(row.sellerPrice) || 0;
        const margin = sell - cost;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Sell:</span>
              <span className="font-bold text-gray-900">₹{sell.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400">Cost: ₹{cost.toLocaleString('en-IN')}</span>
              <span className={`font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                (+₹{margin.toLocaleString('en-IN')})
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'renewal',
      label: 'Renewal Pricing (₹)',
      render: (row) => {
        if (row.hasRenewal === false || subCategory.hasRenewal === false) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
              No Renewal
            </span>
          );
        }
        const costRen = Number(row.costPriceRenewal) || 0;
        const sellRen = Number(row.sellerPriceRenewal) || 0;
        const marginRen = sellRen - costRen;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Sell:</span>
              <span className="font-bold text-emerald-800">₹{sellRen.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400">Cost: ₹{costRen.toLocaleString('en-IN')}</span>
              <span className={`font-semibold ${marginRen >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                (+₹{marginRen.toLocaleString('en-IN')})
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Renewal Type',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            row.hasRenewal !== false
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          {row.hasRenewal !== false ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Recurring Renewal
            </>
          ) : (
            'One-Time Only'
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row, idx) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => handleOpenEdit(row, idx)}
            className="text-gray-600 hover:text-blue-600"
         />
          
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setDeleteTargetIndex(idx)}
            className="text-gray-500 hover:text-red-600"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <Header
        title={`${subCategory.name} — Pricing Plans`}
        subtitle={`Configure tiered service packages and renewal rates for category: ${category.name}`}
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="md" icon={ArrowLeft} onClick={onBack}>
              Back to Sub-Categories
            </Button>
            <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
              Add Plan
            </Button>
          </div>
        }
      />

      {/* Search and Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search plan by name..."
          className="max-w-md w-full"
        />
        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2 self-end sm:self-center">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
          <span>{plans.length} total plan tiers configured</span>
        </div>
      </div>

      {/* Plans Table */}
      <Table
        columns={columns}
        data={filteredPlans}
        emptyMessage={
          searchQuery
            ? 'No plans match your search query.'
            : 'No plans created yet. Click "Add Plan" to configure your first package.'
        }
        keyField="name"
      />

      {/* Add / Edit Plan Modal */}
      {isAddPlanModalOpen && (
        <AddPlan
          isOpen={isAddPlanModalOpen}
          onClose={() => setIsAddPlanModalOpen(false)}
          onSave={handleSavePlan}
          initialData={editingPlanIndex !== null ? plans[editingPlanIndex] : null}
          isSaving={isSaving}
          parentHasRenewal={subCategory.hasRenewal !== false}
          subCategoryName={subCategory.name}
        />
      )}

      {/* Delete Plan Confirmation Modal */}
      {deleteTargetIndex !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete Pricing Plan?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete <strong className="text-gray-800">{plans[deleteTargetIndex]?.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="md" onClick={() => setDeleteTargetIndex(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={handleConfirmDelete} loading={isSaving}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manageplan;

