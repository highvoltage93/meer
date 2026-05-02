import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { meetingsApi } from '@/services/api/meetings-api';
import type { ActivityEntry, JoinPreferences, Meeting, Participant } from '@/types/meeting';

type MeetingsState = {
  meetings: Record<string, Meeting>;
  activeMeetingId?: string;
  currentUserName: string;
  currentParticipantId?: string;
  localPreferences: JoinPreferences;
  isLoading: boolean;
  error?: string;
  createMeeting: (hostName: string, title?: string) => Promise<string>;
  fetchMeeting: (meetingId: string) => Promise<Meeting | null>;
  fetchMeetingByCode: (code: string) => Promise<Meeting | null>;
  joinMeeting: (meetingId: string, preferences: JoinPreferences) => Promise<void>;
  syncMeeting: (meeting: Meeting) => void;
  setCurrentUserName: (name: string) => void;
  setCurrentParticipantId: (participantId?: string) => void;
  updateLocalPreferences: (patch: Partial<JoinPreferences>) => void;
  toggleParticipantMedia: (
    meetingId: string,
    participantId: string,
    key: 'isMicOn' | 'isCameraOn' | 'isScreenSharing',
  ) => void;
  addChatMessage: (
    meetingId: string,
    author: string,
    text: string,
  ) => Promise<{ id: string; senderName: string; body: string; createdAt: string } | undefined>;
  appendRealtimeChatMessage: (
    meetingId: string,
    message: { id: string; author: string; text: string; timestamp: string },
  ) => void;
  patchParticipantState: (
    meetingId: string,
    participantId: string,
    patch: Partial<Pick<Participant, 'isMicOn' | 'isCameraOn' | 'isScreenSharing' | 'isHandRaised'>>,
  ) => void;
  leaveMeeting: (meetingId: string, participantId: string) => void;
  getMeetingByCode: (code: string) => Meeting | undefined;
};

function createSystemActivity(text: string): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    text,
    timestamp: new Date().toISOString(),
    type: 'system',
  };
}

export const useMeetingsStore = create<MeetingsState>()(
  persist(
    (set, get) => ({
      meetings: {},
      activeMeetingId: undefined,
      isLoading: false,
      error: undefined,
      currentUserName: 'Guest User',
      currentParticipantId: undefined,
      localPreferences: {
        name: 'Guest User',
        isMicOn: true,
        isCameraOn: true,
        selectedMicrophoneId: undefined,
        selectedCameraId: undefined,
      },
      createMeeting: async (hostName, title = 'Strategy Sync') => {
        set({ isLoading: true, error: undefined });

        try {
          const meeting = await meetingsApi.createMeeting({ hostName, title });

          set((state) => ({
            meetings: {
              ...state.meetings,
              [meeting.id]: meeting,
            },
            activeMeetingId: meeting.id,
            currentUserName: hostName,
            currentParticipantId: meeting.participants[0]?.id,
            localPreferences: {
              name: hostName,
              isMicOn: true,
              isCameraOn: true,
              selectedMicrophoneId: undefined,
              selectedCameraId: undefined,
            },
            isLoading: false,
          }));

          return meeting.id;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create meeting';
          set({ isLoading: false, error: message });
          throw error;
        }
      },
      fetchMeeting: async (meetingId) => {
        set({ isLoading: true, error: undefined });

        try {
          const meeting = await meetingsApi.getMeeting(meetingId);
          set((state) => ({
            meetings: {
              ...state.meetings,
              [meeting.id]: meeting,
            },
            isLoading: false,
          }));
          return meeting;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load meeting';
          set({ isLoading: false, error: message });
          return null;
        }
      },
      fetchMeetingByCode: async (code) => {
        set({ isLoading: true, error: undefined });

        try {
          const meeting = await meetingsApi.getMeetingByCode(code);
          set((state) => ({
            meetings: {
              ...state.meetings,
              [meeting.id]: meeting,
            },
            isLoading: false,
          }));
          return meeting;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to find meeting';
          set({ isLoading: false, error: message });
          return null;
        }
      },
      joinMeeting: async (meetingId, preferences) => {
        const cachedMeeting = get().meetings[meetingId];
        const resolvedMeeting = cachedMeeting ?? (await get().fetchMeeting(meetingId)) ?? undefined;
        if (!resolvedMeeting) {
          return;
        }

        const existing = resolvedMeeting.participants.find((participant) => participant.name === preferences.name);
        const participantId = existing?.id ?? crypto.randomUUID();

        const participant: Participant = {
          id: participantId,
          name: preferences.name,
          role: existing?.role ?? 'guest',
          isMicOn: preferences.isMicOn,
          isCameraOn: preferences.isCameraOn,
          isScreenSharing: existing?.isScreenSharing ?? false,
          isHandRaised: existing?.isHandRaised ?? false,
          status: 'joined',
        };

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...resolvedMeeting,
              participants: [
                ...resolvedMeeting.participants.filter((item) => item.id !== participantId),
                participant,
              ],
              activity: [
                ...resolvedMeeting.activity,
                createSystemActivity(`${preferences.name} joined the meeting.`),
              ],
            },
          },
          activeMeetingId: meetingId,
          currentUserName: preferences.name,
          localPreferences: preferences,
        }));
      },
      syncMeeting: (meeting) =>
        set((state) => ({
          meetings: {
            ...state.meetings,
            [meeting.id]: meeting,
          },
        })),
      setCurrentUserName: (name) =>
        set((state) => ({
          currentUserName: name,
          localPreferences: {
            ...state.localPreferences,
            name,
          },
        })),
      setCurrentParticipantId: (participantId) =>
        set({
          currentParticipantId: participantId,
        }),
      updateLocalPreferences: (patch) =>
        set((state) => ({
          localPreferences: {
            ...state.localPreferences,
            ...patch,
          },
        })),
      toggleParticipantMedia: (meetingId, participantId, key) => {
        const meeting = get().meetings[meetingId];
        if (!meeting) return;

        const participant = meeting.participants.find((item) => item.id === participantId);
        if (!participant) return;

        const nextValue = !participant[key];

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              participants: meeting.participants.map((item) =>
                item.id === participantId ? { ...item, [key]: nextValue } : item,
              ),
              activity: [
                ...meeting.activity,
                createSystemActivity(
                  `${participant.name} ${nextValue ? 'enabled' : 'disabled'} ${key === 'isMicOn' ? 'microphone' : key === 'isCameraOn' ? 'camera' : 'screen share'}.`,
                ),
              ],
            },
          },
        }));
      },
      addChatMessage: async (meetingId, author, text) => {
        const meeting = get().meetings[meetingId];
        if (!meeting || !text.trim()) return undefined;

        const response = await meetingsApi.sendMessage(meetingId, author, text);

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              activity: [
                ...meeting.activity,
                {
                  id: response.id,
                  author: response.senderName,
                  text: response.body,
                  timestamp: response.createdAt,
                  type: 'chat',
                },
              ],
            },
          },
        }));
        return response;
      },
      appendRealtimeChatMessage: (meetingId, message) => {
        const meeting = get().meetings[meetingId];
        if (!meeting) return;
        if (meeting.activity.some((entry) => entry.id === message.id)) return;

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              activity: [
                ...meeting.activity,
                {
                  id: message.id,
                  author: message.author,
                  text: message.text,
                  timestamp: message.timestamp,
                  type: 'chat',
                },
              ],
            },
          },
        }));
      },
      patchParticipantState: (meetingId, participantId, patch) => {
        const meeting = get().meetings[meetingId];
        if (!meeting) return;

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              participants: meeting.participants.map((participant) =>
                participant.id === participantId ? { ...participant, ...patch } : participant,
              ),
            },
          },
        }));
      },
      leaveMeeting: (meetingId, participantId) => {
        const meeting = get().meetings[meetingId];
        if (!meeting) {
          set((state) => ({
            activeMeetingId: state.activeMeetingId === meetingId ? undefined : state.activeMeetingId,
            currentParticipantId: state.currentParticipantId === participantId ? undefined : state.currentParticipantId,
          }));
          return;
        }

        const participant = meeting.participants.find((item) => item.id === participantId);

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              participants: meeting.participants.filter((item) => item.id !== participantId),
              activity: participant
                ? [...meeting.activity, createSystemActivity(`${participant.name} left the meeting.`)]
                : meeting.activity,
            },
          },
          activeMeetingId: state.activeMeetingId === meetingId ? undefined : state.activeMeetingId,
          currentParticipantId: state.currentParticipantId === participantId ? undefined : state.currentParticipantId,
        }));
      },
      getMeetingByCode: (code) => Object.values(get().meetings).find((meeting) => meeting.code === code),
    }),
    {
      name: 'mitingo-storage',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState) => ({
        ...(persistedState as Partial<MeetingsState>),
        currentParticipantId: undefined,
      }),
      partialize: (state) => ({
        meetings: state.meetings,
        activeMeetingId: state.activeMeetingId,
        currentUserName: state.currentUserName,
        localPreferences: state.localPreferences,
        error: state.error,
      }),
    },
  ),
);
