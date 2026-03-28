import { useEffect, useMemo } from 'react';
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
import { meetingsApi } from '@/services/api/meetings-api';
import { useCallSessionStore } from '@/store/call-session-store';
import { useMeetingsStore } from '@/store/meetings-store';

export function PreJoinPage() {
  const { meetingId = '' } = useParams();
  const navigate = useNavigate();
  const meeting = useMeetingsStore((state) => state.meetings[meetingId]);
  const fetchMeeting = useMeetingsStore((state) => state.fetchMeeting);
  const preferences = useMeetingsStore((state) => state.localPreferences);
  const updatePreferences = useMeetingsStore((state) => state.updateLocalPreferences);
  const setCurrentUserName = useMeetingsStore((state) => state.setCurrentUserName);
  const setCurrentParticipantId = useMeetingsStore((state) => state.setCurrentParticipantId);
  const meetingError = useMeetingsStore((state) => state.error);
  const isLoadingMeeting = useMeetingsStore((state) => state.isLoading);
  const joinRealtimeRoom = useCallSessionStore((state) => state.joinRoom);
  const realtimeState = useCallSessionStore((state) => state.connectionState);
  const realtimeError = useCallSessionStore((state) => state.error);
  const { stream, error } = useLocalMedia({
    video: preferences.isCameraOn,
    audio: preferences.isMicOn,
  });

  const joinUrl = useMemo(() => `${window.location.origin}/meeting/${meetingId}/prejoin`, [meetingId]);

  useEffect(() => {
    if (!meetingId || meeting) return;
    void fetchMeeting(meetingId);
  }, [fetchMeeting, meeting, meetingId]);

  if (!meeting && isLoadingMeeting) {
    return (
      <HeroShell className="items-center justify-center">
        <Card className="max-w-lg">
          <CardContent className="space-y-4">
            <h1 className="text-3xl font-semibold">Loading meeting</h1>
            <p className="text-slate-400">Fetching room details from the backend.</p>
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
            <p className="text-slate-400">{meetingError ?? 'This room could not be loaded from the backend.'}</p>
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
                <p className="mt-2 text-slate-400">Meeting code {meeting.code} | hosted by {meeting.hostName}</p>
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

            {error ? <p className="text-sm text-amber-300">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <Badge>Join details</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Ready when you are</h2>
            <p className="mt-3 text-slate-400">
              Fine-tune your name, then enter the room. This step now asks the backend for the room access payload.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Display name</span>
                <Input
                  value={preferences.name}
                  onChange={(event) => updatePreferences({ name: event.target.value })}
                  placeholder="Your name"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Invite link</span>
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
                onClick={async () => {
                  const joinPayload = await meetingsApi.requestJoinToken(meetingId, preferences.name);
                  setCurrentUserName(preferences.name);
                  setCurrentParticipantId(joinPayload.participant.id);
                  await fetchMeeting(meetingId);
                  await joinRealtimeRoom(joinPayload.roomName, preferences.name, joinPayload.token ?? undefined, {
                    micEnabled: preferences.isMicOn,
                    cameraEnabled: preferences.isCameraOn,
                  });
                  navigate(`/meeting/${meetingId}`);
                }}
              >
                Join now
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/">Cancel</Link>
              </Button>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">Realtime status</p>
              <p className="mt-2">Connection layer: {realtimeState}</p>
              {realtimeError ? <p className="mt-2 text-amber-300">{realtimeError}</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </HeroShell>
  );
}
