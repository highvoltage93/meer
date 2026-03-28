import { env } from '@/config/env';
import type { ActivityEntry, Meeting, MeetingParticipantStatePatch, Participant } from '@/types/meeting';

type ApiMeeting = {
  id: string;
  title: string;
  createdAt: string;
  hostName: string;
  code: string;
  status: 'active' | 'ended';
  participants: Array<{
    id: string;
    name: string;
    role: 'host' | 'guest';
    joinedAt: string;
    isMicOn: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
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
  provider: 'mock' | 'livekit';
  participant: {
    id: string;
    name: string;
    role: 'host' | 'guest';
    joinedAt: string;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function toParticipant(participant: ApiMeeting['participants'][number]): Participant {
  return {
    id: participant.id,
    name: participant.name,
    role: participant.role,
    isMicOn: participant.isMicOn,
    isCameraOn: participant.isCameraOn,
    isScreenSharing: participant.isScreenSharing,
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

    return {
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt,
      hostName: meeting.hostName,
      code: meeting.code,
      participants: [
        {
          id: `host-${meeting.id}`,
          name: meeting.hostName,
          role: 'host' as const,
          isMicOn: true,
          isCameraOn: true,
          isScreenSharing: false,
          status: 'joined' as const,
        },
      ],
      activity: [
        {
          id: `system-${meeting.id}`,
          text: `${meeting.hostName} created the meeting.`,
          timestamp: meeting.createdAt,
          type: 'system' as const,
        },
      ],
    } satisfies Meeting;
  },
  async getMeeting(meetingId: string) {
    const meeting = await request<ApiMeeting>(`/meetings/${meetingId}`);
    return toMeeting(meeting);
  },
  async getMeetingByCode(code: string) {
    const meeting = await request<ApiMeeting>(`/meetings/by-code/${code}`);
    return toMeeting(meeting);
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
  subscribeToMeeting(meetingId: string, onMeeting: (meeting: Meeting) => void) {
    const source = new EventSource(`${env.apiBaseUrl}/meetings/${meetingId}/events`);
    source.addEventListener('meeting', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as ApiMeeting;
      onMeeting(toMeeting(payload));
    });
    return source;
  },
};
