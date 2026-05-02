import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Link2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useMeetingsStore } from '@/store/meetings-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function MeetingCreateDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Design Review');
  const createMeeting = useMeetingsStore((state) => state.createMeeting);
  const user = useAuthStore((state) => state.user);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const error = useMeetingsStore((state) => state.error);
  const navigate = useNavigate();

  async function handleCreate() {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const meetingId = await createMeeting(user.displayName, title);
    navigate(`/meeting/${meetingId}/prejoin`, { replace: true });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="lg">
          <Sparkles className="h-4 w-4" />
          New meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Launch a meeting room</DialogTitle>
          <DialogDescription>
            Create a Google Meet style room with backend persistence, WebSocket room sync, and LiveKit media transport already wired in.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-600">Meeting title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Quarterly planning" />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
            Host identity: <span className="font-medium text-slate-950">{user?.displayName ?? 'Signed in user'}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-[24px] border border-slate-200 bg-cyan-50/60 p-4 text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
            <Link2 className="mb-3 h-4 w-4 text-cyan-300" />
            Instant join link
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
            <CalendarClock className="mb-3 h-4 w-4 text-cyan-300" />
            Clean pre-join flow
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
            <Sparkles className="mb-3 h-4 w-4 text-cyan-300" />
            Realtime stack ready
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="accent" onClick={() => void handleCreate()} disabled={isLoading}>
            Continue to setup
          </Button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
