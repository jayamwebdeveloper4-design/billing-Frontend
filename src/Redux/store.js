import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './baseApi';

// Ensure all endpoints are injected into baseApi
import { customerApi } from './Customer/customerApi';
import { customerProductApi } from './CustomerProcuct/customerProductApi';
import { renewalApi } from './Renewal/renewalApi';
import { orderApi } from './Oreder/orderApi';
import { invoiceApi } from './Invoice/invoiceApi';
import { productApi } from './Product/productApi';
import { reminderApi } from './Reminder/reminderApi';
import { smtpApi } from './Smtp/smtpApi';
import { gstSettingsApi } from './GstSettings/gstSettingsApi';
import { proformaApi } from './Proforma/proformaApi';
import { expenseApi } from './Expense/expenseApi';
import { backupApi } from './Backup/backupApi';
import { projectApi } from './Project/projectApi';
import { templateApi } from './Template/templateApi';
import { userApi } from './User/userApi';
import { revenueApi } from './Revenue/revenueApi';
import { reportApi } from './Report/reportApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

setupListeners(store.dispatch);

// Re-export baseApi and slice APIs for backward compatibility
export {
  baseApi,
  customerApi,
  customerProductApi,
  renewalApi,
  orderApi,
  invoiceApi,
  productApi,
  reminderApi,
  smtpApi,
  gstSettingsApi,
  proformaApi,
  expenseApi,
  backupApi,
  projectApi,
  templateApi,
  userApi,
  revenueApi,
  reportApi,
};

export default store;
