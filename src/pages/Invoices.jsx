import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getInvoices, deleteInvoice, generateInvoicePdf } from '../api/invoiceApi';
import ConfirmationModal from '../components/ConfirmationModal';
import { useAuth } from '../context/AuthContext';

const Invoices = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(new Date().getFullYear());

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'withGST', 'withoutGST'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState(1);

  useEffect(() => {
    setPageInput(currentPage);
  }, [currentPage]);

  // Modals
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    invoiceNo: '',
    customerName: '',
    url: null,
    blob: null,
    loading: false,
    inv: null
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch Invoices
  const fetchInvoicesData = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      if (Array.isArray(data)) {
        setInvoices(data);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesData();
  }, []);

  // Formatters
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatArrayOrString = (val) => {
    if (Array.isArray(val)) {
      return val.filter(Boolean).join(", ");
    }
    return val || "";
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Type Filter
      if (typeFilter !== 'all' && inv.invoiceType !== typeFilter) return false;

      // Month & Year Filter
      if (selectedMonth !== 'all' || selectedYear !== 'all') {
        if (!inv.invoiceDate) return false;
        const d = new Date(inv.invoiceDate);
        if (isNaN(d.getTime())) return false;

        const invMonth = String(d.getMonth() + 1).padStart(2, '0');
        const invYear = String(d.getFullYear());

        if (selectedMonth !== 'all' && invMonth !== selectedMonth) return false;
        if (selectedYear !== 'all' && invYear !== selectedYear) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invNo = (inv.invoiceNo || '').toLowerCase();
        const custName = (inv.customerName || (inv.customerId?.name || '')).toLowerCase();
        const compName = (inv.customerId?.companyName || '').toLowerCase();
        const itemsDesc = (inv.items || [])
          .map((i) => `${i.description || ''} ${i.domainName || ''}`)
          .join(' ')
          .toLowerCase();
        const amountStr = String(inv.totalPrice || '');

        return (
          invNo.includes(q) ||
          custName.includes(q) ||
          compName.includes(q) ||
          itemsDesc.includes(q) ||
          amountStr.includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.invoiceDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.invoiceDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [invoices, typeFilter, selectedMonth, selectedYear, searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, selectedMonth, selectedYear, pageSize]);

  // Paginated Invoices
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(startIdx, startIdx + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    setDeletingId(invoiceToDelete._id);
    try {
      await deleteInvoice(invoiceToDelete._id);
      toast.success(`Invoice ${invoiceToDelete.invoiceNo} deleted successfully`);
      setInvoices((prev) => prev.filter((i) => i._id !== invoiceToDelete._id));
      setIsDeleteModalOpen(false);
      setInvoiceToDelete(null);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  };

  // Download PDF Action
  const handleDownloadPdf = async (inv) => {
    setDownloadingId(inv._id);
    const toastId = toast.loading(`Generating PDF for ${inv.invoiceNo}...`);
    try {
      const custId = typeof inv.customerId === 'object' ? inv.customerId?._id : inv.customerId;
      const firstOrderId = inv.orderId || (inv.orderIds && inv.orderIds[0]) || '';

      const pdfBlob = await generateInvoicePdf(
        custId,
        firstOrderId,
        inv.invoiceType || 'withGST',
        inv.invoiceDate || new Date().toISOString(),
        inv.orderIds || (firstOrderId ? [firstOrderId] : []),
        null,
        inv.invoiceNo,
        inv.paymentStatus || 'Paid',
        false,
        inv.customerName
      );

      // Create download link
      const blobUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanCustName = (inv.customerName || 'Customer').replace(/[\s\/\\]+/g, '');
      a.download = inv.invoiceType === 'withGST'
        ? `TAX-Invoice-${cleanCustName}-${inv.invoiceNo}.pdf`
        : `Invoice-${cleanCustName}-${inv.invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Downloaded ${inv.invoiceNo}`, { id: toastId });
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      toast.error(err.message || 'Failed to download invoice PDF', { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  // Open PDF Preview Modal (matching Customer page Invoice tab)
  const handleOpenViewModal = async (inv) => {
    const custName = inv.customerName || inv.customerId?.name || 'Customer';
    setPreviewModal({
      isOpen: true,
      invoiceNo: inv.invoiceNo || '',
      customerName: custName,
      url: null,
      blob: null,
      loading: true,
      inv
    });

    try {
      const custId = typeof inv.customerId === 'object' ? inv.customerId?._id : inv.customerId;
      const firstOrderId = inv.orderId || (inv.orderIds && inv.orderIds[0]) || '';

      const pdfBlob = await generateInvoicePdf(
        custId,
        firstOrderId,
        inv.invoiceType || 'withGST',
        inv.invoiceDate || new Date().toISOString(),
        inv.orderIds || (firstOrderId ? [firstOrderId] : []),
        null,
        inv.invoiceNo,
        inv.paymentStatus || 'Paid',
        false,
        inv.customerName
      );

      const blobUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      setPreviewModal({
        isOpen: true,
        invoiceNo: inv.invoiceNo || '',
        customerName: custName,
        url: blobUrl,
        blob: pdfBlob,
        loading: false,
        inv
      });
    } catch (err) {
      console.error('Failed to generate invoice preview:', err);
      toast.error('Failed to load invoice preview');
      setPreviewModal({ isOpen: false, invoiceNo: '', customerName: '', url: null, blob: null, loading: false, inv: null });
    }
  };

  const handleCloseViewModal = () => {
    if (previewModal.url) {
      window.URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal({ isOpen: false, invoiceNo: '', customerName: '', url: null, blob: null, loading: false, inv: null });
  };

  return (
    <div className="space-y-md md:space-y-lg pb-20 max-w-full overflow-x-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg md:mb-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Invoices</h1>
          <p className="text-on-surface-variant text-xs md:text-sm">Manage all tax and standard invoices.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-md items-stretch lg:items-center justify-between mb-lg">
        {/* Search Input */}
        <div className="grow relative w-full lg:max-w-[450px]">
          <span className="material-symbols-outlined absolute left-[18px] top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search Company Name or Invoice No..."
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-[44px] pr-md py-2.5 text-xs md:text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Filters: GST Type & Date Filter */}
        <div className="flex flex-wrap items-center gap-sm sm:gap-md">
          {/* GST Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-2.5 text-xs md:text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none font-medium shadow-xs"
          >
            <option value="all">All GST Types</option>
            <option value="withGST">With GST (TAX)</option>
            <option value="withoutGST">Without GST</option>
          </select>

          {/* Month Select */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 text-xs md:text-sm font-medium text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8 shadow-xs"
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

          {/* Year Select */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-[42px] bg-surface-container-lowest border border-outline-variant rounded-xl px-3 text-xs md:text-sm font-medium text-on-surface outline-none cursor-pointer appearance-none focus:ring-1 focus:ring-primary focus:border-primary pr-8 shadow-xs"
            >
              <option value="all">All Years</option>
              {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          {/* Reset Filters */}
          {(searchQuery || typeFilter !== 'all' || selectedMonth || selectedYear) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setSelectedMonth(currentMonthStr);
                setSelectedYear(currentYearStr);
              }}
              className="h-[42px] px-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs md:text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface">
                rotate_left
              </span>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-full table-auto text-xs md:text-sm">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-bold uppercase tracking-wider text-[10px] md:text-xs">
              <th className="px-md py-md">Date</th>
              <th className="px-md py-md">Invoice No</th>
              <th className="px-md py-md">Customer Details</th>
              <th className="px-md py-md">Total Price</th>
              <th className="px-md py-md text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-lg py-12 text-center text-on-surface-variant">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading invoices...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-lg py-12 text-center text-on-surface-variant">
                  No invoices found.
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((item, idx) => (
                <tr key={item._id || idx} className="hover:bg-surface-container-low/60 transition-colors group">
                  <td className="px-md py-md font-medium text-on-surface-variant">
                    {formatDate(item.invoiceDate)}
                  </td>
                  <td className="px-md py-md font-mono font-bold text-primary">
                    {item.invoiceNo}
                  </td>
                  <td className="px-md py-md">
                    {(() => {
                      const custId = item.customerId?._id || item.customerId;
                      const rawId = typeof custId === 'object' ? custId?._id : custId;
                      const canClick = Boolean(rawId);
                      return (
                        <div
                          onClick={() => {
                            if (canClick) {
                              navigate('/customers', {
                                state: {
                                  customerId: rawId,
                                  editMode: true,
                                  activeTab: 'customer'
                                }
                              });
                            }
                          }}
                          className={`min-w-0 max-w-[220px] flex flex-col gap-0.5 ${canClick ? 'cursor-pointer group' : ''}`}
                          title={canClick ? 'Click to view Customer Information' : undefined}
                        >
                          <div className={`font-bold text-on-surface truncate ${canClick ? 'group-hover:text-primary group-hover:underline transition-colors' : ''}`}>
                            {item.customerName || item.customerId?.name || 'Customer'}
                          </div>
                          <div className="text-[11px] text-on-surface-variant truncate">
                            {item.customerId?.companyName || formatArrayOrString(item.customerId?.phone) || formatArrayOrString(item.customerId?.email)}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-md py-md font-bold text-on-surface whitespace-nowrap">
                    ₹ {Number(item.totalPrice || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-md py-md text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleDownloadPdf(item)}
                        disabled={downloadingId === item._id}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="Download PDF"
                      >
                        <span className={`material-symbols-outlined text-[20px] ${downloadingId === item._id ? 'animate-spin' : ''}`}>
                          {downloadingId === item._id ? 'refresh' : 'download'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleOpenViewModal(item)}
                        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      {admin?.username === 'jayamwebsolutionspvtltd' && (
                        <button
                          onClick={() => {
                            setInvoiceToDelete(item);
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all cursor-pointer"
                          title="Delete Invoice"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

        {/* Pagination Bar */}
        {!loading && filteredInvoices.length > 0 && (() => {
          const totalItems = filteredInvoices.length;
          const from = (currentPage - 1) * pageSize + 1;
          const to = Math.min(currentPage * pageSize, totalItems);
          return (
            <div className="flex items-center justify-between mt-md px-xs text-body-sm">
              <p className="text-xs text-on-surface-variant">
                Showing <span className="font-bold text-on-surface">{from}–{to}</span> of{' '}
                <span className="font-bold text-on-surface">{totalItems}</span>
              </p>

              <div className="flex items-center gap-xs">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={totalPages || 1}
                    value={pageInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPageInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 1 && num <= totalPages) {
                        setCurrentPage(num);
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(pageInput, 10);
                      if (isNaN(num) || num < 1) {
                        setCurrentPage(1);
                        setPageInput(1);
                      } else if (num > totalPages) {
                        setCurrentPage(totalPages);
                        setPageInput(totalPages);
                      } else {
                        setCurrentPage(num);
                        setPageInput(num);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.target.blur();
                      }
                    }}
                    className="w-12 text-center bg-transparent border border-outline-variant rounded-md py-1 font-bold text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                  <span className="text-xs font-bold text-on-surface-variant">/ {totalPages || 1}</span>
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          );
        })()}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Invoice"
        message={
          invoiceToDelete
            ? `Are you sure you want to delete invoice "${invoiceToDelete.invoiceNo}" for ${invoiceToDelete.customerName || 'Customer'}? This action cannot be undone.`
            : 'Are you sure you want to delete this invoice?'
        }
        confirmText={deletingId ? 'Deleting...' : 'Delete Invoice'}
        type="danger"
      />

      {/* Invoice PDF Preview Modal (matching Customer page Invoice tab) */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-md bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-[850px] h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-md border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">description</span>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    Invoice Preview - {previewModal.invoiceNo}
                  </h3>
                  <p
                    onClick={() => {
                      const custId = previewModal.inv?.customerId?._id || previewModal.inv?.customerId;
                      const rawId = typeof custId === 'object' ? custId?._id : custId;
                      if (rawId) {
                        setPreviewModal((prev) => ({ ...prev, isOpen: false }));
                        navigate('/customers', {
                          state: {
                            customerId: rawId,
                            editMode: true,
                            activeTab: 'customer'
                          }
                        });
                      }
                    }}
                    className={`text-xs font-bold ${
                      (previewModal.inv?.customerId?._id || previewModal.inv?.customerId)
                        ? 'text-primary cursor-pointer hover:underline'
                        : 'text-primary'
                    }`}
                    title={
                      (previewModal.inv?.customerId?._id || previewModal.inv?.customerId)
                        ? 'Click to view Customer Information'
                        : undefined
                    }
                  >
                    {previewModal.customerName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewModal.blob && (
                  <button
                    type="button"
                    onClick={() => {
                      if (previewModal.blob) {
                        const url = window.URL.createObjectURL(new Blob([previewModal.blob], { type: 'application/pdf' }));
                        const a = document.createElement("a");
                        a.href = url;
                        const cleanCustName = (previewModal.customerName || 'Customer').replace(/[\s\/\\]+/g, '');
                        a.download = previewModal.inv?.invoiceType === 'withGST'
                          ? `TAX-Invoice-${cleanCustName}-${previewModal.invoiceNo}.pdf`
                          : `Invoice-${cleanCustName}-${previewModal.invoiceNo}.pdf`;
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
                )}
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  title="Close"
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-variant rounded-full cursor-pointer transition-colors text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 w-full bg-surface-container-low p-2 relative flex items-center justify-center">
              {previewModal.loading ? (
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold">Generating invoice preview...</span>
                </div>
              ) : previewModal.url ? (
                <iframe
                  src={`${previewModal.url}#toolbar=0&navpanes=0`}
                  className="w-full h-full border-0 rounded-lg shadow-inner"
                  title="Invoice Preview"
                />
              ) : (
                <div className="text-xs text-error font-bold">
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
