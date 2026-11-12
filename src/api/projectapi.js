import api from './api';

export const createProject = async (productData) => {
    const response = await api.post('/projectTool', productData);
    return response.data;
};


export const getProject = async (productData) => {
    const response = await api.get('/projectTool', productData);
    return response.data;
};
