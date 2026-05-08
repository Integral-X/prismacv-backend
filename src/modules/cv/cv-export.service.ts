import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer-core';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { MetricsService } from '@/modules/metrics/metrics.service';

@Injectable()
export class CvExportService {
  private readonly logger = new Logger(CvExportService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  async generatePdf(html: string): Promise<Buffer> {
    const startedAt = Date.now();
    const executablePath = this.resolveChromePath();
    this.logger.debug(`Launching Chrome from: ${executablePath}`);
    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      });

      this.metricsService.recordPdfExport({
        status: 'success',
        durationMs: Date.now() - startedAt,
      });
      return Buffer.from(pdf);
    } catch (error) {
      this.metricsService.recordPdfExport({
        status: 'error',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
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

    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }

    throw new Error(
      `Chrome/Chromium not found. Set CHROME_EXECUTABLE_PATH env variable. Searched: ${candidates.join(', ')}`,
    );
  }
}
