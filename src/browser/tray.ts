import {Menu, Tray, nativeImage, app as ElectronApp, shell} from "electron";
import {devourIsLoggedIn, devourUnauthUser} from "@devour/overwolf-sdk";
import path from "path";
import {mainApp} from "./index";

// save a reference to the Tray object globally to avoid garbage collection
let tray: Tray | null = null;
let isQuitting: boolean = false;

export function refreshTrayMenu() {
	if (!tray) return; // Don't create a new tray if it doesn't exist
	const contextMenu = Menu.buildFromTemplate([
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
			},
		} : {
			label: "Login",
			click: () => {
				const url = "https://develop-mirror2.web.devourgo.io/deeplink";
				void shell.openExternal(url);
			},
		},
		{
			label: "Quit",
			click: () => {
				isQuitting = true;
				ElectronApp.quit();
			},
		},
	])
	tray.setContextMenu(contextMenu);
}

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


