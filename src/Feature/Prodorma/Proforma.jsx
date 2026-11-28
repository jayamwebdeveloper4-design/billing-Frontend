import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import Header from "../../UI/LayoutComponents/Header";
import Button from "../../UI/Components/Button";
import SearchBar from "../../UI/Components/SearchBar";
import Table from "../../UI/Components/Table";
import ConfirmationModal from "./components/ConfirmationModal";
import AddProforma from "./components/AddProforma";
import Detials from "./components/Detials";

import {
  useGetProformasQuery,
  useDeleteProformaMutation,
  useGenerateProformaPdfMutation,
} from "../../Redux/Proforma";

// Helper: safe string / array conversion for contacts & emails
const formatArrayOrString = (val) => {
  if (!val) return "";
  if (Array.isArray(val)) {
    return val.filter(Boolean).join(", ");
  }
  return String(val);
};

export const Proforma = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    data: proformasResponse,
    isLoading,
    isFetching,
    refetch: loadProformas,
  } = useGetProformasQuery({
    page: currentPage,
    limit: pageSize,
    search: searchQuery.trim(),
  });

  const proformas = useMemo(() => {
    if (Array.isArray(proformasResponse)) return proformasResponse;
    return Array.isArray(proformasResponse?.data) ? proformasResponse.data : [];
  }, [proformasResponse]);

  const pagination = useMemo(
    () => ({
      page: proformasResponse?.page ?? currentPage,
      limit: proformasResponse?.limit ?? pageSize,
      total: proformasResponse?.total ?? proformas.length,
      totalPages: proformasResponse?.totalPages ?? 1,
    }),
    [proformasResponse, currentPage, pageSize, proformas.length]
  );

  const [deleteProforma, { isLoading: isDeleting }] = useDeleteProformaMutation();
  const [generateProformaPdf] = useGenerateProformaPdfMutation();

  const [selectedProforma, setSelectedProforma] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProforma, setEditingProforma] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [proformaToDelete, setProformaToDelete] = useState(null);

  const handleSearchChange = useCallback((val) => {
    setSearchQuery((prev) => {
      if (prev === val) return prev;
      setCurrentPage(1);
      return val;
    });
  }, []);

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingProforma(item);
    setIsAddModalOpen(true);
  };

  // PDF Generation & Download
  const handleDownloadPDF = async (proformaItem) => {
    const toastId = toast.loading("Generating proforma invoice PDF...");
    try {
      const blob = await generateProformaPdf(proformaItem).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proforma-${proformaItem.proforma_no || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Failed to download PDF", { id: toastId });
    }
  };

  // Delete handlers
  const handleDeleteClick = (item) => {
    setProformaToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!proformaToDelete) return;
    const item = proformaToDelete;
    try {
      const targetId = item._id || item.id;
      if (targetId) {
        await deleteProforma(targetId).unwrap();
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

  // Table Columns Definition
  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        width: "120px",
        render: (item) => (
          <span className="text-[13px] text-gray-600 font-normal whitespace-nowrap tabular-nums">
            {item.date ? new Date(item.date).toLocaleDateString("en-GB") : "—"}
          </span>
        ),
      },
      {
        key: "proforma_no",
        label: "Proforma No",
        width: "160px",
        render: (item) => (
          <span className="font-sans font-semibold text-[13px] text-blue-700 whitespace-nowrap tabular-nums">
            {item.proforma_no}
          </span>
        ),
      },
      {
        key: "customerDetails",
        label: "Customer Details",
        render: (item) => (
          <div className="min-w-0 max-w-[260px]">
            <div className="font-semibold text-gray-900 text-[13px] truncate">
              {item.customerId?.name || item.companyName}
            </div>
            <div className="text-[11px] font-normal text-gray-500 truncate mt-0.5">
              {formatArrayOrString(item.customerId?.phone || item.phone)} •{" "}
              {formatArrayOrString(item.customerId?.email || item.email)}
            </div>
          </div>
        ),
      },
      {
        key: "totalPrice",
        label: "Total Price",
        align: "right",
        render: (item) => (
          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap tabular-nums">
            ₹ {Number(item.totalPrice).toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        width: "156px",
        cellClassName: "whitespace-nowrap",
        render: (item) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              icon={Download}
              onClick={(e) => {
                e?.stopPropagation?.();
                handleDownloadPDF(item);
              }}
              className="text-gray-500 hover:text-blue-600"
              title="Download PDF"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={(e) => {
                e?.stopPropagation?.();
                setSelectedProforma(item);
              }}
              className="text-gray-500 hover:text-blue-600"
              title="View Details"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={(e) => {
                e?.stopPropagation?.();
                handleOpenEditModal(item);
              }}
              className="text-gray-500 hover:text-blue-600"
              title="Edit Proforma"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={(e) => {
                e?.stopPropagation?.();
                handleDeleteClick(item);
              }}
              className="text-gray-500 hover:text-red-600"
              title="Delete Proforma"
            />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header UI Component */}
      <Header
        title="Proforma Invoices"
        subtitle="Generate, preview, and download proforma invoices for customers and prospects."
        action={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => {
              setEditingProforma(null);
              setIsAddModalOpen(true);
            }}
          >
            Add Proforma
          </Button>
        }
      />

      {/* Search and Counts Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search Company Name or Proforma No..."
          className="max-w-md w-full"
        />
        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2 self-end sm:self-center">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
          <span>{pagination.total} Proforma Invoices</span>
        </div>
      </div>

      {/* Proforma Table UI Component */}
      <div className="space-y-4">
        <Table
          columns={columns}
          data={proformas}
          isLoading={isLoading || isFetching}
          emptyMessage='No proforma invoices found. Click "Add Proforma" to create one.'
          keyField="_id"
          onRowClick={(item) => setSelectedProforma(item)}
        />

        {/* Pagination Controls */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
            <span className="text-xs text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} proforma invoices
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Detail Modal Component */}
      <Detials
        selectedProforma={selectedProforma}
        onClose={() => setSelectedProforma(null)}
        onDownloadPdf={handleDownloadPDF}
      />

      {/* Add / Edit Proforma Modal Component */}
      <AddProforma
        isOpen={isAddModalOpen || Boolean(editingProforma)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProforma(null);
        }}
        editingProforma={editingProforma}
        proformas={proformas}
        onSuccess={loadProformas}
        onDownloadPdf={handleDownloadPDF}
      />

      {/* Delete Confirmation Modal Component */}
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
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Proforma;
