const realtimeProvider = import.meta.env.VITE_RTC_PROVIDER ?? 'mock';
const livekitUrl = import.meta.env.VITE_LIVEKIT_URL ?? '';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787/api';

export const env = {
  realtimeProvider,
  livekitUrl,
  apiBaseUrl,
  isLivekitConfigured: realtimeProvider === 'livekit' && Boolean(livekitUrl),
};
