import { GameInfo, GameLaunchEvent } from '@overwolf/ow-electron-packages-types';
import { MainWindowController } from './controllers/main-window.controller';
import { OverlayService } from './services/overlay.service';
import { kGameIds } from "@overwolf/ow-electron-packages-types/game-list";
import { kGepSupportedGameIds } from '@overwolf/ow-electron-packages-types/gep-supported-games';
import { GameEventsService } from './services/gep.service';
import {eventBusInstance, EventBusService} from "./services/eventBus.service";
import {rotateLogs, writeLog} from "../utils/logs";
import {LoginWindowController} from "./controllers/login-window.controller";

export class Application {
	constructor(
		private readonly overlayService: OverlayService,
		private readonly gepService: GameEventsService,
		private readonly mainWindowController: MainWindowController,
		private readonly loginWindowController: LoginWindowController,
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
	}

	public run() {
		this.initialize();
	}

	private initialize() {
	}

	public showMainWindow() {
		const showDevTools = true;
		this.mainWindowController.createAndShow(showDevTools);
	}

	public showLoginWindow() {
		this.loginWindowController.createAndShow();
	}

	public closeLoginWindow() {
		this.loginWindowController.closeWindow();
	}

	private onOverlayServiceReady() {
		// Which games to support overlay for
		this.overlayService.registerToGames([
			kGameIds.AmericanTruckSimulator,
			kGameIds.DiabloIV,
			kGameIds.EuroTruckSimulator2,
			kGameIds.LeagueofLegends,
			kGameIds.LeagueofLegendsPBE,
			kGameIds.RocketLeague,
			kGameIds.TeamfightTactics,
		]);
	}
}
