import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { BLUF_SYSTEM_PROMPT } from './src/utils/aiPrompts';

// Charlotte, NC coordinates and ~30 mile radius
const CHARLOTTE_LAT = 35.2271;
const CHARLOTTE_LNG = -80.8431;
const LAT_RADIUS = 0.44;
const LNG_RADIUS = 0.53;

interface DukeOutageListItem {
  sourceEventNumber: string;
  deviceLatitudeLocation: number;
  deviceLongitudeLocation: number;
}

interface DukeOutageDetail {
  sourceEventNumber: string;
  deviceLatitudeLocation: number;
  deviceLongitudeLocation: number;
  customersAffectedNumber?: number | string;
  customersAffectedSum?: number;
  estimatedRestorationTime?: string;
  crewStatTxt?: string;
  operationCenterName?: string;
  causeDescription?: string;
  outageCause?: string;
  convexHull?: { lat: number; lng: number }[] | null;
}

function isWithinCharlotteRadius(lat: number, lng: number): boolean {
  return Math.abs(lat - CHARLOTTE_LAT) <= LAT_RADIUS && Math.abs(lng - CHARLOTTE_LNG) <= LNG_RADIUS;
}

// Dev-only plugin to handle Duke outage enrichment
function dukeOutagePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'duke-outage-enrichment',
    configureServer(server) {
      server.middlewares.use('/proxy/duke/outage-maps/v1/outages', async (req, res, next) => {
        // Only handle the list endpoint, not detail requests
        if (req.url?.includes('sourceEventNumber')) {
          return next();
        }

        const dukeAuth = env.DUKE_OUTAGE_AUTH;
        console.log('[duke-outage-enrichment] Auth configured:', !!dukeAuth);
        if (!dukeAuth) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Duke Energy API configuration missing' }));
          return;
        }

        const headers: Record<string, string> = {
          Accept: 'application/json',
          Authorization: dukeAuth,
        };

        try {
          // Step 1: Fetch list of all outages
          const listUrl =
            'https://prod.apigee.duke-energy.app/outage-maps/v1/outages?jurisdiction=DEC';
          console.log('[duke-outage-enrichment] Fetching list from:', listUrl);
          const listResponse = await fetch(listUrl, { method: 'GET', headers });
          console.log('[duke-outage-enrichment] List response status:', listResponse.status);

          if (!listResponse.ok) {
            res.statusCode = listResponse.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to fetch outage list' }));
            return;
          }

          const listJson = (await listResponse.json()) as
            | { data?: DukeOutageListItem[] }
            | DukeOutageListItem[];
          // API may return { data: [...] } or raw array
          const listData = Array.isArray(listJson) ? listJson : listJson.data || [];

          // Step 2: Filter to outages within ~30 miles of Charlotte
          const nearbyOutages = listData.filter(outage =>
            isWithinCharlotteRadius(outage.deviceLatitudeLocation, outage.deviceLongitudeLocation)
          );

          if (nearbyOutages.length === 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ data: [], errorMessages: [] }));
            return;
          }

          // Step 3: Fetch details for each nearby outage in parallel
          const detailPromises = nearbyOutages.map(async outage => {
            try {
              const detailUrl = `https://prod.apigee.duke-energy.app/outage-maps/v1/outages/outage?jurisdiction=DEC&sourceEventNumber=${outage.sourceEventNumber}`;
              const detailResponse = await fetch(detailUrl, { method: 'GET', headers });

              if (!detailResponse.ok) {
                return outage;
              }

              const detailJson = (await detailResponse.json()) as { data: DukeOutageDetail };
              return detailJson.data;
            } catch {
              return outage;
            }
          });

          const enrichedOutages = await Promise.all(detailPromises);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: enrichedOutages, errorMessages: [] }));
        } catch (error) {
          console.error('[duke-outage-enrichment] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Failed to fetch Duke Energy outages',
              message: error instanceof Error ? error.message : String(error),
            })
          );
        }
      });
    },
  };
}

// Dev-only plugin to handle AI summarization without Netlify CLI
function aiSummarizationPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'ai-summarization',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/summarize-alerts', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const provider = env.AI_PROVIDER || 'openai';
        const apiKey = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `${provider.toUpperCase()} API key not configured` }));
          return;
        }

        // Read request body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        let requestData: {
          alerts: Array<{ severity: string; source: string; title: string; summary: string }>;
          hash: string;
        };
        try {
          requestData = JSON.parse(body);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const alerts = requestData.alerts || [];
        const userPrompt =
          alerts.length === 0
            ? 'No active alerts.'
            : `Current alerts (${alerts.length} total):\n${alerts
                .map(
                  (a, i) =>
                    `${i + 1}. [${a.severity.toUpperCase()}] ${a.source.toUpperCase()}: ${a.title} - ${a.summary}`
                )
                .join('\n')}`;

        try {
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: BLUF_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 150,
              temperature: 0.3,
            }),
          });

          if (!openAIResponse.ok) {
            const errorText = await openAIResponse.text();
            throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
          }

          const openAIData = await openAIResponse.json();
          const summary =
            openAIData.choices?.[0]?.message?.content?.trim() || 'Unable to generate summary.';

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              summary,
              hash: requestData.hash,
              generatedAt: new Date().toISOString(),
            })
          );
        } catch (error) {
          console.error('[ai-summarization] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Failed to generate summary',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env vars (including non-VITE_ prefixed ones for proxy config)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), aiSummarizationPlugin(env), dukeOutagePlugin(env)],
    server: {
      proxy: {
        // Order matters - more specific paths first
        '/proxy/opensky-auth': {
          target: 'https://auth.opensky-network.org',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/opensky-auth/, ''),
          configure: proxy => {
            // Inject OAuth credentials server-side - never expose in client bundle
            proxy.on('proxyReq', (proxyReq, req) => {
              const clientId = env.OPENSKY_CLIENT_ID;
              const clientSecret = env.OPENSKY_CLIENT_SECRET;

              if (clientId && clientSecret && req.method === 'POST') {
                // Build the OAuth2 client_credentials request body
                const body = new URLSearchParams({
                  grant_type: 'client_credentials',
                  client_id: clientId,
                  client_secret: clientSecret,
                }).toString();

                // Set proper headers for form submission
                proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(body));

                // Write the body with credentials
                proxyReq.write(body);
              }
            });
          },
        },
        '/proxy/opensky': {
          target: 'https://opensky-network.org',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/opensky/, ''),
        },
        '/proxy/faa': {
          target: 'https://nasstatus.faa.gov',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/faa/, ''),
        },
        '/proxy/duke': {
          target: 'https://prod.apigee.duke-energy.app',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/duke/, ''),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (env.DUKE_OUTAGE_AUTH) {
                proxyReq.setHeader('Authorization', env.DUKE_OUTAGE_AUTH);
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
        '/proxy/cats': {
          target: 'https://transit.land',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/cats/, ''),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (env.TRANSIT_LAND_API_KEY) {
                proxyReq.setHeader('apikey', env.TRANSIT_LAND_API_KEY);
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
        '/proxy/finnhub': {
          target: 'https://finnhub.io',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/finnhub/, ''),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (env.FINNHUB_API_KEY) {
                proxyReq.setHeader('X-Finnhub-Token', env.FINNHUB_API_KEY);
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
        // HERE Traffic API proxy
        '/proxy/here': {
          target: 'https://data.traffic.hereapi.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy\/here/, ''),
          configure: proxy => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Inject API key as query parameter. Use rewritten path (/v7/flow)
              // since url.pathname still contains /proxy/here prefix.
              if (env.HERE_API_KEY && req.url) {
                const url = new URL(req.url, 'http://localhost');
                url.searchParams.set('apiKey', env.HERE_API_KEY);
                const path = url.pathname.replace(/^\/proxy\/here/, '') || '/v7/flow';
                proxyReq.path = path + url.search;
              }
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
      },
    },
  };
});
