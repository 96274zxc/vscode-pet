# Blobby — VS Code Pet for DSH

**English** | [简体中文](README.zh.md)

Blobby is the official VS Code chat pet, ported to the DeepSeek Harness Web composer. It uses the
official sprite sheets, accessories, frame timings, physics and interaction rules from
`microsoft/vscode`, not a look-alike. On Windows it can also step out of the DSH window and live on
the desktop while DSH is minimized.

![Blobby state matrix](https://raw.githubusercontent.com/96274zxc/vscode-pet/main/docs/states.png)

## Attribution

This is an independent DSH port, not a Microsoft product. All Blobby sprite art, accessory atlases,
animation timing, physics constants, achievement catalog, color palette and jump-game rules are
derived from the official VS Code implementation and are used under the MIT license.

- Upstream documentation: https://code.visualstudio.com/docs/agents/reference/chat-pet
- Upstream sprite assets and runtime:
  https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/chat/browser/widget/media/chatPet
- Pinned upstream commit: `ce233327f26ef7791b7fff0143c24e81a8126bd2`
- The plugin icon is a composite of the official idle body and wizard-hat atlas with the official
  thinking bubble, recolored to a white body. The master is 144×144 (4× the 36px plugin-card
  artwork); `icons/icon-{144,72,48,36,30}.png` keeps native variants, and `icon.svg` embeds the
  144px master.
- See [NOTICE.md](NOTICE.md) for the complete source-file list and Microsoft's MIT license text.

Thanks to the VS Code team and the original Blobby authors for the character and artwork.

## What it does

- Sits on top of the composer and reacts to chat: pointer gaze, typing, thinking, clapping when the
  agent needs input, sleeping after 20 seconds, and the red-button celebration when a turn finishes.
- Drag it, flick it, throw it with `Shift+←/→`, hop with `←/→`, catch it while it falls, and watch
  the despawn/respawn portal sequence. While the DSH window is visible the composer card is its only
  perch: it spawns and respawns above that card, follows it when the window or input grows/shrinks,
  bounces off the side walls, and its respawn drop is capped above the composer instead of falling
  from the top of the chat. On the desktop the taskbar (or the screen bottom while the taskbar is
  auto-hidden) is the floor.
- **Desktop display (Windows desktop app only)**: the pet's context menu gains a checkable
  **Show on Desktop** item, with **Smart Hide** directly below it once enabled. While DSH is active
  the native helper waits prepared, so as soon as DSH is minimized **or loses focus to another
  window** Blobby moves to the desktop through the official respawn portal and lands above the taskbar
  at the bottom-right; focusing DSH again plays the portal/fall return inside the window. Double-click
  the desktop pet to bring the DSH window back. The desktop right-click menu mirrors the DSH menu:
  Hats, Change Color and Play Jump Game restore DSH and open the existing panels/game, while Go on the
  Run, size controls, Show on Desktop and Smart Hide work on the desktop itself. Throws always land
  on the taskbar/screen floor and never trigger a fall respawn. The helper window ends exactly at the
  taskbar and only the pet/menu accept clicks, so the taskbar and windows underneath stay usable; the
  menu is positioned before it is shown and keeps its size rows open for repeated clicks, its size
  labels align to the outer edges of their halves like the in-window menu, and it follows the DSH
  light/dark palette and current UI language. While the menu is open the helper locks a single window
  rect that already covers the pet at the maximum scale and the menu, so growing/shrinking never
  moves or resizes the layered window and the menu cannot jitter. The helper renders on the
  composition loop with subpixel
  position compensation and no per-frame topmost churn, so its motion matches the in-window pet
  instead of sliding on the window's pixel grid. It also adopts the exact grab cursor used by DSH by
  capturing the rendered pet's cursor at runtime (no separate cursor asset), together with the same
  drag-resistance wobble and the crossed-out (X) eyes while the pet is held (the same eye-overlay
  geometry as the in-window CSS, baked into the frames at the matching size). Chat reactions stay in
  sync on the desktop (the thinking bubble appears
  while a turn is running). The desktop state machine also mirrors the window: typing while the
  composer has input, waking when facts wake it, **buttonPress** when a request completes (silent
  when cancelled), dizzy after quick cursor wiggles beside the pet (recorded from the idle facing
  changes within a 240px radius, first direction not counted, 8 changes/600ms like the window),
  reduced-motion variants, and eyes during the
  typing/buttonPress/love poses. The periodic blink is implemented as a tiny transparent eye
  overlay (body-colored pupil covers + the 2px clipped pupil lines) shown for 260ms at 1.4–3.4s
  intervals, matching the window's ChatPetBlinkController and disabled under reduced motion. The pupil
  gaze is mirrored with nine pre-baked eye overlays (the eye box covered with the body color and the
  pupil shifted by up to 2 display px), selected from the cursor direction for the tracking poses
  and skipped while blinking/dragging. The overlays use each animation frame's source index for the
  bobbed-eye offset (the payload carries `frameIndices`, e.g. idle [0,20]), and when the pet faces
  left the horizontal gaze component is flipped in the overlay source to cancel the pet image's
  mirror, so the pupil still moves toward the screen-space cursor like the window's unmirrored eye
  overlay. The mouse-bounce counter is an accent pill at the pet's top-right (5s or until the next
  throw) and 20+ bounces spawn the same 24-particle confetti burst (window temporarily grows to fit
  it; reduced motion skips the confetti). Remaining known differences: the desktop never falls to a
  respawn death (taskbar floor), the jump game opens in DSH, the DSH port does not track
  achievements, and the VS Code-only painting/searching states and keyboard hop do not apply. The facing follows the cursor only in the idle pose; sleeping, waking,
  typing, rendering, clapping and reaction poses keep the direction they had when they started,
  matching the window's ChatPetFacingController.
  **Smart Hide** keeps the pet on the desktop only instead of above other applications. The native
  helper exits with DSH; on non-Windows the menu items are absent and the host refuses to start the
  helper, and the plain Web GUI hides the items as well.
- Right-click for **Hats**, **Play Jump Game**, **Go on the Run / Come Back**, inline
  **− Shrink / Grow +** and **Reset Size** controls, and **Change Color**.
- 13 hats from the official catalog plus the **Color Customization** custom-color entry, laid out with the
  DSH-only **No Hat** option as a 3-column, 15-card grid. The counter keeps VS Code's "14 of 14
  unlocked" wording; only the 13 hats and Color Customization are counted. The DSH port does not track
  achievements, so every hat is unlocked by default and the initial look is **Insiders + Cowboy
  Hat**; unlock hints, rewards and "new" badges are not shown. `/blobby` still unlocks **Color
  Customization** for the solid and custom colors.
- Click reactions include a rare (~1%) **yapping** fall: Blobby tips over and opens its mouth; the
  light gap is the official sprite's open mouth, not missing artwork.
- Stable/Insiders colors plus the eight official solid presets and a custom hex color (unlocked by
  `/blobby`). Hats and colors are applied immediately and persist.
- Blobby's jump game: Space to charge, release to jump, Left/Right to aim or hop, Escape to exit,
  with moving/crumbling platforms, wall bank shots, hop score and a persisted high score.
- Reduced-motion support, keyboard access, and a live status region for screen readers.

## Performance and memory

- The desktop helper loads animation frames lazily: the prepared helper decodes only the idle,
  blink and gaze overlays (7 of 140 frames, ~0.26 MB instead of 6.26 MB in the reference bundle),
  and every other state/effect decodes its PNGs on first use. The same run dropped the prepared
  helper from ~117.7 MB to ~103.2 MB working set (~119.5 MB to ~99.7 MB private).
- Prepared helpers are reused for the instant desktop start while DSH is focused; a helper whose
  client stops sending the 250ms facts heartbeat is reclaimed after five minutes, so a crashed or
  reloaded page cannot leave a hidden PowerShell/WPF process and its temp frames behind. The host
  serializes `prepare`/`start`/`stop`, the client bounds `/start` at 15 seconds, and the in-window
  pet is suspended only after the helper reports the show, so a stalled warmup or prepare can no
  longer leave Blobby invisible in both places; a start invalidated by DSH regaining focus is
  stopped instead of shown.
- Client images load on demand: only the worn hat is prefetched, the hats-panel previews load their
  own accessory images and release the non-worn ones when the panel closes, and the colored-sprite
  cache is capped at 1 MP with LRU eviction.
- The desktop theme is cached (re-checked at most every two seconds) and the menu labels are cached
  per locale revision; the 250ms facts message only carries `theme`/`labels` when they changed, and
  the helper keeps the last values otherwise.
- Desktop frame baking reuses one canvas per batch (the PNG payload is byte-identical), the jump
  game prunes platforms/walls below the camera, and widget/slot/bridge teardown releases timers,
  observers, the idle preload, the debug API and the frame caches.
- Diagnostics: with `?blobbyDebug=1` (or `localStorage["dsh.vscode-pet.debug"]="1"`),
  `window.__dshBlobby.memory()` reports the JS heap, image/colored cache sizes, desktop frame bytes
  and timer/listener/DOM counts; the helper's `status.json` reports `frames: {loaded,total,bytes}`.
- 1.2.17 handoff fixes: blur/visibility start the helper in the event itself (a 250ms timer in a
  minimized renderer can be throttled/frozen); the facts heartbeat's response carries the helper's
  `prepared` flag so the client clears `active` even when the hidden renderer's long-poll stalls (the
  `/pending` wait is also bounded and retried); and the helper reports `stopReason`,
  `dshWindow`, `dshIconic`, `dshForeground`, `dshWasIconic` in `status.json` while the client's
  snapshot exposes `starting`, `stopping`, `lastHiddenReason`, so a hide can be attributed to the
  focus return, the window-restored check or a client stop.
- The remaining helper footprint is the PowerShell 5.1 + .NET/WPF runtime itself; removing it would
  need a different helper host and is out of scope for the current implementation.

## Install in a DSH profile

From the public npm package (after release):

```bash
dsh plugin --profile web add vscode-pet
```

Source install from the public repository (always available):

```bash
dsh plugin --profile web add github:96274zxc/vscode-pet
```

For the Electron desktop app, use **Plugins → Add plugin → `vscode-pet`**, or the same CLI with
`--profile desktop` where the CLI is allowed to manage that profile.

For development from this checkout, link the package into a profile:

```powershell
$node = "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$pnpm = "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs"
$profile = "$env:USERPROFILE\.dsh\profiles\desktop"
& $node $pnpm --dir $profile add "vscode-pet@link:C:/path/to/vscode-pet"
```

Then add `vscode-pet` to the profile's `dsh.profile.bundles` (or enable it in Plugins). Reload the
page; if the Electron app does not recompose the loader live, restart it. To uninstall, remove the
dependency and the bundle selection.

## Build and test

```powershell
node scripts/fetch-assets.mjs   # re-download the pinned VS Code assets
node scripts/build.mjs          # validate dimensions and build client.js
node --test test/*.test.mjs
```

`client.js` is generated. Edit files under `src/` and rebuild; do not edit `client.js` directly.
Assets are embedded as PNG data URLs so the plugin works under both `http://` and the desktop
`dsh-app://` scheme without cross-origin canvas issues. The test suite also compiles and runs the
Windows desktop helper's deterministic self-test (`desktop/blobby-desktop.ps1 -SelfTest`); the
helper is a local PowerShell/.NET WPF process that the host half starts only in the Windows desktop
app.

## Controls

| Input | Action |
| --- | --- |
| Click / Enter / Space | Random reaction; wakes Blobby; opens the hats panel while the star is visible |
| `←` / `→` | Hop along the composer |
| `Shift+←` / `Shift+→` | Throw toward a wall |
| Right-click / `Shift+F10` / ContextMenu | Context menu |
| Drag | Move Blobby; release with speed to throw |
| Bounce while falling / Enter / Space | Bounce |
| `/blobby` | Unlock Color Customization and open the color tab |
| `/vscode-pet` | Show/hide Blobby (keeps the plugin installed) |
| Right-click → **Show on Desktop** | Windows desktop app only: move Blobby to the desktop while DSH is minimized or unfocused (✓ when enabled) |
| Right-click → **Smart Hide** | Windows desktop app only: show the desktop pet on the desktop only, never above other apps |
| Alt+Tab / click another window / minimize | Windows desktop app only: move Blobby to the desktop above the other window |
| Focus the DSH window | Windows desktop app only: return Blobby into the DSH window |
| Double-click the desktop pet | Bring the DSH window back |

## Compatibility

- Target: DSH `>=0.2.1-rc.1` Web and Desktop profiles.
- The desktop display is Windows desktop only. It uses `connection`-authenticated host routes on the
  loopback server plus a local PowerShell/.NET WPF helper; the plain Web GUI hides the menu items and
  non-Windows hosts return `501` for desktop-start requests. While the display is enabled the helper
  stays prepared in the background for an immediate handoff and exits when DSH exits. No DSH source is
  modified and no model tools or routes outside `/api/blobby/desktop/*` are added.
- Preferences, hats, colors and the jump-game high score stay in
  `localStorage['dsh.vscode-pet.prefs.v1']` on the local device. Desktop frames and settings are
  generated on the client; the helper only receives PNG frames, labels and local geometry.

## Source and license

Sprite art, animation timing and interaction logic are derived from
[Microsoft VS Code](https://github.com/microsoft/vscode) commit
`ce233327f26ef7791b7fff0143c24e81a8126bd2`, MIT licensed. See [NOTICE.md](NOTICE.md) for the exact
paths. The plugin code is MIT licensed (see `LICENSE`).

## Verification

The plugin was exercised in a temporary DSH web profile with headless Chrome: idle/typing/thinking/
clapping/sleep/reactions, drag and throw, despawn/respawn, the context menu, both customization
tabs, hat and color selection, Color Customization unlock, and the jump game. `docs/states.png` is the
state matrix and `docs/hats.png` / `docs/color.png` are the customization panels from that
run.

It was then verified in the real Electron desktop profile (not headless): composer-card landings,
default spawn, maximize/restore repositioning, rotated wall bounces, capped respawn, and resizing
while the pet is airborne. The fall and respawn paths were also compared frame by frame against
VS Code 1.144's Blobby on the same machine.

Desktop display was verified in the same Windows Electron profile: the trailing check mark and the
conditional Smart Hide item, the portal/respawn handoff when minimizing and restoring, landing on
the taskbar, throwing without a fall respawn, Smart Hide against a foreground app, double-click
restore, the desktop Hats command opening the existing panel, and the helper exiting when DSH's
host closes its stdin. After the handoff optimizations it was re-checked for the prepared helper
(desktop portal visible within about half a second of clicking away), focus-based switching
(Alt+Tab/click-away), the ~60 fps composition loop during throws, subpixel-exact pet placement
(`appliedScreenX` equal to the physics position instead of the window's rounded pixel), the exact
DSH grab cursor captured at runtime (byte-identical icon/hotspot), the drag resistance wobble, the
thinking bubble while a turn runs, a taskbar that stays clickable under the pet window, and a desktop
context menu that appears at its final position without a flash.
The helper's geometry, physics and state-machine self-test runs in the test suite.



