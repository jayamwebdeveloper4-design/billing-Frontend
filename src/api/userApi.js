import api from './api';

export const requestLoginOtp = async (email) => {
  const response = await api.post('/auth/request-otp', { email });
  return response.data;
};

export const verifyLoginOtp = async (email, otp) => {
  const response = await api.post('/auth/verify-otp', { email, otp });
  return response.data;
};

export const logoutAdmin = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getAdminProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

export const updateAdminProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data;
};

export const fetchAdminEmail = async () => {
  const response = await api.get('/auth/admin-email');
  return response.data;
};
