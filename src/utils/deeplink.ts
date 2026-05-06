import {devourAuthUser, devourSwapToken} from "@devour/overwolf-sdk";
import {app as ElectronApp} from "electron";
import path from "path";
import {refreshTrayMenu} from "./tray";
import {eventBusInstance} from "../browser/services/eventBus.service";
import {mainApp} from "../browser";

async function handleDeeplink(urlString: string) {
	// Handle url
	const url = new URL(urlString);
	const fullToken = url.searchParams.get("token");
	try {
		const limitedToken = await devourSwapToken(fullToken);
		eventBusInstance.emit("log", `Swapped Devour auth token ${fullToken.substring(0, 5)}... to oAuth token ${limitedToken.oAuthToken.substring(0, 5)}...` );
		devourAuthUser(limitedToken.oAuthToken);
		mainApp.closeLoginWindow();
		refreshTrayMenu();
	} catch (err) {
		eventBusInstance.emit("log", `Error swapping devour token: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
	}

}

export const initializeDeepLink = () => {
	if (process.defaultApp) {
		if (process.argv.length >= 2) {
			ElectronApp.setAsDefaultProtocolClient('devourplay', process.execPath, [path.resolve(process.argv[1])]);
		}
	} else {
		ElectronApp.setAsDefaultProtocolClient('devourplay');
	}

	ElectronApp.on("open-url", (event, url) => {
		// Keep this console log. Deep link does not seem to trigger without it?
		eventBusInstance.emit("log", `Deeplink URL opened ${url.substring(0, 25)}...` );
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

	ElectronApp.whenReady().then(() => {
	  const customUrl = process.argv.find(item => item.startsWith("devourplay://"));
	  if (customUrl) {
		void handleDeeplink(customUrl);
	  }
	});
};
