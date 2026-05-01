import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createGuestSession,
  getCurrentSession,
  loginUser,
  registerUser,
  type LoginInput,
  type RegisterInput,
} from '@/services/api/auth-api';
import type { AuthIdentity, AuthSession, AuthUser } from '@/types/auth';

type AuthState = {
  user?: AuthUser;
  session?: AuthSession;
  isLoading: boolean;
  isHydrated: boolean;
  register: (input: RegisterInput) => Promise<AuthIdentity>;
  login: (input: LoginInput) => Promise<AuthIdentity>;
  ensureGuestSession: (displayName: string) => Promise<{ user: AuthUser; session: AuthSession }>;
  hydrateSession: () => Promise<AuthIdentity | null>;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: undefined,
      session: undefined,
      isLoading: false,
      isHydrated: false,
      async register(input) {
        set({ isLoading: true });
        try {
          const result = await registerUser(input);
          set({
            user: result.user,
            session: result.session,
            isLoading: false,
            isHydrated: true,
          });
          return result;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      async login(input) {
        set({ isLoading: true });
        try {
          const result = await loginUser(input);
          set({
            user: result.user,
            session: result.session,
            isLoading: false,
            isHydrated: true,
          });
          return result;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      async ensureGuestSession(displayName) {
        const state = get();
        if (state.user && state.session) {
          if (state.user.displayName === displayName) {
            try {
              const current = await getCurrentSession();
              set({
                user: current.user,
                session: current.session,
                isHydrated: true,
              });
              return current;
            } catch {
              // Fall through and recreate the guest identity if the session expired.
            }
          }
        }

        set({ isLoading: true });
        try {
          const result = await createGuestSession(displayName);
          set({
            user: result.user,
            session: result.session,
            isLoading: false,
            isHydrated: true,
          });

          return result;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      async hydrateSession() {
        const state = get();
        if (!state.session) {
          set({ isHydrated: true });
          return null;
        }

        set({ isLoading: true });

        try {
          const result = await getCurrentSession();
          set({
            user: result.user,
            session: result.session,
            isLoading: false,
            isHydrated: true,
          });
          return result;
        } catch {
          set({
            user: undefined,
            session: undefined,
            isLoading: false,
            isHydrated: true,
          });
          return null;
        }
      },
      clearSession() {
        set({
          user: undefined,
          session: undefined,
          isHydrated: true,
        });
      },
    }),
    {
      name: 'mitingo-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    },
  ),
);
