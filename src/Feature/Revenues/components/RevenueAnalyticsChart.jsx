import React, { useMemo, useState } from 'react';
import { LineChart, BarChart3 } from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatCompactAxis = (val) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
  if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
  return `₹${Math.round(val)}`;
};

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

export const RevenueAnalyticsChart = ({
  orders = [],
  payments = [],
  period = '30d',
}) => {
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const analytics = useMemo(() => {
    const primaryLabel = 'Revenue';
    const secondaryLabel = 'Received';
    const secondaryColor = '#10b981';

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const salesSource = orders.map((o) => ({
      date: parseDate(o.orderDate),
      amount: Number(o.totalPrice) || 0,
    }));
    const receivedSource = payments.map((p) => ({
      date: parseDate(p.date),
      amount: (Number(p.amount) || 0) + (p.withGst ? Number(p.gstvalue) || 0 : 0),
    }));

    let buckets = [];
    if (period === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayEnd);
        d.setDate(d.getDate() - i);
        buckets.push({
          label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          fullLabel: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
          primary: 0,
          secondary: 0,
        });
      }
    } else if (period === '30d') {
      for (let i = 6; i >= 0; i--) {
        const end = new Date(todayEnd);
        end.setDate(end.getDate() - i * 4);
        const start = new Date(end);
        start.setDate(start.getDate() - 3);
        start.setHours(0, 0, 0, 0);
        buckets.push({
          label: end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          fullLabel: `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
          start,
          end,
          primary: 0,
          secondary: 0,
        });
      }
    } else if (period === 'quarterly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          fullLabel: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
          primary: 0,
          secondary: 0,
        });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          label: d.toLocaleDateString('en-IN', { month: 'short' }),
          fullLabel: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
          primary: 0,
          secondary: 0,
        });
      }
    }

    salesSource.forEach((item) => {
      if (!item.date) return;
      const b = buckets.find((x) => item.date >= x.start && item.date <= x.end);
      if (b) b.primary += item.amount;
    });

    receivedSource.forEach((item) => {
      if (!item.date) return;
      const b = buckets.find((x) => item.date >= x.start && item.date <= x.end);
      if (b) b.secondary += item.amount;
    });

    let rawItems = buckets;
    if (rawItems.length === 0) {
      rawItems = [{ label: 'No Data', fullLabel: 'No Data', primary: 0, secondary: 0 }];
    }

    const mid = Math.floor(rawItems.length / 2);
    const prevSum = rawItems.slice(0, mid).reduce((s, b) => s + b.primary, 0);
    const currSum = rawItems.slice(mid).reduce((s, b) => s + b.primary, 0);
    let growthPct = 0;
    if (prevSum > 0) growthPct = ((currSum - prevSum) / prevSum) * 100;
    else if (currSum > 0) growthPct = 100;

    const rawMax = Math.max(...rawItems.map((b) => Math.max(b.primary, b.secondary)), 1000);
    const stepBase = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const maxY = Math.ceil(rawMax / stepBase) * stepBase;

    const startX = 125;
    const endX = 935;
    const chartTop = 22;
    const chartBottom = 238;
    const chartHeight = chartBottom - chartTop;

    const points = rawItems.map((b, idx) => {
      const x =
        rawItems.length === 1
          ? 530
          : startX + (idx * (endX - startX)) / (rawItems.length - 1);
      const yPrimary = chartBottom - (b.primary / maxY) * chartHeight;
      const ySecondary = chartBottom - (b.secondary / maxY) * chartHeight;
      return {
        ...b,
        x,
        yPrimary,
        ySecondary,
      };
    });

    const primaryLine = points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.yPrimary}`)
      .join(' ');
    const primaryArea =
      points.length > 0
        ? `M ${points[0].x} ${chartBottom} ${points
            .map((pt) => `L ${pt.x} ${pt.yPrimary}`)
            .join(' ')} L ${points[points.length - 1].x} ${chartBottom} Z`
        : '';

    const secondaryLine = points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.ySecondary}`)
      .join(' ');

    const peakIdx = points.reduce(
      (best, pt, idx, arr) => (pt.primary >= arr[best].primary ? idx : best),
      0
    );

    return {
      points,
      primaryLine,
      primaryArea,
      secondaryLine,
      growthPct,
      maxY,
      peakIdx,
      primaryLabel,
      secondaryLabel,
      secondaryColor,
    };
  }, [orders, payments, period]);

  const growthLabel = `${analytics.growthPct >= 0 ? '+' : ''}${analytics.growthPct.toFixed(1)}%`;

  return (
    <section
      className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 overflow-hidden"
      data-purpose="revenue-analytics-chart"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Revenue &amp; Cashflow Analytics
          </h2>
          <span
            className={`text-xs font-semibold ${
              analytics.growthPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {growthLabel} MoM
          </span>
        </div>

        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium border border-slate-200/70 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer outline-none focus:outline-none ${
              chartType === 'line'
                ? 'bg-white text-blue-600 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Line &amp; Area</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer outline-none focus:outline-none ${
              chartType === 'bar'
                ? 'bg-white text-blue-600 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Cashflow Bar</span>
          </button>
        </div>
      </div>

      {/* Legend Strip */}
      <div className="py-3 flex items-center justify-end border-b border-slate-100/80">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
          <div className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1 bg-blue-600 rounded-full" />
            <span>{analytics.primaryLabel}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-1 rounded-full"
              style={{ backgroundColor: analytics.secondaryColor }}
            />
            <span>{analytics.secondaryLabel}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area Container (strictly contained inside card) */}
      <div className="relative mt-4 w-full h-[270px]">
        {/* Clamped Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-30 bg-slate-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs border border-slate-700/80 -translate-x-1/2 -translate-y-full backdrop-blur-sm transition-all duration-75"
            style={{
              left: `${Math.min(84, Math.max(16, (hoveredPoint.x / 1000) * 100))}%`,
              top: `${Math.max(24, ((Math.min(hoveredPoint.yPrimary, hoveredPoint.ySecondary) - 8) / 280) * 100)}%`,
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1 whitespace-nowrap">
              {hoveredPoint.fullLabel}
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {analytics.primaryLabel}:
              </span>
              <span className="font-bold text-white">{formatINR(hoveredPoint.primary)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300 mt-0.5">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: analytics.secondaryColor }}
                />
                {analytics.secondaryLabel}:
              </span>
              <span className="font-bold text-white">{formatINR(hoveredPoint.secondary)}</span>
            </div>
          </div>
        )}

        {chartType === 'line' ? (
          <svg
            className="w-full h-full overflow-hidden"
            preserveAspectRatio="none"
            viewBox="0 0 1000 280"
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                <stop offset="65%" stopColor="#3b82f6" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <g className="stroke-slate-200/70" strokeDasharray="4 4" strokeWidth="1">
              <line x1="76" x2="975" y1="22" y2="22" />
              <line x1="76" x2="975" y1="76" y2="76" />
              <line x1="76" x2="975" y1="130" y2="130" />
              <line x1="76" x2="975" y1="184" y2="184" />
              <line stroke="#e2e8f0" strokeDasharray="none" x1="76" x2="975" y1="238" y2="238" />
            </g>

            <g className="text-[11px] font-medium fill-slate-400 select-none">
              <text textAnchor="end" x="68" y="26">{formatCompactAxis(analytics.maxY)}</text>
              <text textAnchor="end" x="68" y="80">{formatCompactAxis(analytics.maxY * 0.75)}</text>
              <text textAnchor="end" x="68" y="134">{formatCompactAxis(analytics.maxY * 0.5)}</text>
              <text textAnchor="end" x="68" y="188">{formatCompactAxis(analytics.maxY * 0.25)}</text>
              <text textAnchor="end" x="68" y="242">₹0</text>
            </g>

            <path d={analytics.primaryArea} fill="url(#revenueGradient)" />
            <path
              d={analytics.secondaryLine}
              fill="none"
              stroke={analytics.secondaryColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              strokeDasharray="5 4"
            />
            <path
              d={analytics.primaryLine}
              fill="none"
              stroke="#2563eb"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />

            <g className="cursor-pointer">
              {analytics.points.map((pt, idx) => {
                const isPeak = idx === analytics.peakIdx && pt.primary > 0;
                return (
                  <g
                    key={pt.label + idx}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <rect x={pt.x - 32} y={10} width={64} height={235} fill="transparent" />
                    <circle
                      cx={pt.x}
                      cy={pt.ySecondary}
                      r={4}
                      fill={analytics.secondaryColor}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.yPrimary}
                      r={isPeak ? 6 : 5}
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth={isPeak ? 3 : 2.5}
                    />
                  </g>
                );
              })}
            </g>

            <g className="text-[11px] font-medium fill-slate-400 select-none">
              {analytics.points.map((pt, idx) => (
                <text key={pt.label + idx} textAnchor="middle" x={pt.x} y="262">
                  {pt.label}
                </text>
              ))}
            </g>
          </svg>
        ) : (
          <svg
            className="w-full h-full overflow-hidden"
            preserveAspectRatio="none"
            viewBox="0 0 1000 280"
          >
            <g className="stroke-slate-200/70" strokeDasharray="4 4" strokeWidth="1">
              <line x1="76" x2="975" y1="22" y2="22" />
              <line x1="76" x2="975" y1="76" y2="76" />
              <line x1="76" x2="975" y1="130" y2="130" />
              <line x1="76" x2="975" y1="184" y2="184" />
              <line stroke="#e2e8f0" strokeDasharray="none" x1="76" x2="975" y1="238" y2="238" />
            </g>

            <g className="text-[11px] font-medium fill-slate-400 select-none">
              <text textAnchor="end" x="68" y="26">{formatCompactAxis(analytics.maxY)}</text>
              <text textAnchor="end" x="68" y="80">{formatCompactAxis(analytics.maxY * 0.75)}</text>
              <text textAnchor="end" x="68" y="134">{formatCompactAxis(analytics.maxY * 0.5)}</text>
              <text textAnchor="end" x="68" y="188">{formatCompactAxis(analytics.maxY * 0.25)}</text>
              <text textAnchor="end" x="68" y="242">₹0</text>
            </g>

            <g className="cursor-pointer">
              {analytics.points.map((pt, idx) => {
                const priH = Math.max(4, 238 - pt.yPrimary);
                const secH = Math.max(4, 238 - pt.ySecondary);
                return (
                  <g
                    key={pt.label + idx}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <rect
                      x={pt.x - 22}
                      y={238 - priH}
                      width="20"
                      height={priH}
                      rx="4"
                      fill="#3b82f6"
                      className="hover:fill-blue-700 transition-colors"
                    />
                    <rect
                      x={pt.x + 2}
                      y={238 - secH}
                      width="20"
                      height={secH}
                      rx="4"
                      fill={analytics.secondaryColor}
                      className="opacity-90 hover:opacity-100 transition-opacity"
                    />
                  </g>
                );
              })}
            </g>

            <g className="text-[11px] font-medium fill-slate-400 select-none">
              {analytics.points.map((pt, idx) => (
                <text key={pt.label + idx} textAnchor="middle" x={pt.x} y="262">
                  {pt.label}
                </text>
              ))}
            </g>
          </svg>
        )}
      </div>
    </section>
  );
};

export default RevenueAnalyticsChart;
