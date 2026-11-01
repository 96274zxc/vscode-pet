/* Blobby's jump game. Model ported from common/chatPetJumpGame.ts, UI adapted to DSH. */

const JUMP_STEP = 1 / 120
const JUMP_CHARGE_DURATION = 900
const JUMP_GRAVITY = 1800
const JUMP_MIN_SPEED = 260
const JUMP_MAX_SPEED = 820

class ChatPetJumpGameModel {
	constructor(width, petSize, startX, random = Math.random) {
		if (!Number.isFinite(width) || !Number.isFinite(petSize) || !Number.isFinite(startX) || petSize <= 0 || width < petSize * 2) {
			throw new RangeError('The jump game needs a finite playfield at least twice the pet width.')
		}
		this.random = random
		this._width = width
		this.petSize = petSize
		this.scale = petSize / 48
		const x = clamp(startX, petSize / 2, width - petSize / 2)
		this._player = { x, height: 0, velocityX: 0, velocityY: 0, platform: 0 }
		const platformWidth = Math.min(petSize * 3, width)
		const left = clamp(x - platformWidth / 2, 0, width - platformWidth)
		this._platforms = [{ id: 0, left, originLeft: left, width: platformWidth, height: 0, kind: 'static', approachDirection: 0, collapseProgress: 0, fallDistance: 0, collapseDelay: 0 }]
		this._walls = []
		this.accumulator = 0
		this.chargeHeld = false
		this.chargeSteps = 0
		this._direction = 0
		this._bestHeight = 0
		this.steps = 0
		this.highestPlatform = 0
		this._hops = 0
	}

	get width() { return this._width }
	get platforms() { return this._platforms }
	get walls() { return this._walls }
	get player() { return this._player }
	get charge() { return Math.min(1, this.chargeSteps * JUMP_STEP * 1000 / JUMP_CHARGE_DURATION) }
	get direction() { return this._direction }
	get bestHeight() { return this._bestHeight }
	get hops() { return this._hops }
	get charging() { return this.chargeHeld && this._player.platform !== undefined }
	get hasFallen() { return this._player.height < 0 }

	setChargeHeld(held) {
		if (held === this.chargeHeld) return
		const launch = !held && this.charging
		this.chargeHeld = held
		if (launch) this.jump(this.charge)
	}

	cancelCharge() {
		this.chargeHeld = false
		this.chargeSteps = 0
	}

	hop(direction) {
		this._direction = direction
		if (!this.chargeHeld && this._player.platform !== undefined) this.jump(0)
	}

	jump(charge) {
		this._player.velocityX = this._direction * this.horizontalSpeed(charge)
		this._player.velocityY = this.jumpSpeed(charge)
		this._player.platform = undefined
		this.chargeSteps = 0
	}

	jumpSpeed(charge) { return (JUMP_MIN_SPEED + (JUMP_MAX_SPEED - JUMP_MIN_SPEED) * charge) * this.scale }
	horizontalSpeed(charge) { return (120 + 160 * charge) * this.scale }

	reflectX(x) {
		const minimum = this.petSize / 2
		const range = this._width - this.petSize
		const offset = ((x - minimum) % (range * 2) + range * 2) % (range * 2)
		return minimum + (offset <= range ? offset : range * 2 - offset)
	}

	ensurePlatforms(height) {
		if (!Number.isFinite(height)) throw new RangeError('The jump game generation height must be finite.')
		let previous = this._platforms[this._platforms.length - 1]
		while (previous.height < height) {
			const id = previous.id + 1
			const difficulty = Math.min(4, Math.floor(id / 8))
			const bank = id >= 12 && id % 8 === 4 ? this.createBankShot(previous, id) : undefined
			if (bank) {
				this._walls.push(bank.wall)
				previous = bank.platform
				this._platforms.push(previous)
				continue
			}
			const rise = (1.25 + this.random() + difficulty * 0.1) * this.petSize
			const charge = 0.72 + difficulty * 0.03 + this.random() * (0.25 - difficulty * 0.03)
			const speed = this.jumpSpeed(charge)
			const gravity = JUMP_GRAVITY * this.scale
			const landingTime = (speed + Math.sqrt(speed * speed - 2 * gravity * rise)) / gravity
			const center = previous.originLeft + previous.width / 2
			const direction = center < this._width / 4 ? 1 : center > this._width * 3 / 4 ? -1 : this.random() < 0.5 ? -1 : 1
			const projectedX = center + direction * this.horizontalSpeed(charge) * landingTime
			const landingX = this.reflectX(projectedX)
			const range = this._width - this.petSize
			const reflectedOffset = ((projectedX - this.petSize / 2) % (range * 2) + range * 2) % (range * 2)
			const width = Math.min(Math.max(1.1, 1.5 + this.random() * 0.75 - difficulty * 0.12) * this.petSize, this._width)
			const kind = id >= 9 && id % 8 === 1 ? 'crumbling' : id >= 5 && id % 8 === 5 ? 'moving' : 'static'
			const amplitude = Math.min(this.petSize * (0.45 + difficulty * 0.08), (this._width - width) / 2)
			const left = clamp(landingX - width / 2, kind === 'moving' ? amplitude : 0, this._width - width - (kind === 'moving' ? amplitude : 0))
			previous = {
				id, left, originLeft: left, width, height: previous.height + rise, kind,
				approachDirection: reflectedOffset <= range ? direction : direction === 1 ? -1 : 1,
				movement: kind === 'moving' ? { amplitude, speed: 1.2 + difficulty * 0.25, delta: 0 } : undefined,
				collapseProgress: 0, fallDistance: 0, collapseDelay: Math.round((1.6 - difficulty * 0.09) / JUMP_STEP),
			}
			if (previous.movement) previous.left += Math.sin(this.steps * JUMP_STEP * previous.movement.speed) * previous.movement.amplitude
			this._platforms.push(previous)
		}
	}

	createBankShot(previous, id) {
		const center = previous.originLeft + previous.width / 2
		const rise = this.petSize * 3.1
		const speed = this.jumpSpeed(1)
		const time = (speed + Math.sqrt(speed * speed - 2 * JUMP_GRAVITY * this.scale * rise)) / (JUMP_GRAVITY * this.scale)
		const offset = this.petSize * 1.25
		const distance = (this.horizontalSpeed(1) * time - offset) / 2
		const width = this.petSize * 0.8
		const wallWidth = this.petSize / 6
		const direction = previous.approachDirection || (center < this._width / 2 ? 1 : -1)
		const landingX = center - direction * offset
		const wallLeft = center + direction * (distance + this.petSize / 2) - (direction < 0 ? wallWidth : 0)
		if (landingX - width / 2 < this.petSize / 2 || landingX + width / 2 > this._width - this.petSize / 2
			|| wallLeft < this.petSize / 2 || wallLeft + wallWidth > this._width - this.petSize / 2) {
			return undefined
		}
		const height = previous.height + rise
		const left = landingX - width / 2
		return {
			platform: { id, left, originLeft: left, width, height, kind: 'static', approachDirection: direction === 1 ? -1 : 1, collapseProgress: 0, fallDistance: 0, collapseDelay: 0 },
			wall: { id, left: wallLeft, width: wallWidth, bottom: previous.height + this.petSize * 0.35, top: previous.height + speed * speed / (2 * JUMP_GRAVITY * this.scale) + this.petSize * 0.25 },
		}
	}

	resize(width) {
		if (!Number.isFinite(width) || width < this.petSize * 2) throw new RangeError('The jump game playfield is too narrow.')
		const shift = (width - this._width) / 2
		this._width = width
		this._player.x = clamp(this._player.x + shift, this.petSize / 2, width - this.petSize / 2)
		for (const platform of this._platforms) {
			const platformWidth = Math.min(platform.width, width)
			const amplitude = Math.min(platform.movement?.amplitude ?? 0, (width - platformWidth) / 2)
			platform.width = platformWidth
			platform.originLeft = clamp(platform.originLeft + shift, amplitude, width - platformWidth - amplitude)
			if (platform.movement) {
				platform.movement.amplitude = amplitude
				platform.movement.delta = 0
			}
			platform.left = platform.originLeft + (platform.movement ? Math.sin(this.steps * JUMP_STEP * platform.movement.speed) * amplitude : 0)
		}
		for (let index = this._walls.length - 1; index >= 0; index--) {
			const wall = this._walls[index]
			const left = wall.left + shift
			if (left < this.petSize / 2 || left + wall.width > width - this.petSize / 2) this._walls.splice(index, 1)
			else this._walls[index] = { ...wall, left }
		}
		const platform = this._platforms.find(platform => platform.id === this._player.platform)
		if (platform) {
			this._player.x = clamp(this._player.x, Math.max(this.petSize / 2, platform.left), Math.min(width - this.petSize / 2, platform.left + platform.width))
		} else if (this._player.platform !== undefined) {
			const wall = this._walls.find(wall => -wall.id === this._player.platform)
			if (wall) this._player.x = clamp(this._player.x, wall.left - this.petSize / 2, wall.left + wall.width + this.petSize / 2)
			else {
				this._player.platform = undefined
				this.cancelCharge()
			}
		}
	}

	advance(milliseconds) {
		if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('The jump game frame duration must be finite and nonnegative.')
		this.accumulator += Math.min(milliseconds, 100) / 1000
		while (this.accumulator + 1e-9 >= JUMP_STEP && !this.hasFallen) {
			this.accumulator -= JUMP_STEP
			this.step()
		}
	}

	step() {
		const player = this._player
		this.steps++
		for (const platform of this._platforms) {
			if (platform.movement) {
				const previousLeft = platform.left
				platform.left = platform.originLeft + Math.sin(this.steps * JUMP_STEP * platform.movement.speed) * platform.movement.amplitude
				platform.movement.delta = platform.left - previousLeft
				if (player.platform === platform.id) player.x = clamp(player.x + platform.left - previousLeft, this.petSize / 2, this._width - this.petSize / 2)
			}
			if (platform.collapseStep !== undefined) {
				const elapsed = this.steps - platform.collapseStep
				platform.collapseProgress = Math.min(1, elapsed / platform.collapseDelay)
				const fallTime = Math.max(0, elapsed - platform.collapseDelay) * JUMP_STEP
				platform.fallDistance = JUMP_GRAVITY * this.scale * fallTime * fallTime / 2
				if (platform.collapseProgress === 1 && player.platform === platform.id) {
					player.platform = undefined
					this.cancelCharge()
				}
			}
		}
		if (player.platform !== undefined) {
			if (this.chargeHeld && this.charge < 1) this.chargeSteps++
			return
		}
		const gravity = JUMP_GRAVITY * this.scale
		let remaining = JUMP_STEP
		while (remaining > 1e-9) {
			let collisionTime = remaining
			let collision
			let wallLanding
			const heightAt = time => player.height + player.velocityY * time - gravity * time * time / 2
			const crossingTime = (height, rising) => {
				const discriminant = player.velocityY * player.velocityY + 2 * gravity * (player.height - height)
				return discriminant < 0 ? Infinity : (player.velocityY + (rising ? -1 : 1) * Math.sqrt(discriminant)) / gravity
			}
			const hitSide = (x, bottom = -Infinity, top = Infinity) => {
				const time = (x - player.x) / player.velocityX
				if (time >= 0 && time <= collisionTime && heightAt(time) > bottom - this.petSize && heightAt(time) < top) {
					collisionTime = time
					collision = 'horizontal'
					wallLanding = undefined
				}
			}
			if (player.velocityX > 0) hitSide(this._width - this.petSize / 2)
			else if (player.velocityX < 0) hitSide(this.petSize / 2)
			for (const wall of this._walls) {
				const left = wall.left - this.petSize / 2
				const right = wall.left + wall.width + this.petSize / 2
				if (player.velocityX > 0 && player.x <= left) hitSide(left, wall.bottom, wall.top)
				else if (player.velocityX < 0 && player.x >= right) hitSide(right, wall.bottom, wall.top)
				for (const rising of [false, true]) {
					const surface = rising ? wall.bottom - this.petSize : wall.top
					if (rising ? player.height > surface || player.velocityY <= 0 : player.height < surface) continue
					const time = crossingTime(surface, rising)
					const x = player.x + player.velocityX * time
					if (time >= 0 && time <= collisionTime && x > left && x < right) {
						collisionTime = time
						collision = 'vertical'
						wallLanding = rising ? undefined : wall
					}
				}
			}
			for (const platform of this._platforms) {
				if (platform.collapseProgress === 1) continue
				const time = crossingTime(platform.height, false)
				if (time < 0 || time > collisionTime || player.velocityY - gravity * time >= 0) continue
				const x = player.x + player.velocityX * time
				const left = platform.left - (platform.movement?.delta ?? 0) * (remaining - time) / JUMP_STEP
				if (x >= left && x <= left + platform.width) {
					collisionTime = time
					collision = platform
					wallLanding = undefined
				}
			}
			const peakTime = clamp(player.velocityY / gravity, 0, collisionTime)
			this._bestHeight = Math.max(this._bestHeight, heightAt(peakTime))
			player.x += player.velocityX * collisionTime
			player.height = heightAt(collisionTime)
			player.velocityY = Math.max(-1400 * this.scale, player.velocityY - gravity * collisionTime)
			remaining -= collisionTime
			if (collision === 'horizontal') {
				player.velocityX *= -1
			} else if (wallLanding) {
				player.height = wallLanding.top
				player.velocityX = 0
				player.velocityY = 0
				player.platform = -wallLanding.id
				return
			} else if (collision === 'vertical') {
				player.velocityY *= -1
			} else if (collision) {
				player.x = clamp(player.x + (collision.movement?.delta ?? 0) * remaining / JUMP_STEP, this.petSize / 2, this._width - this.petSize / 2)
				player.height = collision.height
				player.velocityX = 0
				player.velocityY = 0
				player.platform = collision.id
				if (collision.kind === 'crumbling' && collision.collapseStep === undefined) collision.collapseStep = this.steps
				if (collision.id > this.highestPlatform) {
					this.highestPlatform = collision.id
					this._hops++
				}
				return
			}
		}
	}
}

class BlobbyJumpGame {
	constructor(controller, host) {
		this.controller = controller
		this.host = host
		this.bounds = controller.chatRect
		this.platform = controller.seatRect
		this.petSize = controller.displaySize
		this.disposed = false
		this.paused = false
		this.lastFrameTime = undefined
		this.highScore = chatPetPrefs.get().jumpHighScore || 0
		this.displayedHops = -1
		this.platformElements = new Map()
		this.wallElements = new Map()
		const startX = this.platform ? this.platform.left + this.platform.width / 2 - this.bounds.left : this.bounds.width / 2
		this.model = new ChatPetJumpGameModel(this.bounds.width, this.petSize, startX)
		this.anchor = clamp((this.platform?.top ?? this.bounds.top) - this.bounds.top, this.petSize + 48, this.bounds.height - 32)
		this.effects = createElement('div', 'chat-pet-jump-effects', { 'aria-hidden': 'true' })
		this.backdrop = createElement('div', 'chat-pet-jump-backdrop')
		this.stage = createElement('div', 'chat-pet-jump-stage')
		this.gauge = createElement('div', 'chat-pet-jump-charge')
		const track = createElement('div', 'chat-pet-jump-charge-track')
		this.cells = Array.from({ length: 8 }, () => {
			const cell = createElement('div', 'chat-pet-jump-charge-cell')
			track.append(cell)
			return cell
		})
		this.gauge.append(track)
		this.stage.append(this.gauge)
		this.score = createElement('div', 'chat-pet-jump-score')
		this.hopsLabel = createElement('div', 'chat-pet-jump-hops')
		this.highScoreLabel = createElement('div', 'chat-pet-jump-high-score')
		this.score.append(this.hopsLabel, this.highScoreLabel)
		this.hint = createElement('div', 'chat-pet-jump-hint', { text: host.getT()?.('jump.hint') ?? CHAT_PET_LOCALE.en['jump.hint'] })
		this.stage.append(this.score, this.hint)
		this.effects.append(this.backdrop, this.stage)
		this.root = controller.mount
		this.root.append(this.effects)
		this.updateScore()
	}

	start() {
		const bounds = this.bounds
		const effectsBounds = { left: 0, top: 0 }
		this.backdrop.style.left = `${bounds.left - effectsBounds.left}px`
		this.backdrop.style.top = `${bounds.top - effectsBounds.top}px`
		this.backdrop.style.width = `${bounds.width}px`
		this.backdrop.style.height = `${bounds.height}px`
		this.stage.style.left = `${bounds.left - effectsBounds.left}px`
		this.stage.style.top = `${bounds.top - effectsBounds.top}px`
		this.stage.style.width = `${bounds.width}px`
		this.stage.style.height = `${bounds.height}px`
		this.controller.button.classList.add('jump-game-pet')
		this.controller.button.tabIndex = 0
		this.controller._renderState('idle')
		this.render()
		this._onKeyDown = event => this.onKeyDown(event)
		this._onKeyUp = event => this.onKeyUp(event)
		window.addEventListener('keydown', this._onKeyDown, true)
		window.addEventListener('keyup', this._onKeyUp, true)
		this.controller.button.focus({ preventScroll: true })
		this.scheduleFrame()
	}

	scheduleFrame() {
		if (this.disposed || this.paused) return
		this._frame = requestAnimationFrame(() => {
			this._frame = undefined
			if (this.disposed) return
			if (!this.controller.root.isConnected) {
				this.exit('cancel')
				return
			}
			const now = performance.now()
			const previousPlatform = this.model.player.platform
			const previousCharge = this.model.charge
			this.model.advance(this.lastFrameTime === undefined ? 0 : now - this.lastFrameTime)
			this.lastFrameTime = now
			if (this.model.hasFallen) {
				this.render()
				this.exit('fall')
				return
			}
			if (previousCharge < 1 && this.model.charge === 1) this.host.status(translateChatPetText(this.host.getT(), 'jump.fullCharge'))
			if (previousPlatform === undefined && this.model.player.platform !== undefined) {
				const platform = this.model.platforms.find(platform => platform.id === this.model.player.platform)
				const key = platform?.kind === 'crumbling' ? 'jump.landedCrumbling' : platform?.kind === 'moving' ? 'jump.landedMoving' : this.model.player.platform < 0 ? 'jump.landedWall' : 'jump.landed'
				this.host.status(translateChatPetText(this.host.getT(), key, this.model.hops))
			}
			this.render()
			this.scheduleFrame()
		})
	}

	onKeyDown(event) {
		if (event.key === 'Escape') {
			event.preventDefault()
			event.stopImmediatePropagation()
			this.exit('escape')
			return
		}
		if (event.key === 'Tab') {
			this.exit('blur')
			return
		}
		if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
		if (![' ', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return
		event.preventDefault()
		event.stopImmediatePropagation()
		this.effects.classList.add('keyboard-focused')
		if (event.key === ' ') this.model.setChargeHeld(true)
		else if (event.key === 'ArrowLeft') this.model.hop(-1)
		else if (event.key === 'ArrowRight') this.model.hop(1)
		this.render()
	}

	onKeyUp(event) {
		if (event.key === ' ') {
			event.preventDefault()
			this.model.setChargeHeld(false)
			this.render()
		}
	}

	render() {
		const player = this.model.player
		if (this.displayedHops !== this.model.hops) this.updateScore()
		const cameraHeight = Math.max(0, player.height)
		this.model.ensurePlatforms(player.height + this.anchor + this.model.petSize * 4)
		const visible = new Set()
		for (const platform of this.model.platforms) {
			const top = this.anchor + cameraHeight - platform.height + platform.fallDistance
			if (top < -16 || top > this.bounds.height || platform.fallDistance >= this.model.petSize * 4) continue
			visible.add(platform.id)
			let rendered = this.platformElements.get(platform.id)
			if (!rendered) {
				const element = createElement('div', 'chat-pet-jump-platform')
				element.classList.add(platform.kind)
				const integrity = platform.kind === 'crumbling' ? createElement('div', 'chat-pet-jump-platform-integrity') : undefined
				if (integrity) element.append(integrity)
				this.stage.append(element)
				rendered = { element, integrity }
				this.platformElements.set(platform.id, rendered)
			}
			const { element, integrity } = rendered
			element.style.left = `${platform.left + platform.width / 2}px`
			element.style.top = `${top}px`
			element.style.width = `${platform.width}px`
			element.classList.toggle('crumbling-active', platform.collapseProgress > 0)
			if (integrity) {
				integrity.style.transform = `scaleX(${1 - platform.collapseProgress})`
				element.style.opacity = String(1 - platform.fallDistance / (this.model.petSize * 4))
			}
		}
		const visibleWalls = new Set()
		for (const wall of this.model.walls) {
			const top = this.anchor + cameraHeight - wall.top
			const height = wall.top - wall.bottom
			if (top + height < 0 || top > this.bounds.height) continue
			visibleWalls.add(wall.id)
			let element = this.wallElements.get(wall.id)
			if (!element) {
				element = createElement('div', 'chat-pet-jump-wall')
				this.stage.append(element)
				this.wallElements.set(wall.id, element)
			}
			element.style.left = `${wall.left}px`
			element.style.top = `${top}px`
			element.style.width = `${wall.width}px`
			element.style.height = `${height}px`
		}
		for (const [id, element] of this.wallElements) {
			if (!visibleWalls.has(id)) {
				element.remove()
				this.wallElements.delete(id)
			}
		}
		for (const [id, { element }] of this.platformElements) {
			if (!visible.has(id)) {
				element.remove()
				this.platformElements.delete(id)
			}
		}
		this.controller.button.style.position = 'fixed'
		this.controller.button.style.left = `${this.bounds.left + player.x - this.model.petSize / 2}px`
		this.controller.button.style.top = `${this.bounds.top + this.anchor + cameraHeight - player.height - this.model.petSize}px`
		this.controller.button.style.right = 'auto'
		this.controller.button.style.bottom = 'auto'
		this.gauge.style.left = `${Math.round(clamp(player.x - 38, 0, this.bounds.width - 76))}px`
		this.gauge.style.top = `${Math.round(this.anchor - this.model.petSize - 28)}px`
		this.gauge.classList.toggle('full', this.model.charge === 1)
		for (let index = 0; index < this.cells.length; index++) this.cells[index].classList.toggle('filled', index < Math.ceil(this.model.charge * this.cells.length))
		const direction = player.velocityX < 0 ? -1 : player.velocityX > 0 ? 1 : this.model.direction
		this.controller.button.dataset.hopDirection = direction < 0 ? 'left' : 'right'
		this.controller._facing.setDirection(direction < 0 ? 'left' : 'right')
		this.controller._renderState(player.platform === undefined ? 'jump' : 'idle')
	}

	updateScore() {
		const stored = chatPetPrefs.get().jumpHighScore || 0
		this.highScore = Math.max(this.highScore, stored, this.model.hops)
		this.displayedHops = this.model.hops
		this.hopsLabel.textContent = translateChatPetText(this.host.getT(), 'jump.hops', this.displayedHops)
		this.highScoreLabel.textContent = translateChatPetText(this.host.getT(), 'jump.highScore', this.highScore)
		chatPetPrefs.setSilent({ jumpHighScore: this.highScore })
	}

	exit(reason) {
		if (this.disposed) return
		this.controller.stopJumpGame(reason)
	}

	destroy() {
		this.disposed = true
		this.paused = true
		if (this._frame !== undefined) cancelAnimationFrame(this._frame)
		window.removeEventListener('keydown', this._onKeyDown, true)
		window.removeEventListener('keyup', this._onKeyUp, true)
		this.effects.remove()
		for (const element of this.platformElements.values()) element.element.remove()
		for (const element of this.wallElements.values()) element.remove()
		this.platformElements.clear()
		this.wallElements.clear()
		this.controller.button.style.position = ''
		this.controller.button.classList.remove('jump-game-pet')
	}
}
