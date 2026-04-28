import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CvExportService {
  private readonly logger = new Logger(CvExportService.name);

  constructor(private readonly configService: ConfigService) {}

  async generatePdf(html: string): Promise<Buffer> {
    const executablePath = this.resolveChromePath();
    this.logger.debug(`Launching Chrome from: ${executablePath}`);

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private resolveChromePath(): string {
    const envPath = this.configService.get<string>('CHROME_EXECUTABLE_PATH');
    if (envPath) return envPath;

    // Common Chrome/Chromium paths by platform
    const paths: Record<string, string[]> = {
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      ],
      linux: [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
      ],
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ],
    };

    const platform = process.platform;
    const candidates = paths[platform] ?? paths.linux;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    throw new Error(
      `Chrome/Chromium not found. Set CHROME_EXECUTABLE_PATH env variable. Searched: ${candidates.join(', ')}`,
    );
  }
}
