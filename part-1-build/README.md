# Clinic Appointment System — REST API

A REST API for a simplified clinic appointment management system built with Node.js, Express 5, TypeScript, Prisma 7, and PostgreSQL.

---

## Quick Start (Docker)

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

This starts both PostgreSQL and the API server, runs migrations automatically, and is ready to accept requests.

---

## Local Development Setup

### Prerequisites

- **Node.js** >= 20
- **PostgreSQL** >= 14 running locally (or via Docker)

### 1. Install dependencies

```bash
cd part-1-build
npm install
```

### 2. Configure environment

Create a `.env` file in `part-1-build/`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/clinic?schema=public
JWT_SECRET=your-strong-random-secret-here
JWT_EXPIRES_IN=7d
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the development server

```bash
npm run dev
```

The API will be running at `http://localhost:3000`.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Register a new user |
| `POST` | `/auth/login` | No | Login and get JWT token |
| `GET` | `/appointments` | Yes | List appointments (role-filtered) |
| `POST` | `/appointments` | Yes | Book a new appointment (PATIENT only) |
| `GET` | `/appointments/:id` | Yes | Get a single appointment |
| `PATCH` | `/appointments/:id/cancel` | Yes | Cancel an appointment |

### Authentication

All `/appointments` endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Response Format

All responses follow a consistent envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Human-readable message" }
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js + Express 5 |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod 4 |
| Security | helmet, cors, bcrypt |

---

## Project Structure

```
part-1-build/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   ├── prisma.ts              # Prisma client instance
│   ├── controllers/           # Route handlers
│   ├── services/              # Business logic
│   ├── middlewares/           # Auth & error middleware
│   ├── routes/                # Routes
│   ├── validators/            # Zod schemas
│   └── utils/                 # JWT, response helpers
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Design Decisions

- **Claude Opus 4.6**: Used AI to support me as Autocomplete and create some files.
- **Prisma 7 + pg adapter**: Prisma 7 requires the `@prisma/adapter-pg` library instead of the traditional datasource URL in the schema. The connection URL is configured in `prisma.config.ts`.
- **Appointment overlap detection**: Uses `endTime` field (computed from `dateTime + duration`) with range intersection queries for accurate conflict detection.
- **Role-based access**: Enforced at the service layer, patients see only their appointments, doctors see only theirs, admins see all.
- **Passwords**: Hashed with bcrypt.
