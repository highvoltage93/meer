import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Link2, Sparkles } from 'lucide-react';
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
  const [hostName, setHostName] = useState('Alex Johnson');
  const createMeeting = useMeetingsStore((state) => state.createMeeting);
  const isLoading = useMeetingsStore((state) => state.isLoading);
  const error = useMeetingsStore((state) => state.error);
  const navigate = useNavigate();

  async function handleCreate() {
    const meetingId = await createMeeting(hostName, title);
    navigate(`/meeting/${meetingId}/prejoin`);
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
            Create a lightweight Google Meet style room. For now everything stays on the frontend so we can iterate on the product flow fast.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Meeting title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Quarterly planning" />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Your name</span>
            <Input value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="Alex Johnson" />
          </label>
        </div>

        <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <Link2 className="mb-3 h-4 w-4 text-cyan-300" />
            Instant join link
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <CalendarClock className="mb-3 h-4 w-4 text-cyan-300" />
            Clean pre-join flow
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <Sparkles className="mb-3 h-4 w-4 text-cyan-300" />
            Frontend MVP first
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
