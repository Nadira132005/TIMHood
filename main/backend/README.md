# Backend (TypeScript)

## Run

1. Copy `.env.example` to `.env` and adjust `MONGODB_URI`.
2. Install dependencies from repo root: `npm install`.
3. Start backend: `npm run dev:backend`.

Authenticated requests can use `Authorization: Bearer <token>` with the token returned by `/api/identity/nfc-login` or `/api/identity/demo-login`.

## Current structure

- `src/config`: environment and DB bootstrap
- `src/shared`: middleware, utils, and shared constants
- `src/modules`: domain modules aligned with INIT/ARCHITECTURE

## Implemented

- TypeScript backend with `tsx` dev runtime and `tsc` typecheck/build.
- One-time document-number proof flow under `identity` module.
- Home/work location upsert flow (home required, work optional).
- Real Mongoose models for all core domains:
  - communities, posts, events, pings, services
  - profiles/questions/answers/friendships
  - riddles/responses
  - discovery projections
  - notifications and audit logs
- Domain routers for communities/posts/events/pings/services/profiles/riddles/discovery/notifications.
