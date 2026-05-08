import {app as ElectronApp, BrowserWindow, ipcMain} from "electron";
import path from 'path';
import {OverlayBrowserWindow, OverlayWindowOptions, PassthroughType} from "@overwolf/ow-electron-packages-types";
import {OverlayService} from "../services/overlay.service";
import {devourIsLoggedIn} from "@devour/overwolf-sdk";
import {WebsocketService} from "../services/websocket.service";
import {isQuitting} from "../index";

export interface NotificationsStandalone {
	title: string;
	message: string;
}

/**
 *
 */
export class NotificationsWindowController {
	private overlayWindow: OverlayBrowserWindow = null;
	private browserWindow: BrowserWindow = null;
	private timeoutId: NodeJS.Timeout;
	private queuedNotification: NotificationsStandalone = null;
	private isInGame: boolean = false;

	/**
	 *
	 */
	constructor(
		private readonly overlayService: OverlayService,
		private readonly websocketService: WebsocketService,
	) {
		this.registerListeners();
		overlayService.on('ready', this.registerOverlayListeners.bind(this));
		this.registerToIpc();

		ElectronApp.whenReady().then(() => {
			this.browserWindow = new BrowserWindow({
				width: 480,
				height: 640,
				show: false,
				webPreferences: {
					// NOTE: nodeIntegration and contextIsolation are only required for this
					// specific demo app, they are not a neceassry requirement for any other
					// ow-electron applications
					nodeIntegration: true,
					contextIsolation: true,
					devTools: true,
					// relative to root folder of the project
					preload: path.join(__dirname, '../preload/preload.js'),
				},
			});
			this.browserWindow.loadURL("https://develop-mirror2.web.devourgo.io/external/info");
			this.browserWindow.on('close', (event) => {
				if (!isQuitting) {
					// Prevent the window from actually closing
					event.preventDefault();

					// Hide it instead
					this.browserWindow.hide();
				}
			});
		});


	}

	private registerListeners() {
		this.websocketService.on("NOTIFICATIONS_STANDALONE", (data: NotificationsStandalone) => {
			if (this.isInGame) {
				this.queuedNotification = data;
			} else {
				this.createAndShow(data);
			}
		});

	}

	private registerOverlayListeners() {
		if (!this.overlayService?.overlayApi) {
			throw new Error('Attempting to access overlay before available');
		}
		this.overlayService.overlayApi.on('game-launched', (event, gameInfo) => {
			this.isInGame = true;
			if (!devourIsLoggedIn()) {
				this.createAndShowOverlay("You are not logged in to DevourPlay. Your game progress will not track until you login.");
			}
		});

		this.overlayService.overlayApi.on('game-exit', (event, gameInfo) => {
			this.isInGame = false;
			if (this.queuedNotification) {
				this.createAndShow(this.queuedNotification);
				this.queuedNotification = null;
			}
		});
		this.websocketService.on("NOTIFICATIONS_STANDALONE", () => {
			if (this.isInGame) {
				this.createAndShowOverlay("DevourPlay has a new notification! Close your game view it.");
			}
		});

	}

	/**
	 *
	 */
	public async createAndShowOverlay(message: string) {

		// name should be unique
		const options: OverlayWindowOptions = {
			name: 'notificationWindow' + Math.floor(Math.random() * 1000),
			height: 240,
			width: 320,
			show: true,
			transparent: true,
			resizable: false, // resizable borders
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

		this.registerToWindowEvents();

		await this.overlayWindow.window.loadURL(
			path.join(__dirname, '../renderer/notification-overlay.html')
		);

		this.overlayWindow.window.show();
		// this.overlayWindow.window.webContents.openDevTools({ mode: 'detach' });
		this.overlayWindow?.window?.webContents?.send('notification-overlay', message);
		this.timeoutId = setTimeout(() => {
			this.overlayWindow?.window?.close();
		}, 5000);
	}

	/**
	 *
	 */
	public createAndShow(data: NotificationsStandalone) {
		this.browserWindow.webContents?.send('notification-message', data);
		this.focusWindow();
	}

	public focusWindow() {
		if (this.browserWindow && !this.browserWindow.isDestroyed()) {
			// Show the window if it's minimized
			if (this.browserWindow.isMinimized()) {
				this.browserWindow.restore();
			}

			// Bring the window to front and focus it
			this.browserWindow.show();
			this.browserWindow.focus();
		}
	}


	/**
	 *
	 */
	private registerToIpc() {
		ipcMain.handle('devtools', () => {
			if (this.overlayWindow?.window && !this.overlayWindow?.window.isDestroyed()) {
				this.overlayWindow?.window.webContents.openDevTools({mode: 'detach'});
			}
			if (this.browserWindow && !this.browserWindow.isDestroyed()) {
				this.browserWindow?.webContents.openDevTools({mode: 'detach'});
			}
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
