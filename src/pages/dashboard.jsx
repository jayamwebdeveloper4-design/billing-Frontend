import React, { useEffect, useState } from 'react'
import { getDashboardStats } from '../api/dashboardApi'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const kpis = stats?.kpis || { totalRevenue: 0, totalRenew: 0, totalCustomers: 0, totalProducts: 0, pendingReminders: 0, totalExpress: 0 };
  const revenueTrend = stats?.revenueTrend || Array(12).fill(0);
  const recentOrders = stats?.recentOrders || [];

  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...revenueTrend, 1);

  return (
    <div className="max-w-[1440px] animate-in fade-in duration-500 overflow-x-hidden">
      {/* KPI Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md md:gap-gutter mb-lg md:mb-xl">
        {/* Total Revenue Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl flex flex-col justify-between min-h-[120px] md:min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-on-surface-variant leading-tight max-w-[70%] text-[10px] md:text-label-caps">TOTAL REVENUE</span>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[20px] md:text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            </div>
          </div>
          <h1 className="text-lg xs:text-xl sm:text-2xl md:text-h1 font-bold text-on-surface mt-4 whitespace-nowrap" title={`₹${(kpis.totalRevenue || 0).toLocaleString()}`}>₹{(kpis.totalRevenue || 0).toLocaleString()}</h1>
        </div>

        {/* Total Products Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl flex flex-col justify-between min-h-[120px] md:min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-on-surface-variant leading-tight max-w-[70%] text-[10px] md:text-label-caps">PRODUCTS</span>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-[20px] md:text-[24px]">inventory_2</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-h1 font-bold text-on-surface mt-4">{kpis.totalProducts}</h1>
        </div>

        {/* Active Customers Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl flex flex-col justify-between min-h-[120px] md:min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-on-surface-variant leading-tight max-w-[70%] text-[10px] md:text-label-caps">CUSTOMERS</span>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-[20px] md:text-[24px]">group</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-h1 font-bold text-on-surface mt-4">{kpis.totalCustomers.toLocaleString()}</h1>
        </div>

        {/* Total Express Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl flex flex-col justify-between min-h-[120px] md:min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="font-label-caps text-on-surface-variant leading-tight max-w-[70%] text-[10px] md:text-label-caps">TOTAL EXPRESS</span>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-error text-[20px] md:text-[24px]">payments</span>
            </div>
          </div>
          <h1 className="text-lg xs:text-xl sm:text-2xl md:text-h1 font-bold text-on-surface mt-4 whitespace-nowrap" title={`₹${(kpis.totalExpress || 0).toLocaleString()}`}>₹{(kpis.totalExpress || 0).toLocaleString()}</h1>
        </div>
      </section>

      {/* Bento Layout: Trends & Recent Activity */}
      <div className="grid grid-cols-12 gap-md md:gap-gutter">
        {/* Trend Chart Section */}
        <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-lg overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg md:mb-xl">
            <div>
              <h3 className="font-h3 text-h3 text-on-surface">Revenue Trend</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Annual revenue analysis ({new Date().getFullYear()})</p>
            </div>
          </div>

          {/* Chart Implementation */}
          <div className="h-48 md:h-64 w-full relative flex items-end gap-[4px] md:gap-sm px-xs md:px-md">
            {revenueTrend.map((val, idx) => {
              const heightPercentage = (val / maxRevenue) * 100;
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return (
                <div key={idx} className="flex-1 h-full group relative flex items-end">
                  <div
                    className="w-full bg-linear-to-t from-primary/40 to-primary/60 rounded-t-sm transition-all hover:from-primary/60 hover:to-primary/80 cursor-pointer shadow-sm"
                    style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                  ></div>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-sm py-xs rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl pointer-events-none border border-outline-variant/20">
                    {months[idx]}: ₹{val.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-md flex justify-between px-xs md:px-md text-on-surface-variant font-tabular-nums text-[8px] md:text-[10px] border-t border-outline-variant pt-sm opacity-60">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
              <span key={m} className="flex-1 text-center">{m}</span>
            ))}
          </div>
        </section>

        {/* Recent Orders List */}
        <section className="col-span-12 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col min-w-0">
          <div className="p-md md:p-lg border-b border-outline-variant">
            <h3 className="font-h3 text-h3 text-on-surface">Recent orders</h3>
          </div>
          <div className="grow overflow-y-auto max-h-[400px] custom-scrollbar">
            {recentOrders.length > 0 ? recentOrders.map((order, idx) => (
              <div key={idx} className="p-md hover:bg-surface-container-low transition-colors flex items-start gap-md border-b border-outline-variant/30">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] md:text-[20px] text-on-secondary-fixed">receipt_long</span>
                </div>
                <div className="grow min-w-0">
                  <p className="font-body-md text-body-md text-on-surface truncate">Order for <span className="font-bold">{order.products?.[0]?.product || 'Products'}</span></p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{order.customerName} • {new Date(order.orderDate).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-tabular-nums text-tabular-nums text-tertiary-container shrink-0 text-xs md:text-sm font-bold">₹{order.totalPrice.toLocaleString()}</span>
                  <button
                    onClick={() => navigate('/customers', { state: { customerId: order.customerId } })}
                    className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                  >
                    View
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-lg text-center text-on-surface-variant font-body-sm">No recent orders found</div>
            )}
          </div>
          <div className="p-md mt-auto text-center border-t border-outline-variant/10">
            <button onClick={() => navigate('/customers')} className="text-primary font-bold hover:underline w-full cursor-pointer text-sm">View all customers</button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard