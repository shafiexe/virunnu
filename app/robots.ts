import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/owner", "/caterer", "/api/", "/apply/"],
      },
    ],
    sitemap: "https://virunnu.com/sitemap.xml",
  };
}
