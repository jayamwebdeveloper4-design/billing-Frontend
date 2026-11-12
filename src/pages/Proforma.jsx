import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getProformas,
  getNextProformaNumber,
  createProforma,
  updateProforma,
  deleteProforma,
  generateProformaPdf
} from "../api/proformaApi";
import { getCustomers } from "../api/customerApi";
import { getGstSettings } from "../api/gstSettingsApi";
import ConfirmationModal from "../components/ConfirmationModal";
import toast from 'react-hot-toast';

const Proforma = () => {

  const [proformas, setProformas] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [orderConfigs, setOrderConfigs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProforma, setSelectedProforma] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProforma, setEditingProforma] = useState(null);
  const [gstSettings, setGstSettings] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [proformaToDelete, setProformaToDelete] = useState(null);
  const [isNewCustomerFormOpen, setIsNewCustomerFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Proforma Form State
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newState, setNewState] = useState("Tamil Nadu");
  const [newCountry, setNewCountry] = useState("India");
  const [newGstNumber, setNewGstNumber] = useState("");
  const [newProformaNo, setNewProformaNo] = useState("JWS-PI-01");
  const [newGstType, setNewGstType] = useState("withoutGST");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newItems, setNewItems] = useState([
    { Particulars: "", price: "" }
  ]);

  // Validation State
  const [formErrors, setFormErrors] = useState({});

  // Dynamic GST rates from settings
  const cgstPercent = gstSettings?.cgstPercentage ?? 9;
  const sgstPercent = gstSettings?.sgstPercentage ?? 9;
  const igstPercent = gstSettings?.igstPercentage ?? 18;

  const isTamilNadu = newState === "Tamil Nadu" && (newCountry.toLowerCase() === "india" || !newCountry);
  const totalGstPercent = isTamilNadu ? (cgstPercent + sgstPercent) : igstPercent;

  // Live calculation breakdown (memoized so it only recalculates when relevant inputs change)
  const {
    calculatedSubtotal,
    calculatedCgst,
    calculatedSgst,
    calculatedIgst,
    calculatedUnroundedTotal,
    calculatedTotal,
    hasDecimals,
    calculatedRoundOffLabel
  } = useMemo(() => {
    const subtotal = newItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
    const cgst = newGstType === "withGST" && isTamilNadu ? Math.round(((subtotal * cgstPercent) / 100) * 100) / 100 : 0;
    const sgst = newGstType === "withGST" && isTamilNadu ? Math.round(((subtotal * sgstPercent) / 100) * 100) / 100 : 0;
    const igst = newGstType === "withGST" && !isTamilNadu ? Math.round(((subtotal * igstPercent) / 100) * 100) / 100 : 0;
    const unroundedTotal = Number(
      (subtotal + (newGstType === "withGST" ? (isTamilNadu ? cgst + sgst : igst) : 0)).toFixed(2)
    );
    const integerPart = Math.floor(unroundedTotal);
    const decimalPart = Number((unroundedTotal - integerPart).toFixed(2));
    const hasDec = decimalPart > 0 && decimalPart < 1;
    const isUp = decimalPart >= 0.50;
    const roundedTotal = isUp ? integerPart + 1 : integerPart;
    const roundOffLabel = isUp ? "Total (Rounded-up)" : "Total (Rounded-off)";

    return {
      calculatedSubtotal: subtotal,
      calculatedCgst: cgst,
      calculatedSgst: sgst,
      calculatedIgst: igst,
      calculatedUnroundedTotal: unroundedTotal,
      calculatedTotal: roundedTotal,
      hasDecimals: hasDec,
      calculatedRoundOffLabel: roundOffLabel
    };
  }, [newItems, newGstType, isTamilNadu, cgstPercent, sgstPercent, igstPercent]);

  // Load Proformas, Customers and GST Settings on Mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const settings = await getGstSettings();
        setGstSettings(settings);
      } catch (error) {
        console.error("Error fetching GST settings:", error);
      }

      try {
        const data = await getProformas();
        if (Array.isArray(data) && data.length > 0) {
          setProformas(data);
        }
      } catch (error) {
        console.error("Error loading proformas from backend:", error);
      }

      try {
        const custs = await getCustomers();
        if (Array.isArray(custs)) {
          setCustomersList(custs);
        }
      } catch (error) {
        console.error("Error fetching customers list:", error);
      }

      computeNextProformaNo("withoutGST");
    };
    fetchInitialData();
  }, []);

  // Compute next proforma number (last proforma number + 1)
  const computeNextProformaNo = useCallback(async (type = newGstType) => {
    try {
      const nextNo = await getNextProformaNumber(type);
      if (nextNo) {
        setNewProformaNo(nextNo);
        return;
      }
    } catch (err) {
      console.error("Failed to fetch next proforma number from API:", err);
    }

    // Fallback: parse numbers from existing array based on type
    const isWithGst = type === "withGST";
    const prefix = isWithGst ? "JT-PI-" : "JWS-PI-";
    const regex = isWithGst ? /^JT-?PI-?(\d+)/i : /^JWS-?PI-?(\d+)/i;
    let maxSeq = 0;
    proformas.forEach((item) => {
      if (!item.proforma_no) return;
      const match = item.proforma_no.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });
    setNewProformaNo(`${prefix}${String(maxSeq + 1).padStart(2, "0")}`);
  }, [proformas, newGstType]);

  // Reset Form & Load Next Proforma Number
  const resetForm = useCallback((defaultType = "withoutGST") => {
    setSelectedCustomerId("");
    setCustomerSearchQuery("");
    setIsCustomerSearchOpen(false);
    setIsNewCustomerFormOpen(false);
    setOrderConfigs([]);
    setNewCompanyName("");
    setNewContactPerson("");
    setNewPhoneInput("");
    setNewEmailInput("");
    setNewAddress("");
    setNewState("Tamil Nadu");
    setNewCountry("India");
    setNewGstNumber("");
    setNewGstType(defaultType);
    setNewDate(new Date().toISOString().slice(0, 10));
    setNewItems([{ Particulars: "", price: "" }]);
    setFormErrors({});
    setIsSaving(false);
    computeNextProformaNo(defaultType);
  }, [computeNextProformaNo]);

  // Helper to format date string to YYYY-MM-DD for date input
  const formatDateForInput = (dStr) => {
    if (!dStr) return new Date().toISOString().slice(0, 10);
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
      return d.toISOString().slice(0, 10);
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  };

  // Helper to calculate End Date based on Start Date and Year count
  const calculateEndDate = (startDateStr, yearsCount = 1) => {
    if (!startDateStr) return "";
    try {
      const d = new Date(startDateStr);
      if (isNaN(d.getTime())) return "";
      d.setFullYear(d.getFullYear() + Number(yearsCount));
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  };

  // Helper to calculate Next Day (dStr + 1 day) formatted for date input
  const getNextDayForInput = (dStr) => {
    if (!dStr) return new Date().toISOString().slice(0, 10);
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  };

  // Helper to format date as DD.MM.YYYY
  const formatDateWithDots = (dStr) => {
    if (!dStr) return "";
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch (e) {
      return "";
    }
  };

  const formatParticularsForDisplay = (str) => {
    if (!str) return '';
    let res = str;
    if (/^Renewal of\s+/i.test(res)) {
      res = res.replace(/^(Renewal of\s+)(.*?)(?=\s+for\s+|$)/i, (m, p1, p2) => {
        if (!p2 || p2.includes('<strong') || p2.includes('<b>')) return m;
        return `${p1}<strong class="font-bold">${p2}</strong>`;
      });
    } else {
      res = res.replace(/^([a-zA-Z0-9\s&,/\-]+?)(?=\s+for\s+(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i, (m, p1) => {
        if (!p1 || p1.includes('<strong') || p1.includes('<b>')) return m;
        return `<strong class="font-bold">${p1}</strong>`;
      });
    }
    res = res.replace(/\b((?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)\b/g, (m) => {
      let dom = m.trim().replace(/^https?:\/\//i, '');
      if (dom.includes('.') && !dom.toLowerCase().startsWith('www.')) {
        dom = 'www.' + dom;
      }
      return `<strong class="font-bold">${dom}</strong>`;
    });
    res = res.replace(/\b(\d{2}[\.\/]\d{2}[\.\/]\d{4}|\d{4}-\d{2}-\d{2})\b/g, '<strong class="font-bold">$1</strong>');
    return res;
  };

  // Helper to format particular text from order config
  const buildOrderParticulars = (config) => {
    const hasValidation = config.validationEnabled !== false;
    const startFmt = formatDateWithDots(config.startDate);
    const endFmt = formatDateWithDots(config.endDate);

    const yrsNum = Number(config.years) || 1;
    const yearText = yrsNum > 1 ? `${yrsNum} years` : "1 year";

    const rawProd = config.productsStr || "";
    let rawDomain = config.domainUrl || "";
    if (rawDomain) {
      let clean = rawDomain.trim().replace(/^https?:\/\//i, '');
      if (clean.includes('.') && !clean.toLowerCase().startsWith('www.')) {
        clean = 'www.' + clean;
      }
      rawDomain = clean;
    }

    const capitalizeWords = (str) => {
      if (!str) return '';
      return str.replace(/\b[a-z]/g, (char) => char.toUpperCase());
    };

    const formatProductList = (str) => {
      if (!str) return "";
      const prods = str.split(/[,&]/).map((p) => capitalizeWords(p.trim())).filter(Boolean);
      if (prods.length === 0) return "";
      if (prods.length === 1) return prods[0];
      if (prods.length === 2) return `${prods[0]} & ${prods[1]}`;
      const firstParts = prods.slice(0, -1).join(", ");
      const lastPart = prods[prods.length - 1];
      return `${firstParts} & ${lastPart}`;
    };

    const cleanProd = formatProductList(rawProd);

    let serviceTitle = "";
    if (hasValidation) {
      if (cleanProd && rawDomain) {
        serviceTitle = `Renewal of ${cleanProd} for ${rawDomain}`;
      } else if (rawDomain) {
        serviceTitle = `Renewal of ${rawDomain}`;
      } else if (cleanProd) {
        serviceTitle = `Renewal of ${cleanProd}`;
      } else {
        serviceTitle = "Renewal of Service";
      }

      if (/^renewal of/i.test(rawProd)) {
        const match = rawProd.match(/^(renewal of\s+)(.*)$/i);
        if (match) {
          serviceTitle = `${match[1]}${formatProductList(match[2])}`;
        } else {
          serviceTitle = rawProd;
        }
      } else if (/^renewal of/i.test(rawDomain)) {
        serviceTitle = rawDomain;
      }

      if (startFmt && endFmt) {
        return `${serviceTitle} for ${yearText} from ${startFmt} to ${endFmt}`;
      } else if (startFmt) {
        return `${serviceTitle} for ${yearText} starting ${startFmt}`;
      }
      return `${serviceTitle} for ${yearText}`;
    } else {
      if (cleanProd && rawDomain) {
        serviceTitle = `${cleanProd} for ${rawDomain}`;
      } else if (rawDomain) {
        serviceTitle = rawDomain;
      } else if (cleanProd) {
        serviceTitle = cleanProd;
      } else {
        serviceTitle = "Service";
      }
      return serviceTitle;
    }
  };

  // Helper to format array or string for phone/email display
  const formatArrayOrString = (val) => {
    if (Array.isArray(val)) {
      return val.filter(Boolean).join(", ");
    }
    return val || "";
  };

  // Split a comma-separated input string into a clean array
  const splitCommaSeparated = (val) =>
    (val || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  // Convert number to English words (Indian Numbering System)
  const numberToWords = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '';
    num = Math.round(Number(num));
    if (num === 0) return 'Zero Rupees Only';
    if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ',
      'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ',
      'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numStr = num.toString();
    if (numStr.length > 9) return 'Overflow';
    const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';

    const parts = [];
    if (Number(n[1]) !== 0) {
      const val = Number(n[1]);
      parts.push(((a[val] || (b[n[1][0]] + ' ' + a[n[1][1]])).trim()) + ' Crore');
    }
    if (Number(n[2]) !== 0) {
      const val = Number(n[2]);
      parts.push(((a[val] || (b[n[2][0]] + ' ' + a[n[2][1]])).trim()) + ' Lakh');
    }
    if (Number(n[3]) !== 0) {
      const val = Number(n[3]);
      parts.push(((a[val] || (b[n[3][0]] + ' ' + a[n[3][1]])).trim()) + ' Thousand');
    }
    if (Number(n[4]) !== 0) {
      const val = Number(n[4]);
      parts.push(((a[val] || (b[n[4][0]] + ' ' + a[n[4][1]])).trim()) + ' Hundred');
    }
    if (Number(n[5]) !== 0) {
      const val = Number(n[5]);
      parts.push((a[val] || (b[n[5][0]] + ' ' + a[n[5][1]])).trim());
    }

    if (parts.length === 0) return 'Rupees Only';
    if (parts.length === 1) return parts[0] + ' Rupees Only';

    const lastPart = parts.pop();
    return parts.join(' ') + ' and ' + lastPart + ' Rupees Only';
  };

  // ---------------------------------------------------------------------
  // SINGLE-SELECT ORDER LOGIC
  // Only one order/service can be selected at a time. Selecting a new
  // order automatically deselects any previously selected one, and the
  // newItems array always reflects that single selected order (add/edit/
  // delete of the invoice item is driven entirely by this one selection).
  // ---------------------------------------------------------------------

  // Sync selected orders to newItems
  const syncSelectedOrdersToItems = useCallback((configs) => {
    const selected = configs.filter((c) => c.isSelected);
    if (selected.length > 0) {
      setNewItems(
        selected.map((c) => ({
          orderId: c.orderId,
          Particulars: buildOrderParticulars(c),
          price: c.totalPrice || 0,
        }))
      );
    } else {
      setNewItems([{ Particulars: "", price: "" }]);
    }
  }, []);

  // Toggle selection for order rows — multi-select.
  const handleOrderToggleSelect = useCallback((index) => {
    setOrderConfigs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isSelected: !updated[index].isSelected };
      syncSelectedOrdersToItems(updated);
      return updated;
    });
  }, [syncSelectedOrdersToItems]);

  const handleOrderConfigChange = useCallback((index, field, value) => {
    setOrderConfigs((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      if (field === "startDate" || field === "years") {
        const start = field === "startDate" ? value : current.startDate;
        const yrs = field === "years" ? Number(value) : Number(current.years);
        current.endDate = calculateEndDate(start, yrs);
        if (current.basePrice > 0) {
          current.totalPrice = current.basePrice * yrs;
        }
      }

      updated[index] = current;
      syncSelectedOrdersToItems(updated);
      return updated;
    });
  }, [syncSelectedOrdersToItems]);

  // Handle selecting a customer from searchable dropdown / email lookup
  const handleCustomerSelect = (customer) => {
    if (!customer) return;
    setSelectedCustomerId(customer._id);
    setIsCustomerSearchOpen(false);

    setCustomerSearchQuery(formatArrayOrString(customer.email) || customer.name || "");
    const names = (customer.name || "").split(";").map((n) => n.trim()).filter(Boolean);
    const addresses = (customer.address || "").split(";").map((a) => a.trim()).filter(Boolean);
    setNewCompanyName(names.length > 0 ? names[0] : (customer.name || ""));
    setNewContactPerson(customer.contactPerson || customer.contact_person || "");
    setNewPhoneInput(formatArrayOrString(customer.phone));
    setNewEmailInput(formatArrayOrString(customer.email));
    setNewAddress(addresses.length > 0 ? addresses[0] : (customer.address || ""));
    setNewState(customer.state || "Tamil Nadu");
    setNewCountry(customer.country || "India");
    setNewGstNumber(customer.gstin || "");
    setNewGstType(customer.gstin ? "withGST" : "withoutGST");
  };

  // Handle switching to New Customer Details input
  const handleNewCustomerClick = () => {
    setSelectedCustomerId("");
    setCustomerSearchQuery("");
    setIsCustomerSearchOpen(false);
    setNewCompanyName("");
    setNewContactPerson("");
    setNewPhoneInput("");
    setNewEmailInput("");
    setNewAddress("");
    setNewState("Tamil Nadu");
    setNewCountry("India");
    setNewGstNumber("");
    setNewGstType("withoutGST");
  };

  // Filter customers for searchable customer select (memoized)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customersList;
    const q = customerSearchQuery.toLowerCase().trim();
    return customersList.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = formatArrayOrString(c.email).toLowerCase();
      const phone = formatArrayOrString(c.phone).toLowerCase();
      return (
        email.includes(q) ||
        name.includes(q) ||
        phone.includes(q)
      );
    });
  }, [customersList, customerSearchQuery]);

  // Filter proformas based on search query (memoized)
  const filteredProformas = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return proformas;
    return proformas.filter((p) => {
      const companyName = (p.companyName || p.customerId?.name || "").toLowerCase();
      const proformaNo = (p.proforma_no || "").toLowerCase();
      const emailStr = formatArrayOrString(p.email || p.customerId?.email).toLowerCase();
      const itemsStr = (p.items || []).map((i) => i.Particulars || "").join(" ").toLowerCase();
      const totalStr = String(p.totalPrice || "");

      return (
        companyName.includes(query) ||
        proformaNo.includes(query) ||
        emailStr.includes(query) ||
        itemsStr.includes(query) ||
        totalStr.includes(query)
      );
    });
  }, [proformas, searchQuery]);

  // Validate inputs before saving
  const validateForm = () => {
    const errs = {};
    if (!newCompanyName || !newCompanyName.trim()) {
      errs.companyName = "Company Name is required";
    }
    if (!newAddress || !newAddress.trim()) {
      errs.address = "Billing Address is required";
    }
    if (!newProformaNo.trim()) {
      errs.proformaNo = "Proforma Number is required";
    }
    if (newGstType === "withGST" && !newGstNumber.trim()) {
      errs.gstNumber = "Customer GST Number is required when GST mode is With GST";
    }

    if (!newItems || newItems.length === 0) {
      errs.items = "At least one service detail is required";
    } else {
      const hasEmptyParticulars = newItems.some((item) => !item.Particulars || !item.Particulars.trim());
      const hasInvalidPrice = newItems.some((item) => isNaN(Number(item.price)) || Number(item.price) <= 0);

      if (hasEmptyParticulars) {
        errs.items = "Service details cannot be empty for any item row";
      } else if (hasInvalidPrice) {
        errs.items = "Price must be a valid number greater than 0";
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Item row operations
  const handleAddItemRow = () => {
    setNewItems((prev) => [...prev, { Particulars: "", price: "" }]);
  };

  const handleRemoveItemRow = (index) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setNewItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Populate form for editing
  const handleOpenEditModal = (item) => {
    setEditingProforma(item);
    setIsNewCustomerFormOpen(true);
    const custId = item.customerId?._id || item.customerId || "";
    let foundCust = null;
    if (custId && customersList.length > 0) {
      foundCust = customersList.find((c) => c._id === custId || c.id === custId);
    }
    if (!foundCust && item.companyName && customersList.length > 0) {
      foundCust = customersList.find((c) => (c.name || "").toLowerCase() === (item.companyName || "").toLowerCase());
    }

    if (foundCust) {
      setSelectedCustomerId(foundCust._id);
      setCustomerSearchQuery(formatArrayOrString(foundCust.email) || foundCust.name || "");
    } else {
      setSelectedCustomerId(custId);
      setCustomerSearchQuery(formatArrayOrString(item.email) || item.companyName || "");
    }

    setNewCompanyName(item.companyName || (item.customerId?.name || ""));
    setNewContactPerson(item.contactPerson || item.customerId?.contactPerson || item.customerId?.contact_person || "");
    setNewPhoneInput(formatArrayOrString(item.phone || item.customerId?.phone));
    setNewEmailInput(formatArrayOrString(item.email || item.customerId?.email));
    setNewAddress(item.address || item.customerId?.address || "");
    setNewState(item.state || item.customerId?.state || "Tamil Nadu");
    setNewCountry(item.country || item.customerId?.country || "India");
    setNewGstNumber(item.gstNumber || item.gstin || item.customerId?.gstin || "");
    setNewProformaNo(item.proforma_no || "");
    setNewGstType(item.gstType || "withGST");
    setNewDate(formatDateForInput(item.date));
    setNewItems(
      item.items && item.items.length > 0
        ? item.items.map((i) => ({ Particulars: i.Particulars, price: i.price }))
        : [{ Particulars: "", price: "" }]
    );
    setFormErrors({});
  };

  // Download Proforma PDF via Backend API
  const handleDownloadPDF = async (proforma) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-toast" });
      const blob = await generateProformaPdf(proforma);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanCompany = (proforma.customerId?.name || proforma.companyName || "Customer").replace(/[\s\/\\]+/g, "");
      const proformaNo = proforma.proforma_no || "Proforma";
      link.setAttribute("download", `PROFORMA-Invoice-${cleanCompany}-${proformaNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!", { id: "pdf-toast" });
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error(err.message || "Failed to download PDF", { id: "pdf-toast" });
    }
  };

  // Save / Update Proforma Invoice
  const handleSaveProforma = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);

    const isTN = (newState || "Tamil Nadu") === "Tamil Nadu" && ((newCountry || "India").toLowerCase() === "india");
    const subtotal = calculatedSubtotal;
    const cgst = isTN ? calculatedCgst : 0;
    const sgst = isTN ? calculatedSgst : 0;
    const igst = !isTN ? calculatedIgst : 0;
    const totalPrice = calculatedTotal;

    const validPhones = splitCommaSeparated(newPhoneInput);
    const validEmails = splitCommaSeparated(newEmailInput);

    const proformaData = {
      customerId: selectedCustomerId || (editingProforma?.customerId?._id || editingProforma?.customerId || undefined),
      date: newDate || (editingProforma ? editingProforma.date : new Date().toISOString().slice(0, 10)),
      proforma_no: newProformaNo || (newGstType === 'withGST' ? 'JT-PI-01' : 'JWS-PI-01'),
      companyName: newCompanyName,
      contactPerson: newContactPerson,
      address: newAddress || "Chennai",
      state: newState || "Tamil Nadu",
      country: newCountry || "India",
      gstNumber: newGstType === "withGST" ? newGstNumber.trim() : "",
      email: validEmails,
      phone: validPhones,
      items: newItems.map((item) => ({
        orderId: item.orderId || undefined,
        Particulars: item.Particulars || "Service",
        price: Number(item.price) || 0
      })),
      subtotal,
      cgst,
      sgst,
      igst,
      totalPrice,
      priceinword: numberToWords(totalPrice),
      gstType: newGstType,
      note: "If you have any doubt on this invoice, please contact us at: 9677 87 6445 / 98405 99789"
    };

    try {
      if (editingProforma) {
        const targetId = editingProforma._id || editingProforma.id || editingProforma.proforma_no;
        if (targetId) {
          await updateProforma(targetId, proformaData);
        }
        toast.success("Proforma invoice updated successfully!");
      } else {
        await createProforma(proformaData);
        toast.success("Proforma invoice saved successfully!");
      }

      // Refresh list from backend to synchronize UI state 1:1 with DB
      try {
        const freshData = await getProformas();
        if (Array.isArray(freshData)) {
          setProformas(freshData);
        }
      } catch (refreshErr) {
        console.warn("Could not refresh proformas list:", refreshErr);
      }

      // Automatically trigger PDF download on save
      await handleDownloadPDF(proformaData);

      setIsAddModalOpen(false);
      setEditingProforma(null);
      resetForm();
    } catch (err) {
      console.error("Error saving proforma:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to save proforma invoice";
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleDeleteClick = (item) => {
    setProformaToDelete(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Proforma from Backend & State
  const handleConfirmDelete = async () => {
    if (!proformaToDelete) return;
    const item = proformaToDelete;
    try {
      const targetId = item._id || item.id || item.proforma_no;
      if (targetId) {
        await deleteProforma(targetId);
      }
      const freshData = await getProformas();
      if (Array.isArray(freshData)) {
        setProformas(freshData);
      } else {
        setProformas((prev) => prev.filter((p) => (p._id ? p._id !== item._id : p.id !== item.id)));
      }
      if (selectedProforma && (selectedProforma._id === item._id || selectedProforma.id === item.id)) {
        setSelectedProforma(null);
      }
      toast.success("Proforma invoice deleted");
    } catch (err) {
      console.error("Error deleting proforma:", err);
      toast.error("Failed to delete proforma invoice");
    } finally {
      setIsDeleteModalOpen(false);
      setProformaToDelete(null);
    }
  };

  return (
    <div className="space-y-md md:space-y-lg pb-20 max-w-full overflow-x-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg md:mb-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Proforma Invoice</h1>
          <p className="text-on-surface-variant text-xs md:text-sm">Manage your static proforma invoices.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingProforma(null);
            setIsAddModalOpen(true);
          }}
          className="w-full sm:w-auto bg-primary text-on-primary px-lg py-sm rounded-full font-bold flex items-center justify-center gap-sm hover:shadow-lg transition-all active:scale-95 cursor-pointer shadow-md flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Proforma
        </button>
      </div>

      {/* Search */}
      <div className="mb-lg grow relative w-full sm:max-w-[500px] p-1">
        <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Search Company Name or Proforma No..."
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-[44px] pr-md py-2.5 text-xs md:text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-full table-auto text-xs md:text-sm">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-bold uppercase tracking-wider text-[10px] md:text-xs">
              <th className="px-md py-md">Date</th>
              <th className="px-md py-md">Proforma No</th>
              <th className="px-md py-md">Customer Details</th>
              <th className="px-md py-md">Total Price</th>
              <th className="px-md py-md text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {filteredProformas.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-lg py-12 text-center text-on-surface-variant">
                  No proforma invoices found.
                </td>
              </tr>
            ) : (
              filteredProformas.map((item, idx) => (
                <tr key={item._id || item.id || idx} className="hover:bg-surface-container-low/60 transition-colors group">
                  <td className="px-md py-md font-medium text-on-surface-variant">
                    {item.date ? new Date(item.date).toLocaleDateString("en-GB") : "27/07/2026"}
                  </td>
                  <td className="px-md py-md font-mono font-bold text-primary">
                    {item.proforma_no}
                  </td>
                  <td className="px-md py-md">
                    <div className="min-w-0 max-w-[220px] flex flex-col gap-0.5">
                      <div className="font-bold text-on-surface truncate">
                        {item.customerId?.name || item.companyName}
                      </div>
                      <div className="text-[11px] text-on-surface-variant truncate">
                        {formatArrayOrString(item.customerId?.phone || item.phone)} • {formatArrayOrString(item.customerId?.email || item.email)}
                      </div>
                    </div>
                  </td>
                  <td className="px-md py-md font-bold text-on-surface whitespace-nowrap">
                    ₹ {Number(item.totalPrice).toLocaleString("en-IN")}
                  </td>
                  <td className="px-md py-md text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleDownloadPDF(item)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="Download PDF"
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                      <button
                        onClick={() => setSelectedProforma(item)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="Edit Proforma"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all cursor-pointer"
                        title="Delete Proforma"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Detail Modal */}
      {selectedProforma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[700px] overflow-hidden shadow-2xl p-md md:p-lg space-y-md relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-outline-variant/30 pb-md">
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-wider">PROFORMA DETAILS</span>
                <h3 className="text-xl font-black text-on-surface">{selectedProforma.proforma_no}</h3>
                <p className="text-xs text-on-surface-variant">
                  Date: {selectedProforma.date ? new Date(selectedProforma.date).toLocaleDateString("en-GB") : "27/07/2026"}
                </p>
              </div>
              <button
                onClick={() => setSelectedProforma(null)}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Customer Information */}
            <div className="bg-surface-container-low p-md rounded-xl space-y-1 text-xs">
              <p className="font-bold text-sm text-on-surface">
                {selectedProforma.customerId?.name || selectedProforma.companyName}
              </p>
              {(selectedProforma.contactPerson || selectedProforma.customerId?.contactPerson || selectedProforma.customerId?.contact_person) && (
                <p className="text-on-surface-variant font-medium">
                  Contact Person: <span className="font-bold text-on-surface">{selectedProforma.contactPerson || selectedProforma.customerId?.contactPerson || selectedProforma.customerId?.contact_person}</span>
                </p>
              )}
              <p className="text-on-surface-variant">
                {selectedProforma.customerId?.address || selectedProforma.address}
              </p>
              <p className="text-on-surface-variant">
                Phone: {formatArrayOrString(selectedProforma.customerId?.phone || selectedProforma.phone)} | Email: {formatArrayOrString(selectedProforma.customerId?.email || selectedProforma.email)}
                {(selectedProforma.customerId?.gstin || selectedProforma.gstNumber) ? ` | GSTIN: ${selectedProforma.customerId?.gstin || selectedProforma.gstNumber}` : ""}
              </p>
              <p className="text-on-surface-variant">
                State: {selectedProforma.state || selectedProforma.customerId?.state || "Tamil Nadu"} | Country: {selectedProforma.country || selectedProforma.customerId?.country || "India"}
              </p>
            </div>

            {/* Items Table */}
            <div className="border border-outline-variant/30 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/30">
                    <th className="p-sm">#</th>
                    <th className="p-sm">Service Details</th>
                    <th className="p-sm text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {selectedProforma.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-sm text-on-surface-variant">{idx + 1}</td>
                      <td className="p-sm font-medium text-on-surface" dangerouslySetInnerHTML={{ __html: formatParticularsForDisplay(item.Particulars) }} />
                      <td className="p-sm text-right font-bold text-on-surface whitespace-nowrap">
                        ₹ {Number(item.price).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {selectedProforma.gstType === "withoutGST" && (() => {
                    const actualSubtotal = Number(
                      selectedProforma.subtotal !== undefined && selectedProforma.subtotal !== null
                        ? selectedProforma.subtotal
                        : selectedProforma.items.reduce((acc, it) => acc + (Number(it.price) || 0), 0)
                    );
                    const intPart = Math.floor(actualSubtotal);
                    const decPart = Number((actualSubtotal - intPart).toFixed(2));
                    const hasDec = decPart > 0;
                    const isUp = decPart >= 0.50;
                    const rounded = isUp ? intPart + 1 : intPart;
                    const rLabel = isUp ? "Total (Rounded-up)" : "Total (Rounded-off)";

                    if (hasDec) {
                      return (
                        <>
                          <tr className="font-bold border-t-2 border-outline-variant/30">
                            <td colSpan="2" className="p-sm text-right text-on-surface">Total Amount</td>
                            <td className="p-sm text-right text-on-surface whitespace-nowrap">
                              ₹ {actualSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="font-bold">
                            <td colSpan="2" className="p-sm text-right text-on-surface">{rLabel}</td>
                            <td className="p-sm text-right text-primary whitespace-nowrap">
                              ₹ {rounded.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </>
                      );
                    } else {
                      return (
                        <tr className="font-bold border-t-2 border-outline-variant/30">
                          <td colSpan="2" className="p-sm text-right text-on-surface">Total Amount</td>
                          <td className="p-sm text-right text-primary whitespace-nowrap">
                            ₹ {intPart.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="bg-surface-container-low p-md rounded-xl space-y-1.5 text-xs text-right">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">GST Mode</span>
                <span className="font-bold text-primary">
                  {selectedProforma.gstType === "withoutGST" ? "Without GST" : `With GST (${totalGstPercent}%)`}
                </span>
              </div>
              {selectedProforma.gstType === "withGST" ? (() => {
                const sub = Number(selectedProforma.subtotal || 0);
                const isTN = selectedProforma.state === "Tamil Nadu" || (!selectedProforma.igst && (selectedProforma.cgst > 0 || selectedProforma.sgst > 0));
                const cgst = isTN ? Number(selectedProforma.cgst !== undefined ? selectedProforma.cgst : Math.round(((sub * cgstPercent) / 100) * 100) / 100) : 0;
                const sgst = isTN ? Number(selectedProforma.sgst !== undefined ? selectedProforma.sgst : Math.round(((sub * sgstPercent) / 100) * 100) / 100) : 0;
                const igst = !isTN ? Number(selectedProforma.igst !== undefined ? selectedProforma.igst : Math.round(((sub * igstPercent) / 100) * 100) / 100) : 0;
                const actualTotal = Number((sub + cgst + sgst + igst).toFixed(2));
                const intPart = Math.floor(actualTotal);
                const decPart = Number((actualTotal - intPart).toFixed(2));
                const hasDec = decPart > 0 && decPart < 1;
                const isUp = decPart >= 0.50;
                const rounded = isUp ? intPart + 1 : intPart;
                const rLabel = isUp ? "Total (Rounded-up)" : "Total (Rounded-off)";

                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Subtotal</span>
                      <span className="font-bold whitespace-nowrap">₹ {sub.toLocaleString("en-IN")}</span>
                    </div>
                    {isTN ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">CGST ({cgstPercent}%)</span>
                          <span className="font-bold whitespace-nowrap">₹ {cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">SGST ({sgstPercent}%)</span>
                          <span className="font-bold whitespace-nowrap">₹ {sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">IGST ({igstPercent}%)</span>
                        <span className="font-bold whitespace-nowrap">₹ {igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {hasDec ? (
                      <>
                        <div className="flex justify-between text-on-surface-variant pt-1 border-t border-outline-variant/20">
                          <span>Total Amount</span>
                          <span className="font-bold whitespace-nowrap">₹ {actualTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black pt-2 border-t border-outline-variant/20 text-primary">
                          <span>{rLabel}</span>
                          <span className="whitespace-nowrap">₹ {rounded.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm font-black pt-2 border-t border-outline-variant/20 text-primary">
                        <span>Total Amount</span>
                        <span className="whitespace-nowrap">₹ {intPart.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </>
                );
              })() : (() => {
                const sub = Number(
                  selectedProforma.subtotal !== undefined && selectedProforma.subtotal !== null
                    ? selectedProforma.subtotal
                    : selectedProforma.items.reduce((acc, it) => acc + (Number(it.price) || 0), 0)
                );
                const intPart = Math.floor(sub);
                const decPart = Number((sub - intPart).toFixed(2));
                const hasDec = decPart > 0 && decPart < 1;
                const isUp = decPart >= 0.50;
                const rounded = isUp ? intPart + 1 : intPart;
                const rLabel = isUp ? "Total (Rounded-up)" : "Total (Rounded-off)";

                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Subtotal</span>
                      <span className="font-bold whitespace-nowrap">₹ {sub.toLocaleString("en-IN")}</span>
                    </div>
                    {hasDec ? (
                      <>
                        <div className="flex justify-between text-on-surface-variant pt-1 border-t border-outline-variant/20">
                          <span>Total Amount</span>
                          <span className="font-bold whitespace-nowrap">₹ {sub.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black pt-2 border-t border-outline-variant/20 text-primary">
                          <span>{rLabel}</span>
                          <span className="whitespace-nowrap">₹ {rounded.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm font-black pt-2 border-t border-outline-variant/20 text-primary">
                        <span>Total Amount</span>
                        <span className="whitespace-nowrap">₹ {intPart.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <p className="text-[11px] text-on-surface-variant italic pt-1 text-left">
                <strong>Amount in Words:</strong> {(selectedProforma.priceinword && !/\d/.test(selectedProforma.priceinword)) ? selectedProforma.priceinword : numberToWords(selectedProforma.totalPrice)}
              </p>
            </div>

            <div className="pt-sm flex justify-end gap-2">
              <button
                onClick={() => handleDownloadPDF(selectedProforma)}
                className="px-md py-2 bg-surface-variant text-on-surface rounded-xl font-bold text-xs hover:brightness-105 cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download PDF
              </button>
              <button
                onClick={() => setSelectedProforma(null)}
                className="px-lg py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-110 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Proforma Modal */}
      {(isAddModalOpen || editingProforma) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[720px] overflow-hidden shadow-2xl p-md md:p-lg space-y-md relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">description</span>
                <h3 className="text-lg font-black text-on-surface">
                  {editingProforma ? "Edit Proforma Invoice" : "Add Proforma Invoice"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProforma(null);
                  resetForm();
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full text-on-surface-variant cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProforma} className="space-y-md text-xs">
              {/* Customer Email Lookup & Details Section */}
              <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/40 space-y-md">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">person_search</span>
                    Customer Details
                  </span>
                </div>

                {/* Case 1: Existing Customer Selected */}
                {selectedCustomerId ? (
                  <div className="bg-surface-container-lowest p-md border border-outline-variant/30 rounded-xl space-y-2">
                    <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Selected Customer Details
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId("");
                          setCustomerSearchQuery("");
                          setIsNewCustomerFormOpen(false);
                          setNewCompanyName("");
                          setNewEmailInput("");
                          setNewPhoneInput("");
                          setNewAddress("");
                          setNewGstNumber("");
                        }}
                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                        Change Customer Email
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Company / Name</span>
                        <span className="font-bold text-on-surface text-sm">{newCompanyName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Contact Person</span>
                        <span className="font-medium text-on-surface">{newContactPerson || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Email</span>
                        <span className="font-medium text-on-surface">{newEmailInput || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Phone</span>
                        <span className="font-medium text-on-surface">{newPhoneInput || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">State</span>
                        <span className="font-medium text-on-surface">{newState}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Country</span>
                        <span className="font-medium text-on-surface">{newCountry || "India"}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Address</span>
                        <span className="font-medium text-on-surface">{newAddress || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                ) : !isNewCustomerFormOpen ? (
                  /* Case 2: Initial View - ONLY Customer Email input shown */
                  <div className="relative space-y-2">
                    <label className="font-bold text-xs text-on-surface flex items-center justify-between">
                      <span>Customer Email *</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Enter customer email to lookup..."
                        value={customerSearchQuery}
                        onFocus={() => setIsCustomerSearchOpen(true)}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setNewEmailInput(e.target.value);
                          setIsCustomerSearchOpen(true);
                        }}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-3 pr-8 py-2.5 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium"
                      />
                      {customerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchQuery("");
                            setNewEmailInput("");
                            setIsCustomerSearchOpen(true);
                          }}
                          className="absolute right-2.5 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>

                    {/* Customer Lookup Dropdown List */}
                    {isCustomerSearchOpen && customerSearchQuery.trim() && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsCustomerSearchOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-20 max-h-[220px] overflow-y-auto divide-y divide-outline-variant/20 animate-in fade-in slide-in-from-top-1 duration-150">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-md text-center space-y-2">
                              <p className="text-on-surface-variant text-xs italic">
                                No existing customer found with email "{customerSearchQuery}".
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomerSearchOpen(false);
                                  setNewEmailInput(customerSearchQuery);
                                  setIsNewCustomerFormOpen(true);
                                }}
                                className="px-md py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[16px]">person_add</span>
                                Add New Customer Details
                              </button>
                            </div>
                          ) : (
                            filteredCustomers.map((c) => (
                              <div
                                key={c._id}
                                onClick={() => {
                                  handleCustomerSelect(c);
                                  setIsNewCustomerFormOpen(false);
                                }}
                                className="p-2.5 hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-between gap-md group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                                    {c.name ? c.name.charAt(0).toUpperCase() : "@"}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors truncate">
                                      {c.name}
                                    </div>
                                    <div className="text-[11px] text-on-surface-variant truncate font-mono">
                                      {formatArrayOrString(c.email) || "No email"} • {formatArrayOrString(c.phone) || "No phone"}
                                    </div>
                                  </div>
                                </div>
                                {c.gstin && (
                                  <span className="text-[9px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0 border border-primary/20">
                                    GSTIN
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Case 3: New Customer Form Open - Fields for Company Name, Phone, Email, Address, State */
                  <div className="bg-surface-container-lowest p-md border border-outline-variant/30 rounded-xl space-y-md">
                    <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        New Customer Details
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomerFormOpen(false);
                        }}
                        className="text-xs text-on-surface-variant hover:text-on-surface font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Back to Email
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      {/* Company Name */}
                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant block">Company / Customer Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Acme Corporation"
                          value={newCompanyName}
                          onChange={(e) => {
                            setNewCompanyName(e.target.value);
                            if (formErrors.companyName) setFormErrors((prev) => ({ ...prev, companyName: null }));
                          }}
                          className={`w-full bg-surface-container-low border rounded-xl p-2.5 text-xs text-on-surface font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary ${
                            formErrors.companyName ? "border-error" : "border-outline-variant"
                          }`}
                        />
                        {formErrors.companyName && (
                          <p className="text-[10px] text-error font-medium">{formErrors.companyName}</p>
                        )}
                      </div>

                      {/* Contact Person */}
                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant block">Contact Person</label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={newContactPerson}
                          onChange={(e) => setNewContactPerson(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Email Input */}
                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant block">Customer Email *</label>
                        <input
                          type="text"
                          placeholder="e.g. client@company.com, info@company.com"
                          value={newEmailInput}
                          onChange={(e) => setNewEmailInput(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Phone Input */}
                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant block">Phone Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210, 9840599789"
                          value={newPhoneInput}
                          onChange={(e) => setNewPhoneInput(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* State Input / Select */}
                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant block">State</label>
                        <select
                          value={newState}
                          onChange={(e) => setNewState(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-medium outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Other State">Other State</option>
                        </select>
                      </div>

                      {/* Country Input */}
                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant block">Country</label>
                        <input
                          type="text"
                          placeholder="e.g. India"
                          value={newCountry}
                          onChange={(e) => setNewCountry(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Address Input */}
                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant block">Billing Address *</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="e.g. 123 Business Street, Chennai, 600001"
                        value={newAddress}
                        onChange={(e) => {
                          setNewAddress(e.target.value);
                          if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: null }));
                        }}
                        className={`w-full bg-surface-container-low border rounded-xl p-2.5 text-xs text-on-surface font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y ${
                          formErrors.address ? "border-error" : "border-outline-variant"
                        }`}
                      />
                      {formErrors.address && (
                        <p className="text-[10px] text-error font-medium">{formErrors.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Proforma Number & Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant block">Proforma No *</label>
                  <input
                    type="text"
                    required
                    value={newProformaNo}
                    onChange={(e) => {
                      setNewProformaNo(e.target.value);
                      if (formErrors.proformaNo) setFormErrors((prev) => ({ ...prev, proformaNo: null }));
                    }}
                    className={`w-full bg-surface-container-low border rounded-xl p-2.5 font-mono text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary ${formErrors.proformaNo ? "border-error" : "border-outline-variant"
                      }`}
                  />
                  {formErrors.proformaNo && (
                    <p className="text-[10px] text-error font-medium">{formErrors.proformaNo}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant block">Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2.5 font-body-md text-on-surface outline-none focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* GST Mode Toggle */}
              <div className="space-y-2">
                <label className="font-bold text-on-surface-variant block">GST Mode</label>
                <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => {
                      setNewGstType("withoutGST");
                      if (!editingProforma) {
                        computeNextProformaNo("withoutGST");
                      }
                      if (formErrors.gstNumber) setFormErrors((prev) => ({ ...prev, gstNumber: null }));
                    }}
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${newGstType === "withoutGST"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                      }`}
                  >
                    Without GST
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewGstType("withGST");
                      if (!editingProforma) {
                        computeNextProformaNo("withGST");
                      }
                    }}
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${newGstType === "withGST"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                      }`}
                  >
                    With GST ({totalGstPercent}%)
                  </button>
                </div>
                {newGstType === "withGST" && (
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant text-[11px] block">Customer GST Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      value={newGstNumber}
                      onChange={(e) => {
                        setNewGstNumber(e.target.value);
                        if (formErrors.gstNumber) setFormErrors((prev) => ({ ...prev, gstNumber: null }));
                      }}
                      className={`w-full bg-surface-container-low border rounded-xl p-2 font-mono text-xs text-on-surface outline-none focus:border-primary ${formErrors.gstNumber ? "border-error" : "border-outline-variant"
                        }`}
                    />
                    {formErrors.gstNumber && (
                      <p className="text-[10px] text-error font-medium">{formErrors.gstNumber}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Service Details Builder */}
              <div className="space-y-sm pt-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-xs text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">list_alt</span>
                    Service Details *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-primary font-bold hover:bg-primary/10 px-2.5 py-1 rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Service
                  </button>
                </div>

                <div className="space-y-2">
                  {newItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-surface-container-low p-2 rounded-xl border border-outline-variant/30">
                      <div className="flex-1">
                        <textarea
                          rows={2}
                          placeholder="Service Details (e.g. Domain Registration & Web Hosting)"
                          value={item.Particulars}
                          onChange={(e) => {
                            handleItemChange(idx, "Particulars", e.target.value);
                            if (formErrors.items) setFormErrors((prev) => ({ ...prev, items: null }));
                          }}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y"
                        />
                      </div>
                      <div className="w-32 flex-shrink-0">
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-on-surface-variant text-xs font-bold pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={item.price}
                            onChange={(e) => {
                              handleItemChange(idx, "price", e.target.value);
                              if (formErrors.items) setFormErrors((prev) => ({ ...prev, items: null }));
                            }}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-6 pr-2 py-2 text-xs font-bold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                          />
                        </div>
                      </div>
                      {newItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-error p-2 hover:bg-error/10 rounded-lg cursor-pointer transition-colors mt-0.5"
                          title="Remove Item"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formErrors.items && (
                  <p className="text-[10px] text-error font-medium mt-1">{formErrors.items}</p>
                )}
              </div>

              {/* Live Calculation Summary Breakdown */}
              <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/30 space-y-2 text-xs">
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="font-bold text-on-surface whitespace-nowrap text-xs">₹ {calculatedSubtotal.toLocaleString("en-IN")}</span>
                </div>
                {newGstType === "withGST" && (
                  <>
                    {isTamilNadu ? (
                      <>
                        <div className="flex justify-between items-center text-on-surface-variant">
                          <span>CGST ({cgstPercent}%)</span>
                          <span className="font-bold text-on-surface whitespace-nowrap">₹ {calculatedCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-on-surface-variant">
                          <span>SGST ({sgstPercent}%)</span>
                          <span className="font-bold text-on-surface whitespace-nowrap">₹ {calculatedSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span>IGST ({igstPercent}%)</span>
                        <span className="font-bold text-on-surface whitespace-nowrap">₹ {calculatedIgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </>
                )}

                {hasDecimals ? (
                  <>
                    <div className="flex justify-between items-center text-on-surface-variant pt-1 border-t border-outline-variant/20">
                      <span>Total Amount</span>
                      <span className="font-bold text-on-surface whitespace-nowrap">
                        ₹ {calculatedUnroundedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-outline-variant/30 text-primary">
                      <span>{calculatedRoundOffLabel}</span>
                      <span className="whitespace-nowrap text-base">₹ {calculatedTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-outline-variant/30 text-primary">
                    <span>Total Amount</span>
                    <span className="whitespace-nowrap text-base">₹ {calculatedTotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-md flex justify-end gap-sm border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProforma(null);
                    resetForm();
                  }}
                  className="px-md py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-lg py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        progress_activity
                      </span>
                      {editingProforma ? "Updating..." : "Saving & Downloading..."}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {editingProforma ? "check" : "picture_as_pdf"}
                      </span>
                      {editingProforma ? "Update Proforma" : "Save & Download"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProformaToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Proforma Invoice"
        message={`Are you sure you want to delete proforma invoice "${proformaToDelete?.proforma_no || proformaToDelete?.companyName || ""}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Proforma;