import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const root = path.resolve(import.meta.dirname, '..')

test('Windows desktop helper self-test passes', { skip: process.platform !== 'win32', timeout: 180000 }, async () => {
	const script = path.join(root, 'desktop', 'blobby-desktop.ps1')
	const { stdout } = await execFileAsync('powershell.exe', [
		'-NoProfile',
		'-STA',
		'-NonInteractive',
		'-ExecutionPolicy',
		'Bypass',
		'-File',
		script,
		'-SelfTest',
	], {
		timeout: 180000,
		windowsHide: true,
		maxBuffer: 1024 * 1024,
	})
	const lines = stdout.trim().split(/\r?\n/).filter(Boolean)
	const result = JSON.parse(lines[lines.length - 1])
	assert.equal(result.ok, true, JSON.stringify(result.failures))
	assert.deepEqual(result.failures, [])
	for (const check of ['visible-taskbar-floor', 'auto-hide-floor', 'gravity-accelerates', 'idle-sleeps', 'wake-transient']) {
		assert.ok(result.checks.includes(check), check)
	}
})
