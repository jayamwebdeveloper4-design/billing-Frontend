import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, RotateCcw, Filter } from "lucide-react";
import {
  useLazyGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "../../Redux/Expense";
import { expenseCategories } from "./expenseCategories";
import AddExpenses from "./components/addExpenses";
import ExpensesTable from "./components/ExpensesTable";
import ProjectTimesheets from "./components/ProjectTimesheets";
import Header from "../../UI/LayoutComponents/Header";
import Button from "../../UI/Components/Button";
import SearchBar from "../../UI/Components/SearchBar";

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
  label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(
    new Date(2020, index, 1)
  ),
}));

const createEmptyExpenseForm = () => ({
  name: "",
  amount: "",
  category: expenseCategories[0],
  date: getTodayDate(),
  receipt: null,
  paymentStatus: "pending",
});

export const Expenses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [triggerGetExpenses] = useLazyGetExpensesQuery();
  const [createExpenseMutation] = useCreateExpenseMutation();
  const [updateExpenseMutation] = useUpdateExpenseMutation();
  const requestedView = searchParams.get("view");
  const activeView =
    requestedView === "employees" || requestedView === "projects"
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
        const result = await triggerGetExpenses({
          ...activeFilters,
        }).unwrap();
        setExpenseList(result.expenses || result.data || []);
        setNextCursor(result.nextCursor);
        setSummary(result.summary);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error?.data?.message || error?.message || "Failed to load expenses.";
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadExpenses();
    return () => controller.abort();
  }, [activeFilters, activeView]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await triggerGetExpenses({ ...activeFilters, cursor: nextCursor }).unwrap();
      setExpenseList((currentExpenses) => {
        const existingIds = new Set(currentExpenses.map((expense) => expense.id));
        const newItems = result.expenses || result.data || [];
        return [
          ...currentExpenses,
          ...newItems.filter((expense) => !existingIds.has(expense.id)),
        ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      });
      setNextCursor(result.nextCursor);
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Failed to load more expenses.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(formData.amount);

    if (
      !formData.name.trim() ||
      !/^\d+(?:\.\d{1,2})?$/.test(formData.amount) ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error("Enter a description and a valid positive amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        const updated = await updateExpenseMutation({
          id: editingExpense.id,
          name: formData.name.trim(),
          amount,
          category: formData.category,
          date: formData.date,
          paymentStatus: formData.paymentStatus,
        }).unwrap();

        setExpenseList((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
        toast.success("Expense updated successfully.");
        closeAddModal();
      } else {
        const created = await createExpenseMutation({
          name: formData.name.trim(),
          amount,
          category: formData.category,
          date: formData.date,
          receipt: formData.receipt,
        }).unwrap();

        setExpenseList((current) => [created, ...current]);
        toast.success("Expense recorded successfully.");
        closeAddModal();
      }
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    const nextFilters = {};
    if (filterValues.category) nextFilters.category = filterValues.category;
    if (filterValues.month && filterValues.year) {
      nextFilters.month = `${filterValues.year}-${filterValues.month.padStart(2, "0")}`;
    }
    setActiveFilters(nextFilters);
  };

  const handleClearFilters = () => {
    const period = getCurrentMonthYear();
    setFilterValues({
      category: "",
      month: period.month,
      year: period.year,
    });
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
  const isDefaultFilter =
    !filterValues.category &&
    filterValues.month === currentPeriod.month &&
    filterValues.year === currentPeriod.year &&
    !activeFilters.category &&
    activeFilters.month === `${currentPeriod.year}-${currentPeriod.month.padStart(2, "0")}`;

  return (
    <div className="max-w-[1440px] mx-auto p-2 md:p-2 space-y-6">
      {/* View Navigation Tabs */}
      <nav
        aria-label="Expense and timesheet views"
        className="flex items-center gap-1.5 bg-[#edeef0]/60 p-1 rounded-xl border border-[#c3c6d6]/60 w-fit"
      >
        {[
          { id: "expenses", label: "Expenses" },
          { id: "employees", label: "Employee Timesheets" },
          { id: "projects", label: "Project Timesheets" },
        ].map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setSearchParams(tab.id === "expenses" ? {} : { view: tab.id })
              }
              className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap select-none ${isActive
                  ? "bg-[#003d9b] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeView === "expenses" ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header */}
          <Header
            title="Business Expenses"
            subtitle="Track, filter, and review operating expenses and vendor payments."
            action={
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={handleOpenAddModal}
              >
                Add Expense
              </Button>
            }
          />

          {/* Filter Bar & Search */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-gray-200/80 shadow-xs">
            <form
              onSubmit={handleApplyFilters}
              className="flex flex-wrap items-center gap-2.5"
            >
              <div className="w-40 sm:w-44">
                <select
                  value={filterValues.category}
                  onChange={(e) =>
                    setFilterValues((curr) => ({ ...curr, category: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">All Categories</option>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-36">
                <select
                  value={filterValues.month}
                  onChange={(e) =>
                    setFilterValues((curr) => ({ ...curr, month: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={filterValues.year}
                  onChange={(e) =>
                    setFilterValues((curr) => ({ ...curr, year: e.target.value }))
                  }
                  placeholder="Year"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                type="submit"
                icon={Filter}
                disabled={isLoading}
              >
                Filter
              </Button>

              <Button
                variant="outline"
                size="sm"
                type="button"
                icon={RotateCcw}
                onClick={handleClearFilters}
                disabled={isLoading || isDefaultFilter}
              >
                Clear
              </Button>
            </form>

            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search expenses by name, category, amount..."
              className="max-w-md w-full"
            />
          </div>

          {/* Add / Edit Expense Modal */}
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

          {/* Expenses Table */}
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
        </div>
      ) : (
        <ProjectTimesheets
          view={activeView}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      )}
    </div>
  );
};

export default Expenses;
