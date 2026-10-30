/* Imperative pet controller and DSH slot integration. */

function createElement(tag, className, attributes) {
	const element = document.createElement(tag)
	if (className) element.className = className
	if (attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			if (value === undefined || value === null) continue
			if (key === 'text') element.textContent = value
			else if (key === 'ariaLabel') element.setAttribute('aria-label', value)
			else if (key === 'role') element.setAttribute('role', value)
			else element.setAttribute(key, String(value))
		}
	}
	return element
}

function setButtonPosition(button, left, top) {
	button.style.left = `${Math.round(left * 10) / 10}px`
	button.style.top = `${Math.round(top * 10) / 10}px`
	button.style.right = 'auto'
	button.style.bottom = 'auto'
}

class ChatPetController {
	constructor(mount, host) {
		this.mount = mount
		this.host = host
		this.prefs = chatPetPrefs.get()
		this.visible = this.prefs.visible !== false
		this.scale = this.prefs.scale
		this.color = this.prefs.color
		this.accessoryId = this.prefs.accessory
		this.variant = getChatPetColorVariant(this.color)
		this.displaySize = CHAT_PET_DISPLAY_SIZE * this.scale
		this.running = false
		this.pending = false
		this.hasInput = false
		this.idleExpired = false
		this.confirmationExpired = false
		this.transientState = undefined
		this.transientTimer = undefined
		this.idleTimer = undefined
		this.confirmationTimer = undefined
		this.bounceTimer = undefined
		this.respawnTimer = undefined
		this.frameTimer = undefined
		this.disposed = false
		this.renderedState = undefined
		this.activeSprite = 0
		this.activeSource = undefined
		this.activeFrameIndex = 0
		this.activeAnimation = undefined
		this.dragging = false
		this.airborne = false
		this.dead = false
		this.onTheRun = this.prefs.onTheRun
		this.bounceCount = 0
		this._lastClickInteraction = undefined
		this._motionReduced = false
		this._gaze = [0, 0]
		this._gazeRaf = undefined
		this._cursor = undefined
		this._pointerSamples = []
		this._drag = undefined
		this._throw = undefined
		this._hopDirection = 'right'
		this._uiOpen = false
		this._lastFacing = 'right'
		this._directionChanges = new ChatPetDirectionChangeController()
		this._facing = new ChatPetFacingController()
		this._blink = new ChatPetBlinkController(blinking => this._updateBlink(blinking))
		this._hop = new ChatPetHopController({
			onDirectionChange: direction => this._setHopDirection(direction),
			onMove: delta => this._hopBy(delta),
			onStart: () => this._showTransientState('jump', false),
			onReducedMotionStart: () => this._showTransientState('jump', false),
			onRequest: () => { this._markInteraction(); this._wake() },
		})
		this._respawnPhase = 'none'
		this._deathPosition = undefined
		this._respawnPosition = undefined
		this._jumpGame = undefined
		this._build()
		this._bind()
		this._observeMotion()
		this._preload()
		if (this.onTheRun) this._startRunTimer()
		if (this.visible) {
			this.layout()
			this.recompute(true)
		} else {
			this.root.style.display = 'none'
			this.button.tabIndex = -1
		}
	}

	setVisible(visible) {
		const next = visible !== false
		if (this.visible === next) return
		this.visible = next
		if (next) {
			this.root.style.display = ''
			this.button.tabIndex = 0
			this.layout()
			this.recompute(true)
			this._redrawActiveFrame?.()
			this._resetIdle()
		} else {
			this.root.style.display = 'none'
			this.button.tabIndex = -1
			this._clearIdle()
			clearTimeout(this.frameTimer)
			this.frameTimer = undefined
			clearTimeout(this.transientTimer)
			this.transientTimer = undefined
			this.transientState = undefined
			this._throw = undefined
			this.airborne = false
			this.dragging = false
			this.button.classList.remove('throwing', 'falling', 'dragging')
		}
	}

	_startRunTimer() {
		clearInterval(this._runTimer)
		this._runTimer = setInterval(() => {
			if (!this.onTheRun || this.disposed) return
			this.button.classList.add('peeking')
			setTimeout(() => this.button.classList.remove('peeking'), 900)
		}, 8000)
	}

	/* ------------------------------------------------------------ elements */

	_build() {
		this.root = createElement('div', 'dsh-blobby-root', { 'data-dsh-blobby': '' })
		this.button = createElement('div', 'chat-pet-button', {
			role: 'button',
			tabindex: '0',
			'aria-label': this._tr('aria.pet'),
		})
		this.visual = createElement('div', 'chat-pet-visual')
		this.spriteContainers = []
		this.spriteCanvases = []
		for (let index = 0; index < 2; index++) {
			const container = createElement('div', 'chat-pet-sprite hidden')
			const canvas = document.createElement('canvas')
			canvas.className = 'chat-pet-canvas'
			canvas.setAttribute('aria-hidden', 'true')
			container.append(canvas)
			this.visual.append(container)
			this.spriteContainers.push(container)
			this.spriteCanvases.push(canvas)
		}
		this.eyeAccessoryContainer = createElement('div', 'chat-pet-eye-accessory hidden')
		this.eyeAccessoryCanvas = document.createElement('canvas')
		this.eyeAccessoryCanvas.className = 'chat-pet-eye-accessory-canvas'
		this.eyeAccessoryCanvas.setAttribute('aria-hidden', 'true')
		this.eyeAccessoryContainer.append(this.eyeAccessoryCanvas)
		this.visual.append(this.eyeAccessoryContainer)

		this.speechContainer = createElement('div', 'chat-pet-speech-bubble hidden')
		this.speechCanvas = document.createElement('canvas')
		this.speechCanvas.className = 'chat-pet-canvas chat-pet-speech-canvas'
		this.speechCanvas.width = CHAT_PET_SOURCE_SIZE
		this.speechCanvas.height = CHAT_PET_SOURCE_SIZE
		this.speechCanvas.setAttribute('aria-hidden', 'true')
		this.speechContainer.append(this.speechCanvas)
		this.visual.append(this.speechContainer)

		this.respawnContainer = createElement('div', 'chat-pet-respawn-effect hidden')
		this.respawnCanvas = document.createElement('canvas')
		this.respawnCanvas.className = 'chat-pet-canvas'
		this.respawnCanvas.width = CHAT_PET_SOURCE_SIZE
		this.respawnCanvas.height = CHAT_PET_SOURCE_SIZE
		this.respawnCanvas.setAttribute('aria-hidden', 'true')
		this.respawnContainer.append(this.respawnCanvas)

		this.eyes = createElement('div', 'chat-pet-eyes')
		this.eyes.setAttribute('aria-hidden', 'true')
		this.pupils = []
		for (const side of ['left', 'right']) {
			const eye = createElement('div', `chat-pet-eye ${side}`)
			const pupil = createElement('div', 'chat-pet-pupil')
			eye.append(pupil)
			this.eyes.append(eye)
			this.pupils.push(pupil)
		}
		this.visual.append(this.eyes)

		this.bounceCounter = createElement('span', 'chat-pet-bounce-counter hidden')
		this.bounceCounter.setAttribute('aria-hidden', 'true')
		this.confettiAnchor = createElement('div', 'chat-pet-confetti-anchor')
		this.confettiAnchor.setAttribute('aria-hidden', 'true')

		this.button.append(this.visual)
		this.root.append(this.button, this.bounceCounter, this.confettiAnchor, this.respawnContainer)
		this.mount.append(this.root)
	}

	_bind() {
		this._listeners = []
		const on = (target, type, handler, options) => {
			target.addEventListener(type, handler, options)
			this._listeners.push(() => target.removeEventListener(type, handler, options))
		}
		on(this.button, 'pointerdown', event => this._onPointerDown(event))
		on(this.button, 'click', event => this._onClick(event))
		on(this.button, 'keydown', event => this._onKeyDown(event))
		on(this.button, 'contextmenu', event => {
			event.preventDefault()
			event.stopPropagation()
			this._openContextMenu(event.clientX, event.clientY)
		})
		on(this.button, 'focus', () => this.button.classList.add('focused'))
		on(this.button, 'blur', () => this.button.classList.remove('focused'))
		on(this.button, 'animationend', event => {
			if (event.animationName === 'chat-pet-yapping-fall' && this.transientState === 'yapping') {
				this.transientState = 'yappingMouthOpen'
				this.button.dataset.state = 'yappingMouthOpen'
				this._updateEyes('yappingMouthOpen', this.activeFrameIndex)
			}
		})
		on(document, 'pointermove', event => this._onPointerMove(event), { passive: true })
		on(document, 'pointerup', event => this._onPointerUp(event), true)
		on(document, 'pointercancel', event => this._onPointerUp(event), true)
		on(window, 'resize', () => this.layout())
		on(window, 'scroll', () => this._updateWideLayers(), true)
		on(document, 'visibilitychange', () => this._onVisibilityChange())
		this._resizeObserver = new ResizeObserver(() => this.layout())
	}

	_observeMotion() {
		this._motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
		this._motionReduced = this._motionQuery?.matches === true
		if (this._motionQuery?.addEventListener) {
			this._motionListener = event => {
				this._motionReduced = event.matches
				this.recompute(true)
			}
			this._motionQuery.addEventListener('change', this._motionListener)
		}
	}

	async _preload() {
		const sources = getChatPetSpriteSources(this.variant)
		const urls = new Set()
		for (const entry of Object.values(sources)) {
			if (entry.animated.url) urls.add(entry.animated.url)
			if (entry.reducedMotion.url) urls.add(entry.reducedMotion.url)
		}
		const speech = getChatPetSpeechSources(this.variant)
		urls.add(speech.animated.url)
		urls.add(speech.reducedMotion.url)
		const respawn = getChatPetRespawnSources(this.variant)
		urls.add(respawn.animated.url)
		urls.add(respawn.reducedMotion.url)
		for (const accessory of Object.values(CHAT_PET_ACCESSORIES)) urls.add(getChatPetAccessoryImageSource(accessory).url)
		const run = () => { for (const url of urls) loadChatPetImage(url).catch(() => {}) }
		if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1200 })
		else setTimeout(run, 50)
	}

	/* --------------------------------------------------------------- layout */

	layout() {
		if (this.disposed) return
		if (!this.visible) {
			this.root.style.display = 'none'
			return
		}
		const geometry = this.host.getGeometry()
		if (!geometry || !geometry.seat || !geometry.chat) {
			this.root.style.display = 'none'
			return
		}
		this.root.style.display = ''
		const seatElement = geometry.seat
		const chatElement = geometry.chat
		const seat = seatElement.getBoundingClientRect()
		const chat = chatElement.getBoundingClientRect()
		this.seatRect = seat
		this.chatRect = chat
		this._syncObserver(seatElement, chatElement)
		this.displaySize = CHAT_PET_DISPLAY_SIZE * this.scale
		this.button.style.width = `${this.displaySize}px`
		this.button.style.height = `${this.displaySize}px`
		this.visual.style.width = `${CHAT_PET_DISPLAY_SIZE}px`
		this.visual.style.height = `${CHAT_PET_DISPLAY_SIZE}px`
		this.visual.style.transform = `scale(${this.scale})`
		if (!this._customPosition || this.dead || this.onTheRun) {
			const minimumLeft = seat.left
			const maximumLeft = Math.max(minimumLeft, seat.right - this.displaySize)
			const restored = getChatPetRestoredHorizontalPosition(this.prefs.horizontal, minimumLeft, maximumLeft)
			this._left = this.airborne ? this._left : restored
			this._top = this._restingTop()
			if (!this.airborne && !this.dead) setButtonPosition(this.button, this._left, this._top)
		}
		this._updateWideLayers()
		this._updateBounceCounterPosition()
		if (this.airborne && this._throw) this._refreshThrowBounds()
	}

	_syncObserver(seat, chat) {
		if (this._observedSeat !== seat) {
			this._resizeObserver.disconnect()
			this._resizeObserver.observe(seat)
			this._resizeObserver.observe(chat)
			this._observedSeat = seat
			this._observedChat = chat
		}
	}

	_restingTop() {
		if (!this.seatRect) return 0
		return this.seatRect.top - this.displaySize
	}

	_bounds() {
		const seat = this.seatRect
		const chat = this.chatRect
		if (!seat || !chat) return undefined
		return {
			minimumLeft: seat.left,
			maximumLeft: Math.max(seat.left, seat.right - this.displaySize),
			minimumTop: chat.top,
			floorTop: chat.bottom - this.displaySize,
			floorBottom: chat.bottom,
			seatTop: seat.top,
		}
	}

	/* ---------------------------------------------------------------- state */

	setFacts(facts) {
		if (this.disposed) return
		const wasRunning = this.running
		const wasPending = this.pending
		const hadInput = this.hasInput
		this.running = facts.running === true
		this.pending = facts.pendingInteraction === true
		this.hasInput = facts.hasInput === true
		if (this.pending && !wasPending) {
			this.confirmationExpired = false
			this._scheduleConfirmation()
		} else if (!this.pending && wasPending) {
			this.confirmationExpired = false
			clearTimeout(this.confirmationTimer)
			this.confirmationTimer = undefined
		}
		if ((this.running || this.pending) && !wasRunning && !wasPending) {
			this._wake()
			this._clearIdle()
		}
		if (wasRunning && !this.running && !facts.canceled) {
			this._showTransientState('buttonPress', false)
		}
		if (this.hasInput && !hadInput) {
			this._wake()
			this._resetIdle()
		}
		this.recompute()
	}

	_scheduleConfirmation() {
		clearTimeout(this.confirmationTimer)
		this.confirmationTimer = setTimeout(() => {
			this.confirmationTimer = undefined
			this.confirmationExpired = true
			this.recompute()
		}, CHAT_PET_CONFIRMATION_ATTENTION_DURATION)
	}

	recompute(restart = false) {
		if (this.disposed || !this.visible) return
		if (this.onTheRun) {
			this._renderState('onTheRun', restart)
			this.button.classList.add('on-the-run')
			this.button.tabIndex = -1
			return
		}
		this.button.classList.remove('on-the-run')
		if (this.dead) {
			this._showRespawnSequence()
			return
		}
		if (this._jumpGame) return
		const busy = this.running || this.pending
		if (busy) {
			this._clearIdle()
			if (this.idleExpired) {
				this.idleExpired = false
				this._wake()
			}
		} else if (!this.idleExpired && this.idleTimer === undefined) {
			this._resetIdle()
		}
		const base = getChatPetBaseState(this.running, this.pending, this.confirmationExpired, this.hasInput, this.idleExpired, false)
		if (isChatPetYapState(this.transientState) && base !== 'idle') {
			this.transientState = undefined
			clearTimeout(this.transientTimer)
			this.transientTimer = undefined
		}
		const rendered = getChatPetRenderedState(base, this.transientState, this.dragging)
		this.button.tabIndex = rendered === 'sleep' ? 0 : 0
		this._renderState(rendered, restart, this.dragging)
	}

	_resetIdle() {
		this._clearIdle()
		if (this.running || this.pending) return
		this.idleTimer = setTimeout(() => {
			this.idleTimer = undefined
			if (this.running || this.pending || this.dragging || this.airborne) {
				this._resetIdle()
				return
			}
			this.idleExpired = true
			this.recompute()
		}, CHAT_PET_IDLE_SLEEP_DELAY)
	}

	_clearIdle() {
		clearTimeout(this.idleTimer)
		this.idleTimer = undefined
	}

	_wake() {
		const wasSleeping = this.idleExpired || this.renderedState === 'sleep'
		this.idleExpired = false
		if (this.running || this.pending) this._clearIdle()
		else this._resetIdle()
		if (wasSleeping && !this._motionReduced) {
			this.transientState = 'waking'
			clearTimeout(this.transientTimer)
			this.transientTimer = setTimeout(() => {
				this.transientTimer = undefined
				if (this.transientState === 'waking') {
					this.transientState = undefined
					this.recompute()
				}
			}, WAKE_STATE_DURATION)
		}
	}

	_markInteraction() {
		this._wake()
		this._resetIdle()
	}

	showTransient(state) {
		this._showTransientState(state)
	}

	_showTransientState(state, snapFacing = true) {
		if (this.disposed) return
		if (this.transientState === 'achievementUnlocked' && state !== 'achievementUnlocked') return
		if (snapFacing) this._snapFacingToCursor()
		this._wake()
		const rendered = state === 'yapping' && this._motionReduced ? 'yappingMouthOpen' : state
		this.transientState = rendered
		clearTimeout(this.transientTimer)
		if (rendered === 'yapping' || rendered === 'yappingMouthOpen') {
			this.transientTimer = undefined
		} else {
			this.transientTimer = setTimeout(() => {
				this.transientTimer = undefined
				if (this.transientState === rendered) {
					this.transientState = undefined
					this.recompute()
				}
			}, getTransientStateDuration(rendered))
		}
		if (!this.dragging) this._renderState(rendered, true)
	}

	clearTransient() {
		clearTimeout(this.transientTimer)
		this.transientTimer = undefined
		this.transientState = undefined
	}

	/* --------------------------------------------------------------- render */

	_renderState(state, restart = false, useStatic = false) {
		if (!CHAT_PET_SPRITE_SPEC[state]) return
		this._facing.setState(state, useStatic)
		const sources = getChatPetSpriteSources(this.variant)[state]
		if (!sources) return
		const source = this._motionReduced || useStatic ? sources.reducedMotion : sources.animated
		if (!restart && this.activeSource && this.activeSource.url === source.url && this.activeSource.state === state) {
			this.renderedState = state
			this._applyStateAttributes(state)
			this._updateEyes(state, this.activeFrameIndex)
			this._updateSpeechBubble(state)
			return
		}
		if (!restart && this.activeSource && this.activeSource.url === source.url) {
			this.renderedState = state
			this._applyStateAttributes(state)
			this._updateEyes(state, this.activeFrameIndex)
			this._updateEyeAccessory(state, this.activeFrameIndex)
			this._updateSpeechBubble(state)
			return
		}
		const nextSprite = 1 - this.activeSprite
		const canvas = this.spriteCanvases[nextSprite]
		const container = this.spriteContainers[nextSprite]
		const sourceWithState = { ...source, state }
		const apply = image => {
			if (this.disposed) return
			if (!hasChatPetBodyImageDimensions(image, source.frameWidth, source.frameHeight, source.frameCount)) {
				console.warn('[vscode-pet] invalid sprite dimensions', source.url?.slice?.(0, 80))
				return
			}
			container.classList.remove('hidden')
			container.style.width = `${source.frameWidth * 0.5}px`
			container.style.height = `${source.frameHeight * 0.5}px`
			canvas.width = source.frameWidth
			canvas.height = source.frameHeight
			canvas.style.width = `${source.frameWidth * 0.5}px`
			canvas.style.height = `${source.frameHeight * 0.5}px`
			container.classList.toggle('sing', state === 'sing')
			this.spriteContainers[this.activeSprite]?.classList.add('hidden')
			this.activeSprite = nextSprite
			this.activeSource = sourceWithState
			this.renderedState = state
			this._applyStateAttributes(state)
			this._startSpriteAnimation(sourceWithState, canvas, false, () => this._onSpriteAnimationComplete(state), frameIndex => {
				this.activeFrameIndex = frameIndex
				this._updateEyes(state, frameIndex)
			})
			this._updateEyeAccessory(state)
			this._updateSpeechBubble(state)
		}
		const cached = getChatPetCachedImage(source.url)
		if (cached && cached.complete) apply(cached)
		else loadChatPetImage(source.url).then(apply).catch(error => console.warn('[vscode-pet]', error.message))
	}

	_applyStateAttributes(state) {
		this.button.dataset.state = state
		this.button.dataset.facing = this._facing.direction
		this._updateWideLayers()
		this._updateBounceCounterPosition()
	}

	_startSpriteAnimation(source, canvas, reverse, onComplete, onFrame) {
		clearTimeout(this.frameTimer)
		this.frameTimer = undefined
		const context = canvas.getContext('2d')
		if (!context) return
		context.imageSmoothingEnabled = false
		const state = source.state
		const bodyImage = getChatPetCachedImage(source.url)
		if (!bodyImage) return
		const frameWidth = source.frameWidth
		const frameHeight = source.frameHeight
		const drawFrame = animationFrameIndex => {
			const frameIndex = source.frameIndices?.[animationFrameIndex] ?? animationFrameIndex
			this.activeFrameIndex = frameIndex
			const facing = state === 'sing' ? this._facing.direction : 'right'
			// Read the accessory on every frame so switching hats is instant,
			// without restarting the body animation (matching VS Code).
			const accessory = this.accessoryId ? getChatPetAccessoryById(this.accessoryId) : undefined
			const accessorySource = accessory ? getChatPetAccessoryImageSource(accessory) : undefined
			const accessoryImage = accessorySource ? getChatPetCachedImage(accessorySource.url) : undefined
			if (accessorySource && !accessoryImage && this._accessoryLoadUrl !== accessorySource.url) {
				this._accessoryLoadUrl = accessorySource.url
				loadChatPetImage(accessorySource.url).then(() => {
					if (this.disposed) return
					this._accessoryLoadUrl = undefined
					this._redrawActiveFrame?.()
					this._updateEyeAccessory(state, this.activeFrameIndex)
				}).catch(() => { this._accessoryLoadUrl = undefined })
			}
			drawChatPetComposite(
				context,
				bodyImage,
				accessoryImage && accessoryImage.complete ? accessoryImage : undefined,
				frameIndex,
				source.accessoryRigFrame ?? frameIndex,
				frameWidth,
				frameHeight,
				facing,
				state,
				source.fixedDecorations,
				false,
				accessory?.eyeAccessoryMirrorsWithFacing !== false,
				accessory?.coversAntennae === true,
				this.color,
			)
			onFrame?.(frameIndex)
			this._updateEyeAccessory(state, frameIndex)
		}
		this._drawFrame = drawFrame
		this._redrawActiveFrame = drawFrame
		const durations = source.frameDurations ?? []
		if (durations.length === 0) {
			drawFrame(0)
			return
		}
		const totalDuration = durations.reduce((total, duration) => total + duration, 0)
		const start = performance.now()
		let completed = false
		const tick = () => {
			if (this.disposed) return
			if (document.hidden) {
				this.frameTimer = setTimeout(tick, 200)
				return
			}
			const frame = getChatPetAnimationFrame(durations, performance.now() - start, source.iterations, reverse)
			drawFrame(frame.frameIndex)
			if (frame.complete) {
				if (!completed) {
					completed = true
					onComplete?.()
				}
				return
			}
			this.frameTimer = setTimeout(tick, Math.max(1, Math.ceil(frame.nextFrameDelay)))
		}
		drawFrame(reverse ? durations.length - 1 : 0)
		if (durations.length > 1 || totalDuration > 0) this.frameTimer = setTimeout(tick, durations[reverse ? durations.length - 1 : 0])
	}

	_onSpriteAnimationComplete(state) {
		if (state === 'jump') this._hop.onAnimationComplete()
		if (state === 'buttonPress' || state === 'love') this._blink.onAnimationComplete()
	}

	_updateBlink(blinking) {
		this.eyes.classList.toggle('blink', blinking)
		if (blinking) this._gaze = [0, 0]
		this._applyGaze()
	}

	_updateEyes(state, frameIndex) {
		const tracks = doesChatPetStateTrackCursor(state)
		const frame = frameIndex ?? this.activeFrameIndex
		const blinking = doesChatPetStateBlink(state, frame)
		this.eyes.classList.toggle('tracking', tracks)
		this.eyes.classList.toggle('blinking', blinking)
		this.eyes.classList.toggle('bobbed', !this._motionReduced && (state === 'idle' || state === 'rendering' || state === 'achievementUnlocked') && frame >= 20)
		this._blink.setEnabled(!this._motionReduced && !this._jumpGame && (tracks || blinking))
		if (blinking) {
			this._gaze = [0, 0]
			this._applyGaze()
		}
		this.eyes.style.color = getChatPetEyeColor(this.color)
	}

	_updateEyeAccessory(state, frameIndex) {
		const accessory = this.accessoryId ? getChatPetAccessoryById(this.accessoryId) : undefined
		const source = accessory ? getChatPetAccessoryImageSource(accessory) : undefined
		const image = source ? getChatPetCachedImage(source.url) : undefined
		const rig = getChatPetAccessoryRigFrame(state, frameIndex ?? this.activeFrameIndex)
		const visible = Boolean(image && image.complete && rig.rightEye)
		this.eyeAccessoryContainer.classList.toggle('hidden', !visible)
		if (!visible || !image || !source) return
		const frameWidth = CHAT_PET_SPRITE_SPEC[state]?.width ?? 96
		const frameHeight = CHAT_PET_SPRITE_SPEC[state]?.height ?? 96
		if (this.eyeAccessoryCanvas.width !== frameWidth || this.eyeAccessoryCanvas.height !== frameHeight) {
			this.eyeAccessoryCanvas.width = frameWidth
			this.eyeAccessoryCanvas.height = frameHeight
			this.eyeAccessoryContainer.style.width = `${frameWidth * 0.5}px`
			this.eyeAccessoryCanvas.style.width = `${frameWidth * 0.5}px`
			this.eyeAccessoryContainer.style.height = `${frameHeight * 0.5}px`
			this.eyeAccessoryCanvas.style.height = `${frameHeight * 0.5}px`
		}
		const context = this.eyeAccessoryCanvas.getContext('2d')
		if (!context) return
		context.imageSmoothingEnabled = false
		const mirrors = accessory?.eyeAccessoryMirrorsWithFacing !== false
		const fixed = !mirrors
		this.eyeAccessoryContainer.classList.toggle('fixed-orientation', fixed)
		const gazeOffset = mirrors ? undefined : getChatPetEyeAccessoryGazeOffset(this._gaze)
		drawChatPetEyeAccessory(context, image, state, frameIndex ?? this.activeFrameIndex, this._facing.direction, mirrors, gazeOffset)
	}

	_updateWideLayers() {
		if (!this.seatRect || !this.button) return
		const rect = this.button.getBoundingClientRect()
		const offset = getChatPetWideSpriteHorizontalOffset(this.renderedState, this._facing.direction, rect.left, rect.right, this.seatRect.left, this.seatRect.right, this.scale)
		const translate = offset === 0 ? '' : `${offset}px`
		for (const element of [this.spriteContainers[this.activeSprite], this.eyes, this.eyeAccessoryContainer]) {
			if (element) element.style.translate = translate
		}
		const bubbleLeft = shouldPlaceChatPetSpeechBubbleLeft(this.renderedState, rect.right, this.seatRect.right, this.scale)
		this.button.classList.toggle('speech-bubble-left', bubbleLeft)
	}

	_updateSpeechBubble(state) {
		const visible = doesChatPetStateSpeak(state) && !this.dragging && !this.airborne
		this.speechContainer.classList.toggle('hidden', !visible)
		if (!visible) {
			this._speechToken = (this._speechToken ?? 0) + 1
			return
		}
		const token = (this._speechToken = (this._speechToken ?? 0) + 1)
		const sources = getChatPetSpeechSources(this.variant)
		const source = this._motionReduced ? sources.reducedMotion : sources.animated
		const image = getChatPetCachedImage(source.url)
		if (!image) {
			loadChatPetImage(source.url).then(() => this._updateSpeechBubble(state)).catch(() => {})
			return
		}
		const context = this.speechCanvas.getContext('2d')
		if (!context) return
		context.imageSmoothingEnabled = false
		const draw = frameIndex => {
			context.clearRect(0, 0, 96, 96)
			context.drawImage(getChatPetColoredSprite(image, this.color), frameIndex * 96, 0, 96, 96, 0, 0, 96, 96)
			if (state === 'achievementUnlocked' && frameIndex >= 2) drawChatPetAchievementStar(context, this.color)
		}
		draw(0)
		if (source.frameDurations.length > 1) {
			const start = performance.now()
			const tick = () => {
				if (this.disposed || token !== this._speechToken || this.speechContainer.classList.contains('hidden')) return
				const frame = getChatPetAnimationFrame(source.frameDurations, performance.now() - start, source.iterations)
				draw(frame.frameIndex)
				setTimeout(tick, Math.max(1, Math.ceil(frame.nextFrameDelay ?? 200)))
			}
			setTimeout(tick, source.frameDurations[0])
		}
	}

	_updateBounceCounterPosition() {
		if (this.bounceCount === 0) {
			this.bounceCounter.classList.add('hidden')
			return
		}
		const rect = this.button.getBoundingClientRect()
		this.bounceCounter.classList.remove('hidden')
		this.bounceCounter.style.left = `${rect.left + rect.width}px`
		this.bounceCounter.style.top = `${rect.top}px`
	}

	/* ------------------------------------------------------------- pointer */

	_onPointerMove(event) {
		if (this.disposed) return
		if (this._drag && this._drag.pointerId === event.pointerId) return
		this._cursor = { x: event.clientX, y: event.clientY }
		this._scheduleGaze(event.clientX, event.clientY)
		if (this.airborne && this._throw && this._throw.motion.y > 0) this._tryMouseBounce(event)
	}

	_scheduleGaze(x, y) {
		if (this._gazeRaf !== undefined) return
		this._gazeRaf = requestAnimationFrame(() => {
			this._gazeRaf = undefined
			if (!this._cursor || this.disposed) return
			const rect = this.button.getBoundingClientRect()
			const centerX = rect.left + rect.width / 2
			const centerY = rect.top + rect.height / 2
			const next = getChatPetGazeDirection(this._cursor.x, this._cursor.y, centerX, centerY)
			if (this._facing.update(this._cursor.x, centerX) !== this._lastFacing) {
				this._lastFacing = this._facing.direction
				if (this.renderedState === 'idle' && this._directionChanges.record(this._lastFacing, performance.now())) {
					this._showTransientState('dizzy')
				}
			}
			this._gaze = next
			this._applyGaze()
			this.button.dataset.facing = this._facing.direction
			this._updateEyeAccessory(this.renderedState ?? 'idle', this.activeFrameIndex)
			this._updateWideLayers()
		})
	}

	_applyGaze() {
		const x = this._gaze[0] * 2
		const y = this._gaze[1] * 2
		for (const pupil of this.pupils) pupil.style.transform = x === 0 && y === 0 ? '' : `translate(${x}px, ${y}px)`
	}

	_snapFacingToCursor() {
		if (!this._cursor) return
		const rect = this.button.getBoundingClientRect()
		this._facing.snapToCursor(this._cursor.x, rect.left + rect.width / 2)
		this.button.dataset.facing = this._facing.direction
	}

	_onPointerDown(event) {
		if (event.button !== 0 || this._jumpGame || this.dead || this.dragging || this.airborne || this.onTheRun) return
		event.preventDefault()
		event.stopPropagation()
		this.button.focus({ preventScroll: true })
		this._pointerWake = this.idleExpired || this.renderedState === 'sleep' || this.transientState === 'waking'
		this._markInteraction()
		const rect = this.button.getBoundingClientRect()
		this._drag = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startLeft: rect.left,
			startTop: rect.top,
			samples: [{ x: event.clientX, y: event.clientY, time: performance.now() }],
			didDrag: false,
			captured: false,
		}
		this.button.setPointerCapture?.(event.pointerId)
		const move = moveEvent => {
			if (!this._drag || moveEvent.pointerId !== this._drag.pointerId) return
			this._onDragMove(moveEvent)
		}
		const up = upEvent => {
			if (!this._drag || upEvent.pointerId !== this._drag.pointerId) return
			this._onDragEnd(upEvent)
			document.removeEventListener('pointermove', move, true)
			document.removeEventListener('pointerup', up, true)
			document.removeEventListener('pointercancel', up, true)
		}
		document.addEventListener('pointermove', move, true)
		document.addEventListener('pointerup', up, true)
		document.addEventListener('pointercancel', up, true)
	}

	_onDragMove(event) {
		const drag = this._drag
		if (!drag) return
		const dx = event.clientX - drag.startX
		const dy = event.clientY - drag.startY
		const now = performance.now()
		drag.samples.push({ x: event.clientX, y: event.clientY, time: now })
		while (drag.samples.length > 2 && now - drag.samples[0].time > THROW_VELOCITY_SAMPLE_DURATION) drag.samples.shift()
		if (!drag.didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
		if (!drag.didDrag) {
			drag.didDrag = true
			this.dragging = true
			this.button.classList.add('dragging')
			clearTimeout(this.frameTimer)
			this.frameTimer = undefined
			this._renderState('idle', false, true)
		}
		event.preventDefault()
		event.stopPropagation()
		const bounds = this._bounds()
		if (!bounds) return
		const [left, top] = getChatPetDragPosition(drag.startLeft + dx, drag.startTop + dy, bounds.minimumLeft, bounds.maximumLeft, bounds.minimumTop, bounds.floorTop)
		this._left = left
		this._top = top
		this._customPosition = true
		setButtonPosition(this.button, left, top)
		this._updateBounceCounterPosition()
		this._updateWideLayers()
		const landing = getChatPetFallTarget(left, top, this.displaySize, this.displaySize, [this._platform()], bounds.floorBottom)
		this.button.classList.toggle('soft-resisting', landing.platform !== undefined)
		this.button.classList.toggle('resisting', landing.platform === undefined)
	}

	_onDragEnd(event) {
		const drag = this._drag
		if (!drag) return
		this._drag = undefined
		this.button.classList.remove('dragging', 'resisting', 'soft-resisting')
		this.dragging = false
		try { this.button.releasePointerCapture?.(event.pointerId) } catch (ignored) { /* noop */ }
		if (!drag.didDrag) {
			// A simple click is not a position change. Keep a pet that was
			// dragged somewhere earlier exactly where the user left it.
			return
		}
		this._suppressClick = true
		setTimeout(() => { this._suppressClick = false }, 60)
		const velocity = getChatPetThrowVelocity(drag.samples, performance.now())
		if (!this._motionReduced && velocity) this._beginThrow(velocity, false, CHAT_PET_MOUSE_BOUNCE_RELEASE_GRACE_DURATION)
		else this._beginFall(CHAT_PET_MOUSE_BOUNCE_RELEASE_GRACE_DURATION)
	}

	_onClick(event) {
		if (this._pointerWake) {
			this._pointerWake = false
			event.preventDefault()
			event.stopPropagation()
			this.host.status(this._tr('status.wokeUp'))
			return
		}
		if (this._jumpGame || this.dead || this.onTheRun) {
			if (this.onTheRun) this.comeBack()
			return
		}
		if (this._suppressClick) {
			this._suppressClick = false
			event.preventDefault()
			event.stopPropagation()
			return
		}
		this.activate()
	}

	_onKeyDown(event) {
		if (this._jumpGame) return
		if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
			event.preventDefault()
			const rect = this.button.getBoundingClientRect()
			this._openContextMenu(rect.left + rect.width, rect.top)
			return
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			if (this.airborne) this._bounceAirborne(0, 0)
			else this.activate()
			return
		}
		const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
		if (direction === 0) return
		event.preventDefault()
		this._markInteraction()
		this._facing.setDirection(direction < 0 ? 'left' : 'right')
		this._lastFacing = this._facing.direction
		if (this._directionChanges.record(this._facing.direction, performance.now()) || this.transientState === 'dizzy') return
		if (event.shiftKey && !this._motionReduced) {
			this._beginThrow({ x: direction * THROW_KEYBOARD_HORIZONTAL_VELOCITY, y: -THROW_KEYBOARD_UPWARD_VELOCITY })
			return
		}
		this._hopDirection = direction < 0 ? 'left' : 'right'
		this._hop.request(direction, this._motionReduced)
	}

	_setHopDirection(direction) {
		this._hopDirection = direction < 0 ? 'left' : 'right'
		this.button.dataset.hopDirection = this._hopDirection
		this.button.dataset.facing = this._hopDirection
		this._facing.setDirection(this._hopDirection)
		this._lastFacing = this._hopDirection
	}

	_hopBy(delta) {
		if (this.airborne || this.dead || this.onTheRun) return
		const bounds = this._bounds()
		if (!bounds) return
		const next = getChatPetHorizontalPosition((this._left ?? bounds.minimumLeft) + delta, bounds.minimumLeft, bounds.maximumLeft)
		this._left = next
		this._customPosition = true
		setButtonPosition(this.button, this._left, this._top ?? this._restingTop())
		this._updateWideLayers()
	}

	activate() {
		if (this.disposed || this.dead || this.onTheRun || this._jumpGame) return
		if (this.transientState === 'achievementUnlocked') {
			clearTimeout(this.transientTimer)
			this.transientState = undefined
			this.host.openPanel('achievements')
			return
		}
		const wasSleeping = this.idleExpired || this.renderedState === 'sleep'
		if (wasSleeping) {
			this._wake()
			this.recompute()
			this.host.status(this._tr('status.wokeUp'))
			return
		}
		if (this.transientState === 'waking') return
		if (this.running || this.pending) return
		if (this._tryStartJumpGame()) return
		const interaction = getChatPetClickInteraction(Math.random(), this._lastClickInteraction)
		this._lastClickInteraction = interaction
		this._showTransientState(interaction)
		const statusKey = {
			buttonPress: 'status.pressedButton',
			complete: 'status.spun',
			love: 'status.loved',
			cool: 'status.cool',
			yapping: 'status.yapping',
			sing: 'status.singing',
			speechless: 'status.speechless',
			worry: 'status.worried',
		}[interaction]
		if (statusKey) this.host.status(this._tr(statusKey))
	}

	_tryStartJumpGame() {
		if (!this.host.canPlayJumpGame?.()) return false
		this.startJumpGame()
		return true
	}

	/* -------------------------------------------------------------- flight */

	_platform() {
		if (!this.seatRect) return undefined
		return { left: this.seatRect.left, right: this.seatRect.right, top: this.seatRect.top, isDefault: true }
	}

	_beginThrow(velocity, preserveBounceCount = false, mouseBounceDelay = 0) {
		if (this.dead) return
		const bounds = this._bounds()
		if (!bounds) return
		const rect = this.button.getBoundingClientRect()
		if (!preserveBounceCount) this._resetBounceCount()
		this._customPosition = true
		this.airborne = true
		this.dragging = false
		this.button.classList.remove('dragging', 'falling')
		this.button.classList.add('throwing')
		this._throwGeometry = bounds
		this._throw = {
			startTime: performance.now(),
			lastTime: performance.now(),
			motion: { left: rect.left, top: rect.top, x: velocity.x, y: velocity.y, rotation: 0 },
			mouseBounceAvailableAt: performance.now() + mouseBounceDelay,
			velocitySamples: [{ x: velocity.x, y: velocity.y }],
		}
		this._clearIdle()
		this._renderState('falling')
		this._throwFrame = () => this._advanceThrow()
		requestAnimationFrame(this._throwFrame)
	}

	_advanceThrow() {
		if (!this._throw || this.dead || this.disposed) return
		const now = performance.now()
		const elapsed = Math.min(THROW_MAX_FRAME_DURATION, now - this._throw.lastTime)
		this._throw.lastTime = now
		const bounds = this._bounds()
		if (!bounds) return
		const previous = { ...this._throw.motion }
		const step = advanceChatPetThrow(this._throw.motion, elapsed, bounds)
		if (step.wall) {
			this._renderState('wallImpact')
			const rebound = getChatPetWallReboundVelocity(this._throw.motion)
			this._throw.motion = { ...this._throw.motion, x: rebound.x, y: rebound.y }
			setTimeout(() => {
				if (this._throw && this.renderedState === 'wallImpact') this._renderState('falling')
			}, CHAT_PET_WALL_IMPACT_DURATION)
		}
		const horizontalDistance = step.left - previous.left
		const rotation = getChatPetThrowRotation(this._throw.motion.rotation ?? 0, horizontalDistance, step.y, elapsed)
		this._throw.motion = { left: step.left, top: step.top, x: step.x, y: step.y, rotation }
		this._left = step.left
		this._top = step.top
		setButtonPosition(this.button, step.left, step.top)
		const centerX = step.left + this.displaySize / 2
		const platform = this._platform()
		const landing = getChatPetThrowLanding(previous.left, previous.top, step.left, step.top, this.displaySize, this.displaySize, platform ? [platform] : [], bounds.floorTop)
		const rotate = step.wall ? 0 : rotation
		this.button.style.transform = rotate === 0 ? '' : `rotate(${rotate}deg)`
		this._updateBounceCounterPosition()
		if (landing) {
			this._land(landing, step)
			return
		}
		if (shouldSettleChatPetThrow(this._throw.startTime, now, step.top, step.y, bounds.floorTop)) {
			this._beginDeath([step.left, step.top])
			return
		}
		requestAnimationFrame(this._throwFrame)
	}

	_land(landing, step) {
		this._throw = undefined
		this.airborne = false
		this.button.classList.remove('throwing', 'falling')
		this.button.style.transform = ''
		this._left = landing.left
		this._top = landing.top
		setButtonPosition(this.button, landing.left, landing.top)
		this._customPosition = true
		if (!landing.platform) {
			this._beginDeath([landing.left, landing.top])
			return
		}
		this._renderState('splat')
		setTimeout(() => {
			if (this.dead || this.disposed) return
			this._renderState('idle')
			this._resetIdle()
		}, SPLAT_STATE_DURATION)
	}

	_beginFall(delay = 0) {
		if (this.dead) return
		this._beginThrow({ x: 0, y: 0 }, true, delay)
		this.button.classList.add('falling')
	}

	_advanceFall() {
		this._advanceThrow()
	}

	_tryMouseBounce(event) {
		if (!this._throw || this._throw.mouseBounceAvailableAt > performance.now() || !isChatPetMouseBounceEligible(this._throw.motion.y)) return
		const rect = this.button.getBoundingClientRect()
		if (!isChatPetMouseContact(event.clientX, event.clientY, rect)) return
		const previous = this._pointerSamples.length > 0 ? this._pointerSamples[this._pointerSamples.length - 1] : { x: event.clientX, y: event.clientY, time: performance.now() - 16 }
		const now = performance.now()
		const pointerVelocity = {
			x: (event.clientX - previous.x) / Math.max(16, now - previous.time) * 1000,
			y: (event.clientY - previous.y) / Math.max(16, now - previous.time) * 1000,
		}
		this._pointerSamples.push({ x: event.clientX, y: event.clientY, time: now })
		if (this._pointerSamples.length > 8) this._pointerSamples.shift()
		this._bounceAirborne(pointerVelocity.x, pointerVelocity.y)
	}

	_bounceAirborne(pointerX, pointerY) {
		if (!this._throw) return
		const rect = this.button.getBoundingClientRect()
		const rebound = getChatPetMouseBounceVelocity(this._throw.motion, { x: pointerX, y: pointerY }, pointerX || rect.left + rect.width / 2, rect.left, rect.width)
		this._throw.motion = { ...this._throw.motion, x: rebound.x, y: rebound.y }
		this._throw.mouseBounceAvailableAt = performance.now() + CHAT_PET_MOUSE_BOUNCE_RELEASE_GRACE_DURATION
		this._throw.lastTime = performance.now()
		this._bounceCount++
		this.bounceCounter.textContent = String(this._bounceCount)
		this.bounceCounter.classList.remove('hidden')
		this._updateBounceCounterPosition()
		this.host.status(this._tr('status.bounceCount', this._bounceCount))
		this._resetBounceTimer()
		if (shouldCelebrateChatPetBounceScore(this._bounceCount)) this._showConfetti()
	}

	_resetBounceTimer() {
		clearTimeout(this.bounceTimer)
		this.bounceTimer = setTimeout(() => this._resetBounceCount(), CHAT_PET_BOUNCE_RESULT_DURATION)
	}

	_resetBounceCount() {
		this.bounceCount = 0
		clearTimeout(this.bounceTimer)
		this.bounceTimer = undefined
		this.bounceCounter.classList.add('hidden')
		this.bounceCounter.textContent = ''
	}

	_showConfetti() {
		if (this._motionReduced) return
		const rect = this.button.getBoundingClientRect()
		this.confettiAnchor.style.left = `${rect.left}px`
		this.confettiAnchor.style.top = `${rect.top}px`
		this.confettiAnchor.style.width = `${rect.width}px`
		this.confettiAnchor.style.height = `${rect.height}px`
		for (let index = 0; index < 24; index++) {
			const bit = createElement('span', 'chat-pet-confetti')
			bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`)
			bit.style.setProperty('--dy', `${-40 - Math.random() * 100}px`)
			bit.style.setProperty('--delay', `${Math.random() * 120}ms`)
			bit.style.background = ['#ffcd0f', '#23a8f2', '#e6536f', '#55b85a', '#a277e6'][index % 5]
			this.confettiAnchor.append(bit)
			setTimeout(() => bit.remove(), 1200)
		}
	}

	_beginDeath(position) {
		if (this.dead) return
		this.dead = true
		this.airborne = false
		this._throw = undefined
		this.button.classList.remove('throwing', 'falling')
		this.button.style.transform = ''
		this._deathPosition = position
		this._respawnPhase = 'despawning'
		this.button.classList.add('hidden')
		this.button.tabIndex = -1
		this.host.status(this._tr('status.fellOff'))
		this._showRespawnSequence()
	}

	_showRespawnSequence() {
		if (!this.dead) return
		this.respawnContainer.classList.remove('hidden')
		const bounds = this._bounds()
		if (!bounds) return
		const position = this._respawnPhase === 'respawning'
			? (this._respawnPosition ?? [getChatPetDefaultHorizontalPosition(bounds.minimumLeft, bounds.maximumLeft), bounds.minimumTop])
			: (this._deathPosition ?? [this._left, this._top])
		this.respawnContainer.style.left = `${position[0]}px`
		this.respawnContainer.style.top = `${position[1]}px`
		const sources = getChatPetRespawnSources(this.variant)
		const source = this._motionReduced ? sources.reducedMotion : sources.animated
		const image = getChatPetCachedImage(source.url)
		if (!image) {
			loadChatPetImage(source.url).then(() => this._showRespawnSequence()).catch(() => {})
			return
		}
		const context = this.respawnCanvas.getContext('2d')
		if (!context) return
		context.imageSmoothingEnabled = false
		const reverse = this._respawnPhase === 'despawning'
		const draw = frameIndex => {
			context.clearRect(0, 0, 96, 96)
			context.drawImage(getChatPetColoredSprite(image, this.color), frameIndex * 96, 0, 96, 96, 0, 0, 96, 96)
		}
		draw(reverse ? 5 : 0)
		if (this._motionReduced) {
			clearTimeout(this.respawnTimer)
			this.respawnTimer = setTimeout(() => this._finishRespawn(), RESPAWN_EFFECT_REDUCED_MOTION_DURATION)
			return
		}
		const durations = source.frameDurations
		if (!durations || durations.length === 0) {
			this._finishRespawn()
			return
		}
		const start = performance.now()
		const tick = () => {
			if (this.disposed || !this.dead) return
			const frame = getChatPetAnimationFrame(durations, performance.now() - start, 1, reverse)
			draw(frame.frameIndex)
			if (frame.complete) {
				this._finishRespawn()
				return
			}
			setTimeout(tick, Math.max(1, Math.ceil(frame.nextFrameDelay)))
		}
		setTimeout(tick, durations[reverse ? durations.length - 1 : 0])
	}

	_finishRespawn() {
		if (!this.dead) return
		if (this._respawnPhase === 'despawning') {
			this._respawnPhase = 'respawning'
			const bounds = this._bounds()
			if (bounds) this._respawnPosition = [getChatPetDefaultHorizontalPosition(bounds.minimumLeft, bounds.maximumLeft), bounds.minimumTop]
			this._showRespawnSequence()
			return
		}
		this.dead = false
		this._respawnPhase = 'none'
		this.respawnContainer.classList.add('hidden')
		this.button.classList.remove('hidden')
		this.button.tabIndex = 0
		const bounds = this._bounds()
		if (bounds) {
			this._left = this._respawnPosition?.[0] ?? getChatPetDefaultHorizontalPosition(bounds.minimumLeft, bounds.maximumLeft)
			this._top = bounds.minimumTop
			setButtonPosition(this.button, this._left, this._top)
			this._customPosition = true
			this._beginFall()
		}
	}

	/* ------------------------------------------------------------- on run */

	setOnTheRun(value) {
		this.onTheRun = value
		chatPetPrefs.set({ onTheRun: value })
		clearTimeout(this.transientTimer)
		this.transientState = undefined
		clearInterval(this._runTimer)
		this._runTimer = undefined
		this.button.classList.toggle('on-the-run', value)
		this.button.classList.remove('peeking')
		if (value) {
			this._clearIdle()
			this._startRunTimer()
			this.host.status(this._tr('status.onTheRun'))
		} else {
			clearInterval(this._runTimer)
			this._runTimer = undefined
			this.button.classList.remove('returning-from-run')
			this._resetIdle()
			this.host.status(this._tr('status.comeBack'))
		}
		this.recompute(true)
	}

	comeBack() {
		if (this.onTheRun) this.setOnTheRun(false)
	}

	/* --------------------------------------------------------------- prefs */

	applyPrefs() {
		const prefs = chatPetPrefs.get()
		const oldVariant = this.variant
		const wasVisible = this.visible
		this.prefs = prefs
		this.scale = prefs.scale
		this.color = prefs.color
		this.variant = getChatPetColorVariant(this.color)
		const accessoryChanged = this.accessoryId !== prefs.accessory
		this.accessoryId = prefs.accessory
		this.onTheRun = prefs.onTheRun
		if (prefs.visible === false) {
			this.setVisible(false)
			return
		}
		if (!wasVisible) {
			this.setVisible(true)
			return
		}
		this.layout()
		if (oldVariant !== this.variant) {
			this._preload()
			this._renderState(this.renderedState ?? 'idle', true)
		} else {
			this._drawFrame?.(this.activeFrameIndex)
		}
		if (accessoryChanged) this._updateEyeAccessory(this.renderedState ?? 'idle', this.activeFrameIndex)
		this._updateEyes(this.renderedState ?? 'idle', this.activeFrameIndex)
	}

	selectAccessory(id) {
		chatPetPrefs.set({ accessory: id })
	}

	selectColor(color) {
		chatPetPrefs.set({ color })
	}

	setScale(scale) {
		chatPetPrefs.set({ scale })
	}

	grow() {
		const next = getChatPetScale(this.scale, CHAT_PET_SCALE_STEP)
		this.setScale(next)
		this.host.status(this._tr('status.grew', Math.round(next * 100)))
	}

	shrink() {
		const next = getChatPetScale(this.scale, -CHAT_PET_SCALE_STEP)
		this.setScale(next)
		this.host.status(this._tr('status.shrank', Math.round(next * 100)))
	}

	resetSize() {
		this.setScale(1)
		this.host.status(this._tr('status.sizeReset', 100))
	}

	unlockTrueName() {
		if (!chatPetPrefs.get().trueNameUnlocked) chatPetPrefs.set({ trueNameUnlocked: true })
		this._showTransientState('achievementUnlocked')
		this.host.status(this._tr('achievements.unlockedStatus', this._tr('achievement.blobby.title')))
		this.host.openPanel('color')
	}

	/* ---------------------------------------------------------------- menu */

	_openContextMenu(x, y) {
		if (this._jumpGame) return
		this._uiOpen = true
		this.host.openMenu({ x, y })
	}

	closeMenu() { this._uiOpen = false }

	/* -------------------------------------------------------------- status */

	_tr(key, ...args) {
		return translateChatPetText(this.host.getT(), key, ...args)
	}

	status(key, ...args) {
		this.host.status(this._tr(key, ...args))
	}

	/* ------------------------------------------------------------- cleanup */

	_onVisibilityChange() {
		if (document.hidden) {
			clearTimeout(this.frameTimer)
			this.frameTimer = undefined
		} else {
			this._renderState(this.renderedState ?? 'idle', true)
		}
	}

	destroy() {
		this.disposed = true
		this._blink.cancel()
		this._hop.cancel()
		clearTimeout(this.idleTimer)
		clearTimeout(this.transientTimer)
		clearTimeout(this.confirmationTimer)
		clearTimeout(this.bounceTimer)
		clearTimeout(this.respawnTimer)
		clearTimeout(this.frameTimer)
		clearInterval(this._runTimer)
		if (this._gazeRaf !== undefined) cancelAnimationFrame(this._gazeRaf)
		this._resizeObserver?.disconnect()
		for (const remove of this._listeners ?? []) remove()
		if (this._motionQuery?.removeEventListener && this._motionListener) this._motionQuery.removeEventListener('change', this._motionListener)
		this._jumpGame?.destroy()
		this.root.remove()
	}

	/* ---------------------------------------------------------- jump game */

	startJumpGame() {
		if (this._jumpGame || this.dead || this.onTheRun || !this.chatRect) return
		this.host.closeUi()
		try {
			this._jumpGame = new BlobbyJumpGame(this, this.host)
			this._jumpGame.start()
		} catch (error) {
			this._jumpGame = undefined
			console.warn('[vscode-pet] jump game unavailable', error)
		}
	}

	stopJumpGame(reason) {
		const game = this._jumpGame
		if (!game) return
		this._jumpGame = undefined
		game.destroy()
		this.button.classList.remove('jump-game-pet')
		if (reason === 'fall' || reason === 'blur') {
			this._customPosition = false
			this.layout()
			this._beginFall()
		} else {
			this._customPosition = false
			this.layout()
			this.recompute(true)
		}
	}

	getSnapshot() {
		return {
			state: this.renderedState,
			base: getChatPetBaseState(this.running, this.pending, this.confirmationExpired, this.hasInput, this.idleExpired),
			visible: this.visible,
			running: this.running,
			pending: this.pending,
			hasInput: this.hasInput,
			scale: this.scale,
			color: this.color,
			accessory: this.accessoryId,
			onTheRun: this.onTheRun,
			dead: this.dead,
			airborne: this.airborne,
			bounce: this.bounceCount,
		}
	}
}
