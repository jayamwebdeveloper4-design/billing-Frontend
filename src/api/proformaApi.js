import api from './api';

/**
 * Fetch all proforma records.
 */
export const getProformas = async () => {
  const { data } = await api.get('/proformas');
  return data;
};

/**
 * Fetch predicted next proforma number.
 */
export const getNextProformaNumber = async (invoiceType, date) => {
  const { data } = await api.get('/proformas/next-number', {
    params: { invoiceType, date }
  });
  return data?.proformaNo || '';
};

/**
 * Create a new proforma record.
 */
export const createProforma = async (payload) => {
  const { data } = await api.post('/proformas', payload);
  return data;
};

/**
 * Update an existing proforma record.
 */
export const updateProforma = async (id, payload) => {
  const { data } = await api.put(`/proformas/${id}`, payload);
  return data;
};

/**
 * Generate a PDF proforma invoice from backend.
 * Returns Blob.
 */
export const generateProformaPdf = async (payload) => {
  try {
    const response = await api.post(
      '/proformas/generate',
      payload,
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
 * Delete a proforma by ID.
 */
export const deleteProforma = async (id) => {
  const { data } = await api.delete(`/proformas/${id}`);
  return data;
};

/**
 * Convert Proforma to actual Tax Invoice.
 */
// export const convertToInvoice = async (id) => {
//   const { data } = await api.post(`/proformas/${id}/convert`);
//   return data;
// };
