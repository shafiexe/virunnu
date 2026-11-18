// The public address of the site, for links search engines and customers see (sitemap, share previews, messages).
// Unlike getAppUrl() it never follows a preview deployment, so those links always name the real site.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://virunnu.in").replace(/\/$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
