import api from './axios';

export const getAllTests = () => api.get('/tests');
export const getTestById = (id: string) => api.get(`/tests/${id}`);
export const createTest = (data: unknown) => api.post('/tests', data);
export const updateTest = (id: string, data: unknown) => api.put(`/tests/${id}`, data);
export const deleteTest = (id: string) => api.delete(`/tests/${id}`);
export const publishTest = (id: string) => api.put(`/tests/${id}`, { status: 'live' });
