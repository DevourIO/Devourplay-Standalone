import { io, Socket } from "socket.io-client";
import EventEmitter from "events";
import {NotificationsStandalone} from "../controllers/notifications-window.controller";

export class WebsocketService extends EventEmitter {
	private readonly io: Socket = null;

	constructor(url: string) {
		super();

		this.io = io(url, {
			transports: ["websocket"], // optional but common in Electron
		});

		this.registerEvents();
	}

	public get ioInstance() {
		return this.io;
	}

	public registerEvents() {
		this.io.on("NOTIFICATIONS_STANDALONE", (data: NotificationsStandalone) => {
			this.emit("NOTIFICATIONS_STANDALONE", data);
			this.emit("log", "NOTIFICATIONS_STANDALONE", data);
		});

	}

}
