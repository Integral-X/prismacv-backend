# PrismaCV Backend

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

### Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing (≥ 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing (≥ 32 chars) |

See `.env.example` for the full list (SMTP, OAuth, Unleash, etc.).

## API Documentation

Swagger UI: [https://api.prismacv.com/api/docs](https://api.prismacv.com/api/docs)

### Core Endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/auth/user/signup` | Register + send OTP |
| POST | `/api/v1/auth/user/login` | Login → tokens |
| GET | `/api/v1/cv` | List user's CVs (paginated) |
| POST | `/api/v1/cv` | Create CV |
| GET | `/api/v1/cv/:id` | Get CV with all sections |
| PATCH | `/api/v1/cv/:id` | Update CV metadata |
| DELETE | `/api/v1/cv/:id` | Delete CV |
| POST | `/api/v1/cv/:id/duplicate` | Duplicate CV |
| POST | `/api/v1/cv/import/linkedin` | Import from LinkedIn data |
| GET | `/api/v1/cv/:id/export/pdf` | Export CV as PDF |

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
