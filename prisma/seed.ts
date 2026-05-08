import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createLogger, format, transports } from 'winston';
import { uuidv7 } from 'uuidv7';
import { seedFeatures } from './seed-features';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }),
  ),
  transports: [new transports.Console()],
});

const prisma = new PrismaClient();

async function seedBillingPlans(client: PrismaClient): Promise<void> {
  const plans = [
    {
      code: 'FREE' as const,
      name: 'Free',
      description: 'Core resume builder features',
      priceMonthlyCents: 0,
      priceYearlyCents: 0,
      stripePriceMonthly: null,
      stripePriceYearly: null,
    },
    {
      code: 'PRO' as const,
      name: 'Pro',
      description: 'Advanced AI and optimization features',
      priceMonthlyCents: 1900,
      priceYearlyCents: 19000,
      stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
      stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? null,
    },
    {
      code: 'TEAM' as const,
      name: 'Team',
      description: 'Collaboration and team management features',
      priceMonthlyCents: 4900,
      priceYearlyCents: 49000,
      stripePriceMonthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? null,
      stripePriceYearly: process.env.STRIPE_PRICE_TEAM_YEARLY ?? null,
    },
  ];

  for (const plan of plans) {
    await client.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthlyCents: plan.priceMonthlyCents,
        priceYearlyCents: plan.priceYearlyCents,
        stripePriceMonthly: plan.stripePriceMonthly,
        stripePriceYearly: plan.stripePriceYearly,
        isActive: true,
      },
      create: {
        id: uuidv7(),
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthlyCents: plan.priceMonthlyCents,
        priceYearlyCents: plan.priceYearlyCents,
        stripePriceMonthly: plan.stripePriceMonthly,
        stripePriceYearly: plan.stripePriceYearly,
        isActive: true,
      },
    });
  }
}

interface ResumeExampleSeed {
  slug: string;
  title: string;
  fullName: string;
  location: string;
  summary: string;
  headlineRole: string;
  skills: string[];
}

async function seedPublicResumeExamples(
  client: PrismaClient,
  userId: string,
): Promise<void> {
  const examples: ResumeExampleSeed[] = [
    {
      slug: 'software-engineer-example',
      title: 'Backend platform engineer resume',
      fullName: 'Taylor Nguyen',
      location: 'Berlin, Germany',
      summary:
        'Backend engineer focused on reliability, distributed systems, and measurable platform improvements.',
      headlineRole: 'Senior Backend Engineer',
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kafka', 'AWS'],
    },
    {
      slug: 'product-manager-example',
      title: 'B2B SaaS product manager resume',
      fullName: 'Samira Rahman',
      location: 'Amsterdam, Netherlands',
      summary:
        'Product manager with a track record of turning customer insights into high-impact roadmap outcomes.',
      headlineRole: 'Senior Product Manager',
      skills: [
        'Roadmapping',
        'Experimentation',
        'User Interviews',
        'SQL',
        'Stakeholder Management',
      ],
    },
    {
      slug: 'data-analyst-example',
      title: 'Analytics and insights specialist resume',
      fullName: 'Jordan Lee',
      location: 'Dublin, Ireland',
      summary:
        'Data analyst delivering business outcomes through clear metrics, trusted dashboards, and actionable reporting.',
      headlineRole: 'Data Analyst',
      skills: ['SQL', 'Python', 'Looker', 'A/B Testing', 'Data Modeling'],
    },
    {
      slug: 'ux-designer-example',
      title: 'Product design portfolio resume',
      fullName: 'Morgan Silva',
      location: 'Lisbon, Portugal',
      summary:
        'UX designer improving activation and retention through user-centered product design and experimentation.',
      headlineRole: 'Senior UX Designer',
      skills: [
        'Figma',
        'Design Systems',
        'User Research',
        'Interaction Design',
        'Usability Testing',
      ],
    },
  ];

  for (const [index, example] of examples.entries()) {
    const existingCv = await client.cv.findUnique({
      where: { userId_slug: { userId, slug: example.slug } },
      select: { id: true },
    });

    const cvId = existingCv?.id ?? uuidv7();
    if (!existingCv) {
      await client.cv.create({
        data: {
          id: cvId,
          userId,
          title: example.title,
          slug: example.slug,
          status: 'PUBLISHED',
          templateId: String((index % 3) + 1),
          isDefault: false,
          personalInfo: {
            create: {
              id: uuidv7(),
              fullName: example.fullName,
              email: `examples+${example.slug}@prismacv.dev`,
              location: example.location,
              summary: example.summary,
            },
          },
          experiences: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  company: 'PrismaCV Labs',
                  title: example.headlineRole,
                  location: example.location,
                  startDate: new Date('2021-01-01'),
                  current: true,
                  description:
                    'Delivered measurable business outcomes, improved cross-functional delivery quality, and mentored teammates.',
                  sortOrder: 0,
                },
                {
                  id: uuidv7(),
                  company: 'GrowthWorks',
                  title: `${example.headlineRole} II`,
                  location: example.location,
                  startDate: new Date('2018-01-01'),
                  endDate: new Date('2020-12-31'),
                  current: false,
                  description:
                    'Led initiatives with data-informed decisions and shipped customer-facing improvements across product cycles.',
                  sortOrder: 1,
                },
              ],
            },
          },
          education: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  institution: 'European Institute of Technology',
                  degree: 'B.Sc.',
                  field: 'Information Systems',
                  startDate: new Date('2011-09-01'),
                  endDate: new Date('2015-06-30'),
                  sortOrder: 0,
                },
              ],
            },
          },
          skills: {
            createMany: {
              data: example.skills.map((skill, skillIndex) => ({
                id: uuidv7(),
                name: skill,
                level: skillIndex < 2 ? 'EXPERT' : 'ADVANCED',
                category: 'Core',
                sortOrder: skillIndex,
              })),
            },
          },
          projects: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  name: 'Cross-functional impact initiative',
                  description:
                    'Designed and delivered an initiative that improved conversion and user retention over two quarters.',
                  sortOrder: 0,
                },
              ],
            },
          },
        },
      });
      logger.info(`Seeded resume example CV for slug: ${example.slug}`);
    } else {
      logger.info(`Resume example CV already exists for slug: ${example.slug}`);
    }

    await client.cvShare.deleteMany({
      where: {
        shareSlug: example.slug,
        NOT: { cvId },
      },
    });

    await client.cvShare.upsert({
      where: { cvId },
      update: {
        shareSlug: example.slug,
        isPublic: true,
      },
      create: {
        id: uuidv7(),
        cvId,
        shareSlug: example.slug,
        isPublic: true,
      },
    });
  }
}

async function main() {
  logger.info('Starting database seeding...');

  // ── Seed platform feature data (skills, interview questions, etc.) ──
  // Always seed features regardless of admin env vars
  await seedFeatures(prisma);
  await seedBillingPlans(prisma);

  const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL?.trim();
  const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD;
  const masterAdminName = process.env.MASTER_ADMIN_NAME?.trim();

  if (!masterAdminEmail || !masterAdminPassword) {
    logger.warn(
      'MASTER_ADMIN_EMAIL or MASTER_ADMIN_PASSWORD is not set. Skipping master admin seed.',
    );
    logger.info('Database seeding completed!');
    return;
  }

  // Create master admin user
  const hashedPassword = await bcrypt.hash(masterAdminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: masterAdminEmail },
    update: {
      password: hashedPassword,
      name: masterAdminName || undefined,
      role: 'PLATFORM_ADMIN',
      isMasterAdmin: true,
    },
    create: {
      id: uuidv7(),
      email: masterAdminEmail,
      password: hashedPassword,
      name: masterAdminName || undefined,
      role: 'PLATFORM_ADMIN',
      isMasterAdmin: true,
      provider: null,
    },
  });

  logger.info(`Created/updated master admin user: ${admin.email}`);

  // ── Seed sample user + CV for development ────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const sampleEmail = 'demo@prismacv.dev';
    const sampleUser = await prisma.user.upsert({
      where: { email: sampleEmail },
      update: {},
      create: {
        id: uuidv7(),
        email: sampleEmail,
        password: await bcrypt.hash('Demo1234!', 12),
        name: 'Demo User',
        role: 'REGULAR',
        isMasterAdmin: false,
        provider: null,
      },
    });
    logger.info(`Created/updated demo user: ${sampleUser.email}`);

    // Only create sample CV if none exist for the user
    const existingCvs = await prisma.cv.count({
      where: { userId: sampleUser.id },
    });

    if (existingCvs === 0) {
      const cvId = uuidv7();
      await prisma.cv.create({
        data: {
          id: cvId,
          userId: sampleUser.id,
          title: 'Full-Stack Developer',
          slug: 'full-stack-developer',
          status: 'PUBLISHED',
          templateId: '1',
          isDefault: true,
          personalInfo: {
            create: {
              id: uuidv7(),
              fullName: 'Alex Johnson',
              email: sampleEmail,
              phone: '+49 170 1234567',
              location: 'Berlin, Germany',
              website: 'https://alexjohnson.dev',
              linkedinUrl: 'https://linkedin.com/in/alexjohnson',
              summary:
                'Senior Full-Stack Developer with 8+ years building scalable web applications. TypeScript, React, Node.js, and cloud infrastructure expert.',
            },
          },
          experiences: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  company: 'TechCorp GmbH',
                  title: 'Senior Full-Stack Developer',
                  location: 'Berlin, Germany',
                  startDate: new Date('2021-03-01'),
                  current: true,
                  description:
                    'Lead a team of 5 engineers building a SaaS platform serving 50K+ users. Migrated monolith to microservices, reducing deployment time by 70%.',
                  sortOrder: 0,
                },
                {
                  id: uuidv7(),
                  company: 'StartupXYZ',
                  title: 'Full-Stack Developer',
                  location: 'Munich, Germany',
                  startDate: new Date('2018-06-01'),
                  endDate: new Date('2021-02-28'),
                  current: false,
                  description:
                    'Built real-time collaboration features using WebSockets and React. Implemented CI/CD pipelines with GitHub Actions.',
                  sortOrder: 1,
                },
                {
                  id: uuidv7(),
                  company: 'Web Agency Co.',
                  title: 'Junior Developer',
                  location: 'Hamburg, Germany',
                  startDate: new Date('2016-01-01'),
                  endDate: new Date('2018-05-31'),
                  current: false,
                  description:
                    'Developed responsive websites and e-commerce solutions for 20+ clients using React and Node.js.',
                  sortOrder: 2,
                },
              ],
            },
          },
          education: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  institution: 'Technical University of Berlin',
                  degree: 'M.Sc.',
                  field: 'Computer Science',
                  startDate: new Date('2013-10-01'),
                  endDate: new Date('2015-09-30'),
                  gpa: '1.3',
                  sortOrder: 0,
                },
                {
                  id: uuidv7(),
                  institution: 'University of Hamburg',
                  degree: 'B.Sc.',
                  field: 'Computer Science',
                  startDate: new Date('2010-10-01'),
                  endDate: new Date('2013-09-30'),
                  gpa: '1.7',
                  sortOrder: 1,
                },
              ],
            },
          },
          skills: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  name: 'TypeScript',
                  level: 'EXPERT',
                  category: 'Languages',
                  sortOrder: 0,
                },
                {
                  id: uuidv7(),
                  name: 'React',
                  level: 'EXPERT',
                  category: 'Frontend',
                  sortOrder: 1,
                },
                {
                  id: uuidv7(),
                  name: 'Node.js',
                  level: 'EXPERT',
                  category: 'Backend',
                  sortOrder: 2,
                },
                {
                  id: uuidv7(),
                  name: 'PostgreSQL',
                  level: 'ADVANCED',
                  category: 'Database',
                  sortOrder: 3,
                },
                {
                  id: uuidv7(),
                  name: 'Docker',
                  level: 'ADVANCED',
                  category: 'DevOps',
                  sortOrder: 4,
                },
                {
                  id: uuidv7(),
                  name: 'AWS',
                  level: 'INTERMEDIATE',
                  category: 'Cloud',
                  sortOrder: 5,
                },
                {
                  id: uuidv7(),
                  name: 'GraphQL',
                  level: 'ADVANCED',
                  category: 'API',
                  sortOrder: 6,
                },
                {
                  id: uuidv7(),
                  name: 'Prisma',
                  level: 'EXPERT',
                  category: 'ORM',
                  sortOrder: 7,
                },
              ],
            },
          },
          certifications: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  name: 'AWS Solutions Architect – Associate',
                  issuer: 'Amazon Web Services',
                  issueDate: new Date('2023-05-15'),
                  expiryDate: new Date('2026-05-15'),
                  credentialUrl: 'https://aws.amazon.com/verification',
                  sortOrder: 0,
                },
              ],
            },
          },
          projects: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  name: 'OpenSource CLI Tool',
                  description:
                    'A developer CLI with 2K+ GitHub stars for scaffolding microservice projects.',
                  url: 'https://github.com/alexjohnson/cli-tool',
                  startDate: new Date('2022-01-01'),
                  sortOrder: 0,
                },
              ],
            },
          },
          languages: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  name: 'English',
                  proficiency: 'NATIVE',
                  sortOrder: 0,
                },
                {
                  id: uuidv7(),
                  name: 'German',
                  proficiency: 'FLUENT',
                  sortOrder: 1,
                },
                {
                  id: uuidv7(),
                  name: 'French',
                  proficiency: 'INTERMEDIATE',
                  sortOrder: 2,
                },
              ],
            },
          },
          customSections: {
            createMany: {
              data: [
                {
                  id: uuidv7(),
                  title: 'Volunteer Work',
                  entries: [
                    {
                      role: 'Mentor',
                      organization: 'Code for Germany',
                      year: '2022–present',
                    },
                  ],
                  sortOrder: 0,
                },
              ],
            },
          },
        },
      });
      logger.info(`Created sample CV "${cvId}" for demo user`);
    } else {
      logger.info('Demo user already has CVs — skipping sample CV seed');
    }

    await seedPublicResumeExamples(prisma, sampleUser.id);
  }

  logger.info('Database seeding completed!');
}

main()
  .catch(e => {
    logger.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
