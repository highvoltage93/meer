import { useEffect, useRef, useState } from 'react';

export function useLocalMedia(enabled: { video: boolean; audio: boolean }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!enabled.video && !enabled.audio) {
        lastStream.current?.getTracks().forEach((track) => track.stop());
        lastStream.current = null;
        setStream(null);
        return;
      }

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: enabled.video,
          audio: enabled.audio,
        });

        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }

        lastStream.current?.getTracks().forEach((track) => track.stop());
        lastStream.current = nextStream;
        setStream(nextStream);
        setError(null);
      } catch {
        setError('Camera or microphone access is unavailable right now.');
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [enabled.audio, enabled.video]);

  useEffect(
    () => () => {
      lastStream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return { stream, error };
}
