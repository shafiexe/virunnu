export function getAppUrl(): string {
  // VERCEL_PROJECT_PRODUCTION_URL is the stable production domain set automatically by Vercel
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // VERCEL_URL is deployment-specific (changes per deploy) — fallback for preview deploys
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
