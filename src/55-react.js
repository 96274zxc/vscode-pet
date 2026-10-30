/* React shell: dock anchor, portal layer, context menu, hats and color panels. */

let activeBlobbyController = null

const chatPetLocaleListeners = new Set()
let chatPetLocaleRevision = 0

function subscribeChatPetLocale(listener) {
	chatPetLocaleListeners.add(listener)
	return () => chatPetLocaleListeners.delete(listener)
}

function getChatPetLocaleRevision() {
	return chatPetLocaleRevision
}

function notifyChatPetLocaleChanged() {
	chatPetLocaleRevision += 1
	for (const listener of [...chatPetLocaleListeners]) listener()
}

function useBlobbyPrefs() {
	return React.useSyncExternalStore(
		callback => chatPetPrefs.subscribe(callback),
		() => chatPetPrefs.get(),
		() => chatPetPrefs.get(),
	)
}

function pickSessionStatusEntry(raw, sessionId) {
	if (raw === undefined || raw === null || sessionId === undefined) return undefined
	if (typeof raw.get === 'function') return raw.get(sessionId)
	if (typeof raw === 'object') return raw[sessionId]
	return undefined
}

function ChatPetPreview(props) {
	const { accessoryId, unlocked, color, variant, className } = props
	const ref = React.useRef(null)
	React.useEffect(() => {
		const canvas = ref.current
		if (!canvas) return
		let cancelled = false
		const context = canvas.getContext('2d')
		if (!context) return
		context.imageSmoothingEnabled = false
		const accessory = accessoryId ? getChatPetAccessoryById(accessoryId) : undefined
		// Preview art uses the non-tracking idle sheet, whose eyes are baked in.
		const source = { url: ASSET_DATA[`buddy-idle-${variant}-96.png`], fixedDecorations: undefined }
		const accessorySource = accessory ? getChatPetAccessoryImageSource(accessory) : undefined
		const render = async () => {
			try {
				const body = await loadChatPetImage(source.url)
				const accessoryImage = accessorySource ? await loadChatPetImage(accessorySource.url) : undefined
				if (cancelled) return
				canvas.width = 96
				canvas.height = 96
				context.clearRect(0, 0, 96, 96)
				if (unlocked) {
					drawChatPetComposite(
						context, body, accessoryImage, 0, 0, 96, 96, 'right', 'idle', source.fixedDecorations,
						true, accessory?.eyeAccessoryMirrorsWithFacing !== false, accessory?.coversAntennae === true, color,
					)
				} else {
					if (accessoryImage) drawChatPetAccessory(context, accessoryImage, 'idle', 0, 'right')
					else context.drawImage(body, 0, 0)
					context.globalCompositeOperation = 'source-in'
					context.fillStyle = '#8a8f98'
					context.fillRect(0, 0, 96, 96)
					context.globalCompositeOperation = 'source-over'
				}
			} catch (ignored) { /* preview stays blank */ }
		}
		render()
		return () => { cancelled = true }
	}, [accessoryId, unlocked, color, variant])
	return h('canvas', { ref, className: `chat-pet-achievement-preview ${className ?? ''}`.trim(), width: 96, height: 96, 'aria-hidden': 'true' })
}

function ChatPetMenu(props) {
	const { menu, controller, onClose } = props
	const ref = React.useRef(null)
	const [position, setPosition] = React.useState(null)
	const t = controller?._tr?.bind(controller) ?? (key => getChatPetFallbackDictionary()[key] ?? key)
	React.useLayoutEffect(() => {
		if (!menu) return
		const layer = ref.current
		if (!layer) return
		const place = () => {
			const rect = layer.getBoundingClientRect()
			const [left, top] = getChatPetMenuPosition(menu.x, menu.y, rect.width, rect.height, window.innerWidth, window.innerHeight)
			setPosition({ left, top })
		}
		place()
	}, [menu])
	React.useEffect(() => {
		if (!menu) return
		// A menu anchored to the old window size looks detached after a resize
		// (for example when the user maximizes the DSH window); close it instead
		// of leaving it at a stale position.
		const width = window.innerWidth
		const height = window.innerHeight
		const onResize = () => {
			if (window.innerWidth === width && window.innerHeight === height) return
			onClose()
		}
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [menu, onClose])
	React.useEffect(() => {
		if (!menu) return
		const layer = ref.current
		if (!layer) return
		const focusFirst = () => layer.querySelector('button:not([disabled])')?.focus()
		focusFirst()
		const onKeyDown = event => {
			if (event.key === 'Escape') {
				event.preventDefault()
				onClose()
				return
			}
			if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
			event.preventDefault()
			const buttons = [...layer.querySelectorAll('button:not([disabled])')]
			if (buttons.length === 0) return
			const index = buttons.indexOf(document.activeElement)
			let next = index
			if (event.key === 'ArrowDown') next = (index + 1) % buttons.length
			else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length
			else if (event.key === 'Home') next = 0
			else next = buttons.length - 1
			buttons[next].focus()
		}
		const onPointerDown = event => {
			if (layer && !layer.contains(event.target)) onClose()
		}
		document.addEventListener('keydown', onKeyDown, true)
		document.addEventListener('pointerdown', onPointerDown, true)
		return () => {
			document.removeEventListener('keydown', onKeyDown, true)
			document.removeEventListener('pointerdown', onPointerDown, true)
		}
	}, [menu, onClose])
	if (!menu || !controller) return null
	const item = (key, label, enabled, onClick) => h('button', {
		key,
		type: 'button',
		className: 'chat-pet-menu-item',
		disabled: enabled === false,
		onClick: () => { onClose(); onClick() },
	}, label)
	const jumpEnabled = !controller.dead && !controller.airborne && !controller.onTheRun
	const sizeControl = h('div', { key: 'size', className: 'chat-pet-menu-size' }, [
		h('div', { key: 'steps', className: 'chat-pet-menu-size-row' }, [
			h('button', {
				key: 'shrink',
				type: 'button',
				className: 'chat-pet-menu-size-button',
				disabled: controller.scale <= CHAT_PET_MIN_SCALE,
				onClick: () => controller.shrink(),
			}, [
				h('span', { key: 'icon', className: 'chat-pet-menu-size-icon' }, '\u2212'),
				h('span', { key: 'label' }, t('menu.shrink')),
			]),
			h('button', {
				key: 'grow',
				type: 'button',
				className: 'chat-pet-menu-size-button grow',
				onClick: () => controller.grow(),
			}, [
				h('span', { key: 'label' }, t('menu.grow')),
				h('span', { key: 'icon', className: 'chat-pet-menu-size-icon' }, '+'),
			]),
		]),
		h('button', {
			key: 'reset',
			type: 'button',
			className: 'chat-pet-menu-size-button chat-pet-menu-size-reset',
			disabled: Math.abs(controller.scale - 1) < 0.001,
			onClick: () => controller.resetSize(),
		}, t('menu.resetSize')),
	])
	return h('div', {
		ref,
		className: 'chat-pet-menu',
		role: 'menu',
		style: { left: `${position ? position.left : -9999}px`, top: `${position ? position.top : -9999}px` },
		onContextMenu: event => event.preventDefault(),
	}, [
		item('hats', t('menu.hats'), true, () => controller.host.openPanel('hats')),
		item('jump', t('menu.playJump'), jumpEnabled, () => controller.startJumpGame()),
		item('run', controller.onTheRun ? t('menu.comeBack') : t('menu.goOnTheRun'), true, () => controller.setOnTheRun(!controller.onTheRun)),
		h('div', { key: 'sep1', className: 'chat-pet-menu-separator' }),
		sizeControl,
		h('div', { key: 'sep2', className: 'chat-pet-menu-separator' }),
		item('color', t('menu.changeColor'), true, () => controller.host.openPanel('color')),
	])
}

function HatsPanel(props) {
	const { controller, onTab, t } = props
	const prefs = useBlobbyPrefs()
	const variant = getChatPetColorVariant(prefs.color)
	const hats = CHAT_PET_ACHIEVEMENTS
		.filter(achievement => achievement.accessory)
		.map(achievement => getChatPetAccessoryById(achievement.accessory))
		.filter(Boolean)
	// VS Code counts the 13 hats plus the Color Customization item as 14 entries;
	// the extra "No Hat" card is a DSH-only option and is not counted.
	const unlockedCount = CHAT_PET_ACHIEVEMENTS.length
	const select = accessoryId => controller.selectAccessory(accessoryId)
	const card = accessory => {
		const wearing = prefs.accessory === accessory.id
		return h('li', { key: accessory.id, className: 'chat-pet-achievements-list-item' }, [
			h('button', {
				type: 'button',
				className: `chat-pet-achievement-card ${wearing ? 'wearing' : ''}`,
				onClick: () => select(accessory.id),
				'aria-label': wearing
					? t('achievements.cardAria', t(accessory.key), t('achievements.wearing'))
					: t(accessory.key),
			}, [
				h('div', { key: 'preview', className: 'chat-pet-achievement-previews' }, h(ChatPetPreview, {
					accessoryId: accessory.id,
					unlocked: true,
					color: prefs.color,
					variant,
				})),
				h('div', { key: 'content', className: 'chat-pet-achievement-card-content' }, [
					h('h3', { key: 'title' }, t(accessory.key)),
					h('span', { key: 'state', className: 'chat-pet-achievement-state' }, wearing ? t('achievements.wearing') : '\u00a0'),
				]),
			]),
		])
	}
	const noHatWearing = prefs.accessory === null
	return h('div', { className: 'chat-pet-achievements-content' }, [
		h('h1', { key: 'h1' }, t('panel.title')),
		h('p', { key: 'intro', className: 'chat-pet-achievements-intro' }, t('achievements.intro')),
		h('section', {
			key: 'collection',
			className: 'chat-pet-achievements-collection',
			'aria-label': t('achievements.collectionAria', unlockedCount),
		}, [
			h('div', { key: 'header', className: 'chat-pet-achievements-collection-header' }, [
				h('h2', { key: 'h2' }, t('achievements.collection')),
				h('span', { key: 'count', className: 'chat-pet-achievements-count' }, t('achievements.count', unlockedCount, unlockedCount)),
			]),
			h('ul', { key: 'list', className: 'chat-pet-achievements-list' }, [
				h('li', { key: 'none', className: 'chat-pet-achievements-list-item' }, h('button', {
					type: 'button',
					className: `chat-pet-achievement-card no-hat ${noHatWearing ? 'wearing' : ''}`,
					onClick: () => { chatPetPrefs.set({ accessory: null }) },
					'aria-label': noHatWearing ? t('achievements.noHatSelected') : t('achievements.noHat'),
				}, [
					h('div', { key: 'preview', className: 'chat-pet-achievement-previews' }, h(ChatPetPreview, { accessoryId: null, unlocked: true, color: prefs.color, variant })),
					h('div', { key: 'content', className: 'chat-pet-achievement-card-content' }, [
						h('h3', { key: 'title' }, t('achievements.noHat')),
						h('span', { key: 'state', className: 'chat-pet-achievement-state' }, noHatWearing ? t('achievements.wearing') : '\u00a0'),
					]),
				])),
				...hats.map(card),
				h('li', { key: 'true-name', className: 'chat-pet-achievements-list-item' }, h('button', {
					type: 'button',
					className: 'chat-pet-achievement-card true-name',
					onClick: () => onTab('color'),
					'aria-label': t('achievements.cardAria', t('achievement.blobby.title'), t('color.custom')),
				}, [
					h('div', { key: 'preview', className: 'chat-pet-achievement-previews' }, h(ChatPetPreview, {
						accessoryId: null,
						unlocked: true,
						color: prefs.color,
						variant,
					})),
					h('div', { key: 'content', className: 'chat-pet-achievement-card-content' }, [
						h('h3', { key: 'title' }, t('achievement.blobby.title')),
						h('span', { key: 'state', className: 'chat-pet-achievement-state' }, t('color.custom')),
					]),
				])),
			]),
		]),
		h('p', { key: 'note', className: 'chat-pet-hats-note' }, t('hats.note')),
	])
}

function ColorPanel(props) {
	const { controller, t } = props
	const prefs = useBlobbyPrefs()
	const unlocked = prefs.trueNameUnlocked
	const [draft, setDraft] = React.useState(() => getChatPetBodyColor(prefs.color))
	const [hexDraft, setHexDraft] = React.useState(() => getChatPetBodyColor(prefs.color))
	const selected = prefs.color
	const variant = getChatPetColorVariant(selected)
	const parsedDraft = parseChatPetColor(draft)
	const validCustom = parsedDraft && !isDefaultChatPetColor(parsedDraft)
	const customApplied = validCustom && parsedDraft === selected
	React.useEffect(() => {
		setDraft(getChatPetBodyColor(prefs.color))
		setHexDraft(getChatPetBodyColor(prefs.color))
	}, [prefs.color])
	const apply = () => {
		if (!unlocked || !validCustom) return
		controller.selectColor(parsedDraft)
	}
	const choosePreset = color => {
		if (!unlocked && !isDefaultChatPetColor(color)) return
		controller.selectColor(color)
	}
	return h('div', { className: 'chat-pet-colors-content' }, [
		h('h1', { key: 'h1' }, t('color.title')),
		h('p', { key: 'intro', className: 'chat-pet-achievements-intro' }, t('color.intro')),
		h('ul', { key: 'presets', className: 'chat-pet-colors-list', 'aria-label': t('color.presets') }, CHAT_PET_COLOR_PRESETS.map(preset => {
			const enabled = isDefaultChatPetColor(preset.color) || unlocked
			const isSelected = preset.color === selected
			return h('li', { key: preset.color }, h('button', {
				type: 'button',
				className: `chat-pet-color-card ${isSelected ? 'wearing' : ''} ${enabled ? '' : 'locked'}`,
				disabled: !enabled,
				onClick: () => choosePreset(preset.color),
				'aria-label': isSelected ? t('color.selectedLabel', t(preset.key)) : enabled ? t(preset.key) : t('color.lockedLabel', t(preset.key)),
			}, [
				h(ChatPetPreview, { key: 'preview', accessoryId: prefs.accessory, unlocked: enabled, color: preset.color, variant: getChatPetColorVariant(preset.color), className: 'chat-pet-color-preview' }),
				h('span', { key: 'label', className: 'chat-pet-color-label' }, t(preset.key)),
				h('span', { key: 'state', className: 'chat-pet-color-state' }, isSelected ? t('color.selected') : enabled ? '\u00a0' : t('color.locked')),
			]))
		})),
		!unlocked ? h('p', { key: 'hint', className: 'chat-pet-colors-unlock-hint' }, t('color.unlockHint')) : null,
		h('section', { key: 'custom', className: 'chat-pet-custom-color' }, [
			h('h2', { key: 'h2' }, t('color.custom')),
			h('p', { key: 'desc' }, t('color.customDescription')),
			h('div', { key: 'body', className: 'chat-pet-custom-color-body' }, [
				h(ChatPetPreview, { key: 'preview', accessoryId: prefs.accessory, unlocked: true, color: validCustom ? parsedDraft : selected, variant, className: 'custom-preview' }),
				h('div', { key: 'controls', className: 'chat-pet-custom-color-controls' }, [
					h('div', { key: 'inputs', className: 'chat-pet-custom-color-inputs' }, [
						h('input', {
							key: 'picker',
							type: 'color',
							value: validCustom ? parsedDraft : getChatPetBodyColor(selected),
							disabled: !unlocked,
							'aria-label': t('color.chooseCustom'),
							onChange: event => {
								const value = event.target.value
								setDraft(value)
								setHexDraft(value)
							},
						}),
						h('input', {
							key: 'hex',
							type: 'text',
							className: `chat-pet-hex ${validCustom ? '' : 'is-invalid'}`,
							value: hexDraft,
							disabled: !unlocked,
							spellCheck: false,
							'aria-label': t('color.hex'),
							onChange: event => {
								setHexDraft(event.target.value)
								setDraft(event.target.value)
							},
							onKeyDown: event => {
								if (event.key === 'Enter') {
									event.preventDefault()
									apply()
								}
							},
						}),
						h('button', {
							key: 'apply',
							type: 'button',
							className: 'chat-pet-action',
							disabled: !unlocked || !validCustom || customApplied,
							onClick: apply,
						}, t('color.apply')),
					]),
					h('p', { key: 'validation', className: 'chat-pet-color-validation' }, validCustom ? '' : t('color.invalid')),
				]),
			]),
		]),
	])
}

function ChatPetPanel(props) {
	const { panel, tab, onTab, onClose, controller } = props
	// Keep the controller translator: locale strings use positional {0}/{1}
	// placeholders, while DSH's raw t expects named params.
	const t = controller?._tr?.bind(controller) ?? (key => getChatPetFallbackDictionary()[key] ?? key)
	const ref = React.useRef(null)
	React.useEffect(() => {
		const layer = ref.current
		if (!layer) return
		const button = layer.querySelector('.chat-pet-panel-tab[aria-selected="true"]') ?? layer.querySelector('button')
		button?.focus()
		const onKeyDown = event => {
			if (event.key === 'Escape') {
				event.preventDefault()
				onClose()
			}
			if (event.key !== 'Tab') return
			const buttons = [...layer.querySelectorAll('button, input, [tabindex="0"]')].filter(element => !element.disabled && element.getClientRects().length > 0)
			if (buttons.length === 0) return
			const first = buttons[0]
			const last = buttons[buttons.length - 1]
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault()
				last.focus()
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault()
				first.focus()
			}
		}
		document.addEventListener('keydown', onKeyDown, true)
		return () => document.removeEventListener('keydown', onKeyDown, true)
	}, [panel, onClose])
	if (!panel || !controller) return null
	return h('div', { className: 'chat-pet-panel-backdrop', onPointerDown: event => { if (event.target === event.currentTarget) onClose() } }, h('div', {
		ref,
		className: 'chat-pet-panel',
		role: 'dialog',
		'aria-modal': 'true',
		'aria-label': t('panel.title'),
	}, [
		h('div', { key: 'head', className: 'chat-pet-panel-head' }, [
			h('div', { key: 'tabs', className: 'chat-pet-panel-tabs', role: 'tablist' }, [
				h('button', { key: 'hats', type: 'button', role: 'tab', className: 'chat-pet-panel-tab', 'aria-selected': tab === 'hats' ? 'true' : 'false', onClick: () => onTab('hats') }, t('panel.tab.hats')),
				h('button', { key: 'color', type: 'button', role: 'tab', className: 'chat-pet-panel-tab', 'aria-selected': tab === 'color' ? 'true' : 'false', onClick: () => onTab('color') }, t('panel.tab.color')),
			]),
			h('button', { key: 'close', type: 'button', className: 'chat-pet-panel-close', 'aria-label': t('panel.close'), onClick: onClose }, '×'),
		]),
		h('div', { key: 'body', className: 'chat-pet-panel-body' }, tab === 'color'
			? h(ColorPanel, { controller, t })
			: h(HatsPanel, { controller, onTab, t })),
	]))
}

function PetSlot(props) {
	React.useSyncExternalStore(subscribeChatPetLocale, getChatPetLocaleRevision, getChatPetLocaleRevision)
	const tRef = React.useRef(props.t)
	tRef.current = props.t
	const [target, setTarget] = React.useState(null)
	const [ui, setUi] = React.useState({ menu: null, panel: null, tab: 'hats' })
	const anchorRef = React.useRef(null)
	const mountRef = React.useRef(null)
	const controllerRef = React.useRef(null)
	const uiRef = React.useRef(ui)
	uiRef.current = ui

	React.useEffect(() => {
		const layer = document.createElement('div')
		layer.className = 'dsh-blobby-layer'
		document.body.append(layer)
		setTarget(layer)
		return () => {
			layer.remove()
		}
	}, [])

	const getGeometry = React.useCallback(() => {
		const anchor = anchorRef.current
		if (!anchor) return null
		const seat = anchor.closest('[data-composer-seat]')
		const chat = anchor.closest('[data-conversation-region="chat"]')
		if (!seat || !chat) return null
		// The seat wraps the whole composer stack (hero, input dock and card) and
		// can be much taller and wider than the visible input. Use the composer
		// card itself as the pet's reliable perch.
		let input = anchor.closest('[data-composer-card]')
		if (!input) {
			const anchorRect = anchor.getBoundingClientRect()
			let bestDistance = Infinity
			for (const card of seat.querySelectorAll('[data-composer-card]')) {
				const rect = card.getBoundingClientRect()
				if (rect.width <= 0 || rect.height <= 0) continue
				const distance = Math.abs(rect.top - anchorRect.top)
				if (distance < bestDistance) {
					bestDistance = distance
					input = card
				}
			}
		}
		return { seat, chat, input }
	}, [])

	React.useEffect(() => {
		if (!target || !mountRef.current) return
		let controller
		try {
			controller = new ChatPetController(mountRef.current, {
				getT: () => tRef.current,
				getGeometry,
				status: text => statusNode.current && (statusNode.current.textContent = text, clearTimeout(statusTimer.current), statusTimer.current = setTimeout(() => { if (statusNode.current) statusNode.current.textContent = '' }, 1200)),
				openPanel: tab => setUi(current => ({ ...current, menu: null, panel: tab ?? 'hats', tab: tab ?? 'hats' })),
				openMenu: menu => setUi(current => ({ ...current, menu, panel: null })),
				closeUi: () => setUi(current => ({ ...current, menu: null, panel: null })),
				canPlayJumpGame: () => false,
			})
		} catch (error) {
			console.error('[vscode-pet] failed to mount Blobby', error)
			return
		}
		controllerRef.current = controller
		activeBlobbyController = controller
		controller.layout()
		return () => {
			if (activeBlobbyController === controller) activeBlobbyController = null
			controller.destroy()
			controllerRef.current = null
		}
	}, [target, getGeometry])

	const statusNode = React.useRef(null)
	const statusTimer = React.useRef(undefined)

	const statusReader = props.useSessionStatus
	const status = React.useCallback(function useStatus(snapshot) {
		return typeof statusReader === 'function' ? statusReader(snapshot) : undefined
	}, [statusReader])
	const sessionStatus = status(entry => pickSessionStatusEntry(entry, props.sessionId))
	const running = props.session && typeof props.session.running === 'boolean' ? props.session.running : sessionStatus?.running === true
	const pending = Boolean(sessionStatus?.pendingInteraction)
	const draft = props.input && typeof props.input.draft === 'string' ? props.input.draft : ''
	const hasInput = draft.trim().length > 0
	const draftRef = React.useRef(draft)
	const inputRevisionRef = React.useRef(0)
	if (draftRef.current !== draft) {
		draftRef.current = draft
		inputRevisionRef.current += 1
	}
	const controller = controllerRef.current
	React.useEffect(() => {
		controllerRef.current?.setFacts({
			running,
			pendingInteraction: pending,
			hasInput,
			inputRevision: inputRevisionRef.current,
			canceled: props.session?.canceled === true,
		})
	}, [running, pending, hasInput, draft, props.session?.canceled])

	React.useEffect(() => {
		if (!target) return
		const unsubscribe = chatPetPrefs.subscribe(() => {
			controllerRef.current?.applyPrefs()
			setUi(current => ({ ...current }))
		})
		return unsubscribe
	}, [target])

	const onClose = React.useCallback(() => setUi(current => ({ ...current, menu: null, panel: null })), [])
	const onTab = React.useCallback(tab => setUi(current => ({ ...current, tab })), [])

	return h(React.Fragment, null, [
		h('div', { key: 'anchor', ref: anchorRef, className: 'dsh-blobby-anchor', 'aria-hidden': 'true' }),
		target ? createPortal(h('div', { key: 'portal', className: 'dsh-blobby-portal' }, [
			h('div', { key: 'mount', ref: mountRef, className: 'dsh-blobby-mount' }),
			h('div', { key: 'status', ref: statusNode, className: 'dsh-blobby-status', role: 'status', 'aria-live': 'polite' }),
			h(ChatPetMenu, { key: 'menu', menu: ui.menu, controller, onClose }),
			h(ChatPetPanel, { key: 'panel', panel: ui.panel, tab: ui.tab, onClose, onTab, controller }),
		]), target) : null,
	])
}

class BlobbyBoundary extends React.Component {
	constructor(props) {
		super(props)
		this.state = { failed: false }
	}
	static getDerivedStateFromError() {
		return { failed: true }
	}
	componentDidCatch(error) {
		console.error('[vscode-pet] slot render failed', error)
	}
	render() {
		return this.state.failed ? null : this.props.children
	}
}

function PetSlotSafe(props) {
	return h(BlobbyBoundary, null, h(PetSlot, props))
}

function findJumpPerch(anchor) {
	if (!anchor) return undefined
	const chat = anchor.closest('[data-conversation-region="chat"]')
	if (!chat) return undefined
	// DSH shows the hero/welcome content only for a blank session. The first
	// direct child of the chat region that is tall enough is a playful perch.
	const seat = anchor.closest('[data-composer-seat]')
	if (!seat) return undefined
	const hero = seat.parentElement?.querySelector(':scope > :not([data-composer-seat])')
	if (!hero) return undefined
	const rect = hero.getBoundingClientRect()
	if (rect.width < 120 || rect.height < 40) return undefined
	return { left: rect.left, right: rect.right, top: rect.top }
}
