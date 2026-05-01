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
        'group relative block w-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.15),rgba(2,6,23,0.88))] p-4 text-left',
        isActive && 'ring-1 ring-cyan-300/60',
        isPinned && 'ring-1 ring-amber-300/70',
        onClick && 'transition hover:border-cyan-300/40',
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.12),transparent_34%)]" />

      {participant.isCameraOn && videoElement ? (
        <div className="relative aspect-video overflow-hidden rounded-[22px] bg-slate-950">{videoElement}</div>
      ) : (
        <div className="relative grid aspect-video place-items-center rounded-[22px] bg-slate-900/80">
          <Avatar className="h-20 w-20 rounded-[28px]">
            <AvatarFallback className="text-2xl">{toParticipantInitials(participant.name)}</AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="relative mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{participant.name}</p>
            {participant.role === 'host' ? <Badge variant="accent">Host</Badge> : null}
            {isPinned ? <Badge>Pinned</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {participant.status === 'joined' ? 'In call' : 'Waiting room'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          {participant.isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-rose-300" />}
          {participant.isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-rose-300" />}
          {participant.isScreenSharing ? <MonitorUp className="h-4 w-4 text-cyan-300" /> : null}
        </div>
      </div>
    </motion.button>
  );
}
