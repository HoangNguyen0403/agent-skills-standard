import type { MetadataRoute } from "next";
import { getSiteConfig } from "./site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl, shouldIndex } = getSiteConfig();

  return {
    rules: {
      userAgent: "*",
      ...(shouldIndex ? { allow: "/" } : { disallow: "/" }),
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
