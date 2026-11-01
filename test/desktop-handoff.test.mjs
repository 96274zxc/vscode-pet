import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const code = await readFile(path.join(root, 'client.js'), 'utf8')
let captured
const listeners = new Map()
const documentMock = {
	hidden: false,
	hasFocus: () => false,
	addEventListener: (type, handler) => listeners.set(type, handler),
	removeEventListener: type => listeners.delete(type),
	querySelectorAll: () => [],
	createElement: () => ({ style: {}, setAttribute() {}, append() {}, remove() {}, textContent: '' }),
	head: { append() {} },
	documentElement: { lang: 'en' },
	body: { append() {} },
}
const windowMock = {
	__ModuleLoader__: { load: value => { captured = value } },
	addEventListener: () => {},
	removeEventListener: () => {},
	matchMedia: () => ({ matches: false }),
}
const sandbox = {
	window: windowMock,
	console,
	setTimeout, clearTimeout, setInterval, clearInterval,
	performance, Math, Date, JSON, Map, Set, WeakMap, Array, Object, Number, String, Boolean, RegExp, Error, Promise,
	requestAnimationFrame: () => 0,
	cancelAnimationFrame: () => {},
	document: documentMock,
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

function makeBridge() {
	const state = { ...t.normalizeChatPetPrefs({ desktopDisplay: true }) }
	const bridge = new t.ChatPetDesktopBridge({
		controller: { hasInput: true },
		host: { status() {}, openPanel() {} },
		prefs: {
			get: () => state,
			set() {},
			setSilent() {},
			subscribe: () => () => {},
		},
		getT: () => undefined,
	})
	bridge.supported = true
	bridge._preparedSession = 'session'
	return bridge
}

test('blur keeps the pet in the window while DSH stays visible and uncovered', async () => {
	documentMock.hidden = false
	let started = 0
	const bridge = makeBridge()
	bridge.start = () => { started++ }
	bridge._request = async () => ({ ok: true, visible: true, iconic: false, foreground: false, covered: false })
	assert.equal(await bridge._handoffDecision(), 'stay')
	await bridge._requestHandoff()
	assert.equal(started, 0)
	assert.ok(bridge._handoffTimer, 'a monitor keeps watching the window')
	bridge._stopHandoffMonitor()
})

test('a covered or minimized DSH hands the pet to the desktop', async () => {
	documentMock.hidden = false
	let started = 0
	const bridge = makeBridge()
	bridge.start = () => { started++ }
	bridge._request = async () => ({ ok: true, visible: true, iconic: false, foreground: false, covered: true })
	assert.equal(await bridge._handoffDecision(), true)
	await bridge._requestHandoff()
	assert.equal(started, 1)

	documentMock.hidden = true
	const minimized = makeBridge()
	minimized.start = () => { started++ }
	minimized._request = async () => { throw new Error('should not probe a hidden document') }
	assert.equal(await minimized._handoffDecision(), true)
	documentMock.hidden = false
})

test('a focused or vanished DSH never starts the desktop helper', async () => {
	documentMock.hidden = false
	let started = 0
	const bridge = makeBridge()
	bridge.start = () => { started++ }
	bridge._request = async () => ({ ok: true, visible: true, iconic: false, foreground: true, covered: false })
	assert.equal(await bridge._handoffDecision(), 'skip')
	await bridge._requestHandoff()
	assert.equal(started, 0)
	// Without a prepared helper or with a failed probe the old focus-based
	// behavior is kept instead of silently doing nothing.
	bridge._preparedSession = undefined
	assert.equal(await bridge._handoffDecision(), true)
	bridge._preparedSession = 'session'
	bridge._request = async () => { throw new Error('no probe route') }
	assert.equal(await bridge._handoffDecision(), true)
})

test('document focus gates the forwarded typing facts', () => {
	documentMock.hasFocus = () => true
	assert.equal(t.isChatPetDocumentFocused(), true)
	assert.equal(t.shouldSyncChatPetDesktopInput({ hasInput: true }, t.isChatPetDocumentFocused()), true)
	documentMock.hasFocus = () => false
	assert.equal(t.isChatPetDocumentFocused(), false)
	assert.equal(t.shouldSyncChatPetDesktopInput({ hasInput: true }, t.isChatPetDocumentFocused()), false)
})
