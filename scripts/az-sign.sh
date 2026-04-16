#!/usr/bin/env bash
#
# Sign a Windows PE on macOS / Linux using jsign + Azure Trusted Signing.
# Runs natively on Apple Silicon — no Rosetta, no Docker.
#
# Usage:   ./sign.sh <path/to/foo.exe>
# Output:  <path/to/foo.signed.exe>

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
JSIGN_VERSION="7.2"
JSIGN_URL="https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar"

die() { echo "error: $*" >&2; exit 1; }

# Always download a fresh jsign jar per run; remove on exit (success or failure).
JSIGN_JAR="$( mktemp -t jsign-XXXXXX ).jar"
trap 'rm -f "$JSIGN_JAR"' EXIT

# 1. Validate args
[[ $# -eq 1 ]] || die "usage: $0 <path/to/file.exe>"
INPUT="$1"
[[ -f "$INPUT" ]] || die "input file not found: $INPUT"

# Confirm the file actually starts with PE magic ('MZ', 0x4D 0x5A).
MAGIC=$(head -c 2 "$INPUT" | xxd -p)
[[ "$MAGIC" == "4d5a" ]] || die "input is not a Windows PE (missing MZ magic): $INPUT"

# 2. Validate required env vars (expected to be exported by the caller,
#    typically via build-electron-sandbox.sh --azureCreds=<file>)
for var in AZURE_TENANT_ID AZURE_CLIENT_ID AZURE_CLIENT_SECRET \
           TRUSTED_SIGNING_ENDPOINT TRUSTED_SIGNING_ACCOUNT TRUSTED_SIGNING_CERT_PROFILE; do
    [[ -n "${!var:-}" ]] || die "env var $var is empty (export via --azureCreds)"
done

# 3. Check tooling
command -v az >/dev/null 2>&1 || die "az CLI not found. Install with: brew install azure-cli"
command -v java >/dev/null 2>&1 || die "java not found. Install with: brew install --cask temurin"

JAVA_MAJOR=$(java -version 2>&1 | awk -F\" '/version/ { split($2, a, "."); print (a[1] == "1" ? a[2] : a[1]) }')
if [[ -z "$JAVA_MAJOR" || "$JAVA_MAJOR" -lt 17 ]]; then
    die "jsign needs Java >= 17 (found $JAVA_MAJOR). Install with: brew install --cask temurin"
fi

# 4. Fetch jsign jar fresh into a temp file (cleaned up by the EXIT trap)
echo "==> downloading jsign $JSIGN_VERSION"
curl -fsSL -o "$JSIGN_JAR" "$JSIGN_URL" || die "failed to download jsign from $JSIGN_URL"

# 5. Authenticate to Azure as the SP and pull a Trusted Signing access token
echo "==> az login (service principal)"
az login --service-principal \
         --allow-no-subscriptions \
         --username "$AZURE_CLIENT_ID" \
         --password "$AZURE_CLIENT_SECRET" \
         --tenant   "$AZURE_TENANT_ID" \
         --output   none

echo "==> fetching Trusted Signing access token"
TOKEN=$(az account get-access-token \
            --resource "https://codesigning.azure.net" \
            --query accessToken -o tsv)
[[ -n "$TOKEN" ]] || die "failed to obtain Trusted Signing access token"

# 6. Sign into a temp sibling file, then atomically replace the original
# on success. If jsign fails, set -e aborts before the mv, so the
# original exe is left untouched.
#
# Do NOT pass --tsaurl: Trusted Signing's response already includes a
# Microsoft RFC3161 timestamp, and jsign 7.x has a BouncyCastle parsing
# bug when given http://timestamp.acs.microsoft.com.
INPUT_DIR="$( cd "$( dirname "$INPUT" )" && pwd )"
INPUT_BASE="$( basename "$INPUT" )"
TMP_OUT="${INPUT_DIR}/.${INPUT_BASE}.signing.$$"

cp "$INPUT" "$TMP_OUT"
trap 'rm -f "$JSIGN_JAR" "$TMP_OUT"' EXIT

echo "==> signing"
java -jar "$JSIGN_JAR" \
     --storetype TRUSTEDSIGNING \
     --keystore  "$TRUSTED_SIGNING_ENDPOINT" \
     --storepass "$TOKEN" \
     --alias     "${TRUSTED_SIGNING_ACCOUNT}/${TRUSTED_SIGNING_CERT_PROFILE}" \
     "$TMP_OUT"

mv "$TMP_OUT" "$INPUT"
trap 'rm -f "$JSIGN_JAR"' EXIT

echo
echo "signed in place: $INPUT"