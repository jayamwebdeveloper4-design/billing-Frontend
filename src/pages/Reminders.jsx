import toast from 'react-hot-toast'
import { getReminders, getCustomerById, sendReminderEmail, updateCustomer, getAutoReminderSettings, saveAutoReminderSettings, emailInvoice, getMailHistory, exportRemindersExcel, recordCustomerPayment } from '../api/customerApi'
import { getPaymentConfirmationSettings, savePaymentConfirmationSettings, sendPaymentConfirmationEmailApi } from '../api/paymentConfirmationApi'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTemplate, saveTemplate } from '../api/templateApi'
import { getGstSettings } from '../api/gstSettingsApi'
import { generateInvoicePdf, verifyInvoiceNumber, getNextInvoiceNumber } from '../api/invoiceApi'
import { getNextProformaNumber, generateProformaPdf } from '../api/proformaApi'

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
  // Advance 1 month
  const dateObj = new Date(endParts.year, endParts.month - 1, endParts.day);
  dateObj.setMonth(dateObj.getMonth() + 1);
  nextEndYear = dateObj.getFullYear();
  nextEndMonth = dateObj.getMonth() + 1;
} else {
  // Advance 1 year
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

const numberToWords = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '';
  num = Math.round(Number(num));
  if (num === 0) return 'Zero Only';
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

  if (parts.length === 0) return 'Only';
  if (parts.length === 1) return parts[0] + ' Only';

  const lastPart = parts.pop();
  return parts.join(' ') + ' and ' + lastPart + ' Only';
};

const formatDomainUrl = (url) => {
  if (!url) return '';
  return url.split(',').map(d => {
    let clean = d.trim().replace(/^https?:\/\//i, '');
    if (clean.includes('.') && !clean.toLowerCase().startsWith('www.')) {
      clean = 'www.' + clean;
    }
    return clean;
  }).join(', ');
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .format(d)
      .replace(/\//g, "-");
  } catch (e) {
    return dateString;
  }
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

const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\b[a-z]/g, (char) => char.toUpperCase());
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

const getDeactiveYearAndMonth = (val) => {
  if (!val) return { year: "", month: "" };
  const str = String(val).trim().replace(/\//g, "-");

  const parts = str.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return { year: parts[0], month: parts[1].padStart(2, '0') };
    }
    if (parts[2].length === 4) {
      return { year: parts[2], month: parts[1].padStart(2, '0') };
    }
  }

  if (/^\d{4}$/.test(str)) {
    return { year: str, month: "" };
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return { year: y, month: m };
  }
  return { year: str, month: "" };
};

const formatMailHistoryDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    return `${day} ${month} ${year} ${strTime}`;
  } catch (e) {
    return dateString;
  }
};

const getPhoneNumbers = (phoneInput) => {
  if (!phoneInput) return [];
  const numbers = [];

  const extract = (val) => {
    if (!val) return;
    if (typeof val === 'number') {
      numbers.push(String(val));
    } else if (typeof val === 'string') {
      const parts = val.split(/[,/;\n]+/);
      parts.forEach(p => {
        const cleaned = p.trim();
        if (cleaned) numbers.push(cleaned);
      });
    } else if (typeof val === 'object' && val !== null) {
      if (val.number) extract(val.number);
      else if (val.phone) extract(val.phone);
    }
  };

  if (Array.isArray(phoneInput)) {
    phoneInput.forEach(item => extract(item));
  } else {
    extract(phoneInput);
  }

  const unique = [];
  numbers.forEach(num => {
    const digitsOnly = num.replace(/\D/g, '');
    if (digitsOnly && !unique.includes(digitsOnly)) {
      unique.push(digitsOnly);
    }
  });

  return unique;
};

const formatWhatsAppNumber = (numStr) => {
  const digits = (numStr || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

// ─── Proforma Invoice Option Pop-up Modal ──────────────────────────────────────
const ProformaOptionModal = ({
  isOpen,
  onClose,
  onSendWithoutProforma,
  onSendWithProforma,
  onGstTypeChange,
  defaultProformaNo = '',
  isSending = false
}) => {
  const [step, setStep] = useState('ask'); // 'ask' | 'config'
  const [gstType, setGstType] = useState('withoutGST');
  const [pNo, setPNo] = useState(defaultProformaNo || '');

  useEffect(() => {
    if (isOpen) {
      setStep('ask');
      const initialType = 'withoutGST';
      setGstType(initialType);
      if (defaultProformaNo) {
        setPNo(defaultProformaNo);
      } else {
        getNextProformaNumber(initialType)
          .then(no => { if (no) setPNo(no); })
          .catch(err => console.warn("Error fetching next proforma no:", err));
      }
    }
  }, [isOpen, defaultProformaNo]);

  const handleGstTypeChange = async (type) => {
    setGstType(type);
    if (typeof onGstTypeChange === 'function') {
      onGstTypeChange(type);
    }
    try {
      const nextNo = await getNextProformaNumber(type);
      if (nextNo) setPNo(nextNo);
    } catch (e) {
      console.warn("Error updating proforma no on type change:", e);
      setPNo(type === 'withGST' ? 'JT-PI-01' : 'JWS-PI-01');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[440px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-md text-primary">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">description</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black tracking-tight text-on-surface">
                {step === 'ask' ? "Attach Proforma Invoice?" : "Proforma Invoice Settings"}
              </h3>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">
                {step === 'ask' ? "Choose whether to include a Proforma Invoice" : "Select invoice type and proforma number"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-lg space-y-md">
          {step === 'ask' ? (
            <div className="space-y-md text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[32px]">picture_as_pdf</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-on-surface">Do you want to send with Proforma Invoice?</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  You can include an itemized PDF Proforma Invoice with this renewal email or send without attachment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={onSendWithoutProforma}
                  disabled={isSending}
                  className="w-full py-2.5 px-3 border border-outline-variant hover:bg-surface-container-high rounded-xl text-xs font-bold text-on-surface-variant transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-surface-variant border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    "No, Send Without"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('config');
                    if (typeof onGstTypeChange === 'function') {
                      onGstTypeChange(gstType);
                    }
                  }}
                  disabled={isSending}
                  className="w-full py-2.5 px-3 bg-primary text-on-primary hover:brightness-110 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  Yes, Attach
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-md text-left">
              {/* Invoice Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
                  Proforma Invoice Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low border border-outline-variant/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleGstTypeChange('withoutGST')}
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${gstType === 'withoutGST' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Without GST
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGstTypeChange('withGST')}
                    className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${gstType === 'withGST' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    With GST
                  </button>
                </div>
              </div>

              {/* Proforma Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
                  Proforma Number
                </label>
                <input
                  type="text"
                  value={pNo}
                  onChange={(e) => setPNo(e.target.value)}
                  placeholder={gstType === 'withGST' ? "e.g. JT-PI-01" : "e.g. JWS-PI-01"}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-mono font-bold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setStep('ask')}
                  disabled={isSending}
                  className="px-3 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onSendWithProforma({ gstType, proformaNo: pNo })}
                  disabled={isSending}
                  className="px-5 py-2.5 bg-primary text-on-primary hover:brightness-110 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  )}
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── WhatsApp Phone Selection Modal ───────────────────────────────────────────
const WhatsAppPhoneModal = ({ isOpen, onClose, phoneNumbers, customerName, onSelectNumber }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-md text-[#25D366]">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">chat</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black tracking-tight text-on-surface">Select Phone Number</h3>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">
                {customerName ? `WhatsApp contact for ${customerName}` : "Choose number to send message"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body - List of Phone Numbers */}
        <div className="p-lg space-y-md max-h-[60vh] overflow-y-auto custom-scrollbar">
          <p className="text-xs text-on-surface-variant font-semibold">
            Select the phone number you want to send the WhatsApp message to:
          </p>
          <div className="space-y-2">
            {phoneNumbers.map((num, idx) => {
              const formatted = num.length === 10 ? `+91 ${num.slice(0, 5)} ${num.slice(5)}` : num;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectNumber(num);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low hover:bg-[#25D366]/10 hover:border-[#25D366]/50 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center font-bold group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[20px]">call</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-on-surface group-hover:text-[#25D366] transition-colors">{formatted}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">Send WhatsApp Message</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-[#25D366] group-hover:translate-x-1 transition-all text-[20px]">
                    send
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low px-lg py-sm flex justify-end border-t border-outline-variant/30">
          <button
            type="button"
            onClick={onClose}
            className="px-lg py-2 font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── GST Invoice Modal ────────────────────────────────────────────────────────
const GstInvoiceModal = ({ order, reminders = [], paymentData = null, onClose, onGenerate }) => {
  const [step, setStep] = useState(paymentData ? "actions" : "config"); // "config" | "actions" | "share"
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [withGst, setWithGst] = useState(paymentData?.withGst !== undefined ? paymentData.withGst : false);
  const [state, setState] = useState(order.customerState || "Tamil Nadu");
  const [gstin, setGstin] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(paymentData?.paymentDate || new Date().toISOString().slice(0, 10));
  const [customInvoiceNo, setCustomInvoiceNo] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Paid"); // "Paid" | "Payable"
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [applyTds, setApplyTds] = useState(
    paymentData?.tdsAmount !== undefined && paymentData?.tdsAmount !== null ? Number(paymentData.tdsAmount) > 0 : false
  );
  const [tdsAmount, setTdsAmount] = useState(
    paymentData?.tdsAmount !== undefined && paymentData?.tdsAmount !== null && Number(paymentData.tdsAmount) > 0 ? String(paymentData.tdsAmount) : ""
  );
  const [gstRates, setGstRates] = useState({ cgst: 9, sgst: 9, igst: 18 });

  useEffect(() => {
    getGstSettings()
      .then(data => {
        if (data) {
          setGstRates({
            cgst: data.cgstPercentage || 9,
            sgst: data.sgstPercentage || 9,
            igst: data.igstPercentage || 18,
          });
        }
      })
      .catch(() => { });
  }, []);

  // Find all renewals/orders for this customer in the same renewal month
  const customerReminders = useMemo(() => {
    const orderMY = getRenewalMonthYear(order);
    const list = (reminders || []).filter(r => r.customerId === order.customerId && getRenewalMonthYear(r) === orderMY);
    return list.length > 0 ? list : [order];
  }, [reminders, order]);

  const [selectedOrderIds, setSelectedOrderIds] = useState(() => {
    if (paymentData?.selectedOrderIds && Array.isArray(paymentData.selectedOrderIds) && paymentData.selectedOrderIds.length > 0) {
      return paymentData.selectedOrderIds;
    }
    const currentOrderId = order?.orderId || (order?.id ? (String(order.id).includes('-') ? String(order.id).split('-')[1] : String(order.id)) : order?._id);
    return currentOrderId ? [currentOrderId] : [];
  });

  const toggleSelectOrder = (idToToggle) => {
    setSelectedOrderIds(prev =>
      prev.includes(idToToggle) ? prev.filter(id => id !== idToToggle) : [...prev, idToToggle]
    );
  };

  const toggleSelectAll = () => {
    const allIds = customerReminders.map(r => r.orderId || (r.id ? r.id.split('-')[1] : r.id));
    if (selectedOrderIds.length === allIds.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(allIds);
    }
  };

  const calculatedTotal = useMemo(() => {
    return customerReminders
      .filter(r => selectedOrderIds.includes(r.orderId || (r.id ? r.id.split('-')[1] : r.id)))
      .reduce((sum, r) => sum + (r.sellerPriceRenewal !== null && r.sellerPriceRenewal !== undefined ? r.sellerPriceRenewal : (r.price || 0)), 0);
  }, [customerReminders, selectedOrderIds]);

  const currentBaseAmount = useMemo(() => {
    if (paymentData?.amount) return Number(paymentData.amount);
    return calculatedTotal || (order?.price || 0);
  }, [paymentData, calculatedTotal, order]);

  const gstBreakdown = useMemo(() => {
    const amt = currentBaseAmount;
    const cgstVal = Math.round((amt * (Number(gstRates.cgst) / 100)) * 100) / 100;
    const sgstVal = Math.round((amt * (Number(gstRates.sgst) / 100)) * 100) / 100;
    const igstVal = Math.round((amt * (Number(gstRates.igst) / 100)) * 100) / 100;
    const tax = withGst
      ? (state === "Tamil Nadu" ? (cgstVal + sgstVal) : igstVal)
      : 0;
    const total = amt + tax;
    const tds = applyTds ? (Number(tdsAmount) || 0) : 0;
    const netReceived = Math.max(0, total - tds);
    return { amt, cgstVal, sgstVal, igstVal, tax, total, tds, netReceived };
  }, [currentBaseAmount, withGst, state, gstRates, applyTds, tdsAmount]);

  // Prefill details and handle preview resources
  const [customerData, setCustomerData] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [filename, setFilename] = useState("");

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const targetCustomerId = order?.customerId || order?.customer_id || (order?.customer ? order.customer._id : null);
  const targetOrderId = order?.orderId || (order?.id ? (String(order.id).includes('-') ? String(order.id).split('-')[1] : String(order.id)) : order?._id);

  // Fetch latest customer details to prefill GSTIN and check for existing invoice
  useEffect(() => {
    const initModal = async () => {
      try {
        if (targetCustomerId) {
          const customer = await getCustomerById(targetCustomerId);
          if (customer) {
            setCustomerData(customer);
            setGstin(customer.gstin || "");
            setState(customer.state || "Tamil Nadu");
            const names = (customer.name || "").split(";").map(n => n.trim()).filter(Boolean);
            const addresses = (customer.address || "").split(";").map(a => a.trim()).filter(Boolean);
            setSelectedCompanyName(names.length === 1 ? names[0] : "");
            setSelectedAddress(addresses.length === 1 ? addresses[0] : "");

            // Look up existing TDS on this order's latest payment if not already explicitly set
            const matchedOrd = customer.orders?.find(o => String(o._id) === String(targetOrderId));
            const latestP = matchedOrd?.payments && matchedOrd.payments.length > 0
              ? matchedOrd.payments[matchedOrd.payments.length - 1]
              : null;
            if (latestP && latestP.tdsAmount > 0 && (paymentData?.tdsAmount === undefined || paymentData?.tdsAmount === null)) {
              setApplyTds(true);
              setTdsAmount(String(latestP.tdsAmount));
            }
          }
        }

        if (paymentData) {
          setStep("actions");
          if (paymentData.withGst !== undefined) {
            setWithGst(!!paymentData.withGst);
          }
          if (paymentData.paymentDate) {
            setInvoiceDate(paymentData.paymentDate);
          }
          if (paymentData.selectedOrderIds && Array.isArray(paymentData.selectedOrderIds) && paymentData.selectedOrderIds.length > 0) {
            setSelectedOrderIds(paymentData.selectedOrderIds);
          }
          if (paymentData.tdsAmount !== undefined && paymentData.tdsAmount !== null) {
            const hasTds = Number(paymentData.tdsAmount) > 0;
            setApplyTds(hasTds);
            setTdsAmount(hasTds ? String(paymentData.tdsAmount) : "");
          }
        }
      } catch (err) {
        console.warn("Could not prefill customer details", err);
      }
    };
    initModal();
  }, [targetCustomerId, paymentData]);

  // Whenever GST toggle or date changes, fetch next invoice number for selected GST type (last invoice number + 1)
  useEffect(() => {
    const fetchNextInvoiceNo = async () => {
      const invoiceType = withGst ? "withGST" : "withoutGST";
      try {
        const nextNo = await getNextInvoiceNumber(invoiceType, invoiceDate);
        if (nextNo) setCustomInvoiceNo(nextNo);
      } catch (err) {
        console.warn("Could not get next invoice number:", err);
      }
    };
    fetchNextInvoiceNo();
  }, [withGst, invoiceDate]);

  const saveCustomerTds = async (finalTds) => {
    if (!targetCustomerId) return;
    try {
      const cust = await getCustomerById(targetCustomerId);
      if (cust) {
        let updated = false;
        const targetIds = selectedOrderIds && selectedOrderIds.length > 0 ? selectedOrderIds : [targetOrderId];
        if (Array.isArray(cust.orders)) {
          cust.orders.forEach(o => {
            const oId = String(o._id || o.id);
            if (targetIds.some(tid => String(tid) === oId)) {
              if (Array.isArray(o.payments) && o.payments.length > 0) {
                const lp = o.payments[o.payments.length - 1];
                if (lp && lp.tdsAmount !== finalTds) {
                  lp.tdsAmount = finalTds;
                  updated = true;
                }
              }
            }
          });
        }
        if (updated || (state && state !== cust.state) || (gstin && gstin.trim() !== cust.gstin)) {
          const updatedCustomerData = {
            ...cust,
            ...(state ? { state } : {}),
            ...(gstin ? { gstin: gstin.trim() } : {})
          };
          await updateCustomer(cust._id, updatedCustomerData);
          setCustomerData(updatedCustomerData);
        }
      }
    } catch (saveErr) {
      console.warn("Could not update customer TDS before invoice generation:", saveErr);
    }
  };

  const handleConfigSubmit = async (e) => {
    if (e) e.preventDefault();

    if (selectedOrderIds.length === 0) {
      return toast.error("Please select at least one item to include in the invoice.");
    }

    const names = (customerData?.name || "").split(";").map(n => n.trim()).filter(Boolean);
    if (names.length > 1 && !selectedCompanyName) {
      return toast.error("Please select a Company Name");
    }

    const addresses = (customerData?.address || "").split(";").map(a => a.trim()).filter(Boolean);
    if (addresses.length > 1 && !selectedAddress) {
      return toast.error("Please select a Billing Address");
    }

    if (withGst && !gstin.trim()) {
      return toast.error("GSTIN is required for GST Invoices");
    }

    if (applyTds) {
      const numTds = Number(tdsAmount);
      if (isNaN(numTds) || numTds < 0) {
        return toast.error("Please enter a valid TDS amount.");
      }
      if (numTds > gstBreakdown.total) {
        return toast.error("TDS amount cannot exceed total invoice amount.");
      }
    }

    setIsSaving(true);
    try {
      const customer = await getCustomerById(order.customerId);
      if (customer && (state !== customer.state || gstin.trim() !== customer.gstin)) {
        const updatedData = { ...customer, state, gstin: gstin.trim() };
        await updateCustomer(customer._id, updatedData);
        setCustomerData(updatedData);
        toast.success("Customer tax details updated");
      }
      setStep("actions");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update customer details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (selectedOrderIds.length === 0) {
      return toast.error("Please select at least one item to include in the invoice.");
    }
    const names = (customerData?.name || "").split(";").map(n => n.trim()).filter(Boolean);
    if (names.length > 1 && !selectedCompanyName) {
      setStep("config");
      return toast.error("Please select a Company Name first");
    }
    const addresses = (customerData?.address || "").split(";").map(a => a.trim()).filter(Boolean);
    if (addresses.length > 1 && !selectedAddress) {
      setStep("config");
      return toast.error("Please select a Billing Address first");
    }

    if (applyTds) {
      const numTds = Number(tdsAmount);
      if (isNaN(numTds) || numTds < 0) {
        return toast.error("Please enter a valid TDS amount.");
      }
      if (numTds > gstBreakdown.total) {
        return toast.error("TDS amount cannot exceed total invoice amount.");
      }
    }

    setIsSaving(true);
    const finalTds = applyTds ? (Number(tdsAmount) || 0) : 0;
    await saveCustomerTds(finalTds);

    try {
      await onGenerate({
        withGst,
        state,
        gstin: gstin.trim(),
        invoiceDate,
        selectedOrderIds,
        customInvoiceNo,
        paymentStatus,
        selectedCompanyName: selectedCompanyName || (customerData ? customerData.name : ""),
        selectedAddress: selectedAddress || (customerData ? customerData.address : ""),
        applyTds,
        tdsAmount: finalTds,
        paymentStage: paymentData?.paymentStage || 'full',
        invoiceCategory: paymentData?.invoiceCategory,
        includePaymentHistory: paymentData?.includePaymentHistory,
        paymentData: {
          ...(paymentData || {}),
          tdsAmount: finalTds,
          paymentStage: paymentData?.paymentStage || 'full',
          invoiceCategory: paymentData?.invoiceCategory,
          includePaymentHistory: paymentData?.includePaymentHistory
        }
      });
      onClose();
    } catch (err) {
      console.error("Invoice download error:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to download invoice";
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrepareShare = async () => {
    if (selectedOrderIds.length === 0) {
      return toast.error("Please select at least one item to include in the invoice.");
    }

    const names = (customerData?.name || "").split(";").map(n => n.trim()).filter(Boolean);
    if (names.length > 1 && !selectedCompanyName) {
      setStep("config");
      return toast.error("Please select a Company Name first");
    }
    const addresses = (customerData?.address || "").split(";").map(a => a.trim()).filter(Boolean);
    if (addresses.length > 1 && !selectedAddress) {
      setStep("config");
      return toast.error("Please select a Billing Address first");
    }

    if (applyTds) {
      const numTds = Number(tdsAmount);
      if (isNaN(numTds) || numTds < 0) {
        return toast.error("Please enter a valid TDS amount.");
      }
      if (numTds > gstBreakdown.total) {
        return toast.error("TDS amount cannot exceed total invoice amount.");
      }
    }

    if (customInvoiceNo?.trim()) {
      try {
        const { exists } = await verifyInvoiceNumber(customInvoiceNo.trim(), targetOrderId, targetCustomerId);
        if (exists) {
          return toast.error(`Invoice number "${customInvoiceNo.trim()}" already exists for another order. Please enter a different number.`);
        }
      } catch (err) {
        console.error("Failed to verify invoice number:", err);
      }
    }

    setIsSaving(true);
    const finalTds = applyTds ? (Number(tdsAmount) || 0) : 0;
    await saveCustomerTds(finalTds);

    const invoiceType = withGst ? "withGST" : "withoutGST";
    const toastId = toast.loading(`Preparing invoice to share...`);

    try {
      const updatedPaymentData = {
        ...(paymentData || {}),
        tdsAmount: finalTds
      };

      const blob = await generateInvoicePdf(
        targetCustomerId,
        targetOrderId,
        invoiceType,
        invoiceDate || new Date().toISOString(),
        selectedOrderIds,
        updatedPaymentData,
        customInvoiceNo,
        paymentStatus,
        false,
        selectedCompanyName || (customerData ? customerData.name : ""),
        selectedAddress || (customerData ? customerData.address : "")
      );

      const cleanCompany = (order.customerName || "Customer").replace(/[\s\/\\]+/g, "");
      const invNoToUse = customInvoiceNo || existingInvoice?.invoiceNo || "";
      const fname = withGst
        ? (invNoToUse ? `TAX-Invoice-${cleanCompany}-${invNoToUse}.pdf` : `TAX-Invoice-${cleanCompany}.pdf`)
        : (invNoToUse ? `${cleanCompany.toLowerCase()}-${invNoToUse}.pdf` : `${cleanCompany.toLowerCase()}.pdf`);

      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
      const url = window.URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(url);
      setFilename(fname);
      setStep("share");
      toast.success("Invoice ready to share!");
    } catch (err) {
      console.error("Invoice generation failed:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to generate invoice. Please try again.";
      toast.error(errMsg);
    } finally {
      toast.dismiss(toastId);
      setIsSaving(false);
    }
  };

  const [phoneModalConfig, setPhoneModalConfig] = useState({ isOpen: false, numbers: [] });

  const handleWhatsAppShare = () => {
    const phoneVal = customerData?.phone || order.phone;
    const numbers = getPhoneNumbers(phoneVal);

    if (numbers.length === 0) {
      toast.error("Customer phone number is missing");
      return;
    }

    setPhoneModalConfig({ isOpen: true, numbers });
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

  const executeWhatsAppShare = (phoneToUse) => {
    const domainName = order?.domainUrl || "";
    const formattedDomain = formatDomainList(domainName);
    const subject = formattedDomain
      ? `Invoice for ${formattedDomain} from Jayam Web Solutions`
      : "Invoice from Jayam Web Solutions";

    const text = `Dear Sir/ Ma'am,\n\nPlease find attached the ${subject}.\n\nThanks & Regards,\nJayam Web Solutions`;

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

    const whatsappNumber = formatWhatsAppNumber(phoneToUse);
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    onClose();
  };

  const handleEmailShare = async () => {
    const emailToUse = customerData?.email || order.email;

    if (!emailToUse) {
      toast.error("Customer email is missing");
      return;
    }

    const domainName = order?.domainUrl || "";

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

      await emailInvoice(order.customerId, fd);

      toast.success("Invoice emailed successfully!", { id: toastId });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to email invoice", { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className={`bg-surface-container-lowest border border-outline-variant rounded-2xl w-full ${step === "share" ? "max-w-[720px]" : "max-w-[480px]"
        } max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col transition-all`}>
        {/* Header */}
        <div className="p-md md:p-lg space-y-xs border-b border-outline-variant/30 bg-surface-container-low shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-md text-primary">
              <span className="material-symbols-outlined text-[26px]">
                {step === "config" ? "receipt_long" : step === "actions" ? "receipt_long" : "description"}
              </span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-on-surface">
                  {step === "config" ? "Generate Invoice" : step === "actions" ? "Invoice Options" : "Invoice Preview & Actions"}
                </h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  {step === "config"
                    ? `Select settings for ${order.customerName}`
                    : step === "actions"
                      ? "Confirm details and choose action"
                      : `Download or email invoice for ${order.customerName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step === "share" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (pdfBlob) {
                        const blobUrl = window.URL.createObjectURL(pdfBlob);
                        const a = document.createElement("a");
                        a.href = blobUrl;
                        a.download = filename || `Invoice-${(order.customerName || "Customer").replace(/[\s\/\\]+/g, "")}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(blobUrl);
                        toast.success("Invoice downloaded successfully!");
                      } else {
                        handleDownload();
                      }
                    }}
                    title="Download Invoice"
                    className="w-9 h-9 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEmailShare}
                    title="Share via Email"
                    className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary hover:brightness-110 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                title="Close"
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-md overflow-y-auto max-h-[75vh] custom-scrollbar">
          {step === "config" && (
            <form onSubmit={handleConfigSubmit} className="space-y-md">
              {/* Product / Order Selection list when multiple renewals exist */}
              {customerReminders.length > 1 && (
                <div className="space-y-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Include Items / Renewals ({selectedOrderIds.length}/{customerReminders.length})
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      {selectedOrderIds.length === customerReminders.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {customerReminders.map((rem) => {
                      const itemOrdId = rem.orderId || (rem.id ? rem.id.split('-')[1] : rem.id);
                      const isSelected = selectedOrderIds.includes(itemOrdId);
                      const priceVal = rem.sellerPriceRenewal !== null && rem.sellerPriceRenewal !== undefined ? rem.sellerPriceRenewal : (rem.price || 0);

                      return (
                        <div
                          key={rem.id || itemOrdId}
                          onClick={() => toggleSelectOrder(itemOrdId)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${isSelected
                            ? "bg-primary/5 border-primary/40 text-on-surface"
                            : "bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant/70 opacity-60"
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { }}
                              className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold truncate text-on-surface">{rem.domainUrl || rem.productName}</p>
                              <p className="text-[10px] text-on-surface-variant truncate">{rem.productName}</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-primary shrink-0 ml-2">₹{priceVal.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30 text-xs font-bold">
                    <span>Selected Invoice Total:</span>
                    <span className="text-primary font-black">₹{calculatedTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Derived Payment Details Summary */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant font-medium">Payment Date:</span>
                  <span className="font-bold text-on-surface">{formatDate(invoiceDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant font-medium">Invoice Type:</span>
                  <span className="font-bold text-on-surface">{withGst ? "With GST" : "Without GST"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant font-medium">Payment Status:</span>
                  <span className={`font-black px-2 py-0.5 rounded-md text-[11px] ${paymentStatus === "Paid" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>

              {/* Company Name Selection dropdown when multiple names exist */}
              {customerData && (customerData.name || "").split(";").map(n => n.trim()).filter(Boolean).length > 1 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Company Name <span className="text-error">*</span></label>
                  <select
                    value={selectedCompanyName}
                    onChange={(e) => setSelectedCompanyName(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                  >
                    <option value="">-- Select Company Name --</option>
                    {(customerData.name || "").split(";").map(n => n.trim()).filter(Boolean).map((n, idx) => (
                      <option key={idx} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Address Selection dropdown when multiple addresses exist */}
              {customerData && (customerData.address || "").split(";").map(a => a.trim()).filter(Boolean).length > 1 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Billing Address <span className="text-error">*</span></label>
                  <select
                    value={selectedAddress}
                    onChange={(e) => setSelectedAddress(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                  >
                    <option value="">-- Select Address --</option>
                    {(customerData.address || "").split(";").map(a => a.trim()).filter(Boolean).map((a, idx) => (
                      <option key={idx} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Invoice Number Input (Main Field) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Invoice Number</label>
                <input
                  type="text"
                  value={customInvoiceNo}
                  onChange={(e) => setCustomInvoiceNo(e.target.value)}
                  placeholder="e.g. JT019-07-2026 or 3248-JWS-07-2026"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono font-bold"
                />
              </div>

              {/* GST specific details */}
              {withGst && (
                <div className="space-y-md p-3 bg-primary/5 rounded-xl border border-primary/10 animate-in fade-in duration-200">

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
                      State
                    </label>

                    <div className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-on-surface-variant">
                        location_on
                      </span>

                      <span className="font-semibold">
                        {state || "Loading state..."}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">GSTIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA1111A1Z1"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono"
                    />
                  </div>
                </div>
              )}

              {/* TDS Deduction */}
              <div className="space-y-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                      TDS Deduction
                    </label>
                    <span className="text-[11px] text-on-surface-variant">
                      Deduct TDS from this invoice
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setApplyTds(prev => {
                        const nextVal = !prev;
                        if (!nextVal) setTdsAmount("");
                        return nextVal;
                      })
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${applyTds ? "bg-primary" : "bg-surface-variant"
                      }`}
                    aria-label="Toggle TDS deduction"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${applyTds ? "translate-x-4" : "translate-x-0.5"
                        }`}
                    />
                  </button>
                </div>

                {applyTds && (
                  <div className="pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                      TDS Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tdsAmount}
                      onChange={(e) => setTdsAmount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Enter TDS amount..."
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2 font-mono font-bold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-md border-t border-outline-variant bg-surface-container-low flex justify-end gap-sm -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-md py-sm rounded-lg font-bold text-[12px] text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-gutter py-sm bg-primary text-on-primary rounded-lg font-bold text-[12px] hover:brightness-110 active:scale-[0.98] transition-all shadow-sm flex items-center gap-xs cursor-pointer"
                >
                  Next
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </form>
          )}

          {step === "actions" && (
            <div className="space-y-md">
              {/* Payment Details Summary */}
              {paymentData && (
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-medium">Customer:</span>
                    <span className="font-bold text-on-surface truncate max-w-[200px]">{order.customerName}</span>
                  </div>
                  {order.domainUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-medium">Domain / Service:</span>
                      <span className="font-bold text-on-surface truncate max-w-[200px]">{order.domainUrl}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-medium">Payment Date:</span>
                    <span className="font-bold text-on-surface">{formatDate(invoiceDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-medium">Payment Type:</span>
                    <span className="font-bold text-primary">{withGst ? "With GST" : "Without GST"}</span>
                  </div>
                </div>
              )}

              {/* Editable Invoice Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Invoice Number</label>
                <input
                  type="text"
                  value={customInvoiceNo}
                  onChange={(e) => setCustomInvoiceNo(e.target.value)}
                  placeholder="e.g. 0001-JWS-07-2026"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-md py-2.5 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono font-bold text-sm shadow-sm"
                />
              </div>

              {/* TDS Deduction */}
              <div className="space-y-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                      TDS Deduction
                    </label>
                    <span className="text-[11px] text-on-surface-variant">
                      Deduct TDS from this invoice
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setApplyTds(prev => {
                        const nextVal = !prev;
                        if (!nextVal) setTdsAmount("");
                        return nextVal;
                      })
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${applyTds ? "bg-primary" : "bg-surface-variant"
                      }`}
                    aria-label="Toggle TDS deduction"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${applyTds ? "translate-x-4" : "translate-x-0.5"
                        }`}
                    />
                  </button>
                </div>

                {applyTds && (
                  <div className="pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-1">
                      TDS Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tdsAmount}
                      onChange={(e) => setTdsAmount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Enter TDS amount..."
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2 font-mono font-bold text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                    />
                  </div>
                )}
              </div>

              {/* Breakdown when TDS is applied or GST is active */}
              {(withGst || (applyTds && Number(tdsAmount) > 0)) && gstBreakdown.amt > 0 && (
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 space-y-1.5 text-xs animate-in fade-in duration-200">
                  <div className="flex justify-between font-bold text-on-surface-variant">
                    <span>{withGst ? "Base Amount:" : "Invoice Amount:"}</span>
                    <span>₹{gstBreakdown.amt.toLocaleString()}</span>
                  </div>
                  {withGst && (
                    <>
                      {state === "Tamil Nadu" ? (
                        <>
                          <div className="flex justify-between text-on-surface-variant">
                            <span>CGST ({gstRates.cgst}%):</span>
                            <span>₹{gstBreakdown.cgstVal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-on-surface-variant">
                            <span>SGST ({gstRates.sgst}%):</span>
                            <span>₹{gstBreakdown.sgstVal.toLocaleString()}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-on-surface-variant">
                          <span>IGST ({gstRates.igst}%):</span>
                          <span>₹{gstBreakdown.igstVal.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between font-black text-primary pt-1 border-t border-outline-variant/30">
                    <span>Total Amount:</span>
                    <span>₹{gstBreakdown.total.toLocaleString()}</span>
                  </div>
                  {applyTds && Number(tdsAmount) > 0 && (
                    <>
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Less: TDS Deducted by Customer:</span>
                        <span>₹{Number(tdsAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-black text-primary pt-1 border-t border-outline-variant/30">
                        <span>Net Amount Received:</span>
                        <span>₹{gstBreakdown.netReceived.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePrepareShare}
                  disabled={isSaving}
                  className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-md hover:brightness-110 disabled:opacity-50 text-sm"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">print</span>
                      Generate New Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "share" && (
            <div className="space-y-md">
              {/* Full View PDF Preview */}
              <div className="w-full flex flex-col min-h-[480px]">
                {pdfUrl ? (
                  <div className="flex-1 w-full border border-outline-variant rounded-xl overflow-hidden shadow-inner bg-surface-container-low min-h-[480px]">
                    <iframe
                      src={`${pdfUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full min-h-[480px] border-0"
                      title="Invoice Preview"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border border-outline-variant border-dashed rounded-xl bg-surface-container-low text-xs text-on-surface-variant min-h-[480px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Generating invoice preview...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <WhatsAppPhoneModal
        isOpen={phoneModalConfig.isOpen}
        onClose={() => setPhoneModalConfig({ isOpen: false, numbers: [] })}
        phoneNumbers={phoneModalConfig.numbers}
        customerName={customerData?.name || order.customerName}
        onSelectNumber={executeWhatsAppShare}
      />
    </div>
  );
};

const Reminders = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('')
  const [reminderPage, setReminderPage] = useState(1);
  const [reminderPageInput, setReminderPageInput] = useState(1);

  const [invoiceModalConfig, setInvoiceModalConfig] = useState({ isOpen: false, order: null });

  const buildFilename = (customerName, invoiceNo, withGst) => {
    const cleanCompany = (customerName || "Customer").replace(/[\s\/\\]+/g, "");
    if (withGst) {
      return invoiceNo ? `TAX-Invoice-${cleanCompany}-${invoiceNo}.pdf` : `TAX-Invoice-${cleanCompany}.pdf`;
    }
    const lowerCompany = cleanCompany.toLowerCase();
    return invoiceNo ? `${lowerCompany}-${invoiceNo}.pdf` : `${lowerCompany}.pdf`;
  };

  const handleGenerateInvoicePdf = async (payload) => {
    const { order, paymentData } = invoiceModalConfig;
    const targetCustomerId = order?.customerId || order?.customer_id || (order?.customer ? order.customer._id : null);
    const targetOrderId = order?.orderId || (order?.id ? (String(order.id).includes('-') ? String(order.id).split('-')[1] : String(order.id)) : order?._id);

    const invoiceType = payload.withGst ? "withGST" : "withoutGST";
    const gstStatus = payload.withGst ? "with GST" : "without GST";

    const toastId = toast.loading(`Generating invoice ${gstStatus} for ${order.customerName}...`);

    try {
      const finalTds = payload.applyTds ? (Number(payload.tdsAmount) || 0) : (payload.tdsAmount !== undefined ? (Number(payload.tdsAmount) || 0) : (paymentData?.tdsAmount || 0));

      if (targetCustomerId) {
        const customer = await getCustomerById(targetCustomerId);
        if (customer) {
          let updated = false;
          const targetIds = payload.selectedOrderIds && payload.selectedOrderIds.length > 0 ? payload.selectedOrderIds : [targetOrderId];
          if (Array.isArray(customer.orders)) {
            customer.orders.forEach(ord => {
              const ordIdStr = String(ord._id || ord.id);
              if (targetIds.some(tid => String(tid) === ordIdStr)) {
                if (Array.isArray(ord.payments) && ord.payments.length > 0) {
                  const latestP = ord.payments[ord.payments.length - 1];
                  if (latestP && latestP.tdsAmount !== finalTds) {
                    latestP.tdsAmount = finalTds;
                    updated = true;
                  }
                }
              }
            });
          }

          if (updated || (payload.state && payload.state !== customer.state) || (payload.gstin && payload.gstin !== customer.gstin)) {
            const updatedData = {
              ...customer,
              ...(payload.state ? { state: payload.state } : {}),
              ...(payload.gstin ? { gstin: payload.gstin } : {})
            };
            await updateCustomer(customer._id, updatedData);
          }
        }
      }

      const currentPStage = payload.paymentStage || paymentData?.paymentStage || 'full';
      const isFin = currentPStage === 'final';
      const isInst = ['advance', 'mid'].includes(currentPStage);
      const invCat = payload.invoiceCategory || paymentData?.invoiceCategory || (isFin ? 'consolidated' : (isInst ? 'installment' : 'regular'));

      const mergedPaymentData = {
        ...(payload.paymentData || paymentData || {}),
        tdsAmount: finalTds,
        paymentStage: currentPStage,
        invoiceCategory: invCat,
        includePaymentHistory: payload.includePaymentHistory !== undefined ? payload.includePaymentHistory : isFin
      };

      const pdfBlob = await generateInvoicePdf(
        targetCustomerId,
        targetOrderId,
        invoiceType,
        payload.invoiceDate || new Date().toISOString(),
        payload.selectedOrderIds,
        mergedPaymentData,
        payload.customInvoiceNo,
        payload.paymentStatus,
        false,
        payload.selectedCompanyName,
        payload.selectedAddress
      );

      let invoiceNo = payload.customInvoiceNo || "";
      if (!invoiceNo) {
        try {
          invoiceNo = await getNextInvoiceNumber(invoiceType, payload.invoiceDate || new Date().toISOString().slice(0, 10));
        } catch (_) { }
      }

      const filename = buildFilename(order.customerName, invoiceNo, payload.withGst);

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
      fetchReminders();
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Invoice generation failed:", err);
      throw err;
    }
  };
  useEffect(() => {
    setReminderPageInput(reminderPage);
  }, [reminderPage]);
  const REM_PAGE_SIZE = 15;
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState(null)
  const [isAutoEnabled, setIsAutoEnabled] = useState(true)
  const [autoDays, setAutoDays] = useState(['3', '7', '15'])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [editingPrices, setEditingPrices] = useState({})
  const [savingPrices, setSavingPrices] = useState(false)

  const [dueWithinDays, setDueWithinDays] = useState(() => {
    return sessionStorage.getItem('reminders_dueWithinDays') || 30
  })
  const [filterType, setFilterType] = useState(() => {
    return sessionStorage.getItem('reminders_filterType') || 'month'
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return sessionStorage.getItem('reminders_selectedMonth') || String(new Date().getMonth() + 1).padStart(2, '0')
  })
  const [selectedYear, setSelectedYear] = useState(() => {
    return sessionStorage.getItem('reminders_selectedYear') || String(new Date().getFullYear())
  })
  const [deactiveFilter, setDeactiveFilter] = useState(() => {
    return sessionStorage.getItem('reminders_deactiveFilter') || 'active'
  })
  const [paymentFilter, setPaymentFilter] = useState(() => {
    return sessionStorage.getItem('reminders_paymentFilter') || 'unpaid'
  })

  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditingDays, setIsEditingDays] = useState(false)
  const [tempDays, setTempDays] = useState(7)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templates, setTemplates] = useState({
    Renewal: { subject: "", content: "" },
    Expired: { subject: "", content: "" },
    Deletion: { subject: "", content: "" },
    Payment: { subject: "", content: "" }
  })
  const [activeTemplateTab, setActiveTemplateTab] = useState("Renewal")
  const [selectedSendTemplate, setSelectedSendTemplate] = useState("Renewal")
  const [tempTemplateText, setTempTemplateText] = useState("")
  const [tempTemplateSubject, setTempTemplateSubject] = useState("")
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sendSubject, setSendSubject] = useState("")
  const [sendFullSubject, setSendFullSubject] = useState("")
  const [sendText, setSendText] = useState("")
  const [reminderToSend, setReminderToSend] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [isCombinedSend, setIsCombinedSend] = useState(false)
  const [msgViewMode, setMsgViewMode] = useState('preview')
  const [attachProforma, setAttachProforma] = useState(false)
  const [proformaGstType, setProformaGstType] = useState('withoutGST')
  const [proformaNo, setProformaNo] = useState('')
  const [proformaCompanyName, setProformaCompanyName] = useState('')
  const [proformaAddress, setProformaAddress] = useState('')
  const [proformaPromptModal, setProformaPromptModal] = useState({
    isOpen: false,
    mode: 'email',
    selectedPhone: '',
    defaultProformaNo: ''
  })
  const [gstSettingsState, setGstSettingsState] = useState({ cgstPercentage: 9, sgstPercentage: 9, igstPercentage: 18 })

  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [reminderToPay, setReminderToPay] = useState(null)

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterPopoverRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto Reminder Settings
  const [isAutoSettingsModalOpen, setIsAutoSettingsModalOpen] = useState(false)
  const [autoEnabled, setAutoEnabled] = useState(true)
  const [autoDaysBefore, setAutoDaysBefore] = useState(7)
  const [sendExpiredEmail, setSendExpiredEmail] = useState(true)
  const [sendDeletionEmail, setSendDeletionEmail] = useState(true)
  const [deletionDaysAfter, setDeletionDaysAfter] = useState(7)
  const [savingAutoSettings, setSavingAutoSettings] = useState(false)
  const [sendPaymentConfirmationEmail, setSendPaymentConfirmationEmail] = useState(true)
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false)
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeCustomerId, setComposeCustomerId] = useState("")
  const [composeOrderId, setComposeOrderId] = useState("")
  const [composePaymentId, setComposePaymentId] = useState("")
  const [sendingPaymentEmail, setSendingPaymentEmail] = useState(false)

  const handleOpenPaymentCompose = async (customer, order, paymentId) => {
    const toastId = toast.loading("Loading template...");
    try {
      const template = templates.Payment || await getTemplate('Payment');
      const rawSubject = template?.subject || "Payment Confirmation – Renewal of [Service Name] – Paid";
      const rawContent = template?.content || `Jayam Web Solutions\n\nThank you for your payment.\n\nWe are pleased to confirm that the payment for the renewal of [Service Name] has been successfully received.`;

      // Build a reminder-like object so we can reuse populateSendModal helpers
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

      const serviceName = activeProds.length > 0
        ? activeProds.map(p => capitalizeWords(p.productName || p.product || '')).filter(Boolean).join(', ')
        : (order.products && order.products.length > 0 ? order.products.map(p => capitalizeWords(p.productName || p.product || '')).filter(Boolean).join(', ') : 'Services');

      // Price
      let orderPrice = 0;
      if (activeProds.length > 0) {
        activeProds.forEach(p => {
          orderPrice += (p.renewalSelling !== undefined && p.renewalSelling !== null ? p.renewalSelling : (p.price || 0));
        });
      } else {
        orderPrice = order.totalPrice || 0;
      }
      const priceWords = numberToWords(Math.round(orderPrice));

      // Domain URL
      const rawDomainUrl = order.domainUrl || '';
      const domUrl = formatDomainUrl(rawDomainUrl);

      // Dates: use order-level startDate / endDate
      const fakeReminder = {
        endDateDot: order.endDate ? order.endDate.replace(/-/g, '.') : '',
        endDate: order.endDate || '',
        startDate: order.startDate || ''
      };
      const renewalDates = calculateRenewalDates(fakeReminder);

      // HTML product table
      const fakeReminderForTable = {
        domainUrl: order.domainUrl || '',
        productName: serviceName,
        products: (order.products || []).map(p => ({
          ...p,
          productName: p.product || p.productName || '',
          renewalSelling: p.renewalSelling !== undefined && p.renewalSelling !== null ? p.renewalSelling : (p.price || 0),
          validationEnabled: p.validationEnabled !== false,
          deactive: p.deactive || false,
          quantity: p.quantity || 1
        })),
        price: orderPrice,
        sellerPriceRenewal: orderPrice,
        endDate: order.endDate || '',
        startDate: order.startDate || '',
        endDateDot: order.endDate ? order.endDate.replace(/-/g, '.') : ''
      };
      const { htmlTable } = buildProductHtmlTable([fakeReminderForTable]);

      const replaceAll = (text, isSubject = false) => {
        if (!text) return "";
        const capProd = capitalizeWords(serviceName);
        const subjProd = capProd.length > 20 ? capProd.slice(0, 20).trim() + "..." : capProd;
        const boldProd = isSubject ? subjProd : `<b>${capProd}</b>`;
        return text
          .replace(/\[Customer Name\]/gi, customer.name || 'Customer')
          .replace(/\[customerName\]/gi, customer.name || 'Customer')
          .replace(/\[Service Name\]/gi, boldProd)
          .replace(/\[ServiceName\]/gi, boldProd)
          .replace(/\[Product\]/gi, boldProd)
          .replace(/\[product\]/gi, boldProd)
          .replace(/www\.\[domainUrl\]/gi, domUrl)
          .replace(/\[domainUrl\]/gi, domUrl)
          .replace(/www\.www\./gi, 'www.')
          .replace(/\[price\]words/gi, priceWords)
          .replace(/\[priceWords\]/gi, priceWords)
          .replace(/\[price\]/gi, orderPrice ? `<b>${Number(orderPrice).toLocaleString('en-IN')}</b>` : "<b>0</b>")
          .replace(/\[startDate\]/gi, renewalDates.startDate || "")
          .replace(/\[endDate\]/gi, renewalDates.endDate || "")
          .replace(/\[product\s*tables?\]|\[productTable\]|\[product_table\]/gi, htmlTable);
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

  // Re-confirm send (when emailSend is already true)
  const [reconfirmReminder, setReconfirmReminder] = useState(null)

  // WhatsApp Phone Select Modal State
  const [whatsappSelectModal, setWhatsappSelectModal] = useState({
    isOpen: false,
    phoneNumbers: [],
    customerName: "",
    onSelectNumber: null
  })

  // Mail History & Sidebar States
  const [mailHistoryList, setMailHistoryList] = useState([])
  const [loadingMailHistory, setLoadingMailHistory] = useState(false)
  const [mailHistoryPage, setMailHistoryPage] = useState(1)
  const [selectedMailLog, setSelectedMailLog] = useState(null)
  const [isViewAllHistoryOpen, setIsViewAllHistoryOpen] = useState(false)
  const [modalViewMode, setModalViewMode] = useState('mail') // 'mail' | 'history' | 'split'
  const [activeSidebarTab, setActiveSidebarTab] = useState('compose') // 'compose' | history log id
  const [sidebarMode, setSidebarMode] = useState('send') // 'send' | 'history'
  const [sendModalTab, setSendModalTab] = useState('mail') // 'mail' | 'history'

  const fetchCustomerMailHistory = async (customerId) => {
    if (!customerId) return;
    setLoadingMailHistory(true);
    try {
      const history = await getMailHistory(customerId);
      setMailHistoryList(Array.isArray(history) ? history : []);
    } catch (err) {
      console.warn("Could not fetch mail history", err);
      setMailHistoryList([]);
    } finally {
      setLoadingMailHistory(false);
    }
  };

  const fetchReminders = async () => {
    setLoading(true)
    try {
      let data;
      if (filterType === 'days' && deactiveFilter !== 'deactive') {
        data = await getReminders({ days: dueWithinDays, deactive: deactiveFilter, paymentStatus: paymentFilter })
      } else {
        data = await getReminders({ month: selectedMonth, year: selectedYear, deactive: deactiveFilter, paymentStatus: paymentFilter })
      }
      setReminders(data)
    } catch (error) {
      toast.error("Failed to fetch reminders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReminders()
    if (selectedMonth) sessionStorage.setItem('reminders_selectedMonth', selectedMonth)
    if (selectedYear) sessionStorage.setItem('reminders_selectedYear', selectedYear)
    if (filterType) sessionStorage.setItem('reminders_filterType', filterType)
    if (dueWithinDays) sessionStorage.setItem('reminders_dueWithinDays', dueWithinDays)
    if (deactiveFilter) sessionStorage.setItem('reminders_deactiveFilter', deactiveFilter)
    if (paymentFilter) sessionStorage.setItem('reminders_paymentFilter', paymentFilter)
  }, [dueWithinDays, selectedMonth, selectedYear, filterType, deactiveFilter, paymentFilter])

  // Load auto reminder settings on mount
  useEffect(() => {
    const fetchAutoSettings = async () => {
      try {
        const s = await getAutoReminderSettings()
        setAutoEnabled(s.enabled)
        setAutoDaysBefore(s.daysBefore)
        setSendExpiredEmail(s.sendExpiredEmail !== false)
        setSendDeletionEmail(s.sendDeletionEmail !== false)
        setDeletionDaysAfter(s.deletionDaysAfter !== undefined ? s.deletionDaysAfter : 7)
      } catch (e) {
        console.warn('Could not load auto reminder settings')
      }

      try {
        const pcSettings = await getPaymentConfirmationSettings();
        setSendPaymentConfirmationEmail(pcSettings.sendPaymentConfirmationEmail !== false);
      } catch (e) {
        console.warn('Could not load payment confirmation settings')
      }
    }
    fetchAutoSettings()
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const [renewal, expired, deletion, payment, gstData] = await Promise.all([
          getTemplate('Renewal'),
          getTemplate('Expired'),
          getTemplate('Deletion'),
          getTemplate('Payment'),
          getGstSettings().catch(() => null)
        ]);
        setTemplates({
          Renewal: { subject: renewal.subject || "", content: renewal.content || "" },
          Expired: { subject: expired.subject || "", content: expired.content || "" },
          Deletion: { subject: deletion.subject || "", content: deletion.content || "" },
          Payment: { subject: payment.subject || "", content: payment.content || "" }
        });
        if (gstData) {
          setGstSettingsState(gstData);
        }
      } catch (error) {
        console.error('Failed to fetch templates or GST settings');
      }
    };
    fetchTemplates();
  }, []);

  const filteredReminders = useMemo(() => {
    const matchesRenewalEndDate = (r) => {
      const isPaidFilter = (paymentFilter === 'paid');
      const targetDateStr = isPaidFilter
        ? (r.startDate || r.endDate || r.dueDate || "")
        : (r.endDate || r.dueDate || r.startDate || "");

      if (!targetDateStr) return true;

      const cleanDateStr = String(targetDateStr).trim().replace(/[./]/g, '-');

      if (filterType === 'days') {
        const daysCount = parseInt(dueWithinDays) || 30;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + daysCount);

        const parts = cleanDateStr.split('-');
        let itemDate;
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            itemDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else if (parts[2].length === 4) {
            itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        } else {
          itemDate = new Date(cleanDateStr);
        }

        if (isNaN(itemDate.getTime())) return true;
        return itemDate >= today && itemDate <= maxDate;
      }

      if (filterType === 'month') {
        const parts = cleanDateStr.split('-');
        let orderYear = "", orderMonth = "";
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            orderYear = parts[0];
            orderMonth = parts[1].padStart(2, '0');
          } else if (parts[2].length === 4) {
            orderYear = parts[2];
            orderMonth = parts[1].padStart(2, '0');
          }
        }

        const matchMonth = selectedMonth === 'all' || !orderMonth || orderMonth === selectedMonth.padStart(2, '0');
        const matchYear = selectedYear === 'all' || !orderYear || orderYear === String(selectedYear);
        return matchMonth && matchYear;
      }

      return true;
    };

    return reminders.filter(r => {
      const emailStr = Array.isArray(r.email) ? r.email.join(', ') : (r.email || "");
      const phoneStr = Array.isArray(r.phone) ? r.phone.join(', ') : (r.phone || "");
      const matchesSearch =
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emailStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phoneStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.domainUrl && r.domainUrl.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      const prods = r.products || [];
      const deactiveProds = prods.filter(p => p.deactive);
      const activeProds = prods.filter(p => !p.deactive);

      const hasDeactive = r.deactive || deactiveProds.length > 0;
      const hasActive = !r.deactive && (prods.length === 0 || activeProds.length > 0);

      if (deactiveFilter === 'active') {
        const isPaid = (r.paymentStatus === 'Fully Paid' || r.paymentStatus === 'Paid');
        if (paymentFilter === 'paid' && !isPaid) return false;
        if (paymentFilter === 'unpaid' && isPaid) return false;

        return hasActive && matchesRenewalEndDate(r);
      }

      if (deactiveFilter === 'deactive') {
        return hasDeactive;
      }

      return true;
    }).map(r => {
      if (deactiveFilter === 'deactive') {
        const targetDeactiveProds = (r.products || []).filter(p => p.deactive);
        return {
          ...r,
          products: targetDeactiveProds.length > 0 ? targetDeactiveProds : (r.products || []).filter(p => p.deactive)
        };
      } else if (deactiveFilter === 'active') {
        const activeProds = (r.products || []).filter(p => !p.deactive);
        return {
          ...r,
          products: activeProds.length > 0 ? activeProds : r.products
        };
      }
      return r;
    });
  }, [reminders, searchQuery, deactiveFilter, paymentFilter, filterType, selectedMonth, selectedYear, dueWithinDays])

  // Reset page when search or deactiveFilter changes
  useEffect(() => { setReminderPage(1); }, [searchQuery, deactiveFilter, paymentFilter]);

  const formatMonthAbbrDate = (dateStr) => {
    if (!dateStr) return '—';
    let y, m, d;
    const str = String(dateStr).trim();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        } else {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          y = parseInt(parts[2], 10);
        }
      }
    } else if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        } else {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          y = parseInt(parts[2], 10);
        }
      }
    } else if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        } else {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          y = parseInt(parts[2], 10);
        }
      }
    }

    if (y && m !== undefined && !isNaN(m) && d && !isNaN(d)) {
      const monthName = months[m] || '';
      const dayStr = String(d).padStart(2, '0');
      return `${monthName}. ${dayStr}, ${y}`;
    }
    return dateStr;
  };

  const convertTextWithHtmlToBr = (str) => {
    if (!str) return '';
    return str.split(/(<table[\s\S]*?<\/table>)/gi).map(part => {
      if (part.toLowerCase().startsWith('<table')) {
        return part;
      }
      return part.replace(/\r?\n/g, '<br />');
    }).join('');
  };

  const formatTextForWhatsApp = (htmlContent) => {
    if (!htmlContent) return '';

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const tables = doc.querySelectorAll('table');

      tables.forEach((table) => {
        let bodyRows = Array.from(table.querySelectorAll('tbody tr'));
        if (bodyRows.length === 0) {
          bodyRows = Array.from(table.querySelectorAll('tr')).filter(tr => !tr.querySelector('th'));
        }
        const footRows = Array.from(table.querySelectorAll('tfoot tr'));

        let textLines = [];
        let itemIndex = 1;

        bodyRows.forEach((row) => {
          const cols = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim().replace(/\s+/g, ' '));
          if (cols.length === 0) return;

          const fullRowText = cols.join(' ');
          if (fullRowText.toLowerCase().includes('total renewal amount') || fullRowText.toLowerCase().includes('total amount')) {
            textLines.push(fullRowText);
            return;
          }

          if (cols.length >= 5) {
            const domain = cols[1];
            const service = cols[2];
            const period = cols[3];
            let amount = cols[4];
            if (amount) {
              amount = amount.replace(/^rs\.?\s*/i, '').replace(/\/-\s*$/, '').trim();
            }
            textLines.push(`${itemIndex}. ${domain} - ${service} - ${period} - ${amount}`);
            itemIndex++;
          } else if (cols.length >= 4) {
            const domain = cols[0];
            const service = cols[1];
            const period = cols[2];
            let amount = cols[3];
            if (amount) {
              amount = amount.replace(/^rs\.?\s*/i, '').replace(/\/-\s*$/, '').trim();
            }
            textLines.push(`${itemIndex}. ${domain} - ${service} - ${period} - ${amount}`);
            itemIndex++;
          } else {
            textLines.push(`${itemIndex}. ${cols.join(' - ')}`);
            itemIndex++;
          }
        });



        const replacementNode = doc.createElement('div');
        replacementNode.innerHTML = '\n' + textLines.join('\n') + '\n';
        table.parentNode.replaceChild(replacementNode, table);
      });

      let result = doc.body.innerHTML;

      result = result.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '*$1*');
      result = result.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '*$1*');

      result = result.replace(/<br\s*\/?>/gi, '\n');
      result = result.replace(/<\/p>/gi, '\n');
      result = result.replace(/<\/div>/gi, '\n');
      result = result.replace(/<[^>]+>/g, '');

      const textarea = document.createElement('textarea');
      textarea.innerHTML = result;
      result = textarea.value;

      result = result
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');

      return result.trim();
    } catch (e) {
      console.error('Error formatting text for WhatsApp:', e);
      return htmlContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }
  };

  const getBankDetailsText = (hasGst, gstData = gstSettingsState) => {
    if (!gstData) return '';
    if (hasGst) {
      const gpay = gstData.gpayNumber || '';
      const bName = gstData.bankName || '';
      const accNo = gstData.bankAccountNumber || '';
      const accName = gstData.bankAccountName || '';
      const branch = gstData.bankBranch || '';
      const ifsc = gstData.bankIfsc || '';

      return `GPAY : ${gpay}\n\nBank Name : ${bName}\nAccount Number : ${accNo}\nAccount Name : ${accName}\nBranch : ${branch}\nIFSC Code : ${ifsc}\nAccount Type : Current Account`;
    } else {
      const gpay = gstData.gpayNumberWithoutGst || '';
      const bName = gstData.bankNameWithoutGst || '';
      const accNo = gstData.bankAccountNumberWithoutGst || '';
      const accName = gstData.bankAccountNameWithoutGst || '';
      const branch = gstData.bankBranchWithoutGst || '';
      const ifsc = gstData.bankIfscWithoutGst || '';

      return `GPAY : ${gpay}\n\nBank Name : ${bName}\nAccount Number : ${accNo}\nAccount Name : ${accName}\nBranch : ${branch}\nIFSC Code : ${ifsc}\nAccount Type : Current Account`;
    }
  };

  const buildProductHtmlTable = (remindersList, currentGstSettings = gstSettingsState, forceWithGst = null) => {
    const list = Array.isArray(remindersList) ? remindersList : [remindersList];
    const items = [];
    let subtotal = 0;

    list.forEach(r => {
      if (!r) return;
      const rDates = calculateRenewalDates(r);
      const activeProducts = r.products?.filter(p => p.validationEnabled && !p.deactive) || [];

      let orderPrice = 0;
      let serviceNames = "";

      if (activeProducts.length > 0) {
        serviceNames = activeProducts.map(p => capitalizeWords(p.productName || p.product || "")).filter(Boolean).join(', ');
        if (!serviceNames) serviceNames = capitalizeWords(r.productName) || "Domain / Hosting Renewal";

        activeProducts.forEach(p => {
          const itemPrice = (p.renewalSelling !== undefined && p.renewalSelling !== null ? p.renewalSelling : (p.price || 0));
          orderPrice += itemPrice;
        });
      } else {
        serviceNames = capitalizeWords(r.productName) || "Domain / Hosting Renewal";
        orderPrice = r.sellerPriceRenewal !== null && r.sellerPriceRenewal !== undefined ? r.sellerPriceRenewal : (r.price || 0);
      }

      subtotal += orderPrice;

      const pStart = formatMonthAbbrDate(rDates.startDate);
      const pEnd = formatMonthAbbrDate(rDates.endDate);
      const domainName = r.domainUrl || serviceNames;

      items.push({
        domain: domainName,
        service: serviceNames,
        period: `${pStart} – ${pEnd}`,
        price: orderPrice
      });
    });

    const firstR = list[0] || {};
    const customerGstin = (firstR.customerGstin || firstR.gstin || firstR.gstNumber || "").trim();
    const hasGst = forceWithGst !== null ? !!forceWithGst : !!customerGstin;

    let cgstVal = 0;
    let sgstVal = 0;
    let igstVal = 0;

    let totalGst = 0;
    let totalCost = subtotal;

    // Actual GST total and rounded total
    let totalCostActual = subtotal;
    let totalCostRound = subtotal;
    let totalCostRoundLabel = "";
    let hasDecimals = false;

    const customerState = (firstR.customerState || firstR.state || "Tamil Nadu").trim();
    const isTN = !customerState || customerState.toLowerCase() === "tamil nadu";

    const cgstPct = currentGstSettings?.cgstPercentage || 9;
    const sgstPct = currentGstSettings?.sgstPercentage || 9;
    const igstPct = currentGstSettings?.igstPercentage || 18;

    if (hasGst) {
      if (isTN) {
        cgstVal = (subtotal * cgstPct) / 100;
        sgstVal = (subtotal * sgstPct) / 100;
        totalGst = cgstVal + sgstVal;
      } else {
        igstVal = (subtotal * igstPct) / 100;
        totalGst = igstVal;
      }

      // Keep actual GST total up to 2 decimal places
      const actualTotal = Number(
        (subtotal + totalGst).toFixed(2)
      );

      // Apply ₹0.50 rule
      const integerPart = Math.floor(actualTotal);
      const decimalPart = Number(
        (actualTotal - integerPart).toFixed(2)
      );
      hasDecimals = decimalPart > 0 && decimalPart < 1;

      const roundedTotal =
        decimalPart >= 0.50
          ? integerPart + 1
          : integerPart;

      const roundOffLabel =
        hasDecimals
          ? (decimalPart >= 0.50 ? "Total (Rounded-up)" : "Total (Rounded-off)")
          : "";

      // Keep rounded value for price/amount in words
      totalCost = roundedTotal;

      // Store actual value separately for display
      totalCostActual = actualTotal;
      totalCostRound = roundedTotal;
      totalCostRoundLabel = roundOffLabel;

    } else {
      totalCost = Number(Number(subtotal).toFixed(2));

      // Without GST: no round-up/off row
      totalCostActual = totalCost;
      totalCostRound = totalCost;
      totalCostRoundLabel = "";
    }

    const totalCostWords = numberToWords(totalCost);

    const htmlRows = items.map((item, idx) => {
      const rawDomain = item.domain || '';
      let cleanDomain = rawDomain.replace(/^https?:\/\//i, '').trim();
      if (cleanDomain.includes('.') && !cleanDomain.toLowerCase().startsWith('www.')) {
        cleanDomain = 'www.' + cleanDomain;
      }
      const isDomainUrl = cleanDomain.includes('.');
      const displayDomain = isDomainUrl ? `<a href="https://${cleanDomain}" style="color: #004a99; font-weight: 600; text-decoration: underline;">${cleanDomain}</a>` : item.domain;
      return `
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: 500;">
        ${idx + 1}
      </td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600;">
        ${displayDomain}
      </td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 700;">
        <b>${item.service}</b>
      </td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 500; white-space: nowrap;">
        ${item.period}
      </td>
      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">
        ${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    </tr>`;
    }).join('');

    let tFootRows = "";
    if (hasGst) {
      const gstDetailsRows = isTN ? `
    <tr style="background-color: #ffffff; color: #475569;">
      <td colspan="4" style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">CGST (${cgstPct}%):</td>
      <td style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr style="background-color: #ffffff; color: #475569;">
      <td colspan="4" style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">SGST (${sgstPct}%):</td>
      <td style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>` : `
    <tr style="background-color: #ffffff; color: #475569;">
      <td colspan="4" style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">IGST (${igstPct}%):</td>
      <td style="padding: 6px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${igstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`;

      tFootRows = `
    <tr style="background-color: #f8fafc; font-weight: 600; color: #475569;">
      <td colspan="4" style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right;">
        Subtotal:
      </td>

      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">
        ${subtotal.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}
      </td>
    </tr>

    ${gstDetailsRows}

    <!-- Actual Total -->
    <tr style="background-color: #f8fafc; font-weight: bold; color: #0f172a;">
      <td colspan="4" style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right;">
        Total Amount:
      </td>

      <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; color: #004a99; font-size: 14px;">
        ${hasDecimals ? totalCostActual.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : totalCostRound.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}
      </td>
    </tr>

    <!-- Round Off / Round Up -->
    ${hasDecimals ? `
    <tr style="background-color: #ffffff; font-weight: bold; color: #0f172a;">
      <td colspan="4" style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right;">
        ${totalCostRoundLabel}:
      </td>

      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; color: #004a99;">
        ${totalCostRound.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}
      </td>
    </tr>
    ` : ''}

    <!-- Amount in Words -->
    <tr style="background-color: #ffffff;">
      <td colspan="5" style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-style: italic; color: #475569; font-size: 12px;">
        (Rupees ${totalCostWords})
      </td>
    </tr>`;

    } else {
      const formattedTotal = (totalCost % 1 !== 0)
        ? totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : totalCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

      tFootRows = `
    <tr style="background-color: #f8fafc; font-weight: bold; color: #0f172a;">
      <td colspan="4" style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right;">Total Amount:</td>
      <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; color: #004a99; font-size: 14px;">${formattedTotal}</td>
    </tr>
    <tr style="background-color: #ffffff;">
      <td colspan="5" style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-style: italic; color: #475569; font-size: 12px;">
        (Rupees ${totalCostWords})
      </td>
    </tr>`;
    }

    const htmlTable = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 650px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; border: 1px solid #cbd5e1; margin: 15px 0;">
  <thead>
    <tr style="background-color: #f1f5f9; text-align: left; color: #1e293b; font-weight: bold;">
      <th style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center; width: 50px;">S. No</th>
      <th style="padding: 10px 12px; border: 1px solid #cbd5e1;">Domain Name</th>
      <th style="padding: 10px 12px; border: 1px solid #cbd5e1;">Services</th>
      <th style="padding: 10px 12px; border: 1px solid #cbd5e1;">Renewal Period</th>
      <th style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right;">Amount (INR)</th>
    </tr>
  </thead>
  <tbody>
    ${htmlRows}
  </tbody>
  <tfoot>
    ${tFootRows}
  </tfoot>
</table>`;

    return {
      htmlTable,
      totalCost,
      totalCostActual,
      totalCostRound,
      totalCostRoundLabel,
      totalCostWords,
      items,
      subtotal,
      totalGst,
      hasGst
    };
  };

  const populateSendModal = (remindersOrSingle, templateType, currentTemplates = templates, forceWithGst = null) => {
    const tmpl = currentTemplates[templateType] || { subject: "", content: "" };
    let populatedSubject = tmpl.subject || "";
    let populatedText = tmpl.content || "";

    const list = Array.isArray(remindersOrSingle) ? remindersOrSingle : [remindersOrSingle];
    const firstR = list[0] || {};
    const renewalDates = calculateRenewalDates(firstR);
    const { htmlTable, totalCost, totalCostWords, items } = buildProductHtmlTable(list, gstSettingsState, forceWithGst);

    const custName = firstR.customerName || "Customer";
    const prodName = items.length > 0 ? items.map(i => i.service).join(', ') : capitalizeWords(firstR.productName || "");
    const rawDomUrl = items.length > 0 ? Array.from(new Set(items.map(i => i.domain))).join(', ') : (firstR.domainUrl || "");
    const domUrl = formatDomainUrl(rawDomUrl);
    const calcPrice = totalCost > 0 ? totalCost : (firstR.price || 0);
    const calcPriceWords = totalCostWords || firstR.priceWords || numberToWords(Math.round(calcPrice));

    // Extract exact expiring product name(s) for the subject line
    // Filter active products where validation is enabled, not deactive, and renewal date is current
    const expiringProductNames = [];
    list.forEach(r => {
      if (!r) return;
      const targetEndDate = r.endDate || r.endDateDot || "";
      const validProds = (r.products || []).filter(p => {
        if (p.deactive || p.validationEnabled === false) return false;
        if (p.endDate && targetEndDate && p.endDate > targetEndDate) {
          return false;
        }
        return true;
      });

      if (validProds.length > 0) {
        validProds.forEach(p => {
          const pName = capitalizeWords(p.productName || p.product || "");
          if (pName && !expiringProductNames.includes(pName)) {
            expiringProductNames.push(pName);
          }
        });
      } else if (r.productName) {
        const pName = capitalizeWords(r.productName);
        if (pName && !expiringProductNames.includes(pName)) {
          expiringProductNames.push(pName);
        }
      }
    });

    const rawExpiringProd = expiringProductNames.length > 0
      ? expiringProductNames.join(', ')
      : (capitalizeWords(firstR.productName) || "Domain / Hosting Renewal");

    // Apply 20 characters limit logic + "..." for the subject line
    const subjectProdName = rawExpiringProd.length > 20
      ? rawExpiringProd.slice(0, 20).trim() + "..."
      : rawExpiringProd;

    const customerGstin = (firstR.customerGstin || firstR.gstin || firstR.gstNumber || "").trim();
    const hasGst = forceWithGst !== null ? !!forceWithGst : !!customerGstin;
    const bankText = getBankDetailsText(hasGst, gstSettingsState);

    const formatSubjectWithProd = (text, prod) => {
      if (!text) return "";
      let res = text
        .replace(/\[Customer Name\]/gi, custName)
        .replace(/\[customerName\]/gi, custName)
        .replace(/\[Product\]/gi, prod)
        .replace(/\[product\]/gi, prod)
        .replace(/\[Service Name\]/gi, prod)
        .replace(/\[ServiceName\]/gi, prod)
        .replace(/\[productName\]/gi, prod)
        .replace(/\[Product Name\]/gi, prod)
        .replace(/www\.\[domainUrl\]/gi, domUrl)
        .replace(/\[domainUrl\]/gi, domUrl)
        .replace(/www\.www\./gi, 'www.')
        .replace(/\[price\]words/gi, calcPriceWords)
        .replace(/\[priceWords\]/gi, calcPriceWords)
        .replace(/\[price\]/gi, calcPrice ? `<b>${Number(calcPrice).toLocaleString('en-IN')}</b>` : "<b>0</b>")
        .replace(/\[startDate\]/gi, renewalDates.startDate || "")
        .replace(/\[endDate\]/gi, renewalDates.endDate || "");

      if (/Renewal of (Domain, Hosting|Domain)/i.test(res)) {
        res = res.replace(/Renewal of (Domain, Hosting|Domain)/i, `Renewal of ${prod}`);
      } else if (/Renewal of [^-\n]+/i.test(res) && !res.includes(prod)) {
        res = res.replace(/Renewal of [^-\n]+/i, `Renewal of ${prod} `);
      }
      return res;
    };

    populatedSubject = formatSubjectWithProd(tmpl.subject || "", subjectProdName);
    const populatedFullSubject = formatSubjectWithProd(tmpl.subject || "", rawExpiringProd);

    const replaceAll = (text) => {
      if (!text) return "";
      const capProd = rawExpiringProd || capitalizeWords(prodName);
      const boldProd = `<b>${capProd}</b>`;
      let res = text
        .replace(/\[Customer Name\]/gi, custName)
        .replace(/\[customerName\]/gi, custName)
        .replace(/\[Product\]/gi, boldProd)
        .replace(/\[product\]/gi, boldProd)
        .replace(/\[Service Name\]/gi, boldProd)
        .replace(/\[ServiceName\]/gi, boldProd)
        .replace(/\[productName\]/gi, boldProd)
        .replace(/\[Product Name\]/gi, boldProd)
        .replace(/www\.\[domainUrl\]/gi, domUrl)
        .replace(/\[domainUrl\]/gi, domUrl)
        .replace(/www\.www\./gi, 'www.')
        .replace(/\[price\]words/gi, calcPriceWords)
        .replace(/\[priceWords\]/gi, calcPriceWords)
        .replace(/\[price\]/gi, calcPrice ? `<b>${Number(calcPrice).toLocaleString('en-IN')}</b>` : "<b>0</b>")
        .replace(/\[startDate\]/gi, renewalDates.startDate || "")
        .replace(/\[endDate\]/gi, renewalDates.endDate || "")
        .replace(/\[product\s*tables?\]|\[productTable\]|\[product_table\]/gi, htmlTable)
        .replace(/\[bankDetails\]|\[bank_details\]|\[bankAccount\]/gi, bankText);

      const bankBlockRegex = /GPAY\s*:\s*[^\n]*[\s\S]*?IFSC Code\s*:\s*[^\r\n]+(?:\r?\n(?:Account Type|MICR CODE|SWIFT CODE)\s*:\s*[^\r\n]+)*/gi;
      if (bankBlockRegex.test(res)) {
        res = res.replace(bankBlockRegex, bankText);
      }

      return res;
    };

    populatedText = replaceAll(populatedText);

    setSendSubject(populatedSubject);
    setSendFullSubject(populatedFullSubject);
    setSendText(populatedText);

    return { subject: populatedSubject, fullSubject: populatedFullSubject, content: populatedText };
  };

  const buildConsolidatedEmail = (customerReminders, templateType = 'Renewal', forceWithGst = null) => {
    return populateSendModal(customerReminders, templateType, templates, forceWithGst);
  };

  const buildProformaDataForReminders = (remindersList, options = {}) => {
    const list = Array.isArray(remindersList) && remindersList.length > 0
      ? remindersList
      : (reminderToSend ? [reminderToSend] : []);
    if (list.length === 0) return null;

    const firstR = list[0] || {};
    const isWithGst = (options.gstType || 'withGST') === 'withGST';

    const customerState = firstR.customerState || firstR.state || "Tamil Nadu";
    const isTN = customerState === "Tamil Nadu";

    const items = list.map((item) => {
      const dates = calculateRenewalDates(item);
      const itemPrice = (item.sellerPriceRenewal !== null && item.sellerPriceRenewal !== undefined)
        ? item.sellerPriceRenewal
        : (item.price || 0);

      const cleanProd = capitalizeWords(item.productName || 'Service');
      const rawDomUrl = item.domainUrl || '';
      const cleanDom = formatDomainUrl(rawDomUrl);

      let particulars = '';
      if (cleanProd && cleanDom) {
        particulars = `Renewal of ${cleanProd} for ${cleanDom} (${dates.startDate} to ${dates.endDate})`;
      } else if (cleanDom) {
        particulars = `Renewal of ${cleanDom} (${dates.startDate} to ${dates.endDate})`;
      } else {
        particulars = `Renewal of ${cleanProd} (${dates.startDate} to ${dates.endDate})`;
      }

      const ordId = item.orderId || (item.id ? (String(item.id).includes('-') ? String(item.id).split('-')[1] : String(item.id)) : undefined);

      return {
        orderId: ordId,
        Particulars: particulars,
        price: Number(itemPrice) || 0
      };
    });

    const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalPrice = subtotal;

    const cgstPct = Number(gstSettingsState?.cgstPercentage);
    const sgstPct = Number(gstSettingsState?.sgstPercentage);
    const igstPct = Number(gstSettingsState?.igstPercentage);

    if (isWithGst) {
      if (isTN) {
        cgst = Number(((subtotal * cgstPct) / 100).toFixed(2));
        sgst = Number(((subtotal * sgstPct) / 100).toFixed(2));
        const actualTotal = Number((subtotal + cgst + sgst).toFixed(2));
        const integerPart = Math.floor(actualTotal);
        const decimalPart = Number((actualTotal - integerPart).toFixed(2));
        totalPrice = decimalPart >= 0.50 ? integerPart + 1 : integerPart;
      } else {
        igst = Number(((subtotal * igstPct) / 100).toFixed(2));
        const actualTotal = Number((subtotal + igst).toFixed(2));
        const integerPart = Math.floor(actualTotal);
        const decimalPart = Number((actualTotal - integerPart).toFixed(2));
        totalPrice = decimalPart >= 0.50 ? integerPart + 1 : integerPart;
      }
    }

    const priceinword = numberToWords(Math.round(totalPrice));

    return {
      customerId: firstR.customerId,
      companyName: options.companyName || firstR.customerName || '',
      address: options.address || firstR.address || 'Chennai',
      state: customerState,
      country: firstR.country || 'India',
      gstNumber: firstR.gstin || '',
      email: firstR.email || '',
      phone: firstR.phone || '',
      proforma_no: options.proformaNo || (isWithGst ? 'JT-PI-01' : 'JWS-PI-01'),
      date: new Date().toISOString().slice(0, 10),
      gstType: isWithGst ? 'withGST' : 'withoutGST',
      items: items,
      subtotal: subtotal,
      cgst: cgst,
      sgst: sgst,
      igst: igst,
      totalPrice: totalPrice,
      priceinword: priceinword
    };
  };

  const openSendModal = (r) => {
    setReminderToSend(r)
    setSelectedSendTemplate('Renewal')
    setMailHistoryPage(1)
    setModalViewMode('mail')
    setActiveSidebarTab('compose')
    setSidebarMode('send')
    setSendModalTab('mail')
    setMsgViewMode('preview')
    setAttachProforma(false)
    setProformaGstType('withoutGST')
    setProformaNo('')
    setProformaCompanyName('')
    setProformaAddress('')

    setProformaPromptModal({ isOpen: false, mode: 'email', selectedPhone: '', defaultProformaNo: '' })

    const rMY = getRenewalMonthYear(r);
    const matchingReminders = reminders.filter(item => item.customerId === r.customerId && getRenewalMonthYear(item) === rMY);
    if (matchingReminders.length > 1) {
      setIsCombinedSend(true);
      populateSendModal(matchingReminders, 'Renewal');
    } else {
      setIsCombinedSend(false);
      populateSendModal(r, 'Renewal');
    }

    if (r?.customerId) {
      fetchCustomerMailHistory(r.customerId)
    }
    setIsSendModalOpen(true)
  }

  const executeSendEmailProcess = async ({ attachProforma, gstType, proformaNo }) => {
    setSendingEmail(true);
    try {
      const matchingReminders = reminders.filter(item => item.customerId === reminderToSend.customerId);
      const useCombined = isCombinedSend && matchingReminders.length > 1;

      let proformaDataPayload = null;
      if (attachProforma) {
        const targetList = useCombined ? matchingReminders : [reminderToSend];
        proformaDataPayload = buildProformaDataForReminders(targetList, {
          proformaNo: proformaNo || (gstType === 'withGST' ? 'JT-PI-01' : 'JWS-PI-01'),
          gstType: gstType || 'withGST',
          companyName: proformaCompanyName,
          address: proformaAddress
        });
      }

      // Ensure email content strictly respects the chosen GST type
      const isWithGst = attachProforma ? (gstType === 'withGST') : !!(reminderToSend?.customerGstin || reminderToSend?.gstin || reminderToSend?.gstNumber);
      const generated = useCombined
        ? buildConsolidatedEmail(matchingReminders, selectedSendTemplate, isWithGst)
        : populateSendModal(reminderToSend, selectedSendTemplate, templates, isWithGst);

      const payload = {
        subject: generated.subject || sendSubject,
        fullSubject: generated.fullSubject || sendFullSubject || sendSubject,
        content: generated.content || sendText,
        templateType: selectedSendTemplate,
        attachProforma: attachProforma,
        proformaData: proformaDataPayload
      };

      if (useCombined) {
        payload.orderIds = matchingReminders.map(item => item.id ? item.id.split('-')[1] : item.orderId).filter(Boolean);
      } else {
        const reminderIdParts = reminderToSend.id ? reminderToSend.id.split('-') : [];
        payload.orderId = reminderIdParts[1] || null;
      }

      await sendReminderEmail(reminderToSend.customerId, payload);
      toast.success(attachProforma ? `Email with Proforma Invoice sent to ${Array.isArray(reminderToSend.email) ? reminderToSend.email.join(', ') : reminderToSend.email}` : `Email sent to ${Array.isArray(reminderToSend.email) ? reminderToSend.email.join(', ') : reminderToSend.email}`);
      fetchCustomerMailHistory(reminderToSend.customerId);
      fetchReminders();
      setProformaPromptModal({ isOpen: false, mode: 'email', selectedPhone: '', defaultProformaNo: '' });
      setIsSendModalOpen(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to send email';
      toast.error(errorMsg);
      fetchCustomerMailHistory(reminderToSend.customerId);
    } finally {
      setSendingEmail(false);
    }
  };

  const executeWhatsAppProcess = async ({ selectedPhone, attachProforma, gstType, proformaNo }) => {
    try {
      const matchingReminders = reminders.filter(item => item.customerId === reminderToSend.customerId);
      const useCombined = isCombinedSend && matchingReminders.length > 1;

      let proformaDataPayload = null;
      if (attachProforma) {
        const targetList = useCombined ? matchingReminders : [reminderToSend];
        proformaDataPayload = buildProformaDataForReminders(targetList, {
          proformaNo: proformaNo || (gstType === 'withGST' ? 'JT-PI-01' : 'JWS-PI-01'),
          gstType: gstType || 'withGST',
          companyName: proformaCompanyName,
          address: proformaAddress
        });
      }

      // Ensure message content strictly respects the chosen GST type
      const isWithGst = attachProforma ? (gstType === 'withGST') : !!(reminderToSend?.customerGstin || reminderToSend?.gstin || reminderToSend?.gstNumber);
      const generated = useCombined
        ? buildConsolidatedEmail(matchingReminders, selectedSendTemplate, isWithGst)
        : populateSendModal(reminderToSend, selectedSendTemplate, templates, isWithGst);

      const payload = {
        subject: generated.subject || sendSubject,
        fullSubject: generated.fullSubject || sendFullSubject || sendSubject,
        content: generated.content || sendText,
        templateType: selectedSendTemplate,
        bypassEmail: true,
        attachProforma: attachProforma,
        proformaData: proformaDataPayload
      };

      if (useCombined) {
        payload.orderIds = matchingReminders.map(item => item.id ? item.id.split('-')[1] : item.orderId).filter(Boolean);
      } else {
        const reminderIdParts = reminderToSend.id ? reminderToSend.id.split('-') : [];
        payload.orderId = reminderIdParts[1] || null;
      }

      await sendReminderEmail(reminderToSend.customerId, payload);
      fetchCustomerMailHistory(reminderToSend.customerId);
      fetchReminders();

      if (attachProforma && proformaDataPayload) {
        try {
          const pdfBlob = await generateProformaPdf(proformaDataPayload);
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement("a");
          link.href = url;
          const cleanCompany = (proformaDataPayload.companyName || reminderToSend.customerName || "Customer").replace(/[\s\/\\]+/g, "");
          const proformaNo = proformaDataPayload.proforma_no || "Proforma";
          link.setAttribute("download", `PROFORMA-Invoice-${cleanCompany}-${proformaNo}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } catch (pdfErr) {
          console.error("Error generating proforma PDF for WhatsApp:", pdfErr);
        }
      }
    } catch (err) {
      console.error("Failed to update reminder status for WhatsApp:", err);
    }

    const plainText = formatTextForWhatsApp(sendText);
    const text = encodeURIComponent(sendSubject + "\n\n" + plainText);
    const waNumber = formatWhatsAppNumber(selectedPhone);
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
    toast.success(`WhatsApp opened for ${reminderToSend.customerName}`);
    setProformaPromptModal({ isOpen: false, mode: 'email', selectedPhone: '', defaultProformaNo: '' });
    setIsSendModalOpen(false);
  };

  const openPayModal = (r) => {
    setReminderToPay(r)
    setIsPayModalOpen(true)
  }

  const handleSaveRenewal = async (payload) => {
    try {
      const customer = await getCustomerById(reminderToPay.customerId)
      if (!customer) {
        toast.error("Customer profile not found")
        return
      }

      const reminderIdParts = reminderToPay.id.split('-')
      const orderId = reminderIdParts[1]

      const matchedOrder = customer.orders?.find(o => o._id === orderId)
      if (!matchedOrder) {
        toast.error("Order details not found")
        return
      }

      // Update product validity for all validation-enabled products (excluding deactivated ones)
      matchedOrder.products?.forEach(p => {
        if (p.validationEnabled && !p.deactive) {
          p.startDate = payload.startDate
          p.endDate = payload.endDate
        }
      })

      // Also set order-level dates directly
      matchedOrder.startDate = payload.startDate
      matchedOrder.endDate = payload.endDate

      // Reset emailSend so auto-reminder can send next cycle
      matchedOrder.emailSend = false
      matchedOrder.expiredEmailSend = false
      matchedOrder.deletionEmailSend = false

      // Compute the total renewal selling and cost prices for active validation-enabled products in the order at this moment
      let orderRenewalSelling = 0;
      let orderRenewalCost = 0;
      matchedOrder.products?.forEach(p => {
        if (p.validationEnabled && !p.deactive) {
          const qty = p.quantity || 1;
          const selling = (p.sellerPriceRenewal !== null && p.sellerPriceRenewal !== undefined)
            ? p.sellerPriceRenewal
            : (p.price || 0);
          const cost = (p.costPriceRenewal !== null && p.costPriceRenewal !== undefined)
            ? p.costPriceRenewal
            : (p.costPrice || 0);
          orderRenewalSelling += (selling);
          orderRenewalCost += (cost);
        }
      });

      // Add payment
      const newPayment = {
        date: payload.paymentDate,
        amount: payload.amount,
        paymentType: 'renewal',
        withGst: payload.withGst || false,
        gstvalue: payload.gstvalue || 0,
        renewalSellingPrice: orderRenewalSelling,
        renewalCostPrice: orderRenewalCost
      }
      matchedOrder.payments = [...(matchedOrder.payments || []), newPayment]

      // Re-calculate payment status
      const totalPaid = matchedOrder.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      if (totalPaid >= matchedOrder.totalPrice) {
        matchedOrder.paymentStatus = "Fully Paid"
      } else {
        matchedOrder.paymentStatus = "Partially Paid"
      }

      // Save customer
      await updateCustomer(customer._id, customer)
      toast.success("Renewal payment recorded successfully!")
      fetchReminders()
    } catch (error) {
      console.error("Renewal pay error:", error)
      toast.error("Failed to record renewal payment")
      throw error
    }
  }

  // Save auto reminder settings
  const handleSaveAutoSettings = async () => {
    const days = parseInt(autoDaysBefore);
    if (isNaN(days) || days < 1) {
      toast.error('Please enter a valid number of days (minimum 1)');
      return;
    }
    const delDays = parseInt(deletionDaysAfter);
    if (isNaN(delDays) || delDays < 1) {
      toast.error('Please enter a valid number of deletion days (minimum 1)');
      return;
    }
    setSavingAutoSettings(true)
    try {
      await Promise.all([
        saveAutoReminderSettings({
          enabled: autoEnabled,
          daysBefore: days,
          sendExpiredEmail,
          sendDeletionEmail,
          deletionDaysAfter: delDays
        }),
        savePaymentConfirmationSettings({
          sendPaymentConfirmationEmail
        })
      ]);
      setAutoDaysBefore(days)
      setDeletionDaysAfter(delDays)
      toast.success('Auto reminder settings saved!')
      setIsAutoSettingsModalOpen(false)
    } catch (e) {
      toast.error('Failed to save auto reminder settings')
    } finally {
      setSavingAutoSettings(false)
    }
  }

  const handleInsertPlaceholder = (placeholder, field = 'content') => {
    if (field === 'subject') {
      const input = document.getElementById("template-subject-input");
      if (!input) {
        setTempTemplateSubject(prev => prev + placeholder);
        return;
      }
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const text = input.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setTempTemplateSubject(before + placeholder + after);
      setTimeout(() => {
        input.focus();
        input.selectionStart = input.selectionEnd = start + placeholder.length;
      }, 0);
      return;
    }

    const textarea = document.getElementById("template-content-textarea");
    if (!textarea) {
      setTempTemplateText(prev => prev + placeholder);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setTempTemplateText(before + placeholder + after);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
    }, 0);
  };

  const handleViewDetails = (reminder) => {
    setSelectedReminder(reminder);
    setIsViewModalOpen(true);
    // Initialize editingPrices with the products array from reminder
    const initialPrices = {};
    reminder.products?.forEach(p => {
      const pidStr = p._id ? p._id.toString() : p.productName;
      const rSell = p.renewalSelling !== undefined && p.renewalSelling !== null ? p.renewalSelling : (p.price || 0);
      const rCost = p.renewalCost !== undefined && p.renewalCost !== null ? p.renewalCost : (p.productcost || p.costPrice || 0);

      const priceObj = { renewalSelling: rSell, renewalCost: rCost };
      initialPrices[p._id] = priceObj;
      if (pidStr) {
        initialPrices[pidStr] = priceObj;
      }
    });
    setEditingPrices(initialPrices);
  };

  const handleSavePrices = async () => {
    if (!selectedReminder) return;
    setSavingPrices(true);
    try {
      const customer = await getCustomerById(selectedReminder.customerId);
      if (!customer) {
        toast.error("Customer not found");
        return;
      }

      const reminderIdParts = selectedReminder.id.split('-');
      const orderId = reminderIdParts[1];
      const matchedOrder = customer.orders?.find(o => o._id === orderId);
      if (!matchedOrder) {
        toast.error("Order not found");
        return;
      }

      matchedOrder.products?.forEach(p => {
        const pidStr = p._id ? p._id.toString() : "";
        const editObj = editingPrices[p._id] || (pidStr ? editingPrices[pidStr] : null);
        if (editObj) {
          p.price = editObj.renewalSelling;
          p.costPrice = editObj.renewalCost;
        }
      });

      await updateCustomer(customer._id, customer);

      toast.success("Renewal prices updated successfully!");

      let updatedTotalSelling = 0;
      let updatedTotalCost = 0;
      const updatedProducts = selectedReminder.products?.map(p => {
        const pidStr = p._id ? p._id.toString() : "";
        const editVals = editingPrices[p._id] || (pidStr ? editingPrices[pidStr] : null);
        if (editVals) {
          if (p.validationEnabled && !p.deactive) {
            updatedTotalSelling += (editVals.renewalSelling * (p.quantity || 1));
            updatedTotalCost += (editVals.renewalCost * (p.quantity || 1));
          }
          return {
            ...p,
            price: editVals.renewalSelling,
            productcost: editVals.renewalCost,
            renewalSelling: editVals.renewalSelling,
            renewalCost: editVals.renewalCost
          };
        }
        return p;
      });

      setReminders(prev => prev.map(r => {
        if (r.id === selectedReminder.id) {
          return {
            ...r,
            price: updatedTotalSelling,
            priceWords: numberToWords(Math.round(updatedTotalSelling)),
            products: updatedProducts
          };
        }
        return r;
      }));

      setSelectedReminder(prev => ({
        ...prev,
        price: updatedTotalSelling,
        priceWords: numberToWords(Math.round(updatedTotalSelling)),
        products: updatedProducts
      }));

      setIsViewModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update renewal prices");
    } finally {
      setSavingPrices(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const toastId = toast.loading("Exporting Excel file...");
      let params = {};
      if (filterType === 'days' && deactiveFilter !== 'deactive') {
        params = { days: dueWithinDays, deactive: deactiveFilter };
      } else {
        params = { month: selectedMonth, year: selectedYear, deactive: deactiveFilter };
      }
      await exportRemindersExcel(params);
      toast.success("Excel exported successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel file");
    }
  };

  return (
    <div className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-lg md:mb-xl">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-h1 font-black text-on-surface tracking-tight mb-1">Renewal Management</h1>
          <p className="text-on-surface-variant text-sm md:text-body-md font-medium">Manage customer service renewals, track expirations, and automate follow-ups.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {
            deactiveFilter !== 'active' && (
              <button
                onClick={handleExportExcel}
                className="flex-1 md:flex-none bg-surface-container-highest text-on-surface px-lg md:px-xl py-3 rounded-full font-bold flex items-center justify-center gap-sm transition-all hover:bg-surface-variant active:scale-95 shadow-sm border border-outline-variant cursor-pointer text-sm"
                title="Export list details to Excel"
              >
                <span className="material-symbols-outlined text-[20px] text-success">download</span>
                Export Excel
              </button>
            )

          }

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold select-none text-xs md:text-sm text-on-surface whitespace-nowrap">Payment Auto Email</span>
            <button
              type="button"
              role="switch"
              aria-checked={sendPaymentConfirmationEmail}
              onClick={async () => {
                const nextVal = !sendPaymentConfirmationEmail;
                setSendPaymentConfirmationEmail(nextVal);
                try {
                  await savePaymentConfirmationSettings({
                    sendPaymentConfirmationEmail: nextVal
                  });
                  toast.success(`Payment Auto Send ${nextVal ? 'enabled' : 'disabled'}!`);
                } catch (e) {
                  toast.error('Failed to save settings');
                  setSendPaymentConfirmationEmail(!nextVal);
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 ${sendPaymentConfirmationEmail
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                : 'bg-outline-variant/50'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ${sendPaymentConfirmationEmail ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          <button
            onClick={() => {
              setActiveTemplateTab('Renewal');
              setTempTemplateText(templates.Renewal.content);
              setTempTemplateSubject(templates.Renewal.subject);
              setIsTemplateModalOpen(true);
            }}
            className="flex-1 md:flex-none bg-surface-container-highest text-on-surface px-lg md:px-xl py-3 rounded-full font-bold flex items-center justify-center gap-sm transition-all hover:bg-surface-variant active:scale-95 shadow-sm border border-outline-variant cursor-pointer text-sm"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">description</span>
            Message Templates
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-lg px-0.5">
        {/* Search Input */}
        <div className="relative shrink-0 w-full sm:w-[260px] md:w-[280px]">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search customers..."
            className="w-full h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl pl-[40px] pr-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Inline Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={deactiveFilter}
              onChange={(e) => setDeactiveFilter(e.target.value)}
              className="h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary pr-8 shadow-xs"
            >
              <option value="active">🟢 Active</option>
              <option value="deactive">🔴 Deactive</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          {/* Payment Status Filter (Only for Active) */}
          {deactiveFilter === 'active' && (
            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary pr-8 shadow-xs"
              >
                <option value="unpaid">🟠 Unpaid</option>
                <option value="paid">🟢 Paid</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          )}

          {/* Renewal Filter (Only for Active) */}
          {deactiveFilter === 'active' && (
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary pr-8 shadow-xs"
              >
                <option value="month">📅 Renewal Month</option>
                <option value="days">⏱️ Days Limit</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          )}

          {/* Month & Year Selects */}
          {deactiveFilter === 'active' && filterType === 'month' && (
            <>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary pr-8 shadow-xs"
                >
                  <option value="all">All Months</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>

              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 text-xs font-bold text-on-surface outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary pr-8 shadow-xs"
                >
                  <option value="all">All Years</option>
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </>
          )}

          {/* Days Input */}
          {deactiveFilter === 'active' && filterType === 'days' && (
            <div className="flex items-center gap-1.5 h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 shadow-xs">
              <span className="text-xs font-bold text-on-surface-variant">Due in:</span>
              <input
                type="number"
                min="1"
                className="w-12 bg-transparent font-bold text-on-surface text-xs focus:outline-none text-center"
                value={dueWithinDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setDueWithinDays(isNaN(val) ? '' : val);
                }}
              />
              <span className="text-xs font-bold text-on-surface-variant">Days</span>
            </div>
          )}

          {/* Reset Button */}
          {(deactiveFilter !== 'active' || paymentFilter !== 'unpaid' || filterType !== 'month' || selectedMonth !== String(new Date().getMonth() + 1).padStart(2, '0') || selectedYear !== String(new Date().getFullYear())) && (
            <button
              type="button"
              onClick={() => {
                setDeactiveFilter('active');
                setPaymentFilter('unpaid');
                setFilterType('month');
                const now = new Date();
                setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'));
                setSelectedYear(String(now.getFullYear()));
                setDueWithinDays(30);
              }}
              className="h-[42px] px-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest hover:bg-error/10 hover:text-error hover:border-error/30 text-on-surface-variant font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              title="Reset Filters"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Reset
            </button>
          )}
        </div>
      </div>



      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1050px] table-auto">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/60">
              {deactiveFilter === 'deactive' ? (
                <>
                  <th className="px-lg py-4 font-black text-[10px] text-error uppercase tracking-[0.15em]">Deactive Date</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">Customer Details</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">Products</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">Price</th>
                </>
              ) : (
                <>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">Renewal</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">Customer Details</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">Products</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">Total Price</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em] text-center">Payment Status</th>
                  <th className="px-lg py-4 font-black text-[10px] text-on-surface-variant uppercase tracking-[0.15em] text-right">Action</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {loading ? (
              <tr>
                <td colSpan="10" className="px-lg py-20 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                </td>
              </tr>
            ) : (() => {
              const totalPages = Math.ceil(filteredReminders.length / REM_PAGE_SIZE);
              const pagedReminders = filteredReminders.slice((reminderPage - 1) * REM_PAGE_SIZE, reminderPage * REM_PAGE_SIZE);

              if (pagedReminders.length === 0) {
                return (
                  <tr>
                    <td colSpan="10" className="px-lg py-12 text-center text-on-surface-variant/70 italic text-xs">
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

                    const orderId = r.id ? r.id.split('-')[1] : r.orderId;

                    return (
                      <tr key={`${r.id}-${pIdx}`} className="hover:bg-error/5 transition-all">
                        {/* Deactive Date */}
                        <td className="px-lg py-4 font-bold text-[11px] text-error font-tabular-nums">
                          {formatDeactiveDate(p.deactiveYear) || '—'}
                        </td>

                        {/* Customer Details */}
                        <td className="px-lg py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-on-surface leading-none truncate max-w-[180px]">
                              {r.customerName}
                            </span>
                            {r.domainUrl && (
                              <span className="text-[10px] text-on-surface-variant font-medium">{r.domainUrl}</span>
                            )}
                            <span className="text-[10px] text-on-surface-variant font-medium truncate max-w-[180px]">
                              {Array.isArray(r.email) ? r.email.join(', ') : r.email}
                            </span>
                          </div>
                        </td>

                        {/* Product */}
                        <td className="px-lg py-4 max-w-[220px]">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-error truncate" title={p.product || p.productName}>
                              • {p.product || p.productName}
                            </span>
                          </div>
                        </td>

                        {/* Price (Particular Product Price Only) */}
                        <td className="px-lg py-4 font-black text-xs md:text-sm text-on-surface font-tabular-nums">
                          ₹{prodPrice.toLocaleString()}
                        </td>
                      </tr>
                    );
                  });
                });
              }

              return pagedReminders.map((r) => {
                return (
                  <tr key={r.id} className="hover:bg-primary/1 transition-all">

                    {/* Order Date */}
                    {/* <td className="px-lg py-4 font-bold text-[11px] text-on-surface font-tabular-nums">
                      {r.orderDateDot || r.orderDate || '—'}
                    </td> */}

                    {/* Renewal (start date - end date) */}
                    <td className="px-lg py-4 font-bold text-[11px] text-on-surface font-tabular-nums">
                      <div className="flex flex-col gap-1">
                        <span>
                          {(r.startDateDot || r.startDate) ? `${r.startDateDot || r.startDate} - ${r.endDateDot || r.endDate || r.dueDate || ''}` : (r.endDateDot || r.dueDate || '—')}
                        </span>
                        {/* <div className="flex flex-wrap gap-1">
                          {r.emailSend && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider" title="Renewal Reminder Sent">
                              Renewal
                            </span>
                          )}
                          {r.expiredEmailSend && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#e65100]/10 text-[#e65100] border border-[#e65100]/20 uppercase tracking-wider" title="Expiry Email Sent">
                              Expired
                            </span>
                          )}
                          {r.deletionEmailSend && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#c62828]/10 text-[#c62828] border border-[#c62828]/20 uppercase tracking-wider" title="Deletion Warning Sent">
                              Deletion
                            </span>
                          )}
                          {!r.emailSend && !r.expiredEmailSend && !r.deletionEmailSend && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-outline-variant/20 text-on-surface-variant/70 border border-outline-variant/30 uppercase tracking-wider">
                              None Sent
                            </span>
                          )}
                        </div> */}
                      </div>
                    </td>

                    {/* Customer Details */}
                    <td className="px-lg py-4">
                      <div
                        onClick={() => navigate('/customers', { state: { customerId: r.customerId, editMode: true } })}
                        className="flex flex-col gap-0.5 cursor-pointer group"
                        title="Click to edit customer details"
                      >
                        <span
                          className="text-xs font-bold text-on-surface group-hover:text-primary group-hover:underline leading-none truncate max-w-[180px] transition-colors"
                        >
                          {r.customerName}
                        </span>
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
                        {r.domainUrl && (
                          <span className="text-[10px] text-on-surface-variant font-medium">{r.domainUrl}</span>
                        )}
                        <span className="text-[10px] text-on-surface-variant font-medium truncate max-w-[180px]">
                          {Array.isArray(r.email) ? r.email.join(', ') : r.email}
                        </span>
                      </div>
                    </td>

                    {/* Products */}
                    <td className="px-lg py-4 max-w-[220px]">
                      <div className="flex flex-col gap-1 max-w-[220px]">
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

                    {/* Total Price */}
                    <td className="px-lg py-4 font-black text-xs md:text-sm text-on-surface font-tabular-nums">
                      ₹{(r.sellerPriceRenewal !== null && r.sellerPriceRenewal !== undefined ? r.sellerPriceRenewal : (r.price || 0)).toLocaleString()}
                    </td>

                    {/* Payment Status */}
                    <td className="px-lg py-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        {r.paymentStatus === "Fully Paid" || r.paymentStatus === "Paid" ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-success/10 text-success border border-success/20 cursor-default"
                          >
                            {r.paymentStatus || "Fully Paid"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPayModal(r)}
                            title="Click to update payment"
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider cursor-pointer hover:opacity-80 active:scale-95 transition-all ${
                              r.paymentStatus === "Partially Paid"
                                ? "bg-warning/10 text-warning border border-warning/20"
                                : "bg-error/10 text-error border border-error/20"
                            }`}
                          >
                            {r.paymentStatus || "Unpaid"}
                          </button>
                        )}

                        {r.lastPaymentDate &&
                          (r.paymentStatus === "Fully Paid" ||
                            r.paymentStatus === "Paid") && (
                            <span
                              className="text-[10px] text-on-surface-variant font-medium font-tabular-nums"
                              title={`Last Payment Date: ${r.lastPaymentDate}`}
                            >
                              Paid: {r.lastPaymentDate}
                            </span>
                          )}
                      </div>
                    </td>

                    {/* Action Panel */}
                    <td className="px-lg py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
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
                          className="w-9 h-9 flex items-center justify-center bg-primary/5 hover:bg-primary/15 text-primary rounded-xl transition-all cursor-pointer shadow-sm border border-primary/15"
                          title="View Invoices"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button
                          onClick={() => {
                            const orderId = r.id.split('-')[1];
                            navigate(`/new-order/${r.customerId}/${orderId}`, { state: { fromReminders: true } });
                          }}
                          className="w-9 h-9 flex items-center justify-center bg-primary/5 hover:bg-primary/15 text-primary rounded-xl transition-all cursor-pointer shadow-sm border border-primary/15"
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
                            className="w-9 h-9 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-xl transition-all cursor-pointer shadow-sm border border-emerald-500/20"
                            title="Generate New Invoice"
                          >
                            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                          </button>
                        )}

                        {!(paymentFilter === 'paid' || r.paymentStatus === 'Fully Paid' || r.paymentStatus === 'Paid') && (
                          (r.emailSend || r.expiredEmailSend || r.deletionEmailSend) ? (
                            <button
                              onClick={() => setReconfirmReminder(r)}
                              className="px-lg h-9 flex items-center justify-center gap-2 bg-surface-container-high text-on-surface-variant border border-outline-variant rounded-xl font-bold transition-all cursor-pointer shadow-sm"
                              title="Email already sent — click to send again"
                            >
                              <span className="material-symbols-outlined text-[18px]">mail_off</span>
                              <span className="text-[11px] md:text-body-sm">Sent</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openSendModal(r)}
                              className="px-lg h-9 flex items-center justify-center gap-2 bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 rounded-xl font-bold transition-all cursor-pointer active:scale-[0.98] group/send"
                            >
                              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">send</span>
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

      {/* Pagination */}
      {!loading && filteredReminders.length > REM_PAGE_SIZE && (() => {
        const totalPages = Math.ceil(filteredReminders.length / REM_PAGE_SIZE);
        const from = (reminderPage - 1) * REM_PAGE_SIZE + 1;
        const to = Math.min(reminderPage * REM_PAGE_SIZE, filteredReminders.length);
        return (
          <div className="flex items-center justify-between mt-md px-xs">
            <p className="text-xs text-on-surface-variant">
              Showing <span className="font-bold text-on-surface">{from}–{to}</span> of{' '}
              <span className="font-bold text-on-surface">{filteredReminders.length}</span>
            </p>
            <div className="flex items-center gap-xs">
              <button
                onClick={() => setReminderPage(p => Math.max(1, p - 1))}
                disabled={reminderPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={totalPages || 1}
                  value={reminderPageInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReminderPageInput(val);
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num >= 1 && num <= totalPages) {
                      setReminderPage(num);
                    }
                  }}
                  onBlur={() => {
                    const num = parseInt(reminderPageInput, 10);
                    if (isNaN(num) || num < 1) {
                      setReminderPage(1);
                      setReminderPageInput(1);
                    } else if (num > totalPages) {
                      setReminderPage(totalPages);
                      setReminderPageInput(totalPages);
                    } else {
                      setReminderPage(num);
                      setReminderPageInput(num);
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
                onClick={() => setReminderPage(p => Math.min(totalPages, p + 1))}
                disabled={reminderPage >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        );
      })()}

      {filteredReminders.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-md">
            <span className="material-symbols-outlined text-outline text-3xl">notifications_off</span>
          </div>
          <h3 className="text-h3 font-h3 text-on-surface">No reminders found</h3>
          <p className="text-on-surface-variant font-body-md max-w-[300px]">
            Adjust your search to find specific customer reminders.
          </p>
        </div>
      )}

      {/* Auto Reminder Configuration Modal */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[90vh] flex flex-col">
            <div className="p-md md:p-lg space-y-md">
              <div className="flex items-center gap-md text-on-surface">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px] md:text-[28px]">
                    schedule_send
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-h3 font-black tracking-tight truncate">Automation Settings</h3>
                  <p className="text-on-surface-variant text-[10px] md:text-body-sm truncate">Configure follow-ups.</p>
                </div>
              </div>

              <div className="space-y-lg py-sm">
                <div className="flex items-center justify-between p-md md:p-lg bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-on-surface text-[13px] md:text-body-sm truncate">Automation Status</p>
                    <p className="text-[10px] md:text-[11px] text-on-surface-variant truncate">Enable auto-reminders.</p>
                  </div>
                  <button
                    onClick={() => setIsAutoEnabled(!isAutoEnabled)}
                    className={`relative w-10 md:w-12 h-6 md:h-7 rounded-full transition-all duration-300 border-2 shrink-0 ${isAutoEnabled
                      ? 'bg-success border-success'
                      : 'bg-error border-error'
                      }`}
                  >
                    <div className={`absolute top-px left-px w-4 md:w-5 h-4 md:h-5 bg-white rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${isAutoEnabled ? 'translate-x-4 md:translate-x-5' : 'translate-x-0'}`}>
                      <span className={`material-symbols-outlined text-[12px] md:text-[14px] ${isAutoEnabled ? 'text-success' : 'text-error'}`}>
                        {isAutoEnabled ? 'check' : 'close'}
                      </span>
                    </div>
                  </button>
                </div>

                <div className={`space-y-md transition-all duration-300 ${isAutoEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary text-[18px] md:text-[20px]">timer</span>
                    <h4 className="text-[10px] md:text-[12px] font-black text-primary uppercase tracking-widest">Intervals (Days)</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-sm">
                    {autoDays.map((day, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <label className="text-[9px] md:text-[10px] font-black text-on-surface-variant uppercase tracking-widest block truncate">Step {idx + 1}</label>
                        <div className="relative">
                          <input
                            type="number"
                            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2 md:px-md py-2 md:py-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all text-xs md:text-sm"
                            value={day}
                            onChange={(e) => {
                              const newDays = [...autoDays]
                              newDays[idx] = e.target.value
                              setAutoDays(newDays)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-md bg-primary/5 rounded-xl border border-primary/10 flex gap-md items-start">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">info</span>
                  <p className="text-[11px] text-on-surface-variant text-left leading-relaxed">
                    Reminders will be sent automatically at these day intervals until payment is confirmed.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low px-md md:px-lg py-sm flex flex-col sm:flex-row justify-end gap-2 border-t border-outline-variant/30 mt-auto">
              <button
                onClick={() => setIsAutoModalOpen(false)}
                className="order-2 sm:order-1 px-lg py-2 font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all text-[12px] md:text-body-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsAutoModalOpen(false)
                  toast.success('Automation saved')
                }}
                className="order-1 sm:order-2 px-xl py-2 bg-primary text-on-primary font-bold rounded-lg transition-all active:scale-[0.98] text-[12px] md:text-body-sm shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedReminder && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[650px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[95vh] md:max-h-[90vh]">
            <div className="p-md md:p-lg space-y-md border-b border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center justify-between gap-md">
                <div className="flex items-center gap-md text-on-surface min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-md md:text-lg uppercase">
                    {selectedReminder.customerName?.charAt(0) || <span className="material-symbols-outlined text-[24px] md:text-[28px]">person</span>}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="flex items-center gap-1.5 group/modalcust"
                      title="Customer details"
                    >
                      <h3 className="text-lg md:text-h3 font-black tracking-tight truncate">{selectedReminder.customerName}</h3>
                    </div>
                    <p className="text-on-surface-variant text-[10px] md:text-body-sm lowercase truncate">{Array.isArray(selectedReminder.email) ? selectedReminder.email.join(', ') : selectedReminder.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-md md:p-lg space-y-lg md:space-y-xl custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md md:gap-lg">
                {/* Left Column: Customer Profile */}
                <div className="space-y-md">
                  <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                    <h4 className="text-[10px] md:text-label-caps font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[18px]">account_box</span>
                      Customer Profile
                    </h4>
                    <button
                      type="button"
                      onClick={() => navigate('/customers', { state: { customerId: selectedReminder.customerId, editMode: true } })}
                      className="text-[11px] text-primary font-bold hover:underline flex items-center gap-0.5 cursor-pointer capitalize"
                      title="Edit Customer Details"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      Edit Customer
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">Phone</span>
                      <span className="text-xs font-bold text-on-surface">{Array.isArray(selectedReminder.phone) ? selectedReminder.phone.join(', ') : selectedReminder.phone}</span>
                    </div>
                    <div className="flex justify-between items-center px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">Email</span>
                      <span className="text-xs font-bold text-on-surface truncate max-w-[150px]">{Array.isArray(selectedReminder.email) ? selectedReminder.email.join(', ') : selectedReminder.email}</span>
                    </div>
                    <div className="flex flex-col px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Address</span>
                      <span className="text-xs font-bold text-on-surface whitespace-pre-wrap">{selectedReminder.customerAddress || "N/A"}</span>
                    </div>
                    <div className="flex flex-col px-md py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Notes</span>
                      <span className="text-xs font-bold text-on-surface whitespace-pre-wrap">{selectedReminder.customerNotes || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Order Information */}
                <div className="space-y-md">
                  <h4 className="text-[10px] md:text-label-caps font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30 pb-2 flex items-center gap-sm">
                    <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                    Expiring Order Details
                  </h4>

                  <div className="p-md bg-primary/5 rounded-xl border border-primary/10 space-y-md">
                    <div className="space-y-sm">
                      {selectedReminder.products?.map((prod, pIdx) => {
                        const isExpiringProduct = prod.validationEnabled && !prod.deactive;
                        return (
                          <div key={pIdx} className={`p-3 rounded-lg border ${isExpiringProduct ? 'bg-primary/10 border-primary/30' : prod.deactive ? 'bg-error/5 border-error/20 opacity-75' : 'bg-surface-container-low border-outline-variant/20'} flex flex-col gap-2`}>
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${prod.deactive ? 'text-error font-bold' : 'text-on-surface'}`}>
                                  {prod.productName}
                                  {prod.deactive && (
                                    <span className="ml-1.5 text-[8px] bg-error/10 text-error font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                      Deactive {prod.deactiveYear ? `(${formatDeactiveDate(prod.deactiveYear)})` : ''}
                                    </span>
                                  )}
                                  {isExpiringProduct && (
                                    <span className="ml-1 text-[8px] bg-error text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Expiring
                                    </span>
                                  )}
                                </p>
                                <p className="text-[9px] text-on-surface-variant font-black uppercase whitespace-pre-wrap">{prod.variant}</p>
                                {isExpiringProduct && prod.endDate && (
                                  <p className="text-[8px] text-on-surface-variant font-semibold mt-1">
                                    Renewal Date: {prod.endDate ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(prod.endDate)).replace(/\//g, '-') : 'N/A'}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs font-black ${prod.deactive ? 'text-error/80 line-through' : 'text-primary'}`}>₹{prod.price.toLocaleString()}</span>
                            </div>

                            {isExpiringProduct && (() => {
                              const pidStr = prod._id ? prod._id.toString() : "";
                              const currentVal = editingPrices[prod._id] || (pidStr ? editingPrices[pidStr] : {}) || {};
                              return (
                                <div className="grid grid-cols-2 gap-sm mt-2 pt-2 border-t border-outline-variant/10">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-[#2e7d32] uppercase">Renewal Selling (₹)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1 font-bold text-[#2e7d32] text-xs outline-none focus:ring-1 focus:ring-[#2e7d32]"
                                      value={currentVal.renewalSelling ?? ""}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const updatedObj = { ...currentVal, renewalSelling: val };
                                        setEditingPrices(prev => ({
                                          ...prev,
                                          [prod._id]: updatedObj,
                                          ...(pidStr ? { [pidStr]: updatedObj } : {})
                                        }));
                                      }}
                                    />
                                  </div>
                                  {/* <div className="space-y-1">
                                    <label className="text-[9px] font-black text-on-surface-variant uppercase">Renewal Cost (₹)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1 font-bold text-on-surface text-xs outline-none focus:ring-1 focus:ring-primary"
                                      value={currentVal.renewalCost ?? ""}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const updatedObj = { ...currentVal, renewalCost: val };
                                        setEditingPrices(prev => ({
                                          ...prev,
                                          [prod._id]: updatedObj,
                                          ...(pidStr ? { [pidStr]: updatedObj } : {})
                                        }));
                                      }}
                                    />
                                  </div> */}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>

                    {(() => {
                      const totalRenewalSelling = selectedReminder.products?.reduce((sum, p) => {
                        if (p.validationEnabled && !p.deactive) {
                          const pidStr = p._id ? p._id.toString() : "";
                          const editObj = editingPrices[p._id] || (pidStr ? editingPrices[pidStr] : null);
                          const price = editObj?.renewalSelling !== undefined ? editObj.renewalSelling : (p.renewalSelling ?? p.price ?? 0);
                          return sum + (price);
                        }
                        return sum;
                      }, 0) || 0;

                      const totalRenewalCost = selectedReminder.products?.reduce((sum, p) => {
                        if (p.validationEnabled && !p.deactive) {
                          const pidStr = p._id ? p._id.toString() : "";
                          const editObj = editingPrices[p._id] || (pidStr ? editingPrices[pidStr] : null);
                          const cost = editObj?.renewalCost !== undefined ? editObj.renewalCost : (p.renewalCost ?? p.productcost ?? p.costPrice ?? 0);
                          return sum + (cost);
                        }
                        return sum;
                      }, 0) || 0;

                      return (
                        <div className="pt-md border-t border-outline-variant/30 mt-4 space-y-sm text-xs font-black">
                          <div className="flex justify-between text-[#2e7d32]">
                            <span>Total Renewal Selling:</span>
                            <span>₹{totalRenewalSelling.toLocaleString()}</span>
                          </div>
                          {/* <div className="flex justify-between text-on-surface-variant">
                            <span>Total Renewal Cost:</span>
                            <span>₹{totalRenewalCost.toLocaleString()}</span>
                          </div> */}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low px-md md:px-lg py-md flex flex-wrap justify-end gap-2.5 border-t border-outline-variant/30 mt-auto">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-md md:px-lg py-2 text-on-surface-variant font-bold hover:bg-surface-variant rounded-xl transition-all cursor-pointer text-xs md:text-body-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSavePrices}
                disabled={savingPrices}
                className="px-md md:px-xl py-2 bg-[#2e7d32] text-on-primary font-bold rounded-xl transition-all active:scale-[0.98] text-xs md:text-body-sm shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {savingPrices ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Prices
                  </>
                )}
              </button>
              {/* <button
                type="button"
                onClick={() => {
                  if (!selectedReminder) return;
                  const remToUse = selectedReminder;
                  setIsViewModalOpen(false);
                  const orderId = remToUse.id ? (String(remToUse.id).includes('-') ? String(remToUse.id).split('-')[1] : remToUse.id) : remToUse.orderId;
                  setInvoiceModalConfig({ isOpen: true, order: { ...remToUse, orderId } });
                }}
                className="px-md md:px-lg py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 border border-primary/20 text-xs md:text-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Invoice
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedReminder) return;
                  const remToUse = selectedReminder;
                  setIsViewModalOpen(false);
                  const orderId = remToUse.id ? (String(remToUse.id).includes('-') ? String(remToUse.id).split('-')[1] : remToUse.id) : remToUse.orderId;
                  setInvoiceModalConfig({ isOpen: true, order: { ...remToUse, orderId } });
                }}
                className="px-md md:px-lg py-2 bg-primary text-on-primary font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-md hover:brightness-110 text-xs md:text-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Share Invoice
              </button> */}
            </div>
          </div>
        </div>
      )}


      {/* Send Reminder & Mail History Modal */}
      {isSendModalOpen && reminderToSend && (() => {
        const today = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const isExpired = reminderToSend.endDate && reminderToSend.endDate < todayStr;

        const isSendDisabled = selectedSendTemplate === 'Expired'
          ? (!isExpired && !reminderToSend.emailSend)
          : selectedSendTemplate === 'Deletion'
            ? !reminderToSend.expiredEmailSend
            : false;

        return (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-3 md:p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[700px] max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col">

              {/* Modal Header */}
              <div className="px-md py-4 border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-md shrink-0">
                <div className="flex items-center gap-md text-on-surface min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black">
                    <span className="material-symbols-outlined text-[22px]">send</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-black tracking-tight text-on-surface truncate">
                      Send Reminder For: {reminderToSend.customerName}
                    </h3>
                    <p className="text-on-surface-variant text-[11px] font-medium truncate mt-0.5">
                      To: <span className="font-semibold">{Array.isArray(reminderToSend.email) ? reminderToSend.email.join(', ') : reminderToSend.email}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSendModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">

                {/* Tabs Switcher at top of Body */}
                <div className="flex items-center justify-start border-b border-outline-variant/30 pb-3">
                  <div className="flex items-center bg-surface-container-high border border-outline-variant/60 rounded-xl p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setSendModalTab('mail')}
                      className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${sendModalTab === 'mail'
                        ? "bg-primary text-on-primary shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-variant/50"
                        }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">mail</span>
                      Mail Send
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendModalTab('history')}
                      className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${sendModalTab === 'history'
                        ? "bg-primary text-on-primary shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-variant/50"
                        }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">history</span>
                      History ({mailHistoryList.length})
                    </button>
                  </div>
                </div>

                {/* TAB 1: MAIL SEND (SINGLE PAGE LAYOUT MATCHING USER IMAGE) */}
                {sendModalTab === 'mail' ? (
                  <>
                    {/* Yellow Info / Warning Callout Banner */}
                    {/* <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-start gap-3 shadow-xs">
                      <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                      </div>
                      <p className="text-xs font-medium text-amber-900 leading-relaxed text-left">
                        <span className="font-bold">Please check the renewal price before proceeding.</span><br />
                        If you want to modify the renewal selling or cost price, please edit it under <span className="font-bold underline">View Details</span> first, then start sending the message or payment.
                      </p>
                    </div> */}

                    {/* Multi-Renewal Banner Toggle */}
                    {(() => {
                      const matchingReminders = reminders.filter(item => item.customerId === reminderToSend.customerId);
                      if (matchingReminders.length <= 1) return null;
                      return (
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[20px]">layers</span>
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-on-surface">
                                {matchingReminders.length} Renewals Found for {reminderToSend.customerName}
                              </p>
                              <p className="text-[11px] text-on-surface-variant">
                                Send all renewals combined in a single email with itemized table
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={isCombinedSend}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setIsCombinedSend(checked);
                                if (checked) {
                                  const consolidated = buildConsolidatedEmail(matchingReminders, selectedSendTemplate);
                                  setSendSubject(consolidated.subject);
                                  setSendFullSubject(consolidated.fullSubject);
                                  setSendText(consolidated.content);
                                } else {
                                  populateSendModal(reminderToSend, selectedSendTemplate);
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      );
                    })()}

                    {/* SELECT TEMPLATE TYPE */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/80 block">
                        Select Template Type
                      </label>
                      <div className="grid grid-cols-3 gap-2 p-1 bg-surface-container-low border border-outline-variant/40 rounded-xl">
                        {[
                          { type: 'Renewal', label: 'Renewal' },
                          { type: 'Expired', label: 'Expired' },
                          { type: 'Deletion', label: 'Deletion' }
                        ].map((tmpl) => {
                          const isSelected = selectedSendTemplate === tmpl.type;
                          return (
                            <button
                              key={tmpl.type}
                              type="button"
                              onClick={() => {
                                setSelectedSendTemplate(tmpl.type);
                                const matchingReminders = reminders.filter(item => item.customerId === reminderToSend.customerId);
                                if (isCombinedSend && matchingReminders.length > 1) {
                                  const consolidated = buildConsolidatedEmail(matchingReminders, tmpl.type);
                                  setSendSubject(consolidated.subject);
                                  setSendFullSubject(consolidated.fullSubject);
                                  setSendText(consolidated.content);
                                } else {
                                  populateSendModal(reminderToSend, tmpl.type);
                                }
                              }}
                              className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${isSelected
                                ? "bg-primary text-on-primary shadow-xs"
                                : "text-on-surface-variant hover:bg-surface-variant/50"
                                }`}
                            >
                              {tmpl.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sequence Warning Rule */}
                    {isSendDisabled && (
                      <div className="p-3 bg-error/5 rounded-xl border border-error/20 flex gap-2.5 items-start">
                        <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0">warning</span>
                        <div className="text-left text-xs font-semibold text-error/90 leading-relaxed">
                          {selectedSendTemplate === 'Expired' && (
                            <p>You cannot send the Expired reminder because the Renewal email has not been sent yet.</p>
                          )}
                          {selectedSendTemplate === 'Deletion' && (
                            <p>You cannot send the Deletion warning because the Expired email has not been sent yet.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SUBJECT */}
                    <div className={`space-y-1.5 ${isSendDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
                      <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/80 block">
                        Subject
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled={isSendDisabled}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-on-surface outline-none cursor-default select-none transition-all opacity-90"
                        value={sendSubject}
                        placeholder="Subject line..."
                      />
                    </div>

                    {/* MESSAGE */}
                    <div className={`space-y-1.5 ${isSendDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-start">
                        <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/80 block">
                          Message Body
                        </label>
                        {/* {/<[a-z][\s\S]*>/i.test(sendText || '') && (
                          <div className="flex items-center bg-surface-container-high p-0.5 rounded-lg border border-outline-variant/60">
                            <button
                              type="button"
                              onClick={() => setMsgViewMode('preview')}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${msgViewMode === 'preview'
                                ? 'bg-primary text-on-primary shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">visibility</span>
                              Visual Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setMsgViewMode('code')}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${msgViewMode === 'code'
                                ? 'bg-primary text-on-primary shadow-xs'
                                : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">code</span>
                              Edit HTML Code
                            </button>
                          </div>
                        )} */}
                      </div>

                      {msgViewMode === 'preview' && /<[a-z][\s\S]*>/i.test(sendText || '') ? (
                        <div className="p-4 bg-white dark:bg-slate-900 border border-outline-variant rounded-xl max-h-[350px] overflow-y-auto custom-scrollbar text-xs text-slate-800 dark:text-slate-100 shadow-inner leading-relaxed text-left">
                          <div dangerouslySetInnerHTML={{ __html: convertTextWithHtmlToBr(sendText) }} />
                        </div>
                      ) : (
                        <textarea
                          disabled={isSendDisabled}
                          rows={7}
                          className="w-full p-3.5 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-xs text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all leading-relaxed custom-scrollbar resize-none"
                          value={sendText}
                          onChange={(e) => setSendText(e.target.value)}
                          placeholder="Enter email content..."
                        />
                      )}
                    </div>
                  </>
                ) : (
                  /* TAB 2: MAIL HISTORY TABLE */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                        Email History
                      </h4>
                      <span className="text-xs text-on-surface-variant font-medium">
                        Total {mailHistoryList.length} Mails
                      </span>
                    </div>

                    {loadingMailHistory ? (
                      <div className="py-12 text-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : mailHistoryList.length === 0 ? (
                      <div className="p-8 text-center bg-surface-container-low/50 border border-dashed border-outline-variant rounded-xl text-on-surface-variant/70 text-xs italic">
                        No previous communication logs recorded for this customer.
                      </div>
                    ) : (
                      <div className="border border-outline-variant/60 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-container-low border-b border-outline-variant/60 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                              <th className="px-3 py-2.5">Date & Time</th>
                              <th className="px-3 py-2.5">Type</th>
                              <th className="px-3 py-2.5">Mode</th>
                              <th className="px-3 py-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20">
                            {mailHistoryList.map((logItem, idx) => {
                              const typeStr = logItem.templateType || 'Renewal';
                              const isSent = logItem.status === 'Sent';
                              const modeStr = logItem.mode || 'Email';

                              return (
                                <tr key={logItem._id || idx} className="hover:bg-surface-container-low/50 transition-colors">
                                  <td className="px-3 py-2.5 font-bold font-tabular-nums text-on-surface">
                                    {formatMailHistoryDate(logItem.sentAt || logItem.createdAt)}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${typeStr === 'Renewal' ? 'bg-emerald-100 text-emerald-700' :
                                      typeStr === 'Expired' ? 'bg-amber-100 text-amber-700' :
                                        typeStr === 'Deletion' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                      {typeStr}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${modeStr === 'WhatsApp' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                      }`}>
                                      {modeStr}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {isSent ? (
                                      <span className="text-emerald-600 font-bold text-[11px] inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Sent
                                      </span>
                                    ) : (
                                      <span className="text-rose-500 font-bold text-[11px]">Failed</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer (Matching Screenshot) */}
              <div className="px-md py-3.5 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {sendModalTab === 'mail' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const numbers = getPhoneNumbers(reminderToSend.phone);
                        if (numbers.length === 0) {
                          toast.error("Customer phone number is missing");
                          return;
                        }

                        setWhatsappSelectModal({
                          isOpen: true,
                          phoneNumbers: numbers,
                          customerName: reminderToSend.customerName,
                          onSelectNumber: async (selectedPhone) => {
                            if (selectedSendTemplate === 'Renewal') {
                              let nextNo = 'JWS-PI-01';
                              try {
                                const fetchedNo = await getNextProformaNumber('withoutGST');
                                if (fetchedNo) nextNo = fetchedNo;
                              } catch (e) { }

                              setProformaPromptModal({
                                isOpen: true,
                                mode: 'whatsapp',
                                selectedPhone: selectedPhone,
                                defaultProformaNo: nextNo
                              });
                            } else {
                              executeWhatsAppProcess({
                                selectedPhone: selectedPhone,
                                attachProforma: false,
                                gstType: 'withoutGST',
                                proformaNo: ''
                              });
                            }
                          }
                        });
                      }}
                      disabled={isSendDisabled}
                      className={`px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer ${isSendDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                        }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedSendTemplate === 'Renewal') {
                          let nextNo = 'JWS-PI-01';
                          try {
                            const fetchedNo = await getNextProformaNumber('withoutGST');
                            if (fetchedNo) nextNo = fetchedNo;
                          } catch (e) { }

                          setProformaPromptModal({
                            isOpen: true,
                            mode: 'email',
                            selectedPhone: '',
                            defaultProformaNo: nextNo
                          });
                        } else {
                          executeSendEmailProcess({
                            attachProforma: false,
                            gstType: 'withoutGST',
                            proformaNo: ''
                          });
                        }
                      }}
                      disabled={sendingEmail || isSendDisabled}
                      className={`px-5 py-2.5 bg-primary hover:brightness-110 text-on-primary text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer ${sendingEmail || isSendDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                        }`}
                    >
                      {sendingEmail ? (
                        <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      )}
                      {sendingEmail ? 'Sending...' : 'Send Email'}
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        );
      })()}



      {/* Editable Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[650px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[95vh] md:max-h-[90vh]">
            {/* Header */}
            <div className="p-md md:p-lg space-y-md border-b border-outline-variant/30 bg-surface-container-low">
              <div className="flex items-center justify-between gap-md">
                <div className="flex items-center gap-md text-on-surface min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-md md:text-lg uppercase">
                    <span className="material-symbols-outlined text-[24px] md:text-[28px]">description</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-h3 font-black tracking-tight truncate">Message Templates</h3>
                    <p className="text-on-surface-variant text-[10px] md:text-body-sm truncate">Customize your reminder messages.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-outline-variant/30 px-md md:px-lg bg-surface-container-low">
              {['Renewal', 'Expired', 'Deletion', 'Payment'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTemplateTab(tab);
                    setTempTemplateText(templates[tab]?.content || "");
                    setTempTemplateSubject(templates[tab]?.subject || "");
                  }}
                  className={`px-lg py-3 font-bold text-xs md:text-sm border-b-2 cursor-pointer transition-all ${activeTemplateTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-lg md:p-xl space-y-lg overflow-y-auto flex-1 custom-scrollbar">
              {/* Insert Tags Help Section */}
              <div className="p-md bg-primary/5 rounded-xl border border-primary/10 space-y-2">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Available Placeholders (click to insert at cursor)</span>
                <div className="flex flex-wrap gap-xs">
                  {[
                    { label: 'Customer Name', value: '[customerName]' },
                    { label: 'Product Name', value: '[product]' },
                    { label: 'Product Table', value: '[product table]' },
                    { label: 'Domain URL', value: '[domainUrl]' },
                    { label: 'Price', value: '[price]' },
                    { label: 'Price in Words', value: '[priceWords]' },
                    { label: 'Start Date', value: '[startDate]' },
                    { label: 'End Date', value: '[endDate]' }
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.value)}
                      className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer border border-outline-variant/40 flex items-center gap-1 select-none active:scale-95"
                      title={`Insert ${p.value}`}
                    >
                      <span className="text-[9px] font-medium text-on-surface-variant/80">{p.label}:</span>
                      <span className="text-primary">{p.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-sm">
                <label className="text-[10px] md:text-label-caps font-black text-on-surface-variant uppercase tracking-widest">Template Subject</label>
                <input
                  id="template-subject-input"
                  type="text"
                  className="w-full px-lg py-sm bg-surface-container-high border border-outline-variant rounded-xl font-body text-xs md:text-body-md text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner font-bold"
                  value={tempTemplateSubject}
                  onChange={(e) => setTempTemplateSubject(e.target.value)}
                  placeholder="Enter email subject line..."
                />
              </div>

              <div className="space-y-sm">
                <label className="text-[10px] md:text-label-caps font-black text-on-surface-variant uppercase tracking-widest">Template Content</label>
                <textarea
                  id="template-content-textarea"
                  className="w-full min-h-[250px] p-lg bg-surface-container-high border border-outline-variant rounded-2xl font-mono text-xs md:text-body-md text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner leading-relaxed"
                  value={tempTemplateText}
                  onChange={(e) => setTempTemplateText(e.target.value)}
                  placeholder="Enter your message here..."
                />
              </div>
            </div>

            <div className="p-lg bg-surface-container-low border-t border-outline-variant flex justify-end gap-md shrink-0">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-lg py-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await saveTemplate({ name: activeTemplateTab, subject: tempTemplateSubject, content: tempTemplateText });
                    setTemplates(prev => ({
                      ...prev,
                      [activeTemplateTab]: { subject: tempTemplateSubject, content: tempTemplateText }
                    }));
                    setIsTemplateModalOpen(false);
                    toast.success(`${activeTemplateTab} template updated successfully!`);
                  } catch (error) {
                    const errorMsg = error.response?.data?.message || error.message || 'Failed to save template';
                    toast.error(errorMsg);
                  }
                }}
                className="px-xl py-sm bg-primary text-on-primary font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto Reminder Settings Modal ─────────────────────────────────── */}
      {isAutoSettingsModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md bg-on-background/20 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[440px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="p-md md:p-lg border-b border-outline-variant/30 bg-surface-container-low flex items-center gap-md">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">schedule_send</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black tracking-tight">Auto Reminder</h3>
                <p className="text-on-surface-variant text-[11px]">Configure automatic email reminders</p>
              </div>
              <button
                onClick={() => setIsAutoSettingsModalOpen(false)}
                className="ml-auto w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-lg space-y-lg overflow-y-auto max-h-[60vh] custom-scrollbar">
              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between p-md bg-surface-container-low rounded-xl border border-outline-variant/30">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-on-surface text-sm">Auto Send Status</p>
                  <p className="text-[11px] text-on-surface-variant">Automatically email customers before/after renewal</p>
                </div>
                <button
                  onClick={() => setAutoEnabled(v => !v)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 border-2 shrink-0 ml-md ${autoEnabled ? 'bg-[#2e7d32] border-[#2e7d32]' : 'bg-error border-error'
                    }`}
                >
                  <div className={`absolute top-px left-px w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${autoEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}>
                    <span className={`material-symbols-outlined text-[13px] ${autoEnabled ? 'text-[#2e7d32]' : 'text-error'}`}>
                      {autoEnabled ? 'check' : 'close'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Main settings section (hidden if disabled) */}
              <div className={`space-y-lg transition-all duration-300 ${autoEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

                {/* 1. Renewal Settings */}
                <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-md">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary text-[20px]">notification_important</span>
                    <h4 className="text-xs font-black text-primary uppercase tracking-wider">Renewal Reminders</h4>
                  </div>
                  <div className="space-y-sm">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                      Days Before Renewal to Send Email
                    </label>
                    <div className="flex items-center gap-md">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        className="w-20 bg-surface-container-high border border-outline-variant rounded-xl px-md py-sm font-bold text-on-surface text-md focus:ring-2 focus:ring-primary outline-none transition-all text-center shadow-inner"
                        value={autoDaysBefore}
                        onChange={(e) => setAutoDaysBefore(e.target.value)}
                      />
                      <span className="text-xs font-bold text-on-surface-variant">days before renewal date</span>
                    </div>
                  </div>
                </div>

                {/* 2. Expired Settings */}
                <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[#e65100] text-[20px]">warning</span>
                      <h4 className="text-xs font-black text-[#e65100] uppercase tracking-wider">Expiry Notifications</h4>
                    </div>
                    <button
                      onClick={() => setSendExpiredEmail(v => !v)}
                      className={`relative w-10 h-6 rounded-full transition-all duration-300 border-2 shrink-0 ${sendExpiredEmail ? 'bg-[#e65100] border-[#e65100]' : 'bg-outline-variant/40 border-outline-variant/40'
                        }`}
                    >
                      <div className={`absolute top-px left-px w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${sendExpiredEmail ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                        <span className={`material-symbols-outlined text-[10px] ${sendExpiredEmail ? 'text-[#e65100]' : 'text-on-surface-variant/40'}`}>
                          {sendExpiredEmail ? 'check' : 'close'}
                        </span>
                      </div>
                    </button>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Send an automated email reminder to the customer immediately when their subscription expires.
                  </p>
                </div>

                {/* 3. Deletion Settings */}
                <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[#c62828] text-[20px]">delete_forever</span>
                      <h4 className="text-xs font-black text-[#c62828] uppercase tracking-wider">Deletion Warnings</h4>
                    </div>
                    <button
                      onClick={() => setSendDeletionEmail(v => !v)}
                      className={`relative w-10 h-6 rounded-full transition-all duration-300 border-2 shrink-0 ${sendDeletionEmail ? 'bg-[#c62828] border-[#c62828]' : 'bg-outline-variant/40 border-outline-variant/40'
                        }`}
                    >
                      <div className={`absolute top-px left-px w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${sendDeletionEmail ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                        <span className={`material-symbols-outlined text-[10px] ${sendDeletionEmail ? 'text-[#c62828]' : 'text-on-surface-variant/40'}`}>
                          {sendDeletionEmail ? 'check' : 'close'}
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className={`space-y-sm transition-all duration-300 ${sendDeletionEmail ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">
                      Days After Expiry to Send Warning
                    </label>
                    <div className="flex items-center gap-md">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        className="w-20 bg-surface-container-high border border-outline-variant rounded-xl px-md py-sm font-bold text-on-surface text-md focus:ring-2 focus:ring-primary outline-none transition-all text-center shadow-inner"
                        value={deletionDaysAfter}
                        onChange={(e) => setDeletionDaysAfter(e.target.value)}
                      />
                      <span className="text-xs font-bold text-on-surface-variant">days after subscription expiry date</span>
                    </div>
                  </div>
                </div>

                {/* 4. Payment Confirmation Settings */}
                <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[#2e7d32] text-[20px]">mark_email_read</span>
                      <h4 className="text-xs font-black text-[#2e7d32] uppercase tracking-wider">Payment Confirmations</h4>
                    </div>
                    <button
                      onClick={() => setSendPaymentConfirmationEmail(v => !v)}
                      className={`relative w-10 h-6 rounded-full transition-all duration-300 border-2 shrink-0 ${sendPaymentConfirmationEmail ? 'bg-[#2e7d32] border-[#2e7d32]' : 'bg-outline-variant/40 border-outline-variant/40'
                        }`}
                    >
                      <div className={`absolute top-px left-px w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${sendPaymentConfirmationEmail ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                        <span className={`material-symbols-outlined text-[10px] ${sendPaymentConfirmationEmail ? 'text-[#2e7d32]' : 'text-on-surface-variant/40'}`}>
                          {sendPaymentConfirmationEmail ? 'check' : 'close'}
                        </span>
                      </div>
                    </button>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Automatically send a confirmation email receipt to the customer when a payment is added or recorded.
                  </p>
                </div>

              </div>
            </div>

            <div className="bg-surface-container-low px-lg py-sm flex justify-end gap-sm border-t border-outline-variant/30">
              <button
                onClick={() => setIsAutoSettingsModalOpen(false)}
                className="px-lg py-2 font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAutoSettings}
                disabled={savingAutoSettings}
                className="px-xl py-2 bg-primary text-on-primary font-bold rounded-lg transition-all active:scale-[0.98] text-sm shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer disabled:opacity-60 flex items-center gap-sm"
              >
                {savingAutoSettings ? (
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">save</span>
                )}
                {savingAutoSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Re-confirm Send Modal (when email already sent) ───────────────── */}
      {reconfirmReminder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md bg-on-background/30 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[380px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-lg text-center space-y-md">
              <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[28px] text-warning">mark_email_read</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-on-surface">Email Already Sent</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  A reminder email was already sent to <strong>{reconfirmReminder.customerName}</strong>.
                  Do you want to send another manual reminder?
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 justify-center items-center">
                  <span className="text-[10px] font-black text-on-surface-variant/80 uppercase tracking-wider block w-full mb-1">Sent Stages:</span>
                  {reconfirmReminder.emailSend && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                      Renewal
                    </span>
                  )}
                  {reconfirmReminder.expiredEmailSend && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#e65100]/10 text-[#e65100] border border-[#e65100]/20 uppercase tracking-wider">
                      Expired
                    </span>
                  )}
                  {reconfirmReminder.deletionEmailSend && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#c62828]/10 text-[#c62828] border border-[#c62828]/20 uppercase tracking-wider">
                      Deletion
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low px-lg py-sm flex justify-end gap-sm border-t border-outline-variant/30">
              <button
                onClick={() => setReconfirmReminder(null)}
                className="px-lg py-2 font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const r = reconfirmReminder;
                  setReconfirmReminder(null);
                  openSendModal(r);
                }}
                className="px-xl py-2 bg-primary text-on-primary font-bold rounded-lg transition-all active:scale-[0.98] text-sm shadow-sm hover:shadow-md hover:brightness-110 cursor-pointer flex items-center gap-sm"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Send Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GST Invoice Modal ─────────────────────────────────────────────────── */}
      {invoiceModalConfig.isOpen && invoiceModalConfig.order && (
        <GstInvoiceModal
          order={invoiceModalConfig.order}
          reminders={reminders}
          paymentData={invoiceModalConfig.paymentData}
          onClose={() => {
            setInvoiceModalConfig({ isOpen: false, order: null, paymentData: null });
            fetchReminders();
          }}
          onGenerate={handleGenerateInvoicePdf}
        />
      )}

      {/* ── WhatsApp Phone Select Modal ─────────────────────────────────────── */}
      <WhatsAppPhoneModal
        isOpen={whatsappSelectModal.isOpen}
        onClose={() => setWhatsappSelectModal({ isOpen: false, phoneNumbers: [], customerName: "", onSelectNumber: null })}
        phoneNumbers={whatsappSelectModal.phoneNumbers}
        customerName={whatsappSelectModal.customerName}
        onSelectNumber={whatsappSelectModal.onSelectNumber}
      />

      {/* ── Proforma Option Modal ────────────────────────────────────────── */}
      <ProformaOptionModal
        isOpen={proformaPromptModal.isOpen}
        defaultProformaNo={proformaPromptModal.defaultProformaNo}
        isSending={sendingEmail}
        onClose={() => setProformaPromptModal(prev => ({ ...prev, isOpen: false }))}
        onGstTypeChange={(type) => {
          const isWithGst = type === 'withGST';
          const matchingReminders = reminders.filter(item => item.customerId === reminderToSend?.customerId);
          if (isCombinedSend && matchingReminders.length > 1) {
            const consolidated = buildConsolidatedEmail(matchingReminders, selectedSendTemplate, isWithGst);
            setSendSubject(consolidated.subject);
            setSendFullSubject(consolidated.fullSubject);
            setSendText(consolidated.content);
          } else if (reminderToSend) {
            populateSendModal(reminderToSend, selectedSendTemplate, templates, isWithGst);
          }
        }}
        onSendWithoutProforma={() => {
          const defaultGst = !!(reminderToSend?.customerGstin || reminderToSend?.gstin || reminderToSend?.gstNumber);
          if (proformaPromptModal.mode === 'whatsapp') {
            executeWhatsAppProcess({
              selectedPhone: proformaPromptModal.selectedPhone,
              attachProforma: false,
              gstType: defaultGst ? 'withGST' : 'withoutGST',
              proformaNo: ''
            });
          } else {
            executeSendEmailProcess({
              attachProforma: false,
              gstType: defaultGst ? 'withGST' : 'withoutGST',
              proformaNo: ''
            });
          }
        }}
        onSendWithProforma={({ gstType, proformaNo }) => {
          if (proformaPromptModal.mode === 'whatsapp') {
            executeWhatsAppProcess({
              selectedPhone: proformaPromptModal.selectedPhone,
              attachProforma: true,
              gstType,
              proformaNo
            });
          } else {
            executeSendEmailProcess({
              attachProforma: true,
              gstType,
              proformaNo
            });
          }
        }}
      />

      {/* ── Renewal Pay Modal ───────────────────────────────────────────────── */}
      {isPayModalOpen && reminderToPay && (
        <RenewalPayModal
          reminder={reminderToPay}
          reminders={reminders}
          onClose={() => {
            setIsPayModalOpen(false);
            setReminderToPay(null);
          }}
          onSave={async (payload) => {
            try {
              const currentReminder = reminderToPay;
              if (payload.withGst && (payload.gstin || payload.state)) {
                try {
                  const customer = await getCustomerById(reminderToPay.customerId);
                  if (customer && (payload.state !== customer.state || payload.gstin !== customer.gstin)) {
                    await updateCustomer(reminderToPay.customerId, {
                      ...customer,
                      ...(payload.state ? { state: payload.state } : {}),
                      ...(payload.gstin ? { gstin: payload.gstin } : {})
                    });
                  }
                } catch (e) {
                  console.warn("Could not update customer tax info:", e);
                }
              }
              const res = await recordCustomerPayment(reminderToPay.customerId, payload);
              toast.success("Renewal payment recorded successfully!");
              setIsPayModalOpen(false);
              setReminderToPay(null);
              fetchReminders();
              if (currentReminder) {
                const currentOrdId = currentReminder.orderId || (currentReminder.id ? (String(currentReminder.id).includes('-') ? String(currentReminder.id).split('-')[1] : String(currentReminder.id)) : currentReminder._id);

                // If automatic email is disabled, trigger manual compose modal
                if (!sendPaymentConfirmationEmail) {
                  const customer = res.customer;
                  const selectedIds = payload.selectedOrderIds && payload.selectedOrderIds.length > 0
                    ? payload.selectedOrderIds
                    : [currentOrdId];

                  // Collect all selected orders from the customer's updated data
                  const allSelectedOrders = (customer?.orders || []).filter(o =>
                    selectedIds.some(sid => String(o._id) === String(sid))
                  );

                  if (customer && allSelectedOrders.length > 0) {
                    // Build a single merged order that combines all products & domain URLs
                    const mergedOrder = allSelectedOrders.length === 1
                      ? allSelectedOrders[0]
                      : {
                        ...allSelectedOrders[0],
                        // Merge all products across selected orders
                        products: allSelectedOrders.flatMap(o => o.products || []),
                        // Merge & deduplicate domain URLs
                        domainUrl: [...new Set(
                          allSelectedOrders
                            .map(o => o.domainUrl || '')
                            .filter(Boolean)
                            .flatMap(u => u.split(',').map(d => d.trim()))
                        )].join(', '),
                        // Sum total price
                        totalPrice: allSelectedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
                        // Use the earliest startDate and latest endDate
                        startDate: allSelectedOrders.map(o => o.startDate).filter(Boolean).sort()[0] || allSelectedOrders[0].startDate,
                        endDate: allSelectedOrders.map(o => o.endDate).filter(Boolean).sort().reverse()[0] || allSelectedOrders[0].endDate,
                      };

                    // Use the last payment from the primary (first selected) order
                    const primaryOrder = allSelectedOrders[0];
                    const paymentObj = primaryOrder?.payments?.[primaryOrder.payments.length - 1];

                    if (paymentObj) {
                      setTimeout(() => {
                        handleOpenPaymentCompose(customer, mergedOrder, paymentObj._id);
                      }, 500);
                    }
                  }
                }

                const isFinal = payload.paymentStage === 'final';
                const isInstallment = ['advance', 'mid'].includes(payload.paymentStage);
                const invoiceCategory = isFinal ? 'consolidated' : (isInstallment ? 'installment' : 'regular');

                setInvoiceModalConfig({
                  isOpen: true,
                  order: currentReminder,
                  paymentData: {
                    ...payload,
                    paymentStage: payload.paymentStage || 'full',
                    invoiceCategory,
                    includePaymentHistory: isFinal,
                    paymentStatus: (isFinal || payload.paymentStage === 'full') ? 'Paid' : 'Partially Paid',
                    withGst: !!payload.withGst,
                    paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10),
                    selectedOrderIds: payload.selectedOrderIds || [currentOrdId]
                  }
                });
              }
            } catch (err) {
              console.error("Failed to record payment:", err);
              toast.error(err.response?.data?.message || "Failed to record payment");
            }
          }}
        />
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
  );
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

// ─── Renewal Pay Modal ────────────────────────────────────────────────────────
const RenewalPayModal = ({ reminder, reminders = [], onClose, onSave }) => {
  const customerReminders = useMemo(() => {
    if (!reminder) return [];
    const orderMY = getRenewalMonthYear(reminder);
    const list = (reminders || []).filter(r => r.customerId === reminder.customerId && getRenewalMonthYear(r) === orderMY);
    return list.length > 0 ? list : [reminder];
  }, [reminders, reminder]);

  const [selectedOrderIds, setSelectedOrderIds] = useState(() => {
    return customerReminders.map(r => r.orderId || (r.id ? r.id.split('-')[1] : r.id));
  });

  const toggleSelectOrder = (idToToggle) => {
    setSelectedOrderIds(prev =>
      prev.includes(idToToggle) ? prev.filter(id => id !== idToToggle) : [...prev, idToToggle]
    );
  };

  const toggleSelectAll = () => {
    const allIds = customerReminders.map(r => r.orderId || (r.id ? r.id.split('-')[1] : r.id));
    if (selectedOrderIds.length === allIds.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(allIds);
    }
  };

  const unitPriceSum = useMemo(() => {
    return customerReminders
      .filter(r => selectedOrderIds.includes(r.orderId || (r.id ? r.id.split('-')[1] : r.id)))
      .reduce((sum, r) => {
        const val = r.sellerPriceRenewal !== null && r.sellerPriceRenewal !== undefined ? r.sellerPriceRenewal : (r.price || 0);
        return sum + val;
      }, 0);
  }, [customerReminders, selectedOrderIds]);

  const initialGstin = (reminder?.customerGstin || reminder?.gstin || reminder?.gstNumber || "").trim();
  const rawCustomerState = reminder?.customerState || reminder?.state || "";

  const resolveCustomerState = (st, g) => {
    if (st) {
      const s = String(st).trim().toLowerCase();
      if (s === 'tamil nadu' || s === 'tamilnadu' || s === 'tn') return 'Tamil Nadu';
      return 'Other State';
    }
    const cleanGst = String(g || '').trim();
    if (cleanGst.startsWith('33')) return 'Tamil Nadu';
    if (cleanGst.length >= 2) return 'Other State';
    return 'Tamil Nadu';
  };

  const initialMappedState = resolveCustomerState(rawCustomerState, initialGstin);

  const [years, setYears] = useState("1");
  const [amount, setAmount] = useState(() => unitPriceSum * Number(years));
  const [withGst, setWithGst] = useState(() => Boolean(initialGstin));
  const [state, setState] = useState(initialMappedState);
  const [gstin, setGstin] = useState(initialGstin);
  const [gstRates, setGstRates] = useState({ cgst: 9, sgst: 9, igst: 18 });
  const [applyTds, setApplyTds] = useState(false);
  const [tdsAmount, setTdsAmount] = useState("");
  const [paymentStage, setPaymentStage] = useState("full");

  // Fetch latest customer data (GSTIN + State) when modal opens
  useEffect(() => {
    if (reminder?.customerId) {
      getCustomerById(reminder.customerId).then(cust => {
        if (cust) {
          const custGstin = (cust.gstin || cust.gstNumber || "").trim();
          if (custGstin) {
            setGstin(custGstin);
            setWithGst(true);
          } else {
            setGstin("");
            setWithGst(false);
          }
          setState(resolveCustomerState(cust.state, custGstin));
        }
      }).catch(err => console.warn("Could not fetch customer details:", err));
    }
  }, [reminder?.customerId]);

  // Load GST settings
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const gstData = await getGstSettings();
        if (gstData) {
          setGstRates({
            cgst: gstData.cgstPercentage || 9,
            sgst: gstData.sgstPercentage || 9,
            igst: gstData.igstPercentage || 18
          });
        }
      } catch (err) {
        console.error("Failed to load GST settings", err);
      }
    };
    fetchRates();
  }, []);

  useEffect(() => {
    setAmount(unitPriceSum * Number(years));
  }, [unitPriceSum, years]);

  const initialRenewalDates = useMemo(() => {
    if (reminder) {
      const dates = calculateRenewalDates(reminder);
      const toISO = (dStr) => {
        if (!dStr) return "";
        const clean = dStr.trim();
        if (clean.includes("-") && clean.split("-")[0].length === 4) return clean;
        let day, month, year;
        if (clean.includes(".")) {
          const p = clean.split(".");
          if (p.length === 3) {
            if (p[0].length === 4) { year = p[0]; month = p[1]; day = p[2]; }
            else { day = p[0]; month = p[1]; year = p[2]; }
          }
        } else if (clean.includes("-")) {
          const p = clean.split("-");
          if (p.length === 3) {
            if (p[0].length === 4) { year = p[0]; month = p[1]; day = p[2]; }
            else { day = p[0]; month = p[1]; year = p[2]; }
          }
        } else if (clean.includes("/")) {
          const p = clean.split("/");
          if (p.length === 3) {
            if (p[0].length === 4) { year = p[0]; month = p[1]; day = p[2]; }
            else { day = p[0]; month = p[1]; year = p[2]; }
          }
        }
        if (year && month && day) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        return clean;
      };
      return {
        startDate: toISO(dates.startDate),
        endDate: toISO(dates.endDate)
      };
    }
    return { startDate: new Date().toISOString().slice(0, 10), endDate: "" };
  }, [reminder]);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  const handleDurationChange = (val) => {
    setYears(val);
    const numYears = Number(val) || 1;
    setAmount(unitPriceSum * numYears);
  };
  const [startDate, setStartDate] = useState(initialRenewalDates.startDate);
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Compute end date when start date or years change (preserving day and month)
  useEffect(() => {
    if (startDate) {
      const parts = startDate.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const y = parseInt(parts[0], 10) + Number(years);
        setEndDate(`${y}-${parts[1]}-${parts[2]}`);
      } else {
        const date = new Date(startDate);
        if (!isNaN(date.getTime())) {
          date.setFullYear(date.getFullYear() + Number(years));
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          setEndDate(`${y}-${m}-${d}`);
        }
      }
    }
  }, [startDate, years]);

  // Payment date update should ONLY update paymentDate, not startDate
  const handlePaymentDateChange = (val) => {
    setPaymentDate(val);
  };

  const handleConfirm = async () => {
    if (selectedOrderIds.length === 0) {
      return toast.error("Please select at least one item to record payment");
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return toast.error("Please enter a valid renewal amount");
    }

    const amt = Number(amount) || 0;

    if (withGst && !gstin.trim()) {
      return toast.error("GSTIN is required for GST invoices.");
    }
    if (applyTds) {
      const numTds = Number(tdsAmount);
      if (!numTds || numTds <= 0) {
        return toast.error("Please enter a valid TDS amount.");
      }
      if (numTds > amt) {
        return toast.error("TDS amount cannot be greater than the payment amount.");
      }
    }
    if (!paymentDate) return toast.error("Payment date is required");
    if (!startDate) return toast.error("Start date is required");
    if (!endDate) return toast.error("End date is required");

    // Calculate GST WITHOUT rounding
    const cgstRaw = amt * (Number(gstRates.cgst) / 100);
    const sgstRaw = amt * (Number(gstRates.sgst) / 100);
    const igstRaw = amt * (Number(gstRates.igst) / 100);

    // Keep only 2 decimal places, without rounding upward
    const cgst = truncateTo2(cgstRaw);
    const sgst = truncateTo2(sgstRaw);
    const igst = truncateTo2(igstRaw);

    // Select applicable GST
    const tax =
      state === "Tamil Nadu"
        ? truncateTo2(cgst + sgst)
        : state === "Other State"
          ? igst
          : 0;

    // Accurate final total
    const total = truncateTo2(amt + tax);

    setSaving(true);
    try {
      await onSave({
        selectedOrderIds,
        amount: amt,
        paymentDate,
        years: Number(years),
        startDate,
        endDate,
        withGst,
        state,
        gstin,
        gstvalue: withGst ? tax : 0,
        applyTds,
        tdsAmount: applyTds ? (Number(tdsAmount) || 0) : 0,
        paymentStage
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[500px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col">
        {/* Header */}
        <div className="p-md md:p-lg space-y-xs border-b border-outline-variant/30 bg-surface-container-low">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-md text-[#2e7d32]">
              <span className="material-symbols-outlined text-[26px]">credit_score</span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-on-surface">Add Payment</h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{reminder.customerName} - {reminder.productName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-md overflow-y-auto max-h-[70vh] custom-scrollbar">

          {/* Include Items / Renewals Checkboxes for Group Payment */}
          {customerReminders.length > 1 && (
            <div className="space-y-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  Include Items / Renewals ({selectedOrderIds.length}/{customerReminders.length})
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {selectedOrderIds.length === customerReminders.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {customerReminders.map((rem) => {
                  const itemOrdId = rem.orderId || (rem.id ? rem.id.split('-')[1] : rem.id);
                  const isSelected = selectedOrderIds.includes(itemOrdId);
                  const priceVal = rem.sellerPriceRenewal !== null && rem.sellerPriceRenewal !== undefined ? rem.sellerPriceRenewal : (rem.price || 0);

                  return (
                    <div
                      key={rem.id || itemOrdId}
                      onClick={() => toggleSelectOrder(itemOrdId)}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${isSelected
                        ? "bg-primary/5 border-primary/40 text-on-surface"
                        : "bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant/70 opacity-60"
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => { }}
                          className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold truncate text-on-surface">{rem.domainUrl || rem.productName}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">{rem.productName}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary shrink-0 ml-2">₹{priceVal.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Stage Selector with Smart Advance Locking */}
          {(() => {
            const alreadyHasAdvance = customerReminders
              .filter(r => selectedOrderIds.includes(r.orderId || (r.id ? r.id.split('-')[1] : r.id)))
              .some(r => (r.payments || []).some(p => p.paymentStage === 'advance'));

            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
                    Payment Stage / Mode
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
                      onClick={() => setPaymentStage(stage.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                        stage.disabled
                          ? "opacity-35 cursor-not-allowed bg-surface-container-low border-outline-variant/30 text-on-surface-variant line-through"
                          : paymentStage === stage.id
                            ? "bg-primary text-on-primary border-primary shadow-sm cursor-pointer"
                            : "bg-surface-container-low text-on-surface border-outline-variant/60 hover:bg-surface-variant cursor-pointer"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] mb-0.5">{stage.icon}</span>
                      <span className="text-[11px] font-semibold">{stage.label}</span>
                    </button>
                  ))}
                </div>
                {alreadyHasAdvance && paymentStage === 'advance' && (
                  <p className="text-[11px] text-amber-600 font-bold mt-1">
                    ⚠️ Advance already paid. Please select Milestone or Final Balance.
                  </p>
                )}
                {paymentStage === 'advance' && !alreadyHasAdvance && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    Records advance milestone. You can generate a dedicated Advance Invoice.
                  </p>
                )}
                {paymentStage === 'mid' && (
                  <p className="text-[11px] text-blue-600 font-medium mt-1">
                    Records part payment milestone. You can generate an installment invoice.
                  </p>
                )}
                {paymentStage === 'final' && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    Final settlement. You can generate a Consolidated Invoice showing all payment stages.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Amount Paid */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
              {withGst ? "Base Amount (₹)" : "Renewal Amount (₹)"}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>



          {/* State (auto-fetched) & GSTIN Fields (when GST is enabled) */}
          {withGst && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
                  State
                </label>
                <div className={`w-full bg-surface-container-low border rounded-lg px-md py-sm font-body-md transition-colors flex items-center gap-1.5 ${state ? 'border-outline-variant text-on-surface' : 'border-outline-variant/50 text-on-surface-variant'
                  }`}>
                  <span className="material-symbols-outlined text-[15px] text-on-surface-variant">location_on</span>
                  <span className="font-semibold">{state || 'Fetching from customer...'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">
                  GSTIN <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="Enter GSTIN..."
                  className={`w-full bg-surface-container-low border rounded-lg px-md py-sm font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono transition-colors ${gstin.trim() ? 'border-outline-variant text-on-surface' : 'border-error/50 text-on-surface-variant'}`}
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
                  setApplyTds(prev => {
                    const nextVal = !prev;
                    if (!nextVal) setTdsAmount("");
                    return nextVal;
                  })
                }
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${applyTds ? "bg-primary" : "bg-surface-variant"
                  }`}
                aria-label="Toggle TDS deduction"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${applyTds ? "translate-x-4" : "translate-x-0.5"
                    }`}
                />
              </button>
            </div>

            {applyTds && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-2">
                  TDS Amount (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tdsAmount}
                  onChange={(e) => setTdsAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Enter TDS amount..."
                  className="w-full h-[42px] bg-surface-container-low border border-outline-variant rounded-xl px-md font-black text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                />
              </div>
            )}
          </div>

          {/* GST & TDS Breakdown */}
          {(withGst || (applyTds && Number(tdsAmount) > 0)) && amount && (() => {
            const amt = Number(amount) || 0;

            const cgst = truncateTo2(
              amt * (Number(gstRates.cgst) / 100)
            );

            const sgst = truncateTo2(
              amt * (Number(gstRates.sgst) / 100)
            );

            const igst = truncateTo2(
              amt * (Number(gstRates.igst) / 100)
            );

            const tax = withGst
              ? (state === "Tamil Nadu"
                ? truncateTo2(cgst + sgst)
                : state === "Other State"
                  ? igst
                  : 0)
              : 0;

            const total = truncateTo2(amt + tax);
            const tds = applyTds ? Number(tdsAmount) || 0 : 0;
            const netAmount = Math.max(0, total - tds);

            return (
              <div className="bg-primary/5 p-md rounded-xl border border-primary/10 space-y-1 text-xs animate-in fade-in duration-200">
                <div className="flex justify-between font-bold text-on-surface-variant">
                  <span>{withGst ? "Base Amount (Excl. GST):" : "Renewal Amount:"}</span>
                  <span>₹{formatAmount2(amt)}</span>
                </div>
                {withGst && (
                  state === "Tamil Nadu" ? (
                    <>
                      <div className="flex justify-between text-on-surface-variant">
                        <span>CGST ({gstRates.cgst}%):</span>
                        <span>₹{formatAmount2(cgst)}</span>
                      </div>
                      <div className="flex justify-between text-[#2d6482]/80">
                        <span>SGST ({gstRates.sgst}%):</span>
                        <span>₹{formatAmount2(sgst)}</span>
                      </div>
                    </>
                  ) : state === "Other State" ? (
                    <div className="flex justify-between text-on-surface-variant">
                      <span>IGST ({gstRates.igst}%):</span>
                      <span>₹{formatAmount2(igst)}</span>
                    </div>
                  ) : null
                )}
                <div className="flex justify-between font-black text-primary pt-2 border-t border-primary/20">
                  <span>{withGst ? "Total Payment (with GST):" : "Total Payment:"}</span>
                  <span>₹{formatAmount2(total)}</span>
                </div>
                {applyTds && tds > 0 && (
                  <>
                    <div className="flex justify-between text-on-surface-variant pt-1">
                      <span>Less: TDS Deducted by Customer:</span>
                      <span>₹{formatAmount2(tds)}</span>
                    </div>
                    <div className="flex justify-between font-black text-primary pt-2 border-t border-primary/20">
                      <span>Net Amount Received:</span>
                      <span>₹{formatAmount2(netAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Payment Date & Renewal Duration in same row */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onClick={(e) => e.target.showPicker()}
                onChange={(e) => handlePaymentDateChange(e.target.value)}
                className="cursor-pointer w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block">Renewal Duration</label>
              <select
                value={years}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
              >
                <option value="1">1 Year</option>
                <option value="2">2 Years</option>
                <option value="3">3 Years</option>
                <option value="5">5 Years</option>
              </select>
            </div>
          </div>

          {/* Calculated Dates Section */}
          {/* <div className="grid grid-cols-2 gap-sm p-4 bg-primary/5 rounded-xl border border-primary/10">
            <div>
              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider block">New Start Date</span>
              <span className="text-xs font-bold text-on-surface block mt-0.5">{startDate ? new Date(startDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '—'}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider block">New End Date</span>
              <span className="text-xs font-bold text-on-surface block mt-0.5">{endDate ? new Date(endDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '—'}</span>
            </div>
          </div> */}


        </div>

        {/* Footer */}
        <div className="p-md border-t border-outline-variant bg-surface-container-low flex justify-end gap-sm">
          <button
            onClick={onClose}
            className="px-md py-sm rounded-lg font-bold text-[12px] text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="cursor-pointer px-gutter py-sm bg-[#2e7d32] text-white rounded-lg font-bold text-[12px] hover:brightness-110 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 flex items-center gap-xs"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">credit_score</span>
            )}
            {saving ? 'Processing…' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reminders
