import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  getRevenueOrders,
  getExpressEntries,
  addExpressEntry,
  deleteExpressEntry,
} from '../api/revenueApi';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .format(d)
      .replace(/\//g, "-");
  } catch (e) {
    return dateString;
  }
};

const today = () => new Date().toISOString().slice(0, 10);

const PAGE_SIZE = 15;

const parseDateToTimestamp = (dateString) => {
  if (!dateString) return 0;
  const t = Date.parse(dateString);
  return isNaN(t) ? 0 : t;
};

const getTimestampFromObjectId = (id) => {
  if (!id || typeof id !== 'string') return 0;
  const parts = id.split('-');
  const targetId = parts[parts.length - 1];
  if (targetId.length !== 24) return 0;
  const seconds = parseInt(targetId.substring(0, 8), 16);
  return isNaN(seconds) ? 0 : seconds * 1000;
};

// ─── Custom Date Picker Helpers ──────────────────────────────────────────────
const formatDateLocal = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateLocal = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getCalendarDays = (year, month) => {
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const currentMonthLastDay = new Date(year, month + 1, 0).getDate();

  const days = [];

  // Previous Month buffer days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    days.push({
      dayNum: d,
      isCurrentMonth: false,
      date: new Date(prevYear, prevMonth, d),
    });
  }

  // Current Month days
  for (let i = 1; i <= currentMonthLastDay; i++) {
    days.push({
      dayNum: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next Month buffer days
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    days.push({
      dayNum: i,
      isCurrentMonth: false,
      date: new Date(nextYear, nextMonth, i),
    });
  }

  return days;
};

// ─── Custom DateRangePicker Component ─────────────────────────────────────────
const DateRangePicker = ({ startDateStr, endDateStr, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [hoveredDateStr, setHoveredDateStr] = useState('');
  const containerRef = React.useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view to match current startDate selection
  useEffect(() => {
    if (startDateStr) {
      const d = parseDateLocal(startDateStr);
      if (d) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [startDateStr]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDateClick = (date) => {
    const clickedStr = formatDateLocal(date);
    if (!startDateStr || (startDateStr && endDateStr)) {
      onChange(clickedStr, '');
      setHoveredDateStr('');
    } else {
      if (clickedStr < startDateStr) {
        onChange(clickedStr, '');
        setHoveredDateStr('');
      } else {
        onChange(startDateStr, clickedStr);
        setHoveredDateStr('');
        setIsOpen(false);
      }
    }
  };

  const calendarDays = getCalendarDays(currentYear, currentMonth);

  const formatDisplayDate = (str) => {
    if (!str) return '';
    const [y, m, d] = str.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const triggerLabel = startDateStr
    ? `${formatDisplayDate(startDateStr)} - ${endDateStr ? formatDisplayDate(endDateStr) : 'Select End Date'}`
    : 'Select Date Range';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [];
  const startY = new Date().getFullYear() - 10;
  const endY = new Date().getFullYear() + 5;
  for (let y = startY; y <= endY; y++) {
    years.push(y);
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-1.5 text-xs font-bold text-on-surface hover:border-primary/50 transition-all focus:outline-none"
      >
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">calendar_today</span>
        <span>{triggerLabel}</span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>arrow_drop_down</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 sm:left-auto sm:right-0 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-md z-9999 w-[300px] animate-in fade-in slide-in-from-top-2 duration-150">

          {/* Header */}
          <div className="flex items-center justify-between gap-xs mb-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-xxs font-bold text-xs text-on-surface">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer py-1 px-1 rounded hover:bg-surface-container-high transition-colors"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer py-1 px-1 rounded hover:bg-surface-container-high transition-colors"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Weekdays Header */}
          <div className="grid grid-cols-7 gap-y-1 mb-xs text-center text-on-surface-variant/70 text-[11px] font-bold uppercase tracking-wider">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {calendarDays.map((dayObj, index) => {
              const dStr = formatDateLocal(dayObj.date);
              const isToday = formatDateLocal(new Date()) === dStr;
              const isStart = startDateStr === dStr;
              const isEnd = endDateStr === dStr;
              const hasRange = startDateStr && endDateStr;
              const isInRange = hasRange && dStr > startDateStr && dStr < endDateStr;

              // Hover range calculation
              const isHoverRange = startDateStr && !endDateStr && hoveredDateStr && dStr > startDateStr && dStr < hoveredDateStr;
              const isHoveredEnd = startDateStr && !endDateStr && hoveredDateStr === dStr;

              // Connectors
              const showLeftConnector = (isInRange || isEnd || isHoverRange || isHoveredEnd) && !isStart;
              const showRightConnector = (isInRange || isStart || isHoverRange) && !isEnd && (hasRange || hoveredDateStr);

              return (
                <div
                  key={index}
                  className="relative h-10 w-full flex items-center justify-center cursor-pointer select-none"
                  onClick={() => handleDateClick(dayObj.date)}
                  onMouseEnter={() => startDateStr && !endDateStr && setHoveredDateStr(dStr)}
                >
                  {/* Connector Background */}
                  {showLeftConnector && (
                    <div className={`absolute left-0 right-1/2 top-1 bottom-1 ${isHoverRange || isHoveredEnd ? 'bg-primary-fixed/40' : 'bg-primary-fixed/60'}`} />
                  )}
                  {showRightConnector && (
                    <div className={`absolute left-1/2 right-0 top-1 bottom-1 ${isHoverRange || isStart ? 'bg-primary-fixed/40' : 'bg-primary-fixed/60'}`} />
                  )}

                  {/* Day Number Circle */}
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-all relative z-10
                    ${(isStart || isEnd) ? 'bg-primary text-white shadow-sm scale-110' : ''}
                    ${(!isStart && !isEnd && isToday) ? 'border border-primary text-primary' : ''}
                    ${(!isStart && !isEnd && !isToday && dayObj.isCurrentMonth) ? 'text-on-surface' : ''}
                    ${(!isStart && !isEnd && !isToday && !dayObj.isCurrentMonth) ? 'text-on-surface-variant/30' : ''}
                    ${(isInRange) ? 'text-[#0040a2]' : ''}
                    ${(isHoverRange || isHoveredEnd) ? 'text-[#0040a2]' : ''}
                    ${(!isStart && !isEnd && dayObj.isCurrentMonth) ? 'hover:bg-surface-container-high/60' : ''}
                    ${(!isStart && !isEnd && !dayObj.isCurrentMonth) ? 'hover:bg-surface-container-high/30' : ''}
                  `}>
                    {dayObj.dayNum}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};

const getDateRange = (type) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (type === 'current_month') {
    return {
      startDate: formatDate(new Date(y, m, 1)),
      endDate: formatDate(new Date(y, m + 1, 0))
    };
  }

  if (type === 'last_month') {
    return {
      startDate: formatDate(new Date(y, m - 1, 1)),
      endDate: formatDate(new Date(y, m, 0))
    };
  }

  return { startDate: '', endDate: '' };
};

const getYearMonthRange = (year, monthStr) => {
  const y = parseInt(year, 10);
  if (isNaN(y)) return { startDate: '', endDate: '' };

  if (!monthStr || monthStr === 'all') {
    return {
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`
    };
  }

  const m = parseInt(monthStr, 10);
  const mm = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  const dd = String(lastDay).padStart(2, '0');

  return {
    startDate: `${y}-${mm}-01`,
    endDate: `${y}-${mm}-${dd}`
  };
};

const getYearOptions = (startYear = 2015) => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y);
  }
  return years;
};

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// ─── Pagination Control ──────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, onPrev, onNext, totalItems, pageSize, onPageChange }) => {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const [inputVal, setInputVal] = useState(page);

  useEffect(() => {
    setInputVal(page);
  }, [page]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      onPageChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(inputVal, 10);
    if (isNaN(num) || num < 1) {
      onPageChange(1);
      setInputVal(1);
    } else if (num > totalPages) {
      onPageChange(totalPages);
      setInputVal(totalPages);
    } else {
      onPageChange(num);
      setInputVal(num);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div className="flex items-center justify-between mt-md px-xs">
      <p className="text-xs text-on-surface-variant">
        Showing <span className="font-bold text-on-surface">{from}–{to}</span> of{' '}
        <span className="font-bold text-on-surface">{totalItems}</span>
      </p>
      <div className="flex items-center gap-xs">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            value={inputVal}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-12 text-center bg-surface-container-low border border-outline-variant rounded-md py-1 font-bold text-xs focus:ring-1 focus:ring-primary outline-none"
          />
          <span className="text-xs font-bold text-on-surface-variant">/ {totalPages || 1}</span>
        </div>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

// ─── Summary Card ────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, borderColorClass, bgClass = 'bg-surface-container-lowest' }) => (
  <div className={`relative overflow-hidden rounded-2xl p-lg shadow-sm border border-outline-variant/30 border-l-4 ${borderColorClass} ${bgClass}`}>
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant truncate">{label}</p>
      <p className="text-2xl font-extrabold text-on-surface mt-1 truncate">{value}</p>
    </div>
  </div>
);

// ─── Add Express Modal ───────────────────────────────────────────────────────
const AddExpressModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ date: today(), description: '', amount: '' });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.date) return toast.error('Date is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      return toast.error('Enter a valid amount');

    setSaving(true);
    try {
      await onSave({ date: form.date, description: form.description.trim(), amount: Number(form.amount) });
      onClose();
    } catch {
      /* parent shows toast */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-md animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl min-w-[320px] shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-gutter py-md bg-surface-container-low border-b border-outline-variant rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-on-surface text-lg">Add Express Entry</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Record a new expense</p>
          </div>
          <button onClick={onClose} className="p-xs hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-gutter space-y-md">
          {/* Date */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant block">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant block">Description</label>
            <input
              type="text"
              placeholder="e.g. Server maintenance fee"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant block">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant font-body-sm">₹</span>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="w-full pl-8 pr-md py-sm bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-gutter py-md border-t border-outline-variant bg-surface-container-low rounded-b-2xl flex justify-end gap-sm">
          <button
            onClick={onClose}
            className="px-md py-sm rounded-lg font-body-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-gutter py-sm bg-primary text-on-primary rounded-lg font-bold font-body-md hover:brightness-110 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 flex items-center gap-xs"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">add</span>
            )}
            {saving ? 'Saving…' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
const ConfirmDeleteModal = ({ onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-in fade-in duration-150">
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-sm min-w-[300px] shadow-2xl p-gutter animate-in zoom-in-95 duration-200">
      <div className="flex items-center gap-md mb-md">
        <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-error text-[22px]">delete</span>
        </div>
        <div>
          <h3 className="font-semibold text-on-surface">Delete Entry?</h3>
          <p className="text-xs text-on-surface-variant">This action cannot be undone.</p>
        </div>
      </div>
      <div className="flex justify-end gap-sm">
        <button onClick={onClose} className="px-md py-sm rounded-lg font-body-md text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancel</button>
        <button onClick={onConfirm} className="px-md py-sm rounded-lg font-bold font-body-md bg-error text-on-error hover:brightness-110 active:scale-[0.98] transition-all shadow-sm">Delete</button>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const RevenueManagement = () => {
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue' | 'express' | 'payments'
  const [revenueRows, setRevenueRows] = useState([]);
  const [expressRows, setExpressRows] = useState([]);
  const [paymentRows, setPaymentRows] = useState([]);
  const [totalCustomerPaid, setTotalCustomerPaid] = useState(0);
  const [totalCustomerPaidNoGst, setTotalCustomerPaidNoGst] = useState(0);
  const [totalSelling, setTotalSelling] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('year'); // 'all' | 'year' 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [dbStartYear, setDbStartYear] = useState(2015);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // id to delete
  const [revenueSearch, setRevenueSearch] = useState('');
  const [expressSearch, setExpressSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [revenueDateSort, setRevenueDateSort] = useState('asc');   // 'asc' | 'desc'
  const [expressDateSort, setExpressDateSort] = useState('asc');
  const [paymentDateSort, setPaymentDateSort] = useState('asc');
  const [revenuePage, setRevenuePage] = useState(1);
  const [expressPage, setExpressPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterPopoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    let startDate = '';
    let endDate = '';

    if (filterType === 'current_month') {
      const range = getDateRange('current_month');
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filterType === 'last_month') {
      const range = getDateRange('last_month');
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filterType === 'year') {
      const range = getYearMonthRange(selectedYear, selectedMonth);
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (filterType === 'custom') {
      startDate = customStartDate;
      endDate = customEndDate;
    }

    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [revenueData, express] = await Promise.all([
        getRevenueOrders(params),
        getExpressEntries(params)
      ]);
      setRevenueRows(revenueData?.orders || []);
      setTotalCustomerPaid(revenueData?.totalCustomerPaid || 0);
      setTotalCustomerPaidNoGst(revenueData?.totalCustomerPaidNoGst || 0);
      setPaymentRows(revenueData?.payments || []);
      setTotalSelling(revenueData?.totalSelling || 0);
      setPendingAmount(revenueData?.pendingAmount || 0);
      if (revenueData?.startYear) {
        setDbStartYear(revenueData.startYear);
      }
      setExpressRows(express || []);
    } catch {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [filterType, selectedYear, selectedMonth, customStartDate, customEndDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Reset pages when search or sort changes
  useEffect(() => { setRevenuePage(1); }, [revenueSearch, revenueDateSort]);
  useEffect(() => { setExpressPage(1); }, [expressSearch, expressDateSort]);
  useEffect(() => { setPaymentPage(1); }, [paymentSearch, paymentDateSort]);

  // Reset pages when date filter changes
  useEffect(() => {
    setRevenuePage(1);
    setExpressPage(1);
    setPaymentPage(1);
  }, [filterType, selectedYear, selectedMonth, customStartDate, customEndDate]);

  // ── Computations ────────────────────────────────────────────────
  const totalExpress = expressRows.reduce((sum, e) => sum + (e.amount || 0), 0);
  const balance = totalCustomerPaid - totalExpress;

  // ── Handlers ────────────────────────────────────────────────────
  const handleAddExpress = async (payload) => {
    try {
      const entry = await addExpressEntry(payload);
      setExpressRows((prev) => [entry, ...prev]);
      toast.success('Express entry added!');
    } catch {
      toast.error('Failed to add express entry');
      throw new Error('failed');
    }
  };

  const handleDeleteExpress = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpressEntry(deleteTarget);
      setExpressRows((prev) => prev.filter((e) => e._id !== deleteTarget));
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Filtered data ────────────────────────────────────────────────
  const filteredRevenue = revenueRows
    .filter((r) => {
      const q = revenueSearch.toLowerCase();
      return (
        r.customerName?.toLowerCase().includes(q) ||
        r.productName?.toLowerCase().includes(q) ||
        (r.paymentType || '').toLowerCase().includes(q) ||
        formatDate(r.orderDate)?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const timeA = parseDateToTimestamp(a.orderDate);
      const timeB = parseDateToTimestamp(b.orderDate);
      if (timeA !== timeB) {
        return revenueDateSort === 'asc' ? timeA - timeB : timeB - timeA;
      }
      const idTimeA = getTimestampFromObjectId(a.orderId);
      const idTimeB = getTimestampFromObjectId(b.orderId);
      return revenueDateSort === 'asc' ? idTimeA - idTimeB : idTimeB - idTimeA;
    });

  const filteredExpress = expressRows
    .filter((e) => {
      const q = expressSearch.toLowerCase();
      return (
        e.description?.toLowerCase().includes(q) ||
        e.date?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const timeA = parseDateToTimestamp(a.date);
      const timeB = parseDateToTimestamp(b.date);
      if (timeA !== timeB) {
        return expressDateSort === 'asc' ? timeA - timeB : timeB - timeA;
      }
      const idTimeA = getTimestampFromObjectId(a._id);
      const idTimeB = getTimestampFromObjectId(b._id);
      return expressDateSort === 'asc' ? idTimeA - idTimeB : idTimeB - idTimeA;
    });

  const filteredPayments = paymentRows
    .filter((p) => {
      const q = paymentSearch.toLowerCase();
      return (
        p.customerName?.toLowerCase().includes(q) ||
        p.productName?.toLowerCase().includes(q) ||
        (p.paymentType || '').toLowerCase().includes(q) ||
        formatDate(p.date)?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const timeA = parseDateToTimestamp(a.date);
      const timeB = parseDateToTimestamp(b.date);
      if (timeA !== timeB) {
        return paymentDateSort === 'asc' ? timeA - timeB : timeB - timeA;
      }
      const idTimeA = getTimestampFromObjectId(a.paymentId);
      const idTimeB = getTimestampFromObjectId(b.paymentId);
      return paymentDateSort === 'asc' ? idTimeA - idTimeB : idTimeB - idTimeA;
    });

  // ── Pagination slices ─────────────────────────────────────────────
  const revenueTotalPages = Math.ceil(filteredRevenue.length / PAGE_SIZE);
  const pagedRevenue = filteredRevenue.slice((revenuePage - 1) * PAGE_SIZE, revenuePage * PAGE_SIZE);

  const expressTotalPages = Math.ceil(filteredExpress.length / PAGE_SIZE);
  const pagedExpress = filteredExpress.slice((expressPage - 1) * PAGE_SIZE, expressPage * PAGE_SIZE);

  const paymentsTotalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);
  const pagedPayments = filteredPayments.slice((paymentPage - 1) * PAGE_SIZE, paymentPage * PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-lg pb-20 animate-in fade-in duration-300 max-w-full overflow-x-hidden">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg mb-xl">
        <div>
          <h1 className="text-2xl md:text-h1 font-bold text-on-surface">Revenue Management</h1>
          <p className="text-on-surface-variant text-xs md:text-body-md">
            Track revenue income and express expenses at a glance.
          </p>
        </div>

        {/* Filter Popover Dropdown (matching Reminders design) */}
        <div className="relative shrink-0 self-end sm:self-auto" ref={filterPopoverRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen(prev => !prev)}
            className={`h-[42px] px-4 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer shadow-xs ${isFilterOpen
                ? "bg-primary text-on-primary border-primary shadow-sm"
                : "bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-low"
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filter
            {filterType !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-lowest"></span>
            )}
          </button>

          {/* Filter Popover Card */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              {/* Caret Arrow Notch */}
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-surface-container-lowest border-t border-l border-outline-variant/60 rotate-45"></div>

              {/* Date Filter Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">Date Filter</label>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8"
                  >
                    <option value="all">🌐 All Time</option>
                    <option value="year">📅 By Year & Month</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Year & Month Selection (shown when filterType === 'year') */}
              {filterType === 'year' && (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-on-surface">Year</label>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8"
                      >
                        {getYearOptions(dbStartYear).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                        expand_more
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-on-surface">Month</label>
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8"
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => {
                    setFilterType('all');
                    setSelectedYear(new Date().getFullYear());
                    setSelectedMonth('all');
                  }}
                  className="w-1/2 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl border border-outline-variant transition-colors cursor-pointer text-center"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="w-1/2 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl shadow-md hover:bg-primary/90 transition-colors cursor-pointer text-center"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md">
        <SummaryCard label="Total Selling" value={fmt(totalSelling)} borderColorClass="border-l-[#1565c0]" bgClass="bg-surface-container-lowest" />
        <SummaryCard label="Total Customer (No GST)" value={fmt(totalCustomerPaidNoGst)} borderColorClass="border-l-[#2e7d32]" bgClass="bg-surface-container-lowest" />
        <SummaryCard label="Pending Amount" value={fmt(pendingAmount)} borderColorClass="border-l-[#c62828]" bgClass="bg-surface-container-lowest" />
        <SummaryCard label="Total Express" value={fmt(totalExpress)} borderColorClass="border-l-[#e65100]" bgClass="bg-surface-container-lowest" />
        <SummaryCard label="Balance" value={fmt(balance)} borderColorClass={balance >= 0 ? 'border-l-[#00838f]' : 'border-l-error'} bgClass="bg-surface-container-lowest" />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-outline-variant bg-surface-container-low px-gutter pt-md">
          {[
            { key: 'revenue', label: 'Revenue', icon: 'trending_up' },
            { key: 'payments', label: 'Customer Payments', icon: 'credit_card' },
            { key: 'express', label: 'Express', icon: 'payments' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-xs px-md pb-md pt-sm rounded-t-lg font-body-md text-body-md transition-all border-b-2 -mb-px ${activeTab === tab.key
                ? 'border-primary text-primary font-bold bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          {/* Add Express button — only visible on express tab */}
          {activeTab === 'express' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="ml-auto mb-md flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-bold font-body-md hover:brightness-110 active:scale-95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Express
            </button>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="p-gutter">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-md">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-on-surface-variant font-body-md">Loading data…</p>
            </div>
          ) : activeTab === 'revenue' ? (

            /* ── Revenue Tab ────────────────────────────────────── */
            <>
              {/* Search */}
              <div className="mb-md relative w-full sm:max-w-[420px] p-1">
                <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search customer, product..."
                  value={revenueSearch}
                  onChange={(e) => setRevenueSearch(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>

              {filteredRevenue.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">inbox</span>
                  <p className="text-on-surface-variant font-body-md mt-sm">No revenue data found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[15%]">
                          <button
                            onClick={() => setRevenueDateSort(s => s === 'asc' ? 'desc' : 'asc')}
                            className="flex items-center gap-xs hover:text-primary transition-colors cursor-pointer"
                          >
                            Date
                            <span className="material-symbols-outlined text-[16px]">
                              {revenueDateSort === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          </button>
                        </th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[25%]">Customer</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[30%]">Product</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[15%]">Type</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-[15%]">Selling Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {pagedRevenue.map((row, idx) => {
                        const type = row.paymentType || 'base';
                        return (
                          <tr key={`${row.orderId}-${idx}`} className="hover:bg-surface-container-low/40 transition-colors">
                            <td className="py-md px-gutter font-body-md text-on-surface-variant text-sm">{formatDate(row.orderDate)}</td>
                            <td className="py-md px-gutter font-body-md text-on-surface font-medium">{row.customerName}</td>
                            <td className="py-md px-gutter">
                              <p className="font-body-md text-on-surface font-medium leading-tight">{row.productName}</p>
                            </td>
                            <td className="py-md px-gutter">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-block ${type === 'renewal'
                                  ? 'bg-warning/10 text-warning border border-warning/20'
                                  : type === 'updated'
                                    ? 'bg-info/10 text-info border border-info/20'
                                    : type === 'oneTimePayment'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : 'bg-primary/10 text-primary border border-primary/20'
                                }`}>
                                {type === 'renewal' ? 'Renewal' : type === 'updated' ? 'Updated' : type === 'oneTimePayment' ? 'One-Time' : 'Base'}
                              </span>
                            </td>
                            <td className="py-md px-gutter font-body-md text-on-surface text-right font-medium">{fmt(row.totalPrice)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="border-t-2 border-outline-variant bg-surface-container-low font-bold">
                        <td colSpan={4} className="py-md px-gutter text-on-surface-variant font-label-caps text-label-caps uppercase">Total Selling Price</td>
                        <td className="py-md px-gutter text-right text-on-surface font-body-md font-bold">
                          {fmt(filteredRevenue.reduce((s, r) => s + r.totalPrice, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  <Pagination
                    page={revenuePage}
                    totalPages={revenueTotalPages}
                    onPrev={() => setRevenuePage(p => Math.max(1, p - 1))}
                    onNext={() => setRevenuePage(p => Math.min(revenueTotalPages, p + 1))}
                    totalItems={filteredRevenue.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setRevenuePage}
                  />
                </div>
              )}
            </>
          ) : activeTab === 'payments' ? (
            /* ── Customer Payments Tab ─────────────────────────── */
            <>
              {/* Search */}
              <div className="mb-md relative w-full sm:max-w-[420px] p-1">
                <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search customer, product, date..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>

              {filteredPayments.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">credit_card</span>
                  <p className="text-on-surface-variant font-body-md mt-sm">No payment data found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[12%]">
                          <button
                            onClick={() => setPaymentDateSort(s => s === 'asc' ? 'desc' : 'asc')}
                            className="flex items-center gap-xs hover:text-primary transition-colors cursor-pointer"
                          >
                            Date
                            <span className="material-symbols-outlined text-[16px]">
                              {paymentDateSort === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          </button>
                        </th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[18%]">Customer</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[22%]">Product</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[10%]">Type</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-[13%]">Total Price</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-[12%]">GST</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-[13%]">Total Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {pagedPayments.map((row, idx) => {
                        const gst = row.withGst ? row.gstvalue : 0;
                        const basePrice = row.amount;
                        const totalPaid = row.amount + gst;
                        const type = row.paymentType || 'base';
                        return (
                          <tr key={`${row.paymentId}-${idx}`} className="hover:bg-surface-container-low/40 transition-colors">
                            <td className="py-md px-gutter font-body-md text-on-surface-variant text-sm">{formatDate(row.date)}</td>
                            <td className="py-md px-gutter font-body-md text-on-surface font-medium">{row.customerName}</td>
                            <td className="py-md px-gutter font-body-md text-on-surface font-medium">{row.productName || 'Service'}</td>
                            <td className="py-md px-gutter">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-block ${type === 'renewal'
                                  ? 'bg-warning/10 text-warning border border-warning/20'
                                  : type === 'updated'
                                    ? 'bg-info/10 text-info border border-info/20'
                                    : type === 'oneTimePayment'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : 'bg-primary/10 text-primary border border-primary/20'
                                }`}>
                                {type === 'renewal' ? 'Renewal' : type === 'updated' ? 'Updated' : type === 'oneTimePayment' ? 'One-Time' : 'Base'}
                              </span>
                            </td>
                            <td className="py-md px-gutter font-body-md text-on-surface text-right">{fmt(basePrice)}</td>
                            <td className="py-md px-gutter font-body-md text-on-surface-variant text-right font-semibold">
                              {gst > 0 ? (
                                <span className="text-primary">{fmt(gst)}</span>
                              ) : (
                                <span className="text-on-surface-variant/30">—</span>
                              )}
                            </td>
                            <td className="py-md px-gutter font-body-md font-bold text-right text-on-surface">{fmt(totalPaid)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-outline-variant bg-surface-container-low font-bold">
                        <td colSpan={4} className="py-md px-gutter text-on-surface-variant font-label-caps text-label-caps uppercase">Total Payments</td>
                        <td className="py-md px-gutter text-right text-on-surface font-body-md">
                          {fmt(filteredPayments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                        <td className="py-md px-gutter text-right text-primary font-body-md">
                          {fmt(filteredPayments.reduce((s, p) => s + (p.withGst ? p.gstvalue : 0), 0))}
                        </td>
                        <td className="py-md px-gutter text-right font-body-md text-[#2e7d32]">
                          {fmt(filteredPayments.reduce((s, p) => s + (p.amount + (p.withGst ? p.gstvalue : 0)), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  <Pagination
                    page={paymentPage}
                    totalPages={paymentsTotalPages}
                    onPrev={() => setPaymentPage(p => Math.max(1, p - 1))}
                    onNext={() => setPaymentPage(p => Math.min(paymentsTotalPages, p + 1))}
                    totalItems={filteredPayments.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPaymentPage}
                  />
                </div>
              )}
            </>
          ) : (

            /* ── Express Tab ────────────────────────────────────── */
            <>
              {/* Search */}
              <div className="mb-md relative w-full sm:max-w-[420px] p-1">
                <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search description or date..."
                  value={expressSearch}
                  onChange={(e) => setExpressSearch(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>

              {filteredExpress.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">receipt_long</span>
                  <p className="text-on-surface-variant font-body-md mt-sm">No express entries yet.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-md inline-flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-bold font-body-md hover:brightness-110 active:scale-95 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add First Entry
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[18%]">
                          <button
                            onClick={() => setExpressDateSort(s => s === 'asc' ? 'desc' : 'asc')}
                            className="flex items-center gap-xs hover:text-primary transition-colors cursor-pointer"
                          >
                            Date
                            <span className="material-symbols-outlined text-[16px]">
                              {expressDateSort === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          </button>
                        </th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase w-[55%]">Description</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-[18%]">Amount</th>
                        <th className="py-md px-gutter font-label-caps text-label-caps text-on-surface-variant uppercase text-right w-[9%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {pagedExpress.map((entry) => (
                        <tr key={entry._id} className="hover:bg-surface-container-low/40 transition-colors">
                          <td className="py-md px-gutter font-body-md text-on-surface-variant text-sm">{entry.date}</td>
                          <td className="py-md px-gutter font-body-md text-on-surface">{entry.description}</td>
                          <td className="py-md px-gutter font-body-md font-bold text-[#e65100] text-right">{fmt(entry.amount)}</td>
                          <td className="py-md px-gutter text-right">
                            <button
                              onClick={() => setDeleteTarget(entry._id)}
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all cursor-pointer ml-auto"
                              title="Delete entry"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="border-t-2 border-outline-variant bg-surface-container-low font-bold">
                        <td colSpan={2} className="py-md px-gutter text-on-surface-variant font-label-caps text-label-caps uppercase">Total Express</td>
                        <td className="py-md px-gutter text-right font-body-md text-[#e65100]">
                          {fmt(filteredExpress.reduce((s, e) => s + (e.amount || 0), 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                  <Pagination
                    page={expressPage}
                    totalPages={expressTotalPages}
                    onPrev={() => setExpressPage(p => Math.max(1, p - 1))}
                    onNext={() => setExpressPage(p => Math.min(expressTotalPages, p + 1))}
                    totalItems={filteredExpress.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setExpressPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddExpressModal onClose={() => setShowAddModal(false)} onSave={handleAddExpress} />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteExpress} />
      )}
    </div>
  );
};

export default RevenueManagement;
