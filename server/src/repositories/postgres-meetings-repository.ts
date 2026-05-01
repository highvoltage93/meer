import { randomUUID } from 'node:crypto';
import type {
  MeetingMessageRecord,
  MeetingParticipantRecord,
  MeetingRecord,
  MeetingRole,
  SessionRecord,
  UserRecord,
} from '../types/meeting.js';
import type { MeetingsRepository } from './meetings-repository.js';
import { PostgresDatabase } from '../db/postgres.js';

function createMeetingCode() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const chunk = () =>
    Array.from({ length: 3 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${chunk()}-${chunk()}-${chunk()}`;
}

function mapMeeting(row: Record<string, unknown>): MeetingRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    hostUserId: String(row.host_user_id),
    hostName: String(row.host_name),
    pinnedParticipantId: row.pinned_participant_id ? String(row.pinned_participant_id) : undefined,
    status: row.status as 'active' | 'ended',
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapParticipant(row: Record<string, unknown>): MeetingParticipantRecord {
  return {
    id: String(row.id),
    meetingId: String(row.meeting_id),
    userId: row.user_id ? String(row.user_id) : undefined,
    name: String(row.name),
    role: row.role as MeetingRole,
    joinedAt: new Date(String(row.joined_at)).toISOString(),
    isMicOn: Boolean(row.is_mic_on),
    isCameraOn: Boolean(row.is_camera_on),
    isScreenSharing: Boolean(row.is_screen_sharing),
    isHandRaised: Boolean(row.is_hand_raised),
  };
}

function mapMessage(row: Record<string, unknown>): MeetingMessageRecord {
  return {
    id: String(row.id),
    meetingId: String(row.meeting_id),
    senderUserId: row.sender_user_id ? String(row.sender_user_id) : undefined,
    senderName: String(row.sender_name),
    body: String(row.body),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    username: row.username ? String(row.username) : undefined,
    passwordHash: row.password_hash ? String(row.password_hash) : undefined,
    firstName: row.first_name ? String(row.first_name) : undefined,
    lastName: row.last_name ? String(row.last_name) : undefined,
    authProvider: (row.auth_provider as UserRecord['authProvider']) ?? 'guest',
    displayName: String(row.display_name),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export class PostgresMeetingsRepository implements MeetingsRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async createUser(input: {
    displayName: string;
    username?: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    authProvider?: UserRecord['authProvider'];
  }): Promise<UserRecord> {
    const id = randomUUID();
    const result = await this.db.pool.query(
      `INSERT INTO users (id, username, password_hash, first_name, last_name, auth_provider, display_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, password_hash, first_name, last_name, auth_provider, display_name, created_at`,
      [
        id,
        input.username?.toLowerCase() ?? null,
        input.passwordHash ?? null,
        input.firstName ?? null,
        input.lastName ?? null,
        input.authProvider ?? 'guest',
        input.displayName,
      ],
    );
    return mapUser(result.rows[0]);
  }

  async getUserById(id: string): Promise<UserRecord | undefined> {
    const result = await this.db.pool.query(
      `SELECT id, username, password_hash, first_name, last_name, auth_provider, display_name, created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return mapUser(row);
  }

  async getUserByUsername(username: string): Promise<UserRecord | undefined> {
    const result = await this.db.pool.query(
      `SELECT id, username, password_hash, first_name, last_name, auth_provider, display_name, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [username],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return mapUser(row);
  }

  async updateUserDisplayName(id: string, displayName: string): Promise<UserRecord | undefined> {
    const result = await this.db.pool.query(
      `UPDATE users
       SET display_name = $2
       WHERE id = $1
       RETURNING id, username, password_hash, first_name, last_name, auth_provider, display_name, created_at`,
      [id, displayName],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return mapUser(row);
  }

  async createSession(userId: string): Promise<SessionRecord> {
    const token = randomUUID();
    const result = await this.db.pool.query(
      `INSERT INTO sessions (token, user_id) VALUES ($1, $2) RETURNING token, user_id, created_at`,
      [token, userId],
    );
    const row = result.rows[0];
    return {
      token: String(row.token),
      userId: String(row.user_id),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async getSession(token: string): Promise<SessionRecord | undefined> {
    const result = await this.db.pool.query(
      `SELECT token, user_id, created_at FROM sessions WHERE token = $1 LIMIT 1`,
      [token],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      token: String(row.token),
      userId: String(row.user_id),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async createMeeting(input: { title: string; hostName: string; hostUserId: string }): Promise<MeetingRecord> {
    const id = randomUUID();
    const code = createMeetingCode();
    const result = await this.db.pool.query(
      `INSERT INTO meetings (id, code, title, host_user_id, host_name, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [id, code, input.title, input.hostUserId, input.hostName],
    );
    return mapMeeting(result.rows[0]);
  }

  async getMeetingById(id: string): Promise<MeetingRecord | undefined> {
    const result = await this.db.pool.query(`SELECT * FROM meetings WHERE id = $1 LIMIT 1`, [id]);
    return result.rows[0] ? mapMeeting(result.rows[0]) : undefined;
  }

  async getMeetingByCode(code: string): Promise<MeetingRecord | undefined> {
    const result = await this.db.pool.query(`SELECT * FROM meetings WHERE code = $1 LIMIT 1`, [code]);
    return result.rows[0] ? mapMeeting(result.rows[0]) : undefined;
  }

  async updateMeetingPin(meetingId: string, participantId?: string): Promise<MeetingRecord | undefined> {
    const result = await this.db.pool.query(
      `UPDATE meetings SET pinned_participant_id = $2 WHERE id = $1 RETURNING *`,
      [meetingId, participantId ?? null],
    );
    return result.rows[0] ? mapMeeting(result.rows[0]) : undefined;
  }

  async listMeetingsByHostUserId(userId: string): Promise<MeetingRecord[]> {
    const result = await this.db.pool.query(
      `SELECT * FROM meetings WHERE host_user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map((row) => mapMeeting(row));
  }

  async addParticipant(input: {
    meetingId: string;
    name: string;
    role: MeetingRole;
    userId?: string;
  }): Promise<MeetingParticipantRecord> {
    if (input.userId) {
      const existing = await this.db.pool.query(
        `SELECT * FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2 LIMIT 1`,
        [input.meetingId, input.userId],
      );

      if (existing.rows[0]) {
        const updated = await this.db.pool.query(
          `UPDATE meeting_participants
           SET name = $3, role = $4
           WHERE meeting_id = $1 AND user_id = $2
           RETURNING *`,
          [input.meetingId, input.userId, input.name, input.role],
        );
        return mapParticipant(updated.rows[0]);
      }
    }

    const id = randomUUID();
    const result = await this.db.pool.query(
      `INSERT INTO meeting_participants (id, meeting_id, user_id, name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, input.meetingId, input.userId ?? null, input.name, input.role],
    );
    return mapParticipant(result.rows[0]);
  }

  async removeParticipant(meetingId: string, participantId: string): Promise<void> {
    await this.db.pool.query(
      `DELETE FROM meeting_participants WHERE meeting_id = $1 AND id = $2`,
      [meetingId, participantId],
    );
  }

  async updateParticipantState(
    meetingId: string,
    participantId: string,
    patch: Partial<
      Pick<MeetingParticipantRecord, 'isMicOn' | 'isCameraOn' | 'isScreenSharing' | 'isHandRaised'>
    >,
  ): Promise<MeetingParticipantRecord | undefined> {
    const current = await this.db.pool.query(
      `SELECT * FROM meeting_participants WHERE meeting_id = $1 AND id = $2 LIMIT 1`,
      [meetingId, participantId],
    );
    const row = current.rows[0];
    if (!row) return undefined;

    const next = {
      isMicOn: patch.isMicOn ?? Boolean(row.is_mic_on),
      isCameraOn: patch.isCameraOn ?? Boolean(row.is_camera_on),
      isScreenSharing: patch.isScreenSharing ?? Boolean(row.is_screen_sharing),
      isHandRaised: patch.isHandRaised ?? Boolean(row.is_hand_raised),
    };

    const result = await this.db.pool.query(
      `UPDATE meeting_participants
       SET is_mic_on = $3, is_camera_on = $4, is_screen_sharing = $5, is_hand_raised = $6
       WHERE meeting_id = $1 AND id = $2
       RETURNING *`,
      [meetingId, participantId, next.isMicOn, next.isCameraOn, next.isScreenSharing, next.isHandRaised],
    );
    return result.rows[0] ? mapParticipant(result.rows[0]) : undefined;
  }

  async listParticipants(meetingId: string): Promise<MeetingParticipantRecord[]> {
    const result = await this.db.pool.query(
      `SELECT * FROM meeting_participants WHERE meeting_id = $1 ORDER BY joined_at ASC`,
      [meetingId],
    );
    return result.rows.map((row) => mapParticipant(row));
  }

  async addMessage(input: {
    meetingId: string;
    senderName: string;
    senderUserId?: string;
    body: string;
  }): Promise<MeetingMessageRecord> {
    const id = randomUUID();
    const result = await this.db.pool.query(
      `INSERT INTO meeting_messages (id, meeting_id, sender_user_id, sender_name, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, input.meetingId, input.senderUserId ?? null, input.senderName, input.body],
    );
    return mapMessage(result.rows[0]);
  }

  async listMessages(meetingId: string): Promise<MeetingMessageRecord[]> {
    const result = await this.db.pool.query(
      `SELECT * FROM meeting_messages WHERE meeting_id = $1 ORDER BY created_at ASC`,
      [meetingId],
    );
    return result.rows.map((row) => mapMessage(row));
  }
}
