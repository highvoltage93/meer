import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { MeetingsRepository } from '../../repositories/meetings-repository.js';
import type { SessionRecord, UserRecord } from '../../types/meeting.js';

const guestSessionSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

const registerSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
});

const loginSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(1).max(128),
});

const scrypt = promisify(scryptCallback);
const jwtTtlSeconds = 60 * 60 * 24 * 7;

function base64UrlJson(input: unknown) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function parseBase64UrlJson<T>(input: string): T {
  return JSON.parse(Buffer.from(input, 'base64url').toString('utf8')) as T;
}

function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlJson(payload);
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string, secret: string) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;

  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const payload = parseBase64UrlJson<{ sub?: string; exp?: number; iat?: number }>(body);
  if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(':');
  if (!salt || !storedHash) return false;

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, 'hex');

  return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
}

function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    authProvider: user.authProvider,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  constructor(
    private readonly repository: MeetingsRepository,
    private readonly jwtSecret: string,
  ) {}

  private createJwtSession(user: UserRecord): SessionRecord {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + jwtTtlSeconds;
    const token = signJwt(
      {
        sub: user.id,
        username: user.username,
        iat: now,
        exp: expiresAt,
      },
      this.jwtSecret,
    );

    return {
      token,
      userId: user.id,
      createdAt: new Date(now * 1000).toISOString(),
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      kind: 'jwt',
    };
  }

  async register(rawInput: unknown) {
    const input = registerSchema.parse(rawInput);
    const existing = await this.repository.getUserByUsername(input.username);

    if (existing) {
      throw new Error('USERNAME_TAKEN');
    }

    const displayName = `${input.firstName} ${input.lastName}`;
    const user = await this.repository.createUser({
      username: input.username,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      authProvider: 'password',
      displayName,
    });

    return {
      user: toPublicUser(user),
      session: this.createJwtSession(user),
    };
  }

  async login(rawInput: unknown) {
    const input = loginSchema.parse(rawInput);
    const user = await this.repository.getUserByUsername(input.username);

    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return {
      user: toPublicUser(user),
      session: this.createJwtSession(user),
    };
  }

  async createGuestSession(rawInput: unknown, existingToken?: string) {
    const input = guestSessionSchema.parse(rawInput);
    const existing = existingToken ? await this.getCurrentSession(existingToken) : null;

    if (existing) {
      const user =
        existing.user.displayName === input.displayName
          ? existing.user
          : await this.repository.updateUserDisplayName(existing.user.id, input.displayName);

      if (!user) {
        throw new Error('Unable to update guest session');
      }

      return {
        user: toPublicUser(user),
        session: existing.session,
      };
    }

    const user = await this.repository.createUser({
      displayName: input.displayName,
    });
    const session = await this.repository.createSession(user.id);

    return {
      user: toPublicUser(user),
      session,
    };
  }

  async getUserFromSessionToken(token?: string) {
    if (!token) return null;
    const jwtPayload = verifyJwt(token, this.jwtSecret);

    if (jwtPayload?.sub) {
      const user = await this.repository.getUserById(jwtPayload.sub);
      if (!user) return null;

      return {
        user: toPublicUser(user),
        session: {
          token,
          userId: user.id,
          createdAt: new Date(((jwtPayload.iat as number | undefined) ?? 0) * 1000).toISOString(),
          expiresAt: new Date(((jwtPayload.exp as number | undefined) ?? 0) * 1000).toISOString(),
          kind: 'jwt' as const,
        },
      };
    }

    const session = await this.repository.getSession(token);
    if (!session) return null;
    const user = await this.repository.getUserById(session.userId);
    if (!user) return null;

    return {
      user: toPublicUser(user),
      session: {
        ...session,
        kind: 'legacy' as const,
      },
    };
  }

  async getCurrentSession(token?: string) {
    return this.getUserFromSessionToken(token);
  }
}
