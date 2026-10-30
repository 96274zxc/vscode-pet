/* Client entry: locale, CSS, slot registration, /blobby command and debug hooks. */

function injectChatPetStyles() {
	for (const existing of document.querySelectorAll('style[data-dsh-blobby-styles]')) existing.remove()
	const style = document.createElement('style')
	style.setAttribute('data-dsh-blobby-styles', '')
	style.textContent = PET_CSS
	document.head.append(style)
	return () => style.remove()
}

function installChatPetDebugApi() {
	let enabled = false
	try { enabled = new URLSearchParams(location.search).get('blobbyDebug') === '1' || localStorage.getItem(CHAT_PET_DEBUG_KEY) === '1' } catch (ignored) { /* noop */ }
	if (!enabled) return
	window.__dshBlobby = {
		getSnapshot: () => activeBlobbyController?.getSnapshot(),
		setFacts: facts => activeBlobbyController?.setFacts(facts),
		showState: state => activeBlobbyController?._showTransientState(state),
		openPanel: tab => activeBlobbyController?.host.openPanel(tab),
		unlockTrueName: () => activeBlobbyController?.unlockTrueName(),
		startJumpGame: () => activeBlobbyController?.startJumpGame(),
		get controller() { return activeBlobbyController },
	}
}

function apply(ctx) {
	ctx.effect(() => ctx.locale.register(CHAT_PET_LOCALE_NS, CHAT_PET_LOCALE), 'vscode-pet: dictionaries')
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
}
