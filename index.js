/**
 * Host half of the Blobby bundle.
 *
 * Everything the pet needs lives in the browser module. This half only exists
 * so the package is a valid Loader entry and so the client module graph can be
 * composed for the `vscode-pet` package.
 */
export function apply() {
	/* no host state, routes, or tools */
}
