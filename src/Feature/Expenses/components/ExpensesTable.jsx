import React from "react";
import { Pencil, FileText, ExternalLink, CheckCircle2, Clock, XCircle } from "lucide-react";
import Table from "../../../UI/Components/Table";
import Button from "../../../UI/Components/Button";
import { getExpenseReceiptUrl } from "../../../Redux/Expense";

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
  expenses = [],
  isLoading = false,
  loadError = "",
  nextCursor = null,
  isLoadingMore = false,
  onLoadMore,
  onEdit,
  searchTerm = "",
}) => {
  const query = searchTerm.trim().toLocaleLowerCase();
  const visibleExpenses = query
    ? expenses.filter((expense) =>
      [
        expense.name,
        expense.category,
        expense.date,
        expense.receiptPath ? "receipt view receipt" : "",
        expense.amount,
        currencyFormatter.format(expense.amount),
        expense.paymentStatus,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query)
    )
    : expenses;

  const columns = [
    {
      key: "name",
      label: "Description",
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-sm block">{row.name}</span>
          <span className="text-[11px] text-gray-500">Business Expense</span>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1  text-xs font-semibold text-blue-700 border border-blue-200">
          {row.category}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (row) => {
        try {
          const d = new Date(`${row.date}T00:00:00`);
          return (
            <span className="text-xs text-gray-600 font-medium">
              {dateFormatter.format(d)}
            </span>
          );
        } catch {
          return <span className="text-xs text-gray-500">{row.date}</span>;
        }
      },
    },
    {
      key: "receipt",
      label: "Receipt",
      render: (row) => {
        if (!row.receiptPath) {
          return <span className="text-xs text-gray-400 italic">No receipt</span>;
        }
        return (
          <a
            href={getExpenseReceiptUrl(row.receiptPath)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Receipt</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        );
      },
    },
    {
      key: "amount",
      label: "Amount (₹)",
      align: "right",
      render: (row) => (
        <span className="font-bold text-gray-900 text-sm">
          {currencyFormatter.format(row.amount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = (row.paymentStatus || "pending").toLowerCase();
        if (status === "paid") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold  text-emerald-700 ">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
            </span>
          );
        }
        if (status === "cancelled") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5  text-xs font-bold text-red-700">
              <XCircle className="w-3 h-3 text-red-600" /> Cancelled
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5  text-xs font-bold text-amber-700 ">
            <Clock className="w-3 h-3 text-amber-600" /> Pending
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={Pencil}
          onClick={() => onEdit(row)}
          className="text-gray-600 hover:text-blue-600"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {loadError}
        </div>
      )}

      <Table
        columns={columns}
        data={visibleExpenses}
        isLoading={isLoading}
        emptyMessage={
          query && expenses.length
            ? "No expenses match your search query."
            : "No expenses recorded yet. Click 'Add Expense' to get started."
        }
        keyField="id"
      />

      {nextCursor && !isLoading && !loadError && (
        <div className="pt-2 text-center">
          <Button
            variant="outline"
            size="md"
            onClick={onLoadMore}
            loading={isLoadingMore}
          >
            Load More Expenses
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExpensesTable;
