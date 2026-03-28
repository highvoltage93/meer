import { z } from 'zod';
import type { MeetingsRepository } from '../repositories/meetings-repository.js';
import { MeetingEventsService } from './meeting-events-service.js';
import { LivekitTokenService } from './livekit-token-service.js';

const createMeetingSchema = z.object({
  title: z.string().trim().min(2).max(120),
  hostName: z.string().trim().min(2).max(80),
});

const joinMeetingSchema = z.object({
  participantName: z.string().trim().min(2).max(80),
});

const sendMessageSchema = z.object({
  senderName: z.string().trim().min(2).max(80),
  body: z.string().trim().min(1).max(2000),
});

const participantStateSchema = z.object({
  isMicOn: z.boolean().optional(),
  isCameraOn: z.boolean().optional(),
  isScreenSharing: z.boolean().optional(),
});

export class MeetingsService {
  constructor(
    private readonly repository: MeetingsRepository,
    private readonly livekitTokenService: LivekitTokenService,
    private readonly meetingEventsService: MeetingEventsService,
  ) {}

  private buildMeetingSnapshot(meetingId: string) {
    const meeting = this.repository.getMeetingById(meetingId);
    if (!meeting) return null;

    return {
      ...meeting,
      participants: this.repository.listParticipants(meetingId),
      messages: this.repository.listMessages(meetingId),
    };
  }

  private publishMeetingSnapshot(meetingId: string) {
    const snapshot = this.buildMeetingSnapshot(meetingId);
    if (!snapshot) return null;
    this.meetingEventsService.publish(meetingId, snapshot);
    return snapshot;
  }

  createMeeting(rawInput: unknown) {
    const input = createMeetingSchema.parse(rawInput);
    return this.repository.createMeeting(input);
  }

  getMeeting(meetingId: string) {
    return this.buildMeetingSnapshot(meetingId);
  }

  getMeetingByCode(code: string) {
    const meeting = this.repository.getMeetingByCode(code);
    if (!meeting) return null;

    return {
      ...meeting,
      participants: this.repository.listParticipants(meeting.id),
      messages: this.repository.listMessages(meeting.id),
    };
  }

  async createJoinToken(meetingId: string, rawInput: unknown) {
    const input = joinMeetingSchema.parse(rawInput);
    const meeting = this.repository.getMeetingById(meetingId);
    if (!meeting) return null;

    const participant = this.repository.addParticipant({
      meetingId,
      name: input.participantName,
      role: input.participantName === meeting.hostName ? 'host' : 'guest',
    });

    await this.livekitTokenService.ensureRoomExists(meeting.code);

    const token = await this.livekitTokenService.createJoinToken({
      roomName: meeting.code,
      identity: participant.id,
      participantName: input.participantName,
    });

    this.publishMeetingSnapshot(meetingId);

    return {
      meetingId: meeting.id,
      roomName: meeting.code,
      participant,
      token,
      provider: this.livekitTokenService.isConfigured ? 'livekit' : 'mock',
    };
  }

  removeParticipant(meetingId: string, participantId: string) {
    const meeting = this.repository.getMeetingById(meetingId);
    if (!meeting) return false;

    this.repository.removeParticipant(meetingId, participantId);
    this.publishMeetingSnapshot(meetingId);
    return true;
  }

  createMessage(meetingId: string, rawInput: unknown) {
    const input = sendMessageSchema.parse(rawInput);
    const meeting = this.repository.getMeetingById(meetingId);
    if (!meeting) return null;
    const message = this.repository.addMessage({
      meetingId,
      senderName: input.senderName,
      body: input.body,
    });
    this.publishMeetingSnapshot(meetingId);
    return message;
  }

  updateParticipantState(meetingId: string, participantId: string, rawInput: unknown) {
    const input = participantStateSchema.parse(rawInput);
    const meeting = this.repository.getMeetingById(meetingId);
    if (!meeting) return null;

    const participant = this.repository.updateParticipantState(meetingId, participantId, input);
    if (!participant) return null;

    this.publishMeetingSnapshot(meetingId);
    return participant;
  }

  subscribeToMeeting(meetingId: string, listener: (snapshot: unknown) => void) {
    return this.meetingEventsService.subscribe(meetingId, listener);
  }
}
