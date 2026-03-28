import { z } from 'zod';
import type { MeetingsRepository } from '../../repositories/meetings-repository.js';

const guestSessionSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

export class AuthService {
  constructor(private readonly repository: MeetingsRepository) {}

  async createGuestSession(rawInput: unknown) {
    const input = guestSessionSchema.parse(rawInput);
    const user = await this.repository.createUser({
      displayName: input.displayName,
    });
    const session = await this.repository.createSession(user.id);

    return {
      user,
      session,
    };
  }

  async getUserFromSessionToken(token?: string) {
    if (!token) return null;
    const session = await this.repository.getSession(token);
    if (!session) return null;
    const user = await this.repository.getUserById(session.userId);
    if (!user) return null;

    return {
      user,
      session,
    };
  }
}
