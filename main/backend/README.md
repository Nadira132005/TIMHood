# Backend (TypeScript)

## Run

1. Copy `.env.example` to `.env` and adjust `MONGODB_URI`.
2. Install dependencies from repo root: `npm install`.
3. Start backend: `npm run dev:backend`.

Authenticated requests can use `Authorization: Bearer <token>` with the token returned by `/api/identity/nfc-login` or `/api/identity/demo-login`.

To connect to the backend run: `ssh -i timhood-backend.pem ec2-user@13.51.178.7`
To see the logs from the running process: `tmux attach -t backend`