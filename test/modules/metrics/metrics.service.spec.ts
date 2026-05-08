import { MetricsService } from '@/modules/metrics/metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('records AI call counters and latencies', async () => {
    service.recordAiCall({
      feature: 'cv_analyze',
      provider: 'openai',
      status: 'success',
      durationMs: 1200,
    });

    const metrics = await service.getMetrics();
    expect(metrics).toContain('prismacv_ai_calls_total');
    expect(metrics).toContain('feature="cv_analyze"');
    expect(metrics).toContain('provider="openai"');
    expect(metrics).toContain('status="success"');
    expect(metrics).toContain('prismacv_ai_call_duration_seconds');
  });

  it('records PDF export counters and Stripe webhook metrics', async () => {
    service.recordPdfExport({
      status: 'success',
      durationMs: 850,
    });
    service.recordStripeEvent({
      eventType: 'checkout.session.completed',
      status: 'success',
      durationMs: 90,
    });

    const metrics = await service.getMetrics();
    expect(metrics).toContain('prismacv_pdf_exports_total');
    expect(metrics).toContain('prismacv_pdf_export_duration_seconds');
    expect(metrics).toContain('prismacv_stripe_events_total');
    expect(metrics).toContain('event_type="checkout_session_completed"');
  });
});
