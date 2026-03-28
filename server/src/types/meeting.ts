export type MeetingRole = 'host' | 'guest';

export type MeetingRecord = {
  id: string;
  code: string;
  title: string;
  hostName: string;
  status: 'active' | 'ended';
  createdAt: string;
};

export type MeetingParticipantRecord = {
  id: string;
  meetingId: string;
  name: string;
  role: MeetingRole;
  joinedAt: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
};

export type MeetingMessageRecord = {
  id: string;
  meetingId: string;
  senderName: string;
  body: string;
  createdAt: string;
};
