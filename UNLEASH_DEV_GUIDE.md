# Unleash Feature Flags - Developer Guide

## Quick Start

Set environment variables:
```bash
UNLEASH_API_TOKEN=your-server-side-api-token-here
```

## Basic Usage

### Simple Feature Check
```typescript
// In any service or controller
constructor(private readonly unleashService: UnleashService) {}

// Basic on/off check
if (this.unleashService.isEnabled('new-feature')) {
  // New feature code
} else {
  // Default behavior
}
```

### With Context (Recommended)
```typescript
const context = {
  userId: user.id,
  environment: process.env.NODE_ENV,
};

if (this.unleashService.isEnabled('user-feature', context)) {
  // Feature enabled for this user
}
```

### A/B Testing
```typescript
const variant = this.unleashService.getVariant('experiment-feature', context);

switch (variant.name) {
  case 'variant-a':
    return this.handleVariantA();
  case 'variant-b': 
    return this.handleVariantB();
  default:
    return this.handleDefault();
}
```

## API Endpoints

- `GET /api/features` - List all flags
- `GET /api/features/check/:name` - Check specific flag
- `GET /api/features/refresh` - Refresh from server

## Best Practices

### Naming
- Use kebab-case: `new-user-dashboard`
- Be descriptive: `enhanced-medication-alerts` 
- Include scope: `admin-advanced-reports`

### Error Handling
```typescript
try {
  if (this.unleashService.isEnabled('risky-feature')) {
    return await this.newLogic();
  }
} catch (error) {
  this.logger.error('Feature flag failed, using default');
}
return await this.defaultLogic();
```

### Development
Leave `UNLEASH_API_TOKEN` empty to use mock mode during development.

## Creating New Features

1. Create flag in [Unleash Dashboard](https://unleash.prismacv.com)
2. Use in code: `unleashService.isEnabled('flag-name')`
3. Deploy with flag OFF
4. Enable in dashboard when ready

## Troubleshooting

- **Not connecting?** Check URL and API token
- **Features not updating?** Use `/api/features/refresh`
- **Need mock data?** Remove API token from environment
