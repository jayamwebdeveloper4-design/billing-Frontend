import api from './api';

export const getCustomers = async () => {
  const { data } = await api.get('/customers');
  return data;
};

export const getReportData = async (params = {}) => {
  let url = '/customers/reports';
  const query = [];
  if (params?.filterMode) query.push(`filterMode=${params.filterMode}`);
  if (params?.year) query.push(`year=${params.year}`);
  if (params?.month) query.push(`month=${params.month}`);
  if (query.length > 0) url += `?${query.join('&')}`;

  const { data } = await api.get(url);
  return data;
};

export const getCustomerById = async (id) => {
  const { data } = await api.get(`/customers/${id}`);
  return data;
};

export const createCustomer = async (customerData) => {
  const { data } = await api.post('/customers', customerData);
  return data;
};

export const updateCustomer = async (id, customerData) => {
  const { data } = await api.put(`/customers/${id}`, customerData);
  return data;
};

export const deleteCustomer = async (id) => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};

export const getReminders = async (params = 7) => {
  if (typeof params === 'number' || (typeof params === 'string' && !isNaN(Number(params)))) {
    const { data } = await api.get(`/customers/reminders?days=${params}`);
    return data;
  }
  let url = '/customers/reminders';
  const query = [];
  if (params?.days) query.push(`days=${params.days}`);
  if (params?.month) query.push(`month=${params.month}`);
  if (params?.year) query.push(`year=${params.year}`);
  if (params?.deactive) query.push(`deactive=${params.deactive}`);
  if (params?.paymentStatus) query.push(`paymentStatus=${params.paymentStatus}`);
  if (query.length > 0) url += `?${query.join('&')}`;
  
  const { data } = await api.get(url);
  return data;
};

export const exportRemindersExcel = async (params = {}) => {
  let url = '/customers/reminders/export';
  const query = [];
  if (params?.days) query.push(`days=${params.days}`);
  if (params?.month) query.push(`month=${params.month}`);
  if (params?.year) query.push(`year=${params.year}`);
  if (params?.deactive) query.push(`deactive=${params.deactive}`);
  if (params?.paymentStatus) query.push(`paymentStatus=${params.paymentStatus}`);
  if (query.length > 0) url += `?${query.join('&')}`;

  const response = await api.get(url, {
    responseType: 'arraybuffer',
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const filename = params?.deactive === 'deactive' ? 'Deactive_Products_List.xlsx' : 'Reminders_List.xlsx';

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const sendReminderEmail = async (customerId, payload) => {
  const { data } = await api.post(`/customers/${customerId}/remind`, payload);
  return data;
};

export const recordCustomerPayment = async (customerId, payload) => {
  const { data } = await api.post(`/customers/${customerId}/record-payment`, payload);
  return data;
};

export const getMailHistory = async (customerId) => {
  const { data } = await api.get(`/customers/${customerId}/mail-history`);
  return data;
};

export const emailInvoice = async (customerId, formData) => {
  const { data } = await api.post(`/customers/${customerId}/email-invoice`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const importCustomers = async (formData) => {
  const { data } = await api.post('/customers/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const exportCustomers = async () => {
  const response = await api.get('/customers/export', {
    responseType: 'arraybuffer',
  });
  
  // Create a Blob from the ArrayBuffer with the correct MIME type
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'customers.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteOrder = async (customerId, orderId) => {
  const { data } = await api.delete(`/customers/${customerId}/orders/${orderId}`);
  return data;
};

export const downloadSampleExcel = async () => {
  const response = await api.get('/customers/sample', {
    responseType: 'arraybuffer',
  });
  
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'Sample.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getAutoReminderSettings = async () => {
  const { data } = await api.get('/auto-reminder/settings');
  return data;
};

export const saveAutoReminderSettings = async (payload) => {
  const { data } = await api.post('/auto-reminder/settings', payload);
  return data;
};

export const getOrderManagementData = async (filters = {}) => {
  const { startDate, endDate, search, status, month } = filters;
  let url = '/order-management';
  const params = [];
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (status) params.push(`status=${status}`);
  if (month) params.push(`month=${month}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  
  const { data } = await api.get(url);
  return data;
};

export const exportReportExcelApi = async (params = {}) => {
  const { filterMode, year, month, activeTab } = params;
  let url = `/customers/reports/export?filterMode=${filterMode || 'year'}&activeTab=${activeTab || 'customers'}`;
  if (year) url += `&year=${year}`;
  if (month) url += `&month=${month}`;

  const response = await api.get(url, {
    responseType: 'arraybuffer',
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const tabLabels = {
    customers: 'Customers',
    orders: 'Orders',
    activeDomains: 'Active_Domains',
    deactiveDomains: 'Deactive_Domains',
  };

  const label = tabLabels[activeTab] || 'Data';
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Report_${label}_${filterMode || 'year'}_${todayStr}.xlsx`;

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
};


