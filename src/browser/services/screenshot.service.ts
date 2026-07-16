import {app as electronApp, desktopCapturer, globalShortcut} from 'electron';
import { overwolf } from '@overwolf/ow-electron';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import {IOverwolfOverlayApi} from "@overwolf/ow-electron-packages-types";
import {OverlayService} from "./overlay.service";

const app = electronApp as overwolf.OverwolfApp;
const MANUAL_CAPTURE_HOTKEY = "Alt+S";

export class ScreenshotService extends EventEmitter {
  private screenshotCount = 0;
  private windowHandle: number;
  private width: number;
  private height: number;

  constructor(overlayService: OverlayService) {
    super();
    this.ensureScreenshotDirectory();
    overlayService.on('ready', this.init.bind(this));
  }

  get overlayApi(): IOverwolfOverlayApi {
    return (app.overwolf.packages as any).overlay as IOverwolfOverlayApi;
  }

  private init() {
    this.overlayApi.on('game-window-changed', (window, game, reason) => {
        this.width = window?.size?.width;
        this.height = window?.size?.height;
    });

    this.overlayApi.on("game-window-changed", (window, game, reason) => {
      this.width = window?.size?.width;
      this.height = window?.size?.height;
    });

    const shortcutRegistered = globalShortcut.register(MANUAL_CAPTURE_HOTKEY, () => {
      console.log("Manual screenshot hotkey pressed.");
      this.emit("log", "Manual screenshot hotkey pressed.");
      this.takeGameScreenshot(true);
    });
    if (!shortcutRegistered) {
      console.warn(`[main] Failed to register hotkey ${MANUAL_CAPTURE_HOTKEY} — likely owned by another app`);
    } else {
      console.log(`[main] Manual capture hotkey registered: ${MANUAL_CAPTURE_HOTKEY}`);
    }

    this.overlayApi.on('game-launched', (event, gameInfo) => {
      this.windowHandle = (gameInfo?.processInfo as any)?.window_handle;
    });

  }


  private async getGameWindow() {
  if (!this.windowHandle) {
    this.emit('log', 'Game window handler is missing');
    return;
  }
    // Get all available screens
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: this.width || 1366, height: this.height || 768 },
    });

    if (sources.length === 0) {
      this.emit('log', 'No screens available for capture');
      return;
    }

    // Find the game window by name or process
    // You might need to adjust this logic based on your specific game
    const gameWindow = sources.find(source =>
        // source.name === this.processName,
        source.id.includes(this.windowHandle.toString())
    );

    if (gameWindow) {
      return gameWindow;
    } else {
      this.emit('log', 'Game window not found among available windows', sources);
    }

  }

  /**
   * Ensure screenshot directory exists
   */
  private ensureScreenshotDirectory() {
    const screenshotDir = path.join(app.getPath("home"), "Pictures", 'DevourPlay');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  }

  /**
   * Take a screenshot of the primary display
   */
  public async takeGameScreenshot(highQuality?: boolean) {
    const gameWindow = await this.getGameWindow();
      if (!gameWindow) {
        return;
      }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = highQuality ? 'png' : 'jpg';
      const filename = `game_event_screenshot_${timestamp}_${this.screenshotCount++}.${extension}`;
      const screenshotDir = path.join(app.getPath("home"), "Pictures", 'DevourPlay');
      const screenshotPath = path.join(screenshotDir, filename);

      // Convert the thumbnail to buffer
      const image = gameWindow.thumbnail;
      const buffer = highQuality ? image.toPNG() : image.toJPEG(80);

      // Save screenshot to file
      fs.writeFileSync(screenshotPath, buffer);

      this.emit('log', gameWindow.name, `Screenshot saved: ${screenshotPath}`);
      this.emit('screenshot-taken', { 
        path: screenshotPath, 
        filename, 
        screenName: gameWindow.name
      });

    } catch (error) {
      this.emit('log', 'Error taking screenshot:', error);
    }
  }

}