#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PNPM_CMD="npx pnpm@8.12.0"
PRESERVE_SANDBOX=${PRESERVE_SANDBOX:-false}
SANDBOX_ONLY=${SANDBOX_ONLY:-false}
SANDBOX_ONLY_NO_DEPS=${SANDBOX_ONLY_NO_DEPS:-false}
ELECTRON_DIR="$PROJECT_ROOT/devourplay-electron"
CONFIGS_DIR="$ELECTRON_DIR/configs"

# Parse command-line arguments
TARGET_ENV=""
UPLOAD_TO_GCP="false"
DEBUG="false"
ADMIN_KEY_FOR_SIMULATOR=""
CUSTOM_SANDBOX_DIR=""
AZURE_CREDS_FILE=""

show_usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --targetEnv=ENV          Target environment (production, mirror5, mirror6, mirror7, mirror8, or empty)"
  echo "  --uploadToGcp=true|false Upload to GCP (default: false)"
  echo "  --debug=true|false       Enable debug mode (default: false)"
  echo "  --adminKeyForSimulator=KEY Admin key for game simulator"
  echo "  --dir=DIRECTORY          Use specified directory as sandbox (default: temporary directory)"
  echo "  --azureCreds=FILE        Path to env file with Azure Trusted Signing creds"
  echo "                           (required when --uploadToGcp=true)"
  echo ""
  exit 1
}

# Parse arguments
for arg in "$@"; do
  case $arg in
    --targetEnv=*)
      TARGET_ENV="${arg#*=}"
      ;;
    --uploadToGcp=*)
      UPLOAD_TO_GCP="${arg#*=}"
      ;;
    --debug=*)
      DEBUG="${arg#*=}"
      ;;
    --adminKeyForSimulator=*)
      ADMIN_KEY_FOR_SIMULATOR="${arg#*=}"
      ;;
    --sandboxOnly=*)
      SANDBOX_ONLY="${arg#*=}"
      ;;
    --sandboxOnlyNoDeps=*)
      SANDBOX_ONLY_NO_DEPS="${arg#*=}"
      ;;
    --dir=*)
      CUSTOM_SANDBOX_DIR="${arg#*=}"
      ;;
    --azureCreds=*)
      AZURE_CREDS_FILE="${arg#*=}"
      ;;
    --help|-h)
      show_usage
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      show_usage
      ;;
  esac
done

# Initialize sandbox directory
if [ -n "$CUSTOM_SANDBOX_DIR" ]; then
  # Use custom directory, create it if it doesn't exist
  # Resolve to absolute path if it's a relative path
  if [ -d "$CUSTOM_SANDBOX_DIR" ]; then
    SANDBOX_DIR="$(cd "$CUSTOM_SANDBOX_DIR" && pwd)"
  else
    # Directory doesn't exist yet, try to create it
    mkdir -p "$CUSTOM_SANDBOX_DIR"
    SANDBOX_DIR="$(cd "$CUSTOM_SANDBOX_DIR" && pwd)"
    echo -e "${GREEN}Created sandbox directory: $SANDBOX_DIR${NC}"
  fi
else
  # Use temporary directory
  SANDBOX_DIR=$(mktemp -d -t devourplay-electron-build-XXXXXX)
fi

# Validation
if [ "$DEBUG" == "true" ] && [ "$UPLOAD_TO_GCP" == "true" ]; then
  echo -e "${RED}Error: Cannot upload to GCP when debug mode is enabled${NC}"
  exit 1
fi

if [ -n "$ADMIN_KEY_FOR_SIMULATOR" ] && [ "$DEBUG" != "true" ]; then
  echo -e "${RED}Error: adminKeyForSimulator requires debug mode to be enabled${NC}"
  exit 1
fi

if [ "$UPLOAD_TO_GCP" == "true" ] && [ -z "$AZURE_CREDS_FILE" ]; then
  echo -e "${RED}Error: --azureCreds=<file> is required when --uploadToGcp=true${NC}"
  exit 1
fi

if [ -n "$AZURE_CREDS_FILE" ] && [ ! -f "$AZURE_CREDS_FILE" ]; then
  echo -e "${RED}Error: creds file not found: $AZURE_CREDS_FILE${NC}"
  exit 1
fi

if [ -n "$AZURE_CREDS_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$AZURE_CREDS_FILE"
  set +a
fi

# Set environment variables based on arguments
if [ -n "$TARGET_ENV" ]; then
  export TARGET_ENV
else
  unset TARGET_ENV
  export -n TARGET_ENV 2>/dev/null || true
fi

if [ "$UPLOAD_TO_GCP" == "true" ]; then
  export UPLOAD_TO_GCP=true
else
  export UPLOAD_TO_GCP=false
fi

if [ "$DEBUG" == "true" ]; then
  export ELECTRON_DEBUG=true
else
  unset ELECTRON_DEBUG
  export -n ELECTRON_DEBUG 2>/dev/null || true
fi

if [ -n "$ADMIN_KEY_FOR_SIMULATOR" ]; then
  export ADMIN_SECRET="$ADMIN_KEY_FOR_SIMULATOR"
  export ELECTRON_DEBUG=true
else
  unset ADMIN_SECRET
  export -n ADMIN_SECRET 2>/dev/null || true
fi

clear_sandbox_dist() {
    echo "Clearing sandbox dist directory: $SANDBOX_DIR/devourplay-electron/dist"
    if [ -d "$SANDBOX_DIR/devourplay-electron/dist" ]; then
        rm -rf "$SANDBOX_DIR/devourplay-electron/dist"
    fi
}

# Cleanup function
cleanup() {
  if [ "$SANDBOX_ONLY" == "true" ] || [ "$SANDBOX_ONLY_NO_DEPS" == "true" ]; then
    return 0
  fi
  if [ "$PRESERVE_SANDBOX" != "true" ] && [ -d "$SANDBOX_DIR" ]; then
    echo -e "${YELLOW}Cleaning up sandbox directory: $SANDBOX_DIR${NC}"
    rm -rf "$SANDBOX_DIR"
  elif [ "$PRESERVE_SANDBOX" == "true" ] && [ -d "$SANDBOX_DIR" ]; then
    echo -e "${YELLOW}Sandbox preserved at: $SANDBOX_DIR${NC}"
    echo -e "${YELLOW}Set PRESERVE_SANDBOX=false or remove manually to clean up${NC}"
  fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN} DevourPlay Electron Build${NC}"
echo -e "${GREEN} Sandboxed Build Script${NC}"
echo -e "${GREEN}=======================================${NC}"
echo
echo -e "${YELLOW}Sandbox directory: $SANDBOX_DIR${NC}"
if [ "$PRESERVE_SANDBOX" == "true" ]; then
  echo -e "${YELLOW}Sandbox will be preserved after build${NC}"
fi
echo

# Display configuration
if [ -n "$TARGET_ENV" ]; then
  echo -e "${GREEN}>>> Target environment: $TARGET_ENV${NC}"
else
  echo -e "${GREEN}>>> Using environment variables (no config file)${NC}"
fi
echo -e "${GREEN}>>> Upload to GCP: $UPLOAD_TO_GCP${NC}"
echo -e "${GREEN}>>> Debug mode: $DEBUG${NC}"
if [ -n "$ADMIN_KEY_FOR_SIMULATOR" ]; then
  echo -e "${GREEN}>>> Game simulator: enabled${NC}"
fi
echo

# Clear electron-builds directory at the start
if [ -d "$PROJECT_ROOT/electron-builds" ]; then
  echo -e "${YELLOW}Clearing electron-builds directory...${NC}"
  rm -rf "$PROJECT_ROOT/electron-builds"
  mkdir -p "$PROJECT_ROOT/electron-builds"
  echo -e "${GREEN}electron-builds directory cleared${NC}"
  echo
fi

# Default to building all platforms
BUILD_ALL=true

# Step 1: Copy workspace files
echo -e "${GREEN}[1/7] Copying workspace files...${NC}"
cp "$PROJECT_ROOT/pnpm-workspace.yaml" "$SANDBOX_DIR/"
# cp "$PROJECT_ROOT/pnpm-lock.yaml" "$SANDBOX_DIR/"
cp "$PROJECT_ROOT/tsconfig.json" "$SANDBOX_DIR/"

# Step 2: Copy packages/tsconfig
echo -e "${GREEN}[2/7] Copying TypeScript config...${NC}"
mkdir -p "$SANDBOX_DIR/packages"
cp -r "$PROJECT_ROOT/packages/tsconfig" "$SANDBOX_DIR/packages/tsconfig/"

# Step 3: Copy and modify package.json (remove patchedDependencies)
echo -e "${GREEN}[3/7] Copying and preparing package.json...${NC}"
cp "$PROJECT_ROOT/package.json" "$SANDBOX_DIR/package.json"
if command -v jq &> /dev/null; then
  jq 'del(.pnpm.patchedDependencies)' "$SANDBOX_DIR/package.json" > "$SANDBOX_DIR/package.json.temp" && mv "$SANDBOX_DIR/package.json.temp" "$SANDBOX_DIR/package.json"
else
  echo -e "${YELLOW}Warning: jq not found, skipping patchedDependencies removal${NC}"
fi

# Step 4: Copy backend, packages, and client directories
echo -e "${GREEN}[4/7] Copying source directories...${NC}"

# Function to copy directory excluding node_modules and build artifacts
copy_dir_excluding_build_artifacts() {
  local src="$1"
  local dst="$2"
  local dirname=$(dirname "$dst")
  mkdir -p "$dirname"

  # Use rsync if available (more efficient and reliable)
  if command -v rsync &> /dev/null; then
    rsync -av --exclude='node_modules' \
              --exclude='dist' \
              --exclude='build' \
              --exclude='out' \
              --exclude='*.unpacked' \
              --exclude='dist_electron' \
              --exclude='release' \
              --exclude='.git' \
              --exclude='coverage' \
              --exclude='.nyc_output' \
              --exclude='tmp' \
              --exclude='temp' \
              --exclude='electron-builds' \
              "$src/" "$dst/"
  else
    # Fallback: copy everything then remove excluded directories
    echo -e "${YELLOW}Warning: rsync not found, using cp (slower)${NC}"
    cp -R "$src" "$dst"
    # Remove excluded directories
    find "$dst" -type d \( -name 'node_modules' -o -name 'dist' -o -name 'build' -o -name 'out' -o -name '.git' -o -name 'coverage' -o -name '.nyc_output' -o -name 'tmp' -o -name 'temp' -o -name 'electron-builds' \) -prune -exec rm -rf {} + 2>/dev/null || true
  fi
}

# Copy backend
copy_dir_excluding_build_artifacts "$PROJECT_ROOT/backend" "$SANDBOX_DIR/backend"

# Copy packages/models
copy_dir_excluding_build_artifacts "$PROJECT_ROOT/packages/models" "$SANDBOX_DIR/packages/models"

# Copy packages/utils
copy_dir_excluding_build_artifacts "$PROJECT_ROOT/packages/utils" "$SANDBOX_DIR/packages/utils"

# Copy client
copy_dir_excluding_build_artifacts "$PROJECT_ROOT/client" "$SANDBOX_DIR/client"

# Copy devourplay-electron
copy_dir_excluding_build_artifacts "$PROJECT_ROOT/devourplay-electron" "$SANDBOX_DIR/devourplay-electron"

# Remove package.json files from backend and packages (as Dockerfile does)
echo -e "${YELLOW}Removing package.json files from backend and packages...${NC}"
rm -f "$SANDBOX_DIR/backend/package.json"
rm -f "$SANDBOX_DIR/packages/models/package.json"
rm -f "$SANDBOX_DIR/packages/utils/package.json"

# Step 5: Build client
echo -e "${GREEN}[5/7] Installing dependencies and building client...${NC}"
cd "$SANDBOX_DIR/client"
if [ "$SANDBOX_ONLY_NO_DEPS" != "true" ]; then
  $PNPM_CMD install

  echo -e "${GREEN}Building client...${NC}"
  $PNPM_CMD run build
else
  echo -e "${YELLOW}Skipping dependency installation and client build (sandboxOnlyNoDeps mode)${NC}"
fi

# Step 6: Modify client package.json (add exports)
echo -e "${GREEN}[6/7] Preparing client package.json...${NC}"
if command -v jq &> /dev/null; then
  jq '. + {"exports": {".": {"import": "./src/index.ts", "require": "./dist/index.js"}}}' "$SANDBOX_DIR/client/package.json" > "$SANDBOX_DIR/client/package.json.temp" && mv "$SANDBOX_DIR/client/package.json.temp" "$SANDBOX_DIR/client/package.json"
else
  echo -e "${YELLOW}Warning: jq not found, skipping exports modification${NC}"
fi

# Step 7: Build electron app(s)
echo -e "${GREEN}[7/7] Installing dependencies and building all platforms...${NC}"

# Install dependencies
cd "$SANDBOX_DIR/devourplay-electron"
if [ "$SANDBOX_ONLY_NO_DEPS" != "true" ]; then
  $PNPM_CMD install
fi

if [ "$SANDBOX_ONLY" == "true" ] || [ "$SANDBOX_ONLY_NO_DEPS" == "true" ]; then
  /Applications/Cursor.app/Contents/MacOS/Cursor "$SANDBOX_DIR/devourplay-electron"
  exit 0
fi

# Function to build a platform and copy artifacts
start_build() {

  cd "$SANDBOX_DIR/devourplay-electron"

  # Build with environment variables
  $PNPM_CMD run "build-and-deploy"

  # copy contents of $SANDBOX_DIR/devourplay-electron/build-artifacts to $PROJECT_ROOT/electron-builds
  cp -r "$SANDBOX_DIR/devourplay-electron/build-artifacts" "$PROJECT_ROOT/electron-builds"

  return 0
}

start_build

echo
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}All builds completed successfully!${NC}"
echo -e "${GREEN}=======================================${NC}"
