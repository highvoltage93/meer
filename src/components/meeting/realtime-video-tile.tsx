import { useEffect, useRef } from 'react';

export function RealtimeVideoTile({
  track,
  muted = false,
}: {
  track?: MediaStreamTrack | null;
  muted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current || !track) return;

    const stream = new MediaStream([track]);
    videoRef.current.srcObject = stream;

    return () => {
      videoRef.current!.srcObject = null;
    };
  }, [track]);

  if (!track) {
    return null;
  }

  return <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />;
}
