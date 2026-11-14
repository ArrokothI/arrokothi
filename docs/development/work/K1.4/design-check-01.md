# Design check 01 — K1.4

**Verdict: APPROVED WITH REQUIRED CHANGES.** D01-CHK-01 to D01-CHK-14 below are required before design 01 is
built as claimed. The design's shape is fit to build:
- one legacy Driver privately owns the 0.8.x `Harness` as a managed native job;
- native root ID = Kernel ID;
- one native step per exchange;
- `await` only on a native human pause;
- the SDK host owns the coordinator and pumps timers.

It needs no Kernel semantic change and no new Kernel entry. Both P1 attack findings are confirmed, but each has a
local fix inside the Driver. Neither needs a redesign or reopens an owner choice. Three of my own findings
(D01-CHK-10 to D01-CHK-12) are public-surface or gate gaps of the same size.

## Identity and bounds

- **Subject:** [design 01](design-01.md) at `origin/claude/k1.4`
  **`6831b112b8a14f54ca481b965abf755801e7aefe`**, fetched for this check. It carries
  [owner choices 01](owner-choices-01.md) and the decision-02 amendment note. Base B is
  `608f9ece44dbe42b78974bdac9e7ddcd33697705`. Between B and the subject only K1.4 work files and that note
  differ, so the code checked is B's code.
- **Attack:** [attack 01](attack-01.md) at `origin/claude/k1.4-attack`
  **`cffb2c81244f7f0955e9b20d30fac70e8a1e1e5d`** (one commit on the subject). It is not merged into this branch;
  its links resolve on that branch.
- **Checker:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-06. The owner's launch prompt
  assigned this check to this session. Release 01 names Codex GPT-6 for the check, so that prompt is the
  provenance for the change of model. This session is neither the implementer nor the Prompt E adversary.
  **Correlated-assumption disclosure (006):** the implementer, the adversary and this checker are all Claude Opus
  sessions. A different model family at the independent review would reduce that correlation.
- **Branch:** `claude/k1.4-design-check`, created from the subject SHA in its own worktree. The recording
  commit's SHA is given in the handoff, not here.
- **Environment:** Node v26.10.0 (`~/.local/share/arrokothi/node-v26.10.0-darwin-arm64`), macOS arm64.
- **Read first:**
  - AGENTS.md and [006](../../006-development-process.md);
  - the [integration](../../../../mental-model/mechanisms/integration.md),
    [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md),
    [waits](../../../../mental-model/mechanisms/waits.md) and
    [evidence](../../../../mental-model/mechanisms/evidence.md#attribution-and-gates) mechanisms;
  - [kernel-ownership](../../kernel-ownership.md#deferred-extraction-and-bridge-owners) DX-5 to DX-12;
  - [decision-02](../DESIGN-AUDIT-01/decision-02.md) with its amendment note;
  - [017](../../017-known-limitations.md);
  - then brief 01, release 01, design 01, owner choices 01 and attack 01.
- **Code read at the subject:**
  - Kernel: `packages/kernel/src/{coordinator,driver,state,value-types}.ts`;
  - Harness and processors: `packages/core/src/runtime/{harness,effect-processor,resumption-processor}.ts`;
  - native records: `packages/core/src/effects/{pending,types}.ts`, `execution/{context,resumption}.ts`;
  - ports and contract: `ports/{ids,scheduler}.ts`, `testing/contracts/scheduler.ts`;
  - SDK: `packages/sdk/src/*`, `packages/sdk/src/internal/value-capture.ts`;
  - tests and gates: `packages/kernel/tests/binding-surface.test.ts`,
    `tests/conformance/architecture/{boundary-policy.ts,kernel-landing-zone.test.ts}`,
    `scripts/check-builder-docs.ts`;
  - examples, guides and packet-tool fixtures: `examples/execution-kernel-minimal/*`, `docs/guides/**`,
    `tests/fixtures/packet-tools/*`.
- **Probes re-run:** `attack-01/bridge-probes.mjs` from the attack worktree. Its output is identical to the
  attack's record, exit 0. `attack-01/growth-probe.mjs 1000` gives 1.14, 2.99, 5.10 and 7.01 ms per turn over
  the four 250-turn quarters, the same linear slope.

This is a design verdict. It is not acceptance of an implementation, a 007 status change or a release. Owner
choices 01 (Q1–Q8) and brief 01's decisions are not reopened. Where a required change touches one, it says what the
choice did not decide. No production code is written.

## Attack 01 findings

Each finding was checked against the source it cites. None is refuted. Two are downgraded.

| ID | Attack | Check | Evidence checked | Closed by |
|---|---|---|---|---|
| CX-01 | P1 | **Confirmed P1** | Probe order reproduced. §3 step 1 creates the root with no cancellation check. `harness.ts:897` (`processActivationEffects`) runs before `:956` reads `cancellationRequests` | D01-CHK-01 |
| QS-01 | P1 | **Confirmed P1**, fix refined | The `inFlight` sets are private and global (`effect-processor.ts:367`, `resumption-processor.ts:176`). A capability call and a `call` child have the same `status`/`dispatch`/`outcome` triple; only `effectKind` tells them apart (`pending.ts:73–103`, `types.ts:33`). The Harness commits `READY` before it enqueues (`harness.ts:441–443`, `:515`) | D01-CHK-02 |
| PF-01 | P2 | **Confirmed P2** | `coordinator.ts:2077–2081` (`#requireControl` first); probe returns `unauthorized_control` | D01-CHK-03 |
| DL-01 | P2 | **Confirmed P2** | Probe reproduced. Q4 chose the deadline's source (an application option), not its anchor | D01-CHK-04 |
| DL-02 | P2 | **Confirmed P2** | Probe reproduced. L-22: "The host must pump" | D01-CHK-04 |
| VAL-01 | P2 | **Confirmed P2** | `BOUNDARY_LIMITS` (`value-types.ts:4–9`); legacy JSON has no size limit; probe | D01-CHK-05 |
| BIND-01 | P2 | **Confirmed P2**, fix narrowed | `binding-surface.test.ts:38–58`; marker at `value-capture.ts:1979`; serializer window at `:1777`. The attack's second fix form does not support §9's residual claim (D01-CHK-06) | D01-CHK-06, -09 |
| SCHED-01 | P2 | **Confirmed P2** | `contracts/scheduler.ts:20–62`: `claim("w1")`/`claim("w2")` take any Execution | D01-CHK-07 |
| INV-01 | P2 | **Confirmed P2**, widened | 17 guide pages; 7 of them name SDK members (search S2 below). The SDK README, the builder skill and 2 of the 6 Harness-using example sources are also outside §7 | D01-CHK-08 |
| CONC-01 | P2 | **Confirmed, downgraded to P3** | The legacy `exclusive` wraps `runOnce` and `runUntilIdle` (`application.ts`). The change needs an inventory row and a guide note, not a design change | D01-CHK-08 |
| GROW-01 | P2 | **Confirmed, downgraded to P3** | Reproduced. Cost beyond the declared bounds may stop at a 017 limit ([017 rule](../../017-known-limitations.md#the-rule)). Option (b) changes how the Kernel evaluates its owner predicate, which brief 01's bounds allow only for a correctness need. This is a cost | D01-CHK-14 |
| ID-01 | P3 | Confirmed P3 | `runtime-store.ts:50` (insert fails if the Execution exists) | D01-CHK-14 |
| ALS-01 | P3 | Confirmed P3 | `ID_PREFIXES.execution` is `"exe"` (`ports/ids.ts:13`); §2 says `exec` | D01-CHK-14 |
| EMIT-01 | P3 | Confirmed P3 | §5 is silent on the order and the carry | D01-CHK-14 |
| TERM-01 | P3 | Confirmed P3 | Same mechanism as CX-01: the Driver ends a Kernel Execution without ending its lineage | D01-CHK-01 |
| HOST-01 | P3 | Confirmed P3 | The `activation_limit` ordering bullet is needed for B-CONTINUE to be deterministic | D01-CHK-14 |
| INGRESS-01 | P3 | Confirmed P3 | Legacy `rejected`/`malformed_event` is synchronous (`harness.ts:240–246`) | D01-CHK-08, -14 |
| SIDE-01 | P3 | Confirmed P3 | Cooperative contract; record the gap rather than change `ApplicationServices`' type | D01-CHK-14 |
| PUB-01 | P3 | Confirmed P3 | `packages/sdk/package.json` has `publishConfig.access: public` and no `private` | D01-CHK-14 |
| BREAK-01 | P3 | Confirmed; needs the owner | Brief decision 3: "No 0.9 breaking removal in K1.4." Q2 covers only the mutators | D01-CHK-13 |
| ACK-01 | P3 | Confirmed P3 | W-9: a timeout batch may carry an Event the Driver never forwards | D01-CHK-14 |
| MBX-01 | P3 | Confirmed P3 | `DEFAULT_MAILBOX_CAPACITY = 1_024` (`coordinator.ts:368`) | D01-CHK-08 |

The attack's "searched and not filed" list was spot-checked: the §11 file set, the native ID length, the
Function-Stage Effect kinds and the soundness of the L-01 three-reference logic. I agree with all four.

## Required changes

### D01-CHK-01 — one lineage-termination rule in the Driver

**Source:** CX-01, TERM-01. **Location:** §3 step 1, §4, §6 Q3.

The Driver needs a single rule: **once Kernel E is terminal, or a cancellation request for E has reached the
Driver, the Driver starts no native work for E and ends the native lineage.**
- `requestCancellation` sets a sticky per-Execution flag synchronously. The task checks it:
  - before root creation;
  - before each forward;
  - before and after each `runOnce`.
  With the flag set, the task stops and submits nothing.
- The cascade runs again after the current step returns, so a child created during the step is cancelled.
- Before every Driver-originated `fail` (`value_unrepresentable`, `native_error`, `initial_input_rejected`,
  `native_session_missing`, `wait_deadline_expired`), the Driver cancels the lineage. After a root `COMPLETED`, it
  cancels any live descendant.
- 017 records, beside L-20, that a native Activation already running dispatches its proposed Effects before the
  Harness reads the cancellation (`harness.ts:897` before `:956`). That is legacy behaviour, not new.

Q3 is unchanged: this makes its promise ("cancels the native root and its native descendants") true at every
point where a request can arrive.

**Closure:** B-CANCEL-PREROOT (no root is created, and the tool sink stays at 0), B-CANCEL-MIDSTEP-CHILD and
B-FAIL-CASCADE (each Driver-originated `fail` leaves no live native member).

### D01-CHK-02 — a positive human-wait predicate over store records

**Source:** QS-01. **Location:** §3 step 2, the mapping table and the quiescence paragraph; §12 K14-2.

Replace "nothing runnable or in flight" with a positive predicate that is a total function of records the Driver
can read. Declare `await` only when **every** non-terminal member of the lineage is in an awaitable human pause,
and no member is `READY` in the store. A member is in an awaitable human pause when it is in one of these states:
- `WAITING` on an `event` wake that includes `external.input`;
- `WAITING` with a pending confirmation whose `PendingOperation` is `not_dispatched`;
- `WAITING` only on `spawn_execution` pending operations whose children are themselves in awaitable human pauses.

A `use_capability` or `write_memory` pending operation that is `dispatched` with no outcome, or a `pending`
`ControllerResumption`, is in flight. It is never awaitable. `effectKind` is what separates a capability call
from a `call` child, because the two otherwise share the `status`/`dispatch`/`outcome` triple. In every other
case the exchange stays open, and the task waits on the lineage `enqueue` notification. The in-flight and stuck
rows become one row, since they produce the same Kernel state.

The predicate is sound for stock controllers because the Harness has no native timer that can wake a member.
The only `setTimeout` in `packages/core/src` is the inline-wait yield (`reference/inline-wait.ts:44`). So once
every member is in a human pause, only Kernel input can advance the lineage. State this as the argument, and
re-run that search in the build.

The Q7 limit text gains its tail: if a sibling call never settles, the confirmation is never surfaced, and only
`executionDeadline` bounds the run (`humanWaitDeadlineMs` applies only to a declared wait).

**Closure:**
- B-QUIESCE-CELLS: one table-driven test over the product `lifecycle × waitingFor.kind × pending-operation
  effectKind/dispatch/outcome × resumption state`. Each cell maps to `await`, `continue`, a terminal step or
  open.
- B-CHILD-CONFIRM, B-SLOWCAP-NO-WAIT, B-APPROVAL-INFLIGHT and B-ENQUEUE-WINDOW, as attack 01 lists them.

### D01-CHK-03 — a control-scoped caller for the protocol-failure fallback

**Source:** PF-01. **Location:** §2 host caller, §4.

The Driver gets its own trusted caller, `controlScopes: ["application"]`, used only for `reportProtocolFailure`.
It is never returned from the SDK, and the public host caller is unchanged. `requestTakeover` stays refused,
because the Driver has no `isSafeToReplace`. §2's sentence "It has no `controlScopes`" is reworded to describe
the public caller only.

**Closure:** B-PROTOCOL-HOLD (force a refusal of the Driver's `fail` and assert the hold).

### D01-CHK-04 — deadline anchor, pumping points and the Execution-deadline form

**Source:** DL-01, DL-02, plus one of my own. **Location:** §3 (Q4 paragraph), §4, §7 S-START.

1. **Anchor.** `humanWaitDeadlineMs` bounds a **native pause**, not one Kernel registration. Progress carries
   `pause: { identity, deadline }`, where the identity is the waiting native member plus its wait or
   confirmation ID. While the same pause persists, each re-declared wait carries the same absolute deadline. W-2
   then expires an already-due one at registration. When several pauses are open, the earliest deadline applies.
   Q4 still holds: each Kernel wait the Driver declares carries a deadline.
2. **Pumping.** Due timers fire at the start of every host entry that can lead to an accepted decision: `start`,
   `input`, `resolveConfirmation`, `cancel`, `runUntilBlocked` and `runUntilIdle`. The guides say that a deadline
   takes effect at the next host call (L-22, now at a stated point).
3. **Own: the Execution deadline is absolute.** The Kernel's `executionDeadline` is an absolute instant on the
   clock's scale, and it is part of creation's canonical content: a changed deadline under the same key conflicts
   (`coordinator.ts:287–297`). `start({ executionDeadline })` must therefore take that absolute instant.
   A relative duration computed at call time would make an exact `start` retry conflict instead of replaying.

**Closure:** B-DEADLINE-STRAY, B-DEADLINE-AT-INGRESS, and B-START-RETRY-DEADLINE (an exact retry with the same
absolute deadline replays).

### D01-CHK-05 — values over the core limits

**Source:** VAL-01. **Location:** §5 payloads, §7 P rows.

Take attack 01's option (b) in the build, and keep option (a), carrying oversize values by locator, as the 017
fix:
- Add an **M** row: "a native result, Emission or failure detail over the core limits now fails the Execution as
  `arrokothi.bridge.value_unrepresentable`, after native work ran".
- Add guide text and a 017 entry whose trigger is a real application hitting the limit. The expected fix is the
  locator form, which is additive to the result shape.
- Cap `ExecutionFailure.details` before encoding, so the native failure `code` always survives.
- State the input side: an `input`, `resolveConfirmation` or `start` payload over the limits is refused
  synchronously by the wrapper, before any Kernel or native record. That refusal is clean.

**Closure:** B-VALUE-RESULT-70K, B-VALUE-ROWS-5000, B-VALUE-FAIL-DETAILS and B-VALUE-INPUT-REFUSED.

### D01-CHK-06 — the BINDING-01 surface pins, and where the L-01 check sits

**Source:** BIND-01, with a narrower fix. **Location:** §9, §11, §13.

Map the three `binding-surface.test.ts` assertions with their kept properties (D01-CHK-09):
- the capture graph still imports no Kernel;
- the public runtime keys are the new exact list;
- the prefix is byte-identical except for the L-01 call.

**The check stays where §9 puts it: inside `withSerializerEnvironment`, immediately before the dependency call
(`value-capture.ts:1777`).** Re-pin the prefix hash and show the diff in the report. Do not use the attack's
alternative of wrapping `captureCanonicalBytes` after the marker. A check placed there runs either before capture
or after encoding:
- before capture, it misses a shadow installed during capture;
- after encoding, it misses a self-restoring shadow, a `let JSON` whose `stringify` reassigns the binding to the
  genuine object before it returns.

Only the in-window check supports §9's residual, "genuine intrinsics at SDK module load". Between that check and
the dependency call, only primordial-only code runs. If the implementer prefers to keep the pin, §9's residual
must widen to include capture-time shadowing, and that widening needs the owner (017 L-01).

**Closure:** the re-stated surface test; B-WRAPPER's child-process refusal, with a shadow installed by a
capture-time side effect as one of its cases.

### D01-CHK-07 — a lineage scheduler that passes the published contract

**Source:** SCHED-01. **Location:** §2, §11 `contracts/scheduler.test.ts` (P), B-SCHED.

Build the lineage scheduler as a contract-conforming FIFO with a lineage-filtered claim:
- a `lineage:<E>` worker claims only E's lineage;
- any other worker claims from all lineages in enqueue order, and the bridge never uses one.

`enqueue(id)` finds the root by a store read of `rootExecutionId`. With no record, `id` is its own lineage.

**Closure:** B-SCHED (the published suite, unchanged) and B-LINEAGE (the filter's own cases).

### D01-CHK-08 — K14-4's closure: declared scope, mechanical extraction and the missing behaviour rows

**Source:** INV-01, CONC-01, MBX-01, INGRESS-01, plus my own search S2. **Location:** §7, §12 K14-4.

1. **Scope.** The closure is a declared bounded search over:
   - every page reachable from `docs/guides/README.md` (17 pages at the subject);
   - `packages/sdk/README.md`, which AGENTS.md names beside the guide map;
   - `.agents/skills/arrokothi-agent-builder/SKILL.md`;
   - every file under `examples/execution-kernel-minimal/`.

   At the subject, §7's six pages leave out pages that name SDK members:
   - `evaluation-and-diagnosis.md`: `app.preflight`, `runUntilBlocked(...).reason`, `readAgentControlState`;
   - `worked-examples.md`;
   - the SDK README: "Use `application.harness` for input, confirmation, cancellation and evidence".

   Six of the seven non-test example sources use the Harness through `application.harness` (`app.ts`,
   `main.ts`, `classification.ts`, `patterns.ts`, `patterns-main.ts`, `settle.ts`). §7 names four of them, not
   `classification.ts` or `patterns.ts`.
2. **Extraction.** A test extracts every backticked SDK or Harness member and every linked example file from that
   scope. It fails on any extracted item with no row.
3. **Members.** Enumerate the members of every exported interface with the TypeScript API, not only the four
   §12 names. That covers `RunOptions`, `ApplicationServices`, `ApplicationModels`, `StartExecutionInput`, the
   preflight types and the nested `runtime` options. The runtime `Object.keys` check stays for the five runtime
   exports.
4. **New rows:**
   - **M**: native Activations of different Executions may interleave, so shared handlers, executors and
     providers must be reentrant (CONC-01, with B-INTERLEAVE);
   - a note: input queued during a long `RUNNING` exchange is refused at the Kernel mailbox cap (1,024) as
     `capacity_exhausted` (MBX-01);
   - **M**: structural input errors are refused synchronously by the SDK, and lineage- or state-dependent
     rejections arrive as `ingress_result` (INGRESS-01, D01-CHK-14).

**Closure:** `bridge-inventory.test.ts` runs the extraction and member enumeration and fails on a missing row.

### D01-CHK-09 — K14-6's mapping scope

**Source:** own; BIND-01. **Location:** §11, §12 K14-6.

§11 maps `tests/conformance` exactly. My search S3 confirms 132 of 132 files and totals of 79 R, 7 P, 11 X, 20 U,
4 G and 11 S. Other maintained tests also pin behaviour that K1.4 changes, and §11 does not map them:
- `packages/kernel/tests/binding-surface.test.ts` (BIND-01);
- the 18 files of `packages/sdk/tests/`: `application.test.ts`, plus the wrapper and capture files whose
  imports the landing-zone quarantine names exactly (`kernel-landing-zone.test.ts:509–516`);
- the four example tests:
  - `patterns.test.ts` and `classification.test.ts` call refused mutators through `settleOffline`
    (`drainEffects`, `drainResumptions`, `runUntilIdle`), and `patterns.test.ts` also calls
    `app.harness.deliverExternalInput`/`resolveConfirmation` directly;
  - `app.test.ts` reads `app.harness`, and `provider-wiring.test.ts` reads `RunResult.execution`; both readers
    change under D01-CHK-11;
- `tests/conformance/architecture/builder-docs-anchor.test.ts`, which §11 marks U. It builds a fixture for
  `check-builder-docs.ts`, which D01-CHK-12 changes, so it becomes G.

Extend `legacy-mapping.json` and `mapping.test.ts` to that declared set:
- `tests/conformance/**/*.ts`;
- `packages/sdk/tests/*.ts`;
- `examples/**/*.test.ts`;
- the named Kernel pin file `packages/kernel/tests/binding-surface.test.ts`.

Each entry keeps the R/P/X/U/G/S vocabulary and its kept property.

**Closure:** `mapping.test.ts` lists the declared set at runtime and fails on a missing or extra entry.

### D01-CHK-10 — where `runUntilBlocked`'s reason and `waitingExecutionId` come from

**Source:** own. **Location:** §5 single-source table, §7 S-RUN and B-CHILD.

§5 says native lifecycle "is reported only through Outcomes and never read by the host to decide anything".
S-RUN says the `reason` "comes from Kernel state" and that `waitingExecutionId` "names the native Execution
holding the human wait". Kernel state carries only the declared subscription classes. Those cannot name the
waiting child, and they cannot order the reasons when the Driver declares both the confirmation and input
classes, which §3 allows. The legacy order was the member's own confirmation, then its user input, then its
`external.input` wait, then required-call children (`application.ts` `hostBoundary`). The design states neither
a source nor an order.

**Required:**
- With each `await` Outcome, the Driver emits one `arrokothi.bridge.pause` Emission:
  `{ pauses: [{ kind, executionId, confirmationId? }] }`, in the legacy priority order.
- The host derives `reason` and `waitingExecutionId` from the latest accepted pause Emission only, and never
  reads native state to decide.
- The 256-Emission carry of §5 must never split or defer the pause Emission (D01-CHK-14, EMIT-01).

**Closure:** B-RUN-REASON covers each reason, and the both-classes case, from accepted output. B-CHILD asserts the
child ID from the Emission.

### D01-CHK-11 — the window in which no native root exists

**Source:** own. **Location:** §3 step 1, §6, §7 S-RUN-RESULT, S-HARNESS-R.

The native root is created by the first exchange's task. These sequences need no race:
- `start` → `cancel` → `runUntilBlocked`;
- `start` → `runUntilBlocked({ timeoutMs: 0 })`;
- `start` → `app.harness.inspect(id)`.

In the first, after D01-CHK-01, no root is ever created. `RunResult.execution` is typed as a non-optional
native `ExecutionContext`, and the legacy `result()` throws `Unknown Execution` when the native record is
missing. Deprecated reads that worked straight after a legacy `start` would return `undefined`. §7 marks both
rows preserved (PD).

**Required:** choose one, and record it in the inventory:
- **(a)** The Driver creates the native root synchronously inside `start`, after the Kernel accepts creation and
  before `start` returns. The first exchange then only forwards. This needs a named failure path for a native
  creation error after Kernel acceptance, which cancels E.
- **(b)** Keep root creation in the task. Then `RunResult.execution` becomes optional, an **M** row, with a named
  reason. The deprecated reads document `undefined` before the first exchange.

I recommend (a). It keeps PD true, makes D01-CHK-01's pre-root case a plain native cancel, and preserves the legacy
"`start` then inspect" pattern. An exact `start` replay must not create a second root. Native ID = E makes a second
insert fail, so the Driver detects it.

**Closure:** B-START-CANCEL-RUN, and B-START-INSPECT under the chosen option.

### D01-CHK-12 — gates that Q1's new import breaks: builder docs and zone nesting

**Source:** own. **Location:** §2, §8, §11.

1. **`check:builder-docs` refuses the import.** `scripts/check-builder-docs.ts:81–92` reads every top-level
   `packages/sdk/src/*.ts`. It errors on any `@arrokothi/` specifier that is not a public export of its
   `manifests` list (lines 71–74), and `packages/kernel` is not on that list. §2's `application.ts`/`host.ts`
   imports of `@arrokothi/kernel` therefore fail an AGENTS.md command. The scan also does not recurse, so
   `legacy-bridge/*` is outside it.
   **Required:** admit `@arrokothi/kernel` from exactly the named SDK host files, with Q1 as the recorded reason.
   Keep refusing it from `examples/`. Either make the scan recursive or state that the K14-3 guard owns
   `legacy-bridge/`. The fixture test that covers this script becomes G (D01-CHK-09).
2. **The new zone sits inside `host-sdk`.** A `Zone` has `roots` only, with no exclusions
   (`boundary-policy.ts:17–22`). `host-sdk`'s root `packages/sdk/src` contains `legacy-bridge/` and `internal/`,
   so the measured edges of `host-sdk` and the new zone would both count the bridge files.
   **Required:** state the rule. Either add explicit exclusions or a longest-prefix rule to `Zone`, with a negative
   control that a file is attributed to exactly one zone, or root `host-sdk` at named files. Also state
   `host-sdk`'s new dependency row, which gains `@arrokothi/kernel`.

**Closure:** `npm run check:builder-docs` passes with the admitted import and refuses it from an example
(fixture). The landing-zone test gains the one-zone-per-file control.

### D01-CHK-13 — one owner question: breaking changes and dispositions outside the brief's three

**Source:** BREAK-01, INV-01 (N). **Location:** §7 F, M and N rows; brief decision 3.

Brief decision 3 says "No 0.9 breaking removal in K1.4". Owner choice 01 Q2 accepted only the mutator refusals.
Before range B, the implementer puts one question to the owner listing:
- `runtime.scheduler` refused (S-RT-SCHED);
- `runtime.maxActivationsPerRun` refused (S-RT-MAXRUN);
- `ownerExecutionId` refused (S-OWNER);
- `start` errors moving to a failed Execution (S-START-REJECT, and native creation errors unless D01-CHK-11 (a)
  is chosen);
- `Application.harness` narrowed to `LegacyHarnessView`, which breaks callers typed `Harness`, such as
  `examples/execution-kernel-minimal/app.ts:113`;
- the **N** disposition (G-PEER, G-CORE-DIRECT), which is not one of brief 01's preserve, migrate or refuse.

**My recommendation:**
- Make S-RT-MAXRUN **PD**: accepted, ignored, with a preflight warning. It bounded only the native
  `runUntilIdle` loop, so refusing it breaks configurations for no protection.
- Keep the other refusals.
- Express N as "preserved on the legacy `@arrokothi/core` entry, not routed through the Kernel".

**Closure:** an owner-choices record. The inventory uses the answers.

### D01-CHK-14 — the remaining P3 dispositions

Each becomes a maintained test or a 017 entry in the build (006 principle 4):
- **ID-01:** at the first exchange, detect an existing root and fail as `arrokothi.bridge.native_root_exists`.
  Document that keys are application-global and last one coordinator lifetime.
- **ALS-01:** a one-shot scope that answers the first `exe` request with E and throws on a second. Wrap only
  `harness.createExecution` in it.
- **EMIT-01:** state the Emission order (pause and `ingress_result` first) and how a carry interacts with new input,
  a terminal step and an `await`. Add B-VALUE cases for each.
- **HOST-01:**
  - await the dispatched exchanges' Outcomes before testing `activation_limit`;
  - on a manual clock, the host relies on re-entry and on D01-CHK-04's pumping;
  - keep a change signal for cancellation and for input from another caller;
  - keep a host-side READY set;
  - state whether `runUntilIdle` waits for in-flight work;
  - key forwarding by `activationId`.
- **INGRESS-01:** structural validation in the SDK before `submitInput`. When `waitingExecutionId ≠ E`, require
  `destination` or default it to the unique input-waiting member.
- **SIDE-01:** a 017 entry. `services.scheduler` and `services.store` remain unsupported side doors under the
  cooperative contract.
- **PUB-01:** set `"private": true` on `@arrokothi/sdk` in K1.4. A release packet removes it.
- **ACK-01:** word acknowledgment as "accounted for by the Runtime's Outcome: forwarded, or discarded by a terminal
  decision". Report each discarded reply in `ingress_result`.
- **GROW-01:**
  - a 017 entry with the attack's measurements and a long-lived SDK conversation as its trigger, assigned to K5
    retention;
  - the host loop does not call full `inspect` on every iteration. It reads only on return, and otherwise relies on
    dispatch answers and the change signal. Within the bridge's control, this removes the host's share of the
    growth.
- **Evidence fixtures (own):**
  - `tests/fixtures/packet-tools/value-cost.json` lists `packages/sdk/src` among its `source_trees`;
    `mutations.json` and `adoption.json` (746 mentions) also name SDK sources;
  - K1.3's `verification.json` preserves `docs/guides` and `.agents/skills`, which K1.4 must edit;
  - the command plan names how each is regenerated or requalified: only with the TOOLS-02 tools, in a fresh clone.

## Acceptance criteria: can each be finished?

| ID | Closes by | Finishable? |
|---|---|---|
| K14-1 | Deterministic SDK tests on a manual clock | **Yes, after D01-CHK-01, -02 and -04.** The "await (input and deadline)" case depends on the deadline anchor and the pumping points. B-STALL's "does not block" is deterministic with a barrier |
| K14-2 | Structural guards plus B-MAP | **Yes, after D01-CHK-02.** B-MAP must walk a partition. D01-CHK-02's enumerated product is that partition. The structural half (legacy-core ↛ Kernel; bridge → package root only) is sound as designed |
| K14-3 | Structural, with rejected-edge controls | **Yes, after D01-CHK-12.** The zone-attribution rule and the builder-docs admission must be stated and controlled |
| K14-4 | Deterministic over a closed inventory | **Not as written; yes after D01-CHK-08 and -13.** The closure needs a declared scope and an extraction rule, the member enumeration must cover every exported type, and the dispositions must be the owner's |
| K14-5 | Export test, guide page, child-process refusal | **Yes, after D01-CHK-06.** The re-pinned prefix and the mapped surface assertions |
| K14-6 | `mapping.test.ts` over a mapping file | **Yes, after D01-CHK-09.** The declared set must include the SDK, example and Kernel-pin tests that the packet changes |

## Owner choices: applied as written?

| Choice | Applied? | Note |
|---|---|---|
| Q1 packaging | Yes in §2 and §8 | Two consequences were not carried through: nothing makes "unpublishable" true (PUB-01), and `check:builder-docs` refuses the import (D01-CHK-12) |
| Q2 mutators refuse | Yes (§6, S-HARNESS-W) | Residual side doors: SIDE-01 |
| Q3 cascade | Yes as policy | Defeated before the root exists and mid-step (CX-01) → D01-CHK-01 |
| Q4 wait deadline | Yes as source | Anchor and enforcement points were undecided → D01-CHK-04 |
| Q5 retry keys | Yes (§7, §10) | The 64-character bound and character set match the native pattern: the longest Kernel ID is 107 of 128 characters |
| Q6 dispositions | Yes (§11) | The scope is too narrow → D01-CHK-09 |
| Q7 quiescence | Yes as policy | The predicate is undefined (QS-01) and the hung-sibling tail is unrecorded → D01-CHK-02 |
| Q8 ranges | Yes (§14) | D01-CHK-13 must be answered before range B |
| Brief decision 2A | Yes | Unmediated paths are listed as "P, unmediated" |
| Brief decision 3 | **Partly** | Q2 supersedes it for the mutators only → D01-CHK-13 |
| Brief decision 4 | Yes (§9) | Placement → D01-CHK-06 |
| Brief decision 5 | Recorded | This check and attack 01 ran on Claude Opus at the owner's prompts (provenance above) |

## Searches (declared and bounded)

- **S1, the code-side inventory (§7).**
  - Scope:
    - the runtime and type exports of `packages/sdk/src/index.ts`;
    - the members of `Application`, `RunOptions`, `RunResult` and `StartedExecution` (`application.ts`);
    - the members of `ApplicationOptions` (including `runtime`'s ten keys), `ApplicationServices`,
      `ApplicationModels` and `StartExecutionInput` (`types.ts`);
    - `CreateExecutionInput`, `DeliverExternalInputInput` and `ExecutionHandle` (`harness.ts:174–238`);
    - the 35 public methods of the `Harness` class (`harness.ts:350–1700`, found with an `awk` over the class
      body).
  - Result: every member maps to a §7 row. S-HARNESS-R's 24 readers and S-HARNESS-W's 11 mutators are exactly
    the 35 methods. **The code side is complete.**
- **S2, the documentation-side inventory.**
  - Scope: `find docs/guides -name '*.md'` (17 pages), grepped for
    `createApplication|runUntilBlocked|app\.harness|@arrokothi/sdk|harness\.`; plus the SDK README, the builder
    skill and `examples/execution-kernel-minimal/*`.
  - Result: 7 guide pages, the README, the skill and 11 example files (sources, tests and the README) name SDK or
    Harness members. §7 covers 6 pages and 4 example files → D01-CHK-08.
- **S3, the conformance mapping (§11).**
  - Scope: `find tests/conformance -name '*.ts'` against the §11 table.
  - Result: 132 = 132, the sets are identical, and the totals are 79 R, 7 P, 11 X, 20 U, 4 G and 11 S. Every
    Kernel test file an X row names exists (10 named files and 5 `waits-*` files).
- **S4, other consumers that K1.4 changes.**
  - Scope: `grep -rl "createApplication|@arrokothi/sdk|packages/sdk/src"` over `scripts`, `tests` and
    `packages`; the example tests; the import scan in `kernel-landing-zone.test.ts`.
  - Result: `binding-surface.test.ts`, the SDK tests, `check-builder-docs.ts`, `builder-docs-anchor.test.ts` and
    the packet-tool fixtures → D01-CHK-09, -12 and -14.
- **S5, native wake sources (for D01-CHK-02).**
  - Scope: `grep -rn "setTimeout|setInterval|timers/promises" packages/core/src`.
  - Result: one hit, the inline-wait yield.
- **Not searched:**
  - real-provider adapters (Gemini, Strands, MCP) beyond their port shapes;
  - custom-controller behaviour (N rows);
  - performance beyond GROW-01's shape;
  - the K1.4-gate E1 fixtures.

## What happens next

- **Design addendum.** The implementer writes the dispositions of D01-CHK-01 to D01-CHK-14 as a short delta
  (`design-02.md`). §13 gains the attack 01 corpus and this check's corpus entries, with provenance.
- **Owner decisions:** D01-CHK-11's option and D01-CHK-13's question. D01-CHK-05's and D01-CHK-14's 017 entries
  need the owner's approval (017 "Adding an entry"); this check proposes them.
- **No new full design check.** These changes stay inside the approved shape (006 "Routine corrections"). The
  independent review checks the addendum against this record. If the owner wants an earlier look at the core
  mechanism, a bounded check of D01-CHK-02's predicate alone is the useful one.
