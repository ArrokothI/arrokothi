# Implementation report — K1.2, round 13

## Identity

- Packet/parent: K1.2 / K1; [contract](contract.md) revision 8 (DEC-2 per-coordinate rule, C3/C8/C10 coverage rows naming `outcome-partial-claim.test.ts`, distinguishing-power 30 → 32 with B15/B16, new K1.2-OPEN-5 for O6; no criterion added, relaxed, or reworded). Governing 006/007/008/012 and B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Author: Muse Spark implementer session (`muse-spark-1.3-contributor`), 2026-09-25/26 UTC. This is not a reviewer session, not an acceptance, and not an integration or release.
- State: **WAITING_FOR_REVIEW**. This round is the semantic reconstruction of the Outcome-refusal classification subsystem required by review 11. Independent review decides acceptance.
- Prerequisites unchanged: K1.1 accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All precede B. No successor release. No K1.3 release.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Previous payload C10: `b1c2e3bdad1ab9352e8a95307593cce654bc3e3c`. Previous candidate H12: `9655d12cf583967eff08582d175ed8beb5e2506e`. Review-11 record head: `04df5ed67ec4c38ebc3b0515b487d5f7c787cb73` (review 11, CHANGES_REQUESTED; branch verified there before editing, no drift).
- New payload C11: `ad219a5cf8940d0379bda9b16d693c901931a4b5` (`K1.2 C11: per-coordinate stale-before-authority with total classification and distinguishing matrix`).
- Candidate H13: the commit containing this report; the external handoff supplies its full SHA and advertised remote identity after non-force push.
- H13 contains only this `docs/development/work/K1.2/implementation-13.md`, the `docs/development/work/K1.2/validation-13/` raw-evidence attachments (`01–13` plus `MANIFEST.txt`), and the K1.2 status-row update in `docs/development/007-work-packets.md`. H13 introduces no scripts, fixtures, configuration, contract, canonical, test, threshold, or other payload changes.
- Push pending at report creation; it cannot certify its own future push.
- Owner supplemental decision: `decision-01.md` (carrier extension, 2026-09-25) only. No new owner decision was sought; O6 is recorded as K1.2-OPEN-5 awaiting one.

## Changes and coverage

### Correction delta `04df5ed..C11` (review-11 head to new payload): exactly 7 payload paths

| Path | Change |
|---|---|
| `packages/kernel/src/outcome.ts` | `OutcomeCapture` gains `epochForCurrency`/`baseForCurrency` (each the well-formed value or `null`); both `captureOutcome` returns populate them; `claim` (both-well-formed, for the accepted-content identity) unchanged. |
| `packages/kernel/src/coordinator.ts` | `submitOutcome` currency step checks each well-formed coordinate independently before authority (`epochForCurrency !== null && !== current` → stale; then `baseForCurrency !== null && !== pinned` → stale). Stale reasons name only the stale coordinate; no content diagnostic. Authority/content/capacity/accept order otherwise unchanged. |
| `packages/kernel/tests/outcome-partial-claim.test.ts` | NEW: 56 table-driven cases over the total matrix (B/C/D/A/E/F/G below). |
| `docs/development/work/K1.2/ablations.mjs` | A3 span updated to the per-coordinate epoch check; B15 (skip-all-currency, the R11 defective family) and B16 (epoch-only partial fix) added. |
| `docs/development/work/K1.2/contract.md` | DEC-2 per-coordinate rule; C3/C8/C10 rows naming the new matrix; distinguishing-power 30 → 32; new K1.2-OPEN-5 (O6). |
| `mental-model/mechanisms/execution-cycle.md` | `#outcome-acceptance` step 3 gains the per-coordinate sentence (normative owner; no new architecture, only the explicit consequence of the existing currency-before-authority + authority-before-content order under R11+R9). |
| `docs/development/002-implemented-kernel-baseline.md` | `#outcome-acceptance-api` records the per-coordinate representation and order, pointing at the canonical owner. |

`packages/kernel/src/coordinator.ts` is otherwise byte-stable outside the currency block and its comment; no replay/terminal/authority/content/commit logic moved. The prior review-10 "preserve the C9 shape" instruction is superseded here by review-11's explicit 006 reconstruction requirement and its finding that the atomic-`claim` structure made the required classification impossible; the preserved part is the *order* (scope → replay/conflict → terminal → activation → per-coordinate currency → authority → content → commit), not the atomic nullable.

### Total Outcome refusal-classification table (compact; derived from canonical order before code)

Precedence (first match wins; every refusal is whole, recorded, leaves the exchange open unless noted):

0. **Scope** — caller cannot reach the Execution → `unknown_destination`, position 0, `executionId: null`, zero reads past `executionId`, nothing recorded on the hidden Execution. Hidden ≡ missing.
1. **Replay/conflict** (no grant needed) — `activationId` equals a retained accepted ID and captured identity equals → replay same receipt/decision, no mutation. Same ID but uncapturable or different content (incl. changed epoch, partial/malformed claim) → `duplicate_conflict`. Precedes terminal/currency/authority/content, including after resolution, next exchange, and terminal.
2. **Terminal** — execution `COMPLETED`/`FAILED` and not replay/conflict → `terminal_destination`. Precedes activation-equality, currency, authority, content. (O6: malformed/non-text `activationId` is refused as `malformed_envelope` *before* the replay lookup and terminal check in this binding; that precedence is pinned in tests but recorded as K1.2-OPEN-5, not claimed as canonical.)
3. **Activation** — no unresolved exchange, or well-formed `activationId` ≠ open exchange → `stale_exchange` (`not the unresolved exchange`). Whatever authority/content; no content diagnostic.
4. **Currency per-coordinate** — well-formed `writerEpoch` (safe integer ≥ 1) ≠ current epoch → `stale_exchange` (superseded if below, not-yet-issued if above). Else well-formed `baseProgressRevision` (safe integer ≥ 0) ≠ pinned base → `stale_exchange` (`does not match the revision … pinned at`). Whatever grant (current/retired/forged/absent) and whatever content (valid, deep/duplicate/surrogate/unknown/effects/over-capacity/await, or a missing/malformed other half); no content diagnostic produced, returned, or retained. A missing/malformed coordinate alone never establishes staleness. Well-formedness is `acceptCount` (epoch ≥ 1, base ≥ 0); `-1`, `0`-epoch, fractional, string, missing, non-number are malformed, not well-formed-stale.
5. **Authority** — `submission !== current grant` by reference identity → `unauthorized_submission` (`presents no submission authority for the current attempt`). Only when no well-formed coordinate showed non-current. No content diagnostic (claim, capacity, deep/dup/surrogate, effects, unknown fields) in returned or retained reason. Zero accepted-state mutation beyond the recorded refusal.
6. **Content** (entitled only) — over-capacity → `capacity_exhausted`; else `outcome === null` (any malformed claim part, missing/invalid progress/emissions/effects/next/unknown fields, boundary violations) → `malformed_envelope` naming all issues together. Whole refusal; exchange open for correction.
7. **Accept** — atomic commit (whole-batch ack, progress base+1, Emissions, typed result, B-5 dispositions, resolve exchange, receipt).

Equivalence highlights: stale-epoch + malformed-base (any grant, any content) → stale via epoch; future-epoch + malformed-base → stale (not-yet-issued); malformed-epoch + stale-base → stale via base; current + malformed (grant-less) → unauthorized with no claim disclosure (Case B preserved); current + malformed (entitled) → malformed naming claim + content defects (Case C preserved); both-malformed (grant-less) → unauthorized, (entitled) → malformed; wrong-activation + partial → stale (activation); terminal + fresh partial → terminal (or conflict under an accepted ID); outsider + partial → unknown_destination.

### Selected 012 methods; material exclusions and why

- **Normative decisions** — primary. Derived the table from `execution-cycle.md#outcome-acceptance` step 3 + rationale, DEC-2/DEC-20, BASELINE, contract C2/C3/C8/C10, decision-01, and reviews 09–11 *before* editing; three independent parallel passes (normative-only, implementation-audit, adversarial-plan) reconciled before synthesis; subagent agreement not used as acceptance.
- **Deterministic execution** — primary. New 56-case matrix plus retained Case B/C/D, R11 probe rerun unchanged, packet + reviewer ablations, race/order probes. Every refusal asserts classification, permitted/forbidden diagnostics (returned + retained), frozen retained-equals-returned, whole-refusal state equality, and still-answerable exchange; nondisclosure arms assert hidden≡missing.
- **Race and fault** — narrowly. Reused `probe-race.ts` (reentrant takeover/Outcome) and late-report/terminal suites; no persistence/process-death claim, so no process-kill evidence.
- **Process/documentation** — inventory/guard (`boundary.test.ts` zone rules green), BASELINE/Layer-3 markers, 007 row, link check via builder-docs.
- Excluded: native Runtime/Driver fidelity (no real Driver; R1), external evidence gates (no E gate; K1.4), packaging/release (zone private). Same exclusions as the contract.

### Obligation/interaction coverage with expected facts, forbidden changes, source/test/trace and result

Re-audited cumulatively; prior PASS findings re-exercised, not exempted where the rebuilt model reaches them:

| Obligation | Expected / forbidden | Evidence and result |
|---|---|---|
| C1 scope before content | hidden≡missing `unknown_destination`, pos 0, zero reads past `executionId` | `outcome-acceptance.test.ts`, new scope arms. Holds |
| C2 replay/conflict before fresh validation, no grant | same receipt; `duplicate_conflict` for changed/uncapturable under accepted ID, incl. after resolution/next/terminal | `outcome-acceptance.test.ts`, `terminal.test.ts`, new conflict arms. Holds |
| C3 currency per-coordinate (R11) | any well-formed stale half → `stale_exchange` whatever authority/content, no content leak | new B/C matrix (44 arms) + R11 probe 8/8 + Case D. Holds |
| C3 explicit identity (PLAN-01) | omitted claim never defaulted | `outcome-acceptance.test.ts`, new D arms. Holds |
| C3 content / E-6 / capacity | entitled invalid → `malformed_envelope`/`capacity_exhausted` naming issues; whole refusal | `outcome-acceptance.test.ts`, `outcome-limits.test.ts`, new E arms. Holds |
| C3 no Kernel retry | no new delivery/attempt after refusal | `outcome-acceptance.test.ts`. Holds |
| C4 atomic/one-writer/progress-opacity | whole-batch ack, base+1, one acceptance, opacity | `outcome-acceptance.test.ts`. Holds |
| C5 next/terminal-never-reopens/typed result | new ID/epoch1/base=accepted; terminal refuses all | `terminal.test.ts`, new F arms. Holds |
| C6 B-5/live ingress | terminal dispositions in same decision; post-end input refused/replayed/conflicted | `terminal.test.ts`. Holds |
| C7 Effects/waits | whole refusal, no Effect record, exchange open; `await` names K1.3 unread | `outcome-acceptance.test.ts`, new D5/D6. Holds |
| C8 takeover/fencing/grant-lifetime | epoch+1 same ID, old epoch `stale_exchange` incl. partial halves, grant replaced, redelivery preserves, reentrancy single-commit | `takeover.test.ts`, `submission-lifetime.test.ts`, `takeover-reentrancy.test.ts`, new B/C fencing arms. Holds |
| C8 control/safe-replacement (DEC-14/15/19) | `unauthorized_control`/`unsafe_replacement` with no mutation; revalidation | `control-authority.test.ts`, `takeover-reentrancy.test.ts`. Holds |
| C9/C10 holds/history/permitted | holds distinguishable, permitted predicts controls, history frozen with `control` vs `attempt_submission` | `recovery*.test.ts`, `hold-permitted.test.ts`, `history-attribution.test.ts`. Holds |
| C10 authority before content (R9 preserved) | grant-less current/partial-current → `unauthorized_submission` with zero content diagnostics returned or retained | Case A/B + new D arms + P1/P2 probes. Holds |
| C11 late reports/Outcomes/attribution | own-row settlement; replay/conflict; IDs/epochs exact | `late-reports.test.ts`, `delivery-attribution.test.ts`. Holds |
| C12 receipts/immutability/nondisclosure/contiguity | own receipts/positions, frozen evidence, hidden-activity independence, no gaps | `transaction.test.ts`, `outcome-evidence.test.ts`, `nondisclosure.test.ts`, new G arms. Holds |
| C13 single-observation/pollution | one own-data read per field; ambient pollution survives | `outcome-hostile.test.ts`, `boundary.test.ts`. Holds |
| C14 zone/inventory | no violation; inventory matches | conformance guard. Holds |
| C15 records | single canonical owner (`execution-cycle.md#outcome-acceptance` + `#submission-authority` under decision-01); BASELINE/contract point there; no status on Layer-3; `OPEN(K3.2)` kept; O6 recorded as contract OPEN-5, not Layer-3 | diff read; link check; validation-13/12. Holds |

### Tests added/ported/removed and reasons; compatibility/refusal; baseline/guides/skills impact

- Added `packages/kernel/tests/outcome-partial-claim.test.ts` (56 cases; groups B/C/D/A/E/F/G per the plan). No existing test edited, weakened, or removed; Case B/C/D and currency tests rerun as controls.
- `ablations.mjs`: A3 span moved to the per-coordinate epoch check (same broken behavior, new spelling); B15 + B16 added (see below). No ablation removed.
- No compatibility/refusal change beyond the R11 correction: previously-`unauthorized`/`malformed` partial-stale proposals are now `stale_exchange` with authority/content-neutral reasons; all other classifications unchanged.
- BASELINE + canonical + contract updated as listed; no guide/skill change (builder-docs green, 72 files).

### Legacy code/docs/dependencies retired, or retained with consumer and retirement owner/trigger

None. `canonicalize@3.0.0` remains the only third-party specifier in the zone. K0 fixture vocabulary reused, not copied.

### Semantic correction closure: changed invariant, dependent paths, counterexamples and evidence

- Invariant changed (source: `execution-cycle.md#outcome-acceptance` step 3 + rationale; contract DEC-2/DEC-20): exchange-currency classification is per well-formed coordinate, before authority, with no content diagnostics; a malformed coordinate alone is content-group after authority. Prior misunderstanding: the numeric claim was atomic (`null` when either half malformed), so `if (claim !== null)` skipped *all* currency for partial claims (review-11 K12-R11-ORDER-01; same subsystem as R3/R6/R9/R10).
- Original counterexample: `review-11/probe-partial-claim.ts` (7/8 misclassified at H12; now 8/8 `stale_exchange`, exit 0, accepted state unchanged).
- Dependent paths walked (names and conceptual aliases: stale/currency/fence/claim/epoch/base/authority/grant/content/malformed/capacity/replay/conflict/terminal/receipt/refusal/inspect/history/redeliver/takeover): eager capture (single observation preserved; only currency numbers + identity used pre-authority), replay/conflict (identity-only; partials still conflict under accepted IDs), terminal (before currency; unchanged), activation equality (before currency; unchanged), authority (reference identity; unchanged position), capacity/content (after authority; unchanged order), `#accept`/`#refusal`/receipt positions (refusals advance only the refusal index; no acceptance gaps), inspection/history (returned==retained frozen), takeover/fencing (superseded attempts now fenced even with malformed other half), redelivery/holds (no capture readers; valid current Outcomes still end holds), Layer-3/BASELINE/contract/tests (updated together). `rg` confirms `capture.claim` has no coordinator reader left; `claim === null` remains only for the accepted-identity gate in `outcome.ts`, which is correct.
- Distinguishing evidence: new 56-case matrix; B15 (defective family) rejected 48 fails; B16 (epoch-only incomplete repair) rejected 14 fails; clean control 513/513 kernel, 2567/2567 full.
- Whole packet re-audited (table above). Prior PASS findings stand where re-exercised; none exempted the rebuilt subsystem.

### Prior findings: open IDs → disposition/evidence; closed findings → prior disposition links

- `K12-R11-ORDER-01` (review-11, P2): **corrected** in C11 by this reconstruction; evidence: new matrix + R11 probe 8/8 + B15/B16 + full validation below.
- `K12-R10-EVID-01`: closed in review-11; preserved (genuine `\ud800` fixture, 4-diagnostic Case C, B14). Re-exercised: B14 still rejected.
- `K12-R10-VAL-01`: closed in review-11; this round supplies fresh C11 raw evidence + manifest the same way (validation-13/).
- `K12-R9-ORDER-01`: concrete fully-malformed branch stays closed (P1/P2/P2b/P2c probes still `unauthorized_submission` with no content); its uncovered partial branch is now closed as R11 above, with R9's no-diagnostics rule preserved and re-pinned.
- `K12-R9-EVID-01`, `K12-R8-DOC-01`, `K12-R7-PROC-01`, `K12-R6-DOC-01`, `K12-R6-EVID-01`, `K12-R6-LAYER3-01`, R1–R5: closures stand by reference; re-exercised by 32/32 packet ablations + reviewer probes. Note: reviewer ablation R6 (`claim.baseProgressRevision` span) is now NOT APPLICABLE because that spelling no longer exists; its behavior (no base fence) is pinned by B16 + currency tests. R2 remains NOT APPLICABLE as in review-11.
- Review-11 observations O1–O5: O1 (007 intro prose) and O3 (contract revision number) are administrative and left for the H/status pass; O2 (008 field completeness) is addressed by this report's explicit methods/exclusions/checks-not-run sections; O4 (`checks-07.mjs` superseded pins) is historical evidence, untouched; O5 (`core.md` fail wording) is outside this packet's scope. O6 is settled as K1.2-OPEN-5 below.

### Additional self-found defects (separate provenance); unresolved obligations and unblock conditions

- None in-scope beyond R11. One adjacent branch explicitly **not** changed: O6 malformed-`activationId` vs terminal precedence. Current binding behavior (non-text ID → `malformed_envelope` before replay/terminal) is pinned in the new matrix and recorded as contract **K1.2-OPEN-5** awaiting an owner decision under 006 (precise question: total position of a missing/malformed/unobservable `activationId` relative to replay lookup, terminal, currency, authority, and content; owners: `execution-cycle.md#outcome-acceptance`, `identity.md`, `values.md`, `creation.md`, `lifecycle.md`). No code or prose encodes a preference beyond pinning current behavior as the binding's row.

## Validation and interpretation

Exact commands on clean payload C11 `ad219a5cf8940d0379bda9b16d693c901931a4b5`, cwd repository root, Node v25.2.1, npm 11.6.2, TS 5.9.3, darwin arm64. Working tree clean at C11 except untracked `validation-13/` (H evidence). Raw outputs in `validation-13/` with `MANIFEST.txt` digests (recomputable via `git show C11:<path> | sha256sum` for payload digests):

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | exit 0 | `02-typecheck.txt` (`a2051020…`) |
| `npm test` | exit 0; 2567/2567, 0 fail/cancelled/skipped/todo | `03-test-full.txt` (`558f2433…`) |
| `npm run test:kernel` | exit 0; 513/513 (457 prior + 56 new) | `04-test-kernel.txt` (`9a08dc76…`) |
| `npm run test:conformance` | exit 0; 1945/1945 | `05-test-conformance.txt` (`e441bcf6…`) |
| `npm run test:sdk` | exit 0; 22/22 | `06-test-sdk.txt` (`03365f1d…`) |
| `npm run check:builder-docs` | exit 0; 72 files, 1784 links/anchors, 38 imports | `07-check-builder-docs.txt` (`f1e18003…`) |
| `node docs/development/work/K1.2/ablations.mjs` | control 513/513; **32/32 REJECTED** incl. B15 (48 fails, all partial-stale rows) and B16 (14 fails, stale-base rows) | `08-ablations.txt` (`6955d587…`) |
| `node docs/development/work/K1.2/review-09/ablations-reviewer.mjs` | control 513/513; **10/12 REJECTED**, R2 + R6 NOT APPLICABLE (spans superseded; R6 behavior pinned by B16) | `09-reviewer-ablations.txt` (`80900f0d…`) |
| `review-11/probe-partial-claim.ts` (unchanged) | exit 0; **8/8 `stale_exchange`**, accepted state unchanged | `10-probe-r11.txt` (`e4779eec…`) |
| `review-09/probe-order.ts`, `probe-race.ts` | P1–P7 and race results as implementation-12 reported (P1/P2/P2b/P2c `unauthorized_submission`, no content) | inspected rerun (see Handoff; logs not in H attachments by the H12 convention) |
| `npm run test:evals` | exit 0; 12/12 | `13-test-evals.txt` (`55f199d8…`) |
| `git diff --check`, Layer-3 allowlist, sealed-history preservation | clean; Layer-3 diff exactly `execution-cycle.md`; review-09/10/11 untouched | `11-preservation-and-links.txt` (`635cb506…`) |
| Authority/candidate context | single canonical owner; `deliver(…,…,…)` current; `OPEN(K3.2)` kept | `12-authority-and-candidate-context.txt` (`155fcb95…`) |
| Tree/environment | C11 detached-equivalent clean tree, versions, UTC timestamps | `01-tree-and-environment.txt` (`b1783a6b…`) |

Why this supports each criterion (implementer assessment, not acceptance): the matrix asserts the exact classification *and* the forbidden observations (no content diagnostics pre-authority, returned==retained frozen, whole-refusal state equality, still-answerable exchange, nondisclosure) for every equivalence class, not just the probe's 8 arms; B15 proves the oracle rejects the known broken family (skip-all-currency) while the clean control passes; B16 proves both halves are independently covered (an epoch-only fix still fails); retained Case B/C/D + probes prove R9 was not regressed; the full suite + 32/32 ablations prove no cumulative regression.

Design choices, assumptions, strongest remaining risk: per-coordinate currency with `epochForCurrency`/`baseForCurrency` alongside the atomic `claim` for identity (smallest coherent change; single observation preserved; no banned zone syntax); O6 left as OPEN-5 rather than silently ordered (risk: a future reviewer may demand terminal-before-malformed; the pinned row + OPEN makes that a one-decision change); reviewer-ablation R6 span supersession is the only coverage-form change, with B16 as its successor.

Third-party review under AGENTS.md: none. `canonicalize@3.0.0` stays the only third-party specifier in the zone.

## Handoff

Ready for independent review. No self-acceptance; no integration; no K1.3 release.

- Base B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, new payload C11 `ad219a5cf8940d0379bda9b16d693c901931a4b5`, candidate H13 (commit containing this report; full SHA and verified advertised branch SHA in external handoff after non-force push), prior H12/review-11 history preserved.
- Reviewer: recheck cumulative B..H13, verify the C11..H13 allowlist (this report + `validation-13/` + 007 row only), the MANIFEST digests against `validation-13/`, and the exact-H13 gate result in the handoff. Reconstruct the obligation/classification model independently; passing this report's table proves nothing by itself.
- Open finding to close: K12-R11-ORDER-01. Open decision awaiting owner (not blocking this correction): K1.2-OPEN-5 (O6 malformed-identity precedence).
