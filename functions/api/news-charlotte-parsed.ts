/**
 * News endpoint - read-only KV cache layer.
 *
 * The cache-warmer Worker (workers/cache-warmer.ts) handles the heavy
 * processing (article fetch + LLM parse) and writes to KV on a cron schedule.
 * This Pages Function just reads from KV and returns the cached result.
 */

import type { Env } from '../_lib/env';

const CACHE_KEY = 'news:parsed';

export const onRequestGet: PagesFunction<Env> = async context => {
  try {
    const cached = await context.env.CACHE.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }
  } catch (e) {
    console.error('KV cache read error:', e);
  }

  // Cache miss - Worker hasn't populated yet or KV expired
  return new Response(JSON.stringify({ data: [], generatedAt: new Date().toISOString() }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
