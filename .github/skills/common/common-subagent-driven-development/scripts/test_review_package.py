#!/usr/bin/env python3
"""Regression tests for workspace ownership and review-package integrity."""

import os
import shutil
import subprocess
import tempfile
import unittest

from review_package import generate_package


def run_git(cwd, args):
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True)
    return result.stdout.strip()


class TestReviewPackage(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="sdd_test_")
        run_git(self.test_dir, ["init"])
        run_git(self.test_dir, ["config", "user.name", "SDD Test"])
        run_git(self.test_dir, ["config", "user.email", "sdd@example.com"])
        self.plan_file = os.path.join(self.test_dir, "plan.md")
        self.file_a = os.path.join(self.test_dir, "file_a.txt")
        with open(self.plan_file, "w", encoding="utf-8") as stream:
            stream.write("# Test Plan\n\n## Task 1\nTest\n")
        with open(self.file_a, "w", encoding="utf-8") as stream:
            stream.write("initial a\n")
        run_git(self.test_dir, ["add", "plan.md", "file_a.txt"])
        run_git(self.test_dir, ["commit", "-m", "Initial commit"])
        self.base_sha = run_git(self.test_dir, ["rev-parse", "HEAD"])

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def package(self, scope, outfile=None, base=None):
        previous = os.getcwd()
        try:
            os.chdir(self.test_dir)
            return generate_package(self.plan_file, base or self.base_sha, "WORKSPACE", outfile, scope)
        finally:
            os.chdir(previous)

    def read_package(self, path):
        with open(path, encoding="utf-8") as stream:
            return stream.read()

    def test_uncommitted_tracked_diff(self):
        with open(self.file_a, "a", encoding="utf-8") as stream:
            stream.write("tracked edit\n")
        output = self.package(["file_a.txt"], os.path.join(self.test_dir, "tracked.diff"))
        self.assertIn("+tracked edit", self.read_package(output))

    def test_nested_space_containing_untracked_only_is_captured(self):
        nested = os.path.join(self.test_dir, "owned dir", "nested", "new file.txt")
        os.makedirs(os.path.dirname(nested))
        with open(nested, "w", encoding="utf-8") as stream:
            stream.write("nested addition\n")
        output = self.package(["owned dir"], os.path.join(self.test_dir, "nested.diff"))
        package = self.read_package(output)
        self.assertIn("owned dir/nested/new file.txt", package)
        self.assertIn("+nested addition", package)

    def test_mixed_tracked_and_nested_untracked_are_both_captured(self):
        with open(self.file_a, "a", encoding="utf-8") as stream:
            stream.write("tracked mixed edit\n")
        nested = os.path.join(self.test_dir, "new tree", "nested.txt")
        os.makedirs(os.path.dirname(nested))
        with open(nested, "w", encoding="utf-8") as stream:
            stream.write("untracked mixed addition\n")
        output = self.package(["file_a.txt", "new tree"], os.path.join(self.test_dir, "mixed.diff"))
        package = self.read_package(output)
        self.assertIn("+tracked mixed edit", package)
        self.assertIn("+untracked mixed addition", package)

    def test_scope_excludes_adjacent_worker_changes(self):
        with open(self.file_a, "a", encoding="utf-8") as stream:
            stream.write("owned edit\n")
        with open(os.path.join(self.test_dir, "worker_b.txt"), "w", encoding="utf-8") as stream:
            stream.write("unowned edit\n")
        output = self.package(["file_a.txt"], os.path.join(self.test_dir, "isolated.diff"))
        package = self.read_package(output)
        self.assertIn("+owned edit", package)
        self.assertNotIn("worker_b.txt", package)
        self.assertNotIn("unowned edit", package)

    def test_workspace_requires_narrow_explicit_scope(self):
        with self.assertRaises(SystemExit) as missing:
            self.package(None, os.path.join(self.test_dir, "missing.diff"))
        self.assertEqual(missing.exception.code, 2)
        for scope in (["."], ["../other"], ["*"], [":(exclude)file_a.txt"], [":!file_a.txt"], ["owned", "owned/nested"]):
            with self.subTest(scope=scope), self.assertRaises(SystemExit) as rejected:
                self.package(scope, os.path.join(self.test_dir, "invalid.diff"))
            self.assertEqual(rejected.exception.code, 2)

    def test_invalid_base_and_head_refs_are_rejected(self):
        with self.assertRaises(SystemExit) as invalid_base:
            self.package(["file_a.txt"], os.path.join(self.test_dir, "bad-base.diff"), "missing^{not-a-ref}")
        self.assertEqual(invalid_base.exception.code, 2)

        previous = os.getcwd()
        try:
            os.chdir(self.test_dir)
            with self.assertRaises(SystemExit) as invalid_head:
                generate_package(self.plan_file, self.base_sha, "missing-head", os.path.join(self.test_dir, "bad-head.diff"))
            self.assertEqual(invalid_head.exception.code, 2)
        finally:
            os.chdir(previous)

    def test_no_change_and_existing_output_fail_without_overwrite(self):
        output = os.path.join(self.test_dir, "empty.diff")
        with self.assertRaises(SystemExit) as empty:
            self.package(["file_a.txt"], output)
        self.assertEqual(empty.exception.code, 3)

        with open(self.file_a, "a", encoding="utf-8") as stream:
            stream.write("reviewed edit\n")
        self.package(["file_a.txt"], output)
        original = self.read_package(output)
        with self.assertRaises(SystemExit) as collision:
            self.package(["file_a.txt"], output)
        self.assertEqual(collision.exception.code, 3)
        self.assertEqual(self.read_package(output), original)

    def test_repeated_same_scope_fix_rounds_create_immutable_cumulative_packages(self):
        with open(self.file_a, "a", encoding="utf-8") as stream:
            stream.write("first round change\n")
        previous = os.getcwd()
        try:
            os.chdir(self.test_dir)
            first = generate_package(self.plan_file, self.base_sha, "WORKSPACE", paths=["file_a.txt"])
            first_contents = self.read_package(first)

            with open(self.file_a, "a", encoding="utf-8") as stream:
                stream.write("second round change\n")
            second = generate_package(self.plan_file, self.base_sha, "WORKSPACE", paths=["file_a.txt"])
        finally:
            os.chdir(previous)

        second_contents = self.read_package(second)
        self.assertNotEqual(first, second)
        self.assertEqual(self.read_package(first), first_contents)
        self.assertIn("+first round change", first_contents)
        self.assertNotIn("+second round change", first_contents)
        self.assertIn("+first round change", second_contents)
        self.assertIn("+second round change", second_contents)


    def test_committed_commit_range(self):
        with open(self.file_a, "a", encoding="utf-8") as stream:
            stream.write("committed line\n")
        run_git(self.test_dir, ["add", "file_a.txt"])
        run_git(self.test_dir, ["commit", "-m", "Commit on head"])
        head = run_git(self.test_dir, ["rev-parse", "HEAD"])
        previous = os.getcwd()
        try:
            os.chdir(self.test_dir)
            output = generate_package(self.plan_file, self.base_sha, head, os.path.join(self.test_dir, "commit.diff"))
        finally:
            os.chdir(previous)
        package = self.read_package(output)
        self.assertIn("Commit on head", package)
        self.assertIn("+committed line", package)


if __name__ == "__main__":
    unittest.main()
