import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Lock, Video } from 'lucide-react';
import { HeroShell } from '@/components/layout/hero-shell';
import { MitingoLogo } from '@/components/brand/mitingo-logo';
import { MeetingCreateDialog } from '@/components/meeting/meeting-create-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { env } from '@/config/env';
import { formatMeetingCode } from '@/lib/utils';
import { useMeetingsStore } from '@/store/meetings-store';

export function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const meetings = useMeetingsStore((state) => state.meetings);
  const fetchMeetingByCode = useMeetingsStore((state) => state.fetchMeetingByCode);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const error = useMeetingsStore((state) => state.error);

  const recentMeetings = useMemo(
    () => Object.values(meetings).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    [meetings],
  );

  async function handleJoin() {
    const meeting = await fetchMeetingByCode(code);
    if (!meeting) return;
    navigate(`/meeting/${meeting.id}/prejoin`);
  }

  return (
    <HeroShell>
      <header className="flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <MitingoLogo />
        <div className="flex items-center gap-3">
          <Badge variant="success">Backend connected</Badge>
          <Badge>Meet style flow</Badge>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <Badge variant="accent" className="mb-5">
            Video-first collaboration
          </Badge>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Clean meeting UX inspired by Google Meet, shaped for modern product teams.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Create a room, share a code, preview devices, join the call, and progressively switch from mock transport to real media infrastructure.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <MeetingCreateDialog />
            <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] p-2">
              <Input
                className="h-10 border-0 bg-transparent px-3 py-0"
                placeholder="Enter meeting code"
                value={code}
                onChange={(event) => setCode(formatMeetingCode(event.target.value))}
              />
              <Button
                variant="secondary"
                onClick={() => void handleJoin()}
                disabled={code.length < 11 || isLoading}
              >
                Join
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <FeatureCard
              icon={<Video className="h-5 w-5 text-cyan-300" />}
              title="Pre-join setup"
              description="Camera and microphone preview before entering."
            />
            <FeatureCard
              icon={<Lock className="h-5 w-5 text-cyan-300" />}
              title="Invite by code"
              description="Server-backed meeting lookup and shareable room links."
            />
            <FeatureCard
              icon={<Compass className="h-5 w-5 text-cyan-300" />}
              title="Scalable MVP"
              description="Prepared for API-backed realtime media and persistence."
            />
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.18),transparent_24%)]" />
          <CardContent className="relative space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/80">Today</p>
                <h2 className="mt-2 text-3xl font-semibold">Meetings in motion</h2>
              </div>
              <Badge variant="success">{recentMeetings.length} cached rooms</Badge>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[26px] border border-cyan-300/15 bg-cyan-300/8 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Realtime architecture</p>
                <p className="mt-3 text-lg font-medium text-white">
                  Provider: {env.realtimeProvider === 'livekit' ? 'LiveKit' : 'Mock transport'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  API base URL: {env.apiBaseUrl}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {env.isLivekitConfigured
                    ? 'Frontend can request backend-issued room tokens and connect to a real SFU.'
                    : 'Frontend now uses the backend for meeting lifecycle. Add LiveKit credentials to enable real media transport.'}
                </p>
              </div>

              {recentMeetings.length ? (
                recentMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => navigate(`/meeting/${meeting.id}/prejoin`)}
                    className="rounded-[26px] border border-white/10 bg-black/20 p-5 text-left transition hover:border-cyan-300/40 hover:bg-black/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-medium text-white">{meeting.title}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {meeting.participants.length} participants | code {meeting.code}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[26px] border border-dashed border-white/10 bg-black/15 p-6 text-slate-300">
                  No rooms yet. Create the first call from the left panel.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </HeroShell>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
