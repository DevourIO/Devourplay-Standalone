import {app as ElectronApp} from 'electron';
import {Application} from "./application";
import {OverlayHotkeysService} from './services/overlay-hotkeys.service';
import {OverlayService} from './services/overlay.service';
import {GameEventsService} from './services/gep.service';
import {MainWindowController} from './controllers/main-window.controller';
import {DemoOSRWindowController} from './controllers/demo-osr-window.controller';
import {OverlayInputService} from './services/overlay-input.service';
import {setupDevour} from "@devour/overwolf-sdk";
import {eventBusInstance} from "./services/eventBus.service";
import {closeLog} from "../utils/logs";

import "../utils/deeplink";
import "../utils/tray";
import {LoginWindowController} from "./controllers/login-window.controller";
import {SettingsWindowController} from "./controllers/settings-window.controller";
import {getAppSettings} from "../utils/appSettings";
import {NotificationsWindowController} from "./controllers/notifications-window.controller";

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
		return new DemoOSRWindowController(overlayService);
	}

	const mainWindowController = new MainWindowController(
		gepService,
		overlayService,
		createDemoOsrWindowControllerFactory,
		overlayHotkeysService,
		inputService,
		eventBusInstance,
	);

	const loginWindowController = new LoginWindowController();
	const settingsWindowController = new SettingsWindowController();
	const notificationsWindowController = new NotificationsWindowController(overlayService);

	setupDevour({
		publicKey: devourPublicKey,
		engine: "ELECTRON",
	});

	return new Application(
		overlayService,
		gepService,
		mainWindowController,
		loginWindowController,
		settingsWindowController,
		notificationsWindowController,
		eventBusInstance,
	);
}

export const mainApp = bootstrap();


// In your main process initialization
function handleCommandLineArgs() {
	const args = process.argv;

	if (args.includes('--uninstall-cleanup')) {
		const appSettings = getAppSettings();

		if (appSettings.autoStartOnLogin) {
			// Disable auto-start
			ElectronApp.setLoginItemSettings({
				openAtLogin: false,
			});
		}

		if (args.includes('--quit')) {
			ElectronApp.quit();
		}
		return true; // Indicates this was a cleanup operation
	}

	return false;
}

ElectronApp.whenReady().then(() => {
	if (handleCommandLineArgs()) {
		return; // Don't continue with normal app startup
	}

	mainApp.run();
});

ElectronApp.on('before-quit', (event) => {
	eventBusInstance.emit("log", "App is quitting, running cleanup...");
	closeLog();
});