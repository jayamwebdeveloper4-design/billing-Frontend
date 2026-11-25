import API from './api';

export const getDashboardStats = async () => {
    const response = await API.get('/dashboard/stats');
    return response.data;
};

export const getReportData = async (params = {}) => {
  const { data } = await API.get('/dashboard', { params });
  return data;
};

export const exportReportExcelApi = async (params = {}) => {
  const response = await API.get('/dashboard/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};
