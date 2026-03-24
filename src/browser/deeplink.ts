import {devourAuthUser, devourSwapToken} from "@devour/overwolf-sdk";
import {app as ElectronApp} from "electron";
import path from "path";

async function handleDeeplink(urlString: string) {
	// Handle url
	const url = new URL(urlString);
	const fullToken = url.searchParams.get("token");
	try {
		const limitedToken = await devourSwapToken(fullToken);
		devourAuthUser(limitedToken.oAuthToken);
	} catch (e) {
		console.error("error swapping devour token", e);
	}

}

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

ElectronApp.whenReady().then(() => {
  const customUrl = process.argv.find(item => item.startsWith("devourplay://"));
  if (customUrl) {
    void handleDeeplink(customUrl);
  }
});
