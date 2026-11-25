import React from "react";
import { X, Download } from "lucide-react";
import Button from "../../../UI/Components/Button";

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

// Helper: safe string / array conversion for contacts & emails
const formatArrayOrString = (val) => {
  if (!val) return "";
  if (Array.isArray(val)) {
    return val.filter(Boolean).join(", ");
  }
  return String(val);
};

// Helper: safe HTML linebreaks for particulars
const formatParticularsForDisplay = (str) => {
  if (!str) return "";
  return String(str).replace(/\n/g, "<br/>");
};

export const Detials = ({ selectedProforma, onClose, onDownloadPdf }) => {
  if (!selectedProforma) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-[700px] overflow-hidden shadow-2xl p-6 md:p-8 space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">PROFORMA DETAILS</span>
            <h3 className="text-xl font-bold text-gray-900">{selectedProforma.proforma_no}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Date: {selectedProforma.date ? new Date(selectedProforma.date).toLocaleDateString("en-GB") : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Information */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-xs">
          <p className="font-bold text-sm text-gray-900">
            {selectedProforma.customerId?.name || selectedProforma.companyName}
          </p>
          {(selectedProforma.contactPerson || selectedProforma.customerId?.contactPerson || selectedProforma.customerId?.contact_person) && (
            <p className="text-gray-600">
              Contact Person:{" "}
              <span className="font-semibold text-gray-800">
                {selectedProforma.contactPerson ||
                  selectedProforma.customerId?.contactPerson ||
                  selectedProforma.customerId?.contact_person}
              </span>
            </p>
          )}
          <p className="text-gray-600">
            {selectedProforma.customerId?.address || selectedProforma.address}
          </p>
          <p className="text-gray-600">
            Phone: {formatArrayOrString(selectedProforma.customerId?.phone || selectedProforma.phone)} | Email:{" "}
            {formatArrayOrString(selectedProforma.customerId?.email || selectedProforma.email)}
            {selectedProforma.customerId?.gstin || selectedProforma.gstNumber
              ? ` | GSTIN: ${selectedProforma.customerId?.gstin || selectedProforma.gstNumber}`
              : ""}
          </p>
          <p className="text-gray-600">
            State: {selectedProforma.state || selectedProforma.customerId?.state || "Tamil Nadu"} | Country:{" "}
            {selectedProforma.country || selectedProforma.customerId?.country || "India"}
          </p>
        </div>

        {/* Items Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <th className="p-3">#</th>
                <th className="p-3">Service Details</th>
                <th className="p-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(selectedProforma.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td className="p-3 text-gray-500">{idx + 1}</td>
                  <td
                    className="p-3 font-medium text-gray-900"
                    dangerouslySetInnerHTML={{
                      __html: formatParticularsForDisplay(item.Particulars),
                    }}
                  />
                  <td className="p-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    ₹ {Number(item.price).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations Breakdown */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-bold text-gray-900 whitespace-nowrap">
              ₹ {Number(selectedProforma.subtotal || 0).toLocaleString("en-IN")}
            </span>
          </div>
          {selectedProforma.gstType === "withGST" && (
            <div className="flex justify-between text-gray-600">
              <span>Tax (GST)</span>
              <span className="font-bold text-gray-900 whitespace-nowrap">
                ₹{" "}
                {(
                  Number(selectedProforma.cgst || 0) +
                  Number(selectedProforma.sgst || 0) +
                  Number(selectedProforma.igst || 0)
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200 text-blue-700">
            <span>Total Amount</span>
            <span className="whitespace-nowrap">
              ₹ {Number(selectedProforma.totalPrice || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 italic pt-1">
            <strong>Amount in Words:</strong>{" "}
            {selectedProforma.priceinword || numberToWords(selectedProforma.totalPrice)}
          </p>
        </div>

        <div className="pt-2 flex justify-end gap-2.5">
          {onDownloadPdf && (
            <Button
              variant="outline"
              size="md"
              icon={Download}
              onClick={() => onDownloadPdf(selectedProforma)}
            >
              Download PDF
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Detials;
