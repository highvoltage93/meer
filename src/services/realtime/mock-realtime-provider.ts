import type {
  JoinRoomPayload,
  RealtimeParticipant,
  RealtimeProvider,
  RealtimeRoomEventHandlers,
} from '@/types/realtime';

export class MockRealtimeProvider implements RealtimeProvider {
  kind: 'mock' = 'mock';
  private participants: RealtimeParticipant[] = [];
  private roomName = '';
  private handlers?: RealtimeRoomEventHandlers;

  async joinRoom(payload: JoinRoomPayload, handlers: RealtimeRoomEventHandlers) {
    this.roomName = payload.roomName;
    this.handlers = handlers;

    this.participants = [
      {
        id: crypto.randomUUID(),
        name: payload.participantName,
        isLocal: true,
        isMicOn: payload.micEnabled ?? true,
        isCameraOn: payload.cameraEnabled ?? true,
        isScreenSharing: false,
      },
      {
        id: 'mock-reviewer',
        name: 'Design Reviewer',
        isLocal: false,
        isMicOn: false,
        isCameraOn: true,
        isScreenSharing: false,
        cameraTrack: null,
      },
    ];

    this.emit('connected');
  }

  async leaveRoom() {
    this.participants = [];
    this.emit('disconnected');
  }

  async toggleMicrophone(enabled: boolean) {
    this.updateLocal({ isMicOn: enabled });
  }

  async toggleCamera(enabled: boolean) {
    this.updateLocal({ isCameraOn: enabled });
  }

  async toggleScreenShare(enabled: boolean) {
    this.updateLocal({ isScreenSharing: enabled });
  }

  private updateLocal(patch: Partial<RealtimeParticipant>) {
    this.participants = this.participants.map((participant) =>
      participant.isLocal ? { ...participant, ...patch } : participant,
    );
    this.emit('connected');
  }

  private emit(connectionState: 'connected' | 'disconnected') {
    this.handlers?.onSnapshot({
      roomName: this.roomName,
      localParticipantId: this.participants.find((participant) => participant.isLocal)?.id,
      participants: this.participants,
      connectionState,
    });
  }
}
