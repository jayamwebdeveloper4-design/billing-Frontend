import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  IndianRupee,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import InputFeild from '../../../UI/Components/InputFeild';
import Table from '../../../UI/Components/Table';
import { useGetProductsQuery } from '../../../Redux/Product';
import { useGetGstSettingsQuery } from '../../../Redux/GstSettings';
import { useCreateOrderMutation } from '../../../Redux/Oreder';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const hasWwwPrefix = (url) => {
  if (!url) return false;
  const clean = url.trim().replace(/^https?:\/\//i, '').toLowerCase();
  return clean.startsWith('www.');
};

// Add `months` to a YYYY-MM-DD string in UTC without month-overflow bugs
const addMonthsISO = (isoDate, months) => {
  if (!isoDate) return '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoDate;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, 1));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, lastDay));
  return dt.toISOString().slice(0, 10);
};

// Generate sequential billing cycles for Renewal old orders
const generateBillingCycles = ({
  startDate,
  cycleUnit,
  cycleCount,
  baseAmount,
  gstRate,
  withGst,
  previousCycles = [],
}) => {
  const count = Math.max(1, Math.min(60, parseInt(cycleCount, 10) || 1));
  const monthsPerCycle = cycleUnit === 'monthly' ? 1 : 12;
  const cycles = [];

  let cursorStart = startDate;
  for (let i = 0; i < count; i++) {
    const cycleEnd = addMonthsISO(cursorStart, monthsPerCycle);
    const prev = previousCycles[i];
    const cycleBase = prev?.baseAmount !== undefined ? prev.baseAmount : round2(baseAmount);
    const cycleGst = withGst ? round2(cycleBase * (gstRate / 100)) : 0;

    cycles.push({
      cycleNumber: i + 1,
      startDate: cursorStart,
      endDate: cycleEnd,
      baseAmount: cycleBase,
      gstAmount: cycleGst,
      totalAmount: round2(cycleBase + cycleGst),
      status: prev?.status || 'Paid',
      paidDate: prev?.paidDate || cursorStart,
    });

    cursorStart = cycleEnd;
  }

  return cycles;
};

export const OldOrderAndPymentHistory = ({
  isOpen,
  onClose,
  customer = {},
  onSuccess,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const customerId = customer?._id;
  const customerName = (customer?.name || '').split(';')[0]?.trim() || 'Customer';

  const { data: rawCatalogProducts, isLoading: isProductsLoading } = useGetProductsQuery(
    undefined,
    { skip: !isOpen }
  );
  const allProducts = useMemo(() => {
    if (Array.isArray(rawCatalogProducts)) return rawCatalogProducts;
    if (Array.isArray(rawCatalogProducts?.data)) return rawCatalogProducts.data;
    return [];
  }, [rawCatalogProducts]);

  const { data: gstSettings } = useGetGstSettingsQuery(undefined, { skip: !isOpen });
  const [createOrder, { isLoading: isSubmitting }] = useCreateOrderMutation();

  // Step 1: Order & Product selection
  const [domainUrl, setDomainUrl] = useState('');
  const [orderDate, setOrderDate] = useState(todayStr);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState('');
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Step 2: GST & Product Type
  const [withGst, setWithGst] = useState(false);
  const [productType, setProductType] = useState('Renewal'); // 'OneTime' | 'Renewal'

  // Step 3A: One-Time Billing Details
  const [oneTimeStatus, setOneTimeStatus] = useState('Paid'); // 'Paid' | 'Unpaid'
  const [oneTimePaidDate, setOneTimePaidDate] = useState(todayStr);
  const [oneTimeInvoiceNo, setOneTimeInvoiceNo] = useState('');
  const [oneTimeDescription, setOneTimeDescription] = useState('');

  // Step 3B: Renewal Parameters & Generated Cycles
  const [cycleUnit, setCycleUnit] = useState('yearly'); // 'monthly' | 'yearly'
  const [cycleCount, setCycleCount] = useState(4);
  const [renewalStartDate, setRenewalStartDate] = useState(todayStr);
  const [cycles, setCycles] = useState([]);

  // Reset state whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setDomainUrl('');
    setOrderDate(todayStr);
    setSelectedProductName('');
    setSelectedSubCategoryName('');
    setSelectedPlanName('');
    setUnitPrice('');
    setCostPrice(0);
    setQuantity(1);
    setWithGst(false);
    setProductType('Renewal');
    setOneTimeStatus('Paid');
    setOneTimePaidDate(todayStr);
    setOneTimeInvoiceNo('');
    setOneTimeDescription('');
    setCycleUnit('yearly');
    setCycleCount(4);
    setRenewalStartDate(todayStr);
    setCycles([]);
  }, [isOpen, todayStr]);

  // Catalog lookups
  const activeProduct = useMemo(
    () => allProducts.find((p) => p.name === selectedProductName) || null,
    [allProducts, selectedProductName]
  );

  const activeSubCategory = useMemo(() => {
    if (!activeProduct?.subCategories?.length) return null;
    return (
      activeProduct.subCategories.find((sc) => sc.name === selectedSubCategoryName) ||
      activeProduct.subCategories[0]
    );
  }, [activeProduct, selectedSubCategoryName]);

  // Select options for InputFeild (as="select")
  const productOptions = useMemo(() => {
    const placeholder = {
      value: '',
      label: isProductsLoading ? 'Loading products...' : 'Select Product',
    };
    return [
      placeholder,
      ...allProducts.map((p) => ({ value: p.name, label: p.name })),
    ];
  }, [allProducts, isProductsLoading]);

  const subCategoryOptions = useMemo(() => {
    if (!activeProduct?.subCategories?.length) {
      return [{ value: '', label: 'Standard' }];
    }
    return activeProduct.subCategories.map((sc) => ({
      value: sc.name,
      label: sc.name,
    }));
  }, [activeProduct]);

  const planOptions = useMemo(() => {
    if (!activeSubCategory?.hasPlan || !activeSubCategory?.plans?.length) {
      return [{ value: '', label: 'N/A' }];
    }
    return activeSubCategory.plans.map((pl) => ({
      value: pl.name,
      label: pl.name,
    }));
  }, [activeSubCategory]);

  // GST Rate based on customer state & GST settings
  const gstRateInfo = useMemo(() => {
    const cgst = Number(gstSettings?.cgstPercentage ?? 9);
    const sgst = Number(gstSettings?.sgstPercentage ?? 9);
    const igst = Number(gstSettings?.igstPercentage ?? 18);
    const isTamilNadu = (customer?.state || '').trim().toLowerCase() === 'tamil nadu';
    const rate = isTamilNadu ? cgst + sgst : igst;
    const label = isTamilNadu ? `CGST ${cgst}% + SGST ${sgst}%` : `IGST ${igst}%`;
    return { rate, label };
  }, [gstSettings, customer?.state]);

  // Base, GST & Total for a single unit/cycle
  const baseAmount = useMemo(() => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const price = Number(unitPrice) || 0;
    return round2(price * qty);
  }, [unitPrice, quantity]);

  const gstAmount = useMemo(() => {
    if (!withGst) return 0;
    return round2(baseAmount * (gstRateInfo.rate / 100));
  }, [withGst, baseAmount, gstRateInfo.rate]);

  const totalWithGst = useMemo(() => round2(baseAmount + gstAmount), [baseAmount, gstAmount]);

  // Regenerate Renewal Cycles when parameters change
  useEffect(() => {
    if (!isOpen || productType !== 'Renewal') return;
    setCycles((prev) =>
      generateBillingCycles({
        startDate: renewalStartDate || orderDate || todayStr,
        cycleUnit,
        cycleCount,
        baseAmount,
        gstRate: gstRateInfo.rate,
        withGst,
        previousCycles: prev,
      })
    );
  }, [
    isOpen,
    productType,
    renewalStartDate,
    orderDate,
    todayStr,
    cycleUnit,
    cycleCount,
    baseAmount,
    gstRateInfo.rate,
    withGst,
  ]);

  const applyCatalogSelection = (subCat, planName = '') => {
    if (!subCat) {
      setUnitPrice('');
      setCostPrice(0);
      return;
    }
    if (subCat.hasPlan && subCat.plans?.length) {
      const plan = subCat.plans.find((pl) => pl.name === planName) || subCat.plans[0];
      setSelectedPlanName(plan.name);
      setUnitPrice(plan.sellerPrice ?? '');
      setCostPrice(Number(plan.costPrice) || 0);
    } else {
      setSelectedPlanName('');
      setUnitPrice(subCat.sellerPrice ?? '');
      setCostPrice(Number(subCat.costPrice) || 0);
    }
    setProductType(subCat.hasRenewal !== false ? 'Renewal' : 'OneTime');
  };

  const handleProductChange = (prodName) => {
    setSelectedProductName(prodName);
    const prod = allProducts.find((p) => p.name === prodName);
    if (prod?.subCategories?.length) {
      const firstSub = prod.subCategories[0];
      setSelectedSubCategoryName(firstSub.name);
      applyCatalogSelection(firstSub);
    } else {
      setSelectedSubCategoryName('');
      setSelectedPlanName('');
      applyCatalogSelection(null);
    }
  };

  const handleSubCategoryChange = (subCatName) => {
    setSelectedSubCategoryName(subCatName);
    const subCat = activeProduct?.subCategories?.find((sc) => sc.name === subCatName);
    applyCatalogSelection(subCat);
  };

  const handlePlanChange = (planName) => {
    setSelectedPlanName(planName);
    applyCatalogSelection(activeSubCategory, planName);
  };

  const handleCycleFieldChange = (idx, field, value) => {
    setCycles((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const updated = { ...c, [field]: value };
        if (field === 'baseAmount') {
          const b = Math.max(0, Number(value) || 0);
          const g = withGst ? round2(b * (gstRateInfo.rate / 100)) : 0;
          updated.baseAmount = b;
          updated.gstAmount = g;
          updated.totalAmount = round2(b + g);
        }
        return updated;
      })
    );
  };

  const handleSetAllCyclesStatus = (status) => {
    setCycles((prev) => prev.map((c) => ({ ...c, status })));
  };

  // Columns for local UI Table component
  const cycleColumns = useMemo(() => {
    const cols = [
      {
        key: 'cycleNumber',
        label: 'Cycle',
        headerClassName: '!px-3 !py-2.5',
        cellClassName: '!px-3 !py-2 font-bold text-gray-800 whitespace-nowrap',
        render: (c) => `#${c.cycleNumber}`,
      },
      {
        key: 'startDate',
        label: 'Start Date',
        headerClassName: '!px-2.5 !py-2.5',
        cellClassName: '!px-2.5 !py-2',
        render: (c, idx) => (
          <InputFeild
            type="date"
            value={c.startDate}
            onChange={(e) => handleCycleFieldChange(idx, 'startDate', e.target.value)}
            className="!w-[132px]"
            inputClassName="!px-2 !py-1.5 !text-xs"
          />
        ),
      },
      {
        key: 'endDate',
        label: 'End Date',
        headerClassName: '!px-2.5 !py-2.5',
        cellClassName: '!px-2.5 !py-2',
        render: (c, idx) => (
          <InputFeild
            type="date"
            value={c.endDate}
            onChange={(e) => handleCycleFieldChange(idx, 'endDate', e.target.value)}
            className="!w-[132px]"
            inputClassName="!px-2 !py-1.5 !text-xs"
          />
        ),
      },
      {
        key: 'baseAmount',
        label: 'Base (₹)',
        headerClassName: '!px-2.5 !py-2.5',
        cellClassName: '!px-2.5 !py-2',
        render: (c, idx) => (
          <InputFeild
            type="number"
            min="0"
            step="0.01"
            value={c.baseAmount}
            onChange={(e) => handleCycleFieldChange(idx, 'baseAmount', e.target.value)}
            className="!w-24"
            inputClassName="!px-2 !py-1.5 !text-xs font-semibold"
          />
        ),
      },
    ];

    if (withGst) {
      cols.push({
        key: 'totalAmount',
        label: 'Total w/ GST',
        headerClassName: '!px-2.5 !py-2.5',
        cellClassName: '!px-2.5 !py-2 font-bold text-gray-800 text-xs whitespace-nowrap',
        render: (c) => `₹${c.totalAmount.toLocaleString()}`,
      });
    }

    cols.push(
      {
        key: 'status',
        label: 'Status',
        headerClassName: '!px-2.5 !py-2.5',
        cellClassName: '!px-2.5 !py-2 whitespace-nowrap',
        render: (c, idx) => (
          <Button
            type="button"
            size="sm"
            variant={c.status === 'Paid' ? 'primary' : 'danger'}
            onClick={() =>
              handleCycleFieldChange(idx, 'status', c.status === 'Paid' ? 'Unpaid' : 'Paid')
            }
            className={`!rounded-full !px-3 !py-1 !text-[10px] font-bold uppercase ${
              c.status === 'Paid' ? '!bg-emerald-600 hover:!bg-emerald-700' : ''
            }`}
          >
            {c.status}
          </Button>
        ),
      },
      {
        key: 'paidDate',
        label: 'Paid Date',
        headerClassName: '!px-2.5 !py-2.5',
        cellClassName: '!px-2.5 !py-2',
        render: (c, idx) => (
          <InputFeild
            type="date"
            value={c.paidDate}
            disabled={c.status !== 'Paid'}
            onChange={(e) => handleCycleFieldChange(idx, 'paidDate', e.target.value)}
            className="!w-[132px]"
            inputClassName="!px-2 !py-1.5 !text-xs"
          />
        ),
      }
    );

    return cols;
  }, [withGst, gstRateInfo.rate]);

  // Summary totals across OneTime or all Renewal cycles
  const summary = useMemo(() => {
    if (productType === 'OneTime') {
      const isPaid = oneTimeStatus === 'Paid';
      return {
        totalBase: baseAmount,
        totalGst: gstAmount,
        grandTotal: totalWithGst,
        paidBase: isPaid ? baseAmount : 0,
        paidTotal: isPaid ? totalWithGst : 0,
      };
    }

    return cycles.reduce(
      (acc, c) => {
        const b = Number(c.baseAmount) || 0;
        const g = Number(c.gstAmount) || 0;
        const t = Number(c.totalAmount) || 0;
        acc.totalBase = round2(acc.totalBase + b);
        acc.totalGst = round2(acc.totalGst + g);
        acc.grandTotal = round2(acc.grandTotal + t);
        if (c.status === 'Paid') {
          acc.paidBase = round2(acc.paidBase + b);
          acc.paidTotal = round2(acc.paidTotal + t);
        }
        return acc;
      },
      { totalBase: 0, totalGst: 0, grandTotal: 0, paidBase: 0, paidTotal: 0 }
    );
  }, [productType, oneTimeStatus, baseAmount, gstAmount, totalWithGst, cycles]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerId) {
      toast.error('Customer information is missing');
      return;
    }
    if (!domainUrl.trim()) {
      toast.error('Domain URL / Name is required');
      return;
    }
    if (hasWwwPrefix(domainUrl)) {
      toast.error('Please remove www. from Domain URL / Name');
      return;
    }
    if (!selectedProductName) {
      toast.error('Please select a product');
      return;
    }
    if (Number(unitPrice) <= 0) {
      toast.error('Please enter a valid price greater than 0');
      return;
    }

    const variantParts = [];
    if (selectedSubCategoryName) variantParts.push(selectedSubCategoryName);
    if (selectedPlanName) variantParts.push(selectedPlanName);
    const variantStr = variantParts.join(' - ') || 'Standard';

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const cleanDomain = domainUrl.trim();

    let productPayload;
    let orderStart = orderDate || todayStr;
    let orderEnd = orderStart;

    if (productType === 'OneTime') {
      if (oneTimeStatus === 'Paid' && !oneTimePaidDate) {
        toast.error('Please select the Paid Date for the One-Time order');
        return;
      }

      const paymentHistory =
        oneTimeStatus === 'Paid'
          ? [
              {
                date: oneTimePaidDate,
                amount: baseAmount,
                withGst,
                gstvalue: gstAmount,
                paymentStage: 'full',
                stageNumber: 1,
                invoiceNo: oneTimeInvoiceNo.trim(),
                description: oneTimeDescription.trim() || 'One-Time Old Order Payment',
              },
            ]
          : [];

      productPayload = {
        product: selectedProductName,
        variant: variantStr,
        price: round2(Number(unitPrice) || 0),
        costPrice: round2(Number(costPrice) || 0),
        quantity: qty,
        productType: 'OneTime',
        billingCycle: 'yearly',
        cycleCount: 1,
        paymentStage: 'full',
        startDate: orderStart,
        endDate: orderStart,
        validationEnabled: false,
        oneTimePayment: true,
        domainUrl: cleanDomain,
        renewalHistory: [],
        paymentHistory,
      };
    } else {
      if (!cycles.length) {
        toast.error('Please generate at least one billing cycle');
        return;
      }
      const missingPaidDate = cycles.find((c) => c.status === 'Paid' && !c.paidDate);
      if (missingPaidDate) {
        toast.error(`Please select Paid Date for Cycle ${missingPaidDate.cycleNumber}`);
        return;
      }

      const lastCycle = cycles[cycles.length - 1];
      const firstUnpaidCycle = cycles.find((c) => c.status !== 'Paid');
      const activeCycle = firstUnpaidCycle || lastCycle;

      orderStart = cycles[0].startDate;
      orderEnd = activeCycle.endDate;

      const renewalHistory = cycles.map((c, idx) => {
        const isPaid = c.status === 'Paid';
        const isLast = idx === cycles.length - 1;
        let renewalStatus = 'upcoming';
        if (isPaid && !isLast) renewalStatus = 'complete';
        else if (c.cycleNumber === activeCycle.cycleNumber) renewalStatus = 'active';

        return {
          cycleNumber: c.cycleNumber,
          startDate: c.startDate,
          endDate: c.endDate,
          totalAmount: c.totalAmount,
          paidAmount: isPaid ? c.totalAmount : 0,
          paymentStatus: isPaid ? 'Paid' : 'Unpaid',
          renewalStatus,
          paymentStages: isPaid
            ? [
                {
                  payDate: c.paidDate,
                  stage: 'full',
                  stageNumber: c.cycleNumber,
                  amount: c.baseAmount,
                  withGst,
                  gstvalue: c.gstAmount,
                  description: `Cycle ${c.cycleNumber}/${cycles.length} (${c.startDate} to ${c.endDate})`,
                },
              ]
            : [],
        };
      });

      const paymentHistory = cycles
        .filter((c) => c.status === 'Paid')
        .map((c) => ({
          date: c.paidDate,
          amount: c.baseAmount,
          withGst,
          gstvalue: c.gstAmount,
          paymentStage: 'full',
          stageNumber: c.cycleNumber,
          description: `Cycle ${c.cycleNumber}/${cycles.length} (${c.startDate} to ${c.endDate})`,
        }));

      productPayload = {
        product: selectedProductName,
        variant: variantStr,
        price: round2(Number(unitPrice) || 0),
        costPrice: round2(Number(costPrice) || 0),
        quantity: qty,
        productType: 'Renewal',
        billingCycle: cycleUnit,
        cycleCount: cycles.length,
        paymentStage: 'full',
        startDate: activeCycle.startDate,
        endDate: activeCycle.endDate,
        sellerPriceRenewal: round2(Number(unitPrice) || 0),
        costPriceRenewal: round2(Number(costPrice) || 0),
        validationEnabled: true,
        oneTimePayment: false,
        domainUrl: cleanDomain,
        renewalHistory,
        paymentHistory,
      };
    }

    const payload = {
      customerId,
      orderDate: orderDate || orderStart,
      domainUrl: cleanDomain,
      totalPrice: summary.totalBase,
      startDate: orderStart,
      endDate: orderEnd,
      products: [productPayload],
    };

    try {
      await createOrder(payload).unwrap();
      toast.success('Old order & payment history saved!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to save old order');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#003d9b] to-[#0052cc] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">
                Old Order &amp; Payment History
              </h2>
              <p className="text-xs text-blue-100">
                Customer: <span className="font-semibold text-white">{customerName}</span>
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={X}
            onClick={onClose}
            className="!text-white hover:!bg-white/15 !p-1.5"
            title="Close"
          />
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. Order & Product Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
              <Layers className="w-4 h-4 text-[#0052cc]" />
              1. Order &amp; Product Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputFeild
                label="Domain URL / Name"
                required
                placeholder="e.g. example.com (without www.)"
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                className="md:col-span-2"
              />

              <InputFeild
                label="Order Date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputFeild
                label="Product"
                required
                as="select"
                value={selectedProductName}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={isProductsLoading}
                options={productOptions}
              />

              <InputFeild
                label="Subcategory / Variant"
                as="select"
                value={selectedSubCategoryName}
                onChange={(e) => handleSubCategoryChange(e.target.value)}
                disabled={!activeProduct?.subCategories?.length}
                options={subCategoryOptions}
              />

              <InputFeild
                label="Plan"
                as="select"
                value={selectedPlanName}
                onChange={(e) => handlePlanChange(e.target.value)}
                disabled={!activeSubCategory?.hasPlan || !activeSubCategory?.plans?.length}
                options={planOptions}
              />
            </div>

            {/* Price, Quantity & GST */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
              <InputFeild
                label="Unit Price (₹)"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                inputClassName="!bg-white"
              />

              <InputFeild
                label="Quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputClassName="!bg-white"
              />

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none py-2.5">
                  <input
                    type="checkbox"
                    checked={withGst}
                    onChange={(e) => setWithGst(e.target.checked)}
                    className="w-4 h-4 text-[#0052cc] rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Include GST ({gstRateInfo.label})
                  </span>
                </label>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-gray-500">
                  Base: ₹{baseAmount.toLocaleString()}
                  {withGst && ` + GST: ₹${gstAmount.toLocaleString()}`}
                </div>
                <div className="text-base font-extrabold text-[#003d9b]">
                  ₹{totalWithGst.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Product Type Branch */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
              <Calendar className="w-4 h-4 text-[#0052cc]" />
              2. Product Type &amp; Billing Schedule
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={productType === 'OneTime' ? 'primary' : 'outline'}
                onClick={() => setProductType('OneTime')}
                className="min-w-[150px] px-6 font-bold !rounded-xl whitespace-nowrap"
              >
                One Time
              </Button>
              <Button
                type="button"
                variant={productType === 'Renewal' ? 'primary' : 'outline'}
                onClick={() => setProductType('Renewal')}
                className="min-w-[150px] px-6 font-bold !rounded-xl whitespace-nowrap"
              >
                Renewal
              </Button>
            </div>

            {productType === 'OneTime' ? (
              /* Branch A: One-Time Billing Details */
              <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 tracking-wider uppercase mb-1.5">
                      Payment Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Paid', 'Unpaid'].map((st) => (
                        <Button
                          key={st}
                          type="button"
                          size="sm"
                          variant={
                            oneTimeStatus === st
                              ? st === 'Paid'
                                ? 'primary'
                                : 'danger'
                              : 'outline'
                          }
                          onClick={() => setOneTimeStatus(st)}
                          className={`font-bold !py-2.5 ${
                            oneTimeStatus === st && st === 'Paid'
                              ? '!bg-emerald-600 hover:!bg-emerald-700'
                              : ''
                          }`}
                        >
                          {st}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <InputFeild
                    label="Paid Date"
                    required={oneTimeStatus === 'Paid'}
                    type="date"
                    value={oneTimePaidDate}
                    disabled={oneTimeStatus !== 'Paid'}
                    onChange={(e) => setOneTimePaidDate(e.target.value)}
                    inputClassName="!bg-white"
                  />

                  <InputFeild
                    label="Invoice No (Optional)"
                    type="text"
                    placeholder="e.g. INV-2024-001"
                    value={oneTimeInvoiceNo}
                    disabled={oneTimeStatus !== 'Paid'}
                    onChange={(e) => setOneTimeInvoiceNo(e.target.value)}
                    inputClassName="!bg-white"
                  />
                </div>

                <InputFeild
                  label="Notes / Description (Optional)"
                  type="text"
                  placeholder="Historical payment reference or remarks"
                  value={oneTimeDescription}
                  onChange={(e) => setOneTimeDescription(e.target.value)}
                  inputClassName="!bg-white"
                />
              </div>
            ) : (
              /* Branch B: Renewal Parameters + Generated Cycles */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-blue-50/40 border border-blue-100 rounded-xl p-4 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 tracking-wider uppercase mb-1.5">
                      Cycle Unit
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Month', value: 'monthly' },
                        { label: 'Year', value: 'yearly' },
                      ].map((u) => (
                        <Button
                          key={u.value}
                          type="button"
                          size="sm"
                          variant={cycleUnit === u.value ? 'primary' : 'outline'}
                          onClick={() => setCycleUnit(u.value)}
                          className="font-bold !py-2.5"
                        >
                          {u.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <InputFeild
                    label={cycleUnit === 'monthly' ? 'Month Count' : 'Year Count'}
                    type="number"
                    min="1"
                    max="60"
                    value={cycleCount}
                    onChange={(e) => setCycleCount(e.target.value)}
                    inputClassName="!bg-white"
                  />

                  <InputFeild
                    label="First Cycle Start Date"
                    type="date"
                    value={renewalStartDate}
                    onChange={(e) => setRenewalStartDate(e.target.value)}
                    inputClassName="!bg-white"
                  />
                </div>

                {/* Generated Cycles Table using local UI Table */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <span className="text-xs font-bold text-gray-800">
                      Generated Billing Cycles ({cycles.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={CheckCheck}
                        onClick={() => handleSetAllCyclesStatus('Paid')}
                        className="!text-[11px] font-bold !border-emerald-200 !text-emerald-700 hover:!bg-emerald-50"
                      >
                        Mark All Paid
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={Clock}
                        onClick={() => handleSetAllCyclesStatus('Unpaid')}
                        className="!text-[11px] font-bold !border-red-200 !text-red-700 hover:!bg-red-50"
                      >
                        Mark All Unpaid
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl">
                    <Table
                      columns={cycleColumns}
                      data={cycles}
                      keyField="cycleNumber"
                      emptyMessage="No billing cycles generated."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Bar */}
          <div className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[11px] text-gray-500 uppercase font-semibold">
                  Order Total {withGst ? '(w/ GST)' : ''}
                </div>
                <div className="text-lg font-black text-[#003d9b] flex items-center gap-1">
                  <IndianRupee className="w-4 h-4 text-[#0052cc]" />
                  {summary.grandTotal.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 uppercase font-semibold">
                  Paid Amount
                </div>
                <div className="text-lg font-black text-emerald-600">
                  ₹{summary.paidTotal.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 uppercase font-semibold">
                  Balance Due
                </div>
                <div className="text-lg font-black text-amber-600">
                  ₹{Math.max(0, round2(summary.grandTotal - summary.paidTotal)).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                icon={isSubmitting ? Loader2 : CheckCircle2}
                className="font-bold"
              >
                Save &amp; Finalize Order
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default OldOrderAndPymentHistory;
