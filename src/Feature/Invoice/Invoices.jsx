import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText,
  Eye,
  Download,
  Mail,
  RotateCw,
  X,
  ExternalLink,
} from 'lucide-react';

// UI Design System Components
import Header from '../../UI/LayoutComponents/Header';
import Table from '../../UI/Components/Table';
import Button from '../../UI/Components/Button';
import SearchBar from '../../UI/Components/SearchBar';

// Redux RTK Query for Invoice
import {
  useGetInvoicesQuery,
  useLazyGetInvoicePdfQuery,
  useEmailInvoiceMutation,
} from '../../Redux/Invoice';

export const Invoices = () => {
  const navigate = useNavigate();

  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(new Date().getFullYear());

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'withGST' | 'withoutGST'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // PDF Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    item: null,
    invoiceNo: '',
    customerName: '',
    customerId: null,
    url: null,
    blob: null,
    loading: false,
    invoiceType: 'withGST',
  });

  const [downloadingId, setDownloadingId] = useState(null);
  const [emailingId, setEmailingId] = useState(null);

  // RTK Query hook to fetch invoices from payment history with server pagination
  const {
    data: invoicesResponse,
    isLoading: isFetchingInvoices,
    isFetching,
    refetch,
  } = useGetInvoicesQuery({
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    type: typeFilter,
    month: selectedMonth,
    year: selectedYear,
  });

  // RTK Lazy Query hook to fetch PDF Blob by payment ID
  const [triggerGetPdf] = useLazyGetInvoicePdfQuery();

  // RTK Mutation to email invoice PDF directly to customer
  const [triggerEmailInvoice, { isLoading: isEmailing }] = useEmailInvoiceMutation();

  // Currency & Date Formatters
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const parts = String(dateStr).split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  // Extract invoice items list (handles both paginated object and legacy plain array)
  const invoiceItems = useMemo(() => {
    if (Array.isArray(invoicesResponse)) return invoicesResponse;
    if (Array.isArray(invoicesResponse?.data)) return invoicesResponse.data;
    return [];
  }, [invoicesResponse]);

  // Extract pagination metadata
  const pagination = useMemo(() => {
    if (invoicesResponse?.pagination) {
      return invoicesResponse.pagination;
    }
    return {
      page: currentPage,
      limit: pageSize,
      total: invoiceItems.length,
      totalPages: Math.max(1, Math.ceil(invoiceItems.length / pageSize)),
    };
  }, [invoicesResponse, currentPage, pageSize, invoiceItems.length]);

  // Action: Download PDF directly
  const handleDownloadPdf = async (inv) => {
    const invId = inv._id || inv.paymentId;
    if (!invId) {
      toast.error('Invalid invoice record');
      return;
    }

    setDownloadingId(invId);
    const toastId = toast.loading(`Generating PDF for ${inv.invoiceNo}...`);

    try {
      const pdfBlob = await triggerGetPdf(invId).unwrap();
      const blobUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanCust = (inv.customerName || 'Customer').replace(/[\s\/\\]+/g, '');
      a.download = inv.invoiceType === 'withGST'
        ? `TAX-Invoice-${cleanCust}-${inv.invoiceNo}.pdf`
        : `Invoice-${cleanCust}-${inv.invoiceNo}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Downloaded ${inv.invoiceNo}`, { id: toastId });
    } catch (err) {
      console.error('Download PDF error:', err);
      toast.error(err?.data?.message || err?.message || 'Failed to download PDF', { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  // Action: Open PDF in Live Preview Modal
  const handleOpenViewModal = async (inv) => {
    const invId = inv._id || inv.paymentId;
    const custName = inv.customerName || 'Customer';
    const custId = typeof inv.customerId === 'object' ? inv.customerId?._id : inv.customerId;

    setPreviewModal({
      isOpen: true,
      item: inv,
      invoiceNo: inv.invoiceNo || 'Preview',
      customerName: custName,
      customerId: custId,
      url: null,
      blob: null,
      loading: true,
      invoiceType: inv.invoiceType || 'withGST',
    });

    try {
      const pdfBlob = await triggerGetPdf(invId).unwrap();
      const blobUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));

      setPreviewModal({
        isOpen: true,
        item: inv,
        invoiceNo: inv.invoiceNo || 'Preview',
        customerName: custName,
        customerId: custId,
        url: blobUrl,
        blob: pdfBlob,
        loading: false,
        invoiceType: inv.invoiceType || 'withGST',
      });
    } catch (err) {
      console.error('Preview PDF error:', err);
      toast.error('Failed to load invoice preview');
      setPreviewModal({
        isOpen: false,
        item: null,
        invoiceNo: '',
        customerName: '',
        customerId: null,
        url: null,
        blob: null,
        loading: false,
        invoiceType: 'withGST',
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
      invoiceNo: '',
      customerName: '',
      customerId: null,
      url: null,
      blob: null,
      loading: false,
      invoiceType: 'withGST',
    });
  };

  // Action: Share via Email
  const handleEmailInvoice = async (inv) => {
    const invId = inv?._id || inv?.paymentId;
    if (!invId) {
      toast.error('Invalid invoice record');
      return;
    }

    const recipientEmail =
      typeof inv.customerId === 'object'
        ? inv.customerId?.email
        : inv.customerEmail || inv.email;

    setEmailingId(invId);
    const toastId = toast.loading(
      recipientEmail
        ? `Sending ${inv.invoiceNo} to ${recipientEmail}...`
        : `Sending ${inv.invoiceNo} via email...`
    );

    try {
      const res = await triggerEmailInvoice({
        id: invId,
        email: recipientEmail,
      }).unwrap();

      toast.success(res?.message || `Invoice emailed successfully!`, { id: toastId });
    } catch (err) {
      console.error('Email invoice error:', err);
      toast.error(err?.data?.message || err?.message || 'Failed to email invoice', { id: toastId });
    } finally {
      setEmailingId(null);
    }
  };

  // Table Columns Definition
  const columns = useMemo(
    () => [
      {
        key: 'invoiceNo',
        label: 'Invoice #',
        render: (inv) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0052cc] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#0052cc] hover:underline cursor-pointer flex items-center gap-1"
                onClick={() => handleOpenViewModal(inv)}
              >
                {inv.invoiceNo}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                {inv.paymentStage || 'Full'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'customerName',
        label: 'Customer / Domain',
        render: (inv) => {
          const custId = typeof inv.customerId === 'object' ? inv.customerId?._id : inv.customerId;
          return (
            <div>
              <div
                className="font-semibold text-xs text-gray-900 hover:text-[#0052cc] cursor-pointer flex items-center gap-1"
                onClick={() => custId && navigate(`/customer/${custId}`)}
                title="View customer profile"
              >
                {inv.customerName}
                {custId && <ExternalLink className="w-3 h-3 text-gray-400" />}
              </div>
              {inv.domainUrl && (
                <div className="text-[11px] font-medium text-[#0052cc] mt-0.5">
                  {inv.domainUrl}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'invoiceDate',
        label: 'Date',
        render: (inv) => (
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {formatDate(inv.invoiceDate)}
          </span>
        ),
      },
      {
        key: 'invoiceType',
        label: 'Type',
        render: (inv) => {
          const isTax = inv.invoiceType === 'withGST';
          return (
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                isTax
                  ? 'bg-blue-50 text-[#0052cc] border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isTax ? 'TAX (GST)' : 'Commercial'}
            </span>
          );
        },
      },
      {
        key: 'subtotal',
        label: 'Subtotal',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (inv) => (
          <span className="text-xs font-medium text-gray-700">
            {formatCurrency(inv.subtotal)}
          </span>
        ),
      },
      {
        key: 'gstvalue',
        label: 'GST',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (inv) => (
          <span className="text-xs font-medium text-gray-600">
            {inv.gstvalue > 0 ? formatCurrency(inv.gstvalue) : '—'}
          </span>
        ),
      },
      {
        key: 'totalPrice',
        label: 'Total Amount',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (inv) => (
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(inv.totalPrice)}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (inv) => {
          const invId = inv._id || inv.paymentId;
          const isDownloadingThis = downloadingId === invId;

          return (
            <div className="inline-flex items-center justify-end gap-1.5">
              {/* Preview Button */}
              <button
                type="button"
                onClick={() => handleOpenViewModal(inv)}
                className="p-1.5 text-gray-500 hover:text-[#0052cc] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="View PDF Preview"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Download Button */}
              <button
                type="button"
                disabled={isDownloadingThis}
                onClick={() => handleDownloadPdf(inv)}
                className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Share / Email Button */}
              <button
                type="button"
                disabled={emailingId === invId}
                onClick={() => handleEmailInvoice(inv)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Share via Email"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [downloadingId, emailingId, navigate]
  );

  return (
    <div className="space-y-6 pb-20 max-w-full overflow-x-hidden animate-in fade-in duration-200">
      {/* Top Header */}
      <Header
        title="Invoices"
        subtitle="Manage tax and standard invoices derived directly from customer payment records."
        action={
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            loading={isFetching}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Bar Component */}
        <div className="flex-1 min-w-[260px] max-w-md">
          <SearchBar
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            placeholder="Search by invoice #, customer name, domain..."
            className="w-full"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* GST Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 bg-white border border-gray-200 rounded-xl px-3 text-xs md:text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
          >
            <option value="all">All Invoice Types</option>
            <option value="withGST">With GST (TAX)</option>
            <option value="withoutGST">Without GST (Commercial)</option>
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 bg-white border border-gray-200 rounded-xl px-3 text-xs md:text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
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

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 bg-white border border-gray-200 rounded-xl px-3 text-xs md:text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
          >
            <option value="all">All Years</option>
            {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table Component */}
      <div className="space-y-4">
        <Table
          columns={columns}
          data={invoiceItems}
          isLoading={isFetchingInvoices}
          keyField="_id"
          emptyMessage="No invoice records found matching the current filters."
        />

        {/* Pagination Controls */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
            <span className="text-xs text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} invoices
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>

              <span className="text-xs font-semibold px-2 text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Live Preview Modal */}
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
                    {previewModal.invoiceNo}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        previewModal.invoiceType === 'withGST'
                          ? 'bg-blue-50 text-[#0052cc] border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {previewModal.invoiceType === 'withGST' ? 'TAX (GST)' : 'Commercial'}
                    </span>
                  </h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Customer: <span className="font-semibold text-gray-800">{previewModal.customerName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Share via Email Button */}
                <Button
                  variant="outline"
                  size="sm"
                  icon={Mail}
                  loading={emailingId === (previewModal.item?._id || previewModal.item?.paymentId)}
                  onClick={() => handleEmailInvoice(previewModal.item)}
                  title="Share via Email"
                >
                  Share via Email
                </Button>

                {previewModal.blob && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Download}
                    onClick={() => {
                      if (!previewModal.blob) return;
                      const url = window.URL.createObjectURL(new Blob([previewModal.blob], { type: 'application/pdf' }));
                      const a = document.createElement('a');
                      a.href = url;
                      const cleanCust = (previewModal.customerName || 'Customer').replace(/[\s\/\\]+/g, '');
                      a.download = previewModal.invoiceType === 'withGST'
                        ? `TAX-Invoice-${cleanCust}-${previewModal.invoiceNo}.pdf`
                        : `Invoice-${cleanCust}-${previewModal.invoiceNo}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                      toast.success('Downloaded invoice PDF');
                    }}
                  >
                    Download
                  </Button>
                )}

                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / PDF Iframe */}
            <div className="flex-1 w-full bg-gray-50 relative flex items-center justify-center p-2">
              {previewModal.loading ? (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <div className="w-9 h-9 border-3 border-[#0052cc] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold">Generating print invoice preview...</span>
                </div>
              ) : previewModal.url ? (
                <iframe
                  src={`${previewModal.url}#toolbar=0&navpanes=0`}
                  className="w-full h-full border border-gray-200 rounded-xl shadow-xs bg-white"
                  title="Invoice PDF Preview"
                />
              ) : (
                <div className="text-sm font-semibold text-red-600">
                  Failed to load invoice preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
