import { create } from 'zustand';
import { getRealtimeProvider } from '@/services/realtime/realtime-service';
import type { RealtimeConnectionState, RealtimeParticipant } from '@/types/realtime';

type CallSessionState = {
  roomName?: string;
  participants: RealtimeParticipant[];
  connectionState: RealtimeConnectionState;
  error?: string;
  joinRoom: (
    roomName: string,
    participantName: string,
    token?: string,
    options?: { micEnabled?: boolean; cameraEnabled?: boolean },
  ) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleMicrophone: (enabled: boolean) => Promise<void>;
  toggleCamera: (enabled: boolean) => Promise<void>;
  toggleScreenShare: (enabled: boolean) => Promise<void>;
  switchMicrophoneDevice: (deviceId?: string) => Promise<void>;
  switchCameraDevice: (deviceId?: string) => Promise<void>;
};

export const useCallSessionStore = create<CallSessionState>((set) => ({
  roomName: undefined,
  participants: [],
  connectionState: 'idle',
  error: undefined,
  async joinRoom(roomName, participantName, token, options) {
    const provider = getRealtimeProvider();

    set({
      roomName,
      error: undefined,
      connectionState: 'connecting',
    });

    await provider.joinRoom(
      {
        roomName,
        participantName,
        token,
        micEnabled: options?.micEnabled,
        cameraEnabled: options?.cameraEnabled,
      },
      {
        onSnapshot: (snapshot) =>
          set({
            roomName: snapshot.roomName,
            participants: snapshot.participants,
            connectionState: snapshot.connectionState,
          }),
        onError: (message) =>
          set({
            error: message,
            connectionState: 'error',
          }),
      },
    );
  },
  async leaveRoom() {
    await getRealtimeProvider().leaveRoom();
    set({
      roomName: undefined,
      participants: [],
      connectionState: 'disconnected',
    });
  },
  async toggleMicrophone(enabled) {
    await getRealtimeProvider().toggleMicrophone(enabled);
  },
  async toggleCamera(enabled) {
    await getRealtimeProvider().toggleCamera(enabled);
  },
  async toggleScreenShare(enabled) {
    await getRealtimeProvider().toggleScreenShare(enabled);
  },
  async switchMicrophoneDevice(deviceId) {
    await getRealtimeProvider().switchMicrophoneDevice(deviceId);
  },
  async switchCameraDevice(deviceId) {
    await getRealtimeProvider().switchCameraDevice(deviceId);
  },
}));
