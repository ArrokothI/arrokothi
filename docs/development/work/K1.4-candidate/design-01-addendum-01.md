# Design 01, addendum 01 — K1.4-candidate

Coding agent: Claude Code desktop, Claude Fable 5.2 (`claude-fable-5-2`), 2026-11-14. This addendum disposes
[design check 01](https://github.com/ArrokothI/arrokothi/blob/e06984a9573efd1524692ab74332eb7744941bcf/docs/development/work/K1.4-candidate/design-check-01.md)
(Codex GPT-6, `e06984a9573efd1524692ab74332eb7744941bcf`; APPROVED WITH REQUIRED CHANGES D01-CHK-01..09 of
[design 01](design-01.md) at `c237db58`) under [owner choice 02](owner-choice-02.md). Design 01 stays as written;
where the two differ, this addendum governs. The build follows with no new design check
([006](../../006-development-process.md): routine corrections inside an approved design).

Ownership is unchanged: test-side adapter code and a deterministic fake Runtime behind a fake Driver. Kernel
source is not edited.

## A1. Dispositions

| Finding | Disposition |
|---|---|
| D01-CHK-01 | **Taken.** Q1 a by command capability (§A2). The lost scope is stated: 51 of 142 steps, with the refused schedules' boundary rows, in the README and a 017 entry. No claim that a trusted ingress alone makes the three pass: `cited-decision-edges` also names Events by identity before their ingress. The gate change is the owner's ([owner choice 02](owner-choice-02.md) item 8). |
| D01-CHK-02 | **Taken.** Q2 b as a declared representation exception (§A4). Design 01 §2 rule 3 is amended by it. Q2 a is recorded in 017 as the root fix. |
| D01-CHK-03 | **Taken.** Q3 b with the exact convention of §A5, and the witnesses it asks for. Design 01's phrase "the field comment's plainest reading" is withdrawn: the comment fixes no clearing event. |
| D01-CHK-04 | **Deferred to the K2/E2 gate** by owner choice 02. Design 01 §2.3's unconditional claim is corrected (§A6). A witness test pins what the candidate reports today. |
| D01-CHK-05 | **Taken.** Q4 limits recorded in 017 and the README. Ledger assertions are kept. KC-1's "every field" is narrowed for `effectIntents`. The bounded projections (`waitEndedReadiness`, `recoveryHold`, `emissions`) are recorded. |
| D01-CHK-06 | **Taken**, all four items (§A3, §A7, §A8). |
| D01-CHK-07 | **Taken.** Q5 and Q6 as checked (§A9). Design 01 §2.5's rationale is corrected: start 1 is a convention, not a need of the corpus. |
| D01-CHK-08 | **Taken.** The README states the pin contract E1 must enforce (§A10). Design 01 §5's "by digest or by the commit" is withdrawn. |
| D01-CHK-09 | **Taken**, with one stated deviation on where the ablations live (§A11). |

## A2. Capability preflight (Q1 a)

`begin` walks `scenario.steps` and reads, for each step, only `command.kind`, and for `accept_event` only
`command.event.category`. A command is supported when its kind is one of the twelve and, for `accept_event`, its
category is `application_input`. The first unsupported command makes `begin` return a refusal that names the
scenario, the step index, the kind and category, and 017 L-21.

- No scenario ID is compared. A scenario renamed with the same commands gets the same answer.
- The preflight decides nothing else: no selector match, envelope validity, replay or acceptance.
- Nothing from the preflight is kept. `apply` uses only the command it is handed.
- `apply` keeps its own guard: an unsupported command reaching it throws.

## A3. Aliases and scoping (D01-CHK-06 items 2 and 3)

Six families, each with its own table: Execution, input Event (carried in the payload, so it has no table),
timeout Event, wait generation, and the three the runner relates (receipt, Activation ID, writer epoch), which the
candidate reports untranslated.

- **Wait generations and timeout Events are keyed by Execution.** Generation numbers restart at 1 in every
  Execution. The same holds for rejection memory (§A5), the grant store (§A9) and the pending-timer lookup.
- **Both directions are kept, and nothing is overwritten.** A binding is made only when the name and the Kernel
  ID are both unbound. A Kernel ID that already has a name is reported under that name. A Kernel ID with no name
  is reported in the Kernel's spelling, marked as such. Either way a wrong identity is a visible literal
  difference. A replay or a refusal never rebinds.
- The payload `{ eventId, correlation? }` makes content comparison match the fixture's. It supplies no trusted
  Event provenance.

## A4. The unnamed timeout Event (Q2 b)

A timeout mailbox entry with no alias from a `deliver_timer` command is reported as `to-<name>`, where `<name>` is
the laboratory name of **that entry's own** `waitGeneration` in **its own** Execution. If that generation has no
laboratory name, the Kernel's spelling is reported. The candidate never creates an Event, never reorders a list
and never uses a generation other than the entry's. This is laboratory naming, not a Kernel-returned ID, and it
is an exception to design 01 §2 rule 3. It does not promise that another `/1` schedule with a differently spelled
unnamed timeout would pass.

## A5. The `rejection` convention (Q3 b)

An owner-adopted fixture observation convention, not a Kernel rule.

- **Episode key**, per Execution: `(state, activationId, writerEpoch)` from the Kernel view after the command;
  the last two are `null` when no exchange is open.
- **Memory**, per Execution: the last key and at most one refusal.
- **After each command**, for the Execution it addresses, in this order: (1) if the key changed, drop the stored
  refusal and store the new key; (2) if the Kernel refused this command and the refusal is reportable, store it;
  (3) report the stored refusal, or `null`.
- **Reportable:** a Kernel refusal that names the Execution, in answer to `create`, `create_retry`,
  `accept_event`, `submit_outcome` or `resubmit_outcome`. Its `classification` and `reason` are the Kernel's,
  verbatim. A `terminal_destination` answer to `accept_event` is reported as `ingressRefused` and is not stored.
- So an accepted input, an `inspect` and an ordinary redelivery keep a stored refusal; a dispatch, an accepted
  Outcome, a takeover and a cancellation drop it; a command on another Execution cannot touch it.

Witnesses in the build: the two corpus transitions; two Executions with independent memory; a takeover drops; an
accepted input, `inspect` and redelivery keep.

## A6. Acknowledgment order (D01-CHK-04, deferred)

`acknowledged` is `view.acknowledged`, which the Kernel lists in acceptance order. The fixture's
`cited-decision-edges` steps 14–20 use cumulative acknowledgment order instead. The twelve supported schedules do
not distinguish the two. The candidate adopts no unstated fixture convention: the choice between reading
`view.exchanges` and revising the fixture's order contract goes with the K2 unblock (017). One witness test builds
the older-backlog, newer-wake, older-acknowledged-later case through subscriptions and pins both orders the
Kernel exposes.

## A7. The encoder (D01-CHK-06 item 1)

Design 01's sentence "an encoder defect is refused, not absorbed" is withdrawn. Kernel validation checks the
bytes it gets, not the value an encoder lost.

- **Domain.** `null`, booleans, finite numbers, well-formed strings, dense arrays, and objects whose prototype is
  `Object.prototype` or `null` with only own enumerable string-keyed data members. Anything else throws: `NaN`,
  infinities, `undefined` anywhere, a hole, a lone surrogate, an accessor, a symbol key, another prototype.
- **Form.** RFC 8785: members sorted by UTF-16 code units, ECMAScript number and string serialization, no
  whitespace, arrays and members preserved. An own `__proto__` member is kept as a member.
- **Self-check.** Every encoding is decoded again and compared structurally with its input; a difference throws.
- **Tests.** Golden vectors (numeric-looking keys, own `__proto__`, key order, `-0`, escapes) and the refusals.
- Each Effect proposal is encoded whole, one byte root per proposal. It is not a general-purpose wrapper and is
  written here, with no third-party code.

## A8. Kernel answers (D01-CHK-06 item 4)

`inspect` returns a `Result`; a refusal throws. `recover` and `takeover` read the open exchange from a view taken
**before** the command, then observe after it. One rule replaces design 01's two:

| Command | Projected as an Observation | Throws |
|---|---|---|
| `create`, `create_retry`, `accept_event`, Outcome commands | acceptance; a refusal naming the Execution (§A5) | a refusal naming no Execution |
| `dispatch`, `redeliver_dispatch`, `takeover`, `recover` | acceptance; `recover` with `changed: false` | any refusal |
| `accept_cancellation` | `changed: true`; `changed: false` on an Execution already ended | any refusal |
| `deliver_timer` | `expired`, `duplicate`, `stale`, `not_due` (the Kernel's own no-change answers) | `unknown`, `clock_unavailable`; a generation name the Kernel never issued |

A submitted Outcome keeps the coordinates it was given and presents the grant delivered for that attempt. A stale
proposal is never repaired with current coordinates or the current grant.

## A9. Fake Driver and clock (Q5, Q6)

- Grants are stored by (Execution, Activation ID, writer epoch) and never removed, so stale submissions and
  replays present their own. `delivered()` is reported at once; only a later `apply` submits an Outcome.
- `isSafeToReplace` is `true` because this fake has no native session and no work of its own. It shows nothing
  about a real Driver's takeover (017).
- `requestCancellation` records a request. It is not evidence of physical interruption.
- **Clock.** It starts at 1, a reproducibility convention the corpus does not need. For `deliver_timer`, the
  candidate looks up `pendingTimers()` for exactly that Execution, kind and generation; if listed, the clock
  becomes `max(now, deadline)`. It then calls `fireTimer` in every case, a known stale generation included. The
  adapter never decides expiry. It covers the fixture's fires only, not early fires or Execution deadlines.

## A10. Locator and pin contract (D01-CHK-08)

The locator of design 01 §5 stands. The README tells E1 that recording a commit is not verification, and that
before importing the subject its separately released loader must verify:

- the repository, the full subject revision and its acceptance/integration provenance; the module path, the
  export name, `KERNEL_CANDIDATE_VERSION` and `FIXTURE_VERSION`;
- the full inventories and digests of `tests/conformance/k0` and `tests/conformance/k0-candidate`, and every
  Kernel source file the import loads (`packages/kernel/src`), failing on a missing, changed or unexpected member;
- the resolution inputs: root `package.json`, `package-lock.json`, `packages/kernel/package.json`, and the
  workspace link's target and real path;
- Node and npm versions and loader flags (`--preserve-symlinks` breaks resolution), with mismatches and load
  failures recorded.

A verified clean checkout at the revision is equivalent. E1's current pin already differs from this tree in three
members, so the whole inventory is recomputed, not patched. The README also carries the predeclared exclusion
(§A2) and the limits.

## A11. Validation (D01-CHK-09)

**Blindness.** The tripwire scenario handed to `begin` allows `id`, array traversal of `steps` and
`steps[i].command`; reading `steps[i].expect` or any other scenario member throws. It is separate from the scenario
the runner uses. It covers supported runs and preflight refusals. The altered-expectation run keeps the expected
`activationId` and `writerEpoch` the runner needs to adapt commands, and compares the observations the candidate
returned, not verdicts.

**Guard scope.** The import guard is a regression guard over the candidate's implementation files and their
helper closure. It is not proof that no oracle access is possible. Implementation files import no `node:` module
at all, which the guard checks, so they have no file API; a bounded source review of other reads is stated in the
report. Test files in the directory are a separate, named boundary: they may load scenarios and mutated Kernel
copies.

**Ablations.** Each runs a supported schedule through the unmodified runner against a temporary copy of
`packages/kernel/src` with one textual edit. Rules: the anchor must occur exactly once; the same schedule must
PASS on an unedited copy first; the failure must be at the target step and name the changed field; a refusal, an
import error or an unmatched anchor is not a kill.

| ID | Site (file, unique anchor → edit) | Obligation | Witness schedule | Step | Predicted change |
|---|---|---|---|---|---|
| ABL-1 | `coordinator.ts`: `const already = record.acceptedOutcome(activationId);` → `const already = null;` | OA-2: an exact duplicate is answered from its record | `control-duplicate-conflicting-outcome` | 3 | `rejection`: `stale_exchange` where none is expected |
| ABL-2 | `coordinator.ts`: `if (epochForCurrency !== null && epochForCurrency !== currentEpoch) {` → `if (false) {` | ID-4/OA-3: a superseded epoch is refused as stale | `identity-create-and-activation` | 7 | `rejection`: `unauthorized_submission` instead of `stale_exchange`. The grant fence still holds, so the stale Outcome does not commit. |
| ABL-3 | `coordinator.ts`: `if (record.state === "CANCELLED") {` followed by the `#refuseLosing` line → `if (false) {` | CX-6: a cancelled Execution's proposal loses with the fixed classification | `control-cancel-versus-complete` | 3 | `rejection`: `terminal_destination` instead of `cancellation_terminal_conflict` |
| ABL-4 | `coordinator.ts`: `if (readiness === null) {` → `if (true) {` | B-2/B-6: wait-ended readiness selects by the retired wait's rule | `k0-trace` | 7 | `dispatchedBatch`: `["bq-1"]` instead of `["cont-1"]` |
| ABL-5 | `outcome.ts`: `if (length !== null && length > 0) {` → `if (false) {` | EF-1/EF-2: an Outcome proposing an Effect is refused whole | `effect-refusal-and-sink-attribution` | 2 | `state`, `progressRevision`, `progress`, `emissions`, `acknowledged`, `queued`, `dispatchedBatch`, `activationId`, `receipt`, `rejection` |

The predicted changes come from reading. The test pins what the run shows; a difference from this table is
reported as a deviation.

**Deviation: the ablations are a maintained test, not registry cases.** D01-CHK-09 says to use the existing
mutation workflow. [012](../../012-review-methods.md) asks for one registry with one runner, and each entry's
site, obligation and rejecting test. The table above carries those fields, and the test reads it as data. The
five are not added to `tests/fixtures/packet-tools/mutations.json`: a registry case whose run set is this
directory's tests would need new hold-register entries in the adoption manifest under TOOLS-02's V-ENV rule,
which is evidence-tooling work outside brief 01. K1.4 kept its kill rows the same way. Registering them is a
follow-up the reviewer or owner can require.

## A12. Criteria after owner choice 02

- **KC-1.** As design 01 §4, with §A7–§A8 and §A11; `effectIntents` is the declared exception.
- **KC-2.** §A2 and §A11. Q2 b and Q3 b are design-time conventions the owner adopted; no test can show they
  were not read from the corpus, and the report says so.
- **KC-3.** One test per scenario through `runScenario`: the 12 supported schedules PASS and the 3 refused ones
  are REFUSED with the capability reason, each pinned exactly.
- **KC-4, KC-5.** As design 01, with §A10.
- **KC-6.** BASELINE, the fixture's prose (decision 4), 007, both roadmaps, 017 and the README. New 017 entries:
  the Q1 a scope and its 51 lost steps; Q2 a as the root fix; `effectIntents` and the ledger; the bounded
  projections and the acknowledgment order; the fake Driver's takeover answer; and brief 01's three limits.
