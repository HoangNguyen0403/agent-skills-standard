import fs from "fs-extra";
import path from "path";
import type { SkillRecord, VersionClaim } from "./types";

/** Regex per upstream name; group 1 is the version. Order matters: longer product names first. */
export const CLAIM_ALIASES: Record<
  string,
  { pattern: RegExp; significance: "major" | "minor" }
> = {
  "react-native": { pattern: /React Native\s+v?(\d+\.\d+)/g, significance: "minor" },
  "spring-boot": { pattern: /Spring Boot\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  next: { pattern: /Next\.js\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  react: { pattern: /React\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  angular: { pattern: /Angular\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  nestjs: { pattern: /NestJS\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  node: { pattern: /Node(?:\.js)?\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  typescript: { pattern: /TypeScript\s+v?(\d+\.\d+)/g, significance: "minor" },
  flutter: { pattern: /Flutter\s+v?(\d+\.\d+)/g, significance: "minor" },
  dart: { pattern: /Dart\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  go: { pattern: /Go\s+(\d+\.\d+)/g, significance: "minor" },
  python: { pattern: /Python\s+(\d+\.\d+)/g, significance: "minor" },
  php: { pattern: /PHP\s+(\d+(?:\.\d+)?)/g, significance: "minor" },
  laravel: { pattern: /Laravel\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
  kotlin: { pattern: /Kotlin\s+v?(\d+\.\d+)/g, significance: "minor" },
  java: { pattern: /Java\s+(\d+)/g, significance: "major" },
  swift: { pattern: /Swift\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  ios: { pattern: /iOS\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  xcode: { pattern: /Xcode\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  android: { pattern: /Android\s+(\d+)/g, significance: "major" },
  agp: { pattern: /AGP\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  postgresql: { pattern: /Postgre(?:SQL|s)\s+(\d+)/g, significance: "major" },
  redis: { pattern: /Redis\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  mongodb: { pattern: /MongoDB\s+(\d+(?:\.\d+)?)/g, significance: "major" },
  playwright: { pattern: /Playwright\s+v?(\d+(?:\.\d+)?)/g, significance: "major" },
};

/**
 * Scans text line by line for every alias. A `+` immediately after the
 * version marks the claim as a floor ("Next.js 15+").
 */
export function scanText(
  text: string,
  file: string,
  skill: { category: string; name: string },
): VersionClaim[] {
  const claims: VersionClaim[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const [name, alias] of Object.entries(CLAIM_ALIASES)) {
      const re = new RegExp(alias.pattern.source, "g");
      let match: RegExpExecArray | null;
      while ((match = re.exec(lineText)) !== null) {
        const after = lineText.charAt(match.index + match[0].length);
        claims.push({
          category: skill.category,
          skillName: skill.name,
          name,
          version: match[1],
          floor: after === "+",
          file,
          line: index + 1,
        });
      }
    }
  });
  return claims;
}

/**
 * Scans a skill's full SKILL.md file (frontmatter included) and every `references/*.md` beside it.
 * Line numbers in the result match the actual file on disk.
 * File paths in the result are relative to `repoRoot` with forward slashes.
 */
export function scanClaims(skill: SkillRecord, repoRoot: string): VersionClaim[] {
  const rel = (abs: string) => path.relative(repoRoot, abs).split(path.sep).join("/");
  const who = { category: skill.category, name: skill.name };
  // Scan the whole file (frontmatter included) so `line` matches the file on disk.
  const claims = scanText(fs.readFileSync(skill.skillPath, "utf8"), rel(skill.skillPath), who);
  const refDir = path.join(skill.dir, "references");
  if (fs.existsSync(refDir)) {
    for (const entry of fs.readdirSync(refDir).filter((f) => f.endsWith(".md")).sort()) {
      const abs = path.join(refDir, entry);
      claims.push(...scanText(fs.readFileSync(abs, "utf8"), rel(abs), who));
    }
  }
  return claims;
}
