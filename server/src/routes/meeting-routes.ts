import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const webhookSchema = z.object({
  event: z.string().optional(),
  room: z.string().optional(),
  participant: z.string().optional(),
});

export const meetingRoutes: FastifyPluginAsync = async (app) => {
  const getAuthToken = (request: { headers: Record<string, string | string[] | undefined> }) => {
    const authorization = request.headers.authorization;
    const authHeader = Array.isArray(authorization) ? authorization[0] : authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : undefined;
    const sessionToken = request.headers['x-session-token'];
    const legacyToken = Array.isArray(sessionToken) ? sessionToken[0] : sessionToken;
    return bearerToken || legacyToken;
  };

  app.get('/ws/meetings/:meetingId', { websocket: true }, async (socket, request) => {
    const { meetingId } = request.params as { meetingId: string };
    const { sessionToken } = request.query as { sessionToken?: string };
    const auth = await app.authService.getCurrentSession(sessionToken);

    if (!auth) {
      socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Session required',
        }),
      );
      socket.close();
      return;
    }

    const meeting = await app.meetingsService.getMeeting(meetingId);

    if (!meeting) {
      socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Meeting not found',
        }),
      );
      socket.close();
      return;
    }

    socket.send(
      JSON.stringify({
        type: 'meeting',
        payload: meeting,
      }),
    );

    const unsubscribe = app.meetingsService.subscribeToMeeting(meetingId, (snapshot) => {
      socket.send(
        JSON.stringify({
          type: 'meeting',
          payload: snapshot,
        }),
      );
    });

    socket.on('close', () => {
      unsubscribe();
    });
  });

  app.post('/auth/register', async (request, reply) => {
    try {
      const result = await app.authService.register(request.body);
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        throw app.httpErrors.conflict('Username is already taken');
      }
      throw error;
    }
  });

  app.post('/auth/login', async (request, reply) => {
    try {
      const result = await app.authService.login(request.body);
      return reply.send(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        throw app.httpErrors.unauthorized('Invalid username or password');
      }
      throw error;
    }
  });

  app.post('/auth/guest-session', async (request, reply) => {
    const result = await app.authService.createGuestSession(
      request.body,
      getAuthToken(request),
    );
    return reply.code(201).send(result);
  });

  app.get('/auth/me', async (request, reply) => {
    const auth = await app.authService.getCurrentSession(getAuthToken(request));

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    return reply.send(auth);
  });

  app.post('/meetings', async (request, reply) => {
    const auth = await app.authService.getUserFromSessionToken(getAuthToken(request));

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

  app.get('/meetings/mine', async (request, reply) => {
    const auth = await app.authService.getCurrentSession(getAuthToken(request));

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    const meetings = await app.meetingsService.listMeetingsByHostUserId(auth.user.id);
    return reply.send(meetings);
  });

  app.post('/meetings/:meetingId/join-token', async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const auth = await app.authService.getCurrentSession(getAuthToken(request));

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    const result = await app.meetingsService.createJoinToken(
      meetingId,
      request.body,
      {
        userId: auth.user.id,
        displayName: auth.user.displayName,
      },
    );

    if (!result) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.send(result);
  });

  app.post('/meetings/:meetingId/chat', async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const auth = await app.authService.getUserFromSessionToken(getAuthToken(request));

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    const message = await app.meetingsService.createMessage(meetingId, request.body, {
      userId: auth.user.id,
      displayName: auth.user.displayName,
    });

    if (!message) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.code(201).send(message);
  });

  app.patch('/meetings/:meetingId/participants/:participantId/state', async (request, reply) => {
    const { meetingId, participantId } = request.params as { meetingId: string; participantId: string };
    const auth = await app.authService.getCurrentSession(getAuthToken(request));

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    let participant;

    try {
      participant = await app.meetingsService.updateParticipantState(
        meetingId,
        participantId,
        request.body,
        auth.user.id,
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        throw app.httpErrors.forbidden('Not allowed to update this participant');
      }
      throw error;
    }

    if (!participant) {
      throw app.httpErrors.notFound('Participant not found');
    }

    return reply.send(participant);
  });

  app.patch('/meetings/:meetingId/pin', async (request, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const auth = await app.authService.getCurrentSession(getAuthToken(request));

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    let meeting;

    try {
      meeting = await app.meetingsService.updateMeetingPin(meetingId, request.body, auth.user.id);
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        throw app.httpErrors.forbidden('Only the host can pin participants');
      }
      throw error;
    }

    if (!meeting) {
      throw app.httpErrors.notFound('Meeting not found');
    }

    return reply.send(meeting);
  });

  app.delete('/meetings/:meetingId/participants/:participantId', async (request, reply) => {
    const { meetingId, participantId } = request.params as { meetingId: string; participantId: string };
    const auth = await app.authService.getCurrentSession(getAuthToken(request));

    if (!auth) {
      throw app.httpErrors.unauthorized('Session required');
    }

    let removed;

    try {
      removed = await app.meetingsService.removeParticipantAsUser(meetingId, participantId, auth.user.id);
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        throw app.httpErrors.forbidden('Not allowed to remove this participant');
      }
      throw error;
    }

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
