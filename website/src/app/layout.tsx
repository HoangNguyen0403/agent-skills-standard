import type { Metadata } from "next";
import React from "react";
import localFont from "next/font/local";
import "./globals.css";
import { getSiteConfig } from "./site";

const spaceGrotesk = localFont({
  src: [
    {
      path: "../fonts/space-grotesk-600.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--ags-font-heading",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const sourceSans3 = localFont({
  src: [
    {
      path: "../fonts/source-sans-3-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/source-sans-3-600.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--ags-font-body",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});

const ibmPlexMono = localFont({
  src: [
    {
      path: "../fonts/ibm-plex-mono-400.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--ags-font-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});

export function generateMetadata(): Metadata {
  const { siteUrl, shouldIndex } = getSiteConfig();

  return {
    metadataBase: new URL(siteUrl),
    title: "Agent Skills Standard — Portable Standards for Coding Agents",
    description:
      "Portable, versioned coding standards and SDLC workflows for the AI tools you already use. Sync once. Load the relevant skills when you work.",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: "Agent Skills Standard — Portable Standards for Coding Agents",
      description:
        "Portable, versioned coding standards and SDLC workflows for the AI tools you already use. Sync once. Load the relevant skills when you work.",
      url: siteUrl,
      siteName: "Agent Skills Standard",
      images: [
        {
          url: "/og/agent-skills-standard.png",
          width: 1200,
          height: 630,
          alt: "Agent Skills Standard social share design",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Agent Skills Standard — Portable Standards for Coding Agents",
      description:
        "Portable, versioned coding standards and SDLC workflows for the AI tools you already use.",
      images: ["/og/agent-skills-standard.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.png", sizes: "32x32", type: "image/png" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
    },
    robots: {
      index: shouldIndex,
      follow: shouldIndex,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${sourceSans3.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
