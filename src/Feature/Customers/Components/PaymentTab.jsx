import React, { useState, useMemo } from 'react';
import { Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Table from '../../../UI/Components/Table';
import Button from '../../../UI/Components/Button';
import PaymentHistoryModal from './PaymentHistory';
import {
  useGetProductsQuery,
  useDeletePaymentMutation,
} from '../../../Redux/CustomerProcuct';

export const PaymentTab = ({ customer }) => {
  const customerId = customer?._id;
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Query customer products with paymentHistory included
  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    refetch,
  } = useGetProductsQuery(
    { customerId, includePayments: 'true' },
    { skip: !customerId }
  );

  const [deletePayment, { isLoading: isDeletingPayment }] = useDeletePaymentMutation();

  // Extract all payment history entries across customer products
  const allPayments = useMemo(() => {
    const rawProducts = productsResponse?.data || [];
    if (!rawProducts.length) {
      // Fallback to customer.orders payments if any
      const legacyOrders = customer?.orders || [];
      return legacyOrders.flatMap((o) =>
        (o.payments || []).map((p, pIdx) => ({
          ...p,
          uniqueKey: p._id || `${o._id}-${pIdx}`,
          domainUrl: o.domainUrl,
          productName: o.products?.map((item) => item.product).join(', ') || 'Service',
          variant: '',
          orderId: o._id,
        }))
      );
    }

    const list = [];
    const seenIds = new Set();

    rawProducts.forEach((prod) => {
      const orderDomain =
        prod.domainUrl ||
        (typeof prod.orderId === 'object' ? prod.orderId?.domainUrl : '') ||
        '';
      (prod.paymentHistory || []).forEach((pay, idx) => {
        if (pay._id && seenIds.has(String(pay._id))) return;
        if (pay._id) seenIds.add(String(pay._id));

        list.push({
          ...pay,
          uniqueKey: pay._id || `${prod._id}-${idx}`,
          productId: prod._id,
          productName: prod.product,
          variant: prod.variant,
          domainUrl: orderDomain,
          orderId: prod.orderId,
        });
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [productsResponse, customer]);

  // Handle delete a specific payment entry
  const handleDeletePayment = async (payment) => {
    if (!payment.productId || !payment._id) return;
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;

    try {
      await deletePayment({
        id: payment.productId,
        paymentId: payment._id,
      }).unwrap();
      toast.success('Payment deleted successfully');
      if (refetch) refetch();
    } catch (err) {
      toast.error('Failed to delete payment');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'date',
        label: 'Payment Date',
        render: (payment) => (
          <span className="font-semibold text-gray-900 text-xs">
            {payment.date ? new Date(payment.date).toLocaleDateString('en-GB') : '-'}
          </span>
        ),
      },
      {
        key: 'products',
        label: 'Service / Domain',
        render: (payment) => (
          <div>
            <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
              <span>{payment.productName}</span>
              {payment.variant && (
                <span className="text-[10px] text-gray-500 font-normal">
                  ({payment.variant})
                </span>
              )}
            </div>
            {payment.domainUrl && (
              <div className="text-[11px] text-[#0052cc] font-semibold mt-0.5">
                {payment.domainUrl}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        render: (payment) => (
          <span className="text-xs text-gray-600">
            {payment.description || payment.invoiceNo || '—'}
          </span>
        ),
      },
      {
        key: 'paymentStage',
        label: 'Stage / Type',
        render: (payment) => {
          const stage = payment.paymentStage || payment.paymentType || 'full';
          return (
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052cc] border border-blue-200">
              {stage}
            </span>
          );
        },
      },
      {
        key: 'gstvalue',
        label: 'GST Value',
        render: (payment) => (
          <span className="text-xs text-gray-600 font-medium">
            ₹{(Number(payment.gstvalue) || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: 'amount',
        label: 'Paid Amount',
        render: (payment) => (
          <span className="text-sm font-bold text-emerald-700">
            ₹{(Number(payment.amount) || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (payment) => (
          <div className="inline-flex items-center justify-end gap-1">
            {payment.productId && payment._id && (
              <button
                type="button"
                onClick={() => handleDeletePayment(payment)}
                disabled={isDeletingPayment}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                title="Delete Payment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [isDeletingPayment]
  );

  return (
    <div className="space-y-4">
      {/* Payment History Table Header & Add Payment Button */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0052cc]">payments</span>
            Payment History
          </h3>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPaymentModalOpen(true)}
            icon={Plus}
            iconPosition="left"
          >
            Add Payment
          </Button>
        </div>

        <Table
          columns={columns}
          data={allPayments}
          isLoading={isProductsLoading}
          keyField="uniqueKey"
          emptyMessage="No payment records found for this customer. Click 'Add Payment' to record one."
        />
      </div>

      {/* Add Payment Modal */}
      <PaymentHistoryModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        customer={customer}
        onPaymentAdded={refetch}
      />
    </div>
  );
};

export default PaymentTab;
