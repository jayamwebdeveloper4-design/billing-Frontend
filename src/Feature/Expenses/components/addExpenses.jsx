import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Receipt, Upload, Trash2, CheckCircle2 } from "lucide-react";
import Button from "../../../UI/Components/Button";
import InputFeild from "../../../UI/Components/InputFeild";

const supportedReceiptTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
]);

const isSupportedReceipt = (file) =>
  supportedReceiptTypes.has(file.type) ||
  /\.(pdf|jpe?g|png|gif|webp|bmp)$/i.test(file.name);

const AddExpenses = ({
  formData,
  setFormData,
  categories = [],
  onSubmit,
  onClose,
  isSubmitting = false,
  isEditing = false,
}) => {
  const receiptInputRef = useRef(null);
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [onClose]);

  const categoryOptions = categories.map((cat) => ({
    value: cat,
    label: cat,
  }));

  const paymentStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2
                id="add-expense-title"
                className="text-base font-bold text-gray-900"
              >
                {isEditing ? "Edit Expense" : "Record New Expense"}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {isEditing
                  ? "Update the details for this expense record."
                  : "Enter the details and receipt for this expense."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Description */}
          <InputFeild
            label="Description"
            required
            placeholder="What was this expense for? (e.g. Server hosting, Office supplies)"
            value={formData.name}
            onChange={(e) =>
              setFormData((current) => ({ ...current, name: e.target.value }))
            }
            maxLength={200}
            autoFocus
          />

          {/* Category & Amount in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <InputFeild
              label="Category"
              required
              as="select"
              options={categoryOptions}
              value={formData.category}
              onChange={(e) =>
                setFormData((current) => ({ ...current, category: e.target.value }))
              }
            />

            <InputFeild
              label="Amount (₹)"
              required
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData((current) => ({ ...current, amount: e.target.value }))
              }
            />
          </div>

          {/* Date & Payment Status in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <InputFeild
              label="Date"
              required
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((current) => ({ ...current, date: e.target.value }))
              }
            />

            {isEditing && (
              <InputFeild
                label="Payment Status"
                required
                as="select"
                options={paymentStatusOptions}
                value={formData.paymentStatus}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    paymentStatus: e.target.value,
                  }))
                }
              />
            )}
          </div>

          {/* Receipt Attachment (if not editing) */}
          {!isEditing && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700 tracking-wider uppercase select-none">
                Bill Receipt <span className="text-gray-400 font-normal lowercase">(optional, max 5MB)</span>
              </label>

              <div className="relative">
                <input
                  ref={receiptInputRef}
                  id="expense-receipt"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,image/bmp,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setReceiptError("");
                    if (file && file.size > 5 * 1024 * 1024) {
                      setReceiptError("The receipt must be 5 MB or smaller.");
                      setFormData((current) => ({ ...current, receipt: null }));
                      event.target.value = "";
                      return;
                    }
                    if (file && !isSupportedReceipt(file)) {
                      setReceiptError("Please choose a PDF, JPEG, PNG, GIF, WebP, or BMP file.");
                      setFormData((current) => ({ ...current, receipt: null }));
                      event.target.value = "";
                      return;
                    }
                    setFormData((current) => ({
                      ...current,
                      receipt: file || null,
                    }));
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {receiptError && (
                <p className="text-xs text-red-600 font-medium">{receiptError}</p>
              )}

              {formData.receipt && (
                <div className="flex items-center justify-between p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-gray-800 truncate">{formData.receipt.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptError("");
                      setFormData((current) => ({ ...current, receipt: null }));
                      if (receiptInputRef.current) receiptInputRef.current.value = "";
                    }}
                    className="text-red-600 hover:text-red-800 font-semibold text-xs ml-2 shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <footer className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <Button variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSubmitting}>
              {isEditing ? "Save Changes" : "Add Expense"}
            </Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
};

export default AddExpenses;
