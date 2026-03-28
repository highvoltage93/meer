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
    status: row.status as 'active' | 'ended',
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapParticipant(row: Record<string, unknown>): MeetingParticipantRecord {
  return {
    id: String(row.id),
    meetingId: String(row.meeting_id),
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

export class PostgresMeetingsRepository implements MeetingsRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async createUser(input: { displayName: string }): Promise<UserRecord> {
    const id = randomUUID();
    const result = await this.db.pool.query(
      `INSERT INTO users (id, display_name) VALUES ($1, $2) RETURNING id, display_name, created_at`,
      [id, input.displayName],
    );
    const row = result.rows[0];
    return {
      id: String(row.id),
      displayName: String(row.display_name),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async getUserById(id: string): Promise<UserRecord | undefined> {
    const result = await this.db.pool.query(
      `SELECT id, display_name, created_at FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: String(row.id),
      displayName: String(row.display_name),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
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

  async addParticipant(input: { meetingId: string; name: string; role: MeetingRole }): Promise<MeetingParticipantRecord> {
    const id = randomUUID();
    const result = await this.db.pool.query(
      `INSERT INTO meeting_participants (id, meeting_id, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, input.meetingId, input.name, input.role],
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
