import fp from 'fastify-plugin';
import { loadEnv, type ServerEnv } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    serverEnv: ServerEnv;
  }
}

export const envPlugin = fp(async (app) => {
  app.decorate('serverEnv', loadEnv());
});
