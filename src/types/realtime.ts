export type RealtimeConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export type RealtimeParticipant = {
  id: string;
  name: string;
  isLocal: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  audioLevel?: number;
  isSpeaking?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'lost' | 'unknown';
  cameraTrack?: MediaStreamTrack | null;
  screenShareTrack?: MediaStreamTrack | null;
};

export type RealtimeRoomSnapshot = {
  roomName: string;
  localParticipantId?: string;
  participants: RealtimeParticipant[];
  connectionState: RealtimeConnectionState;
};

export type JoinRoomPayload = {
  roomName: string;
  participantName: string;
  token?: string;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
};

export type RealtimeRoomEventHandlers = {
  onSnapshot: (snapshot: RealtimeRoomSnapshot) => void;
  onError?: (message: string) => void;
};

export type RealtimeProvider = {
  kind: 'mock' | 'livekit';
  joinRoom: (payload: JoinRoomPayload, handlers: RealtimeRoomEventHandlers) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleMicrophone: (enabled: boolean) => Promise<void>;
  toggleCamera: (enabled: boolean) => Promise<void>;
  toggleScreenShare: (enabled: boolean) => Promise<void>;
};
