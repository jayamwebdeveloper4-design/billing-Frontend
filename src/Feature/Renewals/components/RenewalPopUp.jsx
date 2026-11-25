import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useExecuteRenewalMutation } from "../../../Redux/Renewal";

// Helper to get ordinal name for sequential payments matching PaymentMenagement
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
  const stage = (p.paymentStage || p.stage || "").toLowerCase();
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
  const stageNum = p.stageNumber || idx + 1;
  const name =
    stageNum === 1 ? "ADVANCE" : getOrdinalName(stageNum).toUpperCase();
  return {
    label: name,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };
};

// ----------------------------------------------------
// Strict Date Helpers
// ----------------------------------------------------
const parseAnyDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val !== "string") return null;

  const clean = val.trim();

  // YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }

  // DD.MM.YYYY or DD-MM-YYYY
  const dotMatch = clean.match(/^(\d{2})[.-](\d{2})[.-](\d{4})/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const toInputDate = (date) => {
  if (!date || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toDotDate = (date) => {
  if (!date || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${d}.${m}.${y}`;
};

const addCycleToDate = (baseDate, cycleType = "yearly", count = 1) => {
  if (!baseDate || isNaN(baseDate.getTime())) return new Date();
  const result = new Date(baseDate);

  if (cycleType === "monthly") {
    const origDay = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + Math.round(count));
    const lastDay = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0
    ).getDate();
    result.setDate(Math.min(origDay, lastDay));
    return result;
  }

  // Yearly
  const origDay = result.getDate();
  const origMonth = result.getMonth();
  result.setFullYear(result.getFullYear() + Math.round(count));
  if (result.getMonth() !== origMonth) {
    result.setDate(0);
  }
  return result;
};

export const RenewalPopUp = ({
  isOpen,
  renewal,
  onClose,
  onSuccess,
  formatDateDot,
  executeRenewalMutation: externalExecuteRenewal,
  isMutationLoading: externalIsMutationLoading,
}) => {
  if (!isOpen || !renewal) return null;

  const currentDate = new Date().toISOString().split("T")[0];

  const [internalExecuteRenewal, { isLoading: internalIsMutationLoading }] =
    useExecuteRenewalMutation();
  const executeRenewalMutation = externalExecuteRenewal || internalExecuteRenewal;
  const isMutationLoading =
    externalIsMutationLoading !== undefined
      ? externalIsMutationLoading
      : internalIsMutationLoading;
  const [isApiLoading, setIsApiLoading] = useState(false);
  const isSubmitting = isMutationLoading || isApiLoading;

  // Basic customer & product snapshots
  const customer = renewal.customerId || renewal.customerDetails || {};
  const customerName =
    customer.name || renewal.customerName || "Customer";
  const domainUrl = renewal.domainUrl || renewal.orderId?.domainUrl || "";
  const productName =
    renewal.product ||
    renewal.productName ||
    (renewal.products && renewal.products[0]?.product) ||
    "Services";

  // Check if this renewal cycle is already renewed or completed
  const isRenewed =
    renewal.renewalStatus === "renewed" ||
    renewal.renewalStatus === "yearly renewed" ||
    renewal.renewalStatus === "renewald";

  // Financial Metrics: Only count payments belonging to the current/active renewal cycle
  const orderPayments = useMemo(() => {
    // If not renewed yet, past payments from initial order or prior cycles do NOT count towards this upcoming renewal
    if (!isRenewed) {
      const historyCycles = Array.isArray(renewal.renewalHistory)
        ? renewal.renewalHistory
        : [];
      if (historyCycles.length > 0) {
        const lastCycle = historyCycles[historyCycles.length - 1];
        if (
          lastCycle &&
          lastCycle.paymentStatus === "Partially Paid" &&
          Array.isArray(lastCycle.paymentStages) &&
          lastCycle.paymentStages.length > 0
        ) {
          return lastCycle.paymentStages;
        }
      }
      return [];
    }

    // If renewed, return payments recorded for the renewed cycle or fallback to paymentHistory
    const historyCycles = Array.isArray(renewal.renewalHistory)
      ? renewal.renewalHistory
      : [];
    if (historyCycles.length > 0) {
      const lastCycle = historyCycles[historyCycles.length - 1];
      if (Array.isArray(lastCycle.paymentStages) && lastCycle.paymentStages.length > 0) {
        return lastCycle.paymentStages;
      }
    }

    return renewal.paymentHistory || [];
  }, [renewal.paymentHistory, renewal.renewalHistory, isRenewed]);

  const totalOrderPrice = useMemo(() => {
    if (
      renewal.sellerPriceRenewal !== null &&
      renewal.sellerPriceRenewal !== undefined &&
      Number(renewal.sellerPriceRenewal) > 0
    ) {
      return Number(renewal.sellerPriceRenewal);
    }
    return Number(renewal.price || 0);
  }, [renewal.sellerPriceRenewal, renewal.price]);

  const totalPaid = useMemo(() => {
    return orderPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [orderPayments]);

  const balanceDue = useMemo(
    () => Math.max(0, totalOrderPrice - totalPaid),
    [totalOrderPrice, totalPaid]
  );

  const isPaidZero = totalPaid === 0;
  const isFullyPaid = balanceDue === 0 && totalPaid > 0;

  // Payment Options matching PaymentMenagement
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

  // Form states matching PaymentMenagement
  const [paymentOption, setPaymentOption] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(currentDate);
  const [description, setDescription] = useState("");
  const [withGst, setWithGst] = useState(false);
  const [gstin, setGstin] = useState(customer.gstin || "");
  const [gstinInput, setGstinInput] = useState(customer.gstin || "");
  const [isGstConfirmed, setIsGstConfirmed] = useState(
    Boolean(customer.gstin?.trim())
  );

  // Expiration & Renewal Date Calculation Logic
  const currentExpiryRaw = useMemo(() => {
    return (
      renewal.endDateDot ||
      renewal.endDate ||
      renewal.dueDate ||
      renewal.startDate ||
      ""
    );
  }, [renewal]);

  const currentExpiryDate = useMemo(() => {
    return parseAnyDate(currentExpiryRaw);
  }, [currentExpiryRaw]);

  const isExpired = useMemo(() => {
    if (!currentExpiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(currentExpiryDate);
    exp.setHours(0, 0, 0, 0);
    return exp < today;
  }, [currentExpiryDate]);

  // Core Renewal Date Calculation:
  // If renewing BEFORE expired date: starts exactly on current expiry date (continuous extension)
  // If renewing AFTER expired date: starts on current expiry date (maintaining anniversary) or today
  const renewalBillingCycle =
    renewal.billingCycle === "monthly" ? "monthly" : "yearly";

  const calculatedNewDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If this renewal is already in progress/partially renewed for the upcoming cycle,
    // preserve the current cycle dates instead of prematurely jumping to the following year!
    if (isRenewed && renewal.startDate && renewal.endDate && balanceDue > 0) {
      return {
        startFormatted: renewal.startDate,
        endFormatted: renewal.endDate,
        startObj: parseAnyDate(renewal.startDate) || today,
        endObj: parseAnyDate(renewal.endDate) || today,
      };
    }

    let startObj;
    if (!currentExpiryDate) {
      startObj = today;
    } else if (!isExpired) {
      // Before expiry: preserve active days, start from current expiry
      startObj = new Date(currentExpiryDate);
    } else {
      // After expiry: continuous from expiry
      startObj = new Date(currentExpiryDate);
    }

    const endObj = addCycleToDate(startObj, renewalBillingCycle, 1);
    return {
      startFormatted: toDotDate(startObj),
      endFormatted: toDotDate(endObj),
      startObj,
      endObj,
    };
  }, [currentExpiryDate, isExpired, renewalBillingCycle, isRenewed, renewal.startDate, renewal.endDate, balanceDue]);

  // GST rates & tax calculation
  const totalGstRate = 18; // standard GST 18%
  const orderTaxValue = totalOrderPrice * (totalGstRate / 100);
  const balanceTaxValue = balanceDue * (totalGstRate / 100);

  // Initialize form defaults on open
  useEffect(() => {
    setPaymentOption("");
    setAmount("");
    setDescription("");
    setPaymentDate(currentDate);
    setWithGst(false);
    const initialCustGstin = (customer.gstin || "").trim();
    setGstin(initialCustGstin);
    setGstinInput(initialCustGstin);
    setIsGstConfirmed(Boolean(initialCustGstin));
  }, [isOpen, renewal._id, currentDate, customer.gstin]);

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

  // Payment Option selection handler
  const handleOptionChange = (newOpt) => {
    setPaymentOption(newOpt);
    const domain = domainUrl || productName || "service";

    if (newOpt === "full") {
      const fullVal = withGst
        ? totalOrderPrice + orderTaxValue
        : totalOrderPrice;
      setAmount(fullVal > 0 ? String(Math.round(fullVal)) : "");
      setDescription(`Renewal Full payment for ${domain}`);
    } else if (newOpt === "final") {
      const finalVal = withGst
        ? balanceDue + balanceTaxValue
        : balanceDue;
      setAmount(finalVal > 0 ? String(Math.round(finalVal)) : "");
      setDescription(`Renewal Final settlement for ${domain}`);
    } else if (newOpt === "advance") {
      setAmount("");
      setDescription(`Renewal Advance payment for ${domain}`);
    } else if (newOpt === "mid") {
      setAmount("");
      setDescription(`Renewal ${nextPaymentLabel} for ${domain}`);
    } else {
      setAmount("");
      setDescription("");
    }
  };

  // Base & GST computations
  const parsedAmount = Math.max(0, Number(amount) || 0);
  const baseAmount = withGst
    ? totalGstRate > 0
      ? parsedAmount / (1 + totalGstRate / 100)
      : parsedAmount
    : parsedAmount;
  const taxValue = withGst ? parsedAmount - baseAmount : 0;

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
      ? {
          text: "FULLY PAID",
          color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        }
      : totalPaid > 0
      ? {
          text: "PARTIALLY PAID",
          color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
        }
      : {
          text: "UNPAID",
          color: "bg-rose-500/10 text-rose-600 border-rose-500/30",
        };

  // Form Submit Handler
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

    const targetId = renewal._id || renewal.id;
    if (!targetId) {
      toast.error("Renewal ID not found");
      return;
    }

    setIsApiLoading(true);
    try {
      const payload = {
        id: targetId,
        amount: Number(baseAmount.toFixed(2)),
        paidAmount: Number(baseAmount.toFixed(2)),
        withGst: Boolean(withGst),
        gstvalue: withGst ? Number(taxValue.toFixed(2)) : 0,
        gstin: withGst ? activeGstin : "",
        paymentStage: paymentOption,
        stageNumber:
          paymentOption === "mid"
            ? nextPaymentNum
            : paymentOption === "advance"
            ? 1
            : undefined,
        paymentDate: paymentDate,
        date: paymentDate,
        description: description.trim() || "Renewal payment received",
        // Calculated renewal term dates
        startDate: calculatedNewDates.startFormatted,
        endDate: calculatedNewDates.endFormatted,
        billingCycle: renewalBillingCycle,
      };

      await executeRenewalMutation(payload).unwrap();

      toast.success(
        `Renewal payment recorded! Renewed until ${calculatedNewDates.endFormatted}`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Renewal payment failed:", err);
      toast.error(
        err?.data?.message || err?.message || "Failed to record renewal payment"
      );
    } finally {
      setIsApiLoading(false);
    }
  };

  const displayExpiry = formatDateDot
    ? formatDateDot(currentExpiryRaw)
    : currentExpiryRaw || "—";

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[650px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
          <div className="flex items-center gap-sm text-primary">
            <span className="material-symbols-outlined text-[26px]">
              account_balance_wallet
            </span>
            <div>
              <h3 className="text-lg font-black text-on-surface">
                Payment Management
              </h3>
              <p className="text-xs text-primary font-bold">
                {customerName} • {domainUrl || productName}
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
          {/* Financial Metrics Cards matching the screenshot */}
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

          {/* Service Banner & Status matching the screenshot */}
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-on-surface block">
                {productName}
              </span>
              {domainUrl && (
                <span className="text-[11px] text-primary font-bold">
                  {domainUrl}
                </span>
              )}
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadge.color}`}
            >
              {statusBadge.text}
            </span>
          </div>

          {/* When Fully Paid */}
          {isFullyPaid ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-emerald-600 text-[26px] shrink-0">
                check_circle
              </span>
              <div>
                <p className="text-xs font-black text-emerald-800">
                  All payments have been settled for this service!
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Service is renewed until {calculatedNewDates.endFormatted}.
                </p>
              </div>
            </div>
          ) : (
            /* Payment Form Fields matching screenshot exactly */
            <div className="space-y-md">
              {/* PAYMENT OPTION & AMOUNT (₹) */}
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
                    <option value="" disabled>
                      -- Select Payment Option --
                    </option>
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

              {/* DATE / MONTH / YEAR */}
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

              {/* DESCRIPTION / REMARKS */}
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

              {/* GST OPTION */}
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
                        setAmount(
                          totalOrderPrice > 0 ? String(totalOrderPrice) : ""
                        );
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
                        setAmount(
                          withGstFull > 0 ? String(Math.round(withGstFull)) : ""
                        );
                      } else if (paymentOption === "final") {
                        setAmount(
                          withGstFinal > 0
                            ? String(Math.round(withGstFinal))
                            : ""
                        );
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

              {/* Input GST Number (if With GST and not confirmed) */}
              {withGst && !isGstConfirmed && (
                <div className="p-3 bg-surface-container-low rounded-xl border border-amber-500/40 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">
                      INPUT GST NUMBER
                    </label>
                    <span className="text-[10px] text-amber-600 font-bold">
                      GST Number Required
                    </span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={gstinInput}
                      onChange={(e) =>
                        setGstinInput(e.target.value.toUpperCase())
                      }
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
                        <span className="material-symbols-outlined text-[15px]">
                          add
                        </span>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Summary Breakdown */}
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
                    <span className="font-bold text-on-surface">
                      ₹{baseAmount.toFixed(2)}
                    </span>
                  </div>
                  {withGst && (
                    <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant">
                      <span>GST (18%):</span>
                      <span className="font-bold text-on-surface">
                        ₹{taxValue.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black border-t border-outline-variant/30 pt-1.5">
                    <span className="text-primary">Total Amount:</span>
                    <span className="text-primary font-black">
                      ₹{parsedAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Renewal Period & Calculated Dates Info Card */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-primary/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                    NEW RENEWAL TERM
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isExpired
                        ? "text-red-700 bg-red-50 border-red-200"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    {isExpired
                      ? `From Expired (${displayExpiry})`
                      : `Continuous from Expiry (${displayExpiry})`}
                  </span>
                </div>
                <div className="text-xs font-bold text-on-surface flex items-center justify-between pt-0.5">
                  <span>Start: {calculatedNewDates.startFormatted}</span>
                  <span className="text-primary font-black">
                    Next Expiry: {calculatedNewDates.endFormatted}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  {isExpired
                    ? "Service expired. Continuous renewal keeps the anniversary date intact."
                    : "Renewing before expiry. Term extends seamlessly from the current expiry date."}
                </p>
              </div>
            </div>
          )}

          {/* Hierarchical Renewal Cycles & Payment Stages */}
          {renewal.renewalHistory && renewal.renewalHistory.length > 0 ? (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
                RENEWAL CYCLES & PAYMENT STAGES ({renewal.renewalHistory.length})
              </span>
              <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                {renewal.renewalHistory.map((cycle, cIdx) => (
                  <div
                    key={cycle._id || cIdx}
                    className="p-3 rounded-xl border bg-surface-container-low border-outline-variant/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-on-surface">
                          Cycle #{cycle.cycleNumber || cIdx + 1}: {cycle.startDate} to {cycle.endDate}
                        </span>
                        <div className="text-[11px] text-on-surface-variant font-medium">
                          Total: ₹{Number(cycle.totalAmount || 0).toLocaleString()} • Paid: ₹{Number(cycle.paidAmount || 0).toLocaleString()}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          cycle.paymentStatus === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {cycle.paymentStatus || "Paid"}
                      </span>
                    </div>

                    {/* Nested Payment Stages */}
                    {cycle.paymentStages && cycle.paymentStages.length > 0 && (
                      <div className="pl-2 border-l-2 border-outline-variant/50 space-y-1">
                        {cycle.paymentStages.map((stg, sIdx) => {
                          const badgeInfo = getPaymentBadgeInfo(
                            { paymentStage: stg.stage, stageNumber: stg.stageNumber },
                            sIdx
                          );
                          return (
                            <div
                              key={stg._id || sIdx}
                              className="flex items-center justify-between text-[11px] py-0.5"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${badgeInfo.color}`}
                                >
                                  {badgeInfo.label}
                                </span>
                                <span className="text-on-surface-variant">
                                  {stg.payDate}
                                </span>
                                {stg.description && (
                                  <span className="text-[10px] text-on-surface-variant italic truncate max-w-[140px]">
                                    "{stg.description}"
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-emerald-600">
                                ₹{Number(stg.amount || 0).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : orderPayments.length > 0 ? (
            /* Fallback to flat Recorded Payments List if no renewalHistory yet */
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
                RECORDED PAYMENTS ({orderPayments.length})
              </span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                {orderPayments.map((p, idx) => {
                  const badgeInfo = getPaymentBadgeInfo(p, idx);
                  return (
                    <div
                      key={p._id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border bg-surface-container-low border-outline-variant/30"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${badgeInfo.color}`}
                        >
                          {badgeInfo.label}
                        </span>
                        <span className="text-xs font-semibold text-on-surface shrink-0">
                          {p.date}
                        </span>
                        {p.description && (
                          <span className="text-[11px] text-on-surface-variant italic truncate max-w-[150px]">
                            "{p.description}"
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-emerald-600 shrink-0">
                        ₹{(Number(p.amount) || 0).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer matching PaymentMenagement */}
        <div className="p-md md:p-lg border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-sm shrink-0">
          <div className="text-xs text-on-surface-variant font-bold">
            Payable:{" "}
            <span className="text-primary font-black text-sm">
              ₹{formattedPayAmount || "0"}
            </span>
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

export default RenewalPopUp;
