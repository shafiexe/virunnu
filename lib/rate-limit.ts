// Best-effort per-instance limiter. On serverless each instance has its own memory, so this only
// slows casual abuse; it is not a hard guarantee.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return false;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

// For sign-in: only FAILED attempts count, so normal use is never slowed, but guessing a password is.
const failures = new Map<string, number[]>();
const recent = (key: string, windowMs: number) => { const now = Date.now(); const r = (failures.get(key) ?? []).filter((t) => now - t < windowMs); failures.set(key, r); return r; };
export const tooManyFailures = (key: string, max: number, windowMs: number) => recent(key, windowMs).length >= max;
export const recordFailure = (key: string, windowMs: number) => { const r = recent(key, windowMs); r.push(Date.now()); failures.set(key, r); if (failures.size > 5000) for (const [k, v] of failures) if (v.every((t) => Date.now() - t >= windowMs)) failures.delete(k); };
export const clearFailures = (key: string) => { failures.delete(key); };

export const TOO_MANY = { error: "Too many attempts. Please wait a few minutes and try again." };
