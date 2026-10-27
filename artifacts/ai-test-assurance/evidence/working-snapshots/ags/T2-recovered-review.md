# Immutable review snapshot T2-recovered

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance
Base: 8fc53b4c683d312359166e49e397fa887dd0ac92
Captured: 2026-10-26T22:42:07.167Z

## Tracked diff

diff --git a/cmd/testguard/main.go b/cmd/testguard/main.go
index 36ef75c..22a7531 100644
--- a/cmd/testguard/main.go
+++ b/cmd/testguard/main.go
@@ -3,12 +3,13 @@ package main
 import (
 	"fmt"
 	"os"
+	"strings"
 
 	"github.com/HoangNguyen0403/testguard/pkg/docs"
 	"github.com/HoangNguyen0403/testguard/pkg/engine"
+	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/HoangNguyen0403/testguard/pkg/reporter"
 	"github.com/HoangNguyen0403/testguard/pkg/updater"
-	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/spf13/cobra"
 )
 
@@ -19,9 +20,111 @@ var (
 	repo    = "HoangNguyen0403/testguard"
 )
 
+func isJSONModeRequested(args []string) bool {
+	for _, arg := range args {
+		if !strings.HasPrefix(arg, "-") {
+			switch arg {
+			case "explain", "rules", "update", "init", "help", "completion":
+				return false
+			}
+			break
+		}
+	}
+
+	jsonFlag := false
+	format := ""
+	for i := range len(args) {
+		arg := args[i]
+		if arg == "--" {
+			break
+		}
+		switch {
+		case arg == "--json":
+			jsonFlag = true
+		case strings.HasPrefix(arg, "--json="):
+			switch strings.TrimPrefix(arg, "--json=") {
+			case "true":
+				jsonFlag = true
+			case "false":
+				jsonFlag = false
+			default:
+				// Invalid boolean spellings still name JSON mode: the parse
+				// error they cause must be reported inside the JSON envelope.
+				jsonFlag = true
+			}
+		case arg == "-f" || arg == "--format":
+			if i+1 < len(args) {
+				format = args[i+1]
+			}
+		case strings.HasPrefix(arg, "-f="):
+			format = strings.TrimPrefix(arg, "-f=")
+		case strings.HasPrefix(arg, "--format="):
+			format = strings.TrimPrefix(arg, "--format=")
+		case strings.HasPrefix(arg, "-f") && !strings.HasPrefix(arg, "--"):
+			// Cobra accepts an attached shorthand value (-fjson).
+			format = strings.TrimPrefix(arg, "-f")
+		}
+	}
+	return jsonFlag || format == "json"
+}
+
+func extractRequestedPaths(args []string) []string {
+	var paths []string
+	pastDashDash := false
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
+		if strings.HasPrefix(arg, "-") {
+			if arg == "-f" || arg == "--format" || arg == "-o" || arg == "--output" || arg == "--top" {
+				i++
+			}
+			continue
+		}
+		switch arg {
+		case "explain", "rules", "update", "init", "help", "completion":
+			return nil
+		default:
+			paths = append(paths, arg)
+		}
+	}
+	if len(paths) == 0 {
+		return []string{"."}
+	}
+	return paths
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
@@ -50,23 +153,41 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
 
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
 
+			if diffMode {
+				emitCLIError(isJSON, "--diff mode is not supported; use full scan", args, version, commit, date)
+			}
+
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
@@ -81,68 +202,64 @@ Issues:  https://github.com/HoangNguyen0403/testguard/issues`,
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
@@ -253,6 +370,11 @@ languages:
 	rootCmd.AddCommand(initCmd)
 
 	if err := rootCmd.Execute(); err != nil {
-		os.Exit(2)
+		if isJSONModeRequested(os.Args[1:]) {
+			emitCLIError(true, err.Error(), extractRequestedPaths(os.Args[1:]), version, commit, date)
+		} else {
+			fmt.Fprintf(os.Stderr, "Error: %s\n", err.Error())
+			os.Exit(2)
+		}
 	}
 }
diff --git a/pkg/engine/discovery.go b/pkg/engine/discovery.go
index 46a58f8..b42effd 100644
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
@@ -85,37 +87,214 @@ func isTestFileName(name string) bool {
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
+
+// normalizePath converts a path to a canonical cwd-relative slash path.
+func normalizePath(path string) string {
+	cwd, err := os.Getwd()
+	if err != nil {
+		return filepath.ToSlash(filepath.Clean(path))
+	}
+	abs, err := filepath.Abs(path)
+	if err != nil {
+		abs = filepath.Clean(path)
+	}
+	rel, err := filepath.Rel(cwd, abs)
+	if err != nil {
+		return filepath.ToSlash(abs)
+	}
+	return filepath.ToSlash(rel)
+}
+
+// canonicalAbsPath returns the absolute cleaned path used for deduplication.
+func canonicalAbsPath(path string) string {
+	abs, err := filepath.Abs(path)
+	if err != nil {
+		return filepath.Clean(path)
+	}
+	return filepath.Clean(abs)
+}
+
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
 
-	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
+	seenDiscovered := make(map[string]bool)
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
+			}
+		}
+
+		trimmed := strings.TrimRight(p, string(filepath.Separator)+"/")
+		if trimmed == "" {
+			trimmed = p
+		}
+		fi, err := os.Lstat(trimmed)
 		if err != nil {
-			return nil
+			result.InputFailure = true
+			result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("target_unreadable", p, err.Error()))
+			continue
 		}
 
-		if d.IsDir() {
-			name := d.Name()
-			if path != dir && (strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "build" || name == "dist") {
-				return filepath.SkipDir
+		if fi.Mode()&os.ModeSymlink != 0 {
+			result.InputFailure = true
+			result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("target_unreadable", p, fmt.Sprintf("target %q is a symlink; symlinks are not supported", p)))
+			continue
+		}
+
+		if !fi.IsDir() {
+			ext := filepath.Ext(trimmed)
+			if !isSupportedLanguageExtension(ext) {
+				norm := normalizePath(p)
+				if !unsupportedMap[norm] {
+					unsupportedMap[norm] = true
+					result.Unsupported = append(result.Unsupported, norm)
+				}
+				result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("unsupported_input", norm, fmt.Sprintf("unsupported file extension %q for target %s", ext, p)))
+				continue
 			}
-			return nil
+
+			if !isTestFileName(filepath.Base(trimmed)) {
+				norm := normalizePath(p)
+				if !excludedMap[norm] {
+					excludedMap[norm] = true
+					result.Excluded = append(result.Excluded, models.ExcludedPath{Path: norm, Reason: "non_test"})
+				}
+				continue
+			}
+
+			canon := canonicalAbsPath(trimmed)
+			if !seenDiscovered[canon] {
+				seenDiscovered[canon] = true
+				result.DiscoveredFiles++
+
+				header := make([]byte, 256)
+				f, oerr := os.Open(trimmed)
+				if oerr == nil {
+					_, _ = f.Read(header)
+					f.Close()
+				}
+				if adapter.IsGenerated(trimmed, header) {
+					norm := normalizePath(trimmed)
+					if !excludedMap[norm] {
+						excludedMap[norm] = true
+						result.Excluded = append(result.Excluded, models.ExcludedPath{Path: norm, Reason: "generated"})
+					}
+				} else {
+					result.CandidateFiles = append(result.CandidateFiles, trimmed)
+				}
+			}
+			continue
 		}
 
-		if isTestFileName(d.Name()) {
-			header := make([]byte, 256)
-			f, err := os.Open(path)
-			if err == nil {
-				_, _ = f.Read(header)
-				f.Close()
+		// Directory traversal
+		walkErr := filepath.WalkDir(trimmed, func(path string, d fs.DirEntry, werr error) error {
+			if failTraversal != nil {
+				if ferr := failTraversal(path); ferr != nil {
+					result.InputFailure = true
+					result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("traversal_failed", normalizePath(path), ferr.Error()))
+					return nil
+				}
 			}
-			if !adapter.IsGenerated(path, header) {
-				files = append(files, path)
+			if werr != nil {
+				result.InputFailure = true
+				result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("traversal_failed", normalizePath(path), werr.Error()))
+				return nil
 			}
+
+			if d.IsDir() {
+				if path != trimmed {
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
+				canon := canonicalAbsPath(path)
+				if !seenDiscovered[canon] {
+					seenDiscovered[canon] = true
+					result.DiscoveredFiles++
+
+					header := make([]byte, 256)
+					f, oerr := os.Open(path)
+					if oerr == nil {
+						_, _ = f.Read(header)
+						f.Close()
+					}
+					if adapter.IsGenerated(path, header) {
+						norm := normalizePath(path)
+						if !excludedMap[norm] {
+							excludedMap[norm] = true
+							result.Excluded = append(result.Excluded, models.ExcludedPath{Path: norm, Reason: "generated"})
+						}
+					} else {
+						result.CandidateFiles = append(result.CandidateFiles, path)
+					}
+				}
+			}
+			return nil
+		})
+		if walkErr != nil {
+			result.InputFailure = true
+			result.Diagnostics = append(result.Diagnostics, models.NewDiagnostic("traversal_failed", normalizePath(trimmed), walkErr.Error()))
 		}
+	}
 
-		return nil
+	sort.Strings(result.Unsupported)
+	sort.Slice(result.Excluded, func(i, j int) bool {
+		return result.Excluded[i].Path < result.Excluded[j].Path
 	})
+	sort.Strings(result.CandidateFiles)
 
-	return files, err
+	return result
 }
diff --git a/pkg/engine/engine.go b/pkg/engine/engine.go
index d2f32df..08170ab 100644
--- a/pkg/engine/engine.go
+++ b/pkg/engine/engine.go
@@ -1,11 +1,15 @@
 package engine
 
 import (
-	"fmt"
+	"go/ast"
+	goparser "go/parser"
+	"go/token"
 	"os"
-	"path/filepath"
 	"regexp"
+	"sort"
 	"strings"
+	"unicode"
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
@@ -206,66 +219,151 @@ func parseGenericTestUnits(content []byte, filePath string) []parser.TestUnit {
 
 	return units
 }
+// isGoTestFunc returns true if fn is an executable Go test declaration.
+func isGoTestFunc(fn *ast.FuncDecl) bool {
+	if fn.Recv != nil {
+		return false
+	}
+	name := fn.Name.Name
+	if !strings.HasPrefix(name, "Test") && !strings.HasPrefix(name, "Benchmark") && !strings.HasPrefix(name, "Example") && !strings.HasPrefix(name, "Fuzz") {
+		return false
+	}
+	if strings.HasPrefix(name, "Test") && len(name) > 4 {
+		firstAfter := rune(name[4])
+		if unicode.IsLower(firstAfter) {
+			return false
+		}
+	}
+	return true
+}
+
+// extractGoTestUnits extracts genuine executable test declarations from Go AST.
+func extractGoTestUnits(fset *token.FileSet, fileAST *ast.File, content []byte, filePath string) []parser.TestUnit {
+	var units []parser.TestUnit
+	src := string(content)
+	for _, decl := range fileAST.Decls {
+		fn, ok := decl.(*ast.FuncDecl)
+		if !ok || !isGoTestFunc(fn) {
+			continue
+		}
+		startPos := fset.Position(fn.Pos())
+		endPos := fset.Position(fn.End())
+
+		startOffset := startPos.Offset
+		endOffset := endPos.Offset
+		if startOffset < 0 {
+			startOffset = 0
+		}
+		if endOffset > len(src) {
+			endOffset = len(src)
+		}
+
+		body := ""
+		if startOffset < endOffset {
+			body = src[startOffset:endOffset]
+		}
+
+		var assertions []string
+		if genericAssertionRegex.MatchString(body) {
+			assertions = []string{"assert"}
+		}
+
+		units = append(units, parser.TestUnit{
+			Name:       fn.Name.Name,
+			FilePath:   filePath,
+			StartLine:  startPos.Line,
+			EndLine:    endPos.Line,
+			Kind:       "unit",
+			RawBody:    body,
+			Assertions: assertions,
+		})
+	}
+	return units
+}
+
 
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
 
+	analyzedFiles := make([]string, 0)
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
+				failedFilesMap[canonicalAbsPath(file)] = true
+				hasInputFailure = true
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("read_failed", normalizePath(file), ferr.Error()))
+				continue
+			}
+		}
+
 		content, err := os.ReadFile(file)
 		if err != nil {
-			result.ParseErrors++
+			failedFilesMap[canonicalAbsPath(file)] = true
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
+			fileAST, parseErr := goparser.ParseFile(fset, file, content, 0)
+			if parseErr != nil {
+				failedFilesMap[canonicalAbsPath(file)] = true
+				hasInputFailure = true
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("parse_failed", normalizePath(file), parseErr.Error()))
+				continue
+			}
+			units = extractGoTestUnits(fset, fileAST, content, file)
+		} else if strings.HasSuffix(file, ".dart") {
 			u, err := e.dartAdapter.LocateTests(content, file)
 			if err != nil {
-				result.ParseErrors++
+				failedFilesMap[canonicalAbsPath(file)] = true
+				hasInputFailure = true
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("parse_failed", normalizePath(file), err.Error()))
 				continue
 			}
 			units = u
@@ -273,13 +371,32 @@ func (e *Engine) Run(opts Options) (*Result, error) {
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
 
+		evalUnits := units
+		if len(evalUnits) == 0 {
+			evalUnits = []parser.TestUnit{{
+				Name:      file,
+				FilePath:  file,
+				StartLine: 1,
+				Kind:      "file",
+				RawBody:   string(content),
+			}}
+		}
+
 		// 1. Universal checks
 		fileViolations = append(fileViolations, e.zeroAssert.Check(units)...)
-		fileViolations = append(fileViolations, e.cloneDetect.Check(units)...)
-		fileViolations = append(fileViolations, e.namingDetect.Check(units)...)
-
+		fileViolations = append(fileViolations, e.cloneDetect.Check(evalUnits)...)
+		fileViolations = append(fileViolations, e.namingDetect.Check(evalUnits)...)
 		// 2. Language & Framework rules
 		if strings.HasSuffix(file, ".dart") {
 			fileViolations = append(fileViolations, e.blocDuplicateRule.Check(units)...)
@@ -314,10 +431,73 @@ func (e *Engine) Run(opts Options) (*Result, error) {
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
index 0a3b2f4..202250c 100644
--- a/pkg/engine/engine_test.go
+++ b/pkg/engine/engine_test.go
@@ -1,9 +1,12 @@
 package engine_test
 
 import (
+	"encoding/json"
+	"errors"
 	"fmt"
 	"os"
 	"path/filepath"
+	"strings"
 	"testing"
 
 	"github.com/HoangNguyen0403/testguard/pkg/engine"
@@ -108,17 +111,14 @@ func TestEngineProgressCallback(t *testing.T) {
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
@@ -132,11 +132,26 @@ func TestEngineProgressCallback(t *testing.T) {
 
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
 
@@ -146,7 +161,7 @@ func TestEnginePathDeduplication(t *testing.T) {
 	_ = os.MkdirAll(testDir, 0755)
 
 	file1 := filepath.Join(testDir, "sample_test.go")
-	_ = os.WriteFile(file1, []byte("package test\nfunc TestSample(t *testing.T) {}\n"), 0644)
+	_ = os.WriteFile(file1, []byte("package test\nimport \"testing\"\nfunc TestSample(t *testing.T) {\n  if 1 != 1 { t.Fail() }\n}\n"), 0644)
 
 	eng := engine.New()
 	res, err := eng.Run(engine.Options{
@@ -159,4 +174,499 @@ func TestEnginePathDeduplication(t *testing.T) {
 	if res.ScannedFiles != 1 {
 		t.Errorf("expected exactly 1 scanned file due to deduplication, got %d", res.ScannedFiles)
 	}
+	if res.Report.Analysis.DiscoveredFiles != 1 {
+		t.Errorf("expected DiscoveredFiles 1, got %d", res.Report.Analysis.DiscoveredFiles)
+	}
+	if res.Report.Analysis.AnalyzedFiles != 1 {
+		t.Errorf("expected AnalyzedFiles 1, got %d", res.Report.Analysis.AnalyzedFiles)
+	}
+	if len(res.Report.Scope.Files) != 1 {
+		t.Errorf("expected scope.files length 1, got %d", len(res.Report.Scope.Files))
+	}
+}
+
+func TestEngineStableScopeAcrossPathSpellings(t *testing.T) {
+	tmpDir := t.TempDir()
+	testFile := filepath.Join(tmpDir, "sample_test.go")
+	_ = os.WriteFile(testFile, []byte("package test\nimport \"testing\"\nfunc TestSample(t *testing.T) {\n  if 1 != 1 { t.Fatal(\"fail\") }\n}\n"), 0644)
+
+	cwd, err := os.Getwd()
+	if err != nil {
+		t.Fatalf("unable to resolve cwd: %v", err)
+	}
+	rel, err := filepath.Rel(cwd, testFile)
+	if err != nil {
+		t.Fatalf("unable to express fixture relative to cwd: %v", err)
+	}
+	wantFile := filepath.ToSlash(rel)
+
+	spellings := []string{testFile, rel, "." + string(filepath.Separator) + rel}
+	eng := engine.New()
+	for _, spelling := range spellings {
+		res, err := eng.Run(engine.Options{TargetPaths: []string{spelling}})
+		if err != nil {
+			t.Fatalf("unexpected error for spelling %q: %v", spelling, err)
+		}
+		report := res.Report
+		if len(report.Scope.Files) != 1 || report.Scope.Files[0] != wantFile {
+			t.Errorf("spelling %q: expected scope.files [%q], got %+v", spelling, wantFile, report.Scope.Files)
+		}
+		if len(report.Scope.RequestedPaths) != 1 || report.Scope.RequestedPaths[0] != spelling {
+			t.Errorf("spelling %q: requested_paths must keep the original value, got %+v", spelling, report.Scope.RequestedPaths)
+		}
+		if report.Analysis.Status != "complete" || report.Analysis.AnalyzedTests != 1 || report.ExitCode != 0 {
+			t.Errorf("spelling %q: expected complete/1 test/exit 0, got status=%q tests=%d exit=%d",
+				spelling, report.Analysis.Status, report.Analysis.AnalyzedTests, report.ExitCode)
+		}
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
+	// Exact retained finding verification (R12)
+	if len(report.Findings) != 1 {
+		t.Fatalf("expected exactly 1 retained finding, got %d (%+v)", len(report.Findings), report.Findings)
+	}
+	finding := report.Findings[0]
+	if finding.RuleID != "GUARD-UNIV-ZERO" {
+		t.Errorf("expected rule GUARD-UNIV-ZERO, got %s", finding.RuleID)
+	}
+	if finding.Severity != models.SeverityBlocker {
+		t.Errorf("expected SeverityBlocker, got %s", finding.Severity)
+	}
+	if !strings.HasSuffix(finding.FilePath, "zero_assert_test.go") {
+		t.Errorf("expected finding in zero_assert_test.go, got %s", finding.FilePath)
+	}
+	if report.Policy.BlockerCount != 1 {
+		t.Errorf("expected blocker count exactly 1, got %d", report.Policy.BlockerCount)
+	}
+	if report.Policy.Status != "blocker_found" {
+		t.Errorf("expected policy status blocker_found, got %s", report.Policy.Status)
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
+
+	// Verify empty array [] serialization (R2)
+	data, _ := json.Marshal(report)
+	var raw map[string]interface{}
+	_ = json.Unmarshal(data, &raw)
+	scope := raw["scope"].(map[string]interface{})
+	if files, ok := scope["files"].([]interface{}); !ok || files == nil {
+		t.Errorf("expected scope.files to be empty array [], got %v", scope["files"])
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
+	if len(report.Scope.Files) != 0 {
+		t.Errorf("expected empty scope.files, got %+v", report.Scope.Files)
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
+}
+
+func TestEngineGoASTFakeTestControls(t *testing.T) {
+	tmpDir := t.TempDir()
+
+	// File with only raw string containing test declaration, plus comments and helper function
+	fixtureFile := filepath.Join(tmpDir, "fixture_test.go")
+	fixtureContent := []byte(`package test
+import "testing"
+
+const fixture = ` + "`" + `
+func TestFakeInString(t *testing.T) {
+    t.Fatal("this is inside a string literal, not a real test declaration")
+}
+` + "`" + `
+
+// func TestCommentedOut(t *testing.T) { t.Fail() }
+
+func HelperFunction() string {
+    return "helper"
+}
+`)
+	_ = os.WriteFile(fixtureFile, fixtureContent, 0644)
+
+	eng := engine.New()
+
+	// 1. Without allow-empty: must report 0 analyzed tests and exit 2 empty_scope
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{fixtureFile},
+		AllowEmpty:  false,
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if res.Report.Analysis.AnalyzedTests != 0 {
+		t.Errorf("expected 0 analyzed tests for raw-string/comment fake tests, got %d", res.Report.Analysis.AnalyzedTests)
+	}
+	if res.Report.Analysis.Status != "incomplete" || res.Report.Analysis.Reason != "empty_scope" || res.Report.ExitCode != 2 {
+		t.Errorf("expected incomplete/empty_scope/exit 2, got status=%q, reason=%q, exit=%d",
+			res.Report.Analysis.Status, res.Report.Analysis.Reason, res.Report.ExitCode)
+	}
+
+	// 2. With allow-empty: must report 0 analyzed tests and exit 3 not_applicable
+	resAllowed, err := eng.Run(engine.Options{
+		TargetPaths: []string{fixtureFile},
+		AllowEmpty:  true,
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if resAllowed.Report.Analysis.AnalyzedTests != 0 {
+		t.Errorf("expected 0 analyzed tests, got %d", resAllowed.Report.Analysis.AnalyzedTests)
+	}
+	if resAllowed.Report.Analysis.Status != "not_applicable" || resAllowed.Report.Analysis.Reason != "empty_allowed" || resAllowed.Report.ExitCode != 3 {
+		t.Errorf("expected not_applicable/empty_allowed/exit 3, got status=%q, reason=%q, exit=%d",
+			resAllowed.Report.Analysis.Status, resAllowed.Report.Analysis.Reason, resAllowed.Report.ExitCode)
+	}
+
+	// 3. Positive control: file with real executable Test declaration
+	realFile := filepath.Join(tmpDir, "real_test.go")
+	realContent := []byte(`package test
+import "testing"
+func TestRealExecutable(t *testing.T) {
+    if 1 != 1 { t.Fatal("fail") }
+}
+`)
+	_ = os.WriteFile(realFile, realContent, 0644)
+	resReal, err := eng.Run(engine.Options{
+		TargetPaths: []string{realFile},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if resReal.Report.Analysis.AnalyzedTests != 1 {
+		t.Errorf("expected 1 analyzed test for real executable function, got %d", resReal.Report.Analysis.AnalyzedTests)
+	}
+	if resReal.Report.Analysis.Status != "complete" || resReal.Report.ExitCode != 0 {
+		t.Errorf("expected complete/exit 0 for real test, got status=%q, exit=%d",
+			resReal.Report.Analysis.Status, resReal.Report.ExitCode)
+	}
+}
+
+func TestEngineDartMalformedCallbackError(t *testing.T) {
+	tmpDir := t.TempDir()
+	brokenFile := filepath.Join(tmpDir, "broken_callback_test.dart")
+	brokenContent := []byte(`
+void main() {
+  test('broken callback test', () {
+    expect(1, 1);
+    // unmatched callback brace
+`)
+	_ = os.WriteFile(brokenFile, brokenContent, 0644)
+
+	eng := engine.New()
+
+	// 1. Broken file alone must produce incomplete/input_failure/exit 2
+	res, err := eng.Run(engine.Options{
+		TargetPaths: []string{brokenFile},
+		AllowEmpty:  true, // allow-empty cannot excuse parser failure
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if res.Report.Analysis.Status != "incomplete" || res.Report.Analysis.Reason != "input_failure" || res.Report.ExitCode != 2 {
+		t.Errorf("expected incomplete/input_failure/exit 2 for malformed Dart callback, got status=%q, reason=%q, exit=%d",
+			res.Report.Analysis.Status, res.Report.Analysis.Reason, res.Report.ExitCode)
+	}
+	if res.Report.Analysis.FailedFiles != 1 {
+		t.Errorf("expected 1 failed file, got %d", res.Report.Analysis.FailedFiles)
+	}
+
+	// 2. Broken file mixed with valid file with finding: finding must be retained
+	goodFile := filepath.Join(tmpDir, "good_test.dart")
+	goodContent := []byte(`
+void main() {
+  test('zero assert test', () {
+    int x = 1 + 1;
+  });
+}
+`)
+	_ = os.WriteFile(goodFile, goodContent, 0644)
+	resMixed, err := eng.Run(engine.Options{
+		TargetPaths: []string{tmpDir},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error: %v", err)
+	}
+	if resMixed.Report.Analysis.Status != "incomplete" || resMixed.Report.Analysis.Reason != "input_failure" || resMixed.Report.ExitCode != 2 {
+		t.Errorf("expected incomplete/input_failure/exit 2 for mixed scope, got status=%q, exit=%d",
+			resMixed.Report.Analysis.Status, resMixed.Report.ExitCode)
+	}
+	if resMixed.Report.Analysis.FailedFiles != 1 {
+		t.Errorf("expected 1 failed file, got %d", resMixed.Report.Analysis.FailedFiles)
+	}
+	if resMixed.Report.Analysis.AnalyzedFiles != 1 {
+		t.Errorf("expected only the good file to be analyzed, got %d", resMixed.Report.Analysis.AnalyzedFiles)
+	}
+	if resMixed.Report.Analysis.AnalyzedTests != 1 {
+		t.Errorf("expected 1 located test declaration from good_test.dart, got %d", resMixed.Report.Analysis.AnalyzedTests)
+	}
+	if len(resMixed.Report.Findings) != 1 {
+		t.Fatalf("expected exactly 1 retained finding from good_test.dart, got %d (%+v)",
+			len(resMixed.Report.Findings), resMixed.Report.Findings)
+	}
+	finding := resMixed.Report.Findings[0]
+	if finding.RuleID != "GUARD-UNIV-ZERO" || finding.Severity != models.SeverityBlocker {
+		t.Errorf("expected retained GUARD-UNIV-ZERO blocker, got rule=%s severity=%s", finding.RuleID, finding.Severity)
+	}
+	if !strings.HasSuffix(finding.FilePath, "good_test.dart") {
+		t.Errorf("expected finding located in good_test.dart, got %s", finding.FilePath)
+	}
+	if resMixed.Report.Policy.BlockerCount != 1 || resMixed.Report.Policy.Status != "blocker_found" {
+		t.Errorf("expected policy blocker_count=1/blocker_found, got %+v", resMixed.Report.Policy)
+	}
 }
diff --git a/pkg/parser/dart/adapter.go b/pkg/parser/dart/adapter.go
index 66235d6..95b4aaa 100644
--- a/pkg/parser/dart/adapter.go
+++ b/pkg/parser/dart/adapter.go
@@ -2,6 +2,7 @@ package dart
 
 import (
 	"bytes"
+	"fmt"
 	"regexp"
 	"strings"
 
@@ -117,8 +118,7 @@ func (a *Adapter) LocateTests(source []byte, filePath string) ([]parser.TestUnit
 
 		closeBrace := parser.FindMatchingBrace(src, openBrace)
 		if closeBrace == -1 {
-			offset += loc[1]
-			continue
+			return nil, fmt.Errorf("malformed test callback: unmatched brace in %s starting at line %d", filePath, offsetToLine(openBrace))
 		}
 
 		body := src[cbStart : closeBrace+1]
diff --git a/pkg/parser/dart/adapter_test.go b/pkg/parser/dart/adapter_test.go
index 7b3819c..baaa1b1 100644
--- a/pkg/parser/dart/adapter_test.go
+++ b/pkg/parser/dart/adapter_test.go
@@ -197,3 +197,20 @@ void main() {
 		})
 	}
 }
+
+func TestLocateTestsUnmatchedBraceError(t *testing.T) {
+	source := []byte(`
+void main() {
+  test('broken callback test', () {
+    expect(1, 1);
+    // missing closing brace
+`)
+	adapter := dart.NewAdapter()
+	_, err := adapter.LocateTests(source, "broken_test.dart")
+	if err == nil {
+		t.Fatalf("expected error for unmatched callback brace, got nil")
+	}
+	if !strings.Contains(err.Error(), "unmatched brace") {
+		t.Errorf("expected error message mentioning unmatched brace, got %v", err)
+	}
+}
diff --git a/pkg/reporter/azure.go b/pkg/reporter/azure.go
index d2bd325..28674d2 100644
--- a/pkg/reporter/azure.go
+++ b/pkg/reporter/azure.go
@@ -20,57 +20,150 @@ func NewAzureReporter(out io.Writer) *AzureReporter {
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
+	// 2. Diagnostics as error annotations on incomplete or error
+	if report.Analysis.Status == "incomplete" || report.Analysis.Status == "error" {
+		printf("##vso[task.logissue type=error]TestGuard audit %s (%s)\n", report.Analysis.Status, report.Analysis.Reason)
+		for _, d := range report.Diagnostics {
+			if d.Path != nil && *d.Path != "" {
+				printf("##vso[task.logissue type=error;sourcepath=%s]%s: %s\n", *d.Path, d.Code, d.Message)
+			} else {
+				printf("##vso[task.logissue type=error]%s: %s\n", d.Code, d.Message)
+			}
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
+		printf("##vso[task.logissue type=%s;sourcepath=%s;linenumber=%d]%s\n",
 			issueType, v.FilePath, v.LineNumber, v.Message)
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
+		}
+		printf("\n")
+	}
+
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
 		}
-		fmt.Fprintf(f, "| %s | `%s` | `%s:%d` | %s |\n", badge, v.RuleID, v.FilePath, v.LineNumber, v.Message)
 	}
 
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
index 2f45424..ee4b05f 100644
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
@@ -65,14 +96,53 @@ func TestAzureDevOpsLogger(t *testing.T) {
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
+
+	out := buf.String()
+	if !strings.Contains(out, "TestGuard audit status: complete (analyzed)\n") {
+		t.Errorf("expected audit status line in Azure output, got %q", out)
+	}
+	if !strings.Contains(out, "##vso[task.logissue type=error;sourcepath=test/math_test.dart;linenumber=15]Zero assertions found in test.\n") {
+		t.Errorf("expected error logissue in Azure output, got %q", out)
+	}
+}
 
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
 	out := buf.String()
-	expected := "##vso[task.logissue type=error;sourcepath=test/math_test.dart;linenumber=15]Zero assertions found in test.\n"
-	if out != expected {
-		t.Errorf("expected %q, got %q", expected, out)
+	if !strings.Contains(out, "TestGuard audit status: complete (analyzed)\n") {
+		t.Errorf("expected audit status line for a clean complete scan, got %q", out)
+	}
+	if strings.Contains(out, "##vso[") {
+		t.Errorf("clean complete scan must not emit annotations, got %q", out)
 	}
 }
 
@@ -101,12 +171,24 @@ func TestTerminalReporterMonorepoBreakdown(t *testing.T) {
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
@@ -123,6 +205,38 @@ func TestTerminalReporterMonorepoBreakdown(t *testing.T) {
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
@@ -134,18 +248,272 @@ func TestTerminalReporterSummaryOnly(t *testing.T) {
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
index 4c2b23e..4a4cb37 100644
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
@@ -86,7 +86,10 @@ func extractModule(filePath string) string {
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
@@ -94,6 +97,25 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
 		opts.ReportPath = ".testguard/report.md"
 	}
 
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
+
 	blockers := 0
 	warnings := 0
 	advisories := 0
@@ -129,25 +151,63 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
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
@@ -168,9 +228,9 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
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
@@ -180,9 +240,9 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
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
@@ -202,22 +262,22 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
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
+		printf("✨ Summary mode: Full detailed violations written to %s\n", opts.ReportPath)
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
@@ -235,16 +295,16 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
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
+			printf("... and %d more issue(s) written to %s\n", remaining, opts.ReportPath)
 			if len(moduleMap) > 1 {
-				fmt.Fprintf(r.out, "💡 Tip: Run 'testguard <module-path>' to inspect a specific service, or 'testguard --summary'.\n")
+				printf("💡 Tip: Run 'testguard <module-path>' to inspect a specific service, or 'testguard --summary'.\n")
 			}
 			break
 		}
@@ -269,21 +329,21 @@ func (r *TerminalReporter) RenderWithOptions(violations []models.Violation, scan
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
sha256=7ce9def2b4a547e5ceff0c5a57c3b36e4d7071a1501df276345dbb7ee4e6760e

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

func TestCLIPreRunEParserFailuresEmitJSON(t *testing.T) {
	testCases := [][]string{
		{"--json", "--unknown-flag-123"},
		{"--unknown-flag-123", "--json"},
		{"-f", "json", "--top", "not-a-number"},
		{"-fjson", "--top", "not-a-number"},
		{"--format=json", "--format"},
		{"--json=invalid-bool"},
	}

	for _, tc := range testCases {
		stdout, _, exitCode := helperProcess(t, tc...)
		if exitCode != 2 {
			t.Errorf("expected exit code 2 for %v, got %d (stdout: %s)", tc, exitCode, stdout)
		}
		if !strings.HasSuffix(stdout, "\n") || strings.Count(stdout, "\n") != 1 {
			t.Errorf("for args %v: expected exactly one newline-terminated object on stdout, got %q", tc, stdout)
		}

		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(strings.TrimSpace(stdout)), &parsed); err != nil {
			t.Errorf("for args %v: stdout must be valid JSON: %v (raw: %s)", tc, err, stdout)
			continue
		}
		if parsed["schema_version"] != float64(1) {
			t.Errorf("for args %v: expected schema_version 1, got %v", tc, parsed["schema_version"])
		}
		analysis, ok := parsed["analysis"].(map[string]interface{})
		if !ok || analysis["status"] != "error" || analysis["reason"] != "invalid_usage" {
			t.Errorf("for args %v: expected status=error, reason=invalid_usage, got %+v", tc, parsed["analysis"])
		}
		if parsed["exit_code"] != float64(2) {
			t.Errorf("for args %v: expected exit_code 2, got %v", tc, parsed["exit_code"])
		}
	}
}

func TestCLIConsoleParserErrorVisible(t *testing.T) {
	cases := [][]string{
		{"--unknown-flag-123"},
		{"--json=false", "--unknown-flag-123"},
	}
	for _, tc := range cases {
		stdout, stderr, exitCode := helperProcess(t, tc...)
		if exitCode != 2 {
			t.Errorf("expected exit code 2 for %v, got %d", tc, exitCode)
		}
		if stdout != "" {
			t.Errorf("for %v: console parser errors must not write banners or usage to stdout, got %q", tc, stdout)
		}
		if !strings.Contains(stderr, "unknown flag") {
			t.Errorf("for %v: expected parser error on stderr, got %q", tc, stderr)
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


## Added pkg/engine/discovery_test.go
sha256=7a0fd90b74fd8cf529c32888998d0d3f90f8a8cdc5a6c93ba9606438fa9cc129

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

	// 1. File symlink
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

	// 2. Directory symlink (with and without trailing slash)
	subDir := filepath.Join(tmpDir, "subdir")
	_ = os.MkdirAll(subDir, 0755)
	_ = os.WriteFile(filepath.Join(subDir, "inner_test.go"), []byte("package test\nfunc TestInner(t *testing.T){}\n"), 0644)

	dirSymlink := filepath.Join(tmpDir, "dir_symlink")
	_ = os.Symlink(subDir, dirSymlink)

	// Without trailing slash
	resDir := engine.DiscoverScope([]string{dirSymlink}, adapter, nil)
	if !resDir.InputFailure {
		t.Errorf("expected InputFailure for directory symlink target")
	}

	// With trailing slash
	dirSymlinkTrailing := dirSymlink + string(filepath.Separator)
	resDirTrailing := engine.DiscoverScope([]string{dirSymlinkTrailing}, adapter, nil)
	if !resDirTrailing.InputFailure {
		t.Errorf("expected InputFailure for directory symlink with trailing slash")
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

func TestDiscoverScopeOverlappingRootsDeduplication(t *testing.T) {
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "sample_test.go")
	_ = os.WriteFile(testFile, []byte("package test\nfunc TestSample(t *testing.T){}\n"), 0644)

	adapter := dart.NewAdapter()

	// 1. Directory + Explicit file overlap
	resOverlap := engine.DiscoverScope([]string{tmpDir, testFile}, adapter, nil)
	if resOverlap.DiscoveredFiles != 1 {
		t.Errorf("expected exactly 1 discovered file across overlapping root and file, got %d", resOverlap.DiscoveredFiles)
	}
	if len(resOverlap.CandidateFiles) != 1 {
		t.Errorf("expected exactly 1 candidate file, got %d", len(resOverlap.CandidateFiles))
	}

	// 2. Relative + Absolute overlap of the same fixture, whatever the cwd.
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("unable to resolve cwd: %v", err)
	}
	relTestFile, err := filepath.Rel(cwd, testFile)
	if err != nil {
		t.Fatalf("unable to express fixture relative to cwd: %v", err)
	}
	resMixed := engine.DiscoverScope([]string{testFile, relTestFile}, adapter, nil)
	if resMixed.InputFailure {
		t.Errorf("mixed spellings must resolve to one existing file, got diagnostics %+v", resMixed.Diagnostics)
	}
	if resMixed.DiscoveredFiles != 1 {
		t.Errorf("expected 1 discovered file for mixed absolute and relative spelling, got %d", resMixed.DiscoveredFiles)
	}
	if len(resMixed.CandidateFiles) != 1 {
		t.Errorf("expected 1 candidate file for mixed spelling, got %d", len(resMixed.CandidateFiles))
	}
}

func TestDiscoverScopeDuplicateRootsGeneratedCountedOnce(t *testing.T) {
	tmpDir := t.TempDir()
	_ = os.WriteFile(filepath.Join(tmpDir, "model_test.dart"), []byte("// GENERATED CODE - DO NOT MODIFY BY HAND\nvoid main(){}\n"), 0644)
	_ = os.WriteFile(filepath.Join(tmpDir, "real_test.go"), []byte("package test\nfunc TestReal(t *testing.T){}\n"), 0644)

	adapter := dart.NewAdapter()
	res := engine.DiscoverScope([]string{tmpDir, tmpDir}, adapter, nil)

	if res.DiscoveredFiles != 2 {
		t.Errorf("expected 2 unique discovered candidates across duplicate roots, got %d", res.DiscoveredFiles)
	}
	if len(res.CandidateFiles) != 1 {
		t.Errorf("expected only the non-generated candidate, got %+v", res.CandidateFiles)
	}
	generated := 0
	for _, ex := range res.Excluded {
		if ex.Reason == "generated" {
			generated++
		}
	}
	if len(res.Excluded) != 1 || generated != 1 {
		t.Errorf("expected exactly one generated exclusion, got %+v", res.Excluded)
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

