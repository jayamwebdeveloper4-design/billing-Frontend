import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  categories,
  onSubmit,
  onClose,
  isSubmitting,
  isEditing = false,
}) => {
  const descriptionInputRef = useRef(null);
  const receiptInputRef = useRef(null);
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => {
    descriptionInputRef.current?.focus();
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

  return (
    createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-md backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-expense-title"
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-2xl"
        >
          <header className="flex shrink-0 items-start justify-between gap-md border-b border-outline-variant bg-surface-container-lowest px-md py-md md:px-lg">
            <div>
              <h2
                id="add-expense-title"
                className="text-lg font-bold text-on-surface"
              >
                {isEditing ? "Edit expense" : "Add an expense"}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {isEditing
                  ? "Update the details for this expense."
                  : "Enter the details for this expense."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${isEditing ? "edit" : "add"} expense dialog`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          <form
            onSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-md overflow-y-auto p-md sm:grid-cols-2 md:p-lg">
            <div className="sm:col-span-2">
              <label
                htmlFor="expense-name"
                className="mb-1.5 block text-sm font-semibold text-on-surface"
              >
                Description
              </label>
              <input
                ref={descriptionInputRef}
                id="expense-name"
                type="text"
                maxLength={200}
                value={formData.name}
                onChange={(event) =>
                  setFormData((currentData) => ({
                    ...currentData,
                    name: event.target.value,
                  }))
                }
                placeholder="What was the expense for?"
                required
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label
                htmlFor="expense-category"
                className="mb-1.5 block text-sm font-semibold text-on-surface"
              >
                Category
              </label>
              <select
                id="expense-category"
                value={formData.category}
                onChange={(event) =>
                  setFormData((currentData) => ({
                    ...currentData,
                    category: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="expense-amount"
                className="mb-1.5 block text-sm font-semibold text-on-surface"
              >
                Amount (₹)
              </label>
              <input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                max="90071992547409.91"
                value={formData.amount}
                onChange={(event) =>
                  setFormData((currentData) => ({
                    ...currentData,
                    amount: event.target.value,
                  }))
                }
                placeholder="0.00"
                required
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label
                htmlFor="expense-date"
                className="mb-1.5 block text-sm font-semibold text-on-surface"
              >
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                value={formData.date}
                onChange={(event) =>
                  setFormData((currentData) => ({
                    ...currentData,
                    date: event.target.value,
                  }))
                }
                required
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {isEditing && (
              <div>
                <label
                  htmlFor="expense-payment-status"
                  className="mb-1.5 block text-sm font-semibold text-on-surface"
                >
                  Payment status
                </label>
                <select
                  id="expense-payment-status"
                  value={formData.paymentStatus}
                  onChange={(event) =>
                    setFormData((currentData) => ({
                      ...currentData,
                      paymentStatus: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
            {!isEditing && <div className="sm:col-span-2">
              <label
                htmlFor="expense-receipt"
                className="mb-1.5 block text-sm font-semibold text-on-surface"
              >
                Bill receipt <span className="font-normal text-on-surface-variant">(optional)</span>
              </label>
              <input
                ref={receiptInputRef}
                id="expense-receipt"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,image/bmp,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                aria-describedby={receiptError ? "expense-receipt-error" : "expense-receipt-help"}
                aria-invalid={Boolean(receiptError)}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setReceiptError("");
                  if (file && file.size > 5 * 1024 * 1024) {
                    setReceiptError("The receipt must be 5 MB or smaller.");
                    setFormData((currentData) => ({
                      ...currentData,
                      receipt: null,
                    }));
                    event.target.value = "";
                    return;
                  }
                  if (file && !isSupportedReceipt(file)) {
                    setReceiptError("Choose a PDF, JPEG, PNG, GIF, WebP, or BMP file.");
                    setFormData((currentData) => ({
                      ...currentData,
                      receipt: null,
                    }));
                    event.target.value = "";
                    return;
                  }
                  setFormData((currentData) => ({
                    ...currentData,
                    receipt: file || null,
                  }));
                }}
                className="block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface file:mr-3 file:rounded-sm file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
              />
              {receiptError ? (
                <p id="expense-receipt-error" role="alert" className="mt-1.5 text-sm text-error">
                  {receiptError}
                </p>
              ) : (
                <p id="expense-receipt-help" className="mt-1.5 text-xs text-on-surface-variant">
                  Attach a PDF or supported image of the bill (5 MB max).
                </p>
              )}
              {formData.receipt && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-surface-container-low px-3 py-2">
                  <span className="truncate text-sm text-on-surface">
                    {formData.receipt.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptError("");
                      setFormData((currentData) => ({ ...currentData, receipt: null }));
                      if (receiptInputRef.current) receiptInputRef.current.value = "";
                    }}
                    className="shrink-0 text-sm font-semibold text-primary hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>}
            </div>
            <footer className="flex shrink-0 flex-col-reverse gap-sm border-t border-outline-variant bg-surface-container-lowest px-md py-md sm:flex-row sm:justify-end md:px-lg">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-outline-variant px-5 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {!isSubmitting && (
                  <span className="material-symbols-outlined text-[20px]">
                    {isEditing ? "save" : "add"}
                  </span>
                )}
                {isSubmitting
                  ? (isEditing ? "Saving..." : "Adding...")
                  : (isEditing ? "Save changes" : "Add expense")}
              </button>
            </footer>
          </form>
        </section>
      </div>,
      document.body,
    )
  );
};

export default AddExpenses;
