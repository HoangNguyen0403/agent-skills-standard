# Immutable review snapshot T2-report

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance
Base: 8fc53b4c683d312359166e49e397fa887dd0ac92
Captured: 2026-10-26T16:52:35.876Z

## Tracked diff

diff --git a/cmd/testguard/main.go b/cmd/testguard/main.go
index 36ef75c..8c5df13 100644
--- a/cmd/testguard/main.go
+++ b/cmd/testguard/main.go
@@ -19,9 +19,32 @@ var (
 	repo    = "HoangNguyen0403/testguard"
 )
 
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
+
 func main() {
 	var diffMode bool
 	var allMode bool
+	var allowEmpty bool
 	var jsonMode bool
 	var format string
 	var outputFile string
@@ -50,23 +73,43 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
 
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
+
+			if jsonMode && format == "azure" {
+				emitCLIError(true, "--json cannot be combined with -f azure", args, version, commit, date)
+			}
+
+			if outputFile != "" && (jsonMode || format == "json" || format == "azure") {
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
@@ -81,36 +124,23 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
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
 
 			if format == "azure" {
 				r := reporter.NewAzureReporter(os.Stdout)
-				r.Render(res.Violations)
-				if hasBlockers {
-					os.Exit(1)
-				}
-				return nil
+				r.Render(report)
+				os.Exit(report.ExitCode)
 			}
 
 			// Default terminal scorecard
@@ -119,30 +149,30 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
 			if outPath == "" {
 				outPath = ".testguard/report.md"
 			}
-			exitCode := term.RenderWithOptions(res.Violations, res.ScannedFiles, res.ParseErrors, res.Skipped, reporter.TerminalOptions{
+			term.RenderWithOptions(report, reporter.TerminalOptions{
 				SummaryOnly: summaryMode,
 				MaxDisplay:  topIssues,
 				ReportPath:  outPath,
 			})
-			_ = reporter.WriteMarkdownReport(outPath, res.Violations, res.ScannedFiles, res.ParseErrors, res.Skipped)
-
-			if exitCode != 0 {
-				os.Exit(exitCode)
+			if err := reporter.WriteMarkdownReport(outPath, report); err != nil {
+				fmt.Fprintf(os.Stderr, "Error: failed writing markdown report: %v\n", err)
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
diff --git a/pkg/engine/discovery.go b/pkg/engine/discovery.go
index 46a58f8..bfa1e8a 100644
--- a/pkg/engine/discovery.go
+++ b/pkg/engine/discovery.go
@@ -1,14 +1,16 @@
 package engine
 
 import (
+	"fmt"
 	"io/fs"
 	"os"
 	"path/filepath"
+	"sort"
 	"strings"
 
+	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/HoangNguyen0403/testguard/pkg/parser"
 )
-
 // DiscoverModules walks the root directory and locates modules containing test files.
 func DiscoverModules(rootDir string) ([]parser.ModuleRoot, error) {
 	var modules []parser.ModuleRoot
@@ -85,37 +87,200 @@ func isTestFileName(name string) bool {
 		strings.HasSuffix(lower, "tests.swift")
 }
 
-// FindTestFiles searches for test files under a given directory for a language adapter.
-func FindTestFiles(dir string, adapter parser.LanguageAdapter) ([]string, error) {
-	var files []string
+// isSupportedLanguageExtension returns true if the extension belongs to a supported language.
+func isSupportedLanguageExtension(ext string) bool {
+	lower := strings.ToLower(ext)
+	switch lower {
+	case ".dart", ".go", ".ts", ".tsx", ".js", ".jsx", ".kt", ".swift":
+		return true
+	default:
+		return false
+	}
+}
 
-	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
-		if err != nil {
-			return nil
+// normalizePath converts a path to a cwd-relative slash path when possible.
+func normalizePath(path string) string {
+	cwd, err := os.Getwd()
+	if err == nil {
+		if rel, err := filepath.Rel(cwd, path); err == nil && !strings.HasPrefix(rel, "..") {
+			return filepath.ToSlash(rel)
 		}
+	}
+	return filepath.ToSlash(filepath.Clean(path))
+}
 
-		if d.IsDir() {
-			name := d.Name()
-			if path != dir && (strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "build" || name == "dist") {
-				return filepath.SkipDir
+// DiscoveryResult contains files and metadata from scope resolution.
+type DiscoveryResult struct {
+	CandidateFiles  []string
+	Excluded        []models.ExcludedPath
+	Unsupported     []string
+	Diagnostics     []models.Diagnostic
+	DiscoveredFiles int
+	InputFailure    bool
+}
+
+// DiscoverScope inspects target paths and resolves candidates, exclusions, and unsupported inputs.
+func DiscoverScope(paths []string, adapter parser.LanguageAdapter, failTraversal func(path string) error) *DiscoveryResult {
+	result := &DiscoveryResult{
+		CandidateFiles: make([]string, 0),
+		Excluded:       make([]models.ExcludedPath, 0),
+		Unsupported:    make([]string, 0),
+		Diagnostics:    make([]models.Diagnostic, 0),
+	}
+
+	candidateMap := make(map[string]bool)
+	excludedMap := make(map[string]bool)
+	unsupportedMap := make(map[string]bool)
+
+	if len(paths) == 0 {
+		paths = []string{"."}
+	}
+
+	for _, p := range paths {
+		if failTraversal != nil {
+			if ferr := failTraversal(p); ferr != nil {
+				result.InputFailure = true
+				result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("traversal_failed", p, ferr.Error()))
+				continue
 			}
-			return nil
 		}
 
-		if isTestFileName(d.Name()) {
+		fi, err := os.Lstat(p)
+		if err != nil {
+			result.InputFailure = true
+			result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("target_unreadable", p, err.Error()))
+			continue
+		}
+
+		if fi.Mode()&os.ModeSymlink != 0 {
+			result.InputFailure = true
+			result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("target_unreadable", p, fmt.Sprintf("target %q is a symlink; symlinks are not supported", p)))
+			continue
+		}
+
+		if !fi.IsDir() {
+			ext := filepath.Ext(p)
+			if !isSupportedLanguageExtension(ext) {
+				norm := normalizePath(p)
+				if !unsupportedMap[norm] {
+					unsupportedMap[norm] = true
+					result.Unsupported = append(result.Unsupported, norm)
+				}
+				result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("unsupported_input", norm, fmt.Sprintf("unsupported file extension %q for target %s", ext, p)))
+				continue
+			}
+
+			if !isTestFileName(filepath.Base(p)) {
+				norm := normalizePath(p)
+				if !excludedMap[norm] {
+					excludedMap[norm] = true
+					result.Excluded = append(result.Excluded, models.ExcludedPath{Path: norm, Reason: "non_test"})
+				}
+				continue
+			}
+
+			result.DiscoveredFiles++
 			header := make([]byte, 256)
-			f, err := os.Open(path)
-			if err == nil {
+			f, oerr := os.Open(p)
+			if oerr == nil {
 				_, _ = f.Read(header)
 				f.Close()
 			}
-			if !adapter.IsGenerated(path, header) {
-				files = append(files, path)
+			if adapter.IsGenerated(p, header) {
+				norm := normalizePath(p)
+				if !excludedMap[norm] {
+					excludedMap[norm] = true
+					result.Excluded = append(result.Excluded, models.ExcludedPath{Path: norm, Reason: "generated"})
+				}
+				continue
 			}
+
+			clean := filepath.Clean(p)
+			if !candidateMap[clean] {
+				candidateMap[clean] = true
+				result.CandidateFiles = append(result.CandidateFiles, p)
+			}
+			continue
 		}
 
-		return nil
+		// Directory traversal
+		walkErr := filepath.WalkDir(p, func(path string, d fs.DirEntry, werr error) error {
+			if failTraversal != nil {
+				if ferr := failTraversal(path); ferr != nil {
+					result.InputFailure = true
+					result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("traversal_failed", normalizePath(path), ferr.Error()))
+					return nil
+				}
+			}
+			if werr != nil {
+				result.InputFailure = true
+				result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("traversal_failed", normalizePath(path), werr.Error()))
+				return nil
+			}
+
+			if d.IsDir() {
+				if path != p {
+					name := d.Name()
+					if strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "build" || name == "dist" {
+						norm := normalizePath(path)
+						if !excludedMap[norm] {
+							excludedMap[norm] = true
+							result.Excluded = append(result.Excluded, models.ExcludedPath{Path: norm, Reason: "default_directory"})
+						}
+						return filepath.SkipDir
+					}
+					if d.Type()&fs.ModeSymlink != 0 {
+						return filepath.SkipDir
+					}
+				}
+				return nil
+			}
+
+			if d.Type()&fs.ModeSymlink != 0 {
+				return nil
+			}
+
+			if isTestFileName(d.Name()) {
+				result.DiscoveredFiles++
+				header := make([]byte, 256)
+				f, oerr := os.Open(path)
+				if oerr == nil {
+					_, _ = f.Read(header)
+					f.Close()
+				}
+				if adapter.IsGenerated(path, header) {
+					norm := normalizePath(path)
+					if !excludedMap[norm] {
+						excludedMap[norm] = true
+						result.Excluded = append(result.Excluded, models.ExcludedPath{Path: norm, Reason: "generated"})
+					}
+					return nil
+				}
+				clean := filepath.Clean(path)
+				if !candidateMap[clean] {
+					candidateMap[clean] = true
+					result.CandidateFiles = append(result.CandidateFiles, path)
+				}
+			}
+			return nil
+		})
+		if walkErr != nil {
+			result.InputFailure = true
+			result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("traversal_failed", normalizePath(p), walkErr.Error()))
+		}
+	}
+
+	sort.Strings(result.Unsupported)
+	sort.Slice(result.Excluded, func(i, j int) bool {
+		return result.Excluded[i].Path < result.Excluded[j].Path
 	})
+	sort.Strings(result.CandidateFiles)
+
+	return result
+}
 
-	return files, err
+// FindTestFiles searches for test files under a given directory for a language adapter.
+func FindTestFiles(dir string, adapter parser.LanguageAdapter) ([]string, error) {
+	res := DiscoverScope([]string{dir}, adapter, nil)
+	return res.CandidateFiles, nil
 }
diff --git a/pkg/engine/engine.go b/pkg/engine/engine.go
index d2f32df..c88ef75 100644
--- a/pkg/engine/engine.go
+++ b/pkg/engine/engine.go
@@ -2,10 +2,14 @@ package engine
 
 import (
 	"fmt"
+	goparser "go/parser"
+	"go/token"
 	"os"
 	"path/filepath"
 	"regexp"
+	"sort"
 	"strings"
+
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/clone"
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/naming"
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/zeroassert"
@@ -26,16 +30,25 @@ type Options struct {
 	TargetPaths []string
 	DiffOnly    bool
 	ScanAll     bool
+	AllowEmpty  bool
 	BaseBranch  string
 	ProgressFn  ProgressFunc
+	Version     string
+	Commit      string
+	Date        string
+
+	// Fault injection hooks for testing OS permission / traversal / read errors
+	FailTraversal func(path string) error
+	FailRead      func(path string) error
 }
 
-// Result contains the aggregated scan statistics and violations.
+// Result contains aggregated scan statistics, violations, and the formal ScanReport envelope.
 type Result struct {
 	ScannedFiles int
 	ParseErrors  int
 	Skipped      int
 	Violations   []models.Violation
+	Report       *models.ScanReport
 }
 
 // Engine coordinates language adapters, universal detectors, and semantic rules.
@@ -209,63 +222,86 @@ func parseGenericTestUnits(content []byte, filePath string) []parser.TestUnit {
 
 // Run executes the audit across target paths according to options.
 func (e *Engine) Run(opts Options) (*Result, error) {
-	result := &Result{
-		Violations: make([]models.Violation, 0),
-	}
+	report := models.NewScanReport()
+	report.Tool = models.NewToolMeta(opts.Version, opts.Commit, opts.Date)
 
 	paths := opts.TargetPaths
 	if len(paths) == 0 {
 		paths = []string{"."}
 	}
-
-	for _, p := range paths {
-		if _, err := os.Stat(p); err != nil {
-			return nil, fmt.Errorf("target path not found: %s", p)
-		}
+	report.Scope.RequestedPaths = append([]string(nil), paths...)
+
+	if opts.DiffOnly {
+		report.Analysis.Status = "error"
+		report.Analysis.Reason = "invalid_usage"
+		report.ExitCode = 2
+		report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("invalid_usage", "", "--diff mode is not supported; use full scan"))
+		return &Result{
+			Report:     report,
+			Violations: report.Findings,
+		}, nil
 	}
 
 	if opts.ProgressFn != nil {
 		opts.ProgressFn("discovering", 0, 0, "")
 	}
 
-	seenFiles := make(map[string]bool)
-	var allTestFiles []string
-	for _, p := range paths {
-		files, err := FindTestFiles(p, e.dartAdapter)
-		if err == nil {
-			for _, f := range files {
-				clean := filepath.Clean(f)
-				if !seenFiles[clean] {
-					seenFiles[clean] = true
-					allTestFiles = append(allTestFiles, f)
-				}
-			}
-		}
-	}
+	discovery := DiscoverScope(paths, e.dartAdapter, opts.FailTraversal)
+	report.Scope.Excluded = discovery.Excluded
+	report.Scope.Unsupported = discovery.Unsupported
+	report.Diagnostics = append(report.Diagnostics, discovery.Diagnostics...)
+	discoveredFiles := discovery.DiscoveredFiles
+	hasInputFailure := discovery.InputFailure
 
-	result.ScannedFiles = len(allTestFiles)
+	allTestFiles := discovery.CandidateFiles
 
 	if opts.ProgressFn != nil {
 		opts.ProgressFn("discovered", len(allTestFiles), len(allTestFiles), "")
 	}
 
+	var analyzedFiles []string
+	failedFilesMap := make(map[string]bool)
+	var totalAnalyzedTests int
+
 	for i, file := range allTestFiles {
 		if opts.ProgressFn != nil {
 			opts.ProgressFn("scanning", i+1, len(allTestFiles), file)
 		}
+
+		if opts.FailRead != nil {
+			if ferr := opts.FailRead(file); ferr != nil {
+				failedFilesMap[file] = true
+				hasInputFailure = true
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("read_failed", normalizePath(file), ferr.Error()))
+				continue
+			}
+		}
+
 		content, err := os.ReadFile(file)
 		if err != nil {
-			result.ParseErrors++
+			failedFilesMap[file] = true
+			hasInputFailure = true
+			report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("read_failed", normalizePath(file), err.Error()))
 			continue
 		}
 
-		suppressions := models.ParseSuppressions(string(content))
-
 		var units []parser.TestUnit
-		if strings.HasSuffix(file, ".dart") {
+		if strings.HasSuffix(file, ".go") {
+			fset := token.NewFileSet()
+			_, parseErr := goparser.ParseFile(fset, file, content, 0)
+			if parseErr != nil {
+				failedFilesMap[file] = true
+				hasInputFailure = true
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("parse_failed", normalizePath(file), parseErr.Error()))
+				continue
+			}
+			units = parseGenericTestUnits(content, file)
+		} else if strings.HasSuffix(file, ".dart") {
 			u, err := e.dartAdapter.LocateTests(content, file)
 			if err != nil {
-				result.ParseErrors++
+				failedFilesMap[file] = true
+				hasInputFailure = true
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("parse_failed", normalizePath(file), err.Error()))
 				continue
 			}
 			units = u
@@ -273,6 +309,15 @@ func (e *Engine) Run(opts Options) (*Result, error) {
 			units = parseGenericTestUnits(content, file)
 		}
 
+		analyzedFiles = append(analyzedFiles, normalizePath(file))
+
+		for _, u := range units {
+			if u.Kind != "file" {
+				totalAnalyzedTests++
+			}
+		}
+
+		suppressions := models.ParseSuppressions(string(content))
 		var fileViolations []models.Violation
 
 		// 1. Universal checks
@@ -314,10 +359,73 @@ func (e *Engine) Run(opts Options) (*Result, error) {
 		// 3. Filter suppressed violations
 		for _, v := range fileViolations {
 			if !models.IsSuppressed(suppressions, v.RuleID, v.LineNumber) {
-				result.Violations = append(result.Violations, v)
+				v.FilePath = normalizePath(v.FilePath)
+				report.Findings = append(report.Findings, v)
 			}
 		}
 	}
 
+	sort.Strings(analyzedFiles)
+	report.Scope.Files = analyzedFiles
+	report.Analysis.DiscoveredFiles = discoveredFiles
+	report.Analysis.AnalyzedFiles = len(analyzedFiles)
+	report.Analysis.AnalyzedTests = totalAnalyzedTests
+	report.Analysis.FailedFiles = len(failedFilesMap)
+
+	blockerCount := 0
+	for _, f := range report.Findings {
+		if f.Severity == models.SeverityBlocker {
+			blockerCount++
+		}
+	}
+	report.Policy.BlockerCount = blockerCount
+	if blockerCount > 0 {
+		report.Policy.Status = "blocker_found"
+	} else {
+		report.Policy.Status = "no_blocker"
+	}
+
+	// Decision & Exit Precedence (SRS §3.2)
+	if hasInputFailure || report.Analysis.FailedFiles > 0 {
+		report.Analysis.Status = "incomplete"
+		report.Analysis.Reason = "input_failure"
+		report.ExitCode = 2
+	} else if len(report.Scope.Unsupported) > 0 {
+		report.Analysis.Status = "incomplete"
+		report.Analysis.Reason = "unsupported_scope"
+		report.ExitCode = 2
+	} else if totalAnalyzedTests == 0 {
+		if len(report.Findings) > 0 {
+			report.Analysis.Status = "incomplete"
+			report.Analysis.Reason = "empty_scope"
+			report.ExitCode = 2
+			report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("empty_scope", "", "no analyzable test declarations found"))
+		} else if opts.AllowEmpty {
+			report.Analysis.Status = "not_applicable"
+			report.Analysis.Reason = "empty_allowed"
+			report.ExitCode = 3
+		} else {
+			report.Analysis.Status = "incomplete"
+			report.Analysis.Reason = "empty_scope"
+			report.ExitCode = 2
+			report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("empty_scope", "", "no analyzable test declarations found"))
+		}
+	} else {
+		report.Analysis.Status = "complete"
+		report.Analysis.Reason = "analyzed"
+		if blockerCount > 0 {
+			report.ExitCode = 1
+		} else {
+			report.ExitCode = 0
+		}
+	}
+
+	result := &Result{
+		ScannedFiles: report.Analysis.AnalyzedFiles,
+		ParseErrors:  report.Analysis.FailedFiles,
+		Skipped:      len(report.Scope.Excluded),
+		Violations:   report.Findings,
+		Report:       report,
+	}
 	return result, nil
 }
diff --git a/pkg/engine/engine_test.go b/pkg/engine/engine_test.go
index 0a3b2f4..e059076 100644
--- a/pkg/engine/engine_test.go
+++ b/pkg/engine/engine_test.go
@@ -1,6 +1,7 @@
 package engine_test
 
 import (
+	"errors"
 	"fmt"
 	"os"
 	"path/filepath"
@@ -108,17 +109,14 @@ func TestEngineProgressCallback(t *testing.T) {
 		t.Fatalf("expected at least 3 progress events, got %d", len(events))
 	}
 
-	// First event should be discovering
 	if events[0].phase != "discovering" {
 		t.Errorf("expected first event phase 'discovering', got %q", events[0].phase)
 	}
 
-	// Second event should be discovered with total = 2
 	if events[1].phase != "discovered" || events[1].total != 2 {
 		t.Errorf("expected second event 'discovered' with total 2, got %+v", events[1])
 	}
 
-	// Remaining events should be scanning
 	scanningCount := 0
 	for _, e := range events[2:] {
 		if e.phase == "scanning" {
@@ -132,11 +130,26 @@ func TestEngineProgressCallback(t *testing.T) {
 
 func TestEngineTargetNotFound(t *testing.T) {
 	eng := engine.New()
-	_, err := eng.Run(engine.Options{
+	res, err := eng.Run(engine.Options{
 		TargetPaths: []string{"/nonexistent-directory-testguard-path-12345"},
 	})
-	if err == nil {
-		t.Errorf("expected error for nonexistent target path, got nil")
+	if err != nil {
+		t.Fatalf("unexpected engine error: %v", err)
+	}
+	if res.Report == nil {
+		t.Fatalf("expected non-nil ScanReport")
+	}
+	if res.Report.Analysis.Status != "incomplete" {
+		t.Errorf("expected status 'incomplete', got %q", res.Report.Analysis.Status)
+	}
+	if res.Report.Analysis.Reason != "input_failure" {
+		t.Errorf("expected reason 'input_failure', got %q", res.Report.Analysis.Reason)
+	}
+	if res.Report.ExitCode != 2 {
+		t.Errorf("expected exit code 2, got %d", res.Report.ExitCode)
+	}
+	if len(res.Report.Diagnostics) == 0 || res.Report.Diagnostics[0].Code != "target_unreadable" {
+		t.Errorf("expected target_unreadable diagnostic, got %+v", res.Report.Diagnostics)
 	}
 }
 
@@ -146,7 +159,7 @@ func TestEnginePathDeduplication(t *testing.T) {
 	_ = os.MkdirAll(testDir, 0755)
 
 	file1 := filepath.Join(testDir, "sample_test.go")
-	_ = os.WriteFile(file1, []byte("package test\nfunc TestSample(t *testing.T) {}\n"), 0644)
+	_ = os.WriteFile(file1, []byte("package test\nimport \"testing\"\nfunc TestSample(t *testing.T) {\n  if 1 != 1 { t.Fail() }\n}\n"), 0644)
 
 	eng := engine.New()
 	res, err := eng.Run(engine.Options{
@@ -159,4 +172,278 @@ func TestEnginePathDeduplication(t *testing.T) {
 	if res.ScannedFiles != 1 {
 		t.Errorf("expected exactly 1 scanned file due to deduplication, got %d", res.ScannedFiles)
 	}
+	if res.Report.Analysis.AnalyzedFiles != 1 {
+		t.Errorf("expected AnalyzedFiles 1, got %d", res.Report.Analysis.AnalyzedFiles)
+	}
+}
+
+func TestEngineCompleteScanNoBlockers(t *testing.T) {
+	tmpDir := t.TempDir()
+	file1 := filepath.Join(tmpDir, "ok_test.go")
+	_ = os.WriteFile(file1, []byte("package test\nimport \"testing\"\nfunc TestOk(t *testing.T) {\n  if 1 != 1 { t.Fatal(\"fail\") }\n}\n"), 0644)
+
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	report := res.Report
+	if report.SchemaVersion != 1 {
+		t.Errorf("expected schema_version 1, got %d", report.SchemaVersion)
+	}
+	if report.Analysis.Status != "complete" {
+		t.Errorf("expected complete status, got %q", report.Analysis.Status)
+	}
+	if report.Analysis.Reason != "analyzed" {
+		t.Errorf("expected analyzed reason, got %q", report.Analysis.Reason)
+	}
+	if report.ExitCode != 0 {
+		t.Errorf("expected exit code 0, got %d", report.ExitCode)
+	}
+	if report.Policy.Status != "no_blocker" || report.Policy.BlockerCount != 0 {
+		t.Errorf("expected no_blocker policy, got %+v", report.Policy)
+	}
+	if report.Analysis.AnalyzedFiles != 1 || report.Analysis.AnalyzedTests != 1 {
+		t.Errorf("expected 1 file and 1 test analyzed, got files=%d, tests=%d", report.Analysis.AnalyzedFiles, report.Analysis.AnalyzedTests)
+	}
+}
+
+func TestEngineParseFailureMalformedGo(t *testing.T) {
+	tmpDir := t.TempDir()
+	badFile := filepath.Join(tmpDir, "syntax_error_test.go")
+	_ = os.WriteFile(badFile, []byte("package test\nfunc TestMalformed(t *testing.T) {\n  var x = \n"), 0644)
+
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	report := res.Report
+	if report.Analysis.Status != "incomplete" {
+		t.Errorf("expected incomplete status, got %q", report.Analysis.Status)
+	}
+	if report.Analysis.Reason != "input_failure" {
+		t.Errorf("expected input_failure reason, got %q", report.Analysis.Reason)
+	}
+	if report.Analysis.FailedFiles != 1 {
+		t.Errorf("expected 1 failed file, got %d", report.Analysis.FailedFiles)
+	}
+	if report.ExitCode != 2 {
+		t.Errorf("expected exit code 2, got %d", report.ExitCode)
+	}
+	hasParseDiag := false
+	for _, d := range report.Diagnostics {
+		if d.Code == "parse_failed" {
+			hasParseDiag = true
+		}
+	}
+	if !hasParseDiag {
+		t.Errorf("expected parse_failed diagnostic in %+v", report.Diagnostics)
+	}
+}
+
+func TestEngineIncompletePlusBlockerPrecedence(t *testing.T) {
+	tmpDir := t.TempDir()
+	// File 1: Blocker (zero assertions)
+	fileBlocker := filepath.Join(tmpDir, "zero_assert_test.go")
+	_ = os.WriteFile(fileBlocker, []byte("package test\nimport \"testing\"\nfunc TestZero(t *testing.T) {\n  _ = 1 + 1\n}\n"), 0644)
+
+	// File 2: Syntax error
+	fileBroken := filepath.Join(tmpDir, "broken_syntax_test.go")
+	_ = os.WriteFile(fileBroken, []byte("package test\nfunc Broken( {\n"), 0644)
+
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	report := res.Report
+	// Incomplete MUST take precedence over blocker (exit 2, not 1)
+	if report.Analysis.Status != "incomplete" {
+		t.Errorf("expected status incomplete, got %q", report.Analysis.Status)
+	}
+	if report.Analysis.Reason != "input_failure" {
+		t.Errorf("expected reason input_failure, got %q", report.Analysis.Reason)
+	}
+	if report.ExitCode != 2 {
+		t.Errorf("expected exit code 2 (incomplete takes precedence over blocker), got %d", report.ExitCode)
+	}
+
+	// But findings (including blocker) MUST be retained!
+	if len(report.Findings) == 0 {
+		t.Errorf("expected retained findings from valid file, got none")
+	}
+	if report.Policy.BlockerCount == 0 {
+		t.Errorf("expected blocker count > 0 from retained findings")
+	}
+}
+
+func TestEngineExplicitUnsupportedFile(t *testing.T) {
+	tmpDir := t.TempDir()
+	unsupportedFile := filepath.Join(tmpDir, "notes.txt")
+	_ = os.WriteFile(unsupportedFile, []byte("some notes"), 0644)
+
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{unsupportedFile},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	report := res.Report
+	if report.Analysis.Status != "incomplete" {
+		t.Errorf("expected status incomplete, got %q", report.Analysis.Status)
+	}
+	if report.Analysis.Reason != "unsupported_scope" {
+		t.Errorf("expected reason unsupported_scope, got %q", report.Analysis.Reason)
+	}
+	if report.ExitCode != 2 {
+		t.Errorf("expected exit code 2, got %d", report.ExitCode)
+	}
+	if len(report.Scope.Unsupported) != 1 {
+		t.Errorf("expected 1 unsupported file in scope, got %+v", report.Scope.Unsupported)
+	}
+}
+
+func TestEngineExplicitUnsupportedWithAllowEmpty(t *testing.T) {
+	tmpDir := t.TempDir()
+	unsupportedFile := filepath.Join(tmpDir, "readme.md")
+	_ = os.WriteFile(unsupportedFile, []byte("# Readme"), 0644)
+
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{unsupportedFile},
+		AllowEmpty:  true, // --allow-empty cannot excuse unsupported files!
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	report := res.Report
+	if report.Analysis.Status != "incomplete" || report.Analysis.Reason != "unsupported_scope" || report.ExitCode != 2 {
+		t.Errorf("allow-empty must not excuse unsupported file: got status=%q, reason=%q, exit=%d",
+			report.Analysis.Status, report.Analysis.Reason, report.ExitCode)
+	}
+}
+
+func TestEngineEmptyScopeDisallowed(t *testing.T) {
+	tmpDir := t.TempDir()
+
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+		AllowEmpty:  false,
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	report := res.Report
+	if report.Analysis.Status != "incomplete" {
+		t.Errorf("expected status incomplete, got %q", report.Analysis.Status)
+	}
+	if report.Analysis.Reason != "empty_scope" {
+		t.Errorf("expected reason empty_scope, got %q", report.Analysis.Reason)
+	}
+	if report.ExitCode != 2 {
+		t.Errorf("expected exit code 2, got %d", report.ExitCode)
+	}
+	hasEmptyDiag := false
+	for _, d := range report.Diagnostics {
+		if d.Code == "empty_scope" {
+			hasEmptyDiag = true
+		}
+	}
+	if !hasEmptyDiag {
+		t.Errorf("expected empty_scope diagnostic, got %+v", report.Diagnostics)
+	}
+}
+
+func TestEngineEmptyScopeAllowed(t *testing.T) {
+	tmpDir := t.TempDir()
+
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+		AllowEmpty:  true,
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	report := res.Report
+	if report.Analysis.Status != "not_applicable" {
+		t.Errorf("expected status not_applicable, got %q", report.Analysis.Status)
+	}
+	if report.Analysis.Reason != "empty_allowed" {
+		t.Errorf("expected reason empty_allowed, got %q", report.Analysis.Reason)
+	}
+	if report.ExitCode != 3 {
+		t.Errorf("expected exit code 3 for not_applicable, got %d", report.ExitCode)
+	}
+	if len(report.Findings) != 0 {
+		t.Errorf("expected empty findings [] for not_applicable, got %+v", report.Findings)
+	}
+}
+
+func TestEngineDeterministicFaultInjection(t *testing.T) {
+	tmpDir := t.TempDir()
+	testFile := filepath.Join(tmpDir, "fault_test.go")
+	_ = os.WriteFile(testFile, []byte("package test\nfunc TestX(t *testing.T){}\n"), 0644)
+
+	eng := engine.New()
+
+	// 1. Injected Traversal Failure
+	resTrav, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+		FailTraversal: func(path string) error {
+			return errors.New("simulated traversal denial")
+		},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if resTrav.Report.Analysis.Status != "incomplete" || resTrav.Report.Analysis.Reason != "input_failure" || resTrav.Report.ExitCode != 2 {
+		t.Errorf("expected incomplete/input_failure/exit 2 on traversal fault, got %+v", resTrav.Report)
+	}
+
+	// 2. Injected Read Failure
+	resRead, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+		FailRead: func(path string) error {
+			return errors.New("simulated read denial")
+		},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if resRead.Report.Analysis.Status != "incomplete" || resRead.Report.Analysis.Reason != "input_failure" || resRead.Report.ExitCode != 2 {
+		t.Errorf("expected incomplete/input_failure/exit 2 on read fault, got %+v", resRead.Report)
+	}
+	if resRead.Report.Analysis.FailedFiles != 1 {
+		t.Errorf("expected 1 failed file on read fault, got %d", resRead.Report.Analysis.FailedFiles)
+	}
+}
+
+func TestEngineDiffModeRejected(t *testing.T) {
+	eng := engine.New()
+	res, err := eng.Run(engine.Options{
+		DiffOnly: true,
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if res.Report.Analysis.Status != "error" || res.Report.Analysis.Reason != "invalid_usage" || res.Report.ExitCode != 2 {
+		t.Errorf("expected error/invalid_usage/exit 2 for diff mode, got %+v", res.Report)
+	}
 }
diff --git a/pkg/reporter/azure.go b/pkg/reporter/azure.go
index d2bd325..163fbd8 100644
--- a/pkg/reporter/azure.go
+++ b/pkg/reporter/azure.go
@@ -20,9 +20,31 @@ func NewAzureReporter(out io.Writer) *AzureReporter {
 	return &AzureReporter{out: out}
 }
 
-// Render writes ##vso[task.logissue] commands for Azure Pipelines.
-func (r *AzureReporter) Render(violations []models.Violation) {
-	for _, v := range violations {
+// Render writes ##vso[task.logissue] commands for Azure Pipelines based on the ScanReport contract.
+func (r *AzureReporter) Render(report *models.ScanReport) int {
+	if report == nil {
+		return 2
+	}
+
+	// 1. Diagnostics as error annotations on incomplete or error
+	if report.Analysis.Status == "incomplete" || report.Analysis.Status == "error" {
+		for _, d := range report.Diagnostics {
+			if d.Path != nil && *d.Path != "" {
+				fmt.Fprintf(r.out, "##vso[task.logissue type=error;sourcepath=%s]%s: %s\n", *d.Path, d.Code, d.Message)
+			} else {
+				fmt.Fprintf(r.out, "##vso[task.logissue type=error]%s: %s\n", d.Code, d.Message)
+			}
+		}
+		if len(report.Diagnostics) == 0 {
+			fmt.Fprintf(r.out, "##vso[task.logissue type=error]TestGuard audit %s: %s\n", report.Analysis.Status, report.Analysis.Reason)
+		}
+	} else if report.Analysis.Status == "not_applicable" {
+		// Summary on not_applicable; MUST NOT emit task-success commands
+		fmt.Fprintf(r.out, "TestGuard audit not applicable: %s (exit 3)\n", report.Analysis.Reason)
+	}
+
+	// 2. Findings
+	for _, v := range report.Findings {
 		issueType := "warning"
 		if v.Severity == models.SeverityBlocker {
 			issueType = "error"
@@ -30,10 +52,16 @@ func (r *AzureReporter) Render(violations []models.Violation) {
 		fmt.Fprintf(r.out, "##vso[task.logissue type=%s;sourcepath=%s;linenumber=%d]%s\n",
 			issueType, v.FilePath, v.LineNumber, v.Message)
 	}
+
+	return report.ExitCode
 }
 
 // WriteMarkdownReport writes a detailed markdown scorecard to .testguard/report.md.
-func WriteMarkdownReport(filePath string, violations []models.Violation, scannedFiles, parseErrors, skipped int) error {
+func WriteMarkdownReport(filePath string, report *models.ScanReport) error {
+	if report == nil {
+		return fmt.Errorf("scan report is nil")
+	}
+
 	dir := filepath.Dir(filePath)
 	if err := os.MkdirAll(dir, 0755); err != nil {
 		return err
@@ -46,31 +74,59 @@ func WriteMarkdownReport(filePath string, violations []models.Violation, scanned
 	defer f.Close()
 
 	fmt.Fprintf(f, "# 🛡️ TestGuard Audit Report\n\n")
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
+	fmt.Fprintf(f, "- **Status**: %s (%s)\n", report.Analysis.Status, report.Analysis.Reason)
+	fmt.Fprintf(f, "- **Scanned Files**: %d\n", report.Analysis.AnalyzedFiles)
+	fmt.Fprintf(f, "- **Analyzed Tests**: %d\n", report.Analysis.AnalyzedTests)
+	fmt.Fprintf(f, "- **Failed Files**: %d\n", report.Analysis.FailedFiles)
+	fmt.Fprintf(f, "- **Total Violations**: %d\n", len(report.Findings))
+	fmt.Fprintf(f, "- **Exit Code**: %d\n\n", report.ExitCode)
+
+	if len(report.Diagnostics) > 0 {
+		fmt.Fprintf(f, "## Diagnostics\n\n")
+		fmt.Fprintf(f, "| Code | Path | Message |\n")
+		fmt.Fprintf(f, "|---|---|---|\n")
+		for _, d := range report.Diagnostics {
+			p := "-"
+			if d.Path != nil && *d.Path != "" {
+				p = fmt.Sprintf("`%s`", *d.Path)
+			}
+			fmt.Fprintf(f, "| `%s` | %s | %s |\n", d.Code, p, d.Message)
+		}
+		fmt.Fprintf(f, "\n")
+	}
+
+	if len(report.Findings) > 0 {
+		fmt.Fprintf(f, "## Violations\n\n")
+		fmt.Fprintf(f, "| Severity | Rule ID | Location | Message |\n")
+		fmt.Fprintf(f, "|---|---|---|---|\n")
+
+		for _, v := range report.Findings {
+			badge := "💡 Advisory"
+			switch v.Severity {
+			case models.SeverityBlocker:
+				badge = "🚨 Blocker"
+			case models.SeverityWarning:
+				badge = "⚠️ Warning"
+			}
+			fmt.Fprintf(f, "| %s | `%s` | `%s:%d` | %s |\n", badge, v.RuleID, v.FilePath, v.LineNumber, v.Message)
 		}
-		fmt.Fprintf(f, "| %s | `%s` | `%s:%d` | %s |\n", badge, v.RuleID, v.FilePath, v.LineNumber, v.Message)
 	}
 
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
index 2f45424..9837dd8 100644
--- a/pkg/reporter/reporter_test.go
+++ b/pkg/reporter/reporter_test.go
@@ -2,6 +2,9 @@ package reporter_test
 
 import (
 	"bytes"
+	"encoding/json"
+	"os"
+	"path/filepath"
 	"strings"
 	"testing"
 
@@ -31,9 +34,16 @@ func TestTerminalReporterTotalsFirst(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Findings = violations
+	report.Analysis.AnalyzedFiles = 10
+	report.Policy.BlockerCount = 1
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewTerminalReporter(&buf)
-	exitCode := r.Render(violations, 10, 0, 0)
+	exitCode := r.Render(report)
 
 	out := buf.String()
 	if exitCode != 1 {
@@ -65,9 +75,15 @@ func TestAzureDevOpsLogger(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Findings = violations
+	report.Policy.BlockerCount = 1
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewAzureReporter(&buf)
-	r.Render(violations)
+	r.Render(report)
 
 	out := buf.String()
 	expected := "##vso[task.logissue type=error;sourcepath=test/math_test.dart;linenumber=15]Zero assertions found in test.\n"
@@ -101,9 +117,16 @@ func TestTerminalReporterMonorepoBreakdown(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Findings = violations
+	report.Analysis.AnalyzedFiles = 100
+	report.Policy.BlockerCount = 2
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewTerminalReporter(&buf)
-	exitCode := r.RenderWithOptions(violations, 100, 0, 0, reporter.TerminalOptions{
+	exitCode := r.RenderWithOptions(report, reporter.TerminalOptions{
 		SummaryOnly: false,
 		MaxDisplay:  10,
 	})
@@ -134,9 +157,16 @@ func TestTerminalReporterSummaryOnly(t *testing.T) {
 		},
 	}
 
+	report := models.NewScanReport()
+	report.Findings = violations
+	report.Analysis.AnalyzedFiles = 10
+	report.Policy.BlockerCount = 1
+	report.Policy.Status = "blocker_found"
+	report.ExitCode = 1
+
 	var buf bytes.Buffer
 	r := reporter.NewTerminalReporter(&buf)
-	_ = r.RenderWithOptions(violations, 10, 0, 0, reporter.TerminalOptions{
+	_ = r.RenderWithOptions(report, reporter.TerminalOptions{
 		SummaryOnly: true,
 		ReportPath:  ".testguard/custom-report.md",
 	})
@@ -149,3 +179,184 @@ func TestTerminalReporterSummaryOnly(t *testing.T) {
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
+	exitCode := r.Render(report)
+
+	if exitCode != 3 {
+		t.Errorf("expected exit code 3 for not_applicable, got %d", exitCode)
+	}
+
+	out := buf.String()
+	if !strings.Contains(out, "Status: NOT APPLICABLE (empty_allowed)") {
+		t.Errorf("expected Status: NOT APPLICABLE in output, got %s", out)
+	}
+	if !strings.Contains(out, "Scope explicitly allows empty test set") {
+		t.Errorf("expected empty allowed explanation, got %s", out)
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
+	exitCode := r.Render(report)
+
+	if exitCode != 2 {
+		t.Errorf("expected exit code 2, got %d", exitCode)
+	}
+
+	out := buf.String()
+	if !strings.Contains(out, "Status: INCOMPLETE (input_failure)") {
+		t.Errorf("expected INCOMPLETE status, got %s", out)
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
+	exitInc := rInc.Render(reportInc)
+	if exitInc != 2 {
+		t.Errorf("expected exit code 2, got %d", exitInc)
+	}
+	outInc := bufInc.String()
+	if !strings.Contains(outInc, "##vso[task.logissue type=error;sourcepath=test/a_test.go]read_failed: permission denied") {
+		t.Errorf("expected error logissue in Azure output, got %s", outInc)
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
+	exitNA := rNA.Render(reportNA)
+	if exitNA != 3 {
+		t.Errorf("expected exit code 3, got %d", exitNA)
+	}
+	outNA := bufNA.String()
+	if !strings.Contains(outNA, "TestGuard audit not applicable: empty_allowed") {
+		t.Errorf("expected summary message, got %s", outNA)
+	}
+	if strings.Contains(outNA, "##vso[task.complete result=Succeeded;]") {
+		t.Errorf("Azure reporter must NOT emit task-success commands")
+	}
+}
+
+func TestWriteJSONReportSchemaV1(t *testing.T) {
+	report := models.NewScanReport()
+	report.Tool = models.NewToolMeta("0.2.0", "none", "unknown")
+	report.Scope.RequestedPaths = []string{"sample_test.go"}
+	report.Scope.Files = []string{"sample_test.go"}
+	report.Analysis.DiscoveredFiles = 1
+	report.Analysis.AnalyzedFiles = 1
+	report.Analysis.AnalyzedTests = 1
+	report.ExitCode = 0
+
+	var buf bytes.Buffer
+	if err := reporter.WriteJSONReport(&buf, report); err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+
+	raw := buf.String()
+	// Must be exactly one line with trailing newline
+	lines := strings.Split(strings.TrimRight(raw, "\n"), "\n")
+	if len(lines) != 1 {
+		t.Errorf("expected exactly 1 JSON line, got %d", len(lines))
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
diff --git a/pkg/reporter/terminal.go b/pkg/reporter/terminal.go
index 4c2b23e..ce5bf32 100644
--- a/pkg/reporter/terminal.go
+++ b/pkg/reporter/terminal.go
@@ -29,8 +29,8 @@ func NewTerminalReporter(out io.Writer) *TerminalReporter {
 }
 
 // Render writes the formatted scorecard and findings to stdout and returns the exit code.
-func (r *TerminalReporter) Render(violations []models.Violation, scannedFiles, parseErrors, skipped int) int {
-	return r.RenderWithOptions(violations, scannedFiles, parseErrors, skipped, TerminalOptions{
+func (r *TerminalReporter) Render(report *models.ScanReport) int {
+	return r.RenderWithOptions(report, TerminalOptions{
 		MaxDisplay: 10,
 		ReportPath: ".testguard/report.md",
 	})
@@ -86,7 +86,10 @@ func extractModule(filePath string) string {
 }
 
 // RenderWithOptions renders the scorecard with monorepo module breakdown and summary controls.
-func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scannedFiles, parseErrors, skipped int, opts TerminalOptions) int {
+func (r *TerminalReporter) RenderWithOptions(report *models.ScanReport, opts TerminalOptions) int {
+	if report == nil {
+		return 2
+	}
 	if opts.MaxDisplay <= 0 {
 		opts.MaxDisplay = 10
 	}
@@ -94,6 +97,11 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 		opts.ReportPath = ".testguard/report.md"
 	}
 
+	violations := report.Findings
+	scannedFiles := report.Analysis.AnalyzedFiles
+	parseErrors := report.Analysis.FailedFiles
+	skipped := len(report.Scope.Excluded)
+
 	blockers := 0
 	warnings := 0
 	advisories := 0
@@ -129,10 +137,21 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 		ruleCounts[v.RuleID]++
 	}
 
+	if report.Analysis.Status == "not_applicable" {
+		fmt.Fprintf(r.out, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
+		fmt.Fprintf(r.out, "🛡️ TestGuard Audit · Status: NOT APPLICABLE (%s)\n", report.Analysis.Reason)
+		fmt.Fprintf(r.out, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
+		fmt.Fprintf(r.out, "✨ Scope explicitly allows empty test set; no tests analyzed.\n")
+		return report.ExitCode
+	}
+
 	status := "PASSED"
 	if blockers > 0 {
 		status = "FAILED"
 	}
+	if report.Analysis.Status == "incomplete" || report.Analysis.Status == "error" {
+		status = fmt.Sprintf("%s (%s)", strings.ToUpper(report.Analysis.Status), report.Analysis.Reason)
+	}
 
 	fmt.Fprintf(r.out, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
 	if len(moduleMap) > 1 {
@@ -143,11 +162,24 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 	fmt.Fprintf(r.out, "Status: %s · 🚨 %d Blocker(s) · ⚠️ %d Warning(s) · 💡 %d Advisory(ies)\n", status, blockers, warnings, advisories)
 	fmt.Fprintf(r.out, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
 
-	if len(violations) == 0 {
-		fmt.Fprintf(r.out, "✨ All tests adhere to boundary and quality standards!\n")
-		return 0
+	if len(report.Diagnostics) > 0 {
+		fmt.Fprintf(r.out, "DIAGNOSTICS:\n")
+		for _, d := range report.Diagnostics {
+			if d.Path != nil && *d.Path != "" {
+				fmt.Fprintf(r.out, "  ❌ [%s] %s: %s\n", d.Code, *d.Path, d.Message)
+			} else {
+				fmt.Fprintf(r.out, "  ❌ [%s] %s\n", d.Code, d.Message)
+			}
+		}
+		fmt.Fprintln(r.out)
 	}
 
+	if len(violations) == 0 {
+		if report.Analysis.Status == "complete" {
+			fmt.Fprintf(r.out, "✨ All tests adhere to boundary and quality standards!\n")
+		}
+		return report.ExitCode
+	}
 	// 1. Render Module Breakdown if monorepo / multi-module
 	if len(moduleMap) > 1 {
 		var modules []*moduleStats
@@ -282,8 +314,5 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 		displayed++
 	}
 
-	if blockers > 0 {
-		return 1
-	}
-	return 0
+	return report.ExitCode
 }


## Added cmd/testguard/main_test.go
sha256=ba7e219a267f4d14495cd993bba9f57a7f0c78ceada10e81e60d51732744687b

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
	stdout, _, exitCode := helperProcess(t, "--output", "report.md", "--json")
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


## Added pkg/engine/discovery_test.go
sha256=a58b313644f3be90d220cfa3843367afb9f543db4f409149481804a3f9dbb2e0

package engine_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/HoangNguyen0403/testguard/pkg/engine"
	"github.com/HoangNguyen0403/testguard/pkg/parser/dart"
)

func TestDiscoverScopeSymlinkRejected(t *testing.T) {
	tmpDir := t.TempDir()
	realFile := filepath.Join(tmpDir, "real_test.go")
	_ = os.WriteFile(realFile, []byte("package test\nfunc TestReal(t *testing.T){}\n"), 0644)

	symlinkPath := filepath.Join(tmpDir, "symlink_test.go")
	err := os.Symlink(realFile, symlinkPath)
	if err != nil {
		t.Skip("symlinks not supported on this environment")
	}

	adapter := dart.NewAdapter()
	res := engine.DiscoverScope([]string{symlinkPath}, adapter, nil)

	if !res.InputFailure {
		t.Errorf("expected InputFailure to be true for explicit symlink target")
	}
	hasSymlinkDiag := false
	for _, d := range res.Diagnostics {
		if d.Code == "target_unreadable" {
			hasSymlinkDiag = true
		}
	}
	if !hasSymlinkDiag {
		t.Errorf("expected target_unreadable diagnostic for symlink target, got %+v", res.Diagnostics)
	}
}

func TestDiscoverScopeDefaultDirectoryExclusions(t *testing.T) {
	tmpDir := t.TempDir()

	// Normal test file
	_ = os.WriteFile(filepath.Join(tmpDir, "normal_test.go"), []byte("package test\nfunc TestN(t *testing.T){}\n"), 0644)

	// Excluded directories
	dirs := []string{".git", ".testguard", "node_modules", "vendor", "build", "dist"}
	for _, d := range dirs {
		sub := filepath.Join(tmpDir, d)
		_ = os.MkdirAll(sub, 0755)
		_ = os.WriteFile(filepath.Join(sub, "hidden_test.go"), []byte("package test\n"), 0644)
	}

	adapter := dart.NewAdapter()
	res := engine.DiscoverScope([]string{tmpDir}, adapter, nil)

	if len(res.CandidateFiles) != 1 {
		t.Errorf("expected exactly 1 candidate file, got %d (%+v)", len(res.CandidateFiles), res.CandidateFiles)
	}

	// Verify all directories were recorded in Excluded with reason default_directory
	excludedCount := 0
	for _, ex := range res.Excluded {
		if ex.Reason == "default_directory" {
			excludedCount++
		}
	}
	if excludedCount < len(dirs) {
		t.Errorf("expected at least %d default_directory exclusions, got %d", len(dirs), excludedCount)
	}
}

func TestDiscoverScopeExplicitNonTestFile(t *testing.T) {
	tmpDir := t.TempDir()
	sourceFile := filepath.Join(tmpDir, "server.go")
	_ = os.WriteFile(sourceFile, []byte("package main\nfunc main(){}\n"), 0644)

	adapter := dart.NewAdapter()
	res := engine.DiscoverScope([]string{sourceFile}, adapter, nil)

	if len(res.CandidateFiles) != 0 {
		t.Errorf("non-test file must not be in candidate files")
	}
	hasNonTest := false
	for _, ex := range res.Excluded {
		if ex.Reason == "non_test" {
			hasNonTest = true
		}
	}
	if !hasNonTest {
		t.Errorf("expected non_test exclusion for explicit non-test file, got %+v", res.Excluded)
	}
}

func TestDiscoverScopeExplicitUnsupportedFile(t *testing.T) {
	tmpDir := t.TempDir()
	docFile := filepath.Join(tmpDir, "spec.pdf")
	_ = os.WriteFile(docFile, []byte("%PDF-1.4"), 0644)

	adapter := dart.NewAdapter()
	res := engine.DiscoverScope([]string{docFile}, adapter, nil)

	if len(res.Unsupported) != 1 {
		t.Errorf("expected 1 unsupported file, got %+v", res.Unsupported)
	}
	hasDiag := false
	for _, d := range res.Diagnostics {
		if d.Code == "unsupported_input" {
			hasDiag = true
		}
	}
	if !hasDiag {
		t.Errorf("expected unsupported_input diagnostic, got %+v", res.Diagnostics)
	}
}

func TestDiscoverScopeGeneratedDartFile(t *testing.T) {
	tmpDir := t.TempDir()
	genFile := filepath.Join(tmpDir, "model_test.dart")
	_ = os.WriteFile(genFile, []byte("// GENERATED CODE - DO NOT MODIFY BY HAND\nvoid main(){}\n"), 0644)

	adapter := dart.NewAdapter()
	res := engine.DiscoverScope([]string{tmpDir}, adapter, nil)

	if len(res.CandidateFiles) != 0 {
		t.Errorf("generated file must not be in candidate files")
	}
	if res.DiscoveredFiles != 1 {
		t.Errorf("discovered_files must count generated candidates before exclusion, got %d", res.DiscoveredFiles)
	}
	hasGenExcluded := false
	for _, ex := range res.Excluded {
		if ex.Reason == "generated" {
			hasGenExcluded = true
		}
	}
	if !hasGenExcluded {
		t.Errorf("expected generated exclusion, got %+v", res.Excluded)
	}
}


## Added pkg/models/scan_report.go
sha256=2e70586b1cf3c5dbfac9786c4ffadcf015fe959307e706d6fd337d6b000c217a

package models

// ExcludedPath represents a path excluded from scan analysis and the exclusion reason.
type ExcludedPath struct {
	Path   string `json:"path"`
	Reason string `json:"reason"` // "default_directory" | "generated" | "non_test"
}

// ToolMeta records metadata identifying TestGuard and its build revision.
type ToolMeta struct {
	Name    string  `json:"name"`
	Version string  `json:"version"`
	Commit  *string `json:"commit"`
	BuiltAt *string `json:"built_at"`
}

// ScanScope records caller requested paths and effective scope resolution.
type ScanScope struct {
	RequestedPaths []string       `json:"requested_paths"`
	EffectiveMode  string         `json:"effective_mode"` // "full"
	Files          []string       `json:"files"`
	Excluded       []ExcludedPath `json:"excluded"`
	Unsupported    []string       `json:"unsupported"`
	ConfigApplied  bool           `json:"config_applied"` // false
}

// AnalysisSummary records analysis status, reason, and test file counters.
type AnalysisSummary struct {
	Status          string `json:"status"` // "complete" | "incomplete" | "not_applicable" | "error"
	Reason          string `json:"reason"` // "analyzed" | "input_failure" | "empty_scope" | "empty_allowed" | "unsupported_scope" | "invalid_usage" | "output_failure"
	DiscoveredFiles int    `json:"discovered_files"`
	AnalyzedFiles   int    `json:"analyzed_files"`
	AnalyzedTests   int    `json:"analyzed_tests"`
	FailedFiles     int    `json:"failed_files"`
}

// Diagnostic represents a structured failure or warning diagnostic.
type Diagnostic struct {
	Code    string  `json:"code"`
	Path    *string `json:"path"`
	Message string  `json:"message"`
}

// ScanPolicy records blocker count and policy evaluation status.
type ScanPolicy struct {
	BlockerCount int    `json:"blocker_count"`
	Status       string `json:"status"` // "no_blocker" | "blocker_found"
}

// ScanReport is the exact v1 JSON envelope emitted by TestGuard.
type ScanReport struct {
	SchemaVersion int             `json:"schema_version"`
	Tool          ToolMeta        `json:"tool"`
	Scope         ScanScope       `json:"scope"`
	Analysis      AnalysisSummary `json:"analysis"`
	Findings      []Violation     `json:"findings"`
	Diagnostics   []Diagnostic    `json:"diagnostics"`
	Policy        ScanPolicy      `json:"policy"`
	ExitCode      int             `json:"exit_code"`
}

// NewToolMeta initializes tool metadata, mapping "none" or "unknown" to nil pointers.
func NewToolMeta(version, commit, builtAt string) ToolMeta {
	var commitPtr *string
	if commit != "" && commit != "none" {
		c := commit
		commitPtr = &c
	}
	var builtAtPtr *string
	if builtAt != "" && builtAt != "unknown" {
		b := builtAt
		builtAtPtr = &b
	}
	return ToolMeta{
		Name:    "testguard",
		Version: version,
		Commit:  commitPtr,
		BuiltAt: builtAtPtr,
	}
}

// NewDiagnostic creates a diagnostic with an optional path pointer.
func NewDiagnostic(code, path, message string) Diagnostic {
	var pathPtr *string
	if path != "" {
		p := path
		pathPtr = &p
	}
	return Diagnostic{
		Code:    code,
		Path:    pathPtr,
		Message: message,
	}
}

// NewScanReport creates an initialized ScanReport with non-nil slices.
func NewScanReport() *ScanReport {
	return &ScanReport{
		SchemaVersion: 1,
		Tool: ToolMeta{
			Name: "testguard",
		},
		Scope: ScanScope{
			RequestedPaths: make([]string, 0),
			EffectiveMode:  "full",
			Files:          make([]string, 0),
			Excluded:       make([]ExcludedPath, 0),
			Unsupported:    make([]string, 0),
			ConfigApplied:  false,
		},
		Analysis: AnalysisSummary{
			Status: "complete",
			Reason: "analyzed",
		},
		Findings:    make([]Violation, 0),
		Diagnostics: make([]Diagnostic, 0),
		Policy: ScanPolicy{
			BlockerCount: 0,
			Status:       "no_blocker",
		},
		ExitCode: 0,
	}
}

