import fs from "fs";
import {appData} from "./getAppDataPath";

export interface AppSettings {
	autoStartOnLogin?: boolean;
}

const dir = appData("devour");
const filePath = `${dir}/config-standalone.json`;

export function resetAppSettings() {
	const defaultState: AppSettings = {
		autoStartOnLogin: false,
	};
	const stateString = JSON.stringify(defaultState);

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
	fs.writeFileSync(filePath, stateString);

	return defaultState;
}

export function getAppSettings(): AppSettings {
	const exists = fs.existsSync(filePath);
	if (!exists) {
		return resetAppSettings();
	}
	const stateString = fs.readFileSync(filePath, "utf-8");
	return JSON.parse(stateString);
}

export function setAppSettings(newSettings: Partial<AppSettings>) {
	const stateString = JSON.stringify({
		...getAppSettings(),
		...newSettings,
	});

	fs.writeFileSync(filePath, stateString);
}

