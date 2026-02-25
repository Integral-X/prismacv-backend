import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { INestApplication } from '@nestjs/common';
import { UsersService } from './../../src/modules/auth/users.service';
import { PrismaService } from './../../src/config/prisma.service';

describe('OAuth Token Encryption (e2e)', () => {
    let app: INestApplication;
    let usersService: UsersService;
    let prismaService: PrismaService;

    beforeAll(async () => {
        process.env.ENCRYPTION_KEY = 'super-secret-key-for-testing-only-with-32-chars';
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        usersService = app.get<UsersService>(UsersService);
        prismaService = app.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        await app.close();
    });

    it('should transparently encrypt/decrypt OAuth tokens', async () => {
        const email = `test-enc-${Date.now()}@example.com`;
        const plainAccessToken = 'super-secret-linkedin-access-token';
        const plainRefreshToken = 'super-secret-linkedin-refresh-token';

        // 1. Create user via UsersService
        const createdUser = await usersService.createOAuthUser({
            provider: 'linkedin',
            providerId: `test-id-${Date.now()}`,
            email,
            name: 'Encryption Test',
            oauthAccessToken: plainAccessToken,
            oauthRefreshToken: plainRefreshToken,
        });

        // The returned entity should have them unencrypted for active system use
        expect(createdUser.oauthAccessToken).toBe(plainAccessToken);
        expect(createdUser.oauthRefreshToken).toBe(plainRefreshToken);

        // 2. Query the database directly via PrismaService to ensure tokens are encrypted at rest
        const rawDbUser = await prismaService.user.findUnique({
            where: { id: createdUser.id },
        });

        expect(rawDbUser).toBeDefined();

        // Validate Access Token is encrypted
        expect(rawDbUser?.oauthAccessToken).toBeDefined();
        expect(rawDbUser?.oauthAccessToken).not.toBe(plainAccessToken);
        expect(rawDbUser?.oauthAccessToken).toMatch(/^[A-Za-z0-9+/=]+$/); // Should be base64

        // Validate Refresh Token is encrypted
        expect(rawDbUser?.oauthRefreshToken).toBeDefined();
        expect(rawDbUser?.oauthRefreshToken).not.toBe(plainRefreshToken);
        expect(rawDbUser?.oauthRefreshToken).toMatch(/^[A-Za-z0-9+/=]+$/);

        // 3. Retrieve user via UsersService to ensure it decrypts seamlessly
        const retrievedUser = await usersService.findById(createdUser.id);
        expect(retrievedUser).toBeDefined();
        expect(retrievedUser?.oauthAccessToken).toBe(plainAccessToken);
        expect(retrievedUser?.oauthRefreshToken).toBe(plainRefreshToken);
    });
});
