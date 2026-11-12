import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const isSupportedReceipt = (file) =>
  file.type === "application/pdf" ||
  file.type.startsWith("image/") ||
  /\.(pdf|jpe?g|png|gif|webp|bmp)$/i.test(file.name);

const AddExpenses = ({ formData, setFormData, categories, onSubmit, onClose }) => {
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
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
        >
          <header className="flex items-start justify-between gap-md border-b border-outline-variant px-md py-md md:px-lg">
            <div>
              <h2
                id="add-expense-title"
                className="text-lg font-bold text-on-surface"
              >
                Add an expense
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Enter the details for this expense.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close add expense dialog"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-md p-md sm:grid-cols-2 md:p-lg"
          >
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
                value={formData.name}
                onChange={(event) =>
                  setFormData({ ...formData, name: event.target.value })
                }
                placeholder="What was the expense for?"
                required
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  setFormData({ ...formData, category: event.target.value })
                }
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                value={formData.amount}
                onChange={(event) =>
                  setFormData({ ...formData, amount: event.target.value })
                }
                placeholder="0.00"
                required
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  setFormData({ ...formData, date: event.target.value })
                }
                required
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="sm:col-span-2">
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
                accept="application/pdf,image/*,.pdf"
                aria-describedby={receiptError ? "expense-receipt-error" : "expense-receipt-help"}
                aria-invalid={Boolean(receiptError)}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setReceiptError("");
                  if (file && !isSupportedReceipt(file)) {
                    setReceiptError("Choose a PDF or image file.");
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
                className="block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
              />
              {receiptError ? (
                <p id="expense-receipt-error" role="alert" className="mt-1.5 text-sm text-error">
                  {receiptError}
                </p>
              ) : (
                <p id="expense-receipt-help" className="mt-1.5 text-xs text-on-surface-variant">
                  Attach a PDF or image of the bill.
                </p>
              )}
              {formData.receipt && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2">
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
            </div>
            <footer className="flex flex-col-reverse gap-sm border-t border-outline-variant pt-md sm:col-span-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add expense
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
