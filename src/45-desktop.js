/* Windows desktop display: platform gate, desktop geometry, frame bundles and the client bridge. */

const CHAT_PET_DESKTOP_PROTOCOL = 1
const CHAT_PET_DESKTOP_ROUTE = '/api/blobby/desktop'
const CHAT_PET_DESKTOP_START_DEBOUNCE = 250
const CHAT_PET_DESKTOP_START_TIMEOUT = 15000
const CHAT_PET_DESKTOP_MENU_LABEL_KEYS = [
	'menu.hats', 'menu.playJump', 'menu.goOnTheRun', 'menu.comeBack',
	'menu.grow', 'menu.shrink', 'menu.resetSize', 'menu.changeColor',
	'menu.desktopDisplay', 'menu.smartHide',
]

let activeChatPetDesktopBridge

/* ------------------------------------------------------------------- gate */

function isChatPetDesktopPlatform(platform) {
	return /win/i.test(String(platform ?? ''))
}

function hasChatPetDesktopAppBridge(target = typeof window === 'undefined' ? undefined : window) {
	try {
		return Boolean(target && target.dshDesktop && typeof target.dshDesktop.deviceInfo === 'function')
	} catch (ignored) {
		return false
	}
}

function getChatPetDesktopPlatform() {
	try {
		if (typeof navigator === 'undefined') return ''
		return String(navigator.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? '')
	} catch (ignored) {
		return ''
	}
}

function isChatPetDesktopSupported(options = {}) {
	const platform = options.platform !== undefined ? options.platform : getChatPetDesktopPlatform()
	const desktopApp = options.desktopApp !== undefined ? options.desktopApp : hasChatPetDesktopAppBridge(options.window)
	return isChatPetDesktopPlatform(platform) && desktopApp === true
}

/* --------------------------------------------------------------- geometry */

function normalizeChatPetDesktopRect(rect) {
	if (!rect || typeof rect !== 'object') return undefined
	const left = Number(rect.left)
	const top = Number(rect.top)
	const right = Number(rect.right)
	const bottom = Number(rect.bottom)
	if (![left, top, right, bottom].every(Number.isFinite)) return undefined
	if (right <= left || bottom <= top) return undefined
	return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function getChatPetDesktopGeometry(options = {}) {
	const work = normalizeChatPetDesktopRect(options.workRect)
	const monitor = normalizeChatPetDesktopRect(options.monitorRect)
	if (!work && !monitor) return undefined
	const displaySize = Number.isFinite(options.displaySize) ? Math.max(1, options.displaySize) : CHAT_PET_DISPLAY_SIZE
	const autoHideTaskbar = options.autoHideTaskbar === true
	const bounds = autoHideTaskbar && monitor ? monitor : (work ?? monitor)
	const floorY = autoHideTaskbar && monitor ? monitor.bottom : (work ?? monitor).bottom
	const minimumLeft = bounds.left
	const maximumLeft = Math.max(bounds.left, bounds.right - displaySize)
	const minimumTop = bounds.top
	const restingTop = floorY - displaySize
	const maximumTop = Math.max(minimumTop, restingTop)
	const inset = Number.isFinite(options.inset) && options.inset >= 0 ? options.inset : CHAT_PET_DEFAULT_RIGHT_INSET
	const defaultLeft = Math.max(minimumLeft, maximumLeft - inset)
	const dropTop = Math.max(minimumTop, restingTop - CHAT_PET_RESPAWN_DROP)
	return {
		bounds,
		minimumLeft,
		maximumLeft,
		minimumTop,
		maximumTop,
		floorY,
		restingTop,
		defaultLeft,
		dropTop,
		displaySize,
		inset,
		autoHideTaskbar,
	}
}

function getChatPetDesktopAnchoredLeft(anchor, geometry) {
	if (!geometry) return 0
	if (!anchor || typeof anchor !== 'object') return geometry.defaultLeft
	const inset = Number.isFinite(anchor.inset) ? Math.max(0, anchor.inset) : geometry.inset
	const left = anchor.edge === 'left' ? geometry.minimumLeft + inset : geometry.maximumLeft - inset
	return getChatPetHorizontalPosition(left, geometry.minimumLeft, geometry.maximumLeft)
}

function getChatPetDesktopHorizontalAnchor(left, geometry) {
	if (!geometry) return undefined
	return getChatPetHorizontalAnchor(left, geometry.minimumLeft, geometry.maximumLeft)
}

function getChatPetDesktopWindowRect() {
	try {
		if (typeof window === 'undefined') return undefined
		const rect = {
			x: Number(window.screenX),
			y: Number(window.screenY),
			width: Number(window.outerWidth),
			height: Number(window.outerHeight),
		}
		return Object.values(rect).every(Number.isFinite) ? rect : undefined
	} catch (ignored) {
		return undefined
	}
}

/* ------------------------------------------------------------ frame plan */

function getChatPetDesktopFramePlan(variant) {
	const sources = getChatPetSpriteSources(variant)
	const plan = {}
	for (const state of CHAT_PET_STATES) {
		const source = sources[state]?.animated
		if (!source) continue
		const frames = []
		if (Array.isArray(source.frameIndices) && source.frameIndices.length > 0) {
			for (let index = 0; index < source.frameIndices.length; index++) {
				const duration = Number.isFinite(source.frameDurations?.[index]) ? source.frameDurations[index] : 0
				frames.push({ index: source.frameIndices[index], duration })
			}
		} else if (Array.isArray(source.frameDurations) && source.frameDurations.length > 0) {
			for (let index = 0; index < source.frameDurations.length; index++) {
				frames.push({ index, duration: Number.isFinite(source.frameDurations[index]) ? source.frameDurations[index] : 0 })
			}
		} else {
			frames.push({ index: 0, duration: 0 })
		}
		plan[state] = {
			key: state,
			state,
			url: source.url,
			width: source.frameWidth,
			height: source.frameHeight,
			fixedDecorations: source.fixedDecorations,
			frames,
			loop: source.iterations === Infinity,
			tracksCursor: doesChatPetStateTrackCursor(state),
			mirror: state !== 'sing',
		}
	}
	const idle = plan.idle
	if (idle) {
		// While being dragged the in-window pet renders the idle body but swaps
		// the pupils for crossed-out (X) eyes through a CSS eye overlay. The
		// desktop helper renders frames, so bake the same overlay into an extra
		// state instead of relying on DOM styles.
		plan.dragging = {
			...idle,
			key: 'dragging',
			eyeState: 'dragging',
			tracksCursor: false,
		}
	}
	return plan
}

/* ------------------------------------------------------------------ model */

function getChatPetDesktopModel() {
	return {
		timings: {
			idleSleep: CHAT_PET_IDLE_SLEEP_DELAY,
			confirmation: CHAT_PET_CONFIRMATION_ATTENTION_DURATION,
			transient: TRANSIENT_STATE_DURATION,
			complete: COMPLETE_STATE_DURATION,
			buttonPress: BUTTON_PRESS_STATE_DURATION,
			splat: SPLAT_STATE_DURATION,
			love: LOVE_STATE_DURATION,
			cool: COOL_STATE_DURATION,
			sing: SING_STATE_DURATION,
			speechless: SPEECHLESS_STATE_DURATION,
			worry: WORRY_STATE_DURATION,
			dizzy: DIZZY_STATE_DURATION,
			waking: WAKE_STATE_DURATION,
			achievement: CHAT_PET_ACHIEVEMENT_UNLOCKED_DURATION,
			respawn: RESPAWN_EFFECT_DURATION,
			respawnReduced: RESPAWN_EFFECT_REDUCED_MOTION_DURATION,
			wallImpact: CHAT_PET_WALL_IMPACT_DURATION,
		},
		physics: {
			gravity: THROW_GRAVITY,
			maxFrameDuration: THROW_MAX_FRAME_DURATION,
			maxDuration: THROW_MAX_DURATION,
			wallRestitution: THROW_WALL_RESTITUTION,
			ceilingRestitution: THROW_CEILING_RESTITUTION,
			rotationPerPixel: THROW_ROTATION_PER_PIXEL,
			selfRightingStartVelocity: THROW_SELF_RIGHTING_START_VELOCITY,
			selfRightingSpeed: THROW_SELF_RIGHTING_SPEED,
			minThrowVelocity: THROW_MIN_VELOCITY,
			maxThrowVelocity: THROW_MAX_VELOCITY,
			velocitySampleDuration: THROW_VELOCITY_SAMPLE_DURATION,
			releaseGraceDuration: THROW_RELEASE_GRACE_DURATION,
			mouseBounceReleaseGrace: CHAT_PET_MOUSE_BOUNCE_RELEASE_GRACE_DURATION,
			bounceResult: CHAT_PET_BOUNCE_RESULT_DURATION,
			mouseBounceMinUpwardVelocity: MOUSE_BOUNCE_MIN_UPWARD_VELOCITY,
			mouseBounceMaxUpwardVelocity: MOUSE_BOUNCE_MAX_UPWARD_VELOCITY,
			mouseBounceVerticalRestitution: MOUSE_BOUNCE_VERTICAL_RESTITUTION,
			mouseBounceUpwardTransfer: MOUSE_BOUNCE_UPWARD_TRANSFER,
			mouseBounceHorizontalRetention: MOUSE_BOUNCE_HORIZONTAL_RETENTION,
			mouseBounceHorizontalTransfer: MOUSE_BOUNCE_HORIZONTAL_TRANSFER,
			mouseBounceEdgeKick: MOUSE_BOUNCE_EDGE_KICK,
			mouseBounceMaxHorizontalVelocity: MOUSE_BOUNCE_MAX_HORIZONTAL_VELOCITY,
		},
		sizes: {
			display: CHAT_PET_DISPLAY_SIZE,
			source: CHAT_PET_SOURCE_SIZE,
			minScale: CHAT_PET_MIN_SCALE,
			scaleStep: CHAT_PET_SCALE_STEP,
			defaultInset: CHAT_PET_DEFAULT_RIGHT_INSET,
			respawnDrop: CHAT_PET_RESPAWN_DROP,
			dragThreshold: DRAG_THRESHOLD,
		},
		chances: {
			rare: CHAT_PET_ICON_TRANSFORMATION_CHANCE,
			yapping: CHAT_PET_YAPPING_CHANCE,
		},
		clickInteractions: ['buttonPress', 'love', 'cool', 'sing', 'speechless', 'worry'],
	}
}

function getChatPetDesktopMenuLabels(t) {
	let revision = 0
	try { revision = typeof chatPetLocaleRevision === 'number' ? chatPetLocaleRevision : 0 } catch (ignored) { revision = 0 }
	let lang = ''
	try { lang = document?.documentElement?.lang ?? '' } catch (ignored) { lang = '' }
	const key = `${revision}|${lang}`
	if (chatPetDesktopLabelsCache && chatPetDesktopLabelsKey === key) return chatPetDesktopLabelsCache
	const labels = {}
	for (const labelKey of CHAT_PET_DESKTOP_MENU_LABEL_KEYS) labels[labelKey] = translateChatPetText(t, labelKey)
	chatPetDesktopLabelsKey = key
	chatPetDesktopLabelsCache = labels
	return labels
}

let chatPetDesktopLabelsCache
let chatPetDesktopLabelsKey

let chatPetDesktopThemeCanvas

function normalizeDesktopThemeColor(value) {
	if (typeof value !== 'string' || value.trim().length === 0) return undefined
	try {
		if (!chatPetDesktopThemeCanvas) chatPetDesktopThemeCanvas = document.createElement('canvas')
		const context = chatPetDesktopThemeCanvas.getContext('2d')
		if (!context) return undefined
		context.fillStyle = '#000000'
		context.fillStyle = value.trim()
		const normalized = String(context.fillStyle)
		const match = /^rgba?\(([^)]+)\)$/.exec(normalized)
		if (!match) return undefined
		const parts = match[1].split(',').map(part => Number(part.trim()))
		if (parts.length < 3 || !parts.slice(0, 3).every(Number.isFinite)) return undefined
		return {
			r: parts[0],
			g: parts[1],
			b: parts[2],
			a: parts.length > 3 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1,
		}
	} catch (ignored) {
		return undefined
	}
}

function desktopThemeHex(color) {
	if (!color) return undefined
	const channel = value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
	return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`
}

function blendDesktopThemeColor(top, bottom) {
	if (!top) return bottom
	if (!bottom || top.a >= 1) return top
	return {
		r: top.r * top.a + bottom.r * (1 - top.a),
		g: top.g * top.a + bottom.g * (1 - top.a),
		b: top.b * top.a + bottom.b * (1 - top.a),
		a: 1,
	}
}

function computeChatPetDesktopTheme() {
	const darkPalette = {
		dark: true,
		menuBackground: '#26272b',
		menuText: '#f2f3f5',
		menuMuted: '#9a9ca3',
		menuHover: '#3a3b40',
		menuBorder: '#414248',
		accent: '#4d6bfe',
	}
	const lightPalette = {
		dark: false,
		menuBackground: '#ffffff',
		menuText: '#1f2329',
		menuMuted: '#6b7280',
		menuHover: '#f1f2f4',
		menuBorder: '#e3e5e8',
		accent: '#4d6bfe',
	}
	try {
		const documentStyle = getComputedStyle(document.documentElement)
		const bodyStyle = getComputedStyle(document.body)
		const readColor = name => normalizeDesktopThemeColor(documentStyle.getPropertyValue(name))
			?? normalizeDesktopThemeColor(bodyStyle.getPropertyValue(name))
		const colorScheme = String(documentStyle.colorScheme || documentStyle.getPropertyValue('color-scheme') || '')
		let dark = colorScheme.includes('dark') ? true : colorScheme.includes('light') ? false : undefined
		const bodyBackground = normalizeDesktopThemeColor(bodyStyle.backgroundColor)
		const base = (bodyBackground && bodyBackground.a >= 1 ? bodyBackground : undefined)
			?? readColor('--dsw-alias-bg-base')
			?? normalizeDesktopThemeColor(dark === true ? '#26272b' : '#ffffff')
		const menuSource = readColor('--dsw-specific-menu')
		const menuBackground = menuSource ? blendDesktopThemeColor(menuSource, base) : base
		if (dark === undefined && menuBackground) dark = 0.2126 * menuBackground.r + 0.7152 * menuBackground.g + 0.0722 * menuBackground.b < 128
		if (dark === undefined) dark = true
		const fallback = dark ? darkPalette : lightPalette
		const text = readColor('--dsw-alias-label-primary') ?? normalizeDesktopThemeColor(fallback.menuText)
		const muted = readColor('--dsw-alias-label-tertiary') ?? normalizeDesktopThemeColor(fallback.menuMuted)
		const hoverSource = readColor('--dsw-alias-interactive-bg-hover')
		const hover = hoverSource ? blendDesktopThemeColor(hoverSource, menuBackground) : normalizeDesktopThemeColor(fallback.menuHover)
		const borderSource = readColor('--dsw-alias-border-l1')
		const border = borderSource ? blendDesktopThemeColor(borderSource, menuBackground) : normalizeDesktopThemeColor(fallback.menuBorder)
		const accent = readColor('--dsw-alias-brand-primary') ?? normalizeDesktopThemeColor(fallback.accent)
		return {
			dark,
			menuBackground: desktopThemeHex(menuBackground),
			menuText: desktopThemeHex(text),
			menuMuted: desktopThemeHex(muted),
			menuHover: desktopThemeHex(hover),
			menuBorder: desktopThemeHex(border),
			accent: desktopThemeHex(accent),
		}
	} catch (ignored) {
		return darkPalette
	}
}

let chatPetDesktopThemeCache
let chatPetDesktopThemeCheckedAt = 0

function sameChatPetDesktopTheme(a, b) {
	return a.dark === b.dark
		&& a.menuBackground === b.menuBackground
		&& a.menuText === b.menuText
		&& a.menuMuted === b.menuMuted
		&& a.menuHover === b.menuHover
		&& a.menuBorder === b.menuBorder
		&& a.accent === b.accent
}

function getChatPetDesktopTheme() {
	const now = Date.now()
	if (chatPetDesktopThemeCache && now - chatPetDesktopThemeCheckedAt < 2000) return chatPetDesktopThemeCache
	chatPetDesktopThemeCheckedAt = now
	const next = computeChatPetDesktopTheme()
	if (!chatPetDesktopThemeCache || !sameChatPetDesktopTheme(chatPetDesktopThemeCache, next)) chatPetDesktopThemeCache = next
	return chatPetDesktopThemeCache
}

/* ---------------------------------------------------------------- painter */

function drawChatPetDesktopEyes(context, state, frameIndex, color, eyeState) {
	const resolved = eyeState ?? state
	if (resolved === 'dragging') {
		// Reuse the exact in-window eye overlay geometry: the .chat-pet-eye box
		// is 8x12 display px at (18,30)/(30,30) and .dragging adds two 8x2 lines
		// rotated +-45deg around the box center. The desktop frame is 96px for a
		// 48px display, so draw the same lines at 16x4 frame px around the same
		// centers (44,72)/(68,72) with the pet's eye color.
		context.fillStyle = getChatPetEyeColor(color)
		for (const x of [40, 64]) {
			context.save()
			context.translate(x + 4, 72)
			context.rotate(Math.PI / 4)
			context.fillRect(-8, -2, 16, 4)
			context.rotate(-Math.PI / 2)
			context.fillRect(-8, -2, 16, 4)
			context.restore()
		}
		return
	}
	if (!doesChatPetStateTrackCursor(resolved) && !doesChatPetStateBlink(resolved, frameIndex)) return
	const bobbed = (resolved === 'idle' || resolved === 'rendering' || resolved === 'achievementUnlocked') && frameIndex >= 20
	const top = 64 + (bobbed ? 4 : 0)
	context.fillStyle = getChatPetEyeColor(color)
	context.fillRect(40, top, 8, 16)
	context.fillRect(64, top, 8, 16)
}

function createChatPetDesktopCanvas(width, height) {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext('2d')
	if (!context) throw new Error('Unable to create the Blobby desktop canvas')
	context.imageSmoothingEnabled = false
	return { canvas, context }
}

function drawChatPetDesktopFrame(context, entry, bodyImage, accessoryImage, accessory, frame, color, facing, scratch) {
	context.clearRect(0, 0, entry.width, entry.height)
	drawChatPetComposite(
		context,
		bodyImage,
		accessoryImage,
		frame.index,
		frame.index,
		entry.width,
		entry.height,
		facing,
		entry.state,
		entry.fixedDecorations,
		false,
		accessory?.eyeAccessoryMirrorsWithFacing !== false,
		accessory?.coversAntennae === true,
		color,
	)
	if (accessoryImage) {
		const { canvas: eyeCanvas, context: eyeContext } = scratch ?? createChatPetDesktopCanvas(entry.width, entry.height)
		eyeContext.clearRect(0, 0, entry.width, entry.height)
		drawChatPetEyeAccessory(eyeContext, accessoryImage, entry.state, frame.index, facing, accessory?.eyeAccessoryMirrorsWithFacing !== false)
		context.drawImage(eyeCanvas, 0, 0)
	}
	drawChatPetDesktopEyes(context, entry.state, frame.index, color, entry.eyeState)
}

function renderChatPetDesktopStateFrames(entry, bodyImage, accessoryImage, accessory, color) {
	const facings = entry.mirror ? ['right'] : ['right', 'left']
	const rendered = {}
	for (const facing of facings) {
		const { canvas, context } = createChatPetDesktopCanvas(entry.width, entry.height)
		const scratch = accessoryImage ? createChatPetDesktopCanvas(entry.width, entry.height) : undefined
		const frames = []
		for (const frame of entry.frames) {
			drawChatPetDesktopFrame(context, entry, bodyImage, accessoryImage, accessory, frame, color, facing, scratch)
			frames.push(canvas.toDataURL('image/png'))
		}
		rendered[facing] = frames
	}
	return rendered
}

async function renderChatPetDesktopEffect(variant, color, kind) {
	const sources = kind === 'bubble' ? getChatPetSpeechSources(variant) : getChatPetRespawnSources(variant)
	const source = sources.animated
	const image = await loadChatPetImage(source.url)
	const colored = getChatPetColoredSprite(image, color)
	const { canvas, context } = createChatPetDesktopCanvas(96, 96)
	const frames = []
	for (let index = 0; index < source.frameCount; index++) {
		context.clearRect(0, 0, 96, 96)
		context.drawImage(colored, index * 96, 0, 96, 96, 0, 0, 96, 96)
		frames.push(canvas.toDataURL('image/png'))
	}
	const durations = Array.isArray(source.frameDurations) && source.frameDurations.length > 0 ? source.frameDurations : [0]
	return {
		width: source.frameWidth,
		height: source.frameHeight,
		durations,
		loop: kind === 'bubble',
		frames,
	}
}

function renderChatPetDesktopBlink(color) {
	// The windowed blink clips the pupil to 2 display px. Frames are baked, so
	// provide a tiny transparent overlay that covers each pupil with the body
	// color and draws the clipped 2px line; the helper shows it for 260ms.
	const { canvas, context } = createChatPetDesktopCanvas(96, 96)
	const body = getChatPetBodyColor(color)
	const eye = getChatPetEyeColor(color)
	context.fillStyle = body
	context.fillRect(40, 64, 8, 16)
	context.fillRect(64, 64, 8, 16)
	context.fillStyle = eye
	context.fillRect(40, 70, 8, 4)
	context.fillRect(64, 70, 8, 4)
	return {
		width: 96,
		height: 96,
		durations: [0],
		loop: false,
		frames: [canvas.toDataURL('image/png')],
	}
}

function renderChatPetDesktopGaze(color) {
	// Nine pupil overlays for the eight directions + center. Each covers the
	// eye box with the body color and draws the pupil shifted by up to 4 frame
	// px (= 2 display px, the same translate the window applies).
	const body = getChatPetBodyColor(color)
	const eye = getChatPetEyeColor(color)
	const frames = []
	const { canvas, context } = createChatPetDesktopCanvas(96, 96)
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			context.clearRect(0, 0, 96, 96)
			context.fillStyle = body
			context.fillRect(36, 60, 16, 24)
			context.fillRect(60, 60, 16, 24)
			context.fillStyle = eye
			context.fillRect(40 + dx * 4, 64 + dy * 4, 8, 16)
			context.fillRect(64 + dx * 4, 64 + dy * 4, 8, 16)
			frames.push(canvas.toDataURL('image/png'))
		}
	}
	return { width: 96, height: 96, durations: frames.map(() => 0), loop: false, frames }
}

async function renderChatPetDesktopPayload(options) {
	const { variant, color, accessoryId } = options
	const plan = getChatPetDesktopFramePlan(variant)
	const accessory = accessoryId ? getChatPetAccessoryById(accessoryId) : undefined
	const accessorySource = accessory ? getChatPetAccessoryImageSource(accessory) : undefined
	const accessoryImage = accessorySource ? await loadChatPetImage(accessorySource.url) : undefined
	const bodyImages = new Map()
	const states = {}
	for (const entry of Object.values(plan)) {
		let bodyImage = bodyImages.get(entry.url)
		if (!bodyImage) {
			bodyImage = await loadChatPetImage(entry.url)
			bodyImages.set(entry.url, bodyImage)
		}
		const rendered = renderChatPetDesktopStateFrames(entry, bodyImage, accessoryImage, accessory, color)
		states[entry.key] = {
			width: entry.width,
			height: entry.height,
			durations: entry.frames.map(frame => frame.duration || 0),
			frameIndices: entry.frames.map(frame => frame.index),
			loop: entry.loop,
			mirror: entry.mirror,
			right: rendered.right,
			...(entry.mirror ? {} : { left: rendered.left }),
		}
	}
	const bubble = await renderChatPetDesktopEffect(variant, color, 'bubble')
	const respawn = await renderChatPetDesktopEffect(variant, color, 'respawn')
	const blink = renderChatPetDesktopBlink(color)
	const gaze = renderChatPetDesktopGaze(color)
	return { states, bubble, respawn, blink, gaze }
}

/* ---------------------------------------------------------------- bridge */

function getChatPetDesktopFrameKey(prefs) {
	return `${getChatPetColorVariant(prefs.color)}:${prefs.color}:${prefs.accessory ?? ''}`
}

function getChatPetDesktopPetScreenRect(controller) {
	try {
		const rect = controller?.button?.getBoundingClientRect?.()
		if (!rect || !(rect.width > 0) || !(rect.height > 0)) return undefined
		const screenX = typeof window !== 'undefined' && Number.isFinite(window.screenX) ? window.screenX : 0
		const screenY = typeof window !== 'undefined' && Number.isFinite(window.screenY) ? window.screenY : 0
		return { left: rect.left + screenX, top: rect.top + screenY, width: rect.width, height: rect.height }
	} catch (ignored) {
		return undefined
	}
}

class ChatPetDesktopBridge {
	constructor(options) {
		this.controller = options.controller
		this.host = options.host
		this.prefs = options.prefs ?? chatPetPrefs
		this.getT = options.getT ?? (() => undefined)
		this.onSupportChange = options.onSupportChange
		this.supported = false
		this.active = false
		this.session = undefined
		this.version = 0
		this.disposed = false
		this._starting = false
		this._stopping = false
		this._startToken = 0
		this._warmupRequested = false
		this._lastSettings = undefined
		this._lastHiddenReason = undefined
		this._sentTheme = undefined
		this._sentLabels = undefined
		this._startTimer = undefined
		this._pollAbort = undefined
		this._frames = undefined
		this._frameKey = undefined
		this._framePromise = undefined
		this._framePromiseKey = undefined
		this._preparePromise = undefined
		this._prepareKey = undefined
		this._preparedSession = undefined
		this._factsTimer = undefined
		this._listeners = []
		this._onVisibilityChange = this._onVisibilityChange.bind(this)
		this._onWindowFocus = this._onWindowFocus.bind(this)
		this._onWindowBlur = this._onWindowBlur.bind(this)
		this._onPrefsChange = this._onPrefsChange.bind(this)
		activeChatPetDesktopBridge = this
	}

	async init() {
		if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this._onVisibilityChange)
		if (typeof window !== 'undefined') {
			window.addEventListener?.('focus', this._onWindowFocus)
			window.addEventListener?.('blur', this._onWindowBlur)
		}
		this._listeners.push(this.prefs.subscribe(this._onPrefsChange))
		if (!isChatPetDesktopSupported()) {
			this._setSupport(false)
			return
		}
		try {
			const capabilities = await this._request('/capabilities')
			if (!this.disposed) this._setSupport(capabilities?.supported === true)
		} catch (ignored) {
			if (!this.disposed) this._setSupport(false)
		}
		if (this.disposed) return
		if (this.supported && this.prefs.get().desktopDisplay) {
			this.prewarm()
			this._startFactsTimer()
			// Only auto-show when we know the app is minimized. During startup the
			// renderer can briefly report hasFocus()=false while the DSH window is
			// actually taking focus; starting then used to show and immediately hide
			// the helper. The blur handler covers the normal unfocus path.
			if (typeof document !== 'undefined' && document.hidden) this._scheduleStart()
		}
	}

	get enabled() {
		return this.prefs.get().desktopDisplay === true
	}

	get smartHide() {
		return this.prefs.get().desktopSmartHide === true
	}

	getSnapshot() {
		return {
			supported: this.supported,
			active: this.active,
			session: this.session,
			prepared: Boolean(this._preparedSession),
			version: this.version,
			framesCached: Boolean(this._frames),
			settings: this._lastSettings,
			enabled: this.enabled,
			smartHide: this.smartHide,
			starting: this._starting,
			stopping: this._stopping,
			lastHiddenReason: this._lastHiddenReason,
		}
	}

	_setSupport(value) {
		const next = value === true
		if (this.supported === next) return
		this.supported = next
		try { this.onSupportChange?.(next) } catch (ignored) { /* isolation */ }
	}

	_translate(key) {
		return translateChatPetText(this.getT(), key)
	}

	async _request(path, options = {}) {
		const init = { ...options }
		delete init.timeout
		if (init.body !== undefined) {
			init.headers = { 'content-type': 'application/json', ...(init.headers ?? {}) }
		}
		let timer
		if (Number.isFinite(options.timeout) && typeof AbortController === 'function') {
			const controller = new AbortController()
			init.signal = controller.signal
			timer = setTimeout(() => {
				try { controller.abort() } catch (ignored) { /* noop */ }
			}, Math.max(1, options.timeout))
		}
		try {
			const response = await fetch(`${CHAT_PET_DESKTOP_ROUTE}${path}`, init)
			if (!response.ok) {
				const error = new Error(`vscode-pet desktop route ${path} failed: ${response.status}`)
				error.status = response.status
				throw error
			}
			const type = response.headers?.get?.('content-type') ?? ''
			return type.includes('application/json') ? response.json() : response.text()
		} finally {
			clearTimeout(timer)
		}
	}

	async prewarm() {
		if (this.disposed || !this.supported) return
		const frames = this._getFrames()
		frames.catch(ignored => { /* retried on the next change or start */ })
		if (!this._warmupRequested) {
			this._warmupRequested = true
			this._request('/warmup', { method: 'POST' }).catch(() => { this._warmupRequested = false })
		}
		frames.then(value => {
			if (this.disposed || this.active || !this.enabled) return
			this._prepareFrames(value)
		}).catch(ignored => { /* start reports the error */ })
	}

	_prepareFrames(frames) {
		if (this.disposed || this.active || !this.enabled) return Promise.resolve(undefined)
		const key = getChatPetDesktopFrameKey(this.prefs.get())
		if (this._preparedSession && this._prepareKey === key) return Promise.resolve(this._preparedSession)
		if (this._preparePromise && this._prepareKey === key) return this._preparePromise
		const bundle = this._buildBundle(frames)
		const promise = this._request('/prepare', { method: 'POST', body: JSON.stringify({ bundle }) }).then(response => {
			if (!this.disposed && response?.session) {
				this._preparedSession = response.session
				this._prepareKey = key
				this._startFactsTimer()
			}
			return response
		}, () => undefined).finally(() => {
			if (this._preparePromise === promise) this._preparePromise = undefined
		})
		this._preparePromise = promise
		this._prepareKey = key
		return promise
	}

	async _disposePrepared() {
		this._prepareKey = undefined
		this._preparedSession = undefined
		if (!this.supported || this.disposed) return
		try { await this._request('/dispose', { method: 'POST' }) } catch (ignored) { /* best effort */ }
	}

	_getFacts() {
		const facts = {
			running: this.controller?.running === true,
			pendingInteraction: this.controller?.pending === true,
			hasInput: this.controller?.hasInput === true,
			canceled: this.controller?.canceled === true,
			inputRevision: Number.isFinite(this.controller?.inputRevision) ? this.controller.inputRevision : 0,
			grabbing: this.controller?.dragging === true,
			theme: getChatPetDesktopTheme(),
			labels: getChatPetDesktopMenuLabels(this.getT()),
		}
		const petRect = getChatPetDesktopPetScreenRect(this.controller)
		if (petRect) facts.petRect = petRect
		return facts
	}

	updateFacts(facts) {
		const session = this.active ? this.session : this._preparedSession
		if (!session) return
		const current = this._getFacts()
		const themeChanged = current.theme !== this._sentTheme
		const labelsChanged = current.labels !== this._sentLabels
		this._sentTheme = current.theme
		this._sentLabels = current.labels
		const payload = {
			running: facts?.running === true,
			pendingInteraction: facts?.pendingInteraction === true,
			hasInput: current.hasInput,
			canceled: current.canceled,
			inputRevision: current.inputRevision,
			// Theme/labels only when the cached objects changed; the helper keeps
			// the last values otherwise (the initial bundle/show always carries them).
			...(themeChanged ? { theme: current.theme } : {}),
			...(labelsChanged ? { labels: current.labels } : {}),
		}
		if (facts?.grabbing === true || current.grabbing) payload.grabbing = true
		const petRect = facts?.petRect ?? current.petRect
		if (petRect) payload.petRect = petRect
		this._request('/facts', {
			method: 'POST',
			body: JSON.stringify({ session, facts: payload }),
		}).catch(ignored => { /* the next state change retries */ })
	}

	_startFactsTimer() {
		if (this._factsTimer || this.disposed) return
		this._factsTimer = setInterval(() => {
			if (this.disposed || !this.enabled) return
			if (!this.active && !this._preparedSession) return
			this.updateFacts(this._getFacts())
		}, 250)
	}

	_stopFactsTimer() {
		clearInterval(this._factsTimer)
		this._factsTimer = undefined
	}

	async _getFrames() {
		const prefs = this.prefs.get()
		const key = getChatPetDesktopFrameKey(prefs)
		if (this._frames && this._frameKey === key) return this._frames
		if (this._framePromise && this._framePromiseKey === key) return this._framePromise
		const promise = renderChatPetDesktopPayload({
			variant: getChatPetColorVariant(prefs.color),
			color: prefs.color,
			accessoryId: prefs.accessory,
		}).then(frames => {
			if (this._framePromise === promise) this._framePromise = undefined
			if (this._framePromiseKey === key) this._framePromiseKey = undefined
			if (!this.disposed && getChatPetDesktopFrameKey(this.prefs.get()) === key) {
				this._frames = frames
				this._frameKey = key
			}
			return frames
		}, error => {
			if (this._framePromise === promise) this._framePromise = undefined
			if (this._framePromiseKey === key) this._framePromiseKey = undefined
			throw error
		})
		this._framePromise = promise
		this._framePromiseKey = key
		return promise
	}

	_buildBundle(frames) {
		const prefs = this.prefs.get()
		const facts = this._getFacts()
		return {
			protocol: CHAT_PET_DESKTOP_PROTOCOL,
			frameKey: getChatPetDesktopFrameKey(prefs),
			settings: {
				scale: prefs.scale,
				smartHide: prefs.desktopSmartHide === true,
				onTheRun: prefs.onTheRun === true,
				horizontal: prefs.desktopHorizontal ?? null,
				motionReduced: this._motionReduced(),
			},
			facts,
			labels: facts.labels,
			theme: facts.theme,
			model: getChatPetDesktopModel(),
			windowRect: getChatPetDesktopWindowRect(),
			states: frames.states,
			bubble: frames.bubble,
			respawn: frames.respawn,
			blink: frames.blink,
			gaze: frames.gaze,
		}
	}

	_motionReduced() {
		try {
			return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
		} catch (ignored) {
			return false
		}
	}

	_scheduleStart() {
		if (this.disposed || this.active || this._starting || !this.supported) return
		if (!this.enabled || this.prefs.get().visible === false) return
		clearTimeout(this._startTimer)
		this._startTimer = setTimeout(() => {
			this._startTimer = undefined
			this.start()
		}, CHAT_PET_DESKTOP_START_DEBOUNCE)
	}

	_cancelScheduledStart() {
		clearTimeout(this._startTimer)
		this._startTimer = undefined
	}

	async start(options = {}) {
		if (this.disposed || this.active || this._starting) return
		if (!this.supported || !this.enabled || this.prefs.get().visible === false) return
		if (options.force !== true && typeof document !== 'undefined' && !document.hidden && document.hasFocus?.() === true) return
		this._starting = true
		const token = ++this._startToken
		try {
			const frames = await this._getFrames()
			if (this.disposed || token !== this._startToken || !this.enabled) return
			const bundle = this._buildBundle(frames)
			const response = await this._request('/start', {
				method: 'POST',
				body: JSON.stringify({ bundle }),
				timeout: CHAT_PET_DESKTOP_START_TIMEOUT,
			})
			if (this.disposed || token !== this._startToken) {
				if (response?.session) this._request('/stop', { method: 'POST', body: JSON.stringify({ session: response.session, dispose: true }) }).catch(() => {})
				return
			}
			// Suspend the in-window pet only after the helper actually showed, so a
			// stalled/failed start can never leave the pet invisible everywhere.
			this.controller?.suspendForDesktop?.()
			this.active = true
			this.session = response?.session
			this._preparedSession = response?.session
			this.version = Number.isFinite(response?.version) ? response.version : 0
			this._lastSettings = response?.settings
			this._startPolling()
			this.updateFacts({ running: this.controller?.running === true, pendingInteraction: this.controller?.pending === true })
		} catch (error) {
			if (!this.active) this.controller?.cancelDesktopSuspend?.()
			this.host?.status?.(this._translate('status.desktopError'))
			console.warn('[vscode-pet] desktop display failed', error)
		} finally {
			this._starting = false
		}
	}

	_startPolling() {
		this._stopPolling()
		const session = this.session
		if (!session) return
		const abort = typeof AbortController === 'function' ? new AbortController() : undefined
		this._pollAbort = abort
		const loop = async () => {
			while (!this.disposed && this.active && this.session === session && !(abort?.signal.aborted)) {
				try {
					const result = await this._request(`/pending?session=${encodeURIComponent(session)}&since=${this.version}`, abort ? { signal: abort.signal } : {})
					if (abort?.signal.aborted || this.session !== session) return
					if (result && Number.isFinite(result.version)) this.version = result.version
					if (result?.settings) this._applyDesktopSettings(result.settings)
					if (typeof result?.hiddenReason === 'string') this._lastHiddenReason = result.hiddenReason
					if (result?.prepared === true && this.active) {
						this.stop({ returning: true })
						return
					}
				} catch (error) {
					if (abort?.signal.aborted || this.disposed || this.session !== session) return
					if (error?.status === 410 || error?.status === 404) return
					await new Promise(resolve => setTimeout(resolve, 1000))
				}
			}
		}
		loop()
	}

	_stopPolling() {
		try { this._pollAbort?.abort() } catch (ignored) { /* noop */ }
		this._pollAbort = undefined
	}

	_applyDesktopSettings(settings) {
		if (!settings || typeof settings !== 'object') return
		const patch = {}
		if (Number.isFinite(settings.scale)) patch.scale = Math.max(CHAT_PET_MIN_SCALE, settings.scale)
		if (typeof settings.smartHide === 'boolean') patch.desktopSmartHide = settings.smartHide
		if (typeof settings.onTheRun === 'boolean') patch.onTheRun = settings.onTheRun
		if (typeof settings.desktopDisplay === 'boolean') patch.desktopDisplay = settings.desktopDisplay
		if (settings.horizontal && typeof settings.horizontal === 'object') {
			const edge = settings.horizontal.edge === 'left' ? 'left' : 'right'
			const inset = Number.isFinite(settings.horizontal.inset) ? Math.max(0, settings.horizontal.inset) : CHAT_PET_DEFAULT_RIGHT_INSET
			patch.desktopHorizontal = { edge, inset }
		}
		if (Object.keys(patch).length === 0) return
		this._lastSettings = { ...(this._lastSettings ?? {}), ...settings }
		this.prefs.setSilent(patch)
	}

	_notifyPrefs() {
		try { this.prefs.set({}) } catch (ignored) { /* noop */ }
	}

	async stop(options = {}) {
		const returning = options.returning !== false
		const dispose = options.dispose === true
		this._startToken += 1
		const session = this.session
		const wasActive = this.active
		this.active = false
		this.session = undefined
		this._stopping = true
		this._stopPolling()
		let response
		if (session && !this.disposed) {
			try {
				response = await this._request('/stop', { method: 'POST', body: JSON.stringify({ session, dispose }) })
			} catch (error) {
				console.warn('[vscode-pet] desktop stop failed', error)
			}
		}
		if (response?.settings) this._applyDesktopSettings(response.settings)
		if (dispose) {
			this._preparedSession = undefined
			this._prepareKey = undefined
		}
		this._notifyPrefs()
		this._stopping = false
		if (!wasActive) {
			this.controller?.cancelDesktopSuspend?.()
			return
		}
		if (!returning) {
			this.controller?.resumeFromDesktop?.()
			return
		}
		const command = response?.command
		if (command === 'hats' || command === 'color') {
			this.controller?.resumeFromDesktop?.()
			this.host?.openPanel?.(command)
			return
		}
		if (command === 'jump') {
			this.controller?.resumeFromDesktop?.()
			this.controller?.startJumpGame?.()
			return
		}
		this.controller?.playDesktopReturn?.()
	}

	async toggleDisplay() {
		const next = !this.enabled
		if (next) {
			this.prefs.set({ desktopDisplay: true })
			this.host?.status?.(this._translate('status.desktopEnabled'))
			this.prewarm()
			this._startFactsTimer()
			return
		}
		this.prefs.set({ desktopDisplay: false, desktopSmartHide: false })
		this.host?.status?.(this._translate('status.desktopDisabled'))
		this._stopFactsTimer()
		await this.stop({ returning: false, dispose: true })
		await this._disposePrepared()
	}

	toggleSmartHide() {
		const next = !this.smartHide
		this.prefs.set({ desktopSmartHide: next })
		this.host?.status?.(this._translate(next ? 'status.smartHideOn' : 'status.smartHideOff'))
	}

	_onVisibilityChange() {
		if (this.disposed) return
		if (typeof document !== 'undefined' && document.hidden) {
			// Start immediately: a 250ms setTimeout in a hidden renderer can be
			// throttled/frozen, which was leaving the desktop handoff never started.
			this._cancelScheduledStart()
			this.start()
		} else {
			this._cancelScheduledStart()
			if (this._starting) this._startToken += 1
			if (this.active) this.stop({ returning: true })
		}
	}

	_onWindowFocus() {
		if (this.disposed) return
		this._cancelScheduledStart()
		// A start that is still in flight must not hand off after DSH regained
		// focus; invalidate it so its response is stopped instead of shown.
		if (this._starting) this._startToken += 1
		if (this.active) this.stop({ returning: true })
	}

	_onWindowBlur() {
		if (this.disposed || !this.enabled) return
		// Same as visibilitychange: start in the event itself, not via a timer that
		// a background window may throttle.
		this._cancelScheduledStart()
		this.start()
	}

	_onPrefsChange() {
		if (this.disposed || this._stopping) return
		const prefs = this.prefs.get()
		if (!prefs.desktopDisplay || prefs.visible === false) {
			this._stopFactsTimer()
			if (this.active) this.stop({ returning: true, dispose: true })
			else this._disposePrepared()
			return
		}
		if (!this.supported) return
		this._startFactsTimer()
		if (!this.active) {
			this.prewarm()
			if (typeof document !== 'undefined' && (document.hidden || document.hasFocus?.() === false)) this._scheduleStart()
		}
	}

	dispose() {
		if (this.disposed) return
		this.disposed = true
		this._startToken += 1
		this._cancelScheduledStart()
		this._stopPolling()
		this._stopFactsTimer()
		try { document?.removeEventListener?.('visibilitychange', this._onVisibilityChange) } catch (ignored) { /* noop */ }
		try { window?.removeEventListener?.('focus', this._onWindowFocus) } catch (ignored) { /* noop */ }
		try { window?.removeEventListener?.('blur', this._onWindowBlur) } catch (ignored) { /* noop */ }
		for (const unsubscribe of this._listeners) {
			try { unsubscribe?.() } catch (ignored) { /* isolation */ }
		}
		this._listeners = []
		const session = this.session
		this.session = undefined
		this.active = false
		if (session) this._request('/stop', { method: 'POST', body: JSON.stringify({ session, dispose: true }) }).catch(() => {})
		this._request('/dispose', { method: 'POST' }).catch(() => {})
		this.controller?.cancelDesktopSuspend?.()
		this._frames = undefined
		this._frameKey = undefined
		this._framePromise = undefined
		this._framePromiseKey = undefined
		this._preparePromise = undefined
		this._prepareKey = undefined
		this._preparedSession = undefined
		this._lastSettings = undefined
		if (activeChatPetDesktopBridge === this) activeChatPetDesktopBridge = undefined
	}
}
