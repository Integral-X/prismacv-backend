/**
 * AI Provider interface — provider-agnostic design.
 * Implement this interface for OpenAI, Anthropic, or any LLM provider.
 */
export interface AiProvider {
  /**
   * Analyze CV content and return structured feedback
   */
  analyzeCv(content: CvContentForAnalysis): Promise<CvAnalysisResult>;

  /**
   * Optimize CV content for a specific job description
   */
  optimizeCvForJob(
    content: CvContentForAnalysis,
    jobDescription: string,
  ): Promise<CvOptimizationResult>;

  /**
   * Check if the provider is available/configured
   */
  isAvailable(): boolean;
}

export interface CvContentForAnalysis {
  personalInfo?: {
    fullName?: string;
    email?: string;
    summary?: string;
  };
  experiences: Array<{
    title: string;
    company: string;
    description?: string;
    startDate: string;
    endDate?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
  }>;
  skills: Array<{
    name: string;
    level: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
  }>;
  projects: Array<{
    name: string;
    description?: string;
  }>;
}

export interface CvAnalysisResult {
  overallScore: number; // 0-100
  grammarScore: number;
  readabilityScore: number;
  atsScore: number;
  issues: CvIssue[];
  suggestions: CvSuggestion[];
}

export interface CvOptimizationResult {
  matchScore: number; // 0-100 match with job description
  missingKeywords: string[];
  suggestions: CvSuggestion[];
  sectionRecommendations: SectionRecommendation[];
}

export interface CvIssue {
  section: string;
  type: 'grammar' | 'readability' | 'ats' | 'content';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

export interface CvSuggestion {
  section: string;
  type: 'improvement' | 'addition' | 'removal';
  message: string;
  originalText?: string;
  suggestedText?: string;
}

export interface SectionRecommendation {
  section: string;
  action: 'add' | 'improve' | 'remove';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export const AI_PROVIDER = 'AI_PROVIDER';
