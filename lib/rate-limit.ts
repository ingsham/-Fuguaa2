// In-memory limiter. On Vercel each serverless instance has its own memory, so this is a speed bump,
// not a guarantee. For production traffic, swap for Upstash Ratelimit (same call shape).
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000, now = Date.now()): boolean {
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return recent.length <= limit;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
