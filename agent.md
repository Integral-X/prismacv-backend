# Developer Agent Guide: PrismaCV Backend

## 1. Introduction and Philosophy
This repository contains the backend for PrismaCV, an AI-powered CV platform. This system is designed around **NestJS v11** using the architectural principles of strong typing, dependency injection, explicit DTO mapping, and deterministic error handling.

Your overarching goal as an AI agent operating in this repository is to:
- **Never mutate conventions**. If a pattern exists in `src/common` or `src/shared`, use it.
- **Fail gracefully**. Do not throw generic ES6 Errors; use specific `HttpException` variants from `@nestjs/common`.
- **Enforce type safety**. Avoid `any` at all costs. Utilize explicit interface boundaries.

## 2. Directory Structure Context
```
backend/
├── prisma/             # Database schema and migrations
├── src/
│   ├── common/         # Global NestJS constructs (Decorators, Filters, Guards, Interceptors)
│   ├── config/         # Environment setup and PrismaService mapping
│   ├── modules/        # Domain-driven feature modules (Auth, OAuth, Users)
│   ├── shared/         # Reusable utilities & constants (e.g. uuid.util.ts)
│   └── main.ts         # Application root/bootstrap (AppModule imported here)
└── test/               # Unit and e2e testing suite
```

## 3. Core Architecture Rules

### 3.1 Domain Modules (`src/modules`)
Every feature (e.g., Auth, OAuth, Users) has its own module directory.
- **Controllers** (`*.controller.ts`): Responsible ONLY for HTTP routing and Data Transfer Object (DTO) validation. **Zero business logic goes here.** Controllers should call Services.
- **Services** (`*.service.ts`): Responsible for business logic and data manipulation. Services interact with the database via `PrismaService`.
- **DTOs** (`/dto`): Data Transfer Objects. You MUST use `class-validator` (e.g., `@IsString()`, `@IsOptional()`) and `@ApiProperty()` decorators on all DTO properties for Swagger and validation.

### 3.2 Database & Prisma (`src/config/prisma.service.ts`)
- The ORM is Prisma. Models are defined in `prisma/schema.prisma`.
- When accessing the DB within a service, inject `PrismaService`. 
- **Mapping:** Note that while the DB tables are `snake_case` (e.g., `company_name`), Prisma auto-generates TypeScript types in `camelCase`. Always write `camelCase` TypeScript.
- **NEVER** instantiate PrismaClient directly in a service.

### 3.3 Error Handling
- Use NestJS built-in exceptions:
  - `NotFoundException`: Entity does not exist.
  - `ConflictException`: State conflict (e.g. duplicate email, missing prerequisites).
  - `BadRequestException`: Malformed payload / URL input issues.
  - `InternalServerErrorException`: Unhandled 3rd party failures.
- Global exception filtering is handled in `src/common/filters/http-exception.filter.ts`.

### 3.4 API Documentation (Swagger)
- Every controller endpoint must be decorated with Swagger tags.
- Use `@ApiOperation({ summary, description })`.
- Use `@ApiResponse({ status, description, type })` mapped explicitly to Response DTOs.
- Use `@ApiBearerAuth('JWT-auth')` for protected routes.

### 3.5 Security & Environment Variables
- Configuration must be loaded via Nest's `ConfigService`. **Do not read from `process.env` directly inside a domain module.**
- Valid environment mapping occurs in `src/config/app.config.ts`.
- Sensitive operations like cryptography must occur within protected auth scopes or specific util functions (e.g., `bcryptjs` hashing).

## 4. Testing Strategy
- **Framework**: Jest.
- **Unit Tests**: Name files `*.spec.ts` and sit them directly next to or in a mirrored `test/` directory to the file they test.
- **Mocking**: Use standard Jest mocks for `PrismaService` and `ConfigService`. DO NOT hit a real database in a unit test.
- Every new Service or Controller method must have an accompanying unit test checking success and expected exception paths.

## 5. Execution Workflow For Agents
Before calling `run_command` to compile:
1. Validate TS types (`npm run lint`).
2. Run unit tests (`npm run test`) if you modified core logic.
3. Build the server (`npm run build`).

*By adhering to these rules, you ensure PrismaCV scales predictably, securely, and seamlessly.*
