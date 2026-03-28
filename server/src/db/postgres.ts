import { Pool } from 'pg';
import type { ServerEnv } from '../config/env.js';
import { schemaSql } from './schema.js';

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
    await this.pool.query(schemaSql);
  }

  async close() {
    await this.pool.end();
  }
}
