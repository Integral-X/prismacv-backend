/**
 * Builds an HTML document from CV data for PDF rendering via Puppeteer.
 * Each template ID gets a slightly different visual layout.
 */

interface CvPdfData {
  title: string;
  templateId: string | null;
  personalInfo: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    website: string | null;
    linkedinUrl: string | null;
    summary: string | null;
  } | null;
  experiences: {
    company: string;
    title: string;
    location: string | null;
    startDate: Date;
    endDate: Date | null;
    current: boolean;
    description: string | null;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string | null;
    startDate: Date;
    endDate: Date | null;
    gpa: string | null;
  }[];
  skills: {
    name: string;
    level: string;
    category: string | null;
  }[];
  certifications: {
    name: string;
    issuer: string | null;
    issueDate: Date | null;
    expiryDate: Date | null;
    credentialUrl: string | null;
  }[];
  projects: {
    name: string;
    description: string | null;
    url: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }[];
  languages: {
    name: string;
    proficiency: string;
  }[];
  customSections: {
    title: string;
    entries: unknown;
  }[];
}

function esc(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function dateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  current?: boolean,
): string {
  const s = fmtDate(start);
  const e = current ? 'Present' : fmtDate(end);
  if (!s && !e) return '';
  return `${s} – ${e}`;
}

export function buildCvHtml(cv: CvPdfData): string {
  const pi = cv.personalInfo;
  const accentColor = getAccentColor(cv.templateId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.45; color: #222; }
  h1 { font-size: 22pt; color: ${accentColor}; margin-bottom: 2pt; }
  h2 { font-size: 12pt; color: ${accentColor}; border-bottom: 1.5px solid ${accentColor}; padding-bottom: 3pt; margin: 14pt 0 8pt; text-transform: uppercase; letter-spacing: 0.5pt; }
  h3 { font-size: 10.5pt; font-weight: 600; margin-bottom: 1pt; }
  .contact { font-size: 9pt; color: #555; margin-bottom: 4pt; }
  .contact span { margin-right: 10pt; }
  .summary { font-size: 10pt; color: #333; margin: 8pt 0 4pt; }
  .entry { margin-bottom: 10pt; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
  .entry-header .right { font-size: 9pt; color: #666; white-space: nowrap; }
  .entry-sub { font-size: 9pt; color: #555; margin-bottom: 2pt; }
  .entry-desc { font-size: 9.5pt; color: #333; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 4pt 16pt; }
  .skill-item { font-size: 9.5pt; }
  .skill-level { color: #888; font-size: 8.5pt; }
  .lang-item { display: inline-block; margin-right: 18pt; font-size: 9.5pt; }
  .lang-prof { color: #888; font-size: 8.5pt; }
  .custom-entries { font-size: 9.5pt; color: #333; }
  a { color: ${accentColor}; text-decoration: none; }
</style>
</head>
<body>
${buildHeader(pi)}
${buildSection('Experience', cv.experiences, buildExperience)}
${buildSection('Education', cv.education, buildEducation)}
${buildSkillsSection(cv.skills)}
${buildSection('Certifications', cv.certifications, buildCertification)}
${buildSection('Projects', cv.projects, buildProject)}
${buildLanguagesSection(cv.languages)}
${buildCustomSections(cv.customSections)}
</body>
</html>`;
}

function getAccentColor(templateId: string | null): string {
  const colors: Record<string, string> = {
    '1': '#1a5276',
    '2': '#2e86c1',
    '3': '#8e44ad',
    '4': '#1a5276',
    '5': '#2e86c1',
    '6': '#8e44ad',
    '7': '#1a5276',
    '8': '#2e86c1',
    '9': '#8e44ad',
  };
  return colors[templateId ?? ''] ?? '#1a5276';
}

function buildHeader(pi: CvPdfData['personalInfo']): string {
  if (!pi) return '';
  const parts: string[] = [];
  if (pi.email) parts.push(`<span>${esc(pi.email)}</span>`);
  if (pi.phone) parts.push(`<span>${esc(pi.phone)}</span>`);
  if (pi.location) parts.push(`<span>${esc(pi.location)}</span>`);
  if (pi.website)
    parts.push(`<span><a href="${esc(pi.website)}">${esc(pi.website)}</a></span>`);
  if (pi.linkedinUrl)
    parts.push(
      `<span><a href="${esc(pi.linkedinUrl)}">LinkedIn</a></span>`,
    );

  return `
<h1>${esc(pi.fullName)}</h1>
<div class="contact">${parts.join('')}</div>
${pi.summary ? `<div class="summary">${esc(pi.summary)}</div>` : ''}`;
}

function buildSection<T>(
  title: string,
  items: T[],
  renderFn: (item: T) => string,
): string {
  if (!items.length) return '';
  return `<h2>${title}</h2>\n${items.map(renderFn).join('\n')}`;
}

function buildExperience(exp: CvPdfData['experiences'][0]): string {
  return `<div class="entry">
  <div class="entry-header"><h3>${esc(exp.title)}</h3><span class="right">${dateRange(exp.startDate, exp.endDate, exp.current)}</span></div>
  <div class="entry-sub">${esc(exp.company)}${exp.location ? ` · ${esc(exp.location)}` : ''}</div>
  ${exp.description ? `<div class="entry-desc">${esc(exp.description)}</div>` : ''}
</div>`;
}

function buildEducation(edu: CvPdfData['education'][0]): string {
  const degree = [edu.degree, edu.field].filter(Boolean).join(' in ');
  return `<div class="entry">
  <div class="entry-header"><h3>${esc(edu.institution)}</h3><span class="right">${dateRange(edu.startDate, edu.endDate)}</span></div>
  <div class="entry-sub">${esc(degree)}${edu.gpa ? ` — GPA: ${esc(edu.gpa)}` : ''}</div>
</div>`;
}

function buildSkillsSection(skills: CvPdfData['skills']): string {
  if (!skills.length) return '';
  const items = skills
    .map(
      (s) =>
        `<div class="skill-item">${esc(s.name)} <span class="skill-level">${esc(s.level)}</span></div>`,
    )
    .join('\n');
  return `<h2>Skills</h2>\n<div class="skills-grid">${items}</div>`;
}

function buildCertification(cert: CvPdfData['certifications'][0]): string {
  const link = cert.credentialUrl
    ? ` <a href="${esc(cert.credentialUrl)}">[link]</a>`
    : '';
  return `<div class="entry">
  <div class="entry-header"><h3>${esc(cert.name)}${link}</h3><span class="right">${fmtDate(cert.issueDate)}</span></div>
  ${cert.issuer ? `<div class="entry-sub">${esc(cert.issuer)}</div>` : ''}
</div>`;
}

function buildProject(proj: CvPdfData['projects'][0]): string {
  const link = proj.url
    ? ` <a href="${esc(proj.url)}">[link]</a>`
    : '';
  return `<div class="entry">
  <div class="entry-header"><h3>${esc(proj.name)}${link}</h3><span class="right">${dateRange(proj.startDate, proj.endDate)}</span></div>
  ${proj.description ? `<div class="entry-desc">${esc(proj.description)}</div>` : ''}
</div>`;
}

function buildLanguagesSection(langs: CvPdfData['languages']): string {
  if (!langs.length) return '';
  const items = langs
    .map(
      (l) =>
        `<span class="lang-item">${esc(l.name)} <span class="lang-prof">${esc(l.proficiency)}</span></span>`,
    )
    .join('\n');
  return `<h2>Languages</h2>\n<div>${items}</div>`;
}

function buildCustomSections(sections: CvPdfData['customSections']): string {
  if (!sections.length) return '';
  return sections
    .map((s) => {
      const entries = Array.isArray(s.entries)
        ? (s.entries as Record<string, unknown>[])
            .map((e) => {
              const vals = Object.values(e)
                .filter(Boolean)
                .map((v) => esc(String(v)));
              return `<div class="entry-desc">${vals.join(' · ')}</div>`;
            })
            .join('\n')
        : '';
      return `<h2>${esc(s.title)}</h2>\n<div class="custom-entries">${entries}</div>`;
    })
    .join('\n');
}
