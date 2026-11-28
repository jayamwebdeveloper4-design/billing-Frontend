import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  FolderKanban,
  Filter,
  RotateCcw,
  ExternalLink,
  Clock,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { useLazyGetProjectTimesheetQuery } from "../../../Redux/Project";
import Table from "../../../UI/Components/Table";
import Button from "../../../UI/Components/Button";
import SearchBar from "../../../UI/Components/SearchBar";
import Header from "../../../UI/LayoutComponents/Header";

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

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
};

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : "—";
};

const formatContact = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : value || "";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(
    new Date(2020, index, 1)
  ),
}));

const getCurrentMonthYear = () => {
  const today = new Date();
  return {
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
  };
};

export const ProjectTimesheets = ({ view, searchTerm, onSearchTermChange }) => {
  const navigate = useNavigate();
  const [triggerGetProjectTimesheet] = useLazyGetProjectTimesheetQuery();
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [dateFilters, setDateFilters] = useState(getCurrentMonthYear);
  const [activeDateFilters, setActiveDateFilters] = useState(getCurrentMonthYear);

  useEffect(() => {
    const controller = new AbortController();
    const loadTimesheets = async () => {
      setIsLoading(true);
      setLoadError("");
      setRows([]);
      setNextCursor(null);
      try {
        const result = await triggerGetProjectTimesheet({
          view,
          ...activeDateFilters,
        }).unwrap();
        const list = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.rows)
          ? result.rows
          : [];
        setRows(list);
        setNextCursor(result?.nextCursor || null);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error?.data?.message || error?.message || "Failed to load timesheets.";
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadTimesheets();
    return () => controller.abort();
  }, [view, activeDateFilters]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await triggerGetProjectTimesheet({
        view,
        ...activeDateFilters,
        cursor: nextCursor,
      }).unwrap();
      const newItems = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.rows)
        ? result.rows
        : [];
      setRows((currentRows) => {
        const safeCurrent = Array.isArray(currentRows) ? currentRows : [];
        const existingIds = new Set(safeCurrent.map((item) => item._id));
        return [
          ...safeCurrent,
          ...newItems.filter((item) => !existingIds.has(item._id)),
        ];
      });
      setNextCursor(result?.nextCursor || null);
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Failed to load more timesheets.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openDetails = (type, item) => {
    const id = String(item._id);
    const path =
      type === "employees"
        ? `/expenses/employee-timesheets/${id}`
        : `/expenses/project-timesheets/${id}`;
    const params = new URLSearchParams(activeDateFilters);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());

    navigate(`${path}?${params.toString()}`, {
      state: {
        name:
          type === "employees"
            ? item.name || "Unnamed employee"
            : item.projectName || "Unnamed project",
      },
    });
  };

  const applyDateFilters = (event) => {
    event.preventDefault();
    if (Boolean(dateFilters.month) !== Boolean(dateFilters.year)) {
      toast.error("Select both a month and a year.");
      return;
    }
    setActiveDateFilters({ ...dateFilters });
  };

  const clearDateFilters = () => {
    const currentPeriod = getCurrentMonthYear();
    setDateFilters(currentPeriod);
    setActiveDateFilters(currentPeriod);
  };

  const currentPeriod = getCurrentMonthYear();
  const isCurrentPeriodSelected =
    dateFilters.month === currentPeriod.month &&
    dateFilters.year === currentPeriod.year &&
    activeDateFilters.month === currentPeriod.month &&
    activeDateFilters.year === currentPeriod.year;

  const query = (searchTerm || "").trim().toLocaleLowerCase();
  const matchesSearch = (item) =>
    !query || JSON.stringify(item).toLocaleLowerCase().includes(query);
  const safeRows = Array.isArray(rows) ? rows : [];
  const visibleRows = safeRows.filter(matchesSearch);

  // Employee Table Columns
  const employeeColumns = [
    {
      key: "employee",
      label: "Employee",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 text-sm block">
              {row.name || "Unnamed Employee"}
            </span>
            <span className="text-[11px] font-normal text-gray-500">
              Joined {formatDate(row.joiningDate)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (row) => (
        <div className="space-y-0.5 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span>{row.email || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>
              {Array.isArray(row.phone)
                ? row.phone.join(", ")
                : row.phone || "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "workDays",
      label: "Work Days",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-gray-800 text-xs">
          {row.workDays} days
        </span>
      ),
    },
    {
      key: "hours",
      label: "Total Hours",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-gray-800 text-xs">
          {Number(row.totalHours || 0).toFixed(2)} hrs
        </span>
      ),
    },
    {
      key: "salary",
      label: "Salary",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-gray-900 text-sm tabular-nums">
          {formatCurrency(row.salary)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          icon={ExternalLink}
          onClick={() => openDetails("employees", row)}
          className="text-blue-700 hover:bg-blue-50 border-blue-200"
        >
          Timesheet
        </Button>
      ),
    },
  ];

  // Project Table Columns
  const projectColumns = [
    {
      key: "project",
      label: "Project",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
            <FolderKanban className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 text-sm block">
              {row.projectName || "Unnamed Project"}
            </span>
            <span className="text-[11px] font-normal text-gray-500 tabular-nums">
              Budget: {row.budget?.currency || "₹"} {row.budget?.amount ?? "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer / Service",
      render: (row) => (
        <div className="space-y-0.5 text-xs text-gray-700">
          <div className="font-semibold">{row.customerName || "—"}</div>
          <div className="text-gray-500">{row.serviceName || "—"}</div>
          {formatContact(row.customerPhone) && (
            <div className="text-[11px] text-gray-400">
              Phone: {formatContact(row.customerPhone)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "workDays",
      label: "Work Days",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-gray-800 text-xs">
          {row.workDays} days
        </span>
      ),
    },
    {
      key: "hours",
      label: "Total Hours",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-gray-800 text-xs">
          {Number(row.totalHours || 0).toFixed(2)} hrs
        </span>
      ),
    },
    {
      key: "employees",
      label: "Assigned Staff",
      render: (row) => (
        <span className="text-xs text-gray-600">
          {Array.isArray(row.employees) && row.employees.length
            ? row.employees.map((e) => e?.name).filter(Boolean).join(", ")
            : "No staff logged"}
        </span>
      ),
    },
    {
      key: "expenses",
      label: "Expense (₹)",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-gray-900 text-sm tabular-nums">
          {row.expenseAmount == null ? "—" : formatCurrency(row.expenseAmount)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          icon={ExternalLink}
          onClick={() => openDetails("projects", row)}
          className="text-indigo-700 hover:bg-indigo-50 border-indigo-200"
        >
          Breakdown
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <Header
        title={view === "employees" ? "Employee Timesheets" : "Project Timesheets"}
        subtitle={
          view === "employees"
            ? "Review employee contact details, logged workdays, hours, and allocated salary."
            : "Review project details, staff hours, and payroll/vendor expenses."
        }
      />

      {/* Date Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <SearchBar
          value={searchTerm}
          onChange={onSearchTermChange}
          placeholder={`Search ${view}...`}
          className="max-w-md w-full"
        />

        <form onSubmit={applyDateFilters} className="flex flex-wrap items-center gap-2.5">
          <div className="w-36">
            <select
              value={dateFilters.month}
              onChange={(e) =>
                setDateFilters((curr) => ({ ...curr, month: e.target.value }))
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
              value={dateFilters.year}
              onChange={(e) =>
                setDateFilters((curr) => ({ ...curr, year: e.target.value }))
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
            onClick={clearDateFilters}
            disabled={isLoading || isCurrentPeriodSelected}
          >
            Clear
          </Button>
        </form>
      </div>

      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Table */}
      <Table
        columns={view === "employees" ? employeeColumns : projectColumns}
        data={visibleRows}
        isLoading={isLoading}
        emptyMessage={
          loadError ||
          (rows.length === 0
            ? `No ${view} found.`
            : `No matching ${view} found for your search.`)
        }
        keyField="_id"
      />

      {nextCursor && !isLoading && !loadError && (
        <div className="pt-2 text-center">
          <Button
            variant="outline"
            size="md"
            onClick={loadMore}
            loading={isLoadingMore}
          >
            Load More Timesheets
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProjectTimesheets;
