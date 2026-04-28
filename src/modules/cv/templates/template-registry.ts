export type TemplateLayout = 'single' | 'two-column';
export type TemplateCategory = 'professional' | 'modern' | 'creative';

export interface CvTemplate {
  id: string;
  name: string;
  thumbnail: string;
  hasHeadshot: boolean;
  layout: TemplateLayout;
  category: TemplateCategory;
}

export const CV_TEMPLATES: readonly CvTemplate[] = [
  {
    id: '1',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_1.svg',
    hasHeadshot: true,
    layout: 'single',
    category: 'professional',
  },
  {
    id: '2',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_2.svg',
    hasHeadshot: false,
    layout: 'two-column',
    category: 'modern',
  },
  {
    id: '3',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_3.svg',
    hasHeadshot: true,
    layout: 'two-column',
    category: 'creative',
  },
  {
    id: '4',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_1.svg',
    hasHeadshot: false,
    layout: 'single',
    category: 'professional',
  },
  {
    id: '5',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_2.svg',
    hasHeadshot: true,
    layout: 'single',
    category: 'modern',
  },
  {
    id: '6',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_3.svg',
    hasHeadshot: false,
    layout: 'two-column',
    category: 'creative',
  },
  {
    id: '7',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_1.svg',
    hasHeadshot: true,
    layout: 'two-column',
    category: 'professional',
  },
  {
    id: '8',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_2.svg',
    hasHeadshot: false,
    layout: 'single',
    category: 'modern',
  },
  {
    id: '9',
    name: 'Azuril',
    thumbnail: '/images/onboarding/resume_thumb_3.svg',
    hasHeadshot: true,
    layout: 'single',
    category: 'creative',
  },
] as const;

export function findTemplateById(id: string): CvTemplate | undefined {
  return CV_TEMPLATES.find((t) => t.id === id);
}

export function filterTemplates(options?: {
  layout?: TemplateLayout;
  category?: TemplateCategory;
  hasHeadshot?: boolean;
}): CvTemplate[] {
  if (!options) return [...CV_TEMPLATES];

  return CV_TEMPLATES.filter((t) => {
    if (options.layout && t.layout !== options.layout) return false;
    if (options.category && t.category !== options.category) return false;
    if (options.hasHeadshot !== undefined && t.hasHeadshot !== options.hasHeadshot)
      return false;
    return true;
  });
}
