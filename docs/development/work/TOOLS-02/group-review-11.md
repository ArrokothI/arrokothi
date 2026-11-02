# Group review 11 — recovery-family cap stop

2026-10-29, implementing Codex GPT-6 session, at checked revision `5bea95d7`.
Source pin: `66bc041175e6fc191c2e7cf88de198111e7d97c9`. Read the whole
ablations-06 runner and its complete validation-09/37 record (control, H1–H22,
22/22 summary). These are historical observations, not current kill credit.

**Observed lower bound: five new-test groups and 61 mutation adoptions.**
Owner choice 08 requires an immediate stop because 61 exceeds 60. The current
origin is 696, `artifact-89a6c743f27e1e2697eab84d`, still under reconciliation.
No later artifact is disposed; the scheduled origin-731 checkpoint is not complete.

## Six confirmed additions

The bounded search covered both registries' production edits, the complete-decision
oracle/checks and scenarios, and the current History builders, host-member sites
and maintained leaves below. All leaf pointers resolve to passed leaves in the prior
repository catalog; no product/test bytes changed in this reading. The proposed
adoptions have not been built or executed.

| Member | Current live counterexample | Existing passing leaf |
|---|---|---|
| H1 | Hold History must not acquire resultingEpoch from Object.prototype. The current fixed-field builder remains; restoring the optional read admits ambient data. | recovery-ambient: `protocol-enter / data`, with exact History record assertions |
| H10 | A takeover-clearing record must own resultingEpoch equal to the replacement epoch. The current builder still owns that field. | recovery-history: `b) protocol hold via takeover: entered, then cleared_by_takeover with resultingEpoch` |
| H11 | Declaration History claims control authority. This differs from B9's Outcome-ending attempt_submission authority. | history-attribution: `entered, protocol entered, and cleared_by_takeover are control-origin` |
| H12 | The minted takeover receipt retains the exact Execution ID in state and answer. Its old span now also appears in initial dispatch, so scope the edit to `writerEpoch = currentEpoch + 1`. Z11 changes only the answer's receipt and does not replace this member. | exact-coordinates: `DEC-4 exact retained coordinates: "actor-é" complete` |
| H15 | Ambient Object.prototype.controlScopes cannot authorize a visibility-only caller. The hostMember call is still current. | host-members: `residue Object.prototype.controlScopes gives a visibility-only caller no takeover` |
| H16 | A Driver with no safety method cannot be answered by an ambient inherited method installed during request capture. The hostMember/ReflectApply site is still current. | host-members: `a Driver without the method is refused even when the request's getter installs an inherited one` |

No current registry mutates these six production decisions. The complete-decision
oracle does not independently prescribe the H1/H10/H11 History fields; its normal
caller/Driver setup does not create H15/H16's inherited host-member input. H12's
long/non-ASCII coordinate is unchanged in the sweep's short-ASCII setup. The ordinary
behavior leaves provide the new cases' targets, but do not alone close family routes
under design 01 §5.4.

[Current anchor observations](family-applicability-11.json) record exact target spans
and unique counts. H12's original two matches are disambiguated, not treated as a
superseded obligation. These six bring 55 to 61; the stop does not depend on how
any still-unresolved member is eventually classified or grouped.

## Remaining routes and each moved site encountered

These are readings for resumption, not additional completed mappings or adoption
counts. In particular, the lower bound does not assume unresolved members are retired.

| Member | Current location / existing evidence to reconcile |
|---|---|
| H2 | applyControlCommit was removed. Its planned History read is now `const stored = plan.history` in state.ts #applyControl, before the version/write suffix. An optional resultingEpoch read here is a live relocation candidate; reconcile its overlap with H1 and the state-owner/ambient enforcement before counting or binding it. |
| H3 | Holds/history writes moved into #applyControl. The current control-commits negative control 27 explicitly swaps them, and the complete-decision fault path checks atomic refusal/decision behavior. Final family route remains to bind. |
| H4 | Protocol-report's direct mutable-record write is gone. Coordinator prebuilds ControlPlan and hands it to the owner; the owner has a fixed History-before-holds suffix. Reconcile against state-owner.write-outside-apply, the control-commits writer controls and complete-decision checks; do not reintroduce a setter on a reader just to get a TypeError. |
| H5 | Recovery's direct mutable-record write is likewise replaced by a prebuilt ControlPlan plus #applyControl. The wrong late-construction behavior must be located at the owner boundary, with the same protections as H4. |
| H6 | Takeover writes moved to #applyTakeover; History is prebuilt as plan.cleared. TAKEOVER_APPLY independently lists History before epoch/grant/Activation writes, so reconcile the live ordering obligation there. |
| H7 | Recovery now prebuilds `answer`, creates a ControlPlan, applies it and returns the answer. Its old helper spelling is absent. Final binding must use the current prebuild/owner handoff and fault oracle, not claim anchor absence removes the prebuild requirement. |
| H8 | The prebuilt answer still projects holdsOf(commit). The current oracle.recoveryAnswer control changes the returned hold answer and independently compares it with the retained state. |
| H9 | The clearing-record append moved to #applyTakeover. TAKEOVER_APPLY includes the exact conditional append; no retirement on spelling alone. |
| H13 | The receipt append moved to #applyTakeover. state-owner.dropped-coupled-field already contains the exact takeover receipt-drop edit, alongside TAKEOVER_APPLY's explicit step. |
| H14 | Acceptance-position advancement moved to #applyTakeover. takeoverAnswer independently requires exactly one advance, and TAKEOVER_APPLY lists the current assignment. |

H17–H22 were read as part of the whole artifact and sealed output, but their current
routes are not reconciled at this stop. No family closure, new test, product defect,
regeneration, final C/H or CI dispatch is claimed. Continue this origin after an
owner disposition, then ablations-07 and the rest of the source order. Do not treat
this stop record as permission to bypass the cap.
