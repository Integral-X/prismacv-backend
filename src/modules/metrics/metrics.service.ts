import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
  type CounterConfiguration,
  type HistogramConfiguration,
} from 'prom-client';

type MetricCounterLabels = Record<string, string>;
type MetricHistogramLabels = Record<string, string>;

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly aiCallsCounter = this.createCounter({
    name: 'prismacv_ai_calls_total',
    help: 'Total number of AI calls by feature/provider/status.',
    labelNames: ['feature', 'provider', 'status'],
  });

  private readonly aiLatencyHistogram = this.createHistogram({
    name: 'prismacv_ai_call_duration_seconds',
    help: 'AI call latency in seconds by feature/provider/status.',
    labelNames: ['feature', 'provider', 'status'],
    buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30],
  });

  private readonly pdfExportsCounter = this.createCounter({
    name: 'prismacv_pdf_exports_total',
    help: 'Total number of CV PDF export attempts by status.',
    labelNames: ['status'],
  });

  private readonly pdfLatencyHistogram = this.createHistogram({
    name: 'prismacv_pdf_export_duration_seconds',
    help: 'CV PDF export latency in seconds by status.',
    labelNames: ['status'],
    buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30],
  });

  private readonly stripeEventsCounter = this.createCounter({
    name: 'prismacv_stripe_events_total',
    help: 'Total number of processed Stripe webhook events by type/status.',
    labelNames: ['event_type', 'status'],
  });

  private readonly stripeEventLatencyHistogram = this.createHistogram({
    name: 'prismacv_stripe_event_duration_seconds',
    help: 'Stripe webhook processing latency in seconds by type/status.',
    labelNames: ['event_type', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  });

  constructor() {
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'prismacv_',
    });
  }

  recordAiCall(input: {
    feature: string;
    provider: string;
    status: 'success' | 'error';
    durationMs: number;
  }): void {
    const labels = this.normalizeLabels({
      feature: input.feature,
      provider: input.provider,
      status: input.status,
    });
    this.aiCallsCounter.inc(labels);
    this.aiLatencyHistogram.observe(labels, this.toSeconds(input.durationMs));
  }

  recordPdfExport(input: {
    status: 'success' | 'error';
    durationMs: number;
  }): void {
    const labels = this.normalizeLabels({ status: input.status });
    this.pdfExportsCounter.inc(labels);
    this.pdfLatencyHistogram.observe(labels, this.toSeconds(input.durationMs));
  }

  recordStripeEvent(input: {
    eventType: string;
    status: 'success' | 'error' | 'ignored';
    durationMs: number;
  }): void {
    const labels = this.normalizeLabels({
      event_type: input.eventType,
      status: input.status,
    });
    this.stripeEventsCounter.inc(labels);
    this.stripeEventLatencyHistogram.observe(
      labels,
      this.toSeconds(input.durationMs),
    );
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  private createCounter(config: CounterConfiguration<string>): Counter<string> {
    return new Counter({
      ...config,
      registers: [this.registry],
    });
  }

  private createHistogram(
    config: HistogramConfiguration<string>,
  ): Histogram<string> {
    return new Histogram({
      ...config,
      registers: [this.registry],
    });
  }

  private normalizeLabels<
    T extends MetricCounterLabels | MetricHistogramLabels,
  >(labels: T): T {
    return Object.fromEntries(
      Object.entries(labels).map(([key, value]) => [
        key,
        this.normalize(value),
      ]),
    ) as T;
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private toSeconds(durationMs: number): number {
    if (!Number.isFinite(durationMs)) return 0;
    return Math.max(0, durationMs / 1000);
  }
}
