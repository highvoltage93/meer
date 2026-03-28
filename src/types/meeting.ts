export type ActivityEntry = {
  id: string;
  text: string;
  timestamp: string;
  type: 'system' | 'chat';
  author?: string;
};

export type Participant = {
  id: string;
  name: string;
  role: 'host' | 'guest' | 'bot';
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  status: 'joined' | 'waiting';
};

export type Meeting = {
  id: string;
  title: string;
  createdAt: string;
  hostName: string;
  code: string;
  participants: Participant[];
  activity: ActivityEntry[];
};

export type JoinPreferences = {
  name: string;
  isMicOn: boolean;
  isCameraOn: boolean;
};

export type MeetingParticipantStatePatch = {
  isMicOn?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
};
