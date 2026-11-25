import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Filter,
  RotateCcw,
  Clock,
  Calendar,
  DollarSign,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
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

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

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

const getInitialPeriod = (searchParams) => {
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  return month && year ? { month, year } : getCurrentMonthYear();
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
};

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : timeFormatter.format(date);
};

const formatDuration = (rowOrVal) => {
  if (!rowOrVal) return "0h 0m";

  let mins = 0;
  if (typeof rowOrVal === "object") {
    const row = rowOrVal;
    if (
      row.totalMinutes !== undefined &&
      row.totalMinutes !== null &&
      !isNaN(Number(row.totalMinutes)) &&
      Number(row.totalMinutes) > 0
    ) {
      mins = Number(row.totalMinutes);
    } else if (row.startTime && row.endTime) {
      const start = new Date(row.startTime).getTime();
      const end = new Date(row.endTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        mins = Math.round((end - start) / (1000 * 60));
      }
    } else if (
      row.duration !== undefined &&
      row.duration !== null &&
      !isNaN(Number(row.duration))
    ) {
      const d = Number(row.duration);
      mins = d <= 24 ? Math.round(d * 60) : Math.round(d);
    }
  } else {
    const val = Number(rowOrVal);
    mins = val <= 24 ? Math.round(val * 60) : Math.round(val);
  }

  const wholeHours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${wholeHours}h ${minutes}m`;
};

export const TimesheetDetailsPage = ({ view, entityId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [triggerGetProjectTimesheet] = useLazyGetProjectTimesheetQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateFilters, setDateFilters] = useState(() => getInitialPeriod(searchParams));
  const [activeDateFilters, setActiveDateFilters] = useState(() =>
    getInitialPeriod(searchParams)
  );
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [title, setTitle] = useState(location.state?.name || "");
  const [detailRows, setDetailRows] = useState([]);
  const [detailCursor, setDetailCursor] = useState(null);
  const [employeeCosts, setEmployeeCosts] = useState([]);
  const [expenseAmount, setExpenseAmount] = useState(null);
  const [isExpenseBreakdownVisible, setIsExpenseBreakdownVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadDetails = async () => {
      setIsLoading(true);
      setLoadError("");
      setDetailRows([]);
      setDetailCursor(null);
      setEmployeeCosts([]);
      setExpenseAmount(null);

      try {
        const result = await triggerGetProjectTimesheet({
          view: "details",
          ...(view === "employees"
            ? { employeeId: entityId }
            : { projectId: entityId }),
          ...activeDateFilters,
        }).unwrap();
        const list = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.rows)
          ? result.rows
          : [];
        setDetailRows(list);
        setDetailCursor(result?.nextCursor || null);
        setEmployeeCosts(result?.employeeCosts || []);
        setExpenseAmount(result?.expenseAmount ?? null);
        const firstEntry = list[0];
        const entryTitle =
          view === "employees"
            ? firstEntry?.employee?.name
            : firstEntry?.project?.projectName;
        if (entryTitle) setTitle(entryTitle);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error?.data?.message || error?.message || "Failed to load timesheet details.";
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadDetails();
    return () => controller.abort();
  }, [activeDateFilters, entityId, view]);

  const loadMore = async () => {
    if (!detailCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await triggerGetProjectTimesheet({
        view: "details",
        ...(view === "employees"
          ? { employeeId: entityId }
          : { projectId: entityId }),
        ...activeDateFilters,
        cursor: detailCursor,
      }).unwrap();
      const newItems = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.rows)
        ? result.rows
        : [];
      setDetailRows((currentRows) => [
        ...(Array.isArray(currentRows) ? currentRows : []),
        ...newItems,
      ]);
      setDetailCursor(result?.nextCursor || null);
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Failed to load more timesheet details.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const applyFilters = (event) => {
    event.preventDefault();
    if (Boolean(dateFilters.month) !== Boolean(dateFilters.year)) {
      toast.error("Select both a month and a year.");
      return;
    }

    setActiveDateFilters({ ...dateFilters });
    const params = new URLSearchParams();
    if (dateFilters.month) params.set("month", dateFilters.month);
    if (dateFilters.year) params.set("year", dateFilters.year);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    const currentPeriod = getCurrentMonthYear();
    setDateFilters(currentPeriod);
    setActiveDateFilters(currentPeriod);
    const params = new URLSearchParams(currentPeriod);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    setSearchParams(params, { replace: true });
  };

  const query = (searchTerm || "").trim().toLocaleLowerCase();
  const safeDetailRows = Array.isArray(detailRows) ? detailRows : [];
  const visibleRows = safeDetailRows.filter(
    (entry) => !query || JSON.stringify(entry).toLocaleLowerCase().includes(query)
  );

  const isCurrentPeriodSelected =
    dateFilters.month === getCurrentMonthYear().month &&
    dateFilters.year === getCurrentMonthYear().year &&
    activeDateFilters.month === getCurrentMonthYear().month &&
    activeDateFilters.year === getCurrentMonthYear().year;

  const monthLabel =
    activeDateFilters.month && activeDateFilters.year
      ? `${monthOptions[Number(activeDateFilters.month) - 1]?.label || "Selected month"} ${activeDateFilters.year}`
      : "all recorded periods";

  const pageTitle = title || (view === "employees" ? "Employee" : "Project");

  // Table Columns
  const columns = [
    {
      key: "date",
      label: "Date",
      render: (row) => (
        <span className="font-semibold text-gray-800 text-xs">
          {formatDate(row.date)}
        </span>
      ),
    },
    ...(view === "employees"
      ? [
          {
            key: "project",
            label: "Project",
            render: (row) => (
              <div>
                <span className="font-bold text-gray-900 text-xs block">
                  {row.project?.projectName || "Unnamed Project"}
                </span>
                <span className="text-[11px] text-gray-500">
                  {row.project?.clientType || "Client Work"}
                </span>
              </div>
            ),
          },
          {
            key: "customer",
            label: "Customer / Service",
            render: (row) => (
              <div className="text-xs text-gray-700">
                <div className="font-medium">{row.project?.customerName || "—"}</div>
                <div className="text-[11px] text-gray-500">{row.project?.serviceName || "—"}</div>
              </div>
            ),
          },
        ]
      : [
          {
            key: "employee",
            label: "Employee",
            render: (row) => (
              <div>
                <span className="font-bold text-gray-900 text-xs block">
                  {row.employee?.name || "Unnamed Employee"}
                </span>
                <span className="text-[11px] text-gray-500">
                  {row.employee?.email || "—"}
                </span>
              </div>
            ),
          },
        ]),
    {
      key: "time",
      label: "Time Range",
      render: (row) => (
        <span className="text-xs text-gray-600">
          {formatTime(row.startTime)} – {formatTime(row.endTime)}
        </span>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      align: "right",
      render: (row) => (
        <span className="font-bold text-gray-900 text-xs">
          {formatDuration(row)}
        </span>
      ),
    },
    {
      key: "details",
      label: "Work Details",
      render: (row) => {
        const details =
          row.taskDetails ||
          row.taskDescription ||
          row.description ||
          row.workDetails ||
          row.workDescription ||
          row.task ||
          row.taskName ||
          row.notes ||
          "";
        return (
          <span className="text-xs text-gray-600 line-clamp-2">
            {details && String(details).trim() ? details : "—"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-5 animate-in fade-in duration-200">
      {/* Header with Back Button */}
      <Header
        title={`${pageTitle} — Timesheet Details`}
        subtitle={`Showing verified work entries and payroll allocations for ${monthLabel}.`}
        action={
          <Button
            variant="outline"
            size="md"
            icon={ArrowLeft}
            onClick={() => navigate(`/expenses?view=${view}`)}
          >
            Back to {view === "employees" ? "Employee" : "Project"} Timesheets
          </Button>
        }
      />

      {/* Date Filter & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-gray-200/80 shadow-xs">
        <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2.5">
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
            onClick={clearFilters}
            disabled={isLoading || isCurrentPeriodSelected}
          >
            Clear
          </Button>
        </form>

        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search timesheet details..."
          className="max-w-md w-full"
        />
      </div>

      {/* Employee Cost Breakdown (for project view) */}
      {view === "projects" && (
        <div className="p-5 bg-white rounded-xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Employee Expense Breakdown
                </h3>
                <p className="text-xs text-gray-500">
                  Salary allocated by logged project work hours
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={isExpenseBreakdownVisible ? ChevronUp : ChevronDown}
              onClick={() => setIsExpenseBreakdownVisible(!isExpenseBreakdownVisible)}
            >
              {isExpenseBreakdownVisible ? "Hide Breakdown" : "Show Breakdown"}
            </Button>
          </div>

          {isExpenseBreakdownVisible && (
            <div className="pt-2 border-t border-gray-100">
              {employeeCosts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Staff Member</th>
                        <th className="py-2.5 px-3 text-right">Project Hours</th>
                        <th className="py-2.5 px-3 text-right">Allocated Expense</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {employeeCosts.map((emp) => (
                        <tr key={emp.employeeId} className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-3 font-semibold text-gray-800">
                            {emp.name}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-600">
                            {Number(emp.hours || 0).toFixed(2)} hrs
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            {emp.amount === null
                              ? "Salary not set"
                              : currencyFormatter.format(emp.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-bold text-gray-900 text-xs">
                        <td className="py-3 px-3" colSpan="2">
                          Total Project Expense
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-extrabold text-sm">
                          {expenseAmount === null
                            ? "Set employee salary to calculate"
                            : currencyFormatter.format(expenseAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : isLoading ? (
                <p className="text-xs text-gray-500 py-3">Loading employee cost calculations...</p>
              ) : (
                <p className="text-xs text-gray-500 py-3">
                  No employee hours were logged for this project in the selected period.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Main Details Table */}
      <Table
        columns={columns}
        data={visibleRows}
        isLoading={isLoading}
        emptyMessage={
          loadError ||
          (detailRows.length === 0
            ? "No timesheet entries recorded for this period."
            : "No matching timesheet entries found.")
        }
        keyField="_id"
      />

      {/* Load More Button */}
      {detailCursor && !isLoading && !loadError && (
        <div className="pt-2 text-center">
          <Button
            variant="outline"
            size="md"
            onClick={loadMore}
            loading={isLoadingMore}
          >
            Load Older Entries
          </Button>
        </div>
      )}
    </div>
  );
};

export default TimesheetDetailsPage;
