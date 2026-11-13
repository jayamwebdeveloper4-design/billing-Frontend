import React from "react";
import { getExpenseReceiptUrl } from "../../../api/expenseApi";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const ExpensesTable = ({
  expenses,
  isLoading,
  loadError,
  nextCursor,
  isLoadingMore,
  onLoadMore,
  onEdit,
  searchTerm = "",
}) => {
  const query = searchTerm.trim().toLocaleLowerCase();
  const visibleExpenses = query
    ? expenses.filter((expense) => [
      expense.name,
      expense.category,
      expense.date,
      expense.receiptPath ? "receipt view receipt" : "",
      expense.amount,
      currencyFormatter.format(expense.amount),
      expense.paymentStatus,
    ].join(" ").toLocaleLowerCase().includes(query))
    : expenses;

  return (
    <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[900px] text-left">
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
            <th scope="col" className="px-md py-3">
              Status
            </th>
            <th scope="col" className="px-md py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="7" className="px-md py-8 text-center text-sm text-on-surface-variant">
                Loading expenses...
              </td>
            </tr>
          ) : loadError ? (
            <tr>
              <td colSpan="7" role="alert" className="px-md py-8 text-center text-sm text-error">
                {loadError}
              </td>
            </tr>
          ) : visibleExpenses.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-md py-8 text-center text-sm text-on-surface-variant">
                {query && expenses.length
                  ? "No expenses match your search."
                  : "No expenses yet. Add an expense to get started."}
              </td>
            </tr>
          ) : visibleExpenses.map((expense) => (
            <tr
              key={expense.id}
              className="border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-low/50"
            >
              <td className="px-md py-4 font-semibold text-on-surface md:px-lg">
                {expense.name}
              </td>
              <td className="px-md py-4">
                <span className="rounded-sm bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {expense.category}
                </span>
              </td>
              <td className="px-md py-4 text-sm text-on-surface-variant">
                {dateFormatter.format(new Date(`${expense.date}T00:00:00`))}
              </td>
              <td className="px-md py-4">
                {expense.receiptPath ? (
                  <a
                    href={getExpenseReceiptUrl(expense.receiptPath)}
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
                {currencyFormatter.format(expense.amount)}
              </td>
              <td className="px-md py-4">
                <span
                  className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${
                    expense.paymentStatus === "paid"
                      ? "bg-green-100 text-green-800"
                      : expense.paymentStatus === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {expense.paymentStatus === "paid"
                    ? "Paid"
                    : expense.paymentStatus === "cancelled"
                      ? "Cancelled"
                      : "Pending"}
                </span>
              </td>
              <td className="px-md py-4">
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  aria-label={`Edit ${expense.name}`}
                  className="rounded-md px-3 py-1.5 text-sm font-bold text-primary transition hover:bg-primary/10"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {nextCursor && !isLoading && !loadError && (
        <div className="border-t border-outline-variant px-md py-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="rounded-md px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </section>
  );
};

export default ExpensesTable;