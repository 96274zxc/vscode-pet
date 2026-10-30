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
	console,
	setTimeout, clearTimeout, setInterval, clearInterval,
	performance, Math, Date, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, RegExp, Error, Promise,
	requestAnimationFrame: () => 0,
	cancelAnimationFrame: () => {},
	document: {
		querySelectorAll: () => [],
		createElement: () => ({ setAttribute() {}, textContent: '', remove() {} }),
		head: { append() {} },
	},
	localStorage: { getItem: () => null, setItem: () => {} },
	location: { search: '' },
	URLSearchParams,
}
vm.runInNewContext(code, sandbox)
const React = {
	createElement() {},
	Component: class { constructor(props) { this.props = props } setState() {} },
	useEffect() {}, useRef() {}, useState() {}, useCallback() {}, useSyncExternalStore() {}, Fragment: 'fragment',
}
const api = captured.factory(name => name === 'react' ? React : { createPortal: value => value })
const t = api.__test

test('base state priority matches VS Code', () => {
	assert.equal(t.getChatPetBaseState(false, false, false, false, false), 'idle')
	assert.equal(t.getChatPetBaseState(false, false, false, true, false), 'typing')
	assert.equal(t.getChatPetBaseState(false, false, false, true, true), 'sleep')
	assert.equal(t.getChatPetBaseState(true, false, false, false, true), 'rendering')
	assert.equal(t.getChatPetBaseState(false, true, false, false, true), 'clapping')
	assert.equal(t.getChatPetBaseState(false, true, true, false, true), 'idle')
	assert.equal(t.getChatPetBaseState(true, true, false, false, false), 'clapping')
})

test('rendered state lets yapping yield and dragging win', () => {
	assert.equal(t.getChatPetRenderedState('idle', 'yapping', false), 'yapping')
	assert.equal(t.getChatPetRenderedState('rendering', 'yapping', false), 'rendering')
	assert.equal(t.getChatPetRenderedState('rendering', 'love', false), 'love')
	assert.equal(t.getChatPetRenderedState('rendering', 'love', true), 'idle')
	assert.equal(t.getChatPetRenderedState('sleep', undefined, false), 'sleep')
})

test('click interactions: 1% rare, 1% yapping, no immediate repeat', () => {
	assert.equal(t.getChatPetClickInteraction(0.005), 'complete')
	assert.equal(t.getChatPetClickInteraction(0.015), 'yapping')
	const results = new Set()
	for (let i = 0; i < 100; i++) results.add(t.getChatPetClickInteraction(0.02 + (i / 100) * 0.97))
	for (const value of ['buttonPress', 'love', 'cool', 'sing', 'speechless', 'worry']) assert.ok(results.has(value), value)
	for (let i = 0; i < 50; i++) {
		const random = 0.02 + (i / 50) * 0.97
		const first = t.getChatPetClickInteraction(random, undefined)
		const second = t.getChatPetClickInteraction(random, first)
		assert.notEqual(second, first)
	}
})

test('animation frame handles loops, one-shots and reverse', () => {
	const cases = [
		[[100, 100], 50, 1, false, { frameIndex: 0, complete: false, nextFrameDelay: 50 }],
		[[100, 100], 150, 1, false, { frameIndex: 1, complete: false, nextFrameDelay: 50 }],
		[[100, 100], 200, 1, false, { frameIndex: 1, complete: true }],
		[[100, 100], 150, 1, true, { frameIndex: 0, complete: false, nextFrameDelay: 50 }],
	]
	for (const [durations, elapsed, iterations, reverse, expected] of cases) {
		assert.equal(JSON.stringify(t.getChatPetAnimationFrame(durations, elapsed, iterations, reverse)), JSON.stringify(expected))
	}
})

test('color parsing and eye contrast follow chatPetColors', () => {
	assert.equal(t.parseChatPetColor('#f80'), '#ff8800')
	assert.equal(t.parseChatPetColor(' #FF8800 '), '#ff8800')
	assert.equal(t.parseChatPetColor('stable'), 'stable')
	assert.equal(t.parseChatPetColor('#ff88'), undefined)
	assert.equal(t.getChatPetBodyColor('stable'), '#23a8f2')
	assert.equal(t.getChatPetEyeColor('stable'), '#191a1b')
	assert.equal(t.getChatPetEyeColor('#000000'), '#f5f5f5')
	assert.equal(t.getChatPetBodyColor('#ff8c00'), '#ff8c00')
})

test('throw velocity clamps and rejects slow gestures', () => {
	const now = 1000
	assert.equal(t.getChatPetThrowVelocity([{ x: 0, y: 0, time: now }], now), undefined)
	assert.equal(t.getChatPetThrowVelocity([
		{ x: 0, y: 0, time: now - 1000 },
		{ x: 1, y: 0, time: now },
	], now), undefined)
	const fast = t.getChatPetThrowVelocity([
		{ x: 0, y: 0, time: now - 50 },
		{ x: 100, y: 0, time: now },
	], now)
	assert.ok(fast)
	assert.equal(fast.x, 2000)
	const capped = t.getChatPetThrowVelocity([
		{ x: 0, y: 0, time: now - 10 },
		{ x: 100, y: 0, time: now },
	], now)
	assert.equal(Math.round(capped.x), 2400)
})

test('throw motion applies gravity and wall rebound', () => {
	const step = t.advanceChatPetThrow(
		{ left: 50, top: 100, x: -1000, y: -500, rotation: 0 },
		100,
		{ minimumLeft: 0, maximumLeft: 100, minimumTop: 0 },
	)
	assert.equal(step.left, 0)
	assert.equal(step.wall, 'left')
	assert.ok(step.y > -500)
	const bounced = t.getChatPetWallReboundVelocity({ x: -1000, y: 300 })
	assert.equal(bounced.x, 200)
	assert.equal(bounced.y, 300)
})

test('landing prefers a platform under the center then floor', () => {
	const platform = { left: 0, right: 200, top: 300 }
	const landing = t.getChatPetThrowLanding(0, 0, 100, 400, 48, 48, [platform], 500)
	assert.equal(landing.top, 252)
	assert.equal(landing.platform, platform)
	const floor = t.getChatPetThrowLanding(300, 0, 300, 500, 48, 48, [platform], 452)
	assert.equal(floor.platform, undefined)
	assert.equal(floor.top, 452)
})

test('scale, horizontal position and wide sprites clamp exactly', () => {
	assert.equal(t.getChatPetScale(1, -0.2), 0.8)
	assert.equal(t.getChatPetScale(0.4, -0.2), 0.4)
	assert.equal(t.getChatPetDefaultHorizontalPosition(0, 200), 168)
	assert.equal(t.getChatPetHorizontalPosition(-10, 0, 200), 0)
	assert.equal(t.getChatPetHorizontalPosition(300, 0, 200), 200)
	assert.equal(t.getChatPetWideSpriteHorizontalOffset('typing', 'right', 700, 748, 100, 740, 1), -44)
})

test('accessory rig frames expose the documented poses', () => {
	assert.equal(t.getChatPetAccessoryRigFrame('sleep', 4).pose, 'sleeping')
	assert.equal(t.getChatPetAccessoryRigFrame('jump', 2).pose, 'airborne')
	assert.equal(t.getChatPetAccessoryRigFrame('wallImpact', 0).pose, 'impact')
	assert.equal(t.getChatPetAccessoryRigFrame('splat', 1).pose, 'splat')
	assert.equal(t.getChatPetAccessoryRigFrame('love', 2).head, undefined)
	assert.equal(t.getChatPetAccessoryRigFrame('sing', 0).rightEye.y, 72)
	assert.equal(t.getChatPetReducedMotionRigFrame('sleep'), 4)
})

test('client apply registers /blobby and /vscode-pet with availability', () => {
	const contributions = []
	const commandUi = {
		register(value) {
			contributions.push(value)
			return () => {}
		},
	}
	const effect = fn => { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {} }
	const ctx = {
		effect,
		locale: { register: () => () => {}, bind: () => key => key },
		slots: { inject: (_name, fn) => { fn(); return () => {} }, register: () => () => {} },
		inject: (_services, fn) => fn({ commandUi, effect, get: name => name === 'locale' ? ctx.locale : undefined }),
		get: name => name === 'locale' ? ctx.locale : undefined,
	}
	api.apply(ctx)
	assert.equal(contributions.length, 2)
	const blobby = contributions.find(value => value.name === 'blobby')
	const toggle = contributions.find(value => value.name === 'vscode-pet')
	assert.ok(blobby)
	assert.ok(toggle)
	for (const contribution of [blobby, toggle]) {
		assert.equal(typeof contribution.available, 'function')
		assert.equal(contribution.available({}), true)
		assert.equal(contribution.ui.kind, 'action')
	}
	assert.equal(toggle.description(), 'Show or hide the Blobby pet on the composer.')
})

test('preferences normalize unsafe values', () => {	const prefs = t.normalizeChatPetPrefs({
		color: '#abc', accessory: 'not-a-hat', scale: -1, horizontal: { edge: 'left', inset: 'x' },
		achievementSeen: ['not-real', 'blobby'], trueNameUnlocked: 1, jumpHighScore: -3,
	})
	assert.equal(prefs.color, '#aabbcc')
	assert.equal(prefs.accessory, null)
	assert.equal(prefs.scale, 0.4)
	assert.equal(JSON.stringify(prefs.horizontal), JSON.stringify({ edge: 'left', inset: 32 }))
	assert.equal(JSON.stringify(prefs.achievementSeen), JSON.stringify(['blobby']))
	assert.equal(prefs.trueNameUnlocked, false)
	assert.equal(prefs.jumpHighScore, 0)
	assert.equal(prefs.visible, true)
	assert.equal(t.normalizeChatPetPrefs({ visible: false }).visible, false)
	assert.equal(t.normalizeChatPetPrefs(undefined).color, 'insiders')
})
