/**
 * Host half of the Blobby bundle.
 *
 * The pet itself lives in the browser module. This half only owns the optional
 * Windows desktop display routes and their native helper process; every other
 * environment leaves it idle.
 */
import { registerBlobbyDesktop } from './desktop/host.js'

export function apply(ctx) {
	registerBlobbyDesktop(ctx)
}
