import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { getCustomerById, updateCustomer } from "../api/customerApi";
import { getTemplate } from "../api/templateApi";
import { getPaymentConfirmationSettings, sendPaymentConfirmationEmailApi } from "../api/paymentConfirmationApi";
import { getProducts } from "../api/productApi";
import { getNextInvoiceNumber, generateInvoicePdf, verifyInvoiceNumber } from "../api/invoiceApi";
import { getGstSettings } from "../api/gstSettingsApi";
import { emailInvoice } from "../api/customerApi";


const SearchableSelect = ({ name, value, options, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={dropdownRef}>
      <div
        className="w-full h-[38px] bg-surface-container-low border border-outline-variant rounded-lg px-md font-semibold text-sm outline-none cursor-pointer text-on-surface flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-on-surface" : "text-on-surface-variant"}>
          {value || placeholder}
        </span>
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
          {isOpen ? "arrow_drop_up" : "arrow_drop_down"}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface-container-lowest border border-primary/50 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-outline-variant/30 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
            <input
              type="text"
              className="w-full outline-none text-sm bg-transparent text-on-surface"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className="px-md py-2 text-sm hover:bg-surface-container-low cursor-pointer transition-colors text-on-surface"
                  onClick={() => {
                    onChange({ target: { name, value: opt } });
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="px-md py-4 text-sm text-center text-on-surface-variant italic">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CustomDatePicker = ({ value, onChange, disabled, align = "right" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date().toISOString().split("T")[0]);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime()) || d.getFullYear() < 1000 || d.getFullYear() > 9999) {
      return new Date();
    }
    return d;
  });
  const datepickerRef = React.useRef(null);

  const [inputText, setInputText] = useState("");

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1000 && d.getFullYear() <= 9999) {
        setTempDate(value);
        setViewDate(d);
      }
    }
  }, [value]);

  useEffect(() => {
    if (tempDate) {
      setInputText(formatDisplayDate(tempDate));
    }
  }, [tempDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datepickerRef.current && !datepickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "Select Date";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    if (year < 1000 || year > 9999) return "Select Date";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${year}`;
  };

  const parseUserTypedDate = (str) => {
    if (!str) return null;
    if (/\d{5,}/.test(str)) return null;

    let d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      if (year >= 1000 && year <= 9999) return d;
    }

    const parts = str.trim().split(/[\.\/\-,\s]+/);
    if (parts.length >= 3) {
      const nums = parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
      if (nums.length >= 3) {
        let [p1, p2, p3] = nums;
        if (p3 >= 1000 && p3 <= 9999 && p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
          d = new Date(p3, p2 - 1, p1);
          if (!isNaN(d.getTime())) return d;
        }
        if (p1 >= 1000 && p1 <= 9999 && p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
          d = new Date(p1, p2 - 1, p3);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    return null;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (/\d{5,}/.test(val)) return;

    setInputText(val);
    const parsed = parseUserTypedDate(val);
    if (parsed) {
      const year = parsed.getFullYear();
      if (year >= 1000 && year <= 9999) {
        const monthStr = String(parsed.getMonth() + 1).padStart(2, "0");
        const dayStr = String(parsed.getDate()).padStart(2, "0");
        const fullDateStr = `${year}-${monthStr}-${dayStr}`;
        setTempDate(fullDateStr);
        setViewDate(parsed);
        onChange(fullDateStr);
      }
    }
  };

  const rawYear = viewDate.getFullYear();
  const viewYear = isNaN(rawYear) || rawYear < 1000 || rawYear > 9999 ? new Date().getFullYear() : rawYear;
  const viewMonth = viewDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    const prevDate = new Date(viewYear, viewMonth - 1, 1);
    if (prevDate.getFullYear() >= 1000 && prevDate.getFullYear() <= 9999) {
      setViewDate(prevDate);
    }
  };

  const handleNextMonth = () => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    if (nextDate.getFullYear() >= 1000 && nextDate.getFullYear() <= 9999) {
      setViewDate(nextDate);
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setTempDate(todayStr);
    setViewDate(today);
    onChange(todayStr);
  };

  const handleSelectDay = (dayNum, isCurrentMonth, monthOffset = 0) => {
    const targetDate = new Date(viewYear, viewMonth + monthOffset, dayNum);
    const year = targetDate.getFullYear();
    if (year < 1000 || year > 9999) return;
    const yearStr = String(year);
    const monthStr = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(targetDate.getDate()).padStart(2, "0");
    const fullDateStr = `${yearStr}-${monthStr}-${dayStr}`;
    setTempDate(fullDateStr);
    onChange(fullDateStr);
  };

  const handleApply = () => {
    onChange(tempDate);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempDate(value || new Date().toISOString().split("T")[0]);
    setIsOpen(false);
  };

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const mondayFirstIndex = (firstDayIndex + 6) % 7;
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    for (let i = mondayFirstIndex - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          day: d,
          isCurrentMonth: false,
          monthOffset: 1
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={datepickerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[38px] bg-surface-container-low border border-outline-variant rounded-lg px-md font-semibold text-sm outline-none cursor-pointer text-on-surface flex justify-between items-center hover:border-primary transition-colors"
      >
        <span className="text-on-surface text-sm font-semibold">
          {formatDisplayDate(value || tempDate)}
        </span>
        <span className="material-symbols-outlined text-primary text-[18px]">
          calendar_today
        </span>
      </div>

      {isOpen && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} z-100 mt-1 w-[260px] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150 text-on-surface`}>
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <span className="font-bold text-xs md:text-sm text-on-surface">
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pb-2 border-b border-outline-variant/30">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="e.g. Aug 4, 2026"
              className="px-3 py-1 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-bold text-on-surface min-w-0 flex-1 text-center outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/40"
            />
            <button
              type="button"
              onClick={handleTodayClick}
              className="px-3 py-1 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer shrink-0"
            >
              Today
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-on-surface-variant/70 py-1.5">
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sat</div>
            <div>Su</div>
          </div>

          <div className="grid grid-cols-7 gap-1 place-items-center text-xs">
            {calendarCells.map((cell, idx) => {
              const cellDate = new Date(viewYear, viewMonth + cell.monthOffset, cell.day);
              const cellDateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;
              const isSelected = cellDateStr === tempDate;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.day, cell.isCurrentMonth, cell.monthOffset)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs transition-all cursor-pointer ${isSelected
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : cell.isCurrentMonth
                      ? "text-on-surface hover:bg-primary/10 hover:text-primary"
                      : "text-on-surface-variant/40 hover:bg-surface-variant"
                    }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Removed unused getFlatProductVariants helper

const findSelectedOption = (currentProd, vName, optVal) => {
  if (!currentProd || !currentProd.Varinet || !Array.isArray(currentProd.Varinet)) return null;
  const varNameLower = vName?.toLowerCase().trim();
  const optValLower = optVal?.toLowerCase().trim();

  return currentProd.Varinet.find(opt => {
    const nameLower = opt.name?.toLowerCase().trim();
    const valLower = (opt.value || opt.option)?.toLowerCase().trim();
    return nameLower === varNameLower && valLower === optValLower;
  });
};

const findSelectedVariant = (currentProd, vName) => {
  if (!currentProd || !currentProd.Varinet || !Array.isArray(currentProd.Varinet)) return null;
  const varNameLower = vName?.toLowerCase().trim();

  return currentProd.Varinet.find(opt => {
    return opt.name?.toLowerCase().trim() === varNameLower;
  });
};

const calculateYears = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;

  const diffTime = end.getTime() - start.getTime();
  if (diffTime <= 0) return 0;

  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const computedYears = diffDays / 365.25;

  const rounded = Math.round(computedYears);
  if (Math.abs(computedYears - rounded) < (3 / 365.25)) {
    return rounded;
  }

  return parseFloat(computedYears.toFixed(2));
};

const addYearsToDate = (startDate, years) => {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return d;

  const intYears = Math.floor(years);
  d.setFullYear(d.getFullYear() + intYears);

  const fracYears = years - intYears;
  if (fracYears > 0) {
    const days = Math.round(fracYears * 365.25);
    d.setDate(d.getDate() + days);
  }
  return d;
};

const subtractYearsFromDate = (endDate, years) => {
  const d = new Date(endDate);
  if (isNaN(d.getTime())) return d;

  const intYears = Math.floor(years);
  d.setFullYear(d.getFullYear() - intYears);

  const fracYears = years - intYears;
  if (fracYears > 0) {
    const days = Math.round(fracYears * 365.25);
    d.setDate(d.getDate() - days);
  }
  return d;
};

const formatDeactiveDate = (val) => {
  if (!val) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    if (year < 1000 || year > 9999) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${year}`;
  }
  return val;
};

const hasWwwPrefix = (url) => {
  if (!url) return false;
  const clean = url.trim().replace(/^https?:\/\//i, '').toLowerCase();
  return clean.startsWith('www.');
};

const findMatchingDomainSubCategory = (domainUrl, subCategories) => {
  if (!domainUrl || !subCategories || subCategories.length === 0) return null;
  const urlClean = domainUrl.toLowerCase().trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const parts = urlClean.split('.').slice(1);
  if (parts.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  subCategories.forEach(sc => {
    const scName = sc.name.toLowerCase().trim();
    for (let i = 0; i < parts.length; i++) {
      const ext = parts.slice(i).join('.');
      const dotExt = '.' + ext;
      if (scName === ext || scName === dotExt || scName.endsWith(dotExt) || scName.includes(dotExt)) {
        const score = ext.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = sc;
        }
      }
    }
  });

  return bestMatch;
};

const NewOrder = () => {
  const { customerId, orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentDate = new Date().toISOString().split("T")[0];
  const defaultEndDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  })();



  
  const validateAndFixYears = (yearsValue) => {
    let years = parseFloat(yearsValue) || 1;
    let adjusted = false;
    let message = "";

    if (years < 1) {
      years = 1;
      adjusted = true;
      message = "No. of Years must be at least 1. Adjusted to 1 year.";
    } else {
      const rounded = Math.round(years);
      if (years !== rounded) {
        years = rounded;
        adjusted = true;
        message = `No. of Years must be a round value. Adjusted to ${rounded} ${rounded === 1 ? "year" : "years"}.`;
      }
    }

    return { years, adjusted, message };
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allProducts, setAllProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [activeOrder, setActiveOrder] = useState({
    orderDate: currentDate,
    domainUrl: "",
    products: [],
    totalPrice: 0,
    paymentStatus: "Unpaid",
    payments: [],
  });

  const [isEditingOrder, setIsEditingOrder] = useState(false);

  // Total Calculations
  const [totalYears, setTotalYears] = useState(1);
  const [totalEmails, setTotalEmails] = useState(1);
  const [addMultipleServices, setAddMultipleServices] = useState(false);

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [tempProduct, setTempProduct] = useState({
    product: "",
    variant: "",
    option: "",
    price: 0,
    costPrice: 0,
    quantity: 1,
    customSellerPrice: "",
    customCostPrice: "",
    validationEnabled: false,
    startDate: currentDate,
    endDate: defaultEndDate,
    billingCycle: "yearly",
    Varinet: [],
    years: 1,
  });
  const [modalVariantRows, setModalVariantRows] = useState([]);
  const [editingProductIdx, setEditingProductIdx] = useState(null);


  // Add a helper function to calculate endDate:

const calculateEndDate = (startDateStr, cycle) => {
  const d = new Date(startDateStr || new Date());
  if (isNaN(d.getTime())) return startDateStr;
  if (cycle === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split("T")[0];
};


  // Additional option state
  const [showAdditionalOption, setShowAdditionalOption] = useState(false);
  const [additionalFeatureName, setAdditionalFeatureName] = useState("");
  const [additionalFeaturePrice, setAdditionalFeaturePrice] = useState("");

  // Packages/SubVariants modes
  const [selectedPackageName, setSelectedPackageName] = useState("");
  const [packageSellerPrice, setPackageSellerPrice] = useState("");
  const [packageCostPrice, setPackageCostPrice] = useState("");
  const [selectedPackageOptions, setSelectedPackageOptions] = useState([]);
  const [selectedSubVariants, setSelectedSubVariants] = useState({});

  // New Category -> SubCategory -> Plan state
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState("");
  const [selectedPlanName, setSelectedPlanName] = useState("");

  // Confirm Renewal Service State
  const [showRenewalConfirm, setShowRenewalConfirm] = useState(false);
  const [showRenewalDatePrompt, setShowRenewalDatePrompt] = useState(false);
  const [promptedForRenewal, setPromptedForRenewal] = useState(false);
  const modalContentRef = React.useRef(null);

  // Deactive Service Modal State
  const [deactiveModal, setDeactiveModal] = useState({
    isOpen: false,
    productIdx: null,
    deactive: true,
    deactiveYear: currentDate,
  });

  const openDeactiveModal = (idx) => {
    const prod = activeOrder.products[idx];
    setDeactiveModal({
      isOpen: true,
      productIdx: idx,
      deactive: prod?.deactive !== undefined ? prod.deactive : true,
      deactiveYear: prod?.deactiveYear || currentDate,
    });
  };

  const closeDeactiveModal = () => {
    setDeactiveModal({
      isOpen: false,
      productIdx: null,
      deactive: true,
      deactiveYear: currentDate,
    });
  };

  const handleSaveDeactive = () => {
    if (deactiveModal.productIdx === null) return;
    const targetIdx = deactiveModal.productIdx;

    setActiveOrder(prev => {
      const updatedProducts = prev.products.map((p, i) => {
        if (i === targetIdx) {
          return {
            ...p,
            deactive: deactiveModal.deactive,
            deactiveYear: deactiveModal.deactive ? (deactiveModal.deactiveYear || currentDate) : "",
          };
        }
        return p;
      });
      return {
        ...prev,
        products: updatedProducts,
      };
    });

    toast.success(
      deactiveModal.deactive
        ? "Service marked as Deactive"
        : "Service marked as Active"
    );
    closeDeactiveModal();
  };

  // GST Settings State
  const [gstRates, setGstRates] = useState({ cgst: 9, sgst: 9, igst: 18 });

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [savedOrderContext, setSavedOrderContext] = useState({ customer: null, order: null });
  const [paymentForm, setPaymentForm] = useState({
  amount: "",
  withGst: false,
  state: "",
  gstin: "",
  paymentDate: currentDate,
  description: "",
  applyTds: false,
  tdsAmount: "",
  paymentStage: "full",
});

  // Partial Payment Prompt Modal State
  const [partialPromptModal, setPartialPromptModal] = useState({
    isOpen: false,
    paidAmount: 0,
    nextInvoiceNo: "",
  });

  // Invoice Modal State
  const [invoiceModal, setInvoiceModal] = useState({
    isOpen: false,
    step: "actions", // "actions" | "share"
    customInvoiceNo: "",
    paymentStatus: "Paid",
    isSaving: false,
    pdfBlob: null,
    pdfUrl: null,
    filename: "",
  });

  // Add Payment Prompt State
  const [showAddPaymentPrompt, setShowAddPaymentPrompt] = useState(false);

  const selectedProduct = useMemo(() => {
    return allProducts.find(p => p.name === tempProduct.product);
  }, [allProducts, tempProduct.product]);

  const currentSubCat = useMemo(() => {
    if (!selectedProduct || !selectedProduct.subCategories || selectedProduct.subCategories.length === 0) return null;
    return selectedProduct.subCategories.find(sc => sc.name === selectedSubCategoryName) || selectedProduct.subCategories[0];
  }, [selectedProduct, selectedSubCategoryName]);

  const currentPlan = useMemo(() => {
    if (!currentSubCat || !currentSubCat.hasPlan || !currentSubCat.plans || currentSubCat.plans.length === 0) return null;
    return currentSubCat.plans.find(p => p.name === selectedPlanName) || currentSubCat.plans[0];
  }, [currentSubCat, selectedPlanName]);

  const currentSubCatHasRenewal = useMemo(() => {
    if (!currentSubCat) return true;
    if (currentSubCat.oneTimePayment) return false;
    if (currentSubCat.hasPlan && currentPlan) {
      return currentSubCat.hasRenewal !== false && currentPlan.hasRenewal !== false;
    }
    return currentSubCat.hasRenewal !== false;
  }, [currentSubCat, currentPlan]);

  const subtotal = useMemo(() => {
    return activeOrder.products.reduce((sum, p) => sum + (p.price || 0), 0);
  }, [activeOrder.products]);

  const isSubCategoryProduct = useMemo(() => {
    const product = allProducts.find(p => p.name === tempProduct.product);
    return product?.subCategory === true;
  }, [allProducts, tempProduct.product]);

  const activeVariantName = useMemo(() => {
    if (!isSubCategoryProduct) return "";
    const checkedRow = modalVariantRows.find(row => row.checked);
    if (checkedRow) return checkedRow.variantName;
    if (modalVariantRows.length > 0) return modalVariantRows[0].variantName;
    return "";
  }, [isSubCategoryProduct, modalVariantRows]);

  const groupedRows = useMemo(() => {
    const groups = {};
    modalVariantRows.forEach((row, idx) => {
      const vName = row.variantName || "Standard";
      if (!groups[vName]) {
        groups[vName] = [];
      }
      groups[vName].push({ ...row, originalIndex: idx });
    });
    return groups;
  }, [modalVariantRows]);

  const isDomainProduct = tempProduct.product?.toLowerCase() === "domain";

  const hasExtensionVariant = useMemo(() => {
    if (!selectedProduct) return false;
    const prodName = selectedProduct.name?.toLowerCase() || "";
    if (prodName.includes("extension") || prodName.includes("domain")) return true;
    if (selectedProduct.variants && Array.isArray(selectedProduct.variants)) {
      return selectedProduct.variants.some(v => v.name?.toLowerCase()?.includes("extension"));
    }
    return false;
  }, [selectedProduct]);

  const isThirdPartySelected = isDomainProduct && modalVariantRows.some(row =>
    row.checked && (
      row.optionValue?.toLowerCase().includes("3rd party") ||
      row.originalOptionValue?.toLowerCase().includes("3rd party")
    )
  );

  const hasYearVariantSelected = useMemo(() => {
    if (selectedProduct?.packageEnabled) {
      return selectedPackageName?.toLowerCase().includes("year") ||
        selectedProduct?.name?.toLowerCase().includes("year") ||
        selectedPackageOptions.some(opt => opt.name?.toLowerCase().includes("year"));
    }
    if (selectedProduct?.subVariantsEnabled) {
      return Object.values(selectedSubVariants).some(sel =>
        sel.optionName?.toLowerCase().includes("year") ||
        sel.subVariantName?.toLowerCase().includes("year")
      );
    }
    return !isThirdPartySelected && modalVariantRows.some((row) => {
      return row.checked &&
        (
          row.variantName?.toLowerCase().includes("year") ||
          row.optionValue?.toLowerCase().includes("year") ||
          (row.subCategory && row.optionName?.toLowerCase().includes("year"))
        );
    });
  }, [selectedProduct, selectedPackageName, selectedSubVariants, modalVariantRows, isThirdPartySelected]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customerData, productsData, gstData] = await Promise.all([
        getCustomerById(customerId),
        getProducts(),
        getGstSettings().catch(() => null),
      ]);
      setSelectedCustomer(customerData);
      setAllProducts(productsData);
      if (gstData) {
        setGstRates({
          cgst: gstData.cgstPercentage || 9,
          sgst: gstData.sgstPercentage || 9,
          igst: gstData.igstPercentage || 18,
        });
      }
      if (orderId && customerData?.orders && Array.isArray(customerData.orders)) {
        const found = customerData.orders.find(o => (o._id && (o._id === orderId || o._id.toString() === orderId)));
        if (found) {
          setActiveOrder(found);
          setIsEditingOrder(true);
        }
      } else {
        setIsProductModalOpen(true);
      }
    } catch (error) {
      toast.error("Failed to load catalog data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateDomainProductInOrder = (url, productsList) => {
    return productsList.map(p => {
      if (p.product?.toLowerCase() !== "domain") return p;

      const productDef = allProducts.find(prod => prod.name?.toLowerCase() === "domain");
      if (!productDef) return p;

      const parts = p.variant.split("          ");
      let currentJayamVal = "";
      let currentExtensionVal = "";
      parts.forEach(part => {
        if (part.includes(":")) {
          const name = part.split(":")[0].trim().toLowerCase();
          const val = part.split(":")[1].trim();
          if (name.includes("jayam") || name.includes("3rd party")) {
            currentJayamVal = val;
          } else if (name.includes("extension") || name.includes("domain")) {
            currentExtensionVal = val;
          }
        }
      });

      const dbVariants = productDef.variants || productDef.varient || productDef.varients || [];
      let newSellerPrice = 0;
      let newCostPrice = 0;
      const newVariantParts = [];

      dbVariants.forEach(v => {
        const isExtensionGroup = v.name?.toLowerCase()?.includes("extension") || v.name?.toLowerCase()?.includes("domain");
        const isJayamGroup = v.name?.toLowerCase()?.includes("jayam") || v.name?.toLowerCase()?.includes("3rd party");

        if (isExtensionGroup) {
          const urlLower = url.toLowerCase().trim();
          const matchedSuffix = v.options?.map(o => o.value?.toLowerCase()?.trim())
            .filter(ext => ext && urlLower.endsWith(ext))
            .reduce((longest, curr) => curr.length > longest.length ? curr : longest, "");

          let selectedOpt = null;
          if (matchedSuffix) {
            selectedOpt = v.options?.find(o => o.value?.toLowerCase()?.trim() === matchedSuffix);
          }
          if (!selectedOpt && currentExtensionVal) {
            selectedOpt = v.options?.find(o => o.value?.toLowerCase()?.trim() === currentExtensionVal.toLowerCase().trim());
          }
          if (!selectedOpt) {
            selectedOpt = v.options?.[0];
          }

          if (selectedOpt) {
            newSellerPrice += parseFloat(selectedOpt.sellerPrice) || 0;
            newCostPrice += parseFloat(selectedOpt.costPrice) || 0;
            newVariantParts.push(`${v.name}: ${selectedOpt.value || ""}`);
          }
        } else if (isJayamGroup) {
          let selectedOpt = v.options?.[0];
          if (currentJayamVal) {
            selectedOpt = v.options?.find(o => (o.value || o.option)?.toLowerCase()?.trim() === currentJayamVal.toLowerCase()) || selectedOpt;
          }
          if (selectedOpt) {
            if (v.priceEnable) {
              newSellerPrice += parseFloat(selectedOpt.sellerPrice) || 0;
              newCostPrice += parseFloat(selectedOpt.costPrice) || 0;
            }
            newVariantParts.push(`${v.name}: ${selectedOpt.value || selectedOpt.option || ""}`);
          }
        } else {
          const matchingPart = parts.find(part => part.startsWith(`${v.name}:`));
          let prevVal = matchingPart ? matchingPart.split(":")[1].trim() : "";

          let selectedOpt = v.options?.[0];
          if (prevVal) {
            selectedOpt = v.options?.find(o => (o.value || o.option)?.toLowerCase()?.trim() === prevVal.toLowerCase()) || selectedOpt;
          }
          if (selectedOpt) {
            if (v.priceEnable) {
              newSellerPrice += parseFloat(selectedOpt.sellerPrice) || 0;
              newCostPrice += parseFloat(selectedOpt.costPrice) || 0;
            }
            newVariantParts.push(`${v.name}: ${selectedOpt.value || selectedOpt.option || ""}`);
          }
        }
      });

      // Preserve any part from original p.variant that is not in dbVariants
      const dbVariantNames = dbVariants.map(v => v.name?.toLowerCase().trim());
      parts.forEach(part => {
        if (part.includes(": ") && !part.startsWith("Package:")) {
          const idx = part.indexOf(": ");
          const name = part.substring(0, idx).trim();
          if (!dbVariantNames.includes(name.toLowerCase().trim())) {
            newVariantParts.push(part);
          }
        }
      });

      const qty = p.quantity || 1;

      return {
        ...p,
        variant: newVariantParts.join("          "),
        price: newSellerPrice * qty,
        costPrice: newCostPrice * qty,
      };
    });
  };

  const handleDomainUrlChange = (newUrl) => {
    const cleanUrl = (newUrl || "").replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    const updatedProducts = updateDomainProductInOrder(cleanUrl, activeOrder.products);
    const newTotalPrice = updatedProducts.reduce((sum, p) => sum + p.price, 0);
    setActiveOrder(prev => ({
      ...prev,
      domainUrl: cleanUrl,
      products: updatedProducts,
      totalPrice: newTotalPrice
    }));
  };

  const buildVariantRows = (prodName, selVarName = null, selOptVal = null, currentProd = null) => {
    const product = allProducts.find(p => p.name === prodName);
    if (!product) return [];

    const dbVariants = product.variants || product.varient || product.varients || [];
    const rows = [];

    dbVariants.forEach(v => {
      const isSubCategory = product.subCategory === true;
      const isPriceEnabled = isSubCategory
        ? true
        : v.priceEnable !== undefined
          ? v.priceEnable
          : v.price !== false;

      if (Array.isArray(v.options)) {
        v.options.forEach((opt, optIdx) => {
          let sellerPrice = 0;
          let costPrice = 0;
          if (isSubCategory) {
            sellerPrice = v.sellerPrice !== undefined && v.sellerPrice !== null ? parseFloat(v.sellerPrice) : (parseFloat(opt.sellerPrice) || 0);
            costPrice = v.costPrice !== undefined && v.costPrice !== null ? parseFloat(v.costPrice) : (parseFloat(opt.costPrice) || 0);
          } else {
            sellerPrice = isPriceEnabled ? (parseFloat(opt.sellerPrice) || 0) : 0;
            costPrice = isPriceEnabled ? (parseFloat(opt.costPrice) || 0) : 0;
          }
          let optionValue = opt.value || "";
          let optionName = opt.option || "";
          let checked = false;

          if (isSubCategory) {
            if (currentProd) {
              const storedVariantName = currentProd.Varinet?.[0]?.name;
              checked = v.name === storedVariantName;
              if (checked && Array.isArray(currentProd.Varinet)) {
                const matchedOpts = currentProd.Varinet.filter(o => o.name === v.name);
                const matchedOpt = matchedOpts[optIdx];
                if (matchedOpt) {
                  const isEmailHosting = currentProd.product?.toLowerCase() === "email hosting";
                  const savedEmailOpt = isEmailHosting ? currentProd.Varinet?.find(
                    o => o.name === v.name && o.option?.toLowerCase().includes("email")
                  ) : null;
                  const emailMultVal = savedEmailOpt ? (parseInt(savedEmailOpt.value) || 1) : 1;
                  sellerPrice = (parseFloat(matchedOpt.sellerPrice) || 0) / emailMultVal;
                  costPrice = (parseFloat(matchedOpt.costPrice) || 0) / emailMultVal;
                  optionValue = matchedOpt.value || optionValue;
                  optionName = matchedOpt.option || optionName;
                }
              }
            } else {
              if (selVarName) {
                checked = v.name === selVarName;
              } else {
                checked = dbVariants.length > 0 && v.name === dbVariants[0].name;
              }
            }
          } else {
            if (currentProd) {
              const hasAnySelected = findSelectedVariant(currentProd, v.name);
              if (hasAnySelected) {
                const selectedOpt = findSelectedOption(currentProd, v.name, opt.value);
                if (selectedOpt) {
                  checked = true;
                  sellerPrice = (parseFloat(selectedOpt.sellerPrice) || 0);
                  costPrice = (parseFloat(selectedOpt.costPrice) || 0);
                  optionValue = selectedOpt.value || selectedOpt.option || optionValue;
                  optionName = selectedOpt.option || optionName;
                } else if (!isPriceEnabled && optIdx === 0) {
                  checked = true;
                  sellerPrice = (parseFloat(hasAnySelected.sellerPrice) || 0);
                  costPrice = (parseFloat(hasAnySelected.costPrice) || 0);
                  optionValue = hasAnySelected.value || hasAnySelected.option || optionValue;
                  optionName = hasAnySelected.option || optionName;
                }
              } else {
                if (optIdx === 0) {
                  checked = true;
                }
              }
            } else {
              const isExtensionGroup = v.name?.toLowerCase()?.includes("extension") || v.name?.toLowerCase()?.includes("domain");
              if (isExtensionGroup && activeOrder.domainUrl) {
                const urlLower = activeOrder.domainUrl.toLowerCase().trim();
                const matchedSuffix = v.options?.map(o => o.value?.toLowerCase()?.trim())
                  .filter(ext => ext && urlLower.endsWith(ext))
                  .reduce((longest, curr) => curr.length > longest.length ? curr : longest, "");
                if (matchedSuffix) {
                  checked = opt.value?.toLowerCase()?.trim() === matchedSuffix;
                } else {
                  const isCurrent = selVarName === v.name && selOptVal === opt.value;
                  checked = isCurrent || (selVarName === null && optIdx === 0);
                }
              } else {
                const isCurrent = selVarName === v.name && selOptVal === opt.value;
                checked = isCurrent || (selVarName === null && optIdx === 0);
              }
            }
          }

          rows.push({
            checked,
            variantName: v.name || "",
            optionValue: optionValue,
            originalOptionValue: opt.value || "",
            priceEnabled: isPriceEnabled,
            sellerPrice: sellerPrice.toString(),
            costPrice: costPrice.toString(),
            baseSellerPrice: sellerPrice,
            baseCostPrice: costPrice,
            subCategory: isSubCategory,
            optionName: optionName,
            rawOption: [{
              name: v.name || "",
              value: optionValue,
              option: optionName,
              sellerPrice: sellerPrice,
              sellerEnable: opt.sellerEnable !== false,
              costPrice: costPrice,
              costEnable: opt.costEnable !== false,
              valueEnable: opt.valueEnable !== false
            }]
          });
        });
      } else if (Array.isArray(v.option)) {
        const name = v.option.map(o => o.value || 'Standard').join(' / ');
        let checked = false;

        let sellerPrice = v.option.reduce((sum, o) => sum + (o.sellerEnable && o.valueEnable !== false ? parseFloat(o.sellerPrice) || 0 : 0), 0);
        let costPrice = v.option.reduce((sum, o) => sum + (o.costEnable && o.valueEnable !== false ? parseFloat(o.costPrice) || 0 : 0), 0);

        if (currentProd) {
          const selectedOpt = findSelectedVariant(currentProd, v.name);
          if (selectedOpt) {
            checked = true;
            sellerPrice = (parseFloat(selectedOpt.sellerPrice) || 0);
            costPrice = (parseFloat(selectedOpt.costPrice) || 0);
          }
        } else {
          const isCurrent = selVarName === v.name && selOptVal === name;
          checked = isCurrent || (selVarName === null && dbVariants.length === 1);
        }

        rows.push({
          checked,
          variantName: v.name || "Variant",
          optionValue: name,
          originalOptionValue: name,
          priceEnabled: isPriceEnabled,
          sellerPrice: sellerPrice.toString(),
          costPrice: costPrice.toString(),
          baseSellerPrice: sellerPrice,
          baseCostPrice: costPrice,
          subCategory: isSubCategory,
          optionName: "",
          rawOption: v.option
        });
      } else {
        const name = v.option || 'Standard';
        let checked = false;

        let sellerPrice = parseFloat(v.sellerprice) || 0;
        let costPrice = parseFloat(v.costprice) || 0;

        if (currentProd) {
          const selectedOpt = findSelectedVariant(currentProd, v.name);
          if (selectedOpt) {
            checked = true;
            sellerPrice = (parseFloat(selectedOpt.sellerPrice) || 0);
            costPrice = (parseFloat(selectedOpt.costPrice) || 0);
          }
        } else {
          const isCurrent = selVarName === v.name && selOptVal === name;
          checked = isCurrent || (selVarName === null && dbVariants.length === 1);
        }

        rows.push({
          checked,
          variantName: v.name || "Variant",
          optionValue: name,
          originalOptionValue: name,
          priceEnabled: isPriceEnabled,
          sellerPrice: sellerPrice.toString(),
          costPrice: costPrice.toString(),
          baseSellerPrice: sellerPrice,
          baseCostPrice: costPrice,
          subCategory: isSubCategory,
          optionName: "",
          rawOption: [{
            option: name,
            sellerPrice,
            sellerEnable: v.sellerEnable !== false,
            costPrice,
            costEnable: v.costEnable !== false
          }]
        });
      }
    });

    if (rows.length === 0) {
      rows.push({
        checked: true,
        variantName: 'Standard',
        optionValue: 'Standard',
        originalOptionValue: 'Standard',
        priceEnabled: false,
        sellerPrice: "0",
        costPrice: "0",
        baseSellerPrice: 0,
        baseCostPrice: 0,
        subCategory: false,
        optionName: "",
        rawOption: []
      });
    }

    return rows;
  };

  const handleVariantDropdownChange = (variantName, targetOriginalIndex) => {
    setModalVariantRows(prev => prev.map((row, i) => {
      if (row.variantName === variantName) {
        return {
          ...row,
          checked: i === targetOriginalIndex
        };
      }
      return row;
    }));
  };

  const handleSubCategoryVariantChange = (selectedVName) => {
    setModalVariantRows(prev => prev.map(row => ({
      ...row,
      checked: row.variantName === selectedVName
    })));
  };

  const handleRowOptionValueChange = (idx, val) => {
    setModalVariantRows((prev) => {
      const updatedRows = prev.map((row, i) => {
        if (i === idx) {
          let finalVal = val;
          if (row.optionValue === "0" && finalVal.length > 1 && finalVal.startsWith("0")) {
            finalVal = finalVal.slice(1);
          }
          return {
            ...row,
            optionValue: finalVal,
            rawOption: row.rawOption.map((ro) => ({
              ...ro,
              value: finalVal,
              option: row.subCategory ? ro.option : finalVal,
            })),
          };
        }
        return row;
      });

      const totalYearsVariant = updatedRows.find(
        (row) => row.checked && (
          row.variantName?.toLowerCase() === "no. of years" ||
          (row.subCategory && row.optionName?.toLowerCase() === "no. of years")
        )
      );

      if (totalYearsVariant) {
        setTotalYears(totalYearsVariant.optionValue);
      }
      return updatedRows;
    });
  };

  const handleRowOptionNameChange = (idx, nameVal) => {
    setModalVariantRows((prev) => {
      return prev.map((row, i) => {
        if (i === idx) {
          return {
            ...row,
            optionName: nameVal,
            rawOption: row.rawOption.map((ro) => ({
              ...ro,
              option: nameVal,
            })),
          };
        }
        return row;
      });
    });
  };

  const handleRowSellerPriceChange = (idx, val) => {
    const targetRow = modalVariantRows[idx];
    const parsed = parseFloat(val) || 0;
    const isEmailHosting = tempProduct.product?.toLowerCase() === "email hosting";
    const emails = (targetRow.subCategory && isEmailHosting) ? (parseInt(totalEmails) || 1) : 1;
    const baseVal = parsed / emails;

    setModalVariantRows(prev => prev.map((row, i) => {
      if (targetRow.subCategory) {
        if (row.variantName === targetRow.variantName) {
          return {
            ...row,
            sellerPrice: val,
            baseSellerPrice: baseVal,
            rawOption: row.rawOption.map(ro => ({ ...ro, sellerPrice: parsed }))
          };
        }
        return row;
      } else {
        return i === idx ? {
          ...row,
          sellerPrice: val,
          baseSellerPrice: baseVal,
          rawOption: row.rawOption.map(ro => ({ ...ro, sellerPrice: parsed }))
        } : row;
      }
    }));
  };

  const handleRowCostPriceChange = (idx, val) => {
    const targetRow = modalVariantRows[idx];
    const parsed = parseFloat(val) || 0;
    const isEmailHosting = tempProduct.product?.toLowerCase() === "email hosting";
    const emails = (targetRow.subCategory && isEmailHosting) ? (parseInt(totalEmails) || 1) : 1;
    const baseVal = parsed / emails;

    setModalVariantRows(prev => prev.map((row, i) => {
      if (targetRow.subCategory) {
        if (row.variantName === targetRow.variantName) {
          return {
            ...row,
            costPrice: val,
            baseCostPrice: baseVal,
            rawOption: row.rawOption.map(ro => ({ ...ro, costPrice: parsed }))
          };
        }
        return row;
      } else {
        return i === idx ? {
          ...row,
          costPrice: val,
          baseCostPrice: baseVal,
          rawOption: row.rawOption.map(ro => ({ ...ro, costPrice: parsed }))
        } : row;
      }
    }));
  };

  const handlePackageOptionValueChange = (optIdx, newVal) => {
    setSelectedPackageOptions(prev => {
      const updated = prev.map((opt, idx) => {
        if (idx === optIdx) {
          return { ...opt, value: newVal };
        }
        return opt;
      });

      const targetOpt = updated[optIdx];

      if (targetOpt?.name?.toLowerCase().includes("year")) {
        const parsedYears = parseInt(newVal) || 1;
        const res = validateAndFixYears(parsedYears);
        if (res.adjusted) {
          toast.error(res.message, { id: "years-validation" });
        }
        setTotalYears(res.years);

        const start = tempProduct.startDate ? new Date(tempProduct.startDate) : new Date();
        if (!isNaN(start.getTime())) {
          const end = addYearsToDate(start, res.years);

          setTempProduct(prevProd => ({
            ...prevProd,
            years: res.years,
            endDate: end.toISOString().split("T")[0]
          }));
        } else {
          setTempProduct(prevProd => ({
            ...prevProd,
            years: res.years
          }));
        }
      }

      if (targetOpt?.name?.toLowerCase().includes("email")) {
        const parsedEmails = parseInt(newVal) || 1;
        setTotalEmails(parsedEmails);
      }

      return updated;
    });
  };

  const computedPrices = useMemo(() => {
    let baseSeller = 0;
    let baseCost = 0;

    if (selectedProduct) {
      if (selectedProduct.subCategories && selectedProduct.subCategories.length > 0) {
        if (tempProduct.customSellerPrice !== "") {
          baseSeller = parseFloat(tempProduct.customSellerPrice) || 0;
        } else if (currentPlan) {
          baseSeller = parseFloat(currentPlan.sellerPrice) || 0;
        } else if (currentSubCat) {
          baseSeller = parseFloat(currentSubCat.sellerPrice) || 0;
        }

        if (currentSubCat?.oneTimePayment) {
          baseCost = 0;
        } else if (tempProduct.customCostPrice !== "") {
          baseCost = parseFloat(tempProduct.customCostPrice) || 0;
        } else if (currentPlan) {
          baseCost = parseFloat(currentPlan.costPrice) || 0;
        } else if (currentSubCat) {
          baseCost = parseFloat(currentSubCat.costPrice) || 0;
        }
      } else if (selectedProduct.packageEnabled) {
        baseSeller = parseFloat(packageSellerPrice) || 0;
        baseCost = parseFloat(packageCostPrice) || 0;
      } else if (selectedProduct.subVariantsEnabled) {
        Object.entries(selectedSubVariants).forEach(([varName, sel]) => {
          if (sel.priceEnable) {
            baseSeller += parseFloat(sel.sellerPrice) || 0;
            baseCost += parseFloat(sel.costPrice) || 0;
          }
        });
      } else {
        const checkedRows = modalVariantRows.filter((r) => {
          if (!r.checked) return false;
          if (isThirdPartySelected) {
            return r.variantName?.toLowerCase().includes("jayam") || r.variantName?.toLowerCase().includes("3rd party");
          }
          return true;
        });

        if (isSubCategoryProduct) {
          const firstChecked = checkedRows[0];
          baseSeller = parseFloat(firstChecked?.baseSellerPrice) || 0;
          baseCost = parseFloat(firstChecked?.baseCostPrice) || 0;
        } else {
          baseSeller = checkedRows.reduce((sum, r) => sum + (parseFloat(r.baseSellerPrice) || 0), 0);
          baseCost = checkedRows.reduce((sum, r) => sum + (parseFloat(r.baseCostPrice) || 0), 0);
        }
      }
    }

    const qty = parseInt(tempProduct.quantity) || 1;
    const isEmailHosting = tempProduct.product?.toLowerCase() === "email hosting";
    const emails = isEmailHosting ? (parseInt(totalEmails) || 1) : 1;

    let additionalSeller = 0;
    if (showAdditionalOption) {
      additionalSeller = (parseFloat(additionalFeaturePrice) || 0) * qty * emails;
    }

    const finalSeller = (baseSeller * qty * emails * totalYears) + additionalSeller;
    const finalCost = baseCost * qty * emails;

    return {
      baseSeller,
      baseCost,
      finalSeller,
      finalCost
    };
  }, [
    selectedProduct,
    currentSubCat,
    currentPlan,
    selectedSubCategoryName,
    selectedPlanName,
    tempProduct.customSellerPrice,
    tempProduct.customCostPrice,
    packageSellerPrice,
    packageCostPrice,
    selectedSubVariants,
    selectedPackageName,
    modalVariantRows,
    isThirdPartySelected,
    isSubCategoryProduct,
    totalEmails,
    tempProduct.years,
    tempProduct.validationEnabled,
    tempProduct.quantity,
    showAdditionalOption,
    additionalFeaturePrice
  ]);


  // Sync totalYears from modalVariantRows options
  useEffect(() => {
    if (selectedProduct?.packageEnabled || selectedProduct?.subVariantsEnabled) {
      return;
    }
    if (isThirdPartySelected) {
      setTotalYears(1);
      return;
    }
    if (tempProduct.validationEnabled) {
      return;
    }
    const totalYearsVariant = modalVariantRows.find(
      (row) => row.checked && (
        row.variantName?.toLowerCase() === "no. of years" ||
        (row.subCategory && row.optionName?.toLowerCase() === "no. of years")
      )
    );
    if (totalYearsVariant) {
      const parsedVal = parseFloat(totalYearsVariant.optionValue) || 1;
      setTotalYears(parsedVal);
    } else {
      setTotalYears(1);
    }
  }, [modalVariantRows, isThirdPartySelected, selectedProduct, tempProduct.validationEnabled]);

  // Sync totalEmails from modalVariantRows options
  useEffect(() => {
    if (selectedProduct?.packageEnabled || selectedProduct?.subVariantsEnabled) {
      return;
    }
    if (tempProduct.product?.toLowerCase() !== "email hosting") {
      setTotalEmails(1);
      return;
    }
    const emailRow = modalVariantRows.find(
      (row) => row.checked && (
        row.optionName?.toLowerCase().includes("email")
      )
    );
    if (emailRow) {
      const parsedVal = parseInt(emailRow.optionValue) || 1;
      setTotalEmails(parsedVal);
    } else {
      setTotalEmails(1);
    }
  }, [modalVariantRows, tempProduct.product, selectedProduct]);

  // Automatically enable date validation if a year variant/package is selected
  // useEffect(() => {
  //   if (hasYearVariantSelected) {
  //     setTempProduct(prev => {
  //       if (prev.validationEnabled) return prev;
  //       return {
  //         ...prev,
  //         validationEnabled: true
  //       };
  //     });
  //   }
  // }, [hasYearVariantSelected]);

  // Automatically calculate End Date and Years based on totalYears
  useEffect(() => {
    const years = parseFloat(totalYears) || 1;
    const start = tempProduct.startDate ? new Date(tempProduct.startDate) : new Date();
    if (!isNaN(start.getTime())) {
      const end = addYearsToDate(start, years);

      setTempProduct((prev) => {
        const newEndDate = end.toISOString().split("T")[0];
        if (prev.years === years && prev.endDate === newEndDate) {
          return prev;
        }
        return {
          ...prev,
          years,
          endDate: newEndDate,
        };
      });
    }
  }, [totalYears, tempProduct.startDate]);

  // scale prices
  useEffect(() => {
    const emails = parseInt(totalEmails) || 1;
    setModalVariantRows(prev => prev.map(row => {
      const baseSeller = parseFloat(row.baseSellerPrice) || 0;
      const baseCost = parseFloat(row.baseCostPrice) || 0;
      return {
        ...row,
        sellerPrice: (baseSeller * emails).toString(),
        costPrice: (baseCost * emails).toString(),
      };
    }));
  }, [totalEmails]);

  // Automatically enable addMultipleServices if products length > 1
  useEffect(() => {
    if (activeOrder.products.length > 1) {
      setAddMultipleServices(true);
    }
  }, [activeOrder.products.length]);

  // Disable validationEnabled if selected subcategory/plan has no renewal pricing
  useEffect(() => {
    if (!currentSubCatHasRenewal) {
      setTempProduct(prev => {
        if (!prev.validationEnabled) return prev;
        return {
          ...prev,
          validationEnabled: false
        };
      });
    }
  }, [currentSubCatHasRenewal]);

  // Automatically select matching extension suffix in modalVariantRows when domainUrl changes
  useEffect(() => {
    if (isProductModalOpen && tempProduct.product?.toLowerCase() === "domain" && activeOrder.domainUrl) {
      const urlLower = activeOrder.domainUrl.toLowerCase().trim();
      setModalVariantRows(prev => prev.map(row => {
        const isExtensionGroup = row.variantName?.toLowerCase()?.includes("extension") || row.variantName?.toLowerCase()?.includes("domain");
        if (isExtensionGroup) {
          const siblingRows = prev.filter(r => r.variantName === row.variantName);
          const matchedSuffix = siblingRows
            .map(r => r.originalOptionValue?.toLowerCase()?.trim())
            .filter(ext => ext && urlLower.endsWith(ext))
            .reduce((longest, curr) => curr.length > longest.length ? curr : longest, "");

          if (matchedSuffix) {
            return {
              ...row,
              checked: row.originalOptionValue?.toLowerCase()?.trim() === matchedSuffix
            };
          }
        }
        return row;
      }));
    }
  }, [activeOrder.domainUrl, isProductModalOpen, tempProduct.product]);

  // Automatically select matching Sub-Category for Domain service based on Domain URL extension
  useEffect(() => {
    if (tempProduct.product?.toLowerCase() === "domain" && activeOrder.domainUrl && selectedProduct?.subCategories?.length > 0) {
      const matchedSc = findMatchingDomainSubCategory(activeOrder.domainUrl, selectedProduct.subCategories);
      if (matchedSc && matchedSc.name !== selectedSubCategoryName) {
        setSelectedSubCategoryName(matchedSc.name);
        if (matchedSc.hasPlan && matchedSc.plans && matchedSc.plans.length > 0) {
          setSelectedPlanName(matchedSc.plans[0].name || "");
        } else {
          setSelectedPlanName("");
        }
        setTempProduct(prev => ({
          ...prev,
          customSellerPrice: "",
          customCostPrice: ""
        }));
      }
    }
  }, [activeOrder.domainUrl, tempProduct.product, selectedProduct, selectedSubCategoryName]);

  const handleTempProductChange = (e) => {
    const { name, value } = e.target;
    if (name === "product") {
      setTempProduct({
        ...tempProduct,
        product: value,
        variant: "",
        option: "",
        price: 0,
        costPrice: 0,
        customSellerPrice: "",
        customCostPrice: "",
        quantity: 1,
        Varinet: [],
        years: 1,
        startDate: currentDate,
        endDate: defaultEndDate,
      });
      setSelectedPackageName("");
      setPackageSellerPrice("");
      setPackageCostPrice("");
      setSelectedPackageOptions([]);
      setSelectedSubVariants({});
      setShowAdditionalOption(false);
      setAdditionalFeatureName("");
      setAdditionalFeaturePrice("");

      const product = allProducts.find(p => p.name === value);
      if (product) {
        if (product.subCategories && product.subCategories.length > 0) {
          let targetSub = product.subCategories[0];
          if (value.toLowerCase() === "domain" && activeOrder.domainUrl) {
            const matchedSc = findMatchingDomainSubCategory(activeOrder.domainUrl, product.subCategories);
            if (matchedSc) targetSub = matchedSc;
          }
          setSelectedSubCategoryName(targetSub.name || "");
          if (targetSub.hasPlan && targetSub.plans && targetSub.plans.length > 0) {
            setSelectedPlanName(targetSub.plans[0].name || "");
          } else {
            setSelectedPlanName("");
          }
        } else if (product.packageEnabled) {
          if (product.packages && product.packages.length > 0) {
            const pkg = product.packages[0];
            setSelectedPackageName(pkg.name);
            setPackageSellerPrice((pkg.sellerPrice || 0).toString());
            setPackageCostPrice((pkg.costPrice || 0).toString());
            setSelectedPackageOptions(pkg.options ? pkg.options.map(opt => ({ name: opt.name, value: opt.value })) : []);
          }
        } else if (product.subVariantsEnabled) {
          const initialSubVariants = {};
          if (product.subVariants) {
            product.subVariants.forEach(vGroup => {
              if (vGroup.subVariants && vGroup.subVariants.length > 0) {
                const sub = vGroup.subVariants[0];
                if (sub.options && sub.options.length > 0) {
                  const opt = sub.options[0];
                  initialSubVariants[vGroup.variantName] = {
                    subVariantName: sub.name,
                    optionName: opt.name,
                    sellerPrice: opt.sellerPrice || 0,
                    costPrice: opt.costPrice || 0,
                    priceEnable: sub.priceEnable
                  };
                }
              }
            });
          }
          setSelectedSubVariants(initialSubVariants);
        } else {
          const newRows = buildVariantRows(value);
          setModalVariantRows(newRows);
        }
      }
    } else {
      setTempProduct({ ...tempProduct, [name]: value });
    }
  };

  const handleSubCategorySelectChange = (scName) => {
    setSelectedSubCategoryName(scName);
    const sc = selectedProduct?.subCategories?.find(s => s.name === scName);
    if (sc && sc.hasPlan && sc.plans && sc.plans.length > 0) {
      setSelectedPlanName(sc.plans[0].name || "");
    } else {
      setSelectedPlanName("");
    }
    setTempProduct(prev => ({
      ...prev,
      customSellerPrice: "",
      customCostPrice: ""
    }));
  };

  const handlePlanSelectChange = (pName) => {
    setSelectedPlanName(pName);
    setTempProduct(prev => ({
      ...prev,
      customSellerPrice: "",
      customCostPrice: ""
    }));
  };

  const handleProductAdd = () => {
    let domainVal = activeOrder.domainUrl ? activeOrder.domainUrl.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "") : "";

    if (!domainVal) {
      toast.error("Domain URL / Name is required");
      return;
    }

    if (activeOrder.domainUrl !== domainVal) {
      setActiveOrder(prev => ({ ...prev, domainUrl: domainVal }));
    }

    if (!tempProduct.product) {
      toast.error("Please select a service product");
      return;
    }

    if (currentSubCat?.oneTimePayment) {
      const sellerVal = tempProduct.customSellerPrice !== ""
        ? parseFloat(tempProduct.customSellerPrice)
        : (currentSubCat.sellerPrice !== null && currentSubCat.sellerPrice !== undefined
            ? parseFloat(currentSubCat.sellerPrice)
            : NaN);
      if (isNaN(sellerVal) || sellerVal <= 0) {
        toast.error("Please enter a valid Selling Price for this service");
        return;
      }
    }

    if (!currentSubCatHasRenewal) {
      finalizeProductAdd(false, "", "", 1);
      return;
    }

    if (tempProduct.validationEnabled) {
      finalizeProductAdd(
        true,
        tempProduct.startDate || currentDate,
        tempProduct.endDate || defaultEndDate,
        tempProduct.years || 1
      );
      return;
    }

    if (promptedForRenewal) {
      finalizeProductAdd(false, "", "", 1);
      return;
    }

    // Show Renewal Date Option Yes/No prompt
    setShowRenewalDatePrompt(true);
    return;
  };

  const finalizeProductAdd = (isValidationEnabled, startDateVal, endDateVal, yearsVal) => {
    let variantStr = "";
    if (selectedProduct) {
      if (selectedProduct.subCategories && selectedProduct.subCategories.length > 0) {
        if (currentSubCat) {
          if (currentPlan) {
            variantStr = `${currentSubCat.name} - ${currentPlan.name}`;
          } else {
            variantStr = `${currentSubCat.name}`;
          }
        }
      } else if (selectedProduct.packageEnabled) {
        const optionsPart = selectedPackageOptions?.map(opt => `${opt.name}: ${opt.value}`).join("          ") || "";
        variantStr = `Package: ${selectedPackageName}${optionsPart ? "          " + optionsPart : ""}`;
      } else if (selectedProduct.subVariantsEnabled) {
        variantStr = Object.entries(selectedSubVariants).map(([varName, sel]) => {
          return `${varName}: ${sel.subVariantName} (${sel.optionName})`;
        }).join("          ");
      } else {
        const checkedRows = modalVariantRows.filter(r => {
          if (!r.checked) return false;
          if (isThirdPartySelected) {
            return r.variantName?.toLowerCase().includes("jayam") || r.variantName?.toLowerCase().includes("3rd party");
          }
          return true;
        });
        if (checkedRows.length === 0) {
          toast.error("Please select at least one variant");
          return;
        }

        const firstChecked = checkedRows[0];
        const isSubCategory = firstChecked?.subCategory === true;

        if (isSubCategory) {
          const typeLabel = `${tempProduct.product} type`;
          const variantName = firstChecked.variantName;
          const optionsPart = checkedRows.map(row => {
            return `${row.optionName}: ${row.optionValue}`;
          }).join("          ");
          variantStr = `${typeLabel}: ${variantName}          ${optionsPart}`;
        } else {
          variantStr = checkedRows.map(row => {
            return row.optionValue
              ? `${row.variantName}: ${row.optionValue}`
              : row.variantName || "Standard";
          }).join("          ");
        }
      }

      // Append no. of years to variantStr
      if (isValidationEnabled) {
        variantStr += (variantStr ? "          " : "") + `No. of Years: ${yearsVal || 1}`;
      }

      // Append additional option to variantStr
      if (showAdditionalOption && additionalFeatureName.trim()) {
        variantStr += (variantStr ? "          " : "") + `${additionalFeatureName.trim()}: ₹${additionalFeaturePrice}`;
      }
    }

    const isOneTimePayment = !!currentSubCat?.oneTimePayment;

    const newProduct = {
      product: tempProduct.product,
      variant: variantStr,
      price: computedPrices.finalSeller,
      costPrice: isOneTimePayment ? 0 : computedPrices.finalCost,
      quantity: parseInt(tempProduct.quantity) || 1,
      oneTimePayment: isOneTimePayment,
       billingCycle: tempProduct.billingCycle || "yearly",
      validationEnabled: isOneTimePayment ? false : isValidationEnabled,
      startDate: isOneTimePayment ? "" : (isValidationEnabled ? startDateVal : ""),
      endDate: isOneTimePayment ? "" : (isValidationEnabled ? endDateVal : ""),
      years: isOneTimePayment ? 1 : (isValidationEnabled ? (yearsVal || 1) : 1),
      deactive: isOneTimePayment ? false : (tempProduct.deactive || false),
      deactiveYear: isOneTimePayment ? "" : (tempProduct.deactive ? (tempProduct.deactiveYear || "") : ""),
      Varinet: [
        ...modalVariantRows.filter(r => r.checked).map(r => ({
          name: r.variantName,
          value: r.optionValue,
          option: r.optionName,
          sellerPrice: parseFloat(r.sellerPrice) || 0,
          costPrice: parseFloat(r.costPrice) || 0,
          isCustom: false
        })),
        ...(showAdditionalOption && additionalFeatureName.trim() ? [{
          name: additionalFeatureName.trim(),
          value: `₹${additionalFeaturePrice}`,
          option: "",
          sellerPrice: parseFloat(additionalFeaturePrice) || 0,
          costPrice: 0,
          isAdditional: true
        }] : [])
      ]
    };

    let updatedProducts;
    if (editingProductIdx !== null) {
      updatedProducts = [...activeOrder.products];
      updatedProducts[editingProductIdx] = newProduct;
    } else {
      updatedProducts = [...activeOrder.products, newProduct];
    }

    const totalNewPrice = updatedProducts.reduce((sum, p) => sum + p.price, 0);
    setActiveOrder({
      ...activeOrder,
      products: updatedProducts,
      totalPrice: totalNewPrice,
    });
    closeProductModal();
  }; const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeCustomerId, setComposeCustomerId] = useState("");
  const [composeOrderId, setComposeOrderId] = useState("");
  const [composePaymentId, setComposePaymentId] = useState("");
  const [sendingPaymentEmail, setSendingPaymentEmail] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Inline helpers for payment compose (NewOrder has no shared utils)
  const _numToWords = (num) => {
    if (!num || isNaN(num)) return '';
    num = Math.round(Number(num));
    if (num === 0) return 'Zero Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const numStr = num.toString();
    if (numStr.length > 9) return 'Overflow';
    const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    const parts = [];
    if (Number(n[1]) !== 0) parts.push(((a[Number(n[1])] || (b[n[1][0]] + ' ' + a[n[1][1]])).trim()) + ' Crore');
    if (Number(n[2]) !== 0) parts.push(((a[Number(n[2])] || (b[n[2][0]] + ' ' + a[n[2][1]])).trim()) + ' Lakh');
    if (Number(n[3]) !== 0) parts.push(((a[Number(n[3])] || (b[n[3][0]] + ' ' + a[n[3][1]])).trim()) + ' Thousand');
    if (Number(n[4]) !== 0) parts.push(((a[Number(n[4])] || (b[n[4][0]] + ' ' + a[n[4][1]])).trim()) + ' Hundred');
    if (Number(n[5]) !== 0) parts.push((a[Number(n[5])] || (b[n[5][0]] + ' ' + a[n[5][1]])).trim());
    if (parts.length === 0) return 'Only';
    if (parts.length === 1) return parts[0] + ' Only';
    const lastPart = parts.pop();
    return parts.join(' ') + ' and ' + lastPart + ' Only';
  };

  const _capWords = (str) => {
    if (!str) return '';
    return str.replace(/\b[a-z]/g, c => c.toUpperCase());
  };

  const _fmtDomain = (url) => {
    if (!url) return '';
    return url.split(',').map(d => {
      let clean = d.trim().replace(/^https?:\/\//i, '');
      if (clean.includes('.') && !clean.toLowerCase().startsWith('www.')) clean = 'www.' + clean;
      return clean;
    }).join(', ');
  };

  const _fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateStr;
  };

  const handleOpenPaymentCompose = async (customer, order, paymentId) => {
    const toastId = toast.loading("Loading template...");
    try {
      let template = null;
      try {
        template = await getTemplate('Payment');
      } catch (err) {
        console.warn("Could not load Payment template", err);
      }
      const rawSubject = template?.subject || "Payment Confirmation – Renewal of [Service Name] – Paid";
      const rawContent = template?.content || `Jayam Web Solutions\n\nThank you for your payment.\n\nWe are pleased to confirm that the payment for the renewal of [Service Name] has been successfully received.`;

      // Build values from order
      const payment = (order.payments || []).find(p => String(p._id) === String(paymentId)) || (order.payments && order.payments.length > 0 ? order.payments[order.payments.length - 1] : null);
      const isPartialOrUpdated = order.paymentStatus === "Partially Paid" || payment?.paymentType === "updated";

      let activeProds = (order.products || []).filter(p => !p.deactive);
      if (isPartialOrUpdated) {
        const noValProds = activeProds.filter(p => p.validationEnabled === false || !p.validationEnabled);
        if (noValProds.length > 0) {
          activeProds = noValProds;
        }
      } else {
        const valProds = activeProds.filter(p => p.validationEnabled !== false);
        if (valProds.length > 0) activeProds = valProds;
      }

      const capServiceName = _capWords(
        activeProds.length > 0
          ? activeProds.map(p => p.productName || p.product || '').filter(Boolean).join(', ')
          : (order.products && order.products.length > 0 ? order.products.map(p => p.productName || p.product || '').filter(Boolean).join(', ') : 'Services')
      );

      let orderPrice = 0;
      if (activeProds.length > 0) {
        activeProds.forEach(p => {
          orderPrice += (p.renewalSelling !== undefined && p.renewalSelling !== null ? p.renewalSelling : (p.price || 0)) * (p.quantity || 1);
        });
      } else {
        orderPrice = order.totalPrice || 0;
      }
      const priceWords = _numToWords(orderPrice);
      const domUrl = _fmtDomain(order.domainUrl || '');

      // Renewal dates: current end → next year end
      const endRaw = order.endDate || '';
      const endParts = endRaw.split('-');
      let startDateFmt = '', endDateFmt = '';
      if (endParts.length === 3) {
        const [y, m, d] = endParts;
        startDateFmt = `${d}.${m}.${y}`;
        endDateFmt = `${d}.${m}.${parseInt(y, 10) + 1}`;
      }

      const replaceAll = (text, isSubject = false) => {
        if (!text) return "";
        const subjProd = capServiceName.length > 20 ? capServiceName.slice(0, 20).trim() + "..." : capServiceName;
        const boldProd = isSubject ? subjProd : `<b>${capServiceName}</b>`;
        const plainProd = isSubject ? subjProd : capServiceName;
        return text
          .replace(/\[Customer Name\]/gi, customer.name || 'Customer')
          .replace(/\[customerName\]/gi, customer.name || 'Customer')
          .replace(/\[Service Name\]/gi, plainProd)
          .replace(/\[ServiceName\]/gi, plainProd)
          .replace(/\[Product\]/gi, boldProd)
          .replace(/\[product\]/gi, boldProd)
          .replace(/www\.\[domainUrl\]/gi, domUrl)
          .replace(/\[domainUrl\]/gi, domUrl)
          .replace(/www\.www\./gi, 'www.')
          .replace(/\[price\]words/gi, priceWords)
          .replace(/\[priceWords\]/gi, priceWords)
          .replace(/\[price\]/gi, orderPrice ? `<b>${Number(orderPrice).toLocaleString('en-IN')}</b>` : '<b>0</b>')
          .replace(/\[startDate\]/gi, startDateFmt)
          .replace(/\[endDate\]/gi, endDateFmt)
          .replace(/\[product\s*tables?\]|\[productTable\]|\[product_table\]/gi, capServiceName);
      };

      setComposeSubject(replaceAll(rawSubject, true));
      setComposeBody(replaceAll(rawContent, false));
      setComposeCustomerId(customer._id);
      setComposeOrderId(order._id);
      setComposePaymentId(paymentId);
      setIsComposeModalOpen(true);
      toast.dismiss(toastId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load template", { id: toastId });
    }
  };

  const handleInsertPlaceholderCompose = (placeholder, field = 'body') => {
    if (field === 'subject') {
      const input = document.getElementById('compose-subject-input-no');
      if (!input) {
        setComposeSubject(prev => prev + placeholder);
        return;
      }
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const before = input.value.substring(0, start);
      const after = input.value.substring(end);
      setComposeSubject(before + placeholder + after);
      setTimeout(() => {
        input.focus();
        input.selectionStart = input.selectionEnd = start + placeholder.length;
      }, 0);
    } else {
      const textarea = document.getElementById('compose-body-textarea-no');
      if (!textarea) {
        setComposeBody(prev => prev + placeholder);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = textarea.value.substring(0, start);
      const after = textarea.value.substring(end);
      setComposeBody(before + placeholder + after);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
      }, 0);
    }
  };

  const handleSendComposeEmail = async () => {
    setSendingPaymentEmail(true);
    const toastId = toast.loading("Sending email...");
    try {
      await sendPaymentConfirmationEmailApi(composeCustomerId, composeOrderId, composePaymentId, {
        subject: composeSubject,
        content: composeBody
      });
      toast.success("Payment confirmation email sent successfully!", { id: toastId });
      setIsComposeModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send email", { id: toastId });
    } finally {
      setSendingPaymentEmail(false);
    }
  };

  const openProductEdit = (idx) => {
    setEditingProductIdx(idx);
    setPromptedForRenewal(true);
    const prod = activeOrder.products[idx];

    const hasValidation = prod.validationEnabled !== undefined ? !!prod.validationEnabled : (!!prod.startDate || !!prod.years);

    setTempProduct({
      ...prod,
      product: prod.product,
      validationEnabled: hasValidation,
      startDate: prod.startDate || currentDate,
      endDate: prod.endDate || defaultEndDate,
      years: prod.years || 1,
      Varinet: prod.Varinet || [],
      deactive: prod.deactive || false,
      deactiveYear: prod.deactiveYear || "",
    });

    const product = allProducts.find(p => p.name === prod.product);
    if (product) {
      if (product.subCategories && product.subCategories.length > 0) {
        const qtyVal = parseInt(prod.quantity) || 1;
        const baseSeller = (prod.price || 0) / qtyVal;
        const baseCost = (prod.costPrice || 0) / qtyVal;

        const variantStr = prod.variant || "";
        let subCatName = "";
        let planName = "";

        if (variantStr.includes(" - ")) {
          const parts = variantStr.split(" - ");
          subCatName = parts[0].trim();
          planName = parts[1].trim();
        } else {
          subCatName = variantStr.trim();
        }

        const matchedSubCat = product.subCategories.find(sc => sc.name?.toLowerCase() === subCatName.toLowerCase()) || product.subCategories[0];
        if (matchedSubCat) {
          setSelectedSubCategoryName(matchedSubCat.name);
          if (matchedSubCat.plans && matchedSubCat.plans.length > 0) {
            const matchedPlan = matchedSubCat.plans.find(pl => pl.name?.toLowerCase() === planName.toLowerCase()) || matchedSubCat.plans[0];
            if (matchedPlan) {
              setSelectedPlanName(matchedPlan.name);
            }
          }
        }

        setTempProduct(prev => ({
          ...prev,
          customSellerPrice: baseSeller.toString(),
          customCostPrice: baseCost.toString(),
        }));
      } else if (product.packageEnabled) {
        const matchedPkg = product.packages?.find(pkg => prod.variant.includes(`Package: ${pkg.name}`));
        const finalPkgName = matchedPkg ? matchedPkg.name : (product.packages?.[0]?.name || "");
        setSelectedPackageName(finalPkgName);

        const qtyVal = parseInt(prod.quantity) || 1;
        const baseSeller = (prod.price || 0) / qtyVal;
        const baseCost = (prod.costPrice || 0) / qtyVal;
        setPackageSellerPrice(baseSeller.toString());
        setPackageCostPrice(baseCost.toString());

        const parts = (prod.variant || "").split("          ");
        const parsedOptions = {};
        parts.forEach(part => {
          if (part.includes(": ") && !part.startsWith("Package:")) {
            const idx = part.indexOf(": ");
            const name = part.substring(0, idx).trim();
            const val = part.substring(idx + 2).trim();
            parsedOptions[name] = val;
          }
        });

        const defaultOptions = matchedPkg ? matchedPkg.options : [];
        const loadedOptions = defaultOptions.map(opt => ({
          ...opt,
          value: parsedOptions[opt.name] !== undefined ? parsedOptions[opt.name] : (opt.value || "")
        }));
        setSelectedPackageOptions(loadedOptions);
      } else if (product.subVariantsEnabled) {
        const parts = (prod.variant || "").split("          ");
        const parsedSelections = {};
        parts.forEach(part => {
          const match = part.match(/^([^:]+):\s*(.*?)\s*\((.*)\)$/);
          if (match) {
            const [_, varName, subVarName, optName] = match;
            parsedSelections[varName.trim()] = {
              subVariantName: subVarName.trim(),
              optionName: optName.trim()
            };
          }
        });

        const initialSubVariants = {};
        if (product.subVariants) {
          product.subVariants.forEach(vGroup => {
            const varName = vGroup.variantName;
            const parsed = parsedSelections[varName];
            let sub = null;
            let opt = null;
            if (parsed) {
              sub = vGroup.subVariants.find(s => s.name === parsed.subVariantName);
              if (sub) {
                opt = sub.options.find(o => o.name === parsed.optionName);
              }
            }
            if (!sub && vGroup.subVariants.length > 0) {
              sub = vGroup.subVariants[0];
            }
            if (sub && !opt && sub.options.length > 0) {
              opt = sub.options[0];
            }

            if (sub && opt) {
              initialSubVariants[varName] = {
                subVariantName: sub.name,
                optionName: opt.name,
                sellerPrice: opt.sellerPrice || 0,
                costPrice: opt.costPrice || 0,
                priceEnable: sub.priceEnable
              };
            }
          });

          const qtyVal = parseInt(prod.quantity) || 1;
          const targetSellerPrice = (prod.price || 0) / qtyVal;
          const targetCostPrice = (prod.costPrice || 0) / qtyVal;

          const priceEnabledGroups = Object.keys(initialSubVariants).filter(vName => initialSubVariants[vName].priceEnable);
          if (priceEnabledGroups.length > 0) {
            const firstBearer = priceEnabledGroups[0];
            const otherSumSeller = priceEnabledGroups.slice(1).reduce((sum, vName) => sum + (initialSubVariants[vName].sellerPrice || 0), 0);
            const otherSumCost = priceEnabledGroups.slice(1).reduce((sum, vName) => sum + (initialSubVariants[vName].costPrice || 0), 0);

            initialSubVariants[firstBearer].sellerPrice = Math.max(0, targetSellerPrice - otherSumSeller);
            initialSubVariants[firstBearer].costPrice = Math.max(0, targetCostPrice - otherSumCost);
          }
        }
        setSelectedSubVariants(initialSubVariants);
      } else {
        const parts = (prod.variant || "").split("          ");
        const parsedVarinet = parts.map(part => {
          let name = "";
          let val = "";
          if (part.includes(": ")) {
            const idx = part.indexOf(": ");
            name = part.substring(0, idx).trim();
            val = part.substring(idx + 2).trim();
          } else {
            name = part.trim();
            val = part.trim();
          }
          return {
            name,
            value: val,
            option: "",
            sellerPrice: 0,
            costPrice: 0
          };
        });

        const qtyVal = parseInt(prod.quantity) || 1;
        const baseSeller = (prod.price || 0) / qtyVal;
        const baseCost = (prod.costPrice || 0) / qtyVal;

        const priceBearingVariantNames = (product.variants || []).filter(v => v.priceEnable !== false).map(v => v.name);
        let assigned = false;
        parsedVarinet.forEach(v => {
          if (priceBearingVariantNames.includes(v.name) && !assigned) {
            v.sellerPrice = baseSeller;
            v.costPrice = baseCost;
            assigned = true;
          }
        });
        if (!assigned && parsedVarinet.length > 0) {
          parsedVarinet[0].sellerPrice = baseSeller;
          parsedVarinet[0].costPrice = baseCost;
        }

        const prodWithVarinet = {
          ...prod,
          Varinet: parsedVarinet
        };

        const newRows = buildVariantRows(prod.product, null, null, prodWithVarinet);
        setModalVariantRows(newRows);
      }

      // Load additional option if saved
      const hasVarinetArray = Array.isArray(prod.Varinet) && prod.Varinet.length > 0;
      const additionalOpt = hasVarinetArray ? prod.Varinet.find(v => v.isAdditional) : null;

      const isInvalidFeatureName = (n) => {
        if (!n) return true;
        const lower = n.toLowerCase().trim();
        const prodLower = (prod.product || "").toLowerCase().trim();
        const catalogProdLower = (product.name || "").toLowerCase().trim();
        return (
          lower === prodLower ||
          lower === catalogProdLower ||
          lower === `${prodLower} type` ||
          lower === `${catalogProdLower} type` ||
          lower === "hosting" ||
          lower.endsWith(" type")
        );
      };

      if (additionalOpt && !isInvalidFeatureName(additionalOpt.name)) {
        setShowAdditionalOption(true);
        setAdditionalFeatureName(additionalOpt.name);
        setAdditionalFeaturePrice((parseFloat(additionalOpt.sellerPrice) || 0).toString());
      } else if (!hasVarinetArray) {
        // Fallback: search variant string parts for legacy orders without Varinet array
        const allProductNames = new Set([
          "no. of years",
          (prod.product || "").toLowerCase().trim(),
          (product.name || "").toLowerCase().trim(),
          `${(prod.product || "").toLowerCase().trim()} type`,
          `${(product.name || "").toLowerCase().trim()} type`
        ]);

        (product.variants || product.varient || product.varients || []).forEach(v => {
          if (v.name) allProductNames.add(v.name.toLowerCase().trim());
          if (Array.isArray(v.options)) {
            v.options.forEach(opt => {
              if (opt.option) allProductNames.add(opt.option.toLowerCase().trim());
              if (opt.name) allProductNames.add(opt.name.toLowerCase().trim());
              if (opt.value) allProductNames.add(opt.value.toLowerCase().trim());
            });
          }
        });

        if (product.packages) {
          product.packages.forEach(pkg => {
            if (pkg.name) allProductNames.add(pkg.name.toLowerCase().trim());
            if (Array.isArray(pkg.options)) {
              pkg.options.forEach(opt => {
                if (opt.name) allProductNames.add(opt.name.toLowerCase().trim());
              });
            }
          });
        }

        if (product.subVariants) {
          product.subVariants.forEach(sv => {
            if (sv.variantName) allProductNames.add(sv.variantName.toLowerCase().trim());
          });
        }

        const parts = (prod.variant || "").split("          ");

        let foundAdditional = false;
        for (const part of parts) {
          if (part.includes(": ") && !part.startsWith("Package:")) {
            const idx = part.indexOf(": ");
            const name = part.substring(0, idx).trim();
            const val = part.substring(idx + 2).trim();
            const normName = name.toLowerCase().trim();

            if (
              !allProductNames.has(normName) &&
              !normName.endsWith("type") &&
              !isInvalidFeatureName(name)
            ) {
              setShowAdditionalOption(true);
              setAdditionalFeatureName(name);
              const numericPrice = val.replace(/[^\d.]/g, "");
              setAdditionalFeaturePrice(numericPrice);
              foundAdditional = true;
              break;
            }
          }
        }

        if (!foundAdditional) {
          setShowAdditionalOption(false);
          setAdditionalFeatureName("");
          setAdditionalFeaturePrice("");
        }
      } else {
        setShowAdditionalOption(false);
        setAdditionalFeatureName("");
        setAdditionalFeaturePrice("");
      }
    }

    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProductIdx(null);
    setTempProduct({
      product: "",
      variant: "",
      option: "",
      price: 0,
      costPrice: 0,
      quantity: 1,
      customSellerPrice: "",
      customCostPrice: "",
      validationEnabled: false,
      startDate: currentDate,
      endDate: defaultEndDate,
      Varinet: [],
      years: 1,
    });
    setModalVariantRows([]);
    setTotalYears(1);
    setTotalEmails(1);
    setPromptedForRenewal(false);
    setSelectedPackageName("");
    setPackageSellerPrice("");
    setPackageCostPrice("");
    setSelectedPackageOptions([]);
    setSelectedSubVariants({});
    setShowAdditionalOption(false);
    setAdditionalFeatureName("");
    setAdditionalFeaturePrice("");
  };

  const removeProduct = (idx) => {
    const updatedProducts = activeOrder.products.filter((_, i) => i !== idx);
    const totalNewPrice = updatedProducts.reduce((sum, p) => sum + p.price, 0);
    setActiveOrder({
      ...activeOrder,
      products: updatedProducts,
      totalPrice: totalNewPrice,
    });
  };

  const executeSaveOrder = async ({ openPaymentAfterSave = false } = {}) => {
    let domainVal = activeOrder.domainUrl ? activeOrder.domainUrl.trim() : "";

    setSaving(true);
    try {
      const customer = selectedCustomer || await getCustomerById(customerId);

      const finalOrder = {
        ...activeOrder,
         billingCycle: activeOrder.billingCycle || tempProduct.billingCycle || "yearly",
        products: activeOrder.products.map(p => ({
          ...p,
          price: p.price === "" ? 0 : (parseFloat(p.price) || 0)
        })),
        domainUrl: domainVal,
        orderDate: activeOrder.orderDate || currentDate,
        totalPrice: subtotal,
        paymentStatus: activeOrder.paymentStatus || "Unpaid",
      };

      let updatedOrders;
      let savedOrderId = orderId || null;
      if (isEditingOrder && orderId) {
        updatedOrders = (customer.orders || []).map(o => {
          if (o._id && (o._id === orderId || o._id.toString() === orderId)) {
            return { ...finalOrder, _id: o._id };
          }
          return o;
        });
      } else {
        updatedOrders = [...(customer.orders || []), finalOrder];
      }

      const dataToSave = {
        ...customer,
        orders: updatedOrders
      };

      const updatedCustomer = await updateCustomer(customerId, dataToSave);
      toast.success(isEditingOrder ? "Order updated successfully!" : "Order created and saved successfully!");

      const ordersAfterSave = updatedCustomer?.orders || updatedOrders;
      let savedOrder = savedOrderId
        ? ordersAfterSave.find(o => String(o._id) === String(savedOrderId))
        : ordersAfterSave[ordersAfterSave.length - 1];
      if (!savedOrder) savedOrder = ordersAfterSave[ordersAfterSave.length - 1];

      const finalCustomer = updatedCustomer || dataToSave;
      setSelectedCustomer(finalCustomer);
      setActiveOrder(savedOrder);
      setIsEditingOrder(true);
      setSavedOrderContext({ customer: finalCustomer, order: savedOrder });

      if (openPaymentAfterSave) {
        setPaymentForm(prev => ({
  ...prev,
  amount: subtotal || savedOrder.totalPrice || "",
  state: finalCustomer.state || "",
  gstin: finalCustomer.gstin || "",
  paymentDate: currentDate,
  description: "",
  applyTds: false,
  tdsAmount: "",
}));
        setIsPaymentModalOpen(true);
      } else {
        if (location.state?.fromReminders) {
          navigate("/renewal");
        } else {
          navigate("/customers", { state: { customerId: customerId, editMode: true, activeTab: "service" } });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save order");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrderSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer for this order.");
      return;
    }

    if (activeOrder.products.length === 0) {
      toast.error("Please add at least one product to the shopping cart.");
      return;
    }

    let domainVal = activeOrder.domainUrl ? activeOrder.domainUrl.trim() : "";

    if (!domainVal) {
      toast.error("Please enter the Domain URL / Name for this order.");
      return;
    }

    if (hasWwwPrefix(domainVal)) {
      toast.error("Please remove www. from Domain URL / Name");
      return;
    }

    const hasPayments = (activeOrder.payments || []).length > 0;
    const hasDeactiveProducts = activeOrder.products.some(p => p.deactive);
    if (!hasPayments && !hasDeactiveProducts) {
      setShowAddPaymentPrompt(true);
      return;
    }

    await executeSaveOrder({ openPaymentAfterSave: false });
  };

  const handleAddPaymentPromptYes = async () => {
    setShowAddPaymentPrompt(false);
    await executeSaveOrder({ openPaymentAfterSave: true });
  };

  const handleAddPaymentPromptNo = async () => {
    setShowAddPaymentPrompt(false);
    await executeSaveOrder({ openPaymentAfterSave: false });
  };

  const buildFilename = (customerName, invoiceNo, withGst) => {
    if (withGst) {
      const slug = (customerName || "Invoice").replace(/\s+/g, "");
      return invoiceNo ? `TAX-Invoice-${slug}-${invoiceNo}.pdf` : `TAX-Invoice-${slug}.pdf`;
    }
    const slug = (customerName || "invoice").replace(/\s+/g, "").toLowerCase();
    return invoiceNo ? `${slug}-${invoiceNo}.pdf` : `${slug}.pdf`;
  };

  const handlePaymentSubmit = async () => {
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (paymentForm.withGst && !paymentForm.state) {
      toast.error("No state found for this customer. Please update the customer profile first.");
      return;
    }
    if (paymentForm.withGst && !paymentForm.gstin.trim()) {
      toast.error("GSTIN is required for GST invoices.");
      return;
    }


    if (paymentForm.applyTds) {
  const tdsAmount = Number(paymentForm.tdsAmount);

  if (!tdsAmount || tdsAmount <= 0) {
    toast.error("Please enter a valid TDS amount.");
    return;
  }

  if (tdsAmount > amt) {
    toast.error("TDS amount cannot be greater than the payment amount.");
    return;
  }
}


    const { customer, order } = savedOrderContext;
    if (!customer || !order) return;

    setRecordingPayment(true);

    const cgst = amt * (gstRates.cgst / 100);
    const sgst = amt * (gstRates.sgst / 100);
    const igst = amt * (gstRates.igst / 100);
    const taxValue = paymentForm.state === "Tamil Nadu" ? (cgst + sgst) : igst;
    const gstValue = paymentForm.withGst ? taxValue : 0;

    const pDescription = paymentForm.description;

    const isOrderOneTimePayment = (
      (order.products && order.products.length > 0 && order.products.every(p => p.oneTimePayment)) ||
      (activeOrder.products && activeOrder.products.length > 0 && activeOrder.products.every(p => p.oneTimePayment))
    );
    const resolvedPaymentType = isOrderOneTimePayment ? "oneTimePayment" : "base";

    const newPayment = {
      date: paymentForm.paymentDate || currentDate,
      amount: amt,
      gstvalue: gstValue,
      paymentType: resolvedPaymentType,
      withGst: paymentForm.withGst,
      description: pDescription,
      paymentStage: paymentForm.paymentStage || "full",

      // TDS
      tdsAmount: paymentForm.applyTds
        ? Number(paymentForm.tdsAmount) || 0
        : 0,
    };

    const updatedOrders = (customer.orders || []).map(o => {
      if (String(o._id) === String(order._id)) {
        const payments = [...(o.payments || []), newPayment];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        let resolvedPaymentStatus = totalPaid >= o.totalPrice ? "Fully Paid" : "Partially Paid";
        if (paymentForm.paymentStage === 'advance' || paymentForm.paymentStage === 'mid') {
          resolvedPaymentStatus = "Partially Paid";
        } else if (paymentForm.paymentStage === 'final') {
          resolvedPaymentStatus = "Fully Paid";
        }
        return {
          ...o,
          payments,
          paymentStatus: resolvedPaymentStatus,
        };
      }
      return o;
    });

    try {
      const needsCustomerUpdate = paymentForm.withGst &&
        (paymentForm.state !== customer.state || paymentForm.gstin !== customer.gstin);

      const dataToSave = {
        ...customer,
        orders: updatedOrders,
        ...(needsCustomerUpdate ? { state: paymentForm.state, gstin: paymentForm.gstin } : {}),
      };

      const updatedCustomer = await updateCustomer(customer._id, dataToSave);
      const finalOrders = updatedCustomer?.orders || updatedOrders;
      const finalOrder = finalOrders.find(o => String(o._id) === String(order._id)) || order;
      const finalCustomer = updatedCustomer || dataToSave;

      setSelectedCustomer(finalCustomer);
      setActiveOrder(finalOrder);
      setSavedOrderContext({ customer: finalCustomer, order: finalOrder });

      toast.success("Payment recorded successfully");
      setIsPaymentModalOpen(false);

      // Check if automatic payment email is disabled
      try {
        const pcSettings = await getPaymentConfirmationSettings();
        if (pcSettings && pcSettings.sendPaymentConfirmationEmail === false) {
          const newPayment = finalOrder.payments?.[finalOrder.payments.length - 1];
          if (newPayment) {
            setTimeout(() => {
              handleOpenPaymentCompose(finalCustomer, finalOrder, newPayment._id);
            }, 500);
          }
        }
      } catch (err) {
        console.warn("Could not check payment confirmation settings:", err);
      }

      const invoiceType = paymentForm.withGst ? "withGST" : "withoutGST";
      let nextNo = "";
      try {
        nextNo = await getNextInvoiceNumber(invoiceType, paymentForm.paymentDate || currentDate);
      } catch (_) { }

      if (finalOrder.paymentStatus === "Partially Paid") {
        setPartialPromptModal({
          isOpen: true,
          paidAmount: amt,
          nextInvoiceNo: nextNo,
        });
      } else {
        setInvoiceModal({
          isOpen: true,
          step: "actions",
          customInvoiceNo: nextNo,
          paymentStatus: "Paid",
          isSaving: false,
          pdfBlob: null,
          pdfUrl: null,
          filename: "",
        });
      }
    } catch (error) {
      toast.error("Failed to record payment");
      console.error(error);
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleGenerateInvoicePreview = async () => {
    const { customer, order } = savedOrderContext;
    if (!customer || !order) return;

    if (invoiceModal.customInvoiceNo?.trim()) {
      try {
        const { exists } = await verifyInvoiceNumber(invoiceModal.customInvoiceNo.trim(), order?._id, customer?._id);
        if (exists) {
          toast.error(`Invoice number "${invoiceModal.customInvoiceNo.trim()}" already exists for another order. Please enter a different number.`);
          return;
        }
      } catch (err) {
        console.error("Failed to verify invoice number:", err);
      }
    }

    setInvoiceModal(prev => ({ ...prev, isSaving: true }));
    const toastId = toast.loading("Preparing invoice...");

    try {
      const invoiceType = paymentForm.withGst ? "withGST" : "withoutGST";
      const latestPayment = order.payments && order.payments.length > 0
        ? order.payments[order.payments.length - 1]
        : null;

      const currentStage = latestPayment?.paymentStage || paymentForm.paymentStage || 'full';
      const isFin = currentStage === 'final';
      const isInst = ['advance', 'mid'].includes(currentStage);
      const invCat = isFin ? 'consolidated' : (isInst ? 'installment' : 'regular');

      const paymentData = latestPayment ? {
  paymentId: latestPayment._id || `${order._id}_pay_${latestPayment.date}`,
  amount: latestPayment.amount,
  description: latestPayment.description || "",
  date: latestPayment.date,
  withGst: latestPayment.withGst,
  paymentType: latestPayment.paymentType,
  paymentStage: currentStage,
  invoiceCategory: invCat,
  includePaymentHistory: isFin,

  // TDS
  tdsAmount: latestPayment.tdsAmount || 0,

  products: order.products,
  domainUrl: order.domainUrl,
  orderId: order._id,
  selectedOrderIds: [String(order._id)],
} : null;

      const pdfBlob = await generateInvoicePdf(
        customer._id,
        order._id,
        invoiceType,
        paymentForm.paymentDate || currentDate,
        [String(order._id)],
        paymentData,
        invoiceModal.customInvoiceNo,
        invoiceModal.paymentStatus || "Paid"
      );

      const filename = buildFilename(customer.name, invoiceModal.customInvoiceNo, paymentForm.withGst);
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      toast.dismiss(toastId);
      setInvoiceModal(prev => ({ ...prev, isSaving: false, pdfBlob, pdfUrl, filename, step: "share" }));
    } catch (error) {
      toast.dismiss(toastId);
      console.error(error);
      toast.error(error?.message || "Failed to generate invoice. Please try again.");
      setInvoiceModal(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleDownloadInvoice = () => {
    const { pdfBlob, filename } = invoiceModal;
    if (!pdfBlob) return;
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Invoice downloaded successfully!");
  };

  const handleEmailInvoice = async () => {
    const { customer, order } = savedOrderContext;
    const { pdfBlob, filename } = invoiceModal;
    if (!customer?.email) {
      toast.error("Customer email is missing");
      return;
    }

    const domainName = order?.domainUrl || "";
    const prods = order?.products || [];
    const productNames = Array.from(new Set(prods.map(p => p.product || p.productName).filter(Boolean))).join(", ");

    const formatDomainList = (str) => {
      if (!str) return "";
      return str
        .split(",")
        .map(d => d.trim())
        .filter(Boolean)
        .map(d => (d.toLowerCase().startsWith("www.") ? d : `www.${d}`))
        .join(", ");
    };

    const formattedDomain = formatDomainList(domainName);
    const subject = formattedDomain
      ? `Invoice for ${formattedDomain} from Jayam Web Solutions`
      : "Invoice from Jayam Web Solutions";

    const text = `Dear Sir/ Ma'am,\n\nPlease find attached the ${subject}.\n\nThanks & Regards,\nJayam Web Solutions`;

    const toastId = toast.loading("Sending email...");
    try {
      const fd = new FormData();
      fd.append("pdf", pdfBlob, filename);
      fd.append("subject", subject);
      fd.append("message", text);
      await emailInvoice(customer._id, fd);
      toast.success("Invoice emailed successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to email invoice", { id: toastId });
    }
  };

  const handleBackClick = () => {
    const targetCustId = customerId || selectedCustomer?._id;
    if (location.state?.fromReminders) {
      navigate("/renewal");
    } else if (location.state?.fromWebsite) {
      navigate("/website", { state: { customerId: targetCustId, editMode: true, activeTab: "service" } });
    } else if (targetCustId) {
      navigate("/customers", { state: { customerId: targetCustId, editMode: true, activeTab: "service" } });
    } else {
      navigate(-1);
    }
  };

  const handleFinishOrder = () => {
    if (invoiceModal.pdfUrl) window.URL.revokeObjectURL(invoiceModal.pdfUrl);
    setInvoiceModal({ isOpen: false, step: "actions", customInvoiceNo: "", paymentStatus: "Paid", isSaving: false, pdfBlob: null, pdfUrl: null, filename: "" });
    const targetCustId = customerId || selectedCustomer?._id;
    if (location.state?.fromReminders) {
      navigate("/renewal");
    } else if (location.state?.fromWebsite) {
      navigate("/website", { state: { customerId: targetCustId, editMode: true, activeTab: "service" } });
    } else {
      navigate("/customers", { state: { customerId: targetCustId, editMode: true, activeTab: "service" } });
    }
  };

  const handleSkipPayment = () => {
    setIsPaymentModalOpen(false);
    const targetCustId = customerId || selectedCustomer?._id;
    if (location.state?.fromReminders) {
      navigate("/renewal");
    } else if (location.state?.fromWebsite) {
      navigate("/website", { state: { customerId: targetCustId, editMode: true, activeTab: "service" } });
    } else {
      navigate("/customers", { state: { customerId: targetCustId, editMode: true, activeTab: "service" } });
    }
  };

  const confirmRenewalAdd = () => {
    setShowRenewalConfirm(false);
    const isVal = !!tempProduct.validationEnabled;
    finalizeProductAdd(
      isVal,
      isVal ? (tempProduct.startDate || currentDate) : "",
      isVal ? (tempProduct.endDate || defaultEndDate) : "",
      isVal ? (tempProduct.years || 1) : 1
    );
  };

  const cancelRenewalConfirm = () => {
    setShowRenewalConfirm(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-full pb-20">

      {/* Header */}
      <div className="flex items-center gap-md mb-lg md:mb-xl">
        <button
          onClick={handleBackClick}
          className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
          title="Back"
        >
          <span className="material-symbols-outlined text-[20px] md:text-[24px]">
            arrow_back
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-h1 font-bold text-on-surface truncate">
            {isEditingOrder
              ? (selectedCustomer?.name ? `Edit Service - ${selectedCustomer.name.split(";")[0]}` : "Edit Service")
              : (selectedCustomer?.name ? `Create New Service - ${selectedCustomer.name.split(";")[0]}` : "Create New Service")}
          </h1>
          <p className="text-primary text-xs md:text-body-md truncate font-semibold">
            {selectedCustomer?.name
              ? `${selectedCustomer.name.split(";")[0]} • Configure domain name and select variants`
              : "Configure domain name, select variants, and record invoice payments."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-md">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant font-bold text-sm">Loading catalogs...</p>
        </div>
      ) : (
        <form onSubmit={handleSaveOrderSubmit} className="space-y-md md:space-y-lg">

          {/* Step 2: Order Date */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-xl space-y-md shadow-sm">
            <div className="space-y-sm">
              <label className="text-[10px] text-primary uppercase tracking-widest font-black block">
                Start Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                required
                value={activeOrder.orderDate || currentDate}
                onChange={(e) => {
                  const newOrderDate = e.target.value;
                  setActiveOrder(prev => ({
                    ...prev,
                    orderDate: newOrderDate
                  }));
                }}
                onClick={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {
                    console.warn("showPicker not supported", err);
                  }
                }}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 font-semibold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
              />
            </div>
          </div>

          {/* Step 3: Shopping Cart Products Grid */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-xl space-y-md md:space-y-xl shadow-sm">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="text-lg md:text-h3 font-bold text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">service_toolbox</span>
                List of Services {activeOrder.domainUrl ? `/ ${activeOrder.domainUrl}` : ''}
              </h3>
              <div className="flex items-center gap-md">
                {activeOrder.products.length >= 1 && (
                  <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant">
                    <input
                      type="checkbox"
                      id="addMultipleServicesToggle"
                      checked={addMultipleServices}
                      disabled={activeOrder.products.length > 1}
                      onChange={(e) => setAddMultipleServices(e.target.checked)}
                      className="w-4 h-4 text-primary bg-surface-container-low border-outline-variant rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label
                      htmlFor="addMultipleServicesToggle"
                      className={`text-xs font-bold text-on-surface select-none ${activeOrder.products.length > 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      Add Multiple Services
                    </label>
                  </div>
                )}
                {(activeOrder.products.length === 0 || addMultipleServices) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductIdx(null);
                      setPromptedForRenewal(false);
                      setTempProduct({
                        product: "",
                        variant: "",
                        option: "",
                        price: 0,
                        costPrice: 0,
                        quantity: 1,
                        customSellerPrice: "",
                        customCostPrice: "",
                        validationEnabled: false,
                        startDate: currentDate,
                        endDate: defaultEndDate,
                        Varinet: [],
                        years: 1,
                        deactive: false,
                        deactiveYear: "",
                      });
                      setShowAdditionalOption(false);
                      setAdditionalFeatureName("");
                      setAdditionalFeaturePrice("");
                      setIsProductModalOpen(true);
                    }}
                    className="bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold text-xs hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add_circle
                    </span>
                    Add Service
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-md py-2 font-label-caps text-[10px] text-on-surface-variant uppercase">
                      Services
                    </th>
                    <th className="px-md py-2 font-label-caps text-[10px] text-on-surface-variant uppercase">
                      Variant
                    </th>
                    <th className="px-md py-2 font-label-caps text-[10px] text-on-surface-variant uppercase text-center">
                      Qty
                    </th>
                    <th className="px-md py-2 font-label-caps text-[10px] text-on-surface-variant uppercase">
                      Total Price
                    </th>
                    <th className="px-md py-2 font-label-caps text-[10px] text-on-surface-variant uppercase text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {activeOrder.products.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-md py-8 text-center text-on-surface-variant italic text-xs md:text-body-sm"
                      >
                        No products added to this order shopping cart.
                      </td>
                    </tr>
                  ) : (
                    activeOrder.products.map((p, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-surface-container-low transition-colors"
                      >
                        <td className="px-md py-3 font-bold text-on-surface text-xs md:text-[13px] align-middle">
                          <div className="flex items-center gap-2">
                            <span>{p.product}</span>
                            {p.deactive && (
                              <span className="bg-error/10 text-error text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                                Deactive {p.deactiveYear ? `(${formatDeactiveDate(p.deactiveYear)})` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-md py-3 text-[11px] font-semibold text-on-surface-variant align-middle whitespace-pre-wrap">
                          {p.variant}
                        </td>
                        <td className="px-md py-3 align-middle text-center">
                          <span className="font-bold text-on-surface text-[11px]">
                            {p.quantity || 1}
                          </span>
                        </td>
                        <td className="px-md py-3 align-middle">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">₹</span>
                            <input
                              type="number"
                              value={p.price !== undefined && p.price !== "" ? p.price : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const newPrice = val === "" ? "" : (parseFloat(val) || 0);
                                setActiveOrder(prev => {
                                  const updatedProducts = prev.products.map((item, i) => {
                                    if (i === idx) {
                                      return { ...item, price: newPrice };
                                    }
                                    return item;
                                  });
                                  const newTotalPrice = updatedProducts.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
                                  return {
                                    ...prev,
                                    products: updatedProducts,
                                    totalPrice: newTotalPrice
                                  };
                                });
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full pl-6 pr-2 py-1 bg-surface-container-low border border-outline-variant rounded font-black text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            />
                          </div>
                        </td>
                        <td className="px-md py-3 text-right align-middle">
                          <div className="flex justify-end gap-1 md:gap-sm">
                            <button
                              type="button"
                              onClick={() => openDeactiveModal(idx)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                p.deactive
                                  ? "text-error bg-error/10 hover:bg-error/20 border border-error/20"
                                  : "text-on-surface-variant bg-surface-container-high hover:text-error hover:bg-error/10 border border-outline-variant/40"
                              }`}
                              title={p.deactive ? `Deactive (${formatDeactiveDate(p.deactiveYear)})` : "Deactivate Service"}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {p.deactive ? "do_not_disturb_on" : "power_settings_new"}
                              </span>
                              <span>{p.deactive ? "Deactive" : "Deactivate"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openProductEdit(idx)}
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                              title="Edit Product"
                            >
                              <span className="material-symbols-outlined text-[18px] md:text-[20px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProduct(idx)}
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all cursor-pointer"
                              title="Delete Product"
                            >
                              <span className="material-symbols-outlined text-[18px] md:text-[20px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 4: Total + Submit */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-lg shadow-sm">
            <div className="flex items-center justify-between gap-md">

              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Price</p>
                <p className="text-xl font-black text-primary">₹{subtotal.toLocaleString()}</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-on-primary px-xl py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {saving ? "autorenew" : "check_circle"}
                </span>
                {saving
                  ? (isEditingOrder ? "Saving Changes..." : "Saving Order...")
                  : (isEditingOrder ? "Save Changes" : "Save & Place Order")}
              </button>

            </div>
          </div>

        </form>
      )}

      {/* Add Product Modal Popup inside New Order */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[800px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[90vh] flex flex-col">

            <div className="p-md md:p-lg space-y-md border-b border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-md text-on-surface">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px] md:text-[28px]">
                      add_shopping_cart
                    </span>
                  </div>
                  <div>
                    <h3 className="text-md md:text-h3 font-black tracking-tight">
                      {editingProductIdx !== null ? "Edit Service" : "Add Service"}
                    </h3>
                    <p className="text-primary text-[11px] md:text-body-sm font-bold">
                      {selectedCustomer?.name || (editingProductIdx !== null ? "Update Service" : "Configure Service")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeProductModal}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div ref={modalContentRef} className="p-md md:p-lg space-y-md md:space-y-lg overflow-y-auto custom-scrollbar pb-36">
              <div className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="space-y-sm">
                    <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                      Select Service
                    </label>
                    <SearchableSelect
                      name="product"
                      value={tempProduct.product}
                      options={allProducts.map(p => p.name)}
                      onChange={handleTempProductChange}
                      placeholder="Choose a Service"
                    />
                  </div>

                  <div className="space-y-sm animate-in fade-in duration-200">
                    <label className="text-[10px] text-primary uppercase tracking-widest font-black block">
                      Domain URL / Name <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={activeOrder.domainUrl || ""}
                      onChange={(e) => handleDomainUrlChange(e.target.value)}
                      placeholder="e.g. jayam.com"
                      className={`w-full h-[38px] bg-surface-container-low border rounded-lg px-md font-semibold text-sm outline-none focus:ring-1 text-on-surface placeholder:text-on-surface-variant/40 ${hasWwwPrefix(activeOrder.domainUrl)
                        ? "border-error focus:ring-error focus:border-error"
                        : "border-outline-variant focus:ring-primary focus:border-primary"
                        }`}
                    />
                    {hasWwwPrefix(activeOrder.domainUrl) && (
                      <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        Please remove www. from Domain URL / Name
                      </p>
                    )}
                  </div>
                </div>

                {tempProduct.product ? (
                  <div className="space-y-sm">
                    <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1 block">
                      Service Sub-Categories & Options
                    </label>

                    {selectedProduct?.subCategories && selectedProduct.subCategories.length > 0 ? (
                      <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-md space-y-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                          <div className="space-y-1">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black block mb-1">
                              Select Sub-Category
                            </label>
                            <select
                              value={selectedSubCategoryName}
                              onChange={(e) => handleSubCategorySelectChange(e.target.value)}
                              className="w-full h-[38px] bg-surface-container-lowest border border-outline-variant rounded-lg px-md font-semibold text-sm outline-none cursor-pointer text-on-surface focus:ring-1 focus:ring-primary focus:border-primary"
                            >
                              {selectedProduct.subCategories.map((sc) => (
                                <option key={sc.name} value={sc.name}>
                                  {sc.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {currentSubCat?.hasPlan && currentSubCat.plans?.length > 0 && (
                            <div className="space-y-1">
                              <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black block mb-1">
                                Select Plan
                              </label>
                              <select
                                value={selectedPlanName}
                                onChange={(e) => handlePlanSelectChange(e.target.value)}
                                className="w-full h-[38px] bg-surface-container-lowest border border-outline-variant rounded-lg px-md font-semibold text-sm outline-none cursor-pointer text-on-surface focus:ring-1 focus:ring-primary focus:border-primary"
                              >
                                {currentSubCat.plans.map((p) => (
                                  <option key={p.name} value={p.name}>
                                    {p.name} — ₹{p.sellerPrice || 0}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Price Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-md border-t border-outline-variant/20">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold block">
                                Selling Price (₹) <span className="text-error">*</span>
                              </label>
                              {currentSubCat?.oneTimePayment && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  One-Time Payment
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold text-sm">₹</span>
                              <input
                                type="number"
                                placeholder={currentSubCat?.oneTimePayment ? "Enter Selling Price (₹)" : "0"}
                                value={
                                  tempProduct.customSellerPrice !== undefined && tempProduct.customSellerPrice !== null && tempProduct.customSellerPrice !== ""
                                    ? tempProduct.customSellerPrice
                                    : (currentPlan ? currentPlan.sellerPrice || 0 : (currentSubCat?.sellerPrice !== null && currentSubCat?.sellerPrice !== undefined ? currentSubCat.sellerPrice : ""))
                                }
                                onChange={(e) => setTempProduct({ ...tempProduct, customSellerPrice: e.target.value })}
                                onFocus={(e) => e.target.select()}
                                className="w-full h-[38px] pl-7 pr-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-bold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-success"
                              />
                            </div>
                            {currentSubCat?.oneTimePayment && (
                              <p className="text-[11px] text-on-surface-variant italic mt-1">
                                Enter the one-time selling price agreed with the customer.
                              </p>
                            )}
                          </div>
                          {/* <div className="space-y-1">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold block">
                              Cost Price (₹) (Optional)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold text-sm">₹</span>
                              <input
                                type="number"
                                value={
                                  tempProduct.customCostPrice !== undefined && tempProduct.customCostPrice !== null && tempProduct.customCostPrice !== ""
                                    ? tempProduct.customCostPrice
                                    : (currentPlan ? currentPlan.costPrice || 0 : currentSubCat?.costPrice || 0)
                                }
                                onChange={(e) => setTempProduct({ ...tempProduct, customCostPrice: e.target.value })}
                                onFocus={(e) => e.target.select()}
                                className="w-full pl-7 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-bold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                              />
                            </div>
                          </div> */}
                        </div>
                      </div>
                    ) : (
                      <p className="text-on-surface-variant font-semibold text-[12px] mt-2 text-center">No Sub-Categories Available</p>
                    )
                    }

                    {/* Additional Option Toggle & Fields */}
                    {/* <div className="border-t border-outline-variant/30 pt-md mt-md space-y-md">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="toggleAdditionalOption"
                          checked={showAdditionalOption}
                          onChange={(e) => {
                            setShowAdditionalOption(e.target.checked);
                            if (!e.target.checked) {
                              setAdditionalFeatureName("");
                              setAdditionalFeaturePrice("");
                            }
                          }}
                          className="w-4 h-4 text-primary bg-surface-container-low border-outline-variant rounded focus:ring-primary cursor-pointer"
                        />
                        <label
                          htmlFor="toggleAdditionalOption"
                          className="text-xs font-bold text-on-surface hover:text-primary transition-colors cursor-pointer select-none"
                        >
                          Add Additional Option / Feature
                        </label>
                      </div>

                      {showAdditionalOption && (
                        <div className="space-y-md p-md bg-surface-container-low border border-primary/20 rounded-xl animate-in fade-in duration-200">
                          <div className="space-y-1">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold block">
                              Addition Feature
                            </label>
                            <textarea
                              rows="3"
                              placeholder="e.g. Extra Support"
                              value={additionalFeatureName}
                              onChange={(e) => setAdditionalFeatureName(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-2 font-bold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface placeholder:text-on-surface-variant/35 resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold block">
                              Price (₹)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold text-sm">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={additionalFeaturePrice}
                                onChange={(e) => setAdditionalFeaturePrice(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-bold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div> */}
                  </div>
                ) : (
                  <div className="py-8 text-center text-on-surface-variant text-xs italic bg-surface-container-low/30 border border-dashed border-outline-variant rounded-xl">
                    Please select a product from the list above.
                  </div>
                )}

                {/* Renewal & Deactive Options */}
                <div className="border-t border-outline-variant/30 pt-md mt-md space-y-md">
                  {/* Renewal Date Validation Toggle */}
                  {currentSubCatHasRenewal && tempProduct.validationEnabled && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="toggleRenewalModal"
                          checked={!!tempProduct.validationEnabled}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setTempProduct(prev => ({
                              ...prev,
                              validationEnabled: isChecked,
                              startDate: isChecked ? (prev.startDate || currentDate) : prev.startDate,
                              endDate: isChecked ? (prev.endDate || defaultEndDate) : prev.endDate,
                              years: isChecked ? (prev.years || 1) : prev.years
                            }));
                          }}
                          className="w-4 h-4 text-primary bg-surface-container-low border-outline-variant rounded focus:ring-primary cursor-pointer"
                        />
                        <label
                          htmlFor="toggleRenewalModal"
                          className="text-xs font-bold text-on-surface hover:text-primary transition-colors cursor-pointer select-none"
                        >
                          Renewal Based Service (Validity Dates)
                        </label>
                      </div>
                      <div className="flex gap-2 items-center">
  <label className="text-xs font-bold text-on-surface-variant">Billing Cycle:</label>
  <button
    type="button"
    onClick={() => {
      const newCycle = "yearly";
      setTempProduct(p => ({
        ...p,
        billingCycle: newCycle,
        endDate: calculateEndDate(p.startDate, newCycle)
      }));
    }}
    className={`px-3 py-1 rounded text-xs font-bold ${
      tempProduct.billingCycle === "yearly" ? "bg-primary text-white" : "bg-surface-variant"
    }`}
  >
    Yearly
  </button>
  <button
    type="button"
    onClick={() => {
      const newCycle = "monthly";
      setTempProduct(p => ({
        ...p,
        billingCycle: newCycle,
        endDate: calculateEndDate(p.startDate, newCycle)
      }));
    }}
    className={`px-3 py-1 rounded text-xs font-bold ${
      tempProduct.billingCycle === "monthly" ? "bg-primary text-white" : "bg-surface-variant"
    }`}
  >
    Monthly
  </button>
</div>

                      {tempProduct.validationEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                                                   <div className="space-y-sm">
                            <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                              {tempProduct.billingCycle === "monthly" ? "No. of Months" : "No. of Years"}
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={tempProduct.years !== undefined && tempProduct.years !== null ? tempProduct.years : 1}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                if (valStr === "") {
                                  setTempProduct(prev => ({ ...prev, years: "" }));
                                  return;
                                }
                                const count = parseFloat(valStr);
                                const numCount = isNaN(count) ? 1 : count;

                                if (tempProduct.billingCycle !== "monthly") {
                                  setTotalYears(numCount);
                                }

                                setTempProduct(prev => {
                                  let newEndDateObj;
                                  if (prev.billingCycle === "monthly") {
                                    // Calculate by Months
                                    const d = new Date(prev.startDate || currentDate);
                                    d.setMonth(d.getMonth() + Math.round(numCount));
                                    newEndDateObj = d;
                                  } else {
                                    // Calculate by Years
                                    newEndDateObj = addYearsToDate(prev.startDate || currentDate, numCount);
                                  }
                                  const newEndDateStr = newEndDateObj.toISOString().split("T")[0];
                                  return {
                                    ...prev,
                                    years: valStr,
                                    endDate: newEndDateStr
                                  };
                                });
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value) || 1;
                                if (tempProduct.billingCycle === "monthly") {
                                  const roundedMonths = Math.max(1, Math.round(val));
                                  setTempProduct(prev => {
                                    const d = new Date(prev.startDate || currentDate);
                                    d.setMonth(d.getMonth() + roundedMonths);
                                    return {
                                      ...prev,
                                      years: roundedMonths,
                                      endDate: d.toISOString().split("T")[0]
                                    };
                                  });
                                } else {
                                  const res = validateAndFixYears(val);
                                  if (res.adjusted) {
                                    toast.error(res.message, { id: "years-validation-modal" });
                                  }
                                  setTotalYears(res.years);
                                  setTempProduct(prev => {
                                    const newEndDateObj = addYearsToDate(prev.startDate || currentDate, res.years);
                                    const newEndDateStr = newEndDateObj.toISOString().split("T")[0];
                                    return {
                                      ...prev,
                                      years: res.years,
                                      endDate: newEndDateStr
                                    };
                                  });
                                }
                              }}
                              className="w-full h-[38px] bg-surface-container-lowest border border-outline-variant rounded-lg px-md font-semibold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                            />
                          </div> 

                          <div className="space-y-sm">
                            <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                              From Date
                            </label>
                            <CustomDatePicker
                              align="left"
                              value={tempProduct.startDate || currentDate}
                              onChange={(newStart) => {
                                setTempProduct(prev => {
                                  const yearsVal = parseFloat(prev.years) || 1;
                                  const res = validateAndFixYears(yearsVal);
                                  const newEndDateObj = addYearsToDate(newStart, res.years);
                                  const newEndDateStr = newEndDateObj.toISOString().split("T")[0];
                                  return {
                                    ...prev,
                                    startDate: newStart,
                                    endDate: newEndDateStr,
                                    years: res.years
                                  };
                                });
                              }}
                            />
                          </div>

                          <div className="space-y-sm">
                            <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                              End Date
                            </label>
                            <CustomDatePicker
                              align="right"
                              value={tempProduct.endDate || defaultEndDate}
                              onChange={(newEnd) => {
                                setTempProduct(prev => {
                                  const yearsVal = parseFloat(prev.years) || 1;
                                  const res = validateAndFixYears(yearsVal);
                                  const newStartDateObj = subtractYearsFromDate(newEnd, res.years);
                                  const newStartDateStr = newStartDateObj.toISOString().split("T")[0];
                                  return {
                                    ...prev,
                                    startDate: newStartDateStr,
                                    endDate: newEnd,
                                    years: res.years
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Deactive Toggle & Deactive Year */}
                  <div className="flex items-center gap-2 border-t border-outline-variant/20 pt-md">
                    <input
                      type="checkbox"
                      id="toggleDeactive"
                      checked={!!tempProduct.deactive}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setTempProduct(prev => ({
                          ...prev,
                          deactive: isChecked,
                          deactiveYear: isChecked ? prev.deactiveYear || currentDate : ""
                        }));
                      }}
                      className="w-4 h-4 text-primary bg-surface-container-low border-outline-variant rounded focus:ring-primary cursor-pointer"
                    />
                    <label
                      htmlFor="toggleDeactive"
                      className="text-xs font-bold text-on-surface hover:text-primary transition-colors cursor-pointer select-none"
                    >
                      Deactive (Inactive) Service
                    </label>
                  </div>

                  {tempProduct.deactive && (
                    <div className="space-y-sm animate-in fade-in duration-200">
                      <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                        Deactive Date
                      </label>
                      <input
                        type="date"
                        value={tempProduct.deactiveYear || currentDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTempProduct(prev => ({
                            ...prev,
                            deactiveYear: val
                          }));
                        }}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                        className="w-full h-[38px] bg-surface-container-low border border-outline-variant rounded-lg px-md font-semibold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface cursor-pointer"
                      />
                    </div>
                  )}
                </div>
                {/* Quantity and Selling Price Row */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md pt-2 border-t border-outline-variant/30">
                  <div className="space-y-sm">
                    <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                      Quantity
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={tempProduct.quantity}
                      onChange={(e) => setTempProduct({ ...tempProduct, quantity: e.target.value })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* <div className="space-y-sm">
                    <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                      Total Cost Price
                    </label>
                    <div className="bg-surface-container-low px-3 py-2 rounded-lg font-black text-base text-on-surface-variant">
                      ₹{computedPrices.finalCost.toLocaleString()}
                    </div>
                  </div> */}

                  <div className="space-y-sm">
                    <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                      Total Selling Price
                    </label>
                    <div className="bg-surface-container-low px-3 py-2 rounded-lg font-black text-base text-primary">
                      ₹{computedPrices.finalSeller.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* <div className="mt-2 inline-block rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 shadow-sm">
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Total Price :
                    </span>

                    <span className="text-lg font-black text-primary">
                      ₹{computedPrices.finalSeller.toLocaleString()}
                    </span>
                  </div>

                
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    {computedPrices.baseSeller > 0 && (
                      <span className="rounded-full bg-surface-container border border-outline-variant px-2.5 py-1 text-on-surface flex items-center gap-1">
                        <span className="opacity-70 font-semibold">Base:</span> ₹{computedPrices.baseSeller.toLocaleString()}
                      </span>
                    )}

                    {tempProduct.years > 0 && tempProduct.validationEnabled && (
                      <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/40 px-2.5 py-1 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1">
                        {tempProduct.years} {tempProduct.years === 1 ? "Yr" : "Yrs"}
                      </span>
                    )}

                    {tempProduct.product?.trim().toLowerCase() === "email hosting" &&
                      parseInt(totalEmails) > 0 && (
                        <span className="rounded-full bg-cyan-100 dark:bg-cyan-950/40 px-2.5 py-1 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900/50 flex items-center gap-1">
                          {parseInt(totalEmails)} Emails
                        </span>
                      )}

                    {parseInt(tempProduct.quantity) > 0 && (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                        {parseInt(tempProduct.quantity)} Qty
                      </span>
                    )}
                  </div>
                </div> */}
              </div>
            </div>

            <div className="p-md md:p-lg border-t border-outline-variant/30 bg-surface-container-low flex justify-end gap-sm shrink-0">
              <button
                type="button"
                onClick={closeProductModal}
                className="px-md py-2 bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProductAdd}
                className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                {editingProductIdx !== null ? "Save Changes" : "Submit"}
              </button>
            </div>

          </div>

          {/* Renewal Confirmation Popup */}
          {showRenewalConfirm && (
            <div className="fixed inset-0 z-110 flex items-center justify-center p-md bg-on-background/30 backdrop-blur-[2px] animate-in fade-in duration-200">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-lg space-y-md text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${tempProduct.validationEnabled ? "bg-primary/10 text-primary" : "bg-surface-variant text-on-surface-variant"
                    }`}>
                    <span className="material-symbols-outlined text-[28px]">
                      {tempProduct.validationEnabled ? "event_repeat" : "info"}
                    </span>
                  </div>

                  <h3 className="text-md font-black text-on-surface">
                    {tempProduct.validationEnabled
                      ? "This is a Renewal Based Service"
                      : "This is Not a Renewal Based Service"}
                  </h3>

                  <p className="text-xs text-on-surface-variant font-semibold">
                    {tempProduct.validationEnabled ? (
                      <>
                        Validity: {formatDeactiveDate(tempProduct.startDate)} to {formatDeactiveDate(tempProduct.endDate)}
                        {" "}({tempProduct.years || 1} {parseFloat(tempProduct.years) === 1 ? "Year" : "Years"})
                        <br />
                        Do you want to confirm and add this service to the order?
                      </>
                    ) : (
                      <>
                        No expiry / renewal dates will be tracked for this service.
                        <br />
                        Do you want to confirm and add this service to the order?
                      </>
                    )}
                  </p>
                </div>
                <div className="p-md border-t border-outline-variant/30 bg-surface-container-low flex justify-center gap-sm">
                  <button
                    type="button"
                    onClick={cancelRenewalConfirm}
                    className="px-lg py-2 bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmRenewalAdd}
                    className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Renewal Date Option Prompt */}
          {showRenewalDatePrompt && (
            <div className="fixed inset-0 z-110 flex items-center justify-center p-md bg-on-background/30 backdrop-blur-[2px] animate-in fade-in duration-200">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-lg space-y-md text-center">
                  <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[28px]">
                      event_repeat
                    </span>
                  </div>

                  <h3 className="text-md font-black text-on-surface">
                    Renewal Date option?
                  </h3>

                  <p className="text-xs text-on-surface-variant font-semibold">
                    Do you want to add a Renewal Date (validity dates) for this service?
                  </p>
                </div>
                <div className="p-md border-t border-outline-variant/30 bg-surface-container-low flex justify-center gap-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRenewalDatePrompt(false);
                      setPromptedForRenewal(true);
                      setTempProduct(prev => ({
                        ...prev,
                        validationEnabled: false
                      }));
                    }}
                    className="px-lg py-2 bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 transition-all cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRenewalDatePrompt(false);
                      setPromptedForRenewal(true);
                      // Show renewal details in the modal and scroll down
                      setTempProduct(prev => ({
                        ...prev,
                        validationEnabled: true,
                        startDate: prev.startDate || currentDate,
                        endDate: prev.endDate || defaultEndDate,
                        years: prev.years || 1
                      }));
                      setTimeout(() => {
                        if (modalContentRef.current) {
                          modalContentRef.current.scrollTo({
                            top: modalContentRef.current.scrollHeight,
                            behavior: "smooth"
                          });
                        }
                      }, 100);
                    }}
                    className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deactive Service Popup Modal */}
      {deactiveModal.isOpen && deactiveModal.productIdx !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md bg-on-background/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[450px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-on-surface relative z-[201]">
            {/* Modal Header */}
            <div className="p-md md:p-lg border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">do_not_disturb_on</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm md:text-base text-on-surface truncate">
                    Deactivate Service
                  </h3>
                  <p className="text-[11px] text-on-surface-variant font-semibold truncate">
                    {activeOrder.products[deactiveModal.productIdx]?.product}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeactiveModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-md md:p-lg space-y-md">
              {/* Toggle Deactive */}
              <div className="flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant/50 rounded-xl">
                <input
                  type="checkbox"
                  id="modalDeactiveToggle"
                  checked={!!deactiveModal.deactive}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDeactiveModal(prev => ({
                      ...prev,
                      deactive: checked,
                      deactiveYear: checked ? (prev.deactiveYear || currentDate) : ""
                    }));
                  }}
                  className="w-4 h-4 text-error bg-surface-container border-outline-variant rounded focus:ring-error cursor-pointer"
                />
                <label
                  htmlFor="modalDeactiveToggle"
                  className="text-xs font-bold text-on-surface hover:text-error transition-colors cursor-pointer select-none"
                >
                  Mark Service as Deactive (Inactive)
                </label>
              </div>

              {/* Date Selector */}
              {deactiveModal.deactive && (
                <div className="space-y-sm animate-in fade-in duration-200">
                  <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold block">
                    Select Deactive Date
                  </label>
                  <input
                    type="date"
                    value={deactiveModal.deactiveYear || currentDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeactiveModal(prev => ({
                        ...prev,
                        deactiveYear: val
                      }));
                    }}
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch (err) {
                        console.warn("showPicker not supported", err);
                      }
                    }}
                    className="w-full h-[42px] bg-surface-container-low border border-outline-variant rounded-xl px-md font-semibold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-md md:p-lg border-t border-outline-variant/30 flex items-center justify-end gap-sm bg-surface-container-low/30">
              <button
                type="button"
                onClick={closeDeactiveModal}
                className="px-md py-2 bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeactive}
                className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                Save Option
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Prompt Modal */}
      {showAddPaymentPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-md bg-on-background/30 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-lg space-y-md text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">
                  payments
                </span>
              </div>

              <h3 className="text-md font-black text-on-surface">
                Payment Not Added
              </h3>

              <p className="text-xs text-on-surface-variant font-semibold">
                No payment has been added for this order yet.<br />
                Do you want to add payment for this order now?
              </p>
            </div>
            <div className="p-md border-t border-outline-variant/30 bg-surface-container-low flex justify-center gap-sm">
              <button
                type="button"
                onClick={handleAddPaymentPromptNo}
                className="px-lg py-2 bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-lg hover:brightness-95 active:scale-95 transition-all cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleAddPaymentPromptYes}
                className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-md bg-on-background/30 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[480px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
              <div className="flex items-center gap-sm text-primary">
                <span className="material-symbols-outlined text-[24px]">payments</span>
                <div>
                  <h3 className="text-lg font-black text-on-surface">Record Payment</h3>
                  <p className="text-xs text-primary font-bold">
                    {savedOrderContext.customer?.name || selectedCustomer?.name}
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleSkipPayment} className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-md md:p-lg space-y-md overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-primary/5 p-md rounded-xl border border-primary/10 flex justify-between items-center">
                <span className="text-xs font-bold text-on-surface-variant">Order Total</span>
                <span className="text-lg font-black text-primary">
                  ₹{(savedOrderContext.order?.totalPrice || 0).toLocaleString()}
                </span>
              </div>

              <div className="space-y-sm">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) { } }}
                  className="w-full h-[42px] bg-surface-container-low border border-outline-variant rounded-xl px-md font-semibold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                />
              </div>

              {/* Payment Stage Selector with Smart Advance Locking */}
              {(() => {
                const alreadyHasAdvance = (activeOrder?.payments || []).some(p => p.paymentStage === 'advance');

                return (
                  <div className="space-y-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">Payment Stage</label>
                      {alreadyHasAdvance && (
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Advance Already Recorded
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: "full", label: "Full / Normal", icon: "check_circle" },
                        { id: "advance", label: "Advance", icon: "arrow_circle_right", disabled: alreadyHasAdvance },
                        { id: "mid", label: "Milestone", icon: "timelapse" },
                        { id: "final", label: "Final Balance", icon: "task_alt" }
                      ].map((stage) => (
                        <button
                          key={stage.id}
                          type="button"
                          disabled={stage.disabled}
                          onClick={() => setPaymentForm(prev => ({ ...prev, paymentStage: stage.id }))}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                            stage.disabled
                              ? "opacity-35 cursor-not-allowed bg-surface-container-low border-outline-variant/30 text-on-surface-variant line-through"
                              : paymentForm.paymentStage === stage.id
                                ? "bg-primary text-on-primary border-primary shadow-sm cursor-pointer"
                                : "bg-surface-container-low text-on-surface border-outline-variant/60 hover:bg-surface-variant cursor-pointer"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px] mb-0.5">{stage.icon}</span>
                          <span className="text-[11px] font-semibold">{stage.label}</span>
                        </button>
                      ))}
                    </div>
                    {alreadyHasAdvance && paymentForm.paymentStage === 'advance' && (
                      <p className="text-[11px] text-amber-600 font-bold">
                        ⚠️ Advance already paid for this order. Please choose Milestone or Final Balance.
                      </p>
                    )}
                    {paymentForm.paymentStage === 'advance' && !alreadyHasAdvance && (
                      <p className="text-[11px] text-amber-600 font-medium">
                        Advance Payment Milestone. An advance invoice can be issued.
                      </p>
                    )}
                    {paymentForm.paymentStage === 'mid' && (
                      <p className="text-[11px] text-blue-600 font-medium">
                        Milestone Part Payment. An installment invoice can be issued.
                      </p>
                    )}
                    {paymentForm.paymentStage === 'final' && (
                      <p className="text-[11px] text-emerald-600 font-medium">
                        Final Balance Payment. A Consolidated Invoice showing all previous payments can be generated.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-sm">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  placeholder="Enter amount..."
                  className="w-full h-[42px] bg-surface-container-low border border-outline-variant rounded-xl px-md font-black text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">GST Option</label>
                <div className="grid grid-cols-2 gap-sm p-1 bg-surface-container-low border border-outline-variant rounded-xl">
                  <button type="button" onClick={() => setPaymentForm(prev => ({ ...prev, withGst: false }))} className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${!paymentForm.withGst ? "bg-primary text-on-primary shadow-sm" : "text-on-surface hover:bg-surface-variant/50"}`}>
                    Without GST
                  </button>
                  <button type="button" onClick={() => setPaymentForm(prev => ({ ...prev, withGst: true }))} className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${paymentForm.withGst ? "bg-primary text-on-primary shadow-sm" : "text-on-surface hover:bg-surface-variant/50"}`}>
                    With GST
                  </button>
                </div>
              </div>

              {paymentForm.withGst && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-sm">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">State</label>
                    <div className={`w-full h-[42px] bg-surface-container border rounded-xl px-md font-semibold text-sm flex items-center gap-xs ${paymentForm.state ? 'border-outline-variant text-on-surface' : 'border-error/50 text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">location_on</span>
                      <span className={paymentForm.state ? 'text-on-surface' : 'text-on-surface-variant italic'}>
                        {paymentForm.state || 'No state on file'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-sm">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">GSTIN <span className="text-error">*</span></label>
                    <input
                      type="text"
                      value={paymentForm.gstin}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, gstin: e.target.value }))}
                      placeholder="Enter GSTIN..."
                      className={`w-full h-[42px] bg-surface-container-low border rounded-xl px-md font-semibold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono ${paymentForm.gstin.trim() ? 'border-outline-variant text-on-surface' : 'border-error/50 text-on-surface-variant'}`}
                    />
                  </div>
                </div>
              )}


              {/* TDS Option */}
<div className="space-y-sm">
  <div className="flex items-center justify-between">
    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
      TDS Deduction
    </label>

    <button
      type="button"
      onClick={() =>
        setPaymentForm(prev => ({
          ...prev,
          applyTds: !prev.applyTds,
          tdsAmount: !prev.applyTds ? prev.tdsAmount : "",
        }))
      }
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
        paymentForm.applyTds
          ? "bg-primary"
          : "bg-surface-variant"
      }`}
      aria-label="Toggle TDS deduction"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          paymentForm.applyTds
            ? "translate-x-4"
            : "translate-x-0.5"
        }`}
      />
    </button>
  </div>

  {paymentForm.applyTds && (
    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-2">
        TDS Amount (₹)
      </label>

      <input
        type="number"
        min="0"
        step="0.01"
        value={paymentForm.tdsAmount}
        onChange={(e) =>
          setPaymentForm(prev => ({
            ...prev,
            tdsAmount: e.target.value,
          }))
        }
        onFocus={(e) => e.target.select()}
        placeholder="Enter TDS amount..."
        className="w-full h-[42px] bg-surface-container-low border border-outline-variant rounded-xl px-md font-black text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
      />
    </div>
  )}
</div>

              <div className="space-y-sm">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">Description (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Payment notes..."
                  className="w-full h-[42px] bg-surface-container-low border border-outline-variant rounded-xl px-md font-semibold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                />
              </div>

              {paymentForm.amount && (() => {
                const amt = Number(paymentForm.amount) || 0;
                const cgst = amt * (gstRates.cgst / 100);
                const sgst = amt * (gstRates.sgst / 100);
                const igst = amt * (gstRates.igst / 100);

               const total = paymentForm.withGst
  ? (
      paymentForm.state === "Tamil Nadu"
        ? amt + cgst + sgst
        : amt + igst
    )
  : amt;

const tds = paymentForm.applyTds
  ? Number(paymentForm.tdsAmount) || 0
  : 0;

const netAmount = Math.max(0, total - tds);

// Round total exactly like invoice PDF
const integerPart = Math.floor(total);
const decimalPart = Number((total - integerPart).toFixed(2));

const roundedTotal =
  decimalPart >= 0.50
    ? integerPart + 1
    : integerPart;



const fmt = (n) =>
  Number(n.toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

return (
  <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 space-y-1 text-xs">
    <div className="flex justify-between font-bold text-on-surface-variant">
      <span>Base Amount:</span>
      <span>₹{fmt(amt)}</span>
    </div>

    {paymentForm.withGst && (
      paymentForm.state === "Tamil Nadu" ? (
        <>
          <div className="flex justify-between text-on-surface-variant">
            <span>CGST ({gstRates.cgst}%):</span>
            <span>₹{fmt(cgst)}</span>
          </div>

          <div className="flex justify-between text-on-surface-variant">
            <span>SGST ({gstRates.sgst}%):</span>
            <span>₹{fmt(sgst)}</span>
          </div>
        </>
      ) : paymentForm.state ? (
        <div className="flex justify-between text-on-surface-variant">
          <span>IGST ({gstRates.igst}%):</span>
          <span>₹{fmt(igst)}</span>
        </div>
      ) : null
    )}

    <div className="flex justify-between font-black text-primary pt-2 border-t border-outline-variant/30 text-sm">
      <span>Total:</span>
      <span>₹{fmt(total)}</span>
    </div>

    {paymentForm.applyTds && tds > 0 && (
      <>
        <div className="flex justify-between text-on-surface-variant">
          <span>Less: TDS Deducted by Customer:</span>
          <span>₹{fmt(tds)}</span>
        </div>

        <div className="flex justify-between font-black text-primary pt-2 border-t border-outline-variant/30 text-sm">
          <span>Net Amount Received:</span>
          <span>₹{fmt(netAmount)}</span>
        </div>
      </>
    )}
  </div>
);
              })()}
            </div>

            <div className="p-md md:p-lg border-t border-outline-variant/30 bg-surface-container-low flex justify-end gap-sm shrink-0">
              <button
                type="button"
                onClick={handlePaymentSubmit}
                disabled={recordingPayment}
                className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-xs"
              >
                {recordingPayment ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Payment Invoice Confirmation Prompt Modal */}
      {partialPromptModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-md bg-on-background/30 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-lg space-y-md">
              <div className="flex items-center gap-md text-on-surface">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[28px]">
                    receipt_long
                  </span>
                </div>
                <div>
                  <h3 className="font-h3 text-h3 text-[18px] leading-tight font-black tracking-tight">Partial Payment Invoice</h3>
                  <p className="text-primary font-bold text-xs mt-0.5">{savedOrderContext.customer?.name || selectedCustomer?.name}</p>
                </div>
              </div>

              <div className="py-sm space-y-2">
                <p className="text-sm font-semibold text-on-surface-variant leading-relaxed">
                  This order is partially paid. Do you want to generate an invoice for this paid amount (₹{(partialPromptModal.paidAmount || 0).toLocaleString()})?
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low px-lg py-sm flex justify-end gap-sm border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setPartialPromptModal({ isOpen: false, paidAmount: 0, nextInvoiceNo: "" })}
                className="px-lg py-2 rounded-lg font-bold text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextNo = partialPromptModal.nextInvoiceNo;
                  setPartialPromptModal({ isOpen: false, paidAmount: 0, nextInvoiceNo: "" });
                  setInvoiceModal({
                    isOpen: true,
                    step: "actions",
                    customInvoiceNo: nextNo,
                    paymentStatus: "Paid",
                    isSaving: false,
                    pdfBlob: null,
                    pdfUrl: null,
                    filename: "",
                  });
                }}
                className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-surface-container-lowest border border-outline-variant rounded-2xl w-full ${invoiceModal.step === "share" ? "max-w-[850px] h-[85vh]" : "max-w-[500px]"} overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] transition-all`}>
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
              <div className="flex items-center gap-sm text-primary">
                <span className="material-symbols-outlined text-[24px]">
                  {invoiceModal.step === "actions" ? "receipt_long" : "description"}
                </span>
                <div>
                  <h3 className="text-lg font-black text-on-surface">
                    {invoiceModal.step === "actions" ? "Invoice Options" : "Invoice Preview"}
                  </h3>
                  <p className="text-xs text-primary font-bold">
                    {savedOrderContext.customer?.name || selectedCustomer?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {invoiceModal.step === "share" && (
                  <>
                    <button type="button" onClick={handleDownloadInvoice} title="Download Invoice" className="w-9 h-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all active:scale-95 cursor-pointer">
                      <span className="material-symbols-outlined text-[20px]">download</span>
                    </button>
                    <button type="button" onClick={handleEmailInvoice} title="Share via Email" className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary hover:brightness-110 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </button>
                  </>
                )}
                <button type="button" onClick={handleFinishOrder} title="Finish" className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors cursor-pointer text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="p-md md:p-lg space-y-lg overflow-y-auto custom-scrollbar flex-1">
              {invoiceModal.step === "actions" && (
                <div className="space-y-md">
                  <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-md space-y-2 text-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">Domain / Service</span>
                      <span className="font-bold text-on-surface truncate max-w-[220px]">{savedOrderContext.order?.domainUrl}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">Payment Date</span>
                      <span className="font-bold text-on-surface">{paymentForm.paymentDate}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant">Tax Configuration</span>
                      <span className="font-bold text-primary">{paymentForm.withGst ? "With GST" : "Without GST"}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceModal.customInvoiceNo || ""}
                      onChange={(e) => setInvoiceModal(prev => ({ ...prev, customInvoiceNo: e.target.value }))}
                      placeholder="e.g. JT019-07-2026"
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono font-bold text-sm shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      onClick={handleGenerateInvoicePreview}
                      disabled={invoiceModal.isSaving}
                      className="cursor-pointer flex-1 h-10 px-4 bg-primary text-on-primary rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {invoiceModal.isSaving ? (
                        <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">
                            visibility
                          </span>
                          Generate Invoice
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {invoiceModal.step === "share" && (
                <div className="flex flex-col h-full space-y-md">
                  <div className="flex-1 w-full border border-outline-variant rounded-xl overflow-hidden shadow-inner bg-surface-container-low min-h-[450px] h-full">
                    {invoiceModal.pdfUrl ? (
                      <iframe src={`${invoiceModal.pdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-0 min-h-[450px]" title="Invoice Preview" />
                    ) : (
                      <div className="flex items-center justify-center h-full min-h-[450px] text-xs text-on-surface-variant">Generating preview...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compose Payment Confirmation Email Modal */}
      {isComposeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[600px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between shrink-0">
              <div className="flex items-center gap-md text-primary min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
                  <span className="material-symbols-outlined text-[22px]">mail</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black tracking-tight text-on-surface truncate">Compose Payment Confirmation</h3>
                  <p className="text-[11px] text-on-surface-variant font-medium truncate mt-0.5 animate-pulse">Verify or edit payment confirmation email before sending</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-md overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Available Placeholders */}
              <div className="p-md bg-primary/5 rounded-xl border border-primary/10 space-y-2">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Available Placeholders (click to insert at cursor)</span>
                <div className="flex flex-wrap gap-xs">
                  {[
                    { label: 'Customer Name', value: '[customerName]' },
                    { label: 'Product Name', value: '[product]' },
                    { label: 'Domain URL', value: '[domainUrl]' },
                    { label: 'Price', value: '[price]' },
                    { label: 'Price in Words', value: '[priceWords]' },
                    { label: 'Start Date', value: '[startDate]' },
                    { label: 'End Date', value: '[endDate]' }
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleInsertPlaceholderCompose(p.value, 'body')}
                      className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer border border-outline-variant/40 flex items-center gap-1 select-none active:scale-95"
                      title={`Insert ${p.value}`}
                    >
                      <span className="text-[9px] font-medium text-on-surface-variant/80">{p.label}:</span>
                      <span className="text-primary">{p.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Subject</label>
                <input
                  id="compose-subject-input-no"
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-inner"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Message Content</label>
                <textarea
                  id="compose-body-textarea-no"
                  value={composeBody}
                  rows={10}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-2xl p-lg text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono leading-relaxed shadow-inner"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-surface-container-low px-lg py-sm flex justify-end gap-sm border-t border-outline-variant/30 shrink-0">
              <button
                type="button"
                onClick={() => setIsComposeModalOpen(false)}
                className="px-lg py-2 font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingPaymentEmail}
                onClick={handleSendComposeEmail}
                className="px-xl py-2 bg-primary text-on-primary font-bold rounded-lg transition-all active:scale-[0.98] text-xs shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer disabled:opacity-60 flex items-center gap-xs"
              >
                {sendingPaymentEmail ? (
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">send</span>
                )}
                {sendingPaymentEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewOrder;
