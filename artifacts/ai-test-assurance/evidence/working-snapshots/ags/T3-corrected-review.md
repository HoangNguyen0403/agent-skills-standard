# Immutable review snapshot T3-corrected

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/36t7hh3x/ai-test-assurance
Base: 8fc53b4c683d312359166e49e397fa887dd0ac92
Captured: 2026-10-26T23:24:13.420Z

## Tracked diff

diff --git a/pkg/detectors/clone/hasher.go b/pkg/detectors/clone/hasher.go
index 87acc1c..0cca425 100644
--- a/pkg/detectors/clone/hasher.go
+++ b/pkg/detectors/clone/hasher.go
@@ -3,19 +3,214 @@ package clone
 import (
 	"crypto/sha256"
 	"fmt"
-	"regexp"
 	"strings"
 
 	"github.com/HoangNguyen0403/testguard/pkg/models"
 	"github.com/HoangNguyen0403/testguard/pkg/parser"
 )
 
-var (
-	stringLiteralRegex = regexp.MustCompile(`'[^']*'|"[^"]*"`)
-	numberLiteralRegex = regexp.MustCompile(`\b\d+(\.\d+)?\b`)
-	whitespaceRegex    = regexp.MustCompile(`\s+`)
+type tokenKind int
+
+const (
+	tokOther tokenKind = iota
+	tokString
+	tokNumber
 )
 
+type token struct {
+	kind tokenKind
+	text string
+}
+
+func isDigit(c byte) bool {
+	return c >= '0' && c <= '9'
+}
+
+func isIdentStart(c byte) bool {
+	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c == '$'
+}
+
+func isIdentPart(c byte) bool {
+	return isIdentStart(c) || isDigit(c)
+}
+
+// tokenizeCode scans test body into lexical tokens while discarding comments
+// and preserving verbatim literal contents (including spaces and newlines).
+func tokenizeCode(code string) []token {
+	var tokens []token
+	n := len(code)
+	i := 0
+
+	for i < n {
+		c := code[i]
+
+		// Skip whitespace outside string literals
+		if c == ' ' || c == '\t' || c == '\r' || c == '\n' {
+			i++
+			continue
+		}
+
+		// Single-line comment: // ...
+		if c == '/' && i+1 < n && code[i+1] == '/' {
+			i += 2
+			for i < n && code[i] != '\n' {
+				i++
+			}
+			continue
+		}
+
+		// Multi-line block comment: /* ... */
+		if c == '/' && i+1 < n && code[i+1] == '*' {
+			i += 2
+			for i+1 < n && !(code[i] == '*' && code[i+1] == '/') {
+				i++
+			}
+			if i+1 < n {
+				i += 2
+			}
+			continue
+		}
+
+		// Raw string in Dart: r'...' or r"..."
+		if (c == 'r' || c == 'R') && i+1 < n && (code[i+1] == '\'' || code[i+1] == '"') {
+			quote := code[i+1]
+			start := i
+			i += 2
+			for i < n && code[i] != quote && code[i] != '\n' {
+				i++
+			}
+			if i < n && code[i] == quote {
+				i++
+			}
+			tokens = append(tokens, token{kind: tokString, text: code[start:i]})
+			continue
+		}
+
+		// Go raw string: `...`
+		if c == '`' {
+			start := i
+			i++
+			for i < n && code[i] != '`' {
+				i++
+			}
+			if i < n && code[i] == '`' {
+				i++
+			}
+			tokens = append(tokens, token{kind: tokString, text: code[start:i]})
+			continue
+		}
+
+		// Triple-quoted string: """...""" or '''...'''
+		if (c == '\'' || c == '"') && i+2 < n && code[i+1] == c && code[i+2] == c {
+			quote := c
+			start := i
+			i += 3
+			for i+2 < n && !(code[i] == quote && code[i+1] == quote && code[i+2] == quote) {
+				if code[i] == '\\' && i+1 < n {
+					i += 2
+					continue
+				}
+				i++
+			}
+			if i+2 < n {
+				i += 3
+			}
+			tokens = append(tokens, token{kind: tokString, text: code[start:i]})
+			continue
+		}
+
+		// Standard quoted string: '...' or "..."
+		if c == '\'' || c == '"' {
+			quote := c
+			start := i
+			i++
+			for i < n && code[i] != quote {
+				if code[i] == '\\' && i+1 < n {
+					i += 2
+					continue
+				}
+				if code[i] == '\n' {
+					break
+				}
+				i++
+			}
+			if i < n && code[i] == quote {
+				i++
+			}
+			tokens = append(tokens, token{kind: tokString, text: code[start:i]})
+			continue
+		}
+
+		// Signed or unsigned numbers (e.g. 0, -1, +1, 100, 3.14)
+		isSign := (c == '-' || c == '+') && i+1 < n && isDigit(code[i+1])
+		if isSign || isDigit(c) {
+			isUnarySign := false
+			if isSign {
+				if len(tokens) == 0 {
+					isUnarySign = true
+				} else {
+					prev := tokens[len(tokens)-1].text
+					if prev == "(" || prev == "[" || prev == "{" || prev == "," || prev == "=" ||
+						prev == ":" || prev == "==" || prev == "!=" || prev == "<" || prev == ">" ||
+						prev == "+" || prev == "-" || prev == "*" || prev == "/" || prev == "return" {
+						isUnarySign = true
+					}
+				}
+			}
+
+			if isDigit(c) || isUnarySign {
+				start := i
+				if isSign {
+					i++
+				}
+				for i < n && (isDigit(code[i]) || code[i] == '.' || code[i] == 'e' || code[i] == 'E' ||
+					((code[i] == '+' || code[i] == '-') && (code[i-1] == 'e' || code[i-1] == 'E'))) {
+					i++
+				}
+				tokens = append(tokens, token{kind: tokNumber, text: code[start:i]})
+				continue
+			}
+		}
+
+		// Identifiers and keywords
+		if isIdentStart(c) {
+			start := i
+			i++
+			for i < n && isIdentPart(code[i]) {
+				i++
+			}
+			tokens = append(tokens, token{kind: tokOther, text: code[start:i]})
+			continue
+		}
+
+		// Multi-character comparison / assignment operators
+		if (c == '=' || c == '!' || c == '<' || c == '>') && i+1 < n && code[i+1] == '=' {
+			tokens = append(tokens, token{kind: tokOther, text: code[i : i+2]})
+			i += 2
+			continue
+		}
+
+		// Other operators, punctuation, single characters
+		tokens = append(tokens, token{kind: tokOther, text: string(c)})
+		i++
+	}
+
+	return tokens
+}
+
+// isExactTokens returns true if two token streams have identical tokens and literal values.
+func isExactTokens(t1, t2 []token) bool {
+	if len(t1) != len(t2) {
+		return false
+	}
+	for i := range t1 {
+		if t1[i].kind != t2[i].kind || t1[i].text != t2[i].text {
+			return false
+		}
+	}
+	return true
+}
+
 // Detector identifies duplicate tests and structural repetition.
 type Detector struct{}
 
@@ -24,11 +219,21 @@ func New() *Detector {
 	return &Detector{}
 }
 
-// Normalize replaces string and number literals with generic tokens.
+// Normalize replaces string and number literals with generic tokens from token stream.
 func Normalize(code string) string {
-	s := stringLiteralRegex.ReplaceAllString(code, "_LIT_")
-	s = numberLiteralRegex.ReplaceAllString(s, "_NUM_")
-	return strings.TrimSpace(whitespaceRegex.ReplaceAllString(s, " "))
+	tokens := tokenizeCode(code)
+	var parts []string
+	for _, tok := range tokens {
+		switch tok.kind {
+		case tokString:
+			parts = append(parts, "_LIT_")
+		case tokNumber:
+			parts = append(parts, "_NUM_")
+		default:
+			parts = append(parts, tok.text)
+		}
+	}
+	return strings.Join(parts, " ")
 }
 
 // HashTokenStream produces a SHA256 hex string of the normalized code.
@@ -38,32 +243,67 @@ func HashTokenStream(code string) string {
 	return fmt.Sprintf("%x", h)
 }
 
+// getCloneExecutionBody extracts the execution body of a test unit,
+// isolating the function body block { ... } when a declaration header is present.
+func getCloneExecutionBody(unit parser.TestUnit) string {
+	raw := strings.TrimSpace(unit.RawBody)
+	if strings.HasPrefix(raw, "func ") {
+		openBrace := strings.Index(raw, "{")
+		if openBrace != -1 {
+			closeBrace := parser.FindMatchingBrace(raw, openBrace)
+			if closeBrace != -1 && closeBrace >= openBrace {
+				return raw[openBrace : closeBrace+1]
+			}
+			return raw[openBrace:]
+		}
+	}
+	return raw
+}
+
 // Check compares test units within the same file for duplicate execution bodies.
 func (d *Detector) Check(units []parser.TestUnit) []models.Violation {
 	var violations []models.Violation
 	seenHashes := make(map[string][]parser.TestUnit)
 
 	for _, unit := range units {
-		if unit.Kind == "file" || len(unit.RawBody) < 20 {
+		if unit.Kind == "file" {
+			continue
+		}
+		execBody := getCloneExecutionBody(unit)
+		tokens := tokenizeCode(execBody)
+		if len(tokens) < 3 {
 			continue
 		}
 
-		h := HashTokenStream(unit.RawBody)
+		h := HashTokenStream(execBody)
 		seenHashes[h] = append(seenHashes[h], unit)
 	}
 
 	for _, group := range seenHashes {
 		if len(group) == 2 || len(group) == 3 {
-			// Exact clone between 2-3 tests
+			// Clone between 2-3 tests
+			tokens0 := tokenizeCode(getCloneExecutionBody(group[0]))
 			for i := 1; i < len(group); i++ {
+				tokensI := tokenizeCode(getCloneExecutionBody(group[i]))
+				isExact := isExactTokens(tokens0, tokensI)
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
@@ -75,8 +315,8 @@ func (d *Detector) Check(units []parser.TestUnit) []models.Violation {
 					FilePath:   group[i].FilePath,
 					LineNumber: group[i].StartLine,
 					Column:     1,
-					Message:    fmt.Sprintf("Structural repetition: '%s' shares identical AST structure with %d other tests in this file (first seen at '%s', line %d).", group[i].Name, len(group)-1, group[0].Name, group[0].StartLine),
-					Suggestion: "Consolidate repetitive test structures into a parameterized table-driven test loop.",
+					Message:    fmt.Sprintf("Structural repetition: '%s' shares normalized token structure with %d other tests in this file (first seen at '%s', line %d). Note: structural similarity does not prove semantic redundancy.", group[i].Name, len(group)-1, group[0].Name, group[0].StartLine),
+					Suggestion: "Consolidate repetitive test structures into a parameterized table-driven test loop without removing valid boundary conditions or distinct equivalence classes.",
 				})
 			}
 		}
diff --git a/pkg/detectors/clone/hasher_test.go b/pkg/detectors/clone/hasher_test.go
index 2ebaefa..26e41cf 100644
--- a/pkg/detectors/clone/hasher_test.go
+++ b/pkg/detectors/clone/hasher_test.go
@@ -1,6 +1,7 @@
 package clone_test
 
 import (
+	"strings"
 	"testing"
 
 	"github.com/HoangNguyen0403/testguard/pkg/detectors/clone"
@@ -34,6 +35,130 @@ func TestDetectExactClones(t *testing.T) {
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
+func TestDetectExactClones_WhitespaceInsideStringsNotExact(t *testing.T) {
+	test1 := parser.TestUnit{
+		Name:      "test_double_space",
+		FilePath:  "format_test.go",
+		StartLine: 10,
+		RawBody:   `assert.Equal(t, "a  b", actual);`,
+	}
+
+	test2 := parser.TestUnit{
+		Name:      "test_single_space",
+		FilePath:  "format_test.go",
+		StartLine: 20,
+		RawBody:   `assert.Equal(t, "a b", actual);`,
+	}
+
+	detector := clone.New()
+	violations := detector.Check([]parser.TestUnit{test1, test2})
+
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 advisory violation for structural similarity, got %d", len(violations))
+	}
+	v := violations[0]
+	if strings.Contains(v.Message, "identical execution tokens") {
+		t.Errorf("expected structural similarity message, not identical execution tokens: %s", v.Message)
+	}
+	if !strings.Contains(v.Message, "not proven semantic redundancy") {
+		t.Errorf("expected structural similarity message, got: %s", v.Message)
+	}
+}
+
+func TestDetectExactClones_CommentsDifferExact(t *testing.T) {
+	test1 := parser.TestUnit{
+		Name:      "test_comment_1",
+		FilePath:  "math_test.dart",
+		StartLine: 10,
+		RawBody: `
+		// Arrange and Act
+		expect(calculator.add(10, 20), equals(30));
+		`,
+	}
+
+	test2 := parser.TestUnit{
+		Name:      "test_comment_2",
+		FilePath:  "math_test.dart",
+		StartLine: 25,
+		RawBody: `
+		/* Different comment style */
+		expect(calculator.add(10, 20), equals(30));
+		`,
+	}
+
+	detector := clone.New()
+	violations := detector.Check([]parser.TestUnit{test1, test2})
+
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 exact clone violation, got %d", len(violations))
+	}
+	if !strings.Contains(violations[0].Message, "identical execution tokens") {
+		t.Errorf("expected identical execution tokens message, got: %s", violations[0].Message)
+	}
+}
+
+func TestDetectExactClones_FunctionHeaderExtracted(t *testing.T) {
+	test1 := parser.TestUnit{
+		Name:      "TestAlpha",
+		FilePath:  "service_test.go",
+		StartLine: 10,
+		RawBody: `func TestAlpha(t *testing.T) {
+			x := 42
+			assert.Equal(t, 42, x)
+		}`,
+	}
+
+	test2 := parser.TestUnit{
+		Name:      "TestBeta",
+		FilePath:  "service_test.go",
+		StartLine: 20,
+		RawBody: `func TestBeta(t *testing.T) {
+			x := 42
+			assert.Equal(t, 42, x)
+		}`,
+	}
+
+	detector := clone.New()
+	violations := detector.Check([]parser.TestUnit{test1, test2})
+
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 exact clone violation despite different test names, got %d", len(violations))
+	}
+	if !strings.Contains(violations[0].Message, "identical execution tokens") {
+		t.Errorf("expected identical execution tokens, got: %s", violations[0].Message)
+	}
+}
+
 func TestDetectStructuralRepetition(t *testing.T) {
 	var tests []parser.TestUnit
 	for i := 1; i <= 5; i++ {
@@ -52,6 +177,9 @@ func TestDetectStructuralRepetition(t *testing.T) {
 	for _, v := range violations {
 		if v.RuleID == "GUARD-UNIV-02" {
 			hasRepetition = true
+			if strings.Contains(v.Message, "AST structure") {
+				t.Errorf("message should not claim AST structure: %s", v.Message)
+			}
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
index d2f32df..1330f6e 100644
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
@@ -95,7 +107,6 @@ func New() *Engine {
 }
 
 var (
-	goTestRegex           = regexp.MustCompile(`(?m)^[ \t]*func\s+(Test\w+)\s*\(`)
 	tsTestRegex           = regexp.MustCompile(`(?m)^[ \t]*(?:it|test)\s*\(\s*(?:"((?:\\.|[^"])+)"|'((?:\\.|[^'])+)')`)
 	ktTestRegex           = regexp.MustCompile(`(?m)^[ \t]*@Test\s+(?:fun\s+)?(\w+)`)
 	swiftTestRegex        = regexp.MustCompile(`(?m)^[ \t]*func\s+(test\w+)\s*\(`)
@@ -129,8 +140,6 @@ func parseGenericTestUnits(content []byte, filePath string) []parser.TestUnit {
 	}
 	var targetRegex *regexp.Regexp
 	switch {
-	case strings.HasSuffix(filePath, ".go"):
-		targetRegex = goTestRegex
 	case strings.HasSuffix(filePath, ".ts") || strings.HasSuffix(filePath, ".tsx") || strings.HasSuffix(filePath, ".js") || strings.HasSuffix(filePath, ".jsx"):
 		targetRegex = tsTestRegex
 	case strings.HasSuffix(filePath, ".kt"):
@@ -138,7 +147,7 @@ func parseGenericTestUnits(content []byte, filePath string) []parser.TestUnit {
 	case strings.HasSuffix(filePath, ".swift"):
 		targetRegex = swiftTestRegex
 	default:
-		targetRegex = goTestRegex
+		targetRegex = tsTestRegex
 	}
 
 	matches := targetRegex.FindAllStringSubmatchIndex(src, -1)
@@ -209,63 +218,85 @@ func parseGenericTestUnits(content []byte, filePath string) []parser.TestUnit {
 
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
@@ -273,13 +304,32 @@ func (e *Engine) Run(opts Options) (*Result, error) {
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
@@ -314,10 +364,73 @@ func (e *Engine) Run(opts Options) (*Result, error) {
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
index 0a3b2f4..4ac92dd 100644
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
@@ -159,4 +174,705 @@ func TestEnginePathDeduplication(t *testing.T) {
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
+}
+
+func TestEngineGoTestMainAndDAOExemption(t *testing.T) {
+	tmpDir := t.TempDir()
+	eng := engine.New()
+
+	// 4. TestMain-only file: excluded from test units, leaving 0 analyzed tests and empty_scope (R4)
+	testMainFile := filepath.Join(tmpDir, "main_only_test.go")
+	_ = os.WriteFile(testMainFile, []byte(`package sample_test
+import "testing"
+func TestMain(m *testing.M) {
+    m.Run()
+}
+`), 0644)
+	resTestMain, err := eng.Run(engine.Options{
+		TargetPaths: []string{testMainFile},
+		AllowEmpty:  false,
+	})
+	if err != nil {
+		t.Fatalf("unexpected error scanning TestMain file: %v", err)
+	}
+	if resTestMain.Report.Analysis.AnalyzedTests != 0 {
+		t.Errorf("expected 0 analyzed tests for TestMain-only file, got %d", resTestMain.Report.Analysis.AnalyzedTests)
+	}
+	if resTestMain.Report.Analysis.Status != "incomplete" || resTestMain.Report.Analysis.Reason != "empty_scope" || resTestMain.Report.ExitCode != 2 {
+		t.Errorf("expected incomplete/empty_scope/exit 2 for TestMain-only file, got status=%q, reason=%q, exit=%d",
+			resTestMain.Report.Analysis.Status, resTestMain.Report.Analysis.Reason, resTestMain.Report.ExitCode)
+	}
+
+	// 5. DAO root-relative directory exemption (R3)
+	daoDir := filepath.Join(tmpDir, "dao")
+	_ = os.MkdirAll(daoDir, 0755)
+	daoFile := filepath.Join(daoDir, "order_dao_test.go")
+	_ = os.WriteFile(daoFile, []byte(`package dao_test
+import (
+    "testing"
+    "github.com/DATA-DOG/go-sqlmock"
+)
+func TestOrderDAO(t *testing.T) {
+    db, mock, err := sqlmock.New()
+    _ = db
+    _ = mock
+    _ = err
+    t.Fatal("fail")
+}
+`), 0644)
+	resDAO, err := eng.Run(engine.Options{
+		TargetPaths: []string{daoFile},
+	})
+	if err != nil {
+		t.Fatalf("unexpected error scanning DAO file: %v", err)
+	}
+	for _, f := range resDAO.Report.Findings {
+		if f.RuleID == "GUARD-GO-02" {
+			t.Errorf("expected DAO file %s to be exempted from GUARD-GO-02, but violation was emitted", daoFile)
+		}
+	}
 }
diff --git a/pkg/parser/adapter.go b/pkg/parser/adapter.go
index 5e17ffd..b8562c8 100644
--- a/pkg/parser/adapter.go
+++ b/pkg/parser/adapter.go
@@ -28,6 +28,14 @@ type TestUnit struct {
 	SeedBody   string   `json:"seed_body,omitempty"`
 	ActBody    string   `json:"act_body,omitempty"`
 	ExpectBody string   `json:"expect_body,omitempty"`
+
+	// ASTDecl holds an optional language-specific AST declaration (e.g. *ast.FuncDecl for Go).
+	// Excluded from JSON serialization to maintain cross-language model contracts.
+	ASTDecl any `json:"-"`
+	// FileSet holds an optional token.FileSet for AST source position resolution.
+	FileSet any `json:"-"`
+	// FileImports holds an optional map of local package names/aliases to canonical import paths.
+	FileImports map[string]string `json:"-"`
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
index 3e06684..50631b7 100644
--- a/pkg/rules/golang/rules.go
+++ b/pkg/rules/golang/rules.go
@@ -1,9 +1,13 @@
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
@@ -11,33 +15,114 @@ import (
 )
 
 var (
-	mockControllerRegex = regexp.MustCompile(`(?i)(?:gomock\.NewController|mocks\.NewMock|testify/mock)`)
-	sqlmockRegex        = regexp.MustCompile(`(?i)(?:sqlmock\.New|pgxmock\.New|gorm\.Open)`)
-	rowPatternRegex     = regexp.MustCompile(`(?m)^\s*\{([^}]+)\},?`)
-	commentRegex        = regexp.MustCompile(`//.*`)
-
-	repoOrInfraPatterns = []string{
+	repoOrInfraDirSegments = []string{
 		"/repository/",
-		"_repository_test.go",
 		"/infrastructure/",
 		"/database/",
 		"/db/",
 		"/dao/",
 		"/store/",
 	}
+	repoOrInfraFileSuffixes = []string{
+		"_repository_test.go",
+		"_repo_test.go",
+		"_dao_test.go",
+		"_store_test.go",
+	}
 )
 
 func isRepositoryOrInfraLayer(filePath string) bool {
-	normalized := "/" + strings.TrimPrefix(filepath.ToSlash(filePath), "/")
-	for _, pattern := range repoOrInfraPatterns {
-		if strings.Contains(normalized, pattern) || strings.Contains(filePath, pattern) {
+	normalized := "/" + strings.ToLower(strings.TrimPrefix(filepath.ToSlash(filePath), "/"))
+	for _, seg := range repoOrInfraDirSegments {
+		if strings.Contains(normalized, seg) {
+			return true
+		}
+	}
+	for _, suf := range repoOrInfraFileSuffixes {
+		if strings.HasSuffix(normalized, suf) {
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
+	} else if strings.HasPrefix(raw, "{") && strings.HasSuffix(raw, "}") {
+		src = "package p\nfunc _testFunc() " + raw
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
+	} else if strings.HasPrefix(raw, "{") && strings.HasSuffix(raw, "}") {
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
+// Note: Helper-mediated mock instantiation outside the test AST is outside static boundary.
 type DomainPurityRule struct{}
 
 func NewDomainPurityRule() *DomainPurityRule {
@@ -47,26 +132,91 @@ func NewDomainPurityRule() *DomainPurityRule {
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
+		identName := ident.Name
+		methodName := sel.Sel.Name
+		isViolation := false
+
+		if len(unit.FileImports) > 0 {
+			importPath, isImported := unit.FileImports[identName]
+			if isImported {
+				// gomock package call (canonical or aliased)
+				if strings.Contains(importPath, "golang/mock/gomock") && methodName == "NewController" {
+					isViolation = true
+				}
+				// testify/mock package call
+				if strings.Contains(importPath, "testify/mock") &&
+					(strings.HasPrefix(methodName, "New") || methodName == "MatchedBy" || methodName == "Anything") {
+					isViolation = true
+				}
+				// Generated mocks package call
+				if (strings.HasSuffix(importPath, "/mocks") || strings.Contains(importPath, "/mock/")) &&
+					strings.HasPrefix(methodName, "NewMock") {
+					isViolation = true
+				}
+			}
+		} else {
+			// Fallback heuristic for synthetic units without import carrier
+			pkgName := strings.ToLower(identName)
+			if pkgName == "gomock" && methodName == "NewController" {
+				isViolation = true
+			}
+			if pkgName == "mocks" && strings.HasPrefix(methodName, "NewMock") {
+				isViolation = true
+			}
+			if pkgName == "mock" && (strings.HasPrefix(methodName, "New") || methodName == "MatchedBy" || methodName == "Anything") {
+				isViolation = true
+			}
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
 
 // PortMockingRule verifies that service/usecase tests mock interface ports, not concrete database drivers.
+// Note: Helper-mediated database instantiation outside the test AST is outside static boundary.
 type PortMockingRule struct{}
 
 func NewPortMockingRule() *PortMockingRule {
@@ -80,18 +230,81 @@ func (r *PortMockingRule) Evaluate(unit parser.TestUnit) []models.Violation {
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
+		identName := ident.Name
+		methodName := sel.Sel.Name
+		isViolation := false
+
+		if len(unit.FileImports) > 0 {
+			importPath, isImported := unit.FileImports[identName]
+			if isImported {
+				if strings.Contains(importPath, "sqlmock") && strings.HasPrefix(methodName, "New") {
+					isViolation = true
+				}
+				if strings.Contains(importPath, "pgxmock") && strings.HasPrefix(methodName, "New") {
+					isViolation = true
+				}
+				if strings.Contains(importPath, "gorm") && methodName == "Open" {
+					isViolation = true
+				}
+			}
+		} else {
+			// Fallback heuristic for synthetic units without import carrier
+			pkgName := strings.ToLower(identName)
+			switch pkgName {
+			case "sqlmock":
+				if strings.HasPrefix(methodName, "New") {
+					isViolation = true
+				}
+			case "pgxmock":
+				if strings.HasPrefix(methodName, "New") {
+					isViolation = true
+				}
+			case "gorm":
+				if methodName == "Open" {
+					isViolation = true
+				}
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
 
@@ -102,37 +315,102 @@ func NewTableDuplicateRule() *TableDuplicateRule {
 	return &TableDuplicateRule{}
 }
 
+func isPrimitiveScalarType(name string) bool {
+	switch name {
+	case "string", "int", "int8", "int16", "int32", "int64",
+		"uint", "uint8", "uint16", "uint32", "uint64", "uintptr",
+		"float32", "float64", "complex64", "complex128",
+		"bool", "byte", "rune", "error", "any":
+		return true
+	}
+	return false
+}
+
+func isStructRowLiteral(expr ast.Expr) bool {
+	switch e := expr.(type) {
+	case *ast.CompositeLit:
+		return true
+	case *ast.UnaryExpr:
+		if e.Op == token.AND {
+			_, isLit := e.X.(*ast.CompositeLit)
+			return isLit
+		}
+	}
+	return false
+}
+
+// isTableComposite ensures compLit represents a defensible table-driven test row slice,
+// rejecting primitive/scalar fixture arrays and arbitrary non-table struct containers.
+func isTableComposite(compLit *ast.CompositeLit) bool {
+	if len(compLit.Elts) < 2 {
+		return false
+	}
+
+	arrType, isArray := compLit.Type.(*ast.ArrayType)
+	if !isArray {
+		return false
+	}
+
+	if arrType.Elt != nil {
+		if ident, ok := arrType.Elt.(*ast.Ident); ok && isPrimitiveScalarType(ident.Name) {
+			return false
+		}
+	}
+
+	// Every element must be a struct row literal ({...} or &{...})
+	for _, elt := range compLit.Elts {
+		if !isStructRowLiteral(elt) {
+			return false
+		}
+	}
+
+	return true
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
+		// Table boundaries are isolated per composite literal
+		seenRows := make(map[string]bool)
+		for _, elt := range compLit.Elts {
+			var buf bytes.Buffer
+			if err := format.Node(&buf, fset, elt); err != nil {
+				continue
+			}
+			rawContent := strings.TrimSpace(buf.String())
+			// Strip outer braces if present for clean reporting
+			trimmedContent := strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(rawContent, "{"), "}"))
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
index 827af73..1172f0d 100644
--- a/pkg/rules/golang/rules_test.go
+++ b/pkg/rules/golang/rules_test.go
@@ -30,6 +30,78 @@ func TestDomainPurityRule(t *testing.T) {
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
+	expectedLine := 43
+	if violations[0].LineNumber != expectedLine {
+		t.Errorf("expected violation at line %d, got %d", expectedLine, violations[0].LineNumber)
+	}
+}
+
+func TestDomainPurityRule_AliasedImportDetected(t *testing.T) {
+	checker := golang.NewDomainPurityRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestDomainAliasedGomock",
+		FilePath:  "internal/domain/user_test.go",
+		StartLine: 20,
+		RawBody: `func TestDomainAliasedGomock(t *testing.T) {
+	ctrl := gmock.NewController(t)
+	_ = ctrl
+}`,
+		FileImports: map[string]string{
+			"gmock": "github.com/golang/mock/gomock",
+		},
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 violation for aliased gomock import, got %d", len(violations))
+	}
+	if violations[0].RuleID != "GUARD-GO-01" {
+		t.Errorf("expected GUARD-GO-01, got %s", violations[0].RuleID)
+	}
+}
+
 func TestPortMockingRule(t *testing.T) {
 	checker := golang.NewPortMockingRule()
 
@@ -90,12 +162,22 @@ func TestPortMockingRule(t *testing.T) {
 				rawBody:  "db, mock, err := sqlmock.New();",
 			},
 			{
-				name:     "dao directory",
+				name:     "dao directory root-relative",
 				filePath: "dao/order_dao_test.go",
 				rawBody:  "db, mock, err := sqlmock.New();",
 			},
 			{
-				name:     "store directory",
+				name:     "dao directory nested",
+				filePath: "internal/dao/item_dao_test.go",
+				rawBody:  "db, mock, err := sqlmock.New();",
+			},
+			{
+				name:     "store directory root-relative",
+				filePath: "store/cache_test.go",
+				rawBody:  "db, mock, err := sqlmock.New();",
+			},
+			{
+				name:     "store directory nested",
 				filePath: "pkg/store/cache_test.go",
 				rawBody:  "db, mock, err := sqlmock.New();",
 			},
@@ -117,6 +199,128 @@ func TestPortMockingRule(t *testing.T) {
 			})
 		}
 	})
+
+	t.Run("service files merely containing repository or database in basename are NOT exempted", func(t *testing.T) {
+		serviceCases := []string{
+			"service/repository_client_test.go",
+			"service/database_sync_test.go",
+			"internal/handler/repository_handler_test.go",
+		}
+
+		for _, path := range serviceCases {
+			unit := parser.TestUnit{
+				Name:      "TestServiceDirectDb",
+				FilePath:  path,
+				StartLine: 15,
+				RawBody:   "db, mock, err := sqlmock.New();",
+			}
+
+			violations := checker.Evaluate(unit)
+			if len(violations) != 1 {
+				t.Errorf("expected 1 violation for non-infra file %s calling sqlmock.New(), got %d", path, len(violations))
+			}
+		}
+	})
+}
+
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
+func TestPortMockingRule_AliasedImportDetected(t *testing.T) {
+	checker := golang.NewPortMockingRule()
+
+	unit := parser.TestUnit{
+		Name:      "TestServiceAliasedSqlmock",
+		FilePath:  "internal/service/order_test.go",
+		StartLine: 25,
+		RawBody: `func TestServiceAliasedSqlmock(t *testing.T) {
+	db, mock, err := dbmock.New()
+	_ = db
+	_ = mock
+	_ = err
+}`,
+		FileImports: map[string]string{
+			"dbmock": "github.com/DATA-DOG/go-sqlmock",
+		},
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 violation for aliased sqlmock import, got %d", len(violations))
+	}
+	if violations[0].RuleID != "GUARD-GO-02" {
+		t.Errorf("expected GUARD-GO-02, got %s", violations[0].RuleID)
+	}
+}
+
+func TestPortMockingRule_UnrelatedLocalReceiverIgnored(t *testing.T) {
+	checker := golang.NewPortMockingRule()
+
+	// When FileImports is present and does NOT include sqlmock,
+	// an unrelated local variable named sqlmock calling New() must NOT be flagged (R7)
+	unit := parser.TestUnit{
+		Name:      "TestServiceLocalReceiver",
+		FilePath:  "internal/service/order_test.go",
+		StartLine: 25,
+		RawBody: `func TestServiceLocalReceiver(t *testing.T) {
+	var sqlmock Helper
+	res := sqlmock.New()
+	_ = res
+}`,
+		FileImports: map[string]string{
+			"myutil": "company.com/myutil",
+		},
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 0 {
+		t.Errorf("expected 0 violations for unrelated local receiver named sqlmock, got %d", len(violations))
+	}
 }
 
 func TestTableDuplicateRule(t *testing.T) {
@@ -142,3 +346,138 @@ func TestTableDuplicateRule(t *testing.T) {
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
+func TestTableDuplicateRule_ScalarSlicesAndNestedPayloadsIgnored(t *testing.T) {
+	checker := golang.NewTableDuplicateRule()
+
+	// 1. Repeated scalar string slices must NOT be treated as table tests (R6)
+	unitStringSlice := parser.TestUnit{
+		Name:      "TestStringFixture",
+		FilePath:  "service/parser_test.go",
+		StartLine: 10,
+		RawBody: `
+		repeatedStrings := []string{"repeat", "repeat"}
+		_ = repeatedStrings
+		`,
+	}
+	if len(checker.Evaluate(unitStringSlice)) != 0 {
+		t.Errorf("expected 0 violations for scalar string slice with repeated items")
+	}
+
+	// 2. Repeated number slices must NOT be treated as table tests (R6)
+	unitNumberSlice := parser.TestUnit{
+		Name:      "TestNumberFixture",
+		FilePath:  "service/calc_test.go",
+		StartLine: 10,
+		RawBody: `
+		repeatedNumbers := []int{100, 100, 200}
+		_ = repeatedNumbers
+		`,
+	}
+	if len(checker.Evaluate(unitNumberSlice)) != 0 {
+		t.Errorf("expected 0 violations for scalar int slice with repeated items")
+	}
+}
+
+func TestTableDuplicateRule_ShortDuplicateRowsDetected(t *testing.T) {
+	checker := golang.NewTableDuplicateRule()
+
+	// Short duplicate struct rows like {0} must be detected and not skipped by arbitrary length (R6)
+	unit := parser.TestUnit{
+		Name:      "TestShortRows",
+		FilePath:  "service/math_test.go",
+		StartLine: 20,
+		RawBody: `func TestShortRows(t *testing.T) {
+	tests := []struct{ n int }{
+		{0},
+		{0},
+	}
+	_ = tests
+}`,
+	}
+
+	violations := checker.Evaluate(unit)
+	if len(violations) != 1 {
+		t.Fatalf("expected 1 violation for duplicate short rows {0}, got %d", len(violations))
+	}
+	expectedLine := 23
+	if violations[0].LineNumber != expectedLine {
+		t.Errorf("expected violation at line %d, got %d", expectedLine, violations[0].LineNumber)
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
sha256=64c056920e63de40732ee3eec41dfb5475365dc79fba6fd75b6f4aab5d977e1c

package golang

import (
	"bytes"
	"go/ast"
	goparser "go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"unicode"
	"unicode/utf8"

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

// isValidTestName checks if name starts with prefix and the following rune is uppercase or underscore.
func isValidTestName(name, prefix string) bool {
	if !strings.HasPrefix(name, prefix) {
		return false
	}
	rest := strings.TrimPrefix(name, prefix)
	if len(rest) == 0 {
		return true
	}
	r, _ := utf8.DecodeRuneInString(rest)
	return !unicode.IsLower(r)
}

// isPointerToTestingType checks if expr matches *<pkg>.<typeName>
func isPointerToTestingType(expr ast.Expr, testingPkg, typeName string) bool {
	star, ok := expr.(*ast.StarExpr)
	if !ok {
		return false
	}
	sel, ok := star.X.(*ast.SelectorExpr)
	if ok {
		ident, ok := sel.X.(*ast.Ident)
		return ok && (ident.Name == testingPkg || ident.Name == "testing") && sel.Sel.Name == typeName
	}
	ident, ok := star.X.(*ast.Ident)
	return ok && ident.Name == typeName
}

// isGoTestFunc returns true and the test kind if fn is an executable Go test declaration.
func isGoTestFunc(fn *ast.FuncDecl, testingPkg string) (bool, string) {
	if fn.Recv != nil || fn.Name == nil || fn.Body == nil {
		return false, ""
	}
	// No generics/type parameters in standard Go test declarations
	if fn.Type.TypeParams != nil && len(fn.Type.TypeParams.List) > 0 {
		return false, ""
	}
	// No return values in standard Go test declarations
	if fn.Type.Results != nil && len(fn.Type.Results.List) > 0 {
		return false, ""
	}

	name := fn.Name.Name
	// Exclude TestMain runner entry point
	if name == "TestMain" {
		return false, ""
	}

	if isValidTestName(name, "Test") {
		// Must take exactly 1 parameter of type *testing.T
		if fn.Type.Params == nil || len(fn.Type.Params.List) != 1 {
			return false, ""
		}
		param := fn.Type.Params.List[0]
		if !isPointerToTestingType(param.Type, testingPkg, "T") {
			return false, ""
		}
		return true, "unit"
	}

	if isValidTestName(name, "Benchmark") {
		// Must take exactly 1 parameter of type *testing.B
		if fn.Type.Params == nil || len(fn.Type.Params.List) != 1 {
			return false, ""
		}
		param := fn.Type.Params.List[0]
		if !isPointerToTestingType(param.Type, testingPkg, "B") {
			return false, ""
		}
		return true, "benchmark"
	}

	if isValidTestName(name, "Fuzz") {
		// Must take exactly 1 parameter of type *testing.F
		if fn.Type.Params == nil || len(fn.Type.Params.List) != 1 {
			return false, ""
		}
		param := fn.Type.Params.List[0]
		if !isPointerToTestingType(param.Type, testingPkg, "F") {
			return false, ""
		}
		return true, "fuzz"
	}

	if isValidTestName(name, "Example") {
		// Examples take 0 parameters
		if fn.Type.Params != nil && len(fn.Type.Params.List) > 0 {
			return false, ""
		}
		return true, "example"
	}

	return false, ""
}

func isCommonAssertionMethod(method string) bool {
	switch method {
	case "Equal", "NotEqual", "True", "False", "NoError", "Error", "Nil", "NotNil",
		"Contains", "NotContains", "Len", "Empty", "NotEmpty", "Zero", "NotZero",
		"Same", "NotSame", "Implements", "IsType", "NoErr":
		return true
	}
	return false
}

// findExecutableAssertions searches the AST body of a test function for genuine
// assertion calls while strictly ignoring strings, comments, and constructors.
func findExecutableAssertions(fn *ast.FuncDecl, fileImports map[string]string) []string {
	if fn.Body == nil {
		return nil
	}

	testingParamName := "t"
	if fn.Type.Params != nil && len(fn.Type.Params.List) > 0 {
		if len(fn.Type.Params.List[0].Names) > 0 {
			testingParamName = fn.Type.Params.List[0].Names[0].Name
		}
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

		// 1. Direct calls on the testing parameter (e.g. t.Fatal, test.Errorf, b.Fail)
		if pkgOrVar == testingParamName || pkgOrVar == "t" || pkgOrVar == "b" || pkgOrVar == "f" {
			if strings.HasPrefix(methodName, "Error") || strings.HasPrefix(methodName, "Fatal") || strings.HasPrefix(methodName, "Fail") {
				if !seen[methodName] {
					seen[methodName] = true
					assertions = append(assertions, methodName)
				}
				return true
			}
		}

		// 2. Check for assertion package calls (assert.*, require.*, is.*)
		importPath := fileImports[pkgOrVar]
		isAssertionPkg := false
		if strings.Contains(importPath, "testify/assert") || strings.Contains(importPath, "testify/require") ||
			strings.Contains(importPath, "matryer/is") {
			isAssertionPkg = true
		} else if importPath == "" {
			// Fallback: heuristic package name
			lower := strings.ToLower(pkgOrVar)
			if lower == "assert" || lower == "require" || lower == "is" {
				isAssertionPkg = true
			}
		}

		if isAssertionPkg {
			// Constructors like assert.New(t) or is.New(t) do NOT count as assertions
			if methodName == "New" {
				return true
			}
			key := pkgOrVar + "." + methodName
			if !seen[key] {
				seen[key] = true
				assertions = append(assertions, key)
			}
			return true
		}

		// 3. Calls on instantiated assert object (e.g. is.Equal(...), assertObj.True(...))
		if isCommonAssertionMethod(methodName) {
			if !seen[methodName] {
				seen[methodName] = true
				assertions = append(assertions, methodName)
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

	fileImports := make(map[string]string)
	testingPkg := "testing"
	for _, imp := range fileAST.Imports {
		path := strings.Trim(imp.Path.Value, `"`)
		localName := filepath.Base(path)
		if imp.Name != nil {
			localName = imp.Name.Name
		}
		fileImports[localName] = path
		if path == "testing" {
			testingPkg = localName
		}
	}

	var units []parser.TestUnit
	srcLen := len(source)

	for _, decl := range fileAST.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		isTest, kind := isGoTestFunc(fn, testingPkg)
		if !isTest {
			continue
		}

		// Function declaration span
		declStart := fset.Position(fn.Pos())
		declEnd := fset.Position(fn.End())

		// Extract function body block { ... } as RawBody so declaration names
		// do not prevent identical test bodies from matching in clone detection (R1)
		bodyStart := fset.Position(fn.Body.Pos())
		bodyEnd := fset.Position(fn.Body.End())

		bodyStartOff := bodyStart.Offset
		bodyEndOff := bodyEnd.Offset
		if bodyStartOff < 0 {
			bodyStartOff = 0
		}
		if bodyEndOff > srcLen {
			bodyEndOff = srcLen
		}

		rawBody := ""
		if bodyStartOff < bodyEndOff {
			rawBody = string(source[bodyStartOff:bodyEndOff])
		}

		assertions := findExecutableAssertions(fn, fileImports)

		units = append(units, parser.TestUnit{
			Name:        fn.Name.Name,
			FilePath:    filePath,
			StartLine:   declStart.Line,
			EndLine:     declEnd.Line,
			Kind:        kind,
			RawBody:     rawBody,
			Assertions:  assertions,
			ASTDecl:     fn,
			FileSet:     fset,
			FileImports: fileImports,
		})
	}

	return units, nil
}


## Added pkg/parser/golang/adapter_test.go
sha256=e56591eb3c77727a961f97dda79e0f73adb430287062e81f78ac331b9ea01d0f

package golang_test

import (
	"strings"
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

func TestGoAdapterLocateTestsRealVsQuotedAndHelpers(t *testing.T) {
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

// TestMain entry point must be excluded
func TestMain(m *testing.M) {
	m.Run()
}

// Helper with no parameters must be excluded
func TestHelper() {
}

// Helper with wrong parameter type must be excluded
func TestHelperWithArg(msg string) {
}

// Lowercase Latin suffix must be excluded
func Testlowercase(t *testing.T) {
}

// Lowercase Cyrillic suffix must be excluded
func Testтест(t *testing.T) {
}

// Function with return value must be excluded
func TestWithReturn(t *testing.T) int {
	return 0
}

// Receiver method must be excluded
type MySuite struct{}
func (s *MySuite) TestMethod(t *testing.T) {
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
		// RawBody must be the function body { ... }, excluding the func declaration header (R1)
		if !strings.HasPrefix(strings.TrimSpace(u.RawBody), "{") || !strings.HasSuffix(strings.TrimSpace(u.RawBody), "}") {
			t.Errorf("for test %s: expected RawBody to be block statement { ... }, got %q", u.Name, u.RawBody)
		}
	}
}

func TestGoAdapterLocateTestsAliasedTestingImport(t *testing.T) {
	adapter := golang.NewAdapter()

	source := []byte(`package sample_test

import (
	tst "testing"
)

func TestAliasedImport(t *tst.T) {
	t.Fatal("fail")
}
`)

	units, err := adapter.LocateTests(source, "aliased_test.go")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(units) != 1 {
		t.Fatalf("expected 1 test unit with aliased testing import, got %d", len(units))
	}
	if units[0].Name != "TestAliasedImport" {
		t.Errorf("expected TestAliasedImport, got %s", units[0].Name)
	}
	if len(units[0].Assertions) == 0 {
		t.Errorf("expected assertion detected on aliased testing parameter")
	}
}

func TestGoAdapterLocateTestsRenamedParamAndConstructors(t *testing.T) {
	adapter := golang.NewAdapter()

	source := []byte(`package sample_test

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

// Renamed testing parameter: test.Fatal must be recognized (R5)
func TestRenamedParameter(test *testing.T) {
	test.Fatalf("failed with custom param name")
}

// Constructor-only test: assert.New(t) alone does not establish an assertion (R5)
func TestConstructorOnly(t *testing.T) {
	is := assert.New(t)
	_ = is
}

// Quoted assertions inside strings or comments must not count
func TestQuotedAssertionsOnly(t *testing.T) {
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

	if len(units) != 3 {
		t.Fatalf("expected 3 units, got %d", len(units))
	}

	// 1. Renamed param: test.Fatalf recognized
	if units[0].Name != "TestRenamedParameter" {
		t.Fatalf("expected first unit TestRenamedParameter, got %s", units[0].Name)
	}
	if len(units[0].Assertions) == 0 {
		t.Errorf("expected assertion in %s with renamed testing parameter, got none", units[0].Name)
	}

	// 2. Constructor only: assert.New alone does not count
	if units[1].Name != "TestConstructorOnly" {
		t.Fatalf("expected second unit TestConstructorOnly, got %s", units[1].Name)
	}
	if len(units[1].Assertions) != 0 {
		t.Errorf("expected 0 assertions for constructor-only test %s, got %v", units[1].Name, units[1].Assertions)
	}

	// 3. Quoted/commented: 0 assertions
	if units[2].Name != "TestQuotedAssertionsOnly" {
		t.Fatalf("expected third unit TestQuotedAssertionsOnly, got %s", units[2].Name)
	}
	if len(units[2].Assertions) != 0 {
		t.Errorf("expected 0 assertions in %s (quoted/commented only), got %v", units[2].Name, units[2].Assertions)
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

