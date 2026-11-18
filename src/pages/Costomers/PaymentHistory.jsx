import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

export const PaymentHistoryModal = ({
  isOpen,
  onClose,
  customer = {},
  gstRates = { cgst: 9, sgst: 9, igst: 18 },
  onSavePayments,
}) => {
  if (!isOpen) return null;

  const currentDate = new Date().toISOString().split("T")[0];
  const fileInputRef = useRef(null);

  const orders = useMemo(() => customer.orders || [], [customer.orders]);

  // Create an initial row
  const createEmptyRow = () => ({
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: currentDate,
    orderId: orders.length > 0 ? String(orders[0]._id) : "",
    description: "",
    paymentType: "base",
    paymentStage: "full",
    withGst: false,
    amount: "",
  });

  const [paymentRows, setPaymentRows] = useState([createEmptyRow()]);
  const [gstin, setGstin] = useState(customer.gstin || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever modal opens or customer changes
  useEffect(() => {
    if (isOpen) {
      setPaymentRows([
        {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date: currentDate,
          orderId: orders.length > 0 ? String(orders[0]._id) : "",
          description: "",
          paymentType: "base",
          paymentStage: "full",
          withGst: false,
          amount: "",
        },
      ]);
      setGstin(customer.gstin || "");
      setIsSubmitting(false);
    }
  }, [isOpen, customer._id]);

  // Row Manipulation Handlers
  const handleAddRow = () => {
    setPaymentRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId) => {
    setPaymentRows((prev) => {
      if (prev.length <= 1) {
        toast.error("At least one payment row is required.");
        return prev;
      }
      return prev.filter((r) => r.id !== rowId);
    });
  };

  const handleRowChange = (rowId, field, value) => {
    setPaymentRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return { ...r, [field]: value };
      })
    );
  };

  // Helper to compute GST for a single row
  const computeRowGst = (row) => {
    if (!row.withGst) return 0;
    const amt = Number(row.amount) || 0;
    const isTamilNadu = (customer.state || "").trim() === "Tamil Nadu";
    if (isTamilNadu) {
      const cgst = amt * ((Number(gstRates?.cgst) || 9) / 100);
      const sgst = amt * ((Number(gstRates?.sgst) || 9) / 100);
      return Number((cgst + sgst).toFixed(2));
    } else {
      const igst = amt * ((Number(gstRates?.igst) || 18) / 100);
      return Number(igst.toFixed(2));
    }
  };

  // Financial Summary Totals
  const totals = useMemo(() => {
    let totalBase = 0;
    let totalGst = 0;
    let hasGstEnabled = false;

    paymentRows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      totalBase += amt;
      const gstVal = computeRowGst(r);
      totalGst += gstVal;
      if (r.withGst) hasGstEnabled = true;
    });

    return {
      count: paymentRows.length,
      totalBase: Number(totalBase.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      grandTotal: Number((totalBase + totalGst).toFixed(2)),
      hasGstEnabled,
    };
  }, [paymentRows, customer.state, gstRates]);

  // Download Sample Excel Format
  const downloadSampleExcel = () => {
    const defaultDomain = orders[0]?.domainUrl || "sampledomain.com";
    const defaultService =
      orders[0]?.products?.map((p) => p.product).join(", ") || "Web Development";

    const secondDomain = orders[1]?.domainUrl || "mycompany.org";
    const secondService =
      orders[1]?.products?.map((p) => p.product).join(", ") || "Domain & Hosting";

    const rows = [
      {
        "Payment Date": currentDate,
        "Service / Domain": defaultDomain || defaultService,
        "Description": `Full payment for ${defaultDomain || defaultService}`,
        "Payment Type": "Base",
        "Payment Stage": "Full",
        "Paid Amount": 5343,
        "With GST": "No",
        "GSTIN": "",
      },
      {
        "Payment Date": currentDate,
        "Service / Domain": secondDomain || secondService,
        "Description": `Advance payment for ${secondDomain || secondService}`,
        "Payment Type": "Base",
        "Payment Stage": "Advance",
        "Paid Amount": 2000,
        "With GST": "Yes",
        "GSTIN": customer.gstin || "33AAAAA0000A1Z5",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 15 }, // Payment Date
      { wch: 25 }, // Service / Domain
      { wch: 30 }, // Description
      { wch: 16 }, // Payment Type
      { wch: 18 }, // Payment Stage
      { wch: 14 }, // Paid Amount
      { wch: 12 }, // With GST
      { wch: 20 }, // GSTIN
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments_Sample");

    const safeName = (customer.name || "Customer").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(workbook, `Payment_Records_Sample_${safeName}.xlsx`);
    toast.success("Sample Excel format downloaded!");
  };

  // Upload and Parse Excel File
  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          toast.error("The uploaded Excel file has no data rows.");
          return;
        }

        const newRows = [];

        rawJson.forEach((row, index) => {
          // Helper to find column values case-insensitively
          const getVal = (...keys) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(
                (rk) => rk.toLowerCase().trim() === k.toLowerCase().trim()
              );
              if (
                foundKey &&
                row[foundKey] !== undefined &&
                row[foundKey] !== null &&
                String(row[foundKey]).trim() !== ""
              ) {
                return row[foundKey];
              }
            }
            return "";
          };

          // Parse date
          let dateVal = getVal("payment date", "date", "paymentdate");
          let parsedDate = currentDate;

          if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            parsedDate = dateVal.toISOString().split("T")[0];
          } else if (typeof dateVal === "number" && dateVal > 25000) {
            const d = new Date((dateVal - 25569) * 86400 * 1000);
            if (!isNaN(d.getTime())) parsedDate = d.toISOString().split("T")[0];
          } else if (typeof dateVal === "string" && dateVal.trim()) {
            const s = dateVal.trim();
            if (s.includes("/")) {
              const parts = s.split("/");
              if (parts.length === 3) {
                if (parts[2].length === 4) {
                  // DD/MM/YYYY
                  parsedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                } else if (parts[0].length === 4) {
                  // YYYY/MM/DD
                  parsedDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
                }
              }
            } else if (s.includes("-")) {
              const parts = s.split("-");
              if (parts[0].length === 4) {
                parsedDate = s.split("T")[0];
              } else if (parts[2]?.length === 4) {
                // DD-MM-YYYY
                parsedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
              }
            }
          }

          // Match Service / Domain to orders
          const serviceOrDomain = String(
            getVal("service / domain", "service", "domain", "services", "domainurl", "order")
          )
            .trim()
            .toLowerCase();

          let matchedOrder = null;
          if (orders.length === 1) {
            matchedOrder = orders[0];
          } else if (serviceOrDomain) {
            matchedOrder = orders.find(
              (o) =>
                (o.domainUrl && o.domainUrl.toLowerCase().includes(serviceOrDomain)) ||
                (o.products &&
                  o.products.some(
                    (p) => p.product && p.product.toLowerCase().includes(serviceOrDomain)
                  ))
            );
          }
          if (!matchedOrder && orders.length > 0) {
            matchedOrder = orders[0];
          }

          // Payment Type
          const rawType = String(getVal("payment type", "type")).trim().toLowerCase();
          let paymentType = "base";
          if (rawType.includes("update")) paymentType = "updated";
          else if (rawType.includes("renew")) paymentType = "renewal";

          // Payment Stage
          const rawStage = String(getVal("payment stage", "stage")).trim().toLowerCase();
          let paymentStage = "full";
          if (rawStage.includes("adv")) paymentStage = "advance";
          else if (
            rawStage.includes("mid") ||
            rawStage.includes("next") ||
            rawStage.includes("second") ||
            rawStage.includes("part")
          )
            paymentStage = "mid";
          else if (rawStage.includes("final")) paymentStage = "final";

          // Amount
          const rawAmount = getVal("paid amount", "amount", "paid");
          const amount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, "")) || 0;

          // With GST
          const rawGst = String(getVal("with gst", "gst", "withgst")).trim().toLowerCase();
          const withGst =
            rawGst === "yes" || rawGst === "true" || rawGst === "1" || rawGst === "y";

          // GSTIN
          const rowGstin = String(getVal("gstin", "gst no", "gst_no")).trim();
          if (rowGstin && !gstin) {
            setGstin(rowGstin);
          }

          const description = String(
            getVal("description", "remarks", "notes", "desc")
          ).trim();

          newRows.push({
            id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            date: parsedDate,
            orderId: matchedOrder ? String(matchedOrder._id) : (orders[0] ? String(orders[0]._id) : ""),
            description,
            paymentType,
            paymentStage,
            withGst,
            amount: amount > 0 ? amount.toString() : "",
          });
        });

        if (newRows.length > 0) {
          setPaymentRows((prev) => {
            // If the only current row is blank, replace it completely
            if (
              prev.length === 1 &&
              !prev[0].amount &&
              !prev[0].description
            ) {
              return newRows;
            }
            return [...prev, ...newRows];
          });
          toast.success(`Loaded ${newRows.length} payment records from Excel!`);
        }
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("Failed to read Excel file. Please use the sample format.");
      } finally {
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit and Save All Records
  const handleSaveAll = async () => {
    if (paymentRows.length === 0) {
      toast.error("Please add at least one payment row.");
      return;
    }

    if (orders.length === 0) {
      toast.error("This customer has no active orders to attach payments to.");
      return;
    }

    // Validation
    for (let i = 0; i < paymentRows.length; i++) {
      const row = paymentRows[i];
      if (!row.amount || Number(row.amount) <= 0) {
        toast.error(`Row #${i + 1}: Please enter a valid payment amount.`);
        return;
      }
      if (!row.orderId) {
        toast.error(`Row #${i + 1}: Please select a service/order.`);
        return;
      }
      if (row.withGst && !gstin.trim()) {
        toast.error(
          `Row #${i + 1} has GST enabled. Please enter the customer's GSTIN below.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Clone orders deep enough for payments
      const updatedOrders = orders.map((o) => ({
        ...o,
        payments: Array.isArray(o.payments) ? [...o.payments] : [],
      }));

      paymentRows.forEach((row) => {
        const targetOrder = updatedOrders.find(
          (o) => String(o._id) === String(row.orderId)
        );
        if (!targetOrder) return;

        const rowAmount = Number(row.amount) || 0;
        const rowGst = computeRowGst(row);

        let computedStageNumber = 1;
        if (row.paymentStage === "advance") {
          computedStageNumber = 1;
        } else if (row.paymentStage === "mid") {
          const priorMids = (targetOrder.payments || []).filter(
            (p) => p.paymentStage === "mid"
          ).length;
          computedStageNumber = priorMids + 2;
        } else if (row.paymentStage === "final") {
          computedStageNumber = (targetOrder.payments || []).length + 1;
        }

        const newPayment = {
          date: row.date || currentDate,
          amount: rowAmount,
          gstvalue: rowGst,
          paymentType: row.paymentType || "base",
          paymentStage: row.paymentStage || "full",
          stageNumber: computedStageNumber,
          withGst: Boolean(row.withGst),
          description: row.description || "",
          selectedOrderIds: [String(targetOrder._id)],
        };

        targetOrder.payments.push(newPayment);

        // Recalculate order status
        const totalPaid = targetOrder.payments.reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0
        );
        let resolvedPaymentStatus =
          totalPaid >= (targetOrder.totalPrice || 0) ? "Fully Paid" : "Partially Paid";

        if (row.paymentStage === "advance" || row.paymentStage === "mid") {
          resolvedPaymentStatus = "Partially Paid";
        } else if (row.paymentStage === "final") {
          resolvedPaymentStatus = "Fully Paid";
        }

        targetOrder.paymentStatus = resolvedPaymentStatus;
      });

      await onSavePayments({
        updatedOrders,
        gstin: gstin.trim(),
      });
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save payment records.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-on-background/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[1100px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/30 bg-surface-container-low flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-[28px] bg-primary/10 p-2 rounded-xl text-primary">
              receipt_long
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-on-surface flex items-center gap-2">
                Record Old Payments
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  Table Input
                </span>
              </h3>
              <p className="text-xs text-primary font-bold">
                Customer: {customer.name || "Customer"}
              </p>
            </div>
          </div>

          {/* Top Actions: Sample Excel, Upload, Add Row, Close */}
          <div className="flex items-center flex-wrap gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />

            <button
              type="button"
              onClick={downloadSampleExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer hover:border-primary/50"
              title="Download Sample Excel Format"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                download
              </span>
              <span>Sample Excel</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
              title="Upload Filled Excel File"
            >
              <span className="material-symbols-outlined text-[16px]">
                upload_file
              </span>
              <span>Import Excel</span>
            </button>

            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-xl font-bold text-xs transition-all shadow-sm hover:brightness-105 active:scale-95 cursor-pointer"
              title="Add New Row"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Row</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors cursor-pointer text-on-surface-variant ml-1"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Table Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
          <div className="border border-outline-variant/60 rounded-xl overflow-hidden bg-surface-container-lowest shadow-xs">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/50 text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
                    <th className="px-3 py-2.5 text-center w-10">#</th>
                    <th className="px-3 py-2.5 w-[140px]">Payment Date</th>
                    <th className="px-3 py-2.5 w-[220px]">Service / Domain</th>
                    <th className="px-3 py-2.5 min-w-[180px]">Description</th>
                    <th className="px-3 py-2.5 w-[110px]">Type</th>
                    <th className="px-3 py-2.5 w-[130px]">Stage</th>
                    <th className="px-3 py-2.5 w-[90px] text-center">GST?</th>
                    <th className="px-3 py-2.5 w-[140px] text-right">Paid Amount (₹)</th>
                    <th className="px-3 py-2.5 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-xs">
                  {paymentRows.map((row, idx) => {
                    const rowGst = computeRowGst(row);
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-surface-container-low/50 transition-colors"
                      >
                        {/* Index */}
                        <td className="px-3 py-2.5 text-center font-bold text-on-surface-variant">
                          {idx + 1}
                        </td>

                        {/* Date */}
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={row.date}
                            onClick={(e) => {
                              try {
                                e.target.showPicker?.();
                              } catch (_) {}
                            }}
                            onChange={(e) =>
                              handleRowChange(row.id, "date", e.target.value)
                            }
                            className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg px-2.5 py-1.5 font-bold text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                          />
                        </td>

                        {/* Service / Domain Selector */}
                        <td className="px-2 py-2">
                          {orders.length === 0 ? (
                            <span className="text-error font-medium text-xs">
                              No orders available
                            </span>
                          ) : (
                            <select
                              value={row.orderId}
                              onChange={(e) =>
                                handleRowChange(row.id, "orderId", e.target.value)
                              }
                              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 font-bold text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                            >
                              {orders.map((o) => {
                                const prodStr =
                                  o.products?.map((p) => p.product).join(", ") || "Service";
                                return (
                                  <option key={o._id} value={o._id}>
                                    {prodStr} {o.domainUrl ? `(${o.domainUrl})` : ""}{" "}
                                    • ₹{(o.totalPrice || 0).toLocaleString()}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              handleRowChange(row.id, "description", e.target.value)
                            }
                            placeholder="e.g. Full payment for sds"
                            className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg px-2.5 py-1.5 font-medium text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                          />
                        </td>

                        {/* Payment Type */}
                        <td className="px-2 py-2">
                          <select
                            value={row.paymentType}
                            onChange={(e) =>
                              handleRowChange(row.id, "paymentType", e.target.value)
                            }
                            className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 font-bold text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer capitalize"
                          >
                            <option value="base">Base</option>
                            <option value="updated">Updates</option>
                            <option value="renewal">Renewal</option>
                          </select>
                        </td>

                        {/* Payment Stage */}
                        <td className="px-2 py-2">
                          <select
                            value={row.paymentStage}
                            onChange={(e) =>
                              handleRowChange(row.id, "paymentStage", e.target.value)
                            }
                            className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 font-bold text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                          >
                            <option value="full">Full / Normal</option>
                            <option value="advance">Advance</option>
                            <option value="mid">Next Payment</option>
                            <option value="final">Final Amount</option>
                          </select>
                        </td>

                        {/* With GST Toggle */}
                        <td className="px-2 py-2 text-center">
                          <label className="inline-flex flex-col items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.withGst}
                              onChange={(e) =>
                                handleRowChange(row.id, "withGst", e.target.checked)
                              }
                              className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                            />
                            {row.withGst && (
                              <span className="text-[10px] font-black text-primary mt-0.5">
                                +₹{rowGst.toLocaleString()}
                              </span>
                            )}
                          </label>
                        </td>

                        {/* Paid Amount */}
                        <td className="px-2 py-2 text-right">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">
                              ₹
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) =>
                                handleRowChange(row.id, "amount", e.target.value)
                              }
                              placeholder="0.00"
                              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-lg pl-6 pr-2.5 py-1.5 font-black text-xs text-right text-success focus:ring-1 focus:ring-primary outline-none font-mono"
                            />
                          </div>
                        </td>

                        {/* Delete Row Button */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors cursor-pointer mx-auto"
                            title="Delete row"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Add Row Button in Table Footer */}
            <div className="p-2 border-t border-outline-variant/30 bg-surface-container-low/40 flex justify-between items-center">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-primary hover:bg-primary/5 rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Add another payment record</span>
              </button>

              <span className="text-[11px] font-bold text-on-surface-variant px-3">
                Total Rows: {totals.count}
              </span>
            </div>
          </div>

          {/* GSTIN input when GST is enabled on any row */}
          {totals.hasGstEnabled && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  verified
                </span>
                <div>
                  <div className="text-xs font-bold text-on-surface">
                    Customer State:{" "}
                    <span className="text-primary font-black">
                      {customer.state || "Tamil Nadu"}
                    </span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    GST tax will be calculated using{" "}
                    {(customer.state || "").trim() === "Tamil Nadu"
                      ? `CGST (${gstRates.cgst}%) + SGST (${gstRates.sgst}%)`
                      : `IGST (${gstRates.igst}%)`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                  GSTIN <span className="text-error">*</span>:
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary outline-none uppercase w-52"
                />
              </div>
            </div>
          )}

          {/* Financial Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Total Records
              </div>
              <div className="text-lg font-black text-on-surface mt-0.5">
                {totals.count}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Total Base Amount
              </div>
              <div className="text-lg font-black text-on-surface mt-0.5">
                ₹{totals.totalBase.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Total GST Value
              </div>
              <div className="text-lg font-black text-primary mt-0.5">
                ₹{totals.totalGst.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Grand Total Amount
              </div>
              <div className="text-lg font-black text-success mt-0.5">
                ₹{totals.grandTotal.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl font-bold text-xs text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                <span>Saving Records...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  save_as
                </span>
                <span>Save All Records ({totals.count})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;

