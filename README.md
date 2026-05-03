# PrismaCV Backend

[![Main Pipeline](https://github.com/Integral-X/prismacv-backend/actions/workflows/main.yml/badge.svg)](https://github.com/Integral-X/prismacv-backend/actions/workflows/main.yml)
[![PR Pipeline](https://github.com/Integral-X/prismacv-backend/actions/workflows/pr.yml/badge.svg)](https://github.com/Integral-X/prismacv-backend/actions/workflows/pr.yml)

Backend API for the PrismaCV platform — AI-powered CV building, job application tracking, skill gap analysis, and career management.

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS 10
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (dual-audience: admin + user), Google & LinkedIn OAuth
- **PDF Export**: Puppeteer (Chromium)
- **Feature Flags**: Unleash

## Getting Started

```bash
git clone https://github.com/integral-x/prismacv-backend.git
cd prismacv-backend
npm install
cp .env.example .env    # fill in required values
./start.sh              # starts Docker services + dev server
```

Stop everything: `./stop.sh`

### Environment Variables

Copy `.env.example` to `.env` and fill in the values.

#### Core (required)

| Variable | Purpose | Example |
| --- | --- | --- |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3210` |
| `API_PREFIX` | Global route prefix | `api` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/prismacv` |
| `JWT_SECRET` | Access token signing (≥ 32 chars) | *(random)* |
| `JWT_REFRESH_SECRET` | Refresh token signing (≥ 32 chars) | *(random, different)* |
| `ENCRYPTION_KEY` | OAuth token encryption (≥ 32 chars) | `openssl rand -base64 32` |
| `MASTER_ADMIN_EMAIL` | Seed admin email | `admin@prismacv.com` |
| `MASTER_ADMIN_PASSWORD` | Seed admin password | *(strong password)* |
| `CORS_ORIGIN` | Allowed frontend origin(s) | `https://www.prismacv.com` |
| `FRONTEND_URL` | Frontend URL for OAuth redirects | `https://www.prismacv.com` |

#### Email / OTP (required for user registration)

| Variable | Purpose | Example |
| --- | --- | --- |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `noreply@prismacv.com` |
| `SMTP_PASS` | SMTP password / app password | *(app password)* |
| `SMTP_FROM_NAME` | Sender display name | `PrismaCV` |
| `SMTP_FROM_EMAIL` | Sender email | `noreply@prismacv.com` |

#### Google OAuth (optional — gracefully disabled if unset)

| Variable | Purpose | Example |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | *(from Google Cloud Console)* |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `https://api.prismacv.com/api/v1/oauth/google/callback` |

#### LinkedIn OAuth (optional — gracefully disabled if unset)

| Variable | Purpose | Example |
| --- | --- | --- |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | *(from LinkedIn Dev Portal)* |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret | *(from LinkedIn Dev Portal)* |
| `LINKEDIN_CALLBACK_URL` | OAuth callback URL | `https://api.prismacv.com/api/v1/oauth/linkedin/callback` |

#### Optional

| Variable | Default | Purpose |
| --- | --- | --- |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `BCRYPT_ROUNDS` | `12` | Password hash rounds |
| `DISABLE_CORS` | `false` | Disable CORS (dev only) |
| `UNLEASH_URL` | — | Unleash server URL (mock mode if unset) |
| `UNLEASH_API_TOKEN` | — | Unleash server-side token |
| `LOG_LEVEL` | `info` | Logging verbosity |

## API Documentation

Swagger UI: [https://api.prismacv.com/api/docs](https://api.prismacv.com/api/docs)

## Development

```bash
npm run start:dev       # watch mode
npm run build           # compile
npm run lint            # eslint --fix
```

### Database

```bash
npm run db:migrate      # prisma migrate dev
npm run db:generate     # prisma generate
```

## Testing

```bash
npm run test            # unit tests (190 specs)
npm run test:e2e        # integration (requires postgres on :5433)
npm run test:cov        # coverage report
```

## Docker

```bash
docker build -t prismacv-backend .
docker run -p 3000:3000 --env-file .env prismacv-backend
```

Multi-stage build includes Chromium for PDF generation.

## License

Copyright (c) 2026 PrismaCV.
