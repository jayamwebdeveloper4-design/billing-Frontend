import React, { useState, useEffect } from 'react';
import { Mail, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import { useSendRenewalReminderMutation } from '../../../Redux/Reminder';

const DEFAULT_TEMPLATES = {
  Renewal: {
    subject: 'Renewal Reminder for [Service Name] - [Domain]',
    content:
      'Dear [Customer Name],\n\nThis is a friendly reminder that your service for [Service Name] ([Domain]) is due for renewal.\n\nRenewal Date: [End Date]\nAmount Due: [Amount]\n\nPlease make payment to ensure uninterrupted service.\n\nThank you,\nJayam Web Solutions',
  },
  Expired: {
    subject: 'Service Expired Notice: [Service Name] - [Domain]',
    content:
      'Dear [Customer Name],\n\nYour service for [Service Name] ([Domain]) expired on [End Date].\n\nAmount Due: [Amount]\n\nPlease renew immediately to restore and avoid interruption.\n\nThank you,\nJayam Web Solutions',
  },
  Deletion: {
    subject: 'URGENT: Service Deletion Warning for [Service Name] - [Domain]',
    content:
      'Dear [Customer Name],\n\nYour service [Service Name] ([Domain]) has remained unpaid since [End Date]. If payment is not completed, your service and data will be permanently deleted.\n\nPlease process payment immediately.\n\nThank you,\nJayam Web Solutions',
  },
  Payment: {
    subject: 'Payment Reminder for [Service Name] - [Domain]',
    content:
      'Dear [Customer Name],\n\nThis is a reminder regarding the pending balance for your service [Service Name] ([Domain]).\n\nBalance Due: [Balance]\nDue Date: [End Date]\n\nThank you,\nJayam Web Solutions',
  },
};

const replacePlaceholders = (text, reminder, formattedExpiry) => {
  if (!text) return '';
  const custName =
    reminder.customerName ||
    reminder.customerId?.name ||
    reminder.customerDetails?.name ||
    'Customer';
  const prodName =
    reminder.product ||
    reminder.productName ||
    (Array.isArray(reminder.products) && reminder.products[0]?.product) ||
    'Service';
  const domain =
    reminder.domainUrl ||
    reminder.orderId?.domainUrl ||
    '';
  const amountVal =
    reminder.price ||
    reminder.targetPrice ||
    reminder.totalPrice ||
    reminder.sellerPriceRenewal ||
    0;
  const balanceVal =
    reminder.balanceDue !== undefined
      ? reminder.balanceDue
      : amountVal;

  return text
    .replace(/\[Customer Name\]|\{customer_name\}|\[customer_name\]|\[Name\]/gi, custName)
    .replace(/\[Service Name\]|\[Product\]|\{product_name\}|\[product_name\]/gi, prodName)
    .replace(/\[Domain\]|\{domain_url\}|\[domain_url\]/gi, domain || 'Domain')
    .replace(/\[End Date\]|\[Expiry Date\]|\{expiry_date\}|\[expiry_date\]/gi, formattedExpiry)
    .replace(/\[Amount\]|\[Price\]|\{amount\}|\[amount\]/gi, `Rs. ${amountVal}/-`)
    .replace(/\[Balance\]|\{balance\}|\[balance\]/gi, `Rs. ${balanceVal}/-`);
};

export const SendReminderModal = ({
  isOpen,
  reminder,
  templates = {},
  onClose,
  onSuccess,
  formatDateDot,
  sendReminderMutation: externalSendReminder,
  isSending: externalIsSending,
}) => {
  const [internalSendReminder, { isLoading: internalIsSending }] =
    useSendRenewalReminderMutation();
  const sendReminderMutation = externalSendReminder || internalSendReminder;
  const isSending = externalIsSending !== undefined ? externalIsSending : internalIsSending;

  const [activeTemplate, setActiveTemplate] = useState('Renewal');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const formattedExpiry = formatDateDot
    ? formatDateDot(reminder?.endDateDot || reminder?.endDate)
    : reminder?.endDateDot || reminder?.endDate || '—';

  // Smart auto-detection of default template based on reminder state
  useEffect(() => {
    if (isOpen && reminder) {
      const isExpired =
        reminder.badgeText === 'EXPIRED' ||
        reminder.renewalStatus === 'not renewed' ||
        reminder.renewalStatus === 'not_renewal' ||
        reminder.isExpired;

      const initialTemplate = isExpired ? 'Expired' : 'Renewal';
      setActiveTemplate(initialTemplate);

      const rawSubject =
        templates?.[initialTemplate]?.subject ||
        DEFAULT_TEMPLATES[initialTemplate].subject;
      const rawContent =
        templates?.[initialTemplate]?.content ||
        DEFAULT_TEMPLATES[initialTemplate].content;

      setSubject(replacePlaceholders(rawSubject, reminder, formattedExpiry));
      setContent(replacePlaceholders(rawContent, reminder, formattedExpiry));
    }
  }, [isOpen, reminder, templates, formattedExpiry]);

  if (!isOpen || !reminder) return null;

  const handleSelectTemplate = (templateName) => {
    setActiveTemplate(templateName);
    const rawSubject =
      templates?.[templateName]?.subject ||
      DEFAULT_TEMPLATES[templateName].subject;
    const rawContent =
      templates?.[templateName]?.content ||
      DEFAULT_TEMPLATES[templateName].content;

    setSubject(replacePlaceholders(rawSubject, reminder, formattedExpiry));
    setContent(replacePlaceholders(rawContent, reminder, formattedExpiry));
  };

  const handleSend = async () => {
    try {
      const recipientEmail = Array.isArray(reminder.email)
        ? reminder.email[0]
        : reminder.email;

      await sendReminderMutation({
        id: reminder._id || reminder.id,
        customerId: reminder.customerId?._id || reminder.customerId,
        orderId: reminder.orderId,
        productId: reminder._id || reminder.id,
        reminderId: reminder._id || reminder.id,
        reminderName: activeTemplate,
        recipientEmail,
        subject: subject.trim(),
        content: content.trim(),
        forceManual: true,
      }).unwrap();

      toast.success(`${activeTemplate} reminder email sent successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to send email');
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-[620px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-[#0052cc]" />
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                Send Renewal Reminder
              </h3>
              <p className="text-xs text-gray-500">
                Choose template or customize message before sending
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Template Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
              Select Message Template
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'Renewal', label: 'Renewal (Due Soon)' },
                { key: 'Expired', label: 'Expired' },
                { key: 'Deletion', label: 'Deletion' },
                { key: 'Payment', label: 'Payment' },
              ].map((tab) => {
                const isSelected = activeTemplate === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleSelectTemplate(tab.key)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-[#0052cc] text-[#0052cc] shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Subject Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Email Content Textarea */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
              Email Message Content
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter email content..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 font-mono leading-relaxed outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Active: <span className="font-bold text-gray-800">{activeTemplate}</span>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              icon={Send}
              onClick={handleSend}
              loading={isSending}
              className="rounded-xl px-5 py-2 font-semibold text-xs"
            >
              Send Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendReminderModal;
