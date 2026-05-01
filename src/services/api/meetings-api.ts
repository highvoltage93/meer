import { env } from '@/config/env';
import { getAuthToken } from '@/services/api/auth-api';
import type { ActivityEntry, Meeting, MeetingParticipantStatePatch, MeetingSummary, Participant } from '@/types/meeting';

type ApiMeeting = {
  id: string;
  title: string;
  createdAt: string;
  hostName: string;
  code: string;
  pinnedParticipantId?: string;
  status: 'active' | 'ended';
  participants: Array<{
    id: string;
    userId?: string;
    name: string;
    role: 'host' | 'guest';
    joinedAt: string;
    isMicOn: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
  }>;
  messages: Array<{
    id: string;
    senderName: string;
    body: string;
    createdAt: string;
  }>;
};

type JoinTokenResponse = {
  meetingId: string;
  roomName: string;
  token: string | null;
  provider: 'livekit';
  participant: {
    id: string;
    userId?: string;
    name: string;
    role: 'host' | 'guest';
    joinedAt: string;
  };
};

type MeetingSocketOptions = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
  onReconnectScheduled?: () => void;
};

function notifySessionExpired() {
  window.dispatchEvent(new CustomEvent('mitingo:session-expired'));
}

function getMeetingsWebSocketUrl(meetingId: string) {
  const apiUrl = new URL(env.apiBaseUrl);
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = apiUrl.pathname.replace(/\/$/, '');
  const socketUrl = new URL(`${protocol}//${apiUrl.host}${basePath}/ws/meetings/${meetingId}`);
  const sessionToken = getAuthToken();
  if (sessionToken) {
    socketUrl.searchParams.set('sessionToken', sessionToken);
  }
  return socketUrl.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionToken = getAuthToken();
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}`, 'x-session-token': sessionToken } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 401) {
    notifySessionExpired();
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function toParticipant(participant: ApiMeeting['participants'][number]): Participant {
  return {
    id: participant.id,
    userId: participant.userId,
    name: participant.name,
    role: participant.role,
    isMicOn: participant.isMicOn,
    isCameraOn: participant.isCameraOn,
    isScreenSharing: participant.isScreenSharing,
    isHandRaised: participant.isHandRaised,
    status: 'joined',
  };
}

function toActivity(messages: ApiMeeting['messages'], hostName: string): ActivityEntry[] {
  return [
    {
      id: `system-${hostName}`,
      text: `${hostName} created the meeting.`,
      timestamp: new Date().toISOString(),
      type: 'system',
    },
    ...messages.map((message) => ({
      id: message.id,
      author: message.senderName,
      text: message.body,
      timestamp: message.createdAt,
      type: 'chat' as const,
    })),
  ];
}

function toMeeting(meeting: ApiMeeting): Meeting {
  return {
    id: meeting.id,
    title: meeting.title,
    createdAt: meeting.createdAt,
    hostName: meeting.hostName,
    code: meeting.code,
    pinnedParticipantId: meeting.pinnedParticipantId,
    participants: meeting.participants.map(toParticipant),
    activity: toActivity(meeting.messages, meeting.hostName),
  };
}

export const meetingsApi = {
  async createMeeting(input: { title: string; hostName: string }) {
    const meeting = await request<ApiMeeting | Omit<ApiMeeting, 'participants' | 'messages'>>('/meetings', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    const normalizedMeeting: Meeting = {
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt,
      hostName: meeting.hostName,
      code: meeting.code,
      participants: [],
      activity: [
        {
          id: `system-${meeting.id}`,
          text: `${meeting.hostName} created the meeting.`,
          timestamp: meeting.createdAt,
          type: 'system' as const,
        },
      ],
    };

    return normalizedMeeting;
  },
  async getMeeting(meetingId: string) {
    const meeting = await request<ApiMeeting>(`/meetings/${meetingId}`);
    return toMeeting(meeting);
  },
  async getMeetingByCode(code: string) {
    const meeting = await request<ApiMeeting>(`/meetings/by-code/${code}`);
    return toMeeting(meeting);
  },
  async getMyMeetings() {
    const meetings = await request<ApiMeeting[]>('/meetings/mine');
    return meetings.map(
      (meeting) =>
        ({
          id: meeting.id,
          title: meeting.title,
          createdAt: meeting.createdAt,
          hostName: meeting.hostName,
          code: meeting.code,
          participantCount: meeting.participants.length,
          messageCount: meeting.messages.length,
          status: meeting.status,
        }) satisfies MeetingSummary,
    );
  },
  async requestJoinToken(meetingId: string, participantName: string) {
    return request<JoinTokenResponse>(`/meetings/${meetingId}/join-token`, {
      method: 'POST',
      body: JSON.stringify({ participantName }),
    });
  },
  async sendMessage(meetingId: string, senderName: string, body: string) {
    return request<{ id: string; senderName: string; body: string; createdAt: string }>(
      `/meetings/${meetingId}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({ senderName, body }),
      },
    );
  },
  async leaveParticipant(meetingId: string, participantId: string) {
    await request<void>(`/meetings/${meetingId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  },
  async updateParticipantState(meetingId: string, participantId: string, patch: MeetingParticipantStatePatch) {
    return request<{
      id: string;
      isMicOn: boolean;
      isCameraOn: boolean;
      isScreenSharing: boolean;
    }>(`/meetings/${meetingId}/participants/${participantId}/state`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  async updateMeetingPin(meetingId: string, participantId: string | null) {
    return request<ApiMeeting>(`/meetings/${meetingId}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ participantId }),
    });
  },
  subscribeToMeeting(meetingId: string, onMeeting: (meeting: Meeting) => void, options?: MeetingSocketOptions) {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let isClosedManually = false;

    const connect = () => {
      socket = new WebSocket(getMeetingsWebSocketUrl(meetingId));

      socket.onopen = () => {
        options?.onOpen?.();
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as
          | { type: 'meeting'; payload: ApiMeeting }
          | { type: 'error'; message: string };

        if (payload.type === 'meeting') {
          onMeeting(toMeeting(payload.payload));
          return;
        }

        if (payload.message === 'Session required') {
          notifySessionExpired();
          isClosedManually = true;
          socket?.close();
        }
      };

      socket.onerror = () => {
        options?.onError?.();
      };

      socket.onclose = () => {
        if (isClosedManually) return;
        options?.onClose?.();
        options?.onReconnectScheduled?.();
        reconnectTimer = window.setTimeout(connect, 1000);
      };
    };

    connect();

    return {
      close() {
        isClosedManually = true;
        if (reconnectTimer) {
          window.clearTimeout(reconnectTimer);
        }
        socket?.close();
      },
    };
  },
};
