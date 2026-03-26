import {app as ElectronApp } from 'electron';
import { Application } from "./application";
import { OverlayHotkeysService } from './services/overlay-hotkeys.service';
import { OverlayService } from './services/overlay.service';
import { GameEventsService } from './services/gep.service';
import { MainWindowController } from './controllers/main-window.controller';
import { DemoOSRWindowController } from './controllers/demo-osr-window.controller';
import { OverlayInputService } from './services/overlay-input.service';
import {setupDevour} from "@devour/overwolf-sdk";

import "./deeplink";
import "./tray";

const devourPublicKey = "69bb057e5b9b2b890cffd3e4";
setupDevour(devourPublicKey, "ELECTRON");

/**
 * TODO: Integrate your own dependency-injection library
 */
const bootstrap = (): Application => {
  const overlayService = new OverlayService();
  const overlayHotkeysService = new OverlayHotkeysService(overlayService);
  const gepService = new GameEventsService();
  const inputService = new OverlayInputService(overlayService);

  const createDemoOsrWindowControllerFactory = (): DemoOSRWindowController => {
    return new DemoOSRWindowController(overlayService);
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

export const mainApp = bootstrap();

ElectronApp.whenReady().then(() => {
  mainApp.run();

});

