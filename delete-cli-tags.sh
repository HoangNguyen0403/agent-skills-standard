#!/usr/bin/env bash
set -euo pipefail

TAG_FILE="cli-tags-before-cli-v2.0.0-date.txt"
DRY_RUN=1
REMOTE_DELETE=0

usage() {
  cat <<EOF
Usage: $0 [--run] [--remote] [--file <tag-file>]

Options:
  --run         Actually delete tags instead of printing commands
  --remote      Delete tags on origin in addition to local tags
  --file PATH   Read tags from a custom file (default: $TAG_FILE)
  -h, --help    Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run)
      DRY_RUN=0
      shift
      ;;
    --remote)
      REMOTE_DELETE=1
      shift
      ;;
    --file)
      shift
      if [[ $# -eq 0 ]]; then
        echo "Missing value for --file" >&2
        usage
        exit 1
      fi
      TAG_FILE="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
 done

if [[ ! -f "$TAG_FILE" ]]; then
  echo "Tag file not found: $TAG_FILE" >&2
  exit 1
fi

tmp_file="$(mktemp)"
grep '|' "$TAG_FILE" | cut -d'|' -f1 | sort -u > "$tmp_file"
if [[ ! -s "$tmp_file" ]]; then
  rm -f "$tmp_file"
  echo "No tags found to delete in $TAG_FILE" >&2
  exit 1
fi

count=0
printf 'Tag deletion plan:\n'
while IFS= read -r tag; do
  if [[ -z "$tag" ]]; then
    continue
  fi
  ((count++))
  if [[ $DRY_RUN -eq 1 ]]; then
    printf 'DRY RUN: git tag -d %s\n' "$tag"
    if [[ $REMOTE_DELETE -eq 1 ]]; then
      printf 'DRY RUN: git push origin --delete %s\n' "$tag"
    fi
  else
    printf 'Deleting local tag: %s\n' "$tag"
    if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
      git tag -d "$tag"
    else
      printf 'Skipping missing local tag: %s\n' "$tag"
    fi
    if [[ $REMOTE_DELETE -eq 1 ]]; then
      printf 'Deleting remote tag: origin/%s\n' "$tag"
      git push origin --delete "$tag" 2>/dev/null || printf 'Skipping missing remote tag: %s\n' "$tag"
    fi
  fi
 done < "$tmp_file"
rm -f "$tmp_file"

printf 'Total tags processed: %s\n' "$count"

if [[ $DRY_RUN -eq 1 ]]; then
  echo
  echo "Dry run complete. Re-run with --run to execute deletions."
fi
