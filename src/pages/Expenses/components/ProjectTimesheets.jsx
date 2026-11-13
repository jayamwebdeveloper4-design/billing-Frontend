import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const ProjectTimesheets = ({ view, searchTerm, onSearchTermChange }) => {
  const navigate = useNavigate();
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
        const result = await getProjectTimesheet({
          view,
          ...activeDateFilters,
          signal: controller.signal,
        });
        setRows(result.data);
        setNextCursor(result.nextCursor);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error.response?.data?.message || "Failed to load timesheets.";
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
      const result = await getProjectTimesheet({
        view,
        ...activeDateFilters,
        cursor: nextCursor,
      });
      setRows((currentRows) => [...currentRows, ...result.data]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load more timesheets.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openDetails = (type, item) => {
    const id = String(item._id);
    const path = type === "employees"
      ? `/expenses/employee-timesheets/${id}`
      : `/expenses/project-timesheets/${id}`;
    const params = new URLSearchParams(activeDateFilters);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());

    navigate(`${path}?${params.toString()}`, {
      state: {
        name: type === "employees"
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
  const isCurrentPeriodSelected = (
    dateFilters.month === currentPeriod.month
    && dateFilters.year === currentPeriod.year
    && activeDateFilters.month === currentPeriod.month
    && activeDateFilters.year === currentPeriod.year
  );
  const query = searchTerm.trim().toLocaleLowerCase();
  const matchesSearch = (item) =>
    !query || JSON.stringify(item).toLocaleLowerCase().includes(query);
  const visibleRows = rows.filter(matchesSearch);

  return (
    <main className="space-y-lg md:space-y-xl">
      <header>
        <h1 className="text-2xl font-black text-on-surface md:text-3xl">
          {view === "employees" ? "Employee Timesheets" : "Project Timesheets"}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {view === "employees"
            ? "Review employee contact details, workdays, hours, and salary."
            : "Review project details, employee hours, and payroll expenses."}
        </p>
      </header>

      <form
        onSubmit={applyDateFilters}
        className="flex flex-col flex-wrap gap-sm sm:flex-row sm:items-center"
      >
        <div className="sm:w-40">
          <label htmlFor="timesheet-filter-month" className="sr-only">
            Month
          </label>
          <select
            id="timesheet-filter-month"
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
          <label htmlFor="timesheet-filter-year" className="sr-only">
            Year
          </label>
          <input
            id="timesheet-filter-year"
            type="number"
            min="1000"
            max="9999"
            step="1"
            placeholder="Year"
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
            onClick={clearDateFilters}
            disabled={isLoading || isCurrentPeriodSelected}
            className="rounded-md border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
        </div>
        <div className="relative w-full sm:ml-auto sm:w-64">
          <label htmlFor="timesheets-search" className="sr-only">
            Search all views
          </label>
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
            search
          </span>
          <input
            id="timesheets-search"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </form>

      <section
        aria-label={`${view} timesheets`}
        className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm"
      >
        <table className={`w-full ${view === "projects" ? "min-w-[900px]" : "min-w-[760px]"} text-left`}>
          {view === "employees" ? (
            <>
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  <th scope="col" className="px-md py-3 md:px-lg">Employee</th>
                  <th scope="col" className="px-md py-3">Contact</th>
                  <th scope="col" className="px-md py-3 text-right">Work days</th>
                  <th scope="col" className="px-md py-3 text-right">Hours</th>
                  <th scope="col" className="px-md py-3 text-right">Salary</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((employee) => (
                  <React.Fragment key={employee._id}>
                    <tr
                      onClick={() => openDetails("employees", employee)}
                      className="cursor-pointer border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-low/50"
                    >
                      <td className="px-md py-4 font-semibold text-on-surface md:px-lg">
                        <button
                          type="button"
                          aria-label={`View timesheet details for ${employee.name || "employee"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetails("employees", employee);
                          }}
                          className="flex items-center gap-2 text-left"
                        >
                          <span className="material-symbols-outlined text-lg text-primary">
                            open_in_new
                          </span>
                          <span>
                            <span className="block">{employee.name || "Unnamed employee"}</span>
                            <span className="mt-1 block text-xs font-normal text-on-surface-variant">
                              Joined {formatDate(employee.joiningDate)}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-md py-4 text-sm text-on-surface-variant">
                        <div>{employee.email || "—"}</div>
                        <div>{Array.isArray(employee.phone) ? employee.phone.join(", ") : employee.phone || "—"}</div>
                      </td>
                      <td className="px-md py-4 text-right text-on-surface">
                        {employee.workDays}
                      </td>
                      <td className="px-md py-4 text-right text-on-surface">
                        {Number(employee.totalHours || 0).toFixed(2)}
                      </td>
                      <td className="px-md py-4 text-right font-bold text-on-surface">
                        {formatCurrency(employee.salary)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  <th scope="col" className="px-md py-3 md:px-lg">Project</th>
                  <th scope="col" className="px-md py-3">Customer / Service</th>
                  <th scope="col" className="px-md py-3 text-right">Work days</th>
                  <th scope="col" className="px-md py-3 text-right">Hours</th>
                  <th scope="col" className="px-md py-3">Employees</th>
                  <th scope="col" className="px-md py-3 text-right">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((project) => (
                  <React.Fragment key={project._id}>
                    <tr
                      onClick={() => openDetails("projects", project)}
                      className="cursor-pointer border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-low/50"
                    >
                      <td className="px-md py-4 font-semibold text-on-surface md:px-lg">
                        <button
                          type="button"
                          aria-label={`View timesheet details for ${project.projectName || "project"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetails("projects", project);
                          }}
                          className="flex items-center gap-2 text-left"
                        >
                          <span className="material-symbols-outlined text-lg text-primary">
                            open_in_new
                          </span>
                          <span>
                            <span className="block">{project.projectName || "Unnamed project"}</span>
                            <span className="mt-1 block text-xs font-normal text-on-surface-variant">
                              Budget: {project.budget?.currency || "₹"} {project.budget?.amount ?? "—"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-md py-4 text-sm text-on-surface-variant">
                        <div>{project.customerName || "—"}</div>
                        <div>{project.serviceName || "—"}</div>
                        {formatContact(project.customerPhone) && (
                          <div className="mt-1 text-xs">
                            Phone: {formatContact(project.customerPhone)}
                          </div>
                        )}
                        {formatContact(project.customerEmail) && (
                          <div className="text-xs">
                            Email: {formatContact(project.customerEmail)}
                          </div>
                        )}
                      </td>
                      <td className="px-md py-4 text-right text-on-surface">
                        {project.workDays}
                      </td>
                      <td className="px-md py-4 text-right text-on-surface">
                        {Number(project.totalHours || 0).toFixed(2)}
                      </td>
                      <td className="px-md py-4 text-sm text-on-surface">
                        {Array.isArray(project.employees) && project.employees.length
                          ? project.employees.map((employee) => employee?.name).filter(Boolean).join(", ")
                          : "No timesheet entries"}
                      </td>
                      <td className="px-md py-4 text-right">
                        <button
                          type="button"
                          aria-label={`View employee expenses for ${project.projectName || "project"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetails("projects", project);
                          }}
                          className="rounded-md px-2 py-1 font-bold text-primary hover:bg-primary/10"
                        >
                          {project.expenseAmount === null || project.expenseAmount === undefined
                            ? "View breakdown"
                            : formatCurrency(project.expenseAmount)}
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </>
          )}
          {(isLoading || loadError || visibleRows.length === 0) && (
            <tbody>
              <tr>
                <td colSpan={view === "employees" ? "5" : "6"} className="px-md py-8 text-center text-sm text-on-surface-variant">
                  {isLoading
                    ? "Loading timesheets..."
                    : loadError || (rows.length === 0
                      ? `No ${view} found.`
                      : nextCursor
                        ? `No matching ${view} in loaded results. Load more to search older results.`
                        : `No matching ${view} found.`)}
                </td>
              </tr>
            </tbody>
          )}
        </table>
        {nextCursor && !isLoading && !loadError && (
          <div className="border-t border-outline-variant px-md py-4 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="rounded-md px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

export default ProjectTimesheets;
