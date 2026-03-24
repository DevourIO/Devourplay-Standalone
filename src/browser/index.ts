import {app as ElectronApp } from 'electron';
import { Application } from "./application";
import { OverlayHotkeysService } from './services/overlay-hotkeys.service';
import { OverlayService } from './services/overlay.service';
import { GameEventsService } from './services/gep.service';
import { MainWindowController } from './controllers/main-window.controller';
import { DemoOSRWindowController } from './controllers/demo-osr-window.controller';
import { OverlayInputService } from './services/overlay-input.service';
import {setupDevour} from "@devour/overwolf-sdk";
import path from "path";
import {handleDeeplink} from "./deeplink";

const devourPublicKey = "69bb057e5b9b2b890cffd3e4";

/**
 * TODO: Integrate your own dependency-injection library
 */
const bootstrap = (): Application => {
  const overlayService = new OverlayService();
  const overlayHotkeysService = new OverlayHotkeysService(overlayService);
  const gepService = new GameEventsService();
  const inputService = new OverlayInputService(overlayService);

  const createDemoOsrWindowControllerFactory = (): DemoOSRWindowController => {
    const controller = new DemoOSRWindowController(overlayService);
    return controller;
  }

  const mainWindowController = new MainWindowController(
    gepService,
    overlayService,
    createDemoOsrWindowControllerFactory,
    overlayHotkeysService,
    inputService
  );

  setupDevour(devourPublicKey, "ELECTRON");

  return new Application(overlayService, gepService, mainWindowController);
}

const app = bootstrap();

ElectronApp.whenReady().then(() => {
  app.run();

  const customUrl = process.argv.find(item => item.startsWith("devourplay://"));
  if (customUrl) {
    void handleDeeplink(customUrl);
  }

});

ElectronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    ElectronApp.quit();
  }
});

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    ElectronApp.setAsDefaultProtocolClient('devourplay', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  ElectronApp.setAsDefaultProtocolClient('devourplay');
}

ElectronApp.on("open-url", (event, url) => {
  // Keep this console log. Deep link does not seem to trigger without it?
  console.log("open-url", url);
  void handleDeeplink(url);
});

const gotTheLock = ElectronApp.requestSingleInstanceLock();

if (!gotTheLock) {
  ElectronApp.quit();
} else {
  ElectronApp.on("second-instance", (event, commands, workingDir) => {
    void handleDeeplink(commands.pop());
  });
}

// ElectronApp.whenReady().then(() => {
//   console.log("When ready");
//   const customUrl = process.argv.find(item => item.startsWith("devourplay://"));
//   if (customUrl) {
//     void handleDeeplink(customUrl);
//   }
// });
