import { BrowserWindow, app, Notification } from "electron";
import { exec } from 'child_process';
import { autoUpdater } from "electron-updater";
import {eventBusInstance} from "../browser/services/eventBus.service";


class AppUpdater {
	// private mainWindow: BrowserWindow | null;
	// private updateCheckInterval: NodeJS.Timeout | null = null;
	// private readonly CHECK_INTERVAL_MS = 60 * 1000 * 60; // 60 minutes

	constructor() {
		// 1. Basic Configuration
		autoUpdater.autoDownload = true;
		autoUpdater.autoInstallOnAppQuit = false;

		eventBusInstance.emit("log",`Get Feed URL: ${autoUpdater.getFeedURL()}`);

		this.initializeEvents();


		if (app.isPackaged) {
			eventBusInstance.emit("log","[Updater] Updates are enabled");

			autoUpdater.checkForUpdates();

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

	private setUpdateFlag(value: boolean): void {
		if (process.platform === 'win32') {
			const regValue = value ? '1' : '0';
			const command = `reg add "HKCU\\Software\\DevourPlay" /v "UpdateInProgress" /t REG_SZ /d "${regValue}" /f`;
			exec(command, (error) => {
				if (error) {
					console.error('Failed to set update flag:', error);
				}
			});
		}
	}

	private initializeEvents(): void {
		// This library gives you great progress tracking
		// Note: flag will be cleared by the NSIS script after update
		// autoUpdater.on("download-progress", (progressObj) => {
		// 	eventBusInstance.emit("log",`Download speed: ${progressObj.bytesPerSecond} - ${progressObj.percent}%`);
		// 	if (this.mainWindow) {
		// 		eventBusInstance.emit("log",`Download speed: ${progressObj.bytesPerSecond} - ${progressObj.percent}%`);
		// 	}
		// });

		autoUpdater.on("update-available", (info) => {
			new Notification({
				title: `DevourPlay Updating`,
				body: `DevourPlay has a new update. v${info.version} is downloading and will be installed automatically when it's ready.`,
			}).show()
			eventBusInstance.emit("log",`[Updater] Update available: ${JSON.stringify(info)}`);
		});

		autoUpdater.on("update-downloaded", (info) => {
			// Set the update flag before showing dialog
			this.setUpdateFlag(true);

			// Deploy update immediately
			autoUpdater.quitAndInstall(true, true);

			// const dialogOpts: MessageBoxOptions = {
			// 	type: "info",
			// 	buttons: ["Install now", "Install when I close the app"],
			// 	title: "DevourPlay Update",
			// 	message: `Version ${info.version} is ready!`,
			// 	detail: "A new version of DevourPlay has been downloaded. Restart the application to apply the updates.",
			// };
			//
			// dialog.showMessageBox(undefined, dialogOpts).then((returnValue) => {
			// 	if (returnValue.response === 0) autoUpdater.quitAndInstall(true, true);
			// });
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
