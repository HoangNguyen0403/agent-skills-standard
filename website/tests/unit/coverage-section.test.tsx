import fs from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { PRODUCT_MANAGEMENT_FOUNDATION_SKILLS } from "../../../cli/src/services/CategoryDefaults";
import { CoverageSection } from "@/landing/sections/CoverageSection";

interface RegistryMetadata {
  readonly global: {
    readonly repository: string;
  };
  readonly base_language_skills: Record<string, string>;
}

describe("CoverageSection (Slice 4 / REQ-LP-04)", () => {
  const metadataPath = path.resolve(__dirname, "../../../skills/metadata.json");
  const metadata: RegistryMetadata = JSON.parse(
    fs.readFileSync(metadataPath, "utf8"),
  );
  const indexJsonPath = path.resolve(__dirname, "../../../skills/index.json");
  const indexCategories = Object.keys(
    JSON.parse(fs.readFileSync(indexJsonPath, "utf8")),
  );

  const canonicalFoundationSkills: readonly string[] =
    PRODUCT_MANAGEMENT_FOUNDATION_SKILLS;

  it("renders with default #skills anchor and accessible focus target", () => {
    const { container } = render(<CoverageSection />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("id", "skills");
    expect(section).toHaveAttribute("tabindex", "-1");
  });

  it("satisfies AC-LP-05: compares every rendered canonical catalog entry to live registry sources", () => {
    render(<CoverageSection />);

    // Validate Language catalog links against live registry categories
    const languagesList = screen.getByRole("list", {
      name: /Supported programming languages/i,
    });
    const languageLinks = within(languagesList).getAllByRole("link");
    expect(languageLinks.length).toBeGreaterThan(0);

    const baseLanguageKeys = Object.keys(metadata.base_language_skills);
    for (const link of languageLinks) {
      const href = link.getAttribute("href");
      const match = href?.match(/\/skills\/([a-z-]+)\/_INDEX\.md$/);
      expect(match).not.toBeNull();
      const category = match![1];
      expect(baseLanguageKeys).toContain(category);
      expect(indexCategories).toContain(category);
    }

    // Validate Framework catalog links against live registry categories
    const frameworksList = screen.getByRole("list", {
      name: /Supported frameworks and platforms/i,
    });
    const frameworkLinks = within(frameworksList).getAllByRole("link");
    expect(frameworkLinks.length).toBeGreaterThan(0);

    for (const link of frameworkLinks) {
      const href = link.getAttribute("href");
      const match = href?.match(/\/skills\/([a-z-]+)\/_INDEX\.md$/);
      expect(match).not.toBeNull();
      const category = match![1];
      expect(indexCategories).toContain(category);
    }
  });

  it("satisfies AC-LP-06: maintains Product Management foundation partition against canonical default import", () => {
    render(<CoverageSection />);

    const defaultList = screen.getByRole("list", {
      name: /Default foundation product management skills/i,
    });
    const defaultLinks = within(defaultList).getAllByRole("link");
    const renderedDefaultSkillIds = defaultLinks.map((link) => {
      const href = link.getAttribute("href") ?? "";
      const match = href.match(/\/skills\/product-management\/([a-z-]+)\/SKILL\.md$/);
      return match ? match[1] : "";
    });

    // Default foundation must match canonical CategoryDefaults definition
    expect(canonicalFoundationSkills.length).toBeGreaterThan(0);
    for (const skillId of canonicalFoundationSkills) {
      expect(renderedDefaultSkillIds).toContain(skillId);
    }
    // The rendered default list must be exactly the canonical selection: no
    // dropped entries, no stray optional skill promoted into the default set.
    expect(renderedDefaultSkillIds).not.toContain("");
    expect([...renderedDefaultSkillIds].sort()).toEqual(
      [...canonicalFoundationSkills].sort(),
    );

    // Optional list must not contain foundation skills
    const optionalList = screen.getByRole("list", {
      name: /Optional product management capabilities/i,
    });
    const optionalLinks = within(optionalList).getAllByRole("link");
    const renderedOptionalSkillIds = optionalLinks.map((link) => {
      const href = link.getAttribute("href") ?? "";
      const match = href.match(/\/skills\/product-management\/([a-z-]+)\/SKILL\.md$/);
      return match ? match[1] : "";
    });

    for (const skillId of canonicalFoundationSkills) {
      expect(renderedOptionalSkillIds).not.toContain(skillId);
    }
  });

  it("satisfies AC-LP-06: verifies capability matrix reference link for host dispatch variance", () => {
    render(<CoverageSection />);

    const matrixLinks = screen.getAllByRole("link", {
      name: /agent-capabilities\.md matrix/i,
    });
    expect(matrixLinks.length).toBeGreaterThanOrEqual(1);
    expect(matrixLinks[0].getAttribute("href")).toContain(
      "docs/agent-capabilities.md",
    );
  });

  it("satisfies AC-LP-07: provides semantic list landmarks for all distinct capability categories", () => {
    render(<CoverageSection />);

    expect(
      screen.getByRole("list", { name: /Supported programming languages/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", {
        name: /Supported frameworks and platforms/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: /Supported specialist subagents/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", {
        name: /Supported quality engineering skills/i,
      }),
    ).toBeInTheDocument();
  });
});
