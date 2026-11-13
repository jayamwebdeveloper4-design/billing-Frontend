import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createExpense,
  getExpenses,
  updateExpense,
} from "../../api/expenseApi";
import { expenseCategories } from "./expenseCategories";
import AddExpenses from "./components/addExpenses";
import ExpensesTable from "./components/ExpensesTable";
import ProjectTimesheets from "./components/ProjectTimesheets";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const getTodayDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

const getCurrentMonthYear = () => {
  const today = new Date();
  return {
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
  };
};

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat("en-IN", { month: "long" })
    .format(new Date(2020, index, 1)),
}));

const createEmptyExpenseForm = () => ({
  name: "",
  amount: "",
  category: expenseCategories[0],
  date: getTodayDate(),
  receipt: null,
  paymentStatus: "pending",
});

const Expenses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeView = requestedView === "employees" || requestedView === "projects"
    ? requestedView
    : "expenses";
  const [expenseList, setExpenseList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState(() => ({
    category: "",
    ...getCurrentMonthYear(),
  }));
  const [activeFilters, setActiveFilters] = useState(() => {
    const period = getCurrentMonthYear();
    return {
      month: `${period.year}-${period.month.padStart(2, "0")}`,
    };
  });
  const [formData, setFormData] = useState(createEmptyExpenseForm);
  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingExpense(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (activeView !== "expenses") {
      setIsLoading(false);
      return () => controller.abort();
    }

    const loadExpenses = async () => {
      setIsLoading(true);
      setLoadError("");
      setExpenseList([]);
      setNextCursor(null);
      try {
        const result = await getExpenses({
          ...activeFilters,
          signal: controller.signal,
        });
        setExpenseList(result.expenses);
        setNextCursor(result.nextCursor);
        setSummary(result.summary);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error.response?.data?.message || "Failed to load expenses.";
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadExpenses();
    return () => controller.abort();
  }, [activeFilters, activeView]);

  const currentMonth = getTodayDate().slice(0, 7);
  const formatCurrency = (amount) => currencyFormatter.format(amount);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await getExpenses({ ...activeFilters, cursor: nextCursor });
      setExpenseList((currentExpenses) => {
        const existingIds = new Set(currentExpenses.map((expense) => expense.id));
        return [...currentExpenses, ...result.expenses.filter(
          (expense) => !existingIds.has(expense.id),
        )].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      });
      setNextCursor(result.nextCursor);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load more expenses.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(formData.amount);

    if (
      !formData.name.trim()
      || !/^\d+(?:\.\d{1,2})?$/.test(formData.amount)
      || !Number.isFinite(amount)
      || amount <= 0
    ) {
      toast.error("Enter a description and a valid positive amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const expense = editingExpense
        ? await updateExpense(editingExpense.id, formData)
        : await createExpense(formData);
      if (editingExpense) {
        setExpenseList((currentExpenses) => currentExpenses.map((item) =>
          item.id === expense.id ? expense : item,
        ));
        try {
          const result = await getExpenses(activeFilters);
          setExpenseList(result.expenses);
          setNextCursor(result.nextCursor);
          setSummary(result.summary);
        } catch (error) {
          toast.error(
            error.response?.data?.message
              || "Expense updated, but the list could not be refreshed.",
          );
        }
        setFormData(createEmptyExpenseForm());
        setIsAddModalOpen(false);
        setEditingExpense(null);
        toast.success("Expense updated.");
        return;
      }
      const matchesFilters = (
        (!activeFilters.category || expense.category === activeFilters.category)
        && (!activeFilters.month || expense.date.slice(0, 7) === activeFilters.month)
      );
      if (matchesFilters) {
        setExpenseList((currentExpenses) => [
          expense,
          ...currentExpenses.filter((item) => item.id !== expense.id),
        ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)));
      }
      setSummary((currentSummary) => currentSummary && (matchesFilters ? {
        count: currentSummary.count + 1,
        totalAmount: currentSummary.totalAmount + expense.amount,
        monthlyAmount: currentSummary.monthlyAmount
          + (expense.date.slice(0, 7) === currentMonth ? expense.amount : 0),
      } : currentSummary));
      setFormData(createEmptyExpenseForm());
      setIsAddModalOpen(false);
      toast.success("Expense added.");
    } catch (error) {
      toast.error(
        error.response?.data?.message
          || (editingExpense ? "Failed to update expense." : "Failed to add expense."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    if (!filterValues.month || !filterValues.year) {
      toast.error("Select both a month and a year.");
      return;
    }

    setActiveFilters({
      category: filterValues.category,
      month: `${filterValues.year}-${filterValues.month.padStart(2, "0")}`,
    });
  };

  const handleClearFilters = () => {
    const period = getCurrentMonthYear();
    setFilterValues({ category: "", ...period });
    setActiveFilters({
      month: `${period.year}-${period.month.padStart(2, "0")}`,
    });
  };
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
      receipt: null,
      paymentStatus: expense.paymentStatus || "pending",
    });
    setIsAddModalOpen(true);
  };
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData(createEmptyExpenseForm());
    setIsAddModalOpen(true);
  };
  const currentPeriod = getCurrentMonthYear();
  const isDefaultFilter = (
    !filterValues.category
    && filterValues.month === currentPeriod.month
    && filterValues.year === currentPeriod.year
    && !activeFilters.category
    && activeFilters.month === `${currentPeriod.year}-${currentPeriod.month.padStart(2, "0")}`
  );

  return (
    <main className="space-y-lg md:space-y-xl">
      <nav
        aria-label="Expense and timesheet views"
        className="flex flex-wrap gap-sm border-b border-outline-variant"
      >
        {[
          { id: "expenses", label: "Expenses" },
          { id: "employees", label: "Employee Timesheets" },
          { id: "projects", label: "Project Timesheets" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={activeView === tab.id ? "page" : undefined}
            onClick={() => setSearchParams(tab.id === "expenses" ? {} : { view: tab.id })}
            className={`border-b-2 px-3 py-2 text-sm font-bold transition ${
              activeView === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeView === "expenses" ? (
        <>
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
              <span className="text-xs font-bold text-primary" aria-live="polite">
                {isLoading
                  ? "Loading expenses..."
                  : `${summary?.count ?? expenseList.length} ${summary?.count === 1 ? "expense" : "expenses"}`}
              </span>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isAddModalOpen}
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:brightness-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add expense
              </button>
            </div>
          </header>

          <form
            onSubmit={handleApplyFilters}
            className="flex flex-col flex-wrap gap-sm sm:flex-row sm:items-center"
          >
            <div className="sm:w-44">
              <label htmlFor="expense-filter-category" className="sr-only">
                Category
              </label>
              <select
                id="expense-filter-category"
                value={filterValues.category}
                onChange={(event) =>
                  setFilterValues((current) => ({ ...current, category: event.target.value }))
                }
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All categories</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-40">
              <label htmlFor="expense-filter-month" className="sr-only">
                Month
              </label>
              <select
                id="expense-filter-month"
                value={filterValues.month}
                onChange={(event) =>
                  setFilterValues((current) => ({ ...current, month: event.target.value }))
                }
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:w-28">
              <label htmlFor="expense-filter-year" className="sr-only">
                Year
              </label>
              <input
                id="expense-filter-year"
                type="number"
                min="1000"
                max="9999"
                step="1"
                placeholder="Year"
                value={filterValues.year}
                onChange={(event) =>
                  setFilterValues((current) => ({ ...current, year: event.target.value }))
                }
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-sm">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={isLoading || isDefaultFilter}
                className="rounded-md border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            </div>
            <div className="relative w-full sm:ml-auto sm:w-64">
              <label htmlFor="expenses-timesheets-search" className="sr-only">
                Search all views
              </label>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
                search
              </span>
              <input
                id="expenses-timesheets-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search..."
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </form>

          {isAddModalOpen && (
            <AddExpenses
              formData={formData}
              setFormData={setFormData}
              categories={expenseCategories}
              onSubmit={handleSubmit}
              onClose={closeAddModal}
              isSubmitting={isSubmitting}
              isEditing={Boolean(editingExpense)}
            />
          )}

          <ExpensesTable
            expenses={expenseList}
            isLoading={isLoading}
            loadError={loadError}
            nextCursor={nextCursor}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            onEdit={handleEditExpense}
            searchTerm={searchTerm}
          />
        </>
      ) : (
        <ProjectTimesheets
          view={activeView}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      )}
    </main>
  );
};

export default Expenses;
