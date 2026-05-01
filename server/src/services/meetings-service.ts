import { z } from 'zod';
import type { MeetingsRepository } from '../repositories/meetings-repository.js';
import { MeetingEventsService } from './meeting-events-service.js';
import { LivekitTokenService } from './livekit-token-service.js';

const createMeetingSchema = z.object({
  title: z.string().trim().min(2).max(120),
  hostName: z.string().trim().min(2).max(80).optional(),
});

const joinMeetingSchema = z.object({
  participantName: z.string().trim().min(2).max(80),
});

const sendMessageSchema = z.object({
  senderName: z.string().trim().min(2).max(80).optional(),
  body: z.string().trim().min(1).max(2000),
});

const participantStateSchema = z.object({
  isMicOn: z.boolean().optional(),
  isCameraOn: z.boolean().optional(),
  isScreenSharing: z.boolean().optional(),
  isHandRaised: z.boolean().optional(),
});

const meetingPinSchema = z.object({
  participantId: z.string().uuid().nullable(),
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

  private async getParticipantForActor(meetingId: string, participantId: string, actorUserId: string) {
    const [meeting, participants] = await Promise.all([
      this.repository.getMeetingById(meetingId),
      this.repository.listParticipants(meetingId),
    ]);

    if (!meeting) {
      return { meeting: null, participant: null, canManageRoom: false, canControlParticipant: false };
    }

    const participant = participants.find((item) => item.id === participantId) ?? null;
    const canManageRoom = meeting.hostUserId === actorUserId;
    const canControlParticipant = Boolean(participant && participant.userId === actorUserId);

    return {
      meeting,
      participant,
      canManageRoom,
      canControlParticipant,
    };
  }

  async createMeeting(rawInput: unknown, identity: { userId: string; displayName: string }) {
    const input = createMeetingSchema.parse(rawInput);
    return this.repository.createMeeting({
      title: input.title,
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

  async listMeetingsByHostUserId(userId: string) {
    const meetings = await this.repository.listMeetingsByHostUserId(userId);

    return Promise.all(
      meetings.map(async (meeting) => ({
        ...meeting,
        participants: await this.repository.listParticipants(meeting.id),
        messages: await this.repository.listMessages(meeting.id),
      })),
    );
  }

  async createJoinToken(
    meetingId: string,
    rawInput: unknown,
    identity: { userId: string; displayName: string },
  ) {
    const input = joinMeetingSchema.parse(rawInput);
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return null;

    const participantName = input.participantName || identity.displayName;
    const participant = await this.repository.addParticipant({
      meetingId,
      name: participantName,
      role: identity.userId === meeting.hostUserId ? 'host' : 'guest',
      userId: identity.userId,
    });

    await this.livekitTokenService.ensureRoomExists(meeting.code);

    const token = await this.livekitTokenService.createJoinToken({
      roomName: meeting.code,
      identity: participant.id,
      participantName,
    });

    await this.publishMeetingSnapshot(meetingId);

    return {
      meetingId: meeting.id,
      roomName: meeting.code,
      participant,
      token,
      provider: 'livekit' as const,
    };
  }

  async removeParticipant(meetingId: string, participantId: string) {
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return false;

    await this.repository.removeParticipant(meetingId, participantId);
    await this.publishMeetingSnapshot(meetingId);
    return true;
  }

  async removeParticipantAsUser(meetingId: string, participantId: string, actorUserId: string) {
    const access = await this.getParticipantForActor(meetingId, participantId, actorUserId);
    if (!access.meeting || !access.participant) return null;
    if (!access.canManageRoom && !access.canControlParticipant) {
      throw new Error('FORBIDDEN');
    }

    await this.repository.removeParticipant(meetingId, participantId);

    if (access.meeting.pinnedParticipantId === participantId) {
      await this.repository.updateMeetingPin(meetingId, undefined);
    }

    await this.publishMeetingSnapshot(meetingId);
    return true;
  }

  async createMessage(
    meetingId: string,
    rawInput: unknown,
    identity: { userId: string; displayName: string },
  ) {
    const input = sendMessageSchema.parse(rawInput);
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return null;
    const message = await this.repository.addMessage({
      meetingId,
      senderUserId: identity.userId,
      senderName: identity.displayName || input.senderName || 'Guest User',
      body: input.body,
    });
    await this.publishMeetingSnapshot(meetingId);
    return message;
  }

  async updateParticipantState(
    meetingId: string,
    participantId: string,
    rawInput: unknown,
    actorUserId: string,
  ) {
    const input = participantStateSchema.parse(rawInput);
    const access = await this.getParticipantForActor(meetingId, participantId, actorUserId);
    if (!access.meeting || !access.participant) return null;
    if (!access.canManageRoom && !access.canControlParticipant) {
      throw new Error('FORBIDDEN');
    }

    const participant = await this.repository.updateParticipantState(meetingId, participantId, input);
    if (!participant) return null;

    await this.publishMeetingSnapshot(meetingId);
    return participant;
  }

  async updateMeetingPin(meetingId: string, rawInput: unknown, actorUserId: string) {
    const input = meetingPinSchema.parse(rawInput);
    const meeting = await this.repository.getMeetingById(meetingId);
    if (!meeting) return null;
    if (meeting.hostUserId !== actorUserId) {
      throw new Error('FORBIDDEN');
    }

    if (input.participantId) {
      const participants = await this.repository.listParticipants(meetingId);
      const exists = participants.some((participant) => participant.id === input.participantId);
      if (!exists) {
        return null;
      }
    }

    const updated = await this.repository.updateMeetingPin(meetingId, input.participantId ?? undefined);
    if (!updated) return null;

    return this.publishMeetingSnapshot(meetingId);
  }

  subscribeToMeeting(meetingId: string, listener: (snapshot: unknown) => void) {
    return this.meetingEventsService.subscribe(meetingId, listener);
  }
}
