import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OtpController } from '../../../src/modules/auth/otp.controller';
import { OtpService } from '../../../src/modules/auth/otp.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { VerifyOtpRequestDto } from '../../../src/modules/auth/dto/request/verify-otp.request.dto';
import { ResendOtpRequestDto } from '../../../src/modules/auth/dto/request/resend-otp.request.dto';
import { VerifyResetOtpRequestDto } from '../../../src/modules/auth/dto/request/verify-reset-otp.request';
import { UserProfileResponseDto } from '../../../src/modules/auth/dto/response/user-profile.response.dto';
import { mockUser } from '../../helpers/mock-user.helper';
import { UserRole } from '../../../src/modules/auth/entities/user.entity';

describe('OtpController', () => {
  let controller: OtpController;
  let otpService: jest.Mocked<OtpService>;
  let authService: jest.Mocked<AuthService>;
  let authMapper: jest.Mocked<AuthMapper>;

  const testUser = mockUser({
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    role: UserRole.REGULAR,
    emailVerified: true,
  });

  const mockUserProfile: UserProfileResponseDto = {
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    role: UserRole.REGULAR,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockOtpService = {
      verifyOtp: jest.fn(),
      resendOtp: jest.fn(),
    };

    const mockAuthService = {
      verifyPasswordResetOtp: jest.fn(),
    };

    const mockAuthMapper = {
      userToProfileResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtpController],
      providers: [
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuthMapper,
          useValue: mockAuthMapper,
        },
      ],
    }).compile();

    controller = module.get<OtpController>(OtpController);
    otpService = module.get(OtpService);
    authService = module.get(AuthService);
    authMapper = module.get(AuthMapper);
  });

  describe('verifySignupOtp', () => {
    it('should verify signup OTP successfully', async () => {
      const verifyOtpDto: VerifyOtpRequestDto = {
        email: 'user@example.com',
        otp: '123456',
      };

      otpService.verifyOtp.mockResolvedValue(testUser);
      authMapper.userToProfileResponse.mockReturnValue(mockUserProfile);

      const result = await controller.verifySignupOtp(verifyOtpDto);

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        verifyOtpDto.email,
        verifyOtpDto.otp,
      );
      expect(authMapper.userToProfileResponse).toHaveBeenCalledWith(testUser);
      expect(result).toEqual({
        message: 'Email verified successfully',
        user: mockUserProfile,
      });
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      const verifyOtpDto: VerifyOtpRequestDto = {
        email: 'user@example.com',
        otp: '000000',
      };

      otpService.verifyOtp.mockRejectedValue(
        new BadRequestException('Invalid OTP code'),
      );

      await expect(controller.verifySignupOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        verifyOtpDto.email,
        verifyOtpDto.otp,
      );
      expect(authMapper.userToProfileResponse).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for expired OTP', async () => {
      const verifyOtpDto: VerifyOtpRequestDto = {
        email: 'user@example.com',
        otp: '123456',
      };

      otpService.verifyOtp.mockRejectedValue(
        new BadRequestException('OTP code has expired'),
      );

      await expect(controller.verifySignupOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const verifyOtpDto: VerifyOtpRequestDto = {
        email: 'nonexistent@example.com',
        otp: '123456',
      };

      otpService.verifyOtp.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.verifySignupOtp(verifyOtpDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resendSignupOtp', () => {
    const mockExpiresAt = new Date();

    it('should resend signup OTP successfully', async () => {
      const resendOtpDto: ResendOtpRequestDto = {
        email: 'user@example.com',
      };

      otpService.resendOtp.mockResolvedValue({ expiresAt: mockExpiresAt });

      const result = await controller.resendSignupOtp(resendOtpDto);

      expect(otpService.resendOtp).toHaveBeenCalledWith(resendOtpDto.email);
      expect(result).toEqual({
        message: 'OTP sent successfully',
        expiresAt: mockExpiresAt,
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const resendOtpDto: ResendOtpRequestDto = {
        email: 'nonexistent@example.com',
      };

      otpService.resendOtp.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.resendSignupOtp(resendOtpDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(otpService.resendOtp).toHaveBeenCalledWith(resendOtpDto.email);
    });

    it('should throw BadRequestException if email is already verified', async () => {
      const resendOtpDto: ResendOtpRequestDto = {
        email: 'verified@example.com',
      };

      otpService.resendOtp.mockRejectedValue(
        new BadRequestException('Email is already verified'),
      );

      await expect(controller.resendSignupOtp(resendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyResetOtp', () => {
    it('should verify reset OTP successfully', async () => {
      const verifyResetOtpDto: VerifyResetOtpRequestDto = {
        email: 'user@example.com',
        otp: '123456',
      };

      const mockResetToken = { resetToken: 'reset-token-123' };
      authService.verifyPasswordResetOtp.mockResolvedValue(mockResetToken);

      const result = await controller.verifyResetOtp(verifyResetOtpDto);

      expect(authService.verifyPasswordResetOtp).toHaveBeenCalledWith(
        verifyResetOtpDto.email,
        verifyResetOtpDto.otp,
      );
      expect(result).toEqual(mockResetToken);
    });
  });
});
