import React, { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Layers,
  FolderTree,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import SearchBar from '../../../UI/Components/SearchBar';
import Table from '../../../UI/Components/Table';
import Header from '../../../UI/LayoutComponents/Header';
import InputFeild from '../../../UI/Components/InputFeild';
import {
  useAddSubCategoryMutation,
  useUpdateSubCategoryMutation,
  useDeleteSubCategoryMutation,
} from '../../../Redux/Product';

export const SubCatagary = ({
  category,
  onBack,
  onManagePlans,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit SubCategory
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubCat, setEditingSubCat] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    pricingType: 'simple', // 'simple' | 'plans' | 'onetime'
    hasRenewal: true,
    costPrice: '',
    costPriceRenewal: '',
    sellerPrice: '',
    sellerPriceRenewal: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // RTK Query Mutations
  const [addSubCategory, { isLoading: isAdding }] = useAddSubCategoryMutation();
  const [updateSubCategory, { isLoading: isUpdating }] = useUpdateSubCategoryMutation();
  const [deleteSubCategory, { isLoading: isDeleting }] = useDeleteSubCategoryMutation();

  const isSaving = isAdding || isUpdating;

  const subCategories = category?.subCategories || [];

  // Filter Sub-Categories
  const filteredSubCats = useMemo(() => {
    if (!searchQuery.trim()) return subCategories;
    const q = searchQuery.toLowerCase().trim();
    return subCategories.filter(
      (sc) =>
        sc.name?.toLowerCase().includes(q) ||
        sc.plans?.some((p) => p.name?.toLowerCase().includes(q))
    );
  }, [subCategories, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSubCat(null);
    setFormData({
      name: '',
      pricingType: 'simple',
      hasRenewal: true,
      costPrice: '',
      costPriceRenewal: '',
      sellerPrice: '',
      sellerPriceRenewal: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sc) => {
    setEditingSubCat(sc);
    let type = 'simple';
    if (sc.oneTimePayment) type = 'onetime';
    else if (sc.hasPlan) type = 'plans';

    setFormData({
      name: sc.name || '',
      pricingType: type,
      hasRenewal: !sc.oneTimePayment && sc.hasRenewal !== false,
      costPrice: sc.costPrice != null ? String(sc.costPrice) : '',
      costPriceRenewal: sc.costPriceRenewal != null ? String(sc.costPriceRenewal) : '',
      sellerPrice: sc.sellerPrice != null ? String(sc.sellerPrice) : '',
      sellerPriceRenewal: sc.sellerPriceRenewal != null ? String(sc.sellerPriceRenewal) : '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Handle Form Change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Handle Save
  const handleSaveSubCategory = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!formData.name.trim()) {
      errs.name = 'Sub-Category name is required';
    }

    if (formData.pricingType === 'simple') {
      if (formData.sellerPrice === '' || isNaN(Number(formData.sellerPrice)) || Number(formData.sellerPrice) < 0) {
        errs.sellerPrice = 'Selling price is required';
      }
      if (formData.costPrice !== '' && (isNaN(Number(formData.costPrice)) || Number(formData.costPrice) < 0)) {
        errs.costPrice = 'Cost price cannot be negative';
      }
      if (formData.hasRenewal) {
        if (formData.sellerPriceRenewal !== '' && (isNaN(Number(formData.sellerPriceRenewal)) || Number(formData.sellerPriceRenewal) < 0)) {
          errs.sellerPriceRenewal = 'Renewal price cannot be negative';
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const isOneTime = formData.pricingType === 'onetime';
    const isPlan = formData.pricingType === 'plans';
    const hasRen = !isOneTime && Boolean(formData.hasRenewal);

    const payload = {
      name: formData.name.trim(),
      oneTimePayment: isOneTime,
      hasPlan: isPlan,
      hasRenewal: hasRen,
      costPrice: !isOneTime && !isPlan ? Number(formData.costPrice) || 0 : null,
      sellerPrice: !isOneTime && !isPlan ? Number(formData.sellerPrice) || 0 : null,
      costPriceRenewal: !isOneTime && !isPlan && hasRen ? Number(formData.costPriceRenewal) || 0 : null,
      sellerPriceRenewal: !isOneTime && !isPlan && hasRen ? Number(formData.sellerPriceRenewal) || 0 : null,
    };

    try {
      if (editingSubCat) {
        const subId = editingSubCat._id || editingSubCat.id;
        await updateSubCategory({
          categoryId: category._id,
          subCategoryId: subId,
          ...payload,
        }).unwrap();
        toast.success('Sub-Category updated successfully!');
      } else {
        await addSubCategory({
          categoryId: category._id,
          ...payload,
        }).unwrap();
        toast.success('Sub-Category created successfully!');
      }
      setIsModalOpen(false);
      setEditingSubCat(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || err?.message || 'Failed to save sub-category');
    }
  };

  // Handle Delete Confirm
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const subId = deleteTarget._id || deleteTarget.id;
      await deleteSubCategory({
        categoryId: category._id,
        subCategoryId: subId,
      }).unwrap();
      toast.success('Sub-Category deleted successfully!');
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || err?.message || 'Failed to delete sub-category');
    }
  };

  // Table Columns
  const columns = [
    {
      key: 'name',
      label: 'Sub-Category Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm block">{row.name}</span>
            <span className="text-[11px] text-gray-500">Service sub-type</span>
          </div>
        </div>
      ),
    },
    {
      key: 'pricingModel',
      label: 'Pricing Model',
      render: (row) => {
        if (row.oneTimePayment) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <CreditCard className="w-3.5 h-3.5" /> One-Time Setup
            </span>
          );
        }
        if (row.hasPlan) {
          const count = row.plans?.length || 0;
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Layers className="w-3.5 h-3.5" /> Tiered Plans ({count})
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fixed Single Price
          </span>
        );
      },
    },
    {
      key: 'priceInfo',
      label: 'Price & Margins (₹)',
      render: (row) => {
        if (row.oneTimePayment) {
          return <span className="text-xs text-gray-500 italic">Charged upon order</span>;
        }
        if (row.hasPlan) {
          const count = row.plans?.length || 0;
          return (
            <span className="text-xs text-blue-600 font-semibold">
              {count > 0 ? `${count} plans configured` : 'No plans yet'}
            </span>
          );
        }
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
      label: 'Renewal Cycle',
      render: (row) => {
        if (row.oneTimePayment || row.hasRenewal === false) {
          return (
            <span className="text-xs text-gray-400 font-medium">Non-recurring</span>
          );
        }
        if (row.hasPlan) {
          return (
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Per Plan Tier
            </span>
          );
        }
        const sellRen = Number(row.sellerPriceRenewal) || 0;
        return (
          <div className="text-xs">
            <span className="font-bold text-emerald-800">₹{sellRen.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-gray-500 block">per renewal</span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.hasPlan && (
            <Button
              variant="outline"
              size="sm"
              icon={Layers}
              onClick={() => onManagePlans(row)}
              className="text-blue-700 hover:bg-blue-50 border-blue-200"
            >
              Plans ({row.plans?.length || 0})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => handleOpenEdit(row)}
            className="text-gray-600 hover:text-blue-600"
          />
           
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setDeleteTarget(row)}
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
        title={`${category.name} — Sub-Categories`}
        subtitle={`Configure services, pricing structures, and plan tiers under ${category.name}`}
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="md" icon={ArrowLeft} onClick={onBack}>
              Back to Categories
            </Button>
            <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
              Add Sub-Category
            </Button>
          </div>
        }
      />

      {/* Search and Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search sub-category by name..."
          className="max-w-md w-full"
        />
        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2 self-end sm:self-center">
          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
          <span>{subCategories.length} sub-categories total</span>
        </div>
      </div>

      {/* Sub-Categories Table */}
      <Table
        columns={columns}
        data={filteredSubCats}
        emptyMessage={
          searchQuery
            ? 'No sub-categories match your search query.'
            : 'No sub-categories created yet. Click "Add Sub-Category" to get started.'
        }
        keyField="_id"
      />

      {/* Add / Edit Sub-Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingSubCat ? 'Edit Sub-Category' : 'Add New Sub-Category'}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Under {category.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubCategory} className="p-6 space-y-4 overflow-y-auto">
              <InputFeild
                label="Sub-Category Name"
                required
                placeholder="e.g. Linux Shared Hosting, Standard SSL, Logo Design"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={formErrors.name}
              />

              {/* Pricing Type Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-semibold text-gray-700 tracking-wider uppercase select-none">
                  Pricing & Service Model <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('pricingType', 'simple')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      formData.pricingType === 'simple'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-gray-900 block">Fixed Price</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Single rate service</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('pricingType', 'plans')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      formData.pricingType === 'plans'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-gray-900 block">Tiered Plans</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Multiple packages</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('pricingType', 'onetime')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      formData.pricingType === 'onetime'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-gray-900 block">One-Time</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">No renewals</span>
                  </button>
                </div>
              </div>

              {/* Fixed Pricing Fields */}
              {formData.pricingType === 'simple' && (
                <div className="space-y-3.5 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Enable Periodic Renewal</span>
                      <span className="text-[11px] text-gray-500">Service renews every cycle</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasRenewal}
                        onChange={(e) => handleChange('hasRenewal', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052cc]"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InputFeild
                      label="Cost Price (₹)"
                      type="number"
                      placeholder="0"
                      value={formData.costPrice}
                      onChange={(e) => handleChange('costPrice', e.target.value)}
                      error={formErrors.costPrice}
                    />
                    <InputFeild
                      label="Selling Price (₹)"
                      required
                      type="number"
                      placeholder="0"
                      value={formData.sellerPrice}
                      onChange={(e) => handleChange('sellerPrice', e.target.value)}
                      error={formErrors.sellerPrice}
                    />
                  </div>

                  {formData.hasRenewal && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <InputFeild
                        label="Renewal Cost (₹)"
                        type="number"
                        placeholder="0"
                        value={formData.costPriceRenewal}
                        onChange={(e) => handleChange('costPriceRenewal', e.target.value)}
                      />
                      <InputFeild
                        label="Renewal Selling (₹)"
                        type="number"
                        placeholder="0"
                        value={formData.sellerPriceRenewal}
                        onChange={(e) => handleChange('sellerPriceRenewal', e.target.value)}
                        error={formErrors.sellerPriceRenewal}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Plans Notice */}
              {formData.pricingType === 'plans' && (
                <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-3">
                  <Layers className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Once saved, you can click <strong className="font-bold">"Plans"</strong> in the table to define and configure multiple package tiers (e.g. Bronze, Silver, Gold) with custom pricing.
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <Button variant="outline" size="md" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" loading={isSaving}>
                  {editingSubCat ? 'Save Changes' : 'Create Sub-Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete Sub-Category?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete <strong className="text-gray-800">{deleteTarget.name}</strong> and all associated plan data?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="md" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={handleConfirmDelete} loading={isDeleting}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubCatagary;

