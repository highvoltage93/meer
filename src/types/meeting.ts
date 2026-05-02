export type ActivityEntry = {
  id: string;
  text: string;
  timestamp: string;
  type: 'system' | 'chat';
  author?: string;
};

export type Participant = {
  id: string;
  userId?: string;
  name: string;
  role: 'host' | 'guest' | 'bot';
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  status: 'joined' | 'waiting';
};

export type Meeting = {
  id: string;
  title: string;
  createdAt: string;
  hostName: string;
  code: string;
  status: 'active' | 'ended';
  pinnedParticipantId?: string;
  participants: Participant[];
  activity: ActivityEntry[];
};

export type MeetingSummary = {
  id: string;
  title: string;
  createdAt: string;
  hostName: string;
  code: string;
  participantCount: number;
  messageCount: number;
  status: 'active' | 'ended';
};

export type JoinPreferences = {
  name: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  selectedMicrophoneId?: string;
  selectedCameraId?: string;
};

export type MeetingParticipantStatePatch = {
  isMicOn?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
};
