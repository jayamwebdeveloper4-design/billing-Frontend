import React, { useState, useEffect, useMemo } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import InputFeild from '../../../UI/Components/InputFeild';

export const AddPlan = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isSaving = false,
  parentHasRenewal = true,
  subCategoryName = '',
}) => {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState({
    name: '',
    hasRenewal: true,
    costPrice: '',
    costPriceRenewal: '',
    sellerPrice: '',
    sellerPriceRenewal: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        hasRenewal: parentHasRenewal ? (initialData.hasRenewal !== false) : false,
        costPrice: initialData.costPrice != null ? String(initialData.costPrice) : '',
        costPriceRenewal: initialData.costPriceRenewal != null ? String(initialData.costPriceRenewal) : '',
        sellerPrice: initialData.sellerPrice != null ? String(initialData.sellerPrice) : '',
        sellerPriceRenewal: initialData.sellerPriceRenewal != null ? String(initialData.sellerPriceRenewal) : '',
      });
    } else {
      setFormData({
        name: '',
        hasRenewal: parentHasRenewal,
        costPrice: '',
        costPriceRenewal: '',
        sellerPrice: '',
        sellerPriceRenewal: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen, parentHasRenewal]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const margin = useMemo(() => {
    const cost = parseFloat(formData.costPrice) || 0;
    const seller = parseFloat(formData.sellerPrice) || 0;
    return seller - cost;
  }, [formData.costPrice, formData.sellerPrice]);

  const renewalMargin = useMemo(() => {
    const cost = parseFloat(formData.costPriceRenewal) || 0;
    const seller = parseFloat(formData.sellerPriceRenewal) || 0;
    return seller - cost;
  }, [formData.costPriceRenewal, formData.sellerPriceRenewal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (formData.sellerPrice === '' || isNaN(Number(formData.sellerPrice)) || Number(formData.sellerPrice) < 0) {
      newErrors.sellerPrice = 'Valid selling price is required';
    }

    if (formData.costPrice !== '' && (isNaN(Number(formData.costPrice)) || Number(formData.costPrice) < 0)) {
      newErrors.costPrice = 'Cost price cannot be negative';
    }

    if (formData.hasRenewal) {
      if (formData.sellerPriceRenewal !== '' && (isNaN(Number(formData.sellerPriceRenewal)) || Number(formData.sellerPriceRenewal) < 0)) {
        newErrors.sellerPriceRenewal = 'Renewal price cannot be negative';
      }
      if (formData.costPriceRenewal !== '' && (isNaN(Number(formData.costPriceRenewal)) || Number(formData.costPriceRenewal) < 0)) {
        newErrors.costPriceRenewal = 'Renewal cost cannot be negative';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      hasRenewal: Boolean(formData.hasRenewal),
      costPrice: Number(formData.costPrice) || 0,
      sellerPrice: Number(formData.sellerPrice) || 0,
      costPriceRenewal: formData.hasRenewal ? (Number(formData.costPriceRenewal) || 0) : 0,
      sellerPriceRenewal: formData.hasRenewal ? (Number(formData.sellerPriceRenewal) || 0) : 0,
    };

    await onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Pricing Plan' : 'Add New Pricing Plan'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {subCategoryName ? `For ${subCategoryName}` : 'Configure pricing and renewals'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <InputFeild
            label="Plan Name"
            required
            placeholder="e.g. Starter, Premium, Enterprise"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
          />

          {/* Renewal Toggle */}
          {parentHasRenewal && (
            <div className="flex items-center justify-between p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/70">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Has Periodic Renewal</span>
                <span className="text-[11px] text-gray-500">Enable recurring yearly / cycle renewals for this plan</span>
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
          )}

          {/* Initial Purchase Pricing */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <InputFeild
              label="Cost Price (₹)"
              type="number"
              placeholder="0"
              value={formData.costPrice}
              onChange={(e) => handleChange('costPrice', e.target.value)}
              error={errors.costPrice}
              hint="Your acquisition cost"
            />
            <InputFeild
              label="Selling Price (₹)"
              required
              type="number"
              placeholder="0"
              value={formData.sellerPrice}
              onChange={(e) => handleChange('sellerPrice', e.target.value)}
              error={errors.sellerPrice}
              hint="Price charged to client"
            />
          </div>

          {/* Initial Margin Badge */}
          {formData.sellerPrice !== '' && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/60 rounded-lg text-xs font-semibold text-blue-900 border border-blue-100">
              <span>Initial Profit Margin:</span>
              <span className={margin >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                ₹{margin.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Renewal Pricing (If renewal enabled) */}
          {formData.hasRenewal && (
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <span className="text-[11px] font-bold text-gray-600 tracking-wider uppercase block">
                Renewal Cycle Pricing
              </span>
              <div className="grid grid-cols-2 gap-3.5">
                <InputFeild
                  label="Renewal Cost (₹)"
                  type="number"
                  placeholder="0"
                  value={formData.costPriceRenewal}
                  onChange={(e) => handleChange('costPriceRenewal', e.target.value)}
                  error={errors.costPriceRenewal}
                />
                <InputFeild
                  label="Renewal Selling (₹)"
                  type="number"
                  placeholder="0"
                  value={formData.sellerPriceRenewal}
                  onChange={(e) => handleChange('sellerPriceRenewal', e.target.value)}
                  error={errors.sellerPriceRenewal}
                />
              </div>

              {formData.sellerPriceRenewal !== '' && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50/60 rounded-lg text-xs font-semibold text-emerald-900 border border-emerald-100">
                  <span>Renewal Profit Margin:</span>
                  <span className={renewalMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                    ₹{renewalMargin.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <Button variant="outline" size="md" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSaving}>
              {isEdit ? 'Save Changes' : 'Add Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlan;

