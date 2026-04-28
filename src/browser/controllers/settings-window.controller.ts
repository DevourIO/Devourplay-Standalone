import { app as electronApp, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import {getAppSettings, setAppSettings} from "../../utils/appSettings";


/**
 *
 */
export class SettingsWindowController {
  private browserWindow: BrowserWindow = null;

  /**
   *
   */
  constructor() {
    this.registerToIpc();

  }

  /**
   *
   */
  public createAndShow() {
    // If window already exists, just focus it instead of creating a new one
    if (this.browserWindow && !this.browserWindow.isDestroyed()) {
      this.focusWindow();
      return;
    }

    this.browserWindow = new BrowserWindow({
      width: 640,
      height: 640,
      show: true,
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

    this.browserWindow.loadFile(path.join(__dirname, '../settings/settings.html'));
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

    // Handle request for initial settings
    ipcMain.handle('get-initial-settings', () => {
      return getAppSettings();
    });

    ipcMain.handle('toggle-auto-start', async () => {
      const appSettings = getAppSettings();
      const isAutoStart = Boolean(appSettings.autoStartOnLogin);

      setAppSettings({
        autoStartOnLogin: !isAutoStart,
      });

      electronApp.setLoginItemSettings({
        openAtLogin: !isAutoStart,
        // path: stubLauncher,
        args: [
          // You might want to pass a parameter here indicating that this
          // app was launched via login, but you don't have to
        ],
      });

    });


  }

}
