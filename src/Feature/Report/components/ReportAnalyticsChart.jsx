import React, { useMemo, useState } from 'react';

const SERIES_DEFS = [
  {
    key: 'activeDomains',
    label: 'Active Domains',
    color: '#2dd4bf',
    gradientId: 'reportGradActiveDomains',
  },
  {
    key: 'customers',
    label: 'Customers',
    color: '#3b82f6',
    gradientId: 'reportGradCustomers',
  },
  {
    key: 'orders',
    label: 'Orders',
    color: '#c084fc',
    gradientId: 'reportGradOrders',
  },
  {
    key: 'deactiveDomains',
    label: 'Deactive Domains',
    color: '#fb7185',
    gradientId: 'reportGradDeactiveDomains',
  },
];

export const ReportAnalyticsChart = ({
  buckets = [],
  subtitle = 'Smooth trend overview across customers, orders, and domains',
}) => {
  const [visibleSeries, setVisibleSeries] = useState({
    customers: true,
    orders: true,
    activeDomains: true,
    deactiveDomains: true,
  });
  const [hoveredPointIdx, setHoveredPointIdx] = useState(null);

  const toggleSeries = (key) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const maxChartValue = useMemo(() => {
    let max = 1;
    buckets.forEach((b) => {
      max = Math.max(
        max,
        Number(b.customers) || 0,
        Number(b.orders) || 0,
        Number(b.activeDomains) || 0,
        Number(b.deactiveDomains) || 0
      );
    });
    return max + Math.ceil(max * 0.15) + 1;
  }, [buckets]);

  const svgWidth = 1000;
  const svgHeight = 320;
  const paddingX = 45;
  const paddingY = 45;
  const chartW = svgWidth - 2 * paddingX;
  const chartH = svgHeight - 2 * paddingY;
  const numBuckets = buckets.length;

  const getX = (index) => {
    if (numBuckets <= 1) return paddingX + chartW / 2;
    return paddingX + (index / (numBuckets - 1)) * chartW;
  };

  const getY = (val) => {
    return svgHeight - paddingY - ((Number(val) || 0) / maxChartValue) * chartH;
  };

  const createCurvedPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      d += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const createCurvedAreaPath = (pts, baselineY) => {
    if (!pts || pts.length === 0) return '';
    const curve = createCurvedPath(pts);
    return `${curve} L ${pts[pts.length - 1].x} ${baselineY} L ${pts[0].x} ${baselineY} Z`;
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md md:p-lg space-y-md">
      {/* Chart Header + Series Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant/30 pb-md">
        <div>
          <h3 className="text-h3 font-bold text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary text-[22px]">
              analytics
            </span>
            Analysis Report
          </h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-md">
          {SERIES_DEFS.map((series) => {
            const isActive = visibleSeries[series.key];
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleSeries(series.key)}
                className={`flex items-center gap-sm py-xs transition-all cursor-pointer text-xs font-bold ${
                  isActive
                    ? 'text-on-surface'
                    : 'opacity-40 hover:opacity-80 text-on-surface-variant'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: series.color }}
                />
                <span>{series.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Area */}
      {numBuckets === 0 ? (
        <div className="py-16 text-center text-body-sm text-on-surface-variant">
          No chart analytics data available yet.
        </div>
      ) : (
        <div className="relative pt-sm pb-sm overflow-x-auto custom-scrollbar">
          <div className="min-w-[680px] w-full relative">
            {hoveredPointIdx !== null && buckets[hoveredPointIdx] && (
              <div
                className="absolute top-2 bg-surface-container-lowest text-on-surface text-[10px] p-3 rounded-2xl shadow-xl z-30 pointer-events-none whitespace-nowrap space-y-1.5 transform -translate-x-1/2 border border-outline-variant/60"
                style={{
                  left: `${Math.max(12, Math.min(88, (getX(hoveredPointIdx) / svgWidth) * 100))}%`,
                }}
              >
                <div className="font-black border-b border-outline-variant/30 pb-1 text-on-surface">
                  {buckets[hoveredPointIdx].label}
                </div>
                {SERIES_DEFS.map(
                  (s) =>
                    visibleSeries[s.key] && (
                      <div key={s.key} className="flex justify-between gap-4 font-bold">
                        <span style={{ color: s.color }}>{s.label}:</span>
                        <span>{buckets[hoveredPointIdx][s.key] ?? 0}</span>
                      </div>
                    )
                )}
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[320px] overflow-visible"
            >
              <defs>
                {SERIES_DEFS.map((series) => (
                  <linearGradient
                    key={series.gradientId}
                    id={series.gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={series.color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={series.color} stopOpacity="0.0" />
                  </linearGradient>
                ))}
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const yVal = svgHeight - paddingY - ratio * chartH;
                const gridVal = Math.round(ratio * maxChartValue);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={yVal}
                      x2={svgWidth - paddingX}
                      y2={yVal}
                      stroke="currentColor"
                      className="text-outline-variant/25"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 12}
                      y={yVal + 4}
                      className="text-[10px] fill-on-surface-variant font-bold"
                      textAnchor="end"
                    >
                      {gridVal}
                    </text>
                  </g>
                );
              })}

              {SERIES_DEFS.map((series) => {
                if (!visibleSeries[series.key]) return null;
                const pts = buckets.map((b, i) => ({
                  x: getX(i),
                  y: getY(b[series.key]),
                }));
                return (
                  <g key={series.key}>
                    <path
                      d={createCurvedAreaPath(pts, svgHeight - paddingY)}
                      fill={`url(#${series.gradientId})`}
                    />
                    <path
                      d={createCurvedPath(pts)}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}

              {buckets.map((b, i) => {
                const cx = getX(i);
                const colWidth = numBuckets > 1 ? chartW / numBuckets : chartW;
                return (
                  <g key={i}>
                    <rect
                      x={cx - colWidth / 2}
                      y={paddingY}
                      width={colWidth}
                      height={chartH}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIdx(i)}
                      onMouseLeave={() => setHoveredPointIdx(null)}
                    />
                    <text
                      x={cx}
                      y={svgHeight - 12}
                      className={`text-[10px] font-bold ${
                        hoveredPointIdx === i
                          ? 'fill-primary font-black'
                          : 'fill-on-surface-variant'
                      }`}
                      textAnchor="middle"
                    >
                      {b.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportAnalyticsChart;

