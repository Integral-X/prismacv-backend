import {
  Controller,
  Post,
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
import { Public } from '@/common/decorators/public.decorator';
import { AtsService } from './ats.service';
import { AtsScoreRequestDto } from './dto/ats-score.request.dto';
import { AtsScoreResponseDto } from './dto/ats-score.response.dto';

@ApiTags('ATS')
@ApiBearerAuth('JWT-auth')
@Public()
@Controller('ats')
export class AtsController {
  constructor(private readonly atsService: AtsService) {}

  @Post('score')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze CV against job description',
    description:
      'Performs ATS keyword matching and section analysis to score how well a CV matches a job description.',
  })
  @ApiBody({ type: AtsScoreRequestDto })
  @ApiResponse({
    status: 200,
    description: 'ATS analysis result',
    type: AtsScoreResponseDto,
  })
  async score(@Body() dto: AtsScoreRequestDto): Promise<AtsScoreResponseDto> {
    return this.atsService.analyze(dto);
  }
}
