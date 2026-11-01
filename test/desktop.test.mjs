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
	Component: class {
		constructor(props) { this.props = props }
		setState() {}
	},
	useEffect() {}, useRef() {}, useState() {}, useCallback() {}, useSyncExternalStore() {}, Fragment: 'fragment',
}
const api = captured.factory(name => name === 'react' ? React : { createPortal: value => value })
const t = api.__test

test('desktop display is gated to Windows desktop applications', () => {
	assert.equal(t.isChatPetDesktopPlatform('Win32'), true)
	assert.equal(t.isChatPetDesktopPlatform('Windows'), true)
	assert.equal(t.isChatPetDesktopPlatform('MacIntel'), false)
	assert.equal(t.isChatPetDesktopPlatform(''), false)
	assert.equal(t.isChatPetDesktopSupported({ platform: 'Win32', desktopApp: true }), true)
	assert.equal(t.isChatPetDesktopSupported({ platform: 'Win32', desktopApp: false }), false)
	assert.equal(t.isChatPetDesktopSupported({ platform: 'MacIntel', desktopApp: true }), false)
	assert.equal(t.isChatPetDesktopSupported({ platform: 'Win32' }), false)
})

test('desktop geometry follows the work area and auto-hidden taskbar', () => {
	const workRect = { left: 0, top: 0, right: 2560, bottom: 1400 }
	const monitorRect = { left: 0, top: 0, right: 2560, bottom: 1440 }
	const visible = t.getChatPetDesktopGeometry({ workRect, monitorRect, displaySize: 48, inset: 32, autoHideTaskbar: false })
	assert.equal(visible.floorY, 1400)
	assert.equal(visible.restingTop, 1352)
	assert.equal(visible.defaultLeft, 2480)
	assert.equal(visible.maximumLeft, 2512)
	assert.equal(visible.dropTop, 992)
	const hidden = t.getChatPetDesktopGeometry({ workRect, monitorRect, displaySize: 48, inset: 32, autoHideTaskbar: true })
	assert.equal(hidden.floorY, 1440)
	assert.equal(hidden.restingTop, 1392)
	assert.equal(hidden.dropTop, 1032)
	const anchored = t.getChatPetDesktopGeometry({ workRect: { left: 100, top: 20, right: 900, bottom: 700 }, monitorRect: { left: 0, top: 0, right: 1000, bottom: 800 }, displaySize: 48, inset: 10 })
	assert.equal(anchored.floorY, 700)
	assert.equal(anchored.defaultLeft, 842)
	assert.equal(t.getChatPetDesktopAnchoredLeft({ edge: 'left', inset: 10 }, anchored), 110)
	assert.equal(t.getChatPetDesktopAnchoredLeft({ edge: 'right', inset: 10 }, anchored), 842)
	const anchor = t.getChatPetDesktopHorizontalAnchor(110, anchored)
	assert.equal(anchor.edge, 'left')
	assert.equal(anchor.inset, 10)
	assert.equal(t.getChatPetDesktopGeometry({}), undefined)
})

test('desktop frame plan mirrors the windowed animations', () => {
	const plan = t.getChatPetDesktopFramePlan('insiders')
	const states = Object.keys(plan)
	assert.ok(states.includes('idle'))
	assert.ok(states.includes('falling'))
	assert.ok(states.includes('respawn') === false)
	const idle = plan.idle
	assert.equal(idle.frames.length, 2)
	assert.equal(idle.frames.map(frame => frame.index).join(','), '0,20')
	assert.equal(idle.frames.map(frame => frame.duration).join(','), '800,1200')
	assert.equal(idle.width, 96)
	assert.equal(idle.height, 96)
	assert.equal(idle.mirror, true)
	assert.equal(plan.sing.mirror, false)
	assert.equal(plan.sing.frames.length, 4)
	assert.equal(plan.typing.width, 168)
	assert.equal(plan.painting.width, 192)
	assert.equal(plan.dizzy.height, 128)
	assert.equal(plan.yapping.frames.length, 1)
	assert.equal(plan.yappingMouthOpen.frames.length, 1)
	assert.equal(plan.sleep.frames.length, 8)
	assert.equal(plan.falling.frames.length, 6)
	assert.equal(plan.wallImpact.frames.length, 1)
	assert.equal(plan.onTheRun.frames.length, 1)
	assert.ok(plan.complete.tracksCursor === false)
	assert.ok(plan.clapping.tracksCursor === true)
	assert.ok(states.includes('dragging'))
	assert.equal(plan.dragging.key, 'dragging')
	assert.equal(plan.dragging.state, 'idle')
	assert.equal(plan.dragging.eyeState, 'dragging')
	assert.equal(plan.dragging.tracksCursor, false)
	assert.equal(plan.dragging.frames, plan.idle.frames)
})

test('desktop model carries the shared timings, physics and menu labels', () => {
	const model = t.getChatPetDesktopModel()
	assert.equal(model.timings.idleSleep, 20000)
	assert.equal(model.timings.confirmation, 2000)
	assert.equal(model.timings.respawn, 800)
	assert.equal(model.physics.gravity, 1800)
	assert.equal(model.physics.selfRightingStartVelocity, -450)
	assert.equal(model.physics.mouseBounceMaxUpwardVelocity, 1800)
	assert.equal(model.sizes.display, 48)
	assert.equal(model.sizes.respawnDrop, 360)
	assert.equal(model.chances.rare, 0.01)
	assert.equal(model.chances.yapping, 0.01)
	assert.equal(model.clickInteractions.join(','), 'buttonPress,love,cool,sing,speechless,worry')
	const labels = t.getChatPetDesktopMenuLabels(key => key)
	assert.equal(Object.keys(labels).length, 10)
	assert.equal(labels['menu.desktopDisplay'], 'Show on Desktop')
	assert.equal(labels['menu.smartHide'], 'Smart Hide')
})

test('canvas color serialization parses both hex and rgb forms', () => {
	// Canvas returns opaque colors as #rrggbb and translucent ones as rgba(...);
	// parsing only the latter dropped the light theme's dark text colors.
	const hex = t.normalizeDesktopSerializedColor('#0f1115')
	assert.equal(hex.r, 15)
	assert.equal(hex.g, 17)
	assert.equal(hex.b, 21)
	assert.equal(hex.a, 1)
	const shortHex = t.normalizeDesktopSerializedColor('#FFF')
	assert.equal(shortHex.r, 255)
	assert.equal(shortHex.g, 255)
	assert.equal(shortHex.b, 255)
	const hexAlpha = t.normalizeDesktopSerializedColor('#f8f9fa94')
	assert.equal(hexAlpha.r, 248)
	assert.equal(hexAlpha.g, 249)
	assert.equal(hexAlpha.b, 250)
	assert.ok(Math.abs(hexAlpha.a - 148 / 255) < 1e-9)
	const rgb = t.normalizeDesktopSerializedColor('rgb(255, 255, 255)')
	assert.equal(rgb.r, 255)
	assert.equal(rgb.a, 1)
	const rgba = t.normalizeDesktopSerializedColor('rgba(38, 49, 72, 0.06)')
	assert.equal(rgba.r, 38)
	assert.equal(rgba.g, 49)
	assert.equal(rgba.b, 72)
	assert.equal(rgba.a, 0.06)
	assert.equal(t.normalizeDesktopSerializedColor('#12345'), undefined)
	assert.equal(t.normalizeDesktopSerializedColor('not-a-color'), undefined)
	assert.equal(t.normalizeDesktopSerializedColor(undefined), undefined)
})

test('desktop preferences default off and normalize safely', () => {
	const defaults = t.normalizeChatPetPrefs(undefined)
	assert.equal(defaults.desktopDisplay, false)
	assert.equal(defaults.desktopSmartHide, false)
	assert.equal(defaults.desktopHorizontal, null)
	const enabled = t.normalizeChatPetPrefs({
		desktopDisplay: true,
		desktopSmartHide: true,
		desktopHorizontal: { edge: 'left', inset: 12 },
	})
	assert.equal(enabled.desktopDisplay, true)
	assert.equal(enabled.desktopSmartHide, true)
	assert.equal(enabled.desktopHorizontal.edge, 'left')
	assert.equal(enabled.desktopHorizontal.inset, 12)
	const unsafe = t.normalizeChatPetPrefs({
		desktopDisplay: 1,
		desktopSmartHide: 'yes',
		desktopHorizontal: { edge: 'middle', inset: -10 },
	})
	assert.equal(unsafe.desktopDisplay, false)
	assert.equal(unsafe.desktopSmartHide, false)
	assert.equal(unsafe.desktopHorizontal.edge, 'right')
	assert.equal(unsafe.desktopHorizontal.inset, 0)
})

test('desktop locale keys stay in sync', () => {
	for (const language of ['en', 'zh']) {
		const dictionary = t.CHAT_PET_LOCALE[language]
		for (const key of ['menu.desktopDisplay', 'menu.smartHide', 'status.desktopEnabled', 'status.desktopDisabled', 'status.desktopError', 'status.smartHideOn', 'status.smartHideOff']) {
			assert.equal(typeof dictionary[key], 'string', `${language}:${key}`)
			assert.ok(dictionary[key].length > 0, `${language}:${key}`)
		}
	}
	assert.notEqual(t.CHAT_PET_LOCALE.en['menu.desktopDisplay'], t.CHAT_PET_LOCALE.zh['menu.desktopDisplay'])
})
