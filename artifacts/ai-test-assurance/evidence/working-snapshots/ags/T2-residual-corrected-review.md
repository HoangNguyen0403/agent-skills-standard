# Immutable review snapshot T2-residual-corrected

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance
Base: 8fc53b4c683d312359166e49e397fa887dd0ac92
Captured: 2026-10-26T23:01:25.949Z

## Tracked diff

diff --git a/cmd/testguard/main.go b/cmd/testguard/main.go
index 36ef75c..ba85048 100644
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
 
@@ -19,9 +21,121 @@ var (
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
+		name := strings.TrimLeft(arg, "-")
+		value := ""
+		hasValue := false
+		if eq := strings.Index(name, "="); eq >= 0 {
+			name, value, hasValue = name[:eq], name[eq+1:], true
+		} else if !longForm && len(name) > 1 {
+			// Cobra accepts an attached shorthand value (-fjson).
+			name, value, hasValue = name[:1], name[1:], true
+		}
+
+		var flagName, noOptDefVal string
+		known := false
+		if longForm {
+			if f := flags.Lookup(name); f != nil {
+				flagName, noOptDefVal, known = f.Name, f.NoOptDefVal, true
+			}
+		} else if f := flags.ShorthandLookup(name); f != nil {
+			flagName, noOptDefVal, known = f.Name, f.NoOptDefVal, true
+		}
+		if !known {
+			// Unknown flags abort parsing; their operand cannot be attributed
+			// safely, so only the token itself is consumed.
+			continue
+		}
+		if !hasValue {
+			switch {
+			case noOptDefVal != "":
+				value = noOptDefVal
+			case i+1 < len(args):
+				i++
+				value = args[i]
+			default:
+				// Missing operands are parse errors; there is no value to
+				// attribute to this flag.
+				continue
+			}
+		}
+
+		switch flagName {
+		case "json":
+			if parsed, perr := strconv.ParseBool(value); perr == nil {
+				jsonFlag = parsed
+			} else {
+				// Invalid boolean spellings still name JSON mode: the parse
+				// error they cause must be reported inside the JSON envelope.
+				jsonFlag = true
+			}
+		case "format":
+			format = value
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
@@ -50,23 +164,41 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
 
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
@@ -81,68 +213,64 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
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
-				}
-				if hasBlockers {
-					os.Exit(1)
+			if isJSON {
+				if err := reporter.WriteJSONReport(os.Stdout, report); err != nil {
+					fmt.Fprintf(os.Stderr, "Error writing JSON report: %v\n", err)
+					os.Exit(2)
 				}
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
@@ -253,6 +381,11 @@ languages:
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
diff --git a/pkg/reporter/azure.go b/pkg/reporter/azure.go
index d2bd325..247513f 100644
--- a/pkg/reporter/azure.go
+++ b/pkg/reporter/azure.go
@@ -6,10 +6,35 @@ import (
 	"io"
 	"os"
 	"path/filepath"
+	"strings"
 
 	"github.com/HoangNguyen0403/testguard/pkg/models"
 )
 
+var (
+	// azurePropertyReplacer encodes values used inside a ##vso[...] property list.
+	azurePropertyReplacer = strings.NewReplacer(
+		"%", "%25",
+		"\r", "%0D",
+		"\n", "%0A",
+		";", "%3B",
+		"]", "%5D",
+	)
+	// azureMessageReplacer encodes the message body of a logging command so
+	// literal line breaks cannot start another command line.
+	azureMessageReplacer = strings.NewReplacer(
+		"%", "%25",
+		"\r", "%0D",
+		"\n", "%0A",
+	)
+)
+
+// escapeAzureProperty encodes Azure logging-command property content.
+func escapeAzureProperty(value string) string { return azurePropertyReplacer.Replace(value) }
+
+// escapeAzureMessage encodes Azure logging-command message content.
+func escapeAzureMessage(value string) string { return azureMessageReplacer.Replace(value) }
+
 // AzureReporter outputs Azure DevOps logging commands for PR inline annotations.
 type AzureReporter struct {
 	out io.Writer
@@ -20,57 +45,156 @@ func NewAzureReporter(out io.Writer) *AzureReporter {
 	return &AzureReporter{out: out}
 }
 
-// Render writes ##vso[task.logissue] commands for Azure Pipelines.
-func (r *AzureReporter) Render(violations []models.Violation) {
-	for _, v := range violations {
+// Render writes ##vso[task.logissue] commands for Azure Pipelines based on the ScanReport contract.
+func (r *AzureReporter) Render(report *models.ScanReport) (int, error) {
+	if report == nil {
+		return 2, fmt.Errorf("scan report is nil")
+	}
+
+	var writeErr error
+	printf := func(format string, a ...interface{}) {
+		if writeErr != nil {
+			return
+		}
+		_, writeErr = fmt.Fprintf(r.out, format, a...)
+	}
+
+	// 1. Explicit status and reason summary for every verdict (R10)
+	printf("TestGuard audit status: %s (%s)\n", report.Analysis.Status, report.Analysis.Reason)
+
+	// emitIssue renders one logissue command; dynamic content is escaped so it
+	// can never terminate the property list or start another command line.
+	emitIssue := func(props, message string) {
+		printf("##vso[task.logissue %s]%s\n", props, escapeAzureMessage(message))
+	}
+
+	// 2. Diagnostics as error annotations on incomplete or error
+	if report.Analysis.Status == "incomplete" || report.Analysis.Status == "error" {
+		emitIssue("type=error", fmt.Sprintf("TestGuard audit %s (%s)", report.Analysis.Status, report.Analysis.Reason))
+		for _, d := range report.Diagnostics {
+			props := "type=error"
+			if d.Path != nil && *d.Path != "" {
+				props += ";sourcepath=" + escapeAzureProperty(*d.Path)
+			}
+			emitIssue(props, d.Code+": "+d.Message)
+		}
+	} else if report.Analysis.Status == "not_applicable" {
+		// Summary on not_applicable; MUST NOT emit task-success commands
+		printf("TestGuard audit not applicable: %s (exit 3)\n", report.Analysis.Reason)
+	}
+
+	// 3. Findings
+	for _, v := range report.Findings {
 		issueType := "warning"
 		if v.Severity == models.SeverityBlocker {
 			issueType = "error"
 		}
-		fmt.Fprintf(r.out, "##vso[task.logissue type=%s;sourcepath=%s;linenumber=%d]%s\n",
-			issueType, v.FilePath, v.LineNumber, v.Message)
+		props := fmt.Sprintf("type=%s;sourcepath=%s;linenumber=%d", issueType, escapeAzureProperty(v.FilePath), v.LineNumber)
+		emitIssue(props, v.Message)
 	}
+
+	if writeErr != nil {
+		return 2, writeErr
+	}
+	return report.ExitCode, nil
+}
+
+// createReportFile opens the Markdown report destination. Tests override it to
+// inject deterministic open/write/close failures (same pattern as the engine
+// fault-injection hooks) because permission tricks are not portable.
+var createReportFile = func(filePath string) (io.WriteCloser, error) {
+	return os.Create(filePath)
 }
 
 // WriteMarkdownReport writes a detailed markdown scorecard to .testguard/report.md.
-func WriteMarkdownReport(filePath string, violations []models.Violation, scannedFiles, parseErrors, skipped int) error {
-	dir := filepath.Dir(filePath)
-	if err := os.MkdirAll(dir, 0755); err != nil {
+func WriteMarkdownReport(filePath string, report *models.ScanReport) error {
+	if report == nil {
+		return fmt.Errorf("scan report is nil")
+	}
+
+	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
 		return err
 	}
 
-	f, err := os.Create(filePath)
+	f, err := createReportFile(filePath)
 	if err != nil {
 		return err
 	}
-	defer f.Close()
-
-	fmt.Fprintf(f, "# 🛡️ TestGuard Audit Report\n\n")
-	fmt.Fprintf(f, "- **Scanned Files**: %d\n", scannedFiles)
-	fmt.Fprintf(f, "- **Total Violations**: %d\n\n", len(violations))
-	fmt.Fprintf(f, "| Severity | Rule ID | Location | Message |\n")
-	fmt.Fprintf(f, "|---|---|---|---|\n")
-
-	for _, v := range violations {
-		badge := "💡 Advisory"
-		switch v.Severity {
-		case models.SeverityBlocker:
-			badge = "🚨 Blocker"
-		case models.SeverityWarning:
-			badge = "⚠️ Warning"
+	writeErr := writeMarkdown(f, report)
+	closeErr := f.Close()
+	if writeErr != nil {
+		return writeErr
+	}
+	return closeErr
+}
+
+// writeMarkdown renders the markdown scorecard, surfacing the first write error.
+func writeMarkdown(out io.Writer, report *models.ScanReport) error {
+	var writeErr error
+	printf := func(format string, a ...interface{}) {
+		if writeErr != nil {
+			return
+		}
+		_, writeErr = fmt.Fprintf(out, format, a...)
+	}
+
+	printf("# 🛡️ TestGuard Audit Report\n\n")
+	printf("- **Status**: %s (%s)\n", report.Analysis.Status, report.Analysis.Reason)
+	printf("- **Scanned Files**: %d\n", report.Analysis.AnalyzedFiles)
+	printf("- **Analyzed Tests**: %d\n", report.Analysis.AnalyzedTests)
+	printf("- **Failed Files**: %d\n", report.Analysis.FailedFiles)
+	printf("- **Total Violations**: %d\n", len(report.Findings))
+	printf("- **Exit Code**: %d\n\n", report.ExitCode)
+
+	if len(report.Diagnostics) > 0 {
+		printf("## Diagnostics\n\n")
+		printf("| Code | Path | Message |\n")
+		printf("|---|---|---|\n")
+		for _, d := range report.Diagnostics {
+			p := "-"
+			if d.Path != nil && *d.Path != "" {
+				p = fmt.Sprintf("`%s`", *d.Path)
+			}
+			printf("| `%s` | %s | %s |\n", d.Code, p, d.Message)
 		}
-		fmt.Fprintf(f, "| %s | `%s` | `%s:%d` | %s |\n", badge, v.RuleID, v.FilePath, v.LineNumber, v.Message)
+		printf("\n")
 	}
 
+	if len(report.Findings) > 0 {
+		printf("## Violations\n\n")
+		printf("| Severity | Rule ID | Location | Message |\n")
+		printf("|---|---|---|---|\n")
+
+		for _, v := range report.Findings {
+			badge := "💡 Advisory"
+			switch v.Severity {
+			case models.SeverityBlocker:
+				badge = "🚨 Blocker"
+			case models.SeverityWarning:
+				badge = "⚠️ Warning"
+			}
+			printf("| %s | `%s` | `%s:%d` | %s |\n", badge, v.RuleID, v.FilePath, v.LineNumber, v.Message)
+		}
+	}
+
+	if writeErr != nil {
+		return writeErr
+	}
 	return nil
 }
 
-// WriteJSONReport writes the violations as formatted JSON to a writer.
-func WriteJSONReport(out io.Writer, violations []models.Violation) error {
-	if violations == nil {
-		violations = []models.Violation{}
+// WriteJSONReport writes the ScanReport as exactly one UTF-8 JSON object plus newline.
+func WriteJSONReport(out io.Writer, report *models.ScanReport) error {
+	if report == nil {
+		report = models.NewScanReport()
+	}
+	data, err := json.Marshal(report)
+	if err != nil {
+		return err
+	}
+	if _, err := out.Write(data); err != nil {
+		return err
 	}
-	enc := json.NewEncoder(out)
-	enc.SetIndent("", "  ")
-	return enc.Encode(violations)
+	_, err = out.Write([]byte("\n"))
+	return err
 }
diff --git a/pkg/reporter/reporter_test.go b/pkg/reporter/reporter_test.go
index 2f45424..0807384 100644
--- a/pkg/reporter/reporter_test.go
+++ b/pkg/reporter/reporter_test.go
@@ -2,6 +2,10 @@ package reporter_test
 
 import (
 	"bytes"
+	"encoding/json"
+	"errors"
+	"os"
+	"path/filepath"
 	"strings"
 	"testing"
 
@@ -9,6 +13,24 @@ import (
 	"github.com/HoangNguyen0403/testguard/pkg/reporter"
 )
 
+type errWriter struct {
+	failAfter int
+	written   int
+}
+
+func (w *errWriter) Write(p []byte) (n int, err error) {
+	if w.written >= w.failAfter {
+		return 0, errors.New("simulated io error")
+	}
+	remaining := w.failAfter - w.written
+	if len(p) > remaining {
+		w.written += remaining
+		return remaining, errors.New("simulated io error")
+	}
+	w.written += len(p)
+	return len(p), nil
+}
+
 func TestTerminalReporterTotalsFirst(t *testing.T) {
 	violations := []models.Violation{
 		{
@@ -31,24 +53,33 @@ func TestTerminalReporterTotalsFirst(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Analysis.Status = "complete"
+	report.Analysis.Reason = "analyzed"
+	report.Findings = violations
+	report.Analysis.AnalyzedFiles = 10
+	report.Policy.BlockerCount = 1
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewTerminalReporter(&buf)
-	exitCode := r.Render(violations, 10, 0, 0)
+	exitCode, err := r.Render(report)
+	if err != nil {
+		t.Fatalf("unexpected render error: %v", err)
+	}
 
 	out := buf.String()
 	if exitCode != 1 {
 		t.Errorf("expected exit code 1 when Blocker exists, got %d", exitCode)
 	}
 
-	// Totals must precede findings
-	if !strings.Contains(out, "TestGuard Audit") {
-		t.Errorf("expected header line with 'TestGuard Audit' in output")
+	if !strings.Contains(out, "FAILED (complete/analyzed)") {
+		t.Errorf("expected exact status FAILED (complete/analyzed) in output, got: %s", out)
 	}
 	if !strings.Contains(out, "1 Blocker") || !strings.Contains(out, "1 Warning") {
 		t.Errorf("expected total counts in output")
 	}
-
-	// Must include path:line:col format
 	if !strings.Contains(out, "test/math_test.dart:15:5") {
 		t.Errorf("expected path:line:col format in output")
 	}
@@ -65,14 +96,111 @@ func TestAzureDevOpsLogger(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Analysis.Status = "complete"
+	report.Analysis.Reason = "analyzed"
+	report.Findings = violations
+	report.Policy.BlockerCount = 1
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewAzureReporter(&buf)
-	r.Render(violations)
+	exitCode, err := r.Render(report)
+	if err != nil {
+		t.Fatalf("unexpected render error: %v", err)
+	}
+	if exitCode != 1 {
+		t.Errorf("expected exit code 1, got %d", exitCode)
+	}
 
 	out := buf.String()
-	expected := "##vso[task.logissue type=error;sourcepath=test/math_test.dart;linenumber=15]Zero assertions found in test.\n"
-	if out != expected {
-		t.Errorf("expected %q, got %q", expected, out)
+	if !strings.Contains(out, "TestGuard audit status: complete (analyzed)\n") {
+		t.Errorf("expected audit status line in Azure output, got %q", out)
+	}
+	if !strings.Contains(out, "##vso[task.logissue type=error;sourcepath=test/math_test.dart;linenumber=15]Zero assertions found in test.\n") {
+		t.Errorf("expected error logissue in Azure output, got %q", out)
+	}
+}
+
+func TestAzureReporterCompleteNoFindingsNamesStatus(t *testing.T) {
+	report := models.NewScanReport()
+	report.Analysis.Status = "complete"
+	report.Analysis.Reason = "analyzed"
+	report.ExitCode = 0
+
+	var buf bytes.Buffer
+	exitCode, err := reporter.NewAzureReporter(&buf).Render(report)
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if exitCode != 0 {
+		t.Errorf("expected exit code 0, got %d", exitCode)
+	}
+	out := buf.String()
+	if !strings.Contains(out, "TestGuard audit status: complete (analyzed)\n") {
+		t.Errorf("expected audit status line for a clean complete scan, got %q", out)
+	}
+	if strings.Contains(out, "##vso[") {
+		t.Errorf("clean complete scan must not emit annotations, got %q", out)
+	}
+}
+
+func TestAzureReporterEscapesDynamicContent(t *testing.T) {
+	evilPath := "test/a_test.go\n##vso[task.complete result=Succeeded;]"
+	evilMessage := "50%\r\n##vso[task.complete result=Succeeded;]"
+
+	report := models.NewScanReport()
+	report.Analysis.Status = "incomplete"
+	report.Analysis.Reason = "input_failure"
+	report.ExitCode = 2
+	report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("target_unreadable", evilPath, evilMessage))
+	report.Findings = append(report.Findings, models.Violation{
+		RuleID:     "GUARD-UNIV-ZERO",
+		Severity:   models.SeverityBlocker,
+		FilePath:   evilPath,
+		LineNumber: 3,
+		Message:    evilMessage,
+	})
+
+	var buf bytes.Buffer
+	exitCode, err := reporter.NewAzureReporter(&buf).Render(report)
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if exitCode != 2 {
+		t.Errorf("expected exit code 2, got %d", exitCode)
+	}
+
+	out := buf.String()
+	if strings.Contains(out, "\r") || strings.Contains(out, "\n##vso[task.complete") {
+		t.Errorf("line breaks in dynamic data must not start new command lines, got %q", out)
+	}
+
+	lines := strings.Split(strings.TrimSuffix(out, "\n"), "\n")
+	// status summary, audit-error annotation, diagnostic annotation, finding annotation
+	if len(lines) != 4 {
+		t.Errorf("expected 4 output lines, got %d (%q)", len(lines), out)
+	}
+	commands := 0
+	for _, line := range lines {
+		if !strings.HasPrefix(line, "##vso[") {
+			continue
+		}
+		commands++
+		if !strings.HasPrefix(line, "##vso[task.logissue type=") {
+			t.Errorf("only logissue annotations may be emitted, got line %q", line)
+		}
+	}
+	if commands != 3 {
+		t.Errorf("expected 3 logissue commands, got %d (%q)", commands, out)
+	}
+
+	if !strings.Contains(out, "sourcepath=test/a_test.go%0A##vso[task.complete result=Succeeded%3B%5D]") {
+		t.Errorf("expected escaped sourcepath property, got %q", out)
+	}
+	if !strings.Contains(out, "50%25%0D%0A##vso[task.complete result=Succeeded;]") {
+		t.Errorf("expected escaped message body, got %q", out)
 	}
 }
 
@@ -101,12 +229,24 @@ func TestTerminalReporterMonorepoBreakdown(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Analysis.Status = "complete"
+	report.Analysis.Reason = "analyzed"
+	report.Findings = violations
+	report.Analysis.AnalyzedFiles = 100
+	report.Policy.BlockerCount = 2
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewTerminalReporter(&buf)
-	exitCode := r.RenderWithOptions(violations, 100, 0, 0, reporter.TerminalOptions{
+	exitCode, err := r.RenderWithOptions(report, reporter.TerminalOptions{
 		SummaryOnly: false,
 		MaxDisplay:  10,
 	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
 
 	out := buf.String()
 	if exitCode != 1 {
@@ -123,6 +263,38 @@ func TestTerminalReporterMonorepoBreakdown(t *testing.T) {
 	}
 }
 
+func TestTerminalReporterCompleteCleanAndOutputFailure(t *testing.T) {
+	cases := []struct {
+		name   string
+		status string
+		reason string
+		exit   int
+		want   string
+	}{
+		{"complete-clean", "complete", "analyzed", 0, "PASSED (complete/analyzed)"},
+		{"output-failure", "error", "output_failure", 2, "ERROR (error/output_failure)"},
+	}
+
+	for _, tc := range cases {
+		report := models.NewScanReport()
+		report.Analysis.Status = tc.status
+		report.Analysis.Reason = tc.reason
+		report.ExitCode = tc.exit
+
+		var buf bytes.Buffer
+		exitCode, err := reporter.NewTerminalReporter(&buf).Render(report)
+		if err != nil {
+			t.Fatalf("%s: unexpected error: %v", tc.name, err)
+		}
+		if exitCode != tc.exit {
+			t.Errorf("%s: expected exit code %d, got %d", tc.name, tc.exit, exitCode)
+		}
+		if !strings.Contains(buf.String(), tc.want) {
+			t.Errorf("%s: expected exact status %q, got %s", tc.name, tc.want, buf.String())
+		}
+	}
+}
+
 func TestTerminalReporterSummaryOnly(t *testing.T) {
 	violations := []models.Violation{
 		{
@@ -134,18 +306,326 @@ func TestTerminalReporterSummaryOnly(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Analysis.Status = "complete"
+	report.Analysis.Reason = "analyzed"
+	report.Findings = violations
+	report.Analysis.AnalyzedFiles = 10
+	report.Policy.BlockerCount = 1
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewTerminalReporter(&buf)
-	_ = r.RenderWithOptions(violations, 10, 0, 0, reporter.TerminalOptions{
+	exitCode, err := r.RenderWithOptions(report, reporter.TerminalOptions{
 		SummaryOnly: true,
 		ReportPath:  ".testguard/custom-report.md",
 	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if exitCode != 1 {
+		t.Errorf("expected exit code 1, got %d", exitCode)
+	}
 
 	out := buf.String()
-	if !strings.Contains(out, "Summary mode: Full detailed violations written to .testguard/custom-report.md") {
-		t.Errorf("expected summary mode message, got: %s", out)
+	if !strings.Contains(out, ".testguard/custom-report.md") {
+		t.Errorf("expected summary mode to reference the report path, got: %s", out)
 	}
 	if strings.Contains(out, "KEY FINDINGS") {
 		t.Errorf("expected KEY FINDINGS to be omitted in SummaryOnly mode")
 	}
 }
+
+func TestTerminalReporterNotApplicable(t *testing.T) {
+	report := models.NewScanReport()
+	report.Analysis.Status = "not_applicable"
+	report.Analysis.Reason = "empty_allowed"
+	report.ExitCode = 3
+
+	var buf bytes.Buffer
+	r := reporter.NewTerminalReporter(&buf)
+	exitCode, err := r.Render(report)
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	if exitCode != 3 {
+		t.Errorf("expected exit code 3 for not_applicable, got %d", exitCode)
+	}
+
+	out := buf.String()
+	if !strings.Contains(out, "NOT APPLICABLE (not_applicable/empty_allowed)") {
+		t.Errorf("expected Status: NOT APPLICABLE (not_applicable/empty_allowed), got %s", out)
+	}
+}
+
+func TestTerminalReporterIncompleteDiagnostics(t *testing.T) {
+	report := models.NewScanReport()
+	report.Analysis.Status = "incomplete"
+	report.Analysis.Reason = "input_failure"
+	report.ExitCode = 2
+	report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("parse_failed", "pkg/bad_test.go", "syntax error at line 5"))
+
+	var buf bytes.Buffer
+	r := reporter.NewTerminalReporter(&buf)
+	exitCode, err := r.Render(report)
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	if exitCode != 2 {
+		t.Errorf("expected exit code 2, got %d", exitCode)
+	}
+
+	out := buf.String()
+	if !strings.Contains(out, "INCOMPLETE (incomplete/input_failure)") {
+		t.Errorf("expected INCOMPLETE (incomplete/input_failure) status, got %s", out)
+	}
+	if !strings.Contains(out, "parse_failed") || !strings.Contains(out, "pkg/bad_test.go") {
+		t.Errorf("expected diagnostic in output, got %s", out)
+	}
+}
+
+func TestAzureReporterIncompleteAndNotApplicable(t *testing.T) {
+	// 1. Incomplete emits error annotations
+	reportInc := models.NewScanReport()
+	reportInc.Analysis.Status = "incomplete"
+	reportInc.Analysis.Reason = "input_failure"
+	reportInc.ExitCode = 2
+	reportInc.Diagnostics = append(reportInc.Diagnostics, models.NewDiagnostic("read_failed", "test/a_test.go", "permission denied"))
+
+	var bufInc bytes.Buffer
+	rInc := reporter.NewAzureReporter(&bufInc)
+	exitInc, err := rInc.Render(reportInc)
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if exitInc != 2 {
+		t.Errorf("expected exit code 2, got %d", exitInc)
+	}
+	outInc := bufInc.String()
+	if !strings.Contains(outInc, "TestGuard audit status: incomplete (input_failure)\n") {
+		t.Errorf("expected status summary in Azure output, got %s", outInc)
+	}
+	if !strings.Contains(outInc, "##vso[task.logissue type=error]TestGuard audit incomplete (input_failure)\n") {
+		t.Errorf("expected error logissue in Azure output, got %s", outInc)
+	}
+	if !strings.Contains(outInc, "##vso[task.logissue type=error;sourcepath=test/a_test.go]read_failed: permission denied\n") {
+		t.Errorf("expected diagnostic logissue in Azure output, got %s", outInc)
+	}
+
+	// 2. Not applicable emits summary and NEVER task-success commands
+	reportNA := models.NewScanReport()
+	reportNA.Analysis.Status = "not_applicable"
+	reportNA.Analysis.Reason = "empty_allowed"
+	reportNA.ExitCode = 3
+
+	var bufNA bytes.Buffer
+	rNA := reporter.NewAzureReporter(&bufNA)
+	exitNA, err := rNA.Render(reportNA)
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if exitNA != 3 {
+		t.Errorf("expected exit code 3, got %d", exitNA)
+	}
+	outNA := bufNA.String()
+	if !strings.Contains(outNA, "TestGuard audit status: not_applicable (empty_allowed)\n") {
+		t.Errorf("expected status line in Azure output, got %s", outNA)
+	}
+	if !strings.Contains(outNA, "TestGuard audit not applicable: empty_allowed (exit 3)\n") {
+		t.Errorf("expected summary message, got %s", outNA)
+	}
+	if strings.Contains(outNA, "##vso[task.complete result=Succeeded;]") {
+		t.Errorf("Azure reporter must NOT emit task-success commands")
+	}
+}
+
+func TestTerminalReporterSuppressesArtifactClaimOnExportFailure(t *testing.T) {
+	report := models.NewScanReport()
+	report.Analysis.Status = "error"
+	report.Analysis.Reason = "output_failure"
+	report.ExitCode = 2
+	report.Findings = []models.Violation{
+		{RuleID: "GUARD-UNIV-ZERO", Severity: models.SeverityBlocker, FilePath: "a_test.go", LineNumber: 3, Message: "Zero assertions."},
+		{RuleID: "GUARD-UNIV-ZERO", Severity: models.SeverityBlocker, FilePath: "b_test.go", LineNumber: 4, Message: "Zero assertions."},
+	}
+	report.Policy.BlockerCount = 2
+	report.Policy.Status = "blocker_found"
+
+	const reportPath = ".testguard/report.md"
+
+	summaryBuf := &bytes.Buffer{}
+	exitCode, err := reporter.NewTerminalReporter(summaryBuf).RenderWithOptions(report, reporter.TerminalOptions{
+		SummaryOnly: true,
+		ReportPath:  reportPath,
+	})
+	if err != nil {
+		t.Fatalf("unexpected summary error: %v", err)
+	}
+	if exitCode != 2 {
+		t.Errorf("summary: expected exit code 2, got %d", exitCode)
+	}
+	if !strings.Contains(summaryBuf.String(), "ERROR (error/output_failure)") {
+		t.Errorf("summary: expected error/output_failure verdict, got %q", summaryBuf.String())
+	}
+	if strings.Contains(summaryBuf.String(), "written to "+reportPath) {
+		t.Errorf("summary: failed export must not be advertised as a written artifact, got %q", summaryBuf.String())
+	}
+
+	truncatedBuf := &bytes.Buffer{}
+	exitCode, err = reporter.NewTerminalReporter(truncatedBuf).RenderWithOptions(report, reporter.TerminalOptions{
+		MaxDisplay: 1,
+		ReportPath: reportPath,
+	})
+	if err != nil {
+		t.Fatalf("unexpected truncated error: %v", err)
+	}
+	if exitCode != 2 {
+		t.Errorf("truncated: expected exit code 2, got %d", exitCode)
+	}
+	if !strings.Contains(truncatedBuf.String(), "ERROR (error/output_failure)") {
+		t.Errorf("truncated: expected error/output_failure verdict, got %q", truncatedBuf.String())
+	}
+	if !strings.Contains(truncatedBuf.String(), "a_test.go") {
+		t.Errorf("truncated: expected retained finding to stay visible, got %q", truncatedBuf.String())
+	}
+	if strings.Contains(truncatedBuf.String(), "written to "+reportPath) {
+		t.Errorf("truncated: failed export must not be advertised as a written artifact, got %q", truncatedBuf.String())
+	}
+}
+
+func TestWriteJSONReportSchemaV1(t *testing.T) {
+	report := models.NewScanReport()
+	report.Tool = models.NewToolMeta("0.2.0", "none", "unknown")
+	report.Scope.RequestedPaths = []string{"sample_test.go"}
+	report.Scope.Files = []string{}
+	report.Analysis.DiscoveredFiles = 0
+	report.Analysis.AnalyzedFiles = 0
+	report.Analysis.AnalyzedTests = 0
+	report.ExitCode = 2
+
+	var buf bytes.Buffer
+	if err := reporter.WriteJSONReport(&buf, report); err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	raw := buf.String()
+	if !strings.HasSuffix(raw, "\n") {
+		t.Fatalf("JSON output must end with trailing newline")
+	}
+	lines := strings.Split(raw, "\n")
+	if len(lines) != 2 || lines[1] != "" {
+		t.Fatalf("expected exactly 1 JSON line plus newline, got %d lines", len(lines)-1)
+	}
+
+	var parsed map[string]interface{}
+	if err := json.Unmarshal([]byte(lines[0]), &parsed); err != nil {
+		t.Fatalf("failed to parse json: %v", err)
+	}
+
+	if parsed["schema_version"] != float64(1) {
+		t.Errorf("expected schema_version: 1, got %v", parsed["schema_version"])
+	}
+
+	tool, ok := parsed["tool"].(map[string]interface{})
+	if !ok || tool["name"] != "testguard" || tool["version"] != "0.2.0" {
+		t.Errorf("unexpected tool payload: %+v", parsed["tool"])
+	}
+	if tool["commit"] != nil || tool["built_at"] != nil {
+		t.Errorf("expected null commit and built_at for none/unknown, got commit=%v, built_at=%v", tool["commit"], tool["built_at"])
+	}
+
+	scope, ok := parsed["scope"].(map[string]interface{})
+	if !ok || scope["effective_mode"] != "full" || scope["config_applied"] != false {
+		t.Errorf("unexpected scope payload: %+v", parsed["scope"])
+	}
+
+	// Verify empty arrays are [] and never null
+	if files, ok := scope["files"].([]interface{}); !ok || files == nil {
+		t.Errorf("expected scope.files to be empty array [], got %v", scope["files"])
+	}
+	if findings, ok := parsed["findings"].([]interface{}); !ok || findings == nil {
+		t.Errorf("expected findings to be empty array [], got %v", parsed["findings"])
+	}
+	if diags, ok := parsed["diagnostics"].([]interface{}); !ok || diags == nil {
+		t.Errorf("expected diagnostics to be empty array [], got %v", parsed["diagnostics"])
+	}
+}
+
+func TestWriteMarkdownReport(t *testing.T) {
+	tmpDir := t.TempDir()
+	reportPath := filepath.Join(tmpDir, "report.md")
+
+	report := models.NewScanReport()
+	report.Analysis.Status = "incomplete"
+	report.Analysis.Reason = "input_failure"
+	report.Analysis.AnalyzedFiles = 1
+	report.Analysis.AnalyzedTests = 2
+	report.Analysis.FailedFiles = 1
+	report.ExitCode = 2
+	report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("parse_failed", "broken_test.go", "syntax error"))
+	report.Findings = append(report.Findings, models.Violation{
+		RuleID:     "GUARD-GO-01",
+		Severity:   models.SeverityBlocker,
+		FilePath:   "sample_test.go",
+		LineNumber: 12,
+		Message:    "Port mocking violation",
+	})
+
+	if err := reporter.WriteMarkdownReport(reportPath, report); err != nil {
+		t.Fatalf("unexpected error writing markdown report: %v", err)
+	}
+
+	content, err := os.ReadFile(reportPath)
+	if err != nil {
+		t.Fatalf("failed reading written report: %v", err)
+	}
+	str := string(content)
+
+	if !strings.Contains(str, "**Status**: incomplete (input_failure)") {
+		t.Errorf("expected status in markdown, got: %s", str)
+	}
+	if !strings.Contains(str, "parse_failed") || !strings.Contains(str, "broken_test.go") {
+		t.Errorf("expected diagnostic table in markdown, got: %s", str)
+	}
+	if !strings.Contains(str, "GUARD-GO-01") || !strings.Contains(str, "🚨 Blocker") {
+		t.Errorf("expected violation table in markdown, got: %s", str)
+	}
+}
+
+func TestWriterErrorPropagation(t *testing.T) {
+	report := models.NewScanReport()
+	report.Analysis.Status = "complete"
+	report.Analysis.Reason = "analyzed"
+	report.ExitCode = 0
+
+	// 1. Terminal write error
+	termWriter := &errWriter{failAfter: 5}
+	rTerm := reporter.NewTerminalReporter(termWriter)
+	exitTerm, err := rTerm.Render(report)
+	if err == nil {
+		t.Errorf("expected error from failing terminal writer, got nil")
+	}
+	if exitTerm != 2 {
+		t.Errorf("expected exit code 2 on terminal write failure, got %d", exitTerm)
+	}
+
+	// 2. Azure write error
+	azWriter := &errWriter{failAfter: 5}
+	rAz := reporter.NewAzureReporter(azWriter)
+	exitAz, err := rAz.Render(report)
+	if err == nil {
+		t.Errorf("expected error from failing azure writer, got nil")
+	}
+	if exitAz != 2 {
+		t.Errorf("expected exit code 2 on azure write failure, got %d", exitAz)
+	}
+
+	// 3. JSON write error
+	jsonWriter := &errWriter{failAfter: 5}
+	if err := reporter.WriteJSONReport(jsonWriter, report); err == nil {
+		t.Errorf("expected error from failing JSON writer, got nil")
+	}
+}
diff --git a/pkg/reporter/terminal.go b/pkg/reporter/terminal.go
index 4c2b23e..99cdee1 100644
--- a/pkg/reporter/terminal.go
+++ b/pkg/reporter/terminal.go
@@ -28,9 +28,9 @@ func NewTerminalReporter(out io.Writer) *TerminalReporter {
 	return &TerminalReporter{out: out}
 }
 
-// Render writes the formatted scorecard and findings to stdout and returns the exit code.
-func (r *TerminalReporter) Render(violations []models.Violation, scannedFiles, parseErrors, skipped int) int {
-	return r.RenderWithOptions(violations, scannedFiles, parseErrors, skipped, TerminalOptions{
+// Render writes the formatted scorecard and findings to stdout and returns the exit code and any write error.
+func (r *TerminalReporter) Render(report *models.ScanReport) (int, error) {
+	return r.RenderWithOptions(report, TerminalOptions{
 		MaxDisplay: 10,
 		ReportPath: ".testguard/report.md",
 	})
@@ -86,13 +86,38 @@ func extractModule(filePath string) string {
 }
 
 // RenderWithOptions renders the scorecard with monorepo module breakdown and summary controls.
-func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scannedFiles, parseErrors, skipped int, opts TerminalOptions) int {
+func (r *TerminalReporter) RenderWithOptions(report *models.ScanReport, opts TerminalOptions) (int, error) {
+	if report == nil {
+		return 2, fmt.Errorf("scan report is nil")
+	}
 	if opts.MaxDisplay <= 0 {
 		opts.MaxDisplay = 10
 	}
 	if opts.ReportPath == "" {
 		opts.ReportPath = ".testguard/report.md"
 	}
+	// A prior Markdown export failure means the report path holds no artifact;
+	// never advertise omitted details as written.
+	exportFailed := report.Analysis.Reason == "output_failure"
+
+	var writeErr error
+	printf := func(format string, a ...interface{}) {
+		if writeErr != nil {
+			return
+		}
+		_, writeErr = fmt.Fprintf(r.out, format, a...)
+	}
+	println := func(a ...interface{}) {
+		if writeErr != nil {
+			return
+		}
+		_, writeErr = fmt.Fprintln(r.out, a...)
+	}
+
+	violations := report.Findings
+	scannedFiles := report.Analysis.AnalyzedFiles
+	parseErrors := report.Analysis.FailedFiles
+	skipped := len(report.Scope.Excluded)
 
 	blockers := 0
 	warnings := 0
@@ -129,25 +154,63 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 		ruleCounts[v.RuleID]++
 	}
 
-	status := "PASSED"
-	if blockers > 0 {
-		status = "FAILED"
+	if report.Analysis.Status == "not_applicable" {
+		printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
+		printf("🛡️ TestGuard Audit · Status: NOT APPLICABLE (%s/%s)\n", report.Analysis.Status, report.Analysis.Reason)
+		printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
+		printf("✨ Scope explicitly allows empty test set; no tests analyzed.\n")
+		if writeErr != nil {
+			return 2, writeErr
+		}
+		return report.ExitCode, nil
+	}
+
+	var status string
+	switch report.Analysis.Status {
+	case "complete":
+		if blockers > 0 {
+			status = "FAILED (complete/analyzed)"
+		} else {
+			status = "PASSED (complete/analyzed)"
+		}
+	case "incomplete":
+		status = fmt.Sprintf("INCOMPLETE (%s/%s)", report.Analysis.Status, report.Analysis.Reason)
+	case "error":
+		status = fmt.Sprintf("ERROR (%s/%s)", report.Analysis.Status, report.Analysis.Reason)
+	default:
+		status = fmt.Sprintf("%s (%s)", strings.ToUpper(report.Analysis.Status), report.Analysis.Reason)
 	}
 
-	fmt.Fprintf(r.out, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
+	printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
 	if len(moduleMap) > 1 {
-		fmt.Fprintf(r.out, "🛡️ TestGuard Monorepo Audit · %d files scanned across %d modules\n", scannedFiles, len(moduleMap))
+		printf("🛡️ TestGuard Monorepo Audit · %d files scanned across %d modules\n", scannedFiles, len(moduleMap))
 	} else {
-		fmt.Fprintf(r.out, "🛡️ TestGuard Audit · %d files scanned · %d Parse Errors · %d Skipped\n", scannedFiles, parseErrors, skipped)
+		printf("🛡️ TestGuard Audit · %d files scanned · %d Parse Errors · %d Skipped\n", scannedFiles, parseErrors, skipped)
+	}
+	printf("Status: %s · 🚨 %d Blocker(s) · ⚠️ %d Warning(s) · 💡 %d Advisory(ies)\n", status, blockers, warnings, advisories)
+	printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
+
+	if len(report.Diagnostics) > 0 {
+		printf("DIAGNOSTICS:\n")
+		for _, d := range report.Diagnostics {
+			if d.Path != nil && *d.Path != "" {
+				printf("  ❌ [%s] %s: %s\n", d.Code, *d.Path, d.Message)
+			} else {
+				printf("  ❌ [%s] %s\n", d.Code, d.Message)
+			}
+		}
+		println()
 	}
-	fmt.Fprintf(r.out, "Status: %s · 🚨 %d Blocker(s) · ⚠️ %d Warning(s) · 💡 %d Advisory(ies)\n", status, blockers, warnings, advisories)
-	fmt.Fprintf(r.out, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
 
 	if len(violations) == 0 {
-		fmt.Fprintf(r.out, "✨ All tests adhere to boundary and quality standards!\n")
-		return 0
+		if report.Analysis.Status == "complete" {
+			printf("✨ All tests adhere to boundary and quality standards!\n")
+		}
+		if writeErr != nil {
+			return 2, writeErr
+		}
+		return report.ExitCode, nil
 	}
-
 	// 1. Render Module Breakdown if monorepo / multi-module
 	if len(moduleMap) > 1 {
 		var modules []*moduleStats
@@ -168,9 +231,9 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 			return modules[i].name < modules[j].name
 		})
 
-		fmt.Fprintf(r.out, "📦 MODULE BREAKDOWN:\n")
-		fmt.Fprintf(r.out, "%-36s %10s %10s %12s   %s\n", "Module / Sub-Project", "Blockers", "Warnings", "Advisories", "Status")
-		fmt.Fprintf(r.out, "─────────────────────────────────────────────────────────────────────────────\n")
+		printf("📦 MODULE BREAKDOWN:\n")
+		printf("%-36s %10s %10s %12s   %s\n", "Module / Sub-Project", "Blockers", "Warnings", "Advisories", "Status")
+		printf("─────────────────────────────────────────────────────────────────────────────\n")
 		for _, m := range modules {
 			modStatus := "✅ PASSED"
 			if m.blockers > 0 {
@@ -180,9 +243,9 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 			} else if m.advisories > 0 {
 				modStatus = "💡 ADVISORY"
 			}
-			fmt.Fprintf(r.out, "%-36s %10d %10d %12d   %s\n", m.name, m.blockers, m.warnings, m.advisories, modStatus)
+			printf("%-36s %10d %10d %12d   %s\n", m.name, m.blockers, m.warnings, m.advisories, modStatus)
 		}
-		fmt.Fprintf(r.out, "─────────────────────────────────────────────────────────────────────────────\n\n")
+		printf("─────────────────────────────────────────────────────────────────────────────\n\n")
 	}
 
 	// 2. Render Top Rule Violations
@@ -202,22 +265,26 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 	if len(rules) < topRuleLimit {
 		topRuleLimit = len(rules)
 	}
-	fmt.Fprintf(r.out, "🔥 TOP RULE VIOLATIONS:\n")
+	printf("🔥 TOP RULE VIOLATIONS:\n")
 	for i := range topRuleLimit {
-		fmt.Fprintf(r.out, "  • %-30s %5d occurrence(s)\n", rules[i].ruleID, rules[i].count)
+		printf("  • %-30s %5d occurrence(s)\n", rules[i].ruleID, rules[i].count)
 	}
-	fmt.Fprintln(r.out)
+	println()
 
 	// If SummaryOnly mode, skip individual file listings
 	if opts.SummaryOnly {
-		fmt.Fprintf(r.out, "✨ Summary mode: Full detailed violations written to %s\n", opts.ReportPath)
+		if exportFailed {
+			printf("✨ Summary mode: detailed violations were not exported because the report could not be written.\n")
+		} else {
+			printf("✨ Summary mode: Full detailed violations written to %s\n", opts.ReportPath)
+		}
 		if len(moduleMap) > 1 {
-			fmt.Fprintf(r.out, "💡 Tip: Run 'testguard path/to/module' to inspect a specific service.\n")
+			printf("💡 Tip: Run 'testguard path/to/module' to inspect a specific service.\n")
 		}
-		if blockers > 0 {
-			return 1
+		if writeErr != nil {
+			return 2, writeErr
 		}
-		return 0
+		return report.ExitCode, nil
 	}
 
 	// 3. Render Top Findings (capped to avoid terminal flooding)
@@ -235,16 +302,20 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 		return severityWeight(violations[i].Severity) < severityWeight(violations[j].Severity)
 	})
 
-	fmt.Fprintf(r.out, "🔍 KEY FINDINGS (Top %d):\n", opts.MaxDisplay)
+	printf("🔍 KEY FINDINGS (Top %d):\n", opts.MaxDisplay)
 
 	noColor := os.Getenv("NO_COLOR") != ""
 	displayed := 0
 	for _, v := range violations {
 		if displayed >= opts.MaxDisplay {
 			remaining := len(violations) - displayed
-			fmt.Fprintf(r.out, "... and %d more issue(s) written to %s\n", remaining, opts.ReportPath)
+			if exportFailed {
+				printf("... and %d more issue(s) not exported.\n", remaining)
+			} else {
+				printf("... and %d more issue(s) written to %s\n", remaining, opts.ReportPath)
+			}
 			if len(moduleMap) > 1 {
-				fmt.Fprintf(r.out, "💡 Tip: Run 'testguard <module-path>' to inspect a specific service, or 'testguard --summary'.\n")
+				printf("💡 Tip: Run 'testguard <module-path>' to inspect a specific service, or 'testguard --summary'.\n")
 			}
 			break
 		}
@@ -269,21 +340,21 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 			}
 		}
 
-		fmt.Fprintf(r.out, "%s:%d:%d\n", v.FilePath, v.LineNumber, v.Column)
-		fmt.Fprintf(r.out, "  %s [%s] %s\n", icon, v.RuleID, v.Message)
+		printf("%s:%d:%d\n", v.FilePath, v.LineNumber, v.Column)
+		printf("  %s [%s] %s\n", icon, v.RuleID, v.Message)
 		if v.Suggestion != "" {
 			fixLabel := "💡 Fix:"
 			if noColor {
 				fixLabel = "Fix:"
 			}
-			fmt.Fprintf(r.out, "  %s %s\n", fixLabel, v.Suggestion)
+			printf("  %s %s\n", fixLabel, v.Suggestion)
 		}
-		fmt.Fprintln(r.out)
+		println()
 		displayed++
 	}
 
-	if blockers > 0 {
-		return 1
+	if writeErr != nil {
+		return 2, writeErr
 	}
-	return 0
+	return report.ExitCode, nil
 }


## Added cmd/testguard/main_test.go
sha256=80d5ed9853127e4e99c00722a89419a7adc8b43760db3457a4ffba21d175ea9f

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


## Added pkg/reporter/markdown_internal_test.go
sha256=c5efab1af269c5e22b2589e8ebfeb4462ec2f12fffd831079777498db583f9ac

package reporter

import (
	"errors"
	"io"
	"testing"

	"github.com/HoangNguyen0403/testguard/pkg/models"
)

type stubReportFile struct {
	writeErr error
	closeErr error
}

func (s *stubReportFile) Write(p []byte) (int, error) {
	if s.writeErr != nil {
		return 0, s.writeErr
	}
	return len(p), nil
}

func (s *stubReportFile) Close() error { return s.closeErr }

func TestWriteMarkdownReportPropagatesFileIOFailures(t *testing.T) {
	orig := createReportFile
	t.Cleanup(func() { createReportFile = orig })

	report := models.NewScanReport()

	openErr := errors.New("open denied")
	createReportFile = func(string) (io.WriteCloser, error) { return nil, openErr }
	if err := WriteMarkdownReport("report.md", report); !errors.Is(err, openErr) {
		t.Errorf("expected open failure, got %v", err)
	}

	writeErr := errors.New("disk full")
	createReportFile = func(string) (io.WriteCloser, error) {
		return &stubReportFile{writeErr: writeErr}, nil
	}
	if err := WriteMarkdownReport("report.md", report); !errors.Is(err, writeErr) {
		t.Errorf("expected post-open write failure, got %v", err)
	}

	closeErr := errors.New("close flush failed")
	createReportFile = func(string) (io.WriteCloser, error) {
		return &stubReportFile{closeErr: closeErr}, nil
	}
	if err := WriteMarkdownReport("report.md", report); !errors.Is(err, closeErr) {
		t.Errorf("expected close failure, got %v", err)
	}
}

