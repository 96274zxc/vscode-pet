/* Sprite sources, accessories and canvas compositing. */

const ACCESSORY_ATLAS_CELL_SIZE = 64
const ACCESSORY_WIDE_ATLAS_CELL_SIZE = 96
const ACCESSORY_ATLAS_WIDTH = ACCESSORY_ATLAS_CELL_SIZE * 4
const ACCESSORY_ATLAS_HEIGHT = ACCESSORY_ATLAS_CELL_SIZE * 3
const HEAD_WEAR_OFFSET = CHAT_PET_HEAD_WEAR_OFFSET

function getChatPetSpriteSources(variant) {
	const sources = {}
	for (const state of CHAT_PET_STATES) {
		const spec = CHAT_PET_SPRITE_SPEC[state]
		if (!spec) continue
		const tracking = spec.tracking
		const suffix = tracking ? '-tracking-96' : `-${spec.height}`
		const name = spec.name
		const staticUrl = ASSET_DATA[`${name}-${variant}${suffix}.png`]
		const reducedMotion = {
			url: staticUrl,
			frameWidth: spec.width,
			frameHeight: spec.height,
			frameCount: 1,
			fixedDecorations: spec.fixedDecorations,
			frameDurations: [],
			iterations: 1,
			accessoryRigFrame: CHAT_PET_REDUCED_MOTION_RIG_FRAME[state] ?? 0,
		}
		const durations = spec.durations ?? []
		const animated = durations.length === 0 || spec.staticOnly
			? reducedMotion
			: {
				url: ASSET_DATA[`${name}-${variant}${suffix}.spritesheet.png`],
				frameWidth: spec.width,
				frameHeight: spec.height,
				frameCount: durations.length,
				fixedDecorations: spec.fixedDecorations,
				frameDurations: spec.frameIndices ? spec.frameDurations : durations,
				frameIndices: spec.frameIndices,
				iterations: spec.iterations,
			}
		sources[state] = { animated, reducedMotion }
	}
	return sources
}

function getChatPetSpeechSources(variant) {
	const name = `buddy-speech-${variant}-96`
	return {
		animated: {
			url: ASSET_DATA[`${name}.spritesheet.png`],
			frameWidth: 96,
			frameHeight: 96,
			frameCount: SPEECH_FRAME_DURATIONS.length,
			frameDurations: SPEECH_FRAME_DURATIONS,
			iterations: Infinity,
		},
		reducedMotion: {
			url: ASSET_DATA[`${name}.png`],
			frameWidth: 96,
			frameHeight: 96,
			frameCount: 1,
			frameDurations: [],
			iterations: 1,
		},
	}
}

function getChatPetRespawnSources(variant) {
	const name = `buddy-respawn-${variant}-96`
	return {
		animated: {
			url: ASSET_DATA[`${name}.spritesheet.png`],
			frameWidth: 96,
			frameHeight: 96,
			frameCount: RESPAWN_FRAME_DURATIONS.length,
			frameDurations: RESPAWN_FRAME_DURATIONS,
			iterations: 1,
		},
		reducedMotion: {
			url: ASSET_DATA[`${name}.png`],
			frameWidth: 96,
			frameHeight: 96,
			frameCount: 1,
			frameDurations: [],
			iterations: 1,
		},
	}
}

function getChatPetAccessoryImageSource(accessory) {
	const cellSize = accessory.atlasCellSize ?? ACCESSORY_ATLAS_CELL_SIZE
	return {
		url: ASSET_DATA[`accessories/${accessory.atlasName}.png`],
		cellSize,
		width: cellSize * 4,
		height: cellSize * 3,
	}
}

function getChatPetAccessoryById(id) {
	for (const accessory of Object.values(CHAT_PET_ACCESSORIES)) {
		if (accessory.id === id) return accessory
	}
	return undefined
}

function hasChatPetBodyImageDimensions(image, frameWidth, frameHeight, frameCount) {
	return image.naturalWidth === frameWidth * frameCount && image.naturalHeight === frameHeight
}

function hasChatPetAccessoryImageDimensions(image, source) {
	return image.naturalWidth === source.width && image.naturalHeight === source.height
}

/* ------------------------------------------------------------------ rig */

const ACCESSORY_RIG_POSE_COLUMN = { upright: 0, sleeping: 1, airborne: 0, impact: 2, splat: 3 }
const COMPACT_HEAD_PIVOT = { upright: [32, 48], sleeping: [32, 48], airborne: [32, 48], impact: [32, 32], splat: [32, 48] }
const WIDE_HEAD_PIVOT = { upright: [48, 40], sleeping: [48, 40], airborne: [48, 40], impact: [48, 40], splat: [48, 80] }
const DEFAULT_HEAD_ANCHOR = { x: 48, y: 32 }
const DEFAULT_RIGHT_EYE_ANCHOR = { x: 56, y: 56 }

const ACCESSORY_TRACK_SPANS = {
	idle: [
		{ firstFrame: 0, lastFrame: 19, head: DEFAULT_HEAD_ANCHOR, rightEye: DEFAULT_RIGHT_EYE_ANCHOR },
		{ firstFrame: 20, lastFrame: 49, head: { x: 48, y: 36 }, rightEye: { x: 56, y: 60 } },
	],
	rendering: [
		{ firstFrame: 0, lastFrame: 19, head: DEFAULT_HEAD_ANCHOR, rightEye: DEFAULT_RIGHT_EYE_ANCHOR },
		{ firstFrame: 20, lastFrame: 49, head: { x: 48, y: 36 }, rightEye: { x: 56, y: 60 } },
	],
	painting: [{ firstFrame: 0, lastFrame: 7, head: DEFAULT_HEAD_ANCHOR, rightEye: DEFAULT_RIGHT_EYE_ANCHOR }],
	sleep: [
		{ firstFrame: 0, lastFrame: 2, head: DEFAULT_HEAD_ANCHOR, rightEye: { x: 56, y: 64 } },
		{ firstFrame: 3, lastFrame: 7, head: { x: 48, y: 36 }, rightEye: { x: 56, y: 64 } },
	],
	waking: [
		{ firstFrame: 0, lastFrame: 2, head: { x: 48, y: 36 }, pose: 'sleeping', rightEye: { x: 56, y: 64 } },
		{ firstFrame: 3, lastFrame: 7, head: DEFAULT_HEAD_ANCHOR, pose: 'upright', rightEye: DEFAULT_RIGHT_EYE_ANCHOR },
	],
	love: [
		{ firstFrame: 0, lastFrame: 3, head: { x: 48, y: 36 } },
		{ firstFrame: 4, lastFrame: 5, head: DEFAULT_HEAD_ANCHOR },
	],
	jump: [
		{ firstFrame: 0, lastFrame: 0, head: DEFAULT_HEAD_ANCHOR, rightEye: { x: 56, y: 56 } },
		{ firstFrame: 1, lastFrame: 1, head: { x: 48, y: 48 }, rightEye: { x: 56, y: 64 } },
		{ firstFrame: 2, lastFrame: 2, head: DEFAULT_HEAD_ANCHOR, rightEye: { x: 56, y: 48 } },
		{ firstFrame: 3, lastFrame: 3, head: DEFAULT_HEAD_ANCHOR, rightEye: { x: 56, y: 40 } },
		{ firstFrame: 4, lastFrame: 4, head: { x: 48, y: 56 }, rightEye: { x: 56, y: 64 } },
		{ firstFrame: 5, lastFrame: 5, head: DEFAULT_HEAD_ANCHOR, rightEye: { x: 56, y: 56 } },
	],
	cool: [
		{ firstFrame: 0, lastFrame: 1, head: DEFAULT_HEAD_ANCHOR },
		{ firstFrame: 2, lastFrame: 2, head: { x: 48, y: 36 } },
		{ firstFrame: 3, lastFrame: 8, head: DEFAULT_HEAD_ANCHOR },
	],
	sing: [{ firstFrame: 0, lastFrame: 3, head: { x: 48, y: 52 }, rightEye: { x: 56, y: 72 } }],
	worry: [
		{ firstFrame: 0, lastFrame: 0, head: DEFAULT_HEAD_ANCHOR },
		{ firstFrame: 1, lastFrame: 1, head: DEFAULT_HEAD_ANCHOR, mirrorsHeadAccessory: true },
	],
	dizzy: [{ firstFrame: 0, lastFrame: 7, head: { x: 48, y: 48 }, hideEyeAccessory: true }],
	falling: [{ firstFrame: 0, lastFrame: 5, head: DEFAULT_HEAD_ANCHOR, rightEye: { x: 48, y: 48 } }],
	splat: [
		{ firstFrame: 0, lastFrame: 0, head: { x: 48, y: 72 }, pose: 'splat', hideEyeAccessory: true },
		{ firstFrame: 1, lastFrame: 1, head: { x: 48, y: 64 }, pose: 'splat', hideEyeAccessory: true },
		{ firstFrame: 2, lastFrame: 2, head: { x: 48, y: 48 }, pose: 'splat', hideEyeAccessory: true },
		{ firstFrame: 3, lastFrame: 3, head: DEFAULT_HEAD_ANCHOR, pose: 'upright' },
	],
}

function getChatPetAccessoryTrack(state) {
	switch (state) {
		case 'achievementUnlocked': return 'rendering'
		case 'sleep':
		case 'waking':
		case 'typing':
		case 'rendering':
		case 'painting':
		case 'love':
		case 'clapping':
		case 'jump':
		case 'cool':
		case 'sing':
		case 'speechless':
		case 'worry':
		case 'dizzy':
		case 'falling':
		case 'splat': return state
		case 'buttonPress': return 'buttonPress'
		case 'yappingMouthOpen': return 'yapping'
		case 'wallImpact': return 'wallImpact'
		case 'onTheRun':
		case 'searching':
		case 'searchingDown': return 'search'
		case 'complete':
		case 'yapping':
		case 'idle': return 'idle'
		default: return 'idle'
	}
}

function getDefaultChatPetAccessoryRigPose(state) {
	switch (state) {
		case 'sleep':
		case 'waking': return 'sleeping'
		case 'jump':
		case 'dizzy':
		case 'falling': return 'airborne'
		case 'wallImpact': return 'impact'
		case 'splat': return 'splat'
		default: return 'upright'
	}
}

function doesChatPetStateHideEyeAccessory(state) {
	return state === 'love' || state === 'complete' || state === 'cool' || state === 'speechless'
		|| state === 'worry' || state === 'dizzy' || state === 'wallImpact'
}

function getChatPetAccessoryRigFrame(state, frameIndex) {
	const spans = ACCESSORY_TRACK_SPANS[getChatPetAccessoryTrack(state)]
	const span = spans?.find(candidate => frameIndex >= candidate.firstFrame && frameIndex <= candidate.lastFrame)
	const trackedHead = span?.head ?? DEFAULT_HEAD_ANCHOR
	const hideEyeAccessory = span?.hideEyeAccessory || doesChatPetStateHideEyeAccessory(state)
	return {
		pose: span?.pose ?? getDefaultChatPetAccessoryRigPose(state),
		head: state === 'love' || state === 'complete' || state === 'dizzy' ? undefined : {
			x: trackedHead.x,
			y: trackedHead.y + HEAD_WEAR_OFFSET,
		},
		rightEye: hideEyeAccessory ? undefined : (span?.rightEye ?? DEFAULT_RIGHT_EYE_ANCHOR),
		...(span?.mirrorsHeadAccessory ? { mirrorsHeadAccessory: true } : {}),
	}
}

function getChatPetAntennaeOcclusionBounds(state, frameIndex) {
	const rigFrame = getChatPetAccessoryRigFrame(state, frameIndex)
	if (!rigFrame.head) return undefined
	if (rigFrame.pose === 'impact') return { x: 16, y: 24, width: 64, height: 8 }
	return { x: rigFrame.head.x - 32, y: rigFrame.head.y - 48, width: 64, height: 40 }
}

function getChatPetEyeAccessoryAnchor(state, frameIndex, facingDirection, mirrorsWithFacing, frameWidth = 96) {
	const anchor = getChatPetAccessoryRigFrame(state, frameIndex).rightEye
	if (!anchor || facingDirection === 'right' || mirrorsWithFacing) return anchor
	return { x: anchor.x - 16 + frameWidth - 96, y: anchor.y }
}

/* -------------------------------------------------------------- composite */

function clearChatPetAntennae(context, state, frameIndex, frameWidth, mirrored) {
	const bounds = getChatPetAntennaeOcclusionBounds(state, frameIndex)
	if (!bounds) return
	const x = mirrored ? frameWidth - bounds.x - bounds.width : bounds.x
	context.clearRect(x, bounds.y, bounds.width, bounds.height)
}

function drawMirroredChatPetLayer(context, image, sourceX, sourceY, frameWidth, frameHeight) {
	context.save()
	context.translate(frameWidth, 0)
	context.scale(-1, 1)
	context.drawImage(image, sourceX, sourceY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight)
	context.restore()
}

function drawFixedOrientationDecorations(context, bodyImage, frameIndex, frameWidth, decorations) {
	for (const decoration of decorations) {
		const currentBounds = decoration.frameBounds[frameIndex]
		const canonicalBounds = decoration.frameBounds[decoration.sourceFrame]
		const [currentLeft, currentTop, currentRight, currentBottom] = currentBounds
		const [canonicalLeft, canonicalTop, canonicalRight, canonicalBottom] = canonicalBounds
		const canonicalWidth = canonicalRight - canonicalLeft
		const canonicalHeight = canonicalBottom - canonicalTop
		context.clearRect(frameWidth - currentRight, currentTop, currentRight - currentLeft, currentBottom - currentTop)
		context.drawImage(
			bodyImage,
			decoration.sourceFrame * frameWidth + canonicalLeft,
			canonicalTop,
			canonicalWidth,
			canonicalHeight,
			frameWidth - currentLeft - canonicalWidth,
			currentTop,
			canonicalWidth,
			canonicalHeight,
		)
	}
}

function drawAccessoryLayer(context, atlasImage, rigFrame, layer) {
	const cellSize = atlasImage.naturalWidth / 4
	const sourceX = ACCESSORY_RIG_POSE_COLUMN[rigFrame.pose] * cellSize
	if (rigFrame.head) {
		const headSourceY = (layer === 'back' ? 0 : 1) * cellSize
		const [pivotX, pivotY] = cellSize === ACCESSORY_WIDE_ATLAS_CELL_SIZE ? WIDE_HEAD_PIVOT[rigFrame.pose] : COMPACT_HEAD_PIVOT[rigFrame.pose]
		context.drawImage(atlasImage, sourceX, headSourceY, cellSize, cellSize, rigFrame.head.x - pivotX, rigFrame.head.y - pivotY, cellSize, cellSize)
	}
}

function drawMirroredAccessoryLayer(context, atlasImage, rigFrame, layer, frameWidth) {
	context.save()
	context.translate(frameWidth, 0)
	context.scale(-1, 1)
	drawAccessoryLayer(context, atlasImage, rigFrame, layer)
	context.restore()
}

function drawTrackedAccessoryLayer(context, atlasImage, rigFrame, layer, frameWidth) {
	if (rigFrame.mirrorsHeadAccessory) drawMirroredAccessoryLayer(context, atlasImage, rigFrame, layer, frameWidth)
	else drawAccessoryLayer(context, atlasImage, rigFrame, layer)
}

function drawEyeAccessory(context, atlasImage, rigFrame, eyeAnchor = rigFrame.rightEye) {
	if (!eyeAnchor) return
	const cellSize = atlasImage.naturalWidth / 4
	const sourceX = ACCESSORY_RIG_POSE_COLUMN[rigFrame.pose] * cellSize
	context.drawImage(atlasImage, sourceX, 2 * cellSize, cellSize, cellSize, eyeAnchor.x, eyeAnchor.y, cellSize, cellSize)
}

function drawMirroredEyeAccessory(context, atlasImage, rigFrame, frameWidth) {
	context.save()
	context.translate(frameWidth, 0)
	context.scale(-1, 1)
	drawEyeAccessory(context, atlasImage, rigFrame)
	context.restore()
}

function drawChatPetComposite(context, bodyImage, accessoryImage, bodyFrameIndex, rigFrameIndex, frameWidth, frameHeight, facingDirection, state, fixedDecorations, includeEyeAccessory = true, eyeAccessoryMirrorsWithFacing = true, coversAntennae = false, color) {
	context.clearRect(0, 0, frameWidth, frameHeight)
	const sourceX = bodyFrameIndex * frameWidth
	const coloredBody = color ? getChatPetColoredSprite(bodyImage, color) : bodyImage
	const rigFrame = getChatPetAccessoryRigFrame(state, rigFrameIndex)
	if (fixedDecorations !== undefined && facingDirection === 'left') {
		drawMirroredChatPetLayer(context, coloredBody, sourceX, 0, frameWidth, frameHeight)
		drawFixedOrientationDecorations(context, coloredBody, bodyFrameIndex, frameWidth, fixedDecorations)
		if (accessoryImage) {
			if (coversAntennae) clearChatPetAntennae(context, state, rigFrameIndex, frameWidth, true)
			context.save()
			context.globalCompositeOperation = 'destination-over'
			drawMirroredAccessoryLayer(context, accessoryImage, rigFrame, 'back', frameWidth)
			context.restore()
			drawMirroredAccessoryLayer(context, accessoryImage, rigFrame, 'front', frameWidth)
			if (includeEyeAccessory) {
				if (eyeAccessoryMirrorsWithFacing) drawMirroredEyeAccessory(context, accessoryImage, rigFrame, frameWidth)
				else drawEyeAccessory(context, accessoryImage, rigFrame, getChatPetEyeAccessoryAnchor(state, rigFrameIndex, 'left', false, frameWidth))
			}
		}
		return
	}
	if (accessoryImage) drawTrackedAccessoryLayer(context, accessoryImage, rigFrame, 'back', frameWidth)
	context.drawImage(coloredBody, sourceX, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight)
	if (accessoryImage) {
		if (coversAntennae) {
			clearChatPetAntennae(context, state, rigFrameIndex, frameWidth, false)
			context.save()
			context.globalCompositeOperation = 'destination-over'
			drawTrackedAccessoryLayer(context, accessoryImage, rigFrame, 'back', frameWidth)
			context.restore()
		}
		drawTrackedAccessoryLayer(context, accessoryImage, rigFrame, 'front', frameWidth)
		if (includeEyeAccessory) drawEyeAccessory(context, accessoryImage, rigFrame)
	}
}

function drawChatPetAccessory(context, accessoryImage, state, frameIndex, facingDirection) {
	const rigFrame = getChatPetAccessoryRigFrame(state, frameIndex)
	const mirrorsHeadAccessory = facingDirection === 'left' !== !!rigFrame.mirrorsHeadAccessory
	if (mirrorsHeadAccessory) {
		drawMirroredAccessoryLayer(context, accessoryImage, rigFrame, 'back', context.canvas.width)
		drawMirroredAccessoryLayer(context, accessoryImage, rigFrame, 'front', context.canvas.width)
		drawMirroredEyeAccessory(context, accessoryImage, rigFrame, context.canvas.width)
		return
	}
	drawAccessoryLayer(context, accessoryImage, rigFrame, 'back')
	drawAccessoryLayer(context, accessoryImage, rigFrame, 'front')
	drawEyeAccessory(context, accessoryImage, rigFrame)
}

function drawChatPetEyeAccessory(context, accessoryImage, state, frameIndex, facingDirection, mirrorsWithFacing = true, gazeOffset) {
	context.clearRect(0, 0, context.canvas.width, context.canvas.height)
	const rigFrame = getChatPetAccessoryRigFrame(state, frameIndex)
	if (facingDirection === 'left' && mirrorsWithFacing) {
		drawMirroredEyeAccessory(context, accessoryImage, rigFrame, context.canvas.width)
		return
	}
	const anchor = getChatPetEyeAccessoryAnchor(state, frameIndex, facingDirection, mirrorsWithFacing, context.canvas.width)
	drawEyeAccessory(context, accessoryImage, rigFrame, anchor && gazeOffset ? { x: anchor.x + gazeOffset[0], y: anchor.y + gazeOffset[1] } : anchor)
}

function drawChatPetAchievementStar(context, color) {
	context.fillStyle = getChatPetBodyColor(color)
	context.fillRect(56, 34, 24, 24)
	context.fillStyle = 'rgb(255, 205, 15)'
	const rows = ['..#..', '.###.', '#####', '.#.#.', '#...#']
	for (let y = 0; y < rows.length; y++) {
		for (let x = 0; x < rows[y].length; x++) {
			if (rows[y][x] === '#') context.fillRect(58 + x * 4, 36 + y * 4, 4, 4)
		}
	}
}

/* -------------------------------------------------------------- image cache */

const chatPetImageCache = new Map()
const chatPetLoadedImages = new Map()
const chatPetImageFailures = new Set()

function loadChatPetImage(url) {
	if (!url) return Promise.reject(new Error('missing Blobby image URL'))
	if (chatPetImageFailures.has(url)) return Promise.reject(new Error('Blobby image previously failed'))
	let promise = chatPetImageCache.get(url)
	if (promise) return promise
	promise = new Promise((resolve, reject) => {
		const image = new Image()
		image.decoding = 'async'
		image.onload = () => {
			chatPetLoadedImages.set(url, image)
			resolve(image)
		}
		image.onerror = () => {
			chatPetImageFailures.add(url)
			reject(new Error(`failed to load Blobby image: ${url.slice(0, 96)}`))
		}
		image.src = url
	})
	chatPetImageCache.set(url, promise)
	return promise
}

function getChatPetCachedImage(url) {
	return chatPetLoadedImages.get(url)
}
