# Immutable review snapshot T2-equals-corrected

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance
Base: 8fc53b4c683d312359166e49e397fa887dd0ac92
Captured: 2026-10-26T23:08:42.463Z

## Tracked diff

diff --git a/cmd/testguard/main.go b/cmd/testguard/main.go
index 36ef75c..27d38a8 100644
--- a/cmd/testguard/main.go
+++ b/cmd/testguard/main.go
@@ -3,12 +3,14 @@ package main
 import (
 	"fmt"
 	"os"
+	"strconv"
+	"strings"
 
 	"github.com/HoangNguyen0403/testguard/pkg/docs"
 	"github.com/HoangNguyen0403/testguard/pkg/engine"
+	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/HoangNguyen0403/testguard/pkg/reporter"
 	"github.com/HoangNguyen0403/testguard/pkg/updater"
-	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/spf13/cobra"
 )
 
@@ -19,9 +21,140 @@ var (
 	repo    = "HoangNguyen0403/testguard"
 )
 
+// classifyScanInvocation decides, from raw CLI arguments, whether the selected
+// command is the scan command and whether it requested JSON output, while
+// collecting the caller-supplied path operands. It relies on Cobra's command
+// tree and registered flag metadata so option operands (including dash-prefixed
+// ones) are never mistaken for commands or flags.
+func classifyScanInvocation(root *cobra.Command, args []string) (isJSON bool, paths []string) {
+	selected, _, err := root.Find(args)
+	if err != nil || selected != root {
+		return false, nil
+	}
+
+	flags := root.Flags()
+	jsonFlag := false
+	format := ""
+	pastDashDash := false
+
+	for i := 0; i < len(args); i++ {
+		arg := args[i]
+		if pastDashDash {
+			paths = append(paths, arg)
+			continue
+		}
+		if arg == "--" {
+			pastDashDash = true
+			continue
+		}
+		if !strings.HasPrefix(arg, "-") || arg == "-" {
+			paths = append(paths, arg)
+			continue
+		}
+
+		longForm := strings.HasPrefix(arg, "--")
+		if longForm {
+			name := strings.TrimPrefix(arg, "--")
+			value := ""
+			hasValue := false
+			if eq := strings.Index(name, "="); eq >= 0 {
+				name, value, hasValue = name[:eq], name[eq+1:], true
+			}
+			f := flags.Lookup(name)
+			if f == nil {
+				continue
+			}
+			if !hasValue {
+				switch {
+				case f.NoOptDefVal != "":
+					value = f.NoOptDefVal
+				case i+1 < len(args):
+					i++
+					value = args[i]
+				default:
+					continue
+				}
+			}
+			switch f.Name {
+			case "json":
+				if parsed, perr := strconv.ParseBool(value); perr == nil {
+					jsonFlag = parsed
+				} else {
+					jsonFlag = true
+				}
+			case "format":
+				format = value
+			}
+			continue
+		}
+
+		name := strings.TrimPrefix(arg, "-")
+		for offset := 0; offset < len(name); offset++ {
+			f := flags.ShorthandLookup(name[offset : offset+1])
+			if f == nil {
+				break
+			}
+
+			value := f.NoOptDefVal
+			if f.NoOptDefVal != "" {
+				if offset+1 < len(name) && name[offset+1] == '=' {
+					value = name[offset+2:]
+					offset = len(name)
+				}
+			} else if offset+1 < len(name) {
+				value = strings.TrimPrefix(name[offset+1:], "=")
+				offset = len(name)
+			} else if i+1 < len(args) {
+				i++
+				value = args[i]
+			} else {
+				break
+			}
+
+			switch f.Name {
+			case "json":
+				if parsed, perr := strconv.ParseBool(value); perr == nil {
+					jsonFlag = parsed
+				} else {
+					jsonFlag = true
+				}
+			case "format":
+				format = value
+			}
+		}
+	}
+
+	if len(paths) == 0 {
+		paths = []string{"."}
+	}
+	return jsonFlag || format == "json", paths
+}
+
+func emitCLIError(isJSON bool, message string, args []string, version, commit, date string) {
+	if isJSON {
+		report := models.NewScanReport()
+		report.Tool = models.NewToolMeta(version, commit, date)
+		if len(args) > 0 {
+			report.Scope.RequestedPaths = append([]string(nil), args...)
+		} else {
+			report.Scope.RequestedPaths = []string{"."}
+		}
+		report.Analysis.Status = "error"
+		report.Analysis.Reason = "invalid_usage"
+		report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("invalid_usage", "", message))
+		report.ExitCode = 2
+		if err := reporter.WriteJSONReport(os.Stdout, report); err != nil {
+			fmt.Fprintf(os.Stderr, "Error writing JSON report: %v\n", err)
+		}
+	} else {
+		fmt.Fprintf(os.Stderr, "Error: %s\n", message)
+	}
+	os.Exit(2)
+}
 func main() {
 	var diffMode bool
 	var allMode bool
+	var allowEmpty bool
 	var jsonMode bool
 	var format string
 	var outputFile string
@@ -50,23 +183,41 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
 
   # 5. Inspect why a rule exists and how to remediate it
   testguard explain GUARD-DART-SEED-ECHO`,
-		Args:    cobra.ArbitraryArgs,
-		Version: fmt.Sprintf("%s (commit: %s, built at: %s)", version, commit, date),
+		Args:          cobra.ArbitraryArgs,
+		SilenceUsage:  true,
+		SilenceErrors: true,
+		Version:       fmt.Sprintf("%s (commit: %s, built at: %s)", version, commit, date),
 		RunE: func(cmd *cobra.Command, args []string) error {
-			eng := engine.New()
+			isJSON := jsonMode || format == "json"
+
+			if diffMode {
+				emitCLIError(isJSON, "--diff mode is not supported; use full scan", args, version, commit, date)
+			}
 
+			if jsonMode && format == "azure" {
+				emitCLIError(true, "--json cannot be combined with -f azure", args, version, commit, date)
+			}
+			if cmd.Flags().Changed("output") && (jsonMode || format == "json" || format == "azure") {
+				emitCLIError(isJSON, "--output is only supported with console format", args, version, commit, date)
+			}
 			if format != "console" && format != "json" && format != "azure" {
-				return fmt.Errorf("unsupported output format %q: must be console, json, or azure", format)
+				emitCLIError(isJSON, fmt.Sprintf("unsupported output format %q: must be console, json, or azure", format), args, version, commit, date)
 			}
 
+			eng := engine.New()
+
 			opts := engine.Options{
 				TargetPaths: args,
 				DiffOnly:    diffMode,
 				ScanAll:     allMode,
+				AllowEmpty:  allowEmpty,
+				Version:     version,
+				Commit:      commit,
+				Date:        date,
 			}
 
 			var progress *reporter.ProgressReporter
-			if !jsonMode && format != "json" {
+			if !isJSON {
 				progress = reporter.NewProgressReporter(os.Stderr)
 				opts.ProgressFn = progress.Update
 			}
@@ -81,68 +232,64 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
 				progress.Finish()
 			}
 			if err != nil {
-				fmt.Fprintf(os.Stderr, "Error: %v\n", err)
-				os.Exit(2)
+				emitCLIError(isJSON, err.Error(), args, version, commit, date)
 			}
 
-			hasBlockers := false
-			for _, v := range res.Violations {
-				if v.Severity == models.SeverityBlocker {
-					hasBlockers = true
-					break
-				}
-			}
+			report := res.Report
 
-			// CLIG: Support --json direct flag or -f json
-			if jsonMode || format == "json" {
-				if err := reporter.WriteJSONReport(os.Stdout, res.Violations); err != nil {
-					return err
+			if isJSON {
+				if err := reporter.WriteJSONReport(os.Stdout, report); err != nil {
+					fmt.Fprintf(os.Stderr, "Error writing JSON report: %v\n", err)
+					os.Exit(2)
 				}
-				if hasBlockers {
-					os.Exit(1)
-				}
-				return nil
+				os.Exit(report.ExitCode)
 			}
-
 			if format == "azure" {
 				r := reporter.NewAzureReporter(os.Stdout)
-				r.Render(res.Violations)
-				if hasBlockers {
-					os.Exit(1)
+				if _, err := r.Render(report); err != nil {
+					fmt.Fprintf(os.Stderr, "Error: stdout write failure: %v\n", err)
+					os.Exit(2)
 				}
-				return nil
+				os.Exit(report.ExitCode)
 			}
 
 			// Default terminal scorecard
-			term := reporter.NewTerminalReporter(os.Stdout)
 			outPath := outputFile
 			if outPath == "" {
 				outPath = ".testguard/report.md"
 			}
-			exitCode := term.RenderWithOptions(res.Violations, res.ScannedFiles, res.ParseErrors, res.Skipped, reporter.TerminalOptions{
+			if err := reporter.WriteMarkdownReport(outPath, report); err != nil {
+				report.Analysis.Status = "error"
+				report.Analysis.Reason = "output_failure"
+				report.ExitCode = 2
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("output_failed", outPath, err.Error()))
+				fmt.Fprintf(os.Stderr, "Error: failed writing markdown report: %v\n", err)
+			}
+
+			term := reporter.NewTerminalReporter(os.Stdout)
+			if _, err := term.RenderWithOptions(report, reporter.TerminalOptions{
 				SummaryOnly: summaryMode,
 				MaxDisplay:  topIssues,
 				ReportPath:  outPath,
-			})
-			_ = reporter.WriteMarkdownReport(outPath, res.Violations, res.ScannedFiles, res.ParseErrors, res.Skipped)
-
-			if exitCode != 0 {
-				os.Exit(exitCode)
+			}); err != nil {
+				fmt.Fprintf(os.Stderr, "Error: stdout write failure: %v\n", err)
+				os.Exit(2)
 			}
 
+			os.Exit(report.ExitCode)
 			return nil
 		},
 	}
 
 	// Flags
-	rootCmd.Flags().BoolVarP(&diffMode, "diff", "d", false, "Scan only modified test files against base branch")
+	rootCmd.Flags().BoolVarP(&diffMode, "diff", "d", false, "Scan only modified test files against base branch (unsupported)")
 	rootCmd.Flags().BoolVarP(&allMode, "all", "a", false, "Scan all test files in the workspace")
+	rootCmd.Flags().BoolVar(&allowEmpty, "allow-empty", false, "Allow empty test scope (exit 3 not_applicable)")
 	rootCmd.Flags().BoolVar(&jsonMode, "json", false, "Output machine-readable JSON (equivalent to -f json)")
 	rootCmd.Flags().StringVarP(&format, "format", "f", "console", "Output format: console, json, azure")
 	rootCmd.Flags().StringVarP(&outputFile, "output", "o", "", "Path to export markdown scorecard (default: .testguard/report.md)")
 	rootCmd.Flags().BoolVarP(&summaryMode, "summary", "s", false, "Output high-level monorepo/module summary without file dumps")
 	rootCmd.Flags().IntVar(&topIssues, "top", 10, "Maximum number of individual findings to display in terminal")
-
 	// Subcommand: explain
 	explainCmd := &cobra.Command{
 		Use:   "explain <rule-id>",
@@ -253,6 +400,11 @@ languages:
 	rootCmd.AddCommand(initCmd)
 
 	if err := rootCmd.Execute(); err != nil {
-		os.Exit(2)
+		if jsonRequested, paths := classifyScanInvocation(rootCmd, os.Args[1:]); jsonRequested {
+			emitCLIError(true, err.Error(), paths, version, commit, date)
+		} else {
+			fmt.Fprintf(os.Stderr, "Error: %s\n", err.Error())
+			os.Exit(2)
+		}
 	}
 }


## Added cmd/testguard/main_test.go
sha256=3a94737b49b0d58828532776267f4e6e6493ba733ae09facdd12d6836438a26d

package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func helperProcess(t *testing.T, args ...string) (string, string, int) {
	t.Helper()
	cs := []string{"-test.run=TestHelperProcess", "--"}
	cs = append(cs, args...)
	cmd := exec.Command(os.Args[0], cs...)
	cmd.Env = append(os.Environ(), "GO_WANT_HELPER_PROCESS=1")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			t.Fatalf("unexpected process execution failure: %v", err)
		}
	}
	return stdout.String(), stderr.String(), exitCode
}

func TestHelperProcess(t *testing.T) {
	if os.Getenv("GO_WANT_HELPER_PROCESS") != "1" {
		return
	}
	args := os.Args
	for i, arg := range args {
		if arg == "--" {
			args = args[i+1:]
			break
		}
	}
	os.Args = append([]string{"testguard"}, args...)
	main()
}

func TestCLIDiffModeRejected(t *testing.T) {
	stdout, stderr, exitCode := helperProcess(t, "--diff")
	if exitCode != 2 {
		t.Errorf("expected exit code 2 for --diff, got %d (stderr: %s)", exitCode, stderr)
	}
	if !strings.Contains(stderr, "--diff mode is not supported; use full scan") {
		t.Errorf("expected rejection message in stderr, got %q", stderr)
	}
	if stdout != "" {
		t.Errorf("expected empty stdout for console error, got %q", stdout)
	}
}

func TestCLIJsonDiffModeEnvelope(t *testing.T) {
	stdout, _, exitCode := helperProcess(t, "--diff", "--json")
	if exitCode != 2 {
		t.Errorf("expected exit code 2, got %d", exitCode)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &parsed); err != nil {
		t.Fatalf("stdout must be valid JSON: %v (raw: %s)", err, stdout)
	}

	if parsed["schema_version"] != float64(1) {
		t.Errorf("expected schema_version 1, got %v", parsed["schema_version"])
	}
	analysis, ok := parsed["analysis"].(map[string]interface{})
	if !ok || analysis["status"] != "error" || analysis["reason"] != "invalid_usage" {
		t.Errorf("expected analysis status=error, reason=invalid_usage, got %+v", parsed["analysis"])
	}
	if parsed["exit_code"] != float64(2) {
		t.Errorf("expected exit_code 2, got %v", parsed["exit_code"])
	}
}

func TestCLIJsonWithAzureRejected(t *testing.T) {
	stdout, _, exitCode := helperProcess(t, "--json", "-f", "azure")
	if exitCode != 2 {
		t.Errorf("expected exit code 2, got %d", exitCode)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &parsed); err != nil {
		t.Fatalf("stdout must be valid JSON: %v", err)
	}
	if parsed["exit_code"] != float64(2) {
		t.Errorf("expected exit_code 2, got %v", parsed["exit_code"])
	}
}

func TestCLIOutputWithJsonRejected(t *testing.T) {
	// 1. Non-empty output
	_, _, exitCode := helperProcess(t, "--output", "report.md", "--json")
	if exitCode != 2 {
		t.Errorf("expected exit code 2, got %d", exitCode)
	}
	// 2. Explicitly empty output (R8)
	stdoutEmpty, _, exitCodeEmpty := helperProcess(t, "--output=", "--json")
	if exitCodeEmpty != 2 {
		t.Errorf("expected exit code 2 for --output=, got %d", exitCodeEmpty)
	}
	var parsedEmpty map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(stdoutEmpty)), &parsedEmpty); err != nil {
		t.Fatalf("stdout must be valid JSON: %v", err)
	}
	if parsedEmpty["exit_code"] != float64(2) {
		t.Errorf("expected exit_code 2, got %v", parsedEmpty["exit_code"])
	}

	// 3. Azure with short empty output (R8)
	_, stderrAzure, exitCodeAzure := helperProcess(t, "-f", "azure", "-o", "")
	if exitCodeAzure != 2 {
		t.Errorf("expected exit code 2 for azure with -o '', got %d", exitCodeAzure)
	}
	if !strings.Contains(stderrAzure, "--output is only supported with console format") {
		t.Errorf("expected output error in stderr for azure, got %q", stderrAzure)
	}
}

func TestCLIPreRunEParserClassification(t *testing.T) {
	cases := []struct {
		name      string
		args      []string
		wantJSON  bool
		wantPaths []string
	}{
		{"json-first", []string{"--json", "--unknown-flag-123"}, true, []string{"."}},
		{"json-last", []string{"--unknown-flag-123", "--json"}, true, []string{"."}},
		{"format-value", []string{"-f", "json", "--top", "not-a-number"}, true, []string{"."}},
		{"format-attached", []string{"-fjson", "--top", "not-a-number"}, true, []string{"."}},
		{"format-equals-missing-value", []string{"--format=json", "--format"}, true, []string{"."}},
		{"invalid-json-bool", []string{"--json=invalid-bool"}, true, []string{"."}},
		{"json-path-preserved", []string{"--json", "fixtures/not_there", "--unknown-flag-123"}, true, []string{"fixtures/not_there"}},
		{"output-operand-is-not-a-command", []string{"--output", "rules", "--json", "--unknown-flag-123"}, true, []string{"."}},
		{"json-consumed-as-output-operand", []string{"--output", "--json", "--unknown-flag-123"}, false, nil},
		{"false-bool-word", []string{"--json=FALSE", "--unknown-flag-123"}, false, nil},
		{"false-bool-zero", []string{"--json=0", "--unknown-flag-123"}, false, nil},
		{"boolean-cluster-with-attached-value", []string{"-sfjson", "--top", "not-a-number"}, true, []string{"."}},
		{"boolean-cluster-value-operand-is-not-json", []string{"-so", "--json", "--unknown-flag-123"}, false, nil},
		{"boolean-cluster-with-equals-value", []string{"-sf=json", "--top", "not-a-number"}, true, []string{"."}},
		{"equals-attached-output-operand-is-not-json", []string{"-so=--json", "--unknown-flag-123"}, false, nil},
		{"boolean-equals-value", []string{"-s=false", "--unknown-flag-123"}, false, nil},
		{"standalone-shorthand-equals-value", []string{"-f=json", "--top", "not-a-number"}, true, []string{"."}},
		{"non-scan-command-selected", []string{"-f", "json", "explain", "NOT-A-RULE-ID"}, false, nil},
	}

	for _, tc := range cases {
		stdout, stderr, exitCode := helperProcess(t, tc.args...)
		if exitCode != 2 {
			t.Errorf("%s: expected exit code 2, got %d (stderr: %s)", tc.name, exitCode, stderr)
		}
		if !tc.wantJSON {
			if stdout != "" {
				t.Errorf("%s: expected stderr-only error, got stdout %q", tc.name, stdout)
			}
			if stderr == "" {
				t.Errorf("%s: expected a visible error on stderr", tc.name)
			}
			continue
		}
		if !strings.HasSuffix(stdout, "\n") || strings.Count(stdout, "\n") != 1 {
			t.Errorf("%s: expected exactly one newline-terminated object, got %q", tc.name, stdout)
			continue
		}

		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &parsed); err != nil {
			t.Errorf("%s: stdout must be valid JSON: %v (raw: %s)", tc.name, err, stdout)
			continue
		}
		if parsed["schema_version"] != float64(1) || parsed["exit_code"] != float64(2) {
			t.Errorf("%s: expected schema_version 1 and exit_code 2, got %v/%v", tc.name, parsed["schema_version"], parsed["exit_code"])
		}
		analysis, ok := parsed["analysis"].(map[string]interface{})
		if !ok || analysis["status"] != "error" || analysis["reason"] != "invalid_usage" {
			t.Errorf("%s: expected status=error, reason=invalid_usage, got %+v", tc.name, parsed["analysis"])
		}

		scope, ok := parsed["scope"].(map[string]interface{})
		if !ok {
			t.Errorf("%s: missing scope object in envelope", tc.name)
			continue
		}
		rawPaths, _ := scope["requested_paths"].([]interface{})
		gotPaths := make([]string, 0, len(rawPaths))
		for _, p := range rawPaths {
			s, _ := p.(string)
			gotPaths = append(gotPaths, s)
		}
		if len(gotPaths) != len(tc.wantPaths) {
			t.Errorf("%s: expected requested_paths %v, got %v", tc.name, tc.wantPaths, gotPaths)
			continue
		}
		for i := range gotPaths {
			if gotPaths[i] != tc.wantPaths[i] {
				t.Errorf("%s: expected requested_paths %v, got %v", tc.name, tc.wantPaths, gotPaths)
				break
			}
		}
	}
}

func TestCLIConsoleMarkdownWriteFailureExits2(t *testing.T) {
	tmpDir := t.TempDir()
	_ = os.WriteFile(filepath.Join(tmpDir, "sample_test.go"), []byte("package test\nimport \"testing\"\nfunc TestSample(t *testing.T) {\n  _ = 1 + 1\n}\n"), 0644)

	blockedPath := filepath.Join(tmpDir, "blocked")
	_ = os.WriteFile(blockedPath, []byte("not a directory"), 0644)
	outPath := filepath.Join(blockedPath, "report.md")

	stdout, stderr, exitCode := helperProcess(t, "--output", outPath, tmpDir)
	if exitCode != 2 {
		t.Errorf("expected exit code 2 on markdown output failure, got %d (stderr: %s)", exitCode, stderr)
	}
	if !strings.Contains(stderr, "failed writing markdown report") {
		t.Errorf("expected markdown write failure on stderr, got %q", stderr)
	}
	if !strings.Contains(stdout, "ERROR (error/output_failure)") {
		t.Errorf("expected console to report error/output_failure instead of a pass, got %q", stdout)
	}
	if !strings.Contains(stdout, "1 Blocker(s)") {
		t.Errorf("expected collected blocker findings to survive the output failure, got %q", stdout)
	}
}

func TestCLIConsoleExportFailureSuppressesArtifactClaim(t *testing.T) {
	tmpDir := t.TempDir()
	for name, body := range map[string]string{
		"a_test.go": "package test\nimport \"testing\"\nfunc TestA(t *testing.T) {\n  _ = 1 + 1\n}\n",
		"b_test.go": "package test\nimport \"testing\"\nfunc TestB(t *testing.T) {\n  _ = 2 + 2\n}\n",
	} {
		_ = os.WriteFile(filepath.Join(tmpDir, name), []byte(body), 0644)
	}

	blockedPath := filepath.Join(tmpDir, "blocked")
	_ = os.WriteFile(blockedPath, []byte("not a directory"), 0644)
	outPath := filepath.Join(blockedPath, "report.md")

	cases := []struct {
		name string
		args []string
	}{
		{"summary", []string{"--summary", "--output", outPath, tmpDir}},
		{"truncated", []string{"--top", "1", "--output", outPath, tmpDir}},
	}
	for _, tc := range cases {
		stdout, stderr, exitCode := helperProcess(t, tc.args...)
		if exitCode != 2 {
			t.Errorf("%s: expected exit code 2, got %d (stderr: %s)", tc.name, exitCode, stderr)
		}
		if !strings.Contains(stderr, "failed writing markdown report") {
			t.Errorf("%s: expected markdown write failure on stderr, got %q", tc.name, stderr)
		}
		if !strings.Contains(stdout, "ERROR (error/output_failure)") {
			t.Errorf("%s: expected error/output_failure verdict, got %q", tc.name, stdout)
		}
		if !strings.Contains(stdout, "2 Blocker(s)") {
			t.Errorf("%s: expected retained blocker findings, got %q", tc.name, stdout)
		}
		if strings.Contains(stdout, "written to "+outPath) {
			t.Errorf("%s: failed export must not be advertised as a written artifact, got %q", tc.name, stdout)
		}
	}
}

func TestCLIAzureEscapesNewlineBearingTarget(t *testing.T) {
	target := filepath.Join(t.TempDir(), "missing\n##vso[task.complete result=Succeeded;].go")

	stdout, stderr, exitCode := helperProcess(t, "-f", "azure", target)
	if exitCode != 2 {
		t.Errorf("expected exit code 2 for a missing target, got %d (stderr: %s)", exitCode, stderr)
	}
	if !strings.Contains(stdout, "%0A") || !strings.Contains(stdout, "%3B") || !strings.Contains(stdout, "%5D") {
		t.Errorf("expected encoded newline/semicolon/bracket in Azure output, got %q", stdout)
	}
	for _, line := range strings.Split(strings.TrimSuffix(stdout, "\n"), "\n") {
		if !strings.HasPrefix(line, "##vso[") {
			continue
		}
		if !strings.HasPrefix(line, "##vso[task.logissue type=") {
			t.Errorf("only logissue annotations may be emitted, got line %q", line)
		}
	}
}

func TestCLINonScanCommandErrorPreserved(t *testing.T) {
	stdout, stderr, exitCode := helperProcess(t, "explain", "NOT-A-RULE-ID")
	if exitCode == 0 {
		t.Errorf("expected non-zero exit code for invalid rule ID")
	}
	if !strings.Contains(stderr, "unknown rule ID: NOT-A-RULE-ID") {
		t.Errorf("expected error message in stderr, got %q", stderr)
	}
	if strings.Contains(stdout, "schema_version") {
		t.Errorf("non-scan command must NOT emit JSON scan report")
	}

	// 2. explain without arguments
	_, stderrMissing, exitCodeMissing := helperProcess(t, "explain")
	if exitCodeMissing == 0 {
		t.Errorf("expected non-zero exit code for missing explain argument")
	}
	if stderrMissing == "" {
		t.Errorf("expected visible error in stderr for missing argument")
	}
}

func TestCLIEmptyScopeDisallowed(t *testing.T) {
	tmpDir := t.TempDir()
	stdout, _, exitCode := helperProcess(t, "--json", tmpDir)
	if exitCode != 2 {
		t.Errorf("expected exit code 2 for empty scope without --allow-empty, got %d", exitCode)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &parsed); err != nil {
		t.Fatalf("stdout must be valid JSON: %v", err)
	}
	analysis := parsed["analysis"].(map[string]interface{})
	if analysis["status"] != "incomplete" || analysis["reason"] != "empty_scope" {
		t.Errorf("expected incomplete/empty_scope, got %+v", analysis)
	}

	// Verify empty array [] (R2)
	scope := parsed["scope"].(map[string]interface{})
	if files, ok := scope["files"].([]interface{}); !ok || files == nil {
		t.Errorf("expected scope.files to be empty array [], got %v", scope["files"])
	}
}

func TestCLIEmptyScopeAllowed(t *testing.T) {
	tmpDir := t.TempDir()
	stdout, _, exitCode := helperProcess(t, "--json", "--allow-empty", tmpDir)
	if exitCode != 3 {
		t.Errorf("expected exit code 3 for empty scope with --allow-empty, got %d (stdout: %s)", exitCode, stdout)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &parsed); err != nil {
		t.Fatalf("stdout must be valid JSON: %v", err)
	}
	analysis := parsed["analysis"].(map[string]interface{})
	if analysis["status"] != "not_applicable" || analysis["reason"] != "empty_allowed" {
		t.Errorf("expected not_applicable/empty_allowed, got %+v", analysis)
	}
	if parsed["exit_code"] != float64(3) {
		t.Errorf("expected exit_code 3 in json, got %v", parsed["exit_code"])
	}

	// Verify empty array [] (R2)
	scope := parsed["scope"].(map[string]interface{})
	if files, ok := scope["files"].([]interface{}); !ok || files == nil {
		t.Errorf("expected scope.files to be empty array [], got %v", scope["files"])
	}
}

func TestCLICompleteScanJSON(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "sample_test.go")
	_ = os.WriteFile(testFile, []byte("package test\nimport \"testing\"\nfunc TestSample(t *testing.T){\n  if 1 != 1 { t.Fatal(\"err\") }\n}\n"), 0644)

	stdout, _, exitCode := helperProcess(t, "--json", tmpDir)
	if exitCode != 0 {
		t.Errorf("expected exit code 0, got %d (stdout: %s)", exitCode, stdout)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &parsed); err != nil {
		t.Fatalf("stdout must be valid JSON: %v", err)
	}
	if parsed["schema_version"] != float64(1) {
		t.Errorf("expected schema_version 1, got %v", parsed["schema_version"])
	}
	analysis := parsed["analysis"].(map[string]interface{})
	if analysis["status"] != "complete" || analysis["reason"] != "analyzed" {
		t.Errorf("expected complete/analyzed, got %+v", analysis)
	}
	policy := parsed["policy"].(map[string]interface{})
	if policy["status"] != "no_blocker" || policy["blocker_count"] != float64(0) {
		t.Errorf("expected no_blocker, got %+v", policy)
	}
}

