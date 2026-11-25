import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '../../Redux/Customer';
import Button from '../../UI/Components/Button';
import Tabwizard from './Components/Tabwizard';
import CustomerTab from './Components/customerTab';
import ServiceTab from './Components/ServiceTab';
import PaymentTab from './Components/PaymentTab';
import InvoiceTab from './Components/InvoiceTab';

export const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('customer');

  const isNew = id === 'new' || id === 'create';

  const { data: response, isLoading, refetch } = useGetCustomerByIdQuery(id, {
    skip: !id || isNew,
  });

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();

  const customer = isNew ? null : (response?.data || response);
  const primaryName = isNew
    ? 'New Customer'
    : (customer?.name || '').split(';')[0]?.trim() || 'Customer';

  const handleSave = async (payload) => {
    try {
      if (isNew) {
        const res = await createCustomer(payload).unwrap();
        toast.success('Customer created successfully!');
        const newCustomerId = res?.data?._id || res?._id;
        if (newCustomerId) {
          navigate(`/customers/${newCustomerId}`, { replace: true });
        } else {
          navigate('/customers');
        }
      } else {
        await updateCustomer({ id, ...payload }).unwrap();
        toast.success('Customer profile updated successfully!');
        if (refetch) refetch();
      }
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to save customer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#003d9b] animate-spin" />
        <p className="text-sm font-medium text-gray-500">Loading customer details...</p>
      </div>
    );
  }

  if (!customer && !isLoading && !isNew) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-base text-gray-600">Customer not found.</p>
        <Button
          onClick={() => navigate('/customers')}
          icon={ArrowLeft}
          className="font-bold"
        >
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="p-2 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        {/* Left: Back Arrow + Title + Subtitle */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/customers')}
            className="p-2 text-gray-700 hover:text-[#003d9b] hover:bg-gray-100 rounded-lg mt-0.5"
            title="Back to Customers list"
          />
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {primaryName}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isNew ? 'Create a new customer profile' : `${primaryName} - Profile & Payments`}
            </p>
          </div>
        </div>

        {/* Right: Tab Wizard (hidden when creating new customer) */}
        {!isNew && (
          <Tabwizard activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {(activeTab === 'customer' || isNew) && (
          <CustomerTab
            customer={customer}
            onUpdate={handleSave}
            isUpdating={isCreating || isUpdating}
          />
        )}
        {!isNew && activeTab === 'service' && <ServiceTab customer={customer} />}
        {!isNew && activeTab === 'payment' && <PaymentTab customer={customer} />}
        {!isNew && activeTab === 'invoice' && <InvoiceTab customer={customer} />}
      </div>
    </div>
  );
};

export default CustomerDetails;

