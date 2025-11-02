# Contributing to PrismaCV Backend

This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Docker & Docker Compose (for running the PostgreSQL database)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/integral-x/prismacv-backend.git
   cd prismacv-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development environment**
   ```bash
   ./start.sh
   ```
5. **Stop all services**
   ```bash
   ./stop.sh
   ```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing ESLint and Prettier configuration
- Write meaningful comments and commit messages
- Add API doc for new APIs

### Testing

- Write unit tests for all new features
- Maintain test coverage above 80%
- Write E2E tests for API endpoints
- Run tests, lints before submitting PRs

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

### Database Changes

- Use Prisma migrations for schema changes
- Always create reversible migrations
- Update seed data if necessary
- Test migrations on a copy of production data

```bash
# Create migration
npx prisma migrate dev --name your-migration-name

# Reset database (development only)
npx prisma migrate reset
```

## Trunk-Based Development Process

We follow trunk-based development with short-lived feature branches.

1. **Create a short-lived feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Keep branches small and focused**
   - Work on one feature/fix at a time
   - Merge within 1-2 days maximum
   - Break large features into smaller chunks

3. **Make your changes**
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation if needed

4. **Test your changes**
   ```bash
   npm run lint
   npm run test
   npm run test:e2e
   ```

5. **Commit frequently with meaningful messages**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

6. **Rebase and push**
   ```bash
   git rebase main
   git push origin feature/your-feature-name
   ```

7. **Create PR immediately**
   - Don't wait for feature completion
   - Use feature flags for incomplete features
   - Merge quickly after review

### PR Requirements

- All tests pass
- Code follows style guidelines
- Documentation is updated
- Breaking changes are documented
- Security implications are considered
- Feature flags used for incomplete/new features

### Trunk-Based Development Rules

- Keep feature branches alive for maximum 2 days
- Merge to main at least once per day
- Use feature flags to hide incomplete features
- Never break the main branch
- All commits to main must be deployable
- Use continuous integration for every commit

## Architecture Guidelines

### Module Structure

```
src/modules/feature-name/
├── dto/                 # Data Transfer Objects
├── entities/           # Database entities (if needed)
├── feature-name.controller.ts
├── feature-name.service.ts
├── feature-name.module.ts
└── __tests__/          # Unit tests
```

### API Design

- Use RESTful conventions
- Implement proper HTTP status codes
- Add OpenAPI/Swagger documentation
- Use DTOs for request/response validation
- Implement proper error handling

## Feature Requests

For new features:

- Describe the use case
- Explain the expected behavior
- Consider backward compatibility
- Discuss performance implications

## Documentation

- Update README.md for setup changes
- Add API documentation using Swagger decorators
- Document complex business logic
- Update CHANGELOG.md for releases

## Security

- Don't commit sensitive information
- Use environment variables for secrets
- Follow security best practices

Thank you for contributing to PrismaCV Backend!