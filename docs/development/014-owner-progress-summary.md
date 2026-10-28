# Owner progress summary

Snapshot: checked 2026-10-28 against remote main `22c8c1db9958049eb8693dd5aa4d7005f2d565db`.
K1.3 is independently accepted at H `47c0b7f1c089260991649a6d814ad7db22b54a2f`, over payload C
`c7abff65ceca3e3b21fd64ffee12ea2f636f5cbc`; review 03 is recorded at
`3ad961d354ac551a3629b5f24e2e89085a6e5701` and its acceptance transcription A at
`5da5ec2d0223a98e311101d7c3969339c789e716`. Its [cleanup](work/K1.3/cleanup-01.md) is complete;
integration awaits the owner's manual merge. The benchmark checkout inspected was
`8de04779d279dba82cf834d419e465d2b677ef46`; its E1 ledger still records `BLOCKED_EXTERNAL` and no gate result.
The [status ledger](007-work-packets.md) and linked records own acceptance, integration and release.

| Area | Current position |
|---|---|
| K0 | Closed |
| K1.0 / earlier K1.1 work | Accepted, integrated and owner-closed; the V-ENV claim is released for the bytes core only (below) |
| Repository cleanup and planning | DOCS-CLEANUP-01 and PLAN-01 accepted, integrated and owner-closed; the archive is kept locally only, by owner choice, and was re-verified on 2026-10-02 |
| Value-capture refusal bound | K1.1-correction-02 accepted, integrated and owner-closed; K1.1-correction-03 restores its V-D1 claim as a metered bound |
| K1.2 Outcome acceptance | K1.2 and its cumulative correction K1.2-correction-01 accepted, integrated and owner-closed; the earlier H14 integration hold is lifted |
| Value-capture claim holds | None remain. V-ENV ([invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md)) was released for the bytes core on 2026-10-22 ([hold release](work/BINDING-01/hold-release-01.md)); the SDK wrapper makes no V-ENV claim (017 L-01). The V-D1 and classification holds were released on 2026-10-19 ([hold release](work/K1.1-correction-03/hold-release-01.md)) |
| DESIGN-AUDIT-01 | Accepted, integrated and owner-closed. Owner [decision-01](work/DESIGN-AUDIT-01/decision-01.md) adopts CORE as the target direction and answers PROXY-01 (refuse every Proxy). [Decision-02](work/DESIGN-AUDIT-01/decision-02.md) gives the wrapper to the SDK, moved in stages |
| BINDING-01 | Independently accepted at H `b7a24c79`; integrated at `cd8d9250` (PR #53) |
| COORD-REFACTOR-01 | Independently accepted at H `23c8919f`; integrated at `d17ea6d1` (PR #56) |
| TOOLS-01 | Independently accepted at H `a50c3886`; integrated at `8f829003` (PR #45) |
| TOOLS-02 | In progress (released 2026-10-23, [release 01](work/TOOLS-02/release-01.md), scope B). Range 1 (T2-1, T2-2) independently accepted at H `34ab91a5de23beb4997cdd2ae209a3b67aac50a0` and integrated at `4015599e` (PR #59). Ranges 2–4 (T2-3 to T2-5) open. The whole packet must be accepted and integrated before K1.4 acceptance |
| TOOLS-02A | Independently accepted and integrated (PR #51). The composed verify passes in a clean checkout and runs in the [Packet verify](../../.github/workflows/packet-verify.yml) CI workflow |
| K1.1-correction-03 | Independently accepted at H `4b121d7b`; integrated at `b976f3a3` (PR #48) |
| Known limitations | [017](017-known-limitations.md) lists what is deliberately not guaranteed (L-01–L-16 and L-18–L-28) under 006 working principle 6 |
| K1.3 | Independently accepted at H above; cleanup complete; integration pending owner merge; no successor released |
| K1 / E1 | Open; benchmark E1 is BLOCKED_EXTERNAL with NO_RESULT at the inspected revision; supported-entry fixture confirmation remains pending |

## What has been achieved

**A private Kernel foundation.** The question was whether execution coordination could be separated
from the legacy runtime. On main, the private Kernel creates Executions, accepts input, reserves
batches, dispatches asynchronous Activations and, since K1.2, rules on their Outcomes (below).
K1.0 and the earlier K1.1 work are accepted, integrated and owner-closed. Waits and cancellation
are now accepted in K1.3, awaiting integration; mediated Effects remain K2’s. The supported application SDK still uses
the legacy core. [002](002-implemented-kernel-baseline.md) describes the implemented surface.

**Answerable Outcome acceptance.** K1.2, completed by its cumulative correction, answered whether
the Kernel can rule on an asynchronous Runtime's answer. The Kernel accepts the answer whole or
refuses it without changing accepted state, with one authorized writer per exchange through
takeover, recovery holds and late reports. The private Kernel now:

- accepts an Outcome whole or refuses it whole. An exact replay returns the original receipt and
  conflicting content is refused. A stale proposal is refused before submission authority is
  checked, and authority is checked before content.
- gives each Runtime attempt its own `SubmissionGrant`, handed over as the third `deliver`
  argument. Redelivery keeps the grant; takeover replaces it.
- on acceptance, acknowledges the whole reserved batch, installs progress, records Emissions and the
  typed result, and moves the Execution to `READY`, `COMPLETED` or `FAILED`. At `complete` or `fail`,
  every still-queued Event gets a terminal disposition.
- advances the writer epoch through control-authorized takeover, and only when the Driver declares
  replacement safe.
- keeps the Execution `RUNNING` under a code hold (pinned code unavailable) or a protocol-failure
  hold, with a visible reason, permitted next actions and a retained recovery history.
- lets a late delivery report settle only its own delivery row.
- can answer, take over, hold and clear every Activation ID it mints.
- bounds refusal diagnostics while keeping exact identities and issue counts.

Outcome acceptance and the three recovery controls build every record before changing state.
A fault-injection sweep over 66 declared scenarios checks this. A poisoned-prototype sweep checks
that the Kernel reads no member its objects may not own.

The lesson from its review history is that evidence tooling needs the same adversarial checking as
the code it judges. Most late findings were checks that recognized chosen regressions without
establishing the general claim. The accepted evidence names every comparison its fault checker makes,
shows each one is needed, and draws its list of control exits from the source rather than from the
scenarios.

Status: K1.2 and its cumulative correction are independently accepted, integrated and owner-closed;
K1.3’s accepted additions are described below and await integration. Limits:
- The Kernel is in-process and not durable. How submission authority survives a restart is open
  for K3.2.
- Effects (K2) and output reads (K4.4) remain unimplemented. Waits, deadlines and cancellation are
  present in the accepted K1.3 branch, pending merge.
- Kernel fencing does not stop a superseded native attempt; the Driver must exclude it or refuse
  takeover.
- The sweeps are finite evidence for their declared scenarios, not a proof over arbitrary future
  code.
- The supported SDK is unchanged.
- One value-capture claim inherited from K1.1 was held: code that runs before or during capture
  could declare a global `let JSON` that steers the canonical bytes, so a conflicting creation retry was
  answered as a replay ([invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md)). Since BINDING-01
  (below), it is released for the bytes core only. The refusal-cost and re-prototyped built-in claims are
  restored by K1.1-correction-03 (below).

**Waits, deadlines and cancellation.** K1.3 answered how the Kernel can pause for a declared observation
and order its arrival against timeout, cancellation and an Outcome without losing accepted input.
The accepted private Kernel branch now:

- accepts finite wait alternatives and input subscriptions, checks existing queued Events before the
  deadline, and retires each wait generation once;
- selects the next batch using the retired wait’s selector, preserving the required waking Event or
  timeout while retaining unmatched backlog;
- exposes an injected clock and host-fired timers, with an immutable optional Execution deadline set
  at creation;
- gives explicit cancellation and Execution-deadline expiry one logical terminal path, retains losing
  Outcome refusals for exact retry, and requests Driver cancellation after commit;
- checks the whole proposed successor’s declared state relations before writing, then commits exactly
  those admitted values. Structural controls and deterministic tests cover the mechanism.

The lesson is to check the state that will actually exist. Counts and agreement among selected plan
fields missed both changed disposition values and a newly appended timeout. The accepted mechanism
checks the complete successor and makes its application explicit.

Status: independently accepted at H in the snapshot; [cleanup](work/K1.3/cleanup-01.md) complete;
integration pending owner merge. Limits: this is the in-process private Kernel, not the supported SDK
bridge or an E1 result. It provides no persistence, physical stop, live trusted dependency-result ingress
or automatic recovery from an interrupted commit. A later governed call whose successor still violates
the checked relations throws; cancellation or retry does not always repair it. The bounded searches,
sweeps and evidence-credit limits remain as stated in [017](017-known-limitations.md) and the review.

**A root-cause audit of accepted design.** DESIGN-AUDIT-01 answered which choices accepted in
K0.1–K1.2 keep producing defect families, and what the owner's options are for each. It looked hardest at
the in-process capture threat model. What now exists, starting from [its register](work/DESIGN-AUDIT-01/register.md):

- A design-debt register. It covers 278 classified review-finding labels in 16 families and six items: the
  same-process threat model, the own-array and serializer environment, exotic classification,
  coordinator responsibilities, evidence infrastructure, and process notes. Each option has its cost,
  the accepted claims it would keep, narrow or remove, and how its follow-up would close.
- 23 decision drafts, with the adopted CORE direction and SDK-wrapper ownership recorded separately
  in the owner decisions below. The joint CORE draft describes a scoped contract, a canonical-bytes
  Kernel core, a caller-side
  live-object wrapper and a separate transport adapter. The proposed sequence is TOOLS-01,
  K1.1-correction-03, a binding packet, a coordinator refactor, then K1.3.
- A hostile-input corpus of 16 recorded labels and 8 serializer bindings, with executable
  expectations. It shows that Node's `--frozen-intrinsics` flag alone does not stop the serializer's
  bindings being replaced. Only bindings pinned non-writable and non-configurable before caller code
  refuse it.
- One verify command that regenerates the register, measurements and corpus checks.

The lesson from its review history concerns the corpus. Twice, a counterexample the corpus held had a
variant one access form further on that defeated the drafted closure: first replacing a whole global
binding, then declaring a global `let`. The second also defeated the integrated Kernel, which is the
invalidation-03 hold above. A corpus entry needs to vary how a binding is reached, not only which
binding.

Status: independently accepted, integrated and owner-closed. Owner
[decision-01](work/DESIGN-AUDIT-01/decision-01.md) adopts CORE as the target direction and answers PROXY-01:
refuse every Proxy at capture. Adoption ships nothing; the implementing packets change the canonical pages.
Limits:
- The audit itself changes no code and releases no held claim. Owner decisions select direction;
  the implementing packets must establish it.
- Per-option reconciliation closes by reading. Its checkers catch omissions, not wrong prose.
- Realm hardening is evaluated, not guaranteed. A declaration made before the binding starts remains
  outside every check that reads only the global object.
- Probes ran only on Node v25 and v26; no other engine was tried.

**Maintained packet evidence tooling.** TOOLS-01 answered how to check a packet's exact source and
historical evidence while keeping observations, credit and acceptance distinct. It now provides:

- A verifier for B/C/H identities, administrative file sets, preserved source and accessible evidence;
  a provenance inventory of 1,549 origins; and one composition for the declared checks.
- An isolated mutation runner with passing controls, reached witnesses and qualifying probe assertions,
  plus negative controls for the tooling's own refusal and comparison rules. Target-set observations
  remain separate and earn no kill.
- Revalidation of 154 earlier origin mappings: 107 close through checked routes and 47 remain
  explicitly transferred. A further 1,395 origins remain pending for TOOLS-02.
- A conservative intrinsic-contact register, attributed held witnesses and an advisory report of open
  origins in touched areas. The accepted corpus retains 49 preserved members and 15 target readings;
  it claims zero adoption kills.

The lesson is to require positive evidence before granting credit. Successive attempts to recognize
only dangerous syntax missed combinations that still reached a credited result. The accepted rule
holds every recognized intrinsic reference in the declared run set, with no safe-position exemption,
and checks the path from recognition through every credit consumer.

Status: independently accepted and [integrated](work/TOOLS-01/integration-01.md) at `8f829003`
(PR #45). Limits: this is development tooling, not a Kernel capability,
complete historical-corpus adoption, a sound analysis of arbitrary JavaScript, a hold release or an
E1 result. The advisory report blocks no packet. Live-provider, large-memory/timing and the recorded
known-base-failure profile were not run. The repository verification floor is now Node 26.10+;
this does not change the supported SDK's runtime declaration.

**A read census that unrelated files do not churn.** TOOLS-02's range 1 answered two questions. Can the
preserved-test read census stay valid when unrelated files are added, while still catching a real change to what
a test reads? Can any fixture be written from an unclean tree? The evidence tooling now:

- records each preserved test's reads by form. A named or fixture read keeps its identity at C; any other
  enumerated read is recorded by its walk root. Adding an unrelated file or test no longer invalidates the table.
- expands recursive listings for identity, compares them at the pin, and gives listing entries their type.
- admits only an explicit matrix of traced read calls. Any other traced call refuses preservation of its test.
  So do a recursive listing that crosses a symlink, a path that is not a Git entry at C under its exact spelling
  (rule P), and an options object whose prototype is neither `Object.prototype` nor `null` (rule O).
- refuses every fixture-writing operation in a checkout with entries not tracked at C, and makes a new
  `regenerate` operation the only writer of the preserved table. A bounded census classifies the tooling's
  writers.

The correction refused seven formerly preserved `mcp-boundaries` members, leaving 23 of 1,272 members preserved.
Their two origins went to range 4 for revalidation ([owner choice 03](work/TOOLS-02/owner-choice-03.md)); no other
member changed status.

The lesson from its review history is to state the threat model before the design. Each correction closed the
last counterexample, and the next review found another access form one step further on: a deeper listing, a
symlink, an array glob, a case variant of a path, an inherited options prototype. The drift ended when the owner
made the census's threat model cooperative test code and recorded evasive forms as a limit
([owner choice 05](work/TOOLS-02/owner-choice-05.md)).

Status: range 1 is independently accepted at H `34ab91a5` and [integrated](work/TOOLS-02/integration-01.md) at
`4015599e` (PR #59); TOOLS-02 stays in progress. Limits:
- Range 1 is part of TOOLS-02, not the packet. Target-set kill provenance (T2-3), the hold register's match with
  current claims (T2-4) and origin triage (T2-5) are open. The origin corpus and the hold register are unchanged
  apart from the two transferred origins above.
- The census assumes cooperative test code. A test written to hide a read from the trace can keep preservation
  credit (017 L-18). Reads the tracer cannot see, such as native or module-loader reads, are outside it.
- One value-cost registry case may exceed its 900 s timeout on a loaded local machine (L-16). The Packet verify
  CI run at range 1's C passed it.
- This is development tooling. It changes no Kernel behaviour, claim or hold, and gives no E1 result.

**Metered value refusal cost.** K1.1-correction-03 answered whether refusing a live value can be
proven to cost no more than accepting one at the limits, and whether capture can refuse Proxies and
re-prototyped built-ins instead of silently projecting them. The private Kernel's in-process capture
now:

- charges every operation it performs on a caller value to one work meter per root, with budget
  B = 3 × 1,048,576 units. No accepted value needs more, so the meter never refuses a valid value.
  Capture stops at the first unit past B, and nothing but unwinding runs after a stop.
- refuses every Proxy before any other look at it, at every depth and on every root consumer.
- refuses re-prototyped built-ins with internal slots by engine type checks before listing any keys,
  including null-prototype Maps, Dates and typed arrays, arguments objects and raw JSON.
- finds cycles in constant time per visit, so refusal work no longer grows with nesting depth.

Accepted values, canonical bytes and diagnostic weights are unchanged. The owner released the V-D1 and
classification holds on that basis ([hold release](work/K1.1-correction-03/hold-release-01.md)).

The lesson is to size the evidence to the claim. The production change is about a thousand lines in two
files. Review 01 found one real production defect, while reviews 02 and 03 found none: their findings
were about the evidence tooling, which grew far larger than the code. The owner
then limited blocking findings to real production defects and false current claims, and recorded the
deliberate limits in [017](017-known-limitations.md). That rule now applies to every packet (006
working principle 6).

Status: independently accepted at H `4b121d7b` and integrated at `b976f3a3` (PR #48). Limits:
- The bound is metered work, not wall-clock time. Four engine residuals (R1–R4), host interceptor
  objects and request-wide totals are stated limits (017 L-03–L-07, L-13).
- Re-prototyped built-ins without a cheap engine predicate (WeakRef, Temporal, Intl, iterators and
  others) are still accepted as plain data (L-08). A Proxy request envelope can still run caller code
  between root captures (L-09).
- The in-process binding has a cooperative contract; it is no defence against hostile code in the same
  process (L-02). V-ENV is now claimed for the bytes core only; BINDING-01 (below) moved capture out of the Kernel.
- The static checks are bounded syntactic guards, and mutation credit covers a declared assertion
  vocabulary only (L-11, L-12). The reviewer's run of the full verify failed on a census difference,
  which TOOLS-02A has since closed.

**A bytes-only Kernel value core.** BINDING-01 answered whether the Kernel can admit values without
trusting caller objects or the globals present at call time. The private Kernel now:

- takes each value root as a `Uint8Array`, copied into Kernel-owned storage on entry;
- validates it with its own strict canonical parser, which refuses invalid UTF-8, duplicate keys and any
  spelling other than the canonical one, using intrinsics captured at load;
- produces bytes identical to the earlier `canonicalize@3.0.0` identity over the accepted corpus;
- has an internal transport adapter that refuses any root over 8 MiB before decoding it.

Live-value capture, with its Proxy and brand refusals and its work meter, moved unchanged into
`packages/sdk` as an internal, unexported wrapper.

Status: independently accepted at H `b7a24c79` and integrated at `cd8d9250` (PR #53). Limits: the wrapper
keeps K1.1-correction-03's cooperative limits (017 L-04–L-09) and is Node-only. Realm hardening is not done
(L-01, narrowed to the wrapper). The decoder has no metered cost bound (L-14). The supported SDK surface is
unchanged until K1.4. The owner released the V-ENV hold for the core on 2026-10-22; the wrapper makes no V-ENV claim (L-01), and K1.4 must add a startup check or state L-01 before a public bridge ships.

**One owner for Kernel state.** COORD-REFACTOR-01 answered whether the coordinator can stop writing accepted
state itself, so that later packets add behaviour as new plan variants. The private Kernel now:

- forms each state-changing decision, refusals included, as one frozen, data-only plan of a closed union;
- applies plans only in `KernelState`, which holds the records privately and refuses a plan whose Execution
  changed after the plan was formed;
- gives the coordinator read-only readers, and a module rule check denies raw state access anywhere else.

Behaviour without engine faults is unchanged: every complete-decision scenario and both sweeps pass as before.
By [owner choice 01](work/COORD-REFACTOR-01/owner-choice-01.md), a decision or report whose build faults now
commits nothing. A faulting `dispatch` or `submitInput` no longer consumes a position or an Activation ID, and
a faulting delivery report leaves its row pending.

The lesson from its review is that a fault argument in a design needs a fault test. Review 01 found that a
creation-key fault left an Execution findable but unlisted. The design had considered that split and argued it
away.

Status: independently accepted at H `23c8919f` and integrated at `d17ea6d1` (PR #56). Limits: plan selection
and refusal precedence stay semantic claims, checked by the oracle and the suites (017 L-15). The structural
checks are bounded syntactic guards (L-11). The supported SDK is unchanged.

**A smaller current documentation tree.** DOCS-CLEANUP-01 answered how to preserve closed evidence
while making current guidance easier to find. The sealed archive and relocated active fixtures now
exist. The packet is accepted, integrated and owner-closed. By the owner's choice the archive is
kept locally only. [Archive](archive.md) records its verification and the Git fallback. This establishes no Kernel capability or gate
result.

**Bounded value-capture refusal.** K1.1-correction-02 answered whether a small shared object graph or
an oversized scalar could make refusal require unbounded Kernel traversal. Capture now charges each
occurrence while reading and bounds scalar/key scanning and descriptor classification. The work is
accepted, integrated and owner-closed. Its broader V-D1 claim, that refusing costs no more than
accepting at the limits, was held when some refusals were shown to cost more than the costliest
acceptance; K1.1-correction-03 restores it as a metered bound (above). Host
enumeration and caller callbacks remain outside the Kernel traversal bound. This implements neither
tombstone retention nor a wire decoder.

**An explicit product sequence.** PLAN-01 records the owner's direction: build the Kernel/Driver
foundation first, then ArrokothI's own Agent and Workflow systems. It also records packet preparation
obligations. The plan is accepted, integrated and owner-closed; it implements no runtime feature.

## The next few steps

TOOLS-02 remains in progress. K1.3’s implementation, review and cleanup are complete; the owner’s merge
and closure remain pending. No successor is released. The remaining dependencies below come from 007.

1. **TOOLS-02 ranges 2–4** follow range 1's integration, released with the owner's scope B
   ([release 01](work/TOOLS-02/release-01.md)): target-set kill provenance (T2-3), the hold register under current
   claims (T2-4), then origin triage with a sampled audit (T2-5). T2-4's design 03 sits on its own branch, outside
   range 1. The ranges also carry:
   - the remaining extraction, mention triage and mutation-family work;
   - the transferred origins: [choice 11](work/TOOLS-01/owner-choice-11.md)'s three origins, the limited member
     `kernel-landing-zone.test.ts:1200:9@deedd7950724`, the origins K1.1-correction-03 transferred, and the two
     `mcp-boundaries` origins range 1 reopened;
   - the P3 items from K1.1-correction-03's review 03 and from the [BINDING-01](work/BINDING-01/cleanup-01.md)
     and [COORD-REFACTOR-01](work/COORD-REFACTOR-01/cleanup-01.md) cleanups;
   - the rule-1 V-ENV hold-register entries and the origins those two packets reopened, without new credit;
   - revalidation of entries held under the released V-D1 and classification claims.

   TOOLS-02 must be accepted and integrated before K1.4 acceptance; 007 does not make it a prerequisite for K1.3.
2. **K1.4** owns the SDK host bridge and full K1/E1 gate, after K1.3 integration and TOOLS-02 acceptance
   and integration. It is unreleased. The supported SDK surface changes there, as
   [decision-02](work/DESIGN-AUDIT-01/decision-02.md) specifies, including BINDING-01’s startup check or an
   explicit L-01 limit in the public bridge contract.

   The benchmark owner still needs to confirm fixtures that drive the new supported entry before K1.3
   owner closure. In the inspected benchmark ledger, E1 remains `BLOCKED_EXTERNAL`: its prepared capture
   pins the K0 fixture at `0535160e677231da41b06d9f822e62e2f0364dd1`, all fifteen real-repository schedules
   are `REFUSED`, and the gate has `NO_RESULT`. That is a result about the old pin, not about the accepted
   K1.3 candidate. Updating the fixture binding and obtaining the benchmark owner’s decision remain
   external work; unavailable supported-entry fixtures block K1.4 acceptance. No E1 result is inferred
   from K1.3’s local tests or Packet verify.

Carry forward:
- the historical Node 22.22.3 legacy Effect-test cancellation limitation, distinct from TOOLS-01's
  accepted Node 26.10 verification and host-handle test fix;
- the reference review's five non-blocking P3 observations and its authentication limit;
- the limits stated in the K1.2-correction-01 report and review: finite sweeps, and runs on Node 25 only, with no
  Node 22 run (the poison sweep needs Node 22.15 or later);
- the audit review's three non-blocking P3 intake items for TOOLS-01 or the successor corpus, listed in
  the cleanup record.

Their scope remains in the ledger's pinned reviews. No new external benchmark result is claimed here.

## Maintaining this page

Rewrite this account in place when accepted results change. Keep a checked-revision snapshot,
current status table, concrete achievements and the next few steps. Explain the question answered,
what exists, its status and its limits; keep review rounds in packet records, decisions in 007 and
implemented capability in 002. Do not turn preparation, acceptance or cleanup into integration or
successor release.
