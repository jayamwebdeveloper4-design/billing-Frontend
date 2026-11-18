import React, { useState, useEffect, useMemo } from "react";

// Helper to get ordinal name for sequential payments
const getOrdinalName = (num) => {
  const ordinals = {
    1: "Advance",
    2: "Second Payment",
    3: "Third Payment",
    4: "Fourth Payment",
    5: "Fifth Payment",
    6: "Sixth Payment",
    7: "Seventh Payment",
    8: "Eighth Payment",
    9: "Ninth Payment",
    10: "Tenth Payment",
  };
  return ordinals[num] || `Payment #${num}`;
};

const getPaymentBadgeInfo = (p, idx) => {
  const stage = (p.paymentStage || "").toLowerCase();
  if (stage === "advance" || (idx === 0 && stage !== "full")) {
    return {
      label: "ADVANCE",
      color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    };
  }
  if (stage === "final") {
    return {
      label: "FINAL AMOUNT",
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    };
  }
  if (stage === "full") {
    return {
      label: "FULL AMOUNT",
      color: "bg-primary/10 text-primary border-primary/20",
    };
  }
  // Sequential installment: Second Payment, Third Payment, etc.
  const stageNum = p.stageNumber || (idx + 1);
  const name = stageNum === 1 ? "ADVANCE" : getOrdinalName(stageNum).toUpperCase();
  return {
    label: name,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };
};

export const PaymentManagement = ({
  isOpen,
  onClose,
  customer = {},
  order = {},
  orderIdx = 0,
  gstRates = { cgst: 9, sgst: 9, igst: 18 },
  onSavePayment,
  onGenerateInvoice,
}) => {
  if (!isOpen || !order) return null;

  const currentDate = new Date().toISOString().split("T")[0];

  // Helper date formatter: DD-MM-YYYY
  const formatDateDisplay = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  // Financial calculations
  const orderPayments = useMemo(() => order.payments || [], [order.payments]);
  const totalPaid = useMemo(
    () => orderPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [orderPayments]
  );
  const totalOrderPrice = useMemo(
    () => Number(order.totalPrice || totalPaid || 0),
    [order.totalPrice, totalPaid]
  );
  const balanceDue = useMemo(
    () => Math.max(0, totalOrderPrice - totalPaid),
    [totalOrderPrice, totalPaid]
  );

  const isPaidZero = totalPaid === 0;
  const isFullyPaid = balanceDue === 0 && totalPaid > 0;

  // Next payment ordinal calculation:
  // e.g. If 1 payment exists (Advance), next is 2 -> "Second Payment"
  // If 2 payments exist, next is 3 -> "Third Payment"
  const nextPaymentNum = orderPayments.length + 1;
  const nextPaymentLabel = getOrdinalName(nextPaymentNum);

  const availableOptions = useMemo(() => {
    if (isPaidZero) {
      return [
        { id: "full", label: "Full Amount" },
        { id: "advance", label: "Advance" },
      ];
    } else {
      return [
        { id: "mid", label: nextPaymentLabel },
        { id: "final", label: "Final Amount" },
      ];
    }
  }, [isPaidZero, nextPaymentLabel]);

  const defaultOption = isPaidZero ? "full" : balanceDue > 0 ? "final" : "mid";

  // Form states
  const [paymentOption, setPaymentOption] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(currentDate);
  const [description, setDescription] = useState("");
  const [withGst, setWithGst] = useState(false);
  const [gstin, setGstin] = useState(customer.gstin || "");
  const [gstinInput, setGstinInput] = useState(customer.gstin || "");
  const [isGstConfirmed, setIsGstConfirmed] = useState(Boolean(customer.gstin?.trim()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState(null);

  // Synchronize defaults whenever order or modal changes
  useEffect(() => {
    // Default to unselected so user explicitly chooses payment stage
    setPaymentOption("");
    setAmount("");
    setDescription("");
    setPaymentDate(currentDate);
    setWithGst(false);
    const initialCustGstin = (customer.gstin || "").trim();
    setGstin(initialCustGstin);
    setGstinInput(initialCustGstin);
    setIsGstConfirmed(Boolean(initialCustGstin));
    setIsSubmitting(false);
    setSelectedPaymentIndex(null);
  }, [isOpen, order._id, isPaidZero, totalOrderPrice, balanceDue, nextPaymentLabel, customer.gstin]);

  const handleAddGstin = () => {
    const trimmed = (gstinInput || "").trim();
    if (!trimmed) {
      alert("Please enter a valid GST number.");
      return;
    }
    setGstin(trimmed);
    setIsGstConfirmed(true);
  };

  const handleEditGstin = () => {
    setGstinInput(gstin);
    setIsGstConfirmed(false);
  };

  const isInterState =
    (customer.state || "Tamil Nadu").toLowerCase().trim() !== "tamil nadu";
  const igstRateVal = Number(gstRates.igst || 18);
  const cgstRateVal = Number(gstRates.cgst || 9);
  const sgstRateVal = Number(gstRates.sgst || 9);
  const totalGstRate = isInterState ? igstRateVal : (cgstRateVal + sgstRateVal);

  // Total order price & balance due with GST
  const orderTaxValue = totalOrderPrice * (totalGstRate / 100);
  const displayOrderTotalPrice = withGst
    ? totalOrderPrice + orderTaxValue
    : totalOrderPrice;

  const balanceTaxValue = balanceDue * (totalGstRate / 100);
  const displayBalanceDueWithGst = withGst
    ? balanceDue + balanceTaxValue
    : balanceDue;

  // Handle option switch
  const handleOptionChange = (newOpt) => {
    setPaymentOption(newOpt);
    const domain = order.domainUrl || "services";

    if (newOpt === "full") {
      const fullVal = withGst ? (totalOrderPrice + orderTaxValue) : totalOrderPrice;
      setAmount(fullVal > 0 ? String(Math.round(fullVal)) : "");
      setDescription(`Full payment for ${domain}`);
    } else if (newOpt === "final") {
      const finalVal = withGst ? (balanceDue + balanceTaxValue) : balanceDue;
      setAmount(finalVal > 0 ? String(Math.round(finalVal)) : "");
      setDescription(`Final settlement for ${domain}`);
    } else if (newOpt === "advance") {
      setAmount("");
      setDescription(`Advance payment for ${domain}`);
    } else if (newOpt === "mid") {
      setAmount("");
      setDescription(`${nextPaymentLabel} for ${domain}`);
    } else {
      setAmount("");
      setDescription("");
    }
  };

  // Base and GST calculations
  const parsedAmount = Math.max(0, Number(amount) || 0);
  // When With GST is active, the entered amount in the input includes GST
  const baseAmount = withGst
    ? (totalGstRate > 0 ? parsedAmount / (1 + totalGstRate / 100) : parsedAmount)
    : parsedAmount;
  const taxValue = withGst ? parsedAmount - baseAmount : 0;
  const totalWithGst = parsedAmount;

  // Active display payable amount (reflects GST if selected)
  const displayPayAmount = parsedAmount;
  const formattedPayAmount = displayPayAmount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const actionButtonText = isPaidZero
    ? `Pay${displayPayAmount > 0 ? ` (₹${formattedPayAmount})` : ""}`
    : `Update${displayPayAmount > 0 ? ` (₹${formattedPayAmount})` : ""}`;

  // Payment status badge
  const statusBadge =
    balanceDue === 0 && totalPaid > 0
      ? { text: "FULLY PAID", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" }
      : totalPaid > 0
      ? { text: "PARTIALLY PAID", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" }
      : { text: "UNPAID", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isFullyPaid) return;
    if (!paymentOption) {
      alert("Please select a payment option.");
      return;
    }
    if (!amount || parsedAmount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    let activeGstin = gstin.trim();
    if (withGst) {
      if (!isGstConfirmed && gstinInput.trim()) {
        activeGstin = gstinInput.trim();
        setGstin(activeGstin);
        setIsGstConfirmed(true);
      } else if (!isGstConfirmed || !activeGstin) {
        alert("Please enter and add a valid GST number to proceed with GST.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const paymentData = {
        date: paymentDate || currentDate,
        amount: Number(baseAmount.toFixed(2)),
        gstvalue: withGst ? Number(taxValue.toFixed(2)) : 0,
        paymentType: "base",
        paymentStage: paymentOption,
        stageNumber: paymentOption === "mid" ? nextPaymentNum : (paymentOption === "advance" ? 1 : undefined),
        withGst: withGst,
        gstin: withGst ? activeGstin : "",
        description: description.trim(),
        selectedOrderIds: [String(order._id)],
      };

      if (onSavePayment) {
        await onSavePayment(paymentData, order, orderIdx);
      }
    } catch (err) {
      console.error("Payment update failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a dedicated separate invoice for an individual payment
  const handleGenerateSingleInvoice = (payment, idx) => {
    if (onGenerateInvoice) {
      const activeGstVal = payment.withGst ?? withGst;
      const activeGstin = payment.gstin || (withGst ? (isGstConfirmed ? gstin.trim() : gstinInput.trim()) : "");
      onGenerateInvoice({
        order,
        orderIdx,
        customer,
        balanceDue,
        totalPaid,
        totalOrderPrice,
        paymentsList: orderPayments,
        latestPayment: payment,
        specificPayment: {
          ...payment,
          idx,
          stageNumber: payment.stageNumber || (idx + 1),
        },
        isSeparateInvoice: true,
        isFullInvoice: false,
        withGst: activeGstVal,
        gstin: activeGstin,
      });
    }
  };

  // Generate complete full invoice for total order price without history breakdown
  const handleGenerateFullInvoice = () => {
    if (onGenerateInvoice) {
      const activeGstin = withGst ? (isGstConfirmed ? gstin.trim() : gstinInput.trim()) : "";
      onGenerateInvoice({
        order,
        orderIdx,
        customer,
        balanceDue,
        totalPaid,
        totalOrderPrice,
        paymentsList: orderPayments,
        latestPayment: orderPayments[orderPayments.length - 1] || null,
        specificPayment: null,
        isSeparateInvoice: false,
        isFullInvoice: true,
        withGst: withGst,
        gstin: activeGstin,
      });
    }
  };

  const handleInvoiceClick = () => {
    if (selectedPaymentIndex !== null && orderPayments[selectedPaymentIndex]) {
      handleGenerateSingleInvoice(orderPayments[selectedPaymentIndex], selectedPaymentIndex);
    } else {
      handleGenerateFullInvoice();
    }
  };

  const selectedPayment = selectedPaymentIndex !== null ? orderPayments[selectedPaymentIndex] : null;
  const selectedBadgeInfo = selectedPayment ? getPaymentBadgeInfo(selectedPayment, selectedPaymentIndex) : null;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[650px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
          <div className="flex items-center gap-sm text-primary">
            <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
            <div>
              <h3 className="text-lg font-black text-on-surface">Payment Management</h3>
              <p className="text-xs text-primary font-bold">
                {customer.name || "Customer"} • {order.domainUrl || "Order Services"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors cursor-pointer text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-md md:p-lg space-y-md overflow-y-auto custom-scrollbar flex-1">
          {/* Financial Metrics Cards */}
          <div className="grid grid-cols-3 gap-sm">
            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/40 text-center">
              <span className="text-[10px] uppercase font-black text-on-surface-variant tracking-wider block">
                ORDER PRICE
              </span>
              <span className="text-base md:text-lg font-black text-on-surface">
                ₹{totalOrderPrice.toLocaleString()}
              </span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
              <span className="text-[10px] uppercase font-black text-emerald-700 tracking-wider block">
                TOTAL PAID
              </span>
              <span className="text-base md:text-lg font-black text-emerald-600">
                ₹{totalPaid.toLocaleString()}
              </span>
            </div>
            <div
              className={`p-3 rounded-xl border text-center ${
                balanceDue > 0
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
                  : "bg-primary/10 border-primary/20 text-primary"
              }`}
            >
              <span className="text-[10px] uppercase font-black tracking-wider block">
                {balanceDue > 0 ? "BALANCE DUE" : "SETTLED"}
              </span>
              <span className="text-base md:text-lg font-black">
                ₹{balanceDue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Service Banner & Status */}
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-on-surface block">
                {order.products?.map((p) => p.product).join(", ") || "Services"}
              </span>
              {order.domainUrl && (
                <span className="text-[11px] text-primary font-bold">{order.domainUrl}</span>
              )}
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadge.color}`}
            >
              {statusBadge.text}
            </span>
          </div>

          {/* When Fully Paid: Show a friendly settled message instead of payment inputs */}
          {isFullyPaid ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-emerald-600 text-[26px] shrink-0">
                check_circle
              </span>
              <div>
                <p className="text-xs font-black text-emerald-800">
                  All payments have been settled for this order!
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Order price is fully paid. You can review payment stages or generate individual/complete invoices below.
                </p>
              </div>
            </div>
          ) : (
            /* Payment Form Fields */
            <div className="space-y-md">
              {/* Payment Option & Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                    PAYMENT OPTION
                  </label>
                  <select
                    value={paymentOption}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm cursor-pointer"
                  >
                    <option value="" disabled>-- Select Payment Option --</option>
                    {availableOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                    AMOUNT (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm"
                  />
                </div>
              </div>

              {/* Date Picker */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                  DATE / MONTH / YEAR
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch (_) {}
                  }}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm cursor-pointer"
                />
              </div>

              {/* Description / Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                  DESCRIPTION / REMARKS
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm"
                />
              </div>

              {/* GST Option Toggle */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                  GST OPTION
                </label>
                <div className="grid grid-cols-2 gap-sm p-1 bg-surface-container-low border border-outline-variant rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setWithGst(false);
                      if (paymentOption === "full") {
                        setAmount(totalOrderPrice > 0 ? String(totalOrderPrice) : "");
                      } else if (paymentOption === "final") {
                        setAmount(balanceDue > 0 ? String(balanceDue) : "");
                      }
                    }}
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      !withGst
                        ? "bg-primary text-on-primary shadow-sm"
                        : "text-on-surface hover:bg-surface-variant/50"
                    }`}
                  >
                    Without GST
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWithGst(true);
                      const withGstFull = totalOrderPrice + orderTaxValue;
                      const withGstFinal = balanceDue + balanceTaxValue;
                      if (paymentOption === "full") {
                        setAmount(withGstFull > 0 ? String(Math.round(withGstFull)) : "");
                      } else if (paymentOption === "final") {
                        setAmount(withGstFinal > 0 ? String(Math.round(withGstFinal)) : "");
                      }
                    }}
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      withGst
                        ? "bg-primary text-on-primary shadow-sm"
                        : "text-on-surface hover:bg-surface-variant/50"
                    }`}
                  >
                    With GST
                  </button>
                </div>
              </div>

              {/* If With GST is selected and GST number is NOT confirmed/added -> show Input GST Number + Add button */}
              {withGst && !isGstConfirmed && (
                <div className="p-3 bg-surface-container-low rounded-xl border border-amber-500/40 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">
                      INPUT GST NUMBER
                    </label>
                    <span className="text-[10px] text-amber-600 font-bold">GST Number Required</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={gstinInput}
                      onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                      placeholder="Enter customer GSTIN (e.g. 33AAAAA0000A1Z5)..."
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2.5 font-bold font-mono text-on-surface focus:ring-2 focus:ring-primary outline-none text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddGstin();
                        }
                      }}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddGstin}
                        disabled={!gstinInput.trim()}
                        className="px-4 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Summary:
                  If without GST: show Base and Total.
                  If with GST: only show this breakdown IF GST number is available and confirmed! */}
              {(!withGst || isGstConfirmed) && (
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-1.5 animate-in fade-in duration-150">
                  {withGst && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-primary pb-1 border-b border-outline-variant/20">
                      <span>GSTIN:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{gstin.trim()}</span>
                        <button
                          type="button"
                          onClick={handleEditGstin}
                          className="text-[10px] text-on-surface-variant hover:text-primary underline cursor-pointer"
                          title="Change GSTIN"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                    <span>Base Amount:</span>
                    <span className="font-bold text-on-surface">₹{baseAmount.toFixed(2)}</span>
                  </div>
                  {withGst && (
                    <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                      <span>GST ({isInterState ? `IGST ${igstRateVal}%` : `CGST+SGST ${totalGstRate}%`}):</span>
                      <span className="font-bold text-on-surface">₹{taxValue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black border-t border-outline-variant/30 pt-1.5">
                    <span className="text-primary">Total Amount:</span>
                    <span className="text-primary font-black">₹{parsedAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recorded Payments List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                RECORDED PAYMENTS ({orderPayments.length})
              </span>
              {orderPayments.length > 0 && (
                <span className="text-[10px] text-on-surface-variant">
                  Select checkbox to generate individual invoice
                </span>
              )}
            </div>

            {orderPayments.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-outline-variant/50 text-center text-xs text-on-surface-variant">
                No payments recorded yet for this order.
              </div>
            ) : (
              <div className={`space-y-1.5 overflow-y-auto custom-scrollbar ${isFullyPaid ? "max-h-[300px]" : "max-h-[170px]"}`}>
                {orderPayments.map((p, idx) => {
                  const badgeInfo = getPaymentBadgeInfo(p, idx);
                  const isChecked = selectedPaymentIndex === idx;

                  return (
                    <div
                      key={p._id || idx}
                      onClick={() => setSelectedPaymentIndex(isChecked ? null : idx)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-primary/5 border-primary shadow-xs"
                          : "bg-surface-container-low border-outline-variant/30 hover:border-outline-variant"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox for separate invoice selection */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedPaymentIndex(isChecked ? null : idx);
                          }}
                          className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                          title="Select to generate separate invoice for this payment"
                        />
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${badgeInfo.color}`}
                        >
                          {badgeInfo.label}
                        </span>
                        <span className="text-xs font-semibold text-on-surface shrink-0">
                          {formatDateDisplay(p.date)}
                        </span>
                        {p.description && (
                          <span className="text-[11px] text-on-surface-variant italic truncate max-w-[150px]">
                            "{p.description}"
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-emerald-600">
                          ₹{(Number(p.amount) || 0).toLocaleString()}
                        </span>
                        {/* Direct Invoice button for this individual payment */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateSingleInvoice(p, idx);
                          }}
                          className="px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-primary/20"
                          title={`Generate separate invoice for ${badgeInfo.label}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                          <span>Invoice</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-md md:p-lg border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-sm shrink-0">
          <div className="flex items-center gap-2">
            {selectedPayment ? (
              <button
                type="button"
                onClick={handleInvoiceClick}
                className="px-md py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Generate Invoice: {selectedBadgeInfo?.label} (₹{((Number(selectedPayment.amount) || 0) + (selectedPayment.withGst ? (Number(selectedPayment.gstvalue) || 0) : 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerateFullInvoice}
                className="px-md py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-primary/20"
                title="Generate complete full invoice for total order amount without history breakdown"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Complete Invoice (₹{displayOrderTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
              </button>
            )}

            {selectedPayment && (
              <button
                type="button"
                onClick={handleGenerateFullInvoice}
                className="px-2.5 py-2 text-on-surface-variant hover:text-primary font-bold text-xs rounded-xl hover:bg-surface-variant transition-all cursor-pointer"
                title="Generate complete full invoice without history"
              >
                Full Invoice
              </button>
            )}
          </div>

          <div className="flex items-center gap-sm">
            {!isFullyPaid && (
              <button
                type="button"
                disabled={isSubmitting || !paymentOption || parsedAmount <= 0}
                onClick={handleSubmit}
                className="px-lg py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">
                    {isPaidZero ? "payments" : "upgrade"}
                  </span>
                )}
                {actionButtonText}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-md py-2 rounded-xl font-bold text-xs text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentManagement;

