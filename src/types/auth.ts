export type AuthUser = {
  id: string;
  displayName: string;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  userId: string;
  createdAt: string;
};
