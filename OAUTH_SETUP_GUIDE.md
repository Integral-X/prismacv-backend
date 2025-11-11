# LinkedIn OAuth Backend Setup Guide

This guide walks you through setting up LinkedIn OAuth authentication in your NestJS backend.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database running
- LinkedIn Developer Account
- LinkedIn App created with OAuth 2.0 credentials

## Step 1: Install Required Dependencies

Install the LinkedIn OAuth2 Passport strategy:

```bash
npm install passport-linkedin-oauth2
npm install --save-dev @types/passport-linkedin-oauth2
```

## Step 2: Database Migration

Run Prisma migration to update the database schema:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_oauth_support
```

This will:
- Make the `password` field optional (for OAuth users)
- Add `provider` and `providerId` fields
- Add unique constraint on `(provider, providerId)` combination

## Step 3: Environment Variables

Add the following environment variables to your `.env` file:

```env
# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/v1/oauth/linkedin/callback

# For production, update the callback URL:
# LINKEDIN_CALLBACK_URL=https://yourdomain.com/api/v1/oauth/linkedin/callback
```

## Step 4: LinkedIn App Configuration

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app or select an existing one
3. In the "Auth" tab, add the following redirect URLs:
   - Development: `http://localhost:3000/api/v1/oauth/linkedin/callback`
   - Production: `https://yourdomain.com/api/v1/oauth/linkedin/callback`
4. Request the following OAuth 2.0 scopes:
   - `r_emailaddress` (to get user's email)
   - `r_liteprofile` (to get basic profile info)
5. Copy your Client ID and Client Secret to your `.env` file

**Note**: LinkedIn has deprecated some scopes. For newer LinkedIn API v2, you may need to use:
- `openid`
- `profile`
- `email`

## Step 5: Verify Installation

Start your development server:

```bash
npm run start:dev
```

The OAuth endpoints should now be available:
- `GET /api/v1/oauth/linkedin` - Initiates LinkedIn OAuth flow
- `GET /api/v1/oauth/linkedin/callback` - Handles LinkedIn callback

## Step 6: Test the Integration

1. Open your browser and navigate to:
   ```
   http://localhost:3000/api/v1/oauth/linkedin
   ```
2. You should be redirected to LinkedIn for authentication
3. After authentication, you'll be redirected back to the callback URL
4. The callback should return user data and JWT tokens

## Architecture Overview

The OAuth implementation follows a clean, scalable architecture:

### Directory Structure

```
src/modules/oauth/
├── dto/
│   └── oauth-callback.response.dto.ts
├── guards/
│   └── linkedin-auth.guard.ts
├── interfaces/
│   ├── oauth-provider.interface.ts
│   └── oauth-user.interface.ts
├── services/
│   ├── oauth.service.ts          # Core OAuth logic
│   └── linkedin-oauth.provider.ts # LinkedIn-specific provider
├── strategies/
│   └── linkedin.strategy.ts      # Passport LinkedIn strategy
├── oauth.controller.ts
└── oauth.module.ts
```

### Key Components

1. **OAuthService**: Handles user authentication/registration logic
   - Finds or creates users based on OAuth profile
   - Links OAuth accounts to existing email-based accounts
   - Generates JWT tokens

2. **LinkedInOAuthProvider**: Transforms LinkedIn profile data
   - Implements `IOAuthProvider` interface
   - Validates and normalizes LinkedIn profile data

3. **LinkedInStrategy**: Passport strategy for LinkedIn
   - Handles OAuth flow
   - Validates tokens and profiles

4. **OAuthController**: Exposes OAuth endpoints
   - `/oauth/linkedin` - Initiates flow
   - `/oauth/linkedin/callback` - Handles callback

### Adding Google OAuth (Future)

To add Google OAuth, you'll need to:

1. Install `passport-google-oauth20`:
   ```bash
   npm install passport-google-oauth20
   npm install --save-dev @types/passport-google-oauth20
   ```

2. Create `google-oauth.provider.ts` (similar to LinkedIn provider)

3. Create `google.strategy.ts` (similar to LinkedIn strategy)

4. Add Google endpoints to `oauth.controller.ts`

5. Add Google environment variables:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/oauth/google/callback
   ```

The architecture is already set up to support multiple providers easily!

## Troubleshooting

### Prisma Type Errors

If you see TypeScript errors related to Prisma types:
```bash
npx prisma generate
```

This regenerates the Prisma client with updated types.

### Migration Issues

If migration fails:
```bash
# Reset database (WARNING: This deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name add_oauth_support
```

### LinkedIn Authentication Errors

1. **"Invalid redirect_uri"**: 
   - Verify callback URL matches exactly in LinkedIn app settings
   - Check for trailing slashes or protocol mismatches

2. **"Invalid client credentials"**:
   - Verify `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in `.env`
   - Ensure no extra spaces or quotes

3. **Scope errors**:
   - Verify requested scopes are approved in LinkedIn app
   - Some scopes require LinkedIn partnership approval

### CORS Issues

If frontend can't access OAuth endpoints:
- Update CORS configuration in `main.ts`
- Ensure frontend origin is whitelisted

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS in Production**: Always use HTTPS for OAuth callbacks
3. **Token Storage**: Tokens are stored securely (hashed refresh tokens)
4. **Account Linking**: Existing email accounts can be linked to OAuth providers
5. **Password Validation**: OAuth users cannot use password-based login

## Next Steps

1. Review the frontend guide: `LINKEDIN_OAUTH_FRONTEND_GUIDE.md`
2. Test the complete flow end-to-end
3. Implement error handling and user feedback
4. Add logging and monitoring
5. Consider adding Google OAuth using the same pattern

## Support

For issues or questions:
- Check LinkedIn Developer Documentation
- Review NestJS Passport documentation
- Check Prisma migration logs

