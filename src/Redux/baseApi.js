import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import Cookies from 'js-cookie';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  prepareHeaders: (headers) => {
    const token = Cookies.get('billing_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
  credentials: 'include',
});

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Customer',
    'CustomerProduct',
    'Renewal',
    'RenewalPlan',
    'Order',
    'Invoice',
    'Product',
    'Reminder',
    'SmtpSettings',
    'GstSettings',
    'Proforma',
    'Expense',
    'Backup',
    'Project',
    'Timesheet',
    'Template',
    'User',
    'AdminProfile',
    'Revenue',
    'Report',
  ],
  endpoints: () => ({}),
});

export default baseApi;

