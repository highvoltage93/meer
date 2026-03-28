import type {
  MeetingMessageRecord,
  MeetingParticipantRecord,
  MeetingRecord,
  MeetingRole,
} from '../types/meeting.js';

export interface MeetingsRepository {
  createMeeting(input: { title: string; hostName: string }): MeetingRecord;
  getMeetingById(id: string): MeetingRecord | undefined;
  getMeetingByCode(code: string): MeetingRecord | undefined;
  addParticipant(input: { meetingId: string; name: string; role: MeetingRole }): MeetingParticipantRecord;
  removeParticipant(meetingId: string, participantId: string): void;
  updateParticipantState(
    meetingId: string,
    participantId: string,
    patch: Partial<Pick<MeetingParticipantRecord, 'isMicOn' | 'isCameraOn' | 'isScreenSharing'>>,
  ): MeetingParticipantRecord | undefined;
  listParticipants(meetingId: string): MeetingParticipantRecord[];
  addMessage(input: { meetingId: string; senderName: string; body: string }): MeetingMessageRecord;
  listMessages(meetingId: string): MeetingMessageRecord[];
}
