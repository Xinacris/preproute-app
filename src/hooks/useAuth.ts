import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { token, user, setAuth, logout } = useAuthStore();
  return { token, user, setAuth, logout, isAuthenticated: !!token };
};
