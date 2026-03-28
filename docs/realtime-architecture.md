# Realtime Video Call Architecture

## Goal

Move `Mitingo` from a frontend-only meeting simulator to a production-ready video call platform with real device media, multi-user presence, room permissions, reconnect handling, and a backend that can scale beyond simple peer-to-peer limits.

## Recommended stack

- SFU: LiveKit
- Frontend transport SDK: `livekit-client`
- Backend API: Node.js service for auth, room lifecycle, webhooks, moderation, and token issuance
- Persistence: PostgreSQL
- Cache/presence helpers: Redis
- Object storage: S3-compatible bucket for recordings and artifacts
- Observability: Sentry + OpenTelemetry + provider-level metrics

## Why SFU and not mesh

Mesh breaks down quickly as participant counts grow because each browser must send media to every other participant. For a Meet-like product we want an SFU topology so each client publishes once and receives subscribed tracks from the media layer.

## Target system shape

1. React app authenticates user.
2. Frontend requests a meeting access token from backend.
3. Backend validates room membership and role.
4. Backend issues a short-lived provider token.
5. Frontend connects to the SFU room.
6. Media, participant events, mute state, and screen share travel through the realtime layer.
7. Product events such as chat history, scheduling, lobby approval, and audit logs remain backend-owned.

## Domain boundaries

### Frontend owns

- device selection UX
- pre-join flow
- room layout and controls
- optimistic UI for mute/camera/screen share
- reconnection state surfaces

### Backend owns

- user identity
- room creation and meeting metadata
- authorization and token minting
- lobby and moderator actions
- chat persistence
- recordings
- analytics and audit trail

### RTC provider owns

- track transport
- participant connectivity
- adaptive streaming
- simulcast and bandwidth management
- network resilience internals

## Frontend module plan

- `meetings-store`: product-level meeting metadata for local UX
- `call-session-store`: live call session state
- `realtime-provider`: abstraction so UI is not coupled directly to one vendor
- `livekit-realtime-provider`: production implementation
- `mock-realtime-provider`: local fallback for development and tests

## Backend endpoints to add next

- `POST /api/meetings`
- `POST /api/meetings/:id/join-token`
- `POST /api/meetings/:id/chat`
- `GET /api/meetings/:id`
- `POST /api/webhooks/livekit`

## Data model sketch

### meetings

- `id`
- `code`
- `title`
- `host_user_id`
- `status`
- `created_at`

### meeting_participants

- `id`
- `meeting_id`
- `user_id`
- `role`
- `joined_at`
- `left_at`

### meeting_messages

- `id`
- `meeting_id`
- `sender_user_id`
- `body`
- `created_at`

## Rollout phases

1. Add provider abstraction and env-driven RTC config in frontend.
2. Build backend token endpoint and room policy service.
3. Replace local fake participants with realtime participant state.
4. Add chat persistence, presence sync, and moderation actions.
5. Add recordings, webhooks, and observability.

## Non-negotiable production requirements

- short-lived signed access tokens
- no provider secrets in frontend
- reconnect and stale-session handling
- idempotent webhooks
- role-based room permissions
- metrics for join success, reconnect rate, publish failures, and average session duration
