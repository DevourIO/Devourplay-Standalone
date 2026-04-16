# DevourPlay

This is the lite version of the DevourPlay Electron app. It starts minimized and is only accessible from the taskbar.

Development Readme: https://github.com/overwolf/ow-electron-packages-sample

## Project Build Prerequisites

- **Azure CLI:** `brew install azure-cli`
- **Java:** `brew install --cask temurin`
- **Environment Variables:** These are for signing and deploying the build.
  These need to be accessible by your terminal, so set them in ~/.zshrc or somewhere your CLI can source.
  Run `printenv` to verify they are set and accessible. 
  ```
  # Generate at https://github.com/settings/tokens with the write:packages permission.
  export GH_TOKEN=""
  
  # Get from Azure portal
  export AZURE_TENANT_ID=""
  export AZURE_CLIENT_ID=""
  export AZURE_CLIENT_SECRET=""

  export TRUSTED_SIGNING_ENDPOINT="https://wus.codesigning.azure.net"
  export TRUSTED_SIGNING_ACCOUNT="DevourPlay"
  export TRUSTED_SIGNING_CERT_PROFILE="DevourPlay-Windows"
  ```

## Basic Testing on Mac

1. `npm run build:start`

## Testing on Windows

1. `npm run build:dev`
2. Transfer to Windows:
   - build/win-unpacked folder for the portable version.
   - build/DevourPlay-Setup-*.*.*.exe for the installable.
3. (Optional) After installation, run the executable using command line to view console logs. 
   `C:\Users\User\AppData\Local\Programs\DevourPlay\DevourPlay.exe --remote-debugging-port=8315`

## Production Deployment

1. Ensure the version in package.json is correct.
2. `npm run publish:release`
3. Go to https://github.com/DevourIO/Devourplay-Standalone/releases Test and publish the release.