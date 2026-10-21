import type { MetadataRoute } from "next";
import { getSiteConfig } from "./site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getSiteConfig();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date("2026-10-07"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
