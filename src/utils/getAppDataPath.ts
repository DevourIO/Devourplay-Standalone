import path from "path";

/** https://www.npmjs.com/package/app-data-folder **/

function prependDot(...app: string[]) {
	return app.map((item, i) => {
		if (i === 0) {
			return `.${item}`;
		} else {
			return item;
		}
	});
}

export function appData(...app: string[]): string {
	let appData: string;
	if (process.platform === 'win32') {
		appData = path.join(process.env.APPDATA, ...app);
	} else if (process.platform === 'darwin') {
		appData = path.join(process.env.HOME, 'Library', 'Application Support', ...app);
	} else {
		appData = path.join(process.env.HOME, ...prependDot(...app));
	}
	return appData;
}

