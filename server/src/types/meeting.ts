export type MeetingRole = 'host' | 'guest';

export type MeetingRecord = {
  id: string;
  code: string;
  title: string;
  hostUserId: string;
  hostName: string;
  pinnedParticipantId?: string;
  status: 'active' | 'ended';
  createdAt: string;
};

export type MeetingParticipantRecord = {
  id: string;
  meetingId: string;
  userId?: string;
  name: string;
  role: MeetingRole;
  joinedAt: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
};

export type MeetingMessageRecord = {
  id: string;
  meetingId: string;
  senderUserId?: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type UserRecord = {
  id: string;
  username?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  authProvider: 'guest' | 'password';
  displayName: string;
  createdAt: string;
};

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt?: string;
  kind?: 'legacy' | 'jwt';
};
