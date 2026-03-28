import { randomUUID } from 'node:crypto';
import type {
  MeetingMessageRecord,
  MeetingParticipantRecord,
  MeetingRecord,
  MeetingRole,
  SessionRecord,
  UserRecord,
} from '../types/meeting.js';
import type { MeetingsRepository } from './meetings-repository.js';

function createMeetingCode() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const chunk = () =>
    Array.from({ length: 3 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${chunk()}-${chunk()}-${chunk()}`;
}

export class InMemoryMeetingsRepository implements MeetingsRepository {
  private meetings = new Map<string, MeetingRecord>();
  private participants = new Map<string, MeetingParticipantRecord[]>();
  private messages = new Map<string, MeetingMessageRecord[]>();
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, SessionRecord>();

  async createUser(input: { displayName: string }): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      displayName: input.displayName,
      createdAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);
    return user;
  }

  async getUserById(id: string): Promise<UserRecord | undefined> {
    return this.users.get(id);
  }

  async createSession(userId: string): Promise<SessionRecord> {
    const session: SessionRecord = {
      token: randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  async getSession(token: string): Promise<SessionRecord | undefined> {
    return this.sessions.get(token);
  }

  async createMeeting(input: { title: string; hostName: string; hostUserId: string }): Promise<MeetingRecord> {
    const meeting: MeetingRecord = {
      id: randomUUID(),
      code: createMeetingCode(),
      title: input.title,
      hostUserId: input.hostUserId,
      hostName: input.hostName,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.meetings.set(meeting.id, meeting);
    this.participants.set(meeting.id, []);
    this.messages.set(meeting.id, []);

    return meeting;
  }

  async getMeetingById(id: string): Promise<MeetingRecord | undefined> {
    return this.meetings.get(id);
  }

  async getMeetingByCode(code: string): Promise<MeetingRecord | undefined> {
    return Array.from(this.meetings.values()).find((meeting) => meeting.code === code);
  }

  async addParticipant(input: {
    meetingId: string;
    name: string;
    role: MeetingRole;
  }): Promise<MeetingParticipantRecord> {
    const participant: MeetingParticipantRecord = {
      id: randomUUID(),
      meetingId: input.meetingId,
      name: input.name,
      role: input.role,
      joinedAt: new Date().toISOString(),
      isMicOn: true,
      isCameraOn: true,
      isScreenSharing: false,
      isHandRaised: false,
    };

    const current = this.participants.get(input.meetingId) ?? [];
    this.participants.set(input.meetingId, [...current, participant]);
    return participant;
  }

  async listParticipants(meetingId: string): Promise<MeetingParticipantRecord[]> {
    return this.participants.get(meetingId) ?? [];
  }

  async removeParticipant(meetingId: string, participantId: string): Promise<void> {
    const current = this.participants.get(meetingId) ?? [];
    this.participants.set(
      meetingId,
      current.filter((participant) => participant.id !== participantId),
    );
  }

  async updateParticipantState(
    meetingId: string,
    participantId: string,
    patch: Partial<
      Pick<MeetingParticipantRecord, 'isMicOn' | 'isCameraOn' | 'isScreenSharing' | 'isHandRaised'>
    >,
  ): Promise<MeetingParticipantRecord | undefined> {
    const current = this.participants.get(meetingId) ?? [];
    let updated: MeetingParticipantRecord | undefined;

    this.participants.set(
      meetingId,
      current.map((participant) => {
        if (participant.id !== participantId) return participant;
        updated = { ...participant, ...patch };
        return updated;
      }),
    );

    return updated;
  }

  async addMessage(input: {
    meetingId: string;
    senderName: string;
    senderUserId?: string;
    body: string;
  }): Promise<MeetingMessageRecord> {
    const message: MeetingMessageRecord = {
      id: randomUUID(),
      meetingId: input.meetingId,
      senderUserId: input.senderUserId,
      senderName: input.senderName,
      body: input.body,
      createdAt: new Date().toISOString(),
    };

    const current = this.messages.get(input.meetingId) ?? [];
    this.messages.set(input.meetingId, [...current, message]);
    return message;
  }

  async listMessages(meetingId: string): Promise<MeetingMessageRecord[]> {
    return this.messages.get(meetingId) ?? [];
  }
}
