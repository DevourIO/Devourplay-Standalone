import { GameInfo, GameLaunchEvent } from '@overwolf/ow-electron-packages-types';
import { MainWindowController } from './controllers/main-window.controller';
import { OverlayService } from './services/overlay.service';
import { kGameIds } from "@overwolf/ow-electron-packages-types/game-list";
import { kGepSupportedGameIds } from '@overwolf/ow-electron-packages-types/gep-supported-games';
import { GameEventsService } from './services/gep.service';
import {EventBusService} from "./services/eventBus.service";
import {rotateLogs, writeLog} from "../utils/logs";

export class Application {
	constructor(
		private readonly overlayService: OverlayService,
		private readonly gepService: GameEventsService,
		private readonly mainWindowController: MainWindowController,
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

		// for gep supported games goto:
		// https://overwolf.github.io/api/electron/game-events/
		gepService.registerGames([
			kGepSupportedGameIds.TeamfightTactics,
			//kGepSupportedGameIds.DiabloIV,
			kGepSupportedGameIds.RocketLeague,
		]);

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

	private onOverlayServiceReady() {
		// Which games to support overlay for
		this.overlayService.registerToGames([
			kGameIds.LeagueofLegends,
			kGameIds.TeamfightTactics,
			kGameIds.RocketLeague,
			kGameIds.DiabloIV
		]);
	}
}
