import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Company, AuthResponse } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // legacy alias used in some components
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, company?: Company) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      loading: true,

      login: async (identifier: string, password: string) => {
        try {
          const response: AuthResponse = await api.login({ identifier, password });
          const { user, company, token } = response;

          // Save token to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
          }

          set({
            user,
            company,
            token,
            isAuthenticated: true,
            isLoading: false,
            loading: false,
          });
        } catch (error) {
          set({ isLoading: false, loading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('company');
          localStorage.removeItem('selectedContact');
          localStorage.removeItem('isHeaderUserDropdownOpen');
          localStorage.removeItem('pendingAssignUserId');
          localStorage.removeItem('pendingShowDetails');
          localStorage.removeItem('pendingCanChat');
        }

        set({
          user: null,
          company: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          loading: false,
        });
      },

      setUser: (user: User, company?: Company) => {
        set({ user, company });
      },

      checkAuth: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

          if (!token) {
            set({ isAuthenticated: false, isLoading: false, loading: false });
            return;
          }

          // Verify token by fetching profile
          const { user, company } = await api.getProfile();

          set({
            user,
            company,
            token,
            isAuthenticated: true,
            isLoading: false,
            loading: false,
          });
        } catch (error: any) {
          // Only logout on genuine 401 Unauthorized.
          // Network errors (CORS, timeout, offline) should NOT log the user out.
          const status = error?.response?.status;
          if (status === 401) {
            get().logout();
          } else {
            // Network/server error — keep the user logged in, just clear loading
            set({ isLoading: false, loading: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
        partialize: (state) => ({
        user: state.user,
        company: state.company,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        loading: state.loading,
      }),
    }
  )
);
