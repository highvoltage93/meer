import {
  ConnectionState,
  ConnectionQuality,
  LocalTrackPublication,
  LocalParticipant,
  Room,
  RoomEvent,
  RemoteTrackPublication,
  Track,
  type RemoteParticipant,
} from 'livekit-client';
import { env } from '@/config/env';
import type {
  JoinRoomPayload,
  RealtimeParticipant,
  RealtimeProvider,
  RealtimeRoomEventHandlers,
  RealtimeRoomSnapshot,
} from '@/types/realtime';

export class LiveKitRealtimeProvider implements RealtimeProvider {
  kind: 'livekit' = 'livekit';
  private room = new Room();
  private handlers?: RealtimeRoomEventHandlers;

  constructor() {
    this.bindEvents();
  }

  async joinRoom(payload: JoinRoomPayload, handlers: RealtimeRoomEventHandlers) {
    if (!env.livekitUrl || !payload.token) {
      handlers.onError?.('LiveKit is not configured yet. Add VITE_LIVEKIT_URL and provide a join token from backend.');
      return;
    }

    this.handlers = handlers;
    handlers.onSnapshot({
      roomName: payload.roomName,
      participants: [],
      connectionState: 'connecting',
    });

    await this.room.connect(env.livekitUrl, payload.token, {
      autoSubscribe: true,
      maxRetries: 3,
    });

    await this.room.localParticipant.setMicrophoneEnabled(payload.micEnabled ?? true);
    await this.room.localParticipant.setCameraEnabled(payload.cameraEnabled ?? true);
    this.emitSnapshot();
  }

  async leaveRoom() {
    await this.room.disconnect();
    this.emitSnapshot();
  }

  async toggleMicrophone(enabled: boolean) {
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
    this.emitSnapshot();
  }

  async toggleCamera(enabled: boolean) {
    await this.room.localParticipant.setCameraEnabled(enabled);
    this.emitSnapshot();
  }

  async toggleScreenShare(enabled: boolean) {
    await this.room.localParticipant.setScreenShareEnabled(enabled);
    this.emitSnapshot();
  }

  private bindEvents() {
    this.room.on(RoomEvent.Connected, () => this.emitSnapshot());
    this.room.on(RoomEvent.Disconnected, () => this.emitSnapshot());
    this.room.on(RoomEvent.Reconnecting, () => this.emitSnapshot());
    this.room.on(RoomEvent.Reconnected, () => this.emitSnapshot());
    this.room.on(RoomEvent.ParticipantConnected, () => this.emitSnapshot());
    this.room.on(RoomEvent.ParticipantDisconnected, () => this.emitSnapshot());
    this.room.on(RoomEvent.LocalTrackPublished, () => this.emitSnapshot());
    this.room.on(RoomEvent.LocalTrackUnpublished, () => this.emitSnapshot());
    this.room.on(RoomEvent.TrackMuted, () => this.emitSnapshot());
    this.room.on(RoomEvent.TrackUnmuted, () => this.emitSnapshot());
    this.room.on(RoomEvent.TrackSubscribed, () => this.emitSnapshot());
    this.room.on(RoomEvent.TrackUnsubscribed, () => this.emitSnapshot());
  }

  private emitSnapshot() {
    if (!this.handlers) return;

    const local = this.toLocalParticipant(this.room.localParticipant);
    const remote = Array.from(this.room.remoteParticipants.values()).map((participant) =>
      this.toRemoteParticipant(participant),
    );

    const snapshot: RealtimeRoomSnapshot = {
      roomName: this.room.name,
      localParticipantId: local.id,
      participants: [local, ...remote],
      connectionState: this.mapConnectionState(this.room.state),
    };

    this.handlers.onSnapshot(snapshot);
  }

  private mapConnectionState(value: ConnectionState): RealtimeRoomSnapshot['connectionState'] {
    switch (value) {
      case ConnectionState.Connected:
        return 'connected';
      case ConnectionState.Reconnecting:
        return 'reconnecting';
      case ConnectionState.Disconnected:
        return 'disconnected';
      case ConnectionState.Connecting:
        return 'connecting';
      default:
        return 'idle';
    }
  }

  private toLocalParticipant(participant: LocalParticipant): RealtimeParticipant {
    return {
      id: participant.identity,
      name: participant.name || participant.identity,
      isLocal: true,
      isMicOn: participant.isMicrophoneEnabled,
      isCameraOn: participant.isCameraEnabled,
      isScreenSharing: participant.isScreenShareEnabled,
      audioLevel: participant.audioLevel,
      isSpeaking: participant.isSpeaking,
      connectionQuality: this.mapConnectionQuality(participant.connectionQuality),
      cameraTrack: this.extractLocalTrack(participant, Track.Source.Camera),
      screenShareTrack: this.extractLocalTrack(participant, Track.Source.ScreenShare),
    };
  }

  private toRemoteParticipant(participant: RemoteParticipant): RealtimeParticipant {
    const publications = Array.from(participant.trackPublications.values());

    return {
      id: participant.identity,
      name: participant.name || participant.identity,
      isLocal: false,
      isMicOn: publications.some((publication) => publication.kind === Track.Kind.Audio && !publication.isMuted),
      isCameraOn: publications.some(
        (publication) =>
          publication.kind === Track.Kind.Video &&
          publication.source === Track.Source.Camera &&
          !publication.isMuted,
      ),
      isScreenSharing: publications.some((publication) => publication.source === Track.Source.ScreenShare),
      audioLevel: participant.audioLevel,
      isSpeaking: participant.isSpeaking,
      connectionQuality: this.mapConnectionQuality(participant.connectionQuality),
      cameraTrack: this.extractRemoteTrack(participant, Track.Source.Camera),
      screenShareTrack: this.extractRemoteTrack(participant, Track.Source.ScreenShare),
    };
  }

  private extractLocalTrack(participant: LocalParticipant, source: Track.Source) {
    const publication = participant.getTrackPublication(source) as LocalTrackPublication | undefined;
    return publication?.track?.mediaStreamTrack ?? null;
  }

  private extractRemoteTrack(participant: RemoteParticipant, source: Track.Source) {
    const publication = participant.getTrackPublication(source) as RemoteTrackPublication | undefined;
    return publication?.track?.mediaStreamTrack ?? null;
  }

  private mapConnectionQuality(value: ConnectionQuality): RealtimeParticipant['connectionQuality'] {
    switch (value) {
      case ConnectionQuality.Excellent:
        return 'excellent';
      case ConnectionQuality.Good:
        return 'good';
      case ConnectionQuality.Poor:
        return 'poor';
      case ConnectionQuality.Lost:
        return 'lost';
      default:
        return 'unknown';
    }
  }
}
