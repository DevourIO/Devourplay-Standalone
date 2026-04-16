const { execFileSync } = require("child_process");
const path = require("path");

/**
 * Custom signing function for electron-builder.
 * Delegates to az-sign.sh, which signs the file in place using
 * jsign + Azure Trusted Signing.
 */
exports.default = async function (configuration) {
	const sourceFile = configuration.path;
	const script = path.join(__dirname, "az-sign.sh");
	execFileSync("bash", [script, sourceFile], { stdio: "inherit" });
};