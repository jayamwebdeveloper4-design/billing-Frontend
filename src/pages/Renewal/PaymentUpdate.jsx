import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { getCustomerById } from "../../api/customerApi";
import { getGstSettings } from "../../api/gstSettingsApi";

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
  const stageNum = p.stageNumber || (idx + 1);
  const name = stageNum === 1 ? "ADVANCE" : getOrdinalName(stageNum).toUpperCase();
  return {
    label: name,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };
};

// Keep maximum 2 decimal places WITHOUT rounding up
const truncateTo2 = (value) => {
  const num = Number(value) || 0;
  return Math.trunc((num + Number.EPSILON) * 100) / 100;
};

// Display exactly 2 decimal places
const formatAmount2 = (value) => {
  return truncateTo2(value).toFixed(2);
};

const calculateRenewalDates = (r) => {
  if (!r) return { startDate: "", endDate: "" };
  const endRaw = r.endDateDot || r.endDate || "";

  const parseDateParts = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const cleanStr = dateStr.trim();
    let day, month, year;
    let separator = ".";

    if (cleanStr.includes(".")) {
      separator = ".";
      const parts = cleanStr.split(".");
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
    } else if (cleanStr.includes("-")) {
      separator = "-";
      const parts = cleanStr.split("-");
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
    } else if (cleanStr.includes("/")) {
      separator = "/";
      const parts = cleanStr.split("/");
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
      endDate: endRaw,
    };
  }

  const pad = (n) => String(n).padStart(2, "0");
  const sep = endParts.separator || ".";
  const isDDMM =
    endRaw.includes(".") ||
    (endRaw.split("-")[0] && endRaw.split("-")[0].length <= 2);

  let renewalStartFormatted = "";
  let renewalEndFormatted = "";
  const isMonthly = r.billingCycle === "monthly";
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
    endDate: renewalEndFormatted,
  };
};

export const PaymentUpdate = ({
  reminder,
  reminders = [],
  onClose,
  onSave,
}) => {
  if (!reminder) return null;

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

  const targetOrderId =
    reminder.orderId ||
    (reminder.id
      ? String(reminder.id).includes("-")
        ? String(reminder.id).split("-")[1]
        : String(reminder.id)
      : reminder._id);

  const selectedOrderIds = useMemo(
    () => (targetOrderId ? [String(targetOrderId)] : []),
    [targetOrderId]
  );

  // Financial calculations
  const orderPayments = useMemo(() => reminder.payments || [], [reminder.payments]);
  const totalPaid = useMemo(
    () => orderPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [orderPayments]
  );

  const unitRenewalPrice = useMemo(() => {
    const val =
      reminder.sellerPriceRenewal !== null &&
      reminder.sellerPriceRenewal !== undefined
        ? reminder.sellerPriceRenewal
        : reminder.price || reminder.totalPrice || 0;
    return Number(val) || 0;
  }, [reminder]);

  const [years, setYears] = useState("1");

  const totalOrderPrice = useMemo(() => {
    return unitRenewalPrice * Number(years);
  }, [unitRenewalPrice, years]);

  const balanceDue = useMemo(
    () => Math.max(0, totalOrderPrice - totalPaid),
    [totalOrderPrice, totalPaid]
  );

  const isPaidZero = totalPaid === 0;
  const isFullyPaid = balanceDue === 0 && totalPaid > 0;

  // Next payment ordinal calculation
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

  // Form states matching PaymentMenagement.jsx
  const [paymentOption, setPaymentOption] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(currentDate);
  const [description, setDescription] = useState("");
  const [withGst, setWithGst] = useState(false);
  const [gstin, setGstin] = useState("");
  const [gstinInput, setGstinInput] = useState("");
  const [isGstConfirmed, setIsGstConfirmed] = useState(false);
  const [state, setState] = useState("Tamil Nadu");
  const [gstRates, setGstRates] = useState({ cgst: 9, sgst: 9, igst: 18 });
  const [applyTds, setApplyTds] = useState(false);
  const [tdsAmount, setTdsAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState(null);

  const resolveCustomerState = (st, g) => {
    if (st) {
      const s = String(st).trim().toLowerCase();
      if (s === "tamil nadu" || s === "tamilnadu" || s === "tn")
        return "Tamil Nadu";
      return "Other State";
    }
    const cleanGst = String(g || "").trim();
    if (cleanGst.startsWith("33")) return "Tamil Nadu";
    if (cleanGst.length >= 2) return "Other State";
    return "Tamil Nadu";
  };

  // Fetch customer & GST details
  useEffect(() => {
    if (reminder?.customerId) {
      getCustomerById(reminder.customerId)
        .then((cust) => {
          if (cust) {
            const custGstin = (cust.gstin || cust.gstNumber || "").trim();
            if (custGstin) {
              setGstin(custGstin);
              setGstinInput(custGstin);
              setIsGstConfirmed(true);
              setWithGst(true);
            } else {
              setGstin("");
              setGstinInput("");
              setIsGstConfirmed(false);
              setWithGst(false);
            }
            setState(resolveCustomerState(cust.state, custGstin));
          }
        })
        .catch((err) =>
          console.warn("Could not fetch customer details:", err)
        );
    }
  }, [reminder?.customerId]);

  // Fetch GST settings
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const gstData = await getGstSettings();
        if (gstData) {
          setGstRates({
            cgst: gstData.cgstPercentage || 9,
            sgst: gstData.sgstPercentage || 9,
            igst: gstData.igstPercentage || 18,
          });
        }
      } catch (err) {
        console.error("Failed to load GST settings", err);
      }
    };
    fetchRates();
  }, []);

  // Renewal Dates
  const initialRenewalDates = useMemo(() => {
    if (reminder) {
      const dates = calculateRenewalDates(reminder);
      const toISO = (dStr) => {
        if (!dStr) return "";
        const clean = dStr.trim();
        if (clean.includes("-") && clean.split("-")[0].length === 4)
          return clean;
        let day, month, year;
        if (clean.includes(".")) {
          const p = clean.split(".");
          if (p.length === 3) {
            if (p[0].length === 4) {
              year = p[0];
              month = p[1];
              day = p[2];
            } else {
              day = p[0];
              month = p[1];
              year = p[2];
            }
          }
        } else if (clean.includes("-")) {
          const p = clean.split("-");
          if (p.length === 3) {
            if (p[0].length === 4) {
              year = p[0];
              month = p[1];
              day = p[2];
            } else {
              day = p[0];
              month = p[1];
              year = p[2];
            }
          }
        } else if (clean.includes("/")) {
          const p = clean.split("/");
          if (p.length === 3) {
            if (p[0].length === 4) {
              year = p[0];
              month = p[1];
              day = p[2];
            } else {
              day = p[0];
              month = p[1];
              year = p[2];
            }
          }
        }
        if (year && month && day) {
          return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
        return clean;
      };
      return {
        startDate: toISO(dates.startDate),
        endDate: toISO(dates.endDate),
      };
    }
    return { startDate: new Date().toISOString().slice(0, 10), endDate: "" };
  }, [reminder]);

  const [startDate, setStartDate] = useState(initialRenewalDates.startDate);
  const [endDate, setEndDate] = useState("");

  // Sync initial renewal start date when reminder changes
  useEffect(() => {
    if (initialRenewalDates.startDate) {
      setStartDate(initialRenewalDates.startDate);
    }
  }, [initialRenewalDates.startDate]);

  // Recalculate end date on startDate or years change
  useEffect(() => {
    if (startDate) {
      const parts = startDate.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        const y = parseInt(parts[0], 10) + Number(years);
        setEndDate(`${y}-${parts[1]}-${parts[2]}`);
      } else {
        const date = new Date(startDate);
        if (!isNaN(date.getTime())) {
          date.setFullYear(date.getFullYear() + Number(years));
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const d = String(date.getDate()).padStart(2, "0");
          setEndDate(`${y}-${m}-${d}`);
        }
      }
    }
  }, [startDate, years]);

  const handleAddGstin = () => {
    const trimmed = (gstinInput || "").trim();
    if (!trimmed) {
      toast.error("Please enter a valid GST number.");
      return;
    }
    setGstin(trimmed);
    setIsGstConfirmed(true);
  };

  const handleEditGstin = () => {
    setGstinInput(gstin);
    setIsGstConfirmed(false);
  };

  const isInterState = state.toLowerCase().trim() !== "tamil nadu";
  const igstRateVal = Number(gstRates.igst || 18);
  const cgstRateVal = Number(gstRates.cgst || 9);
  const sgstRateVal = Number(gstRates.sgst || 9);
  const totalGstRate = isInterState ? igstRateVal : cgstRateVal + sgstRateVal;

  const orderTaxValue = totalOrderPrice * (totalGstRate / 100);
  const balanceTaxValue = balanceDue * (totalGstRate / 100);

  // Handle option switch matching PaymentMenagement.jsx
  const handleOptionChange = (newOpt) => {
    setPaymentOption(newOpt);
    const domain = reminder.domainUrl || reminder.productName || "service";

    if (newOpt === "full") {
      const fullVal = withGst ? totalOrderPrice + orderTaxValue : totalOrderPrice;
      setAmount(fullVal > 0 ? String(Math.round(fullVal)) : "");
      setDescription(`Full payment for ${domain}`);
    } else if (newOpt === "final") {
      const finalVal = withGst ? balanceDue + balanceTaxValue : balanceDue;
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

  const handleDurationChange = (val) => {
    setYears(val);
    const numYears = Number(val) || 1;
    const newTotal = unitRenewalPrice * numYears;
    if (paymentOption === "full") {
      const newTax = newTotal * (totalGstRate / 100);
      setAmount(withGst ? String(Math.round(newTotal + newTax)) : String(newTotal));
    }
  };

  // Base and GST calculations
  const parsedAmount = Math.max(0, Number(amount) || 0);
  const baseAmount = withGst
    ? totalGstRate > 0
      ? parsedAmount / (1 + totalGstRate / 100)
      : parsedAmount
    : parsedAmount;
  const taxValue = withGst ? parsedAmount - baseAmount : 0;

  const tds = applyTds ? Number(tdsAmount) || 0 : 0;
  const netAmount = Math.max(0, parsedAmount - tds);

  const displayPayAmount = parsedAmount;
  const formattedPayAmount = displayPayAmount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const actionButtonText = isPaidZero
    ? `Pay${displayPayAmount > 0 ? ` (₹${formattedPayAmount})` : ""}`
    : `Update${displayPayAmount > 0 ? ` (₹${formattedPayAmount})` : ""}`;

  // Status badge
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isFullyPaid) return;
    if (!paymentOption) {
      toast.error("Please select a payment option.");
      return;
    }
    if (!amount || parsedAmount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    let activeGstin = gstin.trim();
    if (withGst) {
      if (!isGstConfirmed && gstinInput.trim()) {
        activeGstin = gstinInput.trim();
        setGstin(activeGstin);
        setIsGstConfirmed(true);
      } else if (!isGstConfirmed || !activeGstin) {
        toast.error("Please enter and add a valid GST number to proceed with GST.");
        return;
      }
    }

    if (applyTds) {
      if (!tds || tds <= 0) {
        toast.error("Please enter a valid TDS amount.");
        return;
      }
      if (tds > parsedAmount) {
        toast.error("TDS amount cannot exceed payment amount.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave({
        selectedOrderIds,
        amount: Number(baseAmount.toFixed(2)),
        paymentDate: paymentDate || currentDate,
        years: Number(years),
        startDate,
        endDate,
        withGst: Boolean(withGst),
        state,
        gstin: withGst ? activeGstin : "",
        gstvalue: withGst ? Number(taxValue.toFixed(2)) : 0,
        applyTds,
        tdsAmount: applyTds ? tds : 0,
        paymentStage: paymentOption,
        stageNumber:
          paymentOption === "mid"
            ? nextPaymentNum
            : paymentOption === "advance"
            ? 1
            : undefined,
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      console.error("Payment save failed:", err);
      toast.error("Failed to save payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
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
                {reminder.customerName || "Customer"} •{" "}
                {reminder.domainUrl || reminder.productName || "Renewal Services"}
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
                {reminder.productName || "Services"}
              </span>
              {reminder.domainUrl && (
                <span className="text-[11px] text-primary font-bold">
                  {reminder.domainUrl}
                </span>
              )}
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadge.color}`}
            >
              {statusBadge.text}
            </span>
          </div>

          {/* When Fully Paid: Friendly message */}
          {isFullyPaid ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-emerald-600 text-[26px] shrink-0">
                check_circle
              </span>
              <div>
                <p className="text-xs font-black text-emerald-800">
                  All payments have been settled for this renewal!
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Renewal order price is fully paid. You can review past recorded payments below.
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
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm font-mono"
                  />
                </div>
              </div>

              {/* Renewal Duration & Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                    RENEWAL DURATION
                  </label>
                  <select
                    value={years}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm cursor-pointer"
                  >
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>

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
              </div>

              {/* Renewal Period Display */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                  RENEWAL PERIOD
                </label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onClick={(e) => {
                        try {
                          e.target.showPicker?.();
                        } catch (_) {}
                      }}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm cursor-pointer"
                    />
                  </div>
                  <span className="text-primary font-black text-sm px-1">➔</span>
                  <div className="w-full bg-surface-container-low/70 border border-outline-variant/60 rounded-xl px-md py-2.5 font-bold text-on-surface-variant text-sm flex items-center justify-between select-none">
                    <span>{formatDateDisplay(endDate)}</span>
                    <span className="text-[10px] uppercase font-black text-on-surface-variant/50 tracking-wider">
                      AUTO
                    </span>
                  </div>
                </div>
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
                        setAmount(
                          withGstFull > 0 ? String(Math.round(withGstFull)) : ""
                        );
                      } else if (paymentOption === "final") {
                        setAmount(
                          withGstFinal > 0 ? String(Math.round(withGstFinal)) : ""
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

              {/* If With GST is selected and GST number is NOT confirmed -> show Input GST Number + Add button */}
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
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2.5 font-bold font-mono text-on-surface focus:ring-2 focus:ring-primary outline-none text-xs uppercase"
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

              {/* TDS Deduction */}
              <div className="space-y-sm">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                    TDS DEDUCTION
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setApplyTds((prev) => {
                        const nextVal = !prev;
                        if (!nextVal) setTdsAmount("");
                        return nextVal;
                      })
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      applyTds ? "bg-primary" : "bg-surface-variant"
                    }`}
                    aria-label="Toggle TDS deduction"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        applyTds ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {applyTds && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                      TDS AMOUNT (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tdsAmount}
                      onChange={(e) => setTdsAmount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Enter TDS amount..."
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-primary text-on-surface font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Amount Summary Breakdown matching PaymentMenagement.jsx */}
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
                      <span>
                        GST ({isInterState ? `IGST ${igstRateVal}%` : `CGST+SGST ${totalGstRate}%`}):
                      </span>
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

                  {applyTds && tds > 0 && (
                    <>
                      <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant pt-1">
                        <span>Less: TDS Deducted:</span>
                        <span className="font-bold text-error">
                          -₹{tds.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black border-t border-primary/20 pt-1.5">
                        <span className="text-emerald-700">Net Receivable:</span>
                        <span className="text-emerald-600 font-black">
                          ₹{netAmount.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recorded Payments List (matching PaymentMenagement.jsx) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                RECORDED PAYMENTS ({orderPayments.length})
              </span>
            </div>

            {orderPayments.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-outline-variant/50 text-center text-xs text-on-surface-variant">
                No payments recorded yet for this renewal.
              </div>
            ) : (
              <div
                className={`space-y-1.5 overflow-y-auto custom-scrollbar ${
                  isFullyPaid ? "max-h-[300px]" : "max-h-[170px]"
                }`}
              >
                {orderPayments.map((p, idx) => {
                  const badgeInfo = getPaymentBadgeInfo(p, idx);
                  const isChecked = selectedPaymentIndex === idx;

                  return (
                    <div
                      key={p._id || idx}
                      onClick={() =>
                        setSelectedPaymentIndex(isChecked ? null : idx)
                      }
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-primary/5 border-primary shadow-xs"
                          : "bg-surface-container-low border-outline-variant/30 hover:border-outline-variant"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${badgeInfo.color}`}
                        >
                          {badgeInfo.label}
                        </span>
                        <span className="text-xs font-semibold text-on-surface shrink-0">
                          {formatDateDisplay(p.date)}
                        </span>
                        {p.description && (
                          <span className="text-[11px] text-on-surface-variant italic truncate max-w-[200px]">
                            "{p.description}"
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-emerald-600">
                          ₹{(Number(p.amount) || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (matching PaymentMenagement.jsx) */}
        <div className="p-md md:p-lg border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-end gap-sm shrink-0">
          {!isFullyPaid && (
            <button
              type="button"
              disabled={isSubmitting || !paymentOption || parsedAmount <= 0}
              onClick={handleSubmit}
              className="px-lg py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-md py-2.5 rounded-xl font-bold text-xs text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentUpdate;
