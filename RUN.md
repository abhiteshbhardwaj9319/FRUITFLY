# Running the fly (Windows)

## Recording demo (new)

For the connected desktop fly + dashboard, live neural readouts, amber movement
trail and 48-second guided tour, run `npm run record` from `desktop-fly/windows/`
after unsetting `ELECTRON_RUN_AS_NODE` as below. Quit an older tray instance first.
Press **F11** for fullscreen. `npm run demo` remains a standalone dashboard.
See [DEMO_GUIDE.md](DEMO_GUIDE.md) for the recording script, explanations and
whole-brain roadmap. This demo still uses extracted circuits, not a whole brain.

The fly runs as a desktop overlay, **not** in Chrome — the existing Electron port
already carries the full neural stack, so no browser port was needed.

## Start it

```powershell
cd desktop-fly/windows
Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm start
```

**The `Remove-Item` line is required.** See *Gotcha* below.

Confirm the brain loaded — this appears in the console:

```
[overlay] Initialized WebGL renderer and 668 FlyWire neurons;
          1045 MaleCNS neurons; feedback clock 120 Hz
```

Quit from the 🪰 tray icon (bottom-right, near the clock).

## What is actually connected

Both circuits, live, driving the body:

| Layer | Neurons | Role |
|---|---|---|
| FlyWire (female brain) | 668 | vision, escape, steering commands |
| MaleCNS (male VNC) | 1,045 | locomotion: 220 motor neurons → legs |

Loop runs at **120 Hz** (neurons at 1 kHz, mechanics at 600 Hz substeps).
The legs are driven by real motor-neuron activity, not scripted animation.

## Things to try

| Action | What fires |
|---|---|
| Move the cursor at it, fast | LC4/LPLC2 looming detectors → **DNp01 Giant Fiber** → escape takeoff |
| Click near it | substrate tap → wind/JO sensory → GF |
| Leave it alone | DNp09 walk drive vs. idle threshold |
| Open a window near it | window loom → same escape pathway |
| Tray → **Escape Test (loom)** | injects a looming stimulus directly |
| Tray → **Show Brain** | live brain window; **click any region to stimulate ~60 nearby neurons** |
| Tray → **Add Fly** | more flies (only fly #1 has a brain) |

The brain window is the interesting one: hovering pauses rotation, clicking
"optogenetically" stimulates real neurons for 400 ms and you watch the spikes
propagate through the extracted graph.

## Gotcha — `ELECTRON_RUN_AS_NODE`

This environment sets `ELECTRON_RUN_AS_NODE=1`, which forces Electron to run as
plain Node: no GUI, and every Electron API (`app`, `BrowserWindow`) is `undefined`.

Symptom:
```
TypeError: Cannot read properties of undefined (reading 'setAppUserModelId')
```

That error looks like an import bug and is not one. **Unset the variable.**
Nothing in the source needs changing.

## One change was required

`package.json` — Electron `^32.2.0` → `^38.8.6`.

Electron 32 ships Node 20, whose ESM loader crashes on Electron's CommonJS module
(`TypeError: Cannot read properties of undefined (reading 'exports')`). Electron 38
ships Node 22 and loads it fine.

No application or neural code was modified. All three suites still pass
(`npm test`): 18/18 locomotor, plus sim and behavior.
