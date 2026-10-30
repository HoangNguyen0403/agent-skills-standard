#!/usr/bin/env python3
"""Behavioral tests for task_brief.py contract validation, workspace isolation, and extraction integrity."""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "skills/common/common-subagent-driven-development/scripts/task_brief.py"

SAMPLE_COMPLETE_TASK = """# Implementation Plan

## Task 1: Core Engine Implementation

**Files:** `src/engine.ts`, `src/types.ts`
**Scope / owned write set:** `src/engine.ts`, `src/types.ts` only.
**Inputs:** validated schema, baseline state.
**Outputs:** engine instance, execution receipt.
**Real Ingress:** API ingress handler at `src/index.ts`.
**Invariants:**
- Positive: returns processed state upon valid payload.
- Negative: rejects malformed payload with 400 without crashing.
**Verification owner:** parent runner via `pnpm test`.
**Handoff / freeze:** report `task-1-report.md` marked FINAL.
**Correction route:** host ladder, max 1 follow-up.

- [ ] Implement core logic
- [ ] Add unit tests

## Task 2: Adapter Implementation

**Files:** `src/adapter.ts`
"""

SAMPLE_INCOMPLETE_TASK = """# Implementation Plan

## Task 1: Incomplete Task

This task only has a description without required contract fields.
- [ ] Do some coding
- [ ] Hope it works

## Task 2: Another Task
"""

SAMPLE_EMPTY_VALUES_TASK = """# Implementation Plan

## Task 1: Empty Values Task

**Files:** 
**Scope / owned write set:** 
**Inputs:** 
**Outputs:** 
**Real Ingress:** 
**Invariants:** 
- Positive: 
- Negative: 
**Verification owner:** 
**Handoff / freeze:** 
**Correction route:** 

- [ ] Task with empty field values
"""

SAMPLE_FENCED_ONLY_TASK = """# Implementation Plan

## Task 1: Fenced Only Task

Here is an example in a code block:
```markdown
**Files:** `src/example.ts`
**Inputs:** example input
**Outputs:** example output
**Real Ingress:** example ingress
**Invariants:**
- Positive: returns true
- Negative: rejects false
**Verification owner:** parent runner
**Handoff / freeze:** report `task-1-report.md` FINAL
**Correction route:** host ladder
```

No actual contract fields exist outside the fence.
"""

SAMPLE_PROSE_KEYWORD_STUFFING_TASK = """# Implementation Plan

## Task 1: Prose Keyword Stuffing

In this task we discuss the scope, owned write set, files, inputs, outputs, real ingress,
invariants, positive behavior, negative failure modes, verification owner,
explicit handoff, freeze, final, and correction route in plain prose.
There are no structured bold labels or populated contract values.
"""

SAMPLE_ONE_SIDED_INVARIANTS_TASK = """# Implementation Plan

## Task 1: One-Sided Invariants Task

**Files:** `src/engine.ts`
**Scope / owned write set:** `src/engine.ts`
**Inputs:** sample input
**Outputs:** sample output
**Real Ingress:** sample ingress
**Invariants:**
- Positive: returns 200 OK on valid payload.
**Verification owner:** test runner
**Handoff / freeze:** report `task-1-report.md` FINAL
**Correction route:** host ladder

Only positive invariant is present, negative is missing.
"""

SAMPLE_FENCED_HEADINGS_TASK = """# Implementation Plan

## Task 1: Parser with Code Examples

**Files:** `src/parser.ts`
**Scope / owned write set:** `src/parser.ts`
**Inputs:** raw markdown stream.
**Outputs:** parsed AST node tree.
**Real Ingress:** stream parser entrypoint.
**Invariants:**
- Positive: parses headers correctly.
- Negative: malformed blocks emit syntax diagnostics.
**Verification owner:** orchestrator.
**Handoff / freeze:** report `task-1-report.md` FINAL.
**Correction route:** host ladder.

Here is an example in markdown:
```markdown
### Task 2: Fake nested task header inside code fence
This should not stop extraction of Task 1.
```

And another code block:
```python
# Task 99: Fake python comment header
def foo():
    pass
```

- [ ] Complete parser implementation

## Task 2: Subsequent Real Task

**Files:** `src/real_task.ts`
"""


SAMPLE_TILDE_FENCED_ONLY_TASK = SAMPLE_FENCED_ONLY_TASK.replace("```", "~~~")

SAMPLE_CROSS_MARKER_FENCE_TASK = """# Implementation Plan

## Task 1: Cross Marker Fence Task

```markdown
~~~python
**Files:** `src/example.ts`
**Scope / owned write set:** `src/example.ts`
**Inputs:** example input
**Outputs:** example output
**Real Ingress:** example ingress
**Invariants:**
- Positive: returns true
- Negative: rejects false
**Verification owner:** parent runner
**Handoff / freeze:** report `task-1-report.md` FINAL
**Correction route:** host ladder
```

No contract fields exist outside the outer fence.
"""

SAMPLE_SHORTER_FENCE_TASK = """# Implementation Plan

## Task 1: Short Inner Fence Task

````markdown
```
**Files:** `src/example.ts`
**Scope / owned write set:** `src/example.ts`
**Inputs:** example input
**Outputs:** example output
**Real Ingress:** example ingress
**Invariants:**
- Positive: returns true
- Negative: rejects false
**Verification owner:** parent runner
**Handoff / freeze:** report `task-1-report.md` FINAL
**Correction route:** host ladder
```
````

No contract fields exist outside the four-backtick fence.
"""


SAMPLE_TILDE_FENCED_HEADING_TASK = """# Implementation Plan

## Task 1: Tilde Fence Heading Task

**Files:** `src/tilde.ts`
**Scope / owned write set:** `src/tilde.ts`
**Inputs:** raw markdown stream.
**Outputs:** parsed AST node tree.
**Real Ingress:** stream parser entrypoint.
**Invariants:**
- Positive: parses headers correctly.
- Negative: malformed blocks emit syntax diagnostics.
**Verification owner:** orchestrator.
**Handoff / freeze:** report `task-1-report.md` FINAL.
**Correction route:** host ladder.

Example:
~~~markdown
## Task 2: Fake tilde-fenced task header
~~~

- [ ] Complete tilde parser implementation

## Task 2: Real Task After Tilde Fence

**Files:** `src/real_tilde.ts`
"""


class TestTaskBrief(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="sdd_brief_test_")
        self.plan_complete = os.path.join(self.test_dir, "plan_complete.md")
        self.plan_incomplete = os.path.join(self.test_dir, "plan_incomplete.md")
        self.plan_empty = os.path.join(self.test_dir, "plan_empty.md")
        self.plan_fenced_only = os.path.join(self.test_dir, "plan_fenced_only.md")
        self.plan_prose = os.path.join(self.test_dir, "plan_prose.md")
        self.plan_one_sided = os.path.join(self.test_dir, "plan_one_sided.md")
        self.plan_fenced = os.path.join(self.test_dir, "plan_fenced.md")

        with open(self.plan_complete, "w", encoding="utf-8") as f:
            f.write(SAMPLE_COMPLETE_TASK)
        with open(self.plan_incomplete, "w", encoding="utf-8") as f:
            f.write(SAMPLE_INCOMPLETE_TASK)
        with open(self.plan_empty, "w", encoding="utf-8") as f:
            f.write(SAMPLE_EMPTY_VALUES_TASK)
        with open(self.plan_fenced_only, "w", encoding="utf-8") as f:
            f.write(SAMPLE_FENCED_ONLY_TASK)
        with open(self.plan_prose, "w", encoding="utf-8") as f:
            f.write(SAMPLE_PROSE_KEYWORD_STUFFING_TASK)
        with open(self.plan_one_sided, "w", encoding="utf-8") as f:
            f.write(SAMPLE_ONE_SIDED_INVARIANTS_TASK)
        with open(self.plan_fenced, "w", encoding="utf-8") as f:
            f.write(SAMPLE_FENCED_HEADINGS_TASK)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def run_extractor(self, plan_file, task_number, outfile=None, cwd=None):
        cmd = [sys.executable, str(SCRIPT), plan_file, str(task_number)]
        if outfile:
            cmd.append(outfile)
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd or self.test_dir)
        return result

    def test_missing_fields_no_output(self):
        """Historical plans lacking fields fail with a diagnostic and no brief output."""
        outfile = os.path.join(self.test_dir, "task-1-brief-incomplete.md")
        res = self.run_extractor(self.plan_incomplete, 1, outfile)

        self.assertEqual(res.returncode, 5, f"Expected contract-refusal exit, got: {res.returncode}")
        self.assertTrue(res.stderr.strip(), "A missing-contract refusal must emit a diagnostic")
        self.assertFalse(os.path.exists(outfile), "Output file must NOT be created when contract fields are missing")

    def test_empty_values_rejected(self):
        """Labels present with empty values must be rejected."""
        outfile = os.path.join(self.test_dir, "task-1-brief-empty.md")
        res = self.run_extractor(self.plan_empty, 1, outfile)

        self.assertEqual(res.returncode, 5)
        self.assertFalse(os.path.exists(outfile))

    def test_fenced_only_fields_rejected(self):
        """Fields present only inside markdown code fences are excluded from contract validation."""
        outfile = os.path.join(self.test_dir, "task-1-brief-fenced-only.md")
        res = self.run_extractor(self.plan_fenced_only, 1, outfile)

        self.assertEqual(res.returncode, 5)
        self.assertFalse(os.path.exists(outfile))

    def test_prose_keyword_stuffing_rejected(self):
        """Unstructured prose keyword mentions do not satisfy structured label requirements."""
        outfile = os.path.join(self.test_dir, "task-1-brief-prose.md")
        res = self.run_extractor(self.plan_prose, 1, outfile)

        self.assertEqual(res.returncode, 5)
        self.assertFalse(os.path.exists(outfile))

    def test_one_sided_invariants_rejected(self):
        """Invariants lacking negative failure mode must be rejected."""
        outfile = os.path.join(self.test_dir, "task-1-brief-one-sided.md")
        res = self.run_extractor(self.plan_one_sided, 1, outfile)

        self.assertEqual(res.returncode, 5)
        self.assertFalse(os.path.exists(outfile))

    def test_default_cli_no_side_effects_on_failure(self):
        """Default CLI (OUTFILE omitted) on invalid plan must fail without creating workspace directories."""
        isolated_dir = tempfile.mkdtemp(prefix="sdd_isolated_repo_")
        try:
            plan_path = os.path.join(isolated_dir, "docs", "plans", "invalid_plan.md")
            os.makedirs(os.path.dirname(plan_path), exist_ok=True)
            with open(plan_path, "w", encoding="utf-8") as f:
                f.write(SAMPLE_INCOMPLETE_TASK)

            res = self.run_extractor(plan_path, 1, cwd=isolated_dir)
            self.assertNotEqual(res.returncode, 0)

            # Ensure neither .agent nor .gitignore nor any workspace directory was created
            agent_dir = os.path.join(isolated_dir, ".agent")
            gitignore_file = os.path.join(isolated_dir, ".gitignore")
            self.assertFalse(os.path.exists(agent_dir), "Default CLI failure must NOT create .agent directory")
            self.assertFalse(os.path.exists(gitignore_file), "Default CLI failure must NOT create .gitignore file")
        finally:
            shutil.rmtree(isolated_dir, ignore_errors=True)

    def test_complete_brief_extracted(self):
        """Complete task with all required contract fields is extracted successfully."""
        outfile = os.path.join(self.test_dir, "task-1-brief.md")
        res = self.run_extractor(self.plan_complete, 1, outfile)

        self.assertEqual(res.returncode, 0, f"Extraction failed with stderr: {res.stderr}")
        self.assertTrue(os.path.exists(outfile), "Output brief file should exist")

        with open(outfile, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("## Task 1: Core Engine Implementation", content)
        self.assertIn("**Real Ingress:**", content)
        self.assertIn("**Verification owner:**", content)
        self.assertIn("**Handoff / freeze:**", content)
        self.assertNotIn("## Task 2: Adapter Implementation", content)

    def test_label_case_variants_accepted(self):
        """Contract labels match case-insensitively, including the canonical mixed-case template."""
        plan = self.write_plan(
            "plan_label_case.md",
            SAMPLE_COMPLETE_TASK.replace("**Verification owner:**", "**Verification Owner:**")
            .replace("**Correction route:**", "**CORRECTION ROUTE:**")
            .replace("**Real Ingress:**", "**real ingress:**"),
        )
        outfile = os.path.join(self.test_dir, "brief_label_case.md")
        res = self.run_extractor(plan, 1, outfile)

        self.assertEqual(res.returncode, 0, f"Extraction failed with stderr: {res.stderr}")
        self.assertTrue(os.path.exists(outfile))

    def test_fenced_fake_headings_ignored(self):
        """Fake task headings inside code fences are ignored during extraction."""
        outfile = os.path.join(self.test_dir, "task-1-fenced-brief.md")
        res = self.run_extractor(self.plan_fenced, 1, outfile)

        self.assertEqual(res.returncode, 0, f"Extraction failed with stderr: {res.stderr}")
        self.assertTrue(os.path.exists(outfile))

        with open(outfile, "r", encoding="utf-8") as f:
            content = f.read()

        # Both fenced examples must be retained as part of Task 1 body
        self.assertIn("### Task 2: Fake nested task header inside code fence", content)
        self.assertIn("# Task 99: Fake python comment header", content)
        self.assertIn("- [ ] Complete parser implementation", content)
        # But the actual real Task 2 after the code fences must terminate extraction
        self.assertNotIn("## Task 2: Subsequent Real Task", content)

    def test_existing_output_preserved_exclusive(self):
        """Existing output files cannot be overwritten, preserving immutable evidence."""
        outfile = os.path.join(self.test_dir, "task-1-brief-existing.md")
        sentinel_text = "SENTINEL EVIDENCE: DO NOT OVERWRITE"
        with open(outfile, "w", encoding="utf-8") as f:
            f.write(sentinel_text)

        res = self.run_extractor(self.plan_complete, 1, outfile)

        self.assertEqual(res.returncode, 4, "A publication refusal must exit with the refusal code")

        with open(outfile, "r", encoding="utf-8") as f:
            intact_content = f.read()

        self.assertEqual(intact_content, sentinel_text, "Existing output must be preserved untouched")

    def test_symlink_destination_refused(self):
        """Symlink destination paths are rejected without following them."""
        target_sentinel = os.path.join(self.test_dir, "symlink_target.txt")
        sentinel_text = "TARGET SENTINEL BYTES"
        with open(target_sentinel, "w", encoding="utf-8") as f:
            f.write(sentinel_text)

        symlink_outfile = os.path.join(self.test_dir, "task-1-symlink.md")
        os.symlink(target_sentinel, symlink_outfile)

        res = self.run_extractor(self.plan_complete, 1, symlink_outfile)
        self.assertEqual(res.returncode, 4)
        self.assertTrue(os.path.islink(symlink_outfile), "The symlink destination must not be replaced")

        with open(target_sentinel, "r", encoding="utf-8") as f:
            target_content = f.read()
        self.assertEqual(target_content, sentinel_text, "Symlink target must remain untouched")

    def write_plan(self, name, content):
        path = os.path.join(self.test_dir, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path

    def test_individually_empty_fields_rejected(self):
        """An empty value never borrows the next label or line as its content."""
        variants = [
            ("**Inputs:** validated schema, baseline state.", "**Inputs:**"),
            ("**Outputs:** engine instance, execution receipt.", "**Outputs:**"),
            ("**Real Ingress:** API ingress handler at `src/index.ts`.", "**Real Ingress:**"),
            ("**Verification owner:** parent runner via `pnpm test`.", "**Verification owner:**"),
            ("**Correction route:** host ladder, max 1 follow-up.", "**Correction route:**"),
            ("**Handoff / freeze:** report `task-1-report.md` marked FINAL.", "**Handoff / freeze:**"),
            ("- Positive: returns processed state upon valid payload.", "- Positive:"),
            ("- Negative: rejects malformed payload with 400 without crashing.", "- Negative:"),
        ]
        for old, new in variants:
            with self.subTest(empty=old):
                slug = "".join(ch if ch.isalnum() else "_" for ch in old)[:40]
                plan = self.write_plan(f"plan_empty_{slug}.md", SAMPLE_COMPLETE_TASK.replace(old, new))
                outfile = os.path.join(self.test_dir, f"brief_empty_{slug}.md")
                res = self.run_extractor(plan, 1, outfile)

                self.assertEqual(res.returncode, 5, f"Empty value in '{old}' must be rejected")
                self.assertFalse(os.path.exists(outfile), f"No output may be written for empty value in '{old}'")

    def test_scope_empty_rejected_when_files_also_empty(self):
        """The scope contract is unsatisfied when both Files and Scope are empty."""
        plan = self.write_plan(
            "plan_empty_scope.md",
            SAMPLE_COMPLETE_TASK.replace(
                "**Files:** `src/engine.ts`, `src/types.ts`\n**Scope / owned write set:** `src/engine.ts`, `src/types.ts` only.",
                "**Files:**\n**Scope / owned write set:**",
            ),
        )
        outfile = os.path.join(self.test_dir, "brief_empty_scope.md")
        res = self.run_extractor(plan, 1, outfile)

        self.assertEqual(res.returncode, 5)
        self.assertFalse(os.path.exists(outfile))

    def test_fenced_or_inline_contract_rejected(self):
        """Tilde fences, cross-marker content and unbolded prose never satisfy the contract."""
        cases = [
            ("tilde", SAMPLE_TILDE_FENCED_ONLY_TASK),
            ("cross_marker", SAMPLE_CROSS_MARKER_FENCE_TASK),
            ("shorter", SAMPLE_SHORTER_FENCE_TASK),
            (
                "unbolded",
                SAMPLE_COMPLETE_TASK.replace(
                    "**Inputs:** validated schema, baseline state.",
                    "Inputs: validated schema, baseline state.",
                ),
            ),
        ]
        for name, content in cases:
            with self.subTest(case=name):
                plan = self.write_plan(f"plan_fenced_{name}.md", content)
                outfile = os.path.join(self.test_dir, f"brief_fenced_{name}.md")
                res = self.run_extractor(plan, 1, outfile)

                self.assertEqual(res.returncode, 5)
                self.assertFalse(os.path.exists(outfile), f"No output may be written for fenced case {name}")

    def test_fenced_example_ignored_with_real_contract_accepted(self):
        """A tilde-fenced example is skipped while a real contract outside it is accepted."""
        plan = self.write_plan(
            "plan_fenced_example.md",
            SAMPLE_COMPLETE_TASK.replace(
                "**Inputs:** validated schema, baseline state.",
                "~~~markdown\n**Inputs:**\n~~~\n**Inputs:** validated schema, baseline state.",
            ),
        )
        outfile = os.path.join(self.test_dir, "brief_fenced_example.md")
        res = self.run_extractor(plan, 1, outfile)

        self.assertEqual(res.returncode, 0, f"Extraction failed with stderr: {res.stderr}")
        self.assertTrue(os.path.exists(outfile))

    def test_tilde_fenced_fake_heading_ignored(self):
        """A task heading inside a tilde fence does not terminate extraction."""
        plan = self.write_plan("plan_tilde_heading.md", SAMPLE_TILDE_FENCED_HEADING_TASK)
        outfile = os.path.join(self.test_dir, "brief_tilde_heading.md")
        res = self.run_extractor(plan, 1, outfile)

        self.assertEqual(res.returncode, 0, f"Extraction failed with stderr: {res.stderr}")
        with open(outfile, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("## Task 2: Fake tilde-fenced task header", content)
        self.assertIn("- [ ] Complete tilde parser implementation", content)
        self.assertNotIn("## Task 2: Real Task After Tilde Fence", content)

    def make_valid_assignment(self, plan_file, task_number=1):
        with open(plan_file, "rb") as f:
            plan_sha256 = hashlib.sha256(f.read()).hexdigest()
        return {
            "schema_version": 1,
            "task_id": f"task-{task_number}",
            "task_number": task_number,
            "goal": "Implement core engine functionality",
            "owner": "Worker Personal Cheap",
            "project_domain": "agent-skills-standard",
            "workspace_root": self.test_dir,
            "plan_sha256": plan_sha256,
            "non_goals": ["Do not rewrite outer build systems"],
            "authority": {
                "allowed_operations": ["implement", "test"],
                "forbidden_actions": ["git commit", "spawn subagent"],
                "required_approvals": [],
            },
            "global_invariants": ["Keep existing error boundaries intact"],
            "owned_paths": ["src/engine.ts"],
            "acceptance_criteria": [
                {"id": "AC-1", "expectation": "Returns processed state on valid input"}
            ],
            "verification": [
                {"command": "pnpm test", "cwd": ".", "expected": "PASS"}
            ],
            "required_standards": [],
            "source_revision": "c32fa3d7",
            "dirty_identity": "clean-worktree",
            "source_files": [],
            "dependencies": [],
            "output_contract": {
                "receipt_destination": "artifacts/receipt.json",
                "status_vocabulary": ["PASS", "FAIL"],
                "stop_conditions": ["blocked"],
            },
            "limits": {"status": "advisory"},
        }

    def run_assignment(self, plan_file, task_number, assignment_file, outfile=None, cwd=None):
        cmd = [
            sys.executable,
            str(SCRIPT),
            plan_file,
            str(task_number),
            "--assignment",
            assignment_file,
        ]
        if outfile:
            cmd.extend(["--out", outfile])
        return subprocess.run(cmd, capture_output=True, text=True, cwd=cwd or self.test_dir)

    def test_assignment_mode_valid_packet_published(self):
        """A valid assignment manifest publishes a standalone packet with exit 0."""
        assignment_data = self.make_valid_assignment(self.plan_complete, 1)
        assignment_path = os.path.join(self.test_dir, "assignment_valid.json")
        with open(assignment_path, "w", encoding="utf-8") as f:
            json.dump(assignment_data, f)
        packet_out = os.path.join(self.test_dir, "task-1-packet.md")

        res = self.run_assignment(self.plan_complete, 1, assignment_path, outfile=packet_out)
        self.assertEqual(res.returncode, 0, f"Expected 0 exit, got {res.returncode}; stderr: {res.stderr}")
        self.assertTrue(os.path.exists(packet_out), "Packet output file must be written")
        with open(packet_out, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("# Assignment packet: task-1", content)
        self.assertIn("Implement core engine functionality", content)
        self.assertIn("Worker Personal Cheap", content)
        self.assertIn("AC-1", content)

    def test_assignment_mode_missing_field_exit_2(self):
        """Missing required key in assignment exits with code 2 and no unhandled AttributeError."""
        assignment_data = self.make_valid_assignment(self.plan_complete, 1)
        del assignment_data["goal"]  # remove required key
        assignment_path = os.path.join(self.test_dir, "assignment_missing_goal.json")
        with open(assignment_path, "w", encoding="utf-8") as f:
            json.dump(assignment_data, f)
        packet_out = os.path.join(self.test_dir, "task-1-missing-goal.md")

        res = self.run_assignment(self.plan_complete, 1, assignment_path, outfile=packet_out)
        self.assertEqual(res.returncode, 2, f"Expected code 2 exit, got {res.returncode}; stderr: {res.stderr}")
        self.assertNotIn("AttributeError", res.stderr, "PacketError must carry .code attribute cleanly")
        self.assertIn("field 'goal' is required", res.stderr)
        self.assertFalse(os.path.exists(packet_out))

    def test_assignment_mode_invalid_json_exit_2(self):
        """Malformed JSON in assignment file exits with code 2."""
        assignment_path = os.path.join(self.test_dir, "assignment_malformed.json")
        with open(assignment_path, "w", encoding="utf-8") as f:
            f.write("{invalid json")

        res = self.run_assignment(self.plan_complete, 1, assignment_path)
        self.assertEqual(res.returncode, 2, f"Expected code 2 exit, got {res.returncode}; stderr: {res.stderr}")
        self.assertIn("not valid JSON", res.stderr)

    def test_assignment_mode_plan_digest_mismatch_exit_2(self):
        """Plan SHA-256 mismatch in assignment exits with code 2."""
        assignment_data = self.make_valid_assignment(self.plan_complete, 1)
        assignment_data["plan_sha256"] = "0" * 64
        assignment_path = os.path.join(self.test_dir, "assignment_digest_mismatch.json")
        with open(assignment_path, "w", encoding="utf-8") as f:
            json.dump(assignment_data, f)

        res = self.run_assignment(self.plan_complete, 1, assignment_path)
        self.assertEqual(res.returncode, 2, f"Expected code 2 exit, got {res.returncode}; stderr: {res.stderr}")
        self.assertIn("plan_sha256 digest mismatch", res.stderr)

    def test_assignment_mode_task_not_found_exit_3(self):
        """Requesting an absent task in assignment mode exits with code 3."""
        assignment_data = self.make_valid_assignment(self.plan_complete, 99)
        assignment_path = os.path.join(self.test_dir, "assignment_task_99.json")
        with open(assignment_path, "w", encoding="utf-8") as f:
            json.dump(assignment_data, f)

        res = self.run_assignment(self.plan_complete, 99, assignment_path)
        self.assertEqual(res.returncode, 3, f"Expected code 3 exit, got {res.returncode}; stderr: {res.stderr}")
        self.assertIn("task 99 not found in plan", res.stderr)

    def test_assignment_mode_output_collision_exit_3(self):
        """Existing output with different content triggers output collision exit code 3."""
        assignment_data = self.make_valid_assignment(self.plan_complete, 1)
        assignment_path = os.path.join(self.test_dir, "assignment_collision.json")
        with open(assignment_path, "w", encoding="utf-8") as f:
            json.dump(assignment_data, f)
        packet_out = os.path.join(self.test_dir, "task-1-collision-packet.md")
        with open(packet_out, "w", encoding="utf-8") as f:
            f.write("DIFFERENT PACKET CONTENT THAT COLLIDES")

        res = self.run_assignment(self.plan_complete, 1, assignment_path, outfile=packet_out)
        self.assertEqual(res.returncode, 3, f"Expected code 3 exit, got {res.returncode}; stderr: {res.stderr}")
        self.assertIn("output collision", res.stderr)
if __name__ == "__main__":
    unittest.main()
