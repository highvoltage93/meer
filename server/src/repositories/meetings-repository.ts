import type {
  MeetingMessageRecord,
  MeetingParticipantRecord,
  MeetingRecord,
  MeetingRole,
  SessionRecord,
  UserRecord,
} from '../types/meeting.js';

export interface MeetingsRepository {
  createUser(input: {
    displayName: string;
    username?: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    authProvider?: UserRecord['authProvider'];
  }): Promise<UserRecord>;
  getUserById(id: string): Promise<UserRecord | undefined>;
  getUserByUsername(username: string): Promise<UserRecord | undefined>;
  updateUserDisplayName(id: string, displayName: string): Promise<UserRecord | undefined>;
  createSession(userId: string): Promise<SessionRecord>;
  getSession(token: string): Promise<SessionRecord | undefined>;
  createMeeting(input: { title: string; hostName: string; hostUserId: string }): Promise<MeetingRecord>;
  getMeetingById(id: string): Promise<MeetingRecord | undefined>;
  getMeetingByCode(code: string): Promise<MeetingRecord | undefined>;
  updateMeetingPin(meetingId: string, participantId?: string): Promise<MeetingRecord | undefined>;
  listMeetingsByHostUserId(userId: string): Promise<MeetingRecord[]>;
  addParticipant(input: {
    meetingId: string;
    name: string;
    role: MeetingRole;
    userId?: string;
  }): Promise<MeetingParticipantRecord>;
  removeParticipant(meetingId: string, participantId: string): Promise<void>;
  updateParticipantState(
    meetingId: string,
    participantId: string,
    patch: Partial<
      Pick<MeetingParticipantRecord, 'isMicOn' | 'isCameraOn' | 'isScreenSharing' | 'isHandRaised'>
    >,
  ): Promise<MeetingParticipantRecord | undefined>;
  listParticipants(meetingId: string): Promise<MeetingParticipantRecord[]>;
  addMessage(input: {
    meetingId: string;
    senderName: string;
    senderUserId?: string;
    body: string;
  }): Promise<MeetingMessageRecord>;
  listMessages(meetingId: string): Promise<MeetingMessageRecord[]>;
}
