import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const assetsDir = path.join(root, 'assets')
const accessoriesDir = path.join(assetsDir, 'accessories')
const api = 'https://api.github.com/repos/microsoft/vscode'
const headers = { 'user-agent': 'vscode-pet-build', accept: 'application/vnd.github+json' }

async function getJson(url) {
	const response = await fetch(url, { headers })
	if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
	return response.json()
}

function pngSize(buffer) {
	if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

async function download(url, file) {
	const response = await fetch(url, { headers: { 'user-agent': 'vscode-pet-build' } })
	if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
	const buffer = Buffer.from(await response.arrayBuffer())
	await writeFile(file, buffer)
	return buffer
}

async function main() {
	const commit = await getJson(`${api}/commits/main`)
	const sha = commit.sha
	const tree = await getJson(`${api}/git/trees/${sha}?recursive=1`)
	const prefix = 'src/vs/workbench/contrib/chat/browser/widget/media/chatPet/'
	const files = tree.tree
		.filter(entry => entry.type === 'blob' && entry.path.startsWith(prefix) && entry.path.endsWith('.png'))
		.map(entry => ({ name: entry.path.slice(prefix.length), size: entry.size }))
	if (files.length === 0) throw new Error('no chatPet assets found')

	await mkdir(accessoriesDir, { recursive: true })
	const manifest = { source: 'microsoft/vscode', commit: sha, fetchedAt: new Date().toISOString(), files: [] }
	for (const entry of files) {
		const target = path.join(assetsDir, entry.name)
		await mkdir(path.dirname(target), { recursive: true })
		const url = `https://raw.githubusercontent.com/microsoft/vscode/${sha}/${prefix}${entry.name}`
		const buffer = await download(url, target)
		const { width, height } = pngSize(buffer)
		manifest.files.push({
			name: entry.name,
			width,
			height,
			bytes: buffer.length,
			sha256: createHash('sha256').update(buffer).digest('hex'),
			url,
		})
		process.stdout.write(`.`)
	}
	process.stdout.write('\n')
	await writeFile(path.join(assetsDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
	console.log(`fetched ${manifest.files.length} PNGs from microsoft/vscode@${sha}`)
}

main().catch(error => {
	console.error(error)
	process.exitCode = 1
})
