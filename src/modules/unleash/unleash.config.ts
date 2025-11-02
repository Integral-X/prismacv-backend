import { registerAs } from '@nestjs/config';

export default registerAs('unleash', () => ({
  // Full Unleash API URL for server-side client (should end with /api/)
  url: process.env.UNLEASH_URL || 'http://localhost:4242/api/',
  appName: process.env.UNLEASH_APP_NAME || 'prismacv-api',
  apiToken: process.env.UNLEASH_API_TOKEN,
  environment: process.env.NODE_ENV || 'development',
  // Mock mode for development when no real Unleash server
  mock:
    process.env.NODE_ENV === 'development' && !process.env.UNLEASH_API_TOKEN,
  refreshInterval: parseInt(
    process.env.UNLEASH_REFRESH_INTERVAL || '15000',
    10,
  ),
  metricsInterval: parseInt(
    process.env.UNLEASH_METRICS_INTERVAL || '60000',
    10,
  ),
}));
