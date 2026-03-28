import { randomUUID } from 'node:crypto';
import type {
  MeetingMessageRecord,
  MeetingParticipantRecord,
  MeetingRecord,
  MeetingRole,
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

  createMeeting(input: { title: string; hostName: string }): MeetingRecord {
    const meeting: MeetingRecord = {
      id: randomUUID(),
      code: createMeetingCode(),
      title: input.title,
      hostName: input.hostName,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.meetings.set(meeting.id, meeting);
    this.participants.set(meeting.id, []);
    this.messages.set(meeting.id, []);

    return meeting;
  }

  getMeetingById(id: string) {
    return this.meetings.get(id);
  }

  getMeetingByCode(code: string) {
    return Array.from(this.meetings.values()).find((meeting) => meeting.code === code);
  }

  addParticipant(input: { meetingId: string; name: string; role: MeetingRole }): MeetingParticipantRecord {
    const participant: MeetingParticipantRecord = {
      id: randomUUID(),
      meetingId: input.meetingId,
      name: input.name,
      role: input.role,
      joinedAt: new Date().toISOString(),
      isMicOn: true,
      isCameraOn: true,
      isScreenSharing: false,
    };

    const current = this.participants.get(input.meetingId) ?? [];
    this.participants.set(input.meetingId, [...current, participant]);
    return participant;
  }

  listParticipants(meetingId: string) {
    return this.participants.get(meetingId) ?? [];
  }

  removeParticipant(meetingId: string, participantId: string) {
    const current = this.participants.get(meetingId) ?? [];
    this.participants.set(
      meetingId,
      current.filter((participant) => participant.id !== participantId),
    );
  }

  updateParticipantState(
    meetingId: string,
    participantId: string,
    patch: Partial<Pick<MeetingParticipantRecord, 'isMicOn' | 'isCameraOn' | 'isScreenSharing'>>,
  ) {
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

  addMessage(input: { meetingId: string; senderName: string; body: string }): MeetingMessageRecord {
    const message: MeetingMessageRecord = {
      id: randomUUID(),
      meetingId: input.meetingId,
      senderName: input.senderName,
      body: input.body,
      createdAt: new Date().toISOString(),
    };

    const current = this.messages.get(input.meetingId) ?? [];
    this.messages.set(input.meetingId, [...current, message]);
    return message;
  }

  listMessages(meetingId: string) {
    return this.messages.get(meetingId) ?? [];
  }
}
