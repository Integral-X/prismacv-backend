import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  AiProvider,
  CvAnalysisResult,
  CvContentForAnalysis,
  CvIssue,
  CvOptimizationResult,
  CvSuggestion,
  SectionRecommendation,
} from '../interfaces/ai-provider.interface';

type JsonObject = Record<string, unknown>;

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TEMPERATURE = 0.2;

export interface OpenAiGrammarIssue {
  type: 'grammar' | 'style' | 'impact';
  message: string;
  suggestion: string;
  startIndex: number;
  endIndex: number;
  severity: 'error' | 'warning' | 'info';
}

export interface OpenAiGrammarResult {
  issues: OpenAiGrammarIssue[];
  score: number;
  summary: string;
}

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();

    this.model =
      this.configService.get<string>('AI_MODEL', DEFAULT_MODEL) ??
      DEFAULT_MODEL;
    this.maxRetries = Math.max(
      1,
      this.configService.get<number>('AI_MAX_RETRIES', DEFAULT_MAX_RETRIES) ??
        DEFAULT_MAX_RETRIES,
    );
    this.temperature = this.clampNumber(
      this.configService.get<number>('AI_TEMPERATURE', DEFAULT_TEMPERATURE) ??
        DEFAULT_TEMPERATURE,
      0,
      1,
    );
    const timeoutMs = Math.max(
      5_000,
      this.configService.get<number>('AI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS) ??
        DEFAULT_TIMEOUT_MS,
    );

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          timeout: timeoutMs,
        })
      : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async analyzeCv(content: CvContentForAnalysis): Promise<CvAnalysisResult> {
    const raw = await this.createStructuredCompletion(
      [
        'You are an expert resume reviewer.',
        'Analyze the resume content and return JSON only.',
        'Required keys: overallScore, grammarScore, readabilityScore, atsScore, issues, suggestions.',
        'Scores are integers from 0 to 100.',
        'issues is an array of objects: section, type(grammar|readability|ats|content), severity(low|medium|high), message, suggestion?.',
        'suggestions is an array of objects: section, type(improvement|addition|removal), message, originalText?, suggestedText?.',
      ].join(' '),
      {
        task: 'analyze_cv',
        content,
      },
    );

    return this.normalizeAnalysisResult(raw);
  }

  async optimizeCvForJob(
    content: CvContentForAnalysis,
    jobDescription: string,
  ): Promise<CvOptimizationResult> {
    const raw = await this.createStructuredCompletion(
      [
        'You are an expert resume optimizer.',
        'Optimize this resume for the provided job description and return JSON only.',
        'Required keys: matchScore, missingKeywords, suggestions, sectionRecommendations.',
        'matchScore is an integer from 0 to 100.',
        'missingKeywords is an array of strings.',
        'suggestions is an array of objects: section, type(improvement|addition|removal), message, originalText?, suggestedText?.',
        'sectionRecommendations is an array of objects: section, action(add|improve|remove), message, priority(low|medium|high).',
      ].join(' '),
      {
        task: 'optimize_cv_for_job',
        content,
        jobDescription,
      },
    );

    return this.normalizeOptimizationResult(raw);
  }

  async checkGrammar(
    text: string,
    context?: string,
  ): Promise<OpenAiGrammarResult> {
    const raw = await this.createStructuredCompletion(
      [
        'You are a professional resume grammar checker.',
        'Return JSON only.',
        'Required keys: issues, score, summary.',
        'issues is an array of objects with keys: type(grammar|style|impact), message, suggestion, startIndex, endIndex, severity(error|warning|info).',
        'Use character offsets based on the provided text.',
        'score is integer from 0 to 100.',
      ].join(' '),
      {
        task: 'check_grammar',
        context: context ?? null,
        text,
      },
    );

    const issues = this.asArray(raw.issues)
      .map(item => this.normalizeGrammarIssue(item, text))
      .filter((item): item is OpenAiGrammarIssue => item !== null);
    const summary =
      this.toStringValue(raw.summary) ??
      `Found ${issues.length} issue(s)${context ? ` in ${context} context` : ''}.`;

    return {
      issues,
      score: this.clampScore(this.toNumber(raw.score, 75)),
      summary,
    };
  }

  async generateAtsSuggestions(input: {
    cvText: string;
    jobDescription: string;
    missingKeywords: string[];
    existingSuggestions: string[];
  }): Promise<string[]> {
    const raw = await this.createStructuredCompletion(
      [
        'You are an ATS optimization coach.',
        'Return JSON only.',
        'Required key: suggestions.',
        'suggestions is an array of concise, actionable strings tailored to the provided CV text and job description.',
        'Limit to 6 suggestions and prioritize adding missing keywords naturally.',
      ].join(' '),
      {
        task: 'ats_suggestions',
        ...input,
      },
    );

    return this.asArray(raw.suggestions)
      .map(item => this.toStringValue(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, 6);
  }

  async generateCoverLetter(input: {
    fullName?: string;
    summary?: string;
    topExperience: string[];
    topSkills: string[];
    jobTitle?: string;
    company?: string;
    tone?: string;
    jobDescription?: string;
    template?: 'classic_professional' | 'impact_story' | 'concise_modern';
  }): Promise<string> {
    const raw = await this.createStructuredCompletion(
      [
        'You are an expert career writer generating cover letters.',
        'Return JSON only.',
        'Required key: content.',
        'content must be a complete, polished cover letter as plain text.',
        'Keep it concise (around 4-6 short paragraphs) and tailored to the role.',
        'Respect the template style from input.template when provided: classic_professional, impact_story, or concise_modern.',
      ].join(' '),
      {
        task: 'generate_cover_letter',
        ...input,
      },
    );

    const content = this.toStringValue(raw.content);
    if (!content) {
      throw new Error('OpenAI did not return cover letter content');
    }
    return content;
  }

  private async createStructuredCompletion(
    systemPrompt: string,
    payload: JsonObject,
  ): Promise<JsonObject> {
    if (!this.client) {
      throw new Error('OpenAI provider is not configured');
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: this.temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(payload) },
          ],
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) {
          throw new Error('OpenAI returned an empty response');
        }

        const parsed: unknown = JSON.parse(text);
        if (!this.isRecord(parsed)) {
          throw new Error('OpenAI response is not a JSON object');
        }

        return parsed;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown OpenAI error';
        this.logger.warn(
          `OpenAI request failed (${attempt}/${this.maxRetries}): ${message}`,
        );

        if (attempt >= this.maxRetries) {
          throw error;
        }

        await this.sleep(300 * attempt);
      }
    }

    throw new Error('OpenAI request exhausted all retries');
  }

  private normalizeAnalysisResult(raw: JsonObject): CvAnalysisResult {
    const issues = this.asArray(raw.issues)
      .map(item => this.normalizeIssue(item))
      .filter((item): item is CvIssue => item !== null);
    const suggestions = this.asArray(raw.suggestions)
      .map(item => this.normalizeSuggestion(item))
      .filter((item): item is CvSuggestion => item !== null);

    return {
      overallScore: this.clampScore(this.toNumber(raw.overallScore, 70)),
      grammarScore: this.clampScore(this.toNumber(raw.grammarScore, 70)),
      readabilityScore: this.clampScore(
        this.toNumber(raw.readabilityScore, 70),
      ),
      atsScore: this.clampScore(this.toNumber(raw.atsScore, 70)),
      issues,
      suggestions,
    };
  }

  private normalizeOptimizationResult(raw: JsonObject): CvOptimizationResult {
    const suggestions = this.asArray(raw.suggestions)
      .map(item => this.normalizeSuggestion(item))
      .filter((item): item is CvSuggestion => item !== null);
    const sectionRecommendations = this.asArray(raw.sectionRecommendations)
      .map(item => this.normalizeRecommendation(item))
      .filter((item): item is SectionRecommendation => item !== null);

    return {
      matchScore: this.clampScore(this.toNumber(raw.matchScore, 65)),
      missingKeywords: this.asArray(raw.missingKeywords)
        .map(item => this.toStringValue(item))
        .filter((item): item is string => Boolean(item)),
      suggestions,
      sectionRecommendations,
    };
  }

  private normalizeIssue(value: unknown): CvIssue | null {
    if (!this.isRecord(value)) return null;

    const section = this.toStringValue(value.section);
    const message = this.toStringValue(value.message);
    if (!section || !message) return null;

    return {
      section,
      type: this.toIssueType(value.type),
      severity: this.toIssueSeverity(value.severity),
      message,
      suggestion: this.toStringValue(value.suggestion),
    };
  }

  private normalizeSuggestion(value: unknown): CvSuggestion | null {
    if (!this.isRecord(value)) return null;

    const section = this.toStringValue(value.section);
    const message = this.toStringValue(value.message);
    if (!section || !message) return null;

    return {
      section,
      type: this.toSuggestionType(value.type),
      message,
      originalText: this.toStringValue(value.originalText),
      suggestedText: this.toStringValue(value.suggestedText),
    };
  }

  private normalizeRecommendation(
    value: unknown,
  ): SectionRecommendation | null {
    if (!this.isRecord(value)) return null;

    const section = this.toStringValue(value.section);
    const message = this.toStringValue(value.message);
    if (!section || !message) return null;

    return {
      section,
      action: this.toRecommendationAction(value.action),
      message,
      priority: this.toRecommendationPriority(value.priority),
    };
  }

  private normalizeGrammarIssue(
    value: unknown,
    text: string,
  ): OpenAiGrammarIssue | null {
    if (!this.isRecord(value)) return null;

    const message = this.toStringValue(value.message);
    const suggestion = this.toStringValue(value.suggestion);
    if (!message || !suggestion) return null;

    const startIndex = this.toNumber(value.startIndex, 0);
    const endIndex = this.toNumber(value.endIndex, startIndex + 1);
    const maxIndex = Math.max(0, text.length);

    return {
      type: this.toGrammarIssueType(value.type),
      message,
      suggestion,
      startIndex: Math.round(this.clampNumber(startIndex, 0, maxIndex)),
      endIndex: Math.round(this.clampNumber(endIndex, 0, maxIndex)),
      severity: this.toGrammarIssueSeverity(value.severity),
    };
  }

  private toIssueType(value: unknown): CvIssue['type'] {
    if (value === 'grammar') return 'grammar';
    if (value === 'readability') return 'readability';
    if (value === 'ats') return 'ats';
    return 'content';
  }

  private toIssueSeverity(value: unknown): CvIssue['severity'] {
    if (value === 'low') return 'low';
    if (value === 'high') return 'high';
    return 'medium';
  }

  private toSuggestionType(value: unknown): CvSuggestion['type'] {
    if (value === 'addition') return 'addition';
    if (value === 'removal') return 'removal';
    return 'improvement';
  }

  private toRecommendationAction(
    value: unknown,
  ): SectionRecommendation['action'] {
    if (value === 'add') return 'add';
    if (value === 'remove') return 'remove';
    return 'improve';
  }

  private toRecommendationPriority(
    value: unknown,
  ): SectionRecommendation['priority'] {
    if (value === 'low') return 'low';
    if (value === 'high') return 'high';
    return 'medium';
  }

  private toGrammarIssueType(value: unknown): OpenAiGrammarIssue['type'] {
    if (value === 'grammar') return 'grammar';
    if (value === 'impact') return 'impact';
    return 'style';
  }

  private toGrammarIssueSeverity(
    value: unknown,
  ): OpenAiGrammarIssue['severity'] {
    if (value === 'error') return 'error';
    if (value === 'info') return 'info';
    return 'warning';
  }

  private clampScore(value: number): number {
    return Math.round(this.clampNumber(value, 0, 100));
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private toNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private toStringValue(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private isRecord(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}
