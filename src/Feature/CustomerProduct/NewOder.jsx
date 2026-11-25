import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  Inbox,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../UI/Components/Button';
import AddServicePopup from './components/addServicePopup';
import PaymentManagement from '../../components/PaymentMenagement';
import { useGetCustomerByIdQuery } from '../../Redux/Customer';
import { useGetProductsQuery } from '../../Redux/Product';
import {
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useRecordOrderPaymentMutation,
} from '../../Redux/Oreder';

export const NewOder = () => {
  const { customerId, orderId } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(orderId && orderId !== 'default');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Customer query
  const queryCustId = customerId && customerId !== 'default' ? customerId : undefined;
  const { data: customerResponse, isLoading: isCustomerLoading } =
    useGetCustomerByIdQuery(queryCustId, { skip: !queryCustId });
  const initialCustomer = customerResponse?.data || customerResponse;

  // Order RTK Query (edit mode)
  const { data: orderResponse, isLoading: isOrderLoading } =
    useGetOrderByIdQuery(orderId, { skip: !isEditMode });
  const loadedOrder = orderResponse?.data || orderResponse;

  // Order Mutations
  const [createOrderMutation] = useCreateOrderMutation();
  const [updateOrderMutation] = useUpdateOrderMutation();
  const [recordOrderPaymentMutation] = useRecordOrderPaymentMutation();

  const [effectiveCustomer, setEffectiveCustomer] = useState(null);
  const activeCustomer = effectiveCustomer || initialCustomer;
  const customerName = (activeCustomer?.name || '').split(';')[0]?.trim() || 'Customer';

  // Products from catalog via RTK Query
  const { data: rawCatalogProducts, isLoading: isProductsLoading } = useGetProductsQuery();
  const allProducts = useMemo(() => {
    if (Array.isArray(rawCatalogProducts)) return rawCatalogProducts;
    if (Array.isArray(rawCatalogProducts?.data)) return rawCatalogProducts.data;
    return [];
  }, [rawCatalogProducts]);

  // Form states
  const [startDate, setStartDate] = useState(todayStr);
  const [domainUrl, setDomainUrl] = useState('');
  const [services, setServices] = useState([]);

  // Popup modal state - false by default in edit mode, true for new order
  const [isPopupOpen, setIsPopupOpen] = useState(!isEditMode);
  const [editingIndex, setEditingIndex] = useState(null);

  // Payment management modal after order creation or directly from edit mode
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [savedOrderContext, setSavedOrderContext] = useState(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hydrate form fields when existing order is loaded via RTK Query
  useEffect(() => {
    if (!loadedOrder || !isEditMode) return;
    if (loadedOrder.startDate || loadedOrder.orderDate) {
      setStartDate(loadedOrder.startDate || loadedOrder.orderDate);
    }
    if (loadedOrder.domainUrl) {
      setDomainUrl(loadedOrder.domainUrl);
    }
    if (loadedOrder.customer) {
      setEffectiveCustomer(loadedOrder.customer);
    } else if (loadedOrder.customerId && typeof loadedOrder.customerId === 'object') {
      setEffectiveCustomer(loadedOrder.customerId);
    }

    const rawProducts = Array.isArray(loadedOrder.products) ? loadedOrder.products : [];
    const mappedServices = rawProducts.map((p) => ({
      _id: p._id,
      product: p.product || '',
      variant: p.variant || '',
      price: Number(p.price) || 0,
      costPrice: Number(p.costPrice) || 0,
      quantity: Number(p.quantity) || 1,
      productType: p.productType || (p.validationEnabled !== false ? 'Renewal' : 'OneTime'),
      billingCycle: p.billingCycle || 'yearly',
      cycleCount: Number(p.cycleCount) || 1,
      startDate: p.startDate || loadedOrder.startDate || todayStr,
      endDate: p.endDate || loadedOrder.endDate || todayStr,
      sellerPriceRenewal: p.sellerPriceRenewal !== undefined ? p.sellerPriceRenewal : p.price,
      costPriceRenewal: p.costPriceRenewal !== undefined ? p.costPriceRenewal : p.costPrice,
      validationEnabled: p.validationEnabled !== false,
      oneTimePayment: !!p.oneTimePayment,
      deactive: !!p.deactive,
      deactiveDate: p.deactiveDate || '',
      deactiveYear: p.deactiveYear || '',
      paymentHistory: Array.isArray(p.paymentHistory) ? p.paymentHistory : [],
    }));
    setServices(mappedServices);
  }, [loadedOrder, isEditMode, todayStr]);

  // Compute Grand Total Price
  const grandTotal = useMemo(() => {
    return services.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [services]);

  // Open popup for adding a new service
  const handleOpenAddService = () => {
    setEditingIndex(null);
    setIsPopupOpen(true);
  };

  // Open popup for editing an existing service
  const handleOpenEditService = (idx) => {
    setEditingIndex(idx);
    setIsPopupOpen(true);
  };

  // Add or update service from popup
  const handleSaveService = (serviceItem) => {
    if (editingIndex !== null) {
      setServices((prev) =>
        prev.map((item, i) => (i === editingIndex ? serviceItem : item))
      );
      toast.success('Service updated');
    } else {
      setServices((prev) => [...prev, serviceItem]);
      toast.success('Service added to list');
    }
  };

  // Delete service
  const handleDeleteService = (idx) => {
    setServices((prev) => prev.filter((_, i) => i !== idx));
    toast.success('Service removed');
  };

  // Inline price update from table
  const handlePriceChange = (idx, newPriceVal) => {
    const parsed = newPriceVal === '' ? '' : parseFloat(newPriceVal) || 0;
    setServices((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, price: parsed } : item))
    );
  };

  // Toggle deactive from table
  const handleToggleDeactive = (idx) => {
    setServices((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const nowDeactive = !item.deactive;
        return {
          ...item,
          deactive: nowDeactive,
          deactiveDate: nowDeactive ? item.deactiveDate || todayStr : '',
          deactiveYear: nowDeactive ? (item.deactiveDate || todayStr).split('-')[0] : '',
        };
      })
    );
  };

  // Save / Update Order
  const handlePlaceOrder = async () => {
    const activeCustId = customerId && customerId !== 'default' ? customerId : activeCustomer?._id;
    if (!activeCustId) {
      toast.error('Customer information is missing');
      return;
    }

    if (services.length === 0) {
      toast.error('Please add at least one service to the order');
      return;
    }

    if (!domainUrl.trim()) {
      toast.error('Domain URL / Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: activeCustId,
        orderDate: startDate,
        domainUrl: domainUrl.trim(),
        totalPrice: Number(grandTotal) || 0,
        paymentStatus: loadedOrder?.paymentStatus || 'Unpaid',
        startDate,
        endDate: services[0]?.endDate || startDate,
        customerDetails: {
          name: activeCustomer?.name || '',
          phone: activeCustomer?.phone || [],
          email: activeCustomer?.email || [],
          gstin: activeCustomer?.gstin || '',
          address: activeCustomer?.address || '',
          contactPerson: activeCustomer?.contactPerson || '',
        },
        products: services.map((s) => ({
          _id: s._id,
          product: s.product,
          variant: s.variant,
          price: Number(s.price) || 0,
          costPrice: Number(s.costPrice) || 0,
          quantity: Number(s.quantity) || 1,
          productType: s.productType || (s.validationEnabled !== false ? 'Renewal' : 'OneTime'),
          billingCycle: s.billingCycle || 'yearly',
          cycleCount: Number(s.cycleCount) || 1,
          paymentStage: s.paymentStage || 'full',
          startDate: s.startDate || startDate,
          endDate: s.endDate || startDate,
          sellerPriceRenewal: s.sellerPriceRenewal !== undefined ? s.sellerPriceRenewal : s.price,
          costPriceRenewal: s.costPriceRenewal !== undefined ? s.costPriceRenewal : s.costPrice,
          validationEnabled: s.validationEnabled !== false,
          oneTimePayment: !!s.oneTimePayment,
          deactive: !!s.deactive,
          deactiveDate: s.deactiveDate || '',
          deactiveYear: s.deactiveYear || '',
          paymentHistory: Array.isArray(s.paymentHistory) ? s.paymentHistory : [],
        })),
        payments: loadedOrder?.payments || [],
      };

      if (isEditMode) {
        await updateOrderMutation({ id: orderId, ...payload }).unwrap();
        toast.success('Order updated successfully!');
        navigate(-1);
      } else {
        const res = await createOrderMutation(payload).unwrap();
        const createdOrder = res?.data || res;
        toast.success('Order created successfully!');

        // Open payment management for recording advance/full payment
        setSavedOrderContext({
          customer: activeCustomer,
          order: {
            ...createdOrder,
            totalPrice: grandTotal,
            products: services,
            domainUrl: domainUrl.trim(),
            payments: [],
          },
        });
        setIsPaymentModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to save order:', err);
      toast.error(err?.data?.message || err?.message || 'Failed to save order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle payment recorded from PaymentManagement modal
  const handlePaymentSavedFromManagement = async (paymentData, targetOrder) => {
    try {
      const targetOrdId = targetOrder?._id || savedOrderContext?.order?._id || orderId;
      if (targetOrdId) {
        await recordOrderPaymentMutation({ orderId: targetOrdId, ...paymentData }).unwrap();
        toast.success('Payment recorded successfully!');
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setIsPaymentModalOpen(false);
      navigate(-1);
    }
  };

  // Handle closing payment modal
  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    navigate(-1);
  };

  if (isCustomerLoading || isOrderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0052cc]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-2 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-1 w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEditMode ? 'Edit Order' : 'Create New Service'} - {customerName}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            <span className="text-[#0052cc] font-semibold">{customerName}</span> •{' '}
            {isEditMode
              ? 'Update services, domain name, dates, and pricing'
              : 'Configure domain name and select variants'}
          </p>
        </div>
      </div>

      {/* Card 1: Start Date & Domain Name */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-[#0052cc] uppercase tracking-wider mb-2 select-none">
            START DATE <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-[42px] bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-4 text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-[#0052cc] focus:ring-2 focus:ring-[#0052cc]/15 transition-all cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#0052cc] uppercase tracking-wider mb-2 select-none">
            DOMAIN URL / NAME <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="example.com (no www.)"
            value={domainUrl}
            onChange={(e) => setDomainUrl(e.target.value)}
            className="w-full h-[42px] bg-[#f8f9fb] border border-[#c3c6d6] rounded-lg px-4 text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-[#0052cc] focus:ring-2 focus:ring-[#0052cc]/15 transition-all"
          />
        </div>
      </div>

      {/* Card 2: List of Services */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-gray-900">
            <Inbox className="w-5 h-5 text-[#0052cc]" />
            <h2 className="text-base font-bold tracking-tight">List of Services</h2>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddService}
            disabled={isProductsLoading}
            icon={PlusCircle}
            iconPosition="left"
          >
            Add Service
          </Button>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-gray-200/70 bg-[#f8f9fb]/80 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-5">SERVICES</th>
                <th className="py-3 px-5">VARIANT</th>
                <th className="py-3 px-5 text-center">QTY</th>
                <th className="py-3 px-5">TOTAL PRICE</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="py-12 px-5 text-center text-xs italic text-gray-500 font-medium"
                  >
                    No products added to this order shopping cart.
                  </td>
                </tr>
              ) : (
                services.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                    {/* Service Name */}
                    <td className="py-3.5 px-5 text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{item.product}</span>
                        {item.deactive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
                            Deactive
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Variant */}
                    <td className="py-3.5 px-5 text-xs text-gray-600 font-medium whitespace-pre-wrap">
                      {item.variant || '-'}
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-5 text-xs font-bold text-gray-900 text-center">
                      {item.quantity || 1}
                    </td>

                    {/* Total Price (Editable) */}
                    <td className="py-3.5 px-5">
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.price !== undefined ? item.price : ''}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          className="w-full h-8 pl-6 pr-2 bg-[#f8f9fb] border border-gray-300 rounded font-bold text-xs text-gray-900 outline-none focus:bg-white focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc]"
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDeactive(idx)}
                          title={item.deactive ? 'Activate Service' : 'Deactivate Service'}
                          className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                            item.deactive
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {item.deactive ? 'Inactive' : 'Active'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditService(idx)}
                          title="Edit"
                          className="p-1.5 text-gray-500 hover:text-[#0052cc] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(idx)}
                          title="Delete"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: Summary / Action Buttons */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">
            TOTAL PRICE
          </span>
          <span className="text-2xl font-black text-[#0052cc] mt-0.5 block">
            ₹{grandTotal.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isEditMode && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setSavedOrderContext({
                  customer: activeCustomer,
                  order: {
                    ...loadedOrder,
                    _id: orderId,
                    totalPrice: grandTotal,
                    products: services,
                    domainUrl: domainUrl.trim(),
                  },
                });
                setIsPaymentModalOpen(true);
              }}
              icon={CreditCard}
              iconPosition="left"
              className="shadow-sm border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Payment Details
            </Button>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={services.length === 0 || isSubmitting}
            loading={isSubmitting}
            icon={CheckCircle2}
            iconPosition="left"
            className="shadow-sm"
          >
            {isEditMode ? 'Update Order' : 'Save & Place Order'}
          </Button>
        </div>
      </div>

      {/* Add / Edit Service Popup */}
      <AddServicePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        customerName={customerName}
        allProducts={allProducts}
        domainUrl={domainUrl}
        onDomainUrlChange={setDomainUrl}
        orderStartDate={startDate}
        onAddService={handleSaveService}
        editingService={editingIndex !== null ? services[editingIndex] : null}
      />

      {/* Payment Management Modal */}
      {isPaymentModalOpen && savedOrderContext && (
        <PaymentManagement
          isOpen={isPaymentModalOpen}
          onClose={handleClosePaymentModal}
          customer={savedOrderContext.customer}
          order={savedOrderContext.order}
          orderIdx={0}
          onSavePayment={handlePaymentSavedFromManagement}
        />
      )}
    </div>
  );
};

export default NewOder;
