import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";
import toast from "react-hot-toast";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  emailInvoice,
  deleteOrder
} from "../api/customerApi";
import { generateInvoicePdf, verifyInvoiceNumber, getNextInvoiceNumber, getInvoices, deleteInvoice } from "../api/invoiceApi";
import { sendPaymentConfirmationEmailApi, getPaymentConfirmationSettings } from "../api/paymentConfirmationApi";
import { getTemplate } from "../api/templateApi";
import { getProducts } from "../api/productApi";
import { getGstSettings } from "../api/gstSettingsApi";
import Addproject from "./AddProject/Addproject";

const getCatalogPrices = (p) => {
  return {
    selling: p.price || 0,
    cost: p.costPrice || 0
  };
};

const WORLD_COUNTRIES = [
  "India", "United States", "United Kingdom", "United Arab Emirates", "Australia", "Canada",
  "Singapore", "Germany", "France", "Japan", "Saudi Arabia", "Malaysia", "Qatar", "Oman",
  "Kuwait", "Bahrain", "New Zealand", "China", "Hong Kong", "South Africa", "Italy", "Spain",
  "Netherlands", "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Belgium",
  "Austria", "Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru", "Egypt", "Nigeria",
  "Kenya", "Ghana", "Thailand", "Vietnam", "Indonesia", "Philippines", "South Korea", "Taiwan",
  "Sri Lanka", "Bangladesh", "Nepal", "Pakistan", "Maldives", "Mauritius", "Russia", "Turkey",
  "Israel", "Jordan", "Lebanon", "Cyprus", "Greece", "Portugal", "Poland", "Czech Republic",
  "Hungary", "Romania", "Ukraine"
];

const SearchableSelect = ({ name, value, options, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = React.useRef(null);
  const listRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt =>
      opt.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectOption = (opt) => {
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (["ArrowDown", "ArrowUp", "Enter", "Escape", " "].includes(e.key)) {
      e.stopPropagation();
    }

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0 ? 0 : (prev + 1) % filteredOptions.length
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0
          ? 0
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <div
        tabIndex={disabled ? -1 : 0}
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md outline-none cursor-pointer text-sm flex justify-between items-center focus:ring-2 focus:ring-primary focus:border-primary"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? "text-on-surface font-semibold" : "text-on-surface-variant/60"}>
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
              placeholder="Search country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div ref={listRef} className="max-h-[200px] overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className={`px-md py-2 text-sm cursor-pointer transition-colors font-medium ${highlightedIndex === idx
                      ? 'bg-primary/20 text-primary font-bold'
                      : value === opt
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-on-surface hover:bg-surface-container-low'
                    }`}
                  onClick={() => handleSelectOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
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

const Customers = ({ isWebsiteOnly = false }) => {
  const navigate = useNavigate();
  const currentDate = new Date().toISOString().split("T")[0];

  const formatAmount = (value) => {
    return Number(value || 0).toFixed(2);
  };

  const [sendingPaymentEmailId, setSendingPaymentEmailId] = useState(null);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeCustomerId, setComposeCustomerId] = useState("");
  const [composeOrderId, setComposeOrderId] = useState("");
  const [composePaymentId, setComposePaymentId] = useState("");
  const [sendingPaymentEmail, setSendingPaymentEmail] = useState(false);
  const [pendingPostPaymentInvoiceAction, setPendingPostPaymentInvoiceAction] = useState(null);

  const handleSendPaymentConfirmationEmail = async (customerId, orderId, paymentId, targetCustomer = null, targetOrder = null) => {
    setSendingPaymentEmailId(paymentId);
    const toastId = toast.loading("Loading template...");
    try {
      let template = null;
      try {
        template = await getTemplate('Payment');
      } catch (err) {
        console.warn("Could not load Payment template, using default", err);
      }

      const rawSubject = template?.subject || "Payment Confirmation – Renewal of [Service Name] – Paid";
      const rawContent = template?.content || `Jayam Web Solutions\n\nThank you for your payment.\n\nWe are pleased to confirm that the payment for the renewal of [Service Name] has been successfully received.`;

      const customer = targetCustomer || selectedCustomer || {};
      const order = targetOrder || customer.orders?.find(o => String(o._id) === String(orderId)) || {};
      const payment = (order.payments || []).find(p => String(p._id) === String(paymentId)) || (order.payments && order.payments.length > 0 ? order.payments[order.payments.length - 1] : null);

      const isPartialOrUpdated = order.paymentStatus === "Partially Paid" || payment?.paymentType === "updated";

      let activeProds = (order.products || []).filter(p => !p.deactive);
      if (isPartialOrUpdated) {
        const noValProds = activeProds.filter(p => p.validationEnabled === false || !p.validationEnabled);
        if (noValProds.length > 0) {
          activeProds = noValProds;
        }
      }

      const serviceName = activeProds.length > 0
        ? activeProds.map(p => p.productName || p.product).filter(Boolean).join(', ')
        : (order.products && order.products.length > 0 ? order.products.map(p => p.productName || p.product).filter(Boolean).join(', ') : 'Services');

      // Format domain URL with www. prefix if needed
      const rawDomain = order.domainUrl || '';
      const domUrl = rawDomain.split(',').map(d => {
        let clean = d.trim().replace(/^https?:\/\//i, '');
        if (clean && clean.includes('.') && !clean.toLowerCase().startsWith('www.')) {
          clean = 'www.' + clean;
        }
        return clean;
      }).filter(Boolean).join(', ');

      // Format dates
      const formatRenewalDate = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [y, m, d] = parts;
          return `${d}.${m}.${y}`;
        }
        return dateStr;
      };
      const startDate = order.startDate ? formatRenewalDate(order.startDate) : '';
      const endDateFormatted = order.endDate ? formatRenewalDate(order.endDate) : '';

      const orderPrice = order.totalPrice || 0;
      const numToWords = (num) => {
        if (!num || isNaN(num)) return '';
        num = Number(num);
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
      const priceWords = numToWords(orderPrice);

      const replaceAll = (text, isSubject = false) => {
        if (!text) return "";
        const subjectServiceName = serviceName.length > 20 ? serviceName.slice(0, 20).trim() + "..." : serviceName;
        const prod = isSubject ? subjectServiceName : serviceName;
        return text
          .replace(/\[Customer Name\]/gi, customer.name || 'Customer')
          .replace(/\[customerName\]/gi, customer.name || 'Customer')
          .replace(/\[Service Name\]/gi, prod)
          .replace(/\[ServiceName\]/gi, prod)
          .replace(/\[product\]/gi, prod)
          .replace(/\[Product\]/gi, prod)
          .replace(/www\.\[domainUrl\]/gi, domUrl)
          .replace(/\[domainUrl\]/gi, domUrl)
          .replace(/\[Domain Name\]/gi, domUrl)
          .replace(/\[domainName\]/gi, domUrl)
          .replace(/\[domain\]/gi, domUrl)
          .replace(/www\.www\./gi, 'www.')
          .replace(/\[price\]words/gi, priceWords)
          .replace(/\[priceWords\]/gi, priceWords)
          .replace(/\[price\]/gi, orderPrice ? `${Number(orderPrice).toLocaleString('en-IN')}` : '0')
          .replace(/\[startDate\]/gi, startDate)
          .replace(/\[endDate\]/gi, endDateFormatted)
          .replace(/\[product\s*tables?\]|\[productTable\]|\[product_table\]/gi, serviceName);
      };

      setComposeSubject(replaceAll(rawSubject, true));
      setComposeBody(replaceAll(rawContent, false));
      setComposeCustomerId(customerId);
      setComposeOrderId(orderId);
      setComposePaymentId(paymentId);
      setIsComposeModalOpen(true);
      toast.dismiss(toastId);
    } catch (error) {
      console.error("Load payment email template error:", error);
      toast.error("Failed to load email template", { id: toastId });
    } finally {
      setSendingPaymentEmailId(null);
    }
  };

  const handleCloseComposeModal = () => {
    setIsComposeModalOpen(false);
    if (pendingPostPaymentInvoiceAction) {
      const action = pendingPostPaymentInvoiceAction;
      setPendingPostPaymentInvoiceAction(null);
      setTimeout(() => {
        action();
      }, 200);
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
      handleCloseComposeModal();
    } catch (error) {
      console.error("Failed to send compose email:", error);
      toast.error(error.response?.data?.message || "Failed to send email", { id: toastId });
    } finally {
      setSendingPaymentEmail(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .format(new Date(dateString))
      .replace(/\//g, "-");
  };

  const getOneYearLater = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return 0;
    if (dateStr instanceof Date) return dateStr.getTime();
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
    const normalizedStr = dateStr.toString().replace(/\//g, "-");
    const parts = normalizedStr.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      if (!isNaN(d.getTime())) {
        return d.getTime();
      }
    }
    return 0;
  };

  const getLatestOrder = (customer) => {
    if (!customer.orders || customer.orders.length === 0) return null;
    let latest = customer.orders[0];
    let latestTime = parseDate(latest.orderDate || latest.createdAt);
    for (let i = 1; i < customer.orders.length; i++) {
      const order = customer.orders[i];
      const time = parseDate(order.orderDate || order.createdAt);
      if (time > latestTime) {
        latest = order;
        latestTime = time;
      }
    }
    return latest;
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


  const [view, setView] = useState("list"); // 'list' or 'form'
  const [activeTab, setActiveTab] = useState("customer"); // 'customer', 'service', 'payment'
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleteOrderModalOpen, setIsDeleteOrderModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderToDeleteCustomer, setOrderToDeleteCustomer] = useState(null);
  const [isDeleteInvoiceModalOpen, setIsDeleteInvoiceModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageInput, setCustomerPageInput] = useState(1);
  useEffect(() => {
    setCustomerPageInput(customerPage);
  }, [customerPage]);
  const CUST_PAGE_SIZE = 15;
  const [lastOrderSort, setLastOrderSort] = useState("desc");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [emailHighlightedIndex, setEmailHighlightedIndex] = useState(0);
  const emailListRef = React.useRef(null);
  const [gstRates, setGstRates] = useState({ cgst: 9, sgst: 9, igst: 18 });
  const emailDropdownRef = React.useRef(null);
  const [isNewCustomerConfirmed, setIsNewCustomerConfirmed] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [downloadModalConfig, setDownloadModalConfig] = useState({
    isOpen: false,
    order: null,
    customer: null,
    selectedOrderIds: [],
    withGst: false,
    state: "Tamil Nadu",
    gstin: "",
    invoiceDate: currentDate,
    isSaving: false,
    step: "config",
    pdfBlob: null,
    pdfUrl: null,
    filename: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    contactPerson: "",
    country: "",
    state: "Tamil Nadu",
    gstin: "",
    address: "",
    notes: "",
    orders: [],
  });

  const matchingEmailCustomers = useMemo(() => {
    if (!formData.email) return [];
    const q = formData.email.toLowerCase();
    return customers.filter((c) =>
      Array.isArray(c.email)
        ? c.email.some((e) => e.toLowerCase().includes(q))
        : c.email.toLowerCase().includes(q)
    );
  }, [customers, formData.email]);

  useEffect(() => {
    setEmailHighlightedIndex(0);
  }, [formData.email, showEmailDropdown]);

  useEffect(() => {
    if (showEmailDropdown && emailListRef.current) {
      const activeEl = emailListRef.current.children[emailHighlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [emailHighlightedIndex, showEmailDropdown]);

  const handleEmailKeyDown = (e) => {
    if (isEditing) return;

    if (!showEmailDropdown) {
      if (formData.email && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setShowEmailDropdown(true);
      }
      return;
    }

    const totalItems = matchingEmailCustomers.length > 0 ? matchingEmailCustomers.length : 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setEmailHighlightedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setEmailHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matchingEmailCustomers.length > 0) {
        const targetCustomer = matchingEmailCustomers[emailHighlightedIndex] || matchingEmailCustomers[0];
        if (targetCustomer) {
          openEditForm(targetCustomer);
          setShowEmailDropdown(false);
        }
      } else {
        setIsNewCustomerConfirmed(true);
        setShowEmailDropdown(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowEmailDropdown(false);
    }
  };

  const [countryOptions, setCountryOptions] = useState(WORLD_COUNTRIES);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("https://countriesnow.space/api/v0.1/countries/positions");
        if (res.ok) {
          const json = await res.json();
          if (json && !json.error && Array.isArray(json.data)) {
            const names = json.data.map(c => c.name).filter(Boolean);
            names.sort((a, b) => a.localeCompare(b));
            if (names.length > 0) {
              setCountryOptions(names);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch countries API, using fallback list:", err);
      }
    };
    fetchCountries();
  }, []);

  const [countryFilter, setCountryFilter] = useState("All");
  const [companyNames, setCompanyNames] = useState([""]);
  const [addresses, setAddresses] = useState([""]);
  const [defaultNameIndex, setDefaultNameIndex] = useState(0);
  const [defaultAddressIndex, setDefaultAddressIndex] = useState(0);
  const [deleteConfig, setDeleteConfig] = useState({
    isOpen: false,
    type: "", // "name" | "address"
    index: null,
  });
  const reorderArray = (arr, defaultIdx) => {
    if (defaultIdx === 0 || defaultIdx >= arr.length) return arr;
    const newArr = [...arr];
    const [selected] = newArr.splice(defaultIdx, 1);
    newArr.unshift(selected);
    return newArr;
  };

  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    if (isEditing && formData._id) {
      const fetchCustomerInvoices = async () => {
        setLoadingInvoices(true);
        try {
          const invoices = await getInvoices(formData._id);
          const filtered = (invoices || []).filter(inv => {
            const cId = inv.customerId?._id || inv.customerId;
            return String(cId) === String(formData._id);
          });
          setCustomerInvoices(filtered);
        } catch (err) {
          console.warn("Failed to fetch invoices for customer:", err);
          setCustomerInvoices([]);
        } finally {
          setLoadingInvoices(false);
        }
      };
      fetchCustomerInvoices();
    }
  }, [isEditing, formData._id]);

  const handleViewPaymentInvoice = async (payment) => {
    const primaryOrder = formData.orders?.find(o => String(o._id) === String(payment.orderId)) || formData.orders?.[payment.orderIdx] || formData.orders?.[0];
    if (!primaryOrder) {
      toast.error("Order not found for this payment");
      return;
    }
    const selIds = (payment.selectedOrderIds?.length > 0)
      ? payment.selectedOrderIds.map(String)
      : (payment.orderId ? [String(payment.orderId)] : [String(primaryOrder._id)]);

    const paymentOrders = (formData.orders || []).filter(o => selIds.includes(String(o._id)));
    const combinedProducts = paymentOrders.length > 0
      ? paymentOrders.flatMap(o => o.products || [])
      : (payment.products || primaryOrder.products || []);
    const combinedDomainUrl = paymentOrders.length > 0
      ? Array.from(new Set(paymentOrders.map(o => o.domainUrl).filter(Boolean))).join(', ')
      : (payment.domainUrl || primaryOrder.domainUrl || "");

    const paymentData = {
      paymentId: payment._id || `${primaryOrder._id}_pay_${payment.date}`,
      amount: payment.amount,
      description: payment.description || "",
      date: payment.date,
      withGst: payment.withGst,
      paymentType: payment.paymentType,
      products: combinedProducts,
      domainUrl: combinedDomainUrl,
      orderId: primaryOrder._id,
      selectedOrderIds: selIds
    };
    const toastId = toast.loading("Loading invoice preview...");
    try {
      const invoiceType = payment.withGst ? "withGST" : "withoutGST";
      const invDate = payment.date ? payment.date.split("T")[0] : currentDate;
      let invNo = await getNextInvoiceNumber(invoiceType, invDate);

      const blob = await generateInvoicePdf(
        formData._id,
        primaryOrder._id,
        invoiceType,
        invDate,
        selIds,
        paymentData,
        invNo,
        "Paid"
      );
      toast.dismiss(toastId);
      const url = window.URL.createObjectURL(blob);
      setInvoicePreviewModal({
        isOpen: true,
        invoiceNo: invNo || "Preview",
        url,
        blob,
      });
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error("Failed to load invoice preview");
    }
  };

  const handleDownloadPaymentInvoice = async (payment) => {
    const primaryOrder = formData.orders?.find(o => String(o._id) === String(payment.orderId)) || formData.orders?.[payment.orderIdx] || formData.orders?.[0];
    if (!primaryOrder) {
      toast.error("Order not found for this payment");
      return;
    }
    const selIds = (payment.selectedOrderIds?.length > 0)
      ? payment.selectedOrderIds.map(String)
      : (payment.orderId ? [String(payment.orderId)] : [String(primaryOrder._id)]);

    const paymentOrders = (formData.orders || []).filter(o => selIds.includes(String(o._id)));
    const combinedProducts = paymentOrders.length > 0
      ? paymentOrders.flatMap(o => o.products || [])
      : (payment.products || primaryOrder.products || []);
    const combinedDomainUrl = paymentOrders.length > 0
      ? Array.from(new Set(paymentOrders.map(o => o.domainUrl).filter(Boolean))).join(', ')
      : (payment.domainUrl || primaryOrder.domainUrl || "");

    const paymentData = {
      paymentId: payment._id || `${primaryOrder._id}_pay_${payment.date}`,
      amount: payment.amount,
      description: payment.description || "",
      date: payment.date,
      withGst: payment.withGst,
      paymentType: payment.paymentType,
      products: combinedProducts,
      domainUrl: combinedDomainUrl,
      orderId: primaryOrder._id,
      selectedOrderIds: selIds
    };
    const toastId = toast.loading("Generating invoice PDF...");
    try {
      const invoiceType = payment.withGst ? "withGST" : "withoutGST";
      const invDate = payment.date ? payment.date.split("T")[0] : currentDate;
      let invNo = await getNextInvoiceNumber(invoiceType, invDate);

      const blob = await generateInvoicePdf(
        formData._id,
        primaryOrder._id,
        invoiceType,
        invDate,
        selIds,
        paymentData,
        invNo,
        "Paid"
      );
      toast.dismiss(toastId);
      const url = window.URL.createObjectURL(blob);
      const filename = buildFilename(formData.name, invNo, payment.withGst);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");
      if (formData._id) {
        getInvoices(formData._id).then(invs => {
          const filtered = (invs || []).filter(inv => String(inv.customerId?._id || inv.customerId) === String(formData._id));
          setCustomerInvoices(filtered);
        });
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error("Failed to download invoice");
    }
  };

  const handleSharePaymentInvoice = (payment) => {
    const primaryOrder = formData.orders?.find(o => o._id === payment.orderId) || formData.orders?.[payment.orderIdx] || formData.orders?.[0];
    openActionModal(primaryOrder, formData, payment);
  };

  const handleDownloadCustomerInvoice = async (inv) => {
    try {
      const toastId = toast.loading(`Preparing invoice ${inv.invoiceNo}...`);
      const targetOrderId = inv.orderId || (inv.items && inv.items[0]?.orderId) || (formData.orders && formData.orders[0]?._id) || null;
      const selectedOrderIds = (inv.items && inv.items.length > 0)
        ? inv.items.map(item => item.orderId).filter(Boolean)
        : null;

      const custId = inv.customerId?._id || inv.customerId || formData._id;

      const blob = await generateInvoicePdf(
        custId,
        targetOrderId,
        inv.invoiceType || 'withGST',
        inv.invoiceDate || currentDate,
        selectedOrderIds,
        null,
        inv.invoiceNo,
        inv.paymentStatus || 'Paid'
      );
      toast.dismiss(toastId);
      const url = window.URL.createObjectURL(blob);
      let invNo = inv.invoiceNo;
      if (!invNo) {
        try {
          invNo = await getNextInvoiceNumber(inv.invoiceType || 'withGST', inv.invoiceDate || currentDate);
        } catch (_) { }
      }
      const cleanCompany = (inv.customerName || formData.name || "Customer").replace(/[\s\/\\]+/g, "");
      const isWithGst = inv.invoiceType === 'withGST';
      const filename = isWithGst
        ? (invNo ? `TAX-Invoice-${cleanCompany}-${invNo}.pdf` : `TAX-Invoice-${cleanCompany}.pdf`)
        : (invNo ? `${cleanCompany.toLowerCase()}-${invNo}.pdf` : `${cleanCompany.toLowerCase()}.pdf`);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download invoice");
    }
  };

  const [invoicePreviewModal, setInvoicePreviewModal] = useState({
    isOpen: false,
    invoiceNo: "",
    url: null,
    blob: null,
  });

  const handleViewCustomerInvoice = async (inv) => {
    try {
      const toastId = toast.loading(`Preparing preview for invoice ${inv.invoiceNo}...`);
      const targetOrderId = inv.orderId || (inv.items && inv.items[0]?.orderId) || (formData.orders && formData.orders[0]?._id) || null;
      const selectedOrderIds = (inv.items && inv.items.length > 0)
        ? inv.items.map(item => item.orderId).filter(Boolean)
        : null;

      const custId = inv.customerId?._id || inv.customerId || formData._id;

      const blob = await generateInvoicePdf(
        custId,
        targetOrderId,
        inv.invoiceType || 'withGST',
        inv.invoiceDate || currentDate,
        selectedOrderIds,
        null,
        inv.invoiceNo,
        inv.paymentStatus || 'Paid'
      );
      toast.dismiss(toastId);
      const url = window.URL.createObjectURL(blob);
      setInvoicePreviewModal({
        isOpen: true,
        invoiceNo: inv.invoiceNo,
        url,
        blob,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice preview");
    }
  };

  const handleShareCustomerInvoice = async (inv) => {
    const toastId = toast.loading(`Preparing invoice ${inv.invoiceNo || ""} to share...`);
    try {
      const targetOrderId = inv.orderId || (inv.items && inv.items[0]?.orderId) || (formData.orders && formData.orders[0]?._id) || null;
      const selectedOrderIds = (inv.items && inv.items.length > 0)
        ? inv.items.map(item => item.orderId).filter(Boolean)
        : null;

      const custId = inv.customerId?._id || inv.customerId || formData._id;
      const targetCustomer = (inv.customerId && typeof inv.customerId === 'object' && inv.customerId._id)
        ? inv.customerId
        : (selectedCustomer || formData);

      console.log("targetCustomer", targetCustomer);
      console.log("selectedOrderIds", selectedOrderIds);
      console.log("targetOrderId", targetOrderId)
      console.log("inv", inv);
      console.log("custId", custId);

      const pdfBlob = await generateInvoicePdf(
        custId,
        targetOrderId,
        inv.invoiceType || 'withGST',
        inv.invoiceDate || currentDate,
        selectedOrderIds,
        null,
        inv.invoiceNo,
        inv.paymentStatus || 'Paid'
      );

      const isWithGst = inv.invoiceType === 'withGST';
      const filename = buildFilename(targetCustomer?.name || inv.customerName, inv.invoiceNo, isWithGst);
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      toast.dismiss(toastId);

      setDownloadModalConfig({
        isOpen: true,
        order: null,
        customer: targetCustomer,
        selectedOrderIds: selectedOrderIds || [],
        paymentData: null,
        withGst: isWithGst,
        state: targetCustomer?.state || "Tamil Nadu",
        gstin: targetCustomer?.gstin || "",
        invoiceDate: inv.invoiceDate ? inv.invoiceDate.split("T")[0] : currentDate,
        customInvoiceNo: inv.invoiceNo || "",
        isExistingInvoice: true,
        paymentStatus: inv.paymentStatus || "Paid",
        isSaving: false,
        step: "share",
        pdfBlob,
        pdfUrl,
        filename,
      });
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error("Failed to prepare invoice for sharing");
    }
  };

  const handleEditCustomerInvoice = (inv) => {
    const selectedOrderIds = (inv.items && inv.items.length > 0)
      ? inv.items.map(item => item.orderId).filter(Boolean)
      : (inv.orderIds || (inv.orderId ? [inv.orderId] : []));

    const targetCustomer = selectedCustomer || formData;
    const isWithGst = inv.invoiceType === 'withGST';

    setDownloadModalConfig({
      isOpen: true,
      order: null,
      customer: targetCustomer,
      selectedOrderIds: selectedOrderIds || [],
      paymentData: null,
      withGst: isWithGst,
      state: targetCustomer?.state || "Tamil Nadu",
      gstin: targetCustomer?.gstin || "",
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.split("T")[0] : currentDate,
      customInvoiceNo: inv.invoiceNo || "",
      isExistingInvoice: true,
      paymentStatus: inv.paymentStatus || "Paid",
      isSaving: false,
      step: "config",
      pdfBlob: null,
      pdfUrl: null,
      filename: "",
    });
  };

  const handleDeleteCustomerInvoice = (inv) => {
    setInvoiceToDelete(inv);
    setIsDeleteInvoiceModalOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      await deleteInvoice(invoiceToDelete._id);
      toast.success(`Invoice ${invoiceToDelete.invoiceNo || ''} deleted successfully!`);
      setIsDeleteInvoiceModalOpen(false);
      setInvoiceToDelete(null);
      refreshCustomerInvoices();
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      toast.error(err.response?.data?.message || "Failed to delete invoice");
    }
  };

  const [isOrderViewModalOpen, setIsOrderViewModalOpen] = useState(false);
  const [isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [orderPaymentEdit, setOrderPaymentEdit] = useState({
    amount: "",
    orderIdx: null,
    status: "Fully Paid",
    withGst: false,
    paymentType: "base",
  });

  const [isHistoryPaymentModalOpen, setIsHistoryPaymentModalOpen] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
  const [customerInvoicePrompt, setCustomerInvoicePrompt] = useState({
    isOpen: false,
    title: "",
    message: "",
    config: null,
  });
  const [historyPaymentEdit, setHistoryPaymentEdit] = useState({
    selectedOrderIndices: [],
    orderIdx: "",
    paymentType: "base",
    paymentStage: "full",
    amount: "",
    renewalCostPrice: "",
    status: "Fully Paid",
    withGst: false,
    state: "",
    gstin: "",
    paymentDate: currentDate,
    newStartDate: currentDate,
    newEndDate: getOneYearLater(currentDate),
    description: "",
  });

  const openHistoryPaymentModal = () => {
    const orders = formData.orders || [];
    const partiallyPaidIndices = orders
      .map((o, i) => (o.paymentStatus === "Partially Paid" && o.products?.some(p => p.validationEnabled === false || !p.validationEnabled) ? i : null))
      .filter(i => i !== null);
    const unpaidIndices = orders
      .map((o, i) => (o.paymentStatus !== "Fully Paid" && o.products?.some(p => p.validationEnabled === false || !p.validationEnabled) ? i : null))
      .filter(i => i !== null);

    const targetIndices = partiallyPaidIndices.length > 0 ? partiallyPaidIndices : unpaidIndices;
    const allPaid = unpaidIndices.length === 0 && orders.length > 0;
    const initialPaymentType = allPaid ? "updated" : "base";

    const updatedIndices = orders
      .map((o, i) => (o.products?.some(p => p.validationEnabled === false || !p.validationEnabled) ? i : null))
      .filter(i => i !== null);

    const initialSelIndices = allPaid
      ? (updatedIndices.length > 0 ? [updatedIndices[0]] : (orders.length > 0 ? [0] : []))
      : (targetIndices.length > 0 ? targetIndices : (orders.length > 0 ? [0] : []));

    let initialAmount = 0;
    if (!allPaid) {
      initialSelIndices.forEach(idx => {
        const ord = orders[idx];
        if (ord) {
          const totalPaid = (ord.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
          const bal = Math.max(0, (ord.totalPrice || 0) - totalPaid);
          initialAmount += bal > 0 ? bal : (ord.totalPrice || 0);
        }
      });
    }

    setHistoryPaymentEdit({
      selectedOrderIndices: initialSelIndices,
      orderIdx: initialSelIndices.length > 0 ? initialSelIndices[0].toString() : "",
      paymentType: initialPaymentType,
      paymentStage: "full",
      amount: initialAmount > 0 ? Number(initialAmount.toFixed(2)).toString() : "",
      renewalCostPrice: "",
      status: "Fully Paid",
      withGst: false,
      state: "",
      gstin: formData.gstin || "",
      paymentDate: currentDate,
      newStartDate: currentDate,
      newEndDate: getOneYearLater(currentDate),
      description: "",
    });
    setIsHistoryPaymentModalOpen(true);
  };

  const [allProducts, setAllProducts] = useState([]);

  const handleOpenPaymentDetailModal = (payment) => {
    const orders = formData.orders || [];
    const matchedOrder = orders.find((o, idx) =>
      idx === payment.orderIdx || String(o._id) === String(payment.orderId)
    );
    const orderToUse = matchedOrder || null;
    const orderPayments = orderToUse?.payments || [payment];
    const totalPaid = orderPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOrderPrice = orderToUse?.totalPrice || totalPaid;
    const balanceDue = Math.max(0, totalOrderPrice - totalPaid);
    const orderIdx = orders.findIndex(o => String(o._id) === String(orderToUse?._id));

    setSelectedPaymentDetail({
      payment,
      order: orderToUse,
      orderIdx: orderIdx >= 0 ? orderIdx : (payment.orderIdx || 0),
      paymentsList: orderPayments,
      totalOrderPrice,
      totalPaid,
      balanceDue,
      customer: formData
    });
  };

  const handleOpenOrderPaymentManagement = (order, orderIdx) => {
    if (!order) return;
    const orders = formData.orders || [];
    const idx = (orderIdx !== undefined && orderIdx >= 0)
      ? orderIdx
      : orders.findIndex(o => String(o._id) === String(order._id));

    const orderPayments = order.payments || [];
    const totalPaid = orderPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOrderPrice = order.totalPrice || 0;
    const balanceDue = Math.max(0, totalOrderPrice - totalPaid);
    const latestPayment = orderPayments.length > 0 ? orderPayments[orderPayments.length - 1] : {
      amount: 0,
      date: order.orderDate || currentDate,
      paymentStage: 'full',
      paymentType: 'base',
      description: ''
    };

    setSelectedPaymentDetail({
      payment: latestPayment,
      order,
      orderIdx: idx >= 0 ? idx : 0,
      paymentsList: orderPayments,
      totalOrderPrice,
      totalPaid,
      balanceDue,
      customer: formData
    });
  };

  const handleQuickPayBalance = (detail) => {
    setSelectedPaymentDetail(null);
    const ordIdx = detail.orderIdx >= 0 ? detail.orderIdx : 0;
    const order = detail.order || formData.orders?.[ordIdx];
    const alreadyHasAdvance = (order?.payments || []).some(p => p.paymentStage === 'advance');
    const defaultStage = alreadyHasAdvance ? 'final' : 'full';

    setHistoryPaymentEdit({
      selectedOrderIndices: [ordIdx],
      orderIdx: String(ordIdx),
      paymentType: "base",
      paymentStage: defaultStage,
      amount: String(detail.balanceDue > 0 ? Number(detail.balanceDue.toFixed(2)) : ""),
      renewalCostPrice: "",
      status: "Fully Paid",
      withGst: false,
      state: formData.state || "",
      gstin: formData.gstin || "",
      paymentDate: currentDate,
      newStartDate: currentDate,
      newEndDate: getOneYearLater(currentDate),
      description: `Balance settlement for ${order?.domainUrl || "services"}`,
    });
    setIsHistoryPaymentModalOpen(true);
  };

  const handleDownloadFromDetailModal = (detail) => {
    setSelectedPaymentDetail(null);
    const targetOrder = detail.order || (detail.orderIdx !== undefined ? formData.orders?.[detail.orderIdx] : null);
    if (!targetOrder) return;

    const isFullyPaid = (detail.balanceDue === 0);
    const orderPayments = targetOrder.payments || [];
    const latestPayment = detail.payment || orderPayments[orderPayments.length - 1];

    const isFinalStage = isFullyPaid || latestPayment?.paymentStage === 'final';
    const isInstStage = ['advance', 'mid'].includes(latestPayment?.paymentStage);
    const invCat = isFinalStage ? 'consolidated' : (isInstStage ? 'installment' : 'regular');

    const paymentDataObj = {
      paymentId: latestPayment?._id || `${targetOrder._id}_pay_${latestPayment?.date || currentDate}`,
      amount: isFinalStage ? (targetOrder.totalPrice || detail.totalPaid) : (latestPayment?.amount || detail.totalPaid),
      description: latestPayment?.description || "",
      date: latestPayment?.date || currentDate,
      withGst: !!latestPayment?.withGst,
      paymentType: latestPayment?.paymentType || "base",
      paymentStage: latestPayment?.paymentStage || (isFinalStage ? 'final' : 'full'),
      invoiceCategory: invCat,
      includePaymentHistory: isFinalStage,
      products: targetOrder.products || [],
      domainUrl: targetOrder.domainUrl,
      orderId: targetOrder._id,
      selectedOrderIds: [String(targetOrder._id)],
    };

    setDownloadModalConfig({
      isOpen: true,
      order: targetOrder,
      customer: formData,
      selectedOrderIds: [String(targetOrder._id)],
      paymentData: isFinalStage ? null : paymentDataObj,
      withGst: !!latestPayment?.withGst,
      state: formData.state || "Tamil Nadu",
      gstin: formData.gstin || "",
      invoiceDate: latestPayment?.date || currentDate,
      customInvoiceNo: "",
      paymentStatus: isFullyPaid ? "Paid" : "Partially Paid",
      isSaving: false,
      step: "actions",
      pdfBlob: null,
      pdfUrl: null,
      filename: "",
    });
  };

  const allPayments = React.useMemo(() => {
    const list = [];
    if (!formData.orders) return list;
    formData.orders.forEach((order, orderIdx) => {
      if (order.payments && Array.isArray(order.payments)) {
        order.payments.forEach((payment, paymentIdx) => {
          list.push({
            ...payment,
            orderIdx,
            paymentIdx,
            orderId: order._id,
            domainUrl: order.domainUrl,
            products: order.products,
            orderDate: order.orderDate,
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [formData.orders]);

  useEffect(() => {
    if (!downloadModalConfig.isOpen && downloadModalConfig.pdfUrl) {
      window.URL.revokeObjectURL(downloadModalConfig.pdfUrl);
      setDownloadModalConfig((prev) => ({ ...prev, pdfUrl: null }));
    }
    return () => {
      if (downloadModalConfig.pdfUrl) {
        window.URL.revokeObjectURL(downloadModalConfig.pdfUrl);
      }
    };
  }, [downloadModalConfig.isOpen, downloadModalConfig.pdfUrl]);

  useEffect(() => {
    const handleClickOutsideEmail = (event) => {
      if (emailDropdownRef.current && !emailDropdownRef.current.contains(event.target)) {
        setShowEmailDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideEmail);
    return () => document.removeEventListener("mousedown", handleClickOutsideEmail);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.customerId && customers.length > 0) {
      const customer = customers.find((c) => String(c._id) === String(location.state.customerId));
      if (customer) {
        if (location.state.editMode) {
          openEditForm(customer);
          // If a specific tab is requested (e.g. 'invoice' from Reminders), switch to it
          if (location.state.activeTab) {
            setActiveTab(location.state.activeTab);
          }
        } else {
          setSelectedCustomer(customer);
          setIsViewModalOpen(true);
        }
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, customers]);

  useEffect(() => {
    if (location.state?.action === "add") {
      openAddForm();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersData, productsData, gstData] = await Promise.all([
        getCustomers(),
        getProducts(),
        getGstSettings().catch(() => null)
      ]);
      setCustomers(customersData);
      setAllProducts(productsData);
      if (gstData) {
        setGstRates({
          cgst: gstData.cgstPercentage || 9,
          sgst: gstData.sgstPercentage || 9,
          igst: gstData.igstPercentage || 18
        });
      }
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const availableCountries = useMemo(() => {
    const set = new Set();
    set.add("India");
    customers.forEach((c) => {
      if (c.country && c.country.trim()) {
        set.add(c.country.trim());
      }
    });
    return ["All", ...Array.from(set).sort()];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const getLastOrderTime = (customer) => {
      const latestOrder = getLatestOrder(customer);
      return latestOrder ? parseDate(latestOrder.orderDate || latestOrder.createdAt) : 0;
    };

    return customers
      .filter((customer) => {
        if (isWebsiteOnly) {
          const hasWebsite = customer.orders?.some((order) =>
            order.products?.some((p) => p.product?.toLowerCase()?.includes("website"))
          );
          if (!hasWebsite) return false;
        }

        if (countryFilter !== "All") {
          const custCountry = (customer.country || "").trim().toLowerCase();
          if (custCountry !== countryFilter.toLowerCase()) return false;
        }

        const search = searchQuery.trim().toLowerCase();
        const emailStr = Array.isArray(customer.email) ? customer.email.join(', ') : (customer.email || "");
        const phoneStr = Array.isArray(customer.phone) ? customer.phone.join(', ') : (customer.phone || "");
        const countryStr = customer.country || "";
        return (
          customer.name.toLowerCase().includes(search) ||
          emailStr.toLowerCase().includes(search) ||
          phoneStr.toLowerCase().includes(search) ||
          countryStr.toLowerCase().includes(search) ||
          customer.orders?.some((order) =>
            (order.domainUrl && order.domainUrl.toLowerCase().includes(search)) ||
            order.products?.some((p) => p.product?.toLowerCase().includes(search))
          )
        );
      });
  }, [customers, searchQuery, isWebsiteOnly, countryFilter]);

  useEffect(() => {
    setCustomerPage(1);
  }, [searchQuery, countryFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const cleaned = value.replace(/[^0-9,\s+-]/g, "");
      setFormData({ ...formData, [name]: cleaned });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSavingCustomer) return;

    const orderedNames = reorderArray(companyNames, defaultNameIndex);
    const orderedAddresses = reorderArray(addresses, defaultAddressIndex);

    const joinedNames = orderedNames.map(n => n.trim()).filter(Boolean).join("; ");
    const joinedAddresses = orderedAddresses.map(a => a.trim()).filter(Boolean).join("; ");

    const missingFields = [];
    if (!formData.email?.trim()) missingFields.push("Email");
    if (!joinedNames) missingFields.push("Company Name");
    if (!formData.phone?.trim()) missingFields.push("Phone");
    if (!formData.country?.trim()) missingFields.push("Country");
    if (!formData.state?.trim()) missingFields.push("State");
    if (!joinedAddresses) missingFields.push("Address");

    if (missingFields.length > 0) {
      toast.error(`Please fill in required field(s): ${missingFields.join(", ")}.`);
      return;
    }

    setIsSavingCustomer(true);

    const dataToSave = {
      name: joinedNames,
      phone: formData.phone,
      email: formData.email,
      contactPerson: formData.contactPerson,
      country: formData.country || "",
      state: formData.state,
      gstin: formData.gstin,
      address: joinedAddresses,
      notes: formData.notes,
      orders: formData.orders,
    };

    try {
      let updatedCust;
      if (isEditing) {
        updatedCust = await updateCustomer(editingId, dataToSave);
      } else {
        updatedCust = await createCustomer(dataToSave);
      }

      toast.success(
        isEditing
          ? "Customer profile updated successfully!"
          : "Customer saved successfully!"
      );

      fetchData();
      if (updatedCust) {
        setEditingId(updatedCust._id);
        setIsEditing(true);
        const parsedNames = (updatedCust.name || "").split(";").map(n => n.trim()).filter(Boolean);
        const parsedAddrs = (updatedCust.address || "").split(";").map(a => a.trim()).filter(Boolean);
        setCompanyNames(parsedNames.length > 0 ? parsedNames : [""]);
        setAddresses(parsedAddrs.length > 0 ? parsedAddrs : [""]);
        setDefaultNameIndex(0);
        setDefaultAddressIndex(0);
        setFormData({
          ...updatedCust,
          email: Array.isArray(updatedCust.email) ? updatedCust.email.join(', ') : (updatedCust.email || ""),
          phone: Array.isArray(updatedCust.phone) ? updatedCust.phone.join(', ') : (updatedCust.phone || ""),
          contactPerson: updatedCust.contactPerson || "",
          country: updatedCust.country || "",
          state: updatedCust.state || "Tamil Nadu",
          gstin: updatedCust.gstin || "",
          address: updatedCust.address || "",
          notes: updatedCust.notes || "",
          orders: updatedCust.orders || [],
        });
        setActiveTab("service");
      } else {
        closeForm();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save customer");
      console.error(error);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const openAddForm = () => {
    setCompanyNames([""]);
    setAddresses([""]);
    setDefaultNameIndex(0);
    setDefaultAddressIndex(0);
    setFormData({
      name: "",
      phone: "",
      email: "",
      contactPerson: "",
      country: "",
      state: "",
      gstin: "",
      address: "",
      notes: "",
      orders: [],
    });
    setIsEditing(false);
    setIsNewCustomerConfirmed(false);
    setActiveTab("customer");
    setView("form");
  };

  const openEditForm = (customer) => {
    const names = (customer.name || "").split(";").map(n => n.trim()).filter(Boolean);
    const addrs = (customer.address || "").split(";").map(a => a.trim()).filter(Boolean);
    setCompanyNames(names.length > 0 ? names : [""]);
    setAddresses(addrs.length > 0 ? addrs : [""]);
    setDefaultNameIndex(0);
    setDefaultAddressIndex(0);
    setFormData({
      ...customer,
      email: Array.isArray(customer.email) ? customer.email.join(', ') : (customer.email || ""),
      phone: Array.isArray(customer.phone) ? customer.phone.join(', ') : (customer.phone || ""),
      contactPerson: customer.contactPerson || "",
      country: customer.country || "",
      state: customer.state || "",
      gstin: customer.gstin || "",
      address: customer.address || "",
      notes: customer.notes || "",
      orders: customer.orders || [],
    });
    setEditingId(customer._id);
    setIsEditing(true);
    setActiveTab("customer");
    setView("form");
  };

  const closeForm = () => {
    setView("list");
    setIsEditing(false);
    setEditingId(null);
    setIsNewCustomerConfirmed(false);
    setIsSavingCustomer(false);
  };

  const handleHeaderNewOrderClick = async () => {
    if (isEditing) {
      navigate(`/new-order/${editingId}`, { state: { fromWebsite: isWebsiteOnly } });
    } else {
      if (isSavingCustomer) return;
      const orderedNames = reorderArray(companyNames, defaultNameIndex);
      const orderedAddresses = reorderArray(addresses, defaultAddressIndex);
      const joinedNames = orderedNames.map(n => n.trim()).filter(Boolean).join("; ");
      const joinedAddresses = orderedAddresses.map(a => a.trim()).filter(Boolean).join("; ");
      const missingFields = [];
      if (!formData.email?.trim()) missingFields.push("Email");
      if (!joinedNames) missingFields.push("Company Name");
      if (!formData.phone?.trim()) missingFields.push("Phone");
      if (!formData.country?.trim()) missingFields.push("Country");
      if (!formData.state?.trim()) missingFields.push("State");
      if (!joinedAddresses) missingFields.push("Address");

      if (missingFields.length > 0) {
        toast.error(`Please fill in required field(s) first: ${missingFields.join(", ")}.`);
        return;
      }

      setIsSavingCustomer(true);

      const dataToSave = {
        name: joinedNames,
        phone: formData.phone,
        email: formData.email,
        contactPerson: formData.contactPerson,
        country: formData.country || "",
        state: formData.state || "Tamil Nadu",
        gstin: formData.gstin || "",
        address: joinedAddresses || "",
        notes: formData.notes || "",
        orders: [],
      };

      try {
        const newCustomer = await createCustomer(dataToSave);
        toast.success("Customer profile created successfully!");
        fetchData();
        navigate(`/new-order/${newCustomer._id}`, { state: { fromWebsite: isWebsiteOnly } });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to create customer");
        console.error(error);
      } finally {
        setIsSavingCustomer(false);
      }
    }
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteCustomer(customerToDelete._id);
      toast.success("Customer profile deleted");
      fetchData();
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      toast.error("Failed to delete customer");
      console.error(error);
    }
  };

  const handleDeleteOrderClickApi = (order, customer) => {
    setOrderToDelete(order);
    setOrderToDeleteCustomer(customer);
    setIsDeleteOrderModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    try {
      if (orderToDeleteCustomer) {
        const customerId = orderToDeleteCustomer._id || editingId;
        const updatedCustomer = await deleteOrder(customerId, orderToDelete._id);
        toast.success("Order deleted successfully!");

        setSelectedCustomer(updatedCustomer);

        if (view === "form" && editingId === customerId) {
          setFormData({
            ...formData,
            orders: updatedCustomer.orders,
          });
        }
      }
      setIsDeleteOrderModalOpen(false);
      setOrderToDelete(null);
      setOrderToDeleteCustomer(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete order");
      console.error(error);
    }
  };

  const openActionModal = async (order, customer, payment = null) => {
    let existingInvoice = null;
    let withGst = false;
    let invoiceDate = currentDate;
    let step = "config";

    const targetCustomer = customer || selectedCustomer || formData;
    const allOrders = targetCustomer?.orders || formData.orders || [];

    let primaryOrder = order;
    let paymentData = null;

    if (payment) {
      if (!primaryOrder && payment.orderId) {
        primaryOrder = allOrders.find(o => String(o._id) === String(payment.orderId));
      }
      if (!primaryOrder && payment.orderIdx !== undefined && allOrders[payment.orderIdx]) {
        primaryOrder = allOrders[payment.orderIdx];
      }
      if (!primaryOrder && allOrders.length > 0) {
        primaryOrder = allOrders[0];
      }

      const selIds = (payment.selectedOrderIds?.length > 0)
        ? payment.selectedOrderIds.map(String)
        : (payment.orderId ? [String(payment.orderId)] : [String(primaryOrder?._id)]);

      const paymentOrders = allOrders.filter(o => selIds.includes(String(o._id)));
      const combinedProducts = paymentOrders.length > 0
        ? paymentOrders.flatMap(o => o.products || [])
        : (payment.products || primaryOrder?.products || []);
      const combinedDomainUrl = paymentOrders.length > 0
        ? Array.from(new Set(paymentOrders.map(o => o.domainUrl).filter(Boolean))).join(', ')
        : (payment.domainUrl || primaryOrder?.domainUrl || "");

      paymentData = {
        paymentId: payment._id || `${primaryOrder?._id || 'order'}_pay_${payment.paymentIdx !== undefined ? payment.paymentIdx : payment.date}`,
        amount: payment.amount,
        description: payment.description || "",
        date: payment.date,
        withGst: payment.withGst,
        paymentType: payment.paymentType,
        products: combinedProducts,
        domainUrl: combinedDomainUrl,
        orderId: primaryOrder?._id,
        selectedOrderIds: selIds
      };

      withGst = payment.withGst !== undefined ? payment.withGst : false;
      invoiceDate = payment.date ? payment.date.split("T")[0] : currentDate;
    } else {
      if (!primaryOrder && allOrders.length > 0) {
        primaryOrder = allOrders[0];
      }
    }

    let initialSelectedIds = [];
    if (paymentData && paymentData.selectedOrderIds && paymentData.selectedOrderIds.length > 0) {
      initialSelectedIds = paymentData.selectedOrderIds;
    } else if (primaryOrder && primaryOrder._id) {
      initialSelectedIds = [String(primaryOrder._id)];
    } else {
      initialSelectedIds = allOrders.map(o => String(o._id));
    }

    setDownloadModalConfig({
      isOpen: true,
      order: primaryOrder,
      customer: targetCustomer,
      selectedOrderIds: initialSelectedIds,
      paymentData,
      withGst,
      state: targetCustomer?.state || "Tamil Nadu",
      gstin: targetCustomer?.gstin || "",
      invoiceDate: invoiceDate,
      customInvoiceNo: existingInvoice?.invoiceNo || "",
      paymentStatus: existingInvoice?.paymentStatus || "Paid",
      isSaving: false,
      step,
      pdfBlob: null,
      filename: "",
    });
  };

  useEffect(() => {
    if (!downloadModalConfig.isOpen) return;
    // Skip auto-generating a new invoice number when editing an existing invoice
    if (downloadModalConfig.isExistingInvoice) return;
    const updateInvoiceNo = async () => {
      const invoiceType = downloadModalConfig.withGst ? "withGST" : "withoutGST";
      try {
        const nextNo = await getNextInvoiceNumber(invoiceType, downloadModalConfig.invoiceDate || currentDate);
        setDownloadModalConfig(prev => ({
          ...prev,
          customInvoiceNo: nextNo
        }));
      } catch (err) {
        console.warn("Error updating invoice number preview:", err);
      }
    };
    updateInvoiceNo();
  }, [downloadModalConfig.isOpen, downloadModalConfig.withGst, downloadModalConfig.invoiceDate, downloadModalConfig.isExistingInvoice]);

  const toggleSelectOrder = (orderId) => {
    setDownloadModalConfig((prev) => {
      const current = (prev.selectedOrderIds || []).map(String);
      const targetId = String(orderId);
      const updated = current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId];
      return { ...prev, selectedOrderIds: updated };
    });
  };

  const toggleSelectAllOrders = () => {
    setDownloadModalConfig((prev) => {
      const allOrders = prev.customer?.orders || formData.orders || [];
      const allIds = allOrders.map((o) => String(o._id));
      const current = (prev.selectedOrderIds || []).map(String);
      const isAllSelected = current.length === allIds.length;
      return {
        ...prev,
        selectedOrderIds: isAllSelected ? [] : allIds,
      };
    });
  };

  const refreshCustomerInvoices = async () => {
    const custId = formData._id || downloadModalConfig.customer?._id;
    if (!custId) return;
    try {
      const invoices = await getInvoices(custId);
      const filtered = (invoices || []).filter(inv => {
        const cId = inv.customerId?._id || inv.customerId;
        return String(cId) === String(custId);
      });
      setCustomerInvoices(filtered);
    } catch (err) {
      console.warn("Failed to refresh invoices:", err);
    }
  };

  const handleConfigSubmit = async (e) => {
    if (e) e.preventDefault();
    const { order, customer, withGst, state, gstin, selectedOrderIds, paymentData } = downloadModalConfig;

    if (!paymentData && (!selectedOrderIds || selectedOrderIds.length === 0)) {
      toast.error("Please select at least one service/order to generate invoice.");
      return;
    }

    if (withGst && !gstin.trim()) {
      toast.error("GSTIN is required for GST invoices.");
      return;
    }

    if (withGst) {
      if (state !== customer.state || gstin !== customer.gstin) {
        setDownloadModalConfig((prev) => ({ ...prev, isSaving: true }));
        try {
          const updatedData = { ...customer, state, gstin };
          await updateCustomer(customer._id, updatedData);

          const updatedCustomer = { ...customer, state, gstin };
          setCustomers((prev) =>
            prev.map((c) => (c._id === customer._id ? updatedCustomer : c))
          );

          if (formData._id === customer._id) {
            setFormData((prev) => ({ ...prev, state, gstin }));
          }
          if (selectedCustomer && selectedCustomer._id === customer._id) {
            setSelectedCustomer((prev) => ({ ...prev, state, gstin }));
          }

          toast.success("Customer tax details updated");
          setDownloadModalConfig((prev) => ({
            ...prev,
            customer: updatedCustomer,
            step: "actions",
            isSaving: false,
          }));
          return;
        } catch (error) {
          toast.error("Failed to update customer details");
          console.error(error);
          setDownloadModalConfig((prev) => ({ ...prev, isSaving: false }));
          return;
        }
      }
    }

    setDownloadModalConfig((prev) => ({
      ...prev,
      step: "actions",
    }));
  };

  const buildFilename = (customerName, invoiceNo, withGst) => {
    if (withGst) {
      // TAX-Invoice-Microcore-JT016-06-2026.pdf  (name case preserved)
      const slug = (customerName || "Invoice").replace(/\s+/g, "");
      return invoiceNo ? `TAX-Invoice-${slug}-${invoiceNo}.pdf` : `TAX-Invoice-${slug}.pdf`;
    }
    // subhadeveloper-3233-JWS-07-2026.pdf  (lowercase, no spaces)
    const slug = (customerName || "invoice").replace(/\s+/g, "").toLowerCase();
    return invoiceNo ? `${slug}-${invoiceNo}.pdf` : `${slug}.pdf`;
  };

  const handleDownloadInvoice = async () => {
    const { order, customer, withGst, invoiceDate, selectedOrderIds, paymentData } = downloadModalConfig;
    const invoiceType = withGst ? "withGST" : "withoutGST";
    const gstStatus = withGst ? "with GST" : "without GST";

    if (!paymentData && (!selectedOrderIds || selectedOrderIds.length === 0)) {
      toast.error("Please select at least one service/order.");
      return;
    }

    setDownloadModalConfig((prev) => ({ ...prev, isSaving: true }));
    const toastId = toast.loading(`Generating invoice ${gstStatus} for ${customer?.name}...`);

    try {
      const targetCustomer = customer || selectedCustomer || formData;
      const primaryOrderId = order?._id || paymentData?.orderId || selectedOrderIds?.[0];
      const targetOrderIds = (paymentData?.selectedOrderIds?.length > 0) ? paymentData.selectedOrderIds : selectedOrderIds;
      const pdfBlob = await generateInvoicePdf(
        targetCustomer._id,
        primaryOrderId,
        invoiceType,
        invoiceDate || new Date().toISOString(),
        targetOrderIds,
        paymentData,
        downloadModalConfig.customInvoiceNo,
        downloadModalConfig.paymentStatus || "Paid"
      );

      // Fetch invoice number for filename
      let invoiceNo = downloadModalConfig.customInvoiceNo || "";

      const filename = buildFilename(customer?.name, invoiceNo, withGst);

      toast.dismiss(toastId);

      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");

      // Refresh invoice list immediately so updated date shows without page reload
      refreshCustomerInvoices();

      setDownloadModalConfig((prev) => ({ ...prev, isOpen: false, isSaving: false }));
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Invoice generation failed:", error);
      toast.error(error?.message || "Failed to generate invoice. Please try again.");
      setDownloadModalConfig((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handlePrepareShareInvoice = async () => {
    const { order, customer, withGst, invoiceDate, pdfUrl: oldPdfUrl, selectedOrderIds, paymentData, customInvoiceNo } = downloadModalConfig;
    const invoiceType = withGst ? "withGST" : "withoutGST";
    const gstStatus = withGst ? "with GST" : "without GST";

    if (!paymentData && (!selectedOrderIds || selectedOrderIds.length === 0)) {
      toast.error("Please select at least one service/order.");
      return;
    }

    const primaryOrderId = order?._id || paymentData?.orderId || selectedOrderIds?.[0];

    if (customInvoiceNo?.trim()) {
      try {
        const { exists } = await verifyInvoiceNumber(customInvoiceNo.trim(), primaryOrderId, customer?._id);
        if (exists) {
          toast.error(`Invoice number "${customInvoiceNo.trim()}" already exists for another order. Please enter a different number.`);
          return;
        }
      } catch (err) {
        console.error("Failed to verify invoice number:", err);
      }
    }

    setDownloadModalConfig((prev) => ({ ...prev, isSaving: true }));
    const toastId = toast.loading(`Preparing invoice to share...`);

    try {
      const targetCustomer = customer || selectedCustomer || formData;
      const primaryOrderId = order?._id || paymentData?.orderId || selectedOrderIds?.[0];
      const targetOrderIds = (paymentData?.selectedOrderIds?.length > 0) ? paymentData.selectedOrderIds : selectedOrderIds;

      const pdfBlob = await generateInvoicePdf(
        targetCustomer._id,
        primaryOrderId,
        invoiceType,
        invoiceDate || new Date().toISOString(),
        targetOrderIds,
        paymentData,
        downloadModalConfig.customInvoiceNo,
        downloadModalConfig.paymentStatus || "Paid"
      );

      // Fetch invoice number for filename
      let invoiceNo = downloadModalConfig.customInvoiceNo || "";

      const filename = buildFilename(targetCustomer?.name, invoiceNo, withGst);

      toast.dismiss(toastId);
      toast.success("Invoice ready to share!");

      if (oldPdfUrl) {
        window.URL.revokeObjectURL(oldPdfUrl);
      }
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      setDownloadModalConfig((prev) => ({
        ...prev,
        isSaving: false,
        pdfBlob,
        pdfUrl,
        filename,
        step: "share",
      }));

      // Refresh invoice list immediately so updated date shows without page reload
      refreshCustomerInvoices();
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Invoice generation failed:", error);
      toast.error(error?.message || "Failed to generate invoice. Please try again.");
      setDownloadModalConfig((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const formatDomainList = (str) => {
    if (!str) return "";
    return str
      .split(",")
      .map(d => d.trim())
      .filter(Boolean)
      .map(d => (d.toLowerCase().startsWith("www.") ? d : `www.${d}`))
      .join(", ");
  };

  const handleWhatsAppShareDirect = () => {
    const { customer, pdfBlob, filename, paymentData, order, selectedOrderIds } = downloadModalConfig;
    if (!customer?.phone) {
      toast.error("Customer phone number is missing");
      return;
    }

    if (pdfBlob) {
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    }

    let domainName = "";
    let productNames = "";
    if (paymentData) {
      domainName = paymentData.domainUrl || "";
      const prods = paymentData.products || [];
      productNames = Array.from(new Set(prods.map(p => p.product || p.productName).filter(Boolean))).join(", ");
    } else {
      const allOrders = customer?.orders || formData.orders || [];
      const selOrders = (selectedOrderIds?.length > 0)
        ? allOrders.filter(o => selectedOrderIds.map(String).includes(String(o._id)))
        : (order ? [order] : allOrders);
      domainName = Array.from(new Set(selOrders.map(o => o.domainUrl).filter(Boolean))).join(", ");
      const prods = selOrders.flatMap(o => o.products || []);
      productNames = Array.from(new Set(prods.map(p => p.product || p.productName).filter(Boolean))).join(", ");
    }

    const formattedDomain = formatDomainList(domainName);
    const subject = formattedDomain
      ? `Invoice for ${formattedDomain} from Jayam Web Solutions`
      : "Invoice from Jayam Web Solutions";

    const text = `Dear Sir/ Ma'am,\n\nPlease find attached the ${subject}.\n\nThanks & Regards,\nJayam Web Solutions`;

    const cleanedPhone = customer.phone.replace(/\D/g, "");
    const whatsappNumber = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setDownloadModalConfig((prev) => ({ ...prev, isOpen: false, pdfBlob: null, filename: "" }));
  };

  const handleEmailShareDirect = async () => {
    const { customer, pdfBlob, filename, paymentData, order, selectedOrderIds } = downloadModalConfig;
    if (!customer?.email) {
      toast.error("Customer email is missing");
      return;
    }

    let domainName = "";
    let productNames = "";
    if (paymentData) {
      domainName = paymentData.domainUrl || "";
      const prods = paymentData.products || [];
      productNames = Array.from(new Set(prods.map(p => p.product || p.productName).filter(Boolean))).join(", ");
    } else {
      const allOrders = customer?.orders || formData.orders || [];
      const selOrders = (selectedOrderIds?.length > 0)
        ? allOrders.filter(o => selectedOrderIds.map(String).includes(String(o._id)))
        : (order ? [order] : allOrders);
      domainName = Array.from(new Set(selOrders.map(o => o.domainUrl).filter(Boolean))).join(", ");
      const prods = selOrders.flatMap(o => o.products || []);
      productNames = Array.from(new Set(prods.map(p => p.product || p.productName).filter(Boolean))).join(", ");
    }

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
      setDownloadModalConfig((prev) => ({ ...prev, isOpen: false, pdfBlob: null, filename: "" }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to email invoice", { id: toastId });
    }
  };

  const handleOrderPaymentUpdate = async () => {
    if (!orderPaymentEdit.amount || Number(orderPaymentEdit.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const baseAmount = Number(orderPaymentEdit.amount);
    const orderIdx = orderPaymentEdit.orderIdx;

    const updatedOrders = [...formData.orders];
    const orderToUpdate = { ...updatedOrders[orderIdx] };

    const cgst = baseAmount * (Number(gstRates.cgst) / 100);
    const sgst = baseAmount * (Number(gstRates.sgst) / 100);
    const igst = baseAmount * (Number(gstRates.igst) / 100);

    // Always use the saved customer state
    const customerState = (formData.state || "").trim();

    const taxValue =
      customerState === "Tamil Nadu"
        ? cgst + sgst
        : customerState
          ? igst
          : 0;

    const gstValue = orderPaymentEdit.withGst ? taxValue : 0;
    const finalPaymentAmount = baseAmount;

    const newPayment = {
      date: new Date().toISOString(),
      amount: finalPaymentAmount,
      gstvalue: gstValue,
      paymentType: orderPaymentEdit.paymentType || "base",
      withGst: orderPaymentEdit.withGst,
    };



    orderToUpdate.payments = [...(orderToUpdate.payments || []), newPayment];

    const totalPaid = orderToUpdate.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= orderToUpdate.totalPrice) {
      orderToUpdate.paymentStatus = "Fully Paid";
    } else {
      orderToUpdate.paymentStatus = "Partially Paid";
    }

    updatedOrders[orderIdx] = orderToUpdate;

    try {
      const targetCustomerId = editingId || formData._id || selectedCustomer?._id;
      const gstUpdate = orderPaymentEdit.withGst
        ? {
          gstin: orderPaymentEdit.gstin || formData.gstin,
        }
        : {};
      const updatedCust = await updateCustomer(targetCustomerId, { ...formData, ...gstUpdate, orders: updatedOrders });
      setFormData({
        ...updatedCust,
        email: Array.isArray(updatedCust.email) ? updatedCust.email.join(', ') : (updatedCust.email || ""),
        phone: Array.isArray(updatedCust.phone) ? updatedCust.phone.join(', ') : (updatedCust.phone || ""),
        contactPerson: updatedCust.contactPerson || "",
        country: updatedCust.country || "",
        state: updatedCust.state || "Tamil Nadu",
        gstin: updatedCust.gstin || "",
        address: updatedCust.address || "",
        notes: updatedCust.notes || "",
        orders: updatedCust.orders || [],
      });
      setCustomers(prev => prev.map(c => (c._id === targetCustomerId ? updatedCust : c)));
      if (selectedCustomer && selectedCustomer._id === targetCustomerId) {
        setSelectedCustomer(updatedCust);
      }
      fetchData();
      toast.success("Payment updated successfully");
      setIsOrderEditModalOpen(false);

      const targetOrder = (updatedCust?.orders || updatedOrders)[orderIdx];
      const newlyAddedPayment = targetOrder?.payments && targetOrder.payments.length > 0
        ? targetOrder.payments[targetOrder.payments.length - 1]
        : null;

      if (targetOrder && newlyAddedPayment) {
        const payDate = newlyAddedPayment.date ? newlyAddedPayment.date.split("T")[0] : currentDate;
        const invoiceType = orderPaymentEdit.withGst ? "withGST" : "withoutGST";
        let nextNo = "";
        try {
          nextNo = await getNextInvoiceNumber(invoiceType, payDate);
        } catch (_) { }

        const isFullyPaid = targetOrder.paymentStatus === "Fully Paid";
        const isPartiallyPaid = targetOrder.paymentStatus === "Partially Paid";

        const partialConfig = {
          isOpen: true,
          order: targetOrder,
          customer: updatedCust || { ...formData, orders: updatedOrders },
          selectedOrderIds: [targetOrder._id],
          paymentData: {
            paymentId: newlyAddedPayment._id || `${targetOrder._id}_pay_${payDate}`,
            amount: newlyAddedPayment.amount,
            description: newlyAddedPayment.description || "",
            date: newlyAddedPayment.date || payDate,
            withGst: newlyAddedPayment.withGst,
            paymentType: newlyAddedPayment.paymentType,
            products: newlyAddedPayment.products || targetOrder?.products || [],
            domainUrl: newlyAddedPayment.domainUrl || targetOrder?.domainUrl || "",
            orderId: targetOrder._id
          },
          withGst: orderPaymentEdit.withGst,
          state: formData.state || "",
          gstin: formData.gstin || "",
          invoiceDate: payDate,
          customInvoiceNo: nextNo,
          paymentStatus: "Paid",
          isSaving: false,
          step: "actions",
          pdfBlob: null,
          pdfUrl: null,
          filename: "",
        };

        const fullConfig = {
          ...partialConfig,
          paymentStage: 'final',
          invoiceCategory: 'consolidated',
          includePaymentHistory: true,
          paymentData: {
            ...(paymentDataObj || {}),
            paymentStage: 'final',
            invoiceCategory: 'consolidated',
            includePaymentHistory: true,
          },
        };

        const isUpdatedPayment = orderPaymentEdit.paymentType === "updated";

        let invoiceAction = null;
        if (isUpdatedPayment) {
          invoiceAction = () => setDownloadModalConfig(partialConfig);
        } else if (isPartiallyPaid) {
          invoiceAction = () => setCustomerInvoicePrompt({
            isOpen: true,
            title: "Partial Payment Invoice",
            message: `This order is partially paid. Do you want to generate an invoice for this paid amount (₹${newlyAddedPayment.amount.toLocaleString()})?`,
            config: partialConfig,
          });
        } else if (isFullyPaid) {
          invoiceAction = () => setCustomerInvoicePrompt({
            isOpen: true,
            title: "Payment Completed",
            message: `Payment is fully completed. Do you want to generate an invoice based on the total order price (₹${(targetOrder.totalPrice || 0).toLocaleString()})?`,
            config: fullConfig,
          });
        } else {
          invoiceAction = () => setDownloadModalConfig(partialConfig);
        }

        setPendingPostPaymentInvoiceAction(() => invoiceAction);

        handleSendPaymentConfirmationEmail(
          targetCustomerId,
          targetOrder._id,
          newlyAddedPayment._id,
          updatedCust,
          targetOrder
        );
      }

      setOrderPaymentEdit({
        amount: "",
        orderIdx: null,
        status: "Fully Paid",
        withGst: false,
        paymentType: "base"
      });
    } catch (error) {
      toast.error("Failed to update payment");
      console.error(error);
    }
  };

  const handleHistoryPaymentUpdate = async () => {
    const selectedIndices = (historyPaymentEdit.selectedOrderIndices && historyPaymentEdit.selectedOrderIndices.length > 0)
      ? historyPaymentEdit.selectedOrderIndices
      : (historyPaymentEdit.orderIdx !== "" ? [Number(historyPaymentEdit.orderIdx)] : []);

    if (selectedIndices.length === 0) {
      toast.error("Please select at least one service / order");
      return;
    }
    if (!historyPaymentEdit.amount || Number(historyPaymentEdit.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (historyPaymentEdit.withGst && !(historyPaymentEdit.gstin || "").trim()) {
      toast.error("GSTIN is required for GST invoices.");
      return;
    }

    const totalInputAmount = Number(historyPaymentEdit.amount);
    const updatedOrders = [...formData.orders];

    const selectedOrderIdsPaid = selectedIndices
      .map(idx => updatedOrders[idx]?._id)
      .filter(Boolean)
      .map(String);

    // Calculate individual order target prices
    const orderPrices = selectedIndices.map(idx => {
      const order = updatedOrders[idx];
      let price = 0;
      if (order) {
        order.products?.forEach(p => {
          if (p.deactive) return;
          const qty = p.quantity || 1;
          if (historyPaymentEdit.paymentType === "renewal") {
            if (p.validationEnabled) {
              const catalogProd = allProducts.find(cp => cp.name?.toLowerCase().trim() === p.product?.toLowerCase().trim());
              const resolvedPrices = getCatalogPrices(p, catalogProd);
              price += resolvedPrices.selling;
            }
          } else {
            price += (p.price || 0);
          }
        });
      }
      return price || order?.totalPrice || 0;
    });

    const sumPrices = orderPrices.reduce((a, b) => a + b, 0);

    selectedIndices.forEach((orderIdx, i) => {
      const orderToUpdate = { ...updatedOrders[orderIdx] };

      let orderBaseAmount = totalInputAmount;
      if (selectedIndices.length > 1 && sumPrices > 0) {
        orderBaseAmount =
          totalInputAmount === sumPrices
            ? orderPrices[i]
            : (orderPrices[i] / sumPrices) * totalInputAmount;
      }

      const cgst =
        orderBaseAmount * (Number(gstRates.cgst) / 100);

      const sgst =
        orderBaseAmount * (Number(gstRates.sgst) / 100);

      const igst =
        orderBaseAmount * (Number(gstRates.igst) / 100);

      // Get state from saved customer details
      const customerState = (formData.state || "").trim();

      const taxValue =
        customerState === "Tamil Nadu"
          ? cgst + sgst
          : customerState
            ? igst
            : 0;

      const gstValue =
        historyPaymentEdit.withGst
          ? taxValue
          : 0;

      const newPayment = {
        date: historyPaymentEdit.paymentDate || currentDate,
        amount: orderBaseAmount,
        gstvalue: gstValue,
        paymentType: historyPaymentEdit.paymentType || "base",
        paymentStage: historyPaymentEdit.paymentStage || "full",
        withGst: historyPaymentEdit.withGst,
        selectedOrderIds: selectedOrderIdsPaid,
      };

      if (historyPaymentEdit.paymentType === "updated") {
        newPayment.description = historyPaymentEdit.description || "";
      }

      if (historyPaymentEdit.paymentType === "renewal") {
        let orderCost = 0;
        orderToUpdate.products?.forEach(p => {
          if (p.deactive || !p.validationEnabled) return;
          const qty = p.quantity || 1;
          const catalogProd = allProducts.find(cp => cp.name?.toLowerCase().trim() === p.product?.toLowerCase().trim());
          const resolvedPrices = getCatalogPrices(p, catalogProd);
          orderCost += resolvedPrices.cost * qty;
        });

        newPayment.renewalSellingPrice = orderBaseAmount;
        newPayment.renewalCostPrice = Number(historyPaymentEdit.renewalCostPrice) || orderCost;

        if (historyPaymentEdit.newStartDate && historyPaymentEdit.newEndDate) {
          orderToUpdate.startDate = historyPaymentEdit.newStartDate;
          orderToUpdate.endDate = historyPaymentEdit.newEndDate;

          if (orderToUpdate.products && Array.isArray(orderToUpdate.products)) {
            orderToUpdate.products = orderToUpdate.products.map(p => {
              if (p.validationEnabled) {
                return {
                  ...p,
                  startDate: historyPaymentEdit.newStartDate,
                  endDate: historyPaymentEdit.newEndDate
                };
              }
              return p;
            });
          }
        }
      }

      orderToUpdate.payments = [...(orderToUpdate.payments || []), newPayment];

      const totalPaid = orderToUpdate.payments.reduce((sum, p) => sum + p.amount, 0);
      let resolvedPaymentStatus = totalPaid >= orderToUpdate.totalPrice ? "Fully Paid" : "Partially Paid";
      if (historyPaymentEdit.paymentStage === 'advance' || historyPaymentEdit.paymentStage === 'mid') {
        resolvedPaymentStatus = "Partially Paid";
      } else if (historyPaymentEdit.paymentStage === 'final') {
        resolvedPaymentStatus = "Fully Paid";
      }
      orderToUpdate.paymentStatus = resolvedPaymentStatus;

      updatedOrders[orderIdx] = orderToUpdate;
    });

    try {
      const targetCustomerId = editingId || formData._id || selectedCustomer?._id;
      const gstUpdate = historyPaymentEdit.withGst
        ? {
          gstin: historyPaymentEdit.gstin || formData.gstin
        }
        : {};
      const updatedCust = await updateCustomer(targetCustomerId, { ...formData, ...gstUpdate, orders: updatedOrders });
      setFormData({
        ...updatedCust,
        email: Array.isArray(updatedCust.email) ? updatedCust.email.join(', ') : (updatedCust.email || ""),
        phone: Array.isArray(updatedCust.phone) ? updatedCust.phone.join(', ') : (updatedCust.phone || ""),
        contactPerson: updatedCust.contactPerson || "",
        country: updatedCust.country || "",
        state: updatedCust.state || "Tamil Nadu",
        gstin: updatedCust.gstin || "",
        address: updatedCust.address || "",
        notes: updatedCust.notes || "",
        orders: updatedCust.orders || [],
      });
      setCustomers(prev => prev.map(c => (c._id === targetCustomerId ? updatedCust : c)));
      if (selectedCustomer && selectedCustomer._id === targetCustomerId) {
        setSelectedCustomer(updatedCust);
      }
      fetchData();
      toast.success("Payment added successfully");
      setIsHistoryPaymentModalOpen(false);

      const payDate = historyPaymentEdit.paymentDate || currentDate;
      const withGstVal = historyPaymentEdit.withGst;
      const stateVal = historyPaymentEdit.state || "Tamil Nadu";

      setHistoryPaymentEdit({
        selectedOrderIndices: [],
        orderIdx: "",
        paymentType: "base",
        amount: "",
        renewalCostPrice: "",
        status: "Fully Paid",
        withGst: false,
        state: "",
        gstin: "",
        paymentDate: currentDate,
        newStartDate: "",
        newEndDate: "",
        description: "",
      });

      // Automatically launch Invoice Wizard for the paid orders based on payment data
      const targetOrdersList = updatedCust?.orders || updatedOrders;
      const paidOrders = selectedIndices.map(idx => targetOrdersList[idx]).filter(Boolean);
      const primaryOrder = paidOrders[0];
      const newlyAddedPayment = primaryOrder?.payments && primaryOrder.payments.length > 0
        ? primaryOrder.payments[primaryOrder.payments.length - 1]
        : null;

      const invoiceType = withGstVal ? "withGST" : "withoutGST";
      let nextNo = "";
      try {
        nextNo = await getNextInvoiceNumber(invoiceType, payDate);
      } catch (_) { }

      const combinedProducts = paidOrders.flatMap(o => o.products || []);
      const combinedDomainUrl = Array.from(new Set(paidOrders.map(o => o.domainUrl).filter(Boolean))).join(', ');

      const isFin = historyPaymentEdit.paymentStage === 'final';
      const isInst = ['advance', 'mid'].includes(historyPaymentEdit.paymentStage);
      const invCat = isFin ? 'consolidated' : (isInst ? 'installment' : 'regular');

      const paymentDataObj = newlyAddedPayment ? {
        paymentId: newlyAddedPayment._id || `${primaryOrder?._id}_pay_${payDate}`,
        amount: totalInputAmount,
        description: newlyAddedPayment.description || historyPaymentEdit.description || "",
        date: newlyAddedPayment.date || payDate,
        withGst: withGstVal,
        paymentType: newlyAddedPayment.paymentType,
        paymentStage: historyPaymentEdit.paymentStage || "full",
        invoiceCategory: invCat,
        includePaymentHistory: isFin,
        products: combinedProducts,
        domainUrl: combinedDomainUrl,
        orderId: primaryOrder?._id,
        selectedOrderIds: selectedOrderIdsPaid,
      } : null;

      if (primaryOrder && newlyAddedPayment) {
        const isFullyPaid = primaryOrder?.paymentStatus === "Fully Paid";
        const isPartiallyPaid = primaryOrder?.paymentStatus === "Partially Paid";

        const partialConfig = {
          isOpen: true,
          order: primaryOrder,
          customer: updatedCust || { ...formData, orders: updatedOrders },
          selectedOrderIds: selectedOrderIdsPaid,
          paymentData: paymentDataObj,
          withGst: withGstVal,
          state: stateVal,
          gstin: historyPaymentEdit.gstin || formData.gstin || "",
          invoiceDate: payDate,
          customInvoiceNo: nextNo,
          paymentStatus: "Paid",
          isSaving: false,
          step: "actions",
          pdfBlob: null,
          pdfUrl: null,
          filename: "",
        };

        const fullConfig = {
          ...partialConfig,
          paymentData: null,
        };

        const isUpdatedPayment = historyPaymentEdit.paymentType === "updated";

        let invoiceAction = null;
        if (isUpdatedPayment) {
          invoiceAction = () => setDownloadModalConfig(partialConfig);
        } else if (isPartiallyPaid) {
          invoiceAction = () => setCustomerInvoicePrompt({
            isOpen: true,
            title: "Partial Payment Invoice",
            message: `This order is partially paid. Do you want to generate an invoice for this paid amount (₹${totalInputAmount.toLocaleString()})?`,
            config: partialConfig,
          });
        } else if (isFullyPaid) {
          const fullTotal = paidOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
          invoiceAction = () => setCustomerInvoicePrompt({
            isOpen: true,
            title: "Payment Completed",
            message: `Payment is fully completed. Do you want to generate an invoice based on the total order price (₹${fullTotal.toLocaleString()})?`,
            config: fullConfig,
          });
        } else {
          invoiceAction = () => setDownloadModalConfig(partialConfig);
        }

        setPendingPostPaymentInvoiceAction(() => invoiceAction);

        handleSendPaymentConfirmationEmail(
          targetCustomerId,
          primaryOrder._id,
          newlyAddedPayment._id,
          updatedCust,
          primaryOrder
        );
      }
    } catch (error) {
      toast.error("Failed to add payment");
      console.error(error);
    }
  };

  return (
    <div className="space-y-md md:space-y-lg pb-20 max-w-full overflow-x-hidden">
      {view === "list" ? (
        <div className="animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg md:mb-xl">
            <div>
              <h1 className="text-2xl md:text-h1 font-bold text-on-surface">
                {isWebsiteOnly ? "Website Management" : "Customer Management"}
              </h1>
              <p className="text-on-surface-variant text-xs md:text-body-md">
                {isWebsiteOnly
                  ? "View subscribers with website hosting and development services."
                  : "Manage your subscriber base and track payments."}
              </p>
            </div>
            {!isWebsiteOnly && (
              <div className="flex flex-col sm:flex-row gap-md">
                <button
                  onClick={openAddForm}
                  className="w-full sm:w-auto bg-primary text-on-primary px-lg md:px-xl py-sm rounded-full font-bold flex items-center justify-center gap-sm hover:shadow-lg transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  Customer
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-md mb-lg">
            <div className="grow relative w-full sm:max-w-[500px] p-1">
              <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search customers name or email or domain..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-[44px] pr-md py-sm font-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* <div className="w-full sm:w-auto min-w-[180px] shrink-0">
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm text-xs md:text-sm font-bold text-on-surface cursor-pointer"
              >
                <option value="All">All Countries</option>
                {availableCountries.filter(c => c !== "All").map((cntry) => (
                  <option key={cntry} value={cntry}>
                    {cntry}
                  </option>
                ))}
              </select>
            </div> */}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-full table-auto">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest">
                    Customer Details
                  </th>
                  <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest">
                    Email
                  </th>
                  <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest">
                    Country
                  </th>
                  <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest">
                    Phone
                  </th>
                  <th className="px-sm md:px-md py-md font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-lg py-20 text-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const paged = filteredCustomers.slice(
                      (customerPage - 1) * CUST_PAGE_SIZE,
                      customerPage * CUST_PAGE_SIZE
                    );
                    return paged.map((customer) => {
                      const uniqueDomains = Array.from(
                        new Set(customer.orders?.map(o => o.domainUrl).filter(Boolean) || [])
                      );
                      return (
                        <tr
                          key={customer._id}
                          onClick={() => openEditForm(customer)}
                          className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                        >
                          <td className="px-sm md:px-md py-md">
                            <div className="flex items-center gap-md">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-black text-xs md:text-sm shrink-0">
                                {customer.name.charAt(0)}
                              </div>
                              <div className="min-w-0 max-w-[140px] md:max-w-[200px] flex flex-col gap-0.5">
                                <div className="font-bold text-on-surface text-sm md:text-body-md truncate flex items-center gap-1.5 group-hover:text-primary transition-colors">
                                  <span className="truncate">{(customer.name || "").split(";")[0]}</span>
                                </div>
                                {uniqueDomains.map(dom => (
                                  <span
                                    key={dom}
                                    className="text-[10px] text-on-surface-variant font-medium truncate"
                                  >
                                    {dom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-sm md:px-md py-md text-xs font-medium text-on-surface">
                            {Array.isArray(customer.email) ? customer.email.join(', ') : (customer.email || "")}
                          </td>
                          <td className="px-sm md:px-md py-md text-xs font-medium text-on-surface">
                            {customer.country || "—"}
                          </td>
                          <td className="px-sm md:px-md py-md text-xs font-medium text-on-surface font-tabular-nums">
                            {Array.isArray(customer.phone) ? customer.phone.join(', ') : (customer.phone || "—")}
                          </td>
                          <td className="px-sm md:px-md py-md text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1 md:gap-sm">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditForm(customer);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                                title="Edit Customer"
                              >
                                <span className="material-symbols-outlined text-[18px] md:text-[20px]">
                                  edit
                                </span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(customer);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all cursor-pointer"
                                title="Delete Customer"
                              >
                                <span className="material-symbols-outlined text-[18px] md:text-[20px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {!loading && filteredCustomers.length > CUST_PAGE_SIZE && (() => {
            const totalPages = Math.ceil(filteredCustomers.length / CUST_PAGE_SIZE);
            const from = (customerPage - 1) * CUST_PAGE_SIZE + 1;
            const to = Math.min(customerPage * CUST_PAGE_SIZE, filteredCustomers.length);
            return (
              <div className="flex items-center justify-between mt-md px-xs">
                <p className="text-xs text-on-surface-variant">
                  Showing{" "}
                  <span className="font-bold text-on-surface">
                    {from}–{to}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-on-surface">{filteredCustomers.length}</span>
                </p>
                <div className="flex items-center gap-xs">
                  <button
                    onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                    disabled={customerPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={totalPages || 1}
                      value={customerPageInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerPageInput(val);
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num >= 1 && num <= totalPages) {
                          setCustomerPage(num);
                        }
                      }}
                      onBlur={() => {
                        const num = parseInt(customerPageInput, 10);
                        if (isNaN(num) || num < 1) {
                          setCustomerPage(1);
                          setCustomerPageInput(1);
                        } else if (num > totalPages) {
                          setCustomerPage(totalPages);
                          setCustomerPageInput(totalPages);
                        } else {
                          setCustomerPage(num);
                          setCustomerPageInput(num);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      className="w-12 text-center bg-surface-container-low border border-outline-variant rounded-md py-1 font-bold text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                    <span className="text-xs font-bold text-on-surface-variant">/ {totalPages || 1}</span>
                  </div>
                  <button
                    onClick={() => setCustomerPage((p) => Math.min(totalPages, p + 1))}
                    disabled={customerPage >= totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md mb-lg md:mb-xl">
            <div className="flex items-center gap-md min-w-0 flex-1 max-w-full sm:max-w-[55%]">
              <button
                type="button"
                onClick={closeForm}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[20px] md:text-[24px]">
                  arrow_back
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-h1 font-bold text-on-surface truncate" title={isEditing ? ((formData.name || "").split(";")[0] || "Edit Customer") : "Add New Customer"}>
                  {isEditing ? ((formData.name || "").split(";")[0] || "Edit Customer") : "Add New Customer"}
                </h1>
                <p className="text-on-surface-variant text-xs md:text-body-md truncate font-semibold text-primary" title={isEditing ? (formData.name ? `${formData.name.split(";")[0]} - Profile & Payments` : "Update profile and payments.") : "Register a new subscriber."}>
                  {isEditing ? (formData.name ? `${formData.name.split(";")[0]} - Profile & Payments` : "Update profile and payments.") : "Register a new subscriber."}
                </p>
              </div>
            </div>

            {/* Tab Navigation aligned to end */}
            <div className="bg-surface-container-low p-1 rounded-xl border border-outline-variant/40 inline-flex gap-1 max-w-full overflow-x-auto custom-scrollbar shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab("customer")}
                className={`px-3 md:px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === "customer"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
                  }`}
              >
                <span className="material-symbols-outlined text-[16px] md:text-[18px]">person</span>
                Customer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("service")}
                className={`px-3 md:px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === "service"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
                  }`}
              >
                <span className="material-symbols-outlined text-[16px] md:text-[18px]">service_toolbox</span>
                Service
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payment")}
                className={`px-3 md:px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === "payment"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
                  }`}
              >
                <span className="material-symbols-outlined text-[16px] md:text-[18px]">payments</span>
                Payment
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setActiveTab("invoice")}
                  className={`px-3 md:px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === "invoice"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
                    }`}
                >
                  <span className="material-symbols-outlined text-[16px] md:text-[18px]">receipt_long</span>
                  Invoice
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-md md:space-y-lg">
            {activeTab === "customer" && (
              <div className="space-y-md md:space-y-lg animate-in fade-in duration-200">
                {/* Row 1: Customer Information */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-xl space-y-md md:space-y-xl shadow-sm">
                  <h3 className="text-lg md:text-h3 font-bold text-on-surface border-b border-outline-variant pb-md flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md md:gap-xl">
                    <div className="space-y-sm md:col-span-2 relative" ref={emailDropdownRef}>
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        Email Address <span className="text-error">*</span> <span className="text-[10px] text-primary lowercase normal-case ml-1 font-sans font-semibold italic">(Separate multiple with commas)</span>
                      </label>
                      <input
                        required
                        type="text"
                        name="email"
                        value={formData.email}
                        autoComplete="off"
                        onChange={(e) => {
                          handleInputChange(e);
                          setIsNewCustomerConfirmed(false);
                          if (!isEditing && e.target.value.length > 0) {
                            setShowEmailDropdown(true);
                          } else {
                            setShowEmailDropdown(false);
                          }
                        }}
                        onFocus={() => {
                          if (!isEditing && formData.email) setShowEmailDropdown(true);
                        }}
                        onKeyDown={handleEmailKeyDown}
                        placeholder="john@example.com, second@example.com"
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all"
                      />

                      {!isEditing && showEmailDropdown && formData.email && (
                        <div className="absolute z-50 w-full mt-1 bg-surface-container-lowest border border-primary/50 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[200px] overflow-y-auto custom-scrollbar">
                          {matchingEmailCustomers.length > 0 ? (
                            <div ref={emailListRef}>
                              {matchingEmailCustomers.map((c, idx) => (
                                <div
                                  key={idx}
                                  className={`px-md py-3 cursor-pointer transition-colors text-on-surface border-b border-outline-variant/20 last:border-0 ${emailHighlightedIndex === idx
                                      ? "bg-primary/20"
                                      : "hover:bg-surface-container-low"
                                    }`}
                                  onClick={() => {
                                    openEditForm(c);
                                    setShowEmailDropdown(false);
                                  }}
                                  onMouseEnter={() => setEmailHighlightedIndex(idx)}
                                >
                                  <div className="font-bold text-sm">{c.name}</div>
                                  <div className="text-[11px] text-on-surface-variant">
                                    {(Array.isArray(c.email) ? c.email.join(', ') : c.email)} • {(Array.isArray(c.phone) ? c.phone.join(', ') : c.phone)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              className={`px-md py-4 text-sm text-center text-primary font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 ${emailHighlightedIndex === 0
                                  ? "bg-primary/10"
                                  : "hover:bg-primary/5"
                                }`}
                              onClick={() => {
                                setIsNewCustomerConfirmed(true);
                                setShowEmailDropdown(false);
                              }}
                              onMouseEnter={() => setEmailHighlightedIndex(0)}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                person_add
                              </span>
                              New Customer? Click to Enter Details
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        Company Name <span className="text-error">*</span>
                      </label>
                      <div className="space-y-2">
                        {companyNames.map((nameVal, index) => (
                          <div key={index} className="flex items-center gap-2">
                            {(isEditing || isNewCustomerConfirmed) && (
                              <input
                                type="radio"
                                name="defaultCompanyNameRadio"
                                checked={defaultNameIndex === index}
                                onChange={() => setDefaultNameIndex(index)}
                                className="w-4 h-4 text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
                                title="Set as Default Name"
                              />
                            )}
                            <input
                              required
                              disabled={!isEditing && !isNewCustomerConfirmed}
                              type="text"
                              value={nameVal}
                              onChange={(e) => {
                                const updated = [...companyNames];
                                updated[index] = e.target.value;
                                setCompanyNames(updated);
                              }}
                              placeholder={
                                !isEditing && !isNewCustomerConfirmed
                                  ? "Enter email first..."
                                  : "e.g. John Doe"
                              }
                              className={`w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all ${!isEditing && !isNewCustomerConfirmed
                                ? "opacity-50 cursor-not-allowed bg-surface-container-highest"
                                : ""
                                }`}
                            />
                            {companyNames.length > 1 && (isEditing || isNewCustomerConfirmed) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfig({
                                    isOpen: true,
                                    type: "name",
                                    index: index,
                                  });
                                }}
                                className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Delete Name"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {(isEditing || isNewCustomerConfirmed) && (
                        <button
                          type="button"
                          onClick={() => setCompanyNames([...companyNames, ""])}
                          className="flex items-center gap-1 text-xs text-primary font-bold hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-all mt-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Add Company Name
                        </button>
                      )}
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        Contact Person
                      </label>
                      <input
                        disabled={!isEditing && !isNewCustomerConfirmed}
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson || ""}
                        onChange={handleInputChange}
                        placeholder={
                          !isEditing && !isNewCustomerConfirmed
                            ? "Enter email first..."
                            : "e.g. Jane Doe"
                        }
                        className={`w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all ${!isEditing && !isNewCustomerConfirmed
                          ? "opacity-50 cursor-not-allowed bg-surface-container-highest"
                          : ""
                          }`}
                      />
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        Country <span className="text-error">*</span>
                      </label>
                      <SearchableSelect
                        name="country"
                        value={formData.country || ""}
                        options={countryOptions}
                        onChange={(e) => handleInputChange(e)}
                        placeholder="Select or search country..."
                        disabled={!isEditing && !isNewCustomerConfirmed}
                        required
                      />
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        Phone Number <span className="text-error">*</span> <span className="text-[10px] text-primary lowercase normal-case ml-1 font-sans font-semibold italic">(Separate multiple with commas)</span>
                      </label>
                      <input
                        required
                        disabled={!isEditing && !isNewCustomerConfirmed}
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder={
                          !isEditing && !isNewCustomerConfirmed
                            ? "Enter email first..."
                            : "e.g. 9876543210, 8765432109"
                        }
                        className={`w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all ${!isEditing && !isNewCustomerConfirmed
                          ? "opacity-50 cursor-not-allowed bg-surface-container-highest"
                          : ""
                          }`}
                      />
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        State <span className="text-error">*</span>
                      </label>
                      <select
                        required
                        disabled={!isEditing && !isNewCustomerConfirmed}
                        name="state"
                        value={formData.state || ""}
                        onChange={handleInputChange}
                        className={`w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all ${!isEditing && !isNewCustomerConfirmed
                          ? "opacity-50 cursor-not-allowed bg-surface-container-highest"
                          : ""
                          }`}
                      >
                        <option value="">Select State...</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Other State">Other State</option>
                      </select>
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        GSTIN
                      </label>
                      <input
                        disabled={!isEditing && !isNewCustomerConfirmed}
                        type="text"
                        name="gstin"
                        value={formData.gstin}
                        onChange={handleInputChange}
                        placeholder={
                          !isEditing && !isNewCustomerConfirmed
                            ? "Enter email first..."
                            : "Customer GSTIN (Optional)"
                        }
                        className={`w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all ${!isEditing && !isNewCustomerConfirmed
                          ? "opacity-50 cursor-not-allowed bg-surface-container-highest"
                          : ""
                          }`}
                      />
                    </div>
                    <div className="space-y-sm md:col-span-1">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        Address <span className="text-error">*</span>
                      </label>
                      <div className="space-y-2">
                        {addresses.map((addrVal, index) => (
                          <div key={index} className="flex items-start gap-2">
                            {(isEditing || isNewCustomerConfirmed) && (
                              <input
                                type="radio"
                                name="defaultAddressRadio"
                                checked={defaultAddressIndex === index}
                                onChange={() => setDefaultAddressIndex(index)}
                                className="w-4 h-4 text-primary focus:ring-primary accent-primary cursor-pointer shrink-0 mt-3"
                                title="Set as Default Address"
                              />
                            )}
                            <textarea
                              required
                              disabled={!isEditing && !isNewCustomerConfirmed}
                              value={addrVal}
                              onChange={(e) => {
                                const updated = [...addresses];
                                updated[index] = e.target.value;
                                setAddresses(updated);
                              }}
                              placeholder={
                                !isEditing && !isNewCustomerConfirmed
                                  ? "Enter email first..."
                                  : "Customer Address"
                              }
                              rows="2"
                              className={`w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all resize-none ${!isEditing && !isNewCustomerConfirmed
                                ? "opacity-50 cursor-not-allowed bg-surface-container-highest"
                                : ""
                                }`}
                            />
                            {addresses.length > 1 && (isEditing || isNewCustomerConfirmed) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfig({
                                    isOpen: true,
                                    type: "address",
                                    index: index,
                                  });
                                }}
                                className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer mt-2 shrink-0"
                                title="Delete Address"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {(isEditing || isNewCustomerConfirmed) && (
                        <button
                          type="button"
                          onClick={() => setAddresses([...addresses, ""])}
                          className="flex items-center gap-1 text-xs text-primary font-bold hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-all mt-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Add Address
                        </button>
                      )}
                    </div>
                    <div className="space-y-sm md:col-span-1">
                      <label className="font-label-caps text-[10px] md:text-label-caps text-on-surface-variant uppercase">
                        Notes
                      </label>
                      <textarea
                        disabled={!isEditing && !isNewCustomerConfirmed}
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder={
                          !isEditing && !isNewCustomerConfirmed
                            ? "Enter email first..."
                            : "Customer Notes"
                        }
                        rows="3"
                        className={`w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-2 md:py-sm font-body-md focus:ring-2 focus:ring-primary outline-none transition-all resize-none ${!isEditing && !isNewCustomerConfirmed
                          ? "opacity-50 cursor-not-allowed bg-surface-container-highest"
                          : ""
                          }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-md">
                  <button
                    type="submit"
                    disabled={isSavingCustomer}
                    className="w-full sm:w-auto bg-primary text-on-primary px-xl py-3 rounded-xl font-bold text-md hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingCustomer ? (
                      <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">save</span>
                    )}
                    <span>
                      {isSavingCustomer
                        ? "Saving..."
                        : isEditing
                          ? "Update Profile"
                          : "Save Profile"}
                    </span>
                  </button>
                </div>
              </div>
            )}
{/* sERVICE PRODUCTS */}
            {activeTab === "service" && (
              <div className="space-y-md md:space-y-lg animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-outline-variant pb-md">
                  <h3 className="text-lg md:text-h3 font-bold text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary">history</span>
                    List of Services
                  </h3>


                  <Addproject customerData={formData} />


                  {!isWebsiteOnly && (
                    <button
                      type="button"
                      onClick={handleHeaderNewOrderClick}
                      className="flex items-center gap-xs px-md py-1.5 md:py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer shadow-md shrink-0 hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
                      title="Place New Order"
                    >
                      <span className="material-symbols-outlined text-[16px] md:text-[18px]">
                        service_toolbox
                      </span>
                      <span>New Service</span>
                    </button>
                  )}
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] md:text-xs uppercase font-label-caps text-on-surface-variant">
                          <th className="px-md py-3">Create Date</th>
                          <th className="px-md py-3">Services</th>
                          <th className="px-md py-3">Domain</th>
                          <th className="px-md py-3">Total Amount</th>
                          <th className="px-md py-3">Payment Status</th>
                          <th className="px-md py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {formData.orders.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="px-md py-12 text-center text-on-surface-variant italic text-sm"
                            >
                              No previous orders found for this customer.
                            </td>
                          </tr>
                        ) : (
                          [...formData.orders].reverse().map((order, revIdx) => {
                            const originalIdx = formData.orders.length - 1 - revIdx;
                            return (
                              <tr
                                key={originalIdx}
                                onClick={() => handleOpenOrderPaymentManagement(order, originalIdx)}
                                className="hover:bg-surface-container-low transition-all cursor-pointer group"
                                title="Click to view payment management & balance details"
                              >
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-top">
                                  <div>{formatDate(order.orderDate)}</div>
                                </td>
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-top">
                                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                                    {order.products.map((p, pIdx) => (
                                      <span key={pIdx} className="inline-block">
                                        <span className={p.deactive ? 'text-error' : ''} title={p.deactive ? `Deactivated ${p.deactiveYear ? `(${formatDeactiveDate(p.deactiveYear)})` : ''}` : ''}>
                                          {p.product}
                                          {p.deactive && p.deactiveYear ? ` (${formatDeactiveDate(p.deactiveYear)})` : ''}
                                        </span>
                                        {pIdx < order.products.length - 1 ? "," : ""}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-top">
                                  {order.domainUrl ? (
                                    <a
                                      href={order.domainUrl.startsWith("http://") || order.domainUrl.startsWith("https://") ? order.domainUrl : `http://${order.domainUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs text-primary font-black hover:underline transition-all cursor-pointer inline-block"
                                    >
                                      {order.domainUrl}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-on-surface-variant font-medium">—</span>
                                  )}
                                </td>
                                <td className="px-md py-4 text-base font-black text-on-surface align-top">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span>₹{order.totalPrice.toLocaleString()}</span>
                                    {order.payments?.some(p => p.withGst) && (
                                      <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded inline-block">
                                        + GST
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-md py-4 align-top">
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenOrderPaymentManagement(order, originalIdx);
                                    }}
                                    className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap cursor-pointer hover:shadow-xs hover:brightness-95 transition-all ${order.paymentStatus === "Fully Paid"
                                      ? "bg-success/10 text-success"
                                      : order.paymentStatus === "Partially Paid"
                                        ? "bg-warning/10 text-warning"
                                        : "bg-error/10 text-error"
                                      }`}
                                    title="Click to manage payments"
                                  >
                                    {order.paymentStatus}
                                  </span>
                                </td>
                                <td className="px-md py-4 align-top text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenOrderPaymentManagement(order, originalIdx);
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                                      title="Payment & Balance Management"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        payments
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrder(order);
                                        setIsOrderViewModalOpen(true);
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all cursor-pointer"
                                      title="View Details"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        visibility
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/new-order/${formData._id}/${order._id}`, { state: { fromWebsite: isWebsiteOnly } });
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-highest hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all cursor-pointer"
                                      title="Edit Order"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        edit
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteOrderClickApi(order, formData);
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-error/10 text-error hover:bg-error hover:text-on-primary transition-all cursor-pointer"
                                      title="Delete Order"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-md md:space-y-lg animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-outline-variant pb-md">
                  <h3 className="text-lg md:text-h3 font-bold text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary">payments</span>
                    Payment History
                  </h3>
                  {isEditing && (
                    <div className="flex items-center gap-sm">
                      {formData.orders?.length > 0 && (
                        <button
                          type="button"
                          onClick={openHistoryPaymentModal}
                          className="flex items-center gap-xs px-md py-1.5 md:py-2 bg-primary hover:bg-primary/95 text-on-primary rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer shadow-md shrink-0 hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
                          title="Add Payment"
                        >
                          <span className="material-symbols-outlined text-[16px] md:text-[18px]">add</span>
                          <span>Add Payment</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] md:text-xs uppercase font-label-caps text-on-surface-variant">
                          <th className="px-md py-3">Payment Date</th>
                          <th className="px-md py-3">Services / Domain</th>
                          <th className="px-md py-3">Description</th>
                          <th className="px-md py-3">Payment Type</th>
                          <th className="px-md py-3">GST Value ({gstRates.igst}%)</th>
                          <th className="px-md py-3">Paid Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {allPayments.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="px-md py-12 text-center text-on-surface-variant italic text-sm"
                            >
                              No payments recorded for this customer.
                            </td>
                          </tr>
                        ) : (
                          allPayments.map((payment, idx) => {
                            return (
                              <tr
                                key={idx}
                                onClick={() => handleOpenPaymentDetailModal(payment)}
                                className="hover:bg-surface-container-low transition-all cursor-pointer group"
                                title="Click to view payment management & balance details"
                              >
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-middle">
                                  <div>{formatDate(payment.date)}</div>
                                </td>
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-middle">
                                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                                    {payment.products?.map((p, pIdx) => (
                                      <span key={pIdx} className="inline-block text-on-surface">
                                        {p.product}
                                        {pIdx < payment.products.length - 1 ? "," : ""}
                                      </span>
                                    ))}
                                  </div>
                                  {payment.domainUrl && (
                                    <div className="text-xs text-primary font-black mt-1">
                                      {payment.domainUrl}
                                    </div>
                                  )}
                                </td>
                                <td className="px-md py-4 text-xs font-medium text-on-surface-variant align-middle">
                                  {payment.description ? (
                                    <span className="text-on-surface font-semibold">{payment.description}</span>
                                  ) : (
                                    <span className="text-on-surface-variant font-medium">—</span>
                                  )}
                                </td>
                                <td className="px-md py-4 text-xs font-bold text-on-surface align-middle capitalize">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${payment.paymentType === "renewal"
                                      ? "bg-warning/10 text-warning border-warning/20"
                                      : payment.paymentType === "updated"
                                        ? "bg-info/10 text-info border-info/20"
                                        : "bg-primary/10 text-primary border-primary/20"
                                      }`}>
                                      {payment.paymentType === "renewal" ? "Renewal" : payment.paymentType === "updated" ? "Updated" : "Base"}
                                    </span>
                                    {payment.paymentStage && payment.paymentStage !== 'full' && (
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                        payment.paymentStage === 'advance'
                                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                          : payment.paymentStage === 'mid'
                                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                      }`}>
                                        {payment.paymentStage === 'advance' ? 'Advance' : payment.paymentStage === 'mid' ? `Milestone #${payment.stageNumber || 1}` : 'Final Settlement'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-middle">
                                  {payment.withGst ? (
                                    <span className="text-primary">₹{(payment.gstvalue || 0).toLocaleString()}</span>
                                  ) : (
                                    <span className="text-on-surface-variant font-medium">—</span>
                                  )}
                                </td>
                                <td className="px-md py-4 text-base font-black text-on-surface align-middle text-success">
                                  ₹{payment.amount.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "invoice" && (
              <div className="space-y-md md:space-y-lg animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-outline-variant pb-md">
                  <h3 className="text-lg md:text-h3 font-bold text-on-surface flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                    Invoices for {formData.name || "Customer"}
                  </h3>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] md:text-xs uppercase font-label-caps text-on-surface-variant">
                          <th className="px-md py-3">Invoice Number</th>
                          <th className="px-md py-3">Customer Name</th>
                          <th className="px-md py-3">Total Amount</th>
                          <th className="px-md py-3">Domains Name</th>
                          <th className="px-md py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {loadingInvoices ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-md py-12 text-center text-on-surface-variant italic text-sm"
                            >
                              Loading customer invoices...
                            </td>
                          </tr>
                        ) : customerInvoices.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-md py-12 text-center text-on-surface-variant italic text-sm"
                            >
                              No generated invoices recorded for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          customerInvoices.map((inv) => {
                            const domainText = (inv.items && inv.items.map(i => i.domainName).filter(Boolean).join(', ')) || "-";
                            return (
                              <tr
                                key={inv._id || inv.invoiceNo}
                                className="hover:bg-surface-container-low transition-colors group"
                              >
                                <td className="px-md py-4 text-sm font-bold text-primary align-top font-mono">
                                  {inv.invoiceNo}
                                </td>
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-top">
                                  {inv.customerName || formData.name || "—"}
                                </td>
                                <td className="px-md py-4 text-base font-black text-on-surface align-top">
                                  ₹{(inv.totalPrice || inv.subtotal || 0).toLocaleString()}
                                </td>
                                <td className="px-md py-4 text-sm font-bold text-on-surface align-top">
                                  {domainText && domainText !== "-" ? (
                                    <span className="text-xs text-primary font-black hover:underline cursor-pointer inline-block">
                                      {domainText}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-on-surface-variant font-medium">—</span>
                                  )}
                                </td>
                                <td className="px-md py-4 align-top flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditCustomerInvoice(inv)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-highest hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all cursor-pointer"
                                    title="Edit Invoice Details & Date"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShareCustomerInvoice(inv)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all cursor-pointer"
                                    title="View & Share Invoice"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      visibility
                                    </span>
                                  </button>
                                  {/* <button
                                    type="button"
                                    onClick={() => handleDeleteCustomerInvoice(inv)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-error/10 text-error hover:bg-error hover:text-on-error transition-all cursor-pointer"
                                    title="Delete Invoice"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      delete
                                    </span>
                                  </button> */}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {isViewModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[650px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[95vh] md:max-h-[90vh]">
            <div className="p-md md:p-lg space-y-md border-b border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center justify-between gap-md">
                <div className="flex items-center gap-md text-on-surface min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-md md:text-lg">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-h3 font-black tracking-tight truncate">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-on-surface-variant text-[10px] md:text-body-sm truncate">
                      {Array.isArray(selectedCustomer.email) ? selectedCustomer.email.join(', ') : (selectedCustomer.email || "")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setActiveDropdown(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-md md:p-lg space-y-lg md:space-y-xl custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md md:gap-lg">
                <div className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase">
                        Phone
                      </span>
                      <span className="text-xs md:text-body-sm font-bold text-on-surface">
                        {Array.isArray(selectedCustomer.phone) ? selectedCustomer.phone.join(', ') : (selectedCustomer.phone || "")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase">
                        Contact Person
                      </span>
                      <span className="text-xs md:text-body-sm font-bold text-on-surface">
                        {selectedCustomer.contactPerson || "N/A"}
                      </span>
                    </div>
                    {/* <div className="flex justify-between items-center px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase">
                        Created Date
                      </span>
                      <span className="text-xs md:text-body-sm font-bold text-on-surface">
                        {selectedCustomer.createdAt ? formatDate(selectedCustomer.createdAt) : "N/A"}
                      </span>
                    </div> */}
                    <div className="flex flex-col px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                        Address
                      </span>
                      <span className="text-xs md:text-body-sm font-bold text-on-surface whitespace-pre-wrap">
                        {selectedCustomer.address || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                        Notes
                      </span>
                      <span className="text-xs md:text-body-sm font-bold text-on-surface whitespace-pre-wrap">
                        {selectedCustomer.notes || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-xl p-md md:p-lg flex flex-col justify-center items-center text-center">
                  <p className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-widest mb-2">
                    Total Lifetime Value
                  </p>
                  <h2 className="text-3xl md:text-4xl font-black text-primary">
                    ₹
                    {(
                      selectedCustomer.orders?.reduce((sum, o) => sum + o.totalPrice, 0) || 0
                    ).toLocaleString()}
                  </h2>
                  <div className="mt-2 text-[10px] text-on-surface-variant font-bold">
                    {selectedCustomer.orders?.length || 0} Orders Total
                  </div>
                </div>
              </div>

              <div className="space-y-lg">
                <h4 className="text-[10px] md:text-label-caps font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-2 flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Order History & Payments
                </h4>

                <div className="space-y-md">
                  {selectedCustomer.orders?.length > 0 ? (
                    [...selectedCustomer.orders].reverse().map((order, oIdx) => (
                      <div
                        key={oIdx}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm"
                      >
                        <div className="bg-surface-container-low px-md py-3 flex justify-between items-center border-b border-outline-variant">
                          <div className="flex items-center gap-md">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black uppercase">
                              Order #{selectedCustomer.orders.length - oIdx}
                            </span>
                            {order.domainUrl && (
                              <a
                                href={order.domainUrl.startsWith("http://") || order.domainUrl.startsWith("https://") ? order.domainUrl : `http://${order.domainUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary font-black uppercase tracking-wider hover:underline transition-all cursor-pointer"
                              >
                                {order.domainUrl}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openActionModal(order, selectedCustomer)}
                                className="w-8 h-8 flex items-center justify-center bg-surface-container-highest hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-lg transition-colors cursor-pointer border border-outline-variant/10"
                                title="Generate Invoice"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  receipt_long
                                </span>
                              </button>
                              <button
                                onClick={() => navigate(`/new-order/${selectedCustomer._id}/${order._id}`, { state: { fromWebsite: isWebsiteOnly } })}
                                className="w-8 h-8 flex items-center justify-center bg-surface-container-highest hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-lg transition-colors cursor-pointer"
                                title="Edit Order"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  edit
                                </span>
                              </button>
                              {!isWebsiteOnly && (
                                <button
                                  onClick={() =>
                                    handleDeleteOrderClickApi(order, selectedCustomer)
                                  }
                                  className="w-8 h-8 flex items-center justify-center bg-surface-container-highest hover:bg-error/10 text-on-surface-variant hover:text-error rounded-lg transition-colors cursor-pointer border border-outline-variant/10"
                                  title="Delete Order"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                            <div
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${order.paymentStatus === "Fully Paid"
                                ? "bg-success/10 text-success"
                                : order.paymentStatus === "Partially Paid"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-error/10 text-error"
                                }`}
                            >
                              {order.paymentStatus}
                            </div>
                          </div>
                        </div>

                        <div className="p-md md:p-lg space-y-md">
                          {order.startDate && order.endDate && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black text-on-surface-variant uppercase tracking-tighter bg-surface-container-high px-2.5 py-1.5 rounded-lg self-start">
                              {/* <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px] text-primary">
                                  calendar_add_on
                                </span>
                                <span>Created: {formatDate(order.orderDate || order.startDate)}</span>
                              </div> */}
                              <div className="h-2.5 w-[1px] bg-outline-variant/30 hidden sm:block" />
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px] text-error">
                                  event_repeat
                                </span>
                                <span>Renewal: {formatDate(order.startDate)} - {formatDate(order.endDate)}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex flex-col gap-md">
                            {order.products?.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="bg-surface-container-low/30 border border-outline-variant/20 p-md rounded-xl space-y-2 flex flex-col justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex justify-between items-start gap-2">
                                    <h5 className="font-bold text-on-surface text-xs leading-tight truncate">
                                      {p.product}
                                    </h5>
                                    <span className="text-xs font-black text-primary shrink-0">
                                      ₹{p.price.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-tighter opacity-70 whitespace-pre-wrap">
                                    {p.variant}
                                  </p>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-outline-variant/10">

                                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                                    <span className="font-bold">Quantity</span>
                                    <span className="font-black text-on-surface">{p.quantity}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-surface-container-low p-md rounded-xl flex justify-between items-center text-xs md:text-sm font-black text-on-surface">
                            <span>Order Total</span>
                            <span className="text-primary font-black text-sm md:text-body-md">
                              ₹{order.totalPrice.toLocaleString()}
                            </span>
                          </div>

                          {order.payments?.length > 0 && (
                            <div className="space-y-sm">
                              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
                                Payment Details
                              </p>
                              <div className="space-y-sm">
                                {order.payments.map((pay, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex justify-between items-center px-md py-2 bg-success/5 border border-success/10 rounded-lg text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-success">
                                        {formatDate(pay.date)}
                                      </span>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${pay.paymentType === "renewal"
                                        ? "bg-warning/10 text-warning border border-warning/20"
                                        : pay.paymentType === "updated"
                                          ? "bg-info/10 text-info border border-info/20"
                                          : "bg-primary/10 text-primary border border-primary/20"
                                        }`}>
                                        {pay.paymentType === "renewal" ? "Renewal" : pay.paymentType === "updated" ? "Updated" : "Base"}
                                      </span>
                                      {pay.description && (
                                        <span className="text-[11px] text-on-surface-variant font-medium italic truncate max-w-[200px]" title={pay.description}>
                                          • {pay.description}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-success">
                                        ₹{pay.amount.toLocaleString()}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openActionModal(order, selectedCustomer, pay)}
                                        className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                                        title="Generate Invoice for this payment"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={sendingPaymentEmailId === pay._id}
                                        onClick={() => handleSendPaymentConfirmationEmail(selectedCustomer._id, order._id, pay._id)}
                                        className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer disabled:opacity-50"
                                        title="Send Payment Confirmation Email"
                                      >
                                        {sendingPaymentEmailId === pay._id ? (
                                          <span className="w-[16px] h-[16px] border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                                        ) : (
                                          <span className="material-symbols-outlined text-[16px]">mail</span>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-on-surface-variant italic text-xs py-md">
                      No order history found for this customer.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Customer?"
        message={`Are you sure you want to remove ${customerToDelete?.name}?`}
        confirmText="Remove"
        type="danger"
      />

      <ConfirmationModal
        isOpen={isDeleteOrderModalOpen}
        onClose={() => setIsDeleteOrderModalOpen(false)}
        onConfirm={confirmDeleteOrder}
        title="Delete Order?"
        message="Are you sure you want to permanently delete this order? All product configurations and payments for this order will be permanently lost."
        confirmText="Delete"
        type="danger"
      />

      <ConfirmationModal
        isOpen={deleteConfig.isOpen}
        onClose={() => setDeleteConfig({ isOpen: false, type: "", index: null })}
        onConfirm={() => {
          const { type, index } = deleteConfig;
          if (type === "name") {
            setCompanyNames(companyNames.filter((_, i) => i !== index));
            if (defaultNameIndex === index) {
              setDefaultNameIndex(0);
            } else if (defaultNameIndex > index) {
              setDefaultNameIndex(defaultNameIndex - 1);
            }
          } else if (type === "address") {
            setAddresses(addresses.filter((_, i) => i !== index));
            if (defaultAddressIndex === index) {
              setDefaultAddressIndex(0);
            } else if (defaultAddressIndex > index) {
              setDefaultAddressIndex(defaultAddressIndex - 1);
            }
          }
          setDeleteConfig({ isOpen: false, type: "", index: null });
        }}
        title={deleteConfig.type === "name" ? "Delete Company Name?" : "Delete Address?"}
        message={deleteConfig.type === "name"
          ? "Are you sure you want to permanently delete this company name from this customer?"
          : "Are you sure you want to permanently delete this address from this customer?"}
        confirmText="Delete"
        type="danger"
      />

      {isOrderViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[500px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-on-surface">Order Details</h3>
                <p className="text-xs text-primary font-bold">
                  {selectedCustomer?.name}
                </p>
              </div>
              <button
                onClick={() => setIsOrderViewModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-md md:p-lg space-y-lg overflow-y-auto custom-scrollbar flex-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-on-surface-variant uppercase">
                  Order Date
                </span>
                <span className="text-sm font-black text-on-surface">
                  {formatDate(selectedOrder.orderDate)}
                </span>
              </div>

              {selectedOrder.startDate && selectedOrder.endDate && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black text-on-surface-variant uppercase tracking-tighter bg-surface-container-high px-2.5 py-1.5 rounded-lg self-start">
                  <div className="h-2.5 w-[1px] bg-outline-variant/30 hidden sm:block" />
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-error">
                      event_repeat
                    </span>
                    <span>Renewal: {formatDate(selectedOrder.startDate)} - {formatDate(selectedOrder.endDate)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-sm">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                  Products
                </p>
                <div className="space-y-2">
                  {selectedOrder.products.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-surface-container-low p-md rounded-xl border border-outline-variant/20 flex justify-between items-start"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold truncate ${p.deactive ? 'text-error' : 'text-on-surface'}`}>{p.product}</p>
                            {p.deactive && (
                              <span className="bg-error/10 text-error text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                                Deactive {p.deactiveYear ? `(${formatDeactiveDate(p.deactiveYear)})` : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-on-surface-variant font-black uppercase whitespace-pre-wrap">
                            {p.variant}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-primary shrink-0 font-tabular-nums">
                        ₹{p.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* {selectedOrder.payments?.length > 0 && (
                <div className="space-y-sm">
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                    Payment History
                  </p>
                  <div className="space-y-2">
                    {selectedOrder.payments.map((pay, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center px-md py-2 bg-success/5 border border-success/10 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-success text-[18px]">
                            check_circle
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface">
                              {formatDate(pay.date)}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded w-fit mt-0.5 ${pay.paymentType === "renewal"
                              ? "bg-warning/10 text-warning border border-warning/10"
                              : "bg-primary/10 text-primary border border-primary/10"
                              }`}>
                              {pay.paymentType === "renewal" ? "Renewal" : "Base"}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-success font-tabular-nums">
                          ₹{pay.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>
      )}

      {isOrderEditModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[400px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-on-surface">Add Payment</h3>
                <p className="text-xs text-primary font-bold">
                  {formData.name || selectedCustomer?.name}
                </p>
              </div>
              <button
                onClick={() => setIsOrderEditModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-md md:p-lg space-y-lg overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-warning/5 p-md rounded-xl border border-warning/20 space-y-sm text-center">
                <div className="flex justify-between items-center text-xs border-b border-warning/10 pb-2">
                  <div className="text-left">
                    <span className="text-[9px] font-black text-on-surface-variant uppercase block">Total Price</span>
                    <span className="text-sm font-bold text-on-surface font-tabular-nums">
                      ₹{selectedOrder.totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-success uppercase block">Total Paid</span>
                    <span className="text-sm font-bold text-success font-tabular-nums">
                      ₹{(selectedOrder.payments?.reduce((sum, p) => sum + p.amount, 0) || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-black text-warning uppercase tracking-widest block mb-1">Balance Due</span>
                  <span className="text-2xl font-black text-warning font-tabular-nums block">
                    ₹
                    {(
                      selectedOrder.totalPrice -
                      (selectedOrder.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-sm">
                <label className="text-[10px] font-black text-on-surface-variant uppercase">
                  Payment Status
                </label>
                <select
                  value={orderPaymentEdit.status}
                  onChange={(e) => {
                    const status = e.target.value;
                    const balance =
                      selectedOrder.totalPrice -
                      (selectedOrder.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
                    setOrderPaymentEdit({
                      ...orderPaymentEdit,
                      status,
                      amount: status === "Fully Paid" ? balance.toString() : "",
                    });
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2 md:py-sm font-black text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm animate-in fade-in"
                >
                  <option value="Partially Paid">Partial Payment</option>
                  <option value="Fully Paid">Fully Paid</option>
                </select>
              </div>

              {/* <div className="space-y-sm animate-in fade-in duration-200">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                  Payment Type
                </label>
                <div className="grid grid-cols-2 gap-sm p-1 bg-surface-container-low border border-outline-variant rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setOrderPaymentEdit((prev) => ({ ...prev, paymentType: "base" }))
                    }
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${orderPaymentEdit.paymentType !== "renewal"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface hover:bg-surface-variant/50"
                      }`}
                  >
                    Product
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOrderPaymentEdit((prev) => ({ ...prev, paymentType: "renewal" }))
                    }
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${orderPaymentEdit.paymentType === "renewal"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface hover:bg-surface-variant/50"
                      }`}
                  >
                    Renewal
                  </button>
                </div>
              </div> */}

              <div className="space-y-sm animate-in fade-in duration-200">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                  GST Option
                </label>
                <div className="grid grid-cols-2 gap-sm p-1 bg-surface-container-low border border-outline-variant rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setOrderPaymentEdit((prev) => ({ ...prev, withGst: false }))
                    }
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${!orderPaymentEdit.withGst
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface hover:bg-surface-variant/50"
                      }`}
                  >
                    Without GST
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOrderPaymentEdit((prev) => ({ ...prev, withGst: true }))
                    }
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${orderPaymentEdit.withGst
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface hover:bg-surface-variant/50"
                      }`}
                  >
                    With GST
                  </button>
                </div>
              </div>



              <div className="space-y-sm">
                <label className="text-[10px] font-black text-on-surface-variant uppercase">
                  {orderPaymentEdit.withGst ? "Base Amount (₹)" : "Payment Amount (₹)"}
                </label>
                <input
                  type="number"
                  disabled={orderPaymentEdit.status === "Fully Paid"}
                  value={orderPaymentEdit.amount}
                  onChange={(e) => {
                    const balance =
                      selectedOrder.totalPrice -
                      (selectedOrder.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
                    const val = Number(e.target.value);
                    if (val > balance) {
                      setOrderPaymentEdit({ ...orderPaymentEdit, amount: Number(balance.toFixed(2)).toString() });
                    } else {
                      setOrderPaymentEdit({ ...orderPaymentEdit, amount: e.target.value });
                    }
                  }}
                  placeholder="Enter amount..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-3 font-black text-on-surface focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                />
              </div>

              {orderPaymentEdit.withGst && orderPaymentEdit.amount && (() => {
                const amt = Number(orderPaymentEdit.amount) || 0;

                const cgst = amt * (Number(gstRates.cgst) / 100);
                const sgst = amt * (Number(gstRates.sgst) / 100);
                const igst = amt * (Number(gstRates.igst) / 100);

                const customerState = (formData.state || "").trim();

                const total =
                  customerState === "Tamil Nadu"
                    ? amt + cgst + sgst
                    : customerState
                      ? amt + igst
                      : amt;

                return (
                  <div className="bg-primary/5 p-md rounded-xl border border-primary/10 space-y-1 text-xs animate-in fade-in duration-200">

                    <div className="flex justify-between font-bold text-on-surface-variant">
                      <span>Base Amount (Excl. GST):</span>
                      <span>₹{formatAmount(amt)}</span>
                    </div>

                    {customerState === "Tamil Nadu" ? (
                      <>
                        <div className="flex justify-between text-on-surface-variant">
                          <span>CGST ({gstRates.cgst}%):</span>
                          <span>₹{formatAmount(cgst)}</span>
                        </div>

                        <div className="flex justify-between text-on-surface-variant">
                          <span>SGST ({gstRates.sgst}%):</span>
                          <span>₹{formatAmount(sgst)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-on-surface-variant">
                        <span>IGST ({gstRates.igst}%):</span>
                        <span>₹{formatAmount(igst)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-black text-primary pt-2 border-t border-primary/20">
                      <span>Total Payment (with GST):</span>
                      <span>₹{formatAmount(total)}</span>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={handleOrderPaymentUpdate}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                Update Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {isHistoryPaymentModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[600px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
              <div className="flex items-center gap-sm text-primary">
                <span className="material-symbols-outlined text-[24px]">payments</span>
                <div>
                  <h3 className="text-lg font-black text-on-surface">Add Payment</h3>
                  <p className="text-xs text-primary font-bold">
                    {formData.name || selectedCustomer?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryPaymentModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {(() => {
              const hasPartiallyPaid = (formData.orders || []).some(o => o.paymentStatus === "Partially Paid");
              const displayOrdersWithIndices = (formData.orders || [])
                .map((order, originalIndex) => ({ order, originalIndex }))
                .filter(({ order }) => {
                  const hasNonVal = order.products?.some(p => p.validationEnabled === false || !p.validationEnabled);
                  if (historyPaymentEdit.paymentType === "base") {
                    if (hasPartiallyPaid) {
                      return order.paymentStatus === "Partially Paid" && hasNonVal;
                    }
                    return order.paymentStatus !== "Fully Paid" && hasNonVal;
                  }
                  if (historyPaymentEdit.paymentType === "updated") {
                    return hasNonVal;
                  }
                  return true;
                });
              const isAllOrdersPaid = (formData.orders || []).length > 0 && (formData.orders || []).every(o => o.paymentStatus === "Fully Paid");

              const currentSel = historyPaymentEdit.selectedOrderIndices || [];
              const visibleIndices = displayOrdersWithIndices.map(d => d.originalIndex);
              const selectedVisibleCount = visibleIndices.filter(i => currentSel.includes(i)).length;
              const isAllSelected = visibleIndices.length > 0 && selectedVisibleCount === visibleIndices.length;

              // ✅ Empty state — no orders found matching criteria
              if (displayOrdersWithIndices.length === 0) {
                return (
                  <div className="p-md md:p-lg space-y-lg overflow-y-auto custom-scrollbar flex-1">
                    <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant/30 text-center">
                      <div className="flex flex-col items-center gap-2 py-4">
                        <span className="material-symbols-outlined text-on-surface-variant text-[28px]">info</span>
                        <p className="text-xs font-bold text-on-surface">No Orders Found</p>
                        <p className="text-[11px] text-on-surface-variant">
                          No services with date validation disabled found.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-md md:p-lg space-y-lg overflow-y-auto custom-scrollbar flex-1">
                  <div className="space-y-2 p-md bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Select Services / Orders ({selectedVisibleCount}/{displayOrdersWithIndices.length})
                      </span>
                      {displayOrdersWithIndices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newIndices = isAllSelected
                              ? currentSel.filter(i => !visibleIndices.includes(i))
                              : Array.from(new Set([...currentSel, ...visibleIndices]));

                            let totalBase = 0;
                            let totalRenewalSelling = 0;
                            let totalRenewalCost = 0;
                            newIndices.forEach(idx => {
                              const ord = formData.orders[idx];
                              if (!ord) return;
                              if (historyPaymentEdit.paymentType === "base") {
                                const totalPaid = (ord.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                const bal = Math.max(0, (ord.totalPrice || 0) - totalPaid);
                                totalBase += bal > 0 ? bal : (ord.totalPrice || 0);
                              } else {
                                ord.products?.forEach(p => {
                                  if (p.deactive) return;
                                  const qty = p.quantity || 1;
                                  const catalogProd = allProducts.find(cp => cp.name?.toLowerCase().trim() === p.product?.toLowerCase().trim());
                                  const resolvedPrices = getCatalogPrices(p, catalogProd);
                                  if (p.validationEnabled) {
                                    totalRenewalSelling += resolvedPrices.selling;
                                    totalRenewalCost += resolvedPrices.cost;
                                  }
                                  totalBase += (p.price );
                                });
                              }
                            });

                            setHistoryPaymentEdit(prev => ({
                              ...prev,
                              selectedOrderIndices: newIndices,
                              orderIdx: newIndices.length > 0 ? newIndices[0].toString() : "",
                              amount: prev.paymentType === "renewal" ? Number(totalRenewalSelling.toFixed(2)).toString() : (prev.paymentType === "updated" ? "" : Number(totalBase.toFixed(2)).toString()),
                              renewalCostPrice: Number(totalRenewalCost.toFixed(2)).toString()
                            }));
                          }}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          {isAllSelected ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                      {displayOrdersWithIndices.map(({ order, originalIndex: idx }) => {
                        const selectedIndices = historyPaymentEdit.selectedOrderIndices || [];
                        const isSelected = selectedIndices.includes(idx);
                        const targetProducts = order.products?.filter(p => p.validationEnabled === false || !p.validationEnabled);
                        const productsStr = targetProducts?.map(p => p.product).join(', ') || "Service";
                        const isDeactiveDisabled = order.products?.length === 1 && order.products[0].deactive;
                        const hasValidation = order.products?.some(p => p.validationEnabled !== false && p.validationEnabled === true);
                        const isValidationDisabled = historyPaymentEdit.paymentType === "renewal" && !hasValidation;
                        const isOptionDisabled = isDeactiveDisabled || isValidationDisabled;

                        let renewalTotal = 0;
                        if (historyPaymentEdit.paymentType === "renewal") {
                          order.products?.forEach(p => {
                            if (p.deactive || !p.validationEnabled) return;
                            const qty = p.quantity || 1;
                            const catalogProd = allProducts.find(cp => cp.name?.toLowerCase().trim() === p.product?.toLowerCase().trim());
                            const resolvedPrices = getCatalogPrices(p, catalogProd);
                            renewalTotal += resolvedPrices.selling * qty;
                          });
                        }
                        const displayPrice = historyPaymentEdit.paymentType === "renewal" ? renewalTotal : order.totalPrice;

                        const toggleOrder = () => {
                          if (isOptionDisabled) return;
                          const currentSel = historyPaymentEdit.selectedOrderIndices || [];
                          const newIndices = currentSel.includes(idx)
                            ? currentSel.filter(i => i !== idx)
                            : [...currentSel, idx];

                          let totalBase = 0;
                          let totalRenewalSelling = 0;
                          let totalRenewalCost = 0;
                          newIndices.forEach(i => {
                            const ord = formData.orders[i];
                            if (!ord) return;
                            if (historyPaymentEdit.paymentType === "base") {
                              const totalPaid = (ord.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                              const bal = Math.max(0, (ord.totalPrice || 0) - totalPaid);
                              totalBase += bal > 0 ? bal : (ord.totalPrice || 0);
                            } else {
                              ord.products?.forEach(p => {
                                if (p.deactive) return;
                                const qty = p.quantity || 1;
                                const catalogProd = allProducts.find(cp => cp.name?.toLowerCase().trim() === p.product?.toLowerCase().trim());
                                const resolvedPrices = getCatalogPrices(p, catalogProd);
                                if (p.validationEnabled) {
                                  totalRenewalSelling += resolvedPrices.selling * qty;
                                  totalRenewalCost += resolvedPrices.cost * qty;
                                }
                                totalBase += (p.price || 0) * qty;
                              });
                            }
                          });

                          setHistoryPaymentEdit(prev => ({
                            ...prev,
                            selectedOrderIndices: newIndices,
                            orderIdx: newIndices.length > 0 ? newIndices[0].toString() : "",
                            amount: prev.paymentType === "renewal" ? Number(totalRenewalSelling.toFixed(2)).toString() : (prev.paymentType === "updated" ? "" : Number(totalBase.toFixed(2)).toString()),
                            renewalCostPrice: Number(totalRenewalCost.toFixed(2)).toString()
                          }));
                        };

                        return (
                          <div
                            key={order._id || idx}
                            onClick={toggleOrder}
                            className={`flex items-center justify-between p-md rounded-xl border transition-all cursor-pointer ${isOptionDisabled ? "opacity-40 cursor-not-allowed bg-surface-container-low border-outline-variant/20" :
                              isSelected
                                ? "bg-primary/5 border-primary/40 text-on-surface shadow-xs"
                                : "bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant/70 opacity-70 hover:opacity-100"
                              }`}
                          >
                            <div className="flex items-start gap-md min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isOptionDisabled}
                                onChange={() => { }}
                                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary mt-0.5 cursor-pointer"
                              />
                              <div className="min-w-0 text-left">
                                <div className="font-bold text-xs text-on-surface truncate">
                                  {productsStr} {order.domainUrl ? `(${order.domainUrl})` : ""}
                                </div>
                                <div className="text-[11px] text-on-surface-variant font-medium truncate">
                                  {formatDate(order.orderDate)} {isDeactiveDisabled ? "• (Deactivated)" : (isValidationDisabled ? "• (No Date Validation)" : "")} {order.paymentStatus ? `• (${order.paymentStatus})` : ""}
                                </div>
                              </div>
                            </div>
                            {/* <span className="font-black text-xs text-primary font-tabular-nums shrink-0 ml-2">
                              ₹{displayPrice.toLocaleString()}
                            </span> */}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Type Selection & Payment Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md animate-in fade-in duration-200">
                    <div className="space-y-sm">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                        Payment Type
                      </label>
                      <div className={`grid ${isAllOrdersPaid ? 'grid-cols-1' : 'grid-cols-2'} gap-1 p-1 bg-surface-container-low border border-outline-variant rounded-xl`}>
                        {!isAllOrdersPaid && (
                          <button
                            type="button"
                            onClick={() => {
                              const partiallyPaidIndices = (formData.orders || [])
                                .map((o, i) => (o.paymentStatus === "Partially Paid" && o.products?.some(p => p.validationEnabled === false || !p.validationEnabled) ? i : null))
                                .filter(i => i !== null);
                              const unpaidIndices = (formData.orders || [])
                                .map((o, i) => (o.paymentStatus !== "Fully Paid" && o.products?.some(p => p.validationEnabled === false || !p.validationEnabled) ? i : null))
                                .filter(i => i !== null);
                              const indicesToUse = partiallyPaidIndices.length > 0 ? partiallyPaidIndices : unpaidIndices;

                              let defBaseSelling = 0;
                              indicesToUse.forEach(i => {
                                const order = formData.orders[i];
                                if (order) {
                                  const totalPaid = (order.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                  const bal = Math.max(0, (order.totalPrice || 0) - totalPaid);
                                  defBaseSelling += bal > 0 ? bal : (order.totalPrice || 0);
                                }
                              });
                              setHistoryPaymentEdit((prev) => ({
                                ...prev,
                                selectedOrderIndices: indicesToUse,
                                orderIdx: indicesToUse.length > 0 ? indicesToUse[0].toString() : "",
                                paymentType: "base",
                                amount: Number(defBaseSelling.toFixed(2)).toString()
                              }));
                            }}
                            className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${historyPaymentEdit.paymentType === "base"
                              ? "bg-primary text-on-primary shadow-sm"
                              : "text-on-surface hover:bg-surface-variant/50"
                              }`}
                          >
                            Partially Paid
                          </button>
                        )}
                        {/* {!isAllOrdersPaid && (
                          <button
                            type="button"
                            onClick={() => {
                              const indices = historyPaymentEdit.selectedOrderIndices || [];
                              let defRenewalSelling = 0;
                              let defRenewalCost = 0;
                              indices.forEach(i => {
                                const order = formData.orders[i];
                                if (order) {
                                  order.products?.forEach(p => {
                                    if (p.deactive || !p.validationEnabled) return;
                                    const qty = p.quantity || 1;
                                    const catalogProd = allProducts.find(cp => cp.name?.toLowerCase().trim() === p.product?.toLowerCase().trim());
                                    const resolvedPrices = getCatalogPrices(p, catalogProd);
                                    defRenewalSelling += resolvedPrices.selling * qty;
                                    defRenewalCost += resolvedPrices.cost * qty;
                                  });
                                }
                              });
                              const selOrders = selectedOrderIndices.map(idx => formData.orders?.[idx]).filter(Boolean);
                              const targetOrd = selOrders[0];
                              const baseDate = targetOrd?.endDate || targetOrd?.startDate || currentDate;
                              let startVal = baseDate;
                              if (baseDate && baseDate.includes('-') && baseDate.split('-')[0].length === 4) {
                                startVal = baseDate.split('T')[0];
                              }
                              const endVal = getOneYearLater(startVal);
                              setHistoryPaymentEdit((prev) => ({
                                ...prev,
                                paymentType: "renewal",
                                amount: defRenewalSelling.toString(),
                                renewalCostPrice: defRenewalCost.toString(),
                                newStartDate: startVal,
                                newEndDate: endVal
                              }));
                            }}
                            className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${historyPaymentEdit.paymentType === "renewal"
                              ? "bg-primary text-on-primary shadow-sm"
                              : "text-on-surface hover:bg-surface-variant/50"
                              }`}
                          >
                            Renewal
                          </button>
                        )} */}
                        <button
                          type="button"
                          onClick={() => {
                            const updatedIndices = (formData.orders || [])
                              .map((o, i) => (o.products?.some(p => p.validationEnabled === false || !p.validationEnabled) ? i : null))
                              .filter(i => i !== null);
                            setHistoryPaymentEdit((prev) => ({
                              ...prev,
                              paymentType: "updated",
                              selectedOrderIndices: updatedIndices.length > 0 ? [updatedIndices[0]] : [],
                              orderIdx: updatedIndices.length > 0 ? updatedIndices[0].toString() : "",
                              amount: ""
                            }));
                          }}
                          className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${historyPaymentEdit.paymentType === "updated"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "text-on-surface hover:bg-surface-variant/50"
                            }`}
                        >
                          Updates
                        </button>
                      </div>
                    </div>

                    <div className="space-y-sm">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={historyPaymentEdit.paymentDate}
                        onChange={(e) => {
                          const pDate = e.target.value;
                          setHistoryPaymentEdit(prev => ({
                            ...prev,
                            paymentDate: pDate
                          }));
                        }}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2 md:py-sm font-black text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Renewal Dates Grid */}
                  {
                    historyPaymentEdit.paymentType === "renewal" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md animate-in fade-in duration-200">
                        <div className="space-y-sm">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                            New Start Date
                          </label>
                          <input
                            type="date"
                            value={historyPaymentEdit.newStartDate}
                            onChange={(e) => {
                              const start = e.target.value;
                              const end = getOneYearLater(start);
                              setHistoryPaymentEdit({
                                ...historyPaymentEdit,
                                newStartDate: start,
                                newEndDate: end
                              });
                            }}
                            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2 md:py-sm font-black text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm cursor-pointer"
                          />
                        </div>
                        <div className="space-y-sm">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                            New End Date
                          </label>
                          <input
                            type="date"
                            value={historyPaymentEdit.newEndDate}
                            onChange={(e) => setHistoryPaymentEdit({ ...historyPaymentEdit, newEndDate: e.target.value })}
                            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2 md:py-sm font-black text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm cursor-pointer"
                          />
                        </div>
                      </div>
                    )
                  }

                  {/* Payment Stage Selector with Smart Advance Locking */}
                  {(() => {
                    const selectedOrdersList = (formData.orders || []).filter((_, idx) => (historyPaymentEdit.selectedOrderIndices || []).includes(idx));
                    const alreadyHasAdvance = selectedOrdersList.some(o => (o.payments || []).some(p => p.paymentStage === 'advance'));

                    return (
                      <div className="space-y-sm animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                            Payment Stage
                          </label>
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
                              onClick={() => setHistoryPaymentEdit(prev => ({ ...prev, paymentStage: stage.id }))}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                                stage.disabled
                                  ? "opacity-35 cursor-not-allowed bg-surface-container-low border-outline-variant/30 text-on-surface-variant line-through"
                                  : (historyPaymentEdit.paymentStage || "full") === stage.id
                                    ? "bg-primary text-on-primary border-primary shadow-sm cursor-pointer"
                                    : "bg-surface-container-low text-on-surface border-outline-variant/60 hover:bg-surface-variant cursor-pointer"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px] mb-0.5">{stage.icon}</span>
                              <span className="text-[11px] font-semibold">{stage.label}</span>
                            </button>
                          ))}
                        </div>
                        {alreadyHasAdvance && historyPaymentEdit.paymentStage === 'advance' && (
                          <p className="text-[11px] text-amber-600 font-bold">
                            ⚠️ Advance is already recorded for this order. Please select Milestone or Final Balance.
                          </p>
                        )}
                        {historyPaymentEdit.paymentStage === 'advance' && !alreadyHasAdvance && (
                          <p className="text-[11px] text-amber-600 font-medium">
                            Advance Milestone Payment. You can generate an advance stage invoice.
                          </p>
                        )}
                        {historyPaymentEdit.paymentStage === 'mid' && (
                          <p className="text-[11px] text-blue-600 font-medium">
                            Milestone Part Payment. You can generate an installment invoice.
                          </p>
                        )}
                        {historyPaymentEdit.paymentStage === 'final' && (
                          <p className="text-[11px] text-emerald-600 font-medium">
                            Final Balance Settlement. A Consolidated Invoice with full payment history will be generated.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Amount Inputs depending on Payment Type */}
                  {
                    historyPaymentEdit.paymentType !== "renewal" ? (
                      <div className="space-y-sm animate-in fade-in duration-200">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase">
                          {historyPaymentEdit.withGst ? "Base Amount (₹)" : "Payment Amount (₹)"}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={historyPaymentEdit.amount}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val && val.includes('.')) {
                              const parts = val.split('.');
                              if (parts[1] && parts[1].length > 2) {
                                val = `${parts[0]}.${parts[1].slice(0, 2)}`;
                              }
                            }
                            setHistoryPaymentEdit({ ...historyPaymentEdit, amount: val });
                          }}
                          placeholder="Enter payment amount..."
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-3 font-black text-on-surface focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md animate-in fade-in duration-200">
                        <div className="space-y-sm">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase">
                            {historyPaymentEdit.withGst ? "Renewal Base Amount (₹)" : "Renewal Amount (₹)"}
                          </label>
                          <input
                            type="number"
                            value={historyPaymentEdit.amount}
                            onChange={(e) => setHistoryPaymentEdit({ ...historyPaymentEdit, amount: e.target.value })}
                            placeholder="Enter renewal amount..."
                            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-3 font-black text-on-surface focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                        <div className="space-y-sm">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase">
                            Cost Amount (₹)
                          </label>
                          <input
                            type="number"
                            value={historyPaymentEdit.renewalCostPrice}
                            onChange={(e) => setHistoryPaymentEdit({ ...historyPaymentEdit, renewalCostPrice: e.target.value })}
                            placeholder="Enter renewal cost amount..."
                            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-3 font-black text-on-surface focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>
                    )
                  }

                  {/* Description Input - Showing only when Payment Type is 'updated' */}
                  <div className="space-y-sm animate-in fade-in duration-200">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                      Description / Remarks
                    </label>
                    <input
                      type="text"
                      value={historyPaymentEdit.description || ""}
                      onChange={(e) => setHistoryPaymentEdit({ ...historyPaymentEdit, description: e.target.value })}
                      placeholder="Enter payment description / reference notes..."
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none text-sm"
                    />
                  </div>

                  {/* GST Option */}
                  <div className="space-y-sm animate-in fade-in duration-200">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                      GST Option
                    </label>
                    <div className="grid grid-cols-2 gap-sm p-1 bg-surface-container-low border border-outline-variant rounded-xl">
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryPaymentEdit((prev) => ({ ...prev, withGst: false }))
                        }
                        className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${!historyPaymentEdit.withGst
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface hover:bg-surface-variant/50"
                          }`}
                      >
                        Without GST
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryPaymentEdit((prev) => ({ ...prev, withGst: true }))
                        }
                        className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${historyPaymentEdit.withGst
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface hover:bg-surface-variant/50"
                          }`}
                      >
                        With GST
                      </button>
                    </div>
                  </div>

                  {
                    historyPaymentEdit.withGst && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface mb-2">
                            STATE
                          </label>

                          <div
                            className="w-full px-4 py-3 rounded-xl border border-outline
                 bg-surface-variant text-on-surface
                 font-medium text-sm"
                          >
                            {formData.state || "State not available"}
                          </div>
                        </div>
                        <div className="space-y-sm">
                          <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                            GSTIN <span className="text-error">*</span>
                          </label>
                          <input
                            type="text"
                            value={historyPaymentEdit.gstin || ""}
                            onChange={(e) =>
                              setHistoryPaymentEdit((prev) => ({ ...prev, gstin: e.target.value }))
                            }
                            placeholder="Enter GSTIN..."
                            className={`w-full bg-surface-container-low border rounded-xl px-md py-2 md:py-sm font-black focus:ring-2 focus:ring-primary outline-none text-sm font-mono ${(historyPaymentEdit.gstin || "").trim() ? 'border-outline-variant text-on-surface' : 'border-error/50 text-on-surface-variant'}`}
                          />
                        </div>
                      </div>
                    )
                  }

                  {/* Total Amount Details */}
                  {
                    historyPaymentEdit.amount &&
                    (() => {
                      const amt = Number(historyPaymentEdit.amount) || 0;

                      const cgst =
                        amt * (Number(gstRates.cgst) / 100);

                      const sgst =
                        amt * (Number(gstRates.sgst) / 100);

                      const igst =
                        amt * (Number(gstRates.igst) / 100);

                      const customerState = (formData.state || "").trim();

                      const total = historyPaymentEdit.withGst
                        ? customerState === "Tamil Nadu"
                          ? amt + cgst + sgst
                          : customerState
                            ? amt + igst
                            : amt
                        : amt;

                      return (
                        <div className="bg-primary/5 p-md rounded-xl border border-primary/10 space-y-1 text-xs animate-in fade-in duration-200">

                          <div className="flex justify-between font-bold text-on-surface-variant">
                            <span>Base Amount:</span>
                            <span>
                              ₹{formatAmount(amt)}
                            </span>
                          </div>

                          {historyPaymentEdit.withGst && (
                            <>
                              {(formData.state || "").trim() === "Tamil Nadu" ? (
                                <>
                                  <div className="flex justify-between text-on-surface-variant">
                                    <span>
                                      CGST ({gstRates.cgst}%):
                                    </span>
                                    <span>
                                      ₹{formatAmount(cgst)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between text-on-surface-variant">
                                    <span>
                                      SGST ({gstRates.sgst}%):
                                    </span>
                                    <span>
                                      ₹{formatAmount(sgst)}
                                    </span>
                                  </div>
                                </>
                              ) : (formData.state || "").trim() ? (
                                <div className="flex justify-between text-on-surface-variant">
                                  <span>
                                    IGST ({gstRates.igst}%):
                                  </span>
                                  <span>
                                    ₹{formatAmount(igst)}
                                  </span>
                                </div>
                              ) : null}
                            </>
                          )}

                          <div className="flex justify-between font-black text-primary pt-2 border-t border-primary/20 text-sm">
                            <span>Total Amount:</span>
                            <span>
                              ₹{formatAmount(total)}
                            </span>
                          </div>

                        </div>
                      );
                    })()
                  }

                  <button
                    onClick={handleHistoryPaymentUpdate}
                    className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )
      }

      {/* Generate Invoice Wizard Modal */}
      {
        downloadModalConfig.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-surface-container-lowest border border-outline-variant rounded-2xl w-full ${downloadModalConfig.step === "share" ? "max-w-[850px] h-[85vh]" : "max-w-[550px]"
              } overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] transition-all`}>
              {/* Modal Header */}
              <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
                <div className="flex items-center gap-sm text-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    {downloadModalConfig.step === "config"
                      ? "settings"
                      : downloadModalConfig.step === "actions"
                        ? "receipt_long"
                        : "description"}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-on-surface">
                      {downloadModalConfig.step === "config"
                        ? "Generate Invoice"
                        : downloadModalConfig.step === "actions"
                          ? "Invoice Options"
                          : "Invoice Preview"}
                    </h3>
                    <p className="text-xs text-primary font-bold">
                      {downloadModalConfig.customer?.name || formData.name || selectedCustomer?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {downloadModalConfig.step === "share" && (
                    <>
                      <button
                        type="button"
                        onClick={handleDownloadInvoice}
                        title="Download Invoice"
                        className="w-9 h-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEmailShareDirect}
                        title="Share via Email"
                        className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary hover:brightness-110 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDownloadModalConfig((prev) => ({ ...prev, isOpen: false }))}
                    title="Close"
                    className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors cursor-pointer text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-md md:p-lg space-y-lg overflow-y-auto custom-scrollbar flex-1">
                {downloadModalConfig.step === "config" && (
                  <form onSubmit={handleConfigSubmit} className="space-y-md">
                    {/* Multi-Order or Payment Selection Section */}
                    {downloadModalConfig.paymentData ? (
                      <div className="p-md bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                            Payment Invoice ({formatDate(downloadModalConfig.paymentData.date)})
                          </span>
                          <span className="text-sm font-black text-success">
                            ₹{downloadModalConfig.paymentData.amount.toLocaleString()}
                          </span>
                        </div>
                        {downloadModalConfig.paymentData.products?.length > 0 && (
                          <div className="text-xs font-bold text-on-surface">
                            {downloadModalConfig.paymentData.products.map(p => p.product).join(', ')}
                          </div>
                        )}
                        {downloadModalConfig.paymentData.domainUrl && (
                          <div className="text-xs font-semibold text-primary">
                            {downloadModalConfig.paymentData.domainUrl}
                          </div>
                        )}
                        {downloadModalConfig.paymentData.description && (
                          <div className="text-xs text-on-surface-variant italic pt-1 border-t border-outline-variant/20">
                            Remarks: {downloadModalConfig.paymentData.description}
                          </div>
                        )}
                      </div>
                    ) : (() => {
                      const allOrders = (downloadModalConfig.customer?.orders || formData.orders || [])
                        .slice()
                        .sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
                      const selIds = (downloadModalConfig.selectedOrderIds || []).map(String);
                      // Only show orders that belong to this invoice
                      const invoiceOrders = allOrders.filter(o => selIds.includes(String(o._id)));
                      if (invoiceOrders.length === 0) return null;

                      return (
                        <div className="space-y-2 p-md bg-surface-container-low rounded-xl border border-outline-variant/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                              Include Services / Orders ({invoiceOrders.length})
                            </span>
                          </div>

                          <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                            {invoiceOrders.map((ord, idx) => {
                              const domain = ord.domainUrl;
                              const productsStr = ord.products?.map((p) => p.product).join(", ") || "Service";
                              return (
                                <div
                                  key={ord._id || idx}
                                  className="flex items-center justify-between p-md rounded-xl border bg-primary/5 border-primary/40 text-on-surface shadow-xs"
                                >
                                  <div className="flex items-start gap-md min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={true}
                                      readOnly
                                      disabled
                                      className="w-4 h-4 rounded text-primary accent-primary mt-0.5 cursor-not-allowed opacity-60"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-xs text-on-surface truncate">
                                        {formatDate(ord.orderDate)} - {domain || productsStr}
                                      </div>
                                      <div className="text-[11px] text-on-surface-variant font-medium truncate">
                                        {productsStr} {ord.paymentStatus ? `(${ord.paymentStatus})` : ''}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="font-black text-xs text-primary font-tabular-nums shrink-0 ml-2">
                                    ₹{(ord.totalPrice || 0).toLocaleString()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Date & Number row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                      <div className="space-y-sm">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                          Invoice Date
                        </label>
                        <input
                          type="date"
                          value={downloadModalConfig.invoiceDate || currentDate}
                          onChange={(e) =>
                            setDownloadModalConfig((prev) => ({
                              ...prev,
                              invoiceDate: e.target.value,
                            }))
                          }
                          onClick={(e) => e.target.showPicker()}
                          className="w-full h-[42px] bg-surface-container-low border border-outline-variant rounded-xl px-md font-body-md focus:ring-2 focus:ring-primary outline-none text-xs md:text-sm"
                        />
                      </div>

                    </div>


                    <div className="pt-md">
                      <button
                        type="submit"
                        disabled={downloadModalConfig.isSaving}
                        className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl transition-all active:scale-[0.98] shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {downloadModalConfig.isSaving ? (
                          <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span>Continue</span>
                            <span className="material-symbols-outlined text-[18px]">
                              arrow_forward
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {downloadModalConfig.step === "actions" && (
                  <div className="space-y-md">
                    <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-md space-y-2 mb-2 text-sm">
                      {downloadModalConfig.selectedOrderIds?.length > 0 && (() => {
                        const allOrders = downloadModalConfig.customer?.orders || formData.orders || [];
                        const selIds = downloadModalConfig.selectedOrderIds.map(String);
                        const selectedOrders = allOrders.filter((o) =>
                          selIds.includes(String(o._id))
                        );

                        return (
                          <div className="border-b border-outline-variant/20 pb-2 mb-2 space-y-1 text-xs">
                            <div className="flex justify-start items-center">
                              <span className="text-on-surface-variant font-bold">
                                Selected Services ({selectedOrders.length})
                              </span>
                            </div>
                            <div className="text-[11px] text-on-surface-variant font-medium space-y-1">
                              {selectedOrders.map((ord, idx) => (
                                <div key={idx} className="flex justify-start items-center">
                                  <span className="truncate max-w-[280px]">
                                    • {ord.domainUrl || ord.products?.map((p) => p.product).join(", ")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Invoice Date</label>
                        <input
                          type="date"
                          value={downloadModalConfig.invoiceDate || ""}
                          onChange={(e) => setDownloadModalConfig(prev => ({ ...prev, invoiceDate: e.target.value }))}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm shadow-sm"
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-on-surface-variant">Tax Configuration</span>
                        <span className="font-bold text-primary">
                          {downloadModalConfig.withGst ? "With GST" : "Without GST"}
                        </span>
                      </div>
                      {downloadModalConfig.withGst && (
                        <>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant">State</span>
                            <span className="font-bold text-on-surface">
                              {downloadModalConfig.state}
                            </span>
                          </div>
                          {downloadModalConfig.gstin && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-on-surface-variant">GSTIN</span>
                              <span className="font-bold text-on-surface">
                                {downloadModalConfig.gstin}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Editable Invoice Number Input */}
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Invoice Number</label>
                      <input
                        type="text"
                        value={downloadModalConfig.customInvoiceNo || ""}
                        onChange={(e) => setDownloadModalConfig(prev => ({ ...prev, customInvoiceNo: e.target.value }))}
                        placeholder="e.g. 0001-JWS-07-2026 or JT019-07-2026"
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono font-bold text-sm shadow-sm"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handlePrepareShareInvoice}
                        disabled={downloadModalConfig.isSaving}
                        className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-md hover:brightness-110 disabled:opacity-50 text-sm"
                      >
                        {downloadModalConfig.isSaving ? (
                          <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                            update Invoice
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {downloadModalConfig.step === "share" && (
                  <div className="flex flex-col h-full space-y-md">
                    {/* Full PDF Preview */}
                    <div className="flex-1 w-full border border-outline-variant rounded-xl overflow-hidden shadow-inner bg-surface-container-low min-h-[450px] h-full">
                      {downloadModalConfig.pdfUrl ? (
                        <iframe
                          src={`${downloadModalConfig.pdfUrl}#toolbar=0&navpanes=0`}
                          className="w-full h-full border-0 min-h-[450px]"
                          title="Invoice Preview"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center border border-outline-variant border-dashed rounded-xl bg-surface-container-low text-xs text-on-surface-variant h-full min-h-[450px]">
                          Generating preview...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {
        invoicePreviewModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[780px] h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-md border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[24px]">description</span>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">
                      Invoice Preview - {invoicePreviewModal.invoiceNo}
                    </h3>
                    <p className="text-xs text-primary font-bold">
                      {formData.name || selectedCustomer?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (invoicePreviewModal.blob) {
                        const url = window.URL.createObjectURL(invoicePreviewModal.blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `Invoice-${invoicePreviewModal.invoiceNo || "Preview"}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        toast.success("Invoice downloaded successfully!");
                      }
                    }}
                    title="Download Invoice"
                    className="w-9 h-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (invoicePreviewModal.url) window.URL.revokeObjectURL(invoicePreviewModal.url);
                      setInvoicePreviewModal({ isOpen: false, invoiceNo: "", url: null, blob: null });
                    }}
                    title="Close"
                    className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 w-full bg-surface-container-low p-2">
                <iframe
                  src={invoicePreviewModal.url ? `${invoicePreviewModal.url}#toolbar=0&navpanes=0` : ""}
                  className="w-full h-full border-0 rounded-lg shadow-inner"
                  title="Invoice Preview"
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Confirmation Prompt Modal for Invoice Generation */}
      {customerInvoicePrompt.isOpen && (
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
                  <h3 className="font-h3 text-h3 text-[18px] leading-tight font-black tracking-tight">{customerInvoicePrompt.title}</h3>
                  <p className="text-primary font-bold text-xs mt-0.5">{formData.name || selectedCustomer?.name}</p>
                </div>
              </div>

              <div className="py-sm space-y-2">
                <p className="text-sm font-semibold text-on-surface-variant leading-relaxed">
                  {customerInvoicePrompt.message}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low px-lg py-sm flex justify-end gap-sm border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setCustomerInvoicePrompt({ isOpen: false, title: "", message: "", config: null })}
                className="px-lg py-2 rounded-lg font-bold text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  const cfg = customerInvoicePrompt.config;
                  setCustomerInvoicePrompt({ isOpen: false, title: "", message: "", config: null });
                  if (cfg) {
                    setDownloadModalConfig(cfg);
                  }
                }}
                className="px-xl py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Management & Balance Detail Modal */}
      {selectedPaymentDetail && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-md bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[650px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
              <div className="flex items-center gap-sm text-primary">
                <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
                <div>
                  <h3 className="text-lg font-black text-on-surface">Payment Management</h3>
                  <p className="text-xs text-primary font-bold">
                    {selectedPaymentDetail.customer?.name || formData.name} • {selectedPaymentDetail.order?.domainUrl || selectedPaymentDetail.payment.domainUrl || "Order Services"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentDetail(null)}
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
                  <span className="text-[10px] uppercase font-black text-on-surface-variant tracking-wider block">Order Price</span>
                  <span className="text-base md:text-lg font-black text-on-surface">
                    ₹{(selectedPaymentDetail.totalOrderPrice || 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                  <span className="text-[10px] uppercase font-black text-emerald-700 tracking-wider block">Total Paid</span>
                  <span className="text-base md:text-lg font-black text-emerald-600">
                    ₹{(selectedPaymentDetail.totalPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border text-center ${
                  selectedPaymentDetail.balanceDue > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
                    : "bg-primary/10 border-primary/20 text-primary"
                }`}>
                  <span className="text-[10px] uppercase font-black tracking-wider block">
                    {selectedPaymentDetail.balanceDue > 0 ? "Balance Due" : "Settled"}
                  </span>
                  <span className="text-base md:text-lg font-black">
                    ₹{(selectedPaymentDetail.balanceDue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Order Status Badge & Services info */}
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-on-surface block">
                    {selectedPaymentDetail.order?.products?.map(p => p.product).join(', ') || "Services"}
                  </span>
                  {selectedPaymentDetail.order?.domainUrl && (
                    <span className="text-[11px] text-primary font-bold">{selectedPaymentDetail.order.domainUrl}</span>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                  selectedPaymentDetail.balanceDue === 0
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                }`}>
                  {selectedPaymentDetail.balanceDue === 0 ? "Fully Paid" : "Partially Paid"}
                </span>
              </div>

              {/* Milestone Breakdown List */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
                  Recorded Milestones & Payments ({selectedPaymentDetail.paymentsList?.length || 1})
                </span>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {(selectedPaymentDetail.paymentsList || [selectedPaymentDetail.payment]).map((p, pIdx) => {
                    const isAdvance = p.paymentStage === 'advance';
                    const isMid = p.paymentStage === 'mid';
                    const isFinal = p.paymentStage === 'final';
                    const stageLabel = isAdvance ? 'Advance' : (isMid ? `Milestone #${p.stageNumber || pIdx}` : (isFinal ? 'Final Settlement' : 'Regular'));

                    return (
                      <div
                        key={p._id || pIdx}
                        className="flex items-center justify-between p-2.5 rounded-xl border bg-surface-container-low border-outline-variant/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            isAdvance ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                            isMid ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                            isFinal ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                            'bg-primary/10 text-primary border-primary/20'
                          }`}>
                            {stageLabel}
                          </span>
                          <span className="text-xs font-semibold text-on-surface">{formatDate(p.date)}</span>
                          {p.description && (
                            <span className="text-[11px] text-on-surface-variant italic truncate max-w-[150px]">
                              "{p.description}"
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-emerald-600">
                          ₹{(p.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="p-md md:p-lg border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-sm shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadFromDetailModal(selectedPaymentDetail)}
                className="px-md py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-primary/20"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Generate Invoice
              </button>

              <div className="flex items-center gap-sm">
                {selectedPaymentDetail.balanceDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleQuickPayBalance(selectedPaymentDetail)}
                    className="px-lg py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Pay Balance (₹{selectedPaymentDetail.balanceDue.toLocaleString()})
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Order Completed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentDetail(null)}
                  className="px-md py-2 rounded-xl font-bold text-xs text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Invoice */}
      <ConfirmationModal
        isOpen={isDeleteInvoiceModalOpen}
        onClose={() => {
          setIsDeleteInvoiceModalOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={confirmDeleteInvoice}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoiceToDelete?.invoiceNo || ''}? This action cannot be undone.`}
        confirmText="Delete Invoice"
        type="danger"
      />

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
                  <h3 className="text-base font-black tracking-tight text-on-surface truncate">Payment Confirmation</h3>
                  <p className="text-[11px] text-on-surface-variant font-medium truncate mt-0.5">Verify or edit payment confirmation email before sending</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseComposeModal}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-md overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-bold text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-inner"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Message Content</label>
                <textarea
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
                onClick={handleCloseComposeModal}
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
  );
};

export default Customers;