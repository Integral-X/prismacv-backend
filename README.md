# PrismaCV Backend

[![Main Pipeline](https://github.com/Integral-X/prismacv-backend/actions/workflows/main.yml/badge.svg)](https://github.com/Integral-X/prismacv-backend/actions/workflows/main.yml)
[![PR Pipeline](https://github.com/Integral-X/prismacv-backend/actions/workflows/pr.yml/badge.svg)](https://github.com/Integral-X/prismacv-backend/actions/workflows/pr.yml)

Backend API for PrismaCV: CV management, AI-assisted career tooling, billing, auth, and platform services.

## Current Status

- Feature-ready backend scope is implemented for CVs, jobs, skills, ATS, grammar, and cover letters.
- AI supports both built-in heuristics and OpenAI provider routing behind Unleash flags.
- Per-feature monthly AI quotas are enforced with failure-safe quota refund on provider errors.
- Billing is live via Stripe (checkout, portal, webhook, plan gating).
- Operational tooling is in place: Sentry, Prometheus `/metrics`, health checks, and optional BullMQ/Redis queueing.

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS 11
- **Database**: PostgreSQL + Prisma ORM 6
- **Auth**: JWT (user/admin), refresh tokens, Google & LinkedIn OAuth
- **AI**: Built-in providers + OpenAI (`AI_PROVIDER=openai`) with retries/timeouts/quotas
- **Billing**: Stripe subscriptions + webhook idempotency
- **Feature Flags**: Unleash
- **Observability**: Winston logging (PII redaction), Sentry, Prometheus metrics
- **Infrastructure**: Docker, health checks, optional BullMQ + Redis

## Getting Started

```bash
git clone https://github.com/integral-x/prismacv-backend.git
cd prismacv-backend
npm install
cp .env.example .env
./start.sh
```

Stop everything: `./stop.sh`

## Environment Variables

Copy `.env.example` to `.env` and fill values for your environment. The complete list lives in `.env.example`; key groups are below.

### Core

| Variable                                      | Purpose                          |
| --------------------------------------------- | -------------------------------- |
| `NODE_ENV`, `PORT`, `API_PREFIX`              | Runtime mode and API host/prefix |
| `DATABASE_URL`, `DATABASE_URL_TEST`           | Prisma PostgreSQL connections    |
| `FRONTEND_URL`, `CORS_ORIGIN`, `DISABLE_CORS` | Frontend redirects and CORS      |
| `APP_NAME`, `APP_VERSION`, `LOG_LEVEL`        | App identity and logging         |

### Auth and Security

| Variable                                                           | Purpose                               |
| ------------------------------------------------------------------ | ------------------------------------- |
| `JWT_SECRET`, `JWT_EXPIRES_IN`                                     | Access token signing and TTL          |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`                     | Refresh token signing and TTL         |
| `ENCRYPTION_KEY`                                                   | Encrypt OAuth provider tokens at rest |
| `MASTER_ADMIN_EMAIL`, `MASTER_ADMIN_PASSWORD`, `MASTER_ADMIN_NAME` | Seed admin account                    |
| `BCRYPT_ROUNDS`                                                    | Password hash cost                    |
| `THROTTLE_TTL`, `THROTTLE_LIMIT`                                   | Global throttle settings              |

### AI

| Variable                                            | Purpose                             |
| --------------------------------------------------- | ----------------------------------- |
| `AI_PROVIDER`, `OPENAI_API_KEY`, `AI_MODEL`         | Provider selection and model config |
| `AI_MAX_RETRIES`, `AI_TIMEOUT_MS`, `AI_TEMPERATURE` | Provider reliability and behavior   |
| `AI_MONTHLY_*_LIMIT`                                | Per-feature monthly quota limits    |
| `AI_ANALYSIS_CACHE_TTL_SECONDS`                     | CV analysis cache expiration        |

### Billing

| Variable                                                        | Purpose                             |
| --------------------------------------------------------------- | ----------------------------------- |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                    | Stripe API and webhook verification |
| `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`           | Pro plan price IDs                  |
| `STRIPE_PRICE_TEAM_MONTHLY`, `STRIPE_PRICE_TEAM_YEARLY`         | Team plan price IDs                 |
| `BILLING_PLAN_CACHE_TTL_SECONDS`, `BILLING_WEBHOOK_CACHE_LIMIT` | Billing performance/safety controls |

### Email and OTP

| Variable                                                                 | Purpose                          |
| ------------------------------------------------------------------------ | -------------------------------- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`                       | SMTP transport                   |
| `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `SUPPORT_EMAIL`                     | Email metadata                   |
| `SMTP_SKIP_AUTH`                                                         | MailHog/local SMTP compatibility |
| `OTP_EXPIRY_MINUTES`, `OTP_MAX_ATTEMPTS_*`, `RESET_TOKEN_EXPIRY_MINUTES` | OTP/password-reset policy        |
| `MAILHOG_API_URL`, `MAILHOG_E2E`                                         | MailHog smoke-test controls      |

### Feature Flags, Monitoring, and Queueing

| Variable                                   | Purpose                          |
| ------------------------------------------ | -------------------------------- |
| `UNLEASH_*`                                | Runtime feature flag integration |
| `SENTRY_DSN`, `SENTRY_*`                   | Error/trace monitoring           |
| `QUEUE_ENABLED`, `QUEUE_NAME`, `REDIS_URL` | Optional background jobs         |

### OAuth (Optional)

If OAuth keys are omitted, providers stay disabled gracefully:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_CALLBACK_URL`, `LINKEDIN_API_TIMEOUT_MS`

## API Documentation

Swagger UI is available in non-production environments:

- [https://api.prismacv.com/api/docs](https://api.prismacv.com/api/docs)

> Swagger is automatically disabled when `NODE_ENV=production`.

## Development

```bash
npm run start:dev
npm run build
npm run lint
npm run db:migrate
npm run db:generate
```

## Testing

```bash
npm run test
npm run test:e2e
npm run test:e2e:mailhog
npm run test:cov
```

## Docker

```bash
docker build -t prismacv-backend .
docker run -p 3000:3000 --env-file .env prismacv-backend
```

The image includes Chromium for PDF export and exposes health checks for container orchestration.

## License

Copyright (c) 2026 PrismaCV.
