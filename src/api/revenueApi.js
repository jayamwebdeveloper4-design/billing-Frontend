import api from './api';

// Revenue tab – aggregated customer order rows
export const getRevenueOrders = async (params) => {
  const { data } = await api.get('/revenue/orders', { params });
  return data;
};

// Express tab
export const getExpressEntries = async (params) => {
  const { data } = await api.get('/revenue/express', { params });
  return data;
};

export const addExpressEntry = async (payload) => {
  const { data } = await api.post('/revenue/express', payload);
  return data;
};

export const deleteExpressEntry = async (id) => {
  const { data } = await api.delete(`/revenue/express/${id}`);
  return data;
};
