import { app, Notification } from "electron";
import { exec } from 'child_process';
import { autoUpdater } from "electron-updater";
import {eventBusInstance} from "../browser/services/eventBus.service";

const enableUpdates = process.env.DISABLE_UPDATES !== "true";

class AppUpdater {

	constructor() {
		// 1. Basic Configuration
		autoUpdater.autoDownload = true;
		autoUpdater.autoInstallOnAppQuit = false;

		eventBusInstance.emit("log",`Get Feed URL: ${autoUpdater.getFeedURL()}`);

		this.initializeEvents();


		if (!enableUpdates) {
			eventBusInstance.emit("log","[Updater] Updates are disabled");
		} else if (app.isPackaged) {
			eventBusInstance.emit("log","[Updater] Updates are enabled");

			autoUpdater.checkForUpdates();
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

		});

		autoUpdater.on("error", (err: Error) => {
			eventBusInstance.emit("log",`[Updater Error]: ${JSON.stringify(err.message)}`);
		});
	}

}

export default AppUpdater;
