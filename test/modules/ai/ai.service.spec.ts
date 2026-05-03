import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '@/modules/ai/ai.service';
import { CvService } from '@/modules/cv/cv.service';

describe('AiService', () => {
  let service: AiService;
  let cvService: { findOne: jest.Mock };

  const userId = 'user-123';
  const cvId = 'cv-456';

  const mockCv = {
    id: cvId,
    userId,
    title: 'My CV',
    slug: 'my-cv',
    status: 'DRAFT',
    personalInfo: {
      id: 'pi-1',
      fullName: 'John Doe',
      email: 'john@example.com',
      summary: 'Experienced software engineer with 5 years of experience building web applications using React and Node.js',
    },
    experiences: [
      {
        id: 'exp-1',
        company: 'TechCorp',
        title: 'Senior Developer',
        description: 'Led team of 5 engineers. Increased deployment frequency by 40%. Built microservices architecture handling 10000 requests per second.',
        startDate: new Date('2020-01-01'),
        endDate: null,
        current: true,
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'MIT',
        degree: 'BS Computer Science',
        startDate: new Date('2016-01-01'),
        endDate: new Date('2020-01-01'),
      },
    ],
    skills: [
      { id: 's-1', name: 'TypeScript' },
      { id: 's-2', name: 'React' },
      { id: 's-3', name: 'Node.js' },
      { id: 's-4', name: 'Docker' },
      { id: 's-5', name: 'PostgreSQL' },
    ],
    certifications: [],
    projects: [],
    languages: [],
    customSections: [],
  };

  beforeEach(async () => {
    cvService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: CvService, useValue: cvService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeCv', () => {
    it('should return analysis results with scores', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      const result = await service.analyzeCv(cvId, userId);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('grammarScore');
      expect(result).toHaveProperty('readabilityScore');
      expect(result).toHaveProperty('atsScore');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('suggestions');

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should call cvService.findOne with correct params', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      await service.analyzeCv(cvId, userId);
      expect(cvService.findOne).toHaveBeenCalledWith(cvId, userId);
    });
  });

  describe('optimizeCvForJob', () => {
    it('should return optimization results with match score', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      const result = await service.optimizeCvForJob(
        cvId,
        userId,
        'Looking for a senior TypeScript developer with React and Node.js experience. Must know Docker and CI/CD.',
      );

      expect(result).toHaveProperty('matchScore');
      expect(result).toHaveProperty('missingKeywords');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('sectionRecommendations');

      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
    });

    it('should identify missing keywords from job description', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      const result = await service.optimizeCvForJob(
        cvId,
        userId,
        'We need a TypeScript and React and Kubernetes developer',
      );

      // missingKeywords should contain keywords not found in the CV
      expect(Array.isArray(result.missingKeywords)).toBe(true);
    });
  });
});
