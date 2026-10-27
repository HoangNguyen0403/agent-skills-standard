# Immutable review snapshot T3-settled

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance
Base: 8fc53b4c683d312359166e49e397fa887dd0ac92
Captured: 2026-10-26T23:10:07.690Z

## Tracked diff

diff --git a/pkg/detectors/clone/hasher.go b/pkg/detectors/clone/hasher.go
index 87acc1c..516b880 100644
--- a/pkg/detectors/clone/hasher.go
+++ b/pkg/detectors/clone/hasher.go
@@ -54,16 +54,28 @@ func (d *Detector) Check(units []parser.TestUnit) []models.Violation {
 
 	for _, group := range seenHashes {
 		if len(group) == 2 || len(group) == 3 {
-			// Exact clone between 2-3 tests
+			// Clone between 2-3 tests
 			for i := 1; i < len(group); i++ {
+				isExact := strings.TrimSpace(whitespaceRegex.ReplaceAllString(group[i].RawBody, " ")) ==
+					strings.TrimSpace(whitespaceRegex.ReplaceAllString(group[0].RawBody, " "))
+
+				var msg, suggestion string
+				if isExact {
+					msg = fmt.Sprintf("Duplicate test body: '%s' has identical execution tokens to '%s' (line %d).", group[i].Name, group[0].Name, group[0].StartLine)
+					suggestion = "Consolidate identical duplicate tests or verify whether distinct inputs were intended."
+				} else {
+					msg = fmt.Sprintf("Similar test structure: '%s' shares normalized token structure with '%s' (line %d). Note: literal normalization indicates structural similarity, not proven semantic redundancy.", group[i].Name, group[0].Name, group[0].StartLine)
+					suggestion = "Check whether this test exercises a distinct edge case or boundary condition before consolidating. Do not treat syntactic clone similarity as proof of semantic redundancy or delete cases."
+				}
+
 				violations = append(violations, models.Violation{
 					RuleID:     "GUARD-UNIV-01",
 					Severity:   models.SeverityAdvisory,
 					FilePath:   group[i].FilePath,
 					LineNumber: group[i].StartLine,
 					Column:     1,
-					Message:    fmt.Sprintf("Duplicate test body: '%s' has identical execution tokens to '%s' (line %d).", group[i].Name, group[0].Name, group[0].StartLine),
-					Suggestion: "Check whether this test exercises a distinct edge case or consolidate into a table-driven parameterized test.",
+					Message:    msg,
+					Suggestion: suggestion,
 				})
 			}
 		} else if len(group) >= 4 {
@@ -75,8 +87,8 @@ func (d *Detector) Check(units []parser.TestUnit) []models.Violation {
 					FilePath:   group[i].FilePath,
 					LineNumber: group[i].StartLine,
 					Column:     1,
-					Message:    fmt.Sprintf("Structural repetition: '%s' shares identical AST structure with %d other tests in this file (first seen at '%s', line %d).", group[i].Name, len(group)-1, group[0].Name, group[0].StartLine),
-					Suggestion: "Consolidate repetitive test structures into a parameterized table-driven test loop.",
+					Message:    fmt.Sprintf("Structural repetition: '%s' shares normalized AST structure with %d other tests in this file (first seen at '%s', line %d). Note: structural similarity does not prove semantic redundancy.", group[i].Name, len(group)-1, group[0].Name, group[0].StartLine),
+					Suggestion: "Consolidate repetitive test structures into a parameterized table-driven test loop without removing valid boundary conditions or distinct equivalence classes.",
 				})
 			}
 		}
diff --git a/pkg/detectors/clone/hasher_test.go b/pkg/detectors/clone/hasher_test.go
index 2ebaefa..43f5681 100644
--- a/pkg/detectors/clone/hasher_test.go
+++ b/pkg/detectors/clone/hasher_test.go
@@ -1,6 +1,7 @@
 package clone_test
 
 import (
+	"strings"
 	"testing"
 
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/clone"
@@ -34,6 +35,62 @@ func TestDetectExactClones(t *testing.T) {
 	}
 }
 
+func TestDetectExactClones_DistinctBoundaryValuesMessage(t *testing.T) {
+	test1 := parser.TestUnit{
+		Name:      "test_zero_boundary",
+		FilePath:  "calc_test.go",
+		StartLine: 10,
+		RawBody:   "res := Calc(0); assert.Equal(t, 0, res);",
+	}
+
+	test2 := parser.TestUnit{
+		Name:      "test_negative_boundary",
+		FilePath:  "calc_test.go",
+		StartLine: 20,
+		RawBody:   "res := Calc(-1); assert.Equal(t, 0, res);",
+	}
+
+	detector := clone.New()
+	violations := detector.Check([]parser.TestUnit{test1, test2})
+
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 advisory violation for structural similarity, got %d", len(violations))
+	}
+	v := violations[0]
+	if !strings.Contains(v.Message, "not proven semantic redundancy") {
+		t.Errorf("expected message to note that literal normalization does not prove semantic redundancy, got: %s", v.Message)
+	}
+	if !strings.Contains(v.Suggestion, "Do not treat syntactic clone similarity as proof of semantic redundancy or delete cases") {
+		t.Errorf("expected suggestion to caution against deleting cases, got: %s", v.Suggestion)
+	}
+}
+
+func TestDetectExactClones_VerbatimIdentical(t *testing.T) {
+	test1 := parser.TestUnit{
+		Name:      "test_a",
+		FilePath:  "calc_test.go",
+		StartLine: 10,
+		RawBody:   "res := Calc(100); assert.Equal(t, 200, res);",
+	}
+
+	test2 := parser.TestUnit{
+		Name:      "test_b",
+		FilePath:  "calc_test.go",
+		StartLine: 30,
+		RawBody:   "res := Calc(100); assert.Equal(t, 200, res);",
+	}
+
+	detector := clone.New()
+	violations := detector.Check([]parser.TestUnit{test1, test2})
+
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 clone violation, got %d", len(violations))
+	}
+	if !strings.Contains(violations[0].Message, "identical execution tokens") {
+		t.Errorf("expected verbatim identical message, got: %s", violations[0].Message)
+	}
+}
+
 func TestDetectStructuralRepetition(t *testing.T) {
 	var tests []parser.TestUnit
 	for i := 1; i <= 5; i++ {
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
index d2f32df..2e630ed 100644
--- a/pkg/engine/engine.go
+++ b/pkg/engine/engine.go
@@ -1,17 +1,18 @@
 package engine
 
 import (
-	"fmt"
 	"os"
-	"path/filepath"
 	"regexp"
+	"sort"
 	"strings"
+
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/clone"
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/naming"
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/zeroassert"
 	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/HoangNguyen0403/testguard/pkg/parser"
 	"github.com/HoangNguyen0403/testguard/pkg/parser/dart"
+	goparseradapter "github.com/HoangNguyen0403/testguard/pkg/parser/golang"
 	dartrules "github.com/HoangNguyen0403/testguard/pkg/rules/dart"
 	gorules "github.com/HoangNguyen0403/testguard/pkg/rules/golang"
 	mobilerules "github.com/HoangNguyen0403/testguard/pkg/rules/mobile"
@@ -26,21 +27,31 @@ type Options struct {
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
 type Engine struct {
 	dartAdapter  *dart.Adapter
+	goAdapter    *goparseradapter.Adapter
 	zeroAssert   *zeroassert.Detector
 	cloneDetect  *clone.Detector
 	namingDetect *naming.Detector
@@ -71,6 +82,7 @@ type Engine struct {
 func New() *Engine {
 	return &Engine{
 		dartAdapter:  dart.NewAdapter(),
+		goAdapter:    goparseradapter.NewAdapter(),
 		zeroAssert:   zeroassert.New(),
 		cloneDetect:  clone.New(),
 		namingDetect: naming.New(),
@@ -209,63 +221,85 @@ func parseGenericTestUnits(content []byte, filePath string) []parser.TestUnit {
 
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
+			u, err := e.goAdapter.LocateTests(content, file)
+			if err != nil {
+				failedFilesMap[canonicalAbsPath(file)] = true
+				hasInputFailure = true
+				report.Diagnostics = append(report.Diagnostics, models.NewDiagnostic("parse_failed", normalizePath(file), err.Error()))
+				continue
+			}
+			units = u
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
@@ -273,13 +307,32 @@ func (e *Engine) Run(opts Options) (*Result, error) {
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
@@ -314,10 +367,73 @@ func (e *Engine) Run(opts Options) (*Result, error) {
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
index 0a3b2f4..0f79b7c 100644
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
@@ -159,4 +174,648 @@ func TestEnginePathDeduplication(t *testing.T) {
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
+}
+
+func TestEngineGoQuotedVsExecutableRules(t *testing.T) {
+	tmpDir := t.TempDir()
+
+	// 1. Quoted controls: bad patterns exist ONLY in strings and comments
+	quotedDir := filepath.Join(tmpDir, "quoted")
+	_ = os.MkdirAll(filepath.Join(quotedDir, "domain"), 0755)
+	_ = os.MkdirAll(filepath.Join(quotedDir, "service"), 0755)
+
+	domainQuotedFile := filepath.Join(quotedDir, "domain", "user_test.go")
+	domainQuotedContent := []byte(`package domain_test
+import "testing"
+
+const mockSnippet = "ctrl := gomock.NewController(t); mockRepo := mocks.NewMockUserRepository(ctrl);"
+// Comment mentioning gomock.NewController(t)
+func TestDomainUser(t *testing.T) {
+    const code = "mocks.NewMockOrder(ctrl)"
+    if code == "" {
+        t.Fatal("empty")
+    }
+}
+`)
+	_ = os.WriteFile(domainQuotedFile, domainQuotedContent, 0644)
+
+	serviceQuotedFile := filepath.Join(quotedDir, "service", "order_test.go")
+	serviceQuotedContent := []byte(`package service_test
+import "testing"
+
+const sqlmockCode = "db, mock, err := sqlmock.New();"
+// gorm.Open(postgres.Open(dsn), &gorm.Config{})
+func TestServiceOrder(t *testing.T) {
+    msg := "pgxmock.NewPool() should not be flagged in string"
+    tests := []struct{ in int; want int }{
+        {in: 0, want: 0},
+        {in: 1, want: 10},
+    }
+    if msg == "" || len(tests) == 0 {
+        t.Fatal("invalid")
+    }
+}
+`)
+	_ = os.WriteFile(serviceQuotedFile, serviceQuotedContent, 0644)
+
+	eng := engine.New()
+	resQuoted, err := eng.Run(engine.Options{
+		TargetPaths: []string{quotedDir},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error scanning quoted files: %v", err)
+	}
+
+	for _, f := range resQuoted.Report.Findings {
+		if f.RuleID == "GUARD-GO-01" || f.RuleID == "GUARD-GO-02" || f.RuleID == "GUARD-GO-03" {
+			t.Errorf("unexpected violation %s in quoted test: %+v", f.RuleID, f)
+		}
+	}
+
+	// 2. Executable controls: real executable calls trigger correct rules with exact lines
+	execDir := filepath.Join(tmpDir, "executable")
+	_ = os.MkdirAll(filepath.Join(execDir, "domain"), 0755)
+	_ = os.MkdirAll(filepath.Join(execDir, "service"), 0755)
+
+	domainExecFile := filepath.Join(execDir, "domain", "order_test.go")
+	domainExecContent := []byte(`package domain_test
+import (
+    "testing"
+    "github.com/golang/mock/gomock"
+)
+
+func TestExecutableDomainMock(t *testing.T) {
+    ctrl := gomock.NewController(t)
+    _ = ctrl
+    t.Fatal("fail")
+}
+`)
+	_ = os.WriteFile(domainExecFile, domainExecContent, 0644)
+
+	serviceExecFile := filepath.Join(execDir, "service", "payment_test.go")
+	serviceExecContent := []byte(`package service_test
+import (
+    "testing"
+    "github.com/DATA-DOG/go-sqlmock"
+)
+
+func TestExecutableServiceSqlmock(t *testing.T) {
+    db, mock, err := sqlmock.New()
+    _ = db
+    _ = mock
+    _ = err
+
+    tests := []struct{ in int; want int }{
+        {in: 100, want: 10},
+        {in: 100, want: 10},
+    }
+    _ = tests
+    t.Fatal("fail")
+}
+`)
+	_ = os.WriteFile(serviceExecFile, serviceExecContent, 0644)
+
+	resExec, err := eng.Run(engine.Options{
+		TargetPaths: []string{execDir},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error scanning executable files: %v", err)
+	}
+
+	foundRules := make(map[string]bool)
+	for _, f := range resExec.Report.Findings {
+		foundRules[f.RuleID] = true
+		switch f.RuleID {
+		case "GUARD-GO-01":
+			if f.LineNumber != 8 {
+				t.Errorf("expected GUARD-GO-01 at line 8, got %d", f.LineNumber)
+			}
+		case "GUARD-GO-02":
+			if f.LineNumber != 8 {
+				t.Errorf("expected GUARD-GO-02 at line 8, got %d", f.LineNumber)
+			}
+		case "GUARD-GO-03":
+			if f.LineNumber != 15 {
+				t.Errorf("expected GUARD-GO-03 at line 15, got %d", f.LineNumber)
+			}
+		}
+	}
+
+	if !foundRules["GUARD-GO-01"] {
+		t.Errorf("expected GUARD-GO-01 to be detected in executable domain test")
+	}
+	if !foundRules["GUARD-GO-02"] {
+		t.Errorf("expected GUARD-GO-02 to be detected in executable service test")
+	}
+	if !foundRules["GUARD-GO-03"] {
+		t.Errorf("expected GUARD-GO-03 to be detected in executable table test")
+	}
+
+	// 3. Scan pkg/rules/golang/rules_test.go directly: must produce ZERO GUARD-GO-02 or GUARD-GO-03 false positives
+	resRulesTest, err := eng.Run(engine.Options{
+		TargetPaths: []string{"pkg/rules/golang/rules_test.go"},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error scanning rules_test.go: %v", err)
+	}
+	for _, f := range resRulesTest.Report.Findings {
+		if f.RuleID == "GUARD-GO-02" || f.RuleID == "GUARD-GO-03" {
+			t.Errorf("false positive: rules_test.go triggered %s: %+v", f.RuleID, f)
+		}
+	}
 }
diff --git a/pkg/parser/adapter.go b/pkg/parser/adapter.go
index 5e17ffd..aafc9ad 100644
--- a/pkg/parser/adapter.go
+++ b/pkg/parser/adapter.go
@@ -28,6 +28,12 @@ type TestUnit struct {
 	SeedBody   string   `json:"seed_body,omitempty"`
 	ActBody    string   `json:"act_body,omitempty"`
 	ExpectBody string   `json:"expect_body,omitempty"`
+
+	// ASTDecl holds an optional language-specific AST declaration (e.g. *ast.FuncDecl for Go).
+	// Excluded from JSON serialization to maintain cross-language model contracts.
+	ASTDecl any `json:"-"`
+	// FileSet holds an optional token.FileSet for AST source position resolution.
+	FileSet any `json:"-"`
 }
 
 // LanguageAdapter decouples the core engine from language-specific AST structures.
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
diff --git a/pkg/rules/golang/rules.go b/pkg/rules/golang/rules.go
index 3e06684..f0e33dd 100644
--- a/pkg/rules/golang/rules.go
+++ b/pkg/rules/golang/rules.go
@@ -1,42 +1,111 @@
 package golang
 
 import (
+	"bytes"
 	"fmt"
+	"go/ast"
+	"go/format"
+	goparser "go/parser"
+	"go/token"
 	"path/filepath"
-	"regexp"
 	"strings"
 
 	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/HoangNguyen0403/testguard/pkg/parser"
 )
 
-var (
-	mockControllerRegex = regexp.MustCompile(`(?i)(?:gomock\.NewController|mocks\.NewMock|testify/mock)`)
-	sqlmockRegex        = regexp.MustCompile(`(?i)(?:sqlmock\.New|pgxmock\.New|gorm\.Open)`)
-	rowPatternRegex     = regexp.MustCompile(`(?m)^\s*\{([^}]+)\},?`)
-	commentRegex        = regexp.MustCompile(`//.*`)
-
-	repoOrInfraPatterns = []string{
-		"/repository/",
-		"_repository_test.go",
-		"/infrastructure/",
-		"/database/",
-		"/db/",
-		"/dao/",
-		"/store/",
-	}
-)
+var repoOrInfraPatterns = []string{
+	"repository",
+	"infrastructure",
+	"database",
+	"/db/",
+	"/dao/",
+	"/store/",
+	"_repo_test.go",
+	"_repository_test.go",
+}
 
 func isRepositoryOrInfraLayer(filePath string) bool {
-	normalized := "/" + strings.TrimPrefix(filepath.ToSlash(filePath), "/")
+	lower := strings.ToLower(filepath.ToSlash(filePath))
 	for _, pattern := range repoOrInfraPatterns {
-		if strings.Contains(normalized, pattern) || strings.Contains(filePath, pattern) {
+		if strings.Contains(lower, pattern) {
 			return true
 		}
 	}
 	return false
 }
 
+// getUnitAST retrieves or parses the AST declaration and token.FileSet for a TestUnit.
+func getUnitAST(unit parser.TestUnit) (*token.FileSet, *ast.FuncDecl, error) {
+	if unit.ASTDecl != nil {
+		if fn, ok := unit.ASTDecl.(*ast.FuncDecl); ok && fn != nil {
+			if fset, ok := unit.FileSet.(*token.FileSet); ok && fset != nil {
+				return fset, fn, nil
+			}
+		}
+	}
+
+	raw := strings.TrimSpace(unit.RawBody)
+	if raw == "" {
+		return nil, nil, fmt.Errorf("empty test unit raw body")
+	}
+
+	fset := token.NewFileSet()
+	var src string
+
+	if strings.HasPrefix(raw, "func ") {
+		src = "package p\n" + raw
+	} else {
+		src = "package p\nfunc _testFunc() {\n" + raw + "\n}"
+	}
+
+	fileAST, err := goparser.ParseFile(fset, unit.FilePath, src, 0)
+	if err != nil {
+		return nil, nil, err
+	}
+
+	for _, decl := range fileAST.Decls {
+		if fn, ok := decl.(*ast.FuncDecl); ok {
+			return fset, fn, nil
+		}
+	}
+
+	return nil, nil, fmt.Errorf("no func declaration found in test body")
+}
+
+// getNodeLineAndColumn computes the truthful 1-based source line and column for an AST node.
+func getNodeLineAndColumn(fset *token.FileSet, node ast.Node, unit parser.TestUnit) (int, int) {
+	if fset == nil || node == nil {
+		line := unit.StartLine
+		if line <= 0 {
+			line = 1
+		}
+		return line, 1
+	}
+
+	pos := fset.Position(node.Pos())
+	if unit.ASTDecl != nil {
+		// When AST was parsed directly from the original file, use exact file position
+		return pos.Line, pos.Column
+	}
+
+	// Fallback calculation when parsed from synthesized wrapper
+	raw := strings.TrimSpace(unit.RawBody)
+	headerLines := 2
+	if strings.HasPrefix(raw, "func ") {
+		headerLines = 1
+	}
+	relLine := pos.Line - headerLines - 1
+	if relLine < 0 {
+		relLine = 0
+	}
+	line := unit.StartLine + relLine
+	if line <= 0 {
+		line = 1
+	}
+	return line, pos.Column
+}
+
 // DomainPurityRule enforces that domain entity/model tests contain zero mocks.
 type DomainPurityRule struct{}
 
@@ -47,22 +116,69 @@ func NewDomainPurityRule() *DomainPurityRule {
 func (r *DomainPurityRule) Evaluate(unit parser.TestUnit) []models.Violation {
 	var violations []models.Violation
 
-	if !strings.Contains(unit.FilePath, "/domain/") && !strings.Contains(unit.FilePath, "domain_test.go") {
+	slashPath := filepath.ToSlash(unit.FilePath)
+	if !strings.Contains(slashPath, "/domain/") && !strings.Contains(slashPath, "domain_test.go") {
 		return violations
 	}
 
-	if mockControllerRegex.MatchString(unit.RawBody) {
-		violations = append(violations, models.Violation{
-			RuleID:     "GUARD-GO-01",
-			Severity:   models.SeverityBlocker,
-			FilePath:   unit.FilePath,
-			LineNumber: unit.StartLine,
-			Column:     1,
-			Message:    fmt.Sprintf("Domain purity violation in '%s': domain tests must be pure and contain zero mocks.", unit.Name),
-			Suggestion: "Remove mock controllers from domain tests. Test business logic using pure domain struct fixtures.",
-		})
+	fset, fn, err := getUnitAST(unit)
+	if err != nil {
+		return violations
 	}
 
+	seenLines := make(map[int]bool)
+
+	ast.Inspect(fn, func(n ast.Node) bool {
+		call, ok := n.(*ast.CallExpr)
+		if !ok {
+			return true
+		}
+		sel, ok := call.Fun.(*ast.SelectorExpr)
+		if !ok {
+			return true
+		}
+		ident, ok := sel.X.(*ast.Ident)
+		if !ok {
+			return true
+		}
+
+		pkgName := strings.ToLower(ident.Name)
+		methodName := sel.Sel.Name
+		isViolation := false
+
+		// Check gomock.NewController
+		if pkgName == "gomock" && methodName == "NewController" {
+			isViolation = true
+		}
+
+		// Check mocks.NewMock... or any *mock package calling NewMock...
+		if (pkgName == "mocks" || strings.HasSuffix(pkgName, "mock")) && strings.HasPrefix(methodName, "NewMock") {
+			isViolation = true
+		}
+
+		// Check testify/mock controller patterns
+		if pkgName == "mock" && (strings.HasPrefix(methodName, "New") || methodName == "MatchedBy" || methodName == "Anything") {
+			isViolation = true
+		}
+
+		if isViolation {
+			line, col := getNodeLineAndColumn(fset, call, unit)
+			if !seenLines[line] {
+				seenLines[line] = true
+				violations = append(violations, models.Violation{
+					RuleID:     "GUARD-GO-01",
+					Severity:   models.SeverityBlocker,
+					FilePath:   unit.FilePath,
+					LineNumber: line,
+					Column:     col,
+					Message:    fmt.Sprintf("Domain purity violation in '%s': domain tests must be pure and contain zero mocks.", unit.Name),
+					Suggestion: "Remove mock controllers from domain tests. Test business logic using pure domain struct fixtures.",
+				})
+			}
+		}
+		return true
+	})
+
 	return violations
 }
 
@@ -80,18 +196,64 @@ func (r *PortMockingRule) Evaluate(unit parser.TestUnit) []models.Violation {
 		return violations
 	}
 
-	if sqlmockRegex.MatchString(unit.RawBody) {
-		violations = append(violations, models.Violation{
-			RuleID:     "GUARD-GO-02",
-			Severity:   models.SeverityWarning,
-			FilePath:   unit.FilePath,
-			LineNumber: unit.StartLine,
-			Column:     1,
-			Message:    fmt.Sprintf("Port mocking violation in '%s': mocking concrete database connection instead of exported interface Port.", unit.Name),
-			Suggestion: "Define and mock an abstract repository interface (e.g. domain.UserRepository) rather than concrete database connections.",
-		})
+	fset, fn, err := getUnitAST(unit)
+	if err != nil {
+		return violations
 	}
 
+	seenLines := make(map[int]bool)
+
+	ast.Inspect(fn, func(n ast.Node) bool {
+		call, ok := n.(*ast.CallExpr)
+		if !ok {
+			return true
+		}
+		sel, ok := call.Fun.(*ast.SelectorExpr)
+		if !ok {
+			return true
+		}
+		ident, ok := sel.X.(*ast.Ident)
+		if !ok {
+			return true
+		}
+
+		pkgName := strings.ToLower(ident.Name)
+		methodName := sel.Sel.Name
+		isViolation := false
+
+		switch pkgName {
+		case "sqlmock":
+			if strings.HasPrefix(methodName, "New") {
+				isViolation = true
+			}
+		case "pgxmock":
+			if strings.HasPrefix(methodName, "New") {
+				isViolation = true
+			}
+		case "gorm":
+			if methodName == "Open" {
+				isViolation = true
+			}
+		}
+
+		if isViolation {
+			line, col := getNodeLineAndColumn(fset, call, unit)
+			if !seenLines[line] {
+				seenLines[line] = true
+				violations = append(violations, models.Violation{
+					RuleID:     "GUARD-GO-02",
+					Severity:   models.SeverityWarning,
+					FilePath:   unit.FilePath,
+					LineNumber: line,
+					Column:     col,
+					Message:    fmt.Sprintf("Port mocking violation in '%s': mocking concrete database connection instead of exported interface Port.", unit.Name),
+					Suggestion: "Define and mock an abstract repository interface (e.g. domain.UserRepository) rather than concrete database connections.",
+				})
+			}
+		}
+		return true
+	})
+
 	return violations
 }
 
@@ -102,37 +264,77 @@ func NewTableDuplicateRule() *TableDuplicateRule {
 	return &TableDuplicateRule{}
 }
 
+func isTableComposite(compLit *ast.CompositeLit) bool {
+	if len(compLit.Elts) < 2 {
+		return false
+	}
+	// Check array/slice composite literal
+	arrType, isArray := compLit.Type.(*ast.ArrayType)
+	if isArray && arrType.Elt != nil {
+		switch arrType.Elt.(type) {
+		case *ast.StructType, *ast.Ident, *ast.SelectorExpr:
+			return true
+		}
+	}
+	// If type is omitted or inferred, inspect elements: must be struct literals
+	first := compLit.Elts[0]
+	switch e := first.(type) {
+	case *ast.CompositeLit:
+		return true
+	case *ast.UnaryExpr:
+		if _, ok := e.X.(*ast.CompositeLit); ok {
+			return true
+		}
+	}
+	return false
+}
+
 func (r *TableDuplicateRule) Evaluate(unit parser.TestUnit) []models.Violation {
 	var violations []models.Violation
 
-	if !strings.Contains(unit.RawBody, "struct") {
+	fset, fn, err := getUnitAST(unit)
+	if err != nil {
 		return violations
 	}
 
-	matches := rowPatternRegex.FindAllStringSubmatch(unit.RawBody, -1)
-	seenRows := make(map[string]bool)
-
-	for _, m := range matches {
-		rowContent := commentRegex.ReplaceAllString(m[1], "")
-		rowContent = strings.TrimSpace(rowContent)
-		if len(rowContent) < 5 || strings.Contains(rowContent, ";") {
-			continue
+	ast.Inspect(fn, func(n ast.Node) bool {
+		compLit, ok := n.(*ast.CompositeLit)
+		if !ok || !isTableComposite(compLit) {
+			return true
 		}
 
-		if seenRows[rowContent] {
-			violations = append(violations, models.Violation{
-				RuleID:     "GUARD-GO-03",
-				Severity:   models.SeverityAdvisory,
-				FilePath:   unit.FilePath,
-				LineNumber: unit.StartLine,
-				Column:     1,
-				Message:    fmt.Sprintf("Duplicate table test row in '%s': row {%s} is duplicated.", unit.Name, rowContent),
-				Suggestion: "Ensure each table test case tests a distinct equivalence class, boundary condition, or error scenario.",
-			})
-			break
+		seenRows := make(map[string]bool)
+		for _, elt := range compLit.Elts {
+			var buf bytes.Buffer
+			if err := format.Node(&buf, fset, elt); err != nil {
+				continue
+			}
+			rawContent := strings.TrimSpace(buf.String())
+			// Strip outer braces if present for clean reporting
+			trimmedContent := strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(rawContent, "{"), "}"))
+			if len(trimmedContent) < 3 {
+				continue
+			}
+
+			if seenRows[trimmedContent] {
+				line, col := getNodeLineAndColumn(fset, elt, unit)
+				violations = append(violations, models.Violation{
+					RuleID:     "GUARD-GO-03",
+					Severity:   models.SeverityAdvisory,
+					FilePath:   unit.FilePath,
+					LineNumber: line,
+					Column:     col,
+					Message:    fmt.Sprintf("Duplicate table test row in '%s': row {%s} is duplicated.", unit.Name, trimmedContent),
+					Suggestion: "Ensure each table test case tests a distinct equivalence class, boundary condition, or error scenario.",
+				})
+				// One duplicate row reported per table literal is sufficient
+				break
+			}
+			seenRows[trimmedContent] = true
 		}
-		seenRows[rowContent] = true
-	}
+
+		return true
+	})
 
 	return violations
 }
diff --git a/pkg/rules/golang/rules_test.go b/pkg/rules/golang/rules_test.go
index 827af73..e0fad1e 100644
--- a/pkg/rules/golang/rules_test.go
+++ b/pkg/rules/golang/rules_test.go
@@ -30,6 +30,54 @@ func TestDomainPurityRule(t *testing.T) {
 	}
 }
 
+func TestDomainPurityRule_QuotedSourceInStringOrCommentIgnored(t *testing.T) {
+	checker := golang.NewDomainPurityRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestDomainFixtureGenerator",
+		FilePath:  "internal/domain/fixture_test.go",
+		StartLine: 10,
+		RawBody: `
+		const expectedSnippet = "ctrl := gomock.NewController(t); mockRepo := mocks.NewMockUserRepository(ctrl);"
+		// We used to do: ctrl := gomock.NewController(t)
+		// Now we use pure domain entities.
+		user := "valid_domain_user"
+		_ = user
+		`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 0 {
+		t.Errorf("expected 0 violations for quoted/commented mocks in domain, got %d", len(violations))
+	}
+}
+
+func TestDomainPurityRule_ExecutableCallDetectedWithExactLine(t *testing.T) {
+	checker := golang.NewDomainPurityRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestDomainWithExecutableMock",
+		FilePath:  "internal/domain/account_test.go",
+		StartLine: 40,
+		RawBody: `func TestDomainWithExecutableMock(t *testing.T) {
+	entity := "pure"
+	_ = entity
+	ctrl := gomock.NewController(t)
+	_ = ctrl
+}`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 domain purity violation, got %d", len(violations))
+	}
+	// Line 40 is func, Line 41 is entity, Line 42 is blank, Line 43 is ctrl := gomock.NewController(t)
+	expectedLine := 43
+	if violations[0].LineNumber != expectedLine {
+		t.Errorf("expected violation at line %d, got %d", expectedLine, violations[0].LineNumber)
+	}
+}
+
 func TestPortMockingRule(t *testing.T) {
 	checker := golang.NewPortMockingRule()
 
@@ -119,6 +167,54 @@ func TestPortMockingRule(t *testing.T) {
 	})
 }
 
+func TestPortMockingRule_QuotedSourceInStringOrCommentIgnored(t *testing.T) {
+	checker := golang.NewPortMockingRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestServiceCodeGenerator",
+		FilePath:  "internal/service/codegen_test.go",
+		StartLine: 15,
+		RawBody: `
+		const fixture = "db, mock, err := sqlmock.New();"
+		// Comment mentioning gorm.Open(postgres.Open(dsn), &gorm.Config{})
+		msg := "pgxmock.NewPool() should not trigger in string literal"
+		_ = msg
+		`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 0 {
+		t.Errorf("expected 0 violations for quoted sqlmock in service test, got %d", len(violations))
+	}
+}
+
+func TestPortMockingRule_ExecutableCallDetectedWithExactLine(t *testing.T) {
+	checker := golang.NewPortMockingRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestOrderServiceDirectDbMock",
+		FilePath:  "internal/service/order_test.go",
+		StartLine: 30,
+		RawBody: `func TestOrderServiceDirectDbMock(t *testing.T) {
+	service := "order"
+	_ = service
+	db, mock, err := sqlmock.New()
+	_ = db
+	_ = mock
+	_ = err
+}`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 port mocking violation, got %d", len(violations))
+	}
+	expectedLine := 33
+	if violations[0].LineNumber != expectedLine {
+		t.Errorf("expected violation at line %d, got %d", expectedLine, violations[0].LineNumber)
+	}
+}
+
 func TestTableDuplicateRule(t *testing.T) {
 	unitWithDuplicateRows := parser.TestUnit{
 		Name:      "TestCalculateTax",
@@ -142,3 +238,80 @@ func TestTableDuplicateRule(t *testing.T) {
 		t.Errorf("expected GUARD-GO-03, got %s", violations[0].RuleID)
 	}
 }
+
+func TestTableDuplicateRule_QuotedSourceInStringOrCommentIgnored(t *testing.T) {
+	checker := golang.NewTableDuplicateRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestTableSyntaxChecker",
+		FilePath:  "service/tax_test.go",
+		StartLine: 10,
+		RawBody: `
+		const example = ` + "`" + `
+		tests := []struct{ in int; want int }{
+			{in: 100, want: 10},
+			{in: 100, want: 10},
+		}
+		` + "`" + `
+		// tests := []struct{ in int }{ {1}, {1} }
+		v := 42
+		_ = v
+		`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 0 {
+		t.Errorf("expected 0 violations for quoted table rows, got %d", len(violations))
+	}
+}
+
+func TestTableDuplicateRule_DistinctBoundaryValuesPreserved(t *testing.T) {
+	checker := golang.NewTableDuplicateRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestBoundaryValues",
+		FilePath:  "service/calc_test.go",
+		StartLine: 1,
+		RawBody: `
+		tests := []struct{ in int; want int }{
+			{in: 0, want: 0},
+			{in: -1, want: 0},
+			{in: 1, want: 1},
+			{in: 100, want: 10},
+			{in: 999999, want: 99999},
+		}
+		`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 0 {
+		t.Errorf("expected 0 violations for distinct boundary values in table, got %d", len(violations))
+	}
+}
+
+func TestTableDuplicateRule_ExecutableDuplicateRowDetectedWithExactLine(t *testing.T) {
+	checker := golang.NewTableDuplicateRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestDuplicateTableRowsExecutable",
+		FilePath:  "service/pricing_test.go",
+		StartLine: 50,
+		RawBody: `func TestDuplicateTableRowsExecutable(t *testing.T) {
+	tests := []struct{ in int; want int }{
+		{in: 100, want: 10},
+		{in: 100, want: 10},
+	}
+	_ = tests
+}`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 duplicate table violation, got %d", len(violations))
+	}
+	// Line 50 is func, Line 51 is tests := ..., Line 52 is row 1, Line 53 is duplicate row 2
+	expectedLine := 53
+	if violations[0].LineNumber != expectedLine {
+		t.Errorf("expected violation at line %d, got %d", expectedLine, violations[0].LineNumber)
+	}
+}


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


## Added pkg/parser/golang/adapter.go
sha256=743139e4bf2f7beeceb44f014f3279d1b8da1d59bdd6a70b82d35329197cd6d8

package golang

import (
	"bytes"
	"go/ast"
	goparser "go/parser"
	"go/token"
	"strings"
	"unicode"

	"github.com/HoangNguyen0403/testguard/pkg/parser"
)

// Adapter implements parser.LanguageAdapter for Go using standard library go/parser and go/ast.
type Adapter struct{}

// NewAdapter creates an initialized Go language adapter.
func NewAdapter() *Adapter {
	return &Adapter{}
}

// ID returns the language identifier for this adapter.
func (a *Adapter) ID() string {
	return "golang"
}

// FileExtensions returns the file extensions handled by this adapter.
func (a *Adapter) FileExtensions() []string {
	return []string{".go"}
}

// IsGenerated determines whether a Go file was auto-generated by inspecting
// standard file naming conventions and Go code generation header comments.
func (a *Adapter) IsGenerated(filePath string, header []byte) bool {
	lower := strings.ToLower(filePath)
	if strings.HasSuffix(lower, ".pb.go") ||
		strings.HasSuffix(lower, ".gen.go") ||
		strings.HasSuffix(lower, "_gen.go") ||
		strings.HasSuffix(lower, "_mock.go") {
		return true
	}
	if bytes.Contains(header, []byte("Code generated")) ||
		bytes.Contains(header, []byte("DO NOT EDIT")) ||
		bytes.Contains(header, []byte("GENERATED BY")) ||
		bytes.Contains(header, []byte("AUTOGENERATED")) {
		return true
	}
	return false
}

// isGoTestFunc returns true and the test kind if fn is an executable Go test declaration.
func isGoTestFunc(fn *ast.FuncDecl) (bool, string) {
	if fn.Recv != nil || fn.Name == nil {
		return false, ""
	}
	name := fn.Name.Name
	if strings.HasPrefix(name, "Test") {
		if len(name) > 4 && unicode.IsLower(rune(name[4])) {
			return false, ""
		}
		return true, "unit"
	}
	if strings.HasPrefix(name, "Benchmark") {
		if len(name) > 9 && unicode.IsLower(rune(name[9])) {
			return false, ""
		}
		return true, "benchmark"
	}
	if strings.HasPrefix(name, "Example") {
		if len(name) > 7 && unicode.IsLower(rune(name[7])) {
			return false, ""
		}
		return true, "example"
	}
	if strings.HasPrefix(name, "Fuzz") {
		if len(name) > 4 && unicode.IsLower(rune(name[4])) {
			return false, ""
		}
		return true, "fuzz"
	}
	return false, ""
}

// findExecutableAssertions searches the AST body of a test function for genuine
// assertion calls (e.g. t.Error, t.Fatal, assert.*, require.*) while strictly
// ignoring strings and comments.
func findExecutableAssertions(fn *ast.FuncDecl) []string {
	if fn.Body == nil {
		return nil
	}
	var assertions []string
	seen := make(map[string]bool)

	ast.Inspect(fn.Body, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}
		sel, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		methodName := sel.Sel.Name
		ident, ok := sel.X.(*ast.Ident)
		if !ok {
			return true
		}
		pkgOrVar := ident.Name

		// Standard testing package calls: t.Error, t.Errorf, t.Fatal, t.Fatalf, t.Fail, t.FailNow
		if (pkgOrVar == "t" || pkgOrVar == "b" || pkgOrVar == "f") &&
			(strings.HasPrefix(methodName, "Error") || strings.HasPrefix(methodName, "Fatal") || strings.HasPrefix(methodName, "Fail")) {
			if !seen[methodName] {
				seen[methodName] = true
				assertions = append(assertions, methodName)
			}
		}

		// Third-party assertion libraries: assert.Equal, require.NoError, is.NoErr, etc.
		lowerPkg := strings.ToLower(pkgOrVar)
		if lowerPkg == "assert" || lowerPkg == "require" || lowerPkg == "is" {
			key := pkgOrVar + "." + methodName
			if !seen[key] {
				seen[key] = true
				assertions = append(assertions, key)
			}
		}

		return true
	})

	return assertions
}

// LocateTests parses Go source using go/parser and extracts genuine executable test declarations.
func (a *Adapter) LocateTests(source []byte, filePath string) ([]parser.TestUnit, error) {
	fset := token.NewFileSet()
	fileAST, err := goparser.ParseFile(fset, filePath, source, goparser.ParseComments)
	if err != nil {
		return nil, err
	}

	var units []parser.TestUnit
	srcLen := len(source)

	for _, decl := range fileAST.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		isTest, kind := isGoTestFunc(fn)
		if !isTest {
			continue
		}

		startPos := fset.Position(fn.Pos())
		endPos := fset.Position(fn.End())

		startOffset := startPos.Offset
		endOffset := endPos.Offset
		if startOffset < 0 {
			startOffset = 0
		}
		if endOffset > srcLen {
			endOffset = srcLen
		}

		body := ""
		if startOffset < endOffset {
			body = string(source[startOffset:endOffset])
		}

		assertions := findExecutableAssertions(fn)

		units = append(units, parser.TestUnit{
			Name:       fn.Name.Name,
			FilePath:   filePath,
			StartLine:  startPos.Line,
			EndLine:    endPos.Line,
			Kind:       kind,
			RawBody:    body,
			Assertions: assertions,
			ASTDecl:    fn,
			FileSet:    fset,
		})
	}

	return units, nil
}


## Added pkg/parser/golang/adapter_test.go
sha256=9809054bce2f6db89f34ef41a1efff89218159095eb79ca692ef19c00de323b0

package golang_test

import (
	"testing"

	"github.com/HoangNguyen0403/testguard/pkg/parser/golang"
)

func TestGoAdapterMetadata(t *testing.T) {
	adapter := golang.NewAdapter()
	if adapter.ID() != "golang" {
		t.Errorf("expected ID 'golang', got %q", adapter.ID())
	}
	exts := adapter.FileExtensions()
	if len(exts) != 1 || exts[0] != ".go" {
		t.Errorf("expected ['.go'], got %v", exts)
	}
}

func TestGoAdapterIsGenerated(t *testing.T) {
	adapter := golang.NewAdapter()

	cases := []struct {
		path      string
		header    string
		generated bool
	}{
		{"user.pb.go", "package proto", true},
		{"client_mock.go", "package client", true},
		{"models.gen.go", "package models", true},
		{"api_gen.go", "package api", true},
		{"service.go", "// Code generated by protoc-gen-go. DO NOT EDIT.\npackage service", true},
		{"schema.go", "/* DO NOT EDIT - AUTOGENERATED */\npackage schema", true},
		{"order_test.go", "package service\nimport \"testing\"", false},
	}

	for _, tc := range cases {
		result := adapter.IsGenerated(tc.path, []byte(tc.header))
		if result != tc.generated {
			t.Errorf("IsGenerated(%q) = %v; expected %v", tc.path, result, tc.generated)
		}
	}
}

func TestGoAdapterLocateTestsRealVsQuoted(t *testing.T) {
	adapter := golang.NewAdapter()

	source := []byte(`package sample_test

import (
	"testing"
)

const fakeTestFixture = ` + "`" + `
func TestFakeInString(t *testing.T) {
	t.Fatal("should not be detected")
}
` + "`" + `

// func TestCommentedOut(t *testing.T) {
// 	t.Fail()
// }

func helperFunc() string {
	return "helper"
}

func Testlowercase(t *testing.T) {
	// Not a valid Go test declaration because 'l' is lowercase
}

type MySuite struct{}
func (s *MySuite) TestMethod(t *testing.T) {
	// Receiver method, not package-level test declaration
}

func TestRealUnit(t *testing.T) {
	if 1 != 1 {
		t.Fatal("failed math")
	}
}

func BenchmarkReal(b *testing.B) {
	for i := 0; i < b.N; i++ {
	}
}

func ExampleReal() {
	// Output: 42
}

func FuzzReal(f *testing.F) {
	f.Fuzz(func(t *testing.T, data []byte) {})
}
`)

	units, err := adapter.LocateTests(source, "sample_test.go")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Only TestRealUnit, BenchmarkReal, ExampleReal, and FuzzReal should be located
	if len(units) != 4 {
		t.Fatalf("expected 4 test units, got %d", len(units))
	}

	expectedNames := map[string]string{
		"TestRealUnit":  "unit",
		"BenchmarkReal": "benchmark",
		"ExampleReal":   "example",
		"FuzzReal":      "fuzz",
	}

	for _, u := range units {
		expectedKind, ok := expectedNames[u.Name]
		if !ok {
			t.Errorf("unexpected test unit found: %s", u.Name)
			continue
		}
		if u.Kind != expectedKind {
			t.Errorf("for test %s: expected kind %s, got %s", u.Name, expectedKind, u.Kind)
		}
		if u.ASTDecl == nil {
			t.Errorf("for test %s: ASTDecl was nil", u.Name)
		}
		if u.FileSet == nil {
			t.Errorf("for test %s: FileSet was nil", u.Name)
		}
	}
}

func TestGoAdapterLocateTestsAssertions(t *testing.T) {
	adapter := golang.NewAdapter()

	source := []byte(`package sample_test

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestWithExecutableAssertions(t *testing.T) {
	assert.Equal(t, 1, 1)
	t.Fatalf("failed")
}

func TestWithoutAssertions(t *testing.T) {
	const msg = "t.Fatal('inside string')"
	// t.Error("inside comment")
	x := 42
	_ = x
}
`)

	units, err := adapter.LocateTests(source, "assert_test.go")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(units) != 2 {
		t.Fatalf("expected 2 units, got %d", len(units))
	}

	unit1 := units[0]
	if unit1.Name != "TestWithExecutableAssertions" {
		t.Fatalf("expected first unit TestWithExecutableAssertions, got %s", unit1.Name)
	}
	if len(unit1.Assertions) == 0 {
		t.Errorf("expected executable assertions in %s, got none", unit1.Name)
	}

	unit2 := units[1]
	if unit2.Name != "TestWithoutAssertions" {
		t.Fatalf("expected second unit TestWithoutAssertions, got %s", unit2.Name)
	}
	if len(unit2.Assertions) != 0 {
		t.Errorf("expected 0 assertions in %s (quoted/commented only), got %v", unit2.Name, unit2.Assertions)
	}
}

func TestGoAdapterLocateTestsMalformed(t *testing.T) {
	adapter := golang.NewAdapter()
	malformed := []byte(`package broken
func TestBroken(t *testing.T { // missing paren
`)
	_, err := adapter.LocateTests(malformed, "broken_test.go")
	if err == nil {
		t.Errorf("expected parse error for malformed Go source, got nil")
	}
}

