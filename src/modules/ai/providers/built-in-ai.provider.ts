import { Injectable, Logger } from '@nestjs/common';
import type {
  AiProvider,
  CvContentForAnalysis,
  CvAnalysisResult,
  CvOptimizationResult,
  CvIssue,
  CvSuggestion,
} from '../interfaces/ai-provider.interface';

/**
 * Built-in AI provider using rule-based heuristics.
 * Does not require any external API key.
 * Provides baseline analysis for grammar patterns, ATS keywords, and readability.
 */
@Injectable()
export class BuiltInAiProvider implements AiProvider {
  private readonly logger = new Logger(BuiltInAiProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async analyzeCv(content: CvContentForAnalysis): Promise<CvAnalysisResult> {
    const issues: CvIssue[] = [];
    const suggestions: CvSuggestion[] = [];

    // --- Summary analysis ---
    if (!content.personalInfo?.summary) {
      issues.push({
        section: 'personalInfo',
        type: 'content',
        severity: 'high',
        message: 'Missing professional summary',
        suggestion:
          'Add a 2-3 sentence professional summary highlighting your key strengths and career goals.',
      });
    } else if (content.personalInfo.summary.length < 50) {
      issues.push({
        section: 'personalInfo',
        type: 'content',
        severity: 'medium',
        message: 'Professional summary is too short',
        suggestion:
          'Expand your summary to at least 2-3 sentences for better impact.',
      });
    }

    // --- Experience analysis ---
    for (const exp of content.experiences) {
      if (!exp.description) {
        issues.push({
          section: 'experiences',
          type: 'content',
          severity: 'high',
          message: `Missing description for ${exp.title} at ${exp.company}`,
          suggestion:
            'Add bullet points describing your achievements and responsibilities.',
        });
      } else {
        // Check for action verbs
        const actionVerbs = [
          'led',
          'managed',
          'developed',
          'implemented',
          'designed',
          'built',
          'created',
          'improved',
          'reduced',
          'increased',
          'delivered',
          'launched',
          'optimized',
          'streamlined',
        ];
        const descLower = exp.description.toLowerCase();
        const hasActionVerbs = actionVerbs.some(v => descLower.includes(v));
        if (!hasActionVerbs) {
          suggestions.push({
            section: 'experiences',
            type: 'improvement',
            message: `Use stronger action verbs in your ${exp.title} description`,
            originalText: exp.description.slice(0, 100),
            suggestedText:
              'Start bullet points with action verbs like "Led", "Developed", "Implemented".',
          });
        }

        // Check for quantifiable results
        const hasNumbers = /\d+%|\d+ /.test(exp.description);
        if (!hasNumbers) {
          suggestions.push({
            section: 'experiences',
            type: 'improvement',
            message: `Add quantifiable results to your ${exp.title} description`,
            suggestedText:
              'Include metrics like "Increased revenue by 20%" or "Managed team of 5 engineers".',
          });
        }
      }
    }

    // --- Skills analysis ---
    if (content.skills.length === 0) {
      issues.push({
        section: 'skills',
        type: 'ats',
        severity: 'high',
        message: 'No skills listed',
        suggestion:
          'Add at least 5-10 relevant skills to improve ATS matching.',
      });
    } else if (content.skills.length < 5) {
      issues.push({
        section: 'skills',
        type: 'ats',
        severity: 'medium',
        message: 'Few skills listed',
        suggestion:
          'Consider adding more skills. Most competitive CVs list 8-15 skills.',
      });
    }

    // --- Education analysis ---
    if (content.education.length === 0) {
      issues.push({
        section: 'education',
        type: 'content',
        severity: 'medium',
        message: 'No education listed',
        suggestion:
          'Add your educational background including degrees and relevant coursework.',
      });
    }

    // --- Calculate scores ---
    const grammarScore = this.calculateGrammarScore(content);
    const readabilityScore = this.calculateReadabilityScore(content);
    const atsScore = this.calculateAtsScore(content);
    const overallScore = Math.round(
      grammarScore * 0.2 + readabilityScore * 0.3 + atsScore * 0.5,
    );

    return {
      overallScore,
      grammarScore,
      readabilityScore,
      atsScore,
      issues,
      suggestions,
    };
  }

  async optimizeCvForJob(
    content: CvContentForAnalysis,
    jobDescription: string,
  ): Promise<CvOptimizationResult> {
    const jobKeywords = this.extractKeywords(jobDescription);
    const cvKeywords = this.extractCvKeywords(content);

    const missingKeywords = jobKeywords.filter(
      kw => !cvKeywords.some(ck => ck.toLowerCase() === kw.toLowerCase()),
    );

    const matchedCount = jobKeywords.length - missingKeywords.length;
    const matchScore =
      jobKeywords.length > 0
        ? Math.round((matchedCount / jobKeywords.length) * 100)
        : 50;

    const suggestions: CvSuggestion[] = [];
    const sectionRecommendations = [];

    if (missingKeywords.length > 0) {
      suggestions.push({
        section: 'skills',
        type: 'addition',
        message: `Add these keywords found in the job description: ${missingKeywords.slice(0, 10).join(', ')}`,
        suggestedText: missingKeywords.slice(0, 10).join(', '),
      });

      sectionRecommendations.push({
        section: 'skills',
        action: 'improve' as const,
        message: `Your skills section is missing ${missingKeywords.length} keywords from the job description.`,
        priority: 'high' as const,
      });
    }

    if (!content.personalInfo?.summary) {
      sectionRecommendations.push({
        section: 'personalInfo',
        action: 'add' as const,
        message: 'Add a professional summary tailored to this specific role.',
        priority: 'high' as const,
      });
    } else {
      const summaryMissing = missingKeywords.filter(
        kw =>
          !content
            .personalInfo!.summary!.toLowerCase()
            .includes(kw.toLowerCase()),
      );
      if (summaryMissing.length > 3) {
        sectionRecommendations.push({
          section: 'personalInfo',
          action: 'improve' as const,
          message:
            'Tailor your summary to include more keywords from the job description.',
          priority: 'medium' as const,
        });
      }
    }

    return {
      matchScore,
      missingKeywords: missingKeywords.slice(0, 20),
      suggestions,
      sectionRecommendations,
    };
  }

  private calculateGrammarScore(content: CvContentForAnalysis): number {
    let score = 85;
    const allText = this.getAllText(content);

    // Check for common issues
    if (/\s{2,}/.test(allText)) score -= 5; // Double spaces
    if (/[.]{2,}/.test(allText)) score -= 5; // Multiple periods
    if (!allText || allText.length < 100) score -= 10; // Too little content

    return Math.max(0, Math.min(100, score));
  }

  private calculateReadabilityScore(content: CvContentForAnalysis): number {
    let score = 80;
    const allText = this.getAllText(content);

    if (!allText) return 50;

    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength =
      sentences.length > 0 ? allText.split(/\s+/).length / sentences.length : 0;

    if (avgSentenceLength > 25) score -= 15; // Sentences too long
    if (avgSentenceLength < 5) score -= 10; // Sentences too short
    if (content.experiences.length > 0) score += 5;
    if (content.personalInfo?.summary) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateAtsScore(content: CvContentForAnalysis): number {
    let score = 60;

    if (content.personalInfo?.email) score += 5;
    if (content.personalInfo?.fullName) score += 5;
    if (content.personalInfo?.summary) score += 10;
    if (content.skills.length >= 5) score += 10;
    if (content.skills.length >= 10) score += 5;
    if (content.experiences.length > 0) score += 5;
    if (content.education.length > 0) score += 5;

    // Check for descriptions in experiences
    const hasDescriptions = content.experiences.filter(
      e => e.description && e.description.length > 50,
    ).length;
    score += Math.min(10, hasDescriptions * 3);

    return Math.max(0, Math.min(100, score));
  }

  private getAllText(content: CvContentForAnalysis): string {
    const parts: string[] = [];
    if (content.personalInfo?.summary) parts.push(content.personalInfo.summary);
    for (const exp of content.experiences) {
      if (exp.description) parts.push(exp.description);
    }
    return parts.join(' ');
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
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
      'must',
      'this',
      'that',
      'these',
      'those',
      'we',
      'you',
      'they',
      'he',
      'she',
      'it',
      'our',
      'your',
      'their',
      'its',
      'not',
      'no',
      'nor',
      'as',
      'if',
      'then',
      'than',
      'when',
      'where',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'some',
      'any',
      'such',
      'only',
      'own',
      'same',
      'so',
      'too',
      'very',
      'just',
      'about',
      'up',
      'out',
      'also',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s+#.-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    // Count word frequency
    const freq: Record<string, number> = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }

    // Return top keywords by frequency
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word]) => word);
  }

  private extractCvKeywords(content: CvContentForAnalysis): string[] {
    const keywords: string[] = [];
    for (const skill of content.skills) {
      keywords.push(skill.name.toLowerCase());
    }
    const allText = this.getAllText(content);
    keywords.push(...this.extractKeywords(allText));
    return [...new Set(keywords)];
  }
}
