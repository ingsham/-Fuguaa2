// Simple in-memory limiter. On Vercel each serverless instance has its own memory,
// so this is a speed bump, not a guarantee. For production, swap for Upstash Ratelimit.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length <= limit;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
