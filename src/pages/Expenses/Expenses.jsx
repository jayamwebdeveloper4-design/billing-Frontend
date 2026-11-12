import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { expenseCategories, expenses } from "./dummydata";
import AddExpenses from "./components/addExpenses";

const getTodayDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

const Expenses = () => {
  const [expenseList, setExpenseList] = useState(expenses);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: expenseCategories[0],
    date: getTodayDate(),
    receipt: null,
  });
  const receiptUrlsRef = useRef(new Set());
  const closeAddModal = useCallback(() => setIsAddModalOpen(false), []);

  useEffect(
    () => () => {
      receiptUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const sortedExpenses = useMemo(
    () => [...expenseList].sort((a, b) => b.date.localeCompare(a.date)),
    [expenseList],
  );
  const totalAmount = expenseList.reduce(
    (total, expense) => total + Number(expense.amount),
    0,
  );
  const currentMonth = getTodayDate().slice(0, 7);
  const monthlyAmount = expenseList.reduce(
    (total, expense) =>
      expense.date.startsWith(currentMonth)
        ? total + Number(expense.amount)
        : total,
    0,
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  const handleSubmit = (event) => {
    event.preventDefault();
    const amount = Number(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an expense amount greater than zero.");
      return;
    }

    const receiptUrl = formData.receipt
      ? URL.createObjectURL(formData.receipt)
      : null;
    if (receiptUrl) receiptUrlsRef.current.add(receiptUrl);

    setExpenseList((currentExpenses) => [
      {
        id: Date.now(),
        name: formData.name.trim(),
        amount,
        category: formData.category,
        date: formData.date,
        receiptUrl,
      },
      ...currentExpenses,
    ]);
    setFormData((currentData) => ({
      ...currentData,
      name: "",
      amount: "",
      receipt: null,
    }));
    setIsAddModalOpen(false);
    toast.success("Expense added.");
  };

  return (
    <main className="space-y-lg md:space-y-xl">
      <header className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-black text-on-surface md:text-3xl">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Record and review your business expenses.
          </p>
        </div>
        <div className="flex items-center justify-between gap-md sm:justify-end">
          <span className="text-xs font-bold text-primary">
            {expenseList.length} {expenseList.length === 1 ? "expense" : "expenses"}
          </span>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isAddModalOpen}
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add expense
          </button>
        </div>
      </header>

      <section
        aria-label="Expense totals"
        className="grid grid-cols-1 gap-md sm:grid-cols-2"
      >
        <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <p className="text-sm font-semibold text-on-surface-variant">
            Total expenses
          </p>
          <p className="mt-2 text-2xl font-black text-on-surface">
            {formatCurrency(totalAmount)}
          </p>
        </article>
        <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <p className="text-sm font-semibold text-on-surface-variant">
            This month
          </p>
          <p className="mt-2 text-2xl font-black text-on-surface">
            {formatCurrency(monthlyAmount)}
          </p>
        </article>
      </section>

      {isAddModalOpen && (
        <AddExpenses
          formData={formData}
          setFormData={setFormData}
          categories={expenseCategories}
          onSubmit={handleSubmit}
          onClose={closeAddModal}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant px-md py-md md:px-lg">
          <h2 className="text-lg font-bold text-on-surface">Expense history</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Your newest expenses appear first.
          </p>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <th scope="col" className="px-md py-3 md:px-lg">
                  Description
                </th>
                <th scope="col" className="px-md py-3">
                  Category
                </th>
                <th scope="col" className="px-md py-3">
                  Date
                </th>
                <th scope="col" className="px-md py-3">
                  Receipt
                </th>
                <th scope="col" className="px-md py-3 text-right md:px-lg">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-low/50"
                >
                  <td className="px-md py-4 font-semibold text-on-surface md:px-lg">
                    {expense.name}
                  </td>
                  <td className="px-md py-4">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-md py-4 text-sm text-on-surface-variant">
                    {new Date(`${expense.date}T00:00:00`).toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </td>
                  <td className="px-md py-4">
                    {expense.receiptUrl ? (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        View receipt
                      </a>
                    ) : (
                      <span className="text-sm text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="px-md py-4 text-right font-bold text-on-surface md:px-lg">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default Expenses;
