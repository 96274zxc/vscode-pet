/* Color parsing, Blobby palette recoloring and eye contrast. Ported from chatPetColors.ts. */

function parseChatPetColor(value) {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	if (trimmed === 'stable' || trimmed === 'insiders') return trimmed
	if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(trimmed)) return undefined
	const digits = trimmed.slice(1).toLowerCase()
	return `#${digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits}`
}

function getChatPetColorVariant(color) {
	return color === 'insiders' ? 'insiders' : 'stable'
}

function isDefaultChatPetColor(color) {
	return color === 'stable' || color === 'insiders'
}

function getChatPetBodyColor(color) {
	return color === 'stable' ? '#23a8f2' : color === 'insiders' ? '#24bfa5' : color
}

function hexToRgb(hex) {
	const normalized = hex.replace('#', '')
	const value = parseInt(normalized.length === 3 ? [...normalized].map(c => c + c).join('') : normalized, 16)
	return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function rgbToHsl({ r, g, b }) {
	r /= 255; g /= 255; b /= 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2
	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break
			case g: h = (b - r) / d + 2; break
			default: h = (r - g) / d + 4; break
		}
		h /= 6
	}
	return { h, s, l }
}

function hslToRgb({ h, s, l }) {
	if (s === 0) {
		const value = Math.round(l * 255)
		return { r: value, g: value, b: value }
	}
	const hue2rgb = (p, q, t) => {
		if (t < 0) t += 1
		if (t > 1) t -= 1
		if (t < 1 / 6) return p + (q - p) * 6 * t
		if (t < 1 / 2) return q
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
		return p
	}
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s
	const p = 2 * l - q
	return {
		r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		g: Math.round(hue2rgb(p, q, h) * 255),
		b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
	}
}

function darkenRgb(rgb, factor) {
	const hsl = rgbToHsl(rgb)
	return hslToRgb({ h: hsl.h, s: hsl.s, l: hsl.l - hsl.l * factor })
}

function luminance({ r, g, b }) {
	const channel = value => {
		const c = value / 255
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(first, second) {
	const a = luminance(first)
	const b = luminance(second)
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function getChatPetEyeColor(color) {
	if (color === 'stable' || color === 'insiders') return '#191a1b'
	return contrastRatio(hexToRgb(color), hexToRgb('#212324')) < 3 ? '#f5f5f5' : '#191a1b'
}

function getChatPetColorPalette(color) {
	const body = hexToRgb(color)
	const shade = darkenRgb(body, 0.25)
	const shadow = darkenRgb(body, 0.5)
	const palette = new Map([
		[0x23a8f2, body],
		[0x24bfa5, body],
		[0x0077b8, shade],
		[0x009a7c, shade],
		[0x004e7c, shadow],
		[0x004538, shadow],
		[0x006451, shadow],
		[0x006652, shadow],
	])
	const eyeColor = getChatPetEyeColor(color)
	if (eyeColor !== '#191a1b') {
		const eyes = hexToRgb(eyeColor)
		palette.set(0x191a1b, eyes)
		palette.set(0x212324, eyes)
	}
	return palette
}

const coloredSpriteCache = new Map()
let coloredSpritePixels = 0
const MAX_CACHED_SPRITE_PIXELS = 1024 * 1024

function getChatPetColoredSprite(image, color) {
	if (isDefaultChatPetColor(color)) return image
	const source = image.getAttribute('src')
	const key = `${source}:${image.naturalWidth}x${image.naturalHeight}:${color}`
	const cached = coloredSpriteCache.get(key)
	if (cached) {
		// Refresh the insertion order so the cache behaves as LRU, not FIFO.
		coloredSpriteCache.delete(key)
		coloredSpriteCache.set(key, cached)
		return cached
	}
	const canvas = document.createElement('canvas')
	canvas.width = image.naturalWidth
	canvas.height = image.naturalHeight
	const context = canvas.getContext('2d')
	if (!context) throw new Error('Unable to create the Blobby color canvas')
	context.imageSmoothingEnabled = false
	context.drawImage(image, 0, 0)
	const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
	const palette = getChatPetColorPalette(color)
	for (let index = 0; index < pixels.data.length; index += 4) {
		if (pixels.data[index + 3] === 0) continue
		const replacement = palette.get((pixels.data[index] << 16) | (pixels.data[index + 1] << 8) | pixels.data[index + 2])
		if (replacement) {
			pixels.data[index] = replacement.r
			pixels.data[index + 1] = replacement.g
			pixels.data[index + 2] = replacement.b
		}
	}
	context.putImageData(pixels, 0, 0)
	coloredSpriteCache.set(key, canvas)
	coloredSpritePixels += canvas.width * canvas.height
	while (coloredSpritePixels > MAX_CACHED_SPRITE_PIXELS) {
		const oldestKey = coloredSpriteCache.keys().next().value
		if (oldestKey === undefined) break
		const oldest = coloredSpriteCache.get(oldestKey)
		coloredSpriteCache.delete(oldestKey)
		coloredSpritePixels -= oldest.width * oldest.height
	}
	return canvas
}

function setChatPetImageSource(image, source) {
	image.removeAttribute('src')
	image.src = source
}
