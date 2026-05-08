import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiUsageFeature } from '@prisma/client';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { AI_LLM_GRAMMAR_FLAG } from '@/modules/ai/ai-feature-flags';
import { MetricsService } from '@/modules/metrics/metrics.service';
import {
  CheckGrammarRequestDto,
  GrammarContext,
} from './dto/check-grammar.request.dto';
import {
  CheckGrammarResponseDto,
  GrammarIssueDto,
  GrammarIssueType,
  GrammarIssueSeverity,
} from './dto/check-grammar.response.dto';

interface ReplacementRule {
  pattern: RegExp;
  message: string;
  suggestion: string;
  type: GrammarIssueType;
  severity: GrammarIssueSeverity;
}

@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openAiProvider: OpenAiProvider,
    private readonly aiUsageService: AiUsageService,
    private readonly unleashService: UnleashService,
    private readonly metricsService: MetricsService,
  ) {}

  private readonly weakVerbRules: ReplacementRule[] = [
    {
      pattern: /\bresponsible for\b/gi,
      message: 'Weak verb phrase — use a stronger action verb',
      suggestion: 'led/managed',
      type: GrammarIssueType.IMPACT,
      severity: GrammarIssueSeverity.WARNING,
    },
    {
      pattern: /\bhelped with\b/gi,
      message: 'Weak verb phrase — be specific about your contribution',
      suggestion: 'contributed to',
      type: GrammarIssueType.IMPACT,
      severity: GrammarIssueSeverity.WARNING,
    },
    {
      pattern: /\bworked on\b/gi,
      message: 'Weak verb phrase — use a more impactful action verb',
      suggestion: 'developed/built',
      type: GrammarIssueType.IMPACT,
      severity: GrammarIssueSeverity.WARNING,
    },
  ];

  private readonly redundantPhraseRules: ReplacementRule[] = [
    {
      pattern: /\bin order to\b/gi,
      message: 'Redundant phrase — simplify',
      suggestion: 'to',
      type: GrammarIssueType.STYLE,
      severity: GrammarIssueSeverity.INFO,
    },
    {
      pattern: /\bat this point in time\b/gi,
      message: 'Redundant phrase — simplify',
      suggestion: 'now',
      type: GrammarIssueType.STYLE,
      severity: GrammarIssueSeverity.INFO,
    },
    {
      pattern: /\bdue to the fact that\b/gi,
      message: 'Redundant phrase — simplify',
      suggestion: 'because',
      type: GrammarIssueType.STYLE,
      severity: GrammarIssueSeverity.INFO,
    },
  ];

  private readonly passiveVoicePattern =
    /\b(was|were|been|being|is|are)\s+(\w+ed|written|built|done|made|taken|given|shown|known)\b/gi;

  async check(
    dto: CheckGrammarRequestDto,
    userId: string,
  ): Promise<CheckGrammarResponseDto> {
    if (this.shouldUseLlm(userId)) {
      const startedAt = Date.now();
      let quotaConsumed = false;
      try {
        await this.aiUsageService.consumeQuota(
          userId,
          AiUsageFeature.GRAMMAR_CHECK,
        );
        quotaConsumed = true;
        const llm = await this.openAiProvider.checkGrammar(
          dto.text,
          dto.context,
        );
        this.metricsService.recordAiCall({
          feature: 'grammar_check',
          provider: 'openai',
          status: 'success',
          durationMs: Date.now() - startedAt,
        });
        return {
          issues: llm.issues.map(issue => ({
            type: this.mapIssueType(issue.type),
            message: issue.message,
            suggestion: issue.suggestion,
            startIndex: issue.startIndex,
            endIndex: issue.endIndex,
            severity: this.mapIssueSeverity(issue.severity),
          })),
          score: llm.score,
          summary: llm.summary,
        };
      } catch (error) {
        this.metricsService.recordAiCall({
          feature: 'grammar_check',
          provider: 'openai',
          status: 'error',
          durationMs: Date.now() - startedAt,
        });

        if (quotaConsumed) {
          await this.refundQuotaOnProviderFailure(
            userId,
            AiUsageFeature.GRAMMAR_CHECK,
          );
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `OpenAI grammar check failed; falling back to heuristic checker. ${message}`,
        );
      }
    }

    const issues: GrammarIssueDto[] = [];

    // Weak verbs
    for (const rule of this.weakVerbRules) {
      this.findMatches(dto.text, rule, issues);
    }

    // Redundant phrases
    for (const rule of this.redundantPhraseRules) {
      this.findMatches(dto.text, rule, issues);
    }

    // Passive voice
    this.detectPassiveVoice(dto.text, issues);

    // Long sentences
    this.detectLongSentences(dto.text, issues);

    // Calculate score
    const score = this.calculateScore(issues);

    // Generate summary
    const summary = this.generateSummary(issues, score, dto.context);

    return { issues, score, summary };
  }

  private async refundQuotaOnProviderFailure(
    userId: string,
    feature: AiUsageFeature,
  ): Promise<void> {
    try {
      await this.aiUsageService.refundQuota(userId, feature);
    } catch (refundError) {
      const message =
        refundError instanceof Error
          ? refundError.message
          : String(refundError);
      this.logger.error(
        `Failed to refund AI quota for feature=${feature.toLowerCase()}, userId=${userId}: ${message}`,
      );
    }
  }

  private shouldUseLlm(userId: string): boolean {
    const provider = this.configService
      .get<string>('AI_PROVIDER', 'builtin')
      ?.trim()
      .toLowerCase();
    if (provider !== 'openai') {
      return false;
    }

    if (!this.openAiProvider.isAvailable()) {
      return false;
    }

    return this.unleashService.isEnabled(AI_LLM_GRAMMAR_FLAG, { userId });
  }

  private mapIssueType(
    value: 'grammar' | 'style' | 'impact',
  ): GrammarIssueType {
    if (value === 'grammar') {
      return GrammarIssueType.GRAMMAR;
    }
    if (value === 'impact') {
      return GrammarIssueType.IMPACT;
    }
    return GrammarIssueType.STYLE;
  }

  private mapIssueSeverity(
    value: 'error' | 'warning' | 'info',
  ): GrammarIssueSeverity {
    if (value === 'error') {
      return GrammarIssueSeverity.ERROR;
    }
    if (value === 'warning') {
      return GrammarIssueSeverity.WARNING;
    }
    return GrammarIssueSeverity.INFO;
  }

  private findMatches(
    text: string,
    rule: ReplacementRule,
    issues: GrammarIssueDto[],
  ): void {
    let match: RegExpExecArray | null;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: rule.type,
        message: rule.message,
        suggestion: rule.suggestion,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        severity: rule.severity,
      });
    }
  }

  private detectPassiveVoice(text: string, issues: GrammarIssueDto[]): void {
    let match: RegExpExecArray | null;
    const regex = new RegExp(
      this.passiveVoicePattern.source,
      this.passiveVoicePattern.flags,
    );
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: GrammarIssueType.GRAMMAR,
        message:
          'Passive voice detected — prefer active voice for stronger impact',
        suggestion: 'Rewrite using active voice',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        severity: GrammarIssueSeverity.WARNING,
      });
    }
  }

  private detectLongSentences(text: string, issues: GrammarIssueDto[]): void {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentIndex = 0;

    for (const sentence of sentences) {
      const sentenceStart = text.indexOf(sentence, currentIndex);
      const wordCount = sentence.trim().split(/\s+/).length;

      if (wordCount > 40) {
        issues.push({
          type: GrammarIssueType.STYLE,
          message: `Sentence is too long (${wordCount} words) — aim for under 40 words`,
          suggestion: 'Break into shorter, more focused sentences',
          startIndex: sentenceStart,
          endIndex: sentenceStart + sentence.length,
          severity: GrammarIssueSeverity.WARNING,
        });
      }

      currentIndex = sentenceStart + sentence.length;
    }
  }

  private calculateScore(issues: GrammarIssueDto[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case GrammarIssueSeverity.ERROR:
          score -= 10;
          break;
        case GrammarIssueSeverity.WARNING:
          score -= 5;
          break;
        case GrammarIssueSeverity.INFO:
          score -= 2;
          break;
      }
    }

    return Math.max(0, score);
  }

  private generateSummary(
    issues: GrammarIssueDto[],
    score: number,
    context?: GrammarContext,
  ): string {
    if (issues.length === 0) {
      return 'Your text looks great! No issues detected.';
    }

    const errorCount = issues.filter(
      i => i.severity === GrammarIssueSeverity.ERROR,
    ).length;
    const warningCount = issues.filter(
      i => i.severity === GrammarIssueSeverity.WARNING,
    ).length;
    const infoCount = issues.filter(
      i => i.severity === GrammarIssueSeverity.INFO,
    ).length;

    const parts: string[] = [];
    parts.push(`Found ${issues.length} issue${issues.length > 1 ? 's' : ''}`);

    const details: string[] = [];
    if (errorCount > 0)
      details.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
    if (warningCount > 0)
      details.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    if (infoCount > 0)
      details.push(`${infoCount} suggestion${infoCount > 1 ? 's' : ''}`);
    parts.push(`(${details.join(', ')})`);

    if (context) {
      parts.push(`in ${context.replace(/_/g, ' ')} context`);
    }

    parts.push(`— score: ${score}/100.`);

    return parts.join(' ');
  }
}
