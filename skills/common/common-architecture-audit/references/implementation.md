# Implementation Examples

## Find Potential Duplicates or Legacy Files

```bash
# Find potential duplicates or legacy files
find . -type f -name "*New.*" | sed 's/New//'
```

## Identify Monoliths (Files > 1000 Lines)

```bash
find . -type f \( -name "*.tsx" -o -name "*.dart" -o -name "*.go" -o -name "*.java" \) \
  | xargs wc -l | awk '$1 > 1000'
```

## Audit Resource Performance (Large Constants/Strings)

```bash
find . -type f \( -name "*constants*" -o -name "*.graphql" -o -name "*strings*" \) \
  | xargs wc -l | awk '$1 > 1000'
```
