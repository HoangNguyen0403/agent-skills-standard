import type { MetadataRoute } from "next";
import { getSiteConfig } from "./site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getSiteConfig();

  return [
    {
      url: `${siteUrl}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
