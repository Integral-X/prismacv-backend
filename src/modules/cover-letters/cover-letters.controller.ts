import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';
import { CoverLettersService } from './cover-letters.service';
import {
  CreateCoverLetterRequestDto,
  UpdateCoverLetterRequestDto,
  GenerateCoverLetterRequestDto,
} from './dto/request/cover-letter.request.dto';
import {
  CoverLetterResponseDto,
  GeneratedCoverLetterResponseDto,
} from './dto/response/cover-letter.response.dto';

@ApiTags('Cover Letters')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtUserAuthGuard)
@Controller('cover-letters')
export class CoverLettersController {
  constructor(private readonly coverLettersService: CoverLettersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cover letter' })
  @ApiResponse({ status: 201, type: CoverLetterResponseDto })
  async create(
    @GetUser() user: User,
    @Body() dto: CreateCoverLetterRequestDto,
  ) {
    return this.coverLettersService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all cover letters for the current user' })
  @ApiResponse({ status: 200 })
  async findAll(
    @GetUser() user: User,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.coverLettersService.findAllByUser(user.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cover letter by ID' })
  @ApiParam({ name: 'id', description: 'Cover letter UUID' })
  @ApiResponse({ status: 200, type: CoverLetterResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.coverLettersService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a cover letter' })
  @ApiParam({ name: 'id', description: 'Cover letter UUID' })
  @ApiResponse({ status: 200, type: CoverLetterResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCoverLetterRequestDto,
  ) {
    return this.coverLettersService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cover letter' })
  @ApiParam({ name: 'id', description: 'Cover letter UUID' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Not found' })
  async delete(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.coverLettersService.delete(id, user.id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a cover letter from CV content',
    description:
      'Uses CV data and optional job details to generate a tailored cover letter.',
  })
  @ApiResponse({ status: 200, type: GeneratedCoverLetterResponseDto })
  async generate(
    @GetUser() user: User,
    @Body() dto: GenerateCoverLetterRequestDto,
  ) {
    return this.coverLettersService.generate(user.id, dto);
  }
}
