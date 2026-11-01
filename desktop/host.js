/* Host half of the Windows desktop display: routes, helper lifecycle and temp frame bundles. */

import { spawn as nodeSpawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { promises as nodeFs } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
	DESKTOP_PROTOCOL,
	DESKTOP_ROUTE,
	decodeDesktopPng,
	httpError,
	isDesktopRequestSupported,
	isDesktopSessionId,
	mergeDesktopSettings,
	normalizeDesktopFacts,
	sanitizeDesktopCommand,
	validateDesktopBundle,
} from './protocol.js'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_HELPER_SCRIPT = join(MODULE_DIR, 'blobby-desktop.ps1')
const DEFAULT_TEMP_ROOT = join(tmpdir(), 'dsh-blobby-desktop')
const START_READY_TIMEOUT = 60000
const SHOW_ACK_TIMEOUT = 8000
const PROBE_TIMEOUT = 1200
const STOP_TIMEOUT = 12000
const WARMUP_TIMEOUT = 15000
const POLL_HOLD = 20000
const HEARTBEAT_TIMEOUT = 5 * 60 * 1000
const MAX_STDERR = 8000

function jsonResponse(value, status = 200) {
	return new Response(JSON.stringify(value), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
	})
}

function emptyResponse(status) {
	return new Response(null, { status, headers: { 'cache-control': 'no-store' } })
}

function waitForExit(child, timeout) {
	return new Promise(resolve => {
		let settled = false
		const finish = (code, signal, error) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			resolve({ code, signal, error })
		}
		const timer = setTimeout(() => finish(undefined, 'timeout'), timeout)
		child.once('exit', (code, signal) => finish(code, signal))
		child.once('error', error => finish(undefined, undefined, error))
	})
}

function appendStderr(session, chunk) {
	session.stderr = `${session.stderr}${String(chunk)}`.slice(-MAX_STDERR)
}

function encodeStdinMessage(value) {
	// Keep every byte on the helper's stdin inside ASCII. The helper's stdin used
	// to be decoded with the console's ANSI code page, so the UTF-8 menu labels in
	// a show command were mangled into invalid JSON (a trailing lead byte swallowed
	// the closing quote of a Chinese label); the helper silently dropped the line,
	// the show was never acknowledged and the pet never appeared. \uXXXX escapes
	// survive any decoder and JSON.parse / JavaScriptSerializer restore the text.
	return JSON.stringify(value).replace(/[\u007f-\uffff]/g, character =>
		`\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

export class DesktopHelperManager {
	constructor(options = {}) {
		this.platform = options.platform ?? process.platform
		this.helperScript = options.helperScript ?? DEFAULT_HELPER_SCRIPT
		this.helperExists = options.helperExists ?? existsSync(this.helperScript)
		this.tempRoot = options.tempRoot ?? DEFAULT_TEMP_ROOT
		this.spawn = options.spawn ?? nodeSpawn
		this.fs = options.fs ?? nodeFs
		this.powershell = options.powershell ?? 'powershell.exe'
		this.parentPid = options.parentPid ?? process.ppid
		this.showAckTimeout = options.showAckTimeout ?? SHOW_ACK_TIMEOUT
		this.probeTimeout = options.probeTimeout ?? PROBE_TIMEOUT
		this.logger = options.logger ?? { warn: (...args) => console.warn(...args), error: (...args) => console.error(...args) }
		this.onEvent = options.onEvent
		this.session = undefined
		this.lastStop = undefined
		this.disposed = false
		this.warmupPromise = undefined
		this._probeSeq = 0
		this._operation = Promise.resolve()
		this._sweepTimer = setInterval(() => this.sweep(), 60000)
		this._sweepTimer.unref?.()
	}

	_enqueue(task) {
		const run = this._operation.then(() => task())
		this._operation = run.then(() => undefined, () => undefined)
		return run
	}

	get supported() {
		return isDesktopRequestSupported(this.platform, this.helperExists)
	}

	_assertSupported() {
		if (this.disposed) throw httpError(503, 'desktop display is shutting down')
		if (!this.supported) {
			throw httpError(501, 'desktop display is only available in the Windows desktop app')
		}
	}

	_helperArgs(extra, manifestPath, prepared) {
		const args = ['-NoProfile', '-STA', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', this.helperScript]
		if (extra) args.push(...extra)
		else {
			if (prepared) args.push('-Prepared')
			args.push(manifestPath, String(this.parentPid))
		}
		return args
	}

	async warmup() {
		this._assertSupported()
		if (this.warmupPromise) return this.warmupPromise
		this.warmupPromise = (async () => {
			await this.fs.mkdir(this.tempRoot, { recursive: true })
			const child = this.spawn(this.powershell, this._helperArgs(['-Warmup']), {
				stdio: ['ignore', 'pipe', 'pipe'],
				windowsHide: true,
				cwd: this.tempRoot,
			})
			let stderr = ''
			child.stderr?.on('data', chunk => { stderr = `${stderr}${String(chunk)}`.slice(-MAX_STDERR) })
			const result = await waitForExit(child, WARMUP_TIMEOUT)
			if (result.code !== 0) {
				if (result.signal === 'timeout') {
					try { child.kill?.() } catch (ignored) { /* already gone */ }
				}
				throw httpError(500, `desktop helper warmup failed: ${stderr.trim() || result.error?.message || result.code || result.signal}`)
			}
			return { ok: true }
		})().finally(() => { this.warmupPromise = undefined })
		return this.warmupPromise
	}

	async prepare(rawBundle) {
		this._assertSupported()
		return this._enqueue(async () => {
			const bundle = validateDesktopBundle(rawBundle)
			if (this._preparing) return this._preparing
			this._preparing = this._prepareInternal(bundle).finally(() => { this._preparing = undefined })
			return this._preparing
		})
	}

	async _prepareInternal(bundle) {
		const existing = this.session
		if (existing && !existing.exited && existing.prepared && existing.frameKey === bundle.frameKey) {
			existing.settings = { ...bundle.settings, desktopDisplay: true }
			existing.facts = bundle.facts
			return { session: existing.id, prepared: true, version: existing.version }
		}
		await this._disposeCurrent()
		const session = await this._spawn(bundle, true)
		session.prepared = true
		session.visible = false
		session.frameKey = bundle.frameKey
		return { session: session.id, prepared: true, version: session.version }
	}

	async start(rawBundle) {
		this._assertSupported()
		return this._enqueue(async () => {
			const bundle = validateDesktopBundle(rawBundle)
			// The warmup and prepare are prefetches: never let the actual show wait
			// on them (a stuck warmup used to leave the auto handoff pending with the
			// in-window pet suspended). The queue above already serialized them.
			if (this._preparing) {
				try { await this._preparing } catch (ignored) { /* fall back to a cold helper */ }
			}
			const current = this.session
			if (current && !current.exited && current.prepared && !current.visible && current.frameKey === bundle.frameKey) {
				current.settings = { ...bundle.settings, desktopDisplay: true }
				current.facts = bundle.facts
				current.prepared = false
				current.visible = true
				current.version += 1
				current.showSeq += 1
				current.lastPollAt = Date.now()
				// The show sequence number travels with the command and comes back in
				// status.json, so a snapshot from before this show can never be read
				// as "the helper went back to prepared" (that made the client stop the
				// helper in the same tick it started).
				const written = this._writeStdin(current, { type: 'show', settings: current.settings, facts: current.facts, showSeq: current.showSeq })
				if (!written) {
					this._kill(current)
					await this._cleanupSession(current)
					throw httpError(500, 'desktop helper stopped accepting commands')
				}
				this._wakeWaiters(current)
				const shown = await this._waitForShown(current)
				if (!shown) {
					const stderr = current.stderr.trim()
					this._kill(current)
					await this._cleanupSession(current)
					throw httpError(504, `desktop helper did not confirm the show${stderr ? `: ${stderr}` : ''}`)
				}
				return { session: current.id, version: current.version, settings: current.settings, protocol: DESKTOP_PROTOCOL }
			}
			await this._disposeCurrent()
			const session = await this._spawn(bundle, false)
			session.prepared = false
			session.visible = true
			session.frameKey = bundle.frameKey
			return { session: session.id, version: session.version, settings: session.settings, protocol: DESKTOP_PROTOCOL }
		})
	}

	async _spawn(bundle, prepared) {
		const sessionId = randomBytes(16).toString('hex')
		const dir = join(this.tempRoot, sessionId)
		const manifest = await this._writeBundle(dir, bundle, sessionId)
		let child
		try {
			child = this.spawn(this.powershell, this._helperArgs(undefined, manifest.path, prepared), {
				stdio: ['pipe', 'pipe', 'pipe'],
				windowsHide: true,
				cwd: dir,
			})
		} catch (error) {
			await this._removeDir(dir)
			throw httpError(500, `desktop helper could not start: ${error.message}`)
		}
		const session = {
			id: sessionId,
			dir,
			manifestPath: manifest.path,
			settings: { ...bundle.settings, desktopDisplay: true },
			facts: bundle.facts,
			frameKey: bundle.frameKey,
			prepared: prepared === true,
			visible: prepared !== true,
			version: 0,
			showSeq: 0,
			probes: new Map(),
			command: undefined,
			lastPollAt: Date.now(),
			waiters: [],
			child,
			stdoutBuffer: '',
			stderr: '',
			ready: false,
			exited: false,
			exiting: false,
			stopping: undefined,
			hiddenPromise: undefined,
			resolveHidden: undefined,
			resolveShown: undefined,
			exitPromise: undefined,
			resolveExit: undefined,
			readyTimer: undefined,
			resolveReady: undefined,
			rejectReady: undefined,
		}
		session.exitPromise = new Promise(resolve => { session.resolveExit = resolve })
		const ready = new Promise((resolve, reject) => {
			session.resolveReady = resolve
			session.rejectReady = reject
		})
		this.session = session
		this._attach(session)
		session.readyTimer = setTimeout(() => {
			this._rejectReady(session, httpError(504, `desktop helper did not become ready: ${session.stderr.trim()}`))
			this._kill(session)
		}, START_READY_TIMEOUT)
		session.readyTimer.unref?.()
		try {
			await ready
		} catch (error) {
			await this._cleanupSession(session)
			throw error
		}
		return session
	}

	_attach(session) {
		const child = session.child
		child.stdout?.on('data', chunk => this._onStdout(session, chunk))
		child.stderr?.on('data', chunk => {
			appendStderr(session, chunk)
			const text = String(chunk).trim()
			if (text) this.logger.warn?.(`[vscode-pet:desktop] ${text}`)
		})
		child.on?.('error', error => this._finish(session, error))
		child.on?.('exit', (code, signal) => this._finish(session, undefined, code, signal))
		child.stdin?.on?.('error', () => { /* a closed pipe is handled by exit */ })
	}

	_onStdout(session, chunk) {
		session.stdoutBuffer += String(chunk)
		let index
		while ((index = session.stdoutBuffer.indexOf('\n')) >= 0) {
			const line = session.stdoutBuffer.slice(0, index).trim()
			session.stdoutBuffer = session.stdoutBuffer.slice(index + 1)
			if (!line) continue
			let message
			try {
				message = JSON.parse(line)
			} catch (ignored) {
				this.logger.warn?.(`[vscode-pet:desktop] ignored helper output: ${line.slice(0, 200)}`)
				continue
			}
			this._onMessage(session, message)
		}
	}

	_onMessage(session, message) {
		if (!message || typeof message !== 'object') return
		try { this.onEvent?.(message) } catch (ignored) { /* diagnostics only */ }
		if (message.type === 'shown' || message.type === 'hidden' || message.type === 'exit') {
			// Diagnostic: pair the helper's lifecycle message with the host session
			// flag so a prepared/visible mismatch can be attributed.
			console.log(`[blobby] helper ${message.type} session=${session.id} prepared=${session.prepared} visible=${session.visible} reason=${message.reason ?? ''}`)
		}
		if (message.type === 'ready') {
			session.ready = true
			clearTimeout(session.readyTimer)
			session.resolveReady?.()
			session.resolveReady = undefined
			session.rejectReady = undefined
			return
		}
		if (message.type === 'settings') {
			session.settings = mergeDesktopSettings(session.settings, message.settings)
			session.version += 1
			this._wakeWaiters(session)
			return
		}
		if (message.type === 'shown') {
			session.prepared = false
			session.visible = true
			const resolveShown = session.resolveShown
			session.resolveShown = undefined
			try { resolveShown?.(true) } catch (ignored) { /* isolation */ }
			return
		}
		if (message.type === 'hidden') {
			session.settings = mergeDesktopSettings(session.settings, message.settings)
			session.prepared = true
			session.visible = false
			session.hiddenReason = typeof message.reason === 'string' ? message.reason : undefined
			session.version += 1
			this._wakeWaiters(session)
			const resolveHidden = session.resolveHidden
			session.resolveHidden = undefined
			session.hiddenPromise = undefined
			try { resolveHidden?.() } catch (ignored) { /* isolation */ }
			return
		}
		if (message.type === 'command') {
			const command = sanitizeDesktopCommand(message.command)
			if (command) session.command = command
			if (message.settings) session.settings = mergeDesktopSettings(session.settings, message.settings)
			session.version += 1
			this._wakeWaiters(session)
			return
		}
		if (message.type === 'probe-result') {
			const waiter = session.probes?.get(message.id)
			if (waiter) {
				session.probes.delete(message.id)
				try { waiter(message) } catch (ignored) { /* isolation */ }
			}
			return
		}
		if (message.type === 'error') {
			this.logger.warn?.(`[vscode-pet:desktop] helper error: ${String(message.message ?? '').slice(0, 500)}`)
		}
	}

	_finish(session, error, code, signal) {
		if (session.exited) return
		session.exited = true
		try { this.onEvent?.({ type: 'exit', code, signal, stderr: session.stderr, error: error ? String(error) : undefined }) } catch (ignored) { /* diagnostics only */ }
		clearTimeout(session.readyTimer)
		if (!session.ready) {
			this._rejectReady(session, httpError(500, `desktop helper exited before it was ready: ${session.stderr.trim() || error?.message || code || signal}`))
		}
		if (this.session === session) this.session = undefined
		this.lastStop = {
			sessionId: session.id,
			settings: { ...session.settings, desktopDisplay: session.settings.desktopDisplay !== false },
			command: session.command,
			hiddenReason: session.hiddenReason,
		}
		const resolveShown = session.resolveShown
		session.resolveShown = undefined
		try { resolveShown?.(false) } catch (ignored) { /* isolation */ }
		session.resolveExit?.({
			code,
			signal,
			settings: { ...session.settings, desktopDisplay: session.settings.desktopDisplay !== false },
			command: session.command,
			hiddenReason: session.hiddenReason,
		})
		session.resolveExit = undefined
		this._wakeWaiters(session)
		this._removeDir(session.dir).catch(() => {})
	}

	_rejectReady(session, error) {
		if (session.ready || !session.rejectReady) return
		session.rejectReady(error)
		session.rejectReady = undefined
		session.resolveReady = undefined
	}

	_wakeWaiters(session) {
		const waiters = session.waiters.slice()
		session.waiters.length = 0
		for (const wake of waiters) {
			try { wake() } catch (ignored) { /* isolation */ }
		}
	}

	_waitForShown(session) {
		// The helper acknowledges a show with its "shown" message and flushes
		// status.json before emitting it. Waiting for that acknowledgement keeps a
		// start from "succeeding" while the pet never appears, and makes the very
		// first facts heartbeat read a status that already describes the shown
		// window instead of the prepared one it just left.
		if (session.exited) return Promise.resolve(false)
		return new Promise(resolve => {
			let settled = false
			const finish = value => {
				if (settled) return
				settled = true
				clearTimeout(timer)
				if (session.resolveShown === finish) session.resolveShown = undefined
				resolve(value === true)
			}
			const timer = setTimeout(() => finish(false), this.showAckTimeout)
			timer.unref?.()
			session.resolveShown = finish
		})
	}

	_requireSession(sessionId) {
		if (!isDesktopSessionId(sessionId)) throw httpError(400, 'desktop session is invalid')
		const session = this.session
		if (!session || session.id !== sessionId) throw httpError(410, 'desktop session is no longer active')
		return session
	}

	async _statusSnapshot(session) {
		try {
			// Use the real fs, not this.fs: the injected fs is the plugin host's
			// virtual/scoped fs and may not expose the OS temp directory.
			const raw = await nodeFs.readFile(join(session.dir, 'status.json'), 'utf8')
			const status = JSON.parse(raw)
			if (typeof status?.phase !== 'string') return undefined
			// The helper rewrites status.json at most every 250 ms and only stamps a
			// show into the file when it handles the show command. A snapshot that
			// still carries an older show is the prepared window from before the
			// current show, so it says nothing about the window that is visible now
			// and must not be reported as "prepared" (the client treats a prepared
			// answer as "the helper hid itself" and stops it in the same tick).
			if (session.showSeq > 0 && Number(status.showSeq) !== session.showSeq) return undefined
			return status
		} catch (ignored) {
			return undefined
		}
	}

	async _pendingResult(session) {
		// The helper's status.json is authoritative for prepared/visible: the
		// message stream can miss/lose a hidden or shown message, and a stale
		// host-side flag would leave the client active forever.
		const status = await this._statusSnapshot(session)
		const prepared = status ? status.phase === 'prepared' : session.prepared === true
		return {
			version: session.version,
			settings: { ...session.settings, desktopDisplay: session.settings.desktopDisplay !== false },
			prepared,
			...(status ? { phase: status.phase } : {}),
			...(session.hiddenReason ? { hiddenReason: session.hiddenReason } : {}),
		}
	}

	pending(sessionId, since) {
		const session = this._requireSession(sessionId)
		if (session.exited) throw httpError(410, 'desktop session is no longer active')
		session.lastPollAt = Date.now()
		const sinceVersion = Number.isFinite(since) ? since : -1
		if (sinceVersion < session.version) return Promise.resolve(this._pendingResult(session))
		return new Promise(resolve => {
			let done = false
			let timer
			const finish = (value) => {
				if (done) return
				done = true
				clearTimeout(timer)
				const index = session.waiters.indexOf(wake)
				if (index >= 0) session.waiters.splice(index, 1)
				resolve(value)
			}
			const wake = () => finish(this._pendingResult(session))
			session.waiters.push(wake)
			timer = setTimeout(() => finish(this._pendingResult(session)), POLL_HOLD)
			timer.unref?.()
		})
	}

	pendingAbortable(sessionId, since, signal) {
		const session = this._requireSession(sessionId)
		if (signal?.aborted) return Promise.resolve(undefined)
		return new Promise(resolve => {
			let done = false
			let timer
			const finish = value => {
				if (done) return
				done = true
				clearTimeout(timer)
				signal?.removeEventListener?.('abort', onAbort)
				const index = session.waiters.indexOf(wake)
				if (index >= 0) session.waiters.splice(index, 1)
				resolve(value)
			}
			const wake = () => finish(this._pendingResult(session))
			const onAbort = () => finish(undefined)
			session.waiters.push(wake)
			signal?.addEventListener?.('abort', onAbort)
			if (Number.isFinite(since) && since >= session.version) {
				timer = setTimeout(() => finish(this._pendingResult(session)), POLL_HOLD)
				timer.unref?.()
			} else {
				finish(this._pendingResult(session))
			}
		})
	}

	async facts(sessionId, rawFacts) {
		const session = this._requireSession(sessionId)
		const facts = normalizeDesktopFacts(rawFacts)
		session.facts = facts
		session.lastPollAt = Date.now()
		this._writeStdin(session, { type: 'facts', facts })
		// The heartbeat carries the prepared flag so the client can clear its
		// active state even if the hidden renderer's long-poll never delivers.
		// Read the helper's status.json instead of trusting the host-side flag,
		// but only accept a snapshot that belongs to the current show.
		const status = await this._statusSnapshot(session)
		const prepared = status ? status.phase === 'prepared' : session.prepared === true
		return { ok: true, prepared, ...(status ? { phase: status.phase } : {}) }
	}

	// Ask the prepared helper whether DSH is still visible and unobstructed, so
	// the client can keep the pet inside the window when the user merely clicked
	// the desktop instead of moving the pet out. Only the native helper can see
	// the Win32 z-order, hence the round trip.
	async probe(sessionId) {
		const session = this._requireSession(sessionId)
		if (session.exited) throw httpError(410, 'desktop session is no longer active')
		session.lastPollAt = Date.now()
		const id = ++this._probeSeq
		const result = await new Promise(resolve => {
			let settled = false
			const finish = value => {
				if (settled) return
				settled = true
				clearTimeout(timer)
				session.probes.delete(id)
				resolve(value)
			}
			const timer = setTimeout(() => finish(undefined), this.probeTimeout)
			timer.unref?.()
			session.probes.set(id, finish)
			if (!this._writeStdin(session, { type: 'probe', id })) finish(undefined)
		})
		if (!result) throw httpError(504, 'desktop helper did not answer the window probe')
		return {
			ok: true,
			visible: result.visible === true,
			iconic: result.iconic === true,
			foreground: result.foreground === true,
			covered: result.covered === true,
		}
	}

	_writeStdin(session, value) {
		try {
			if (session.child?.stdin?.writable) {
				session.child.stdin.write(`${encodeStdinMessage(value)}\n`)
				return true
			}
		} catch (ignored) { /* the exit handler reports the failure */ }
		return false
	}

	stop(sessionId, options = {}) {
		if (!sessionId) return Promise.reject(httpError(400, 'desktop session is required'))
		if (!isDesktopSessionId(sessionId)) return Promise.reject(httpError(400, 'desktop session is invalid'))
		return this._enqueue(() => this._stopInternal(sessionId, options))
	}

	async _stopInternal(sessionId, options = {}) {
		const session = this.session
		if (!session || session.id !== sessionId) {
			return this.lastStop && this.lastStop.sessionId === sessionId
				? this.lastStop
				: { sessionId, settings: undefined, command: undefined }
		}
		const dispose = options.dispose === true
		if (session.prepared && !session.visible) {
			const result = {
				sessionId,
				settings: { ...session.settings, desktopDisplay: session.settings.desktopDisplay !== false },
				command: session.command,
			}
			if (dispose) {
				this._kill(session)
				await this._cleanupSession(session)
			}
			this.lastStop = result
			return result
		}
		if (session.stopping) return session.stopping
		session.stopping = (async () => {
			const result = {
				sessionId,
				settings: { ...session.settings, desktopDisplay: session.settings.desktopDisplay !== false },
				command: session.command,
			}
			let resolveHidden
			const hidden = new Promise(resolve => { resolveHidden = resolve })
			session.resolveHidden = resolveHidden
			this._writeStdin(session, { type: 'stop', dispose })
			const timeout = new Promise(resolve => {
				const timer = setTimeout(resolve, STOP_TIMEOUT)
				timer.unref?.()
			})
			await Promise.race([hidden, session.exitPromise, timeout])
			if (session.exited) {
				await this._cleanupSession(session)
			} else if (dispose) {
				this._kill(session)
				await this._cleanupSession(session)
			} else {
				session.prepared = true
				session.visible = false
			}
			session.stopping = undefined
			this.lastStop = result
			return result
		})()
		return session.stopping
	}

	async _disposeCurrent() {
		const session = this.session
		if (!session) return
		try {
			await this._stopInternal(session.id, { dispose: true })
		} catch (ignored) {
			/* fall through to the hard cleanup below */
		}
		// A concurrent client stop may have made _stopInternal return that stop's
		// non-dispose result, so make sure the session and its process are gone.
		if (this.session === session) {
			this._kill(session)
			await this._cleanupSession(session)
		}
	}

	disposeSession() {
		return this._enqueue(async () => {
			await this._disposeCurrent()
			return { ok: true }
		})
	}

	_kill(session) {
		try {
			session.child?.kill?.()
		} catch (ignored) { /* already gone */ }
	}

	async _cleanupSession(session) {
		if (this.session === session) this.session = undefined
		for (const wake of session.waiters.slice()) {
			try { wake() } catch (ignored) { /* isolation */ }
		}
		session.waiters.length = 0
		await this._removeDir(session.dir)
	}

	async _removeDir(dir) {
		if (!dir) return
		// Windows can refuse a recursive delete while an antivirus scanner or the
		// shell thumbnail cache still holds a freshly written frame file open, so a
		// transient EPERM must not leave the session directory behind.
		for (let attempt = 0; attempt < 5; attempt++) {
			try {
				await this.fs.rm(dir, { recursive: true, force: true })
				return
			} catch (ignored) {
				if (attempt === 4) return
				await new Promise(resolve => setTimeout(resolve, 50))
			}
		}
	}

	async _writeBundle(dir, bundle, sessionId) {
		await this.fs.mkdir(dir, { recursive: true })
		const framesDir = join(dir, 'frames')
		const states = {}
		for (const [state, entry] of Object.entries(bundle.states)) {
			const rightDir = join(framesDir, state)
			await this.fs.mkdir(rightDir, { recursive: true })
			await Promise.all(entry.right.map((frame, index) => this.fs.writeFile(join(rightDir, `${index}.png`), decodeDesktopPng(frame))))
			const meta = {
				width: entry.width,
				height: entry.height,
				durations: entry.durations,
				loop: entry.loop,
				mirror: entry.mirror,
				count: entry.right.length,
			}
			if (Array.isArray(entry.frameIndices)) meta.frameIndices = entry.frameIndices
			if (entry.mirror === false) {
				const leftDir = join(framesDir, `${state}-left`)
				await this.fs.mkdir(leftDir, { recursive: true })
				await Promise.all(entry.left.map((frame, index) => this.fs.writeFile(join(leftDir, `${index}.png`), decodeDesktopPng(frame))))
				meta.leftCount = entry.left.length
			}
			states[state] = meta
		}
		const effectMeta = async (name, effect) => {
			const effectDir = join(framesDir, name)
			await this.fs.mkdir(effectDir, { recursive: true })
			await Promise.all(effect.frames.map((frame, index) => this.fs.writeFile(join(effectDir, `${index}.png`), decodeDesktopPng(frame))))
			return { width: effect.width, height: effect.height, durations: effect.durations, loop: effect.loop, count: effect.frames.length }
		}
		const bubble = await effectMeta('bubble', bundle.bubble)
		const respawn = await effectMeta('respawn', bundle.respawn)
		const blink = bundle.blink ? await effectMeta('blink', bundle.blink) : undefined
		const gaze = bundle.gaze ? await effectMeta('gaze', bundle.gaze) : undefined
		const manifest = {
			protocol: DESKTOP_PROTOCOL,
			sessionId,
			settings: { ...bundle.settings, desktopDisplay: true },
			facts: bundle.facts,
			labels: bundle.labels,
			theme: bundle.theme,
			model: bundle.model,
			windowRect: bundle.windowRect,
			parentPid: this.parentPid,
			sessionDir: dir,
			framesDir,
			statusPath: join(dir, 'status.json'),
			states,
			bubble,
			respawn,
			...(blink ? { blink } : {}),
			...(gaze ? { gaze } : {}),
		}
		const path = join(dir, 'manifest.json')
		await this.fs.writeFile(path, JSON.stringify(manifest))
		return { path, settings: manifest.settings, facts: manifest.facts }
	}

	sweep() {
		if (this.disposed) return
		const session = this.session
		if (!session) return
		if (Date.now() - session.lastPollAt > HEARTBEAT_TIMEOUT) {
			// Prepared helpers are long-lived for a fast start; reclaim them too
			// when the client page stops sending facts (crash/reload), otherwise a
			// hidden PowerShell/WPF process and its temp frames leak forever.
			this.logger.warn?.(`[vscode-pet:desktop] stopping an idle ${session.prepared ? 'prepared ' : ''}desktop helper`)
			this._kill(session)
			this._cleanupSession(session)
		}
	}

	dispose() {
		if (this.disposed) return
		this.disposed = true
		clearInterval(this._sweepTimer)
		const session = this.session
		if (session) {
			this._kill(session)
			this._cleanupSession(session)
		}
	}
}

function parseQuery(request) {
	try {
		return new URL(request.url).searchParams
	} catch (ignored) {
		return new URLSearchParams()
	}
}

async function readJsonBody(request) {
	try {
		return await request.json()
	} catch (ignored) {
		throw httpError(400, 'desktop request body must be JSON')
	}
}

function handleError(manager, error) {
	const status = Number.isInteger(error?.status) ? error.status : 500
	if (status >= 500) manager.logger.error?.(`[vscode-pet:desktop] ${error?.stack ?? error}`)
	return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, status)
}

export function createDesktopRoutes(manager) {
	const wrap = handler => async request => {
		try {
			return await handler(request)
		} catch (error) {
			return handleError(manager, error)
		}
	}
	return [
		{
			path: `${DESKTOP_ROUTE}/capabilities`,
			methods: ['GET'],
			requestBody: 'buffered',
			fetch: wrap(async () => jsonResponse({
				supported: manager.supported,
				platform: manager.platform,
				helper: manager.helperExists,
				protocol: DESKTOP_PROTOCOL,
			})),
		},
		{
			path: `${DESKTOP_ROUTE}/warmup`,
			methods: ['POST'],
			requestBody: 'buffered',
			fetch: wrap(async () => jsonResponse(await manager.warmup())),
		},
		{
			path: `${DESKTOP_ROUTE}/prepare`,
			methods: ['POST'],
			requestBody: 'buffered',
			fetch: wrap(async request => {
				const body = await readJsonBody(request)
				if (!body || typeof body !== 'object' || body.bundle === undefined) throw httpError(400, 'desktop bundle is required')
				return jsonResponse(await manager.prepare(body.bundle))
			}),
		},
		{
			path: `${DESKTOP_ROUTE}/start`,
			methods: ['POST'],
			requestBody: 'buffered',
			fetch: wrap(async request => {
				const body = await readJsonBody(request)
				if (!body || typeof body !== 'object' || body.bundle === undefined) throw httpError(400, 'desktop bundle is required')
				return jsonResponse(await manager.start(body.bundle))
			}),
		},
		{
			path: `${DESKTOP_ROUTE}/dispose`,
			methods: ['POST'],
			requestBody: 'buffered',
			fetch: wrap(async () => jsonResponse(await manager.disposeSession())),
		},
		{
			path: `${DESKTOP_ROUTE}/pending`,
			methods: ['GET'],
			requestBody: 'buffered',
			fetch: wrap(async request => {
				const query = parseQuery(request)
				const session = query.get('session') ?? ''
				const since = Number(query.get('since') ?? '0')
				const result = await manager.pendingAbortable(session, Number.isFinite(since) ? since : 0, request.signal)
				return result === undefined ? emptyResponse(204) : jsonResponse(result)
			}),
		},
		{
			path: `${DESKTOP_ROUTE}/facts`,
			methods: ['POST'],
			requestBody: 'buffered',
			fetch: wrap(async request => {
				const body = await readJsonBody(request)
				if (!body || typeof body !== 'object') throw httpError(400, 'desktop facts are required')
				return jsonResponse(await manager.facts(String(body.session ?? ''), body.facts))
			}),
		},
		{
			path: `${DESKTOP_ROUTE}/probe`,
			methods: ['POST'],
			requestBody: 'buffered',
			fetch: wrap(async request => {
				const body = await readJsonBody(request)
				if (!body || typeof body !== 'object' || !body.session) throw httpError(400, 'desktop session is required')
				return jsonResponse(await manager.probe(String(body.session)))
			}),
		},
		{
			path: `${DESKTOP_ROUTE}/stop`,
			methods: ['POST'],
			requestBody: 'buffered',
			fetch: wrap(async request => {
				const body = await readJsonBody(request)
				if (!body || typeof body !== 'object' || !body.session) throw httpError(400, 'desktop session is required')
				return jsonResponse(await manager.stop(String(body.session), { dispose: body.dispose === true }))
			}),
		},
	]
}

export function registerBlobbyDesktop(ctx, options = {}) {
	const manager = new DesktopHelperManager(options)
	const routes = createDesktopRoutes(manager)
	ctx.inject(['connection'], scope => {
		for (const route of routes) {
			scope.effect(() => scope.connection.fetch.register({
				path: route.path,
				methods: [...route.methods],
				requestBody: route.requestBody,
				fetch: route.fetch,
			}), `vscode-pet: ${route.path}`)
		}
		scope.effect(() => () => manager.dispose(), 'vscode-pet: desktop helper')
	})
	return manager
}
