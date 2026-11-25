import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  CreditCard,
  X,
  Plus,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import {
  useGetProductsQuery,
  useAddPaymentMutation,
} from '../../../Redux/CustomerProcuct';

export const PaymentHistoryModal = ({
  isOpen,
  onClose,
  customer = {},
  gstRates = { cgst: 9, sgst: 9, igst: 18 },
  onPaymentAdded,
}) => {
  const customerId = customer?._id;
  const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const fileInputRef = useRef(null);

  // Fetch active products for this customer using RTK Query
  const { data: productsResponse, isLoading: isProductsLoading } = useGetProductsQuery(
    { customerId },
    { skip: !customerId || !isOpen }
  );

  const customerProducts = useMemo(() => {
    return productsResponse?.data || [];
  }, [productsResponse]);

  // RTK Query mutation to add payment to a product
  const [addPayment, { isLoading: isSaving }] = useAddPaymentMutation();

  // Create an initial blank row
  const createEmptyRow = (defaultProdId = '') => ({
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: currentDate,
    productId: defaultProdId,
    description: '',
    paymentStage: 'full',
    withGst: false,
    amount: '',
  });

  const [paymentRows, setPaymentRows] = useState([]);
  const [gstin, setGstin] = useState(customer?.gstin || '');

  // Initialize rows when modal opens or products load
  useEffect(() => {
    if (isOpen) {
      const defaultId = customerProducts.length > 0 ? customerProducts[0]._id : '';
      setPaymentRows([createEmptyRow(defaultId)]);
      setGstin(customer?.gstin || '');
    }
  }, [isOpen, customerProducts, customer?.gstin]);

  // Handlers for Row Manipulation
  const handleAddRow = () => {
    const defaultId = customerProducts.length > 0 ? customerProducts[0]._id : '';
    setPaymentRows((prev) => [...prev, createEmptyRow(defaultId)]);
  };

  const handleRemoveRow = (rowId) => {
    setPaymentRows((prev) => {
      if (prev.length <= 1) {
        toast.error('At least one payment row is required.');
        return prev;
      }
      return prev.filter((r) => r.id !== rowId);
    });
  };

  const handleRowChange = (rowId, field, value) => {
    setPaymentRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return { ...r, [field]: value };
      })
    );
  };

  // Compute GST for a single row
  const computeRowGst = (row) => {
    if (!row.withGst) return 0;
    const amt = Number(row.amount) || 0;
    const isTamilNadu = (customer?.state || '').trim().toLowerCase() === 'tamil nadu';
    if (isTamilNadu) {
      const cgst = amt * ((Number(gstRates?.cgst) || 9) / 100);
      const sgst = amt * ((Number(gstRates?.sgst) || 9) / 100);
      return Number((cgst + sgst).toFixed(2));
    } else {
      const igst = amt * ((Number(gstRates?.igst) || 18) / 100);
      return Number(igst.toFixed(2));
    }
  };

  // Financial Summary Totals
  const totals = useMemo(() => {
    let totalBase = 0;
    let totalGst = 0;
    let hasGstEnabled = false;

    paymentRows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      totalBase += amt;
      const gstVal = computeRowGst(r);
      totalGst += gstVal;
      if (r.withGst) hasGstEnabled = true;
    });

    return {
      count: paymentRows.length,
      totalBase: Number(totalBase.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      grandTotal: Number((totalBase + totalGst).toFixed(2)),
      hasGstEnabled,
    };
  }, [paymentRows, customer?.state, gstRates]);

  // Download Sample Excel Format
  const downloadSampleExcel = () => {
    const defaultProduct = customerProducts[0]?.product || 'Web Development';
    const sampleRows = [
      {
        'Payment Date': currentDate,
        'Service': defaultProduct,
        'Description': `Payment for ${defaultProduct}`,
        'Payment Stage': 'Full',
        'Paid Amount': 5000,
        'With GST': 'No',
        'GSTIN': '',
      },
      {
        'Payment Date': currentDate,
        'Service': customerProducts[1]?.product || defaultProduct,
        'Description': 'Advance payment',
        'Payment Stage': 'Advance',
        'Paid Amount': 2000,
        'With GST': 'Yes',
        'GSTIN': customer?.gstin || '33AAAAA0000A1Z5',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments_Sample');
    XLSX.writeFile(
      workbook,
      `Payment_Import_Sample_${(customer?.name || 'Customer').split(';')[0].trim().replace(/\s+/g, '_')}.xlsx`
    );
    toast.success('Downloaded sample payment Excel template!');
  };

  // Handle Excel Upload
  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

        if (!rawJson.length) {
          toast.error('The uploaded Excel file contains no data rows.');
          return;
        }

        const newRows = [];
        rawJson.forEach((row, index) => {
          const getVal = (...keys) => {
            const rowKeys = Object.keys(row);
            for (let k of keys) {
              const foundKey = rowKeys.find(
                (rk) => rk.trim().toLowerCase() === k.trim().toLowerCase()
              );
              if (
                foundKey &&
                row[foundKey] !== undefined &&
                row[foundKey] !== null &&
                String(row[foundKey]).trim() !== ''
              ) {
                return row[foundKey];
              }
            }
            return '';
          };

          // Parse date
          let dateVal = getVal('payment date', 'date', 'paymentdate');
          let parsedDate = currentDate;
          if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            parsedDate = dateVal.toISOString().split('T')[0];
          } else if (typeof dateVal === 'number' && dateVal > 25000) {
            const d = new Date((dateVal - 25569) * 86400 * 1000);
            if (!isNaN(d.getTime())) parsedDate = d.toISOString().split('T')[0];
          } else if (typeof dateVal === 'string' && dateVal.trim()) {
            const s = dateVal.trim();
            if (s.includes('/')) {
              const parts = s.split('/');
              if (parts.length === 3 && parts[2].length === 4) {
                parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            } else if (s.includes('-')) {
              const parts = s.split('-');
              if (parts[0].length === 4) parsedDate = s.split('T')[0];
            }
          }

          // Match Service / Product
          const serviceName = String(getVal('service', 'product', 'services')).trim().toLowerCase();
          let matchedProduct = null;
          if (customerProducts.length === 1) {
            matchedProduct = customerProducts[0];
          } else if (serviceName) {
            matchedProduct = customerProducts.find(
              (p) => p.product && p.product.toLowerCase().includes(serviceName)
            );
          }
          if (!matchedProduct && customerProducts.length > 0) {
            matchedProduct = customerProducts[0];
          }

          // Stage
          const rawStage = String(getVal('payment stage', 'stage')).trim().toLowerCase();
          let paymentStage = 'full';
          if (rawStage.includes('adv')) paymentStage = 'advance';
          else if (rawStage.includes('mid') || rawStage.includes('part')) paymentStage = 'mid';
          else if (rawStage.includes('final')) paymentStage = 'final';

          // Amount
          const rawAmount = getVal('paid amount', 'amount', 'paid');
          const amount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) || 0;

          // With GST
          const rawGst = String(getVal('with gst', 'gst')).trim().toLowerCase();
          const withGst = rawGst === 'yes' || rawGst === 'true' || rawGst === '1';

          // GSTIN
          const rowGstin = String(getVal('gstin', 'gst no')).trim();
          if (rowGstin && !gstin) setGstin(rowGstin);

          const description = String(getVal('description', 'notes', 'remarks')).trim();

          newRows.push({
            id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            date: parsedDate,
            productId: matchedProduct ? matchedProduct._id : '',
            description,
            paymentStage,
            withGst,
            amount: amount > 0 ? String(amount) : '',
          });
        });

        if (newRows.length > 0) {
          setPaymentRows((prev) => {
            if (prev.length === 1 && !prev[0].amount && !prev[0].description) {
              return newRows;
            }
            return [...prev, ...newRows];
          });
          toast.success(`Imported ${newRows.length} payment records!`);
        }
      } catch (err) {
        console.error('Excel parse error:', err);
        toast.error('Failed to read Excel file.');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit and save all payments
  const handleSaveAll = async () => {
    if (paymentRows.length === 0) {
      toast.error('Please add at least one payment row.');
      return;
    }

    if (customerProducts.length === 0) {
      toast.error('This customer has no services to attach payments to.');
      return;
    }

    // Validation
    for (let i = 0; i < paymentRows.length; i++) {
      const row = paymentRows[i];
      if (!row.amount || Number(row.amount) <= 0) {
        toast.error(`Row #${i + 1}: Please enter a valid payment amount.`);
        return;
      }
      if (!row.productId) {
        toast.error(`Row #${i + 1}: Please select a service/product.`);
        return;
      }
      if (row.withGst && !gstin.trim()) {
        toast.error(`Row #${i + 1} has GST enabled. Please enter the customer's GSTIN below.`);
        return;
      }
    }

    try {
      let savedCount = 0;

      // Execute RTK Query mutation sequentially for each payment row
      for (let i = 0; i < paymentRows.length; i++) {
        const row = paymentRows[i];
        const rowGst = computeRowGst(row);
        const paymentPayload = {
          id: row.productId,
          date: row.date || currentDate,
          amount: Number(row.amount) || 0,
          withGst: Boolean(row.withGst),
          gstvalue: rowGst,
          paymentStage: row.paymentStage || 'full',
          description: row.description || '',
          stageNumber: i + 1,
        };

        await addPayment(paymentPayload).unwrap();
        savedCount++;
      }

      toast.success(`Successfully saved ${savedCount} payment record(s)!`);
      if (onPaymentAdded) onPaymentAdded();
      onClose();
    } catch (err) {
      console.error('Failed to save payments:', err);
      toast.error(err?.data?.message || 'Failed to save payments');
    }
  };

  if (!isOpen) return null;

  const customerName = (customer?.name || '').split(';')[0].trim() || 'Customer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-gray-200/90 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-[#0052cc]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Record Payment
              </h3>
              <p className="text-xs font-semibold text-[#0052cc] mt-0.5">
                {customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadSampleExcel}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Sample Excel Template"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Sample Excel</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Import Payments from Excel"
            >
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              <span>Import Excel</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {customerProducts.length === 0 && !isProductsLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <span>
                This customer has no active services/orders yet. Please create a service first before recording payments.
              </span>
            </div>
          )}

          {/* Payment Rows Table / List */}
          <div className="border border-gray-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-[#f8f9fb] border-b border-gray-200/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Service / Product <span className="text-red-500">*</span></th>
                    <th className="py-3 px-4 w-36">Date <span className="text-red-500">*</span></th>
                    <th className="py-3 px-4 w-32">Stage</th>
                    <th className="py-3 px-4 w-32">Amount (₹) <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3 text-center w-24">GST</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-3 text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {paymentRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Service selector */}
                      <td className="py-2.5 px-4">
                        <select
                          value={row.productId}
                          onChange={(e) => handleRowChange(row.id, 'productId', e.target.value)}
                          className="w-full h-8 bg-[#f8f9fb] border border-gray-300 rounded-md px-2 text-xs font-semibold text-gray-800 outline-none focus:border-[#0052cc] focus:bg-white"
                        >
                          <option value="">Select Service...</option>
                          {customerProducts.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.product} {p.variant ? `(${p.variant})` : ''} — ₹{Number(p.price || 0).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Payment Date */}
                      <td className="py-2.5 px-4">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                          className="w-full h-8 bg-[#f8f9fb] border border-gray-300 rounded-md px-2 text-xs font-medium text-gray-800 outline-none focus:border-[#0052cc] focus:bg-white"
                        />
                      </td>

                      {/* Payment Stage */}
                      <td className="py-2.5 px-4">
                        <select
                          value={row.paymentStage}
                          onChange={(e) => handleRowChange(row.id, 'paymentStage', e.target.value)}
                          className="w-full h-8 bg-[#f8f9fb] border border-gray-300 rounded-md px-2 text-xs font-medium text-gray-800 outline-none focus:border-[#0052cc] focus:bg-white"
                        >
                          <option value="full">Full</option>
                          <option value="advance">Advance</option>
                          <option value="mid">Mid</option>
                          <option value="final">Final</option>
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={row.amount}
                            onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
                            className="w-full h-8 pl-6 pr-2 bg-[#f8f9fb] border border-gray-300 rounded-md text-xs font-bold text-emerald-700 outline-none focus:border-[#0052cc] focus:bg-white"
                          />
                        </div>
                      </td>

                      {/* With GST Toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.withGst}
                          onChange={(e) => handleRowChange(row.id, 'withGst', e.target.checked)}
                          className="w-4 h-4 text-[#0052cc] rounded border-gray-300 focus:ring-[#0052cc] cursor-pointer"
                        />
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          placeholder="e.g. Bank Transfer"
                          value={row.description}
                          onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                          className="w-full h-8 bg-[#f8f9fb] border border-gray-300 rounded-md px-2.5 text-xs text-gray-800 outline-none focus:border-[#0052cc] focus:bg-white"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          disabled={paymentRows.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button */}
            <div className="p-3 border-t border-gray-100 bg-[#f8f9fb]/50 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                icon={Plus}
                iconPosition="left"
              >
                Add Another Payment
              </Button>

              <span className="text-xs text-gray-500 font-medium">
                {paymentRows.length} {paymentRows.length === 1 ? 'row' : 'rows'}
              </span>
            </div>
          </div>

          {/* GSTIN Input if any row has GST */}
          {totals.hasGstEnabled && (
            <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                  Customer GSTIN <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-blue-700">Required because one or more payments have GST enabled.</p>
              </div>
              <input
                type="text"
                placeholder="e.g. 33AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full sm:w-64 h-9 bg-white border border-blue-300 rounded-lg px-3 text-xs font-bold text-gray-900 outline-none uppercase"
              />
            </div>
          )}
        </div>

        {/* Modal Footer with Summary */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Base Total
              </span>
              <span className="text-sm font-bold text-gray-800">
                ₹{totals.totalBase.toLocaleString()}
              </span>
            </div>

            {totals.hasGstEnabled && (
              <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  GST Value
                </span>
                <span className="text-sm font-bold text-blue-700">
                  ₹{totals.totalGst.toLocaleString()}
                </span>
              </div>
            )}

            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Grand Total
              </span>
              <span className="text-base font-black text-[#0052cc]">
                ₹{totals.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAll}
              loading={isSaving}
              disabled={isSaving || customerProducts.length === 0}
            >
              Save Payments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;
