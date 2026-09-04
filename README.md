# StuSecure Backend

REST API for StuSecure — a QR-based hostel/campus security and attendance
system connecting Students, Security Guards, and Faculty/Admins. See
`../docs/Project_Overview.pdf` and `../docs/StuSecure_Roadmap.pdf` for the
full product and architecture spec.

## Stack

- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL (target: Neon)
- Firebase Authentication (identity only — role and all app data live in
  Postgres)
- Socket.IO (real-time movement/emergency updates)
- Zod (request validation)

## Prerequisites

- Node.js 20+
- A reachable PostgreSQL database (e.g. a free [Neon](https://neon.tech) project)
- A Firebase project with a service account key

## Setup

```bash
npm install
cp .env.example .env   # already present as .env with local placeholders — edit it
```

Edit `.env`:

- `DATABASE_URL` — your real Postgres connection string
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — from
  your Firebase service account JSON (keep the `\n`s in the private key escaped)

Then, once `DATABASE_URL` points at a real database:

```bash
npm run prisma:migrate   # creates the schema in your database
npm run dev              # starts the API with hot reload on http://localhost:5000
```

`npm run prisma:migrate` has **not** been run as part of this setup — it
requires a live database connection that doesn't exist yet in this environment.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Run the API with hot reload (`tsx watch`) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled build (`dist/server.js`) |
| `npm run prisma:generate` | Regenerate the Prisma client from `prisma/schema.prisma` |
| `npm run prisma:migrate` | Create/apply a migration against `DATABASE_URL` |
| `npm run prisma:studio` | Open Prisma Studio against `DATABASE_URL` |

## Project structure

```
src/
  config/       env parsing, Firebase Admin SDK init, Prisma client singleton
  middleware/   auth (Firebase token → app user), RBAC, error handling
  routes/       Express routers, mounted under /api
  controllers/  request/response handling
  services/     business logic
  repositories/ Prisma queries
  validators/   Zod request schemas
  utils/        ApiError, asyncHandler, logger
  app.ts        Express app assembly
  server.ts     HTTP + Socket.IO server entrypoint
prisma/
  schema.prisma
```

## Architecture rules

These come from `docs/StuSecure_Roadmap.pdf` and must hold for any change:

- Postgres (via Prisma) is the source of truth — Firebase is for auth, push
  notifications (FCM), and analytics only.
- The backend resolves a user's role from the database, never from a client
  header or the mobile app's local state.
- QR codes carry only an opaque, non-sensitive token (`QRIdentity.token`) —
  never personal data.
- A successful movement scan should update Postgres and broadcast over
  Socket.IO to faculty/admin monitoring screens.
