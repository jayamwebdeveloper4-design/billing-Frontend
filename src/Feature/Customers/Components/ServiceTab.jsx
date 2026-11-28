import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FolderPlus,
  Edit,
  Trash2,
  Power,
  ExternalLink,
  CreditCard,
  Loader2,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../UI/Components/Button';
import Table from '../../../UI/Components/Table';
import PaymentManagement from '../../../components/PaymentMenagement';
import Addproject from './Addproject';
import OldOrderAndPymentHistory from './OldOrderAndPymentHistory';
import {
  useGetProductsQuery,
  useSetDeactiveProductMutation,
  useDeleteOrderProductsMutation,
  useAddPaymentMutation,
} from '../../../Redux/CustomerProcuct';
import { useRecordOrderPaymentMutation } from '../../../Redux/Oreder';

export const ServiceTab = ({ customer }) => {
  const navigate = useNavigate();
  const customerId = customer?._id;

  // Selected order for PaymentManagement modal
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isOldOrderOpen, setIsOldOrderOpen] = useState(false);

  // RTK Mutations
  const [recordOrderPayment] = useRecordOrderPaymentMutation();

  // Fetch products with payments from RTK Query
  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    refetch,
  } = useGetProductsQuery(
    { customerId, includePayments: 'true' },
    { skip: !customerId }
  );

  const [setDeactive] = useSetDeactiveProductMutation();
  const [deleteOrderProducts, { isLoading: isDeletingOrder }] =
    useDeleteOrderProductsMutation();
  const [addPayment] = useAddPaymentMutation();

  // Group products by orderId
  const ordersList = useMemo(() => {
    const rawProducts = productsResponse?.data || [];
    if (!rawProducts.length) {
      // Fallback to customer.orders if RTK query has no records yet
      return (customer?.orders || []).map((o) => ({
        ...o,
        orderId: o._id,
        totalPaid: (o.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      }));
    }

    const orderMap = {};
    rawProducts.forEach((p) => {
      // orderId can be an object if populated or string ID
      const oId =
        typeof p.orderId === 'object' && p.orderId?._id
          ? String(p.orderId._id)
          : String(p.orderId || 'general');

      const domain =
        p.domainUrl ||
        (typeof p.orderId === 'object' ? p.orderId?.domainUrl : '') ||
        (customer?.orders || []).find((o) => String(o._id) === String(oId))?.domainUrl ||
        '';

      if (!orderMap[oId]) {
        orderMap[oId] = {
          _id: oId,
          orderId: oId,
          createdAt:
            (typeof p.orderId === 'object' && p.orderId?.orderDate) ||
            p.createdAt ||
            p.startDate,
          orderDate:
            (typeof p.orderId === 'object' && p.orderId?.orderDate) ||
            p.startDate ||
            p.createdAt,
          domainUrl: domain,
          products: [],
          totalPrice: 0,
          totalPaid: 0,
          payments: [],
        };
      } else if (!orderMap[oId].domainUrl && domain) {
        orderMap[oId].domainUrl = domain;
      }

      orderMap[oId].products.push({
        ...p,
        domainUrl: p.domainUrl || domain,
      });

      const qty = Number(p.quantity) || 1;
      const price = Number(p.price) || 0;
      orderMap[oId].totalPrice += price * qty;

      (p.paymentHistory || []).forEach((pay) => {
        orderMap[oId].payments.push(pay);
        orderMap[oId].totalPaid += Number(pay.amount) || 0;
      });
    });

    return Object.values(orderMap).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [productsResponse, customer]);

  const handleNewService = () => {
    if (customerId) {
      navigate(`/new-order/${customerId}`);
    }
  };

  // Toggle active / deactive for a product
  const handleToggleDeactive = async (productId, currentDeactive) => {
    try {
      await setDeactive({
        id: productId,
        deactive: !currentDeactive,
        deactiveYear: !currentDeactive ? String(new Date().getFullYear()) : '',
        deactiveDate: !currentDeactive ? new Date().toISOString().split('T')[0] : '',
      }).unwrap();
      toast.success(currentDeactive ? 'Service activated' : 'Service deactivated');
      if (refetch) refetch();
    } catch (err) {
      toast.error('Failed to change service status');
    }
  };

  // Delete an entire order and its products
  const handleDeleteOrder = async (orderId) => {
    if (!orderId || orderId === 'general') return;
    if (!window.confirm('Are you sure you want to delete all products in this order?')) {
      return;
    }
    try {
      await deleteOrderProducts(orderId).unwrap();
      toast.success('Order and its products deleted');
      if (refetch) refetch();
    } catch (err) {
      toast.error('Failed to delete order products');
    }
  };

  // Save payment from PaymentManagement modal
  const handleSavePaymentFromManagement = async (paymentData, targetOrder) => {
    try {
      const targetId = targetOrder?._id || targetOrder?.orderId;
      if (targetId && targetId !== 'general') {
        await recordOrderPayment({ orderId: targetId, ...paymentData }).unwrap();
      } else if (targetOrder?.products?.[0]?._id) {
        await addPayment({
          id: targetOrder.products[0]._id,
          ...paymentData,
        }).unwrap();
      }
      toast.success('Payment recorded successfully');
      setSelectedOrderForPayment(null);
      if (refetch) refetch();
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error('Failed to record payment');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Create Date',
        render: (order) => (
          <span className="font-semibold text-gray-800 text-xs">
            {order.createdAt || order.orderDate
              ? new Date(order.createdAt || order.orderDate).toLocaleDateString('en-GB')
              : '-'}
          </span>
        ),
      },
      {
        key: 'services',
        label: 'Services',
        render: (order) => (
          <div className="flex flex-wrap gap-1.5 items-center">
            {order.products?.map((p, idx) => (
              <div
                key={p._id || idx}
                className="inline-flex items-center gap-1.5 bg-blue-50/80 border border-blue-200/70 text-blue-900 px-2 py-0.5 rounded-md text-xs font-semibold"
              >
                <span>{p.product}</span>
                {p.variant && (
                  <span className="text-[10px] text-blue-600 font-normal">
                    ({p.variant})
                  </span>
                )}
                {p.deactive && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 bg-red-100 text-red-700 rounded">
                    Inactive
                  </span>
                )}
              </div>
            )) || <span className="text-gray-400 italic text-xs">No services</span>}
          </div>
        ),
      },
      {
        key: 'domainUrl',
        label: 'Domain',
        render: (order) => {
          const domain =
            order.domainUrl ||
            order.products?.find((p) => p.domainUrl)?.domainUrl ||
            order.products?.find((p) => typeof p.orderId === 'object' && p.orderId?.domainUrl)?.orderId?.domainUrl;
          if (!domain) return <span className="text-gray-400">—</span>;
          const cleanUrl = domain.startsWith('http') ? domain : `https://${domain}`;
          return (
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0052cc] hover:underline"
            >
              <span>{domain}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          );
        },
      },
      {
        key: 'totalAmount',
        label: 'Total Amount',
        render: (order) => {
          const hasGst = order.payments?.some((p) => p.withGst);
          const gstTotal = (order.payments || [])
            .filter((p) => p.withGst)
            .reduce((sum, p) => sum + (Number(p.gstvalue) || 0), 0);
          const totalWithGst = (Number(order.totalPrice) || 0) + gstTotal;

          return (
            <div>
              <div className="font-bold text-gray-900 text-sm">
                ₹{(Number(order.totalPrice) || 0).toLocaleString()}
              </div>
              {hasGst && gstTotal > 0 && (
                <div className="text-[10px] text-gray-500 font-medium">
                  w/ GST: <span className="font-bold text-blue-700">₹{totalWithGst.toLocaleString()}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'paymentStatus',
        label: 'Payment Status',
        render: (order) => {
          const total = Number(order.totalPrice) || 0;
          const paid = Number(order.totalPaid) || 0;
          let status = 'Pending';
          let style = 'bg-red-50 text-red-700 border-red-200';

          if (total > 0 && paid >= total) {
            status = 'Fully Paid';
            style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          } else if (paid > 0 && paid < total) {
            status = 'Partially Paid';
            style = 'bg-amber-50 text-amber-700 border-amber-200';
          }

          return (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${style}`}
            >
              {status}
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
        render: (order) => (
          <div
            className="inline-flex items-center justify-end gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Open Payment Management */}
            <button
              type="button"
              onClick={() => setSelectedOrderForPayment(order)}
              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
              title="Manage Payments & Installments"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Toggle first product deactive status */}
            {order.products?.[0] && (
              <button
                type="button"
                onClick={() =>
                  handleToggleDeactive(order.products[0]._id, order.products[0].deactive)
                }
                title={order.products[0].deactive ? 'Activate' : 'Deactivate'}
                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
              >
                <Power className="w-4 h-4" />
              </button>
            )}

            {/* Edit Service link */}
            <button
              type="button"
              onClick={() => navigate(`/new-order/${customerId}/${order._id}`)}
              className="p-1.5 text-gray-500 hover:text-[#0052cc] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
              title="Edit Service"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* Delete order */}
            {order.orderId && order.orderId !== 'general' && (
              <button
                type="button"
                onClick={() => handleDeleteOrder(order.orderId)}
                disabled={isDeletingOrder}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                title="Delete Order & Products"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [customerId, navigate, isDeletingOrder]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0052cc]">history</span>
          List of Services
        </h3>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsOldOrderOpen(true)}
            size="sm"
            variant="outline"
            icon={History}
            className="font-bold border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            Old Order
          </Button>
          <Button
            onClick={() => setIsAddProjectOpen(true)}
            size="sm"
            variant="outline"
            icon={FolderPlus}
            className="font-bold border-blue-200 text-[#0052cc] hover:bg-blue-50"
          >
            Add Project
          </Button>
          <Button onClick={handleNewService} size="sm" icon={Plus} className="font-bold">
            New Service
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={ordersList}
        isLoading={isProductsLoading}
        keyField="_id"
        onRowClick={(order) => setSelectedOrderForPayment(order)}
        emptyMessage="No services found for this customer. Click 'New Service' to create one."
      />

      {/* Payment Management Modal */}
      {selectedOrderForPayment && (
        <PaymentManagement
          isOpen={!!selectedOrderForPayment}
          onClose={() => setSelectedOrderForPayment(null)}
          customer={customer}
          order={selectedOrderForPayment}
          orderIdx={0}
          onSavePayment={handleSavePaymentFromManagement}
        />
      )}

      {/* Add Project Modal */}
      <Addproject
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        customerData={customer}
      />

      {/* Old Order & Payment History Modal */}
      <OldOrderAndPymentHistory
        isOpen={isOldOrderOpen}
        onClose={() => setIsOldOrderOpen(false)}
        customer={customer}
        onSuccess={() => {
          if (refetch) refetch();
        }}
      />
    </div>
  );
};

export default ServiceTab;
