import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkSkillAlignment,
  isDirectExecution,
  isRegexAligned,
  parseThreshold,
} from "./check-alignment";

test("isRegexAligned: anchored ordered finite block aligns when expectedOutput matches", () => {
  const pattern = "^# Security Assessment\\n- Verdict: Compliant\\n- Confidence: High$";
  const prompt = "Please review the security checklist and output an assessment.";
  const expectedOutput = "# Security Assessment\n- Verdict: Compliant\n- Confidence: High";

  const result = isRegexAligned(pattern, {
    skillContent: "# Security Policy\nRules and definitions.",
    prompt,
    expectedOutput,
  });

  assert.equal(result.matched, true);
  assert.equal(result.invalid, undefined);
});

test("isRegexAligned: wrong expected output block fails regex alignment", () => {
  const pattern = "^# Security Assessment\\n- Verdict: Compliant\\n- Confidence: High$";
  const prompt = "Please review the security checklist and output an assessment.";
  const expectedOutput = "# Security Assessment\n- Verdict: Non-Compliant\n- Confidence: Low";

  const result = isRegexAligned(pattern, {
    skillContent: "# Security Policy\nRules and definitions.",
    prompt,
    expectedOutput,
  });

  assert.equal(result.matched, false);
  assert.equal(result.invalid, undefined);
});

test("isRegexAligned: invalid regex pattern fails safely with invalid flag", () => {
  const pattern = "[invalid-unclosed-pattern(";
  const result = isRegexAligned(pattern, {
    skillContent: "content",
    prompt: "prompt",
    expectedOutput: "output",
  });

  assert.equal(result.matched, false);
  assert.equal(result.invalid, true);
});

test("isRegexAligned: source-contract-only pattern retained (matches skill body)", () => {
  const pattern = "strict token authentication";
  const result = isRegexAligned(pattern, {
    skillContent: "# Security Policy\nAlways enforce strict token authentication across services.",
    prompt: "How should authentication be handled?",
    expectedOutput: "Follow the standard policy.",
  });

  assert.equal(result.matched, true);
  assert.equal(result.invalid, undefined);
});

test("isRegexAligned: prompt-contract-only pattern retained (matches prompt)", () => {
  const pattern = "token-bucket rate limiting";
  const result = isRegexAligned(pattern, {
    skillContent: "# General Overview\nStandard API guidelines.",
    prompt: "Implement token-bucket rate limiting for downstream endpoints.",
    expectedOutput: "Configured rate limiter.",
  });

  assert.equal(result.matched, true);
  assert.equal(result.invalid, undefined);
});

test("isRegexAligned: unmatched pattern across all sources returns false", () => {
  const pattern = "unrelated-keyword-xyz";
  const result = isRegexAligned(pattern, {
    skillContent: "Skill content",
    prompt: "User prompt",
    expectedOutput: "Expected output",
  });

  assert.equal(result.matched, false);
  assert.equal(result.invalid, undefined);
});

test("CLI safety: isDirectExecution returns false when imported in test suite", () => {
  assert.equal(isDirectExecution(), false);
});

test("CLI safety: parseThreshold respects argv without ambient side effects", () => {
  assert.equal(parseThreshold(["node", "check-alignment.ts"]), 70);
  assert.equal(
    parseThreshold(["node", "check-alignment.ts", "--threshold", "85"]),
    85,
  );
});

test("checkSkillAlignment on isolated fixture: anchored expected_output aligns", async () => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "check-alignment-fixture-"),
  );
  try {
    const skillDir = path.join(tmpDir, "skills", "security", "guardrail-eval");
    fs.mkdirSync(path.join(skillDir, "evals"), { recursive: true });

    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      "# Guardrail Eval\nEnforce security policies strictly.\n",
    );

    const evalsJson = {
      skill_name: "guardrail-eval",
      evals: [
        {
          id: 1,
          prompt: "Evaluate target security stance with full report",
          expected_output:
            "# Security Assessment\n- Verdict: Compliant\n- Confidence: High",
          assertions: [
            {
              type: "regex",
              value:
                "^# Security Assessment\\n- Verdict: Compliant\\n- Confidence: High$",
            },
          ],
        },
      ],
    };
    fs.writeFileSync(
      path.join(skillDir, "evals", "evals.json"),
      JSON.stringify(evalsJson, null, 2),
    );

    const result = await checkSkillAlignment(
      path.join(skillDir, "evals", "evals.json"),
      path.join(tmpDir, "skills"),
    );

    assert.ok(result);
    assert.equal(result.total, 1);
    assert.equal(result.matched, 1);
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.misses, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("checkSkillAlignment on isolated fixture: wrong expected_output fails and records miss", async () => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "check-alignment-fixture-"),
  );
  try {
    const skillDir = path.join(tmpDir, "skills", "security", "guardrail-eval");
    fs.mkdirSync(path.join(skillDir, "evals"), { recursive: true });

    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      "# Guardrail Eval\nEnforce security policies strictly.\n",
    );

    const evalsJson = {
      skill_name: "guardrail-eval",
      evals: [
        {
          id: 1,
          prompt: "Evaluate target security stance",
          expected_output:
            "# Security Assessment\n- Verdict: Non-Compliant\n- Confidence: Low",
          assertions: [
            {
              type: "regex",
              value:
                "^# Security Assessment\\n- Verdict: Compliant\\n- Confidence: High$",
            },
          ],
        },
      ],
    };
    fs.writeFileSync(
      path.join(skillDir, "evals", "evals.json"),
      JSON.stringify(evalsJson, null, 2),
    );

    const result = await checkSkillAlignment(
      path.join(skillDir, "evals", "evals.json"),
      path.join(tmpDir, "skills"),
    );

    assert.ok(result);
    assert.equal(result.total, 1);
    assert.equal(result.matched, 0);
    assert.equal(result.percentage, 0);
    assert.equal(result.misses.length, 1);
    assert.ok(result.misses[0].includes("eval 1: regex"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("checkSkillAlignment on isolated fixture: invalid regex recorded as invalid pattern miss", async () => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "check-alignment-fixture-"),
  );
  try {
    const skillDir = path.join(tmpDir, "skills", "security", "guardrail-eval");
    fs.mkdirSync(path.join(skillDir, "evals"), { recursive: true });

    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      "# Guardrail Eval\nEnforce security policies strictly.\n",
    );

    const evalsJson = {
      skill_name: "guardrail-eval",
      evals: [
        {
          id: 42,
          prompt: "Run check",
          expected_output: "Report",
          assertions: [
            {
              type: "regex",
              value: "[invalid-unclosed(",
            },
          ],
        },
      ],
    };
    fs.writeFileSync(
      path.join(skillDir, "evals", "evals.json"),
      JSON.stringify(evalsJson, null, 2),
    );

    const result = await checkSkillAlignment(
      path.join(skillDir, "evals", "evals.json"),
      path.join(tmpDir, "skills"),
    );

    assert.ok(result);
    assert.equal(result.total, 1);
    assert.equal(result.matched, 0);
    assert.equal(result.percentage, 0);
    assert.equal(result.misses.length, 1);
    assert.ok(result.misses[0].includes("(invalid pattern)"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("checkSkillAlignment on isolated fixture: source-contract-only pattern retained", async () => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "check-alignment-fixture-"),
  );
  try {
    const skillDir = path.join(tmpDir, "skills", "security", "guardrail-eval");
    fs.mkdirSync(path.join(skillDir, "evals"), { recursive: true });

    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      "# Guardrail Eval\nPolicy enforcement rules for token revocation.\n",
    );

    const evalsJson = {
      skill_name: "guardrail-eval",
      evals: [
        {
          id: 5,
          prompt: "What is the token rule?",
          expected_output: "See policy doc.",
          assertions: [
            {
              type: "regex",
              value: "token revocation",
            },
          ],
        },
      ],
    };
    fs.writeFileSync(
      path.join(skillDir, "evals", "evals.json"),
      JSON.stringify(evalsJson, null, 2),
    );

    const result = await checkSkillAlignment(
      path.join(skillDir, "evals", "evals.json"),
      path.join(tmpDir, "skills"),
    );

    assert.ok(result);
    assert.equal(result.total, 1);
    assert.equal(result.matched, 1);
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.misses, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
