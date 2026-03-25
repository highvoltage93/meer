import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Copy,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalMedia } from '@/hooks/use-local-media';
import { useMeetingsStore } from '@/store/meetings-store';

export function MeetingRoomPage() {
  const { meetingId = '' } = useParams();
  const navigate = useNavigate();
  const [chatDraft, setChatDraft] = useState('');
  const meeting = useMeetingsStore((state) => state.meetings[meetingId]);
  const currentUserName = useMeetingsStore((state) => state.currentUserName);
  const preferences = useMeetingsStore((state) => state.localPreferences);
  const toggleParticipantMedia = useMeetingsStore((state) => state.toggleParticipantMedia);
  const addChatMessage = useMeetingsStore((state) => state.addChatMessage);
  const leaveMeeting = useMeetingsStore((state) => state.leaveMeeting);
  const { stream } = useLocalMedia({
    video: preferences.isCameraOn,
    audio: preferences.isMicOn,
  });

  const currentParticipant = useMemo(
    () => meeting?.participants.find((participant) => participant.name === currentUserName),
    [currentUserName, meeting],
  );

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

  const inviteUrl = `${window.location.origin}/meeting/${meetingId}/prejoin`;
  const participants = [...meeting.participants].sort((a, b) =>
    a.name === currentParticipant.name ? -1 : b.name === currentParticipant.name ? 1 : 0,
  );

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
          <Badge variant="success">{participants.length} participants</Badge>
          <Badge>{meeting.code}</Badge>
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

      <section className="grid flex-1 gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {participants.map((participant) => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                isActive={participant.id === currentParticipant.id}
                videoElement={
                  participant.id === currentParticipant.id ? (
                    <MediaPreview
                      stream={stream}
                      enabled={preferences.isCameraOn}
                      className="h-full rounded-none"
                    />
                  ) : undefined
                }
              />
            ))}
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={currentParticipant.isMicOn ? 'secondary' : 'destructive'}
                  size="icon"
                  onClick={() => toggleParticipantMedia(meetingId, currentParticipant.id, 'isMicOn')}
                >
                  {currentParticipant.isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={currentParticipant.isCameraOn ? 'secondary' : 'destructive'}
                  size="icon"
                  onClick={() => toggleParticipantMedia(meetingId, currentParticipant.id, 'isCameraOn')}
                >
                  {currentParticipant.isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={currentParticipant.isScreenSharing ? 'accent' : 'outline'}
                  size="icon"
                  onClick={() => toggleParticipantMedia(meetingId, currentParticipant.id, 'isScreenSharing')}
                >
                  <MonitorUp className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="destructive"
                onClick={() => {
                  leaveMeeting(meetingId, currentParticipant.id);
                  navigate('/');
                }}
              >
                <PhoneOff className="h-4 w-4" />
                Leave call
              </Button>
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
                        addChatMessage(meetingId, currentParticipant.name, chatDraft);
                        setChatDraft('');
                      }
                    }}
                  />
                  <Button
                    variant="accent"
                    size="icon"
                    onClick={() => {
                      addChatMessage(meetingId, currentParticipant.name, chatDraft);
                      setChatDraft('');
                    }}
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="people" className="mt-5 space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between rounded-[22px] border border-white/8 bg-black/20 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{participant.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {participant.role} • {participant.isCameraOn ? 'camera on' : 'camera off'} •{' '}
                        {participant.isMicOn ? 'mic on' : 'mic off'}
                      </p>
                    </div>
                    {participant.id === currentParticipant.id ? <Badge variant="accent">You</Badge> : null}
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
