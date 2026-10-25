import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoutingFigure } from "@/landing/RoutingFigure.client";

describe("RoutingFigure interactive selector behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates file trigger, category index, skill path, rule excerpt, and source link on selection", () => {
    render(<RoutingFigure />);

    // Select React with sample file Button.tsx
    const reactBtn = screen.getByRole("button", {
      name: /Select React example with Button\.tsx/i,
    });
    fireEvent.click(reactBtn);

    const activeTrigger = screen.getByText(/Editing a React component/i);
    expect(activeTrigger.closest('[aria-hidden="false"]')).toBeInTheDocument();

    const activeCategory = screen.getByText(/skills\/react\/_INDEX\.md/i);
    expect(activeCategory.closest('[aria-hidden="false"]')).toBeInTheDocument();

    const activeSkill = screen.getByText(
      /Matching skill: react-component-patterns/i,
    );
    expect(activeSkill.closest('[aria-hidden="false"]')).toBeInTheDocument();

    const activeExcerpt = screen.getByText(/React 19: ref is a regular prop/i);
    expect(activeExcerpt.closest('[aria-hidden="false"]')).toBeInTheDocument();

    const reactLink = screen.getByRole("link", {
      name: /View react-component-patterns SKILL\.md source on GitHub/i,
    });
    expect(reactLink).toHaveAttribute(
      "href",
      "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/skills/react/react-component-patterns/SKILL.md",
    );
  });

  it("handles rapid user switching across options without stale content or race conditions", () => {
    render(<RoutingFigure />);

    const tsBtn = screen.getByRole("button", {
      name: /Select TypeScript example with checkout\.ts/i,
    });
    const reactBtn = screen.getByRole("button", {
      name: /Select React example with Button\.tsx/i,
    });
    const goBtn = screen.getByRole("button", {
      name: /Select Go example with checkout_test\.go/i,
    });

    // Rapidly cycle choices
    fireEvent.click(reactBtn);
    fireEvent.click(goBtn);
    fireEvent.click(tsBtn);
    fireEvent.click(goBtn);

    // Final active state must strictly reflect Go example
    const activeTrigger = screen.getByText(/Editing a Go test/i);
    expect(activeTrigger.closest('[aria-hidden="false"]')).toBeInTheDocument();

    const activeCategory = screen.getByText(/skills\/golang\/_INDEX\.md/i);
    expect(activeCategory.closest('[aria-hidden="false"]')).toBeInTheDocument();

    const activeSkill = screen.getByText(/Matching skill: golang-testing/i);
    expect(activeSkill.closest('[aria-hidden="false"]')).toBeInTheDocument();

    const activeExcerpt = screen.getByText(
      /\[BE-TEST-01\] Table-Driven Subtests/i,
    );
    expect(activeExcerpt.closest('[aria-hidden="false"]')).toBeInTheDocument();

    // TypeScript and React layers must be aria-hidden="true"
    const tsSkill = screen.getByText(/Matching skill: typescript-language/i);
    expect(tsSkill.closest('[aria-hidden="true"]')).toBeInTheDocument();

    const reactSkill = screen.getByText(
      /Matching skill: react-component-patterns/i,
    );
    expect(reactSkill.closest('[aria-hidden="true"]')).toBeInTheDocument();

    const goLink = screen.getByRole("link", {
      name: /View golang-testing SKILL\.md source on GitHub/i,
    });
    expect(goLink).toHaveAttribute(
      "href",
      "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/skills/golang/golang-testing/SKILL.md",
    );
  });
});
