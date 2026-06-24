import { GameInfo, GameLaunchEvent } from '@overwolf/ow-electron-packages-types';
import { MainWindowController } from './controllers/main-window.controller';
import { OverlayService } from './services/overlay.service';
import { kGameIds } from "@overwolf/ow-electron-packages-types/game-list";
import { kGepSupportedGameIds } from '@overwolf/ow-electron-packages-types/gep-supported-games';
import { GameEventsService } from './services/gep.service';
import {eventBusInstance, EventBusService} from "./services/eventBus.service";
import {rotateLogs, writeLog} from "../utils/logs";
import {LoginWindowController} from "./controllers/login-window.controller";
import AppUpdater from "../utils/updater";
import {SettingsWindowController} from "./controllers/settings-window.controller";
import {WebsocketService} from "./services/websocket.service";
import {ScreenshotService} from "./services/screenshot.service";

export class Application {
	constructor(
		private readonly overlayService: OverlayService,
		private readonly gepService: GameEventsService,
		private readonly websocketService: WebsocketService,
		private readonly screenshotService: ScreenshotService,
		private readonly mainWindowController: MainWindowController,
		private readonly loginWindowController: LoginWindowController,
		private readonly settingsWindowController: SettingsWindowController,
		private readonly eventBusService: EventBusService,
	) {

		overlayService.on('ready', this.onOverlayServiceReady.bind(this));

		overlayService.on('injection-decision-handling', (
			event: GameLaunchEvent,
			gameInfo: GameInfo
		) => {
			// Always inject because we tell it which games we want in
			// onOverlayServiceReady
			event.inject();
		})

		fetch("https://game-events-status.overwolf.com/all_prod.json")
			.then(response => response.json())
			.then(data => {
				const gameIds: number[] = data.map((item) => Number(item.game_id)).filter(Boolean);
				gepService.registerGames(gameIds);
				eventBusInstance.emit("log", `Registered GEP game IDs: ${gameIds.join(", ")}`);
			})
			.catch(err => {
				gepService.registerGames([
					kGepSupportedGameIds.TeamfightTactics,
					kGepSupportedGameIds.DiabloIV,
					kGepSupportedGameIds.RocketLeague,
				]);
				eventBusInstance.emit("log", `Error fetching games list: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
			});

		rotateLogs();
		gepService.on('log', writeLog);
		overlayService.on('log', writeLog);
		eventBusService.on('log', writeLog);
		websocketService.on('log', writeLog);
		screenshotService.on('log', writeLog);
	}

	public run() {
		this.initialize();
	}

	private initialize() {
		new AppUpdater();
	}

	public showMainWindow() {
		const showDevTools = true;
		this.mainWindowController.createAndShow(showDevTools);
	}

	public showSettingsWindow() {
		this.settingsWindowController.createAndShow();
	}

	public showLoginWindow() {
		this.loginWindowController.createAndShow();
	}

	public closeLoginWindow() {
		this.loginWindowController.closeWindow();
	}

	private onOverlayServiceReady() {
		const thisOverlayService = this.overlayService;
		fetch("https://game-events-status.overwolf.com/all_prod.json")
			.then(response => response.json())
			.then(data => {
				const gameIds: number[] = data.map((item) => Number(item.game_id)).filter(Boolean);
				thisOverlayService.registerToGames(gameIds);
			})
			.catch(err => {
				// Which games to support overlay for
				thisOverlayService.registerToGames([
					kGameIds.AmericanTruckSimulator,
					kGameIds.DiabloIV,
					kGameIds.LeagueofLegends,
					kGameIds.LeagueofLegendsPBE,
					kGameIds.RocketLeague,
					kGameIds.TeamfightTactics,
				]);
			});

	}
}
