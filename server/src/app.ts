import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import { envPlugin } from './plugins/env.js';
import { servicesPlugin } from './plugins/services.js';
import { healthRoutes } from './routes/health-routes.js';
import { meetingRoutes } from './routes/meeting-routes.js';

export async function buildServer() {
  const app = Fastify({
    logger: true,
  });

  await app.register(envPlugin);
  await app.register(cors, {
    origin: app.serverEnv.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token'],
  });
  await app.register(websocket);
  await app.register(sensible);
  await app.register(servicesPlugin);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(meetingRoutes, { prefix: '/api' });

  return app;
}
