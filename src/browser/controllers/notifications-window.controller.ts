import {app as electronApp, ipcMain} from "electron";
import path from 'path';
import {OverlayBrowserWindow, OverlayWindowOptions, PassthroughType} from "@overwolf/ow-electron-packages-types";
import {OverlayService} from "../services/overlay.service";
import {devourIsLoggedIn} from "@devour/overwolf-sdk";
import {clearTimeout} from "node:timers";

/**
 *
 */
export class NotificationsWindowController {
	private overlayWindow: OverlayBrowserWindow = null;
	private timeoutId: NodeJS.Timeout;

	/**
	 *
	 */
	public get overlayBrowserWindow(): OverlayBrowserWindow {
		return this.overlayWindow;
	}

	/**
	 *
	 */
	constructor(private readonly overlayService: OverlayService) {
		overlayService.on('ready', this.registerListeners.bind(this));
	}

	private registerListeners() {
		if (!this.overlayService?.overlayApi) {
			throw new Error('Attempting to access overlay before available');
		}
		this.overlayService.overlayApi.on('game-launched', (event, gameInfo) => {
			if (!devourIsLoggedIn()) {
				this.createAndShow("You are not logged in to DevourPlay. Your game progress will not track until you login.");
			}
		});
	}

	/**
	 *
	 */
	public async createAndShow(message: string) {

		// name should be unique
		const options: OverlayWindowOptions = {
			name: 'notificationWindow' + Math.floor(Math.random() * 1000),
			height: 240,
			width: 320,
			show: true,
			transparent: true,
			resizable: true, // resizable borders
			x: 0,
			y: 10,
			passthrough: PassthroughType.PassThrough,
			webPreferences: {
				devTools: true,
				nodeIntegration: true,
				contextIsolation: true,
				// relative to root folder of the project
				preload: path.join(__dirname, '../preload/preload.js'),
			},
		};

		this.overlayWindow = await this.overlayService.createNewOsrWindow(
			options,
		);

		this.registerToIpc();

		this.registerToWindowEvents();

		await this.overlayWindow.window.loadURL(
			path.join(__dirname, '../renderer/notification.html')
		);

		this.overlayWindow.window.show();
		// this.overlayWindow.window.webContents.openDevTools({ mode: 'detach' });
		this.overlayWindow?.window?.webContents?.send('notification-message', message);
		this.timeoutId = setTimeout(() => {
			this.overlayWindow?.window?.close();
		}, 8000);
	}

	/**
	 *
	 */
	private registerToIpc() {

		ipcMain.handle('devtools', async () => {
			this.overlayWindow.window.webContents.openDevTools({ mode: 'detach' });
		});

	}

	/**
	 *
	 */
	private registerToWindowEvents() {
		const browserWindow = this.overlayWindow.window;
		browserWindow.on('closed', () => {
			this.overlayWindow = null;
			console.log('notifications window closed');
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
				this.timeoutId = null;
			}
		})
	}


}
