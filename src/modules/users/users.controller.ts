import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { UsersProfileService } from './users-profile.service';
import { AvatarStorageService } from './avatar-storage.service';
import { UpdateProfileRequestDto } from './dto/request/update-profile.request.dto';
import { UserProfileResponseDto } from './dto/response/user-profile.response.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Public()
@UseGuards(JwtUserAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly profileService: UsersProfileService,
    private readonly avatarStorage: AvatarStorageService,
  ) {}

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

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({
    summary: 'Upload avatar',
    description: 'Uploads a profile avatar image (max 2 MB, JPEG/PNG/WebP).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  async uploadAvatar(
    @GetUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UserProfileResponseDto> {
    const avatarUrl = await this.avatarStorage.save(user.id, file);
    return this.profileService.updateProfile(user.id, { avatarUrl });
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
