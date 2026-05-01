import { Pool } from 'pg';
import type { ServerEnv } from '../config/env.js';
import { schemaSql } from './schema.js';

const startupRetryCodes = new Set(['57P03', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT']);

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isStartupRetryable(error: unknown) {
  const code = (error as { code?: string })?.code;
  return Boolean(code && startupRetryCodes.has(code));
}

export class PostgresDatabase {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
  }

  static fromEnv(env: ServerEnv) {
    if (!env.DATABASE_URL) return null;
    return new PostgresDatabase(env.DATABASE_URL);
  }

  async initialize() {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 20; attempt += 1) {
      try {
        await this.pool.query(schemaSql);
        return;
      } catch (error) {
        lastError = error;

        if (!isStartupRetryable(error) || attempt === 20) {
          throw error;
        }

        await sleep(Math.min(500 * attempt, 3000));
      }
    }

    throw lastError;
  }

  async close() {
    await this.pool.end();
  }
}
