import { useEffect, useRef } from 'react';
import { CameraOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MediaPreview({
  stream,
  enabled,
  className,
}: {
  stream: MediaStream | null;
  enabled: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!enabled) {
    return (
      <div
        className={cn(
          'grid aspect-video place-items-center rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#e0f7ff)] text-slate-500',
          className,
        )}
      >
        <div className="text-center">
          <CameraOff className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm">Camera is off</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('aspect-video overflow-hidden rounded-[30px] bg-slate-950 shadow-inner', className)}>
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
    </div>
  );
}
