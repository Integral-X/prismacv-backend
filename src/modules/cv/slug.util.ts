import { PrismaService } from '@/config/prisma.service';

export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'untitled';
}

export async function ensureUniqueSlug(
  prisma: PrismaService,
  userId: string,
  slug: string,
  excludeCvId?: string,
): Promise<string> {
  let candidate = slug;
  let suffix = 1;

  while (true) {
    const existing = await prisma.cv.findUnique({
      where: { userId_slug: { userId, slug: candidate } },
      select: { id: true },
    });

    if (!existing || existing.id === excludeCvId) {
      return candidate;
    }

    candidate = `${slug}-${suffix}`;
    suffix++;
  }
}
