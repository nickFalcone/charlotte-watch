import type { Page } from '@playwright/test';

// ─── Empty baseline responses ──────────────────────────────────────────────

const EMPTY_NWS_ALERTS = { features: [] };
const EMPTY_TRANSIT_VEHICLES = { header: { gtfsRealtimeVersion: '2.0' }, entity: [] };
const EMPTY_TWEETS = { data: [] };
const EMPTY_DUKE = { data: [] };
// Minimal FAA XML with no delay programs — parseFAAStatusXML returns delay_types: []
const EMPTY_FAA_XML =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<AIRPORT_STATUS_INFORMATION>' +
  '<Update_Time>Apr 12 at 12:00 GMT</Update_Time>' +
  '</AIRPORT_STATUS_INFORMATION>';

// ─── Typed overrides ───────────────────────────────────────────────────────

export interface MockOverrides {
  /** NWS /alerts/active/zone/NCZ071 response */
  nwsAlerts?: object;
  /** /api/news-charlotte-parsed response */
  news?: object;
  /** /api/summarize-alerts response (default: 404 — not called when 0 alerts) */
  alertSummary?: object | null;
}

// ─── One-alert NWS fixture ─────────────────────────────────────────────────

export const ONE_NWS_HEAT_ADVISORY = {
  features: [
    {
      id: 'https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.e2e-heat-001',
      properties: {
        event: 'Heat Advisory',
        headline: 'Heat Advisory issued for Mecklenburg County until 8 PM EDT',
        description: 'A heat advisory is in effect from noon today until 8 PM EDT this evening.',
        instruction: 'Drink plenty of fluids and stay in air-conditioned spaces.',
        severity: 'Moderate',
        urgency: 'Expected',
        certainty: 'Likely',
        status: 'Actual',
        messageType: 'Alert',
        areaDesc: 'Mecklenburg',
        effective: '2026-04-12T12:00:00-04:00',
        expires: '2026-04-12T20:00:00-04:00',
        onset: '2026-04-12T12:00:00-04:00',
      },
    },
  ],
};

// ─── News fixtures ─────────────────────────────────────────────────────────

export const NEWS_WITH_URL_SAFETY_CASES = {
  data: [
    {
      event_key: 'e2e-safe-link',
      category: 'local',
      urgency: 5,
      text: 'Safe Link Event',
      sources: [
        {
          link: 'https://example.com/safe-article',
          source_name: 'Example News',
          published_datetime_utc: '2026-04-12T10:00:00Z',
          title: 'Safe Article',
          article_id: 'safe-001',
          snippet: 'This is a safe news snippet.',
        },
      ],
    },
    {
      event_key: 'e2e-unsafe-link',
      category: 'local',
      urgency: 3,
      text: 'Unsafe Link Event',
      sources: [
        {
          link: 'javascript:alert("xss")',
          source_name: 'Suspicious Source',
          published_datetime_utc: '2026-04-12T09:00:00Z',
          title: 'Unsafe Article',
          article_id: 'unsafe-001',
          snippet: 'This source has an unsafe URL.',
        },
      ],
    },
  ],
  generatedAt: '2026-04-12T10:00:00Z',
};

// ─── Main route-mock function ──────────────────────────────────────────────

/**
 * Register Playwright route interceptors for all external APIs used by the
 * default visible widgets (Alerts, News, Transit). Pass overrides to inject
 * specific fixture data for focused tests.
 *
 * Must be called before page.goto().
 */
export async function mockApiRoutes(page: Page, overrides: MockOverrides = {}): Promise<void> {
  // ── Map tiles (abort to avoid slow CDN requests) ──
  await page.route('**/basemaps.cartocdn.com/**', route => route.abort());

  // ── NWS weather alerts ──
  await page.route('**/api.weather.gov/**', route =>
    route.fulfill({ json: overrides.nwsAlerts ?? EMPTY_NWS_ALERTS })
  );

  // ── NCDOT traffic incidents ──
  // Returns a plain JSON array of incident objects
  await page.route('**/eapps.ncdot.gov/**', route => route.fulfill({ json: [] }));

  // ── FAA airport status (XML response) ──
  await page.route('**/proxy/faa/**', route =>
    route.fulfill({ contentType: 'text/xml; charset=utf-8', body: EMPTY_FAA_XML })
  );

  // ── Duke Energy outages ──
  await page.route('**/proxy/duke/**', route => route.fulfill({ json: EMPTY_DUKE }));

  // ── CATS service alerts (Twitter/X feed) ──
  await page.route('**/api/cats-twitter', route => route.fulfill({ json: EMPTY_TWEETS }));

  // ── CMPD traffic events ──
  await page.route('**/cmpdinfo.charlottenc.gov/**', route => route.fulfill({ json: [] }));

  // ── CMS school alerts ──
  await page.route('**/api/cms-twitter', route => route.fulfill({ json: EMPTY_TWEETS }));

  // ── CFD fire incidents ──
  await page.route('**/api/cfd-twitter', route => route.fulfill({ json: EMPTY_TWEETS }));

  // ── HERE traffic flow ──
  await page.route('**/proxy/here/**', route => route.fulfill({ json: { results: [] } }));

  // ── AI alert summary ──
  // Return 404 by default; only called when alerts exist (enabled: alerts.length > 0)
  if (overrides.alertSummary !== undefined && overrides.alertSummary !== null) {
    await page.route('**/api/summarize-alerts', route =>
      route.fulfill({ json: overrides.alertSummary! })
    );
  } else {
    await page.route('**/api/summarize-alerts', route =>
      route.fulfill({ status: 404, json: { error: 'Not found' } })
    );
  }

  // ── Charlotte news ──
  await page.route('**/api/news-charlotte-parsed', route =>
    route.fulfill({
      json: overrides.news ?? { data: [], generatedAt: '2026-04-12T12:00:00Z' },
    })
  );

  // ── LYNX transit vehicle positions ──
  await page.route('**/proxy/cats/**', route => route.fulfill({ json: EMPTY_TRANSIT_VEHICLES }));
}
