import { AccessToken, RoomServiceClient, type VideoGrant } from 'livekit-server-sdk';
import type { ServerEnv } from '../config/env.js';

export class LivekitTokenService {
  private roomService?: RoomServiceClient;

  constructor(private readonly env: ServerEnv) {
    if (env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET) {
      this.roomService = new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    }
  }

  get isConfigured() {
    return Boolean(this.roomService);
  }

  async ensureRoomExists(roomName: string) {
    if (!this.roomService) return;

    try {
      await this.roomService.createRoom({
        name: roomName,
      });
    } catch {
      // Room may already exist. This backend skeleton keeps the flow tolerant.
    }
  }

  async createJoinToken(input: {
    roomName: string;
    identity: string;
    participantName: string;
    canPublish?: boolean;
    canSubscribe?: boolean;
  }) {
    if (!this.env.LIVEKIT_API_KEY || !this.env.LIVEKIT_API_SECRET) {
      return null;
    }

    const grant: VideoGrant = {
      room: input.roomName,
      roomJoin: true,
      canPublish: input.canPublish ?? true,
      canSubscribe: input.canSubscribe ?? true,
    };

    const token = new AccessToken(this.env.LIVEKIT_API_KEY, this.env.LIVEKIT_API_SECRET, {
      identity: input.identity,
      name: input.participantName,
      ttl: '10m',
    });

    token.addGrant(grant);
    return token.toJwt();
  }
}
