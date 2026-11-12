import api from './api';

/**
 * Generate a PDF invoice from the backend.
 * Returns a Blob (application/pdf).
 *
 * @param {string} customerId  - MongoDB ObjectId of the customer
 * @param {string} orderId     - MongoDB ObjectId of the order (subdocument)
 * @param {string} invoiceType - 'withGST' | 'withoutGST'
 * @param {string} invoiceDate - ISO date string (e.g. "2026-05-23")
 */
export const generateInvoicePdf = async (
  customerId,
  orderId,
  invoiceType,
  invoiceDate,
  selectedOrderIds = null,
  paymentData = null,
  customInvoiceNo = null,
  paymentStatus = 'Paid',
  isProforma = false,
  selectedCompanyName = null,
  selectedAddress = null
) => {
  try {
    const response = await api.post(
      '/invoices/generate',
      { customerId, orderId, invoiceType, invoiceDate, selectedOrderIds, paymentData, customInvoiceNo, paymentStatus, isProforma, selectedCompanyName, selectedAddress },
      { responseType: 'blob' }
    );
    return response.data; // Blob
  } catch (error) {
    if (error.response && error.response.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        if (json.message) {
          throw new Error(json.message);
        }
      } catch (parseErr) {
        if (parseErr.message && parseErr.message !== error.message) {
          throw parseErr;
        }
      }
    }
    throw error;
  }
};

/**
 * Fetch predicted next invoice number for preview
 */
export const getNextInvoiceNumber = async (invoiceType, invoiceDate) => {
  const { data } = await api.get('/invoices/next-number', {
    params: { invoiceType, invoiceDate }
  });
  return data?.invoiceNo || '';
};

/**
 * Verify if an invoice number already exists in the database.
 * @param {string} invoiceNo
 * @returns {Promise<{ exists: boolean }>}
 */
export const verifyInvoiceNumber = async (invoiceNo, orderId = null, customerId = null) => {
  const params = { invoiceNo };
  if (orderId) params.orderId = orderId;
  if (customerId) params.customerId = customerId;
  const { data } = await api.get('/invoices/verify-number', { params });
  return data;
};

export const getInvoices = async (customerId = null) => {
  const params = {};
  if (customerId) params.customerId = customerId;
  const { data } = await api.get('/invoices', { params });
  return data;
};

export const deleteInvoice = async (id) => {
  const { data } = await api.delete(`/invoices/${id}`);
  return data;
};
