import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { User } from '@/modules/auth/entities/user.entity';
import { BillingService } from './billing.service';
import {
  BillingProfileResponseDto,
  CheckoutSessionResponseDto,
  CreateCheckoutSessionRequestDto,
  PortalSessionResponseDto,
} from './dto/billing.dto';

@ApiTags('Billing')
@ApiBearerAuth('JWT-auth')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout-session')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({ summary: 'Create Stripe checkout session for subscription' })
  @ApiResponse({ status: 201, type: CheckoutSessionResponseDto })
  async createCheckoutSession(
    @GetUser() user: User,
    @Body() dto: CreateCheckoutSessionRequestDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.billingService.createCheckoutSession(user.id, dto);
  }

  @Post('portal-session')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({ summary: 'Create Stripe customer portal session' })
  @ApiResponse({ status: 201, type: PortalSessionResponseDto })
  async createPortalSession(
    @GetUser() user: User,
  ): Promise<PortalSessionResponseDto> {
    return this.billingService.createPortalSession(user.id);
  }

  @Get('me')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({ summary: 'Get billing profile and active subscription' })
  @ApiResponse({ status: 200, type: BillingProfileResponseDto })
  async getBillingProfile(
    @GetUser() user: User,
  ): Promise<BillingProfileResponseDto> {
    return this.billingService.getBillingProfile(user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));
    await this.billingService.processWebhook(rawBody, signature);
    return { received: true };
  }
}
