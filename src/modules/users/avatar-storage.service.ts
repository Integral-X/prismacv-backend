import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class AvatarStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

  async save(userId: string, file: Express.Multer.File): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });

    // Delete any existing avatar for this user
    await this.deleteExisting(userId);

    const ext = this.getExtension(file.mimetype);
    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `${userId}-${hash}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    await fs.writeFile(filepath, file.buffer);

    return `/uploads/avatars/${filename}`;
  }

  async delete(userId: string): Promise<void> {
    await this.deleteExisting(userId);
  }

  private async deleteExisting(userId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const existing = files.filter(f => f.startsWith(`${userId}-`));
      await Promise.all(
        existing.map(f => fs.unlink(path.join(this.uploadDir, f))),
      );
    } catch (err: any) {
      if (err?.code === 'ENOENT') return; // directory doesn't exist yet
      throw err;
    }
  }

  private getExtension(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return map[mimetype] ?? '.bin';
  }
}
