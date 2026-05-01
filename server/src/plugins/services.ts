import fp from 'fastify-plugin';
import { PostgresDatabase } from '../db/postgres.js';
import { PostgresMeetingsRepository } from '../repositories/postgres-meetings-repository.js';
import type { MeetingsRepository } from '../repositories/meetings-repository.js';
import { AuthService } from '../services/auth/auth-service.js';
import { MeetingEventsService } from '../services/meeting-events-service.js';
import { MeetingsService } from '../services/meetings-service.js';
import { LivekitTokenService } from '../services/livekit-token-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    authService: AuthService;
    meetingsService: MeetingsService;
  }
}

export const servicesPlugin = fp(async (app) => {
  const db = PostgresDatabase.fromEnv(app.serverEnv);
  if (!db) {
    throw new Error('DATABASE_URL is required. This app now runs in Postgres-first mode only.');
  }

  await db.initialize();

  const repository: MeetingsRepository = new PostgresMeetingsRepository(db);
  const livekitTokenService = new LivekitTokenService(app.serverEnv);
  const meetingEventsService = new MeetingEventsService();

  app.decorate('authService', new AuthService(repository, app.serverEnv.JWT_SECRET));
  app.decorate('meetingsService', new MeetingsService(repository, livekitTokenService, meetingEventsService));
});
