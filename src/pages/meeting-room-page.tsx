import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Copy,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  SendHorizonal,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { HeroShell } from '@/components/layout/hero-shell';
import { MitingoLogo } from '@/components/brand/mitingo-logo';
import { MediaPreview } from '@/components/meeting/media-preview';
import { ParticipantTile } from '@/components/meeting/participant-tile';
import { RealtimeVideoTile } from '@/components/meeting/realtime-video-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalMedia } from '@/hooks/use-local-media';
import { useMediaDevices } from '@/hooks/use-media-devices';
import { meetingsApi } from '@/services/api/meetings-api';
import { useCallSessionStore } from '@/store/call-session-store';
import { useMeetingsStore } from '@/store/meetings-store';
import type { Participant } from '@/types/meeting';

export function MeetingRoomPage() {
  const { meetingId = '' } = useParams();
  const navigate = useNavigate();
  const [chatDraft, setChatDraft] = useState('');
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [roomToasts, setRoomToasts] = useState<Array<{ id: string; text: string }>>([]);
  const meeting = useMeetingsStore((state) => state.meetings[meetingId]);
  const fetchMeeting = useMeetingsStore((state) => state.fetchMeeting);
  const currentUserName = useMeetingsStore((state) => state.currentUserName);
  const currentParticipantId = useMeetingsStore((state) => state.currentParticipantId);
  const preferences = useMeetingsStore((state) => state.localPreferences);
  const updateLocalPreferences = useMeetingsStore((state) => state.updateLocalPreferences);
  const toggleParticipantMedia = useMeetingsStore((state) => state.toggleParticipantMedia);
  const addChatMessage = useMeetingsStore((state) => state.addChatMessage);
  const syncMeeting = useMeetingsStore((state) => state.syncMeeting);
  const realtimeState = useCallSessionStore((state) => state.connectionState);
  const realtimeParticipants = useCallSessionStore((state) => state.participants);
  const leaveRealtimeRoom = useCallSessionStore((state) => state.leaveRoom);
  const toggleMicrophone = useCallSessionStore((state) => state.toggleMicrophone);
  const toggleCamera = useCallSessionStore((state) => state.toggleCamera);
  const toggleScreenShare = useCallSessionStore((state) => state.toggleScreenShare);
  const { audioInputs, videoInputs } = useMediaDevices();
  const { stream } = useLocalMedia({
    video: preferences.isCameraOn,
    audio: preferences.isMicOn,
    videoDeviceId: preferences.selectedCameraId,
    audioDeviceId: preferences.selectedMicrophoneId,
  });

  useEffect(() => {
    if (!meetingId) return;
    void fetchMeeting(meetingId);
    let previousParticipantIds = new Set<string>();
    const source = meetingsApi.subscribeToMeeting(meetingId, (nextMeeting) => {
      const nextIds = new Set(nextMeeting.participants.map((participant) => participant.id));
      const joined = nextMeeting.participants.filter((participant) => !previousParticipantIds.has(participant.id));
      const left = Array.from(previousParticipantIds).filter((id) => !nextIds.has(id));

      if (previousParticipantIds.size) {
        if (joined.length) {
          setRoomToasts((state) => [
            ...state,
            ...joined.map((participant) => ({
              id: crypto.randomUUID(),
              text: `${participant.name} joined the room`,
            })),
          ]);
        }

        if (left.length) {
          setRoomToasts((state) => [
            ...state,
            ...left.map((id) => ({
              id: crypto.randomUUID(),
              text: `A participant left the room`,
            })),
          ]);
        }
      }

      previousParticipantIds = nextIds;
      syncMeeting(nextMeeting);
    });

    return () => {
      source.close();
    };
  }, [fetchMeeting, meetingId, syncMeeting]);

  useEffect(() => {
    if (!roomToasts.length) return;
    const timer = window.setTimeout(() => {
      setRoomToasts((state) => state.slice(1));
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [roomToasts]);

  const mergedParticipants = useMemo(() => {
    if (!meeting) return [] as Array<Participant & { realtimeKey: string; hasRealtime: boolean }>;

    const byId = new Map<string, Participant & { realtimeKey: string; hasRealtime: boolean }>();

    for (const participant of meeting.participants) {
      byId.set(participant.id, {
        ...participant,
        realtimeKey: participant.id,
        hasRealtime: false,
      });
    }

    for (const realtime of realtimeParticipants) {
      const existing = byId.get(realtime.id);

      if (existing) {
        byId.set(realtime.id, {
          ...existing,
          isMicOn: realtime.isMicOn,
          isCameraOn: realtime.isCameraOn,
          isScreenSharing: realtime.isScreenSharing,
          realtimeKey: realtime.id,
          hasRealtime: true,
        });
        continue;
      }

      byId.set(realtime.id, {
        id: realtime.id,
        name: realtime.name,
        role: realtime.isLocal ? 'host' : 'guest',
        isMicOn: realtime.isMicOn,
        isCameraOn: realtime.isCameraOn,
        isScreenSharing: realtime.isScreenSharing,
        isHandRaised: false,
        status: 'joined',
        realtimeKey: realtime.id,
        hasRealtime: true,
      });
    }

    return Array.from(byId.values()).sort((a, b) => {
      if (a.name === currentUserName) return -1;
      if (b.name === currentUserName) return 1;
      if (a.isScreenSharing && !b.isScreenSharing) return -1;
      if (!a.isScreenSharing && b.isScreenSharing) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [currentUserName, meeting, realtimeParticipants]);

  const localRealtimeParticipant = realtimeParticipants.find((participant) => participant.isLocal);
  const currentParticipant =
    mergedParticipants.find((participant) => participant.id === currentParticipantId) ??
    mergedParticipants.find((participant) => participant.id === localRealtimeParticipant?.id) ??
    mergedParticipants.find((participant) => participant.name === currentUserName);

  if (!meeting || !currentParticipant) {
    return (
      <HeroShell className="items-center justify-center">
        <Card className="max-w-lg">
          <CardContent className="space-y-4">
            <h1 className="text-3xl font-semibold">You are not in this meeting</h1>
            <p className="text-slate-400">Open the pre-join screen first and enter the room from there.</p>
            <Button asChild>
              <Link to="/">Back home</Link>
            </Button>
          </CardContent>
        </Card>
      </HeroShell>
    );
  }

  const roomParticipant = currentParticipant;
  const inviteUrl = `${window.location.origin}/meeting/${meetingId}/prejoin`;
  const activeSpeaker = realtimeParticipants
    .filter((participant) => participant.isSpeaking)
    .sort((a, b) => (b.audioLevel ?? 0) - (a.audioLevel ?? 0))[0];
  const primaryParticipant =
    mergedParticipants.find((participant) => participant.id === pinnedParticipantId) ??
    mergedParticipants.find((participant) => participant.isScreenSharing) ??
    mergedParticipants.find((participant) => participant.id === activeSpeaker?.id) ??
    roomParticipant;
  const secondaryParticipants = mergedParticipants.filter((participant) => participant.id !== primaryParticipant.id);

  async function handleToggleMicrophone() {
    const next = !(localRealtimeParticipant?.isMicOn ?? roomParticipant.isMicOn);
    toggleParticipantMedia(meetingId, roomParticipant.id, 'isMicOn');
    updateLocalPreferences({ isMicOn: next });
    await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isMicOn: next });
    await toggleMicrophone(next);
  }

  async function handleToggleCamera() {
    const next = !(localRealtimeParticipant?.isCameraOn ?? roomParticipant.isCameraOn);
    toggleParticipantMedia(meetingId, roomParticipant.id, 'isCameraOn');
    updateLocalPreferences({ isCameraOn: next });
    await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isCameraOn: next });
    await toggleCamera(next);
  }

  async function handleToggleScreenShare() {
    const next = !(localRealtimeParticipant?.isScreenSharing ?? roomParticipant.isScreenSharing);
    toggleParticipantMedia(meetingId, roomParticipant.id, 'isScreenSharing');
    await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isScreenSharing: next });
    await toggleScreenShare(next);
  }

  async function handleToggleHandRaise() {
    const next = !roomParticipant.isHandRaised;
    await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isHandRaised: next });
  }

  async function handleSendChat() {
    if (!chatDraft.trim()) return;
    const message = chatDraft;
    setChatDraft('');
    await addChatMessage(meetingId, roomParticipant.name, message);
  }

  return (
    <HeroShell>
      <header className="flex flex-col gap-4 py-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <MitingoLogo />
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">Live room</p>
            <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="success">{mergedParticipants.length} participants</Badge>
          <Badge>{meeting.code}</Badge>
          <Badge>{realtimeState}</Badge>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteUrl);
            }}
          >
            <Copy className="h-4 w-4" />
            Copy invite
          </Button>
        </div>
      </header>

      {realtimeState === 'reconnecting' || realtimeState === 'error' ? (
        <div className="mb-4 rounded-[24px] border border-amber-300/25 bg-amber-300/10 px-5 py-4 text-sm text-amber-100">
          {realtimeState === 'reconnecting'
            ? 'Connection is recovering. Media and participant state may update with a short delay.'
            : 'Realtime connection hit an error. Try leaving and rejoining the room.'}
        </div>
      ) : null}

      {roomToasts.length ? (
        <div className="pointer-events-none fixed right-6 top-6 z-50 flex max-w-sm flex-col gap-3">
          {roomToasts.map((toast) => (
            <div key={toast.id} className="rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white shadow-2xl">
              {toast.text}
            </div>
          ))}
        </div>
      ) : null}

      <section className="grid flex-1 gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Main stage</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{primaryParticipant.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {primaryParticipant.isScreenSharing ? <Badge variant="accent">Screen share</Badge> : null}
                  {primaryParticipant.id === activeSpeaker?.id ? <Badge variant="success">Speaking</Badge> : null}
                  {primaryParticipant.isHandRaised ? <Badge>Hand raised</Badge> : null}
                  {pinnedParticipantId ? (
                    <Button variant="outline" size="sm" onClick={() => setPinnedParticipantId(null)}>
                      Clear pin
                    </Button>
                  ) : null}
                </div>
              </div>

              {(() => {
                const realtime = realtimeParticipants.find((item) => item.id === primaryParticipant.id);
                const track = realtime?.screenShareTrack ?? realtime?.cameraTrack;

                return (
                  <ParticipantTile
                    participant={primaryParticipant}
                    isActive={primaryParticipant.id === roomParticipant.id}
                    isPinned={primaryParticipant.id === pinnedParticipantId}
                    videoElement={
                      track ? (
                        <RealtimeVideoTile track={track} muted={realtime?.isLocal} />
                      ) : primaryParticipant.id === roomParticipant.id ? (
                        <MediaPreview
                          stream={stream}
                          enabled={preferences.isCameraOn}
                          className="h-full rounded-none"
                        />
                      ) : undefined
                    }
                  />
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {secondaryParticipants.map((participant) => {
              const realtime = realtimeParticipants.find((item) => item.id === participant.id);
              const track = realtime?.screenShareTrack ?? realtime?.cameraTrack;

              return (
                <ParticipantTile
                  key={participant.realtimeKey}
                  participant={participant}
                  isActive={participant.id === roomParticipant.id}
                  isPinned={participant.id === pinnedParticipantId}
                  onClick={() =>
                    setPinnedParticipantId((current) => (current === participant.id ? null : participant.id))
                  }
                  videoElement={
                    track ? (
                      <RealtimeVideoTile track={track} muted={realtime?.isLocal} />
                    ) : participant.id === roomParticipant.id ? (
                      <MediaPreview
                        stream={stream}
                        enabled={preferences.isCameraOn}
                        className="h-full rounded-none"
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant={roomParticipant.isMicOn ? 'secondary' : 'destructive'}
                  size="icon"
                  onClick={() => void handleToggleMicrophone()}
                >
                  {roomParticipant.isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={roomParticipant.isCameraOn ? 'secondary' : 'destructive'}
                  size="icon"
                  onClick={() => void handleToggleCamera()}
                >
                  {roomParticipant.isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={roomParticipant.isScreenSharing ? 'accent' : 'outline'}
                  size="icon"
                  onClick={() => void handleToggleScreenShare()}
                >
                  <MonitorUp className="h-4 w-4" />
                </Button>
                <Button
                  variant={roomParticipant.isHandRaised ? 'accent' : 'outline'}
                  size="icon"
                  onClick={() => void handleToggleHandRaise()}
                >
                  <Hand className="h-4 w-4" />
                </Button>

                <select
                  className="h-11 rounded-full border border-white/12 bg-black/20 px-4 text-sm text-white"
                  value={preferences.selectedMicrophoneId ?? ''}
                  onChange={(event) =>
                    updateLocalPreferences({ selectedMicrophoneId: event.target.value || undefined })
                  }
                >
                  <option value="">Default mic</option>
                  {audioInputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>

                <select
                  className="h-11 rounded-full border border-white/12 bg-black/20 px-4 text-sm text-white"
                  value={preferences.selectedCameraId ?? ''}
                  onChange={(event) =>
                    updateLocalPreferences({ selectedCameraId: event.target.value || undefined })
                  }
                >
                  <option value="">Default cam</option>
                  {videoInputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span>
                  {realtimeParticipants.length > 1
                    ? 'Remote participants connected'
                    : 'Waiting for another participant'}
                </span>
                <Button
                  variant="destructive"
                  onClick={async () => {
                  await leaveRealtimeRoom();
                  await meetingsApi.leaveParticipant(meetingId, roomParticipant.id);
                  const refreshed = await fetchMeeting(meetingId);
                  if (refreshed) {
                    syncMeeting(refreshed);
                  }
                  navigate('/');
                }}
                >
                  <PhoneOff className="h-4 w-4" />
                  Leave call
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-0">
          <CardContent className="flex h-full flex-col p-5">
            <Tabs defaultValue="chat" className="h-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="chat">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="people">
                  <Users className="mr-2 h-4 w-4" />
                  People
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex h-full flex-col">
                <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
                  {meeting.activity.map((entry) => (
                    <div key={entry.id} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">
                          {entry.type === 'chat' ? entry.author : 'System'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{entry.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-3">
                  <Input
                    placeholder="Send a message"
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSendChat();
                      }
                    }}
                  />
                  <Button variant="accent" size="icon" onClick={() => void handleSendChat()}>
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="people" className="mt-5 space-y-3">
                <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-300/8 p-4 text-sm text-slate-200">
                  Realtime provider sees {realtimeParticipants.length} participant
                  {realtimeParticipants.length === 1 ? '' : 's'} in the room.
                </div>
                {mergedParticipants.map((participant) => (
                  <div
                    key={participant.realtimeKey}
                    className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/20 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{participant.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {participant.role} | {participant.isCameraOn ? 'camera on' : 'camera off'} |{' '}
                        {participant.isMicOn ? 'mic on' : 'mic off'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {participant.id === activeSpeaker?.id ? <Badge variant="success">Speaking</Badge> : null}
                      {participant.isScreenSharing ? <Badge variant="accent">Sharing</Badge> : null}
                      {participant.isHandRaised ? <Badge>Hand raised</Badge> : null}
                      {participant.name === currentUserName ? <Badge variant="accent">You</Badge> : null}
                      {participant.hasRealtime ? <Badge variant="success">Live</Badge> : null}
                      {(() => {
                        const realtime = realtimeParticipants.find((item) => item.id === participant.id);
                        if (!realtime?.connectionQuality || realtime.connectionQuality === 'unknown') return null;
                        return <Badge>{realtime.connectionQuality}</Badge>;
                      })()}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </HeroShell>
  );
}
