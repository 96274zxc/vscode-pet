/* Pure desktop-display protocol helpers shared by the host routes and the helper manager. */

export const DESKTOP_PROTOCOL = 1
export const DESKTOP_PLATFORM = 'win32'
export const DESKTOP_ROUTE = '/api/blobby/desktop'
export const DESKTOP_STATES = [
	'idle', 'sleep', 'waking', 'typing', 'rendering', 'painting', 'achievementUnlocked',
	'buttonPress', 'complete', 'love', 'clapping', 'jump', 'cool', 'yapping',
	'yappingMouthOpen', 'sing', 'speechless', 'worry', 'dizzy', 'falling', 'wallImpact',
	'splat', 'onTheRun', 'searching', 'searchingDown',
]
export const DESKTOP_STATE_SET = new Set(DESKTOP_STATES)
export const DESKTOP_COMMANDS = new Set(['hats', 'color', 'jump'])
export const DESKTOP_MENU_LABEL_KEYS = [
	'menu.hats', 'menu.playJump', 'menu.goOnTheRun', 'menu.comeBack',
	'menu.grow', 'menu.shrink', 'menu.resetSize', 'menu.changeColor',
	'menu.desktopDisplay', 'menu.smartHide',
]
export const DESKTOP_MAX_BUNDLE_BYTES = 12 * 1024 * 1024
export const DESKTOP_MAX_FRAME_BYTES = 4 * 1024 * 1024
export const DESKTOP_MAX_FRAME_DIMENSION = 512
export const DESKTOP_MAX_FRAMES_PER_STATE = 64
export const DESKTOP_MAX_DURATION_MS = 60000
export const DESKTOP_MAX_LABEL_LENGTH = 200
export const DESKTOP_MAX_SCALE = 8
export const DESKTOP_MIN_SCALE = 0.2

const PNG_DATA_PREFIX = 'data:image/png;base64,'
const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i

export function httpError(status, message) {
	const error = new Error(message)
	error.status = status
	return error
}

export function isDesktopSessionId(value) {
	return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value)
}

export function isDesktopRequestSupported(platform, helperExists) {
	return platform === DESKTOP_PLATFORM && helperExists === true
}

export function isDesktopCommand(value) {
	return typeof value === 'string' && DESKTOP_COMMANDS.has(value)
}

function isRecord(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readNumber(value, fallback, minimum, maximum) {
	if (!Number.isFinite(value)) return fallback
	const number = Number(value)
	if (number < minimum || number > maximum) return fallback
	return number
}

function readRequiredNumber(value, message, minimum, maximum) {
	const number = Number(value)
	if (!Number.isFinite(number) || number < minimum || number > maximum) throw httpError(400, message)
	return number
}

function readBoolean(value, fallback) {
	return typeof value === 'boolean' ? value : fallback
}

export function normalizeDesktopHorizontal(value) {
	if (!isRecord(value)) return null
	const edge = value.edge === 'left' ? 'left' : 'right'
	const inset = Number.isFinite(value.inset) ? Math.max(0, Math.min(100000, Number(value.inset))) : 32
	return { edge, inset }
}

export function normalizeDesktopSettings(raw) {
	const source = isRecord(raw) ? raw : {}
	return {
		scale: readNumber(source.scale, 1, DESKTOP_MIN_SCALE, DESKTOP_MAX_SCALE),
		smartHide: readBoolean(source.smartHide, false),
		onTheRun: readBoolean(source.onTheRun, false),
		motionReduced: readBoolean(source.motionReduced, false),
		horizontal: normalizeDesktopHorizontal(source.horizontal),
		desktopDisplay: readBoolean(source.desktopDisplay, true),
	}
}

export function mergeDesktopSettings(current, patch) {
	const next = { ...normalizeDesktopSettings(current) }
	if (!isRecord(patch)) return next
	if (Number.isFinite(patch.scale)) next.scale = readNumber(patch.scale, next.scale, DESKTOP_MIN_SCALE, DESKTOP_MAX_SCALE)
	if (typeof patch.smartHide === 'boolean') next.smartHide = patch.smartHide
	if (typeof patch.onTheRun === 'boolean') next.onTheRun = patch.onTheRun
	if (typeof patch.motionReduced === 'boolean') next.motionReduced = patch.motionReduced
	if (typeof patch.desktopDisplay === 'boolean') next.desktopDisplay = patch.desktopDisplay
	if (patch.horizontal !== undefined) next.horizontal = normalizeDesktopHorizontal(patch.horizontal)
	return next
}

export function normalizeDesktopFacts(raw) {
	const source = isRecord(raw) ? raw : {}
	const facts = {
		running: readBoolean(source.running, false),
		pendingInteraction: readBoolean(source.pendingInteraction, false),
	}
	if (readBoolean(source.grabbing, false)) facts.grabbing = true
	if (isRecord(source.theme)) facts.theme = normalizeDesktopTheme(source.theme)
	if (isRecord(source.labels)) {
		try {
			facts.labels = normalizeDesktopLabels(source.labels)
		} catch (ignored) {
			/* keep the last labels; a transient translation should not fail facts */
		}
	}
	if (isRecord(source.petRect)) {
		const left = Number(source.petRect.left)
		const top = Number(source.petRect.top)
		const width = Number(source.petRect.width)
		const height = Number(source.petRect.height)
		if ([left, top, width, height].every(Number.isFinite) && width > 0 && height > 0) {
			facts.petRect = { left, top, width, height }
		}
	}
	return facts
}

export function normalizeDesktopWindowRect(raw) {
	if (!isRecord(raw)) return undefined
	const x = Number(raw.x)
	const y = Number(raw.y)
	const width = Number(raw.width)
	const height = Number(raw.height)
	if (![x, y, width, height].every(Number.isFinite)) return undefined
	if (width <= 0 || height <= 0 || width > 100000 || height > 100000) return undefined
	return { x, y, width, height }
}

export function normalizeDesktopLabels(raw) {
	const source = isRecord(raw) ? raw : {}
	const labels = {}
	for (const key of DESKTOP_MENU_LABEL_KEYS) {
		const value = source[key]
		if (typeof value !== 'string' || value.length === 0 || value.length > DESKTOP_MAX_LABEL_LENGTH) {
			throw httpError(400, `desktop label ${key} is invalid`)
		}
		labels[key] = value
	}
	return labels
}

function normalizeColor(value, fallback) {
	return typeof value === 'string' && HEX_COLOR.test(value.trim()) ? value.trim() : fallback
}

export function normalizeDesktopTheme(raw) {
	const source = isRecord(raw) ? raw : {}
	return {
		dark: readBoolean(source.dark, true),
		menuBackground: normalizeColor(source.menuBackground, '#26272b'),
		menuText: normalizeColor(source.menuText, '#f2f3f5'),
		menuMuted: normalizeColor(source.menuMuted, '#9a9ca3'),
		menuHover: normalizeColor(source.menuHover, '#3a3b40'),
		menuBorder: normalizeColor(source.menuBorder, '#414248'),
		accent: normalizeColor(source.accent, '#4d6bfe'),
	}
}

export function normalizeDesktopModel(raw) {
	if (!isRecord(raw)) throw httpError(400, 'desktop model is missing')
	const timings = isRecord(raw.timings) ? raw.timings : undefined
	const physics = isRecord(raw.physics) ? raw.physics : undefined
	const sizes = isRecord(raw.sizes) ? raw.sizes : undefined
	const chances = isRecord(raw.chances) ? raw.chances : undefined
	if (!timings || !physics || !sizes || !chances) throw httpError(400, 'desktop model sections are missing')
	const readSection = (section, keys, minimum, maximum, label) => {
		const output = {}
		for (const key of keys) output[key] = readRequiredNumber(section[key], `desktop model ${label}.${key} is invalid`, minimum, maximum)
		return output
	}
	const clickInteractions = Array.isArray(raw.clickInteractions)
		? raw.clickInteractions.filter(state => typeof state === 'string' && DESKTOP_STATE_SET.has(state))
		: []
	if (clickInteractions.length === 0) throw httpError(400, 'desktop model clickInteractions is invalid')
	return {
		timings: readSection(timings, ['idleSleep', 'confirmation', 'transient', 'complete', 'buttonPress', 'splat', 'love', 'cool', 'sing', 'speechless', 'worry', 'dizzy', 'waking', 'achievement', 'respawn', 'respawnReduced', 'wallImpact'], 0, 600000, 'timings'),
		physics: readSection(physics, ['gravity', 'maxFrameDuration', 'maxDuration', 'wallRestitution', 'ceilingRestitution', 'rotationPerPixel', 'selfRightingStartVelocity', 'selfRightingSpeed', 'minThrowVelocity', 'maxThrowVelocity', 'velocitySampleDuration', 'releaseGraceDuration', 'mouseBounceReleaseGrace', 'bounceResult', 'mouseBounceMinUpwardVelocity', 'mouseBounceMaxUpwardVelocity', 'mouseBounceVerticalRestitution', 'mouseBounceUpwardTransfer', 'mouseBounceHorizontalRetention', 'mouseBounceHorizontalTransfer', 'mouseBounceEdgeKick', 'mouseBounceMaxHorizontalVelocity'], -1000000, 1000000, 'physics'),
		sizes: readSection(sizes, ['display', 'source', 'minScale', 'scaleStep', 'defaultInset', 'respawnDrop', 'dragThreshold'], 0, 100000, 'sizes'),
		chances: readSection(chances, ['rare', 'yapping'], 0, 1, 'chances'),
		clickInteractions,
	}
}

function normalizeFrameList(frames, durations, label, width, height) {
	if (!Array.isArray(frames) || frames.length === 0 || frames.length > DESKTOP_MAX_FRAMES_PER_STATE) {
		throw httpError(400, `desktop ${label} frame list is invalid`)
	}
	if (!Array.isArray(durations) || durations.length !== frames.length) {
		throw httpError(400, `desktop ${label} durations are invalid`)
	}
	const normalizedDurations = durations.map((value, index) => readRequiredNumber(value, `desktop ${label} duration ${index} is invalid`, 0, DESKTOP_MAX_DURATION_MS))
	let bytes = 0
	for (const frame of frames) {
		if (typeof frame !== 'string' || !frame.startsWith(PNG_DATA_PREFIX)) throw httpError(400, `desktop ${label} frames must be PNG data URLs`)
		bytes += frame.length
		if (bytes > DESKTOP_MAX_BUNDLE_BYTES) throw httpError(400, `desktop ${label} frames are too large`)
	}
	return {
		width: readRequiredNumber(width, `desktop ${label} width is invalid`, 1, DESKTOP_MAX_FRAME_DIMENSION),
		height: readRequiredNumber(height, `desktop ${label} height is invalid`, 1, DESKTOP_MAX_FRAME_DIMENSION),
		durations: normalizedDurations,
		frames,
	}
}

function normalizeStateEntry(raw, state) {
	if (!isRecord(raw)) throw httpError(400, `desktop state ${state} is invalid`)
	const right = normalizeFrameList(raw.right, raw.durations, `state ${state}`, raw.width, raw.height)
	const output = {
		width: right.width,
		height: right.height,
		durations: right.durations,
		loop: readBoolean(raw.loop, false),
		mirror: raw.mirror !== false,
		right: right.frames,
	}
	if (output.mirror === false) {
		const left = normalizeFrameList(raw.left, raw.durations, `state ${state} left`, raw.width, raw.height)
		output.left = left.frames
	}
	return output
}

export function validateDesktopBundle(raw) {
	if (!isRecord(raw)) throw httpError(400, 'desktop bundle is missing')
	if (raw.protocol !== DESKTOP_PROTOCOL) throw httpError(400, 'desktop bundle protocol is unsupported')
	const settings = normalizeDesktopSettings(raw.settings)
	const facts = normalizeDesktopFacts(raw.facts)
	const labels = normalizeDesktopLabels(raw.labels)
	const theme = normalizeDesktopTheme(raw.theme)
	const model = normalizeDesktopModel(raw.model)
	const windowRect = normalizeDesktopWindowRect(raw.windowRect)
	const frameKey = typeof raw.frameKey === 'string' ? raw.frameKey.slice(0, 200) : ''
	if (!isRecord(raw.states)) throw httpError(400, 'desktop states are missing')
	const states = {}
	let totalBytes = 0
	for (const [state, entry] of Object.entries(raw.states)) {
		if (!DESKTOP_STATE_SET.has(state)) throw httpError(400, `desktop state ${state} is unknown`)
		const normalized = normalizeStateEntry(entry, state)
		states[state] = normalized
		totalBytes += normalized.right.join('').length + (normalized.left ? normalized.left.join('').length : 0)
		if (totalBytes > DESKTOP_MAX_BUNDLE_BYTES) throw httpError(400, 'desktop bundle is too large')
	}
	if (!states.idle) throw httpError(400, 'desktop bundle needs idle frames')
	const bubble = normalizeEffect(raw.bubble, 'bubble')
	const respawn = normalizeEffect(raw.respawn, 'respawn')
	if (totalBytes > DESKTOP_MAX_BUNDLE_BYTES) throw httpError(400, 'desktop bundle is too large')
	return { protocol: DESKTOP_PROTOCOL, frameKey, settings, facts, labels, theme, model, windowRect, states, bubble, respawn }
}

function normalizeEffect(raw, label) {
	if (!isRecord(raw)) throw httpError(400, `desktop ${label} is missing`)
	const frames = normalizeFrameList(raw.frames, raw.durations, label, raw.width, raw.height)
	return {
		width: frames.width,
		height: frames.height,
		durations: frames.durations,
		loop: readBoolean(raw.loop, label === 'bubble'),
		frames: frames.frames,
	}
}

export function decodeDesktopPng(value) {
	if (typeof value !== 'string' || !value.startsWith(PNG_DATA_PREFIX)) throw httpError(400, 'desktop frame is not a PNG data URL')
	const base64 = value.slice(PNG_DATA_PREFIX.length)
	if (base64.length > DESKTOP_MAX_FRAME_BYTES * 4 / 3 + 8) throw httpError(400, 'desktop frame is too large')
	let buffer
	try {
		buffer = Buffer.from(base64, 'base64')
	} catch (ignored) {
		throw httpError(400, 'desktop frame base64 is invalid')
	}
	if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47 || buffer.readUInt32BE(4) !== 0x0d0a1a0a) {
		throw httpError(400, 'desktop frame is not a PNG image')
	}
	return buffer
}

export function sanitizeDesktopCommand(value) {
	return isDesktopCommand(value) ? value : undefined
}
