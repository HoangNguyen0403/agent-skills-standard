#!/bin/sh
# Web driver preflight for quality-engineering-playwright-cli.
# Read-only: no writes, no network. Mirrors resolve_binary() in
# common-architecture-diagramming/scripts/export_drawio.py.
#
# Exit codes:
#   0  playwright-cli found and answers --version
#   1  playwright-cli found but --version failed (broken install)
#   2  playwright-cli not found; fall back to Playwright MCP or BLOCKED
#
# Override the binary with PLAYWRIGHT_CLI_BIN=/path/to/playwright-cli.

set -u

os=$(uname -s 2>/dev/null || echo unknown)

install_hint() {
  echo "INSTALL: npm i -g @playwright/cli@latest && playwright-cli install --skills"
  echo "INSTALL: npx playwright install chromium"
  case "$os" in
    Darwin) echo "INSTALL: node via 'brew install node' if missing" ;;
    Linux)  echo "INSTALL: node via your package manager or nvm if missing" ;;
    *)      echo "INSTALL: node from https://nodejs.org if missing" ;;
  esac
  echo "FALLBACK: Playwright MCP -> npx -y @playwright/mcp@latest --isolated --headless --output-dir .playwright-cli/<session>"
  echo "FALLBACK: no shell and no MCP -> ask for exported screenshots/console, else BLOCKED (driver: playwright)"
}

bin=""
if [ -n "${PLAYWRIGHT_CLI_BIN:-}" ]; then
  if [ -x "$PLAYWRIGHT_CLI_BIN" ]; then
    bin="$PLAYWRIGHT_CLI_BIN"
  else
    echo "DRIVER: missing (PLAYWRIGHT_CLI_BIN=$PLAYWRIGHT_CLI_BIN is not executable)"
    install_hint
    exit 2
  fi
else
  bin=$(command -v playwright-cli 2>/dev/null || true)
fi

if [ -z "$bin" ]; then
  echo "DRIVER: missing (playwright-cli not on PATH)"
  if command -v node >/dev/null 2>&1; then
    echo "NODE: $(command -v node) $(node --version 2>/dev/null)"
  else
    echo "NODE: missing"
  fi
  install_hint
  exit 2
fi

version=$("$bin" --version 2>/dev/null | head -n 1)
if [ -z "$version" ]; then
  echo "DRIVER: broken ($bin does not answer --version)"
  echo "INSTALL: npm i -g @playwright/cli@latest"
  exit 1
fi

echo "DRIVER: playwright-cli $bin $version"
echo "EVIDENCE: .playwright-cli/<session>/"
exit 0
