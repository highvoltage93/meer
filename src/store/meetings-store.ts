import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createMeetingCode } from '@/lib/utils';
import type { ActivityEntry, JoinPreferences, Meeting, Participant } from '@/types/meeting';

type MeetingsState = {
  meetings: Record<string, Meeting>;
  activeMeetingId?: string;
  currentUserName: string;
  localPreferences: JoinPreferences;
  createMeeting: (hostName: string, title?: string) => string;
  joinMeeting: (meetingId: string, preferences: JoinPreferences) => void;
  setCurrentUserName: (name: string) => void;
  updateLocalPreferences: (patch: Partial<JoinPreferences>) => void;
  toggleParticipantMedia: (
    meetingId: string,
    participantId: string,
    key: 'isMicOn' | 'isCameraOn' | 'isScreenSharing',
  ) => void;
  addChatMessage: (meetingId: string, author: string, text: string) => void;
  leaveMeeting: (meetingId: string, participantId: string) => void;
  getMeetingByCode: (code: string) => Meeting | undefined;
};

function createBot(id: string, name: string, camera = true): Participant {
  return {
    id,
    name,
    role: 'bot',
    isMicOn: false,
    isCameraOn: camera,
    isScreenSharing: false,
    status: 'joined',
  };
}

function createSystemActivity(text: string): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    text,
    timestamp: new Date().toISOString(),
    type: 'system',
  };
}

const starterParticipants = [
  createBot('bot-design', 'Design Reviewer', true),
  createBot('bot-product', 'Product Ops', false),
];

export const useMeetingsStore = create<MeetingsState>()(
  persist(
    (set, get) => ({
      meetings: {},
      activeMeetingId: undefined,
      currentUserName: 'Guest User',
      localPreferences: {
        name: 'Guest User',
        isMicOn: true,
        isCameraOn: true,
      },
      createMeeting: (hostName, title = 'Strategy Sync') => {
        const code = createMeetingCode();
        const meetingId = crypto.randomUUID();
        const hostId = crypto.randomUUID();

        const host: Participant = {
          id: hostId,
          name: hostName,
          role: 'host',
          isMicOn: true,
          isCameraOn: true,
          isScreenSharing: false,
          status: 'joined',
        };

        const meeting: Meeting = {
          id: meetingId,
          title,
          code,
          createdAt: new Date().toISOString(),
          hostName,
          participants: [host, ...starterParticipants],
          activity: [
            createSystemActivity(`${hostName} created the meeting.`),
            createSystemActivity('Invite collaborators with the meeting code or link.'),
          ],
        };

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: meeting,
          },
          activeMeetingId: meetingId,
          currentUserName: hostName,
          localPreferences: {
            name: hostName,
            isMicOn: true,
            isCameraOn: true,
          },
        }));

        return meetingId;
      },
      joinMeeting: (meetingId, preferences) => {
        const meeting = get().meetings[meetingId];
        if (!meeting) return;

        const existing = meeting.participants.find((participant) => participant.name === preferences.name);
        const participantId = existing?.id ?? crypto.randomUUID();

        const participant: Participant = {
          id: participantId,
          name: preferences.name,
          role: existing?.role ?? 'guest',
          isMicOn: preferences.isMicOn,
          isCameraOn: preferences.isCameraOn,
          isScreenSharing: existing?.isScreenSharing ?? false,
          status: 'joined',
        };

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              participants: [
                ...meeting.participants.filter((item) => item.id !== participantId),
                participant,
              ],
              activity: [
                ...meeting.activity,
                createSystemActivity(`${preferences.name} joined the meeting.`),
              ],
            },
          },
          activeMeetingId: meetingId,
          currentUserName: preferences.name,
          localPreferences: preferences,
        }));
      },
      setCurrentUserName: (name) =>
        set((state) => ({
          currentUserName: name,
          localPreferences: {
            ...state.localPreferences,
            name,
          },
        })),
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
      addChatMessage: (meetingId, author, text) => {
        const meeting = get().meetings[meetingId];
        if (!meeting || !text.trim()) return;

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              activity: [
                ...meeting.activity,
                {
                  id: crypto.randomUUID(),
                  author,
                  text,
                  timestamp: new Date().toISOString(),
                  type: 'chat',
                },
              ],
            },
          },
        }));
      },
      leaveMeeting: (meetingId, participantId) => {
        const meeting = get().meetings[meetingId];
        if (!meeting) return;

        const participant = meeting.participants.find((item) => item.id === participantId);
        if (!participant) return;

        set((state) => ({
          meetings: {
            ...state.meetings,
            [meetingId]: {
              ...meeting,
              participants: meeting.participants.filter((item) => item.id !== participantId),
              activity: [
                ...meeting.activity,
                createSystemActivity(`${participant.name} left the meeting.`),
              ],
            },
          },
          activeMeetingId: state.activeMeetingId === meetingId ? undefined : state.activeMeetingId,
        }));
      },
      getMeetingByCode: (code) => Object.values(get().meetings).find((meeting) => meeting.code === code),
    }),
    {
      name: 'mitingo-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        meetings: state.meetings,
        activeMeetingId: state.activeMeetingId,
        currentUserName: state.currentUserName,
        localPreferences: state.localPreferences,
      }),
    },
  ),
);
