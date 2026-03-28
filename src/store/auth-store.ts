import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createGuestSession } from '@/services/api/auth-api';
import type { AuthSession, AuthUser } from '@/types/auth';

type AuthState = {
  user?: AuthUser;
  session?: AuthSession;
  isLoading: boolean;
  ensureGuestSession: (displayName: string) => Promise<{ user: AuthUser; session: AuthSession }>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: undefined,
      session: undefined,
      isLoading: false,
      async ensureGuestSession(displayName) {
        const state = get();
        if (state.user && state.session) {
          return {
            user: state.user,
            session: state.session,
          };
        }

        set({ isLoading: true });
        const result = await createGuestSession(displayName);
        set({
          user: result.user,
          session: result.session,
          isLoading: false,
        });

        return result;
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
