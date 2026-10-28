# Attack 01 — K1.3

2026-10-25, Codex desktop adversary session (GPT-6), under [Prompt E](../../009-universal-prompts.md#prompt-e--adversary).
This is a pre-build attack, **not a design approval or an independent acceptance review**. No feature
code, governing specification, packet status or mutation registry is changed.

**Exact subject:** `origin/claude/k1.3` at `4b45e697da910ba4fd0473b79c5df6d0f7d12ca5`, fetched for this
session. The request contained literal `<SHA>` rather than a commit; this record pins the resolved
branch head. Design base B is `22c8c1db9958049eb8693dd5aa4d7005f2d565db`. Output branch:
`codex/k1.3-design-attack`, based on the subject. Full pinned source was available locally.
No K1.3 implementation exists at this pin.

Read [brief 01 including owner answers](brief-01.md), [release 01](release-01.md), and [design 01](design-01.md).
There is no separate K1.3 `contract.md` at this revision: the brief and [007 seed](../../007-work-packets.md#k13--wait-and-cancellation-races)
are the requirement map. Owner decision 1 fixes the optional, immutable creation deadline and its
replay/conflict identity; decision 2 fixes two ranges in one packet; decision 3 requests this attack.
Design questions Q1–Q7 have not become owner decisions merely by appearing in the proposed oracle.

## Findings about the proposed evidence

**F1 — K13-5's promised third mutant kill is not achievable with the five examples as written.**
Design “Why each criterion closes / K13-5” requires every alternative selector, including “treat the
timeout as merely earliest,” to fail one of the five examples. Define that alternative precisely:
form the correct union of eligible Events and the mandatory timeout, sort by acceptance position,
then truncate without explicitly reserving the timeout first. [The selection probe](attack-01/selection-probe.test.mjs)
shows it passes **all five**. Ignoring eligibility and freezing candidates at wake do fail.

This is deeper than insufficient depth. W-2 checks eligible backlog before expiry; W-9 case 4
retires a live wait on an eligible arrival before its timer. Thus when T is actually minted, no older
unacknowledged Event eligible under that wait exists. Every eligible candidate beside T at reservation
arrived later. For an Event wake, the mandatory Event is already the earliest eligible candidate.
Sorting the correctly formed union is therefore equivalent on reachable states under these rules.
The maintained [K0 fixture specification §22](../../../../tests/fixtures/k0/public-fixture-specification.md#22-round-16-correction-b-2s-wait-ended-batch-decomposed),
“Foreclosed rather than manufactured,” already records the crucial reachability argument.

The broad discrimination claim also appears in current `waits.md`'s explanation of the examples;
it is not evidence that a new implementation broke the rule. Fix the evidence claim at its cause:
identify whether the proposed mutation omits **union membership** (a real, killable error) or merely
**priority** (equivalent here), and record the equivalence per [012](../../012-review-methods.md#maintained-corpus-and-mutation-registry).
An isolated selector test with eligible R older than T checks the literal priority rule, but must
be labelled a synthetic selector input, not an executable Kernel schedule. Do not invent a reachable
history or weaken W-2 to kill this mutant. The design check should address the dependent explanatory
claim on the canonical page while preserving the owned selection contract.

**F2 — K13-9 explicitly omits an observable part of retained input.** Its comparison excludes payload
bytes because they are fixed by the harness. Fixed input is still data that a wrong transition can erase.
[The alphabet probe](attack-01/alphabet-probe.test.mjs) supplies two `CANCELLED` observations with identical
IDs, positions and terminal dispositions, one retaining the payload and one replacing it with `null`.
The proposed payload projection makes them equal. INV-1's existence/disposition check and INV-2's
listed terminal fields do not independently require retained Event bytes to equal admitted bytes.
Compare those bytes to an independently retained copy, including after cancellation, dispatch and exact
replay. This is an oracle gap, not a demonstrated defect in nonexistent K1.3 code.

**F3 — increasing depth alone cannot fix the alphabet's missing choices.** The search is useful for
its declared schedule space, but fixed selectors, oldest/newest timer keys, newest-Activation selection
and first-success-only delivery reports omit contrasts needed to distinguish plausible wrong rules.
The retry letter alone is insufficient; repeated Outcome letters may supply fresh-equal witnesses.
Several deterministic cases elsewhere in design 01 add dimensions and should
be credited separately. The missing contrasts below need named tests or an explicit limit, not a
larger word count. The brief's bounded-search gate still applies: an outside-space witness is not
automatically a failing in-space run; an undecided outcome remains an owner question.

**Baseline mismatch:** §10 says redelivery will refuse cancellation through its “existing terminal
checks” as `terminal_destination`. The pinned `redeliver` path and
`packages/kernel/tests/terminal.test.ts` instead return `no_unresolved_exchange` once the exchange is
absent, including after `COMPLETED`/`FAILED`. The semantic requirement is refusal with no logical
change. Do not silently change accepted public classifications while describing them as unchanged;
see O6 below. No existing code is patched by this attack.

## Source key and scope

All expected semantic results below derive from these pinned sources:

| Key | Governing owner / decisions |
|---|---|
| W | [waits](../../../../mental-model/mechanisms/waits.md): Declare, Eligibility, Registering, Ending, Selecting, Accounting; worksheet W-1–W-9 and B-1–B-8 |
| C | [lifecycle / Cancellation order](../../../../mental-model/mechanisms/lifecycle.md#cancellation-order); worksheet CX-1–CX-6 |
| O | [execution-cycle / Outcome acceptance](../../../../mental-model/mechanisms/execution-cycle.md#outcome-acceptance); worksheet OA-1–OA-5 |
| D | [execution-cycle / Delivery reporting boundary](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary): first report, original delivery only, no logical state change |
| T | [operations / Three clocks](../../../../mental-model/concepts/operations.md#three-clocks); worksheet CL-1–CL-3; [core / Waiting for what arrives](../../../../mental-model/concepts/core.md#waiting-for-what-arrives) |
| I | [creation](../../../../mental-model/mechanisms/creation.md), [authority](../../../../mental-model/mechanisms/authority.md#establish-identity-at-trusted-ingress), and the brief's owner decision 1 |
| WS | [protocol worksheet](../../../../tests/fixtures/k0/protocol-worksheet.md); cited B/W/CL/CX decision identifiers locate the derivations |

Also inspected the development front door, 006/008/012/017, implemented baseline, reference index,
rewrite-index §4/§5, Driver and recovery owners, relevant K0 corpus and its §22 decomposition,
and current Outcome, terminal-accounting and late-report code/tests. The research reading map's
wait/timer, plan/apply and evidence sections were read as background. No third-party claim supplies an
expected result here; no third-party source was copied/adapted, and no dependency was added.

These are Kernel acceptance/accounting attacks. Driver tests concern callback attribution only,
not native interruption or isolation. Trusted non-timeout Kernel Events are selector-unit inputs in
K1; live settlement/child routing, leases and persistence stay at later gates. Ordinary objects and
finite, intentional host callbacks suffice; no hostile Proxy or containment claim is needed.

## Attack items

Notation: A1/A2 are exchanges, g1/g2 are wait generations, U is ineligible input, E/R is eligible under
the named wait, T is its timeout. Letters such as `q` and `d` mean design 01's actions. **Build witness**
means a concrete stimulus for the future implementation; the standalone probes cannot test it yet.
A passing probe establishes the stated evidence distinction, not K1.3 conformance.

| Item | Criterion | Input, schedule or mutant | Expected result and source derivation | Why it is hard / probe |
|---|---|---|---|---|
| A01 | K13-5, K13-9 | Five examples against correct-union/sort/truncate, omitting only mandatory-first priority. | All five batches agree. W-2/W-9 preclude an older eligible R beside later T; a synthetic selector input can separate the functions but is not a live history (W/B-2; F1). | An equivalent mutant is not missing Kernel correctness. `selection-probe.test.mjs`, 2 tests. |
| A02 | K13-6, K13-9 | Cancel pending delivery; call its delivered, failed, delivered methods in that order. Also failed-first and a redelivery's second capability. | Only the original row's first report stands; cancellation, dispositions, receipts, progress and newer deliveries unchanged (D). | `p` always picks an unreported capability and only reports success: a removed pending guard agrees on its entire domain. `alphabet-probe.test.mjs`; build with actual cancelled exchange. |
| A03 | K13-4, K13-9 | S4 `e d w`, then fire held **g2** while g3 is live; repeat with g2 retired by timeout. | g3/deadline/readiness unchanged, no new timeout/wake; any prior g2 timeout keeps its identity. Its repeat is duplicate even after a later Outcome; an Event-retired generation is a stale no-op (W-3/W-9 case 6). | Oldest/newest target g1/g3, never g2. This fourth action fits depth but has no letter. `alphabet-probe.test.mjs`. |
| A04 | K13-2/3/4/5/9 | Wait on s, wake/consume, wait on x; send s then x. Reverse s/x and include an alternative plus subscription. | New selector alone governs: s stays queued, x wakes; resulting batch excludes s. No prior satisfaction flag survives (W-1/W-3, B-2/B-4). | Every `w/z` selects s, so reusing the first selector agrees on this dimension. `alphabet-probe.test.mjs`; build both orders. |
| A05 | K13-6, K13-9 | Cancellation retains input IDs/dispositions but replaces nonempty payload with null. | Reject the transcript: B-4/B-5 retain the accepted Event and change disposition, not content; C does not authorize evidence destruction. | Payload omission masks it despite correct headline/dispositions. `alphabet-probe.test.mjs`. |
| A06 | K13-6, K13-9 | S4 `e d q p p p`: A1/A2 reports pending, A3 cancelled, then all three report. | Last report must still find A3's retained row; none changes logical state (D/CX-6). | Six suffix actions, not four; “effective depth nine” is not arbitrary depth nine. Probe counts this suffix, not all shorter contexts. `alphabet-probe.test.mjs`. |
| A07 | K13-6, K13-9 | Cancel A1; submit loser L; replay a fresh equal envelope, also after a different loser. | Same recorded classification and exact CX-6 reason; no receipt or logical mutation (C/E-7). §10 additionally promises the same refusal object. | Same-object `r` alone cannot reject object-identity memoization. Repeated letters such as S7 q c c may already kill it if they construct fresh equal envelopes; require that witness explicitly. `retry-probe.test.mjs`. |
| A08 | K13-6, K13-9 | L1/L2 after cancellation share coordinates/await but differ only in nonempty progress or Emission content; fresh-object L1/L2/L1 retries. | Rejection evidence remains bound to each canonical proposal, never conflated; no accepted output/revision/wait. Changed loser content is not automatically OA-2's accepted-identity conflict (C/O). | Fixed content misses an incomplete index key. Probe demonstrates collision; object-allocation details are §10's choice. `retry-probe.test.mjs`. |
| A09 | K13-6, K13-9 | Accept A1 continue, dispatch A2, cancel A2, submit losing A2; then retry saved A1 exactly and changed. | Exact returns original receipt without mutation; changed A1 is duplicate_conflict before the cancellation fence (O/OA-2, C/CX-6). | After submitting A2 the generator cannot select saved A1. Without that submission S7 c d q r already covers A1 replay; credit it. `retry-probe.test.mjs` illustrates lookup; build full history. |
| A10 | K13-6 | Both acceptance orders with continue/await/complete/fail; nonempty progress/Emissions, two reserved Events and one outside batch. | q first rejects every component; reserved/backlog terminal-disposed, none newly acknowledged. Outcome first acknowledges batch and whole result stands; q cancels nonterminal result or reports terminal result unchanged (C/CX-2/CX-6, B-3/B-5). | Empty proposals hide partial installation. Build whole-view witness; existing K0 control-cancel is a transcript reference only. |
| A11 | K13-6 | Mix acknowledged Event, reserved Events, backlog; cancel; exact old-input retry, changed retry, fresh input. | Preserve old acknowledgment; reserved/backlog terminal-disposed; exact ingress retry replays, changed conflicts, fresh input refuses without queueing (B-3/B-5, I). | Cursor accounting or marking all entries terminal corrupts accepted history. Build witness; current terminal tests exercise complete/fail only. |
| A12 | K13-3 | S0 `e d z`, B=1 versus B=2; future/no deadline, no queued match, now==deadline. | B=1 leaves e outside batch: event wake, no T. B=2 acknowledges e: cannot self-wake, due deadline creates one T. No match with future/no deadline stays WAITING (W-2, CL-3). | Couples acknowledgment, tie and registration atomically. Assert decision, generation, dispositions and readiness. Build witness. |
| A13 | K13-4 | Expire g1; repeat before/after dispatch, after continue, during g2, after cancel. Also expire at registration (`z`) then fire that generation. | One stable T per g1, duplicate recorded with no second readiness or later-state mutation. Event-retired g1 never gets T (W-3/W-9, especially case 6). | pendingTimers never exposes a generation immediately retired by z: held-key loop alone misses its duplicate. Build witness using agreed key encoding, O7. |
| A14 | K13-5 | Five examples separately; two ineligible entries beside T at bound 3; eligible candidates exceeding bound after wake. | Exact selected batch in acceptance order and retained queue; no acknowledgment before Outcome; never top up from ineligible backlog (W/B-2/B-3/B-4). | Separates membership, order and truncation. `selection-probe.test.mjs`; retain §22's top-up/latest-candidate cases. |
| A15 | K13-3/6/8 | Await clock callback accepts q or eligible input; interrupt callback submits Outcome/reports delivery; cancelScopes getter completes exchange. | Nested accepted decision wins its order: q fences outer Outcome; input participates in W-2; nested complete is reported unchanged by outer cancel; post-cancel Outcome loses and report touches only its row (O step 4, C/W/D). | Basis-after-callback alone cannot cure semantic facts cached earlier. Finite cooperative callbacks are expressly contemplated in §5/§9/suspect 1. Build witness. |
| A16 | K13-7 | Explicit cancel and Execution-deadline fire from identical READY/RUNNING/WAITING prefixes, including queued T and recovery hold. | Both cancel without new T/Activation, with B-5 terminal disposition shape; prior acknowledgments unchanged (T/CL-1, C/B-5). | Mask cause/actor/reason/fire differences only, not mailbox contents, coordinates or delivery ownership. Build witness. |
| A17 | K13-7 | Create deadline 0; exact retry; added/removed/changed deadline; -1, fractional, MAX_SAFE_INTEGER+1. | Exact deadline replays, changed presence/value conflicts (owner decision 1/I). Invalid numbers follow §2's binding proposal; valid past-deadline behavior is O3. | New creation-identity field must preserve no-deadline identities. Build witness; do not silently settle enforcement point. |
| A18 | K13-8, K13-3 | D-1/D/D+1 readings; throwing/NaN clock; replay; eligible queued Event with unusable clock; not-due timer. | Non-strict due comparison and one accepted-time observation; eligible Event wins first (W-2/CL-3). No ambient fallback (brief K13-8). Failure policy/read counts on replay are O4. | t/s/x advance to due, missing not-due/failure branches. Build instrumented callback witness. |
| A19 | K13-1 | Empty lists even with deadline, empty alternative/kind set, inert alternative, unknown nested field, duplicate/empty-text selectors, 256/257 strings across all lists. | Malformed forms and unsupported selectors refuse whole; inert nonempty wait valid (W-1). Text/count limits follow the declared binding, not satisfiability. | Count across kinds/IDs/correlations/subscriptions and duplicate-heavy arrays; preserve whole accepted state on refusal. Build table. |
| A20 | K13-2 | Application input spoofs timeout/dependency kind, Event ID or correlation payload; compare missing/equal subscription; synthetic trusted category reverses branches. | Input wakes only by subscription; timeout matches neither list; other trusted categories use AND within/ANY-OF across alternatives (W-1/W-7, core). | A string must not confer provenance. Live K1 plus selector units; no live K2 ingress claim. |
| A21 | K13-9 | Omit pending timer; rename an existing Event between views; change receipt only on retry; corrupt cancellation field beside shared delivery row. | Detect missing work, unstable identity, wrong receipt relation and logical corruption (W-9, B-1, OA-2, C/D). | Derive expected keys independently; stable injective identity map; receipt relation checks; mask only actual delivery rows. Build oracle-negative controls. |
| A22 | K13-6 | Cancel then dispatch/redeliver/takeover/recover; repeat on COMPLETED/FAILED. | No Activation/logical changes (C). Existing terminal redelivery token is no_unresolved_exchange; cancellation token is O6. | §10 misstates an existing terminal check. Current baseline suite confirms the different token. Build after decision. |
| A23 | K13-6 | Invisible loser retry; visible caller without grant; another Execution's same-looking coordinates; malformed coordinates with valid values. | Scope precedes lookup; no hidden evidence disclosure or cross-Execution alias. Cancellation fence precedes fresh currency/grant/content diagnostics (O/CX-6). Malformed exact-retry encoding is O5. | Search has one authorized caller/Execution. Build scoped tests without inferring authority from content. |
| A24 | K13-7, K13-9 | Wait deadline 10, Execution deadline 5; then equal 10/10, fire wait then Execution and reverse. | Wait-first creates T then terminal-disposes it; Execution-first cancels and wait fire creates no T. Both CANCELLED, no further Activation; independent fields (T/CL-1, W-9, C). | S6 fixes 10/25; more words cannot vary initial order/equality. Build variants; O3 concerns detection, not these ordered accepted fires. |

## Is the K13-9 alphabet and depth sufficient?

**Depth four from the seeds is useful for the stated scalar space.** It reaches registration ties
(`S7 e z`), both live-wait races (`S2 e t` / `S2 t e`), cancellation versus included Outcomes
(`S7 q w r`, `S7 c q r`, `S7 k q`), an earlier accepted replay after dispatch/cancel (`S7 c d q r`),
and cancellation of timeout readiness (`S5 q`). Keep those
source-decided cases: they can expose skipped mailbox checks, swapped W-2 steps, acknowledgment of
losing batches, uncleared readiness and first-generation timer errors.

**It does not establish that plausible wrong rules across the focus areas are distinguished.**

| Fixed/absent dimension | Undistinguished wrong rule | Small addition |
|---|---|---|
| Exact-object r; fixed progress/output | r alone misses object-indexing; fixed content misses incomplete keys | Explicit fresh-equal witness (q c c may supply it), changed content, return to original |
| Every wait selects s | Earlier selector reused | Second class x; both selector orders |
| Oldest/newest held timers | First stale key special-cased | S4 e d w fire(g2) |
| Newest Activation / last submission | Earlier evidence shadowed after another proposal | Save A1, cancel/submit losing A2, then replay/conflict A1 |
| First successful report only | Last report wins or failure misrouted | Address capability; success/failure and contradictory repeat |
| Clock advances only with fire | Wrong not-due behavior or cached pre-callback facts | Separate advance/fire and reentrant callbacks |
| Payload bytes omitted | Input content erased despite correct disposition | Check original bytes at every observation |
| One authorized caller/Execution | Losing-index scope alias | Deterministic two-Execution/invisible-retry tests |

Arithmetic `13^4 × 8 × 2 = 456,976` is correct. Fixed prefixes and skipped actions do not give arbitrary
nine-action coverage. Report attempted words, skips, exercised transitions and mutant witnesses
separately; validate seed prefixes too. The supplementary random walk has the same alphabet and
cannot repair absent dimensions. Pin the RNG/seed and clarify whether “20,000 words ... from S0 and
S1 at both bounds” means total or per combination.

These probes do **not** implement a reference Kernel or claim the future 456,976-run search was
executed. A06 is one depth-limit witness, not a claim that six is a universally sufficient replacement.
Prefer a few source-owned seed/parameter variants with discriminating mutants over a blind depth rise.

The S1–S5 owner guards are useful but not semantic closure: terminal completeness accepting
“acknowledged or ended” does not itself forbid cancellation acknowledging the batch; one timeout does
not prove the correct generation/deadline; clearing readiness does not prove correct selection. L-15
already acknowledges that distinction. A mutant failure should name the guard or observable mismatch;
a compilation or harness failure is not a semantic kill.

## Owner questions: results the sources do not decide

Source-decided portions of the attack rows remain obligations. These questions concern only the
remaining choice; no probe silently answers them.

- **O1 — cancel power encoding (design Q1).** Authority.md requires separate powers. Does this binding
  add cancelScopes or express the separate permission through the existing host contract? Which
  refusal is promised? Visibility alone must not authorize cancellation.
- **O2 — interrupt contract (design Q2).** Approve optional, promptly returning requestInterrupt and
  its absent-hook limit, or another explicit path. CX-1 requires requesting Driver cancellation
  without awaiting cooperation; sources fix neither a TypeScript member nor an unsupported Driver's
  surface, and never guarantee physical stop.
- **O3 — Execution-deadline enforcement (design Q3).** For creation already past the deadline, and an
  Outcome after the instant but before host fire, is lazy fire-only enforcement the binding contract?
  CL-1 fixes expiry's effect, not creation validation/polling cadence. W-9 case 4 decides the wait
  race, not every Execution-deadline admission policy. W-2 due-at-registration remains mandatory.
- **O4 — clock failure/read effects (design Q5 and §5).** Optional clock with deadline refusal versus
  required clock, error shape and allowed callback observation points need a binding choice. §5 reads
  the clock before replay/loser rejection/step-2 wake, then calls these “never affected.” If the
  callback itself accepts input/cancellation, only the outer result may be unaffected: the whole view
  changed through a nested decision. CL-3 constrains semantic deadline evaluation, not explicitly all
  extra host reads. Decide what read-count/no-mutation assertions mean; do not require rollback of a
  callback's independently accepted decision.
- **O5 — unindexable losers.** CX-6 specifies exact canonical identity/content retry. For malformed or
  unobservable coordinates/content, §10 proposes an unindexed rejection each time. Confirm encoding
  and retained fields: sources decide fence/nondisclosure, not retry object identity for a proposal
  without usable identity. Well-formed different proposals must never alias older evidence.
- **O6 — terminal classifications (design Q4 plus redelivery).** Decide cancellation's Outcome and
  redelivery tokens while preserving COMPLETED/FAILED behavior unless explicitly changed. Sources
  require no reopen and receipt-before-fence; they do not require one refusal token for all controls.
- **O7 — timer key contract (design Q6).** Host-only versus scoped entries, malformed/mismatched key
  classification, and whether deadline in a supplied key is descriptive or part of identity are
  binding choices. It must not override the persisted deadline. Specify forming a key for a wait
  expired at registration (A13), which never appears in pendingTimers.

F1 needs no invented decision about a reachable older eligible result: sources already foreclose
it. The choice is how to correct the evidence claim, not whether to accept a forbidden history.
Questions go to the owner/design check and do not block delivery of this authorized attack artifact.

## Reproduction and observed results

Repository-root commands on **Node v26.10.0, Darwin arm64**. This session explicitly used
`/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node`; PATH's default was v25.2.1.
No full verify, full npm test or mutation registry run was performed, per the owner's request.

```sh
node --test docs/development/work/K1.3/attack-01/*.test.mjs
node --test tests/conformance/k0/selector-isolation.test.ts tests/conformance/k0/oracle-discrimination.test.ts tests/conformance/k0/interactions.test.ts
node --test packages/kernel/tests/terminal.test.ts packages/kernel/tests/late-reports.test.ts
```

| Check | Result | What it establishes |
|---|---|---|
| Attached probes | 11/11, exit 0 | Evidence distinctions A01–A09/A14; no production implementation tested |
| Three selected K0 files | 198/198, exit 0 | Existing transcript oracle, isolation and interaction checks |
| Two baseline Kernel files | 15/15, exit 0 | Existing complete/fail accounting and late-report behavior, not new cancellation |
| Artifact checks | Passed | 24 unique attack rows, all nine criteria represented, local links/anchors valid, staged diff clean of whitespace errors |

The baseline Kernel command initially failed to load canonicalize in the fresh worktree. It passed
after linking already installed **canonicalize 3.0.0**, matching the pinned lockfile, into ignored
node_modules. No package/lockfile edits, downloads or new dependencies. New probes use Node built-ins
and original test-local examples; no third-party material is incorporated in the payload.

Exact selection-probe discrimination output:

```json
{"fiveExampleFailures":{"owned":[],"ignore-eligibility":["spare capacity","arrival after wake","timeout bound 2"],"freeze":["arrival after wake","timeout bound 2"],"sort-union":[]}}
```

Build handoff: resolve owner questions, correct F1/F2, and convert the source-decided rows to maintained
tests or documented equivalent-mutant entries. The design check then evaluates the revised mechanism
and evidence. This record grants no build approval, acceptance or successor release.
