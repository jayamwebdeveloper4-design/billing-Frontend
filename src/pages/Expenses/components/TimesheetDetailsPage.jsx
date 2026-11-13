import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getProjectTimesheet } from "../../../api/projectapi";

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
  label: new Intl.DateTimeFormat("en-IN", { month: "long" })
    .format(new Date(2020, index, 1)),
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

const formatDuration = (entry) => {
  const minutes = Number(entry.totalMinutes);
  if (
    entry.totalMinutes !== null
    && entry.totalMinutes !== undefined
    && entry.totalMinutes !== ""
    && Number.isFinite(minutes)
  ) {
    const wholeMinutes = Math.round(minutes);
    const hours = Math.floor(wholeMinutes / 60);
    const remainingMinutes = wholeMinutes % 60;
    return hours ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  }

  const hours = entry.totalWorkingHours === null || entry.totalWorkingHours === undefined
    ? Number.NaN
    : Number(entry.totalWorkingHours);
  return Number.isFinite(hours) ? `${hours.toFixed(2)} h` : "—";
};

const hiddenTimesheetFields = new Set([
  "_id",
  "employeeId",
  "projectId",
  "date",
  "workDate",
  "totalWorkingHours",
  "totalMinutes",
  "employee",
  "project",
  "entries",
  "customProjectName",
  "startTime",
  "endTime",
  "createdAt",
  "updatedAt",
  "moduleId",
  "subModuleId",
  "taskId",
  "otherTaskId",
  "leaveRequestId",
  "leaveReasonId",
  "isRestarted",
  "isReadByAdmin",
  "isAcceptedByAdmin",
]);

const TimesheetDetailsPage = ({ view, entityId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateFilters, setDateFilters] = useState(() => getInitialPeriod(searchParams));
  const [activeDateFilters, setActiveDateFilters] = useState(() =>
    getInitialPeriod(searchParams));
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
        const result = await getProjectTimesheet({
          view: "details",
          ...(view === "employees"
            ? { employeeId: entityId }
            : { projectId: entityId }),
          ...activeDateFilters,
          signal: controller.signal,
        });
        setDetailRows(result.data);
        setDetailCursor(result.nextCursor);
        setEmployeeCosts(result.employeeCosts || []);
        setExpenseAmount(result.expenseAmount ?? null);
        const firstEntry = result.data[0];
        const entryTitle = view === "employees"
          ? firstEntry?.employee?.name
          : firstEntry?.project?.projectName;
        if (entryTitle) setTitle(entryTitle);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error.response?.data?.message || "Failed to load timesheet details.";
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
      const result = await getProjectTimesheet({
        view: "details",
        ...(view === "employees"
          ? { employeeId: entityId }
          : { projectId: entityId }),
        ...activeDateFilters,
        cursor: detailCursor,
      });
      setDetailRows((currentRows) => [...currentRows, ...result.data]);
      setDetailCursor(result.nextCursor);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load more timesheet details.");
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

  const query = searchTerm.trim().toLocaleLowerCase();
  const visibleRows = detailRows.filter((entry) =>
    !query || JSON.stringify(entry).toLocaleLowerCase().includes(query));
  const isCurrentPeriodSelected = (
    dateFilters.month === getCurrentMonthYear().month
    && dateFilters.year === getCurrentMonthYear().year
    && activeDateFilters.month === getCurrentMonthYear().month
    && activeDateFilters.year === getCurrentMonthYear().year
  );
  const monthLabel = activeDateFilters.month && activeDateFilters.year
    ? `${monthOptions[Number(activeDateFilters.month) - 1]?.label || "Selected month"} ${activeDateFilters.year}`
    : "all recorded periods";
  const pageTitle = title || (view === "employees" ? "Employee" : "Project");

  return (
    <main className="space-y-lg md:space-y-xl">
      <header className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/expenses?view=${view}`)}
            className="mb-2 inline-flex items-center gap-1 text-sm font-semibol hover:text-[#000000] "
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to {view === "employees" ? "Employee" : "Project"} Timesheets
          </button>
          <h1 className="text-2xl font-black text-on-surface md:text-3xl">
            {pageTitle} — Timesheet details
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Showing entries for {monthLabel}.
          </p>
        </div>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-col flex-wrap gap-sm sm:flex-row sm:items-center"
      >
        <div className="sm:w-40">
          <label htmlFor="detail-filter-month" className="sr-only">Month</label>
          <select
            id="detail-filter-month"
            value={dateFilters.month}
            onChange={(event) =>
              setDateFilters((current) => ({ ...current, month: event.target.value }))
            }
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:w-28">
          <label htmlFor="detail-filter-year" className="sr-only">Year</label>
          <input
            id="detail-filter-year"
            type="number"
            min="1000"
            max="9999"
            step="1"
            value={dateFilters.year}
            onChange={(event) =>
              setDateFilters((current) => ({ ...current, year: event.target.value }))
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
            onClick={clearFilters}
            disabled={isLoading || isCurrentPeriodSelected}
            className="rounded-md border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
        </div>
        <div className="relative w-full sm:ml-auto sm:w-64">
          <label htmlFor="detail-timesheets-search" className="sr-only">
            Search timesheet details
          </label>
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
            search
          </span>
          <input
            id="detail-timesheets-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </form>

      {view === "projects" && (
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm md:p-lg">
          <div className="flex items-start justify-between gap-md">
            <div>
              <h2 className="font-bold text-on-surface">Employee expense breakdown</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Employee salary is allocated by their recorded project hours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExpenseBreakdownVisible((visible) => !visible)}
              aria-expanded={isExpenseBreakdownVisible}
              aria-controls="employee-expense-breakdown-content"
              className="shrink-0 rounded-md border border-outline-variant px-3 py-1.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"
            >
              {isExpenseBreakdownVisible ? "Hide" : "Show"}
            </button>
          </div>
          {isExpenseBreakdownVisible && (
            <div id="employee-expense-breakdown-content">
              {employeeCosts.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant text-xs font-bold uppercase text-on-surface-variant">
                        <th scope="col" className="px-3 py-2">Employee</th>
                        <th scope="col" className="px-3 py-2 text-right">Project hours</th>
                        <th scope="col" className="px-3 py-2 text-right">Expense</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeCosts.map((employee) => (
                        <tr key={employee.employeeId} className="border-b border-outline-variant/50 last:border-0">
                          <td className="px-3 py-3">{employee.name}</td>
                          <td className="px-3 py-3 text-right">{Number(employee.hours || 0).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right font-semibold">
                            {employee.amount === null
                              ? "Salary not set"
                              : currencyFormatter.format(employee.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-on-surface">
                        <td className="px-3 py-3" colSpan="2">Total project expenses</td>
                        <td className="px-3 py-3 text-right">
                          {expenseAmount === null
                            ? "Set employee salary to calculate"
                            : currencyFormatter.format(expenseAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : isLoading ? (
                <p className="mt-3 text-sm text-on-surface-variant">Loading employee expenses...</p>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">
                  No employee hours were recorded for this project in the selected period.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              <th scope="col" className="px-md py-3">Date</th>
              {view === "employees" ? (
                <>
                  <th scope="col" className="px-md py-3">Project</th>
                  <th scope="col" className="px-md py-3">Customer / Service</th>
                </>
              ) : (
                <th scope="col" className="px-md py-3">Employee</th>
              )}
              <th scope="col" className="px-md py-3">Time</th>
              <th scope="col" className="px-md py-3 text-right">Duration</th>
              <th scope="col" className="px-md py-3">Timesheet details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={view === "employees" ? 6 : 5} className="px-md py-8 text-center text-sm text-on-surface-variant">
                  Loading timesheet details...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={view === "employees" ? 6 : 5} role="alert" className="px-md py-8 text-center text-sm text-error">
                  {loadError}
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={view === "employees" ? 6 : 5} className="px-md py-8 text-center text-sm text-on-surface-variant">
                  {detailRows.length
                    ? "No timesheet entries match your search."
                    : "No timesheet entries found."}
                </td>
              </tr>
            ) : visibleRows.map((entry) => {
              const extraFields = Object.entries(entry)
                .filter(([key, value]) => !hiddenTimesheetFields.has(key) && value !== null);
              return (
                <tr key={entry._id} className="border-b border-outline-variant/50 last:border-0">
                  <td className="whitespace-nowrap px-md py-3">
                    {formatDate(entry.workDate || entry.date)}
                  </td>
                  {view === "employees" ? (
                    <>
                      <td className="px-md py-3">
                        {entry.project?.projectName || entry.customProjectName || "—"}
                      </td>
                      <td className="px-md py-3 text-on-surface-variant">
                        {[entry.project?.customerName, entry.project?.serviceName]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                    </>
                  ) : (
                    <td className="px-md py-3">
                      {entry.employee?.name || "Unnamed employee"}
                      {entry.employee?.email && (
                        <div className="text-xs text-on-surface-variant">{entry.employee.email}</div>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-md py-3">
                    {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                  </td>
                  <td className="whitespace-nowrap px-md py-3 text-right">
                    {formatDuration(entry)}
                  </td>
                  <td className="px-md py-3 text-on-surface-variant">
                    {extraFields.length ? (
                      <dl className="space-y-1">
                        {extraFields.map(([key, value]) => (
                          <div key={key}>
                            <dt className="inline font-semibold text-on-surface">
                              {key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}:
                            </dt>{" "}
                            <dd className="inline break-all">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {detailCursor && !isLoading && !loadError && (
          <div className="border-t border-outline-variant px-md py-4 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="rounded-md px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Loading..." : "Load more entries"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

export default TimesheetDetailsPage;
