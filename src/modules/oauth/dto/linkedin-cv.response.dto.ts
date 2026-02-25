import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkedinCvSourceDto {
  @ApiProperty({ example: 'LINKEDIN' })
  provider: string;

  @ApiPropertyOptional({ example: '0198a6d4-06cf-7bc6-a6b6-9468f8e1d6d2' })
  importId?: string;

  @ApiPropertyOptional({ example: 'john-doe' })
  handle?: string | null;

  @ApiPropertyOptional({ example: 'https://www.linkedin.com/in/john-doe' })
  url?: string | null;

  @ApiProperty({ example: '2026-01-25T12:00:00.000Z' })
  fetchedAt: string;

  @ApiProperty({
    example: ['r_liteprofile', 'r_emailaddress'],
    description: 'OAuth scopes available for this import',
  })
  dataScope: string[];

  @ApiPropertyOptional({
    example: [
      'Full LinkedIn profile data requires LinkedIn partner access. Returned data is limited to OAuth lite profile + email.',
    ],
  })
  warnings?: string[];
}

export class LinkedinCvProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  fullName?: string | null;

  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  headline?: string | null;

  @ApiPropertyOptional({ example: 'Berlin, Germany' })
  location?: string | null;

  @ApiPropertyOptional({ example: 'Product-focused engineer with 8+ years...' })
  summary?: string | null;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: '+49 123 456 789' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'https://johndoe.dev' })
  website?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  photoUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://www.linkedin.com/in/john-doe' })
  linkedinUrl?: string | null;

  @ApiPropertyOptional({ example: 'john-doe' })
  linkedinHandle?: string | null;
}

export class LinkedinCvExperienceDto {
  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  title?: string | null;

  @ApiPropertyOptional({ example: 'Acme Inc.' })
  company?: string | null;

  @ApiPropertyOptional({ example: 'Berlin, Germany' })
  location?: string | null;

  @ApiPropertyOptional({ example: '2021-03-01' })
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2024-11-01' })
  endDate?: string | null;

  @ApiPropertyOptional({ example: 'full-time' })
  employmentType?: string | null;

  @ApiPropertyOptional({
    example: 'Built and scaled a multi-tenant platform serving 2M+ users.',
  })
  description?: string | null;
}

export class LinkedinCvEducationDto {
  @ApiPropertyOptional({ example: 'Technical University of Munich' })
  school?: string | null;

  @ApiPropertyOptional({ example: 'B.Sc.' })
  degree?: string | null;

  @ApiPropertyOptional({ example: 'Computer Science' })
  fieldOfStudy?: string | null;

  @ApiPropertyOptional({ example: '2014-09-01' })
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2018-07-01' })
  endDate?: string | null;

  @ApiPropertyOptional({ example: '3.7/4.0' })
  grade?: string | null;

  @ApiPropertyOptional({ example: 'Robotics Club, ACM' })
  activities?: string | null;
}

export class LinkedinCvCertificationDto {
  @ApiPropertyOptional({ example: 'AWS Certified Solutions Architect' })
  name?: string | null;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  authority?: string | null;

  @ApiPropertyOptional({ example: 'ABC-123' })
  licenseNumber?: string | null;

  @ApiPropertyOptional({ example: '2022-06-01' })
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2025-06-01' })
  endDate?: string | null;

  @ApiPropertyOptional({ example: 'https://www.cert.example.com/verify' })
  url?: string | null;
}

export class LinkedinCvProjectDto {
  @ApiPropertyOptional({ example: 'Resume Builder' })
  name?: string | null;

  @ApiPropertyOptional({ example: '2023-01-01' })
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2023-08-01' })
  endDate?: string | null;

  @ApiPropertyOptional({ example: 'Built an AI-powered resume builder.' })
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://github.com/john/resume-builder' })
  url?: string | null;
}

export class LinkedinCvPublicationDto {
  @ApiPropertyOptional({ example: 'Scaling Multi-tenant SaaS' })
  title?: string | null;

  @ApiPropertyOptional({ example: '2023-05-10' })
  publishedDate?: string | null;

  @ApiPropertyOptional({ example: 'ACM Queue' })
  publisher?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/paper' })
  url?: string | null;

  @ApiPropertyOptional({ example: 'Paper on multi-tenant scaling techniques.' })
  description?: string | null;
}

export class LinkedinCvVolunteerDto {
  @ApiPropertyOptional({ example: 'Mentor' })
  role?: string | null;

  @ApiPropertyOptional({ example: 'Girls Who Code' })
  organization?: string | null;

  @ApiPropertyOptional({ example: '2021-01-01' })
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2022-12-01' })
  endDate?: string | null;

  @ApiPropertyOptional({ example: 'Mentored junior developers.' })
  description?: string | null;
}

export class LinkedinCvHonorDto {
  @ApiPropertyOptional({ example: 'Employee of the Year' })
  title?: string | null;

  @ApiPropertyOptional({ example: 'Acme Inc.' })
  issuer?: string | null;

  @ApiPropertyOptional({ example: '2022-12-01' })
  date?: string | null;

  @ApiPropertyOptional({ example: 'Recognized for leading platform rewrite.' })
  description?: string | null;
}

export class LinkedinCvLanguageDto {
  @ApiPropertyOptional({ example: 'English' })
  name?: string | null;

  @ApiPropertyOptional({ example: 'Native or bilingual proficiency' })
  proficiency?: string | null;
}

export class LinkedinCvCourseDto {
  @ApiPropertyOptional({ example: 'System Design' })
  name?: string | null;

  @ApiPropertyOptional({ example: 'Coursera' })
  provider?: string | null;

  @ApiPropertyOptional({ example: '2023-02-01' })
  completedDate?: string | null;
}

export class LinkedinCvResponseDto {
  @ApiProperty({ type: LinkedinCvSourceDto })
  source: LinkedinCvSourceDto;

  @ApiProperty({ type: LinkedinCvProfileDto })
  profile: LinkedinCvProfileDto;

  @ApiProperty({ type: [LinkedinCvExperienceDto] })
  experience: LinkedinCvExperienceDto[];

  @ApiProperty({ type: [LinkedinCvEducationDto] })
  education: LinkedinCvEducationDto[];

  @ApiProperty({ type: [String] })
  skills: string[];

  @ApiProperty({ type: [LinkedinCvCertificationDto] })
  certifications: LinkedinCvCertificationDto[];

  @ApiProperty({ type: [LinkedinCvProjectDto] })
  projects: LinkedinCvProjectDto[];

  @ApiProperty({ type: [LinkedinCvPublicationDto] })
  publications: LinkedinCvPublicationDto[];

  @ApiProperty({ type: [LinkedinCvVolunteerDto] })
  volunteer: LinkedinCvVolunteerDto[];

  @ApiProperty({ type: [LinkedinCvHonorDto] })
  honors: LinkedinCvHonorDto[];

  @ApiProperty({ type: [LinkedinCvLanguageDto] })
  languages: LinkedinCvLanguageDto[];

  @ApiProperty({ type: [LinkedinCvCourseDto] })
  courses: LinkedinCvCourseDto[];
}
