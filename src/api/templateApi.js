import api from './api';

export const getTemplate = async (name) => {
  const { data } = await api.get(`/templates/${name}`);
  return data;
};

export const saveTemplate = async (templateData) => {
  const { data } = await api.post('/templates', templateData);
  return data;
};
