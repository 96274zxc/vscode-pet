import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
	DESKTOP_PROTOCOL,
	decodeDesktopPng,
	isDesktopRequestSupported,
	mergeDesktopSettings,
	normalizeDesktopFacts,
	normalizeDesktopSettings,
	sanitizeDesktopCommand,
	validateDesktopBundle,
} from '../desktop/protocol.js'
import { DesktopHelperManager, createDesktopRoutes } from '../desktop/host.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const LABEL_KEYS = ['menu.hats', 'menu.playJump', 'menu.goOnTheRun', 'menu.comeBack', 'menu.grow', 'menu.shrink', 'menu.resetSize', 'menu.changeColor', 'menu.desktopDisplay', 'menu.smartHide']

function makeModel() {
	const numbers = values => Object.fromEntries(values.map(key => [key, 1]))
	return {
		timings: numbers(['idleSleep', 'confirmation', 'transient', 'complete', 'buttonPress', 'splat', 'love', 'cool', 'sing', 'speechless', 'worry', 'dizzy', 'waking', 'achievement', 'respawn', 'respawnReduced', 'wallImpact']),
		physics: numbers(['gravity', 'maxFrameDuration', 'maxDuration', 'wallRestitution', 'ceilingRestitution', 'rotationPerPixel', 'selfRightingStartVelocity', 'selfRightingSpeed', 'minThrowVelocity', 'maxThrowVelocity', 'velocitySampleDuration', 'releaseGraceDuration', 'mouseBounceReleaseGrace', 'bounceResult', 'mouseBounceMinUpwardVelocity', 'mouseBounceMaxUpwardVelocity', 'mouseBounceVerticalRestitution', 'mouseBounceUpwardTransfer', 'mouseBounceHorizontalRetention', 'mouseBounceHorizontalTransfer', 'mouseBounceEdgeKick', 'mouseBounceMaxHorizontalVelocity']),
		sizes: numbers(['display', 'source', 'minScale', 'scaleStep', 'defaultInset', 'respawnDrop', 'dragThreshold']),
		chances: { rare: 0.01, yapping: 0.01 },
		clickInteractions: ['buttonPress', 'love', 'cool', 'sing', 'speechless', 'worry'],
	}
}

function makeBundle(overrides = {}) {
	const labels = Object.fromEntries(LABEL_KEYS.map(key => [key, 'label-' + key]))
	return {
		protocol: DESKTOP_PROTOCOL,
		settings: { scale: 1, smartHide: false, onTheRun: false, motionReduced: false, horizontal: null },
		facts: { running: false, pendingInteraction: false },
		labels,
		theme: { dark: true, menuBackground: '#26272b', menuText: '#f2f3f5', menuMuted: '#9a9ca3', menuHover: '#3a3b40', menuBorder: '#414248', accent: '#4d6bfe' },
		model: makeModel(),
		states: {
			idle: { width: 96, height: 96, durations: [800, 1200], loop: true, mirror: true, right: [PNG, PNG] },
			sing: { width: 164, height: 124, durations: [180], loop: true, mirror: false, right: [PNG], left: [PNG] },
		},
		bubble: { width: 96, height: 96, durations: [220, 220], loop: true, frames: [PNG, PNG] },
		respawn: { width: 96, height: 96, durations: [120, 100], loop: false, frames: [PNG, PNG] },
		...overrides,
	}
}

class FakeChild extends EventEmitter {
	constructor() {
		super()
		this.stdinLines = []
		this.stdout = new PassThrough()
		this.stderr = new PassThrough()
		this.killed = false
		this.stdin = {
			writable: true,
			write: line => {
				this.stdinLines.push(line)
				if (line.includes('"stop"')) setImmediate(() => this.emit('exit', 0, null))
				return true
			},
			on: () => {},
		}
	}
	kill() {
		this.killed = true
		setImmediate(() => this.emit('exit', null, 'SIGTERM'))
	}
}

function fakeSpawn(options = {}) {
	const spawned = []
	const spawn = (command, args, spawnOptions) => {
		const child = new FakeChild()
		spawned.push({ command, args, options: spawnOptions, child })
		if (options.ready !== false) setImmediate(() => child.stdout.write('{"type":"ready"}\n'))
		if (options.autoExit) setImmediate(() => child.emit('exit', 0, null))
		return child
	}
	spawn.spawned = spawned
	return spawn
}

async function makeManager(extra = {}) {
	const tempRoot = await mkdtemp(path.join(tmpdir(), 'blobby-host-test-'))
	const spawn = fakeSpawn(extra.spawnOptions)
	const manager = new DesktopHelperManager({
		platform: 'win32',
		helperExists: true,
		parentPid: 0,
		tempRoot,
		spawn,
		logger: { warn: () => {}, error: () => {} },
		...extra,
	})
	return { manager, tempRoot, spawn }
}

test('desktop bundle validation accepts the client contract and rejects malformed bundles', () => {
	const normalized = validateDesktopBundle(makeBundle())
	assert.equal(normalized.protocol, DESKTOP_PROTOCOL)
	assert.equal(normalized.settings.scale, 1)
	assert.equal(normalized.states.idle.right.length, 2)
	assert.equal(normalized.states.sing.left.length, 1)
	assert.equal(normalized.bubble.frames.length, 2)
	assert.throws(() => validateDesktopBundle(makeBundle({ protocol: 99 })), /protocol/)
	assert.throws(() => validateDesktopBundle(makeBundle({ states: {} })), /idle/)
	assert.throws(() => validateDesktopBundle(makeBundle({ states: { unknown: { width: 96, height: 96, durations: [0], right: [PNG] } } })), /unknown/)
	const badFrame = makeBundle()
	badFrame.states.idle.right = ['not-a-png']
	badFrame.states.idle.durations = [0]
	assert.throws(() => validateDesktopBundle(badFrame), /PNG data URL/)
	const badDuration = makeBundle()
	badDuration.states.idle.durations = [0]
	assert.throws(() => validateDesktopBundle(badDuration), /durations/)
	const badLabels = makeBundle()
	delete badLabels.labels['menu.hats']
	assert.throws(() => validateDesktopBundle(badLabels), /menu.hats/)
})

test('desktop settings, facts and commands normalize independently', () => {
	assert.equal(normalizeDesktopSettings({ scale: 100, smartHide: true, onTheRun: true, motionReduced: true, horizontal: { edge: 'left', inset: 12 } }).scale, 1)
	assert.equal(normalizeDesktopSettings({ horizontal: { edge: 'left', inset: 12 } }).horizontal.edge, 'left')
	assert.equal(normalizeDesktopSettings({}).horizontal, null)
	const merged = mergeDesktopSettings({ scale: 1, smartHide: false }, { scale: 1.4, smartHide: true })
	assert.equal(merged.scale, 1.4)
	assert.equal(merged.smartHide, true)
	assert.equal(mergeDesktopSettings({ scale: 1 }, { scale: 0.01 }).scale, 1)
	assert.equal(normalizeDesktopFacts({ running: true }).running, true)
	assert.equal(normalizeDesktopFacts({ pendingInteraction: true }).pendingInteraction, true)
	assert.equal(sanitizeDesktopCommand('hats'), 'hats')
	assert.equal(sanitizeDesktopCommand('rm -rf'), undefined)
	assert.equal(isDesktopRequestSupported('win32', true), true)
	assert.equal(isDesktopRequestSupported('darwin', true), false)
	assert.equal(isDesktopRequestSupported('win32', false), false)
	assert.ok(decodeDesktopPng(PNG).length > 8)
	assert.throws(() => decodeDesktopPng('nope'), /PNG/)
})

test('helper manager starts, streams settings, answers pending reads and stops', async () => {
	const { manager, tempRoot, spawn } = await makeManager()
	try {
		const started = await manager.start(makeBundle())
		assert.equal(typeof started.session, 'string')
		assert.equal(spawn.spawned.length, 1)
		assert.ok(spawn.spawned[0].args.includes('-STA'))
		assert.ok(spawn.spawned[0].args.some(value => value.endsWith('blobby-desktop.ps1')))
		const child = spawn.spawned[0].child
		assert.ok(child.stdinLines.length === 0)
		child.stdout.write('{"type":"settings","settings":{"scale":1.4,"smartHide":true}}\n')
		await new Promise(resolve => setTimeout(resolve, 20))
		const pending = await manager.pending(started.session, 0)
		assert.equal(pending.version, 1)
		assert.equal(pending.settings.scale, 1.4)
		assert.equal(pending.settings.smartHide, true)
		const waited = manager.pendingAbortable(started.session, 1, undefined)
		setTimeout(() => child.stdout.write('{"type":"command","command":"hats"}\n'), 20)
		const next = await waited
		assert.equal(next.version, 2)
		manager.facts(started.session, { running: true, pendingInteraction: false })
		assert.ok(child.stdinLines.some(line => line.includes('"facts"')))
		const stopped = await manager.stop(started.session)
		assert.equal(stopped.command, 'hats')
		assert.equal(stopped.settings.scale, 1.4)
		assert.equal(existsSync(path.join(tempRoot, started.session)), false)
		assert.equal(manager.session, undefined)
		const again = await manager.stop(started.session)
		assert.equal(again.settings.scale, 1.4)
	} finally {
		manager.dispose()
		await rm(tempRoot, { recursive: true, force: true })
	}
})

test('helper manager refuses non-Windows platforms', async () => {
	const tempRoot = await mkdtemp(path.join(tmpdir(), 'blobby-host-test-'))
	const manager = new DesktopHelperManager({ platform: 'darwin', helperExists: true, spawn: fakeSpawn(), tempRoot, parentPid: 0 })
	try {
		assert.equal(manager.supported, false)
		await assert.rejects(manager.start(makeBundle()), error => error.status === 501)
		await assert.rejects(manager.warmup(), error => error.status === 501)
	} finally {
		manager.dispose()
		await rm(tempRoot, { recursive: true, force: true })
	}
})

test('desktop routes expose capabilities and drive a fake helper', async () => {
	const { manager, tempRoot } = await makeManager()
	try {
		const routes = createDesktopRoutes(manager)
		const capabilities = routes.find(route => route.path.endsWith('/capabilities'))
		const capabilityResponse = await capabilities.fetch(new Request('http://127.0.0.1/api/blobby/desktop/capabilities'))
		assert.equal(capabilityResponse.status, 200)
		assert.equal((await capabilityResponse.json()).supported, true)
		const start = routes.find(route => route.path.endsWith('/start'))
		const startResponse = await start.fetch(new Request('http://127.0.0.1/api/blobby/desktop/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ bundle: makeBundle() }),
		}))
		assert.equal(startResponse.status, 200)
		const started = await startResponse.json()
		assert.equal(typeof started.session, 'string')
		const stop = routes.find(route => route.path.endsWith('/stop'))
		const stopResponse = await stop.fetch(new Request('http://127.0.0.1/api/blobby/desktop/stop', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ session: started.session }),
		}))
		assert.equal(stopResponse.status, 200)
		const stopped = await stopResponse.json()
		assert.equal(typeof stopped.settings, 'object')
	} finally {
		manager.dispose()
		await rm(tempRoot, { recursive: true, force: true })
	}
})

test('worker startup waits for ready and rejects a helper that exits early', async () => {
	const tempRoot = await mkdtemp(path.join(tmpdir(), 'blobby-host-test-'))
	const spawn = fakeSpawn({ ready: false, autoExit: true })
	const manager = new DesktopHelperManager({ platform: 'win32', helperExists: true, parentPid: 0, tempRoot, spawn, logger: { warn: () => {}, error: () => {} } })
	try {
		await assert.rejects(manager.start(makeBundle()), error => error.status === 500)
		assert.equal(manager.session, undefined)
	} finally {
		manager.dispose()
		await rm(tempRoot, { recursive: true, force: true })
	}
})
