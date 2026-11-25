import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Eye,
  Pencil,
  Mail,
  Send,
  ChevronDown,
  X,
  Check,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Local UI Components
import Header from '../../UI/LayoutComponents/Header';
import SearchBar from '../../UI/Components/SearchBar';
import Table from '../../UI/Components/Table';
import Button from '../../UI/Components/Button';

// API Services
import {
  useGetRenewalsQuery,
  useExecuteRenewalMutation,
} from '../../Redux/Renewal';
import { useSendRenewalReminderMutation } from '../../Redux/Reminder';
import { useGetSmtpSettingsQuery, useUpdateSmtpSettingsMutation } from '../../Redux/Smtp/smtpApi';
import { templateApi } from '../../Redux/Template';
import { store } from '../../Redux/store';

// Local Feature Components
import { MessageTemplatesModal, SendReminderModal, RenewalPopUp } from './components';

// Helper: Format date into DD.MM.YYYY
const formatDateDot = (dateStr) => {
  if (!dateStr) return '—';
  if (typeof dateStr !== 'string') return String(dateStr);
  const cleanStr = dateStr.trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(cleanStr)) return cleanStr;

  // YYYY-MM-DD or YYYY.MM.DD
  if (/^\d{4}[-.]\d{2}[-.]\d{2}/.test(cleanStr)) {
    const parts = cleanStr.split(/[-.]/);
    return `${parts[2].slice(0, 2)}.${parts[1]}.${parts[0]}`;
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}/.test(cleanStr)) {
    const parts = cleanStr.split('-');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }
  return cleanStr;
};

// Helper: Check if date is expired
const checkIsExpired = (dateStr) => {
  if (!dateStr) return false;
  let d = null;
  const clean = String(dateStr).trim();
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
  } else {
    d = new Date(clean);
  }
  if (!d || isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

export const Renewal = () => {
  const navigate = useNavigate();

  // Date and filter states (matching screenshot defaults: Active, Unpaid, Renewal Month, November, 2026)
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());

  const [searchQuery, setSearchQuery] = useState('');
  const [deactiveFilter, setDeactiveFilter] = useState('active'); // 'active' | 'deactive'
  const [paymentFilter, setPaymentFilter] = useState('unpaid'); // 'unpaid' | 'paid'

  // RTK Query parameters: automatically driven by dynamic N-month window (N=1)
  const queryParams = useMemo(() => {
    const params = {
      deactive: deactiveFilter === 'deactive',
      section: paymentFilter,
      nMonths: 1,
    };
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }
    return params;
  }, [deactiveFilter, paymentFilter, searchQuery]);

  // Redux RTK Query hook for renewals & actions
  const {
    data: renewalsResponse,
    isLoading: isRenewalsLoading,
    isFetching: isRenewalsFetching,
    refetch: refetchRenewals,
  } = useGetRenewalsQuery(queryParams);

  const [executeRenewal, { isLoading: isExecutingRenewal }] = useExecuteRenewalMutation();
  const [sendRenewalReminder, { isLoading: isSendingReminder }] = useSendRenewalReminderMutation();

  // SMTP Settings for global Auto Reminder
  const { data: smtpSettings, isLoading: isSmtpLoading } = useGetSmtpSettingsQuery();
  const [updateSmtpSettings, { isLoading: isUpdatingSmtp }] = useUpdateSmtpSettingsMutation();

  const autoReminderEnabled = Boolean(smtpSettings?.autoReminder);

  const handleToggleAutoReminder = async () => {
    try {
      const nextVal = !autoReminderEnabled;
      await updateSmtpSettings({ autoReminder: nextVal }).unwrap();
      toast.success(`Auto Reminder turned ${nextVal ? 'ON' : 'OFF'}`);
    } catch (err) {
      toast.error('Failed to update Auto Reminder setting');
    }
  };

  const reminders = useMemo(() => {
    if (!renewalsResponse) return [];
    let list = [];
    if (paymentFilter === 'paid' && Array.isArray(renewalsResponse.paid)) list = renewalsResponse.paid;
    else if (paymentFilter === 'unpaid' && Array.isArray(renewalsResponse.unpaid)) list = renewalsResponse.unpaid;
    else if (Array.isArray(renewalsResponse.data)) list = renewalsResponse.data;
    else if (Array.isArray(renewalsResponse)) list = renewalsResponse;

    // Strict table filtering matching user's exact requirements:
    // 1. Paid table: ONLY show upcoming / renewal cycles that are PAID FULLY
    // 2. Unpaid table: Show upcoming, partial paid, and unpaid (NOT fully paid)
    if (paymentFilter === 'paid') {
      return list.filter(
        (r) =>
          r.isFullyPaid ||
          r.renewalPayment === 'paid' ||
          (Array.isArray(r.renewalHistory) &&
            r.renewalHistory.some(
              (c) =>
                c.renewalStatus === 'upcoming' &&
                Number(c.paidAmount) >= Number(c.totalAmount) &&
                Number(c.totalAmount) > 0
            ))
      );
    }
    if (paymentFilter === 'unpaid') {
      return list.filter(
        (r) =>
          !r.isFullyPaid &&
          r.renewalPayment !== 'paid' &&
          !(Array.isArray(r.renewalHistory) &&
            r.renewalHistory.some(
              (c) =>
                c.renewalStatus === 'upcoming' &&
                Number(c.paidAmount) >= Number(c.totalAmount) &&
                Number(c.totalAmount) > 0
            ))
      );
    }
    return list;
  }, [renewalsResponse, paymentFilter]);

  const loading = isRenewalsLoading || isRenewalsFetching;
  const fetchRenewalData = refetchRenewals;

  // Modals state
  const [payReminder, setPayReminder] = useState(null);
  const [sendReminder, setSendReminder] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState({
    Renewal: { subject: '', content: '' },
    Expired: { subject: '', content: '' },
    Deletion: { subject: '', content: '' },
    Payment: { subject: '', content: '' },
  });

  // Fetch Message Templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const fetchOne = (name) =>
          store
            .dispatch(templateApi.endpoints.getTemplate.initiate(name, { subscribe: false }))
            .unwrap()
            .catch(() => ({}));

        const [renewal, expired, deletion, payment] = await Promise.all([
          fetchOne('Renewal'),
          fetchOne('Expired'),
          fetchOne('Deletion'),
          fetchOne('Payment'),
        ]);
        const loaded = {
          Renewal: { subject: renewal?.subject || '', content: renewal?.content || '' },
          Expired: { subject: expired?.subject || '', content: expired?.content || '' },
          Deletion: { subject: deletion?.subject || '', content: deletion?.content || '' },
          Payment: { subject: payment?.subject || '', content: payment?.content || '' },
        };
        setTemplates(loaded);
      } catch (err) {
        console.warn('Could not load message templates', err);
      }
    };
    fetchTemplates();
  }, []);

  // Filter renewals by search query
  const filteredReminders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reminders;

    return reminders.filter((r) => {
      const custName = (r.customerName || '').toLowerCase();
      const emailStr = Array.isArray(r.email)
        ? r.email.join(', ').toLowerCase()
        : (r.email || '').toLowerCase();
      const domain = (r.domainUrl || '').toLowerCase();
      const prodName = (r.productName || '').toLowerCase();
      const prods = (r.products || [])
        .map((p) => (p.product || p.productName || '').toLowerCase())
        .join(' ');

      return (
        custName.includes(q) ||
        emailStr.includes(q) ||
        domain.includes(q) ||
        prodName.includes(q) ||
        prods.includes(q)
      );
    });
  }, [reminders, searchQuery]);

  
  // Table Columns Definition matching the user's design exactly
  const columns = useMemo(
    () => [
      {
        key: 'dateColumn',
        label: 'START DATE',
        width: '160px',
        render: (row) => {
          const isPaid = paymentFilter === 'paid' || row.isFullyPaid;
          const rawDate = row.startDate || row.displayDate;
          const formattedDate = formatDateDot(rawDate);

          let badgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
          let badgeText = 'UPCOMING';

          if (isPaid) {
            badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
            badgeText = 'RENEWED';
          } else if (
          
            row.badgeText === 'NOT PAID' ||
            (row.isUnpaid && (!row.renewalHistory || row.renewalHistory.length === 0))
          ) {
            badgeClass = 'text-slate-700 bg-slate-100 border-slate-300';
            badgeText = row.badgeText || 'NOT PAID';
          } else if (
            row.badgeText === 'EXPIRED' ||
            row.renewalStatus === 'not renewed' ||
            row.renewalStatus === 'not_renewal' ||
            row.isExpired ||
            checkIsExpired(row.endDate)
          ) {
            badgeClass = 'text-red-700 bg-red-50 border-red-200';
            badgeText = 'EXPIRED';
          }

          return (
            <div className="flex flex-col gap-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border w-fit ${badgeClass}`}
              >
                {badgeText}
              </span>
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                {formattedDate}
              </span>
            </div>
          );
        },
      },
      {
        key: 'customerDetails',
        label: 'CUSTOMER DETAILS',
        render: (row) => {
          const custId = row.customerId?._id || row.customerId;
          const primaryName = row.customerId?.name || row.customerDetails?.name || row.customerName || 'Customer';
          const domainUrl = row.domainUrl || row.orderId?.domainUrl ? `, ${row.domainUrl || row.orderId?.domainUrl}` : '';
          const emailSource = row.customerId?.email || row.customerDetails?.email || row.email;
          const emailDisplay = Array.isArray(emailSource)
            ? emailSource.join(', ')
            : emailSource || '—';

          return (
            <div
              onClick={() => {
                if (custId) {
                  navigate(`/customers/${custId}`);
                }
              }}
              className="flex flex-col gap-0.5 cursor-pointer group max-w-[320px]"
              title="Click to view Customer Information"
            >
              <div className="font-bold text-[#0052cc] text-sm group-hover:underline truncate">
                {primaryName}
                <span className="font-normal text-gray-500 text-xs">{domainUrl}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">{emailDisplay}</div>
            </div>
          );
        },
      },
      {
        key: 'products',
        label: 'PRODUCTS',
        render: (row) => {
          const prods =
            row.products && row.products.length > 0
              ? row.products
              : row.product
              ? [{ product: row.product, variant: row.variant, deactive: row.deactive }]
              : row.productName
              ? [{ product: row.productName }]
              : [];

          return (
            <div className="flex flex-col gap-1 max-w-[220px]">
              {prods.map((p, idx) => (
                <div
                  key={p._id || idx}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-800"
                >
                  <span className="text-gray-900 font-bold leading-none">•</span>
                  <span className="truncate" title={p.product || p.productName}>
                    {p.product || p.productName}
                  </span>
                  {p.deactive && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.2 rounded font-bold uppercase">
                      Deactive
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        key: 'totalPrice',
        label: 'TOTAL PRICE',
        render: (row) => {
          const priceVal =
            row.sellerPriceRenewal !== null && row.sellerPriceRenewal !== undefined
              ? row.sellerPriceRenewal
              : row.price || 0;
          return (
            <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
              ₹ {priceVal.toLocaleString('en-IN')}
            </span>
          );
        },
      },
      {
        key: 'renewalPayment',
        label: 'RENEWAL PAYMENT',
        render: (row) => {
          const isPaid = paymentFilter === 'paid' || row.isFullyPaid;
          const rawStatus = row.renewalPayment || (isPaid ? 'paid' : (row.isPartial ? 'partial' : 'unpaid'));
          const statusText = String(rawStatus).toLowerCase();

          let statusColor = 'text-red-600 hover:text-red-700';

          if (statusText === 'paid') {
            statusColor = 'text-emerald-600 hover:text-emerald-700';
          } else if (statusText === 'advance') {
            statusColor = 'text-amber-600 hover:text-amber-700';
          } else if (statusText === 'partial' || statusText === 'partially paid') {
            statusColor = 'text-amber-600 hover:text-amber-700';
          } else {
            statusColor = 'text-red-600 hover:text-red-700';
          }

          return (
            <button
              type="button"
              onClick={() => setPayReminder(row)}
              className={`text-sm font-bold ${statusColor} hover:underline cursor-pointer transition-colors block text-left`}
              title="Click to record/update payment"
            >
              {statusText}
            </button>
          );
        },
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (row) => {
          const targetCustId = row.customerId?._id || (typeof row.customerId === 'string' ? row.customerId : null) || row.orderId?.customerId;
          const targetOrderId = row.orderId?._id || (typeof row.orderId === 'string' ? row.orderId : null) || (row.id && String(row.id).includes('-') ? String(row.id).split('-')[1] : row.id);

          const isFullyPaid =
            paymentFilter === 'paid' ||
            (row.isFullyPaid !== undefined
              ? row.isFullyPaid
              : row.balanceDue <= 0 &&
                (row.paymentStatus === 'Fully Paid' ||
                  row.paymentStatus === 'Paid' ||
                  row.renewalStatus === 'renewed' ||
                  row.renewalStatus === 'yearly renewed'));
          const isPartial =
            paymentFilter === 'unpaid' &&
            (row.isPartial !== undefined
              ? row.isPartial
              : row.paymentStatus === 'Partially Paid' ||
                (Number(row.balanceDue) > 0 && Number(row.totalPaidAmount) > 0));

          let reminderCount = 0;
          let reminderLabel = null;
          if (Array.isArray(row.reminder) && row.reminder.length > 0) {
            const latest = row.reminder[row.reminder.length - 1];
            reminderCount = latest?.count || row.reminder.length;
            reminderLabel = `Sent (${reminderCount})`;
          } else if (typeof row.reminder === 'string' && row.reminder.trim()) {
            reminderLabel = row.reminder;
          } else if (row.emailSend || row.expiredEmailSend || row.deletionEmailSend) {
            reminderLabel = 'Sent';
          }
          const isEmailSent = Boolean(reminderLabel);
          const isRenewed = isFullyPaid && !isPartial;

          return (
            <div className="inline-flex items-center justify-end gap-2.5">
              {/* View Customer Details */}
              <button
                type="button"
                onClick={() => {
                  if (targetCustId) {
                    navigate(`/customers/${targetCustId}`);
                  } else {
                    toast.error('Customer profile not available');
                  }
                }}
                className="p-1.5 text-gray-600 hover:text-[#0052cc] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="View Customer Profile"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Edit Order */}
              <button
                type="button"
                onClick={() => {
                  if (targetCustId && targetOrderId) {
                    navigate(`/new-order/${targetCustId}/${targetOrderId}`, {
                      state: { fromReminders: true },
                    });
                  } else if (targetOrderId) {
                    navigate(`/new-order/default/${targetOrderId}`, {
                      state: { fromReminders: true },
                    });
                  } else {
                    toast.error('Order details not found');
                  }
                }}
                className="p-1.5 text-gray-600 hover:text-[#0052cc] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Edit Order"
              >
                <Pencil className="w-4 h-4" />
              </button>

              {/* Quick Renew Button */}
              {!isRenewed && (
                <button
                  type="button"
                  onClick={() => setPayReminder(row)}
                  className="p-1.5 text-blue-600 hover:text-[#0052cc] rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Renew Service"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* Email Sent / Send Button */}
              {isRenewed ? (
                <span
                  className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold whitespace-nowrap shrink-0"
                  title="Renewed / Paid (Reminders blocked)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Renewed</span>
                </span>
              ) : isEmailSent ? (
                <button
                  type="button"
                  onClick={() => setSendReminder(row)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title={`Reminder ${reminderLabel || 'Sent'}. Click to view or resend.`}
                >
                  <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span>Sent</span>
                  {reminderCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-gray-200/80 text-gray-800 rounded-full text-[10px] font-bold leading-none">
                      {reminderCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSendReminder(row)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg border border-[#0052cc]/30 bg-blue-50/50 hover:bg-blue-100/60 text-[#0052cc] text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Send Renewal Email"
                >
                  <Send className="w-3.5 h-3.5 text-[#0052cc] shrink-0" />
                  <span>Send</span>
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [navigate, paymentFilter]
  );

  return (
    <div className="p-2  max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* 1. Header with Title, Subtitle, and Message Templates Button */}
      <Header
        title="Renewal Management"
        subtitle="Manage customer service renewals, track expirations, and automate follow-ups."
        action={
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Auto Reminder Global Toggle */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
              <span className="text-xs font-semibold text-gray-700">Auto Reminder</span>
              <button
                type="button"
                onClick={handleToggleAutoReminder}
                disabled={isUpdatingSmtp || isSmtpLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                  autoReminderEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
                title={autoReminderEnabled ? 'Auto Reminder is ON. Click to turn OFF' : 'Auto Reminder is OFF. Click to turn ON'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    autoReminderEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${autoReminderEnabled ? 'text-emerald-700' : 'text-gray-500'}`}>
                {autoReminderEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Message Templates Button */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 text-sm font-semibold rounded-xl border border-gray-200 transition-colors shadow-2xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#0052cc]" />
              <span>Message Templates</span>
            </button>
          </div>
        }
      />

      {/* 2. Filter Bar matching the screenshot */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* Search Input using local SearchBar */}
        <div className="w-full sm:w-[260px] md:w-[280px]">
          <SearchBar
            value={searchQuery}
            onSearch={(val) => setSearchQuery(val)}
            placeholder="Search customers..."
            className="w-full"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Active / Deactive Filter */}
          <div className="relative">
            <select
              value={deactiveFilter}
              onChange={(e) => setDeactiveFilter(e.target.value)}
              className="appearance-none bg-white text-gray-800 text-xs md:text-sm font-semibold h-[42px] pl-3.5 pr-8 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer transition-all"
            >
              <option value="active">🟢 Active</option>
              <option value="deactive">🔴 Deactive</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* 2. Payment Status Filter (Unpaid / Paid) */}
          {deactiveFilter === 'active' && (
            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="appearance-none bg-white text-gray-800 text-xs md:text-sm font-semibold h-[42px] pl-3.5 pr-8 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer transition-all"
              >
                <option value="unpaid">🟠 Unpaid</option>
                <option value="paid">🟢 Paid</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          )}

          {/* Reset Filters button if altered */}
          {(deactiveFilter !== 'active' ||
            paymentFilter !== 'unpaid' ||
            searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setDeactiveFilter('active');
                setPaymentFilter('unpaid');
                setSearchQuery('');
              }}
              className="h-[42px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 text-gray-600 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. Table using local Table Component */}
      <Table
        columns={columns}
        data={filteredReminders}
        isLoading={loading}
        emptyMessage="No matching customer renewals found."
        keyField="id"
      />

      {/* 5. Message Templates Modal */}
      <MessageTemplatesModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onTemplatesUpdated={(updated) => setTemplates(updated)}
      />

      {/* 6. Send Email Confirmation Modal */}
      <SendReminderModal
        isOpen={Boolean(sendReminder)}
        reminder={sendReminder}
        templates={templates}
        onClose={() => setSendReminder(null)}
        onSuccess={fetchRenewalData}
        formatDateDot={formatDateDot}
        sendReminderMutation={sendRenewalReminder}
        isSending={isSendingReminder}
      />

      {/* 7. Renewal Execution Popup Modal */}
      <RenewalPopUp
        isOpen={Boolean(payReminder)}
        renewal={payReminder}
        onClose={() => setPayReminder(null)}
        onSuccess={fetchRenewalData}
        formatDateDot={formatDateDot}
        executeRenewalMutation={executeRenewal}
        isMutationLoading={isExecutingRenewal}
      />
    </div>
  );
};

export default Renewal;

