# K1.2-correction-01 contract — Activation identity

Revision 1. Parent K1.2 / milestone K1. This contract carries forward the complete
[K1.2 revision 9 requirement map](../K1.2/contract.md), including C1–C15, DEC-1–20,
coverage rows and exclusions, without weakening or removing a criterion. The additions below
resolve the binding choice released by [007](../../007-work-packets.md#k12-correction-01--kernel-minted-activation-identity-is-answerable)
and [invalidation-01](../K1.2/invalidation-01.md). Historical records remain unchanged.

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
- Previous reviewed H `c36cbe04f7c97f198794bfede972d4861247cca0`, payload C12
  `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`; [review-14](../K1.2/review-14.md).
- [Decision-01](../K1.2/decision-01.md) and [decision-02](../K1.2/decision-02.md) stand unchanged.
  No integrated creation/Execution-ID behavior changes; no owner amendment is needed.
- Scope: ID-01, EVID-01, adjacent in-scope defects, and optional O1–O3. No integration,
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

**DEC-3 (replay):** every minted Activation ID remains usable as a lookup key after takeover,
resolution, later dispatch and terminalization. Exact replay returns its original receipt without
requiring a grant or mutating state; different content under that ID conflicts.

The trusted namespace is only type-checked by packing in integrated creation, and may contain a
lone surrogate or exceed caller-text limits. Its inclusion in the minted ID is why merely removing
the length cap while retaining Unicode validation would still fail the release's invariant.
This is an additional implementer-found counterexample, not a reviewer claim. There is no finite
longest minted ID in this binding: namespace length is not semantically bounded. Tests cover
maximal accepted caller scope/key plus a long namespace and surrogate namespace, not a fictitious
maximum. The Layer-3 identity owner states the producer/consumer closure and records this binding
choice without fixing a wire format.

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

Unknown-field diagnostics (O3) may be bounded separately without modifying keys or accepted content;
any such change needs a distinguishing test and ablation. Every existing test and all 36 original
K1.2 ablations must still pass/reject respectively. No previous test is removed.

## Commands and handoff

Iterate with targeted tests. Commit payload C, then run on clean C: `npm run typecheck`, `npm test`,
`npm run test:kernel`, `npm run test:conformance`, `npm run test:sdk`, `npm run check:builder-docs`,
`node docs/development/work/K1.2/ablations.mjs`, correction ablations and the retained review-11 probe.
The separate suites retain revision 9's requested evidence even though npm test is a superset.
No Agent behavior changed; evals optional regression coverage only. Attach raw logs, exact commands,
versions, exits/counts and SHA-256 manifest in H with implementation-01 and only the correction's
007 status row. C/H follow 006/008. Verify configured remote and remote branch SHA; if push is
unavailable, provide verified bundle/full source plus binary cumulative patch.

Third-party reuse: none new. Existing canonicalize dependency and licenses unchanged.
