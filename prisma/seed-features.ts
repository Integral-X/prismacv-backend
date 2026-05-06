/**
 * Seed data for skills taxonomy, learning resources, and interview questions.
 * Can be run standalone: npx ts-node prisma/seed-features.ts
 * Also imported by seed.ts for unified seeding.
 */
import { PrismaClient } from '@prisma/client';
import { uuidv7 } from 'uuidv7';

async function seedSkillCategories(prisma: PrismaClient) {
  const categories = [
    { name: 'Programming Languages', description: 'Core programming languages', icon: 'code' },
    { name: 'Frontend', description: 'Frontend frameworks and tools', icon: 'layout' },
    { name: 'Backend', description: 'Backend frameworks and tools', icon: 'server' },
    { name: 'Database', description: 'Database systems and tools', icon: 'database' },
    { name: 'DevOps', description: 'DevOps and infrastructure', icon: 'cloud' },
    { name: 'Soft Skills', description: 'Communication and leadership', icon: 'users' },
    { name: 'Design', description: 'UI/UX and design tools', icon: 'palette' },
    { name: 'Data Science', description: 'Data analysis and ML', icon: 'bar-chart' },
    { name: 'Mobile', description: 'Mobile development', icon: 'smartphone' },
    { name: 'Testing', description: 'Testing frameworks and methodologies', icon: 'check-circle' },
  ];

  const created: Record<string, string> = {};
  for (const cat of categories) {
    const id = uuidv7();
    await prisma.skillCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { id, ...cat },
    });
    created[cat.name] = id;
  }
  return created;
}

async function seedRoleSkillMaps(prisma: PrismaClient, categoryIds: Record<string, string>) {
  const roles: Array<{ role: string; skills: Array<{ name: string; cat: string; importance: number }> }> = [
    {
      role: 'Software Engineer',
      skills: [
        { name: 'JavaScript', cat: 'Programming Languages', importance: 5 },
        { name: 'TypeScript', cat: 'Programming Languages', importance: 5 },
        { name: 'Python', cat: 'Programming Languages', importance: 3 },
        { name: 'React', cat: 'Frontend', importance: 4 },
        { name: 'Node.js', cat: 'Backend', importance: 4 },
        { name: 'SQL', cat: 'Database', importance: 4 },
        { name: 'Git', cat: 'DevOps', importance: 5 },
        { name: 'REST APIs', cat: 'Backend', importance: 5 },
        { name: 'Docker', cat: 'DevOps', importance: 3 },
        { name: 'Unit Testing', cat: 'Testing', importance: 4 },
        { name: 'CI/CD', cat: 'DevOps', importance: 3 },
        { name: 'System Design', cat: 'Backend', importance: 3 },
        { name: 'Problem Solving', cat: 'Soft Skills', importance: 5 },
        { name: 'Communication', cat: 'Soft Skills', importance: 4 },
      ],
    },
    {
      role: 'Frontend Developer',
      skills: [
        { name: 'JavaScript', cat: 'Programming Languages', importance: 5 },
        { name: 'TypeScript', cat: 'Programming Languages', importance: 5 },
        { name: 'HTML/CSS', cat: 'Frontend', importance: 5 },
        { name: 'React', cat: 'Frontend', importance: 5 },
        { name: 'Next.js', cat: 'Frontend', importance: 4 },
        { name: 'Tailwind CSS', cat: 'Frontend', importance: 4 },
        { name: 'State Management', cat: 'Frontend', importance: 3 },
        { name: 'Accessibility', cat: 'Frontend', importance: 4 },
        { name: 'Responsive Design', cat: 'Design', importance: 4 },
        { name: 'Browser DevTools', cat: 'Frontend', importance: 3 },
        { name: 'Testing Library', cat: 'Testing', importance: 3 },
        { name: 'Performance Optimization', cat: 'Frontend', importance: 3 },
        { name: 'Git', cat: 'DevOps', importance: 4 },
      ],
    },
    {
      role: 'Backend Developer',
      skills: [
        { name: 'Node.js', cat: 'Backend', importance: 5 },
        { name: 'TypeScript', cat: 'Programming Languages', importance: 5 },
        { name: 'Python', cat: 'Programming Languages', importance: 3 },
        { name: 'PostgreSQL', cat: 'Database', importance: 5 },
        { name: 'REST APIs', cat: 'Backend', importance: 5 },
        { name: 'GraphQL', cat: 'Backend', importance: 3 },
        { name: 'Docker', cat: 'DevOps', importance: 4 },
        { name: 'Redis', cat: 'Database', importance: 3 },
        { name: 'Authentication/Security', cat: 'Backend', importance: 5 },
        { name: 'Microservices', cat: 'Backend', importance: 3 },
        { name: 'Message Queues', cat: 'Backend', importance: 2 },
        { name: 'Unit Testing', cat: 'Testing', importance: 4 },
        { name: 'Git', cat: 'DevOps', importance: 5 },
      ],
    },
    {
      role: 'Full Stack Developer',
      skills: [
        { name: 'JavaScript', cat: 'Programming Languages', importance: 5 },
        { name: 'TypeScript', cat: 'Programming Languages', importance: 5 },
        { name: 'React', cat: 'Frontend', importance: 5 },
        { name: 'Node.js', cat: 'Backend', importance: 5 },
        { name: 'Next.js', cat: 'Frontend', importance: 4 },
        { name: 'PostgreSQL', cat: 'Database', importance: 4 },
        { name: 'REST APIs', cat: 'Backend', importance: 5 },
        { name: 'HTML/CSS', cat: 'Frontend', importance: 4 },
        { name: 'Docker', cat: 'DevOps', importance: 3 },
        { name: 'Git', cat: 'DevOps', importance: 5 },
        { name: 'Unit Testing', cat: 'Testing', importance: 4 },
        { name: 'CI/CD', cat: 'DevOps', importance: 3 },
      ],
    },
    {
      role: 'DevOps Engineer',
      skills: [
        { name: 'Docker', cat: 'DevOps', importance: 5 },
        { name: 'Kubernetes', cat: 'DevOps', importance: 5 },
        { name: 'CI/CD', cat: 'DevOps', importance: 5 },
        { name: 'AWS', cat: 'DevOps', importance: 4 },
        { name: 'Linux', cat: 'DevOps', importance: 5 },
        { name: 'Terraform', cat: 'DevOps', importance: 4 },
        { name: 'Bash Scripting', cat: 'Programming Languages', importance: 4 },
        { name: 'Python', cat: 'Programming Languages', importance: 3 },
        { name: 'Monitoring/Observability', cat: 'DevOps', importance: 4 },
        { name: 'Networking', cat: 'DevOps', importance: 3 },
        { name: 'Git', cat: 'DevOps', importance: 4 },
        { name: 'Security', cat: 'DevOps', importance: 4 },
      ],
    },
    {
      role: 'Data Scientist',
      skills: [
        { name: 'Python', cat: 'Programming Languages', importance: 5 },
        { name: 'SQL', cat: 'Database', importance: 5 },
        { name: 'Machine Learning', cat: 'Data Science', importance: 5 },
        { name: 'Statistics', cat: 'Data Science', importance: 5 },
        { name: 'Pandas/NumPy', cat: 'Data Science', importance: 5 },
        { name: 'Data Visualization', cat: 'Data Science', importance: 4 },
        { name: 'Deep Learning', cat: 'Data Science', importance: 3 },
        { name: 'NLP', cat: 'Data Science', importance: 3 },
        { name: 'Feature Engineering', cat: 'Data Science', importance: 4 },
        { name: 'Git', cat: 'DevOps', importance: 3 },
        { name: 'Communication', cat: 'Soft Skills', importance: 4 },
      ],
    },
    {
      role: 'Product Manager',
      skills: [
        { name: 'Product Strategy', cat: 'Soft Skills', importance: 5 },
        { name: 'User Research', cat: 'Design', importance: 5 },
        { name: 'Data Analysis', cat: 'Data Science', importance: 4 },
        { name: 'Agile/Scrum', cat: 'Soft Skills', importance: 4 },
        { name: 'Communication', cat: 'Soft Skills', importance: 5 },
        { name: 'Stakeholder Management', cat: 'Soft Skills', importance: 5 },
        { name: 'Roadmapping', cat: 'Soft Skills', importance: 4 },
        { name: 'SQL', cat: 'Database', importance: 3 },
        { name: 'Wireframing', cat: 'Design', importance: 3 },
        { name: 'A/B Testing', cat: 'Data Science', importance: 3 },
      ],
    },
    {
      role: 'UX Designer',
      skills: [
        { name: 'User Research', cat: 'Design', importance: 5 },
        { name: 'Wireframing', cat: 'Design', importance: 5 },
        { name: 'Prototyping', cat: 'Design', importance: 5 },
        { name: 'Figma', cat: 'Design', importance: 5 },
        { name: 'Usability Testing', cat: 'Design', importance: 4 },
        { name: 'Information Architecture', cat: 'Design', importance: 4 },
        { name: 'Accessibility', cat: 'Frontend', importance: 4 },
        { name: 'HTML/CSS', cat: 'Frontend', importance: 3 },
        { name: 'Design Systems', cat: 'Design', importance: 3 },
        { name: 'Communication', cat: 'Soft Skills', importance: 4 },
      ],
    },
    {
      role: 'Mobile Developer',
      skills: [
        { name: 'React Native', cat: 'Mobile', importance: 5 },
        { name: 'TypeScript', cat: 'Programming Languages', importance: 4 },
        { name: 'Swift', cat: 'Mobile', importance: 3 },
        { name: 'Kotlin', cat: 'Mobile', importance: 3 },
        { name: 'REST APIs', cat: 'Backend', importance: 4 },
        { name: 'Mobile UI Design', cat: 'Mobile', importance: 4 },
        { name: 'State Management', cat: 'Frontend', importance: 4 },
        { name: 'App Store Deployment', cat: 'Mobile', importance: 3 },
        { name: 'Unit Testing', cat: 'Testing', importance: 3 },
        { name: 'Git', cat: 'DevOps', importance: 4 },
      ],
    },
    {
      role: 'QA Engineer',
      skills: [
        { name: 'Test Automation', cat: 'Testing', importance: 5 },
        { name: 'Selenium/Playwright', cat: 'Testing', importance: 4 },
        { name: 'API Testing', cat: 'Testing', importance: 5 },
        { name: 'Unit Testing', cat: 'Testing', importance: 4 },
        { name: 'Performance Testing', cat: 'Testing', importance: 3 },
        { name: 'SQL', cat: 'Database', importance: 3 },
        { name: 'JavaScript', cat: 'Programming Languages', importance: 3 },
        { name: 'CI/CD', cat: 'DevOps', importance: 3 },
        { name: 'Bug Tracking', cat: 'Testing', importance: 4 },
        { name: 'Communication', cat: 'Soft Skills', importance: 4 },
      ],
    },
  ];

  for (const { role, skills } of roles) {
    for (const skill of skills) {
      const catId = categoryIds[skill.cat];
      if (!catId) continue;
      await prisma.roleSkillMap.upsert({
        where: { role_skillName: { role, skillName: skill.name } },
        update: { importance: skill.importance },
        create: {
          id: uuidv7(),
          role,
          skillName: skill.name,
          categoryId: catId,
          importance: skill.importance,
        },
      });
    }
  }
}

async function seedLearningResources(prisma: PrismaClient) {
  const resources = [
    { skillName: 'TypeScript', title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/', platform: 'Official Docs', difficulty: 'beginner', duration: '10 hours', isFree: true },
    { skillName: 'TypeScript', title: 'Total TypeScript', url: 'https://www.totaltypescript.com/', platform: 'Total TypeScript', difficulty: 'advanced', duration: '40 hours', isFree: false },
    { skillName: 'React', title: 'React Official Tutorial', url: 'https://react.dev/learn', platform: 'Official Docs', difficulty: 'beginner', duration: '8 hours', isFree: true },
    { skillName: 'React', title: 'Epic React', url: 'https://epicreact.dev/', platform: 'Epic React', difficulty: 'intermediate', duration: '30 hours', isFree: false },
    { skillName: 'Node.js', title: 'Node.js Documentation', url: 'https://nodejs.org/en/learn', platform: 'Official Docs', difficulty: 'beginner', duration: '12 hours', isFree: true },
    { skillName: 'Next.js', title: 'Next.js Learn Course', url: 'https://nextjs.org/learn', platform: 'Official Docs', difficulty: 'beginner', duration: '15 hours', isFree: true },
    { skillName: 'PostgreSQL', title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/', platform: 'PostgreSQL Tutorial', difficulty: 'beginner', duration: '20 hours', isFree: true },
    { skillName: 'Docker', title: 'Docker Getting Started', url: 'https://docs.docker.com/get-started/', platform: 'Official Docs', difficulty: 'beginner', duration: '5 hours', isFree: true },
    { skillName: 'Git', title: 'Pro Git Book', url: 'https://git-scm.com/book/en/v2', platform: 'Official Docs', difficulty: 'beginner', duration: '15 hours', isFree: true },
    { skillName: 'Python', title: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/', platform: 'Official Docs', difficulty: 'beginner', duration: '10 hours', isFree: true },
    { skillName: 'Machine Learning', title: 'Machine Learning by Andrew Ng', url: 'https://www.coursera.org/learn/machine-learning', platform: 'Coursera', difficulty: 'intermediate', duration: '60 hours', isFree: false },
    { skillName: 'System Design', title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', platform: 'GitHub', difficulty: 'intermediate', duration: '40 hours', isFree: true },
    { skillName: 'SQL', title: 'SQLBolt Interactive Tutorial', url: 'https://sqlbolt.com/', platform: 'SQLBolt', difficulty: 'beginner', duration: '5 hours', isFree: true },
    { skillName: 'Tailwind CSS', title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs', platform: 'Official Docs', difficulty: 'beginner', duration: '8 hours', isFree: true },
    { skillName: 'Unit Testing', title: 'Testing JavaScript', url: 'https://testingjavascript.com/', platform: 'Testing JavaScript', difficulty: 'intermediate', duration: '20 hours', isFree: false },
    { skillName: 'Kubernetes', title: 'Kubernetes Basics', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', platform: 'Official Docs', difficulty: 'intermediate', duration: '10 hours', isFree: true },
    { skillName: 'REST APIs', title: 'REST API Design Best Practices', url: 'https://restfulapi.net/', platform: 'RESTful API', difficulty: 'beginner', duration: '5 hours', isFree: true },
    { skillName: 'CI/CD', title: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions', platform: 'GitHub', difficulty: 'beginner', duration: '8 hours', isFree: true },
    { skillName: 'Accessibility', title: 'Web Accessibility Course', url: 'https://www.udacity.com/course/web-accessibility--ud891', platform: 'Udacity', difficulty: 'beginner', duration: '12 hours', isFree: true },
    { skillName: 'Figma', title: 'Figma Official Tutorials', url: 'https://www.figma.com/resources/learn-design/', platform: 'Figma', difficulty: 'beginner', duration: '10 hours', isFree: true },
  ];

  for (const r of resources) {
    const existing = await prisma.learningResource.findFirst({
      where: { skillName: r.skillName, title: r.title },
    });
    if (!existing) {
      await prisma.learningResource.create({
        data: { id: uuidv7(), ...r },
      });
    }
  }
}

async function seedInterviewQuestions(prisma: PrismaClient) {
  const questions = [
    // Behavioral
    { question: 'Tell me about a time you faced a significant technical challenge. How did you approach it?', category: 'Behavioral', role: 'Software Engineer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Use the STAR method: Situation, Task, Action, Result. Describe a specific technical problem, your role in solving it, the steps you took, and the measurable outcome.', tips: 'Be specific about the technology and quantify your impact.' },
    { question: 'Describe a situation where you had to work with a difficult team member.', category: 'Behavioral', role: 'Software Engineer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Focus on empathy, communication, and finding common ground. Describe how you listened to their perspective, found a compromise, and improved the working relationship.', tips: 'Show emotional intelligence and conflict resolution skills.' },
    { question: 'Tell me about a time you had to learn a new technology quickly.', category: 'Behavioral', role: 'Software Engineer', difficulty: 'EASY' as const, sampleAnswer: 'Describe your learning strategy: documentation, tutorials, hands-on projects. Mention how you applied it to deliver results within a tight timeline.', tips: 'Demonstrate adaptability and self-learning ability.' },
    { question: 'How do you prioritize tasks when you have multiple deadlines?', category: 'Behavioral', role: 'Software Engineer', difficulty: 'EASY' as const, sampleAnswer: 'Discuss your prioritization framework (urgency vs importance), how you communicate with stakeholders, and tools you use to stay organized.' },
    { question: 'Tell me about your biggest professional failure and what you learned from it.', category: 'Behavioral', role: 'Software Engineer', difficulty: 'HARD' as const, sampleAnswer: 'Be honest about a real failure. Focus on the lessons learned and how you applied them to prevent similar issues in the future.' },
    { question: 'Describe a time when you had to make a decision with incomplete information.', category: 'Behavioral', role: 'Product Manager', difficulty: 'MEDIUM' as const, sampleAnswer: 'Explain your decision-making framework, how you gathered available data, consulted stakeholders, and managed risk.' },
    { question: 'How do you handle disagreements with stakeholders about product direction?', category: 'Behavioral', role: 'Product Manager', difficulty: 'HARD' as const, sampleAnswer: 'Show how you use data and user research to support your position while remaining open to other perspectives.' },

    // Technical - Software Engineer
    { question: 'Explain the difference between REST and GraphQL. When would you use each?', category: 'Technical', role: 'Software Engineer', difficulty: 'MEDIUM' as const, sampleAnswer: 'REST uses fixed endpoints with HTTP methods. GraphQL uses a single endpoint with flexible queries. REST is simpler and better cached; GraphQL reduces over-fetching and is better for complex, nested data needs.' },
    { question: 'What is the event loop in Node.js? How does it handle asynchronous operations?', category: 'Technical', role: 'Software Engineer', difficulty: 'MEDIUM' as const, sampleAnswer: 'The event loop is a single-threaded mechanism that processes callbacks from the event queue. It handles I/O operations asynchronously via libuv, using phases: timers, I/O callbacks, idle/prepare, poll, check, close callbacks.' },
    { question: 'Explain database indexing. When should you create an index and when might it hurt performance?', category: 'Technical', role: 'Software Engineer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Indexes speed up read queries by maintaining a sorted data structure. They hurt write performance and use storage. Create indexes for frequently queried columns, foreign keys, and WHERE clauses. Avoid over-indexing rarely-queried columns.' },
    { question: 'What are the SOLID principles? Give a practical example of each.', category: 'Technical', role: 'Software Engineer', difficulty: 'HARD' as const, sampleAnswer: 'S: Single Responsibility, O: Open/Closed, L: Liskov Substitution, I: Interface Segregation, D: Dependency Inversion. Each principle promotes maintainable, extensible code.' },
    { question: 'How would you design a URL shortener service?', category: 'System Design', role: 'Software Engineer', difficulty: 'HARD' as const, sampleAnswer: 'Discuss: requirements (read-heavy), URL encoding (base62), database choice (key-value store), caching strategy, analytics tracking, and scaling considerations.' },
    { question: 'Explain the concept of closures in JavaScript with a practical example.', category: 'Technical', role: 'Frontend Developer', difficulty: 'EASY' as const, sampleAnswer: 'A closure is a function that retains access to its outer scope even after the outer function has returned. Example: counter function that maintains state through closure.' },
    { question: 'What is the virtual DOM? How does React use it for performance?', category: 'Technical', role: 'Frontend Developer', difficulty: 'MEDIUM' as const, sampleAnswer: 'The virtual DOM is an in-memory representation of the actual DOM. React compares (diffs) the new virtual DOM with the previous one and only updates the changed parts of the real DOM (reconciliation).' },
    { question: 'Explain the difference between Server-Side Rendering and Static Generation in Next.js.', category: 'Technical', role: 'Frontend Developer', difficulty: 'MEDIUM' as const, sampleAnswer: 'SSR generates HTML on each request (dynamic content). SSG generates HTML at build time (static content). Next.js also supports ISR (Incremental Static Regeneration) for hybrid approaches.' },
    { question: 'How would you optimize a slow React application?', category: 'Technical', role: 'Frontend Developer', difficulty: 'HARD' as const, sampleAnswer: 'Profile with React DevTools, identify unnecessary re-renders, use React.memo/useMemo strategically, implement code splitting, lazy loading, virtualization for long lists, and optimize bundle size.' },
    { question: 'Describe the difference between SQL JOIN types with examples.', category: 'Technical', role: 'Backend Developer', difficulty: 'EASY' as const, sampleAnswer: 'INNER JOIN: matching rows. LEFT JOIN: all left + matching right. RIGHT JOIN: all right + matching left. FULL OUTER JOIN: all rows from both. CROSS JOIN: cartesian product.' },
    { question: 'How do you handle database migrations in a production environment?', category: 'Technical', role: 'Backend Developer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Use migration tools (Prisma, Flyway), test migrations against production-like data, use blue-green deployments, backward-compatible schema changes, and rollback strategies.' },

    // System Design
    { question: 'Design a real-time chat application. What technologies and architecture would you use?', category: 'System Design', role: 'Software Engineer', difficulty: 'HARD' as const, sampleAnswer: 'WebSocket for real-time communication, message queue (Redis Pub/Sub) for scaling, database for persistence, CDN for static assets. Discuss: message ordering, delivery guarantees, presence tracking, and horizontal scaling.' },
    { question: 'How would you design a notification system that supports email, SMS, and push notifications?', category: 'System Design', role: 'Software Engineer', difficulty: 'HARD' as const, sampleAnswer: 'Use an event-driven architecture with a message queue. Notification service consumes events and routes to appropriate channels. Include: templates, rate limiting, user preferences, delivery tracking, and retry logic.' },

    // DevOps
    { question: 'Explain the difference between Docker containers and virtual machines.', category: 'Technical', role: 'DevOps Engineer', difficulty: 'EASY' as const, sampleAnswer: 'Containers share the host OS kernel and are lightweight. VMs include a full OS and hypervisor. Containers start faster, use less resources, but VMs provide stronger isolation.' },
    { question: 'How would you implement a CI/CD pipeline for a microservices application?', category: 'Technical', role: 'DevOps Engineer', difficulty: 'HARD' as const, sampleAnswer: 'Discuss: trunk-based development, automated testing (unit, integration, e2e), container building, staged deployments, feature flags, monitoring, and rollback strategies.' },

    // Data Science
    { question: 'Explain the bias-variance tradeoff in machine learning.', category: 'Technical', role: 'Data Scientist', difficulty: 'MEDIUM' as const, sampleAnswer: 'Bias is error from oversimplified models (underfitting). Variance is error from over-complex models (overfitting). The goal is to find the sweet spot that minimizes total error.' },
    { question: 'How would you handle missing data in a dataset?', category: 'Technical', role: 'Data Scientist', difficulty: 'EASY' as const, sampleAnswer: 'Options: remove rows/columns, imputation (mean, median, mode, KNN), use models that handle missing values natively, or create a missing indicator feature. Choice depends on the amount and pattern of missing data.' },

    // Product Manager
    { question: 'How do you define and measure the success of a product feature?', category: 'Technical', role: 'Product Manager', difficulty: 'MEDIUM' as const, sampleAnswer: 'Define success metrics before launch (KPIs), set up tracking, use A/B testing where possible. Metrics can include adoption rate, user satisfaction (NPS), task completion rate, and business impact (revenue, retention).' },
    { question: 'Walk me through how you would prioritize a product backlog.', category: 'Technical', role: 'Product Manager', difficulty: 'MEDIUM' as const, sampleAnswer: 'Use frameworks like RICE (Reach, Impact, Confidence, Effort), MoSCoW, or value vs effort matrix. Consider user feedback, business goals, technical debt, and dependencies.' },

    // UX Designer
    { question: 'Walk me through your design process from research to final design.', category: 'Technical', role: 'UX Designer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Research (user interviews, surveys) → Define (personas, user flows) → Ideate (sketches, wireframes) → Prototype (interactive mockups) → Test (usability testing) → Iterate based on feedback.' },
    { question: 'How do you ensure your designs are accessible to all users?', category: 'Technical', role: 'UX Designer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Follow WCAG guidelines, use sufficient color contrast, provide text alternatives, ensure keyboard navigation, test with screen readers, and include users with disabilities in testing.' },

    // More behavioral questions for various roles
    { question: 'How do you stay current with new technologies and industry trends?', category: 'Behavioral', role: 'Software Engineer', difficulty: 'EASY' as const, sampleAnswer: 'Describe your learning habits: reading tech blogs, following open source projects, attending meetups/conferences, building side projects, and taking courses.' },
    { question: 'Tell me about a project you are most proud of and why.', category: 'Behavioral', role: 'Software Engineer', difficulty: 'EASY' as const, sampleAnswer: 'Choose a project with measurable impact. Describe the challenge, your specific contributions, technologies used, and the outcome.' },
    { question: 'How do you approach code reviews?', category: 'Behavioral', role: 'Software Engineer', difficulty: 'EASY' as const, sampleAnswer: 'Focus on readability, correctness, performance, and maintainability. Be constructive, suggest alternatives, praise good patterns, and use it as a learning opportunity for both parties.' },
    { question: 'Describe a time when you had to convince your team to adopt a new technology or approach.', category: 'Behavioral', role: 'Software Engineer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Describe the problem, research you did, proof of concept you built, how you presented the case, addressed concerns, and the outcome.' },
    { question: 'How do you handle production incidents?', category: 'Behavioral', role: 'DevOps Engineer', difficulty: 'MEDIUM' as const, sampleAnswer: 'Follow incident response process: detect, triage, communicate, mitigate, resolve, postmortem. Discuss on-call rotation, runbooks, and blameless postmortems.' },
  ];

  for (const q of questions) {
    const existing = await prisma.interviewQuestion.findFirst({
      where: { question: q.question },
    });
    if (!existing) {
      await prisma.interviewQuestion.create({
        data: { id: uuidv7(), ...q },
      });
    }
  }
}

export async function seedFeatures(client: PrismaClient) {
  console.log('Seeding skills taxonomy...');
  const categoryIds = await seedSkillCategories(client);

  console.log('Seeding role-skill mappings...');
  await seedRoleSkillMaps(client, categoryIds);

  console.log('Seeding learning resources...');
  await seedLearningResources(client);

  console.log('Seeding interview questions...');
  await seedInterviewQuestions(client);

  console.log('Feature seed complete!');
}

// Allow standalone execution
if (require.main === module) {
  const prisma = new PrismaClient();
  seedFeatures(prisma)
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
