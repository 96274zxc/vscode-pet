/* Pure state, timing and physics helpers. Ported from chatPetWidget.ts. */

function clamp(value, minimum, maximum) {
	return Math.max(minimum, Math.min(maximum, value))
}

function getChatPetVariant(quality) {
	return quality === 'stable' ? 'stable' : 'insiders'
}

function getChatPetBuddyName(quality) {
	return quality === 'stable' ? 'buddy-idle-stable' : 'buddy-idle-insiders'
}

function doesChatPetStateTrackCursor(state) {
	return state !== undefined && state !== 'sleep' && state !== 'waking' && state !== 'typing' && state !== 'painting'
		&& state !== 'buttonPress' && state !== 'complete' && state !== 'jump' && state !== 'love'
		&& state !== 'cool' && state !== 'yappingMouthOpen' && state !== 'sing' && state !== 'speechless'
		&& state !== 'worry' && state !== 'dizzy' && state !== 'falling' && state !== 'wallImpact'
		&& state !== 'splat' && state !== 'onTheRun' && state !== 'searching' && state !== 'searchingDown'
}

function doesChatPetStateBlink(state, frameIndex) {
	return (state === 'typing' || state === 'painting' || state === 'buttonPress' || state === 'love')
		&& (state !== 'buttonPress' || frameIndex !== BUTTON_PRESS_FRAME_DURATIONS.length - 1)
}

function getChatPetSpriteName(state, quality) {
	const variant = getChatPetVariant(quality)
	switch (state) {
		case 'love': return `buddy-love-${variant}`
		case 'clapping': return `buddy-clapping-${variant}`
		case 'cool': return `buddy-cool-${variant}`
		case 'buttonPress': return `buddy-press-button-${variant}`
		case 'falling': return `buddy-falling-${variant}`
		case 'jump': return `buddy-jump-${variant}`
		case 'dizzy': return `buddy-dizzy-${variant}`
		case 'wallImpact': return `buddy-wall-impact-${variant}`
		case 'splat': return `buddy-splat-${variant}`
		case 'onTheRun':
		case 'searching':
		case 'searchingDown': return `buddy-search-${variant}`
		case 'sleep': return `buddy-sleep-${variant}`
		case 'waking': return `buddy-waking-${variant}`
		case 'typing': return `buddy-typing-${variant}`
		case 'painting': return `buddy-painting-${variant}`
		case 'rendering':
		case 'achievementUnlocked': return `buddy-rendering-${variant}`
		case 'yappingMouthOpen': return `buddy-yapping-${variant}`
		case 'sing':
		case 'speechless':
		case 'worry': return `buddy-${state}-${variant}`
		default: return getChatPetBuddyName(quality)
	}
}

function getChatPetFrameDurations(state) {
	switch (state) {
		case 'sleep': return SLEEP_FRAME_DURATIONS
		case 'waking': return WAKE_FRAME_DURATIONS
		case 'typing': return TYPING_FRAME_DURATIONS
		case 'painting': return PAINTING_FRAME_DURATIONS
		case 'buttonPress': return BUTTON_PRESS_FRAME_DURATIONS
		case 'falling': return FALLING_FRAME_DURATIONS
		case 'jump': return JUMP_FRAME_DURATIONS
		case 'splat': return SPLAT_FRAME_DURATIONS
		case 'rendering':
		case 'achievementUnlocked': return IDLE_FRAME_DURATIONS
		case 'clapping': return CLAPPING_FRAME_DURATIONS
		case 'love': return LOVE_FRAME_DURATIONS
		case 'cool': return COOL_FRAME_DURATIONS
		case 'sing': return SING_FRAME_DURATIONS
		case 'speechless': return SPEECHLESS_FRAME_DURATIONS
		case 'worry': return WORRY_FRAME_DURATIONS
		case 'dizzy': return DIZZY_FRAME_DURATIONS
		case 'searching': return SEARCH_FRAME_DURATIONS
		case 'onTheRun':
		case 'wallImpact':
		case 'searchingDown':
		case 'yappingMouthOpen':
		case 'yapping': return []
		default: return IDLE_FRAME_DURATIONS
	}
}

function doesChatPetStateSpeak(state) {
	return state === 'rendering' || state === 'achievementUnlocked'
}

function getChatPetBaseState(hasActiveRequest, needsInput, confirmationAttentionExpired, hasInput, idleExpired, isGeneratingImage = false) {
	if (needsInput) return confirmationAttentionExpired ? 'idle' : 'clapping'
	if (hasActiveRequest) return isGeneratingImage ? 'painting' : 'rendering'
	if (idleExpired) return 'sleep'
	if (hasInput) return 'typing'
	return 'idle'
}

function isChatPetYapState(state) {
	return state === 'yapping' || state === 'yappingMouthOpen'
}

function getChatPetRenderedState(baseState, transientState, isDragging) {
	if (isDragging) return 'idle'
	if (isChatPetYapState(transientState) && baseState !== 'idle') return baseState
	return transientState ?? baseState
}

function getChatPetAnimationFrame(frameDurations, elapsed, iterations, reverse = false) {
	if (frameDurations.length === 0) return { frameIndex: 0, complete: true }
	const totalDuration = frameDurations.reduce((total, duration) => total + duration, 0)
	const lastFrameIndex = frameDurations.length - 1
	if (elapsed >= totalDuration * iterations) {
		return { frameIndex: reverse ? 0 : lastFrameIndex, complete: true }
	}
	const iterationElapsed = Math.max(0, elapsed) % totalDuration
	let frameEnd = 0
	for (let animationFrameIndex = 0; animationFrameIndex < frameDurations.length; animationFrameIndex++) {
		const frameIndex = reverse ? lastFrameIndex - animationFrameIndex : animationFrameIndex
		frameEnd += frameDurations[frameIndex]
		if (iterationElapsed < frameEnd) {
			return { frameIndex, complete: false, nextFrameDelay: frameEnd - iterationElapsed }
		}
	}
	return { frameIndex: reverse ? 0 : lastFrameIndex, complete: false, nextFrameDelay: totalDuration }
}

function getTransientStateDuration(state) {
	switch (state) {
		case 'buttonPress': return BUTTON_PRESS_STATE_DURATION
		case 'complete': return COMPLETE_STATE_DURATION
		case 'splat': return SPLAT_STATE_DURATION
		case 'love': return LOVE_STATE_DURATION
		case 'cool': return COOL_STATE_DURATION
		case 'sing': return SING_STATE_DURATION
		case 'speechless': return SPEECHLESS_STATE_DURATION
		case 'worry': return WORRY_STATE_DURATION
		case 'dizzy': return DIZZY_STATE_DURATION
		case 'achievementUnlocked': return CHAT_PET_ACHIEVEMENT_UNLOCKED_DURATION
		case 'waking': return WAKE_STATE_DURATION
		default: return TRANSIENT_STATE_DURATION
	}
}

function getChatPetClickInteraction(random, previousInteraction) {
	if (random < CHAT_PET_ICON_TRANSFORMATION_CHANCE) return 'complete'
	const yappingThreshold = CHAT_PET_ICON_TRANSFORMATION_CHANCE + CHAT_PET_YAPPING_CHANCE
	if (random < yappingThreshold) return 'yapping'
	const interactions = ['buttonPress', 'love', 'cool', 'sing', 'speechless', 'worry']
	const available = interactions.filter(interaction => interaction !== previousInteraction)
	const normalized = (random - yappingThreshold) / (1 - yappingThreshold)
	return available[Math.min(Math.floor(normalized * available.length), available.length - 1)]
}

function getChatPetBlinkDelay(random) {
	const normalized = Math.max(0, Math.min(1, random))
	return BLINK_MIN_DELAY + Math.round(normalized * (BLINK_MAX_DELAY - BLINK_MIN_DELAY))
}

function getChatPetGazeDirection(cursorX, cursorY, petCenterX, petCenterY) {
	const deltaX = cursorX - petCenterX
	const deltaY = cursorY - petCenterY
	const distance = Math.hypot(deltaX, deltaY)
	if (distance === 0) return [0, 0]
	return [Math.round(deltaX / distance), Math.round(deltaY / distance)]
}

function getChatPetEyeAccessoryGazeOffset(gazeDirection) {
	return [gazeDirection[0] * 4, gazeDirection[1] * 4]
}

function getChatPetEyeAccessoryGazeOffsetForState(state, gazeDirection) {
	return doesChatPetStateTrackCursor(state) ? getChatPetEyeAccessoryGazeOffset(gazeDirection) : undefined
}

function getChatPetHorizontalPosition(left, minimumLeft, maximumLeft) {
	return Math.max(minimumLeft, Math.min(Math.max(minimumLeft, maximumLeft), left))
}

function getChatPetDefaultHorizontalPosition(minimumLeft, maximumLeft) {
	return Math.max(minimumLeft, maximumLeft - CHAT_PET_DEFAULT_RIGHT_INSET)
}

function getChatPetRestoredHorizontalPosition(position, minimumLeft, maximumLeft) {
	if (position === undefined || position === null) return getChatPetDefaultHorizontalPosition(minimumLeft, maximumLeft)
	if (typeof position === 'number') {
		return getChatPetHorizontalPosition(minimumLeft + position * Math.max(0, maximumLeft - minimumLeft), minimumLeft, maximumLeft)
	}
	return getChatPetAnchoredHorizontalPosition(position, minimumLeft, maximumLeft)
}

function getChatPetRelativeHorizontalPosition(left, minimumLeft, maximumLeft) {
	const range = maximumLeft - minimumLeft
	if (range <= 0) return undefined
	return Math.max(0, Math.min(1, (left - minimumLeft) / range))
}

function getChatPetHorizontalAnchor(left, minimumLeft, maximumLeft) {
	const clampedLeft = getChatPetHorizontalPosition(left, minimumLeft, maximumLeft)
	const normalizedMaximumLeft = Math.max(minimumLeft, maximumLeft)
	const leftInset = clampedLeft - minimumLeft
	const rightInset = normalizedMaximumLeft - clampedLeft
	return leftInset <= rightInset ? { edge: 'left', inset: leftInset } : { edge: 'right', inset: rightInset }
}

function getChatPetAnchoredHorizontalPosition(anchor, minimumLeft, maximumLeft) {
	const normalizedMaximumLeft = Math.max(minimumLeft, maximumLeft)
	const left = anchor.edge === 'left' ? minimumLeft + anchor.inset : normalizedMaximumLeft - anchor.inset
	return getChatPetHorizontalPosition(left, minimumLeft, normalizedMaximumLeft)
}

function getChatPetScale(scale, delta) {
	return Math.max(CHAT_PET_MIN_SCALE, Math.round((scale + delta) * 10) / 10)
}

function getChatPetDragPosition(left, top, minimumLeft, maximumLeft, minimumTop, maximumTop) {
	return [
		getChatPetHorizontalPosition(left, minimumLeft, maximumLeft),
		Math.max(minimumTop, Math.min(Math.max(minimumTop, maximumTop), top)),
	]
}

function getChatPetThrowVelocity(samples, releaseTime) {
	if (samples.length < 2) return undefined
	const latest = samples[samples.length - 1]
	if (releaseTime - latest.time > THROW_RELEASE_GRACE_DURATION) return undefined
	let first = latest
	for (let index = samples.length - 2; index >= 0; index--) {
		const sample = samples[index]
		if (latest.time - sample.time > THROW_VELOCITY_SAMPLE_DURATION) break
		first = sample
	}
	const elapsed = Math.max(16, latest.time - first.time)
	const velocityX = (latest.x - first.x) / elapsed * 1000
	const velocityY = (latest.y - first.y) / elapsed * 1000
	const speed = Math.hypot(velocityX, velocityY)
	if (speed < THROW_MIN_VELOCITY) return undefined
	const scale = Math.min(1, THROW_MAX_VELOCITY / speed)
	return { x: velocityX * scale, y: velocityY * scale }
}

function getChatPetWallReboundVelocity(velocity) {
	return { x: -velocity.x * THROW_WALL_RESTITUTION, y: velocity.y }
}

function getChatPetMouseBounceVelocity(motion, pointerVelocity, pointerX, petLeft, petWidth) {
	const petCenter = petLeft + petWidth / 2
	const horizontalOffset = petWidth > 0 ? Math.max(-1, Math.min(1, (petCenter - pointerX) / (petWidth / 2))) : 0
	const horizontalVelocity = motion.x * MOUSE_BOUNCE_HORIZONTAL_RETENTION
		+ pointerVelocity.x * MOUSE_BOUNCE_HORIZONTAL_TRANSFER
		+ horizontalOffset * MOUSE_BOUNCE_EDGE_KICK
	const upwardVelocity = Math.max(
		MOUSE_BOUNCE_MIN_UPWARD_VELOCITY,
		Math.max(0, motion.y) * MOUSE_BOUNCE_VERTICAL_RESTITUTION + Math.max(0, -pointerVelocity.y) * MOUSE_BOUNCE_UPWARD_TRANSFER,
	)
	return {
		x: Math.max(-MOUSE_BOUNCE_MAX_HORIZONTAL_VELOCITY, Math.min(MOUSE_BOUNCE_MAX_HORIZONTAL_VELOCITY, horizontalVelocity)),
		y: -Math.min(MOUSE_BOUNCE_MAX_UPWARD_VELOCITY, upwardVelocity),
	}
}

function isChatPetMouseContact(pointerX, pointerY, bounds) {
	return pointerX >= bounds.left && pointerX <= bounds.right && pointerY >= bounds.top && pointerY <= bounds.bottom
}

function isChatPetMouseBounceEligible(verticalVelocity) {
	return verticalVelocity > 0
}

function shouldDismissChatPetBounceResult(state) {
	return state !== 'idle' && state !== 'splat'
}

function shouldCelebrateChatPetBounceScore(score) {
	return score >= CHAT_PET_CONFETTI_SCORE
}

function getChatPetMouseCollisionAxisInterval(start, end, minimum, maximum) {
	const delta = end - start
	if (delta === 0) return start >= minimum && start <= maximum ? [0, 1] : undefined
	const first = (minimum - start) / delta
	const second = (maximum - start) / delta
	const entry = Math.min(first, second)
	const exit = Math.max(first, second)
	if (exit < 0 || entry > 1) return undefined
	return [Math.max(0, entry), Math.min(1, exit)]
}

function getChatPetMouseCollisionTime(previousLeft, previousTop, left, top, petWidth, petHeight, pointerX, pointerY) {
	const horizontal = getChatPetMouseCollisionAxisInterval(previousLeft, left, pointerX - petWidth, pointerX)
	const vertical = getChatPetMouseCollisionAxisInterval(previousTop, top, pointerY - petHeight, pointerY)
	if (!horizontal || !vertical) return undefined
	const entry = Math.max(horizontal[0], vertical[0])
	const exit = Math.min(horizontal[1], vertical[1])
	return entry <= exit ? entry : undefined
}

function getChatPetThrowRotation(rotation, horizontalDistance, verticalVelocity, elapsed) {
	const selfRightingProgress = Math.max(0, Math.min(1, (verticalVelocity - THROW_SELF_RIGHTING_START_VELOCITY) / -THROW_SELF_RIGHTING_START_VELOCITY))
	const nextRotation = rotation + horizontalDistance * THROW_ROTATION_PER_PIXEL * (1 - selfRightingProgress)
	const uprightRotation = horizontalDistance > 0
		? Math.ceil(nextRotation / 360) * 360
		: horizontalDistance < 0
			? Math.floor(nextRotation / 360) * 360
			: Math.round(nextRotation / 360) * 360
	const rotationDelta = uprightRotation - nextRotation
	const maximumCorrection = THROW_SELF_RIGHTING_SPEED * Math.max(0, elapsed) / 1000 * selfRightingProgress
	return Math.abs(rotationDelta) <= maximumCorrection
		? uprightRotation
		: nextRotation + Math.sign(rotationDelta) * maximumCorrection
}

function advanceChatPetThrow(motion, elapsed, bounds) {
	const duration = Math.max(0, elapsed) / 1000
	const projectedLeft = motion.left + motion.x * duration
	const hasHorizontalRange = bounds.maximumLeft > bounds.minimumLeft
	let wall
	let motionDuration = duration
	let left = hasHorizontalRange ? projectedLeft : bounds.minimumLeft
	if (hasHorizontalRange && projectedLeft < bounds.minimumLeft) {
		wall = 'left'
		motionDuration *= (bounds.minimumLeft - motion.left) / (projectedLeft - motion.left)
		left = bounds.minimumLeft
	} else if (hasHorizontalRange && projectedLeft > bounds.maximumLeft) {
		wall = 'right'
		motionDuration *= (bounds.maximumLeft - motion.left) / (projectedLeft - motion.left)
		left = bounds.maximumLeft
	}
	let top = motion.top + motion.y * motionDuration + THROW_GRAVITY * motionDuration * motionDuration / 2
	let velocityY = motion.y + THROW_GRAVITY * motionDuration
	if (top < bounds.minimumTop) {
		top = bounds.minimumTop
		velocityY = Math.abs(velocityY) * THROW_CEILING_RESTITUTION
	}
	return { left, top, x: hasHorizontalRange ? motion.x : 0, y: velocityY, wall }
}

function shouldSettleChatPetThrow(startTime, currentTime, top, verticalVelocity, floorTop) {
	return currentTime - startTime >= THROW_MAX_DURATION || (top > floorTop && verticalVelocity >= 0)
}

function getChatPetThrowLanding(previousLeft, previousTop, left, top, petWidth, petHeight, platforms, floorTop) {
	if (top <= previousTop) return undefined
	const getLeftAtTop = targetTop => previousLeft + (left - previousLeft) * (targetTop - previousTop) / (top - previousTop)
	let landing = previousTop <= floorTop && top >= floorTop
		? { left: getLeftAtTop(floorTop), top: floorTop, platform: undefined }
		: undefined
	for (const platform of platforms) {
		const platformLandingTop = platform.top - petHeight
		if (previousTop > platformLandingTop || top < platformLandingTop || (landing && platformLandingTop >= landing.top)) continue
		const landingLeft = getLeftAtTop(platformLandingTop)
		const petCenter = landingLeft + petWidth / 2
		if (petCenter >= platform.left && petCenter <= platform.right) {
			landing = { left: landingLeft, top: platformLandingTop, platform }
		}
	}
	return landing
}

function getChatPetFallTarget(petLeft, petTop, petWidth, petHeight, platforms, floorBottom) {
	const floorTop = floorBottom - petHeight
	return getChatPetThrowLanding(petLeft, petTop, petLeft, Math.max(petTop + 1, floorTop), petWidth, petHeight, platforms, floorTop)
		?? { left: petLeft, top: petTop, platform: undefined }
}

function getChatPetFallDuration(distance) {
	return Math.max(180, Math.min(700, Math.sqrt(Math.abs(distance)) * 20))
}

function getChatPetVerticalOffset(hostTop, inputTop) {
	return Math.max(0, Math.min(CHAT_PET_MAX_VERTICAL_OFFSET, inputTop - hostTop))
}

function getChatPetPlatformTop(hostTop, inputTop, substantiveSurfaceTop) {
	if (substantiveSurfaceTop !== undefined && substantiveSurfaceTop <= inputTop) return substantiveSurfaceTop
	return hostTop + getChatPetVerticalOffset(hostTop, inputTop)
}

function getChatPetRespawnTop(chatTop, inputTop, drop = CHAT_PET_RESPAWN_DROP) {
	return Math.max(chatTop, inputTop - Math.max(0, drop))
}

function getChatPetRelativeHorizontalPositionSafe(left, minimumLeft, maximumLeft) {
	return getChatPetRelativeHorizontalPosition(left, minimumLeft, maximumLeft)
}

function shouldPlaceChatPetSpeechBubbleLeft(state, buttonRight, inputRight, scale = 1) {
	return state === 'rendering' && buttonRight + CHAT_PET_SPEECH_BUBBLE_RIGHT_OVERHANG * scale > inputRight
}

function getChatPetWideSpriteHorizontalOffset(state, facingDirection, buttonLeft, buttonRight, inputLeft, inputRight, scale = 1) {
	const overhang = state === 'sleep' || state === 'waking'
		? CHAT_PET_SLEEP_RIGHT_OVERHANG
		: state === 'typing'
			? CHAT_PET_TYPING_RIGHT_OVERHANG
			: state === 'painting'
				? CHAT_PET_PAINTING_RIGHT_OVERHANG
				: state === 'buttonPress'
					? CHAT_PET_BUTTON_PRESS_RIGHT_OVERHANG
					: state === 'sing' ? CHAT_PET_SING_RIGHT_OVERHANG : 0
	if (overhang === 0) return 0
	return facingDirection === 'left'
		? Math.max(0, overhang - (buttonLeft - inputLeft) / scale)
		: Math.min(0, (inputRight - buttonRight) / scale - overhang)
}

class ChatPetBlinkController {
	constructor(onBlinkChange, random = Math.random) {
		this.onBlinkChange = onBlinkChange
		this.random = random
		this._timer = undefined
		this._enabled = false
		this._blinking = false
	}
	setEnabled(enabled) {
		if (this._enabled === enabled) return
		this._enabled = enabled
		this.cancel()
		this._setBlinking(false)
		if (enabled) this._scheduleBlink()
	}
	onAnimationComplete() {
		if (!this._blinking) return
		this._setBlinking(false)
		if (this._enabled) this._scheduleBlink()
	}
	cancel() {
		if (this._timer !== undefined) {
			clearTimeout(this._timer)
			this._timer = undefined
		}
	}
	_scheduleBlink() {
		this.cancel()
		this._timer = setTimeout(() => {
			this._timer = undefined
			if (this._enabled) this._setBlinking(true)
		}, getChatPetBlinkDelay(this.random()))
	}
	_setBlinking(blinking) {
		if (this._blinking === blinking) return
		this._blinking = blinking
		this.onBlinkChange(blinking)
	}
}

class ChatPetFacingController {
	constructor() {
		this._direction = 'right'
		this._tracksCursor = false
	}
	get direction() { return this._direction }
	setDirection(direction) { this._direction = direction }
	setState(state, isDragging) { this._tracksCursor = state === 'idle' && !isDragging }
	snapToCursor(cursorX, petCenterX) {
		if (cursorX < petCenterX) this.setDirection('left')
		else if (cursorX > petCenterX) this.setDirection('right')
		return this._direction
	}
	update(cursorX, petCenterX) {
		return this._tracksCursor ? this.snapToCursor(cursorX, petCenterX) : this._direction
	}
}

class ChatPetDirectionChangeController {
	constructor(directionChangeCount = DIZZY_DIRECTION_CHANGE_COUNT, maxDirectionChangeInterval = DIZZY_DIRECTION_CHANGE_MAX_INTERVAL) {
		this.directionChangeCount = directionChangeCount
		this.maxDirectionChangeInterval = maxDirectionChangeInterval
		this._lastDirection = undefined
		this._lastDirectionChangeTime = undefined
		this._directionChangeCount = 0
	}
	record(direction, timestamp) {
		if (this._lastDirection === direction) return false
		if (this._lastDirection === undefined) {
			this._lastDirection = direction
			this._lastDirectionChangeTime = timestamp
			return false
		}
		if (this._lastDirectionChangeTime !== undefined && timestamp - this._lastDirectionChangeTime > this.maxDirectionChangeInterval) {
			this._directionChangeCount = 0
		}
		this._lastDirection = direction
		this._lastDirectionChangeTime = timestamp
		this._directionChangeCount++
		if (this._directionChangeCount < this.directionChangeCount) return false
		this.reset()
		return true
	}
	reset() {
		this._lastDirection = undefined
		this._lastDirectionChangeTime = undefined
		this._directionChangeCount = 0
	}
}

class ChatPetHopController {
	constructor(callbacks) {
		this.callbacks = callbacks
		this._stepTimer = undefined
		this._restTimer = undefined
		this._direction = 0
		this._heldUntil = 0
		this._active = false
	}
	request(direction, motionReduced) {
		this._direction = direction
		this.callbacks.onDirectionChange(direction)
		this.callbacks.onRequest()
		if (motionReduced) {
			this.cancel()
			this.callbacks.onMove(direction * HOP_DISTANCE)
			this.callbacks.onReducedMotionStart()
			return
		}
		this._heldUntil = Date.now() + HOP_HOLD_GRACE
		if (!this._active) this._beginHop()
	}
	cancel() {
		this._active = false
		this._direction = 0
		this._heldUntil = 0
		if (this._stepTimer !== undefined) clearTimeout(this._stepTimer)
		if (this._restTimer !== undefined) clearTimeout(this._restTimer)
		this._stepTimer = undefined
		this._restTimer = undefined
	}
	onAnimationComplete() {
		if (!this._active) return
		if (Date.now() < this._heldUntil) {
			this._restTimer = setTimeout(() => {
				this._restTimer = undefined
				this._beginHop()
			}, HOP_REST_DELAY)
		} else {
			this._active = false
		}
	}
	_beginHop() {
		this._active = true
		this.callbacks.onStart()
		this._stepTimer = setTimeout(() => {
			this._stepTimer = undefined
			if (!this._active || this._direction === 0) return
			this.callbacks.onMove(this._direction * HOP_DISTANCE)
		}, HOP_APEX_DELAY)
	}
}
