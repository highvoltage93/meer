import { useEffect, useMemo, useRef, useState } from 'react';
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
import { AnimatePresence, motion } from 'framer-motion';
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
import { useAuthStore } from '@/store/auth-store';
import { useCallSessionStore } from '@/store/call-session-store';
import { useMeetingsStore } from '@/store/meetings-store';
import { useNotificationsStore } from '@/store/notifications-store';
import type { Participant } from '@/types/meeting';

export function MeetingRoomPage() {
  const { meetingId = '' } = useParams();
  const navigate = useNavigate();
  const [chatDraft, setChatDraft] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [roomSyncState, setRoomSyncState] = useState<'connecting' | 'connected' | 'reconnecting' | 'offline'>(
    'connecting',
  );
  const [isRecoveringRoom, setIsRecoveringRoom] = useState(false);
  const [isUpdatingMic, setIsUpdatingMic] = useState(false);
  const [isUpdatingCamera, setIsUpdatingCamera] = useState(false);
  const [isUpdatingScreenShare, setIsUpdatingScreenShare] = useState(false);
  const [isUpdatingHand, setIsUpdatingHand] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [isSwitchingMicDevice, setIsSwitchingMicDevice] = useState(false);
  const [isSwitchingCameraDevice, setIsSwitchingCameraDevice] = useState(false);
  const meeting = useMeetingsStore((state) => state.meetings[meetingId]);
  const fetchMeeting = useMeetingsStore((state) => state.fetchMeeting);
  const currentUserName = useMeetingsStore((state) => state.currentUserName);
  const currentParticipantId = useMeetingsStore((state) => state.currentParticipantId);
  const setCurrentUserName = useMeetingsStore((state) => state.setCurrentUserName);
  const setCurrentParticipantId = useMeetingsStore((state) => state.setCurrentParticipantId);
  const preferences = useMeetingsStore((state) => state.localPreferences);
  const updateLocalPreferences = useMeetingsStore((state) => state.updateLocalPreferences);
  const syncMeeting = useMeetingsStore((state) => state.syncMeeting);
  const realtimeState = useCallSessionStore((state) => state.connectionState);
  const realtimeParticipants = useCallSessionStore((state) => state.participants);
  const joinRealtimeRoom = useCallSessionStore((state) => state.joinRoom);
  const leaveRealtimeRoom = useCallSessionStore((state) => state.leaveRoom);
  const toggleMicrophone = useCallSessionStore((state) => state.toggleMicrophone);
  const toggleCamera = useCallSessionStore((state) => state.toggleCamera);
  const toggleScreenShare = useCallSessionStore((state) => state.toggleScreenShare);
  const switchMicrophoneDevice = useCallSessionStore((state) => state.switchMicrophoneDevice);
  const switchCameraDevice = useCallSessionStore((state) => state.switchCameraDevice);
  const authUser = useAuthStore((state) => state.user);
  const addNotification = useNotificationsStore((state) => state.addNotification);
  const { audioInputs, videoInputs } = useMediaDevices();
  const { stream } = useLocalMedia({
    video: preferences.isCameraOn,
    audio: preferences.isMicOn,
    videoDeviceId: preferences.selectedCameraId,
    audioDeviceId: preferences.selectedMicrophoneId,
  });

  useEffect(() => {
    if (!meetingId) {
      navigate('/', { replace: true });
      return;
    }

    if (!meetingId) return;
    void fetchMeeting(meetingId);
    let previousParticipants = new Map<string, string>();
    let hasOpenedSocket = false;
    const source = meetingsApi.subscribeToMeeting(meetingId, (nextMeeting) => {
      const nextIds = new Set(nextMeeting.participants.map((participant) => participant.id));
      const joined = nextMeeting.participants.filter((participant) => !previousParticipants.has(participant.id));
      const left = Array.from(previousParticipants.entries()).filter(([id]) => !nextIds.has(id));

      if (previousParticipants.size) {
        if (joined.length) {
          joined.forEach((participant) => {
            addNotification({
              title: 'Participant joined',
              message: `${participant.name} joined the room.`,
              variant: 'success',
            });
          });
        }

        if (left.length) {
          left.forEach(([, name]) => {
            addNotification({
              title: 'Participant left',
              message: `${name} left the room.`,
              variant: 'info',
            });
          });
        }
      }

      previousParticipants = new Map(nextMeeting.participants.map((participant) => [participant.id, participant.name]));
      syncMeeting(nextMeeting);
    }, {
      onOpen: () => {
        setRoomSyncState('connected');
        if (hasOpenedSocket) {
          addNotification({
            title: 'Room sync restored',
            message: 'Messages and participant state are live again.',
            variant: 'success',
          });
        }
        hasOpenedSocket = true;
      },
      onClose: () => {
        setRoomSyncState('offline');
      },
      onError: () => {
        setRoomSyncState('offline');
        addNotification({
          title: 'Room sync issue',
          message: 'Trying to reconnect to the meeting socket.',
          variant: 'warning',
        });
      },
      onReconnectScheduled: () => {
        setRoomSyncState('reconnecting');
      },
    });

    return () => {
      source.close();
    };
  }, [addNotification, fetchMeeting, meetingId, navigate, syncMeeting]);

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
      if (a.id === currentParticipantId) return -1;
      if (b.id === currentParticipantId) return 1;
      if (a.userId && a.userId === authUser?.id) return -1;
      if (b.userId && b.userId === authUser?.id) return 1;
      if (a.isScreenSharing && !b.isScreenSharing) return -1;
      if (!a.isScreenSharing && b.isScreenSharing) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [authUser?.id, currentParticipantId, meeting, realtimeParticipants]);

  const localRealtimeParticipant = realtimeParticipants.find((participant) => participant.isLocal);
  const currentParticipant =
    mergedParticipants.find((participant) => participant.id === currentParticipantId) ??
    mergedParticipants.find((participant) => participant.id === localRealtimeParticipant?.id) ??
    mergedParticipants.find((participant) => participant.userId === authUser?.id) ??
    mergedParticipants.find((participant) => participant.name === currentUserName);

  useEffect(() => {
    if (!meetingId || !meeting || currentParticipant || isRecoveringRoom) return;

    const recoveryName =
      preferences.name?.trim() && preferences.name !== 'Guest User'
        ? preferences.name.trim()
        : authUser?.displayName?.trim();

    if (!recoveryName) {
      navigate(`/meeting/${meetingId}/prejoin`, { replace: true });
      return;
    }

    let cancelled = false;

    async function recoverRoom() {
      const participantName = recoveryName;
      if (!participantName) {
        navigate(`/meeting/${meetingId}/prejoin`, { replace: true });
        return;
      }

        try {
          setIsRecoveringRoom(true);
          const joinPayload = await meetingsApi.requestJoinToken(meetingId, participantName);
        setCurrentUserName(participantName);
        setCurrentParticipantId(joinPayload.participant.id);
        await fetchMeeting(meetingId);
        await joinRealtimeRoom(joinPayload.roomName, participantName, joinPayload.token ?? undefined, {
          micEnabled: preferences.isMicOn,
          cameraEnabled: preferences.isCameraOn,
        });
      } catch {
        if (!cancelled) {
          navigate(`/meeting/${meetingId}/prejoin`, { replace: true });
        }
      } finally {
        if (!cancelled) {
          setIsRecoveringRoom(false);
        }
      }
    }

    void recoverRoom();

    return () => {
      cancelled = true;
    };
  }, [
    authUser?.displayName,
    currentParticipant,
    fetchMeeting,
    isRecoveringRoom,
    joinRealtimeRoom,
    meeting,
    meetingId,
    navigate,
    preferences.isCameraOn,
    preferences.isMicOn,
    preferences.name,
    setCurrentParticipantId,
    setCurrentUserName,
  ]);

  if (!meeting || !currentParticipant) {
    return (
      <HeroShell className="items-center justify-center">
        <Card className="max-w-lg">
          <CardContent className="space-y-4">
            <h1 className="text-3xl font-semibold">{isRecoveringRoom ? 'Restoring your room' : 'Redirecting to setup'}</h1>
            <p className="text-slate-400">
              {isRecoveringRoom
                ? 'We are restoring your participant session after refresh or a direct invite link.'
                : 'We are taking you to the pre-join screen so the room state can initialize correctly.'}
            </p>
            <Button asChild>
              <Link to={`/meeting/${meetingId}/prejoin`}>Open pre-join</Link>
            </Button>
          </CardContent>
        </Card>
      </HeroShell>
    );
  }

  const roomParticipant = currentParticipant;
  const roomParticipantIsHost = roomParticipant.role === 'host';
  const micEnabled = localRealtimeParticipant?.isMicOn ?? roomParticipant.isMicOn;
  const cameraEnabled = localRealtimeParticipant?.isCameraOn ?? roomParticipant.isCameraOn;
  const screenShareEnabled = localRealtimeParticipant?.isScreenSharing ?? roomParticipant.isScreenSharing;
  const inviteUrl = `${window.location.origin}/meeting/${meetingId}/prejoin`;
  const pinnedParticipantId = meeting.pinnedParticipantId ?? null;
  const activeSpeaker = realtimeParticipants
    .filter((participant) => participant.isSpeaking)
    .sort((a, b) => (b.audioLevel ?? 0) - (a.audioLevel ?? 0))[0];
  const primaryParticipant =
    mergedParticipants.find((participant) => participant.id === pinnedParticipantId) ??
    mergedParticipants.find((participant) => participant.isScreenSharing) ??
    mergedParticipants.find((participant) => participant.id === activeSpeaker?.id) ??
    roomParticipant;
  const secondaryParticipants = mergedParticipants.filter((participant) => participant.id !== primaryParticipant.id);
  const chatEntries = meeting.activity.filter((entry) => entry.type === 'chat');

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [meeting.activity.length]);

  function pushToast(text: string) {
    addNotification({
      title: 'Meeting update',
      message: text,
      variant: 'warning',
    });
  }

  async function handleToggleMicrophone() {
    const next = !micEnabled;
    setIsUpdatingMic(true);
    try {
      await toggleMicrophone(next);
      updateLocalPreferences({ isMicOn: next });
      await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isMicOn: next });
    } catch {
      await toggleMicrophone(!next);
      updateLocalPreferences({ isMicOn: !next });
      pushToast('Unable to update microphone state right now.');
    } finally {
      setIsUpdatingMic(false);
    }
  }

  async function handleToggleCamera() {
    const next = !cameraEnabled;
    setIsUpdatingCamera(true);
    try {
      await toggleCamera(next);
      updateLocalPreferences({ isCameraOn: next });
      await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isCameraOn: next });
    } catch {
      await toggleCamera(!next);
      updateLocalPreferences({ isCameraOn: !next });
      pushToast('Unable to update camera state right now.');
    } finally {
      setIsUpdatingCamera(false);
    }
  }

  async function handleToggleScreenShare() {
    const next = !screenShareEnabled;
    setIsUpdatingScreenShare(true);
    try {
      await toggleScreenShare(next);
      await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isScreenSharing: next });
    } catch {
      await toggleScreenShare(!next);
      pushToast('Screen share could not be updated.');
    } finally {
      setIsUpdatingScreenShare(false);
    }
  }

  async function handleToggleHandRaise() {
    const next = !roomParticipant.isHandRaised;
    setIsUpdatingHand(true);
    try {
      await meetingsApi.updateParticipantState(meetingId, roomParticipant.id, { isHandRaised: next });
    } catch {
      pushToast('Unable to update raised hand status.');
    } finally {
      setIsUpdatingHand(false);
    }
  }

  async function handleSendChat() {
    if (!chatDraft.trim()) return;
    const message = chatDraft.trim();
    setChatDraft('');
    setIsSendingChat(true);
    try {
      await meetingsApi.sendMessage(meetingId, roomParticipant.name, message);
    } catch {
      setChatDraft(message);
      pushToast('Message was not sent. Please try again.');
    } finally {
      setIsSendingChat(false);
    }
  }

  async function handleTogglePin(participantId: string) {
    if (!roomParticipantIsHost) return;
    const nextPinnedId = pinnedParticipantId === participantId ? null : participantId;
    setIsUpdatingPin(true);
    try {
      await meetingsApi.updateMeetingPin(meetingId, nextPinnedId);
    } catch {
      pushToast('Unable to update shared pin right now.');
    } finally {
      setIsUpdatingPin(false);
    }
  }

  async function handleSwitchMicrophoneDevice(deviceId?: string) {
    updateLocalPreferences({ selectedMicrophoneId: deviceId });
    if (!meetingId || realtimeState === 'idle' || realtimeState === 'disconnected') return;

    setIsSwitchingMicDevice(true);
    try {
      await switchMicrophoneDevice(deviceId);
    } catch {
      pushToast('Microphone switch failed.');
    } finally {
      setIsSwitchingMicDevice(false);
    }
  }

  async function handleSwitchCameraDevice(deviceId?: string) {
    updateLocalPreferences({ selectedCameraId: deviceId });
    if (!meetingId || realtimeState === 'idle' || realtimeState === 'disconnected') return;

    setIsSwitchingCameraDevice(true);
    try {
      await switchCameraDevice(deviceId);
    } catch {
      pushToast('Camera switch failed.');
    } finally {
      setIsSwitchingCameraDevice(false);
    }
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
          <Badge variant={roomSyncState === 'connected' ? 'success' : 'default'}>socket {roomSyncState}</Badge>
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
                  {pinnedParticipantId && roomParticipantIsHost ? (
                    <Button variant="outline" size="sm" onClick={() => void handleTogglePin(primaryParticipant.id)}>
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
                    onClick={roomParticipantIsHost ? () => void handleTogglePin(participant.id) : undefined}
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
                  variant={micEnabled ? 'secondary' : 'destructive'}
                  size="icon"
                  disabled={isUpdatingMic}
                  onClick={() => void handleToggleMicrophone()}
                >
                  {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={cameraEnabled ? 'secondary' : 'destructive'}
                  size="icon"
                  disabled={isUpdatingCamera}
                  onClick={() => void handleToggleCamera()}
                >
                  {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={screenShareEnabled ? 'accent' : 'outline'}
                  size="icon"
                  disabled={isUpdatingScreenShare}
                  onClick={() => void handleToggleScreenShare()}
                >
                  <MonitorUp className="h-4 w-4" />
                </Button>
                <Button
                  variant={roomParticipant.isHandRaised ? 'accent' : 'outline'}
                  size="icon"
                  disabled={isUpdatingHand}
                  onClick={() => void handleToggleHandRaise()}
                >
                  <Hand className="h-4 w-4" />
                </Button>

                <select
                  className="h-11 rounded-full border border-white/12 bg-black/20 px-4 text-sm text-white"
                  value={preferences.selectedMicrophoneId ?? ''}
                  disabled={isSwitchingMicDevice}
                  onChange={(event) => void handleSwitchMicrophoneDevice(event.target.value || undefined)}
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
                  disabled={isSwitchingCameraDevice}
                  onChange={(event) => void handleSwitchCameraDevice(event.target.value || undefined)}
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
                    navigate('/', { replace: true });
                    setCurrentParticipantId(undefined);
                    try {
                      await leaveRealtimeRoom();
                      await meetingsApi.leaveParticipant(meetingId, roomParticipant.id);
                    } catch {
                      // Navigation should not be blocked by realtime or cleanup failures.
                    }
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
                <div
                  ref={chatScrollRef}
                  className="mt-5 min-h-[26rem] flex-1 space-y-4 overflow-y-auto rounded-[24px] border border-white/8 bg-black/16 p-4 pr-2"
                >
                  {chatEntries.length ? (
                    <AnimatePresence initial={false}>
                      {meeting.activity.map((entry) => {
                        const isMine = entry.type === 'chat' && entry.author === roomParticipant.name;
                        const time = new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        if (entry.type === 'system') {
                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="flex justify-center"
                            >
                              <span className="rounded-full border border-white/8 bg-white/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                {entry.text}
                              </span>
                            </motion.div>
                          );
                        }

                        return (
                          <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[82%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                              <div className={`flex items-center gap-2 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                <p className="text-xs font-medium text-slate-300">{isMine ? 'You' : entry.author}</p>
                                <span className="text-[11px] text-slate-500">{time}</span>
                              </div>
                              <div
                                className={`rounded-[20px] px-4 py-3 text-sm leading-6 shadow-lg ${
                                  isMine
                                    ? 'rounded-br-md bg-cyan-300 text-slate-950'
                                    : 'rounded-bl-md border border-white/8 bg-white/10 text-slate-100'
                                }`}
                              >
                                {entry.text}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <div className="grid h-full min-h-[20rem] place-items-center text-center">
                      <div>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-white">No messages yet</p>
                        <p className="mt-2 max-w-56 text-sm leading-6 text-slate-400">
                          Start the room chat. Messages are saved and synced through the backend.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <form
                  className="mt-4 flex items-end gap-3 rounded-[24px] border border-white/8 bg-black/18 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSendChat();
                  }}
                >
                  <Input
                    className="min-h-12 rounded-[18px] border-0 bg-transparent px-3"
                    placeholder="Send a message"
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="accent"
                    size="icon"
                    disabled={isSendingChat || !chatDraft.trim()}
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                </form>
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
                      {participant.id === roomParticipant.id || participant.userId === authUser?.id ? (
                        <Badge variant="accent">You</Badge>
                      ) : null}
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
