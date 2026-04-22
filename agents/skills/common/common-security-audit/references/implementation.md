# Implementation Examples

## Scan for Hardcoded Secrets

```bash
grep -riE "(password|apiKey|api_key|secret|private_key|token)\s*=\s*['\"][^'\"]{6,}" \
  . --exclude-dir={node_modules,dist,build,.git} -l
```

## Map Injection Surfaces

```bash
grep -rE "\+.*SELECT|\+.*INSERT|\+.*UPDATE|\+.*DELETE|query\(.*\+|fmt\.Sprintf.*SELECT" \
  . --include="*.ts" --include="*.js" --include="*.go" --include="*.java" --include="*.py"
```

## Audit Infrastructure Hardening

```bash
grep -rE "^FROM .+:latest|^USER root|curl.*sh.*|ADD http" . --include="Dockerfile"
```
