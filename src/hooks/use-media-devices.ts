import { useEffect, useState } from 'react';

type MediaDeviceOption = {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
};

export function useMediaDevices() {
  const [devices, setDevices] = useState<MediaDeviceOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDevices() {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        if (!mounted) return;

        setDevices(
          allDevices
            .filter((device) => device.kind === 'audioinput' || device.kind === 'videoinput')
            .map((device, index) => ({
              deviceId: device.deviceId,
              kind: device.kind,
              label:
                device.label ||
                `${device.kind === 'audioinput' ? 'Microphone' : 'Camera'} ${index + 1}`,
            })),
        );
        setError(null);
      } catch {
        if (!mounted) return;
        setError('Unable to enumerate media devices.');
      }
    }

    void loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);

    return () => {
      mounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  return {
    devices,
    audioInputs: devices.filter((device) => device.kind === 'audioinput'),
    videoInputs: devices.filter((device) => device.kind === 'videoinput'),
    error,
  };
}
