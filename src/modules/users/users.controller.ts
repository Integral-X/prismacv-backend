import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { UsersProfileService } from './users-profile.service';
import { UpdateProfileRequestDto } from './dto/request/update-profile.request.dto';
import { UserProfileResponseDto } from './dto/response/user-profile.response.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtUserAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly profileService: UsersProfileService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user profile.',
  })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  async getMe(@GetUser() user: User): Promise<UserProfileResponseDto> {
    return this.profileService.getProfile(user.id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Updates name and/or avatar URL.',
  })
  @ApiBody({ type: UpdateProfileRequestDto })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  async updateMe(
    @GetUser() user: User,
    @Body() dto: UpdateProfileRequestDto,
  ): Promise<UserProfileResponseDto> {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete current user account',
    description:
      'Permanently deletes the user account and all associated data (CVs, imports, etc.).',
  })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  async deleteMe(@GetUser() user: User): Promise<void> {
    await this.profileService.deleteAccount(user.id);
  }
}
