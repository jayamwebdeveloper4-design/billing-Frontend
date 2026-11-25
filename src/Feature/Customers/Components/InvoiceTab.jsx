import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Eye, Download, Mail, FileText, X } from 'lucide-react';
import Table from '../../../UI/Components/Table';
import Button from '../../../UI/Components/Button';
import { useGetProductsQuery } from '../../../Redux/CustomerProcuct';
import { useLazyGetInvoicePdfQuery, useEmailInvoiceMutation } from '../../../Redux/Invoice';

export const InvoiceTab = ({ customer }) => {
  const customerId = customer?._id;

  // Query customer products with paymentHistory included
  const { data: productsResponse, isLoading: isProductsLoading } = useGetProductsQuery(
    { customerId, includePayments: 'true' },
    { skip: !customerId }
  );

  // RTK lazy query to fetch PDF Blob
  const [triggerGetPdf] = useLazyGetInvoicePdfQuery();

  // RTK mutation to email invoice
  const [triggerEmailInvoice, { isLoading: isEmailing }] = useEmailInvoiceMutation();

  // Modal & Loading States
  const [downloadingId, setDownloadingId] = useState(null);
  const [emailingId, setEmailingId] = useState(null);
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    item: null,
    url: null,
    blob: null,
    loading: false,
  });

  // Extract all invoices from payment history
  const invoicesList = useMemo(() => {
    const rawProducts = productsResponse?.data || [];
    const list = [];
    const seenIds = new Set();

    rawProducts.forEach((prod) => {
      (prod.paymentHistory || []).forEach((pay) => {
        if (pay.invoiceNo || pay.invoiceId || pay.amount > 0) {
          const invId = pay._id || pay.invoiceId;
          if (invId && seenIds.has(String(invId))) return;
          if (invId) seenIds.add(String(invId));

          list.push({
            _id: invId,
            paymentId: pay._id,
            invoiceNo: pay.invoiceNo || `INV-${String(pay._id || '').slice(-6).toUpperCase()}`,
            date: pay.date,
            services: prod.product + (prod.variant ? ` (${prod.variant})` : ''),
            amount: Number(pay.amount) || 0,
            status: 'Paid',
            domainUrl: prod.domainUrl,
            withGst: Boolean(pay.withGst),
            invoiceType: pay.withGst ? 'withGST' : 'withoutGST',
            customerId: customerId,
            customerName: customer?.name || customer?.companyName || 'Customer',
            customerEmail: customer?.email || '',
          });
        }
      });
    });

    // Fallback: If no payment records yet, show legacy orders if present
    if (!list.length) {
      (customer?.orders || []).forEach((order, idx) => {
        list.push({
          _id: order._id,
          paymentId: order._id,
          invoiceNo: `INV-${order.orderNumber || idx + 101}`,
          date: order.createdAt || order.orderDate,
          services: order.products?.map((p) => p.product).join(', ') || 'Custom Service',
          amount: Number(order.totalPrice) || 0,
          status: order.paymentStatus || 'Active',
          domainUrl: order.domainUrl,
          withGst: false,
          invoiceType: 'withoutGST',
          customerId: customerId,
          customerName: customer?.name || customer?.companyName || 'Customer',
          customerEmail: customer?.email || '',
        });
      });
    }

    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [productsResponse, customer, customerId]);

  // Action: Open PDF Preview Modal
  const handleOpenViewModal = async (item) => {
    const invId = item._id || item.paymentId;
    if (!invId) {
      toast.error('Invalid invoice record');
      return;
    }

    setPreviewModal({
      isOpen: true,
      item,
      url: null,
      blob: null,
      loading: true,
    });

    try {
      const pdfBlob = await triggerGetPdf(invId).unwrap();
      const blobUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));

      setPreviewModal({
        isOpen: true,
        item,
        url: blobUrl,
        blob: pdfBlob,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to preview invoice PDF:', err);
      toast.error('Failed to load invoice preview');
      setPreviewModal({
        isOpen: false,
        item: null,
        url: null,
        blob: null,
        loading: false,
      });
    }
  };

  const handleCloseViewModal = () => {
    if (previewModal.url) {
      window.URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal({
      isOpen: false,
      item: null,
      url: null,
      blob: null,
      loading: false,
    });
  };

  // Action: Download PDF directly
  const handleDownloadPdf = async (item) => {
    const invId = item._id || item.paymentId;
    if (!invId) {
      toast.error('Invalid invoice record');
      return;
    }

    setDownloadingId(invId);
    const toastId = toast.loading(`Generating PDF for ${item.invoiceNo}...`);

    try {
      let pdfBlob = previewModal.item?._id === invId && previewModal.blob ? previewModal.blob : null;
      if (!pdfBlob) {
        pdfBlob = await triggerGetPdf(invId).unwrap();
      }

      const blobUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanCust = (customer?.name || customer?.companyName || 'Customer').replace(/[\s\/\\]+/g, '');
      a.download = item.withGst
        ? `TAX-Invoice-${cleanCust}-${item.invoiceNo}.pdf`
        : `Invoice-${cleanCust}-${item.invoiceNo}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Downloaded ${item.invoiceNo}`, { id: toastId });
    } catch (err) {
      console.error('Download PDF error:', err);
      toast.error(err?.data?.message || err?.message || 'Failed to download PDF', { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  // Action: Share via Email
  const handleEmailInvoice = async (item) => {
    const invId = item._id || item.paymentId;
    if (!invId) {
      toast.error('Invalid invoice record');
      return;
    }

    const recipientEmail = customer?.email || item.customerEmail;
    if (!recipientEmail) {
      toast.error('Customer email is missing in profile');
      return;
    }

    setEmailingId(invId);
    const toastId = toast.loading(`Sending ${item.invoiceNo} to ${recipientEmail}...`);

    try {
      const res = await triggerEmailInvoice({
        id: invId,
        email: recipientEmail,
      }).unwrap();

      toast.success(res?.message || `Invoice emailed successfully to ${recipientEmail}`, { id: toastId });
    } catch (err) {
      console.error('Email invoice error:', err);
      toast.error(err?.data?.message || err?.message || 'Failed to send invoice email', { id: toastId });
    } finally {
      setEmailingId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'invoiceNo',
        label: 'Invoice #',
        render: (item) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052cc] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span
                className="font-bold text-xs text-[#0052cc] hover:underline cursor-pointer"
                onClick={() => handleOpenViewModal(item)}
                title="View PDF Preview"
              >
                {item.invoiceNo}
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                {item.withGst ? 'TAX (GST)' : 'Commercial'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'date',
        label: 'Date',
        render: (item) => (
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {item.date ? new Date(item.date).toLocaleDateString('en-GB') : '—'}
          </span>
        ),
      },
      {
        key: 'services',
        label: 'Services',
        render: (item) => (
          <div>
            <div className="text-xs font-semibold text-gray-900">{item.services}</div>
            {item.domainUrl && (
              <div className="text-[11px] text-[#0052cc] font-medium mt-0.5">{item.domainUrl}</div>
            )}
          </div>
        ),
      },
      {
        key: 'amount',
        label: 'Amount',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (item) => (
          <span className="text-sm font-bold text-gray-900">
            ₹{item.amount.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (item) => {
          const isPaid = item.status === 'Paid' || item.status === 'Fully Paid';
          return (
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {item.status}
            </span>
          );
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (item) => {
          const invId = item._id || item.paymentId;
          const isDownloadingThis = downloadingId === invId;
          const isEmailingThis = emailingId === invId;

          return (
            <div className="inline-flex items-center justify-end gap-1.5">
              {/* Preview Button */}
              <button
                type="button"
                onClick={() => handleOpenViewModal(item)}
                className="p-1.5 text-gray-500 hover:text-[#0052cc] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="View PDF Preview"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Download Button */}
              <button
                type="button"
                disabled={isDownloadingThis}
                onClick={() => handleDownloadPdf(item)}
                className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Share / Email Button */}
              <button
                type="button"
                disabled={isEmailingThis}
                onClick={() => handleEmailInvoice(item)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title={`Share via Email to ${customer?.email || 'Customer'}`}
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [downloadingId, emailingId, customer]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0052cc]">receipt_long</span>
          Invoices
        </h3>
      </div>

      <Table
        columns={columns}
        data={invoicesList}
        isLoading={isProductsLoading}
        keyField="_id"
        emptyMessage="No invoices generated yet for this customer."
      />

      {/* PDF Live Preview & Share Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    {previewModal.item?.invoiceNo}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        previewModal.item?.withGst
                          ? 'bg-blue-50 text-[#0052cc] border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {previewModal.item?.withGst ? 'TAX (GST)' : 'Commercial'}
                    </span>
                  </h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Customer: <span className="font-semibold text-gray-800">{customer?.name || customer?.companyName}</span>
                    {customer?.email && <span className="text-gray-400 ml-1">({customer.email})</span>}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Email, Download, Close */}
              <div className="flex items-center gap-2">
                {/* Share via Email Button */}
                <Button
                  variant="outline"
                  size="sm"
                  icon={Mail}
                  loading={emailingId === (previewModal.item?._id || previewModal.item?.paymentId)}
                  onClick={() => handleEmailInvoice(previewModal.item)}
                  title={`Email to ${customer?.email || 'Customer'}`}
                >
                  Share via Email
                </Button>

                {/* Download PDF Button */}
                {previewModal.blob && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Download}
                    onClick={() => handleDownloadPdf(previewModal.item)}
                  >
                    Download
                  </Button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: PDF Viewer */}
            <div className="flex-1 bg-gray-100 p-2 overflow-hidden flex items-center justify-center">
              {previewModal.loading ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#0052cc] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold text-gray-600">Generating invoice preview...</span>
                </div>
              ) : previewModal.url ? (
                <iframe
                  src={`${previewModal.url}#toolbar=0&navpanes=0`}
                  title={`Invoice-${previewModal.item?.invoiceNo}`}
                  className="w-full h-full rounded-xl bg-white shadow-xs border border-gray-200"
                />
              ) : (
                <div className="text-sm text-gray-500 font-medium">Failed to load preview document.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTab;
