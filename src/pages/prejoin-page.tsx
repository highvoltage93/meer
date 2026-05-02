import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { HeroShell } from '@/components/layout/hero-shell';
import { MitingoLogo } from '@/components/brand/mitingo-logo';
import { MediaPreview } from '@/components/meeting/media-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLocalMedia } from '@/hooks/use-local-media';
import { useMediaDevices } from '@/hooks/use-media-devices';
import { meetingsApi } from '@/services/api/meetings-api';
import { useAuthStore } from '@/store/auth-store';
import { useCallSessionStore } from '@/store/call-session-store';
import { useMeetingsStore } from '@/store/meetings-store';

export function PreJoinPage() {
  const { meetingId = '' } = useParams();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const isEnteringRoomRef = useRef(false);
  const stalePresenceCleanupRef = useRef<string | null>(null);
  const meeting = useMeetingsStore((state) => state.meetings[meetingId]);
  const fetchMeeting = useMeetingsStore((state) => state.fetchMeeting);
  const preferences = useMeetingsStore((state) => state.localPreferences);
  const updatePreferences = useMeetingsStore((state) => state.updateLocalPreferences);
  const setCurrentUserName = useMeetingsStore((state) => state.setCurrentUserName);
  const setCurrentParticipantId = useMeetingsStore((state) => state.setCurrentParticipantId);
  const authUser = useAuthStore((state) => state.user);
  const meetingError = useMeetingsStore((state) => state.error);
  const isLoadingMeeting = useMeetingsStore((state) => state.isLoading);
  const joinRealtimeRoom = useCallSessionStore((state) => state.joinRoom);
  const leaveRealtimeRoom = useCallSessionStore((state) => state.leaveRoom);
  const realtimeState = useCallSessionStore((state) => state.connectionState);
  const realtimeError = useCallSessionStore((state) => state.error);
  const { audioInputs, videoInputs, error: devicesError } = useMediaDevices();
  const { stream, error } = useLocalMedia({
    video: preferences.isCameraOn,
    audio: preferences.isMicOn,
    videoDeviceId: preferences.selectedCameraId,
    audioDeviceId: preferences.selectedMicrophoneId,
  });

  const joinUrl = useMemo(() => `${window.location.origin}/meeting/${meetingId}/prejoin`, [meetingId]);

  useEffect(() => {
    if (!meetingId) {
      navigate('/', { replace: true });
      return;
    }

    if (!meetingId || meeting) return;
    void fetchMeeting(meetingId);
  }, [fetchMeeting, meeting, meetingId, navigate]);

  useEffect(() => {
    if (!authUser?.displayName) return;
    if (preferences.name && preferences.name !== 'Guest User') return;
    updatePreferences({ name: authUser.displayName });
  }, [authUser?.displayName, preferences.name, updatePreferences]);

  useEffect(() => {
    setCurrentParticipantId(undefined);
    void leaveRealtimeRoom();
  }, [leaveRealtimeRoom, meetingId, setCurrentParticipantId]);

  useEffect(() => {
    if (!meetingId || !meeting || !authUser?.id || isJoining || isEnteringRoomRef.current) return;

    const staleSelfPresence = meeting.participants.find((participant) => participant.userId === authUser.id);
    if (!staleSelfPresence || stalePresenceCleanupRef.current === staleSelfPresence.id) return;

    stalePresenceCleanupRef.current = staleSelfPresence.id;
    void meetingsApi
      .leaveParticipant(meetingId, staleSelfPresence.id)
      .then(() => fetchMeeting(meetingId))
      .catch(() => {
        stalePresenceCleanupRef.current = null;
      });
  }, [authUser?.id, fetchMeeting, isJoining, meeting, meetingId]);

  if (!meeting && isLoadingMeeting) {
    return (
      <HeroShell className="items-center justify-center">
        <Card className="max-w-lg">
          <CardContent className="space-y-4">
            <h1 className="text-3xl font-semibold">Loading meeting</h1>
            <p className="text-slate-500">Fetching room details from the backend.</p>
          </CardContent>
        </Card>
      </HeroShell>
    );
  }

  if (!meeting) {
    return (
      <HeroShell className="items-center justify-center">
        <Card className="max-w-lg">
          <CardContent className="space-y-4">
            <h1 className="text-3xl font-semibold">Meeting not found</h1>
            <p className="text-slate-500">{meetingError ?? 'This room could not be loaded from the backend.'}</p>
            <Button asChild>
              <Link to="/">Back home</Link>
            </Button>
          </CardContent>
        </Card>
      </HeroShell>
    );
  }

  return (
    <HeroShell>
      <header className="flex items-center justify-between py-6">
        <MitingoLogo />
        <Button variant="ghost" asChild>
          <Link to="/">Exit setup</Link>
        </Button>
      </header>

      <section className="grid flex-1 gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="accent">Device preview</Badge>
                <h1 className="mt-4 text-4xl font-semibold">{meeting.title}</h1>
                <p className="mt-2 text-slate-500">Meeting code {meeting.code} | hosted by {meeting.hostName}</p>
              </div>
            </div>

            <MediaPreview stream={stream} enabled={preferences.isCameraOn} />

            <div className="flex flex-wrap gap-3">
              <Button
                variant={preferences.isMicOn ? 'secondary' : 'destructive'}
                onClick={() => updatePreferences({ isMicOn: !preferences.isMicOn })}
              >
                {preferences.isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {preferences.isMicOn ? 'Mic on' : 'Mic off'}
              </Button>
              <Button
                variant={preferences.isCameraOn ? 'secondary' : 'destructive'}
                onClick={() => updatePreferences({ isCameraOn: !preferences.isCameraOn })}
              >
                {preferences.isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                {preferences.isCameraOn ? 'Camera on' : 'Camera off'}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-slate-600">Microphone</span>
                <select
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-900 shadow-sm"
                  value={preferences.selectedMicrophoneId ?? ''}
                  onChange={(event) => updatePreferences({ selectedMicrophoneId: event.target.value || undefined })}
                >
                  <option value="">Default microphone</option>
                  {audioInputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-600">Camera</span>
                <select
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm text-slate-900 shadow-sm"
                  value={preferences.selectedCameraId ?? ''}
                  onChange={(event) => updatePreferences({ selectedCameraId: event.target.value || undefined })}
                >
                  <option value="">Default camera</option>
                  {videoInputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error ? <p className="text-sm text-amber-300">{error}</p> : null}
            {devicesError ? <p className="text-sm text-amber-300">{devicesError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <Badge>Join details</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Ready when you are</h2>
            <p className="mt-3 text-slate-500">
              Fine-tune your name, then enter the room. This step now asks the backend for the room access payload.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-slate-600">Display name</span>
                <Input
                  value={preferences.name}
                  onChange={(event) => updatePreferences({ name: event.target.value })}
                  placeholder="Your name"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-600">Invite link</span>
                <div className="flex gap-3">
                  <Input readOnly value={joinUrl} />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(joinUrl);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="accent"
                size="lg"
                disabled={isJoining || !preferences.name.trim()}
                onClick={async () => {
                  try {
                    isEnteringRoomRef.current = true;
                    setIsJoining(true);
                    setJoinError(null);
                    const joinPayload = await meetingsApi.requestJoinToken(meetingId, preferences.name);
                    setCurrentUserName(preferences.name);
                    setCurrentParticipantId(joinPayload.participant.id);
                    await fetchMeeting(meetingId);
                    navigate(`/meeting/${meetingId}`, { replace: true });
                    void joinRealtimeRoom(joinPayload.roomName, preferences.name, joinPayload.token ?? undefined, {
                      micEnabled: preferences.isMicOn,
                      cameraEnabled: preferences.isCameraOn,
                    });
                  } catch (error) {
                    isEnteringRoomRef.current = false;
                    setJoinError(
                      error instanceof Error ? error.message : 'Unable to enter the room right now. Please try again.',
                    );
                  } finally {
                    setIsJoining(false);
                  }
                }}
              >
                {isJoining ? 'Joining...' : 'Join now'}
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/">Cancel</Link>
              </Button>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white/65 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-950">Realtime status</p>
              <p className="mt-2">Connection layer: {realtimeState}</p>
              {realtimeError ? <p className="mt-2 text-amber-300">{realtimeError}</p> : null}
              {joinError ? <p className="mt-2 text-rose-300">{joinError}</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </HeroShell>
  );
}
