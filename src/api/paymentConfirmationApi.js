import api from './api';

export const getPaymentConfirmationSettings = async () => {
  const { data } = await api.get('/payment-confirmation/settings');
  return data;
};

export const savePaymentConfirmationSettings = async (payload) => {
  const { data } = await api.post('/payment-confirmation/settings', payload);
  return data;
};

export const sendPaymentConfirmationEmailApi = async (customerId, orderId, paymentId, customData = {}) => {
  const { data } = await api.post('/payment-confirmation/send-manual', {
    customerId,
    orderId,
    paymentId,
    ...customData
  });
  return data;
};
