import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiUsageFeature } from '@prisma/client';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { AI_LLM_ATS_FLAG } from '@/modules/ai/ai-feature-flags';
import { MetricsService } from '@/modules/metrics/metrics.service';
import { AtsScoreRequestDto } from './dto/ats-score.request.dto';
import {
  AtsScoreResponseDto,
  KeywordMatchDto,
  AtsSectionScoreDto,
} from './dto/ats-score.response.dto';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'this',
  'that',
  'these',
  'those',
  'i',
  'me',
  'my',
  'myself',
  'we',
  'our',
  'ours',
  'ourselves',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  'he',
  'him',
  'his',
  'himself',
  'she',
  'her',
  'hers',
  'herself',
  'it',
  'its',
  'itself',
  'they',
  'them',
  'their',
  'theirs',
  'themselves',
  'what',
  'which',
  'who',
  'whom',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'because',
  'as',
  'until',
  'while',
  'about',
  'between',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'up',
  'down',
  'out',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'any',
  'if',
  'also',
  'etc',
  'per',
  'able',
  'must',
  'well',
  'including',
  'within',
  'using',
  'work',
  'working',
  'experience',
  'years',
  'year',
  'team',
  'role',
  'job',
  'company',
  'requirements',
  'required',
  'preferred',
  'responsibilities',
  'looking',
  'join',
  'strong',
  'knowledge',
  'understanding',
  'minimum',
  'plus',
  'ideal',
  'candidate',
  'position',
  'opportunity',
  'based',
]);

const TECHNICAL_TERMS = new Set([
  'javascript',
  'typescript',
  'python',
  'java',
  'c#',
  'c++',
  'ruby',
  'go',
  'rust',
  'swift',
  'kotlin',
  'php',
  'scala',
  'r',
  'matlab',
  'perl',
  'react',
  'angular',
  'vue',
  'svelte',
  'nextjs',
  'next.js',
  'nuxt',
  'node.js',
  'nodejs',
  'express',
  'nestjs',
  'django',
  'flask',
  'fastapi',
  'spring',
  'spring boot',
  '.net',
  'rails',
  'laravel',
  'aws',
  'azure',
  'gcp',
  'docker',
  'kubernetes',
  'k8s',
  'terraform',
  'jenkins',
  'github actions',
  'ci/cd',
  'cicd',
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'elasticsearch',
  'kafka',
  'rabbitmq',
  'graphql',
  'rest',
  'restful',
  'grpc',
  'microservices',
  'sql',
  'nosql',
  'dynamodb',
  'cassandra',
  'oracle',
  'html',
  'css',
  'sass',
  'scss',
  'tailwind',
  'bootstrap',
  'webpack',
  'vite',
  'babel',
  'eslint',
  'prettier',
  'git',
  'jira',
  'confluence',
  'figma',
  'sketch',
  'agile',
  'scrum',
  'kanban',
  'devops',
  'sre',
  'machine learning',
  'ml',
  'ai',
  'deep learning',
  'nlp',
  'tensorflow',
  'pytorch',
  'pandas',
  'numpy',
  'scikit-learn',
  'linux',
  'unix',
  'windows',
  'macos',
  'oauth',
  'jwt',
  'saml',
  'sso',
  'ldap',
  'pmp',
  'aws certified',
  'azure certified',
  'cka',
  'ckad',
  'cissp',
  'data structures',
  'algorithms',
  'oop',
  'solid',
  'design patterns',
  'tdd',
  'bdd',
  'unit testing',
  'integration testing',
  'e2e',
  'jest',
  'mocha',
  'cypress',
  'playwright',
  'selenium',
  'prisma',
  'typeorm',
  'sequelize',
  'hibernate',
  'storybook',
  'responsive design',
  'accessibility',
  'a11y',
  'api',
  'sdk',
  'cli',
  'saas',
  'paas',
  'iaas',
]);

const IMPORTANCE_INDICATORS = {
  required: [
    'must have',
    'required',
    'essential',
    'mandatory',
    'must be',
    'need to have',
  ],
  preferred: [
    'preferred',
    'nice to have',
    'ideally',
    'strongly preferred',
    'highly desired',
  ],
  bonus: [
    'bonus',
    'plus',
    'advantage',
    'asset',
    'beneficial',
    'would be great',
  ],
};

const IMPACT_WORDS = [
  'achieved',
  'improved',
  'increased',
  'reduced',
  'led',
  'managed',
  'delivered',
  'built',
  'created',
  'designed',
  'implemented',
  'developed',
  'launched',
  'optimized',
  'streamlined',
  'automated',
  'mentored',
  'spearheaded',
  'orchestrated',
  'transformed',
  'scaled',
  'drove',
  'generated',
  'saved',
  'accelerated',
  'pioneered',
  'established',
];

@Injectable()
export class AtsService {
  private readonly logger = new Logger(AtsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openAiProvider: OpenAiProvider,
    private readonly aiUsageService: AiUsageService,
    private readonly unleashService: UnleashService,
    private readonly metricsService: MetricsService,
  ) {}

  async analyze(
    dto: AtsScoreRequestDto,
    userId: string,
  ): Promise<AtsScoreResponseDto> {
    const { cvText, jobDescription, skills } = dto;
    const cvLower = cvText.toLowerCase();
    const jdLower = jobDescription.toLowerCase();

    // Extract keywords from JD
    const keywords = this.extractKeywords(jdLower, jobDescription);

    // Match keywords against CV
    const keywordMatches = this.matchKeywords(keywords, cvLower, skills);

    // Score individual sections
    const sectionScores = this.scoreSections(cvLower, jdLower, keywordMatches);

    // Calculate keyword match rate
    const matchedCount = keywordMatches.filter(k => k.found).length;
    const keywordMatchRate =
      keywordMatches.length > 0
        ? Math.round((matchedCount / keywordMatches.length) * 100)
        : 0;

    // Calculate formatting score
    const formattingScore = this.scoreFormatting(cvText);

    // Calculate impact language score
    const impactScore = this.scoreImpactLanguage(cvLower);

    // Weighted overall score
    const sectionAvg =
      sectionScores.length > 0
        ? sectionScores.reduce((sum, s) => sum + s.score, 0) /
          sectionScores.length
        : 0;

    const overallScore = Math.round(
      keywordMatchRate * 0.4 +
        sectionAvg * 0.3 +
        formattingScore * 0.15 +
        impactScore * 0.15,
    );

    // Find missing keywords
    const missingKeywords = keywordMatches
      .filter(k => !k.found)
      .map(k => k.keyword);

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      keywordMatches,
      sectionScores,
      formattingScore,
      impactScore,
    );

    const result: AtsScoreResponseDto = {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      keywordMatches,
      sectionScores,
      suggestions,
      missingKeywords,
      keywordMatchRate,
    };

    if (this.shouldUseLlm(userId)) {
      const startedAt = Date.now();
      try {
        await this.aiUsageService.consumeQuota(
          userId,
          AiUsageFeature.ATS_SCORE,
        );
        const llmSuggestions = await this.openAiProvider.generateAtsSuggestions(
          {
            cvText,
            jobDescription,
            missingKeywords: result.missingKeywords,
            existingSuggestions: result.suggestions,
          },
        );
        result.suggestions = this.mergeSuggestions(
          result.suggestions,
          llmSuggestions,
        );
        this.metricsService.recordAiCall({
          feature: 'ats_score',
          provider: 'openai',
          status: 'success',
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        this.metricsService.recordAiCall({
          feature: 'ats_score',
          provider: 'openai',
          status: 'error',
          durationMs: Date.now() - startedAt,
        });
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `OpenAI ATS suggestions failed; using heuristic suggestions only. ${message}`,
        );
      }
    }

    return result;
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

    return this.unleashService.isEnabled(AI_LLM_ATS_FLAG, { userId });
  }

  private mergeSuggestions(
    heuristicSuggestions: string[],
    llmSuggestions: string[],
  ): string[] {
    const merged = [...heuristicSuggestions, ...llmSuggestions].map(s =>
      s.trim(),
    );
    const unique = new Set<string>();
    for (const suggestion of merged) {
      if (!suggestion) continue;
      unique.add(suggestion);
      if (unique.size >= 10) break;
    }
    return [...unique];
  }

  private extractKeywords(
    jdLower: string,
    jdOriginal: string,
  ): Array<{
    keyword: string;
    importance: 'required' | 'preferred' | 'bonus';
  }> {
    const keywords: Map<string, 'required' | 'preferred' | 'bonus'> = new Map();

    // Extract multi-word technical terms first
    for (const term of TECHNICAL_TERMS) {
      if (term.includes(' ') && jdLower.includes(term)) {
        keywords.set(term, this.determineImportance(jdLower, term));
      }
    }

    // Tokenize and extract single-word terms
    const words = jdLower.replace(/[^a-z0-9#+./\-]/g, ' ').split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      if (STOP_WORDS.has(word)) continue;

      if (TECHNICAL_TERMS.has(word)) {
        keywords.set(word, this.determineImportance(jdLower, word));
      }
    }

    // Also extract capitalized phrases that may be product/tool names
    const capitalizedPattern =
      /\b([A-Z][a-zA-Z0-9]*(?:\s[A-Z][a-zA-Z0-9]*)*)\b/g;
    let match: RegExpExecArray | null;
    while ((match = capitalizedPattern.exec(jdOriginal)) !== null) {
      const term = match[1];
      if (term.length >= 2 && !STOP_WORDS.has(term.toLowerCase())) {
        const lower = term.toLowerCase();
        if (TECHNICAL_TERMS.has(lower) && !keywords.has(lower)) {
          keywords.set(lower, this.determineImportance(jdLower, lower));
        }
      }
    }

    // Extract significant non-technical nouns (frequent non-stop words)
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length < 3) continue;
      if (STOP_WORDS.has(word)) continue;
      if (keywords.has(word)) continue;
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    // Add words appearing 2+ times as potential keywords
    for (const [word, count] of wordFreq) {
      if (count >= 2 && !keywords.has(word)) {
        keywords.set(word, 'bonus');
      }
    }

    return Array.from(keywords.entries()).map(([keyword, importance]) => ({
      keyword,
      importance,
    }));
  }

  private determineImportance(
    jdLower: string,
    keyword: string,
  ): 'required' | 'preferred' | 'bonus' {
    // Find the sentence/context around the keyword
    const keywordIndex = jdLower.indexOf(keyword);
    if (keywordIndex === -1) return 'bonus';

    const contextStart = Math.max(0, keywordIndex - 100);
    const contextEnd = Math.min(
      jdLower.length,
      keywordIndex + keyword.length + 100,
    );
    const context = jdLower.slice(contextStart, contextEnd);

    for (const indicator of IMPORTANCE_INDICATORS.required) {
      if (context.includes(indicator)) return 'required';
    }
    for (const indicator of IMPORTANCE_INDICATORS.preferred) {
      if (context.includes(indicator)) return 'preferred';
    }
    for (const indicator of IMPORTANCE_INDICATORS.bonus) {
      if (context.includes(indicator)) return 'bonus';
    }

    // Default: if it's a technical term it's likely required
    if (TECHNICAL_TERMS.has(keyword)) return 'required';
    return 'preferred';
  }

  private matchKeywords(
    keywords: Array<{
      keyword: string;
      importance: 'required' | 'preferred' | 'bonus';
    }>,
    cvLower: string,
    skills?: string[],
  ): KeywordMatchDto[] {
    const skillsLower = (skills || []).map(s => s.toLowerCase());

    return keywords.map(({ keyword, importance }) => {
      // Use word boundary matching to avoid false positives (e.g. "go" matching "ongoing")
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`);
      let found = wordBoundaryRegex.test(cvLower);

      // Check in skills array (exact match only)
      if (!found && skillsLower.length > 0) {
        found = skillsLower.some(s => s === keyword);
      }

      // Handle common variations
      if (!found) {
        found = this.checkVariations(keyword, cvLower);
      }

      return { keyword, found, importance };
    });
  }

  private checkVariations(keyword: string, cvLower: string): boolean {
    // Handle plurals
    if (cvLower.includes(keyword + 's') || cvLower.includes(keyword + 'es')) {
      return true;
    }
    // Handle hyphenated vs space vs concatenated
    const noSep = keyword.replace(/[\s\-./]/g, '');
    const withHyphen = keyword.replace(/[\s./]/g, '-');
    const withSpace = keyword.replace(/[\-./]/g, ' ');
    if (
      cvLower.includes(noSep) ||
      cvLower.includes(withHyphen) ||
      cvLower.includes(withSpace)
    ) {
      return true;
    }
    // Common abbreviation mappings
    const abbrevMap: Record<string, string[]> = {
      javascript: ['js'],
      typescript: ['ts'],
      kubernetes: ['k8s'],
      postgresql: ['postgres', 'psql'],
      'continuous integration': ['ci'],
      'continuous deployment': ['cd'],
      'ci/cd': ['cicd', 'ci cd'],
    };
    const variants = abbrevMap[keyword];
    if (variants) {
      return variants.some(v => cvLower.includes(v));
    }
    return false;
  }

  private scoreSections(
    cvLower: string,
    jdLower: string,
    keywordMatches: KeywordMatchDto[],
  ): AtsSectionScoreDto[] {
    const sections: AtsSectionScoreDto[] = [];

    // Contact info
    sections.push(this.scoreContactInfo(cvLower));

    // Experience section
    sections.push(this.scoreExperience(cvLower));

    // Skills section
    sections.push(this.scoreSkills(cvLower, keywordMatches));

    // Education
    sections.push(this.scoreEducation(cvLower));

    // Summary/Objective
    sections.push(this.scoreSummary(cvLower, jdLower));

    return sections;
  }

  private scoreContactInfo(cvLower: string): AtsSectionScoreDto {
    let score = 0;
    const checks: string[] = [];

    // Email check: bounded quantifiers prevent polynomial backtracking
    if (
      /[a-z0-9]{1,64}(?:[._%+\-][a-z0-9]{1,64}){0,10}@[a-z0-9]{1,253}(?:[.\-][a-z0-9]{1,63}){0,10}\.[a-z]{2,6}/.test(
        cvLower,
      )
    ) {
      score += 25;
    } else {
      checks.push('email');
    }

    // Phone
    if (/(\+?\d[\d\s\-()]{7,20}\d)/.test(cvLower)) {
      score += 25;
    } else {
      checks.push('phone number');
    }

    // LinkedIn
    if (cvLower.includes('linkedin')) {
      score += 25;
    } else {
      checks.push('LinkedIn profile');
    }

    // Name (heuristic: first line or has name-like pattern)
    if (cvLower.length > 0) {
      score += 25; // Assume name is present if CV has content
    }

    const feedback =
      checks.length === 0
        ? 'Contact information is complete.'
        : `Missing: ${checks.join(', ')}.`;

    return { name: 'Contact Info', score, feedback };
  }

  private scoreExperience(cvLower: string): AtsSectionScoreDto {
    let score = 0;

    // Has experience section
    if (
      cvLower.includes('experience') ||
      cvLower.includes('employment') ||
      cvLower.includes('work history')
    ) {
      score += 30;
    }

    // Has quantifiable achievements (numbers, percentages)
    const quantifiers = cvLower.match(
      /\d{1,10}%|\$\d{1,10}|\d{1,6} ?(?:years?|months?|clients?|users?|projects?)/g,
    );
    if (quantifiers && quantifiers.length >= 3) {
      score += 40;
    } else if (quantifiers && quantifiers.length >= 1) {
      score += 20;
    }

    // Has action verbs / impact language
    const impactCount = IMPACT_WORDS.filter(w => cvLower.includes(w)).length;
    if (impactCount >= 5) {
      score += 30;
    } else if (impactCount >= 2) {
      score += 15;
    }

    const feedback =
      score >= 80
        ? 'Experience section is well-structured with quantifiable achievements.'
        : score >= 50
          ? 'Experience section present but could use more quantifiable achievements.'
          : 'Add more quantifiable achievements and action verbs to your experience section.';

    return { name: 'Experience', score, feedback };
  }

  private scoreSkills(
    cvLower: string,
    keywordMatches: KeywordMatchDto[],
  ): AtsSectionScoreDto {
    let score = 0;

    // Has skills section
    if (
      cvLower.includes('skills') ||
      cvLower.includes('technologies') ||
      cvLower.includes('technical')
    ) {
      score += 20;
    }

    // Keyword overlap
    const requiredMatches = keywordMatches.filter(
      k => k.importance === 'required',
    );
    const requiredFound = requiredMatches.filter(k => k.found).length;
    const requiredTotal = requiredMatches.length;

    if (requiredTotal > 0) {
      score += Math.round((requiredFound / requiredTotal) * 80);
    } else {
      // No required keywords identified, score on overall match
      const allFound = keywordMatches.filter(k => k.found).length;
      const allTotal = keywordMatches.length;
      if (allTotal > 0) {
        score += Math.round((allFound / allTotal) * 80);
      }
    }

    const feedback =
      score >= 80
        ? 'Skills section aligns well with job requirements.'
        : score >= 50
          ? 'Skills section partially matches. Add missing required keywords.'
          : 'Skills section needs significant improvement to match job requirements.';

    return { name: 'Skills', score, feedback };
  }

  private scoreEducation(cvLower: string): AtsSectionScoreDto {
    let score = 0;

    if (
      cvLower.includes('education') ||
      cvLower.includes('degree') ||
      cvLower.includes('university') ||
      cvLower.includes('college')
    ) {
      score += 50;
    }

    // Degree mentioned
    const degrees = [
      'bachelor',
      'master',
      'phd',
      'mba',
      'b.s.',
      'm.s.',
      'b.a.',
      'm.a.',
      'associate',
    ];
    if (degrees.some(d => cvLower.includes(d))) {
      score += 30;
    }

    // Certifications
    if (
      cvLower.includes('certification') ||
      cvLower.includes('certified') ||
      cvLower.includes('certificate')
    ) {
      score += 20;
    }

    const feedback =
      score >= 80
        ? 'Education section is well documented.'
        : score >= 50
          ? 'Education section is adequate.'
          : 'Consider adding more educational details or certifications.';

    return { name: 'Education', score, feedback };
  }

  private scoreSummary(cvLower: string, jdLower: string): AtsSectionScoreDto {
    let score = 0;

    // Has a summary/objective section
    if (
      cvLower.includes('summary') ||
      cvLower.includes('objective') ||
      cvLower.includes('profile') ||
      cvLower.includes('about me')
    ) {
      score += 40;
    }

    // Check if summary contains role-relevant keywords from JD
    // Look at first 500 chars as proxy for summary section
    const summarySection = cvLower.slice(0, 500);
    const jdWords = jdLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));
    const uniqueJdWords = [...new Set(jdWords)].slice(0, 20);
    const matchCount = uniqueJdWords.filter(w =>
      summarySection.includes(w),
    ).length;

    if (uniqueJdWords.length > 0) {
      score += Math.round((matchCount / uniqueJdWords.length) * 60);
    }

    const feedback =
      score >= 70
        ? 'Summary/profile section effectively targets the role.'
        : score >= 40
          ? 'Summary present but could better reflect job description keywords.'
          : 'Add a professional summary that incorporates keywords from the target role.';

    return { name: 'Summary/Profile', score, feedback };
  }

  private scoreFormatting(cvText: string): number {
    let score = 0;

    // Reasonable length (300-5000 words)
    const wordCount = cvText.split(/\s+/).length;
    if (wordCount >= 300 && wordCount <= 5000) {
      score += 30;
    } else if (wordCount >= 100) {
      score += 15;
    }

    // Has clear section separators (newlines, headings pattern)
    const lines = cvText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length >= 10) {
      score += 20;
    }

    // No excessive special characters (ATS-unfriendly), excluding common bullets
    const specialChars = (
      cvText.match(/[^\w\s.,;:!?@#$%&*()\-+/'"•▪◦\-*]/g) || []
    ).length;
    if (specialChars < cvText.length * 0.02) {
      score += 25;
    } else {
      score += 10;
    }

    // Consistent bullet points or structured content
    const bulletLines = lines.filter(l => /^\s*[-•*▪◦]\s/.test(l)).length;
    if (bulletLines >= 5) {
      score += 25;
    } else if (bulletLines >= 2) {
      score += 15;
    } else {
      score += 5;
    }

    return Math.min(100, score);
  }

  private scoreImpactLanguage(cvLower: string): number {
    const impactCount = IMPACT_WORDS.filter(w => cvLower.includes(w)).length;

    // Has numbers/metrics
    const metrics = (
      cvLower.match(/\d{1,10}%|\$[\d,]{1,15}|\d{1,10}x|\d{1,10}\+/g) || []
    ).length;

    let score = 0;

    // Impact verbs (up to 50 points)
    score += Math.min(50, impactCount * 5);

    // Metrics (up to 50 points)
    score += Math.min(50, metrics * 10);

    return Math.min(100, score);
  }

  private generateSuggestions(
    keywordMatches: KeywordMatchDto[],
    sectionScores: AtsSectionScoreDto[],
    formattingScore: number,
    impactScore: number,
  ): string[] {
    const suggestions: string[] = [];

    // Missing required keywords
    const missingRequired = keywordMatches.filter(
      k => !k.found && k.importance === 'required',
    );
    for (const kw of missingRequired.slice(0, 5)) {
      suggestions.push(
        `Add "${kw.keyword}" to your CV — it's a required keyword in the job description.`,
      );
    }

    // Missing preferred keywords
    const missingPreferred = keywordMatches.filter(
      k => !k.found && k.importance === 'preferred',
    );
    for (const kw of missingPreferred.slice(0, 3)) {
      suggestions.push(
        `Consider adding "${kw.keyword}" — it's a preferred qualification.`,
      );
    }

    // Section-specific suggestions
    for (const section of sectionScores) {
      if (section.score < 50) {
        suggestions.push(
          `Improve your ${section.name} section: ${section.feedback}`,
        );
      }
    }

    // Formatting
    if (formattingScore < 60) {
      suggestions.push(
        'Improve CV formatting: use bullet points, clear section headers, and keep length between 1-3 pages.',
      );
    }

    // Impact language
    if (impactScore < 40) {
      suggestions.push(
        'Use more action verbs and quantifiable achievements (e.g., "Increased revenue by 25%", "Led a team of 8").',
      );
    }

    return suggestions.slice(0, 10);
  }
}
