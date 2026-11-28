import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../../UI/LayoutComponents/Header';
import { useGetRevenueOrdersQuery } from '../../Redux/Revenue';
import {
  RevenueAnalyticsChart,
  RevenueInsightsGrid,
  RevenueDataSection,
} from './components';

const PERIOD_OPTIONS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annual', label: 'Annual' },
];

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const Revenue = () => {
  const [period, setPeriod] = useState('30d'); // '7d' | '30d' | 'quarterly' | 'annual'

  const {
    data: ordersRes,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetRevenueOrdersQuery({});

  useEffect(() => {
    if (isError) {
      toast.error(error?.data?.message || 'Failed to load revenue data');
    }
  }, [isError, error]);

  const orders = useMemo(
    () => (Array.isArray(ordersRes?.orders) ? ordersRes.orders : []),
    [ordersRes]
  );

  const payments = useMemo(
    () => (Array.isArray(ordersRes?.payments) ? ordersRes.payments : []),
    [ordersRes]
  );

  const customerSummary = useMemo(
    () => (Array.isArray(ordersRes?.customerSummary) ? ordersRes.customerSummary : []),
    [ordersRes]
  );

  const productSummary = useMemo(
    () => (Array.isArray(ordersRes?.productSummary) ? ordersRes.productSummary : []),
    [ordersRes]
  );

  const monthlySummary = useMemo(
    () => (Array.isArray(ordersRes?.monthlySummary) ? ordersRes.monthlySummary : []),
    [ordersRes]
  );

  const summary = useMemo(
    () => ({
      totalSelling: Number(ordersRes?.totalSelling) || 0,
      totalCustomerPaid: Number(ordersRes?.totalCustomerPaid) || 0,
      totalCustomerPaidNoGst: Number(ordersRes?.totalCustomerPaidNoGst) || 0,
      pendingAmount: Number(ordersRes?.pendingAmount) || 0,
      totalInvoices: Number(ordersRes?.totalInvoices) || 0,
      paymentBreakdown: ordersRes?.paymentBreakdown || {
        full: 0,
        advance: 0,
        mid: 0,
        final: 0,
      },
    }),
    [ordersRes]
  );

  return (
    <div className="space-y-6 bg-slate-50/60 min-h-full overflow-x-hidden">
      {/* Page Header + Period Selector */}
      <Header
        title="Revenue Management"
        subtitle="Track revenue income, customer payments, and cashflow at a glance."
        action={
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium border border-slate-200/80 shadow-xs">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer outline-none focus:outline-none whitespace-nowrap ${
                  period === opt.key
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Compact KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
          <span className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            Total Sales
          </span>
          <span className="text-slate-900 font-bold text-sm">{formatINR(summary.totalSelling)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-emerald-800 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
            Received
          </span>
          <span className="text-emerald-900 font-bold text-sm">{formatINR(summary.totalCustomerPaid)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 bg-amber-50/70 border border-amber-200/80 rounded-xl px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-amber-800 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            Pending
          </span>
          <span className="text-amber-900 font-bold text-sm">{formatINR(summary.pendingAmount)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
          <span className="text-slate-500 font-medium">Total Invoices</span>
          <span className="text-slate-900 font-bold text-sm">{summary.totalInvoices}</span>
        </div>
      </div>

      {/* Top 2-Column Analytics: Left (Main Chart) | Right (Scrollable Insights) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 min-w-0">
          <RevenueAnalyticsChart
            orders={orders}
            payments={payments}
            productSummary={productSummary}
            customerSummary={customerSummary}
            monthlySummary={monthlySummary}
            period={period}
          />
        </div>

        <div className="xl:col-span-4 xl:max-h-100 xl:overflow-y-auto custom-scrollbar xl:pr-1">
          <RevenueInsightsGrid
            productSummary={productSummary}
            customerSummary={customerSummary}
            paymentBreakdown={summary.paymentBreakdown}
          />
        </div>
      </div>

      {/* Full-Width Tabbed Data Table */}
      <RevenueDataSection
        orders={orders}
        payments={payments}
        customerSummary={customerSummary}
        productSummary={productSummary}
        isLoading={isLoading || isFetching}
      />
    </div>
  );
};

export default Revenue;
