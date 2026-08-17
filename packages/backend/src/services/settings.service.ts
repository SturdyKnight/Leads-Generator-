/**
 * Settings — a flat key/value store.
 *
 * Only known keys are persisted. Previously the whole request body was written
 * verbatim, so a client that nested its payload created a single row named
 * "settings" that could never be read back into the form.
 */

import { prisma } from '../config/database.js';

export const SETTINGS_DEFAULTS = {
  companyName: '',
  timezone: 'UTC',
  defaultCountry: 'IN',
  defaultMaxResults: 100,
} as const;

export type SettingsKey = keyof typeof SETTINGS_DEFAULTS;
export type Settings = { [K in SettingsKey]: (typeof SETTINGS_DEFAULTS)[K] };

const KNOWN_KEYS = new Set(Object.keys(SETTINGS_DEFAULTS));

export class SettingsService {
  async getAll(): Promise<Settings> {
    const rows = await prisma.settings.findMany();
    const stored = Object.fromEntries(
      rows.filter((row) => KNOWN_KEYS.has(row.key)).map((row) => [row.key, parse(row.value)]),
    );

    return { ...SETTINGS_DEFAULTS, ...stored };
  }

  async updateAll(input: Partial<Settings>): Promise<Settings> {
    const entries = Object.entries(input).filter(([key]) => KNOWN_KEYS.has(key));

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        }),
      ),
    );

    return this.getAll();
  }
}

function parse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const settingsService = new SettingsService();
