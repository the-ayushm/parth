import { useAuthStore } from '@/store/auth';

export function useAuth() {
  const { user, isAuthenticated, loading, login, logout, checkAuth } = useAuthStore();

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuth,
  };
}
