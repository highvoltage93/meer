import dotenv from 'dotenv';
import { buildServer } from './app.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = await buildServer();

try {
  await app.listen({
    host: app.serverEnv.HOST,
    port: app.serverEnv.PORT,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
