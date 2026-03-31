import { dialog, BrowserWindow, app } from "electron";

import { autoUpdater } from "electron-updater";
import {eventBusInstance} from "../browser/services/eventBus.service";


class AppUpdater {
	private mainWindow: BrowserWindow | null;
	// private updateCheckInterval: NodeJS.Timeout | null = null;
	// private readonly CHECK_INTERVAL_MS = 60 * 1000 * 60; // 60 minutes

	constructor() {
		// 1. Basic Configuration
		autoUpdater.autoDownload = true;
		autoUpdater.autoInstallOnAppQuit = true;


		/*
		 * 2. Point to your GCP Bucket
		 * electron-updater handles the /win/ or /mac/ subfolders internally
		 * if you structure your bucket that way, but usually, it just expects
		 * the base URL where the .yml files live.
		 */
		const baseUrl = "https://storage.googleapis.com/ow-releases";

		/*
		 * Logic: if you keep your subfolder structure (win-x64, etc.),
		 * you must specify the exact path for THIS specific build:
		 */
		const feedUrl = `${baseUrl}/ow-standalone/${process.platform}/${process.arch}`;
		// autoUpdater.setFeedURL(feedUrl);
		eventBusInstance.emit("log",`Get Feed URL: ${autoUpdater.getFeedURL()}`);

		this.initializeEvents();


		if (app.isPackaged) {
			eventBusInstance.emit("log","[Updater] Updates are enabled");

			autoUpdater.checkForUpdatesAndNotify();

			/*
			 * Set up periodic checks every 4 hours
			 * checkForUpdates() will trigger the update-downloaded event which shows our custom dialog
			 */
			// this.updateCheckInterval = setInterval(() => {
			// 	console.log("[Updater] Periodic update check triggered");
			// 	autoUpdater.checkForUpdates();
			// }, this.CHECK_INTERVAL_MS);

			// Clean up interval on app quit
			// app.on("before-quit", () => {
			// 	this.cleanup();
			// });
		} else {
			eventBusInstance.emit("log","[Updater] No updates in unpackaged apps");
		}
	}

	setMainWindow(mainWindow: BrowserWindow | null): void {
		this.mainWindow = mainWindow;
	}

	private initializeEvents(): void {
		// This library gives you great progress tracking
		autoUpdater.on("download-progress", (progressObj) => {
			eventBusInstance.emit("log",`Download speed: ${progressObj.bytesPerSecond} - ${progressObj.percent}%`);
			if (this.mainWindow) {
				eventBusInstance.emit("log",`Download speed: ${progressObj.bytesPerSecond} - ${progressObj.percent}%`);
			}
		});

		autoUpdater.on("update-available", (info) => {
			eventBusInstance.emit("log",`[Updater] Update available: ${JSON.stringify(info)}`);
		});

		autoUpdater.on("update-downloaded", (info) => {
			const dialogOpts = {
				type: "info" as const,
				buttons: ["Install now", "Install when I close the app"],
				title: "Application Update",
				message: `Version ${info.version} is ready!`,
				detail: "A new version has been downloaded. Restart the application to apply the updates.",
			};

			if (this.mainWindow) {
				dialog.showMessageBox(this.mainWindow, dialogOpts).then((returnValue) => {
					if (returnValue.response === 0) autoUpdater.quitAndInstall(true, true);
				});
			}
		});

		autoUpdater.on("error", (err: Error) => {
			eventBusInstance.emit("log",`[Updater Error]: ${JSON.stringify(err.message)}`);
		});
	}

	// private cleanup(): void {
	// 	if (this.updateCheckInterval) {
	// 		clearInterval(this.updateCheckInterval);
	// 		this.updateCheckInterval = null;
	// 	}
	// }
}

export default AppUpdater;

export { autoUpdater };
