import api from './api';

export const createProject = async (productData) => {
    const response = await api.post('/projectTool', productData);
    return response.data;
};


export const getProject = async (productData) => {
    const response = await api.get('/projectTool', productData);
    return response.data;
};

export const getProjectTimesheet = async ({
    view,
    cursor,
    employeeId,
    projectId,
    startDate,
    endDate,
    month,
    year,
    signal,
} = {}) => {
    const response = await api.get('/projectTool/timesheets', {
        params: {
            view,
            limit: 50,
            ...(cursor ? { cursor } : {}),
            ...(employeeId ? { employeeId } : {}),
            ...(projectId ? { projectId } : {}),
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            ...(month ? { month } : {}),
            ...(year ? { year } : {}),
        },
        signal,
    });
    return response.data;
};
