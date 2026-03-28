import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const webhookSchema = z.object({
  event: z.string().optional(),
  room: z.string().optional(),
  participant: z.string().optional(),
});

export const meetingRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/guest-session', async (request, reply) => {
    const result = await app.authService.createGuestSession(request.body);
    return reply.code(201).send(result);
  });

  app.post('/meetings', async (request, reply) => {
    const auth = await app.authService.getUserFromSessionToken(
      request.headers['x-session-token'] as string | undefined,
    );

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    const meeting = await app.meetingsService.createMeeting(request.body, {
      userId: auth.user.id,
      displayName: auth.user.displayName,
    });
    return reply.code(201).send(meeting);
  });

  app.get('/meetings/:meetingId', async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const meeting = await app.meetingsService.getMeeting(meetingId);

    if (!meeting) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.send(meeting);
  });

  app.get('/meetings/by-code/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const meeting = await app.meetingsService.getMeetingByCode(code);

    if (!meeting) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.send(meeting);
  });

  app.post('/meetings/:meetingId/join-token', async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const result = await app.meetingsService.createJoinToken(meetingId, request.body);

    if (!result) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.send(result);
  });

  app.post('/meetings/:meetingId/chat', async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const auth = await app.authService.getUserFromSessionToken(
      request.headers['x-session-token'] as string | undefined,
    );
    const message = await app.meetingsService.createMessage(meetingId, request.body, auth?.user.id);

    if (!message) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.code(201).send(message);
  });

  app.patch('/meetings/:meetingId/participants/:participantId/state', async (request, reply) => {
    const { meetingId, participantId } = request.params as { meetingId: string; participantId: string };
    const participant = await app.meetingsService.updateParticipantState(meetingId, participantId, request.body);

    if (!participant) {
      throw app.httpErrors.notFound('Participant not found');
    }

    return reply.send(participant);
  });

  app.delete('/meetings/:meetingId/participants/:participantId', async (request, reply) => {
    const { meetingId, participantId } = request.params as { meetingId: string; participantId: string };
    const removed = await app.meetingsService.removeParticipant(meetingId, participantId);

    if (!removed) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.code(204).send();
  });

  app.get('/meetings/:meetingId/events', async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const meeting = await app.meetingsService.getMeeting(meetingId);

    if (!meeting) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': app.serverEnv.CLIENT_ORIGIN,
    });

    const writeSnapshot = (snapshot: unknown) => {
      reply.raw.write(`event: meeting\n`);
      reply.raw.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    };

    writeSnapshot(meeting);
    const unsubscribe = app.meetingsService.subscribeToMeeting(meetingId, writeSnapshot);

    const keepAlive = setInterval(() => {
      reply.raw.write(`event: ping\ndata: ${Date.now()}\n\n`);
    }, 15000);

    request.raw.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
      reply.raw.end();
    });
  });

  app.post('/webhooks/livekit', async (request, reply) => {
    const payload = webhookSchema.parse(request.body ?? {});

    app.log.info({ payload }, 'Received LiveKit webhook');
    return reply.code(202).send({ accepted: true });
  });
};
