# Independent design check 01 — K1.4-candidate

**Verdict: APPROVED WITH REQUIRED CHANGES.** The public-coordinator adapter is a sound direction,
subject to the numbered dispositions below and the owner's still-required Q1–Q6 answers. This is a
design verdict, not KC-1..KC-6 implementation acceptance, an E1 result, or permission to change the
fixture or Kernel. No candidate was implemented during this check.

## Identity, independence and environment

| Item | Recorded identity |
|---|---|
| Subject | [design-01.md](design-01.md) at **`c237db58441eccfa6d59e59779068ab9b93a203d`**; blob `da10d2ee0a48a963a0739e0ff9164dd904bf11a3` |
| Design branch / base B | `claude/k1.4-candidate` / `c1951226338de6ccd3e4e6289259549551268f61` |
| Review branch | `codex/k1.4-candidate-design-check-01`, created directly from the subject SHA |
| Reviewer / operator | Codex GPT-6, this independent session; shell account `rex-shih`. No prior work on this packet and no planner-notes access. Git author configuration: `Rex-Shih <pipirex@gmail.com>`. |
| Date | 2026-11-14, America/New_York |
| Machine / OS | `MacBookAir`, arm64; macOS 26.6.2 (25G83), Darwin 25.6.0, `RELEASE_ARM64_T8103` |
| Runtime | Node **v26.10.0**, npm **11.19.1**, from `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` |
| Fresh source | `git clone --no-checkout https://github.com/ArrokothI/arrokothi.git /private/tmp/arrokothi-k14-design-check-01`, then checkout of the review branch at the subject SHA |
| Consumer | Fresh clone of `https://github.com/ArrokothI/benchmark.git`, branch `codex/e1-kernel-acceptance-capture`, **`8de04779d279dba82cf834d419e465d2b677ef46`** |
| Fixture / Kernel source trees | `tests/conformance/k0`: `594b0e4efa9d1f96ac81e0538bbc45191771809b`; `packages/kernel/src`: `5e1afa96fbd2b4a2a69307da136efd369010c62a` |

The remote design branch had advanced to `5956c82ea64ba9950cad050b841a515bc07dbab6` when cloned. That
later content is **not reviewed here**. B..subject changes only 007, design 01 and progress; the
inspected fixture and Kernel code are B's code. The original workspace was left untouched.

The owner statement supplied with this check is recorded verbatim:

> Confirm Q7

Its effect supersedes release 01's model assignment: a **Claude Fable 5.2** session implements this
packet; a **Codex GPT-6** session that has not worked on the packet does the design check and the
independent review. This session performed only the design check. It grants no Q1–Q6 decision and
releases neither K1.4-gate nor benchmark work.

## Basis and validation

Read brief 01 including its owner answers, release 01, 007's candidate/gate scope and status, 006,
012, the development front door and implemented baseline, and 017 L-21. Architectural owners used
were the mental-model overview/reference, Kernel/Runtime/Driver/deployment pages, values,
waits, lifecycle and evidence. The research map's canonical-bytes, timers and evidence-tooling
sections were background only; no third-party claim is used as acceptance evidence.

Inspected the K0 port, runner, vocabulary, full `ALL_SCENARIOS` data, scripted candidates, sink,
coverage and relevant interaction/oracle tests; the Kernel root, coordinator, Driver, inspection,
waits, Outcome, refusal, plan and state projections; and benchmark `src/e1/port.ts` and `pin.ts` at
the full consumer SHA above. Ownership is **test-side adapter and deterministic fake Runtime/Driver**.
None of the findings requires changing Kernel semantics for the twelve runnable schedules.

| Independently executed check | Result and limit |
|---|---|
| `npm ci --cache /private/tmp/arrokothi-k14-design-check-npm-cache --no-audit --no-fund` under Node v26.10.0 | Exit 0; 190 packages installed. Initial sandboxed clone/install attempts failed DNS; network-enabled retries succeeded. npm reported two dependency install scripts not approved under its existing policy; no script approval was changed. |
| `npm run typecheck` | Exit 0 at the subject SHA. |
| `node --test --experimental-strip-types --test-reporter=dot tests/conformance/k0/*.test.ts` | Exit 0. This validates the existing fixture and scripted oracle controls, not a real candidate. |
| Read-only scans of `ALL_SCENARIOS` | 15 schedules, 142 steps, all 12 command kinds. Eleven `kernel_event` commands in exactly three schedules; one unnamed literal Event reference; the two S3 retention transitions; seven acknowledgment-order mismatches described below. |
| Public-root import after install | `import.meta.resolve('@arrokothi/kernel')` resolves to the fresh checkout's `packages/kernel/src/index.ts`; importing `ExecutionCoordinator` succeeds. No build or SDK import needed. |
| Direct public-API probes | Confirmed terminal ingress refusal, mailbox-order acknowledgment projection, and already-due registration after advancing a zero-start clock to 1000. No candidate or Kernel code was added/modified. |
| E1's existing pin verifier against this checkout | `FAILED`: 20 members checked, three digest mismatches (`cited-decisions.test.ts`, `coverage.test.ts`, `protocol-vocabulary.ts`). Binding returns `NOT_ATTEMPTED`, before import. |

The full repository suite and proposed ablations were not run: this is a design-only check and the
candidate/ablations do not exist. No real-candidate PASS count is claimed. No third-party source was
copied/adapted, vendored or added as a dependency; existing locked dependencies were installed for
validation. Benchmark source was inspected in its separate checkout, not incorporated.

## Numbered dispositions

### D01-CHK-01 — S1 is true; Q1a changes the evidence scope, not only three verdicts

**PASS on the underlying fact; required scope amendment before build.**
[`waits.ts`](../../../../packages/kernel/src/waits.ts) has only `application_input` and
`kernel_timeout`; `eligible` never reaches dependency alternatives. `submitInput` authenticates
application ingress, not a result source. L-21 accurately records this. The eleven commands and
their 0-based indices in S1 are complete:

| Schedule | Unsupported command indices | Whole schedule excluded by Q1a |
|---|---|---:|
| `control-stale-timer-and-lost-wake` | 2, 9, 12, 13 | 18 steps |
| `wait-structure-not-satisfiability` | 4, 5 | 8 steps |
| `cited-decision-edges` | 2, 3, 5, 8, 9 | 25 steps |

Mapping these to ordinary input, or rewriting dependency alternatives as subscriptions, would change
the experiment. The future `eventIdentity` translation in `cited-decision-edges` is also unresolved:
some selectors name an Event before its ingress, so an already-accepted alias lookup alone will not
implement that future surface. Do not claim that adding a trusted ingress alone makes all three pass.

I choose **Q1a** for this packet. Q1b is honest failure reporting but a poorer capability declaration;
Q1c requires a separately released Kernel change, and Q1d moves/version-changes the oracle. The
refusal should identify the unsupported command/category and scenario, **not branch on three
hard-coded scenario IDs**. The preflight is allowed to inspect command capability discriminants;
it must not decide selector matches, envelope validity, replay, acceptance or expected outcomes.

Q1a removes **51 of 142 steps**, including a required unsafe-control schedule and unrelated checks
inside `cited-decision-edges` (identity, replay/cancellation ordering and destination scoping). Its
declared boundary rows are `[1,2,3,5,7]`; the other refused schedules cite `[5,6]` and `[5]`. These
rows may have other witnesses, but this check has not certified replacement coverage for every
excluded obligation. Map those losses explicitly in KC-6/E1's handoff.

**Gate consequence:** twelve PASS plus three REFUSED is not a passing full K1/E1 matrix. "Zero
invariant violations in E1's declared scope" is not permission to discard unsupported schedules
after seeing results. The benchmark owner must predeclare a narrower matrix and its exclusions and
decide whether it meets the gate; any changed K1.4-gate obligation needs the ArrokothI owner's
record too. Otherwise the existing full gate remains unmet. Keep refusal counts, missing evidence
and the distinction from Kernel violations visible. This design check changes neither gate.

### D01-CHK-02 — S2 is true; Q2b must be an explicit representation exception

**PASS on the fact; required wording and owner disposition.** Across all literal Execution, Event,
generation and Emission references, `control-subscription-wait-deadline` step 6's queued `to-gd2`
is the sole name absent from commands. There is no missing Kernel fact:
`OutcomeAccepted.wait.timeoutEventId`, `generation`, and the timeout mailbox entry exist. What is
missing is the fixture's spelling. The other timer commands supply names.

For this bounded `/1` adapter I choose **Q2b**, provided the owner explicitly adopts the uniform
`to-<generation-alias>` convention and records Q2a as the root fix for the next fixture revision.
Q2a is the cleaner reusable port: declare the timeout name in the submitted wait (or make the
family relational). It requires a separately authorized fixture revision under the current brief.
Q2c honestly leaves a representational FAIL and cannot satisfy KC-3.

Amend §2 rule 3: Q2b is an exception to "never as a guessed fixture name". It is laboratory naming,
not a Kernel-returned literal ID. Apply it only to an actually observed Kernel timeout lacking an
explicit alias, using that entry's actual Execution/generation. Never manufacture an Event, reorder
the queue or substitute the currently expected generation. Preserve duplicate entries and unknown
IDs visibly. A wrong-generation witness must remain distinguishable. This convention is not proof
that an arbitrary new `/1` schedule with a different unnamed timeout spelling will pass.

### D01-CHK-03 — S3 is an underspecified observation lifetime; specify Q3b completely

**PASS on the ambiguity; required convention.** The two transitions in S3 are the only
post-rejection non-create/non-Outcome commands in the complete scan: dispatch clears at
`identity-create-and-activation` 3; successful input retains at `control-whole-envelope-validation`
7. `RefusalRecord.position` is a separate refusal index, not comparable with receipt positions.
The field's existing wording does not determine a clearing event. "Most recent rejection" could
also naturally mean retained indefinitely; the design's claimed "plainest reading" is not binding.

I choose **Q3b** to retain the current oracle, but as an owner-adopted **fixture observation
convention**, not an inferred Kernel lifecycle rule or a merely editorial correction. Define the
episode key precisely, for example `(state, activationId, writerEpoch)` using actual post-command
Kernel state. Store the most recent mapped refusal per Execution; on a key change clear the older
one, then expose any new mapped refusal. Specify that input success without an episode change,
inspection and ordinary redelivery retain it, and that activity on another Execution cannot clear
it. Reasons/classifications stay Kernel-returned; terminal input uses `ingressRefused` separately.

Q3a is simpler and preferable if a fixture revision is released: make the field command-local and
correct step 7. Under the current no-scenario-change bounds it intentionally leaves one FAIL.
Q3c is possible, but requires the same complete transition definition. Poisoned-expectation tests
cannot validate an invented lifetime; retain the two real transitions and add small per-Execution,
takeover and unchanged-state witnesses for the selected convention.

### D01-CHK-04 — Additional missed field: cumulative acknowledgment order

**FAIL for §2.3's unconditional mapping; record/correct before treating refused schedules as supported.**
The table maps `acknowledged` directly from `view.acknowledged`. The latter is explicitly in
acceptance order in [`inspection.ts`](../../../../packages/kernel/src/inspection.ts); the projection
in [`state.ts`](../../../../packages/kernel/src/state.ts) around line 1543 scans the mailbox.

`cited-decision-edges` steps **14–20** instead accumulate acknowledgment order. At step 14:

```text
fixture: edge-in, early, late-eligible, match, wrong
view:    edge-in, wrong, early, late-eligible, match
```

At steps 17–20 the fixture appends `impostor`; the view places it before `match`, where its original
acceptance belongs. No other scenario/list-order discrepancy was found by the bounded scan of
`queued`, `acknowledged`, `terminalDispositions` and `dispatchedBatch`. This survives resolving
S1 and is not explained by S2–S4.

The cause is a fixture representation convention not stated in the port, combined with assuming
same-named view fields have identical ordering. No Kernel change is necessary. If that convention
is adopted, accepted exchange history (`view.exchanges`, acceptance ordered, each with its
acknowledged batch) supplies an independent source for acknowledgment order; reconcile it with the
actual acknowledged set rather than sorting by expectations. Alternatively revise the fixture's
order contract. Under Q1a, implementation for this refused scenario can remain explicitly DEFERRED,
but fix the unconditional design claim and carry this finding with the K2 unblock. Add the concrete
older-backlog/newer-wake/then-older-acknowledgment witness when implementing the mapping.

### D01-CHK-05 — S4 is true; retain the checks and state what they cannot prove

**PASS on the missing source; Q4 limitation required.** No K1 Effect-intent record or
`ExecutionView.effectIntents` exists. I choose **Q4's recorded-limit option**. Adding an always-empty
inspection field would move the constant without increasing evidence. The empty ledger genuinely
observes no sink attempts from this assembly, but there is no live Kernel-mediated dispatch path
for it to exercise; it cannot establish K2 prevention or hidden-intent absence.

Keep every ledger assertion and the known-bad candidate that calls the sink while claiming refusal.
The whole-envelope Effect refusal can still earn non-vacuous evidence in the build: the refusal plus
unchanged progress, receipt, batch, emissions and next state, and a Kernel refusal ablation. Narrow KC-1's "every field"
claim for `effectIntents`; the limitation must also travel to E1. Do not describe all Effect-related
checks as vacuous.

The other proposed projections have real sources. `waitEndedReadiness`'s 0/1 length follows the
Kernel's single readiness slot; `recoveryHold` exposes only one of potentially two holds; `emissions`
reports local `emissionKey`s, not the derived Kernel `emissionId`s. These are bounded projections of
this fixture, not exhaustive inspection of those subsystems. The current recovery schedule exercises
only code availability. Record these limits without inventing new Kernel fields.

### D01-CHK-06 — Preserve input information and scope aliases to their actual identities

**Required corrections to §2's mechanism/proof language.**

1. "An encoder defect is refused, not absorbed" is false. Strict validation checks the bytes it
   receives, not the value the encoder lost. In a direct probe, `JSON.stringify(NaN)` produced
   `null` and `validateCanonicalBytes` accepted it. Dropping an own `__proto__` member similarly can
   leave valid bytes for a different object. Follow the local
   [canonical-form owner](../../../../mental-model/concepts/values.md#canonical-form): exact JCS,
   UTF-16 key ordering, preserved arrays/members and no repair of invalid values. For a deliberately
   narrow fixture encoder, declare its supported value domain and fail visibly outside it. Use
   golden vectors and decoded-value fidelity checks, including numeric-looking keys and own
   `__proto__`; do not build another general-purpose SDK wrapper. Encode each complete Effect
   proposal, not merely an arbitrary byte value of the same list length. Kernel validation remains
   the decision authority.
2. Wait generation numbers are **per Execution**: coordinator registration uses
   `record.registrations + 1`, and `WaitOutcome` says the Execution ID is part of the timer identity.
   "Scoped to one run" is insufficient for a reverse map keyed by integer alone. Key generation
   maps by Execution as well as family/name/ID. Two Executions can each have generation 1. Apply the
   same scoping discipline to rejection memory, grant lookup and pending-timer selection. This is
   an adjacent multi-Execution case absent from the current fifteen schedules.
3. Preserve both directions of alias identity. A previously bound laboratory name returning a
   different Kernel ID must fail visibly, just as a Kernel ID collapsing two names must. Do not
   overwrite mappings on replay or rejection. Separate receipt, Activation, epoch, Execution,
   Event and generation families; epochs remain relational per exchange. The payload encoding
   `{eventId, correlation?}` is reasonable for the present application's content checks, including
   the create conflict differing only in `eventId`; it does not supply trusted Event provenance.
4. §2's unconditional throw rule and §2.3's invisible control refusals need one explicit rule:
   known, deliberately observed no-change answers may project unchanged state; unexpected/unmapped
   answers throw. Never silently map all failed controls to success-shaped observations. Every
   submitted Outcome keeps its supplied coordinates and the grant actually delivered for that
   attempt; never repair a stale proposal with current coordinates/grant.

The synchronous calls themselves fit the port. `inspect` returns a `Result` and must be checked;
recovery/takeover need a pre-command view to name the exchange, in addition to the post-command
observation. "Inspect once" must mean once after the command, not once total for those commands.

### D01-CHK-07 — Q5/Q6 work, with bounded claims and one clock correction

**PASS on the proposed policies.** I choose **Q5 yes** and **Q6 yes**. Store delivery grants by
Execution/Activation/epoch, report `delivered()` immediately, and let only later `apply` calls submit
Outcomes. Immediate transport acknowledgment does not resolve the Activation; the delayed-Runtime
scenario still has X unresolved while Y completes. `isSafeToReplace: true` is justified because this
fake has no native session mutation or independently running work. It proves no real Driver takeover
fidelity. Preserve retired grants for stale submissions and accepted replays. Cancellation recording
is observation of a request, not evidence of physical interruption.

The clock is laboratory scheduling: monotonic `max(now, matchingPendingDeadline)` for the exact
Execution/kind/generation, followed by `fireTimer` even for a known stale generation. Do not decide
expiry in the adapter or synthesize timeout state. An unknown alias fails visibly. This covers the
fixture's fires; it does not cover arbitrary early-fire behavior or Execution-deadline scheduling.

Correct §2.5's rationale: **start 1 is permissible, not necessary for this corpus**. `alreadyDueWait`
is registered after `gd1` has already fired at 1000. A direct public-API probe starting at 0 also
returned `expired` for the later deadline 1. Keep 1 as a declared reproducibility convention, and
do not infer time semantics from expected observations.

### D01-CHK-08 — The locator can resolve, but the pin must cover executed bytes and resolution

**PASS on workspace resolution; required pin-contract change.** The proposed path/export/version is
usable from a separately supplied checkout after `npm ci` on Node v26.10.0. The package root exports
`./src/index.ts`; npm's workspace symlink resolves to real source. Do not use `--preserve-symlinks`.
This check verified that root import, not the absent future candidate module.

E1 at `8de04779` imports only the four modules listed in `E1_CONSUMED_MODULES` inside the fixture
directory and binds its old candidates. It has no new-locator loader. `verifyKernelFixturePin`
hashes only that directory; the Git commit in the pin is provenance and is **not a checkout
verification**. Thus §5's "Kernel source by digest **or by the commit**" is insufficient for that
consumer unless a new enforced clean-tree/commit check actually proves all loaded bytes.

Require E1's separately released update to verify, before subject import:

- repository and full subject revision, accepted/integration provenance, exact module/export,
  `KERNEL_CANDIDATE_VERSION` and `FIXTURE_VERSION`;
- full fixture and candidate directory inventories/digests, plus all transitively loaded Kernel
  source bytes, including added/unexpected members;
- resolution inputs: root `package.json`, lockfile, `packages/kernel/package.json`, workspace link
  target/real paths, and any later-added external runtime dependencies;
- Node/npm versions and relevant loader flags, with mismatches/load failures recorded explicitly.

A verified immutable clean checkout can supply equivalent coverage, but merely recording a SHA
cannot. The current Kernel has no external runtime dependency; `npm ci` at the repository root
nevertheless installs the whole workspace, not only one symlink. No benchmark mutation is requested
here. A version mismatch refusal remains necessary, but equal `/1` strings do not prove equal bytes.
The existing E1 pin already differs in three members before the planned comment edits, so recompute
the entire inventory rather than patching only `candidate.ts` and `fixture.ts` digests.

### D01-CHK-09 — Close KC-1/KC-2 through reachable witnesses, with honest guard scope

**Required validation clarification.** Q1a can preserve oracle blindness: a command capability scan
is not an expectation read. The supplied tripwire must allow array traversal and `step.command`
while throwing on `step.expect`, observations, labels, `forbids`, ledger expectations and unrelated
scenario metadata. Include supported runs and preflight refusals. Renaming a scenario with identical
commands must not change capability support; preflight must not cache a fabricated transcript in
place of the commands later handed to `apply`.

Preserve Activation/epoch expectation fields needed by the unmodified runner's adaptation when
altering expectations, as §4 already anticipates; compare captured actual observations, not runner
verdicts. The poisoned scenario passed to `begin` should be separate from the runner's legitimate
oracle. The import guard is a regression guard over candidate implementation and its helper closure,
not proof that all oracle access is impossible: blanket `node:` permission also admits file reads.
State a bounded source review of non-import reads. Tests loading scenarios and temporary mutated
Kernel copies need an explicit test-side boundary; applying the candidate's no-dynamic-import rule
indiscriminately to every test in its directory contradicts the proposed ablation machinery.

Before build, name each mutation site, unmutated witness, target step and changed field/outcome.
All five minimum ablations must use **supported** schedules under Q1a. Suitable witnesses already
exist outside the refused set: replay in `control-duplicate-conflicting-outcome`; epoch fencing in
`identity-create-and-activation`; CX-6 in `control-cancel-versus-complete`; wait-ended selection in
`k0-trace` or `control-subscription-wait-deadline`; Effect refusal in
`effect-refusal-and-sink-attribution`. A refused scenario, import error or mutation that matched no
site is not a kill. Require an unmutated-copy PASS and a failure at the intended reachable step.
Removing the epoch comparison still leaves the grant fence; name the actual changed refusal or
state, rather than assuming the stale Outcome commits. Use the existing mutation/corpus workflow
under 012, and preserve this check's new counterexamples in the build or an explicit deferral.

## KC disposition and owner choices

These labels assess the **design**, not a shipped implementation.

| Criterion | Design-check disposition |
|---|---|
| KC-1 | **FAIL as unqualified prose**; public-root mechanism is appropriate. Close D01-CHK-04..06 and 09, with Q4's explicit exception. |
| KC-2 | **PASS conditionally** on the Q1a amendment and D01-CHK-09. Q2b/Q3b are declared design-time conventions, not runtime oracle reads; the owner must adopt them. |
| KC-3 | **FAIL against the released all-15-PASS criterion**. Owner adoption of Q1a/Q2b/Q3b would make 12 PASS / 3 REFUSED the exact proposed test contract. That remains a prediction until built and independently reviewed. |
| KC-4 | **PASS for preservation plan and current baseline**. Keep existing discrimination tests; fixture prose edits do not grant protocol evidence. |
| KC-5 | **PASS for resolution, required changes for reproducible identity** under D01-CHK-08. Actual locator/version-refusal tests are DEFERRED to build. |
| KC-6 | **DEFERRED to build and owner scope decisions**. Update baseline, current fixture prose, candidate/gate ledger text, roadmap and limitations consistently. Do not grant E1 acceptance or silently change the gate. |

Recommended owner answers: **Q1a; Q2b with Q2a's root fix assigned; Q3b with the precise per-Execution
convention above; Q4 recorded limits; Q5 yes; Q6 yes.** Q7 is already confirmed verbatim above.
If the owner instead wants an adapter with no fixture-specific timeout/lifetime convention, choose
Q2a and Q3a and release the necessary fixture revision first. Neither route licenses the implementer
to edit sealed scenarios under the existing brief.

## Reproduction of the additional ordering finding

Run at the subject checkout with Node v26.10.0; this reads fixture data only and changes no files:

```sh
node --input-type=module <<'JS'
import { ALL_SCENARIOS } from './tests/conformance/k0/scenarios.ts';
let steps = 0;
for (const s of ALL_SCENARIOS) {
  const orderByExecution = new Map();
  for (const [i, { command: c, expect: { observation: o } }] of s.steps.entries()) {
    steps++;
    const arrivals = c.kind === 'create' || c.kind === 'create_retry'
      ? [c.initialInput] : c.kind === 'accept_event' ? [c.event]
      : c.kind === 'deliver_timer' ? [c.timeoutEvent] : [];
    for (const e of arrivals) {
      const order = orderByExecution.get(e.destination) ?? [];
      if (!order.includes(e.eventId)) order.push(e.eventId);
      orderByExecution.set(e.destination, order);
    }
    const order = orderByExecution.get(o.executionId) ?? [];
    for (const field of ['queued', 'acknowledged', 'terminalDispositions', 'dispatchedBatch']) {
      const known = (o[field] ?? []).filter(id => order.includes(id));
      const sorted = known.toSorted((a, b) => order.indexOf(a) - order.indexOf(b));
      if (JSON.stringify(known) !== JSON.stringify(sorted)) {
        console.log(s.id, i, field, known, sorted);
      }
    }
  }
}
console.log(ALL_SCENARIOS.length, steps);
JS
```

Expected output: seven `cited-decision-edges` rows, indices 14–20, all `acknowledged`, then `15 142`.
This bounded scan checks order among named Events; it is not a Kernel simulator and is not evidence
that the unsupported trusted-Event path ran. Rejected arrivals do not appear in the compared lists,
and exact repeated names add no new position. The separately observed unnamed `to-gd2` is excluded
from this order scan and handled by D01-CHK-02.

An independent public-API witness used ordinary subscriptions: create/dispatch the initial input;
queue older ineligible input and newer eligible input; accept `await` for the newer input's class;
dispatch/acknowledge the newer input with `continue`; dispatch/acknowledge the older input.
`inspect().acknowledged` reported `[initial, older, newer]`, while accepted
`inspect().exchanges.flatMap(exchange => exchange.batch)` reported `[initial, newer, older]`.
This confirms the projection distinction without adding trusted ingress or implementing a candidate.
