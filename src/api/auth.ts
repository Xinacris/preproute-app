import api from './axios';

export const login = (userId: string, password: string) =>
  api.post('/auth/login', { userId, password });
