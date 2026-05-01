import { env } from '@/config/env';
import type { AuthIdentity, AuthSession, AuthUser } from '@/types/auth';

type GuestSessionResponse = {
  user: AuthUser;
  session: AuthSession;
};

export type RegisterInput = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

async function authRequest(path: string, body: unknown): Promise<GuestSessionResponse> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Authentication failed');
  }

  return response.json() as Promise<GuestSessionResponse>;
}

export async function registerUser(input: RegisterInput): Promise<GuestSessionResponse> {
  return authRequest('/auth/register', input);
}

export async function loginUser(input: LoginInput): Promise<GuestSessionResponse> {
  return authRequest('/auth/login', input);
}

export async function createGuestSession(displayName: string): Promise<GuestSessionResponse> {
  const sessionToken = getAuthToken();
  const response = await fetch(`${env.apiBaseUrl}/auth/guest-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}`, 'x-session-token': sessionToken } : {}),
    },
    body: JSON.stringify({ displayName }),
  });

  if (!response.ok) {
    throw new Error('Failed to create guest session');
  }

  return response.json() as Promise<GuestSessionResponse>;
}

export function getAuthToken() {
  const raw = localStorage.getItem('mitingo-auth-storage');
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as { state?: { session?: { token?: string } } };
    return parsed.state?.session?.token;
  } catch {
    return undefined;
  }
}

export async function getCurrentSession(): Promise<AuthIdentity> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Session required');
  }

  const response = await fetch(`${env.apiBaseUrl}/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-session-token': token,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load current session');
  }

  return response.json() as Promise<AuthIdentity>;
}
