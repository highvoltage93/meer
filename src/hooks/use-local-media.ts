import { useEffect, useRef, useState } from 'react';

export function useLocalMedia(enabled: {
  video: boolean;
  audio: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
}) {
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
          video: enabled.video
            ? enabled.videoDeviceId
              ? { deviceId: { exact: enabled.videoDeviceId } }
              : true
            : false,
          audio: enabled.audio
            ? enabled.audioDeviceId
              ? { deviceId: { exact: enabled.audioDeviceId } }
              : true
            : false,
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
  }, [enabled.audio, enabled.audioDeviceId, enabled.video, enabled.videoDeviceId]);

  useEffect(
    () => () => {
      lastStream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return { stream, error };
}
