import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Lock, LogOut, Video } from 'lucide-react';
import { HeroShell } from '@/components/layout/hero-shell';
import { MitingoLogo } from '@/components/brand/mitingo-logo';
import { MeetingCreateDialog } from '@/components/meeting/meeting-create-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { env } from '@/config/env';
import { formatMeetingCode } from '@/lib/utils';
import { meetingsApi } from '@/services/api/meetings-api';
import { useAuthStore } from '@/store/auth-store';
import { useMeetingsStore } from '@/store/meetings-store';
import type { MeetingSummary } from '@/types/meeting';

export function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [myMeetings, setMyMeetings] = useState<MeetingSummary[]>([]);
  const [isLoadingMyMeetings, setIsLoadingMyMeetings] = useState(false);
  const meetings = useMeetingsStore((state) => state.meetings);
  const fetchMeetingByCode = useMeetingsStore((state) => state.fetchMeetingByCode);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const error = useMeetingsStore((state) => state.error);
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);

  const recentMeetings = useMemo(
    () => Object.values(meetings).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3).length,
    [meetings],
  );

  useEffect(() => {
    if (!session) {
      setMyMeetings([]);
      return;
    }

    let isCancelled = false;

    async function loadMyMeetings() {
      setIsLoadingMyMeetings(true);
      try {
        const meetings = await meetingsApi.getMyMeetings();
        if (!isCancelled) {
          setMyMeetings(meetings);
        }
      } catch {
        if (!isCancelled) {
          setMyMeetings([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMyMeetings(false);
        }
      }
    }

    void loadMyMeetings();

    return () => {
      isCancelled = true;
    };
  }, [session]);

  async function handleJoin() {
    const meeting = await fetchMeetingByCode(code);
    if (!meeting) return;
    navigate(`/meeting/${meeting.id}/prejoin`, { replace: true });
  }

  return (
    <HeroShell>
      <header className="flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <MitingoLogo />
        <div className="flex items-center gap-3">
          <Badge variant="success">Backend connected</Badge>
          <Badge>Meet style flow</Badge>
          {user ? <Badge variant="accent">{user.displayName}</Badge> : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearSession();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <Badge variant="accent" className="mb-5">
            Video-first collaboration
          </Badge>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Clean meeting UX inspired by Google Meet, shaped for modern product teams.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            Create a room, share a code, preview devices, join the call, and collaborate on a realtime stack backed by LiveKit, Postgres, and WebSocket room sync.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <MeetingCreateDialog />
            <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-white/80 bg-white/75 p-2 shadow-sm">
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
              description="Backed by Postgres, WebSocket room sync, and LiveKit media transport."
            />
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.24),transparent_26%)]" />
          <CardContent className="relative space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-700/80">Today</p>
                <h2 className="mt-2 text-3xl font-semibold">Your meeting memory</h2>
              </div>
              <Badge variant="success">{myMeetings.length} server rooms</Badge>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[26px] border border-cyan-200 bg-cyan-50/75 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-700/80">Realtime architecture</p>
                <p className="mt-3 text-lg font-medium text-slate-950">
                  Provider: LiveKit
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  API base URL: {env.apiBaseUrl}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {env.isLivekitConfigured
                    ? 'Frontend requests backend-issued room tokens and connects to a real SFU.'
                    : 'Add LiveKit credentials to enable the full realtime media transport.'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Local cache: {recentMeetings} rooms. Persistence: {myMeetings.length} rooms in Postgres.
                </p>
              </div>

              {isLoadingMyMeetings ? (
                <div className="rounded-[26px] border border-dashed border-slate-200 bg-white/55 p-6 text-slate-600">
                  Loading your meetings from the backend...
                </div>
              ) : myMeetings.length ? (
                myMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => navigate(`/meeting/${meeting.id}/prejoin`, { replace: true })}
                    className="rounded-[26px] border border-white/80 bg-white/70 p-5 text-left shadow-sm transition hover:border-cyan-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-medium text-slate-950">{meeting.title}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {meeting.participantCount} participants | {meeting.messageCount} messages | code {meeting.code}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[26px] border border-dashed border-slate-200 bg-white/55 p-6 text-slate-600">
                  {session
                    ? 'No persisted rooms yet. Create the first call from the left panel.'
                    : 'Create a room to initialize your guest identity and server-backed meeting history.'}
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
    <div className="rounded-[26px] border border-white/80 bg-white/65 p-5 shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
