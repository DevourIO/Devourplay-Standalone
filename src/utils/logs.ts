import {shell} from "electron";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import {appData} from "./getAppDataPath";
import {getDevourBackendDomain, getDevourState} from "@devour/overwolf-sdk";

let stream: fs.WriteStream;

const maxFiles = 10;
const dirLogs = appData("devour", "logs");
const baseName = "standalone";
const ext = ".log";

/** Log rotation style. Limit amount of logs, delete the oldest, and increments existing filename. **/
export function rotateLogs() {
	// If it doesn't exist, create the directory
	if (!fs.existsSync(dirLogs)) {
		fs.mkdirSync(dirLogs);
	}

	const basePath = (i) =>
		path.join(dirLogs, i === 0
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
	stream = fs.createWriteStream(basePath(0), {flags: "a"});
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

function archiveLogs() {
	closeLog();

	const zip = new AdmZip();

	// add files
	const files = fs.readdirSync(dirLogs)
		.filter(file => path.extname(file) === ext);
	for (const file of files) {
		zip.addLocalFile(`${dirLogs}/${file}`);
	}

	// add folder
	// zip.addLocalFolder('my-folder');

	// write zip
	zip.writeZip(dirLogs + "/logs.zip");
}

export async function uploadLogs() {
	const devourState = getDevourState();
	const userAuthToken = devourState.userAuthToken;
	const filePath = dirLogs + "/logs.zip";
	const fileBuffer = fs.readFileSync(filePath);

	const formData = new FormData();
	const file = new Blob([fileBuffer], { type: "application/zip" });
	formData.append(
		"logFile",
		file,
		path.basename(filePath)
	);

	const response = await fetch(`${getDevourBackendDomain()}/devourplay/help-ticket`, {
		method: "POST",
		body: formData,
		headers: {
			'Authorization': userAuthToken ? `Bearer ${userAuthToken}` : undefined,
		},
	});
	const data = await response.json();

	console.log("Uploaded", data);
}

export function archiveLogsAndUpload() {
	archiveLogs();
	shell.openPath(dirLogs); // Open log folder in windows explorer / mac finder
	uploadLogs();
}