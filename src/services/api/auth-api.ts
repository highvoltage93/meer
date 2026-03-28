import { env } from '@/config/env';
import type { AuthSession, AuthUser } from '@/types/auth';

type GuestSessionResponse = {
  user: AuthUser;
  session: AuthSession;
};

export async function createGuestSession(displayName: string): Promise<GuestSessionResponse> {
  const response = await fetch(`${env.apiBaseUrl}/auth/guest-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ displayName }),
  });

  if (!response.ok) {
    throw new Error('Failed to create guest session');
  }

  return response.json() as Promise<GuestSessionResponse>;
}
