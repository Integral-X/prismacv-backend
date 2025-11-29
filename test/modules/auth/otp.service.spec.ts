import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from '../../../src/modules/auth/otp.service';
import { UsersService } from '../../../src/modules/auth/users.service';
import { EmailService } from '../../../src/modules/email/email.service';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';

describe('OtpService', () => {
  let otpService: OtpService;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: User = Object.assign(new User(), {
    id: '01930000-0000-7000-8000-000000000001',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    role: UserRole.PLATFORM_ADMIN,
    refreshToken: null,
    emailVerified: false,
    otpCode: '123456',
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      saveOtp: jest.fn(),
      markEmailVerified: jest.fn(),
    };

    const mockEmailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                OTP_EXPIRY_MINUTES: 10,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    otpService = module.get<OtpService>(OtpService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(otpService).toBeDefined();
  });

  describe('generateOtpCode', () => {
    it('should generate a 6-digit OTP code', () => {
      const otp = otpService.generateOtpCode();
      expect(otp).toHaveLength(6);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThanOrEqual(999999);
    });

    it('should generate different OTP codes on subsequent calls', () => {
      const otps = new Set<string>();
      for (let i = 0; i < 100; i++) {
        otps.add(otpService.generateOtpCode());
      }
      // With 100 attempts, we should have many unique codes
      expect(otps.size).toBeGreaterThan(90);
    });
  });

  describe('generateAndSendOtp', () => {
    it('should generate OTP, save it, and send email', async () => {
      usersService.saveOtp.mockResolvedValue(undefined);

      const result = await otpService.generateAndSendOtp(mockUser);

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(usersService.saveOtp).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully and mark email as verified', async () => {
      const verifiedUser = {
        ...mockUser,
        emailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      };
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.markEmailVerified.mockResolvedValue(verifiedUser as User);

      const result = await otpService.verifyOtp('test@example.com', '123456');

      expect(result.emailVerified).toBe(true);
      expect(usersService.markEmailVerified).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException if user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        otpService.verifyOtp('nonexistent@example.com', '123456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if email is already verified', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      usersService.findByEmail.mockResolvedValue(verifiedUser as User);

      await expect(
        otpService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no OTP is found', async () => {
      const userWithoutOtp = { ...mockUser, otpCode: null, otpExpiresAt: null };
      usersService.findByEmail.mockResolvedValue(userWithoutOtp as User);

      await expect(
        otpService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      const userWithExpiredOtp = {
        ...mockUser,
        otpExpiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };
      usersService.findByEmail.mockResolvedValue(userWithExpiredOtp as User);

      await expect(
        otpService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP code is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        otpService.verifyOtp('test@example.com', '654321'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP successfully', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.saveOtp.mockResolvedValue(undefined);

      const result = await otpService.resendOtp('test@example.com');

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(usersService.saveOtp).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        otpService.resendOtp('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if email is already verified', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      usersService.findByEmail.mockResolvedValue(verifiedUser as User);

      await expect(otpService.resendOtp('test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
