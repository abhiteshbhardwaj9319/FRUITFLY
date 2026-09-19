# FRUITFLY: skeptical assessment, 2026-09-19

**Current verdict: an engineering demonstration, not yet a demonstrated research
contribution.** The new interface is useful for explanation and inspection.
Earlier internal notes made universal novelty statements and treated a
no-input-path control as sufficient; neither claim was justified. This assessment
supersedes those internal notes.

## 1. Is a live semantic decoder an unclaimed gap?

**Not established.** Searches covered live connectome dashboards, behavioral-state
readouts, semantic readouts, OpenWorm-related interfaces and current fly simulation
repositories. I did not verify an exact duplicate of this particular presentation.
That is a bounded search result, not evidence that nobody has made one.

Relevant overlap:

- [Connectome-OS](https://github.com/ruvnet/Connectome-OS) documents live structural
  inspection, event detection, browser activity streaming and controlled
  perturbations. It does not establish the exact “GF spike → escaping” interface,
  but it contradicts the broader assertion that existing tools only dump spikes.
  Repository claims and reported benchmarks were not independently reproduced.
- [Experience-Eloq](https://github.com/marenbyte/Experience-Eloq) describes an
  interactive environment for circuit tracing, simulation and interventions.
  This is related tooling, not verified evidence of a validated behavioral decoder.
- [C. elegans Neural Codex](https://github.com/ThanuHith/c-elegans-neural-codex)
  has live visualization and a dashboard, but explicitly uses a hand-curated
  prototype/surrogate dataset. It is not an exact measured-connectome counterexample.
- A search surfaced [Flytrencha documentation](https://flytrencha.com/docs.html)
  describing named command readouts including Giant Fiber, walking, steering and
  grooming. The page could not be fully retrieved in this run. Treat this as an
  unresolved lead that must be checked before any priority claim, not a verified
  implementation.

There is also a conceptual problem: if the body controller already maps a GF spike
to an escape action, displaying that mapping is **instrumentation**, not a newly
discovered semantic representation. Predicting independently measured behavior
from activity, then validating out of sample and under intervention, would be a
substantially stronger claim. The demo correctly labels its rates and body states
as observations; it does not pretend to decode intent.

## 2. Is compositional motor learning on a connectome unclaimed?

**No exact-match priority claim established.** Reusable motor primitives and
composition are established topics. Examples include
[multiplicative compositional policies](https://arxiv.org/abs/1905.09808) and
[task-agnostic skill bases](https://arxiv.org/abs/2506.15190).
[NeuroMechFly v2](https://www.nature.com/articles/s41592-024-02497-y) includes
hierarchical control and connectome-constrained visual modeling;
[FlyGM](https://arxiv.org/abs/2602.17997) addresses connectome-structured locomotion
learning. None of those facts alone settles the exact intersection of anatomical
fly wiring, learned motor primitives, and held-out composition. They do mean that
the broad “all prior art is single-task” argument is unsafe.

A defensible experiment would train primitives separately, freeze them, evaluate
previously unseen combinations without retraining the primitives, and compare
against matched unconstrained and rewired networks. Track trajectory accuracy,
transfer, training samples and perturbation robustness. State where learning
occurs: in graph weights, the external sequencer, or a readout. An external
sequencer replaying DNp09/MDN stimuli does not show that the connectome learned a
reusable vocabulary. The new guided tour makes no such claim.

## 3. What is worth pursuing?

My recommendation is a **movement intervention benchmark**: ask whether specific
measured pathways predict the effects of previously untested perturbations better
than constrained graph controls. The explainer UI can make those experiments
inspectable, but the benchmark and predictions would carry the scientific claim.

Start with forward recruitment, MDN reversal and left/right steering. Use a fixed
stimulus schedule and paired random seeds. Compare targeted pathway lesions with
equal-budget lesions matched for degree, sign, weight and network location, plus
degree/sign/weight-aware rewired graphs with verified sensory-to-motor reachability.
Report movement, motor firing and feedback effects, including failures. Separate
“reproducible model behavior” from “validated biology.” To establish anatomy's
special value, hold gains and interfaces comparable and test across plausible
physiology assumptions rather than tuning only the intact graph.

This recommendation is a promising research question, not a claim that causal
perturbation tooling is new. Connectome-OS is already adjacent prior art.

**The proposed no-measured-path control is insufficient on its own.** Removing
input access can make almost any responsive network fail. It tests dependence on
input access, not the necessity of the real wiring versus another reachable graph.
Selecting different output neurons also changes excitability, degree, muscle
mapping and gain. Keep it as a sanity check alongside matched controls.

## 4. Whole-brain scale is feasible, but not novelty

[Shiu et al.](https://www.nature.com/articles/s41586-024-07763-9) already published
a brain-wide computational model. More directly,
[SiliconFly](https://github.com/dawsonamf/siliconfly/blob/master/WRITEUP.md) reports
a full-FlyWire Metal port of the same DesktopFly base. That is important engineering
prior art for a Windows port; it is not a reproduced performance result in this
workspace. The implementation route and remaining validation are in `DEMO_GUIDE.md`.

The [2026 Scientific Reports article](https://www.nature.com/articles/s41598-026-52140-3)
is specifically about information processing and eligibility-trace plasticity in
the optic-lobe connectome. It supports overlap with plasticity research, not an
automatic conclusion that arbitrary compositional motor learning is solved.

## Corrections to earlier project notes

- 17,224 edges / 708,689 contacts belong to the MaleCNS extraction, not both circuits.
- The 120 Hz number is a fixed feedback schedule; neuronal integration is 1 kHz.
  Neither is a measured display-frame rate or a promise about every computer.
- The sign of an unsteered yaw number should not be described as physical “left”
  without specifying the model coordinate convention.
- A biologically implausible controller achieving lifelike motion is a reason to
  require controls; it does not by itself invalidate every connectome model.
- The previous log's arithmetic “62,261 of ~15M synapses (~11%)” is wrong:
  62,261 / 15,000,000 is approximately **0.415%**, before addressing whether the
  quantities compare aggregated edges or individual contacts.
- Public repository assertions are leads/implementation evidence, not equivalent
  to independently replicated or peer-reviewed validation.

Searches cannot prove absence of prior art. Avoid “first,” “nobody has,” and
“confirmed gap” in a post or research proposal on the evidence collected here.
