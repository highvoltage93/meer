export type AuthUser = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  authProvider?: 'guest' | 'password';
  displayName: string;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt?: string;
  kind?: 'legacy' | 'jwt';
};

export type AuthIdentity = {
  user: AuthUser;
  session: AuthSession;
};
