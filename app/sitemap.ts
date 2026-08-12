import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const routes = ["", "/lessons", "/book", "/enquire", "/contact", "/privacy", "/terms", "/cancellation-policy"];
  return routes.map((route, index) => ({
    url: `${base}${route}`,
    changeFrequency: index < 5 ? "weekly" : "yearly",
    priority: index === 0 ? 1 : index < 5 ? 0.8 : 0.3,
  }));
}
