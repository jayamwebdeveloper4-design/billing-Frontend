import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../UI/Components/Button';
import SearchBar from '../../UI/Components/SearchBar';
import Table from '../../UI/Components/Table';
import Header from '../../UI/LayoutComponents/Header';
import {
  useGetCustomersQuery,
  useDeleteCustomerMutation,
} from '../../Redux/Customer';

export const Customer = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // RTK Query Hooks
  const { data, isLoading, isFetching } = useGetCustomersQuery({
    page,
    limit,
    search: search.trim(),
  });

  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

  const customers = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Handlers
  const handleSearchChange = (query) => {
    setSearch(query);
    setPage(1); // Reset to page 1 on new search
  };

  const handleOpenCreate = () => {
    navigate('/customers/new');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget._id).unwrap();
      toast.success('Customer deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete customer');
    }
  };

  // Table Columns Definition matching image
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'CUSTOMER DETAILS',
        render: (row) => {
          const initial = (row.name || 'C').charAt(0);
          return (
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0 uppercase text-sm border border-blue-100">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate max-w-[240px]">
                  {row.name}
                </div>
                {(row.notes || row.contactPerson || row.address) && (
                  <div className="text-xs text-gray-400 truncate max-w-[240px] mt-0.5">
                    {row.notes || row.contactPerson || row.address}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'email',
        label: 'EMAIL',
        render: (row) => {
          const emailStr = Array.isArray(row.email) ? row.email.join(', ') : (row.email || '-');
          return <span className="text-[13px] font-normal text-gray-600 truncate max-w-[200px] block">{emailStr}</span>;
        },
      },
      {
        key: 'country',
        label: 'COUNTRY',
        render: (row) => <span className="text-[13px] font-normal text-gray-600">{row.country || '-'}</span>,
      },
      {
        key: 'phone',
        label: 'PHONE',
        render: (row) => {
          const phoneStr = Array.isArray(row.phone) ? row.phone.join(', ') : (row.phone || '-');
          return <span className="text-[13px] font-normal text-gray-600 truncate max-w-[180px] block tabular-nums">{phoneStr}</span>;
        },
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (row) => (
          <div className="inline-flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/customers/${row._id}`);
              }}
              className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
              title="Edit Customer"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row);
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Customer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header layout component */}
      <Header
        title="Customer Management"
        subtitle="Manage your subscriber base and track payments."
        action={
          <Button
            icon={UserPlus}
            onClick={handleOpenCreate}
            className="rounded-xl px-5 py-2.5 font-semibold"
          >
            Customer
          </Button>
        }
      />

      {/* Search Bar component */}
      <div className="pt-2">
        <SearchBar
          value={search}
          onSearch={handleSearchChange}
          placeholder="Search customers name or email or domain..."
          className="w-full max-w-[480px]"
        />
      </div>

      {/* Table component */}
      <Table
        columns={columns}
        data={customers}
        isLoading={isLoading || isFetching}
        onRowClick={(row) => navigate(`/customers/${row._id}`)}
        emptyMessage="No customers found. Click '+ Customer' to create one."
      />

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1 text-sm text-gray-500">
          <div>
            Showing <span className="font-medium text-gray-700">{customers.length}</span> of{' '}
            <span className="font-medium text-gray-700">{pagination.total}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            <span className="text-xs px-2 font-medium text-gray-600">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              icon={ChevronRight}
              iconPosition="right"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] p-6 border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Customer</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={isDeleting}
                onClick={handleDeleteConfirm}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customer;

