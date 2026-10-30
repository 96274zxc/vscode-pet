/* Preferences store shared by the controller and the React panels. */

function normalizeChatPetPrefs(raw) {
	const source = raw && typeof raw === 'object' ? raw : {}
	const color = parseChatPetColor(source.color) ?? CHAT_PET_DEFAULT_PREFS.color
	// v1 shipped with no hat by default. A missing accessory (or a v1 null)
	// therefore migrates to the new default; an explicit null in v2+ means the
	// user chose "No Hat" and is preserved.
	let accessory
	if (source.accessory === undefined) {
		accessory = CHAT_PET_DEFAULT_PREFS.accessory
	} else if (source.accessory === null && (Number.isFinite(source.v) ? source.v : 1) < CHAT_PET_DEFAULT_PREFS.v) {
		accessory = CHAT_PET_DEFAULT_PREFS.accessory
	} else {
		accessory = typeof source.accessory === 'string' && getChatPetAccessoryById(source.accessory) ? source.accessory : null
	}
	const scale = Number.isFinite(source.scale) ? Math.max(CHAT_PET_MIN_SCALE, source.scale) : 1
	let horizontal = CHAT_PET_DEFAULT_PREFS.horizontal
	if (source.horizontal && typeof source.horizontal === 'object') {
		const edge = source.horizontal.edge === 'left' ? 'left' : 'right'
		const inset = Number.isFinite(source.horizontal.inset) ? Math.max(0, source.horizontal.inset) : CHAT_PET_DEFAULT_RIGHT_INSET
		horizontal = { edge, inset }
	}
	const achievementSeen = Array.isArray(source.achievementSeen)
		? source.achievementSeen.filter(id => CHAT_PET_ACHIEVEMENTS.some(achievement => achievement.id === id))
		: []
	const jumpHighScore = Number.isSafeInteger(source.jumpHighScore) && source.jumpHighScore >= 0 ? source.jumpHighScore : 0
	return {
		v: CHAT_PET_DEFAULT_PREFS.v,
		visible: source.visible !== false,
		color,
		accessory,
		scale,
		horizontal,
		onTheRun: source.onTheRun === true,
		achievementSeen: [...new Set(achievementSeen)],
		trueNameUnlocked: source.trueNameUnlocked === true,
		jumpHighScore,
	}
}

const chatPetPrefs = {
	state: normalizeChatPetPrefs(undefined),
	listeners: new Set(),
	load() {
		try {
			const raw = localStorage.getItem(CHAT_PET_STORAGE_KEY)
			if (raw) this.state = normalizeChatPetPrefs(JSON.parse(raw))
		} catch (ignored) { /* defaults */ }
		return this.state
	},
	get() { return this.state },
	subscribe(listener) {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	},
	set(patch) {
		this.state = normalizeChatPetPrefs({ ...this.state, ...patch })
		try { localStorage.setItem(CHAT_PET_STORAGE_KEY, JSON.stringify(this.state)) } catch (ignored) { /* quota */ }
		for (const listener of [...this.listeners]) {
			try { listener() } catch (ignored) { /* isolation */ }
		}
		return this.state
	},
	setSilent(patch) {
		this.state = normalizeChatPetPrefs({ ...this.state, ...patch })
		try { localStorage.setItem(CHAT_PET_STORAGE_KEY, JSON.stringify(this.state)) } catch (ignored) { /* quota */ }
		return this.state
	},
	isUnlocked(id) {
		if (id === 'blobby') return this.state.trueNameUnlocked
		return CHAT_PET_UNLOCKED_BY_DEFAULT.includes(id)
	},
	unlockedIds() {
		const ids = [...CHAT_PET_UNLOCKED_BY_DEFAULT]
		if (this.state.trueNameUnlocked) ids.push('blobby')
		return ids
	},
}

chatPetPrefs.load()

function getChatPetUnlockedIds() {
	return chatPetPrefs.unlockedIds()
}
