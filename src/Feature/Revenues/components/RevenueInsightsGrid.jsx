import React, { useMemo } from 'react';
import { Package, Users, PieChart } from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const STAGE_CONFIG = [
  { key: 'full', label: 'Full Payment', color: '#2563eb', bg: 'bg-blue-600' },
  { key: 'advance', label: 'Advance', color: '#10b981', bg: 'bg-emerald-500' },
  { key: 'mid', label: 'Partial / Mid', color: '#f59e0b', bg: 'bg-amber-500' },
  { key: 'final', label: 'Final', color: '#8b5cf6', bg: 'bg-violet-500' },
];

export const RevenueInsightsGrid = ({
  productSummary = [],
  customerSummary = [],
  paymentBreakdown = {},
}) => {
  const topProducts = productSummary;
  const maxProductSales = useMemo(
    () => Math.max(...topProducts.map((p) => Number(p.totalSales) || 0), 1),
    [topProducts]
  );

  const topCustomers = customerSummary;
  const maxCustomerSales = useMemo(
    () => Math.max(...topCustomers.map((c) => Number(c.totalSales) || 0), 1),
    [topCustomers]
  );

  // Donut chart geometry for payment stages
  const donut = useMemo(() => {
    const items = STAGE_CONFIG.map((cfg) => ({
      ...cfg,
      value: Number(paymentBreakdown?.[cfg.key]) || 0,
    }));
    const total = items.reduce((s, i) => s + i.value, 0);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;
    const segments = items.map((item) => {
      const pct = total > 0 ? item.value / total : 0;
      const dash = pct * circumference;
      const seg = {
        ...item,
        pct: Math.round(pct * 100),
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offset,
      };
      offset += dash;
      return seg;
    });

    return { total, radius, circumference, segments };
  }, [paymentBreakdown]);

  return (
    <section className="flex flex-col gap-6">
      {/* 1. Product-Wise Sales Visual */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Product-Wise Sales</h3>
              <p className="text-[11px] text-slate-500">Units sold &amp; revenue share</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600">
            {productSummary.length} products
          </span>
        </div>

        {topProducts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-10 text-xs text-slate-400">
            No product sales data available
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1.5">
            {topProducts.map((p, idx) => {
              const widthPct = Math.max(
                4,
                Math.round(((Number(p.totalSales) || 0) / maxProductSales) * 100)
              );
              return (
                <div key={p.productName + idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-slate-800 truncate">
                        {p.productName}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        ×{p.quantitySold}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900 shrink-0">
                      {formatINR(p.totalSales)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Customer Sales: Received vs Pending Visual */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Customer Sales &amp; Pending</h3>
              <p className="text-[11px] text-slate-500">Received vs pending balance</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-700">
            {customerSummary.length} customers
          </span>
        </div>

        {topCustomers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-10 text-xs text-slate-400">
            No customer sales data available
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1.5">
            {topCustomers.map((c, idx) => {
              const total = Number(c.totalSales) || 0;
              const rec = Number(c.receivedAmount) || 0;
              const pend = Number(c.pendingAmount) || 0;
              const barScale = Math.max(6, Math.round((total / maxCustomerSales) * 100));
              const recShare = total > 0 ? Math.min(100, Math.round((rec / total) * 100)) : 0;
              const pendShare = Math.max(0, 100 - recShare);

              return (
                <div key={(c.customerId || c.customerName) + idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      {c.customerName}
                    </span>
                    <div className="shrink-0 flex items-center gap-2">
                      {pend > 0 && (
                        <span className="text-[10px] font-semibold text-amber-600">
                          Due {formatINR(pend)}
                        </span>
                      )}
                      <span className="font-semibold text-slate-900">
                        {formatINR(total)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full flex rounded-full overflow-hidden transition-all duration-500"
                      style={{ width: `${barScale}%` }}
                    >
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${recShare}%` }}
                      />
                      {pend > 0 && (
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${pendShare}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-500 border-t border-slate-100">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                Received
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                Pending
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Payment Stage Breakdown Donut */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment Stages</h3>
              <p className="text-[11px] text-slate-500">Full, advance, partial &amp; final</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-between gap-4">
          {/* SVG Donut */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r={donut.radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="16"
              />
              {donut.total > 0 &&
                donut.segments.map((seg) =>
                  seg.value > 0 ? (
                    <circle
                      key={seg.key}
                      cx="65"
                      cy="65"
                      r={donut.radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                    />
                  ) : null
                )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Received
              </span>
              <span className="text-xs font-bold text-slate-900 mt-0.5">
                {formatINR(donut.total)}
              </span>
            </div>
          </div>

          {/* Stage Legend */}
          <div className="w-full space-y-2.5">
            {donut.segments.map((seg) => (
              <div
                key={seg.key}
                className="flex items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.bg}`} />
                  <span className="text-slate-600 font-medium truncate">
                    {seg.label}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-semibold text-slate-900">
                    {formatINR(seg.value)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({seg.pct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RevenueInsightsGrid;

