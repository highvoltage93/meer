export const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT NULL,
  password_hash TEXT NULL,
  first_name TEXT NULL,
  last_name TEXT NULL,
  auth_provider TEXT NOT NULL DEFAULT 'guest',
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name TEXT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_name TEXT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'guest';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
ON users (LOWER(username))
WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  token UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  host_name TEXT NOT NULL,
  pinned_participant_id UUID NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS pinned_participant_id UUID NULL;

CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_mic_on BOOLEAN NOT NULL DEFAULT TRUE,
  is_camera_on BOOLEAN NOT NULL DEFAULT TRUE,
  is_screen_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  is_hand_raised BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE meeting_participants
ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);

CREATE TABLE IF NOT EXISTS meeting_messages (
  id UUID PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sender_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_messages_meeting_id ON meeting_messages(meeting_id);
`;
