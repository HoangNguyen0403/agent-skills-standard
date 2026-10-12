/**
 * Shared server-only site and origin helper.
 * Enforces explicit SITE_URL build origin input; prevents accidental fallback to fake production domains.
 */

export interface SiteConfig {
  readonly siteUrl: string;
  readonly isProductionApproved: boolean;
  readonly shouldIndex: boolean;
}

export function getSiteConfig(): SiteConfig {
  const envSiteUrl = process.env.SITE_URL?.trim();

  if (!envSiteUrl) {
    throw new Error(
      "Missing required SITE_URL environment variable. For local build and verification use: SITE_URL=http://127.0.0.1:4321",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(envSiteUrl);
  } catch {
    throw new Error(
      `Invalid SITE_URL environment variable: "${envSiteUrl}". Must be an absolute HTTP(S) origin.`,
    );
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      "Invalid SITE_URL environment variable. Set an HTTP(S) origin only, without credentials, path, query, or fragment.",
    );
  }

  const siteUrl = parsedUrl.origin;
  const deploymentMode = process.env.DEPLOYMENT_ENV?.trim() ?? "local";
  if (!["local", "preview", "production"].includes(deploymentMode)) {
    throw new Error(
      "Invalid DEPLOYMENT_ENV. Expected local, preview, or production.",
    );
  }

  const approvedSiteUrl = process.env.APPROVED_SITE_URL?.trim();
  let isApprovedOrigin = false;
  if (approvedSiteUrl) {
    let parsedApprovedUrl: URL;
    try {
      parsedApprovedUrl = new URL(approvedSiteUrl);
    } catch {
      throw new Error(
        "Invalid APPROVED_SITE_URL. It must be an absolute HTTPS origin approved by the site owner.",
      );
    }
    if (
      parsedApprovedUrl.protocol !== "https:" ||
      parsedApprovedUrl.username ||
      parsedApprovedUrl.password ||
      parsedApprovedUrl.pathname !== "/" ||
      parsedApprovedUrl.search ||
      parsedApprovedUrl.hash
    ) {
      throw new Error(
        "Invalid APPROVED_SITE_URL. It must be an HTTPS origin without credentials, path, query, or fragment.",
      );
    }
    isApprovedOrigin = parsedApprovedUrl.origin === siteUrl;
  }

  const isProductionApproved =
    deploymentMode === "production" &&
    parsedUrl.protocol === "https:" &&
    isApprovedOrigin;

  return {
    siteUrl,
    isProductionApproved,
    shouldIndex: isProductionApproved,
  };
}
