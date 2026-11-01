/* Client entry: locale, CSS, slot registration, /blobby command and debug hooks. */

function injectChatPetStyles() {
	for (const existing of document.querySelectorAll('style[data-dsh-blobby-styles]')) existing.remove()
	const style = document.createElement('style')
	style.setAttribute('data-dsh-blobby-styles', '')
	style.textContent = PET_CSS
	document.head.append(style)
	return () => style.remove()
}

function getChatPetMemorySnapshot() {
	const controller = activeBlobbyController
	const bridge = activeChatPetDesktopBridge
	let heap
	try {
		const info = performance?.memory
		if (info) heap = { used: info.usedJSHeapSize, total: info.totalJSHeapSize, limit: info.jsHeapSizeLimit }
	} catch (ignored) { /* not chromium */ }
	let dom = 0
	try { dom = document.querySelectorAll('[class*="chat-pet-"]').length } catch (ignored) { /* noop */ }
	let desktop
	if (bridge) {
		const snapshot = bridge.getSnapshot()
		let framesBytes = 0
		try { framesBytes = bridge._frames ? JSON.stringify(bridge._frames).length : 0 } catch (ignored) { /* noop */ }
		desktop = { ...snapshot, framesBytes, preparedSession: bridge._preparedSession, frameKey: bridge._frameKey }
	}
	let jump
	if (controller?._jumpGame) {
		const game = controller._jumpGame
		jump = { platforms: game.model?.platforms?.length, walls: game.model?.walls?.length, platformElements: game.platformElements?.size, wallElements: game.wallElements?.size }
	}
	return {
		heap,
		images: { loaded: chatPetLoadedImages.size, pending: chatPetImageCache.size, failed: chatPetImageFailures.size },
		colored: { count: coloredSpriteCache.size, pixels: coloredSpritePixels },
		desktop,
		jump,
		dom,
		listeners: controller?._listeners?.length,
		bridgeListeners: bridge?._listeners?.length,
		timers: controller ? {
			idle: Boolean(controller.idleTimer),
			frame: Boolean(controller.frameTimer),
			transient: Boolean(controller.transientTimer),
			confirmation: Boolean(controller.confirmationTimer),
			bounce: Boolean(controller.bounceTimer),
			respawn: Boolean(controller.respawnTimer),
			run: Boolean(controller._runTimer),
			gazeRaf: controller._gazeRaf !== undefined,
			preloadIdle: controller._preloadIdle !== undefined,
		} : undefined,
		observers: { resize: Boolean(controller?._resizeObserver), mutation: Boolean(controller?._mutationObserver) },
	}
}

function installChatPetDebugApi() {
	let enabled = false
	try { enabled = new URLSearchParams(location.search).get('blobbyDebug') === '1' || localStorage.getItem(CHAT_PET_DEBUG_KEY) === '1' } catch (ignored) { /* noop */ }
	if (!enabled) return undefined
	const api = {
		getSnapshot: () => activeBlobbyController?.getSnapshot(),
		setFacts: facts => activeBlobbyController?.setFacts(facts),
		showState: state => activeBlobbyController?._showTransientState(state),
		openPanel: tab => activeBlobbyController?.host.openPanel(tab),
		unlockTrueName: () => activeBlobbyController?.unlockTrueName(),
		startJumpGame: () => activeBlobbyController?.startJumpGame(),
		startDesktop: () => activeChatPetDesktopBridge?.start(),
		stopDesktop: () => activeChatPetDesktopBridge?.stop(),
		getDesktop: () => activeChatPetDesktopBridge?.getSnapshot(),
		memory: () => getChatPetMemorySnapshot(),
		get controller() { return activeBlobbyController },
		get desktop() { return activeChatPetDesktopBridge },
	}
	window.__dshBlobby = api
	return () => {
		if (window.__dshBlobby === api) delete window.__dshBlobby
	}
}

function apply(ctx) {
	ctx.effect(() => ctx.locale.register(CHAT_PET_LOCALE_NS, CHAT_PET_LOCALE), 'vscode-pet: dictionaries')
	const subscribeLocale = scope => {
		const locale = typeof scope.get === 'function' ? scope.get('locale') : undefined
		if (!locale || typeof locale.subscribe !== 'function') return
		scope.effect(() => locale.subscribe(() => notifyChatPetLocaleChanged()), 'vscode-pet: locale changes')
	}
	if (typeof ctx.inject === 'function') ctx.inject(['locale'], subscribeLocale)
	else subscribeLocale(ctx)
	ctx.effect(() => injectChatPetStyles(), 'vscode-pet: styles')
	ctx.effect(() => installChatPetDebugApi(), 'vscode-pet: debug api')
	ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
		name: 'conversation.input.dock',
		id: 'blobby',
		order: 100,
		locale: CHAT_PET_LOCALE_NS,
	}, PetSlotSafe))

	const registerCommand = scope => {
		const commandUi = scope.commandUi
		if (!commandUi || typeof commandUi.register !== 'function') return
		const locale = typeof scope.get === 'function' ? scope.get('locale') : undefined
		const t = locale && typeof locale.bind === 'function' ? locale.bind(CHAT_PET_LOCALE_NS) : undefined
		scope.effect(() => {
			const dispose = commandUi.register({
				name: 'blobby',
				available: () => true,
				label: () => translateChatPetText(t, 'command.blobby'),
				description: () => translateChatPetText(t, 'command.blobby.description'),
				ui: {
					kind: 'action',
					run: () => {
						if (!activeBlobbyController) return
						const already = chatPetPrefs.get().trueNameUnlocked
						if (!already) activeBlobbyController.unlockTrueName()
						else activeBlobbyController.host.openPanel('color')
					},
				},
			}, 'vscode-pet: blobby command')
			window.__dshBlobbyCommandRegistered = true
			return dispose
		}, 'vscode-pet: command')
		const toggleBlobby = () => {
			const next = chatPetPrefs.get().visible === false
			chatPetPrefs.set({ visible: next })
			activeBlobbyController?.host.status(translateChatPetText(t, next ? 'status.shown' : 'status.hidden'))
		}
		scope.effect(() => commandUi.register({
			name: 'vscode-pet',
			available: () => true,
			label: () => translateChatPetText(t, chatPetPrefs.get().visible === false ? 'command.toggle.show' : 'command.toggle.hide'),
			description: () => translateChatPetText(t, 'command.toggle.description'),
			ui: { kind: 'action', run: toggleBlobby },
		}, 'vscode-pet: toggle command'), 'vscode-pet: toggle command')
	}
	if (typeof ctx.inject === 'function') ctx.inject(['commandUi'], registerCommand)
	else registerCommand(ctx)
}

const __test = {
	CHAT_PET_STATES,
	CHAT_PET_LOCALE,
	getChatPetFallbackDictionary,
	translateChatPetText,
	CHAT_PET_IDLE_SLEEP_DELAY,
	CHAT_PET_CONFIRMATION_ATTENTION_DURATION,
	CHAT_PET_ACHIEVEMENT_UNLOCKED_DURATION,
	CHAT_PET_CLICK_INTERACTION_PROBABILITIES: { complete: CHAT_PET_ICON_TRANSFORMATION_CHANCE, yapping: CHAT_PET_YAPPING_CHANCE },
	CHAT_PET_ACHIEVEMENTS,
	CHAT_PET_ACCESSORIES,
	CHAT_PET_SPRITE_SPEC,
	getChatPetBaseState,
	getChatPetRenderedState,
	getChatPetAnimationFrame,
	getChatPetClickInteraction,
	getChatPetBlinkDelay,
	getChatPetGazeDirection,
	getChatPetEyeAccessoryGazeOffset,
	getChatPetEyeAccessoryGazeOffsetForState,
	getChatPetScale,
	getChatPetHorizontalPosition,
	getChatPetMenuPosition,
	getChatPetDefaultHorizontalPosition,
	getChatPetRestoredHorizontalPosition,
	getChatPetHorizontalAnchor,
	getChatPetAnchoredHorizontalPosition,
	getChatPetDragPosition,
	getChatPetThrowVelocity,
	getChatPetWallReboundVelocity,
	getChatPetMouseBounceVelocity,
	getChatPetThrowRotation,
	advanceChatPetThrow,
	shouldSettleChatPetThrow,
	getChatPetThrowLanding,
	getChatPetFallTarget,
	getChatPetFallDuration,
	getChatPetRespawnTop,
	getChatPetWideSpriteHorizontalOffset,
	shouldPlaceChatPetSpeechBubbleLeft,
	getChatPetFrameDurations,
	getChatPetSpriteName,
	doesChatPetStateTrackCursor,
	doesChatPetStateBlink,
	getTransientStateDuration,
	getChatPetAccessoryRigFrame,
	getChatPetAccessoryRigPose: (state, frame = 0) => getChatPetAccessoryRigFrame(state, frame).pose,
	getChatPetReducedMotionRigFrame: state => CHAT_PET_REDUCED_MOTION_RIG_FRAME[state] ?? 0,
	parseChatPetColor,
	getChatPetBodyColor,
	getChatPetEyeColor,
	getChatPetColorPalette,
	normalizeChatPetPrefs,
	formatChatPetText,
	ChatPetJumpGameModel,
	ChatPetHopController,
	ChatPetDirectionChangeController,
	CHAT_PET_DESKTOP_PROTOCOL,
	isChatPetDesktopPlatform,
	isChatPetDesktopSupported,
	getChatPetDesktopGeometry,
	getChatPetDesktopAnchoredLeft,
	getChatPetDesktopHorizontalAnchor,
	getChatPetDesktopFramePlan,
	ChatPetDesktopBridge,
	getChatPetDesktopModel,
	getChatPetDesktopMenuLabels,
	renderChatPetDesktopPayload,
}
