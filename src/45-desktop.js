/* Windows desktop display: platform gate, desktop geometry, frame bundles and the client bridge. */

const CHAT_PET_DESKTOP_PROTOCOL = 1
const CHAT_PET_DESKTOP_ROUTE = '/api/blobby/desktop'
const CHAT_PET_DESKTOP_START_DEBOUNCE = 250
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
	const labels = {}
	for (const key of CHAT_PET_DESKTOP_MENU_LABEL_KEYS) labels[key] = translateChatPetText(t, key)
	return labels
}

function getChatPetDesktopTheme() {
	let dark = true
	try {
		const value = getComputedStyle(document.body).backgroundColor
		const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value)
		if (match) {
			const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])]
			dark = 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
		}
	} catch (ignored) { /* keep the dark palette */ }
	return dark
		? {
			dark: true,
			menuBackground: '#26272b',
			menuText: '#f2f3f5',
			menuMuted: '#9a9ca3',
			menuHover: '#3a3b40',
			menuBorder: '#414248',
			accent: '#4d6bfe',
		}
		: {
			dark: false,
			menuBackground: '#ffffff',
			menuText: '#1f2329',
			menuMuted: '#6b7280',
			menuHover: '#f1f2f4',
			menuBorder: '#e3e5e8',
			accent: '#4d6bfe',
		}
}

/* ---------------------------------------------------------------- painter */

function drawChatPetDesktopEyes(context, state, frameIndex, color) {
	if (!doesChatPetStateTrackCursor(state)) return
	const bobbed = (state === 'idle' || state === 'rendering' || state === 'achievementUnlocked') && frameIndex >= 20
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

function drawChatPetDesktopFrame(context, entry, bodyImage, accessoryImage, accessory, frame, color, facing) {
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
		const { canvas: eyeCanvas, context: eyeContext } = createChatPetDesktopCanvas(entry.width, entry.height)
		drawChatPetEyeAccessory(eyeContext, accessoryImage, entry.state, frame.index, facing, accessory?.eyeAccessoryMirrorsWithFacing !== false)
		context.drawImage(eyeCanvas, 0, 0)
	}
	drawChatPetDesktopEyes(context, entry.state, frame.index, color)
}

function renderChatPetDesktopStateFrames(entry, bodyImage, accessoryImage, accessory, color) {
	const facings = entry.mirror ? ['right'] : ['right', 'left']
	const rendered = {}
	for (const facing of facings) {
		const frames = []
		for (const frame of entry.frames) {
			const { canvas, context } = createChatPetDesktopCanvas(entry.width, entry.height)
			drawChatPetDesktopFrame(context, entry, bodyImage, accessoryImage, accessory, frame, color, facing)
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
	const frames = []
	for (let index = 0; index < source.frameCount; index++) {
		const { canvas, context } = createChatPetDesktopCanvas(96, 96)
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
		states[entry.state] = {
			width: entry.width,
			height: entry.height,
			durations: entry.frames.map(frame => frame.duration || 0),
			loop: entry.loop,
			mirror: entry.mirror,
			right: rendered.right,
			...(entry.mirror ? {} : { left: rendered.left }),
		}
	}
	const bubble = await renderChatPetDesktopEffect(variant, color, 'bubble')
	const respawn = await renderChatPetDesktopEffect(variant, color, 'respawn')
	return { states, bubble, respawn }
}

/* ---------------------------------------------------------------- bridge */

function getChatPetDesktopFrameKey(prefs) {
	return `${getChatPetColorVariant(prefs.color)}:${prefs.color}:${prefs.accessory ?? ''}`
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
		this._startTimer = undefined
		this._pollAbort = undefined
		this._frames = undefined
		this._frameKey = undefined
		this._framePromise = undefined
		this._framePromiseKey = undefined
		this._preparePromise = undefined
		this._prepareKey = undefined
		this._preparedSession = undefined
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
			if (typeof document !== 'undefined' && (document.hidden || document.hasFocus?.() === false)) this._scheduleStart()
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
		if (init.body !== undefined) {
			init.headers = { 'content-type': 'application/json', ...(init.headers ?? {}) }
		}
		const response = await fetch(`${CHAT_PET_DESKTOP_ROUTE}${path}`, init)
		if (!response.ok) {
			const error = new Error(`vscode-pet desktop route ${path} failed: ${response.status}`)
			error.status = response.status
			throw error
		}
		const type = response.headers?.get?.('content-type') ?? ''
		return type.includes('application/json') ? response.json() : response.text()
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
		return {
			running: this.controller?.running === true,
			pendingInteraction: this.controller?.pending === true,
		}
	}

	updateFacts(facts) {
		if (!this.active || !this.session) return
		this._request('/facts', {
			method: 'POST',
			body: JSON.stringify({ session: this.session, facts: { running: facts?.running === true, pendingInteraction: facts?.pendingInteraction === true } }),
		}).catch(ignored => { /* the next state change retries */ })
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
			facts: this._getFacts(),
			labels: getChatPetDesktopMenuLabels(this.getT()),
			theme: getChatPetDesktopTheme(),
			model: getChatPetDesktopModel(),
			windowRect: getChatPetDesktopWindowRect(),
			states: frames.states,
			bubble: frames.bubble,
			respawn: frames.respawn,
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
		this.controller?.suspendForDesktop?.()
		try {
			const frames = await this._getFrames()
			if (this.disposed || token !== this._startToken || !this.enabled) {
				this.controller?.cancelDesktopSuspend?.()
				return
			}
			const bundle = this._buildBundle(frames)
			const response = await this._request('/start', { method: 'POST', body: JSON.stringify({ bundle }) })
			if (this.disposed || token !== this._startToken) {
				if (response?.session) this._request('/stop', { method: 'POST', body: JSON.stringify({ session: response.session, dispose: true }) }).catch(() => {})
				return
			}
			this.active = true
			this.session = response?.session
			this._preparedSession = response?.session
			this.version = Number.isFinite(response?.version) ? response.version : 0
			this._lastSettings = response?.settings
			this._startPolling()
			this.updateFacts({ running: this.controller?.running === true, pendingInteraction: this.controller?.pending === true })
		} catch (error) {
			this.controller?.cancelDesktopSuspend?.()
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
			return
		}
		this.prefs.set({ desktopDisplay: false, desktopSmartHide: false })
		this.host?.status?.(this._translate('status.desktopDisabled'))
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
			this._scheduleStart()
		} else {
			this._cancelScheduledStart()
			if (this.active) this.stop({ returning: true })
		}
	}

	_onWindowFocus() {
		if (this.disposed) return
		this._cancelScheduledStart()
		if (this.active) this.stop({ returning: true })
	}

	_onWindowBlur() {
		if (this.disposed || !this.enabled) return
		this._scheduleStart()
	}

	_onPrefsChange() {
		if (this.disposed || this._stopping) return
		const prefs = this.prefs.get()
		if (!prefs.desktopDisplay || prefs.visible === false) {
			if (this.active) this.stop({ returning: true, dispose: true })
			else this._disposePrepared()
			return
		}
		if (!this.supported) return
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
		if (activeChatPetDesktopBridge === this) activeChatPetDesktopBridge = undefined
	}
}
