import api from './api';

export const getSmtpSettings = async () => {
    const { data } = await api.get('/smtp-settings');
    return data;
};

export const updateSmtpSettings = async (settingsData) => {
    const { data } = await api.put('/smtp-settings', settingsData);
    return data;
};

