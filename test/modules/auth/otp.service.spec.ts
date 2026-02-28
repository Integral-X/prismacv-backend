import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from '../../../src/modules/auth/otp.service';
import { UsersService } from '../../../src/modules/auth/users.service';
import { EmailService } from '../../../src/modules/email/email.service';
import { mockUser, mockOtp } from '../../helpers/mock-user.helper';
import { UserRole } from '../../../src/modules/auth/entities/user.entity';
import { OtpPurpose } from '@prisma/client';
import * as otpUtil from '../../../src/shared/utils/otp.util';

describe('OtpService', () => {
  let otpService: OtpService;
  let usersService: jest.Mocked<UsersService>;
  let emailService: jest.Mocked<EmailService>;

  const testUser = mockUser({
    id: '01930000-0000-7000-8000-000000000001',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.PLATFORM_ADMIN,
    emailVerified: false,
  });

  beforeEach(async () => {
    // Mock the otpUtil.verifyOtpHash function
    jest.spyOn(otpUtil, 'verifyOtpHash').mockResolvedValue(true);
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createOtp: jest.fn(),
      findValidOtp: jest.fn(),
      incrementOtpAttempts: jest.fn(),
      markOtpAsUsed: jest.fn(),
      markEmailVerified: jest.fn(),
    };

    const mockEmailService = {
      sendOtpEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
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
                OTP_MAX_ATTEMPTS_SIGNUP: 5,
                OTP_MAX_ATTEMPTS_PASSWORD_RESET: 3,
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
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      const mockOtpRecord = mockOtp({
        userId: testUser.id,
        purpose: OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
      });

      usersService.createOtp.mockResolvedValue(mockOtpRecord);

      const result = await otpService.generateAndSendOtp(testUser);

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(usersService.createOtp).toHaveBeenCalledWith(
        testUser.id,
        OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
        expect.any(String),
        expect.any(Date),
        5,
      );
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
        testUser.email,
        expect.any(String),
        testUser.name,
      );
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully and mark email as verified', async () => {
      const mockOtpRecord = mockOtp({
        userId: testUser.id,
        purpose: OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
        attempts: 0,
      });

      const verifiedUser = mockUser({
        ...testUser,
        emailVerified: true,
      });

      usersService.findByEmail.mockResolvedValue(testUser);
      usersService.findValidOtp.mockResolvedValue(mockOtpRecord);
      usersService.markOtpAsUsed.mockResolvedValue(mockOtpRecord);
      usersService.markEmailVerified.mockResolvedValue(verifiedUser);

      const result = await otpService.verifyOtp('test@example.com', '123456');

      expect(result.emailVerified).toBe(true);
      expect(usersService.findValidOtp).toHaveBeenCalledWith(
        testUser.id,
        OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
      );
      expect(usersService.markOtpAsUsed).toHaveBeenCalledWith(mockOtpRecord.id);
      expect(usersService.markEmailVerified).toHaveBeenCalledWith(testUser.id);
    });

    it('should throw NotFoundException if user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        otpService.verifyOtp('nonexistent@example.com', '123456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if email is already verified', async () => {
      const verifiedUser = mockUser({ ...testUser, emailVerified: true });
      usersService.findByEmail.mockResolvedValue(verifiedUser);

      await expect(
        otpService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no valid OTP is found', async () => {
      usersService.findByEmail.mockResolvedValue(testUser);
      usersService.findValidOtp.mockResolvedValue(null);

      await expect(
        otpService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with remaining attempts on invalid OTP', async () => {
      const mockOtpRecord = mockOtp({
        userId: testUser.id,
        purpose: OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
        attempts: 1,
        maxAttempts: 3,
      });

      const updatedOtpRecord = mockOtp({
        ...mockOtpRecord,
        attempts: 2,
      });

      usersService.findByEmail.mockResolvedValue(testUser);
      usersService.findValidOtp.mockResolvedValue(mockOtpRecord);
      usersService.incrementOtpAttempts.mockResolvedValue(updatedOtpRecord);

      // Mock verifyOtpHash to return false for this test
      jest.spyOn(otpUtil, 'verifyOtpHash').mockResolvedValueOnce(false);

      await expect(
        otpService.verifyOtp('test@example.com', '654321'),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.incrementOtpAttempts).toHaveBeenCalledWith(
        mockOtpRecord.id,
      );
    });

    it('should throw 429 error when max attempts exceeded', async () => {
      const mockOtpRecord = mockOtp({
        userId: testUser.id,
        purpose: OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
        attempts: 3,
        maxAttempts: 3,
      });

      usersService.findByEmail.mockResolvedValue(testUser);
      usersService.findValidOtp.mockResolvedValue(mockOtpRecord);

      await expect(
        otpService.verifyOtp('test@example.com', '654321'),
      ).rejects.toThrow(HttpException);

      try {
        await otpService.verifyOtp('test@example.com', '654321');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP successfully', async () => {
      const mockOtpRecord = mockOtp({
        userId: testUser.id,
        purpose: OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
      });

      usersService.findByEmail.mockResolvedValue(testUser);
      usersService.createOtp.mockResolvedValue(mockOtpRecord);

      const result = await otpService.resendOtp('test@example.com');

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(usersService.createOtp).toHaveBeenCalledWith(
        testUser.id,
        OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
        expect.any(String),
        expect.any(Date),
        5,
      );
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        otpService.resendOtp('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if email is already verified', async () => {
      const verifiedUser = mockUser({ ...testUser, emailVerified: true });
      usersService.findByEmail.mockResolvedValue(verifiedUser);

      await expect(otpService.resendOtp('test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('password reset purpose', () => {
    it('should generate password reset OTP successfully', async () => {
      const mockOtpRecord = mockOtp({
        userId: testUser.id,
        purpose: OtpPurpose.PASSWORD_RESET,
      });

      usersService.createOtp.mockResolvedValue(mockOtpRecord);

      const result = await otpService.generateAndSendOtp(
        testUser,
        OtpPurpose.PASSWORD_RESET,
      );

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(usersService.createOtp).toHaveBeenCalledWith(
        testUser.id,
        OtpPurpose.PASSWORD_RESET,
        expect.any(String),
        expect.any(Date),
        3,
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        testUser.email,
        expect.any(String),
        testUser.name,
      );
    });

    it('should verify password reset OTP successfully', async () => {
      const mockOtpRecord = mockOtp({
        userId: testUser.id,
        purpose: OtpPurpose.PASSWORD_RESET,
        attempts: 0,
      });

      usersService.findByEmail.mockResolvedValue(testUser);
      usersService.findValidOtp.mockResolvedValue(mockOtpRecord);
      usersService.markOtpAsUsed.mockResolvedValue(mockOtpRecord);

      const result = await otpService.verifyOtp(
        'test@example.com',
        '123456',
        OtpPurpose.PASSWORD_RESET,
      );

      expect(result).toEqual(testUser);
      expect(usersService.findValidOtp).toHaveBeenCalledWith(
        testUser.id,
        OtpPurpose.PASSWORD_RESET,
      );
      expect(usersService.markOtpAsUsed).toHaveBeenCalledWith(mockOtpRecord.id);
      expect(usersService.markEmailVerified).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        otpService.verifyOtp(
          'nonexistent@example.com',
          '123456',
          OtpPurpose.PASSWORD_RESET,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
