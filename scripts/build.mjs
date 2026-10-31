import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const assetsDir = path.join(root, 'assets')
const srcDir = path.join(root, 'src')

const SOURCES = [
	'00-locale.js',
	'10-constants.js',
	'20-core.js',
	'30-color.js',
	'35-store.js',
	'40-render.js',
	'45-desktop.js',
	'50-widget.js',
	'55-react.js',
	'60-jump-game.js',
	'80-exports.js',
]

const EXPECTED = {
	'buddy-idle': { frames: 50, width: 96, height: 96 },
	'buddy-rendering': { frames: 50, width: 96, height: 96 },
	'buddy-clapping': { frames: 13, width: 96, height: 96 },
	'buddy-typing': { frames: 2, width: 168, height: 96 },
	'buddy-painting': { frames: 8, width: 192, height: 96 },
	'buddy-press-button': { frames: 6, width: 160, height: 96 },
	'buddy-love': { frames: 6, width: 96, height: 96 },
	'buddy-cool': { frames: 9, width: 96, height: 96 },
	'buddy-sing': { frames: 4, width: 164, height: 124 },
	'buddy-speechless': { frames: 5, width: 96, height: 96 },
	'buddy-worry': { frames: 2, width: 96, height: 96 },
	'buddy-dizzy': { frames: 8, width: 96, height: 128 },
	'buddy-yapping': { frames: 1, width: 96, height: 96 },
	'buddy-jump': { frames: 6, width: 96, height: 96 },
	'buddy-falling': { frames: 6, width: 96, height: 96 },
	'buddy-wall-impact': { frames: 1, width: 96, height: 96 },
	'buddy-splat': { frames: 4, width: 96, height: 96 },
	'buddy-sleep': { frames: 8, width: 120, height: 96 },
	'buddy-waking': { frames: 8, width: 120, height: 96 },
	'buddy-search': { frames: 4, width: 96, height: 96 },
	'buddy-speech': { frames: 6, width: 96, height: 96 },
	'buddy-respawn': { frames: 6, width: 96, height: 96 },
}

function pngSize(buffer) {
	if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

async function walk(dir, prefix = '') {
	const entries = await readdir(dir, { withFileTypes: true })
	const files = []
	for (const entry of entries) {
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name
		if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), relative))
		else files.push(relative)
	}
	return files
}

async function main() {
	const files = (await walk(assetsDir)).filter(file => file.endsWith('.png'))
	const assetData = {}
	const dimensions = new Map()
	for (const file of files) {
		const buffer = await readFile(path.join(assetsDir, file))
		const size = pngSize(buffer)
		dimensions.set(file, size)
		assetData[file] = `data:image/png;base64,${buffer.toString('base64')}`
	}
	for (const [base, expected] of Object.entries(EXPECTED)) {
		for (const variant of ['stable', 'insiders']) {
			for (const suffix of expected.frames === 1 ? [`-${expected.height}`] : [`-${expected.height}`, `-tracking-96`]) {
				const staticName = `${base}-${variant}${suffix}.png`
				// tracking variants only exist for idle/rendering/clapping; skip missing optional names
				if (!dimensions.has(staticName)) continue
				const size = dimensions.get(staticName)
				if (size.width !== expected.width || size.height !== expected.height) {
					throw new Error(`${staticName} is ${size.width}x${size.height}, expected ${expected.width}x${expected.height}`)
				}
			}
			const sheetName = `${base}-${variant}-${expected.height}.spritesheet.png`
			const sheet = dimensions.get(sheetName)
			if (sheet && expected.frames > 1 && sheet.width !== expected.width * expected.frames) {
				throw new Error(`${sheetName} is ${sheet.width}px wide, expected ${expected.width * expected.frames}`)
			}
			const trackingSheet = `${base}-${variant}-tracking-96.spritesheet.png`
			const tracking = dimensions.get(trackingSheet)
			if (tracking && expected.frames > 1 && tracking.width !== expected.width * expected.frames) {
				throw new Error(`${trackingSheet} is ${tracking.width}px wide, expected ${expected.width * expected.frames}`)
			}
		}
	}

	const css = await readFile(path.join(srcDir, '60-styles.css'), 'utf8')
	const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
	const pieces = []
	for (const file of SOURCES) {
		pieces.push(`/* ${file} */\n` + await readFile(path.join(srcDir, file), 'utf8'))
	}
	const body = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(packageJson.name)},
	factory(require) {
		const React = require('react');
		let ReactDOM;
		try { ReactDOM = require('react-dom'); } catch (ignored) { ReactDOM = undefined; }
		const h = React.createElement;
		const createPortal = ReactDOM && typeof ReactDOM.createPortal === 'function' ? ReactDOM.createPortal : element => element;
		const ASSET_DATA = ${JSON.stringify(assetData)};
		const PET_CSS = ${JSON.stringify(css)};
${pieces.join('\n')}
		return { inject: ['slots', 'locale'], apply, __test };
	}
});
`
	// Syntax check before writing.
	new Function(body)
	await writeFile(path.join(root, 'client.js'), body)
	const bytes = Buffer.byteLength(body)
	console.log(`client.js ${(bytes / 1024).toFixed(1)} KiB, ${Object.keys(assetData).length} images`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
