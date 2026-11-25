import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';

// Helper: check www prefix
const hasWwwPrefix = (url) => {
  if (!url) return false;
  const clean = url.trim().replace(/^https?:\/\//i, '').toLowerCase();
  return clean.startsWith('www.');
};

// Helper: add years
const addYearsToDate = (startDate, years) => {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return d;
  const intYears = Math.floor(years);
  d.setFullYear(d.getFullYear() + intYears);
  const fracYears = years - intYears;
  if (fracYears > 0) {
    const days = Math.round(fracYears * 365.25);
    d.setDate(d.getDate() + days);
  }
  return d;
};

// Helper: calculate end date
const calculateEndDate = (startDateStr, cycle, count = 1) => {
  const d = new Date(startDateStr || new Date());
  if (isNaN(d.getTime())) return startDateStr;
  const num = Math.max(1, parseFloat(count) || 1);
  if (cycle === 'monthly') {
    d.setMonth(d.getMonth() + Math.round(num));
  } else {
    return addYearsToDate(startDateStr || new Date().toISOString().split('T')[0], num)
      .toISOString()
      .split('T')[0];
  }
  return d.toISOString().split('T')[0];
};

export const AddServicePopup = ({
  isOpen,
  onClose,
  customerName = '',
  allProducts = [],
  domainUrl = '',
  onDomainUrlChange,
  orderStartDate = '',
  onAddService,
  editingService = null,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const baseStartDate = orderStartDate || todayStr;

  // Selected Service states
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState('');
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Renewal / Validity states
  const [validationEnabled, setValidationEnabled] = useState(true);
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [cycleCount, setCycleCount] = useState(1);
  const [startDate, setStartDate] = useState(baseStartDate);
  const [endDate, setEndDate] = useState(() => calculateEndDate(baseStartDate, 'yearly', 1));

  // Deactive states
  const [isDeactive, setIsDeactive] = useState(false);
  const [deactiveDate, setDeactiveDate] = useState(todayStr);

  // Find active product object
  const activeProduct = useMemo(() => {
    return allProducts.find((p) => p.name === selectedProductName) || null;
  }, [allProducts, selectedProductName]);

  // Find active subcategory
  const activeSubCategory = useMemo(() => {
    if (!activeProduct?.subCategories?.length) return null;
    return (
      activeProduct.subCategories.find((sc) => sc.name === selectedSubCategoryName) ||
      activeProduct.subCategories[0]
    );
  }, [activeProduct, selectedSubCategoryName]);

  // Find active plan
  const activePlan = useMemo(() => {
    if (!activeSubCategory?.hasPlan || !activeSubCategory?.plans?.length) return null;
    return (
      activeSubCategory.plans.find((pl) => pl.name === selectedPlanName) ||
      activeSubCategory.plans[0]
    );
  }, [activeSubCategory, selectedPlanName]);

  // Reset or initialize on open / editingService change
  useEffect(() => {
    if (!isOpen) return;

    if (editingService) {
      setSelectedProductName(editingService.product || '');
      setSelectedSubCategoryName(editingService.subCategory || '');
      setSelectedPlanName(editingService.plan || '');
      setCustomPrice(editingService.price ?? '');
      setQuantity(editingService.quantity || 1);
      setValidationEnabled(editingService.validationEnabled !== false);
      setBillingCycle(editingService.billingCycle || 'yearly');
      setCycleCount(editingService.cycleCount || 1);
      setStartDate(editingService.startDate || baseStartDate);
      setEndDate(editingService.endDate || calculateEndDate(baseStartDate, 'yearly', 1));
      setIsDeactive(!!editingService.deactive);
      setDeactiveDate(editingService.deactiveDate || todayStr);
    } else {
      setSelectedProductName('');
      setSelectedSubCategoryName('');
      setSelectedPlanName('');
      setCustomPrice('');
      setQuantity(1);
      setValidationEnabled(true);
      setBillingCycle('yearly');
      setCycleCount(1);
      setStartDate(baseStartDate);
      setEndDate(calculateEndDate(baseStartDate, 'yearly', 1));
      setIsDeactive(false);
      setDeactiveDate(todayStr);
    }
  }, [isOpen, editingService, baseStartDate, todayStr]);

  // When selected product changes, select its first subcategory
  const handleProductChange = (prodName) => {
    setSelectedProductName(prodName);
    const prod = allProducts.find((p) => p.name === prodName);
    if (prod?.subCategories?.length) {
      const firstSub = prod.subCategories[0];
      setSelectedSubCategoryName(firstSub.name);
      if (firstSub.hasPlan && firstSub.plans?.length) {
        setSelectedPlanName(firstSub.plans[0].name);
        setCustomPrice(firstSub.plans[0].sellerPrice ?? '');
      } else {
        setSelectedPlanName('');
        setCustomPrice(firstSub.sellerPrice ?? '');
      }
      setValidationEnabled(firstSub.hasRenewal !== false);
    } else {
      setSelectedSubCategoryName('');
      setSelectedPlanName('');
      setCustomPrice('');
    }
  };

  // When subcategory changes
  const handleSubCategoryChange = (subCatName) => {
    setSelectedSubCategoryName(subCatName);
    const subCat = activeProduct?.subCategories?.find((sc) => sc.name === subCatName);
    if (subCat?.hasPlan && subCat?.plans?.length) {
      setSelectedPlanName(subCat.plans[0].name);
      setCustomPrice(subCat.plans[0].sellerPrice ?? '');
    } else {
      setSelectedPlanName('');
      setCustomPrice(subCat?.sellerPrice ?? '');
    }
    setValidationEnabled(subCat?.hasRenewal !== false);
  };

  // When plan changes
  const handlePlanChange = (planName) => {
    setSelectedPlanName(planName);
    const pl = activeSubCategory?.plans?.find((p) => p.name === planName);
    if (pl) {
      setCustomPrice(pl.sellerPrice ?? '');
    }
  };

  // Unit selling price (custom or fallback)
  const unitPrice = useMemo(() => {
    if (customPrice !== '' && customPrice !== null && !isNaN(Number(customPrice))) {
      return Number(customPrice);
    }
    if (activePlan) return activePlan.sellerPrice || 0;
    if (activeSubCategory) return activeSubCategory.sellerPrice || 0;
    return 0;
  }, [customPrice, activePlan, activeSubCategory]);

  // Total Selling Price = unitPrice * quantity
  const totalSellingPrice = useMemo(() => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    return unitPrice * qty;
  }, [unitPrice, quantity]);

  // Handle cycle count or billing cycle change
  const handleCycleChange = (newCycle) => {
    setBillingCycle(newCycle);
    setEndDate(calculateEndDate(startDate, newCycle, cycleCount));
  };

  const handleCycleCountChange = (val) => {
    const count = Math.max(1, parseFloat(val) || 1);
    setCycleCount(val);
    setEndDate(calculateEndDate(startDate, billingCycle, count));
  };

  const handleStartDateChange = (newStart) => {
    setStartDate(newStart);
    setEndDate(calculateEndDate(newStart, billingCycle, cycleCount));
  };

  // Form submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedProductName) {
      toast.error('Please choose a service');
      return;
    }

    if (!domainUrl?.trim()) {
      toast.error('Domain URL / Name is required');
      return;
    }

    if (hasWwwPrefix(domainUrl)) {
      toast.error('Please remove www. from Domain URL / Name');
      return;
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    // Build variant description
    let variantParts = [];
    if (selectedSubCategoryName) variantParts.push(selectedSubCategoryName);
    if (selectedPlanName) variantParts.push(selectedPlanName);
    const variantStr = variantParts.join(' - ') || 'Standard';

    const costPrice = activePlan?.costPrice || activeSubCategory?.costPrice || 0;

    const serviceItem = {
      product: selectedProductName,
      variant: variantStr,
      subCategory: selectedSubCategoryName,
      plan: selectedPlanName,
      price: unitPrice,
      totalPrice: totalSellingPrice,
      costPrice,
      quantity: qty,
      productType: validationEnabled ? 'Renewal' : 'OneTime',
      billingCycle,
      cycleCount: Number(cycleCount) || 1,
      startDate: validationEnabled ? startDate : baseStartDate,
      endDate: validationEnabled ? endDate : baseStartDate,
      validationEnabled,
      oneTimePayment: !!activeSubCategory?.oneTimePayment,
      sellerPriceRenewal: activePlan?.sellerPriceRenewal || unitPrice,
      costPriceRenewal: activePlan?.costPriceRenewal || costPrice,
      deactive: isDeactive,
      deactiveDate: isDeactive ? deactiveDate : '',
      deactiveYear: isDeactive ? (deactiveDate ? deactiveDate.split('-')[0] : '') : '',
    };

    onAddService(serviceItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-gray-200/90 shadow-2xl w-full max-w-[620px] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Image 2 style) */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-[#0052cc]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h3>
              <p className="text-xs font-semibold text-[#0052cc] mt-0.5">{customerName || 'Customer'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Row 1: SELECT SERVICE & DOMAIN URL / NAME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider select-none">
                SELECT SERVICE
              </label>
              <select
                value={selectedProductName}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full h-[40px] bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-3.5 text-sm font-medium text-gray-900 focus:bg-white focus:border-[#0052cc] focus:ring-2 focus:ring-[#0052cc]/15 outline-none transition-all cursor-pointer"
              >
                <option value="">Choose a Service</option>
                {allProducts.map((p) => (
                  <option key={p._id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#0052cc] uppercase tracking-wider select-none">
                DOMAIN URL / NAME <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. jayam.com"
                value={domainUrl}
                onChange={(e) => onDomainUrlChange && onDomainUrlChange(e.target.value)}
                className={`w-full h-[40px] bg-[#f8f9fb] border rounded-lg px-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white outline-none transition-all ${
                  hasWwwPrefix(domainUrl)
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                    : 'border-[#c3c6d6] focus:border-[#0052cc] focus:ring-2 focus:ring-[#0052cc]/15'
                }`}
              />
              {hasWwwPrefix(domainUrl) && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Please remove www. from Domain URL / Name
                </p>
              )}
            </div>
          </div>

          {/* Middle Container (Image 2 style) */}
          {!selectedProductName ? (
            <div className="border border-dashed border-gray-300 rounded-xl py-9 px-4 text-center text-xs italic text-gray-400 select-none bg-gray-50/50">
              Please select a product from the list above.
            </div>
          ) : (
            <div className="bg-[#f8f9fb] border border-gray-200/90 rounded-xl p-4 space-y-4">
              {/* SubCategory & Plan row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProduct?.subCategories?.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                      Select Sub-Category
                    </label>
                    <select
                      value={selectedSubCategoryName}
                      onChange={(e) => handleSubCategoryChange(e.target.value)}
                      className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-sm font-semibold text-gray-800 outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc]"
                    >
                      {activeProduct.subCategories.map((sc) => (
                        <option key={sc.name} value={sc.name}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeSubCategory?.hasPlan && activeSubCategory.plans?.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                      Select Plan
                    </label>
                    <select
                      value={selectedPlanName}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-sm font-semibold text-gray-800 outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc]"
                    >
                      {activeSubCategory.plans.map((pl) => (
                        <option key={pl.name} value={pl.name}>
                          {pl.name} — ₹{(pl.sellerPrice || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Selling price field */}
              <div className="space-y-1 pt-2 border-t border-gray-200/60">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  {activeSubCategory?.oneTimePayment && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      One-Time Payment
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="0"
                    className="w-full h-[38px] pl-7 pr-3 bg-white border border-gray-300 rounded-lg text-sm font-bold text-emerald-700 outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc]"
                  />
                </div>
              </div>

              {/* Renewal validity settings if applicable */}
              {activeSubCategory?.hasRenewal !== false && (
                <div className="pt-3 border-t border-gray-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Billing Cycle:
                    </span>
                    <div className="flex gap-1.5 bg-gray-200/60 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleCycleChange('yearly')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          billingCycle === 'yearly'
                            ? 'bg-[#0052cc] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Yearly
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCycleChange('monthly')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          billingCycle === 'monthly'
                            ? 'bg-[#0052cc] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">
                        {billingCycle === 'monthly' ? 'No. of Months' : 'No. of Years'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={cycleCount}
                        onChange={(e) => handleCycleCountChange(e.target.value)}
                        className="w-full h-[36px] bg-white border border-gray-300 rounded-lg px-2.5 text-xs font-bold text-gray-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full h-[36px] bg-white border border-gray-300 rounded-lg px-2 text-xs font-medium text-gray-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full h-[36px] bg-white border border-gray-300 rounded-lg px-2 text-xs font-medium text-gray-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checkbox: Deactive (Inactive) Service (Image 2 style) */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggleDeactiveService"
                checked={isDeactive}
                onChange={(e) => setIsDeactive(e.target.checked)}
                className="w-4 h-4 text-[#0052cc] rounded border-gray-300 focus:ring-[#0052cc] cursor-pointer"
              />
              <label
                htmlFor="toggleDeactiveService"
                className="text-xs font-bold text-gray-700 hover:text-gray-900 cursor-pointer select-none"
              >
                Deactive (Inactive) Service
              </label>
            </div>

            {isDeactive && (
              <div className="space-y-1 pl-6">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Deactive Date
                </label>
                <input
                  type="date"
                  value={deactiveDate}
                  onChange={(e) => setDeactiveDate(e.target.value)}
                  className="w-full sm:w-1/2 h-[38px] bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-3 text-xs font-semibold text-gray-900 outline-none"
                />
              </div>
            )}
          </div>

          {/* Row 2: QUANTITY & TOTAL SELLING PRICE (Image 2 style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider select-none">
                QUANTITY
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-[40px] bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-3.5 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#0052cc] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider select-none">
                TOTAL SELLING PRICE
              </label>
              <div className="w-full h-[40px] bg-[#f1f3f8] border border-transparent rounded-lg px-3.5 flex items-center font-bold text-sm text-[#0052cc]">
                ₹{totalSellingPrice.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Footer buttons (Image 2 style) */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServicePopup;

