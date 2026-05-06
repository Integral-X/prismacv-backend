import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GrammarService } from './grammar.service';
import { CheckGrammarRequestDto } from './dto/check-grammar.request.dto';
import { CheckGrammarResponseDto } from './dto/check-grammar.response.dto';

@ApiTags('grammar')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check text for grammar, style, and impact issues' })
  @ApiResponse({ status: 200, type: CheckGrammarResponseDto })
  check(@Body() dto: CheckGrammarRequestDto): CheckGrammarResponseDto {
    return this.grammarService.check(dto);
  }
}
