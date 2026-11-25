import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  X,
  Building2,
  CheckCircle2,
  UserPlus,
  ArrowLeft,
  Trash2,
  Plus,
  Save,
} from "lucide-react";

import Button from "../../../UI/Components/Button";
import InputFeild from "../../../UI/Components/InputFeild";
import { useGetCustomersQuery } from "../../../Redux/Customer";
import { useGetGstSettingsQuery } from "../../../Redux/GstSettings";
import {
  useLazyGetNextProformaNumberQuery,
  useCreateProformaMutation,
  useUpdateProformaMutation,
} from "../../../Redux/Proforma";

// Number to Words Converter (English)
const numberToWords = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "";
  num = Math.round(Number(num));
  if (num === 0) return "Zero Only";
  if (num < 0) return "Negative " + numberToWords(Math.abs(num));

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
    "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numStr = num.toString();
  if (numStr.length > 9) return "Overflow";
  const n = ("000000000" + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";

  let str = "";
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore " : "";
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh " : "";
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand " : "";
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred " : "";
  str += Number(n[5]) !== 0 ? ((str !== "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])) : "";

  return str.trim() + " Only";
};

// Helper: array or string formatter
const formatArrayOrString = (val) => {
  if (!val) return "";
  if (Array.isArray(val)) {
    return val.filter(Boolean).join(", ");
  }
  return String(val);
};

export const AddProforma = ({
  isOpen,
  onClose,
  editingProforma = null,
  proformas = [],
  onSuccess,
  onDownloadPdf,
}) => {
  const { data: customerQueryResponse } = useGetCustomersQuery({ limit: 100 });
  const customersList = useMemo(() => {
    if (Array.isArray(customerQueryResponse?.data)) return customerQueryResponse.data;
    if (Array.isArray(customerQueryResponse)) return customerQueryResponse;
    return [];
  }, [customerQueryResponse]);

  const { data: fetchedGstSettings } = useGetGstSettingsQuery();
  const [gstSettings, setGstSettings] = useState(null);

  useEffect(() => {
    if (fetchedGstSettings) {
      setGstSettings(fetchedGstSettings);
    }
  }, [fetchedGstSettings]);

  const [triggerGetNextProformaNumber] = useLazyGetNextProformaNumberQuery();
  const [createProforma, { isLoading: isCreating }] = useCreateProformaMutation();
  const [updateProforma, { isLoading: isUpdating }] = useUpdateProformaMutation();

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isNewCustomerFormOpen, setIsNewCustomerFormOpen] = useState(false);

  // Form states
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newState, setNewState] = useState("Tamil Nadu");
  const [newCountry, setNewCountry] = useState("India");
  const [newGstNumber, setNewGstNumber] = useState("");
  const [newGstType, setNewGstType] = useState("withoutGST");
  const [newProformaNo, setNewProformaNo] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newItems, setNewItems] = useState([{ Particulars: "", price: "" }]);
  const [formErrors, setFormErrors] = useState({});

  // Dynamic GST percentages from DB settings
  const cgstPercent = Number(gstSettings?.cgstPercentage ?? 9);
  const sgstPercent = Number(gstSettings?.sgstPercentage ?? 9);
  const igstPercent = Number(gstSettings?.igstPercentage ?? 18);
  const totalGstPercent = cgstPercent + sgstPercent;

  const isTamilNadu = useMemo(() => {
    return (newState || "").toLowerCase().trim() === "tamil nadu";
  }, [newState]);

  // Compute live totals with round-off
  const {
    calculatedSubtotal,
    calculatedCgst,
    calculatedSgst,
    calculatedIgst,
    calculatedTotal,
    calculatedRoundOffLabel,
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
      calculatedRoundOffLabel: roundOffLabel,
    };
  }, [newItems, newGstType, isTamilNadu, cgstPercent, sgstPercent, igstPercent]);

  // Compute next proforma number
  const computeNextProformaNo = useCallback(
    async (type = newGstType) => {
      try {
        const nextNo = await triggerGetNextProformaNumber({ invoiceType: type }).unwrap();
        if (nextNo) {
          setNewProformaNo(nextNo);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch next proforma number from API:", err);
      }

      const isWithGst = type === "withGST";
      const prefix = isWithGst ? "JT-PI-" : "JWS-PI-";
      const matching = proformas.filter((p) => {
        if (p.gstType) {
          return p.gstType === type;
        }
        return (p.proforma_no || "").startsWith(prefix);
      });

      let maxNum = 0;
      matching.forEach((p) => {
        const numStr = (p.proforma_no || "").replace(prefix, "").trim();
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });

      const nextNumber = maxNum + 1;
      setNewProformaNo(`${prefix}${String(nextNumber).padStart(4, "0")}`);
    },
    [proformas, newGstType]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedCustomerId("");
    setCustomerSearchQuery("");
    setIsCustomerSearchOpen(false);
    setIsNewCustomerFormOpen(false);
    setNewCompanyName("");
    setNewContactPerson("");
    setNewPhoneInput("");
    setNewEmailInput("");
    setNewAddress("");
    setNewState("Tamil Nadu");
    setNewCountry("India");
    setNewGstNumber("");
    setNewGstType("withoutGST");
    setNewDate(new Date().toISOString().split("T")[0]);
    setNewItems([{ Particulars: "", price: "" }]);
    setFormErrors({});
    computeNextProformaNo("withoutGST");
  }, [computeNextProformaNo]);

  // Initialize form state when opened or editingProforma changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingProforma) {
      setIsNewCustomerFormOpen(true);
      const custId = editingProforma.customerId?._id || editingProforma.customerId || "";
      let foundCust = null;
      if (custId && customersList.length > 0) {
        foundCust = customersList.find((c) => c._id === custId || c.id === custId);
      }
      if (!foundCust && editingProforma.companyName && customersList.length > 0) {
        foundCust = customersList.find(
          (c) => (c.name || "").toLowerCase() === (editingProforma.companyName || "").toLowerCase()
        );
      }

      if (foundCust) {
        setSelectedCustomerId(foundCust._id);
        setCustomerSearchQuery(formatArrayOrString(foundCust.email) || foundCust.name || "");
      } else {
        setSelectedCustomerId(custId);
        setCustomerSearchQuery(formatArrayOrString(editingProforma.email) || editingProforma.companyName || "");
      }

      setNewCompanyName(editingProforma.companyName || editingProforma.customerId?.name || "");
      setNewContactPerson(
        editingProforma.contactPerson ||
        editingProforma.customerId?.contactPerson ||
        editingProforma.customerId?.contact_person ||
        ""
      );
      setNewPhoneInput(formatArrayOrString(editingProforma.phone || editingProforma.customerId?.phone));
      setNewEmailInput(formatArrayOrString(editingProforma.email || editingProforma.customerId?.email));
      setNewAddress(editingProforma.address || editingProforma.customerId?.address || "");
      setNewState(editingProforma.state || editingProforma.customerId?.state || "Tamil Nadu");
      setNewCountry(editingProforma.country || editingProforma.customerId?.country || "India");
      setNewGstNumber(editingProforma.gstNumber || editingProforma.customerId?.gstin || "");
      setNewGstType(editingProforma.gstType || "withoutGST");
      setNewProformaNo(editingProforma.proforma_no || "");
      setNewDate(
        editingProforma.date
          ? new Date(editingProforma.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );

      if (Array.isArray(editingProforma.items) && editingProforma.items.length > 0) {
        setNewItems(
          editingProforma.items.map((it) => ({
            Particulars: it.Particulars || "",
            price: it.price || "",
          }))
        );
      } else {
        setNewItems([{ Particulars: "", price: "" }]);
      }
      setFormErrors({});
    } else {
      resetForm();
    }
  }, [isOpen, editingProforma, customersList, resetForm]);

  // Customer Select Handler
  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer._id);
    setIsCustomerSearchOpen(false);
    setIsNewCustomerFormOpen(false);
    setCustomerSearchQuery(formatArrayOrString(customer.email) || customer.name || "");

    const compName = customer.name || (Array.isArray(customer.companyNames) ? customer.companyNames[0] : "");
    setNewCompanyName(compName);
    setNewContactPerson(customer.contactPerson || customer.contact_person || "");
    setNewPhoneInput(formatArrayOrString(customer.phone));
    setNewEmailInput(formatArrayOrString(customer.email));
    setNewAddress(customer.address || "");
    setNewState(customer.state || "Tamil Nadu");
    setNewCountry(customer.country || "India");
    setNewGstNumber(customer.gstin || "");

    if (customer.gstin && customer.gstin.trim() !== "") {
      setNewGstType("withGST");
      if (!editingProforma) computeNextProformaNo("withGST");
    } else {
      setNewGstType("withoutGST");
      if (!editingProforma) computeNextProformaNo("withoutGST");
    }
  };

  // Filtered customers for autocomplete lookup
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customersList.slice(0, 8);
    return customersList.filter((c) => {
      const emailMatch = formatArrayOrString(c.email).toLowerCase().includes(q);
      const nameMatch = (c.name || "").toLowerCase().includes(q);
      const phoneMatch = formatArrayOrString(c.phone).toLowerCase().includes(q);
      return emailMatch || nameMatch || phoneMatch;
    });
  }, [customersList, customerSearchQuery]);

  // Form Validation
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

  // Item row operations
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

  // Submit Handler
  const handleSaveProforma = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields accurately.");
      return;
    }

    setIsSaving(true);

    const subtotal = calculatedSubtotal;
    const cgst = calculatedCgst;
    const sgst = calculatedSgst;
    const igst = calculatedIgst;
    const totalPrice = calculatedTotal;

    const proformaData = {
      customerId: selectedCustomerId || undefined,
      companyName: newCompanyName.trim(),
      contactPerson: newContactPerson.trim(),
      phone: newPhoneInput.trim(),
      email: newEmailInput.trim(),
      address: newAddress.trim(),
      state: newState.trim(),
      country: newCountry.trim(),
      gstNumber: newGstType === "withGST" ? newGstNumber.trim() : "",
      proforma_no: newProformaNo.trim(),
      date: newDate,
      items: newItems.map((item) => ({
        Particulars: item.Particulars.trim(),
        price: Number(item.price),
      })),
      subtotal,
      cgst,
      sgst,
      igst,
      totalPrice,
      priceinword: numberToWords(totalPrice),
      gstType: newGstType,
      note: "If you have any doubt on this invoice, please contact us at: 9677 87 6445 / 98405 99789",
    };

    try {
      if (editingProforma) {
        const targetId = editingProforma._id || editingProforma.id || editingProforma.proforma_no;
        if (targetId) {
          await updateProforma({ id: targetId, ...proformaData }).unwrap();
        }
        toast.success("Proforma invoice updated successfully!");
      } else {
        await createProforma(proformaData).unwrap();
        toast.success("Proforma invoice saved successfully!");
      }

      if (onSuccess) {
        await onSuccess();
      }

      if (onDownloadPdf) {
        await onDownloadPdf(proformaData);
      }

      onClose();
    } catch (err) {
      console.error("Error saving proforma:", err);
      const errMsg = err.data?.message || err.message || "Failed to save proforma invoice";
      toast.error(errMsg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-[740px] overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {editingProforma ? "Edit Proforma Invoice" : "Add Proforma Invoice"}
              </h3>
              <p className="text-xs text-gray-500">Provide invoice details, service items, and billing customer.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProforma} className="space-y-6 text-xs">
          {/* Customer Lookup & Details Section */}
          <div className="bg-gray-50/70 p-4 md:p-5 rounded-xl border border-gray-200/90 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                Customer Details
              </span>
            </div>

            {/* Case 1: Existing Customer Selected */}
            {selectedCustomerId ? (
              <div className="bg-white p-4 border border-gray-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Selected Customer Details
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
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
                  >
                    Change Customer
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Company / Name</span>
                    <span className="font-bold text-gray-900 text-sm">{newCompanyName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Contact Person</span>
                    <span className="font-medium text-gray-800">{newContactPerson || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Email</span>
                    <span className="font-medium text-gray-800">{newEmailInput || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Phone</span>
                    <span className="font-medium text-gray-800">{newPhoneInput || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">State</span>
                    <span className="font-medium text-gray-800">{newState}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Country</span>
                    <span className="font-medium text-gray-800">{newCountry || "India"}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Address</span>
                    <span className="font-medium text-gray-800">{newAddress || "N/A"}</span>
                  </div>
                </div>
              </div>
            ) : !isNewCustomerFormOpen ? (
              /* Case 2: Initial View - Customer Email lookup */
              <div className="relative space-y-2">
                <InputFeild
                  label="Customer Email *"
                  placeholder="Enter customer email to lookup..."
                  value={customerSearchQuery}
                  onFocus={() => setIsCustomerSearchOpen(true)}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setNewEmailInput(e.target.value);
                    setIsCustomerSearchOpen(true);
                  }}
                  rightElement={
                    customerSearchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchQuery("");
                          setNewEmailInput("");
                          setIsCustomerSearchOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null
                  }
                />

                {/* Customer Lookup Dropdown List */}
                {isCustomerSearchOpen && customerSearchQuery.trim() && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsCustomerSearchOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-[220px] overflow-y-auto divide-y divide-gray-100">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center space-y-2">
                          <p className="text-gray-500 text-xs italic">
                            No existing customer found with email "{customerSearchQuery}".
                          </p>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            icon={UserPlus}
                            onClick={() => {
                              setIsCustomerSearchOpen(false);
                              setNewEmailInput(customerSearchQuery);
                              setIsNewCustomerFormOpen(true);
                            }}
                          >
                            Add New Customer Details
                          </Button>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => {
                              handleCustomerSelect(c);
                              setIsNewCustomerFormOpen(false);
                            }}
                            className="p-2.5 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {c.name ? c.name.charAt(0).toUpperCase() : "@"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-gray-900 truncate">
                                  {c.name}
                                </div>
                                <div className="text-[11px] text-gray-500 truncate font-mono">
                                  {formatArrayOrString(c.email) || "No email"} • {formatArrayOrString(c.phone) || "No phone"}
                                </div>
                              </div>
                            </div>
                            {c.gstin && (
                              <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
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
              /* Case 3: New Customer Form */
              <div className="bg-white p-4 border border-gray-200 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                    <UserPlus className="w-4 h-4" />
                    New Customer Details
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={ArrowLeft}
                    onClick={() => setIsNewCustomerFormOpen(false)}
                  >
                    Back to Search
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputFeild
                    label="Company / Customer Name"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={newCompanyName}
                    onChange={(e) => {
                      setNewCompanyName(e.target.value);
                      if (formErrors.companyName) setFormErrors((prev) => ({ ...prev, companyName: null }));
                    }}
                    error={formErrors.companyName}
                  />

                  <InputFeild
                    label="Contact Person"
                    placeholder="e.g. John Doe"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                  />

                  <InputFeild
                    label="Customer Email"
                    type="email"
                    required
                    placeholder="e.g. client@company.com"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                  />

                  <InputFeild
                    label="Phone Number"
                    placeholder="e.g. 9876543210"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                  />

                  <InputFeild
                    label="State"
                    as="select"
                    options={[
                      { value: "Tamil Nadu", label: "Tamil Nadu" },
                      { value: "Other State", label: "Other State" },
                    ]}
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                  />

                  <InputFeild
                    label="Country"
                    placeholder="e.g. India"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                  />

                  <div className="md:col-span-2">
                    <InputFeild
                      label="Billing Address"
                      as="textarea"
                      rows={2}
                      required
                      placeholder="e.g. 123 Business Street, Chennai, 600001"
                      value={newAddress}
                      onChange={(e) => {
                        setNewAddress(e.target.value);
                        if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: null }));
                      }}
                      error={formErrors.address}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Proforma Number & Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputFeild
              label="Proforma No"
              required
              value={newProformaNo}
              onChange={(e) => {
                setNewProformaNo(e.target.value);
                if (formErrors.proformaNo) setFormErrors((prev) => ({ ...prev, proformaNo: null }));
              }}
              error={formErrors.proformaNo}
            />

            <InputFeild
              label="Date"
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          {/* GST Mode Toggle & Number */}
          <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200/90">
            <label className="text-[11px] font-semibold text-gray-700 tracking-wider uppercase block">
              GST Mode
            </label>
            <div className="grid grid-cols-2 gap-2 bg-gray-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setNewGstType("withoutGST");
                  if (!editingProforma) computeNextProformaNo("withoutGST");
                  if (formErrors.gstNumber) setFormErrors((prev) => ({ ...prev, gstNumber: null }));
                }}
                className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  newGstType === "withoutGST"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Without GST
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewGstType("withGST");
                  if (!editingProforma) computeNextProformaNo("withGST");
                }}
                className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  newGstType === "withGST"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                With GST ({totalGstPercent}%)
              </button>
            </div>

            {newGstType === "withGST" && (
              <InputFeild
                label="Customer GST Number"
                required
                placeholder="e.g. 33AAAAA0000A1Z5"
                value={newGstNumber}
                onChange={(e) => {
                  setNewGstNumber(e.target.value);
                  if (formErrors.gstNumber) setFormErrors((prev) => ({ ...prev, gstNumber: null }));
                }}
                error={formErrors.gstNumber}
              />
            )}
          </div>

          {/* Particulars & Prices Rows */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-gray-700 tracking-wider uppercase block">
                Service Items & Particulars
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddItemRow}
              >
                Add Item Row
              </Button>
            </div>

            <div className="space-y-3">
              {newItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-gray-50/50 p-3 rounded-xl border border-gray-200/80"
                >
                  <div className="flex-1 w-full">
                    <InputFeild
                      placeholder={`Service details / particulars (Line breaks allowed)...`}
                      as="textarea"
                      rows={2}
                      value={item.Particulars}
                      onChange={(e) => handleItemChange(idx, "Particulars", e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-44 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                        className="w-full bg-white border border-[#c3c6d6] rounded-lg pl-6 pr-2.5 py-2 text-xs font-bold text-[#191c1e] outline-none focus:border-[#003d9b] focus:ring-2 focus:ring-[#003d9b]/15 transition-all"
                      />
                    </div>
                  </div>
                  {newItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleRemoveItemRow(idx)}
                      className="text-gray-400 hover:text-red-600 mt-0.5"
                      title="Remove Item"
                    />
                  )}
                </div>
              ))}
            </div>
            {formErrors.items && (
              <p className="text-xs text-red-500 font-medium">{formErrors.items}</p>
            )}
          </div>

          {/* Calculation Summary Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between items-center text-gray-600">
              <span>Subtotal</span>
              <span className="font-bold text-gray-900 whitespace-nowrap">₹ {calculatedSubtotal.toLocaleString("en-IN")}</span>
            </div>
            {newGstType === "withGST" && (
              <>
                {isTamilNadu ? (
                  <>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>CGST ({cgstPercent}%)</span>
                      <span className="font-bold text-gray-900 whitespace-nowrap">₹ {calculatedCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>SGST ({sgstPercent}%)</span>
                      <span className="font-bold text-gray-900 whitespace-nowrap">₹ {calculatedSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>IGST ({igstPercent}%)</span>
                    <span className="font-bold text-gray-900 whitespace-nowrap">₹ {calculatedIgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-gray-200 text-blue-700">
              <span>{calculatedRoundOffLabel}</span>
              <span className="whitespace-nowrap text-base">₹ {calculatedTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Save}
              loading={isCreating || isUpdating}
            >
              {editingProforma ? "Update Proforma" : "Save & Download"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProforma;
