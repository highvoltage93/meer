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
  isHandRaised: z.boolean().optional(),
});

export class MeetingsService {
  constructor(
    private readonly repository: MeetingsRepository,
    private readonly livekitTokenService: LivekitTokenService,
    private readonly meetingEventsService: MeetingEventsService,
  ) {}

  private async buildMeetingSnapshot(meetingId: string) {
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return null;

    return {
      ...meeting,
      participants: await this.repository.listParticipants(meetingId),
      messages: await this.repository.listMessages(meetingId),
    };
  }

  private async publishMeetingSnapshot(meetingId: string) {
    const snapshot = await this.buildMeetingSnapshot(meetingId);
    if (!snapshot) return null;
    this.meetingEventsService.publish(meetingId, snapshot);
    return snapshot;
  }

  async createMeeting(rawInput: unknown, identity: { userId: string; displayName: string }) {
    const input = createMeetingSchema.parse(rawInput);
    return this.repository.createMeeting({
      ...input,
      hostUserId: identity.userId,
      hostName: identity.displayName,
    });
  }

  async getMeeting(meetingId: string) {
    return this.buildMeetingSnapshot(meetingId);
  }

  async getMeetingByCode(code: string) {
    const meeting = await this.repository.getMeetingByCode(code);
    if (!meeting) return null;

    return {
      ...meeting,
      participants: await this.repository.listParticipants(meeting.id),
      messages: await this.repository.listMessages(meeting.id),
    };
  }

  async createJoinToken(meetingId: string, rawInput: unknown) {
    const input = joinMeetingSchema.parse(rawInput);
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return null;

    const participant = await this.repository.addParticipant({
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

    await this.publishMeetingSnapshot(meetingId);

    return {
      meetingId: meeting.id,
      roomName: meeting.code,
      participant,
      token,
      provider: this.livekitTokenService.isConfigured ? 'livekit' : 'mock',
    };
  }

  async removeParticipant(meetingId: string, participantId: string) {
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return false;

    await this.repository.removeParticipant(meetingId, participantId);
    await this.publishMeetingSnapshot(meetingId);
    return true;
  }

  async createMessage(meetingId: string, rawInput: unknown, senderUserId?: string) {
    const input = sendMessageSchema.parse(rawInput);
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return null;
    const message = await this.repository.addMessage({
      meetingId,
      senderUserId,
      senderName: input.senderName,
      body: input.body,
    });
    await this.publishMeetingSnapshot(meetingId);
    return message;
  }

  async updateParticipantState(meetingId: string, participantId: string, rawInput: unknown) {
    const input = participantStateSchema.parse(rawInput);
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return null;

    const participant = await this.repository.updateParticipantState(meetingId, participantId, input);
    if (!participant) return null;

    await this.publishMeetingSnapshot(meetingId);
    return participant;
  }

  subscribeToMeeting(meetingId: string, listener: (snapshot: unknown) => void) {
    return this.meetingEventsService.subscribe(meetingId, listener);
  }
}
