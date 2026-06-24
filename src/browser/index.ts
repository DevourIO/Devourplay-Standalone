import {app as ElectronApp, globalShortcut} from 'electron';
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
import {LoginWindowController} from "./controllers/login-window.controller";
import {SettingsWindowController} from "./controllers/settings-window.controller";
import {getAppSettings, getDevourWebsocketDomain} from "../utils/appSettings";
import {NotificationsWindowController} from "./controllers/notifications-window.controller";
import {WebsocketService} from "./services/websocket.service";
import {initializeDeepLink} from "../utils/deeplink";
import {initializeTray} from "../utils/tray";
import {ScreenshotService} from "./services/screenshot.service";

const devourPublicKey = process.env.TARGET_ENV === "production" ? "6a0e339859dc0a055e4c73f6" : "69bb057e5b9b2b890cffd3e4";

export let isQuitting: boolean = false;
export function setIsQuitting(value: boolean) {
	isQuitting = value;
}

/**
 * TODO: Integrate your own dependency-injection library
 */
const bootstrap = (): Application => {
	const overlayService = new OverlayService();
	const overlayHotkeysService = new OverlayHotkeysService(overlayService);
	const screenshotService = new ScreenshotService(overlayService);
	const gepService = new GameEventsService(screenshotService);
	const inputService = new OverlayInputService(overlayService);
	const websocketService = new WebsocketService(getDevourWebsocketDomain());

	const createDemoOsrWindowControllerFactory = (): DemoOSRWindowController => {
		return new DemoOSRWindowController(overlayService);
	}

	const mainWindowController = new MainWindowController(
		gepService,
		overlayService,
		createDemoOsrWindowControllerFactory,
		overlayHotkeysService,
		inputService,
		websocketService,
		screenshotService,
		eventBusInstance,
	);

	const loginWindowController = new LoginWindowController();
	const settingsWindowController = new SettingsWindowController();
	new NotificationsWindowController(overlayService, websocketService);

	setupDevour({
		publicKey: devourPublicKey,
		engine: "ELECTRON",
		isProduction: process.env.TARGET_ENV === "production",
		mirror: process.env.TARGET_ENV === "localhost" ? "localhost" : !isNaN(Number(process.env.TARGET_ENV)) ? Number(process.env.TARGET_ENV) : undefined,
	});

	return new Application(
		overlayService,
		gepService,
		websocketService,
		screenshotService,
		mainWindowController,
		loginWindowController,
		settingsWindowController,
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
	globalShortcut.unregisterAll();
	isQuitting = true;
	eventBusInstance.emit("log", "App is quitting, running cleanup...");
	closeLog();
});

initializeDeepLink();
initializeTray();