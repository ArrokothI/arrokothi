# K1.2-correction-01 contract — Activation identity

Revision 5. Parent K1.2 / milestone K1. This contract carries forward the complete
[K1.2 revision 9 requirement map](../K1.2/contract.md), including C1–C15, DEC-1–20,
coverage rows and exclusions, without weakening or removing a criterion. The additions below
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
[owner decision-03](../K1.2/decision-03.md), supplied explicitly in this session on 2026-09-27.
It resolves [blocker-01](blocker-01.md) and scopes the KC2-1/V-D1 cost claim at its
[canonical owner](../../../../mental-model/concepts/values.md#fixed-semantic-limits). It authorizes
no other semantic change; coherent Proxy acceptance, all observation bounds and DEC-7 weights remain binding.

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
- The subsequent [blocker-02](blocker-02.md), SELF-R4-HANDLER-01, requests owner clarification
  for required engine entry/dispatch work before a caller result exists. Decision-03 is not
  broadened to cover it. C3 and the dependent cost-scope assessments remain unresolved while
  this question is pending; passing unaffected tests does not establish review readiness.
- Scope: ID-01, EVID-01, DIAG-01, review-04 VALUE-COST-01 and EVID-01, adjacent in-scope defects, and optional observations. No integration,
  self-acceptance, K1.3 or successor. Historical review-13 ACCEPT stays unchanged.

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

**DEC-7 (value refusal cost, V-D1):** preserve the complete existing traversal, including its
byte-limit stop, single observations and eager capture of sibling roots. The cost claim follows
[values](../../../../mental-model/concepts/values.md#fixed-semantic-limits) with
[decision-03](../K1.2/decision-03.md)'s owner-authorized scope; Kernel-chosen lookups and plain data
remain covered. Deterministic descriptor-probe evidence must pin bounded observation/trap counts,
byte-stop behavior and unchanged coherent-Proxy acceptance. Timing of excluded engine descriptor
conversion is an observation only. During each root's capture,
retain the first eight issue details, bounded with DEC-5's relative-path/message rules, and then
one exact occurrence counter per remaining code, ordered by first remaining occurrence. No accepted
value, scalar scan, container read bound or semantic limit changes. Diagnostic path construction
must itself be bounded before concatenating caller-sized names; omission persists below an omitted
ancestor. Diagnostic type labels use only null/typeof classification and never inspect caller properties or
array structure, including on thrown values. No raw unbounded diagnostic is retained for later rendering. Consumers preserve weights:
all captured issues still contribute either a detail or their exact code/count; summary entries never
consume a detail slot. The summarized suffix carries no invented location. Creation/ingress and direct
value validation also report the bounded details and counted remainder. This is diagnostic storage,
not a new root-validity limit, an early refusal, a skipped sibling or a whole-message cap.

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
| Diagnostic dependencies / C2,C3,C8–C13 | accepted conflict, matched coordinates, control revalidation, missing pins and history, malformed member/constructor names, duplicate Emission key | every renderer follows DEC-4/5; every captured content issue contributes detail or code/count; exact structured identities and DEC-8 explicit diagnostic semantics unchanged | round-2 tests and renderer-specific ablations; reconstruction inventory |

Unknown-field diagnostics (O3) may be bounded separately without modifying keys or accepted content;
any such change needs a distinguishing test and ablation. Every existing test and all 36 original
K1.2 ablations must still pass/reject respectively. No semantic regression is removed; revision-3 raw diagnostic storage assertions are updated to DEC-7 and their replacements documented.

## Commands and handoff

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
