import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { AiService } from './ai.service';
import {
  OptimizeCvRequestDto,
  CvAnalysisResponseDto,
  CvOptimizationResponseDto,
} from './dto/ai.dto';

@ApiTags('AI Resume Optimization')
@ApiBearerAuth('JWT-auth')
@Public()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('cv/:id/analyze')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze a CV',
    description:
      'Performs grammar, readability, and ATS analysis on the CV content.',
  })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiResponse({ status: 200, type: CvAnalysisResponseDto })
  @ApiResponse({ status: 404, description: 'CV not found' })
  async analyze(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CvAnalysisResponseDto> {
    return this.aiService.analyzeCv(id, user.id);
  }

  @Post('cv/:id/optimize')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Optimize a CV for a job description',
    description:
      'Compares CV content against a job description and provides optimization suggestions.',
  })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: OptimizeCvRequestDto })
  @ApiResponse({ status: 200, type: CvOptimizationResponseDto })
  @ApiResponse({ status: 404, description: 'CV not found' })
  async optimize(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptimizeCvRequestDto,
  ): Promise<CvOptimizationResponseDto> {
    return this.aiService.optimizeCvForJob(id, user.id, dto.jobDescription);
  }
}
