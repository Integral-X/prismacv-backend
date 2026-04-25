# CLAUDE.md — PrismaCV Backend

## Quick Reference

```bash
# Development
npm run start:dev          # NestJS watch mode
npm run build              # nest build (tsc)
npm run lint               # eslint --fix
npm run test               # jest (unit tests)
npm run test:e2e           # requires postgres on :5433, runs migrations + seed
npm run test:cov           # jest --coverage

# Database
npm run db:migrate         # prisma migrate dev
npm run db:deploy          # prisma migrate deploy
npm run db:generate        # prisma generate
docker-compose up -d postgres_test   # spin up test DB on port 5433

# Validate before committing (always do this)
npx nest build && npx eslint . && npx jest --no-cache
```

## Architecture Overview

NestJS 10 + Prisma + PostgreSQL. REST API with Swagger docs at `/api/v1/docs`.

```
src/
├── main.ts                    # Bootstrap: helmet, compression, CORS, ValidationPipe, Swagger
├── app.module.ts              # Root module, global APP_GUARD = JwtAdminAuthGuard
├── config/                    # AppConfig factory, PrismaService, logger, feature-flags
├── common/                    # Cross-cutting: decorators, guards, interceptors, filters
├── modules/
│   ├── auth/                  # Admin + user auth, JWT, OTP, password flows
│   ├── email/                 # Nodemailer + HTML templates (global module)
│   ├── health/                # GET /health
│   ├── oauth/                 # Google + LinkedIn OAuth with provider pattern
│   └── unleash/               # Feature flags
└── shared/                    # Constants, utils, base classes, pagination DTO
```

### Module Dependency Graph

```
AppModule
├── DatabaseModule (@Global)    → PrismaService
├── EmailModule (@Global)       → EmailService
├── AuthModule                  → AuthService, UsersService, OtpService, AuthMapper
├── OAuthModule                 → imports AuthModule
├── UnleashModule               → UnleashService
└── HealthModule
```

### Request Lifecycle

```
HTTP Request
  → helmet + compression
  → CORS
  → ValidationPipe (whitelist, forbidNonWhitelisted, transform, implicitConversion)
  → JwtAdminAuthGuard (global; @Public() routes bypass)
  → Controller method
      → Mapper: DTO → entity
      → Service: business logic + PrismaService
      → Mapper: entity → response DTO
  → TransformInterceptor wraps: { success: true, data, timestamp }
  → LoggingInterceptor logs: method, url, duration
  → HttpExceptionFilter catches errors: { statusCode, timestamp, path, method, message }
```

## Coding Patterns

### File Naming

`kebab-case.purpose.extension` — the purpose suffix is mandatory:

```
admin-login.request.dto.ts       # Request DTO
user-login.response.dto.ts       # Response DTO
auth.service.ts                  # Service
auth.controller.ts               # Controller
auth.mapper.ts                   # Mapper
jwt-user.strategy.ts             # Passport strategy
jwt-user-auth.guard.ts           # Guard
user.entity.ts                   # Domain entity
http-exception.filter.ts         # Exception filter
transform.interceptor.ts         # Interceptor
public.decorator.ts              # Decorator
```

### Controller Decorator Stacking Order

```typescript
@Public()                                          // 1. Access control
@UseGuards(JwtUserAuthGuard)                       // 2. Specific guard (if needed)
@Post('endpoint')                                  // 3. Route
@HttpCode(HttpStatus.OK)                           // 4. HTTP metadata
@Throttle({ default: { limit: 5, ttl: 300000 } }) // 5. Rate limiting
@ApiBearerAuth('JWT-auth')                         // 6. Swagger auth
@ApiOperation({ summary: '...', description: '...' }) // 7. Swagger docs
@ApiBody({ type: RequestDto })
@ApiResponse({ status: 200, type: ResponseDto })
@ApiResponse({ status: 401, description: '...' })
async method(@Body() dto: RequestDto): Promise<ResponseDto> { }
```

### DTOs

**Request DTOs** use `class-validator` + `@ApiProperty`:
```typescript
export class AdminLoginRequestDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(4)
  password: string;
}
```

**Response DTOs** use only `@ApiProperty` (no validation decorators):
```typescript
export class AdminLoginResponseDto {
  @ApiProperty({ description: 'JWT Access Token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT Refresh Token' })
  refreshToken: string;
}
```

Request DTOs go in `dto/request/`, response DTOs go in `dto/response/`.

### Entities

Plain TypeScript classes extending `BaseEntity` (no Prisma annotations):
```typescript
export class User extends BaseEntity {
  email: string;
  password?: string;
  name?: string;
  role: UserRole;
  isMasterAdmin: boolean = false;
  // ...
}
```

Prisma-to-entity mapping lives in `UsersService.prismaUserToEntity()`. Entities are the domain layer — never pass Prisma types across service boundaries.

### Mappers

`AuthMapper` is an `@Injectable()` service with method naming `[source]To[Target]`:
- `signupRequestToEntity(dto)` — normalises email (lowercase + trim)
- `loginRequestToCredentials(dto)`
- `userToProfileResponse(user)`
- `userToUserLoginResponse(user, tokens)`
- `tokensToAdminLoginResponse(tokens)`

All mapper methods throw `BadRequestException` on null input.

Note: `AuthMapper` does **not** extend `BaseMapper`. `BaseMapper<TDto, TEntity>` exists in `shared/mappers/` but is unused — it's a template for future modules.

### Error Handling

Services throw NestJS HTTP exceptions directly:
- `UnauthorizedException` — invalid credentials, expired tokens, insufficient permissions
- `BadRequestException` — validation failures, policy violations
- `ConflictException` — duplicate email (Prisma P2002)
- `NotFoundException` — entity not found
- `ForbiddenException` — role-based denial (master admin only)

For security-sensitive flows (forgot-password), always return the same response to avoid user enumeration.

### Logger Pattern

```typescript
private readonly logger = new Logger(ClassName.name);
```

Levels: `log` for happy-path, `warn` for failed validations, `error` for exceptions.

### ID Generation

All new records use UUIDv7 (`uuidv7` package) — time-ordered for DB index locality. The `User.id` column is `@db.Uuid`.

## Auth Architecture

### Dual-Audience JWT System

Two Passport strategies with audience segregation:

| Strategy | Name | Audience | Validates |
|---|---|---|---|
| `JwtAdminStrategy` | `jwt-admin` | `platform-admin` | `role === PLATFORM_ADMIN` (payload + DB) |
| `JwtUserStrategy` | `jwt-user` | `user` | `role === REGULAR` (payload + DB) |

**Token claims**: `sub` (userId), `email`, `role`, `isMasterAdmin`, `iss` (PrismaCV), `aud` (audience), `jti` (randomUUID), `exp`, `iat`. Algorithm: `HS256`.

**Expiration**: Access token 15m, refresh token 7d.

### Guard System

- `JwtAdminAuthGuard` — **global** `APP_GUARD`. All routes require admin JWT unless marked `@Public()`.
- `JwtUserAuthGuard` — applied per-route. **No** `@Public()` bypass — always authenticates.
- Pattern for user-protected routes: `@Public()` (bypass global admin guard) + `@UseGuards(JwtUserAuthGuard)` (enforce user auth).

### Auth Flows

**Admin**: `POST /auth/admin/login` → tokens. `POST /auth/admin/create` (master admin only) → profile. `POST /auth/admin/refresh` → new tokens.

**User**: `POST /auth/user/signup` → profile + OTP email. `POST /otp/verify-signup` → tokens. `POST /auth/user/login` → tokens (requires verified email). `POST /auth/user/refresh` → new tokens.

**OAuth**: `GET /oauth/google` or `/oauth/linkedin` → callback → tokens (REGULAR users only).

**Password reset**: `POST /auth/user/forgot-password` → OTP email. `POST /otp/verify-reset` → reset token. `POST /auth/user/reset-password` → done.

### Security Details

- Startup validation: `JWT_SECRET` and `JWT_REFRESH_SECRET` must be ≥ 32 chars (`OnModuleInit`)
- Refresh tokens: bcrypt-hashed at rest, rotated on every use
- OTP codes: bcrypt-hashed at rest, stored in separate `Otp` table
- OAuth tokens: AES-256-GCM encrypted at rest (PBKDF2 key derivation)
- Password reset tokens: bcrypt-hashed, stored in `AuthToken` table, 15min expiry
- Rate limiting: 5 attempts per 5 minutes on OTP and forgot-password endpoints

## Database

PostgreSQL via Prisma ORM.

### Models

| Model | Purpose | Key Fields |
|---|---|---|
| `User` | Core user record | `id` (UUIDv7), `email`, `password?`, `role`, `isMasterAdmin`, `emailVerified`, `provider?`, `providerId?` |
| `Otp` | OTP codes (bcrypt-hashed) | `userId`, `purpose` (SIGNUP/PASSWORD_RESET), `otpHash`, `attempts`, `expiresAt` |
| `AuthToken` | Reset tokens (bcrypt-hashed) | `userId`, `purpose`, `tokenHash`, `expiresAt`, `usedAt` |
| `LinkedinCvImport` | LinkedIn CV data | `userId`, `linkedinUrl`, JSON fields for profile/experience/education/skills |

### Enums

`UserRole`: `REGULAR`, `PLATFORM_ADMIN`
`OtpPurpose`: `SIGNUP_EMAIL_VERIFICATION`, `PASSWORD_RESET`
`AuthTokenPurpose`: `PASSWORD_RESET`, `EMAIL_VERIFICATION_LINK`, `ACCOUNT_ACTIVATION`

### Docker

```bash
docker-compose up -d postgres       # dev DB on port 5432
docker-compose up -d postgres_test  # test DB on port 5433
```

Credentials: `prismacv:password`. Dev DB: `prismacv_dev`. Test DB: `prismacv_test`.

## Testing

### Structure

```
test/
├── e2e/                          # Full app integration tests (need DB)
│   ├── jest-e2e.json
│   └── *.e2e-spec.ts
├── helpers/
│   └── mock-user.helper.ts       # mockUser() and mockOtp() factories
├── modules/                      # Unit tests mirroring src/modules/
└── shared/
```

### Unit Test Patterns

Use `@nestjs/testing` with `Test.createTestingModule`. Three mocking approaches:

1. **`jest-mock-extended`** for Prisma: `mockDeep<PrismaService>()`
2. **Manual mock objects** for services in controller tests:
   ```typescript
   { provide: AuthService, useValue: { adminLogin: jest.fn(), ... } }
   ```
3. **`jest.spyOn`** for partial mocking within service tests

**ConfigService mock pattern:**
```typescript
{
  provide: ConfigService,
  useValue: {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        JWT_SECRET: '01234567890123456789012345678901',
        JWT_REFRESH_SECRET: '01234567890123456789012345678901',
        'app.name': 'PrismaCV',
        'security.encryptionKey': '01234567890123456789012345678901',
      };
      return config[key] ?? defaultValue;
    }),
  },
}
```

**Entity fixtures**: Use `Object.assign(new User(), { ... })` or `mockUser()` helper.

### E2E Tests

Require PostgreSQL on port 5433. Run via `npm run test:e2e` (auto-migrates and seeds). Set `UNLEASH_MOCK=true` and all OAuth env vars (can be dummy values). Use `supertest` for HTTP calls.

### Test Naming Convention

Files: `*.spec.ts` (unit), `*.e2e-spec.ts` (integration).

Test structure:
```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should do X when Y', async () => { ... });
    it('should throw Z when W', async () => { ... });
  });
});
```

## Config

### Env Vars (critical)

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | ≥ 32 chars, validated at startup |
| `JWT_REFRESH_SECRET` | Yes | ≥ 32 chars, validated at startup |
| `MASTER_ADMIN_EMAIL` | For seed | Seeded admin account |
| `MASTER_ADMIN_PASSWORD` | For seed | Seeded admin password |
| `ENCRYPTION_KEY` | For OAuth | ≥ 32 chars, AES-256 key for OAuth token encryption |
| `SMTP_USER` / `SMTP_PASS` | For email | If absent, email is disabled (logged warning) |
| `LINKEDIN_CLIENT_ID` / `SECRET` | For OAuth | Required if LinkedIn OAuth enabled |
| `GOOGLE_CLIENT_ID` / `SECRET` | For OAuth | Required if Google OAuth enabled |
| `UNLEASH_MOCK` | For tests | Set `true` to skip real Unleash |

### Path Aliases

`@/*` maps to `src/*` (configured in both `tsconfig.json` and Jest `moduleNameMapper`).

## TypeScript

- Target: `ES2020`, Module: `CommonJS`
- `strict: true` (strictNullChecks, noImplicitAny, etc.)
- DTOs/entities use `!` definite assignment assertions for class-validator pattern
- Prisma returns `null`, domain entities use `undefined` — convert with `?? undefined`
- `@typescript-eslint/no-explicit-any: off`
- ESLint: flat config (`eslint.config.js`) with TypeScript-ESLint + Prettier
- No explicit return types required (`explicit-function-return-type: off`)

## Conventions to Follow

1. **Never bypass the mapper layer** — always convert DTOs ↔ entities through mapper methods
2. **Never expose Prisma types outside services** — `UsersService.prismaUserToEntity()` is the boundary
3. **Always validate at system boundaries** — use class-validator on request DTOs, trust internal types
4. **Use NestJS HTTP exceptions** — don't create custom exception classes
5. **Rate limit sensitive endpoints** — `@Throttle()` on OTP, password reset, login
6. **Security-sensitive responses** — return generic success to prevent user enumeration
7. **New entities get UUIDv7 IDs** — use `generateUuidv7()` from shared utils
8. **Encrypt sensitive data at rest** — use `EncryptionUtil` for OAuth tokens, bcrypt for passwords/OTPs/tokens
9. **All responses are wrapped** — `TransformInterceptor` adds `{ success, data, timestamp }` automatically
10. **Test before commit** — run `npx nest build && npx eslint . && npx jest --no-cache`
