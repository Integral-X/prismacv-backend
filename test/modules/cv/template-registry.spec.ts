import {
  CV_TEMPLATES,
  findTemplateById,
  filterTemplates,
} from '../../../src/modules/cv/templates/template-registry';

describe('Template Registry', () => {
  it('should contain 9 templates', () => {
    expect(CV_TEMPLATES).toHaveLength(9);
  });

  it('should have unique IDs', () => {
    const ids = CV_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe('findTemplateById', () => {
    it('should return a template by ID', () => {
      const template = findTemplateById('classic');
      expect(template).toBeDefined();
      expect(template!.id).toBe('classic');
      expect(template!.name).toBe('Classic');
    });

    it('should return undefined for non-existent ID', () => {
      expect(findTemplateById('nonexistent')).toBeUndefined();
    });
  });

  describe('filterTemplates', () => {
    it('should return all templates with no filters', () => {
      expect(filterTemplates()).toHaveLength(9);
    });

    it('should filter by layout', () => {
      const single = filterTemplates({ layout: 'single' });
      expect(single.every(t => t.layout === 'single')).toBe(true);
      expect(single.length).toBeGreaterThan(0);
    });

    it('should filter by category', () => {
      const modern = filterTemplates({ category: 'modern' });
      expect(modern.every(t => t.category === 'modern')).toBe(true);
      expect(modern.length).toBeGreaterThan(0);
    });

    it('should filter by hasHeadshot', () => {
      const withHeadshot = filterTemplates({ hasHeadshot: true });
      expect(withHeadshot.every(t => t.hasHeadshot === true)).toBe(true);
    });

    it('should combine multiple filters', () => {
      const result = filterTemplates({
        layout: 'single',
        category: 'professional',
      });
      expect(
        result.every(
          t => t.layout === 'single' && t.category === 'professional',
        ),
      ).toBe(true);
    });
  });
});
