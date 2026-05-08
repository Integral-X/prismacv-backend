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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserPlan } from '@prisma/client';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { RequiresPlan } from '@/modules/billing/decorators/requires-plan.decorator';
import { RequiresPlanGuard } from '@/modules/billing/requires-plan.guard';
import { GrammarService } from './grammar.service';
import { CheckGrammarRequestDto } from './dto/check-grammar.request.dto';
import { CheckGrammarResponseDto } from './dto/check-grammar.response.dto';

@ApiTags('grammar')
@ApiBearerAuth('JWT-auth')
@Public()
@UseGuards(JwtUserAuthGuard)
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Post('check')
  @UseGuards(RequiresPlanGuard)
  @RequiresPlan({
    plans: [UserPlan.PRO, UserPlan.TEAM],
    feature: 'grammar_check',
  })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check text for grammar, style, and impact issues' })
  @ApiResponse({ status: 200, type: CheckGrammarResponseDto })
  async check(
    @GetUser() user: User,
    @Body() dto: CheckGrammarRequestDto,
  ): Promise<CheckGrammarResponseDto> {
    return await this.grammarService.check(dto, user.id);
  }
}
