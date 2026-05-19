# Implementation Examples


## Scan for Hardcoded Secrets

### Backend
```bash
grep -riE "(password|apiKey|api_key|secret|private_key|token)\s*=\s*['\"][^'\"]{6,}" \
  . --exclude-dir={node_modules,dist,build,.git} -l
```

### Frontend (Bundled Secrets)
```bash
grep -rE "(REACT_APP_|NEXT_PUBLIC_|VITE_|VUE_APP_).*(KEY|SECRET|TOKEN|PASSWORD)" \
  . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*"
```

### Mobile
```bash
# Android — BuildConfig and strings
grep -rE "(API_KEY|SECRET|PASSWORD)\s*=\s*\"" . --include="*.kt" --include="*.java"
grep -rE ">(.*key.*|.*secret.*|.*password.*)<" . --include="*.xml" -i
# iOS — Info.plist and source
grep -rE "(apiKey|api_key|secret|password)\s*[:=]\s*\"" . --include="*.swift"
grep -A1 -E "(APIKey|Secret|Password)" . -r --include="*.plist"
# Flutter
grep -rE "(apiKey|api_key|secret|password)\s*[:=]\s*['\"]" . --include="*.dart"
```

## Map Injection Surfaces

### SQL Injection (All platforms)
```bash
grep -rE "\+.*SELECT|\+.*INSERT|\+.*UPDATE|\+.*DELETE|query\(.*\+|fmt\.Sprintf.*SELECT" \
  . --include="*.ts" --include="*.js" --include="*.go" --include="*.java" --include="*.py"
```

### Command Injection
```bash
grep -rE "(exec\(|execSync\(|child_process|os\.system\(|subprocess\.(run|call|Popen)|Runtime\.exec)" \
  . --include="*.ts" --include="*.js" --include="*.py" --include="*.java" --include="*.go"
```

### Template Injection (Frontend)
```bash
grep -rE "(dangerouslySetInnerHTML|innerHTML|document\.write|v-html|\[innerHTML\])" \
  . --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.html" --include="*.ts"
```

## Measure Auth Coverage

### Backend Frameworks
```bash
# NestJS
total=$(grep -rE "@(Get|Post|Put|Delete|Patch)\(" . --include="*.ts" | wc -l)
guarded=$(grep -rE "@(UseGuards|Auth)\(" . --include="*.ts" | wc -l)
echo "Auth coverage: $guarded/$total routes guarded"

# Spring
total=$(grep -rE "@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)" . --include="*.java" --include="*.kt" | wc -l)
guarded=$(grep -rE "@(PreAuthorize|Secured|RolesAllowed)" . --include="*.java" --include="*.kt" | wc -l)

# Go (Gin/Echo/Chi)
total=$(grep -rE "\.(GET|POST|PUT|DELETE|PATCH|Handle|HandleFunc)\(" . --include="*.go" | wc -l)
guarded=$(grep -rE "(middleware|auth|jwt|guard)" . --include="*.go" | wc -l)

# Django / Flask / FastAPI
total=$(grep -rE "(path\(|@app\.(get|post|put|delete)|@router\.(get|post))" . --include="*.py" | wc -l)
guarded=$(grep -rE "(login_required|permission_required|@auth|Depends\(.*auth)" . --include="*.py" | wc -l)

# Laravel
total=$(grep -rE "Route::(get|post|put|delete|patch)" routes/ 2>/dev/null | wc -l)
guarded=$(grep -rE "middleware\(" routes/ 2>/dev/null | wc -l)
```

## Adversarial Entry Points

### Path Traversal
```bash
grep -rE "path\.join\(|os\.path\.join\(" . | grep -vE "path\.resolve|path\.normalize|os\.path\.abspath"
```

### SSRF
```bash
grep -rE "axios\.get\(|http\.Get\(|fetch\(|requests\.(get|post)" . | grep -vE "['\"](https?://|localhost)"
```

### BOLA/IDOR
```bash
grep -rE "findById\(|findOne\(|findByPk\(" . | grep -viE "tenant|owner|user_id|currentUser"
```

### Deserialization
```bash
grep -rE "(JSON\.parse\(.*req|pickle\.loads|yaml\.load\(.*Loader|ObjectInputStream|unserialize\()" \
  . --include="*.ts" --include="*.js" --include="*.py" --include="*.java" --include="*.php"
```

## Audit Infrastructure Hardening

```bash
# Docker
grep -rE "^FROM .+:latest|^USER root|curl.*sh.*|ADD http" . --include="Dockerfile"
# Kubernetes
grep -rE "(privileged: true|hostNetwork: true|runAsRoot)" . --include="*.yaml" --include="*.yml"
```

## Detect Data Leakage in Logs

```bash
# Node/TS
grep -rE "console\.(log|error|warn)" . --include="*.ts" --include="*.js" | grep -iE "password|token|secret"
# Go / Dart
grep -rE "log\.(Print|Fatal)|print\(|debugPrint\(" . --include="*.go" --include="*.dart" | grep -iE "password|token|secret"
# Java / Kotlin / Swift
grep -rE "log(ger)?\.(info|debug)|print\(|NSLog\(" . --include="*.java" --include="*.kt" --include="*.swift" | grep -iE "password|token|secret"
```

