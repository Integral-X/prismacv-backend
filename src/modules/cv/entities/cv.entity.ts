import { BaseEntity } from '@/shared/entities/base.entity';

export enum CvStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export class Cv extends BaseEntity {
  userId!: string;
  title!: string;
  slug!: string;
  status!: CvStatus;
  templateId?: string;
  isDefault: boolean = false;

  personalInfo?: PersonalInfo;
  experiences: Experience[] = [];
  education: Education[] = [];
  skills: Skill[] = [];
  certifications: Certification[] = [];
  projects: Project[] = [];
  languages: Language[] = [];
  customSections: CustomSection[] = [];
}

export class PersonalInfo {
  id!: string;
  cvId!: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedinUrl?: string;
  summary?: string;
  avatarUrl?: string;
}

export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export class Experience {
  id!: string;
  cvId!: string;
  company!: string;
  title!: string;
  location?: string;
  startDate!: Date;
  endDate?: Date;
  current: boolean = false;
  description?: string;
  sortOrder: number = 0;
}

export class Education {
  id!: string;
  cvId!: string;
  institution!: string;
  degree!: string;
  field?: string;
  startDate!: Date;
  endDate?: Date;
  gpa?: string;
  description?: string;
  sortOrder: number = 0;
}

export class Skill {
  id!: string;
  cvId!: string;
  name!: string;
  level: SkillLevel = SkillLevel.INTERMEDIATE;
  category?: string;
  sortOrder: number = 0;
}

export class Certification {
  id!: string;
  cvId!: string;
  name!: string;
  issuer?: string;
  issueDate?: Date;
  expiryDate?: Date;
  credentialUrl?: string;
  sortOrder: number = 0;
}

export class Project {
  id!: string;
  cvId!: string;
  name!: string;
  description?: string;
  url?: string;
  startDate?: Date;
  endDate?: Date;
  sortOrder: number = 0;
}

export enum LanguageProficiency {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  FLUENT = 'FLUENT',
  NATIVE = 'NATIVE',
}

export class Language {
  id!: string;
  cvId!: string;
  name!: string;
  proficiency: LanguageProficiency = LanguageProficiency.INTERMEDIATE;
  sortOrder: number = 0;
}

export class CustomSection {
  id!: string;
  cvId!: string;
  title!: string;
  entries!: Record<string, unknown>[];
  sortOrder: number = 0;
}
