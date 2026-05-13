import { BrowserWindow, session } from 'electron';
import {getDevourFrontendDomain} from "@devour/overwolf-sdk";

export const loginUrl = `${getDevourFrontendDomain()}/deeplink`;

/**
 *
 */
export class LoginWindowController {
  private browserWindow: BrowserWindow = null;

  public createAndShow() {
    // If window already exists, just focus it instead of creating a new one
    if (this.browserWindow && !this.browserWindow.isDestroyed()) {
      this.focusWindow();
      return;
    }

    // Create a temporary session for incognito mode
    const incognitoSession = session.fromPartition(`temp-${Date.now()}`, {
      cache: false,
    });

    this.browserWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: true,
      webPreferences: {
        session: incognitoSession,
        // Additional security settings for incognito mode
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    void this.browserWindow.loadURL(loginUrl);
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

  public closeWindow() {
    if (this.browserWindow && !this.browserWindow.isDestroyed()) {
      void this.browserWindow.close();
    }
  }
}