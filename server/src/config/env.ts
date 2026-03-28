import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default('127.0.0.1'),
  CLIENT_ORIGIN: z.string().default('http://127.0.0.1:5173'),
  LIVEKIT_URL: z.string().default(''),
  LIVEKIT_API_KEY: z.string().default(''),
  LIVEKIT_API_SECRET: z.string().default(''),
});

export type ServerEnv = z.infer<typeof envSchema>;

export function loadEnv(): ServerEnv {
  return envSchema.parse(process.env);
}
