import {Menu, Tray, nativeImage, app as ElectronApp, BrowserWindow} from "electron";
import {devourIsLoggedIn, devourUnauthUser, getDevourFrontendDomain} from "@devour/overwolf-sdk";
import path from "path";
import {isQuitting, mainApp, setIsQuitting} from "../browser";
import {eventBusInstance} from "../browser/services/eventBus.service";
import { autoUpdater } from "electron-updater";
import {archiveLogsAndUpload} from "./logs";

// save a reference to the Tray object globally to avoid garbage collection
let tray: Tray | null = null;

export function refreshTrayMenu() {
	if (!tray) return; // Don't create a new tray if it doesn't exist
	const contextMenu = Menu.buildFromTemplate([
		{
			label: `Version ${ElectronApp.getVersion()} (${process.env.TARGET_ENV})`,
		},
		{
			label: "Help",
			click: () => {
				const win = new BrowserWindow({ width: 480, height: 640, show: true });

				// Load a remote URL
				const url = `${getDevourFrontendDomain()}/external/help`;
				win.loadURL(url);
				// void shell.openExternal(url);
			},
		},
		{
			label: "Settings",
			click: () => {
				mainApp.showSettingsWindow();
			},
		},
		{
			label: "Archive Logs",
			click: archiveLogsAndUpload,
		},
		{
			label: "Debug",
			click: () => {
				mainApp.showMainWindow();
			},
		},
		devourIsLoggedIn() ? {
			label: "Logout",
			click: () => {
				devourUnauthUser();
				refreshTrayMenu();
				eventBusInstance.emit("log", "User Logged Out");
			},
		} : {
			label: "Login",
			click: () => {
				mainApp.showLoginWindow();
				// void shell.openExternal(loginUrl);
			},
		},
		{
			label: "Check for Updates...",
			click: () => {
				void autoUpdater.checkForUpdates();
			},
		},
		{
			label: "Quit",
			click: () => {
				setIsQuitting(true);
				ElectronApp.quit();
			},
		},
	])
	tray.setContextMenu(contextMenu);
}

export const initializeTray = () => {

	// The Tray can only be instantiated after the 'ready' event is fired
	ElectronApp.whenReady().then(() => {
		const trayIcon = nativeImage.createFromPath(path.join(__dirname, "../assets/images/icon.png"));
		tray = new Tray(trayIcon.resize({width: 16, height: 16}));
		refreshTrayMenu();
	})

	ElectronApp.on('window-all-closed', () => {
		if (process.platform !== 'darwin' && isQuitting) {
			ElectronApp.quit();
		}
	});

};

