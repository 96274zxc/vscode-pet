import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const code = await readFile(path.join(root, 'client.js'), 'utf8')
let captured
const sandbox = {
	window: { __ModuleLoader__: { load: value => { captured = value } } },
	console, setTimeout, clearTimeout, setInterval, clearInterval,
	performance, Math, Date, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, RegExp, Error, Promise,
	requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
	document: { createElement: () => ({ getContext: () => null }) },
	localStorage: { getItem: () => null, setItem: () => {} },
}
vm.runInNewContext(code, sandbox)
const React = { createElement() {}, Component: class { constructor(props) { this.props = props } setState() {} }, useEffect() {}, useRef() {}, useState() {}, useCallback() {}, useSyncExternalStore() {}, Fragment: 'fragment' }
const api = captured.factory(name => name === 'react' ? React : { createPortal: value => value })
const Model = api.__test.ChatPetJumpGameModel

function seeded(seed = 7) {
	let value = seed
	return () => {
		value = (value * 1664525 + 1013904223) >>> 0
		return value / 0x100000000
	}
}

test('jump game generates a climbable, deterministic platform run', () => {
	const model = new Model(320, 48, 160, seeded(3))
	model.ensurePlatforms(1600)
	assert.ok(model.platforms.length >= 4)
	for (let index = 1; index < model.platforms.length; index++) {
		assert.ok(model.platforms[index].height > model.platforms[index - 1].height)
		assert.ok(model.platforms[index].width >= 48)
	}
	const kinds = new Set(model.platforms.map(platform => platform.kind))
	assert.ok(kinds.has('static'))
	assert.ok(model.platforms.every(platform => platform.left >= 0 && platform.left + platform.width <= 320 + 1e-6))
})

test('charging and releasing launches the pet', () => {
	const model = new Model(320, 48, 160, seeded(9))
	assert.equal(model.player.platform, 0)
	model.setChargeHeld(true)
	for (let i = 0; i < 10; i++) model.advance(100)
	assert.ok(model.charge > 0.9)
	model.setChargeHeld(false)
	assert.equal(model.player.platform, undefined)
	assert.ok(model.player.velocityY > 0)
	const height = model.player.height
	for (let i = 0; i < 3; i++) model.advance(100)
	assert.ok(model.player.height > height)
})

test('direction hop uses horizontal speed while charging', () => {
	const model = new Model(320, 48, 160, seeded(11))
	model.setChargeHeld(true)
	for (let i = 0; i < 5; i++) model.advance(100)
	model.hop(1)
	assert.equal(model.direction, 1)
	model.setChargeHeld(false)
	assert.ok(model.player.velocityX > 0)
	assert.equal(model.player.platform, undefined)
})

test('resize keeps the player and platforms inside the new field', () => {
	const model = new Model(320, 48, 160, seeded(13))
	model.ensurePlatforms(800)
	model.advance(500)
	model.resize(500)
	assert.ok(model.width === 500)
	assert.ok(model.player.x >= 24 && model.player.x <= 476)
	for (const platform of model.platforms) {
		assert.ok(platform.left >= -1e-6)
		assert.ok(platform.left + platform.width <= 500 + 1e-6)
	}
})

test('falling past the starting platform reports hasFallen', () => {
	const model = new Model(320, 48, 100, seeded(15))
	model.setChargeHeld(true)
	for (let i = 0; i < 10; i++) model.advance(100)
	model.hop(-1)
	model.setChargeHeld(false)
	for (let i = 0; i < 120; i++) model.advance(100)
	assert.equal(model.hasFallen, true)
})
