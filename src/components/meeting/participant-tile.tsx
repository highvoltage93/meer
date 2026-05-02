import { motion } from 'framer-motion';
import { Mic, MicOff, MonitorUp, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, toParticipantInitials } from '@/lib/utils';
import type { Participant } from '@/types/meeting';

export function ParticipantTile({
  participant,
  isActive = false,
  isPinned = false,
  videoElement,
  onClick,
}: {
  participant: Participant;
  isActive?: boolean;
  isPinned?: boolean;
  videoElement?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <motion.button
      layout
      type="button"
      onClick={onClick}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative block w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-4 text-left text-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.10)]',
        isActive && 'ring-1 ring-cyan-300/60',
        isPinned && 'ring-1 ring-amber-300/70',
        onClick && 'transition hover:border-cyan-300 hover:bg-white',
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.20),transparent_38%)]" />

      {participant.isCameraOn && videoElement ? (
        <div className="relative aspect-video overflow-hidden rounded-[22px] bg-slate-950">{videoElement}</div>
      ) : (
        <div className="relative grid aspect-video place-items-center rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#e0f7ff)]">
          <Avatar className="h-20 w-20 rounded-[28px]">
            <AvatarFallback className="text-2xl">{toParticipantInitials(participant.name)}</AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="relative mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-950">{participant.name}</p>
            {participant.role === 'host' ? <Badge variant="accent">Host</Badge> : null}
            {isPinned ? <Badge>Pinned</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {participant.status === 'joined' ? 'In call' : 'Waiting room'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          {participant.isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-rose-300" />}
          {participant.isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-rose-300" />}
          {participant.isScreenSharing ? <MonitorUp className="h-4 w-4 text-cyan-300" /> : null}
        </div>
      </div>
    </motion.button>
  );
}
