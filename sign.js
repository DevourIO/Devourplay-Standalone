const path = require("path");

/**
 * Custom signing function for electron-builder
 * Currently just logs files available to sign and exits.
 */
exports.default = async function (configuration) {
	const sourceFile = configuration.path;
	const fileName = path.basename(sourceFile);
	const ext = path.extname(sourceFile).toLowerCase();

	console.log(`[Sign] File available to sign: ${fileName}`);
	console.log(`[Sign]   Path: ${sourceFile}`);
	console.log(`[Sign]   Extension: ${ext}`);
	console.log(`[Sign]   Hash: ${configuration.hash || "N/A"}`);
	console.log(`[Sign]   isNest: ${configuration.isNest || false}`);
	console.log(`[Sign] Skipping signing (dry-run mode)`);
};