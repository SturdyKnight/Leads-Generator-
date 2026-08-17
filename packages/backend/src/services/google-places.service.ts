/**
 * Google Places API (New) client — places.googleapis.com/v1.
 *
 * Two-tier by design: an ID-only text search to discover what exists (cheap),
 * then a details fetch for the subset that is genuinely new (expensive).
 * Field masks are the cost lever, so they are declared once and never widened
 * casually — but they MUST include `nextPageToken`, or pagination silently
 * stops after the first page of 20 results.
 */

import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  locality: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
}

export interface PlaceIdResult {
  placeId: string;
  name: string;
}

export interface LocationBias {
  lat: number;
  lng: number;
  radiusMeters: number;
}

const BASE_URL = 'https://places.googleapis.com/v1';

const ID_ONLY_FIELDS = 'nextPageToken,places.id,places.displayName';
const DETAIL_FIELDS =
  'id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,websiteUri,rating,userRatingCount,types';

const MAX_PAGES = 3;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;
const ENRICH_DELAY_MS = 60;
const ENRICH_CONCURRENCY = 4;

/** Place types that carry no signal — every business has them. */
const NOISE_TYPES = new Set(['point_of_interest', 'establishment']);

export class GooglePlacesService {
  private get apiKey(): string | undefined {
    return env.GOOGLE_PLACES_API_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Stage 1 — paginated ID-only text search. Returns up to MAX_PAGES * 20 results.
   */
  async searchTextIdsOnly(query: string, locationBias?: LocationBias): Promise<PlaceIdResult[]> {
    this.assertConfigured();

    const results: PlaceIdResult[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const body: Record<string, unknown> = { textQuery: query, maxResultCount: 20 };

      if (pageToken) body.pageToken = pageToken;
      if (locationBias) {
        body.locationBias = {
          circle: {
            center: { latitude: locationBias.lat, longitude: locationBias.lng },
            radius: locationBias.radiusMeters,
          },
        };
      }

      const data = await this.request('/places:searchText', ID_ONLY_FIELDS, body);

      for (const place of data.places ?? []) {
        results.push({ placeId: place.id, name: place.displayName?.text ?? '' });
      }

      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }

    logger.debug(`Places search "${query}" returned ${results.length} ids`);
    return results;
  }

  /**
   * Stage 2 — full details for new place ids, fetched in small concurrent batches.
   * A single failed lookup is logged and skipped; it must not abort the batch.
   */
  async enrichPlaceIds(placeIds: string[]): Promise<Map<string, PlaceResult>> {
    this.assertConfigured();

    const enriched = new Map<string, PlaceResult>();

    for (let i = 0; i < placeIds.length; i += ENRICH_CONCURRENCY) {
      const batch = placeIds.slice(i, i + ENRICH_CONCURRENCY);

      const settled = await Promise.allSettled(
        batch.map((placeId) => this.getPlaceDetails(placeId)),
      );

      settled.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled' && outcome.value) {
          enriched.set(batch[index], outcome.value);
        } else if (outcome.status === 'rejected') {
          logger.warn(`Place details failed for ${batch[index]}`, { error: String(outcome.reason) });
        }
      });

      if (i + ENRICH_CONCURRENCY < placeIds.length) await delay(ENRICH_DELAY_MS);
    }

    logger.debug(`Enriched ${enriched.size}/${placeIds.length} places`);
    return enriched;
  }

  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    const data = await this.request(`/places/${placeId}`, DETAIL_FIELDS);
    return data ? mapPlace(data) : null;
  }

  /**
   * Resolve a free-text location to coordinates. Returns null when geocoding is
   * unavailable or the address is unknown — callers treat radius as optional.
   */
  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    const key = env.geocodingKey;
    if (!key || !address) return null;

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status !== 'OK') {
        logger.warn(`Geocoding for "${address}" returned ${data.status}`, {
          detail: data.error_message,
        });
        return null;
      }

      const location = data.results?.[0]?.geometry?.location;
      return location ? { lat: location.lat, lng: location.lng } : null;
    } catch (error) {
      logger.warn(`Geocoding for "${address}" failed`, { error: String(error) });
      return null;
    }
  }

  /**
   * Issue a request, retrying only on rate limits and server errors. A 4xx is a
   * caller mistake and is thrown immediately — retrying it just burns quota.
   */
  private async request(
    path: string,
    fieldMask: string,
    body?: Record<string, unknown>,
  ): Promise<any> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${BASE_URL}${path}`, {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey!,
            'X-Goog-FieldMask': fieldMask,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`Places API responded ${response.status}`);
          await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
          continue;
        }

        if (!response.ok) {
          const detail = await response.text();
          throw new ExternalServiceError(
            `Places API rejected the request (${response.status}): ${truncate(detail)}`,
          );
        }

        void this.trackUsage(path);
        return await response.json();
      } catch (error) {
        if (error instanceof ExternalServiceError) throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
      }
    }

    throw new ExternalServiceError(
      `Places API unreachable after ${MAX_RETRIES} attempts: ${lastError?.message ?? 'unknown error'}`,
    );
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new ExternalServiceError(
        'GOOGLE_PLACES_API_KEY is not configured — discovery cannot run.',
      );
    }
  }

  /** Best-effort daily call counter. Never allowed to fail a request. */
  private async trackUsage(path: string): Promise<void> {
    const method = path.includes('searchText') ? 'searchText' : 'getPlaceDetails';
    const date = new Date().toISOString().slice(0, 10);

    try {
      await prisma.googleApiUsage.upsert({
        where: { method_date: { method, date } },
        update: { callCount: { increment: 1 } },
        create: { method, date, callCount: 1 },
      });
    } catch (error) {
      logger.debug('API usage tracking failed', { error: String(error) });
    }
  }
}

function mapPlace(place: any): PlaceResult {
  const components: any[] = place.addressComponents ?? [];
  const component = (type: string) =>
    components.find((c) => c.types?.includes(type))?.longText ?? null;

  return {
    placeId: place.id,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    city: component('locality') ?? component('administrative_area_level_2'),
    state: component('administrative_area_level_1'),
    country: component('country'),
    locality: component('sublocality') ?? component('neighborhood'),
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    categories: (place.types ?? []).filter((t: string) => !NOISE_TYPES.has(t)),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export const googlePlacesService = new GooglePlacesService();
