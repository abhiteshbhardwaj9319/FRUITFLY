# FRUITFLY: recording and explaining the demo

## Launch

From the project root in PowerShell:

```powershell
cd desktop-fly/windows
Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm run record
```

Quit any older Desktop Fly instance from its tray icon before starting, so you do
not record two desktop flies. `npm run record` launches a transparent desktop fly
and the dashboard together. They use **one authoritative neural simulation**:
dashboard buttons control the desktop fly, and the dashboard body is a live mirror.

Use **F11** for fullscreen and **Play 48s tour** for the guided sequence.
The tour restarts the shared simulation, then demonstrates walking, left/right
input, reverse, grooming, wing posture, tap/startle, looming escape, and walking
again. Its 48 seconds are **simulation time**; check the
sim/wall ratio before recording. Approximately 1.00x means real time.
Record the application window using your usual recorder. No video is captured or
posted automatically. The amber path is drawn by the transparent overlay, so a
screen/display capture records it together with the fly and dashboard. **Trail
on/off** controls the trail in both views. `npm start` still opens the original
desktop overlay; `npm run demo` opens the standalone dashboard with its own sim.

Sound is generated live by the dashboard: leg-contact changes produce quiet step
ticks, flight adds a wing buzz, commands have short cues, and a Giant Fiber event
produces the strongest startle sound. Click any action or **Play 48s tour** once to
allow Chromium to start audio. **Sound on/off** mutes the complete sound layer.
Enable desktop/system audio in OBS or the Windows recorder; microphone-only capture
will not include it. The connected desktop fly is also slightly enlarged for the
recording mode. Neither sound nor display scale feeds back into the simulation.

Manual buttons interrupt the tour. **Release** removes external stimulation; it
does not force the network or body to stop. **Pause** freezes the simulation.
**Reset** starts a fresh stochastic trial. The top/oblique camera toggle changes
only the view. A tracking camera keeps the fly in frame; the moving grid and trail
show displacement. Trail segments include airborne travel; the ground-path metric
excludes ticks ending in flight. Distances are uncalibrated model units.

## A 30-second explanation you can say aloud

> FRUITFLY is an interactive simulation built from measured fruit-fly neural wiring.
> This version runs 668 selected brain neurons and 1,045 nerve-cord neurons. The
> desktop fly and dashboard are two views of one running simulation. I can
> stimulate named neuron populations and watch the activity propagate. Motor-neuron
> firing becomes six muscle commands for each leg, and a simplified mechanical model
> turns those commands into movement. The dashboard shows firing rates and what the
> body actually does. The wiring is measured; the physiology and body are modeled.
> It is not a whole brain, and it is not learning.

## What each action means

| Control | Input actually applied | What to watch |
|---|---|---|
| Walk | Current into FlyWire DNp09 neurons | DNp09 rate, motor outputs, body translation |
| Left input | DNp09 plus left DNa01/DNa02 stimulation | Change in motor output and signed yaw velocity |
| Right input | DNp09 plus right DNa01/DNa02 stimulation | Compare with left; direction and strength are not symmetric |
| Reverse | MDN stimulation, forward electrode removed | MDN rate and periods of negative forward velocity |
| Loom | 600 ms synthetic input into LC4/LPLC2 | Looming rates, a Giant Fiber event, then modeled escape flight |
| Groom | Current into DNg11 neurons | Grooming drive and body state |
| Wings | Current into escape-wing descending neurons | Grounded wing posture |
| Tap | Current into the selected sensory population | Startle pathway and possible GF response |
| Release | No externally injected current or loom | Ongoing circuit activity, feedback and body response |

These are **input labels, not promised outcomes**. Other neurons remain active.
The coupled model can drift, hesitate or move opposite to the nominal command.
The recording test observes backward motion during MDN stimulation; it does not
establish reliable sustained reversal of the complete coupled system. The older
isolated nerve-cord test is the evidence for sustained MDN-driven reversal.

“Moving forward/backward” comes from body displacement projected onto its heading,
smoothed over about 200 ms. “Giant Fiber spike detected” comes from the simulation's
GF latch, before that event is consumed by the body controller. The burst counter
groups GF activity separated by more than 300 ms; it is not a raw spike count.
The readout can report a GF event without claiming a takeoff during a body cooldown.

## How it works, technically

```text
Button current / synthetic looming input
                    |
          668 FlyWire LIF neurons       1 ms neural steps
                    |
    descending rates by cell type and side
                    |
       modeled cross-specimen transfer
                    |
       1,045 MaleCNS LIF neurons
                    |
          220 motor neurons
                    |
      6 commands x 6 legs = 36 numbers
                    |
    joint mechanics and ground contact  600 Hz mechanics
                    |
         body displacement and pose
                    |
        joint/load sensory feedback ----> nerve cord

Whole feedback loop: 120 Hz fixed simulation steps
Rendering: independent display refresh rate
```

An integrate-and-fire neuron accumulates input, leaks charge, emits a spike when
it crosses a threshold, and resets. Connected neurons receive modeled excitation
or inhibition. Counts of anatomical synapses inform connection strength, but they
are **not directly measured electrical conductances**. The existing brain model
also applies a gain boost to selected sensory-to-GF connections.

The fly body and neural equations come from the vendored
[desktop-fly project](https://github.com/DenisSergeevitch/desktop-fly). This change
adds the recording view, guided stimulation, observations and explanation; it
does not claim authorship of FlyWire, MaleCNS, or the underlying simulator.
The separate `flygym/` tree is **not used by this demo**.

For inspectable code, start with `desktop-fly/windows/src/demo.js`, then `sim.js`,
`signals.js`, `locomotor.js`, `legdynamics.js`, and `flymodel.js`.

## What is measured, and what is assumed?

| Component | Status |
|---|---|
| Selected neuron identities and anatomical connection counts | Dataset-derived |
| Transmitter identity/sign | Annotations/predictions plus simulator sign conventions |
| Neuron dynamics, synaptic gain, delays and baseline drive | Modeling assumptions |
| Female brain to male nerve-cord connection | Modeled transfer by cell type and side, not measured inter-specimen synapses |
| Muscle recruitment, forces and ground mechanics | Reduced model, not calibrated fly biomechanics |
| Walking leg poses | Driven by motor commands through joint mechanics |
| Escape trigger | GF event from neural simulation |
| Escape trajectory and wing animation | Procedural body behavior |
| Learning | Absent; weights remain fixed |

The guided walking assay suppresses grooming, heuristic nervous darts and
spontaneous flights to keep the walking circuit visible. GF-triggered escape
remains enabled. These choices are disclosed in the app. The original overlay
keeps its default behavior. Do not describe all visible movement as “unanimated.”

Counts verified from the local loaded data:

- FlyWire brain subset: **668 neurons, 18,968 connection records**.
- MaleCNS nerve-cord subset: **1,045 neurons, 17,224 connection records**,
  representing **708,689 anatomical contacts** in that subset.
- Combined: **1,713 neurons, 36,192 connection records**. The modeled bridge is
  additional; do not count it as measured connectivity.

## Can we use the entire fly brain?

Yes, as a larger modeling project. FlyWire's published reconstruction contains
139,255 neurons and 54.5 million synapses. Whole-brain computational work already
exists; using the full graph is not itself a new research contribution.
Sources: [FlyWire reconstruction](https://www.nature.com/articles/s41586-024-07558-y),
[Shiu et al. computational model](https://www.nature.com/articles/s41586-024-07763-9).

A particularly relevant engineering reference is
[SiliconFly](https://github.com/dawsonamf/siliconfly/blob/master/WRITEUP.md), a
whole-brain port of the same DesktopFly base. Its authors report a Metal GPU
implementation with all 139,255 neurons and about 15.09 million aggregated
connections. Those benchmarks were not reproduced here. Metal is Apple-specific;
our Windows application needs a different backend.

The concrete route for this repository is:

1. Import the complete graph and neuron annotations, preserving root IDs, release,
   thresholds, neurotransmitter policy and checksums. Distinguish the full graph
   from a graph retaining only connections above a contact threshold. Aggregate
   contacts into sparse directed edges; do not confuse 54.5M contacts with 54.5M
   independent neuron-pair connections.
2. Make a small independent CPU reference and benchmark the existing model at
   increasing sizes. Move neural stepping off the rendering thread. Evaluate a
   compiled sparse CPU engine or a Windows GPU backend; verify it against the
   reference before claiming speed or numerical agreement. Rendering can use
   sampled activity while the engine simulates all loaded neurons.
3. Preserve the body interface, but explicitly validate the descending-population
   mapping into the MaleCNS cord. A complete brain is not a complete central nervous
   system. Using female FlyWire with male MaleCNS remains a hybrid.
4. Replace ad hoc whole-network excitation with documented sensory inputs and
   calibrated operating conditions. Adding neurons does not supply their missing
   physiology, receptors, neuromodulation or plasticity rules automatically.
5. Re-run rest/loom response, motor recruitment, and body-feedback tests. Compare
   matched targeted lesions, random lesions and constrained graph shuffles across
   seeds and parameter ranges. Compare with biological measurements where possible.

This upgrade is **not implemented in the recording demo**. The existing brain
point cloud is a visualization sample, not an additional simulated population.
Do not change the headline to “whole brain” until the loaded graph inventory and
runtime checks demonstrate it.

## A defensible LinkedIn caption

> I've been building FRUITFLY: a live, inspectable simulation using selected
> fruit-fly brain and nerve-cord circuits.
>
> In this clip, I stimulate named neuron populations and watch firing activity,
> six-leg motor output, and body motion together. A looming input can recruit the
> Giant Fiber escape pathway.
>
> It runs 1,713 simulated neurons using measured connectivity from FlyWire and
> MaleCNS, building on the open-source desktop-fly simulator. The neuron physiology,
> cross-specimen interface and body are modeled. This is not a whole-brain emulation
> or a learning system.
>
> What interests me next is testing which connections matter for particular
> movements, with matched controls—not just making the animation more convincing.
>
> Code: https://github.com/abhiteshbhardwaj9319/FRUITFLY

## Questions people may ask

**“Is it alive or conscious?”** Nothing in this demonstration establishes either.
It is a numerical simulation with a visual body.

**“Did you train it?”** No. The recording uses fixed weights and externally
scheduled stimulation. A sequence of button inputs is not learned composition.

**“Is the connectome really responsible?”** Motor activity depends on the simulated
network; the existing isolated-cord tests show that cutting synaptic transmission
or silencing motor neurons abolishes recruitment. That does not prove this exact
anatomy is uniquely necessary, or that the model predicts a real fly.

**“What is your contribution?”** The inspectable recording interface, guided
stimulation and evidence-aware readout added here. Credit the datasets and
underlying simulator. Today this is an engineering/communication demonstration,
not an established new neuroscience finding.

**“What would make it research?”** A falsifiable question, matched controls,
multi-seed results, held-out predictions, and preferably experimental validation.
See `RESEARCH_ASSESSMENT.md`.

## Verification

`npm test` runs the existing simulation, behavior and 18 locomotor checks plus
the guided-tour test. The latter checks finite motion, backward episodes, a GF
event, unchanged weights and manual interruption. `test/demo-ui-smoke.cjs` tests
the real Electron renderer and writes screenshots/results into ignored
`desktop-fly/windows/artifacts/`. It covers data loading, movement, pause, tour,
manual override, looming, reset, camera view and compact layout.
