#!/bin/sh
# Mobile driver preflight for quality-engineering-appium-mcp.
# Read-only: no writes, no network. Reports the local toolchain and
# whether a device-cloud credential is present.
#
# Exit codes:
#   0  at least one platform toolchain is complete, or cloud creds are set
#   2  nothing usable; ask for exported evidence or BLOCKED (driver: appium)
#
# Cloud creds recognised: LAMBDATEST_USERNAME, BROWSERSTACK_USERNAME, SAUCE_USERNAME.

set -u

os=$(uname -s 2>/dev/null || echo unknown)
android_ok=0
ios_ok=0
node_ok=0

have() { command -v "$1" >/dev/null 2>&1; }

if have node; then
  echo "NODE: $(command -v node) $(node --version 2>/dev/null)  (appium-mcp needs 22+)"
  node_ok=1
else
  echo "NODE: missing  (appium-mcp needs Node 22+; nothing below can launch without it)"
fi

if have java; then
  echo "JAVA: $(command -v java)  (JDK 8+)"
else
  echo "JAVA: missing  (JDK 8+ required for Android)"
fi

adb=""
if [ -n "${ANDROID_HOME:-}" ] && [ -x "${ANDROID_HOME}/platform-tools/adb" ]; then
  adb="${ANDROID_HOME}/platform-tools/adb"
elif have adb; then
  adb=$(command -v adb)
fi
if [ -n "$adb" ]; then
  echo "ADB: $adb"
  devices=$("$adb" devices 2>/dev/null | awk 'NR>1 && $2=="device"' | wc -l | tr -d ' ')
  echo "ANDROID_DEVICES: $devices attached"
  if have java; then android_ok=1; fi
else
  echo "ADB: missing  (set ANDROID_HOME or add platform-tools to PATH)"
fi
if [ -n "${ANDROID_HOME:-}" ] && [ -x "${ANDROID_HOME}/emulator/emulator" ]; then
  echo "EMULATOR: ${ANDROID_HOME}/emulator/emulator"
else
  echo "EMULATOR: not found under ANDROID_HOME"
fi

if [ "$os" = "Darwin" ]; then
  if have xcrun && xcrun simctl help >/dev/null 2>&1; then
    booted=$(xcrun simctl list devices booted 2>/dev/null | grep -c '(Booted)' || true)
    echo "SIMCTL: available, $booted simulator(s) booted"
    ios_ok=1
  else
    echo "SIMCTL: missing  (install Xcode + Command Line Tools)"
  fi
else
  echo "SIMCTL: n/a (iOS needs macOS)"
fi

if have appium; then
  echo "APPIUM_CLI: $(command -v appium) (optional; appium-mcp embeds its own drivers)"
fi

cloud=""
[ -n "${LAMBDATEST_USERNAME:-}" ] && cloud="lambdatest"
[ -n "${BROWSERSTACK_USERNAME:-}" ] && cloud="${cloud:+$cloud,}browserstack"
[ -n "${SAUCE_USERNAME:-}" ] && cloud="${cloud:+$cloud,}sauce"

if [ -n "$cloud" ]; then
  echo "CLOUD: $cloud credentials present (set REMOTE_SERVER_URL_ALLOW_REGEX before using remoteServerUrl)"
fi

if [ "$node_ok" = 1 ] && { [ "$android_ok" = 1 ] || [ "$ios_ok" = 1 ]; }; then
  mode="local"
  [ -n "$cloud" ] && mode="local,remote"
  echo "MODE: $mode"
  echo "EVIDENCE: .appium-mcp/<session>/"
  exit 0
fi

if [ "$node_ok" = 1 ] && [ -n "$cloud" ]; then
  echo "MODE: remote"
  echo "EVIDENCE: .appium-mcp/<session>/"
  exit 0
fi

echo "MODE: none"
echo "INSTALL: npm i -g node@22 (or nvm use 22); JDK 8+ (brew install openjdk / apt install default-jdk)"
echo "INSTALL: Android Studio -> SDK Manager -> platform-tools + emulator; export ANDROID_HOME"
[ "$os" = "Darwin" ] && echo "INSTALL: Xcode from the App Store, then xcode-select --install"
echo "FALLBACK: device cloud -> export LAMBDATEST_USERNAME/LAMBDATEST_ACCESSKEY and REMOTE_SERVER_URL_ALLOW_REGEX"
echo "FALLBACK: neither -> ask for exported screenshots/video, else BLOCKED (driver: appium)"
exit 2
