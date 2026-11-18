import React from 'react';
import { useNavigate } from 'react-router-dom';

// Helper to calculate renewal dates (+1 year or +1 month)
const calculateRenewalDates = (r) => {
  if (!r) return { startDate: "", endDate: "" };
  const endRaw = r.endDateDot || r.endDate || "";

  const parseDateParts = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const cleanStr = dateStr.trim();
    let day, month, year;
    let separator = '.';

    if (cleanStr.includes('.')) {
      separator = '.';
      const parts = cleanStr.split('.');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      }
    } else if (cleanStr.includes('-')) {
      separator = '-';
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      }
    } else if (cleanStr.includes('/')) {
      separator = '/';
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      }
    }

    if (day && month && year && !isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return { day, month, year, separator };
    }
    return null;
  };

  const endParts = parseDateParts(endRaw) || parseDateParts(r.endDate);

  if (!endParts) {
    return {
      startDate: endRaw,
      endDate: endRaw
    };
  }

  const pad = (n) => String(n).padStart(2, '0');
  const sep = endParts.separator || '.';
  const isDDMM = endRaw.includes('.') || (endRaw.split('-')[0] && endRaw.split('-')[0].length <= 2);

  let renewalStartFormatted = "";
  let renewalEndFormatted = "";
  const isMonthly = r.billingCycle === 'monthly';
  let nextEndYear = endParts.year;
  let nextEndMonth = endParts.month;

  if (isMonthly) {
    const dateObj = new Date(endParts.year, endParts.month - 1, endParts.day);
    dateObj.setMonth(dateObj.getMonth() + 1);
    nextEndYear = dateObj.getFullYear();
    nextEndMonth = dateObj.getMonth() + 1;
  } else {
    nextEndYear = endParts.year + 1;
  }

  if (isDDMM) {
    renewalStartFormatted = `${pad(endParts.day)}${sep}${pad(endParts.month)}${sep}${endParts.year}`;
    renewalEndFormatted = `${pad(endParts.day)}${sep}${pad(nextEndMonth)}${sep}${nextEndYear}`;
  } else {
    renewalStartFormatted = `${endParts.year}${sep}${pad(endParts.month)}${sep}${pad(endParts.day)}`;
    renewalEndFormatted = `${nextEndYear}${sep}${pad(nextEndMonth)}${sep}${pad(endParts.day)}`;
  }

  return {
    startDate: renewalStartFormatted,
    endDate: renewalEndFormatted
  };
};

const formatDeactiveDate = (val) => {
  if (!val) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return val;
};

const getRenewalMonthYear = (rem) => {
  if (!rem) return "";
  const dateStr = rem.endDate || rem.dueDate || rem.startDate || "";
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1]}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}`;
    }
  }
  return dateStr;
};

export const RenewalTable = ({
  loading,
  filteredReminders = [],
  reminders = [],
  reminderPage = 1,
  REM_PAGE_SIZE = 10,
  deactiveFilter,
  paymentFilter,
  openPayModal,
  openSendModal,
  setReconfirmReminder,
  setInvoiceModalConfig
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full text-left border-collapse table-auto text-xs md:text-sm">
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-bold uppercase tracking-wider text-[10px] md:text-xs">
            {deactiveFilter === 'deactive' ? (
              <>
                <th className="px-md py-md whitespace-nowrap text-error">DEACTIVE DATE</th>
                <th className="px-md py-md">CUSTOMER DETAILS</th>
                <th className="px-md py-md">PRODUCTS</th>
                <th className="px-md py-md whitespace-nowrap">PRICE</th>
              </>
            ) : (
              <>
                <th className="px-md py-md whitespace-nowrap">EXPIRE DATE </th>
                <th className="px-md py-md">CUSTOMER DETAILS</th>
                <th className="px-md py-md">PRODUCTS</th>
                <th className="px-md py-md whitespace-nowrap">TOTAL PRICE</th>
                <th className="px-md py-md text-left whitespace-nowrap">RENEWAL PAYMENT</th>
                <th className="px-md py-md text-right whitespace-nowrap">ACTIONS</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          {loading ? (
            <tr>
              <td colSpan="10" className="px-md py-12 text-center text-on-surface-variant">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading renewal reminders...
              </td>
            </tr>
          ) : (() => {
            const pagedReminders = filteredReminders.slice((reminderPage - 1) * REM_PAGE_SIZE, reminderPage * REM_PAGE_SIZE);

            if (pagedReminders.length === 0) {
              return (
                <tr>
                  <td colSpan="10" className="px-md py-12 text-center text-on-surface-variant">
                    No matching renewal orders found.
                  </td>
                </tr>
              );
            }

            if (deactiveFilter === 'deactive') {
              return pagedReminders.flatMap((r) => {
                const deactiveProds = (r.products || []).filter(p => p.deactive);
                const displayProds = deactiveProds.length > 0 ? deactiveProds : [{ productName: r.productName, deactiveYear: r.deactiveYear, price: r.price }];

                return displayProds.map((p, pIdx) => {
                  const prodPrice = (p.price !== undefined && p.price !== null && p.price > 0)
                    ? p.price
                    : (p.renewalSelling !== undefined && p.renewalSelling !== null ? p.renewalSelling * (p.quantity || 1) : 0);

                  return (
                    <tr key={`${r.id}-${pIdx}`} className="hover:bg-surface-container-low/60 transition-colors group">
                      {/* Deactive Date */}
                      <td className="px-md py-md font-medium text-error whitespace-nowrap">
                        {formatDeactiveDate(p.deactiveYear) || '—'}
                      </td>

                      {/* Customer Details */}
                      <td className="px-md py-md">
                        <div className="min-w-0 max-w-[220px] flex flex-col gap-0.5">
                          <div className="font-bold text-on-surface truncate">
                            {r.customerName}
                          </div>
                          {r.domainUrl && (
                            <div className="text-[11px] text-on-surface-variant truncate">{r.domainUrl}</div>
                          )}
                          <div className="text-[11px] text-on-surface-variant truncate">
                            {Array.isArray(r.email) ? r.email.join(', ') : r.email}
                          </div>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="px-md py-md max-w-[200px]">
                        <div className="text-xs font-medium text-error truncate" title={p.product || p.productName}>
                          • {p.product || p.productName}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-md py-md font-bold text-on-surface whitespace-nowrap">
                        ₹ {prodPrice.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                });
              });
            }

            return pagedReminders.map((r) => {
              return (
                <tr key={r.id} className="hover:bg-surface-container-low/60 transition-colors group">
                  {/* CURRENT PLAN */}
                  <td className="px-md py-md font-bold whitespace-nowrap">
                    {(() => {
                      const dateStr = r.endDateDot || r.endDate || r.dueDate;
                      if (!dateStr) return <span className="text-on-surface-variant/70 font-normal">—</span>;

                      let endDateObj = null;
                      if (r.endDateDot && r.endDateDot.includes('.')) {
                        const [d, m, y] = r.endDateDot.split('.').map(Number);
                        endDateObj = new Date(y, m - 1, d);
                      } else if (dateStr.includes('-')) {
                        const parts = dateStr.split('-');
                        if (parts[0].length === 4) {
                          endDateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                        } else {
                          endDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                        }
                      } else {
                        endDateObj = new Date(dateStr);
                      }

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      if (!endDateObj || isNaN(endDateObj.getTime())) {
                        return <span className="font-semibold text-on-surface">{dateStr}</span>;
                      }

                      endDateObj.setHours(0, 0, 0, 0);
                      const isExpired = endDateObj < today;
                      const displayDate = r.endDateDot || r.endDate || dateStr;

                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[11px] font-bold ${isExpired ? "text-error" : "text-emerald-600"}`}>
                            {isExpired ? "expired" : "expire in"}
                          </span>
                          <span className="font-semibold text-on-surface">
                            {displayDate}
                          </span>
                        </div>
                      );
                    })()}
                  </td>

                  {/* CUSTOMER DETAILS */}
                  <td className="px-md py-md">
                    <div
                      onClick={() => navigate('/customers', { state: { customerId: r.customerId, editMode: true } })}
                      className="min-w-0 max-w-[220px] flex flex-col gap-0.5 cursor-pointer group/cust"
                      title="Click to view Customer Information"
                    >
                      <div className="font-bold text-primary group-hover/cust:underline transition-colors truncate">
                        {r.customerName}
                        {r.domainUrl && <span className="text-on-surface-variant font-normal text-xs">, {r.domainUrl}</span>}
                      </div>
                      {(() => {
                        if (paymentFilter === 'paid' || r.paymentStatus === 'Fully Paid' || r.paymentStatus === 'Paid') return null;
                        const rMY = getRenewalMonthYear(r);
                        const custCount = reminders.filter(item => item.customerId === r.customerId && getRenewalMonthYear(item) === rMY).length;
                        if (custCount > 1) {
                          return (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                openSendModal(r);
                              }}
                              className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors w-max mt-0.5"
                              title={`${custCount} renewals found for this customer in this period. Click to send combined email.`}
                            >
                              <span className="material-symbols-outlined text-[11px]">layers</span>
                              {custCount} Renewals
                            </span>
                          );
                        }
                        return null;
                      })()}
                      <div className="text-[11px] text-on-surface-variant truncate">
                        {Array.isArray(r.email) ? r.email.join(', ') : r.email}
                      </div>
                    </div>
                  </td>

                  {/* PRODUCTS */}
                  <td className="px-md py-md max-w-[200px]">
                    <div className="flex flex-col gap-1 max-w-[200px]">
                      {r.products && r.products.length > 0 ? (
                        r.products.map((p, pIdx) => (
                          <div key={pIdx} className="flex flex-wrap items-center gap-1 min-w-0">
                            <span className={`text-xs font-bold truncate ${p.deactive ? 'text-error' : 'text-on-surface'}`} title={p.product || p.productName}>
                              • {p.product || p.productName}
                            </span>
                            {p.deactive && (
                              <span className="text-[9px] bg-error/10 text-error font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                Deactive {p.deactiveYear ? `(${formatDeactiveDate(p.deactiveYear)})` : ''}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs font-bold text-on-surface truncate" title={r.productName}>
                          {r.productName || '—'}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* TOTAL PRICE */}
                  <td className="px-md py-md font-bold text-on-surface whitespace-nowrap">
                    ₹ {(r.sellerPriceRenewal !== null && r.sellerPriceRenewal !== undefined ? r.sellerPriceRenewal : (r.price || 0)).toLocaleString("en-IN")}
                  </td>

                  {/* RENEWAL PAYMENT */}
                  <td className="px-md py-md text-left whitespace-nowrap">
                    <div className="flex flex-col items-start gap-0.5">
                      {(() => {
                        const isFullyPaid = r.paymentStatus === "Fully Paid" || r.paymentStatus === "Paid";
                        const isPartial = r.paymentStatus === "Partially Paid";
                        const renewalDates = calculateRenewalDates(r);
                        const nextRenewalDate = r.endDateDot || r.dueDate || r.endDate || "—";
                        const tillDate = renewalDates.endDate || r.endDateDot || r.endDate || "—";

                        if (isFullyPaid) {
                          return (
                            <button
                              type="button"
                              onClick={() => openPayModal(r)}
                              title="Click to view payment"
                              className="flex flex-col items-start gap-0.5 cursor-pointer hover:opacity-80 active:scale-95 transition-all text-left"
                            >
                              <span className="font-bold text-emerald-600 text-xs md:text-sm">
                                paid
                              </span>
                              {/* <span className="text-[11px] text-on-surface-variant font-medium">
                                till {tillDate}
                              </span> */}
                            </button>
                          );
                        }

                        if (isPartial) {
                          const totalPaid = (r.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                          const orderPrice = r.sellerPriceRenewal !== null && r.sellerPriceRenewal !== undefined ? r.sellerPriceRenewal : (r.price || 0);
                          const balance = Math.max(0, orderPrice - totalPaid);

                          return (
                            <button
                              type="button"
                              onClick={() => openPayModal(r)}
                              title="Click to update payment"
                              className="flex flex-col items-start gap-0.5 cursor-pointer hover:opacity-80 active:scale-95 transition-all text-left"
                            >
                              <span className="font-bold text-amber-600 text-xs md:text-sm">
                                partial
                              </span>
                              {/* <span className="text-[11px] text-on-surface-variant font-medium">
                                {nextRenewalDate} (₹{balance.toLocaleString("en-IN")} left)
                              </span> */}
                            </button>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => openPayModal(r)}
                            title="Click to record payment"
                            className="flex flex-col items-start gap-0.5 cursor-pointer hover:opacity-80 active:scale-95 transition-all text-left"
                          >
                            <span className="font-bold text-rose-600 text-xs md:text-sm">
                              unpaid
                            </span>
                            {/* <span className="text-[11px] text-on-surface-variant font-medium">
                              {nextRenewalDate}
                            </span> */}
                          </button>
                        );
                      })()}
                    </div>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-md py-md text-right whitespace-nowrap">
                    <div className="flex justify-end items-center gap-1">
                      <button
                        onClick={() => {
                          const custId = r.customerId?._id || r.customerId;
                          if (custId) {
                            navigate('/customers', {
                              state: {
                                customerId: custId,
                                editMode: true,
                                activeTab: 'invoice'
                              }
                            });
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button
                        onClick={() => {
                          const orderId = r.id.split('-')[1];
                          navigate(`/new-order/${r.customerId}/${orderId}`, { state: { fromReminders: true } });
                        }}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="Edit Order"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>

                      {(paymentFilter === 'paid' || r.paymentStatus === 'Fully Paid' || r.paymentStatus === 'Paid') && (
                        <button
                          onClick={() => {
                            const orderId = r.id ? (String(r.id).includes('-') ? String(r.id).split('-')[1] : r.id) : r.orderId;
                            const latestPayment = r.payments && r.payments.length > 0 ? r.payments[r.payments.length - 1] : null;
                            const paymentWithGst = latestPayment?.withGst !== undefined ? !!latestPayment.withGst : !!r.withGst;

                            setInvoiceModalConfig({
                              isOpen: true,
                              order: { ...r, orderId },
                              paymentData: {
                                amount: latestPayment?.amount || r.price || 0,
                                paymentDate: latestPayment?.date || r.lastPaymentDateRaw || r.lastPaymentDate || new Date().toISOString().slice(0, 10),
                                paymentStatus: 'Paid',
                                withGst: paymentWithGst,
                                description: latestPayment?.description || "",
                                selectedOrderIds: [orderId],
                                tdsAmount: latestPayment?.tdsAmount || 0,
                                paymentId: latestPayment?._id || null
                              }
                            });
                          }}
                          className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-500/10 rounded transition-all cursor-pointer"
                          title="Generate New Invoice"
                        >
                          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                        </button>
                      )}

                      {!(paymentFilter === 'paid' || r.paymentStatus === 'Fully Paid' || r.paymentStatus === 'Paid') && (
                        (r.emailSend || r.expiredEmailSend || r.deletionEmailSend) ? (
                          <button
                            onClick={() => setReconfirmReminder(r)}
                            className="px-2.5 h-8 flex items-center justify-center gap-1 bg-surface-container-high text-on-surface-variant border border-outline-variant rounded-lg font-bold transition-all cursor-pointer shadow-xs"
                            title="Email already sent — click to send again"
                          >
                            <span className="material-symbols-outlined text-[16px]">mail_off</span>
                            <span className="text-[10px]">Sent</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openSendModal(r)}
                            className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                            title="Send Email"
                          >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );
};

export default RenewalTable;

