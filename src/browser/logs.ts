import fs from "fs";
import path from "path";
import {appData} from "./getAppDataPath";

let stream: fs.WriteStream;

const maxFiles = 10;
const dir = appData("devour", "logs");
const baseName = "standalone";
const ext = ".log";

/** Log rotation style. Limit amount of logs, delete the oldest, and increments existing filename. **/
export function rotateLogs() {
	// If it doesn't exist, create the directory
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	const basePath = (i) =>
		path.join(dir, i === 0
			? `${baseName}${ext}`
			: `${baseName}.${i}${ext}`
		);

	// Step 1: delete oldest if exists
	try {
		 fs.unlinkSync(basePath(maxFiles));
	} catch (err) {
		if (err.code !== "ENOENT") throw err;
	}

	// Step 2: shift files (reverse order!)
	for (let i = maxFiles - 1; i >= 0; i--) {
		try {
			fs.renameSync(basePath(i), basePath(i + 1));
		} catch (err) {
			if (err.code !== "ENOENT") throw err;
		}
	}

	// Step 3: create new file
	// fs.writeFileSync(basePath(0), "");
	stream = fs.createWriteStream(basePath(0), { flags: "a" });
}

export function writeLog(...args: any[]) {
	// if (!stream) {
	// 	rotateLogs();
	// }
	const messageString = args.map(a => {
		if (typeof a === "object") {
			return JSON.stringify(a);
		} else {
			return a.toString();
		}
	}).join(" | ");
	stream?.write(`${Date.now()}: ${messageString}\n`);
}

export function closeLog() {
	stream?.end();
	stream = null;
}