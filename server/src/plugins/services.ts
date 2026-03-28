import fp from 'fastify-plugin';
import { InMemoryMeetingsRepository } from '../repositories/in-memory-meetings-repository.js';
import { MeetingEventsService } from '../services/meeting-events-service.js';
import { MeetingsService } from '../services/meetings-service.js';
import { LivekitTokenService } from '../services/livekit-token-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    meetingsService: MeetingsService;
  }
}

export const servicesPlugin = fp(async (app) => {
  const repository = new InMemoryMeetingsRepository();
  const livekitTokenService = new LivekitTokenService(app.serverEnv);
  const meetingEventsService = new MeetingEventsService();

  app.decorate('meetingsService', new MeetingsService(repository, livekitTokenService, meetingEventsService));
});
