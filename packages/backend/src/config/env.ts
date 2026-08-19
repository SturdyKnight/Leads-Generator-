/**
 * Environment configuration for B-Matrix backend.
 *
 * In development, sensible defaults keep `npm run dev` working from a clean
 * checkout. In production every externally-supplied value is required, so a
 * misconfigured deploy fails at boot rather than at the first request.
 */

import { config } from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root .env. Ignored when the platform already supplies real env vars.
config({ path: path.resolve(__dirname, '../../../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api'),

  // Comma-separated list of allowed browser origins.
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: isProduction
    ? z.string().min(1, 'DATABASE_URL is required in production')
    : z.string().default('postgresql://postgres:password@localhost:5432/bmatrix'),

  GOOGLE_PLACES_API_KEY: isProduction
    ? z.string().min(1, 'GOOGLE_PLACES_API_KEY is required in production')
    : z.string().optional(),

  // Optional. Enables radius-limited search; without it, radius is ignored.
  GOOGLE_GEOCODING_API_KEY: z.string().optional(),

  // MiMo AI — all features degrade gracefully when not configured.
  MIMO_API_KEY: z.string().optional(),
  MIMO_BASE_URL: z.string().url().default('https://api.xiaomimimo.com/v1'),
  MIMO_MODEL: z.string().default('mimo-v2.5-pro'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(600),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${field}: ${messages?.join(', ')}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  // Geocoding falls back to the Places key when no dedicated key is set.
  geocodingKey: parsed.data.GOOGLE_GEOCODING_API_KEY || parsed.data.GOOGLE_PLACES_API_KEY,
};
