# Implementation report — K1.1, round 2 (correction of review-01)

## Identity

- **Packet / parent:** K1.1, parent milestone K1 ([001 K1](../../001-current-status-and-roadmap.md)).
  **Contract:** [work/K1.1/contract.md](contract.md), **revision 2** (round-1 revision 1 plus: C11 removed,
  C7 restored to four refusing surfaces, DEC-1 withdrawn with provenance, terminal live-evidence deferred
  to K1.3, values.md unchanged).
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` — 006, 007, 008, 012 and
  015 exactly as they stand on integrated `main`, untouched by this candidate.
- **State:** IN_PROGRESS, blocked on owner decisions (not WAITING_FOR_REVIEW).
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") delivered through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); round-1 independent review
  [review-01.md](review-01.md) returned CHANGES REQUIRED (see below). Corrections on a released packet
  need no renewed permission under 006.
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, independently ACCEPTED at H
  `def91fb9f34ade40a65cbde999c0ffe192d18239` (A `4c3c2cf6cb0d4a0c6dd5ecbd97ceccadb8f161b0`,
  [review-01](../K1.0-correction-02/review-01.md)), integrated on `main` as
  `4f02e6cad2dbc9d5444fededbdc27f0dc695060d`, verified an ancestor of C2 in
  [01-tree-and-environment.log](validation-02/01-tree-and-environment.log). Its formal integration
  receipts under `work/K1.0/` and `work/K1.0-correction-02/` remain owed (K11-R1-PROC-01 blocker below);
  this packet neither writes nor substitutes for them.
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Configured remote:**
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
  **Reviewed payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`.
  **Reviewed H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`.
  **Review record:** `docs/development/work/K1.1/review-01.md` at
  `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (preserved untouched; historical H and verdict unaltered).
  **Payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f` (this correction's clean payload).
  **Previous reviewed H/review:** H `0f345b3…`, review-01 CHANGES REQUIRED.
- **Candidate H2:** the commit containing this report. Its full SHA and the verified advertised remote
  SHA are supplied in the owner handoff after the push.
- **Exact C2..H2 administrative file allowlist:**
  - `docs/development/work/K1.1/implementation-02.md` (this report)
  - `docs/development/work/K1.1/validation-02/` (11 declared output-only attachments; MANIFEST plus
    ten logs, each naming C2, its command and its SHA-256)
  - `docs/development/007-work-packets.md` (K1.1 status transcription from WAITING_FOR_REVIEW to
    IN_PROGRESS blocked, with round-1 review and C2 identities; no other row touched)
- **Working tree at C2:** clean apart from the validation-02 directory the run itself writes (which is
  `*.log`-ignored, so `git status` shows clean; recorded in `01-tree-and-environment.log`).
  **Push:** pending; performed after H2 and reported in the handoff.
- **`.gitignore` exception.** As in round 1, the ten evidence logs are added with `git add -f`
  (repository ignores `*.log`); without it the manifest would cite digests of payloads a reviewer could
  not open. `.gitignore` itself is unchanged.
- **Implementer:** Muse Spark, 2026-09-14 correction round. No independent review is claimed by anything
  in this report.

## Changes and coverage

### Change groups and the cumulative diff

Base..C2 is 41 files (round-1 26 plus review record, round-1 report/evidence, and this correction's
19-file payload delta). H..C2 correction delta is 20 files (preserved review-01 plus 19 payload files;
see `01-tree-and-environment.log`).

| Group | Paths | What it does | Governing source |
|---|---|---|---|
| Value reconstruction (VAL-01) | `packages/kernel/src/values.ts`, `packages/kernel/tests/values.test.ts`, `creation.test.ts`, `ingress.test.ts`, `inspection.test.ts`, `dispatch.test.ts` | Canonical array-index rule, plain-array prototype check, accessor refusal via descriptors, `defineProperty` seal preserving Object/null/Array prototypes; distinguishing regressions for own `__proto__` (top/nested/array/null-prototype) and own `01`/`00`/2**32-1, traced through creation/ingress/mailbox/Activation/redelivery/inspection | [values](../../../../mental-model/concepts/values.md), [creation](../../../../mental-model/mechanisms/creation.md), [core](../../../../mental-model/concepts/core.md) |
| Scoped-lookup reconstruction (ID-01) | `packages/kernel/src/identity.ts`, `coordinator.ts` (`#visible`, `visibleExecutions`), `packages/kernel/tests/receipts.test.ts` | Full-scan `mayReachScope` without early exit, `#visible` always scans (missing uses lone-surrogate sentinel), uniform per-record listing work with documented linear-listing limit; Proxy scope-read oracles for hidden/missing, scope-count, match-position, population and ingress/dispatch/redelivery paths; no crypto constant-time claim | [identity](../../../../mental-model/concepts/identity.md) |
| Cancellation-ownership removal (SCOPE-01) | `packages/kernel/src/coordinator.ts`, `inspection.ts`, `lifecycle.ts`, `index.ts`, `packages/kernel/tests/refusals.test.ts`, `dispatch.test.ts`, `ingress.test.ts`, deleted `cancellation.test.ts`, `docs/development/work/K1.1/contract.md` (rev 2), `002` note, landing-zone prose | Delete `cancelExecution` acceptance, `CancellationAccepted`, `fenced` field, `cancellation.test.ts`; `cancelExecution` now refuses naming K1.3 under C7 (four surfaces: three K1.2 + one K1.3); terminal-ingress rule retained with live-terminal evidence deferred to K1.3 via contract clarification; DEC-1 withdrawn | Governing 007 K1.1/K1.3; [creation](../../../../mental-model/mechanisms/creation.md), [lifecycle](../../../../mental-model/mechanisms/lifecycle.md) |
| Support/refusal prose (DOC-01) | `packages/kernel/package.json`, `packages/kernel/src/unsupported.ts`, `002`, `index.ts`/`lifecycle.ts`/`inspection.ts` docs, landing-zone comment | Package description and `UnsupportedKernelSurfaceError` now state partial K1.1 boundary (creation/ingress/reservation/dispatch/redelivery/inspection) and name owners for the rest; no longer claim no protocol exists; do not advertise K1.2/K1.3 behavior | 006 evidence/reference maintenance |
| JCS/PROC blockers (no code change) | contract OPEN-1/OPEN-2 retained, this report | values.md untouched; no third-party dependency added; smallest concrete owner decisions presented; status stays non-review-ready | [values](../../../../mental-model/concepts/values.md), AGENTS.md third-party review, 006/007 |

**Ownership.** Everything new lives in `packages/kernel/src` (K1.0 target zone) plus its tests and the
contract/baseline prose that 006 requires in payload. Nothing in `packages/core`, `packages/sdk`, any
provider package, `examples/` or `docs/guides/` changes, and `tests/conformance/k0` is byte-identical
to base. No consumer is routed through the new package; it stays `private`.

### Selected 012 methods, and what is excluded

**Deterministic execution** (primary): every criterion driven through `ExecutionCoordinator` with
controlled fake Drivers and explicit barriers; whole observable result asserted, plus a plausible broken
behavior the oracle rejects (five new ablations in `09b`, each rejected by 1–8 named cases).
**Normative decisions**: identity/equality/receipt rules, both orders, absent/empty/inert cases, exact
limit edges, duplicate/conflicting submissions; terminal rule specified with live-terminal deferred via
contract clarification rather than manufactured state. **Race and fault** (narrowly): dispatch
asynchrony and ingress-vs-reservation ordering; no persistence/process-failure claim. **Process/
documentation**: K1.0 guard/inventory maintenance, C/H identities, prerequisite provenance.

Materially excluded, with reasons: **native Runtime/Driver** (no real Driver; R1 owns it), **external
evidence/gate** (no E gate claimed), **packaging/release** (zone stays private), **process-failure**
(coordinator in memory; K3 owns it). `npm run test:evals` not run (no Agent behavior; 006 requires it
only then).

### Obligation and interaction coverage (implementer assessment, not acceptance)

Prior PASS is not exemption: C5/C8/C10 re-inspected after value/lookup/cancellation changes.

- **C1** — creation binds exact accepted content over the full boundary-value space now, including own
  `__proto__` (retained as own data, prototype unchanged, re-canonicalization equals bound identity) and
  refusal of own `01` arrays; replay/conflict/cross-producer/packing/principal-scope behavior preserved.
  Evidence: `creation.test.ts` VAL-01 cases plus existing rows.
- **C2** — ingress preserves `__proto__` through replay/mailbox/inspection, refuses `01` arrays without
  queueing; triple identity, capacity, RUNNING-vs-READY preserved; terminal-destination rule retained as
  specified check with `isTerminal` + Input-ID-before-terminal ordering asserted and live-terminal
  exercise deferred to K1.3 (no manufactured terminal). Evidence: `ingress.test.ts` VAL-01 + SCOPE-01
  clarification case.
- **C3** — validity/canonical-form/limits preserved plus VAL-01 reconstruction (array-index rule,
  prototype/accessor refusal, `defineProperty` seal, null-prototype preservation); JCS substrate decision
  remains owner-blocked (values.md unchanged, no dependency added). Evidence: `values.test.ts` VAL-01
  block (6 tests) plus existing C3 suites.
- **C4** — intent/reservation/asynchrony preserved; Activation now carries sealed `__proto__` value
  identically on dispatch and redelivery. Evidence: `dispatch.test.ts` VAL-01 case plus existing C4.
- **C5** — redelivery preserves ID/epoch/base/batch, excludes late arrivals, refuses when no unresolved
  exchange (fenced check removed with cancellation; no epoch advance). Re-audited after seal/lookup/
  cancellation changes; no weakening found. Evidence: `dispatch.test.ts`.
- **C6** — per-boundary receipts preserved; scoped reads now do equal scope work for hidden/missing
  (Proxy-counted), with scope-count/match-position/population independence; position equality retained as
  shape evidence only. Evidence: `receipts.test.ts` ID-01 block (5 tests).
- **C7** — four refusing surfaces (`submitOutcome`/`requestTakeover`/`recoverExecution` → K1.2,
  `cancelExecution` → K1.3), each throwing with owner and changing nothing; cancellation-acceptance
  removed. Evidence: `refusals.test.ts` (now 3 tests including SCOPE-01 refusal case).
- **C8** — no Agent/Workflow discriminator, no legacy controller vocabulary, imports still
  internal-or-`node:` only. Re-audited after src edits; no new vocabulary introduced. Evidence:
  `boundary.test.ts` plus architecture guard.
- **C9** — inspection inert/copied, now exposes sealed `__proto__` value identically to canonical bytes;
  scoped with normalized lookup; `terminalDispositions` always empty here (K1.3 owns it),
  `acknowledged` always empty (K1.2 owns it). Evidence: `inspection.test.ts` VAL-01 case plus existing.
- **C10** — zone still reaches nothing outside itself (`node:buffer` only via values), approved-leaf list
  still empty, still private; inventory file-count still 10, export surface runtime-identical (type-only
  `CancellationAccepted` removal erases to nothing), no agreement check weakened. Evidence:
  architecture suite 360/360 plus `boundary.test.ts`.
- **C11 — REMOVED.** Round-1 C11 (accepted cancellation) was unauthorized scope expansion contradicting
  governing 007 and C7. Deleted with its tests, implementation, `fenced` field and DEC-1 justification.
  Contract revision 2 withdraws DEC-1 with provenance. No successor criterion replaces it.

**Interactions deliberately exercised:** value model against both acceptance boundaries (per-root VAL
cases at creation and ingress); ingress against reservation (late Event outside pinned batch, including
from inside `deliver`); identity against scoping on every remaining lookup (creation/ingress/dispatch/
redelivery/inspection/listing share normalized `#visible`); refusal shape + work equality for hidden vs
missing across all four single-ID lookups; redelivery identity after seal change.

**The oracle rejects wrong implementations.** `09b` applies five one-behaviour ablations to clean C2 in
a detached worktree: assignment-style seal, `/^\d+$/` array-index test, missing fast path, `includes`
early-exit scope check, and accepting `cancelExecution`. Each is rejected by 1–8 named cases
(see that log). Prior round-1 ablations are not re-run here; the five cover this correction's changed
subsystems.

### Tests added, ported and removed

`packages/kernel/tests`: 116 cases (C2) vs 105 (C) vs 4 (base). Added: 6 VAL-01 values tests, 2 creation
VAL-01, 2 ingress VAL-01, 1 inspection VAL-01, 1 dispatch VAL-01, 5 ID-01 receipts tests + 1 match-position
test, 1 SCOPE-01 refusals test + 1 terminal-rule clarification test (replacing 3 live-terminal tests that
manufactured K1.3 state). Removed: `cancellation.test.ts` (6 tests) with its unauthorized C11 scope;
`dispatch.test.ts` fenced expectation and cancel-manufactured terminal/redelivery assertions (replaced by
deferral note). Nothing else weakened: `unsupported.test.ts` four cases retained; architecture guard
360 tests retained at same count with one prose comment updated (no assertion weakened).

**Compatibility and refusal.** No public behavior changes outside the target zone. `@arrokothi/core`,
`@arrokothi/sdk`, providers, examples untouched; `test:sdk` 22/22 unchanged; `packages/kernel` stays
`private`. Every unimplemented surface refuses by name through K1.0's mechanism.

### Reference maintenance

- **Accepted semantic sources:** creation, execution-cycle, core, identity, state, values, lifecycle
  (roadmap K1.1 plus values/lifecycle the code depends on); evidence structural section (unchanged
  semantics, inventory maintained by changing packet).
- **Layer-3 owners changed: none.** Deliberately: this correction *implements* rules it does not
  redefine. values.md, identity.md, creation.md, lifecycle.md, core.md unchanged. In particular values.md
  is not weakened to fit the hand-written encoder (JCS-01).
- **Layer 1:** no change. **Layer 2:** no change.
- **Dependencies inspected beyond the map:** waits/output (confirm nothing anticipates them),
  authority (context opaque, no policy evaluated), operations (three clocks; none implemented),
  recovery (no recovery claim).
- **Placeholders resolved:** none. **Superseded prose replaced:** 002 K1.1 note (no longer claims
  cancellation; names K1.2/K1.3 refusals), package description, unsupported message/header, index/
  lifecycle/inspection docs, landing-zone comment, contract rev 2.
- **Index/link/example validation:** `check:builder-docs` passes (26 files, 286 links/anchors).
- **Baseline:** 002 gains corrected K1.1 note; acceptance/integration remain in 007, never there.

All documentation above is payload in C2 (006 requires reference payload in the reviewed candidate);
none is attached as output-only evidence or left for cleanup.

### Semantic correction closure (012 §Semantic correction closure)

**K11-R1-VAL-01 — value preservation (reconstruction).**
1. *Invariant/source/counterexample:* values.md permits arbitrary well-formed member names and defines
   equality by canonical bytes; `creation.md`/`core.md` require exact accepted content through retained
   state/replay/inspection/Activation (C1/C2/C3/C4/C9). Counterexamples: `JSON.parse(
   '{"__proto__":{"admin":true},"safe":2}')` accepted but sealed via `sealed[name]=...` lost the own
   member to the prototype while canonical bytes described the original; own `"01"` array member escaped
   extra-member rejection (`/^\d+$/`) while encode/copy dropped it. Repeats K0.2 K02-R2-02 family
   (operation-sink `snapshot`/`deepFreeze` fix via `defineProperty`/`Reflect.ownKeys`; see
   `tests/conformance/k0/operation-sink.ts`, review-02, implementation-03).
2. *Producers/validators/commit/consumers/replay/read paths/tests:* producers: `acceptCreationContent`/
   `acceptInputContent` → `canonicalize` → `boundaryValueIssues` (walk) + `encode` + `sealBoundaryValue`;
   validators: walk (structure/limits), encode (canonical bytes); commit: mailbox `payload` retains sealed
   copy, `contentIdentity` packs canonical; consumers: replay equality (canonical), mailbox storage,
   `toActivationEvent`/`executionView`, `viewOf` inspection; replay/read: creation replay, Input-ID replay/
   conflict, redelivery batch identity, inspection views; tests: values/creation/ingress/inspection/
   dispatch VAL-01 cases.
3. *Losing/refused paths and forbidden mutations:* losing: conflicting content under bound identity refused
   as `duplicate_conflict` without editing retained payload (asserted mailbox byte-equal); refused:
   non-finite/undefined/symbol/accessor/symbol-key/non-enumerable/`01`/exotic-prototype/cycle/limits all
   refused with located codes, never repaired/dropped (asserted codes/reasons, mailbox/receipts unchanged);
   forbidden mutations walked: caller post-acceptance edit, view edit (throws), Driver Activation edit
   (throws), prototype growth (asserted `getPrototypeOf` unchanged).
4. *Distinguishing oracle:* seal-assignment ablation rejected by 8 VAL cases; `01`-regex ablation rejected
   by 3 VAL cases (see `09b`). Prior position-counter-style proxy not used; structural own-property and
   canonical-equality assertions directly distinguish.
5. *Re-audit:* whole packet re-audited after seal/validation change (C5 redelivery identity, C8
   vocabulary/imports, C10 zone/exports, receipts/inspection copying). No weakening found. Prior PASS
   C5/C8/C10 not treated as immunity.

**K11-R1-ID-01 — hidden/missing non-disclosure (reconstruction).**
1. *Invariant/source/counterexample:* identity.md requires lookup to authenticate/scope before revealing
   existence and refusal shape/timing to not distinguish hidden from missing (C2/C6/C9). Counterexample:
   `#visible` returned early for missing (no scope touch) while hidden paid `includes` scan; `includes`
   early-exited on match position; `visibleExecutions` walked entire map. Old position-counter test did not
   observe lookup work.
2. *Paths:* producers: `#executions` map + `caller.scopes`; validators: `mayReachScope` full scan;
   commit: `#visible` single-path (map lookup + one full scan; missing uses lone-surrogate sentinel);
   consumers: `submitInput`/`dispatch`/`redeliver`/`inspect` (all via `#visible`), `visibleExecutions`
   (uniform per-record scans); tests: receipts ID-01 Proxy-counted cases.
3. *Losing/refused:* hidden and missing refusals assert identical classification/reason/`executionId:null`
   plus equal scope-read counts across all four single-ID lookups; listing asserts visible-only shape with
   uniform per-record work (documented linear-listing limit, no specific-hidden-ID disclosure).
4. *Oracle:* missing-fast-path ablation rejected by 4 ID cases (would read 0 vs >0); `includes` ablation
   rejected by match-position case. Position equality retained as shape evidence only, explicitly not
   timing evidence.
5. *Re-audit:* all in-scope lookups share `#visible`; listing re-audited separately. No crypto
   constant-time claimed; honest application-level work normalization documented in code.

**K11-R1-SCOPE-01 — cancellation ownership (removal + clarification).**
1. *Invariant/source/counterexample:* governing 007 assigns out-of-band cancellation/terminal disposition
   to K1.3; K1.1 owns creation/input/reservation/dispatch plus refusal of new input to terminal
   destinations. Counterexample: contract held contradictory C7 (refuse cancellation as K1.3) and C11
   (accept cancellation with fencing/disposition); implementation accepted `cancelExecution` to CANCELLED
   with `fenced` + B-5 dispositions; C7 test substituted `recoverExecution` for cancellation.
2. *Paths:* removed: `cancelExecution` acceptance, `CancellationAccepted`, `ActivationRecord.fenced`,
   `ActivationView.fenced`, B-5 manufacturing loop, `cancellation.test.ts`, dispatch fenced/redelivery-
   fenced branches, live-terminal ingress/dispatch tests. Retained: `isTerminal` checks in `submitInput`/
   `dispatch`, `terminal_destination` refusal, `MailboxDisposition` terminal variant + `terminalDispositions`
   field (always empty here; K1.3 owns manufacturing), `TERMINAL_STATES` vocabulary.
3. *Losing/refused:* `cancelExecution` now refuses naming K1.3 with snapshot byte-equal before/after
   (refusals SCOPE-01 case); new-input-to-terminal rule specified with `isTerminal` + Input-ID-before-
   terminal ordering asserted without manufacturing terminal; live-terminal ingress/replay/conflict
   exercise deferred to K1.3 in contract + ingress clarification test.
4. *Oracle:* accepting-cancel ablation rejected by 3 C7/SCOPE cases. Prior C11 green suite not treated as
   evidence (it proved the unauthorized scope).
5. *Re-audit:* contract criteria/implementation/exports/tests/report/status/baseline reconciled (C7 four
   surfaces, C11 removed, DEC-1 withdrawn, 002/landing-zone/index/lifecycle/inspection prose corrected);
   dependent redelivery/ingress/inspection/receipts re-audited; no K1.2/K1.3 behavior advertised.

**K11-R1-JCS-01 — canonical JCS decision (blocker, no code change).**
1. *Invariant/source:* values.md canonical-form section: "Use an unmodified conforming JCS implementation
   rather than an almost-equivalent serializer." Governing for C3.
2. *Paths:* encoder lives behind `packages/kernel/src/values.ts` (`encode`/`encodeString`/`encodeNumber`/
   `byCodeUnit`) so an approved dependency can replace it without touching callers; validation/limits/seal
   remain enforced regardless of substrate.
3. *Outcome:* values.md NOT weakened; no third-party package added (zone still `node:`-only, approved-leaf
   list still empty). Web search identified a concrete candidate (`canonicalize@3.0.0`, Apache-2.0 per npm
   metadata, ~2.7M weekly downloads) but exact-revision LICENSE/NOTICE/header/terms inspection and
   commercial-compatibility review under AGENTS.md remain owed before introduction — not claimed here.
   Smallest concrete owner decision needed (see Handoff/blockers): (a) approve a specific unmodified
   conforming JCS dependency with full third-party review, or (b) record an owner-approved normative
   amendment permitting the reviewed in-zone encoder. Remain non-review-ready until resolved. No owner
   approval invented.

**K11-R1-PROC-01 — prerequisite integration provenance (blocker, no code change).**
Inspected repository at C2: `docs/development/work/K1.0/` and `work/K1.0-correction-02/` contain no
`integration-*.md` (only contracts/reports/reviews/cleanups/validation); 007 still records both receipts
as owed. No subsequently supplied authentic receipt or owner resolution found. Not fabricated; candidate
release transcription not reinterpreted as satisfying them. Exact blocker + owner action in Handoff.
K1.1 cannot return to WAITING_FOR_REVIEW while unresolved.

**K11-R1-DOC-01 — support/refusal prose (corrected).**
Package description, `UnsupportedKernelSurfaceError` message/header, 002 K1.1 note, index/lifecycle/
inspection docs and landing-zone comment now accurately state partial K1.1 boundary (creation, ingress
with terminal-refusal rule, reservation/dispatch/redelivery, inspection) and name K1.2/K1.3/K2 owners for
the rest. Verified no remaining "no protocol exists"/"structural only"/"unimplemented at this revision"
claim about the current tree; historical K1.0 refusal-only prose retained only as history with corrected
successor note. Architecture guard prose updated without weakening assertions.

### Prior findings

No prior K1.1 independent review besides round-1 review-01 (CHANGES REQUIRED, six findings above).
Dispositions: VAL-01 reconstructed + re-audited; ID-01 reconstructed + re-audited; SCOPE-01 removed +
clarified + re-audited; JCS-01 blocked (no weakening, decision presented); PROC-01 blocked (inspected,
not fabricated); DOC-01 corrected. K0.2 K02-R2-02 re-read (review-02, operation-sink fix) and applied as
reconstruction family, not isolated patch. Round-1 implementer self-corrections (wrapper-root,
caller-reference) re-reviewed as part of VAL-01 subsystem.

### Additional self-found defects (separate provenance)

- **K11-R2-SELF-01:** `isArrayIndex` initial draft contained a stray non-ASCII token from editing;
  caught by reading the diff before commit and removed. No behavior shipped.
- **K11-R2-SELF-02:** `MISSING_SCOPE_SENTINEL` initial literal used soft-hyphen characters instead of
  lone-surrogate escapes, which could theoretically collide with a well-formed scope. Corrected to
  explicit `"\ud800missing\udc00"` escapes (never well-formed, never bound) before commit.
- **K11-R2-SELF-03:** new receipts ID-01 block initially contained dead scaffolding (`check` closure,
  `perScan` probe) and a match-position gap (outsider-only scopes would not distinguish `includes`
  early-exit). Removed scaffolding and added early-vs-late match case. Caught by self-review before C2.
- **K11-R2-SELF-04:** kernel test type errors from `unknown[] & Record<string, unknown>` annotations for
  `01` fixtures; simplified to `unknown[]` (defineProperty needs only `object`). Caught by typecheck
  before C2.

No other in-scope defect found in the whole-packet re-audit. No silent weakening.

### Unresolved obligations and unblock conditions

- **K11-R1-JCS-01 (owner decision):** values.md rule vs in-zone encoder. Unblock: owner records either
  (a) approval of a specific unmodified conforming JCS dependency (candidate `canonicalize@3.0.0`
  identified; full AGENTS.md source/version/license/reuse review still owed) with replacement behind
  `values.ts`, or (b) normative amendment permitting the reviewed in-zone implementation with
  consequences reviewed. Implementer makes no choice for the owner.
- **K11-R1-PROC-01 (owner records):** formal integration receipts under `work/K1.0/` and
  `work/K1.0-correction-02/` owed before K1.1 release per governing 007. Unblock: owner appends authentic
  receipts (or records explicit resolution) and revalidates dependencies/contract. Candidate text cannot
  waive this.
- **K1.1-OPEN-3…OPEN-7** (contract): trivial progress, unreachable empty batch, in-memory expiry policy,
  no durability/isolation/fidelity claim, unbounded delivery-attempt log — retained as stated limits, not
  defects.
- Packet stays IN_PROGRESS blocked; see Handoff.

## Validation and interpretation

### Commands

All run from `/Users/rex-shih/Documents/ArrokothI/arrokothi` against clean payload C2
`6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`, on Node v25.2.1, npm 11.6.2, TypeScript 5.9.3,
Darwin 25.6.0 arm64. Raw output, per-file SHA-256 digests and exact results in
[validation-02/MANIFEST.md](validation-02/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,172 tests, 324 suites, 0 fail, 0 skipped (base 2,060/302; C 2,161/323) |
| `npm run test:conformance` | 0 | 1,947 tests, 283 suites, 0 fail, 0 skipped (unchanged) |
| `npm run test:sdk` | 0 | 22 tests, 0 fail — public host path unchanged |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 116 tests, 23 suites, 0 fail (base 4; C 105) |
| architecture suite (`node --test --test-reporter=tap tests/conformance/architecture/*.test.ts`) | 0 | 360 tests, 37 suites, 0 fail — same count as K1.0 acceptance |
| packet cases TAP (`packages/kernel/tests/*.test.ts`) | 0 | 116 tests, 23 suites, every case named |
| 5 round-2 ablations of C2 in detached worktree | 0 | each rejected by 1–8 named cases; worktree clean after reverts apart from symlinked `node_modules` |

### External fixtures, gates and decisions

**None executed and none claimed.** No E0–E6 gate run. `tests/conformance/k0/` byte-identical to base;
no candidate ported onto it (K1.4 owns that port). No external decision, benchmark revision or evaluator
relied on. Owner supplemental decisions beyond the recorded release: none (per review-01).

### Checks not run, and the resulting limits

- **`npm run test:evals`** — not run. 006 requires it for Agent behaviour; this correction adds no Agent,
  model path or eval fixture. Limit: no Agent-behaviour claim.
- **No process-kill/restart/persistence run.** Coordinator in memory. Limit: no durability/recovery claim.
- **No native Driver.** All Drivers fakes. Limit: no fidelity claim.
- **No packaging/clean-consumer check.** Zone private. Limit: no installability/release claim.
- **No multi-worker concurrency.** Asynchrony evidence is single-threaded non-awaiting only.

### Why the evidence supports each criterion — and where it stops (implementer assessment)

C1/C2/C4/C5/C6/C9 supported by distinguishing VAL-01 + ID-01 cases traced through stored/replay/mailbox/
Activation/inspection paths plus preserved interaction cases; C7 supported by four-surface refusal cases
including SCOPE-01 acceptance-vs-refusal oracle; C8/C10 supported by vocabulary/import/guard evidence
re-audited after edits. What evidence does **not** establish: end-to-end protocol (no Outcome accepted,
no progress/completion/failure through Runtime), any E gate, persistence/concurrency/real-Driver/Effects
behavior, or resolution of JCS-01/PROC-01 owner blockers. C2 terminal live-exercise and C4 trivial-progress
/empty-batch limits honestly stated as deferred/unreachable, not proven.

### Design choices, assumptions and the strongest remaining risk

- **Authority as scope string + caller scope list** (unchanged): smallest model making hidden-vs-missing
  identically answerable; real policy is K2.2's.
- **Initial-input Input ID `(namespace, new Execution ID, creation key)`** (unchanged): creation receipt
  covers initial input; later same-key input is replay/conflict.
- **One Driver per coordinator, explicit `dispatch`** (unchanged): scheduling is K3's.
- **Terminal rule without terminal manufacturing** (new): `isTerminal` + Input-ID-before-terminal ordering
  retained; live-terminal exercise deferred to K1.3 via contract clarification — smallest
  process-compliant correction per review, not scope theft.
- **Lookup work normalization without crypto claim** (new): full scans + sentinel; honest about JS timing
  limits (documented in code).
- **Strongest remaining risks:** (1) K1.2 finds dispatch intent shape insufficient for Outcome acceptance
  (mitigated by vocabulary alignment, unprovable until K1.2); (2) owner JCS/PROC decisions change
  substrate or release eligibility (outside implementer control; packet correctly blocked).

### Third-party review under AGENTS.md

**None reused.** No third-party code, test, script, asset, fixture or dependency copied, adapted, vendored
or added. No manifest gained a dependency; target zone still `node:`-only (`node:buffer` sole specifier),
approved-leaf list still empty. Canonical encoder written against repository-owned values.md rules/examples;
RFC 8785 cited as normative reference already adopted; no code/test vector/corpus from it or any
implementation copied. Web search identified candidate `canonicalize@3.0.0` (Apache-2.0 per npm metadata)
for the owner JCS decision, but exact-revision LICENSE/NOTICE/header/terms inspection and compatibility
review remain owed before any introduction — not claimed here. values.md not weakened to fit implementation.

## Handoff

- **Not ready for independent review (blocked).** Independent corrective work for all six findings is
  complete except the two owner-only items below; re-review now would re-encounter the same blockers.
  Remaining work is owner action, not implementer code:
  1. **K11-R1-JCS-01:** owner records either (a) approval of a specific unmodified conforming JCS
     dependency (with full AGENTS.md review and replacement behind `values.ts`) or (b) normative
     amendment permitting the reviewed in-zone encoder. Candidate noted above; no choice made here.
  2. **K11-R1-PROC-01:** owner appends authentic formal integration receipts under `work/K1.0/` and
     `work/K1.0-correction-02/` (or records explicit resolution) and revalidates dependencies/contract.
     Both paths absent at C2; inspected, not fabricated.
  Until both resolve, K1.1 cannot return to WAITING_FOR_REVIEW under 006 (no unresolved owned semantic/
  mandatory case). Live 007 in H2 transcribes this packet as IN_PROGRESS blocked (not awaiting a review
  that already happened), preserving review-01 CHANGES REQUIRED.
- **Base** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`, **payload C2**
  `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`, **candidate H2** the commit containing this report; its
  full SHA and the verified advertised remote SHA are supplied in the owner handoff after the push.
  Review `base..H2` and the C2..H2 allowlist named under Identity.
- **No self-acceptance.** This report is the implementer's assessment. Acceptance requires a separate
  reviewer session bound to an exact future H after blockers resolve, and the successor packet remains
  owner-controlled and unreleased. Do not merge. Do not release K1.2. Do not claim E1, durability, real
  Driver fidelity, packaging/release support or K1 milestone closure.
