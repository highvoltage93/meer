import { env } from '@/config/env';
import { LiveKitRealtimeProvider } from '@/services/realtime/livekit-realtime-provider';
import type { RealtimeProvider } from '@/types/realtime';

let provider: RealtimeProvider | null = null;

export function getRealtimeProvider(): RealtimeProvider {
  if (provider) return provider;

  provider = new LiveKitRealtimeProvider();
  return provider;
}
