#!/usr/bin/env bun
/**
 * Tiny fetch-proxy server for the Raspberry Pi.
 * Fetches ShulCloud calendar pages on behalf of the GitHub Action,
 * using the Pi's residential IP (which is not blocked by ShulCloud's WAF).
 *
 * Usage:
 *   TOKEN=your-secret-token bun scripts/shulcloud-proxy-server.js
 *
 * Exposes: GET /?url=<encoded-shulcloud-url>
 *          Authorization: Bearer <TOKEN>
 */

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('TOKEN environment variable is required');
  process.exit(1);
}

const ALLOWED_ORIGIN = 'https://shomreitorah.shulcloud.com';

const server = Bun.serve({
  port: parseInt(process.env.PORT ?? '3847'),

  async fetch(req) {
    // Auth check
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    // Only proxy requests to ShulCloud
    if (!targetUrl.startsWith(ALLOWED_ORIGIN)) {
      return new Response('Only ShulCloud URLs are allowed', { status: 403 });
    }

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const html = await res.text();
      return new Response(html, {
        status: res.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch (err) {
      console.error('Fetch error:', err);
      return new Response(`Proxy fetch failed: ${err.message}`, { status: 502 });
    }
  },
});

console.log(`ShulCloud proxy listening on port ${server.port}`);
