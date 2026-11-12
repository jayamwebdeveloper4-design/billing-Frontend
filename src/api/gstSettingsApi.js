import api from './api';

export const getGstSettings = async () => {
  const { data } = await api.get('/gst-settings');
  return data;
};

export const updateGstSettings = async (settingsData) => {
  const { data } = await api.put('/gst-settings', settingsData);
  return data;
};

export const uploadSignatureImage = async (formData) => {
  const { data } = await api.post('/gst-settings/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};
