# Design 02 — K1.4 delta after design check 01

Implementer: the K1.4 implementer's Claude Code desktop session, Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-06.
This is a short delta to [design 01](design-01.md). It disposes the required changes of
[design check 01](https://github.com/ArrokothI/arrokothi/blob/5f18c44c6e086d68311862cc95f1417a9c1f17de/docs/development/work/K1.4/design-check-01.md)
(`5f18c44c`, APPROVED WITH REQUIRED CHANGES) one by one. It also adds the corpus of
[attack 01](https://github.com/ArrokothI/arrokothi/blob/cffb2c81244f7f0955e9b20d30fac70e8a1e1e5d/docs/development/work/K1.4/attack-01.md)
(`cffb2c81`) and of the check to design 01 §13, with provenance.
- **Subject of the check:** design 01 at `6831b112`. Base B is `608f9ece`.
- **Owner decisions in force:** [owner choices 01](owner-choices-01.md) (Q1–Q8) and
  [owner choices 02](owner-choices-02.md) (A–D, plus "Accept all" of the check's required changes).
- **Precedence:** design 01 stands except where this note changes it. Where they differ, this note wins.
- **Unchanged:** the shape, the ownership and the stop conditions. No Kernel semantic change and no new Kernel
  entry is needed. The Driver's second caller (D01-CHK-03) is host configuration, not a new entry.
- **Not merged:** the attack and check records stay on their own branches. This note links to them at their pinned
  commits.

## 1. Dispositions

### D01-CHK-01 — one lineage-termination rule

**Adopted.** Once Kernel E is terminal, or a cancellation request for E has reached the Driver, the Driver starts no
native work for E and ends the native lineage.
- **Flag.** The Driver keeps a sticky per-Execution `ended` flag. `requestCancellation` sets it synchronously. The
  Driver also sets it itself before any Driver-originated `fail`.
- **Where it is checked.** `start` checks the flag after it creates the native root: with the flag set, it cancels
  the new root at once (owner choice A moved root creation into `start`). The exchange task checks the flag before
  each forward, and before and after each `runOnce`. With the flag set, the task runs the cascade, stops without
  stepping, and submits nothing.
- **Cascade.** The cascade cancels every non-terminal member of the native lineage, using the native store's
  child links. It runs again after the current step returns, so a child created during that step is cancelled
  too.
- **Driver-originated ends.** Before every Driver-originated `fail` (`value_unrepresentable`, `native_error`,
  `initial_input_rejected`, `native_session_missing`, `wait_deadline_expired`), the Driver sets the flag and runs
  the cascade. After a root `COMPLETED`, it cancels any live descendant before it submits `complete`.
- **017.** L-20 gains the legacy fact: a native Activation already running dispatches its proposed Effects before
  the Harness reads the cancellation (`harness.ts:897` before `:956`). §4 below has the text.
- **Tests:** B-CANCEL-PREROOT, B-CANCEL-MIDSTEP-CHILD and B-FAIL-CASCADE (§3).

### D01-CHK-02 — a positive human-wait predicate

**Adopted.** It replaces design 01 §3's quiescence paragraph and its "in flight" and "stuck" rows. After every step
and every forward, the Driver classifies the lineage with one total function of native store records. It never
reads the processors' private `inFlight` sets or the FIFO.

| Lineage records | Decision |
|---|---|
| Root `COMPLETED` | `complete` (after the D01-CHK-01 cascade) |
| Root `FAILED` | `fail` with the native failure (details capped, D01-CHK-05) |
| Root `CANCELLED` with no Kernel cancellation | `fail` `arrokothi.bridge.native_cancelled` |
| Any non-terminal member `READY` in the store | `continue` |
| Every non-terminal member is in an awaitable human pause | `await`, with the pause Emission (D01-CHK-10) |
| Anything else | open: no Outcome; the task waits on the lineage `enqueue` notification |

A member is in an **awaitable human pause** when it is `WAITING` and one of these holds:
- its wait is an `event` wait whose wake includes `external.input`;
- it has a pending confirmation whose `PendingOperation` is `not_dispatched`;
- it waits only on `spawn_execution` pending operations, and each child they name is itself in an awaitable human
  pause.

A `use_capability` or `write_memory` pending operation that is `dispatched` with no outcome, or a `pending`
`ControllerResumption`, is in flight, and in-flight work is never awaitable. `effectKind` separates a capability
call from a `call` child. "Runnable" reads the store's `READY`, not the FIFO, so the enqueue window that attack 01
found classifies as `continue`.

**Soundness.** The stock controllers have no native timer. The only `setTimeout` in `packages/core/src` is the
inline-wait yield (`reference/inline-wait.ts:44`). So once every member is in a human pause, only Kernel input can
advance the lineage. The build re-runs that search as a maintained guard (B-NATIVE-TIMERS).

**Q7's limit gains its tail:** if a sibling call never settles, the confirmation is never surfaced, and only
`executionDeadline` bounds the run. `humanWaitDeadlineMs` applies only to a declared wait.

**Tests:** B-QUIESCE-CELLS, B-CHILD-CONFIRM, B-SLOWCAP-NO-WAIT, B-APPROVAL-INFLIGHT, B-ENQUEUE-WINDOW and
B-NATIVE-TIMERS.

### D01-CHK-03 — a control-scoped caller for the protocol-failure fallback

**Adopted.** The Driver holds a second trusted caller, `{ namespace: "arrokothi.sdk", scopes: ["application"],
controlScopes: ["application"] }`. It uses that caller only for `reportProtocolFailure`, never returns it from the SDK,
and never uses it for takeover. Design 01 §2's "It has no `controlScopes`" now describes the public host caller only.
`requestTakeover` stays refused, because the Driver has no `isSafeToReplace`. **Test:** B-PROTOCOL-HOLD.

### D01-CHK-04 — deadline anchor, pumping points, absolute Execution deadline

**Adopted.**
1. **Anchor.** `humanWaitDeadlineMs` bounds a native pause. Progress `arrokothi.legacy-bridge.progress/1` becomes
   `{ v: 1, root, emissionCursor, pauses: [{ id, deadline }] }`. Nothing has shipped, so the codec name is unchanged.
   - **Pause IDs.** A confirmation pause is `confirmation:<confirmationId>`. An input pause is
     `input:<memberId>:<n>`, where `n` is the member's native transition count when the pause was first observed.
     A new Activation of the member therefore starts a new pause.
   - **Deadlines.** At each `await`, a pause still open keeps its stored deadline. A new pause gets
     `now + humanWaitDeadlineMs`. The declared wait carries the earliest of them. Closed pauses are dropped.
   - **Effect.** A stray input that wakes the Kernel wait but leaves the pause unchanged re-declares the same
     absolute deadline, and W-2 expires it at registration when it is already due.
   - Without `humanWaitDeadlineMs`, each deadline is `null` and the wait has none.
2. **Pumping.** The host fires due timers at the start of every host entry that can lead to an accepted decision:
   `start`, `input`, `resolveConfirmation`, `cancel`, `runUntilBlocked` and `runUntilIdle`. The guides say that a
   deadline takes effect at the next host call (L-22, at a stated point).
3. **Absolute Execution deadline.** `start({ executionDeadline })` takes a `Date`, an absolute instant on the
   `runtime.clock` scale, and passes `getTime()` to creation. An exact retry with the same instant replays. A
   changed one conflicts, as creation's canonical content requires.

**Tests:** B-DEADLINE-STRAY, B-DEADLINE-AT-INGRESS and B-START-RETRY-DEADLINE.

### D01-CHK-05 — values over the core limits

**Adopted: option (b) now, option (a) as the 017 fix.**
- **New M row, S-VALUE-LIMITS:** "a native result, Emission or failure detail over the core limits now fails the
  Execution as `arrokothi.bridge.value_unrepresentable`, after native work ran." The guide text and the 017 entry
  (§4) go with it. The entry's trigger is a real application hitting the limit, and its fix is the locator form,
  which is additive to the result shape.
- **Failure details are capped.** When a native failure's `details` cannot be represented, the Driver drops them and
  records `detailsOmitted: true`. It also truncates `message` to 4,096 characters. The native failure `code` always
  survives.
- **Input side.** An `input`, `resolveConfirmation` or `start` payload that the wrapper cannot capture is refused
  synchronously, before any Kernel or native record, with a named error carrying the `ValueIssue`s.

**Tests:** B-VALUE-RESULT-70K, B-VALUE-ROWS-5000, B-VALUE-FAIL-DETAILS and B-VALUE-INPUT-REFUSED.

### D01-CHK-06 — BINDING-01 surface pins; L-01 check placement

**Adopted.** The check stays inside `withSerializerEnvironment`, immediately before the dependency call, plus once in
`createApplication`. The prefix hash is re-pinned, and the report shows the diff. The three assertions of
`binding-surface.test.ts` are mapped in K14-6 with these kept properties:
- the capture graph imports no Kernel;
- the public runtime keys are the new exact list;
- the prefix is byte-identical except for the L-01 call.

§9's residual stays "genuine intrinsics at SDK module load". The B-WRAPPER child-process refusal adds a shadow
installed by a capture-time side effect. This is built in range B (§5).

### D01-CHK-07 — a contract-conforming lineage scheduler

**Adopted.** The lineage scheduler is one FIFO plus a lineage-filtered claim:
- a `lineage:<E>` worker claims the oldest entry of E's lineage;
- any other worker claims the oldest entry overall. The bridge never uses such a worker.

`enqueue(id)` reads the native record's `rootExecutionId`. With no record, `id` is its own lineage. Each enqueue
resolves that lineage's notification promise. **Tests:** B-SCHED (the published suite, unchanged) and B-LINEAGE.

### D01-CHK-08 — K14-4's closure

**Adopted as written, built in range B.**
- **Declared scope:**
  - every page reachable from `docs/guides/README.md`;
  - `packages/sdk/README.md`;
  - `.agents/skills/arrokothi-agent-builder/SKILL.md`;
  - every file under `examples/execution-kernel-minimal/`.
- **Mechanical extraction.** `bridge-inventory.test.ts` extracts every backticked SDK or Harness member and every
  linked example file. It fails on an extracted item with no row.
- **Member enumeration.** The TypeScript API enumerates the members of every exported interface. `Object.keys`
  still covers the runtime exports.
- **New rows:**
  - **S-INTERLEAVE (M):** native Activations of different Executions may interleave, so shared handlers, executors
    and providers must be reentrant (B-INTERLEAVE);
  - **S-MAILBOX-CAP (note):** input queued during a long `RUNNING` exchange is refused at the Kernel mailbox cap
    (1,024) as `capacity_exhausted`;
  - **S-INGRESS-SYNC (M):** structural input errors are refused synchronously by the SDK. Lineage- or
    state-dependent rejections arrive as `ingress_result` (D01-CHK-14).

### D01-CHK-09 — K14-6's mapping scope

**Adopted, built in range B.** `legacy-mapping.json` and `mapping.test.ts` cover a declared set:
- `tests/conformance/**/*.ts`;
- `packages/sdk/tests/*.ts`;
- `examples/**/*.test.ts`;
- `packages/kernel/tests/binding-surface.test.ts`.

The test lists the set at runtime and fails on a missing or extra entry. `architecture/builder-docs-anchor.test.ts`
becomes **G**. Range A migrates the SDK and example tests the switch breaks (§5), and each migration is recorded in
the mapping with its kept property.

### D01-CHK-10 — the source of `reason` and `waitingExecutionId`

**Adopted.**
- With each `await` Outcome, the Driver emits one `arrokothi.bridge.pause` Emission:
  `{ pauses: [{ kind: "confirmation" | "user_input" | "input", executionId, confirmationId? }] }`.
- The pauses are in the legacy priority order: for each member, its own confirmation, then its user input, then its
  `external.input` wait; a member's required-call children follow it, depth first, as `hostBoundary` reads them.
- The host derives `reason` and `waitingExecutionId` only from the latest accepted pause Emission, from its first
  entry. It never reads native state to decide.
- The pause Emission travels in the `await` Outcome itself, so the carry can never split or defer it (D01-CHK-14,
  EMIT-01).

**Tests:** B-RUN-REASON (each reason, plus the both-classes case) and B-CHILD (the child ID comes from the Emission).

### D01-CHK-11 — the root-less window (owner choice A)

**Option (a).** `start`:
1. validates the request synchronously: preflight, keys and payload capture;
2. creates E through the Kernel, atomically with the initial input;
3. **on a replay** (`replayed: true`), returns the existing E. It does no native work, does not cancel, and never
   fails because of native state. If this application is still creating that root, it first awaits the creation and
   ignores the creation's error;
4. **on a new creation**, creates the native root inside the one-shot root-identity scope, from the pinned ref and
   parameters. If the native creation throws, `start` cancels E through the Kernel and throws
   `ApplicationStartError`. Its code is `arrokothi.bridge.native_root_exists` when the root already existed (ID-01),
   and `arrokothi.bridge.native_creation_failed` otherwise, with the native error as `cause`;
5. applies D01-CHK-01's flag check, then returns.

The first exchange forwards the initial input, and that is all it adds. A task whose root creation is still pending
awaits it. **Tests:** B-START-CANCEL-RUN, B-START-INSPECT, B-START-REPLAY and B-ROOT-EXISTS.

### D01-CHK-12 — builder docs and zone nesting

**Adopted.**
1. **`check:builder-docs`.** The SDK scan becomes recursive over `packages/sdk/src`. It admits `@arrokothi/kernel`
   only from an exact list of SDK files, the same list the K14-3 quarantine names, with Q1 as the recorded reason.
   It keeps refusing the Kernel from `examples/`, and a fixture control in `builder-docs-anchor.test.ts` shows the
   refusal. The script also errors unless `packages/sdk/package.json` has `"private": true` (owner choice D).
2. **Zone attribution by longest prefix.** `boundary-policy.ts` gains `zoneOf(file)`: a file belongs to the zone
   whose matching root is longest. Two zones with an equal-length matching root are refused. The measured-edge code
   uses it. `host-sdk` keeps the root `packages/sdk/src`; `legacy-bridge` takes `packages/sdk/src/legacy-bridge`.
   The landing-zone test gains a one-zone-per-file control. The dependency table gains the measured rows:
   `host-sdk` gains `@arrokothi/kernel`, and `legacy-bridge` gets its own row.

### D01-CHK-13 — breaking changes (owner choice B)

**Owner choice B.**
- S-RT-SCHED, S-OWNER and S-START-REJECT stay as design 01 states them. Native creation errors are not moved to a
  failed Execution: under choice A, they throw from `start` after E is cancelled (D01-CHK-11).
- **S-RT-MAXRUN becomes PD:** accepted and ignored, with a preflight warning `option_ignored`.
- `Application.harness` is narrowed to `LegacyHarnessView`.
- **N** reads "preserved on `@arrokothi/core`, not routed through the Kernel" for G-PEER and G-CORE-DIRECT.

### D01-CHK-14 — the remaining P3 dispositions

**Adopted.** Each becomes a maintained test or an approved 017 entry (§4).
- **ID-01:** a root that already exists is detected in `start` (D01-CHK-11). The guides say that keys are
  application-global and last one coordinator lifetime. **Test:** B-ROOT-EXISTS.
- **ALS-01:** a one-shot scope on prefix `ID_PREFIXES.execution` (`"exe"`). It wraps only
  `harness.createExecution`. The first `exe` request gets E, and a second throws. **Test:** B-ROOTID.
- **EMIT-01:**
  - **Order.** Each Outcome's Emissions are the `ingress_result` for its forwarded batch, then the pause Emission
    when `next` is `await`, then native Emissions from the cursor, up to 256 in all.
  - **Carry.** An exchange with a carry forwards its batch, runs no step, and submits as much of the carry as fits.
    It classifies the lineage as usual. A terminal or `await` decision is submitted only when the remaining carry
    fits in that Outcome; otherwise `next` is `continue`.
  - **Tests:** B-VALUE-CARRY-INPUT, B-VALUE-CARRY-TERMINAL and B-VALUE-CARRY-AWAIT.
- **HOST-01** (replaces design 01 §4's loop):
  - At `maxActivations`, the host awaits the Outcomes of the exchanges it dispatched before it returns
    `activation_limit`.
  - Dispatch walks a host-side candidate set, not a scan. An Execution joins it on creation, on accepted input, on
    an accepted Outcome with `next: continue` and on an accepted fire. A `not_ready` answer removes it.
  - The idle wait is the change signal, raced against `pollIntervalMs` and the host limits. The signal resolves on
    any accepted Outcome or host-entry decision. Each wakeup pumps timers again, so a manual clock needs only a host
    call or a slice.
  - `runUntilIdle` returns when the candidate set is empty and no exchange is mid-step. Like the legacy call, it does
    not wait for in-flight native work.
  - The Driver forwards each Activation's batch once, keyed by `activationId`.
  - The loop reads `inspect` only to build its return value (GROW-01).
  - **Tests:** B-CONTINUE and B-IDLE.
- **INGRESS-01:**
  - The SDK validates the label, the `destination` pattern and the payload's capture before `submitInput`, and it
    refuses structural errors synchronously.
  - When `destination` is absent and the latest pause Emission names exactly one input-waiting member, that member
    is the default. When several are waiting, `destination` is required.
  - Lineage membership and stale decisions remain `ingress_result` outcomes.
  - **Tests:** B-INGRESS-SYNC and B-INPUT-DEFAULT-DEST.
- **SIDE-01:** a 017 entry. `services.scheduler` and `services.store` remain unsupported side doors under the
  cooperative contract.
- **PUB-01:** owner choice D. `"private": true` is set in range A, and `check:builder-docs` guards it.
- **ACK-01:** acknowledgment means "accounted for by the Runtime's Outcome: forwarded, or discarded by a terminal
  decision". The `ingress_result` reports each discarded reply as `discarded`. **Test:** B-ACK-DISCARD.
- **GROW-01:** a 017 entry with attack 01's measurements and the host-loop change above.
- **Evidence fixtures:**
  - **Changed by K1.4:** `value-cost.json` (whose `source_trees` include `packages/sdk/src`), `mutations.json` and
    `adoption.json`. The command plan names each one that the change touches and how it is requalified: with the
    TOOLS-02 tools only, in a fresh clone.
  - **Preserve list:** `verification.json` does not preserve `docs/guides`, `.agents/skills`, `packages/sdk` or
    `examples`, which K1.4 edits.

## 2. What changes in design 01

| Design 01 | Changed by |
|---|---|
| §2 host caller sentence; components table (root scope prefix `exe`, Driver's second caller) | D01-CHK-03, D01-CHK-14 ALS-01 |
| §3 step 1 (root creation moves to `start`), step 2 and the mapping table (predicate), deadline paragraph | D01-CHK-11, D01-CHK-02, D01-CHK-04 |
| §4 host loop, pumping points and concurrency | D01-CHK-04, D01-CHK-14 HOST-01 |
| §5 progress shape, Emission order and carry, acknowledgment wording, value limits | D01-CHK-04, -05, -14 |
| §6 Q3 paragraph | D01-CHK-01 |
| §7 rows S-RT-MAXRUN, S-START, S-START-REJECT, S-RUN, S-RUN-RESULT, N rows; new S-VALUE-LIMITS, S-INTERLEAVE, S-MAILBOX-CAP, S-INGRESS-SYNC | D01-CHK-05, -08, -10, -11, -13 |
| §8 zone rule and builder-docs admission | D01-CHK-12 |
| §9 placement and re-pin | D01-CHK-06 |
| §11 mapping scope | D01-CHK-09 |
| §12 K14-2 and K14-4 arguments | D01-CHK-02, -08 |
| §13 corpus | §3 below |
| §14 ranges | §5 below |
| §15 017 rows | §4 below |

## 3. Corpus additions to design 01 §13

Each is a maintained test in `packages/sdk/tests/` unless noted. Provenance is the finding or check item that
introduced it.

| ID | Case | Provenance |
|---|---|---|
| B-CANCEL-PREROOT | A cancellation accepted while `start` creates the root, or between dispatch and the task: no native Activation runs and the tool sink stays at 0 | Attack 01 CX-01; check D01-CHK-01 |
| B-CANCEL-MIDSTEP-CHILD | A child spawned by the step that was running when the cancellation arrived ends `CANCELLED` | Attack 01 CX-01 |
| B-FAIL-CASCADE | Each Driver-originated `fail`, and a root `COMPLETED` with a live descendant, leaves no live native member | Check D01-CHK-01 (TERM-01) |
| B-QUIESCE-CELLS | Table-driven: `lifecycle × waitingFor.kind × pending-operation effectKind/dispatch/outcome × resumption state`; each cell maps to `await`, `continue`, a terminal step or open | Attack 01 QS-01; check D01-CHK-02 |
| B-CHILD-CONFIRM | A `call` child's confirmation surfaces as `await` with the child's ID | Attack 01 QS-01 |
| B-SLOWCAP-NO-WAIT | A slow capability keeps the exchange open with no Kernel wait | Attack 01 QS-01 |
| B-APPROVAL-INFLIGHT | An approved confirmation whose tool is still dispatching keeps the exchange open | Attack 01 QS-01 |
| B-ENQUEUE-WINDOW | A scheduler wrapper that delays `enqueue` after the settle commit yields no `await` | Attack 01 QS-01 |
| B-NATIVE-TIMERS | Structural: `packages/core/src` has exactly one native timer, the inline-wait yield | Check D01-CHK-02 (S5) |
| B-PROTOCOL-HOLD | A forced refusal of the Driver's `fail` leaves a protocol-failure hold | Attack 01 PF-01; check D01-CHK-03 |
| B-DEADLINE-STRAY | Stray inputs before the deadline do not extend it | Attack 01 DL-01 |
| B-DEADLINE-AT-INGRESS | With the manual clock past the deadline, `app.input` lets the timeout win and the input stays queued | Attack 01 DL-02 |
| B-START-RETRY-DEADLINE | An exact retry with the same absolute `executionDeadline` replays | Check D01-CHK-04 |
| B-VALUE-RESULT-70K, B-VALUE-ROWS-5000, B-VALUE-FAIL-DETAILS | Over-limit result, rows and failure details: named failure, and the native code survives | Attack 01 VAL-01 |
| B-VALUE-INPUT-REFUSED | An over-limit input is refused synchronously with no record | Check D01-CHK-05 |
| B-SURFACE | The re-stated `binding-surface.test.ts` assertions (range B) | Attack 01 BIND-01; check D01-CHK-06 |
| B-WRAPPER (added case) | A shadow installed by a capture-time side effect is refused (range B) | Check D01-CHK-06 |
| B-SCHED, B-LINEAGE | The published Scheduler suite, unchanged, plus the lineage filter's own cases | Attack 01 SCHED-01; check D01-CHK-07 |
| Inventory extraction | `bridge-inventory.test.ts` extraction and member enumeration (range B) | Attack 01 INV-01; check D01-CHK-08 |
| B-INTERLEAVE | Two Executions sharing a handler observe interleaved calls | Attack 01 CONC-01 |
| Mapping set | `mapping.test.ts` over the declared set (range B) | Check D01-CHK-09 |
| B-RUN-REASON | Each `runUntilBlocked` reason, and the both-classes case, from accepted output | Check D01-CHK-10 |
| B-START-CANCEL-RUN, B-START-INSPECT, B-START-REPLAY | The root exists when `start` returns; `start` → `cancel` → `runUntilBlocked`; a replay does no native work | Check D01-CHK-11 |
| Builder-docs and zone controls | The Kernel import is refused from an example; each file is attributed to exactly one zone | Check D01-CHK-12 |
| B-ROOT-EXISTS | A key whose native root already exists: E is cancelled and `start` throws `native_root_exists` | Attack 01 ID-01 |
| B-ROOTID (one-shot) | The scope answers one `exe` request with E and throws on a second | Attack 01 ALS-01 |
| B-VALUE-CARRY-INPUT, -TERMINAL, -AWAIT | The carry with new input, with a terminal step and with an `await` | Attack 01 EMIT-01 |
| B-CONTINUE (ordering), B-IDLE | `activation_limit` returns only after dispatched Outcomes; `runUntilIdle` does not wait for in-flight work | Attack 01 HOST-01 |
| B-INGRESS-SYNC, B-INPUT-DEFAULT-DEST | Synchronous structural refusal; the default destination is the unique input-waiting member | Attack 01 INGRESS-01 |
| B-ACK-DISCARD | A reply discarded by a terminal decision is reported as `discarded` | Attack 01 ACK-01 |
| Growth probe | A bounded performance observation recorded in 017, not a pass/fail test | Attack 01 GROW-01 |

## 4. 017 entries (owner choice C)

These are added in the build, numbered in register order (provisionally L-29 to L-35). L-01 and L-20 are amended.

| Entry | Not guaranteed | Why acceptable now | Trigger | Fix packet | Source |
|---|---|---|---|---|---|
| L-01 (narrowed) | Wrapper fidelity when a host replaces both the global property and the lexical binding before the SDK loads | The startup and in-window checks refuse every later replacement or shadow | Untrusted same-process wrapper use | Realm hardening or isolation | Design 01 §9; D01-CHK-06 |
| L-20 (amended) | For the legacy Driver, a native Activation already running dispatches its proposed Effects before the Harness reads the cancellation | Legacy behaviour, unchanged by the bridge; the Driver starts no new native work after the request | A Driver needs a richer stop protocol | R1 | D01-CHK-01 |
| L-29 | That a legacy-Driver acknowledgment means native processing. It means accounted for by the Outcome: forwarded into the native mailbox, or discarded by a terminal decision and reported in `ingress_result` | The native Runtime keeps its own session store (managed native job) | A consumer needs processing receipts | R1 | Design 01 §15; ACK-01 |
| L-30 | Takeover of a legacy-Driver exchange | The in-process native Runtime has no exclusion protocol, so takeover is refused (`unsafe_replacement`) | A host restart or a stuck exchange that needs a new attempt | K3 | Design 01 §15 |
| L-31 | Prompt surfacing of a human pause while sibling native work is in flight, or ever if that work never settles. The Execution stays `RUNNING` with no Kernel wait, and only `executionDeadline` or cancellation bounds it | Q7: a wait declared earlier would strand native results (L-21) | A real application needs earlier surfacing | R1 | Design 01 §15; Q7; D01-CHK-02 |
| L-32 | That `Application.harness` reads agree with Kernel state. They are native diagnostics; `app.inspect` is authoritative | Deprecated for one release (owner decision 3) | Removal in 0.9 | The 0.9 removal packet | Design 01 §15 |
| L-33 | Native values over the core limits. A result, Emission or failure detail over them fails the Execution after native work ran | Rare in current applications; the failure is named, and the code survives | A real application hits the limit | R1: carry oversize values by locator (additive) | D01-CHK-05; VAL-01 |
| L-34 | That `app.services.scheduler` and `app.services.store` cannot advance a lineage outside the Driver | Cooperative contract (L-02); the guides call them unsupported for writes | A real caller writes through them | R1 | D01-CHK-14 SIDE-01 |
| L-35 | Bounded Kernel cost per exchange over a long Execution. The Kernel's per-turn cost grows with history (attack 01 measured about 2 ms per turn at turns 0–500 and about 15 ms per turn at turns 1,500–2,000), and that work is synchronous | The bridge's host loop adds no per-iteration `inspect`; retention is K5's | A long-lived SDK conversation | K5 retention | D01-CHK-14 GROW-01 |

## 5. Ranges after this delta

Design 01 §14 had the switch of `createApplication` to the bridge in range A, and the example and SDK-test
migration in range B. A C must pass the full verify, so the migration that the switch forces moves into range A.
- **Range A, the bridge and the switch (K14-1, K14-2, K14-3):**
  - the Driver, lineage scheduler, root-identity scope, codec and host loop;
  - every public `start`/run/input/confirmation/cancel/inspect method;
  - the deprecated view with Q2's refusals, and the option dispositions (S-RT-SCHED, S-RT-MAXRUN, S-OWNER);
  - PUB-01, the builder-docs admission and the zone rule;
  - migration of the maintained SDK and example tests and the example sources that the switch breaks.
- **Range B, closure and documentation (K14-4, K14-5, K14-6):**
  - the inventory test, the wrapper export with the L-01 check, and the mapping file and test with the X-row header
    notes;
  - the guides, the SDK README and the builder skill;
  - Layer 3, BASELINE, the 017 entries in §4 and the reference index.

One independent review still covers both ranges (Q8). As owner choices 02 directs, Packet verify runs in CI on the
first C, and again on the C that the review binds.
