# FRUITFLY

FRUITFLY is an interactive desktop simulation driven by measured fruit-fly
connectome data. A transparent fly walks across Windows while a dashboard shows
the neural activity, leg motor outputs, body state, and path in real time.

The desktop fly and dashboard are two views of **one running simulation**. The
overlay owns the neural and body state. Dashboard controls stimulate named neuron
populations through Electron IPC, and the overlay sends the resulting telemetry
back to the dashboard.

![Status: experimental](https://img.shields.io/badge/status-experimental-e6b071)
![Platform: Windows](https://img.shields.io/badge/platform-Windows-4b9cd3)

## What is actually simulated

- **668 selected FlyWire neurons** from the female adult brain, including visual,
  steering, and escape circuitry.
- **1,045 selected MaleCNS neurons** from the nerve cord, including 220 motor
  neurons used for locomotion.
- **36,192 retained connection records** across both measured subgraphs.
- A fixed 120 Hz sensory, neural, motor, and mechanical feedback loop.
- Six leg controllers receiving six antagonist motor commands each.

This is connectome-based simulation, not a living brain and not a complete brain.
Neuron identities and anatomical contact counts come from published datasets.
Neuron physiology, the bridge between the female FlyWire brain and male CNS,
muscle recruitment, and body mechanics are models. The fly does not learn; its
weights remain fixed.

## Run the connected demo on Windows

Requirements: Windows 10/11, Node.js 20 or newer, and npm.

```powershell
git clone https://github.com/abhiteshbhardwaj9319/FRUITFLY.git
cd FRUITFLY/desktop-fly/windows
npm install
Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm run record
```

Quit an older Desktop Fly tray instance first. `npm run record` opens the
transparent desktop fly and its connected dashboard. Click **Play 48s tour** for
walking, steering, reverse, grooming, wing posture, tap/startle, looming escape,
live sound, and a movement trail. Use **F11** for fullscreen.

Other modes:

```powershell
npm start       # desktop overlay only
npm run demo    # standalone dashboard
npm test        # neural, behavioral, locomotor, and guided-demo checks
```

See [DEMO_GUIDE.md](DEMO_GUIDE.md) for the controls, architecture, claims, and a
short spoken explanation.

## Data flow

```text
dashboard control
       |
       v
named neural stimulation
       |
       v
668-neuron FlyWire subgraph
       |
       v
modeled cell-type/side bridge
       |
       v
1,045-neuron MaleCNS subgraph
       |
       v
220 motor neurons -> 36 leg commands
       |
       v
reduced body mechanics -> movement + sensory feedback
       |
       +-------------------------------> MaleCNS subgraph

overlay telemetry -> dashboard mirror and semantic readout
```

## Evidence and limitations

The test suite verifies circuit loading, neural-to-body behavior, locomotor paths,
and the guided demo. The connected Electron smoke test verifies that one overlay
simulation drives both visible flies and that dashboard commands, Giant Fiber
events, reset, and trails cross the IPC link.

Read [desktop-fly/data/LOCOMOTOR_PROVENANCE.md](desktop-fly/data/LOCOMOTOR_PROVENANCE.md)
for extraction provenance and modeling limits. The separate `flygym/` directory
is included as a research reference and is not used by this Electron demo.

## Credits and licenses

The desktop simulator derives from
[Denis Shiryaev's desktop-fly](https://github.com/DenisSergeevitch/desktop-fly),
whose source is MIT licensed. FlyWire-derived data is CC BY-NC 4.0; MaleCNS-derived
data is CC BY 4.0. See [DATA_LICENSE.md](desktop-fly/data/DATA_LICENSE.md) for
attribution and citations.

The vendored `flygym/` project is from EPFL's Ramdya Lab and is licensed under
Apache 2.0. Its own license and documentation remain in that directory.
