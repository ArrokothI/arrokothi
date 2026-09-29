# K1.2-correction-01 contract — Activation identity

Revision 9. Parent K1.2 / milestone K1. This contract carries forward the complete
[K1.2 revision 9 requirement map](../K1.2/contract.md), including C1–C15, DEC-1–20,
coverage rows and exclusions, with V-D1 scoped only by the explicit owner decisions below. The additions below
resolve the binding choice released by [007](../../007-work-packets.md#k12-correction-01--kernel-minted-activation-identity-is-answerable)
and [invalidation-01](../K1.2/invalidation-01.md). Historical records remain unchanged.

Revision history: revision 1 selected the primitive-string Activation representation and its
coverage. Revision 2 addresses [review-01](review-01.md)'s K12C1-R1-DIAG-01 by separating exact
identity from bounded diagnostic rendering, records adjacent implementer-found diagnostic paths,
and qualifies engine-allocation limits (review-01 O1). No C1–C15 criterion or prior decision is
weakened. Revision 3 answers [review-02](review-02.md)'s AGG-01 and EVID-01: aggregate
rendering is bounded, equality and edge oracles are strengthened, and the K1.2 redelivery hold
renderer joins DEC-4. [Coverage-03](coverage-03.md) and its subsystem reconstruction precede code
changes; [coverage-02](coverage-02.md) remains the earlier plan. Revision 4 applies the owner's
[invalidation-02](../K1.2/invalidation-02.md): integrated value-capture refusal cost and its K1.2
consumers join this packet. [Coverage-04](coverage-04.md) is the pre-code reconstruction and proof
map for both review-04 findings. Accepted values, all four limits, single observation, ambient
safety, K1.1-correction-02 read bounds, decision-02 and C1–C15 remain binding. Revision 5 transcribes
[owner decision-03](../K1.2/decision-03.md), supplied explicitly in this session on 2026-09-27,
and [decision-04](../K1.2/decision-04.md), supplied on 2026-09-28. Decision-04 supersedes only
item 1 of decision-03 and resolves [blocker-02](blocker-02.md); decision-03 resolves
[blocker-01](blocker-01.md). The KC2-1/V-D1 claim follows their scope at its
[canonical owner](../../../../mental-model/concepts/values.md#fixed-semantic-limits): no time bound
is claimed for values containing live Proxies; plain data and Kernel-selected work stay bound.
Observation counts cover Kernel-selected operations, not callbacks the engine induces inside them.
No other semantic change is authorized; coherent Proxy acceptance, four limits and DEC-7 weights remain binding.

**Revision 6** applies owner [amendment 01](amendment-01.md) under
[decision-05](../K1.2/decision-05.md), both adopted on 2026-09-28.
- **Moves to K1.1-correction-03:** the value refusal-cost scope that revision 4 added. That covers
  V-D1, DEC-7's cost claim, SELF-R4-STRING-01's cost claim, and the V-D1 claim scope of decisions
  03 and 04. It also covers review 08's `K12C1-R8-VALUE-DEPTH-01` and `K12C1-R8-EVID-01`, and the
  time dimension of `K12C1-R4-VALUE-COST-01`.
- **Stays in this packet, as current behavior that must not regress:** DEC-7's diagnostic
  semantics, meaning bounded details, exact weights, order, type-only labels and bounded paths. The
  code at review 08's H also keeps the string preflight.
- **Claims:** this packet no longer makes any V-D1 claim. BASELINE records that claim as held.
- **Production code:** unchanged by revision 6.
- **Where to find the revision 4–5 cost text:** the DEC-7 and evidence paragraphs below are kept
  for their diagnostic rules, and their cost sentences are marked as transferred. Revision 5 at
  `2b8a50297ebe83cb0922bb239aa834a2ecebc1ac` preserves their exact earlier wording.

**Revision 7** applies owner [amendment 02](amendment-02.md), adopted on 2026-09-28, after
[review 09](review-09.md) (`K12C1-R9-HISTORY-01`, `K12C1-R9-CLAIM-01`).
- **Production changes allowed** for those two findings and for other in-scope defects of the same
  mechanism: a Kernel read of a member its object may not own, or any other point where
  caller-influenced ambient state can inject a value or run code between observation, mutation and
  retained evidence. Such defects are reported with separate provenance.
- **Requirements unchanged:** every revision-6 criterion and scope, the V-D1 transfer and
  decision-05, decisions 01–04, accepted values and single observation. No V-D1 claim is made.
- **Reconstruction:** the recovery-control/history subsystem is reconstructed under 006 (it was
  corrected before by `K12-R1-HISTORY-01` and `K12-R3-HISTORY-02`). [Coverage-06](coverage-06.md)
  is the pre-code reconstruction; DEC-8 and DEC-9 below record the binding rules it settles.
- **Evidence:** maintained oracles for review 09's 22-case matrix, the mutable foreign reference and
  both safe clear paths; mutants restoring the inherited optional read and moving history after
  mutation, rejected by the maintained suite.
- **Production-code line of revision 6** ("unchanged by revision 6") describes revision 6 only.

**Revision 8** answers [review 10](review-10.md) (`K12C1-R10-READ-01`, `K12C1-R10-COMMIT-01`), both
against the enforcement of DEC-8 and DEC-9 rather than their runtime behaviour. No requirement
changes; amendment 02's production permission covers the one same-mechanism fix.
- **Static enforcement.** Round 6's rules were denylists over the shapes they knew. Revision 8
  replaced them with a TypeScript analysis (permitted syntax, a checker classification of accesses,
  an effect analysis of calls) and claimed it enforced both rules for any code. [Review 11](review-11.md)
  disproved that claim, and revision 9 withdraws it. [Coverage-07](coverage-07.md) is the pre-code
  reconstruction and says why round 6 missed both findings.
- **Self-found, same mechanism:** `SELF-R7-UNSUPPORTED-01`. `UnsupportedKernelSurfaceError` assigned
  `this.name` through `[[Set]]`, which an accessor installed on `Error.prototype.name` received; `name`
  is now defined as the error's own field.
- **Evidence:** review 10's six reads and two regressions verbatim, every other equivalent form as a
  maintained negative control, and full-suite mutants that the enforcement files themselves reject.

**Revision 9** applies owner [amendment 03](amendment-03.md), adopted on 2026-09-29, after
[review 11](review-11.md) (`K12C1-R11-READ-01`, `K12C1-R11-COMMIT-01`), which found the runtime
correct in every reviewed case and the static enforcement unsound.
- **DEC-8 and DEC-9 stay binding coding rules.** Their acceptance evidence is now two runtime sweeps
  over the maintained scenarios, each with a declared scope (the DEC-8 and DEC-9 evidence bullets
  below). The analysis of revision 8 remains as a regression guard; the bullets state what it
  detects and its known gaps, including review 11's three forms. It proves neither rule.
- **Maintained probes:** review 09's 22-case matrix (maintained since revision 7), review 10's 30
  whole-view comparisons and review 11's reentrancy and fault probes on clean code.
- **Self-found, same mechanism:** `SELF-R8-REFUSAL-01`. A refusal advanced its Execution's refusal
  index before the refusal record was built and appended, so an exception there left a consumed
  position with no record. The fault sweep found it on every control's refusal exits; the record is
  now built and appended first.
- **Unchanged:** every other criterion and decision, amendments 01–02, decision-05, the V-D1 transfer
  and both invalidation holds. Enforcement by construction waits for DESIGN-AUDIT-01.

## Identity and authority

- Governing integrated base and process baseline: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Integrated prerequisites: K1.1/correction-01/reference-01 at `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`
  (accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`); correction-02 at
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032` (accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`).
  All are ancestors of the governing base.
- Owner release: explicit correction handoff in this task, 2026-09-26; release record at
  `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`.
- Start: exact release commit on `claude/k1.2-outcome-acceptance-receipts`; new branch
  `codex/k1.2-correction-01-activation-identity`, in a separate worktree. This owner-authorized
  departure from starting at integrated main preserves the cumulative unintegrated K1.2 candidate.
  Neither existing checkout is switched; no push to claude/main.
- Prior K1.2 H `c36cbe04f7c97f198794bfede972d4861247cca0`, payload C12
  `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`; [review-14](../K1.2/review-14.md).
- Previous corrective payload C1 `360538522be8c1b17d23948f632fd4f568a76ed0`, reviewed H1
  `6541115e2e5389a7e5cff86f87d857b4eb486d7d`; [review-01](review-01.md), recorded at
  `449b243cd31d5596c457e091233dfc4d77a4eff4`, is CHANGES REQUIRED. This is the same released packet.
- [Decision-01](../K1.2/decision-01.md) and [decision-02](../K1.2/decision-02.md) stand unchanged.
  No integrated creation/Execution-ID acceptance behavior changes; the owner amendment above authorizes refusal-cost correction.
- Round 3 starts from fetched `8a418d408f715e999a403a3e84b73a9db1b43712`, preserving
  reviewed H `312f2584d14b0c168c2152c373a4f07d4a292d74` and immutable review-04 evidence.
  The existing clean local checkout on this exact branch is fast-forwarded only; no other checkout
  is switched. This continues the owner-authorized cumulative branch departure above.
- Round 4 follows the owner's explicit instruction to continue from pushed
  `3287640f045cf2e6adeefcd32f21d897480a6a7d` on the same branch, with no checkout switches or
  history rewriting. [Coverage-05](coverage-05.md) and [exact coverage](exact-coverage-04.md)
  reconstruct review-06's two findings. The subsequently discovered [blocker-01](blocker-01.md)
  is resolved by the explicit owner decision-03, not by an implementer interpretation. The
  intermediate payload `a09223b0c27cd9831b2a85c948a57c8b347c3547` predates that decision;
  revision 5 requires a new payload C and clean validation.
- The subsequent [blocker-02](blocker-02.md), SELF-R4-HANDLER-01, is resolved by owner
  decision-04's single live-Proxy boundary. The intermediate payload
  `7249a64ce98ccebb9bd082909cdbbcced14fdb5c` predates decision-04. The final payload includes
  both verbatim owner records, canonical/baseline updates and deterministic descriptor/handler
  counts, then receives fresh clean-C validation. Independent review still decides acceptance.
- Round 5 (revision 6) continues on the same branch from owner record `13a73ad`, which follows the
  pushed review record `d7ac122f015b0272db7af1f89413b538192c072a`. It uses forward commits only.
  The owner directed that the review-08 session prepare this candidate, so that session cannot
  review it.
- Scope under revision 6: ID-01, EVID-01, DIAG-01, AGG-01/EVID-01, review-04 EVID-01 and review-06
  EVID-01, adjacent in-scope defects and optional observations. Review-04 VALUE-COST-01 and every
  V-D1 cost claim are transferred (amendment 01). No integration,
  self-acceptance, K1.3 or successor. Historical review-13 ACCEPT stays unchanged.
- Round 6 (revision 7) continues on the same branch from the pushed owner record
  `60eebc24113eb834e5d88015ca2a196c95c60493` (amendment 02), which follows review 09 of H
  `3b0848ce408ddef9165434f7d7c36e9580ac6341`. Forward commits only; the existing clean checkout
  already names the branch, and no other checkout or worktree is switched. The owner directed that a
  new Claude Code (Opus 5.5) session implement this round and GPT-6 review it. Scope adds
  `K12C1-R9-HISTORY-01`, `K12C1-R9-CLAIM-01` and same-mechanism defects (amendment 02).
- Round 7 (revision 8) continues on the same branch from the local review record
  `0efe0ba2ebb3fdde71ac8ab5b7a3ae048f5f5ac1` (review 10 of H `35c6ba0277542236f21f95d695154fa0164feb96`).
  Forward commits only; the existing clean checkout already names this branch. Scope: review 10's
  `K12C1-R10-READ-01` and `K12C1-R10-COMMIT-01`, and same-mechanism defects under amendment 02.
- Round 8 (revision 9) continues on the same branch from the pushed owner record
  `b93ed1df6b70569ada060481523e5b37c206e324` (amendment 03), which follows review 11 of H
  `dcac779bdf7e887bcf42c8a6407c1b24c2083a55`. Forward commits only; the existing clean checkout already
  names this branch. Scope: amendment 03's runtime evidence for review 11's `K12C1-R11-READ-01` and
  `K12C1-R11-COMMIT-01`, review 10's general outcomes, and runtime defects the sweeps expose.

## Binding decisions supplementing revision 9

**DEC-1 (Activation field):** an Activation identity is any primitive JavaScript string,
compared by exact UTF-16 code-unit equality. Empty strings, lone surrogates and long strings
are structurally well formed; they name a current/accepted exchange only on exact equality.
No coercion, normalization, prefix parsing, truncation, boundary-value Unicode validation or
65,536-scalar cap applies. Missing, non-string, boxed-string and unobservable fields remain
unusable. Caller-selected keys and value roots retain their existing checks.

**DEC-2 (classification):** use DEC-1 consistently for the replay lookup, independent currency
coordinate and content diagnostics in submitOutcome, preserving decision-02's complete order
and eager single observation. The three controls use the same identity rule but keep their
existing scope → control power → capture → terminal/open/currency order; decision-02 governs
fresh Outcomes, not a new ordering for controls.

**DEC-3 (replay):** within the engine-allocation qualification below, every minted Activation ID remains usable as a lookup key after takeover,
resolution, later dispatch and terminalization. Exact replay returns its original receipt without
requiring a grant or mutating state; different content under that ID conflicts.

The trusted namespace is only type-checked by packing in integrated creation, and may contain a
lone surrogate or exceed caller-text limits. Its inclusion in the minted ID is why merely removing
the length cap while retaining Unicode validation would still fail the release's invariant.
This is an additional implementer-found counterexample, not a reviewer claim. The binding imposes
no semantic namespace or Activation-ID length limit, but JavaScript's string-allocation maximum
still bounds representations and compositions. In particular, a trusted namespace just over half
that maximum can permit creation, dispatch and `continue` while derived Emission/result identity
construction throws before acceptance can mutate state. This correction does not change creation
or derived identity composition; it does not claim closure beyond the engine's allocation limits.
Tests cover
maximal accepted caller scope/key plus a long namespace and surrogate namespace, not a fictitious
maximum. The Layer-3 identity owner states the producer/consumer closure and records this binding
choice without fixing a wire format.

**DEC-4 (diagnostic identity):** the four Outcome/control boundaries and the K1.2-added
redelivery recovery-held refusal render an identity fragment
only when it has at most 128 UTF-16 code units, all printable ASCII; otherwise they use the fixed
text `<identity omitted>`. Apply this before concatenation to wrong caller identities, identities
proved equal by replay/current-exchange lookup, Execution IDs, duplicate Emission keys, and pinned
Definition/Runtime/codec names. A matched Kernel ID is not exempt: its spelling includes trusted
namespace and accepted caller scope/key. Identity-only refusal reasons are at most 1,024 units;
the missing-code reason is at most 600. Refusal records still retain the exact structured
`executionId`; accepted IDs, grants, lookup keys, receipts, output, dispositions, hold/history
coordinates and trusted actor attribution remain exact. Diagnostic lossiness never affects
classification, equality, authority, code-availability comparison or accepted content.

**DEC-5 (combined content diagnostics):** one content refusal renders the first eight captured
issues in their capture order, with root label and code (and message for Outcomes). At rendering,
a value-relative path keeps at most 128 printable ASCII UTF-16 units or becomes `<omitted>`, before
adding its root label; a message keeps at most 1,024 printable ASCII units or becomes
`<message omitted>`. Remaining issues are summarized as `N additional issues: code=count, ...`,
with every remaining code and its exact count, in order of first remaining occurrence. Thus every
captured issue contributes either a detail or a count. Details after eight lose their path/message,
not their code/count. Unknown-field and value-capture stopping rules remain unchanged; DEC-7 bounds issue retention during that same capture.

The complete Outcome/control content reason is at most 16,384 UTF-16 units, independent of issue
count or configured Emission capacity. Eight details cost less than 10,240 units (each <1,280:
root <64, relative path <=128, code <=32, message <=1,024, punctuation <32). The current 17 fixed
codes cost less than 1,024 units in the summary (each code <=32, each array-bounded count <=10
digits, separators); total and fixed wrapper cost less than 1,024 more. The declared bound leaves
headroom. A code-inventory test pins that proof dependency. This bounds rendering/retention. DEC-7 also bounds per-root diagnostic storage; a deployment whole-message budget stays separate.

The revision-2 premise that DEC-2 forbids a bounded rendered list was incorrect: the binding already
stops unknown-field reports at eight per holder and value capture at the byte limit. DEC-2 requires
one refusal for the content group; this summary preserves combined code evidence without expanding
all prose. Envelope projection runs when the selected refusal is rendered; value diagnostic storage is bounded during capture under DEC-7. Capture stays eager and exact
identity comparisons, decision-02 order and accepted data use their existing semantic inputs.
K1.1 creation/ingress consume the same bounded value diagnostics under DEC-7. identity.ts is unchanged.

**DEC-6 (explicit diagnostic payloads):** protocol reports and delivery failures retain their
existing first-1,024-UTF-16-unit rule, including its treatment of non-ASCII text and split surrogate
pairs. Their hold/history aliases add fixed explanatory text. They are distinct from identity
fragments and are not silently sanitized by DEC-4/5. Inspection returns retained evidence; it does
not render caller identity anew.

**DEC-7 (diagnostic storage; its V-D1 cost claim transferred by revision 6):** preserve the complete existing traversal, including its
byte-limit stop, single observations and eager capture of sibling roots. The cost claim follows
[values](../../../../mental-model/concepts/values.md#fixed-semantic-limits) with
[decision-03](../K1.2/decision-03.md) and [decision-04](../K1.2/decision-04.md)'s owner-authorized
scope; Kernel-chosen lookups and plain data remain covered. Deterministic descriptor- and
handler-probe evidence must pin Kernel-selected observation/invocation counts, byte-stop behavior
and unchanged coherent-Proxy acceptance. No time bound is claimed for values containing live
Proxies; their timing is an observation only. Engine-induced callbacks are not counted or promised. During each root's capture,
retain the first eight issue details, bounded with DEC-5's relative-path/message rules, and then
one exact occurrence counter per remaining code, ordered by first remaining occurrence. No accepted
value, scalar-read upper bound, container read bound or semantic limit changes. The adjacent
SELF-R4-STRING-01 correction preflights UTF-16 length: above twice the scalar limit, no valid
string can fit, so it refuses before a character access can flatten the entire oversized string.
This also applies to member names. It reports `string_too_long` without scanning such a string,
even if it also contains a lone surrogate; no rejected content is accepted or repaired. The bounded
scalar scan remains for lengths at or below that preflight threshold. Full-length refusal charging
and byte stopping remain unchanged. See [string closure](string-closure-04.md). Diagnostic path construction
must itself be bounded before concatenating caller-sized names; omission persists below an omitted
ancestor. Diagnostic type labels use only null/typeof classification and never inspect caller properties or
array structure, including on thrown values. No raw unbounded diagnostic is retained for later rendering. Consumers preserve weights:
all captured issues still contribute either a detail or their exact code/count; summary entries never
consume a detail slot. The summarized suffix carries no invented location. Creation/ingress and direct
value validation also report the bounded details and counted remainder. This is diagnostic storage,
not a new root-validity limit, an early refusal, a skipped sibling or a whole-message cap.

**DEC-8 (no Kernel read of a member its object may not own; revision 7).** After the first caller
observation, and on every commit, replay, redelivery and projection, the zone performs no ordinary
access to a member its object may not own, read or write. This is C13's rule applied to reads:
- **Kernel records** own every field they declare. Each is built by one object literal, and the zone
  reads only declared required members. Recovery history records are built by positional builders,
  so a record owns exactly its fields; only a takeover's `cleared_by_takeover` record owns
  `resultingEpoch`. No retained record holds a caller-owned object.
- **Caller envelopes** are read only through `observeOwn` (values.md's inherited-field rule).
- **Trusted host objects** (the authenticated caller, the coordinator options, the Driver) keep
  their ordinary reading for required members, which the host owns by contract. An *optional* member
  (`controlScopes`, `mailboxCapacity`, `emissionsPerOutcome`, `isSafeToReplace`) is resolved by
  `hostMember`: on the host object or its own prototype chain, stopping before `Object.prototype` and
  `Function.prototype`. A member only a built-in prototype would supply is absent: no control power,
  no declared limit, no safe-replacement guarantee. Members a class or a host prototype supplies are
  still honored, so class-based Drivers keep working. This settles only the ambient case the current
  C13 rule already forbids; the broader in-process threat model stays with DESIGN-AUDIT-01.
- **Engine-built property descriptors** are the only objects whose optional members the zone
  accesses. `enumerable` is owned by every descriptor, and `value` is read after `hasOwnValue` or on
  the data descriptor of a Kernel-built record's own data field.
- **Evidence (revision 9, amendment 03): the poisoned-prototype sweep.** While a Kernel boundary call
  runs, every member name the zone uses is an accessor on `Object.prototype` and `Function.prototype`
  (amendment 03's two), and on `Array.prototype` and `String.prototype`, where Kernel lists and strings
  would find a live method C13 forbids. A correct zone resolves every member it reads on the object or
  on a host or class prototype below these, so none of these accessors may run from a zone frame, and
  every boundary result must equal an unpoisoned run. Code in `packages/kernel/tests/sweep/`:
  - *Name set* (`zone-names.ts`): derived from the 13 zone sources. Every name spelled in a member
    position (property-access names, literal element keys, members declared by interfaces, type
    literals, classes and object literals) and every identifier-like string literal, because the zone
    passes member names to `observeOwn`, `observeField` and `hostMember` as literals. Added: the names
    the engine reads for operations the zone could perform (conversion, iteration, `then`, `toJSON`,
    `instanceof`, species, the function protocol, `length`, `name`, `message`) and the indices 0–15.
  - *Attribution:* the first non-built-in stack frame above the accessor. A zone source or the
    `canonicalize` dependency is a Kernel read. A registered Proxy handler as receiver is the engine
    looking up a trap the caller's handler lacks, which is Proxy semantics of a caller-owned object.
    Any other frame is caller code, answered exactly as the prototype would have answered.
  - *Modes:* count, throw and reenter (which appends an input to every visible Execution from inside
    the read), each compared call by call with an unpoisoned run. A probe read proves the accessors
    live in every window.
  - *Scope, whole suite* (`run-poison-sweep.ts`, validation): every maintained Kernel test file except
    the two sweep files, with a window around every public `ExecutionCoordinator` method, its
    constructor and every zone function a test file imports. The six property-descriptor field names
    are not installed here: test callbacks convert ordinary descriptor literals, which such names would
    change for the caller rather than the zone.
  - *Scope, catalog* (`poison-catalog.test.ts`, in `npm test`): every public boundary with accepted,
    idempotent and refused exits, the delivery-report capability, and the zone paths the suite does not
    reach. Its callbacks use null-prototype descriptors, so the complete name set is installed.
  - *Reach:* the suite and the catalog together execute every zone line except `boundDiagnostic`'s catch,
    which only an engine fault reaches (the fault sweep does), and a defensive byte-limit re-check in
    `values.ts` that the running byte count makes unreachable (V8 line coverage in the validation log).
  - *Cannot see:* `[[HasProperty]]` (`in`), which runs no accessor; members of other built-in prototypes
    (`Error.prototype.name` has its own runtime test); paths no scenario reaches; names the zone would
    build at run time other than indices 0–15.
- **Guard: revision 8's static analysis** (`ambient-reads.test.ts` with `zone-analysis.ts` and
  `zone-inventory.ts`, repository `tsconfig.json`, all 13 sources). A regression guard for plausible
  accidental forms; it proves nothing about all possible code.
  - *Detects:* syntax outside an allowlist (destructuring, the iteration protocol, `in`, `instanceof`,
    `==`/`!=`, `++`/`--`, `await`/`yield`, labels, `super.x`, `arguments`, assignment patterns); a named
    access to a member declared optional, resolved to no declaration (index signature, `any`) or
    declared by TypeScript's `lib` and reached after load (own `length` excepted); computed keys; object
    spread; implicit conversion of a possible object; `lib` globals read after load; a caller envelope
    used other than through observation, and a non-`caller` parameter of a public coordinator method
    used other than by comparison, test or hand-off to a call; a type assertion or predicate that makes
    a declared optional member required, or that introduces members on a type declaring none. Every
    such site must match a reasoned entry in `zone-inventory.ts`; a guarded descriptor read must keep
    its `hasOwnValue` precondition, a bounded index read its loop bound, and every `hostMember` key must
    name an optional member of its holder.
  - *Known gaps:* an assertion or predicate that introduces a member absent from a partially declared
    type (review 11: a `Pick<ExecutionRecord, "executionId">` cast to a type with `resultingEpoch`; a
    `Base` to `Extra` cast or predicate); the same strengthening inside a nested member type; casts of
    `unknown`/`any` to primitives or lists, trusted as runtime type claims without checking that a
    `typeof`/`Array.isArray` test dominates them; declared types in general, so a host object missing a
    required member is outside it; and deliberately evasive programs (amendment 03 item 3).

**DEC-9 (recovery-control commits are prebuilt; revision 7).** `recoverExecution`,
`reportProtocolFailure` and `requestTakeover` observe their request, check accepted state, and then
build everything the decision retains or returns — the new hold, its history record, for a takeover
the receipt (position read, not yet advanced), Activation, grant and clearing record, and the answer —
from Kernel data only, before anything changes. The apply phase appends the prebuilt records first
and then performs plain writes of fields the Kernel's records own. It constructs nothing, reads no
caller-influenced state and runs no caller code. The Driver is handed a takeover's new attempt only
after the whole decision is recorded.
- **Fault coherence.** For entry, update and declaration clear, the apply phase is one append (the
  only call) followed by writes that call nothing, so no fault, including an engine exception, leaves
  a hold changed without its history record or a record without its hold; the answer is prebuilt, so
  nothing is built after commit. A takeover's apply phase has two appends (receipt, then clearing
  record). Like Outcome acceptance (DEC-10), it claims only that no caller-reachable code or read lies
  between the first and last mutation; engine resource exhaustion inside it is outside this in-memory
  packet's claim. A refusal exit is a decision too: every refusal record is built and appended before
  its Execution's refusal index advances (revision 9, `SELF-R8-REFUSAL-01`).
- **Evidence (revision 9, amendment 03): the fault-injection sweep** (`sweep/fault-child.ts`; the
  scenarios with few operations run in `npm test` through `fault-sweep.test.ts`, the complete sweep
  in `npm run test:kernel-sweeps`).
  - *Mechanism:* in its own process, before the Kernel is imported, every built-in method the zone
    captures at load is replaced by a counting wrapper, so the zone's load-time references are the
    wrappers; the serializer window reinstalls the same references for `canonicalize`. The list is
    derived from the zone's top-level captures (member chains rooted at a global), plus the Array
    iterator's `next`. For each scenario the target call runs once to count its N operations, then
    once for each k = 1..N on a fresh coordinator with an exception thrown at operation k, then once
    with k = N + 1.
  - *Observation:* after each run, the whole inspection view; the positions the next refusal and the
    next accepted input receive; and what the grant the Driver received at setup can still do. Neither
    index nor the current grant is in the view.
  - *Oracle:* every run leaves a state some complete decision explains. A thrown fault leaves the
    no-call state exactly. A contained fault that returns a refusal leaves the no-call state plus
    exactly that refusal, or nothing for a refusal naming no Execution. A contained fault that returns
    acceptance leaves the uninjected decision, or for a protocol-failure report whose diagnostic could
    not be read, the fallback-diagnostic decision. A takeover whose delivery fails after its commit
    leaves the decision with its own delivery row absent, pending or failed. The two apply windows the
    fault-coherence bullet declares are reported, and accepted only at an apply-kind operation (a
    define, own-descriptor read, own check, `Reflect.apply` or `Map.set`), for a takeover only as
    exactly its receipt appended. Review 11's seed, a fault immediately before the takeover's new
    Activation is built, is asserted by name: the view is unchanged and the next input receives
    position 3.
  - *Scope:* 37 scenarios, covering every exit of `recoverExecution` (12), `reportProtocolFailure` (7)
    and `requestTakeover` (8), and the accepted and refused exits of Outcome acceptance (10). Only
    intercepted operations are fault points. Property access, allocation, constructors and string
    building cannot be interrupted, and an engine fault there stays outside this packet's claim. A
    change invisible at the boundary (module state, a write of the value already held) is outside
    what it can observe.
- **Guard: revision 8's effect analysis** (`control-commits.test.ts` with `zone-analysis.ts`). A
  regression guard; it proves nothing about all possible code.
  - *Detects:* a call that resolves to neither zone code, a classified primordial nor an inventoried
    foreign call; for each control, a mutation of anything reachable from accepted state before its
    apply suffix, other than a refusal exit, through any assignment operator, `delete`, a mutating
    primordial or a helper that mutates an argument, with provenance followed through aliases,
    containers, constructors, closures and callbacks; a suffix outside its grammar (appends of prebuilt
    locals, plain writes, the post-commit delivery, `return` of a prebuilt local); a foreign call after
    the first committed value is built; `applyControlCommit` outside its grammar; a write of a hold
    field, recovery history, receipts or the acceptance index by any other writer.
  - *Known gaps:* a parameter whose default initializer supplies a Kernel object when the call passes
    no argument (review 11's `reserve()` with `target = record`); an identifier spelled `undefined`
    bound to a Kernel object (review 11); frozenness of what foreign code is handed (argued, not
    checked); mutation of a control's own caller-supplied parameters (excluded); and deliberately
    evasive programs (amendment 03 item 3).

*Revision 6:* the cost-evidence requirements in this paragraph and in DEC-7 now belong to
K1.1-correction-03. What stays here is the exact-coordinate requirement, the weight and order
assertions, and the rule that the existing ablations still reject.
Review-04 closure requires deterministic allocation/cardinality evidence over every issue-producing
family and roots consumed by creation, ingress, Outcomes and controls; a practical eight-root
pre-authority schedule; P5 comparative cost runs; and a mutant restoring unbounded issue retention.
DEC-4 requires direct exact-value oracles at all retained/returned sites, including Emission identity
uniqueness across exchanges and receipt uniqueness across Executions with unrenderable minted IDs.
X8–X23-style mutations must be rejected against a clean control. Round 4 also requires exact
creation/ingress/dispatch/takeover receipt tokens, redelivery answers, carried Event destinations and
inspection coordinates, with Z1–Z16 and diagnostic-lookup mutations. The inherited V5 raw-message
retention mutant becomes equivalent when the caller-message producer is eliminated; run and report
it as such, and use the restored diagnostic-lookup producer mutant for the live obligation. Existing ablations stay required;
any changed test of raw diagnostic representation must be explicitly replaced by a stronger weighted
code/count assertion, never by dropping its ordering/authority/forbidden-mutation checks.

## Proof methods and pre-implementation coverage

Use 012 normative decisions, deterministic execution, in-process race/fault and process/documentation
methods, with the revision-9 map below carried forward in full. Native fidelity (R1), external E1
(K1.4), persistence/process death (K3), packaging/public release (S1) remain excluded; no claims made.

| Obligation/source | Distinguishing schedule | Expected facts / forbidden changes | Evidence plan |
|---|---|---|---|
| C1 scope, execution-cycle OA-1 | hidden/missing on all four surfaces with read counting | identical refusal; no reads after destination; hidden record unchanged | existing nondisclosure/authority suites + identity matrix |
| C2 replay, identity and decision-02 | long/minted-surrogate IDs accepted; replay after next/terminal, without grant; conflict | same receipt object; replay changes nothing; conflict adds only refusal | activation-identity tests + existing replay suites |
| C3 identity, ID-01/EVID-01 | key 65,536; 65,490 key through exchange 10; long namespace/scope; lone surrogate; empty, boxed, absent, revoked and throwing values | every minted ID answerable; wrong primitive string stale, non-string malformed only at its proper group; no lost state | activation-identity tests; inverse-X24 and old-limit ablations |
| C3/C10 order | terminal/no exchange/stale epoch/stale base/current × current/retired/forged/absent grant × valid/invalid content | decision-02 ordering; content diagnostic only after authority; refusal appends only one immutable record; still answerable | existing partial-claim matrix + text matrix |
| C3/C7 bounded content | all E-6 limits at/one past, capacity, Effects and await | root limits unchanged; whole refusal, wait/Effect content unread; no retry | existing limits/acceptance tests and ablations |
| C4 atomic one writer | acceptance plus outside-batch Event, synchronous and reentrant delivery | base+1, batch-only ack, output and receipt together, no partial commits | acceptance/transaction/hostile suites |
| C5/C6 terminal and next | continue/complete/fail; queued non-batch input; terminal ingress | new exchange after continue; B-5 dispositions, terminal never reopens, input replay/conflict | terminal + long-ID lifecycle tests |
| C8 takeover | both review schedules, safe/unsafe/reentrant takeover, old grant | same ID/input, epoch+1, one new grant/receipt/delivery; old attempt fenced | identity + takeover/submission-lifetime suites |
| C9/C10 recovery | same long IDs on unavailable/available code and protocol hold; both clear paths | RUNNING; no progress/receipt/ack changes in hold; history + permitted actions correct; explicit clear then acceptance | identity + recovery/hold/history suites |
| C11 reports | late reports across takeover/resolution/new exchange | only own delivery row settles | late-reports/delivery-attribution suites |
| C12 evidence | replay/refusal/receipt/output/disposition/hold/inspection | retained immutable, per-Execution positions contiguous, no hidden activity | transaction/evidence suites + whole-view assertions |
| C13 observation | getters, revoked proxies, ambient prototype pollution | single observation; no coercion or live methods during classification; reentrancy ordered before checks | hostile suites + text matrix |
| C14 structure | cumulative inventory/import graph | existing private zone and 13-source-file inventory agree | architecture conformance guard |
| C15 Layer 3 | identity → cycle → recovery + BASELINE/DEC-1/2/3 | one owner per rule, binding choice distinguished from architecture, decision-02 provenance and wording corrected | source/link audit |
| DIAG-01 / C3,C8–C10 | visibility-only Outcome caller and authorized controls; wrong 50,000,000-unit, lone-surrogate and engine-maximum IDs; open/resolved/terminal states | refusal returned and recorded, bounded identity fragments, no exception or accepted-state change, later current answer accepted | round-2 diagnostic matrix and memory-heavy probes |
| R9-HISTORY-01 / C9,C10,C12,C13, DEC-8/9 | review 09's 22 cases (6 transitions × none/data 777/throwing/reentrant inherited `resultingEpoch`), mutable foreign object, both safe clears; counting accessors on every record field name during observation and as residue | no inherited read, exception or nested callback; one record per decision owning exactly its fields; takeover alone owns `resultingEpoch`; causal order; answer equals committed holds | `recovery-ambient.test.ts`; review-09 matrix `--expect-correct`; round-6 mutants H1–H14 |
| Same-mechanism host members / C8,C10,C13, DEC-8 | Driver without `isSafeToReplace` plus inherited one (during observation, residue, function-object Driver); residue `controlScopes` on all three controls; residue limits at construction; class and host-prototype members | `unsafe_replacement`, `unauthorized_control`, defaults 1,024/256, with no control-state change; class/host-prototype members honored | `host-members.test.ts`; `probe-host-members-06.ts`; mutants H15–H21 |
| Structural rules / DEC-8/9 (revision 7) | TS-checker inventory; control-commit ordering scan; synthetic probe of each forbidden form | a new optional/dynamic/`in` access, construction after first mutation or hold write outside the commit paths fails | superseded by the two rows below; mutants H3–H7, H22 still rejected |
| R10-READ-01 / DEC-8, C13 (guard since revision 9) | review 10's six reads; nested, rest, default, parameter, catch and loop destructuring; iteration; `in`; `instanceof`; `==`; `++`; `await`; generators; `super.x`; `arguments`; casts that hide optionality or introduce members; index signatures and `any`; built-in members and globals after load; object coercion; envelope reads, aliases, spreads and hand-offs | every form reported; the zone's sites all inventoried with reasons; clean probe reports nothing | `ambient-reads.test.ts`; `ablations-07.mjs` R1–R12; rebound review-10 probe |
| R10-COMMIT-01 / DEC-9, C8–C10, C12 (guard since revision 9) | review 10's early `#mint` and `++`; compound, element, logical and `delete` writes; const/let aliases; bindings set by logical assignment; fresh containers and constructed objects holding a Kernel list; closures; callbacks; `mapSet`; `freeze`; module-state builders; refusals outside exits; untested helpers; laundering through `unknown`; Kernel objects handed to foreign code; construction, foreign code and delivery in the wrong order | each mutant reported by the rule it violates; unmodified source clean; summaries independent of analysis order | `control-commits.test.ts`; `ablations-07.mjs` C1–C16 |
| R11-READ-01 / DEC-8, C12, C13 (revision 9) | every maintained Kernel test file with every zone member name poisoned on four built-in prototypes (count, throw, reenter) during every boundary call; a catalog of every boundary exit and the paths the suite misses, with the descriptor fields poisoned too; review 11's Pick-cast read and 15 other read mutants | no accessor reached from a zone frame; every call's result equal to the unpoisoned run; liveness in every window; the in-scope mutants rejected, `in`, an own read respelled and `Error.prototype` reported as outside | `sweep/run-poison-sweep.ts`; `poison-catalog.test.ts`; `sweeps-08.mjs` |
| R11-COMMIT-01 / DEC-9, C8–C10, C12 (revision 9) | an exception at every intercepted operation of 37 scenarios (every exit of the three controls; Outcome acceptance); review 11's seed; review 11's two and review 10's two mutants plus C3–C16 | every fault leaves a state a complete decision explains, checked on the whole view, both next positions and the setup grant; seed: view unchanged, next input at 3; the in-scope mutants rejected, C8/C10/C12 reported as invisible at the boundary | `sweep/fault-child.ts`; `fault-sweep.test.ts`; `sweeps-08.mjs` |
| SELF-R8-REFUSAL-01 / DEC-9, C12 (revision 9) | a fault while a refusal record is built or appended, on every control's refusal exits | no refusal position consumed without its record | the fault sweep: at reviewed H, 57 violations in the 19 refusal-exit scenarios, every one while a refusal record is built or appended; none after the fix (`probe-reviewed-h-08.mjs`) |
| Maintained probes (revision 9) | review 10's 30 whole-view comparisons; review 11's inherited-read probe in three arms | review 10's assertions; review 11's clean results | `whole-view-ambient.test.ts`; `review-11-probes.test.ts`; review 09's matrix stays in `recovery-ambient.test.ts` |
| SELF-R7-UNSUPPORTED-01 / DEC-8, C13 | accessor on `Error.prototype.name` while an unsupported surface throws | the accessor receives nothing; the error owns its name | runtime case in `ambient-reads.test.ts`; probe at H and C; mutant R10 |
| R9-CLAIM-01 / C15, amendment 01 items 3–4 | alias search over live source, BASELINE, 007, Layer 3, guides | no live V-D1 implementation claim; values.md normative text and sealed records unchanged; roadmap points at the split | search log; `values.ts` comments; roadmap |
| Diagnostic dependencies / C2,C3,C8–C13 | accepted conflict, matched coordinates, control revalidation, missing pins and history, malformed member/constructor names, duplicate Emission key | every renderer follows DEC-4/5; every captured content issue contributes detail or code/count; exact structured identities and K1.2-DEC-8 explicit diagnostic semantics unchanged | round-2 tests and renderer-specific ablations; reconstruction inventory |

Unknown-field diagnostics (O3) may be bounded separately without modifying keys or accepted content;
any such change needs a distinguishing test and ablation. Every existing test and all 36 original
K1.2 ablations must still pass/reject respectively. No semantic regression is removed; revision-3 raw diagnostic storage assertions are updated to DEC-7 and their replacements documented.

## Commands and handoff

*Revision 9 validation* adds, on clean C: the complete fault sweep (`fault-child.ts`, its JSON
report); the whole-suite poison sweep in four modes (`run-poison-sweep.ts`); zone line coverage of the
maintained suite with and without the catalog; the sweeps' negative controls (`sweeps-08.mjs`); the
sweeps and the new maintained probes against a disposable worktree of reviewed H
(`probe-reviewed-h-08.mjs`), where the probes must reproduce review 11's recorded clean results and the
fault sweep may report only `SELF-R8-REFUSAL-01`; and a diff check of this round's payload. Every
earlier runner is rerun and must still reject.

*Revision 8 validation* adds, on clean C: `ablations-07.mjs` (each mutant must also be rejected by
an enforcement file), the review-10 enforcement probe through a digest-checked adapter that runs its
six reads against the new analysis and its two regressions against the full suite, the new enforcement
files against the reviewed H's source (they must fail there), the `unsupported.ts` probe at H and C,
review 10's whole-view probe in a disposable copy (it writes into its sealed directory), and a
diff check of this round's payload.

*Revision 7 validation* adds, on clean C: the round-6 mutants (`ablations-06.mjs`), the review-09
probes (the two reproducers now exit 1 because the defect no longer reproduces; the matrix runs
plain and with `--expect-correct`), `probe-host-members-06.ts`, and `ablations-03-rebound-06.mjs`.
The reconstruction removed the spans review-04's X12, X18, X19 and X20 anchor on; the round-3 runner
is still run and disclosed, and the adapter rebinds only those four anchors to the spans that now
carry the same coordinates, with the same wrong semantics.

*Revision 6 validation* runs on clean C, and it covers everything listed below. Cost probes and
timing runs are observations only: they no longer decide acceptance for this packet.
Iterate with targeted tests. Commit payload C, then run on clean C: `npm run typecheck`, `npm test`,
`npm run test:kernel`, `npm run test:conformance`, `npm run test:sdk`, `npm run check:builder-docs`,
`node docs/development/work/K1.2/ablations.mjs`, correction ablations and the retained review-11 probe.
The sealed original ablation command must still be run and its result disclosed. Where diagnostic
literal changes invalidate its exact textual anchors, the payload `original-ablations-02.mjs`
verifies the sealed runner's SHA-256 and adapts only B6/B12/B13/B14 literal spelling in a temporary
script. Its 36 mutations and full-suite control/oracles are unchanged; no NOT APPLICABLE is counted
as rejection. Both raw runs are retained. Correction I1–I7 and every new renderer mutation require
clean controls and actual test failures. The separate suites retain revision 9's requested evidence
even though npm test is a superset.
Run `npm run test:evals` as requested regression evidence; no Agent quality claim is made.
Also run the revision-4 refusal-cost and exact-coordinate runners (including review-04 P4/P5), and review-01/review-02 probes and the engine-max probe sequentially with explicit heap limits.
The sealed original runner currently exits 1 with B6/B12/B13/B14 NOT APPLICABLE; the adapter is
substitute evidence. B..C diff-check exits 2 on sealed historical logs; disclose this rather than
editing them. validate.mjs retains raw exit status and therefore exits nonzero for those results. Attach raw logs, exact commands,
versions, exits/counts and SHA-256 manifest in H with the numbered implementation report and only the correction's
007 status row. C/H follow 006/008. Verify configured remote and remote branch SHA; if push is
unavailable, provide verified bundle/full source plus binary cumulative patch.

Third-party reuse: none new. Existing canonicalize dependency and licenses unchanged.
