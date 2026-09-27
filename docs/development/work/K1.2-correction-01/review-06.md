# Independent review — K1.2-correction-01, review 06 (second review of candidate H d5ffd35)

Owner-requested second review of the H that implementation 03 hands off. Proposed record path
`work/K1.2-correction-01/review-06.md`, with evidence in `review-06/`. This assumes the first
review of this H is recorded as review 05. If the owner numbers this record differently, the
finding IDs (`K12C1-R6-*`) follow the record number.

## Identity and provenance

- **Reviewer:** Claude Code desktop (Code tab), model `claude-opus-5-5`, 2026-09-27 UTC. The
  session's scratchpad ID is `8d1aa48c-1d6c-40f0-9438-b06a3e48dab8`. The owner's task message
  selected this reviewer and named it a second reviewer. The message named no specific concern, so
  this is a full, accountable cumulative review under 006, not a partial one.
- **Independence:** this session wrote no K1.2 or K1.2-correction-01 payload, report, contract,
  decision or earlier review. It did not read or reuse any earlier session's draft, worktree,
  runner or probe.
- **Correlated-assumption disclosure:** reviews 14, 01, 02, 03 and 04 came from Claude Code
  sessions of the same model. The reviewer's auto-memory also records that another session of this
  model drafted an ACCEPT of this same H, not recorded in the repository. That draft was not read.
  To offset the correlation, this review:
  - derived its coverage from the contract and governing sources before reading
    implementation-03, closure-03 or coverage-04 (map in `review-06/coverage-map.md`);
  - reran every check;
  - wrote new probes (R-P1–R-P5) and 24 new single-span mutants (Z1–Z16, W1–W8).
- **Repository and branch:** `ArrokothI/arrokothi`, `codex/k1.2-correction-01-activation-identity`.
  `git ls-remote origin` advertises `d5ffd35f4d659ed685449119b8372c2efbde6204` (H) for the branch
  and `a20d278185eaffc7f8b7489345a3624231ff6e6d` for `main`. The implementer's configured remote,
  `agent-kernel.git`, is the same repository.
- **Commits:**
  - base / process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`;
  - release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`;
  - previous reviewed H: `312f2584d14b0c168c2152c373a4f07d4a292d74`, with its C
    `6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`, [review 04](review-04.md) CHANGES REQUIRED;
  - owner starting head: `8a418d408f715e999a403a3e84b73a9db1b43712`;
  - payload C: `652e5e73478684651cff697fef2a3ddbe34458e0` (sole parent `8a418d4`);
  - candidate H: `d5ffd35f4d659ed685449119b8372c2efbde6204` (sole parent C).
  - B..H is linear: 58 commits, no merges. B is an ancestor of H.
- **Contract:** [correction contract revision 4](contract.md) at C. It carries K1.2 revision 9
  (C1–C15, DEC-1–20), decisions 01/02 and the owner amendment
  [invalidation-02](../K1.2/invalidation-02.md). 006, 008 and 012 were read at B and are
  byte-identical at H.

## Access and limits

- **Source and trees:** full local clone. `git archive` trees of H, C, the previous H and B were
  extracted into the scratchpad, with the lockfile's installed `node_modules`. No checkout was
  switched, and the main checkout stayed clean at H.
- **Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64 (Apple M1,
  8 GiB RAM). The implementer used Node v26.8.1. No Node 22 run.
- **Read in full:**
  - the source delta from the previous H to C: `values.ts`, `envelope.ts` and `outcome.ts`;
  - `values.ts` capture and collector paths line by line, including `describe`, `charge`, the
    array and object halves, and `accept`;
  - `outcome.ts`;
  - the `coordinator.ts` paths the delta reaches: `submitOutcome`, `#accept`, dispatch, redelivery,
    takeover commit, `#mint`, `#deliver` and view construction;
  - the new and changed tests: `value-refusal-cost.test.ts`, `exact-coordinates.test.ts` and the
    `aggregate-refusal.test.ts` delta;
  - Layer 3 in full: the `mental-model/` diff, B..H;
  - records: the BASELINE delta, contract revision 4, invalidation-02, review-04, coverage-04,
    closure-03, implementation-03, the changed runners, and K1.1-correction-02 decision-01 and its
    contract.
- **Not re-read line by line:** unchanged K1.2 coordinator paths, which reviews 13, 14 and 01–04
  read. They were rerun under the sealed, adapted and correction ablation runners.
- **Out of contract:** native Driver fidelity, persistence and process death, packaging, E gates.

## Candidate identity, ranges and evidence

- **C..H:** exactly the report's 33-path allowlist: `implementation-03.md`, 31 `validation-03/`
  outputs and the manifest, and the correction's 007 row (IN_PROGRESS → WAITING_FOR_REVIEW). There
  are no scripts. No other 007 row changes in C..H.
- **Manifest:** all 30 `validation-03/MANIFEST.sha256` digests recompute and match. Every
  attachment names C.
- **Sealed records:** `check-records.mjs`, run from the main checkout at H, verifies ancestry and
  that the sealed records and folders are unchanged. It exits 0 over 13 files and 582 links.

## Reruns at exact H (this review)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 3,302/3,302, 0 failed/cancelled/skipped/todo |
| `npm run test:sdk` | exit 0; 22/22 |
| `npm run check:builder-docs` | exit 0; 72 files, 1,815 links/anchors, 38 imports |
| `npm run test:evals` | exit 0; 12/12 |
| review-11 probe (`probe-partial-claim.ts`) | exit 0; 8/8 `stale_exchange`, accepted state unchanged |
| sealed `work/K1.2/ablations.mjs` | exit 1; control 1,248/1,248; 32/36 rejected; B6/B12/B13/B14 NOT APPLICABLE (the disclosed anchor drift) |
| `original-ablations-02.mjs` (adapter) | exit 0; control 1,248/1,248; **36/36** |
| correction `ablations.mjs` | exit 0; control 571/571; **67/67** |
| `ablations-03.mjs` (X8–X23 and V1–V5) | exit 0; control 35/35; **21/21** |
| `check-records.mjs` (main checkout at H) | exit 0; 13 files, 582 links/anchors |
| reviewer mutation runner (full kernel suite per mutant) | control 1,248/1,248; Z1–Z16: 9 rejected, **7 survived**; W1–W8: 7 rejected, 1 equivalent survivor (W7) |
| reviewer oracle R-P3 | 20/20 at H; rejects all 7 Z survivors |
| reviewer probes R-P1, R-P2, R-P4 and R-P5 | see K12C1-R6-VALUE-TIME-01; R-P1 repeated 3× |
| reviewer link/anchor check | 1,554 links, 0 broken |
| `git diff --check` | `8a418d4..C` exit 0; `C..H` warnings only inside the three output-only diff-check logs that quote sealed whitespace (disclosed) |

`test:kernel` and `test:conformance` were not run separately, because `npm test` is their
superset. The 50,000,000-unit and engine-maximum probes were not rerun: the correction did not
touch their renderer paths, and their pinned logs were inspected.

Raw logs, probes, the mutation runner and a SHA-256 manifest are in `review-06/`.

## Independent obligation and interaction coverage

The coverage below was derived from:
- 007's correction row and its amendment;
- contract revision 4 (DEC-1–7);
- invalidation-02 and review-04's required outcomes;
- `values.md` (fixed semantic limits) at B and H;
- K1.1-correction-02 KC2-1–KC2-6;
- K1.2 C1–C15;
- decisions 01/02.

| # | Obligation / source | Strongest schedule examined | Expected / forbidden | Evidence and result |
|---|---|---|---|---|
| V1 | V-D1 memory for every issue family (review-04 VALUE-COST-01) | P5 shape; the 21 test families; R-P1 prototype-chain family | Retention ≤ 8 + #codes per root; memory no more than acceptance | Collector trace; R-P1: refusal heap +1–22 MiB vs acceptance +13–115 MiB. W1–W6 and W8 rejected. **Holds** |
| V2 | V-D1 **time** for every per-root invalid-position path (review-04 required outcome; `values.md` "the cost includes diagnostic construction") | R-P1: 256 × a shared 4,096-element list of foreign-prototype objects, chain depth D | Refusal time within at-limit acceptance, independent of caller structure beyond the limits | **Violated.** Time grows with D. K12C1-R6-VALUE-TIME-01 |
| V3 | Eager multi-root capture before authority | R-P2: `submitOutcome`, visible caller, no grant, 1 and 8 roots | Each root costs no more than an at-limit acceptance | Memory **holds**; time **violated** (about 41 s for 8 roots at D = 1,000) |
| V4 | Accepted semantics, single observation, byte stop, KC2 read bounds | `values.test.ts` unchanged and passing; read-count tests; source diff | No observation or charge moved | **Holds.** The only changes are `pushIssue` and path construction |
| V5 | DEC-7 weights, order and the no-invented-location rule | W1–W8 against the full suite | Exact weights through `located`, `appendRootIssues`, `explain` and `explainDiagnosticIssues` | W1–W6 and W8 rejected. W7 survives but is equivalent: every suffix entry follows its root's eight details. **Holds** |
| V6 | Bounded path construction; sticky omission | Source trace; 128/129 edges | `child` and `element` check lengths before concatenating | **Holds** |
| V7 | DEC-5 16,384 bound with weighted counts | Trace: counts ≤ 10 digits over the fixed code vocabulary | Unchanged | **Holds** |
| V8 | EVID-01: exact retained and returned coordinates for unrenderable minted IDs, at every site DEC-4 declares exact | Z1–Z16 against the full 1,248-test suite; oracle R-P3 | Every lossy store or return rejected | **Partially pinned.** Z1, Z2, Z7, Z8, Z13, Z14 and Z15 survive. K12C1-R6-EVID-01 |
| V9 | C1–C15 cumulative | Sealed/adapted 36, correction 67, revision-4 21, R11 probe | All reject; probe 8/8 | See the reruns. **Holds** |
| V10 | Layer 3 as normative payload | Full diff; owner, status and open-choice checks; §5 #3, #26, #28 and #30 | One owner; no status; no silently settled open choice | **Holds**, with P3 O-R6-1 (roadmap wording) |
| V11 | Changed tests replace, not weaken | The `aggregate-refusal` delta | Raw-32 replaced by 9 records with exact total 32; nondisclosure and forbidden-mutation checks kept | **Holds** |
| V12 | Process | Git ranges, manifest, allowlist, 007 row | Exact | **Holds** |

Reconciliation with the implementer's map (coverage-04, closure-03):
- **Agreement:** the maps agree on V1 and V4–V7, and on V9–V12.
- **V2 and V3:** coverage-04's container row lists "prototype rejection" only against "bounded
  diagnostic storage". Closure-03 excludes caller traps and own-key enumeration from the time
  argument. Neither map treats the Kernel's own diagnostic read of `constructor` as refusal work.
  That read walks a caller-built prototype chain, which is neither a trap nor an enumeration.
- **V8:** coverage-04 lists "receipt and dispatch receipt" and "dispatch and takeover Activation".
  The maintained oracle, however, compares the dispatch and takeover receipts only by reference
  (`strictEqual(final.exchanges[0].dispatchReceipt, taken.receipt)`). It never checks their token
  spelling or cross-Execution distinctness, and it never reads the redelivery answer. This is the
  common-mode comparison closure-03 says it avoids. The inspection view's own identity coordinates
  are likewise compared only view-to-view.

## Layer-3 changes (reviewed as normative payload)

- **`values.md` (fixed semantic limits), new paragraph.** It says diagnostic construction and
  retention count toward the refusal cost, bounded compression is permitted, and the obligation
  holds under eager multi-root capture. This interprets the existing V-D1 rule, as invalidation-02
  requires ("settles no new semantics").
  - No status, commit or packet identity appears in the visible prose.
  - The `OPEN(implementation)` marker records the binding's choice and points to BASELINE
    `#value-refusal-diagnostics`, as 006 requires. A matching entry is present in rewrite-index §4.
  - This text is the governing statement for K12C1-R6-VALUE-TIME-01.
- **`rewrite-index.md` §4 and `roadmap.md`:** navigation. `roadmap.md:100` is noted as P3 O-R6-1.
- **Unchanged since the previous H:** `identity.md`, `execution-cycle.md` and the other pages
  changed earlier in the packet. Review 04's Layer-3 disposition stands for them.
- **Checks:**
  - a status scan of every added Layer-3 line;
  - a single-owner grep for the refusal-cost rule, which appears only in `values.md`, its §4
    index entry, BASELINE and roadmap;
  - an independent link/anchor check over all of `mental-model/`, BASELINE, 007, README, contract
    revision 4, implementation-03, closure-03, coverage-04 and invalidation-02: 1,554 links, 0
    broken.

## Findings

### K12C1-R6-VALUE-TIME-01 — P1 — refusal time is not bounded by the limits: a per-position diagnostic read walks a caller-built prototype chain

- **Provenance:** this review, with probes R-P1, R-P2, R-P4 and R-P5. It is the time dimension of
  review-04's K12C1-R4-VALUE-COST-01, whose required outcome covered "refusal time and memory".
- **Location:**
  - `packages/kernel/src/values.ts:284–307` (`describe`): ordinary reads of
    `value.constructor` and `.name`;
  - called for every refused foreign-prototype object at `:879`, with no charge before the call;
  - called for every thrown value in `capture`'s catch at `:694–698` (message at `:697`);
  - reached eagerly before authority through `outcome.ts` `acceptRoot` → `canonicalize`, and by
    creation and ingress.
- **Governing sources:**
  - `values.md` (fixed semantic limits): "no value may cost more time or memory to refuse than a
    value at the limits costs to accept"; this candidate's own added sentence, "The cost includes
    diagnostic construction and retention"; and "The same cost obligation applies when several
    roots are captured eagerly before a request's authority is decided".
  - K1.1-correction-02 KC2-1: "Refusal work is bounded by the limits, not by the caller's input".
  - invalidation-02: the V-D1 claim stays held until this is closed.
  - review-04's VALUE-COST-01 required outcome.
  - 007's amendment: both review-04 findings closed.
- **Mechanism:**
  - A foreign-prototype object is refused at `captureObject`'s prototype check, which charges no
    bytes.
  - Its message then calls `describe(container)`, which performs an ordinary `[[Get]]` of
    `constructor`. For plain objects that is a walk up a caller-built chain of depth D, with no
    caller code running. It is neither a trap nor the engine's own-key enumeration, the two
    exclusions BASELINE names.
  - Each position costs about one byte of budget, so about a million positions fit before the byte
    stop. Refusal work is therefore about positions × D.
  - D is not bounded by any limit, and the input graph stays small: about D + 8,194 objects.
  - Compression bounds what is retained, not this per-position construction work. The message is
    built, then discarded after the eighth detail.
- **Counterexample (R-P1, direct `canonicalize`):**
  - The value is `Array(256).fill(objs)`, where `objs` holds 4,096 distinct
    `Object.create(Object.create(tail))` and `tail` is a D-deep chain above
    `{constructor: {name: "X"}}`.
  - Every refusing run observes 1,044,481 issues and retains 10 records.

  | Case | Time | Heap growth |
  |---|---|---|
  | Accept `Array(127).fill(4,096 × 0)` (1,040,639 B) | 633 ms | +12.7 MiB |
  | Accept 85 × 4,096 `{}` (1,044,651 B) | 983 ms | +109 MiB |
  | Accept 85 × 4,096 `[]` (1,044,651 B) | 1,275 ms | +109 MiB |
  | Refuse `undefined` elements (P5 family) | 226 ms | +1 MiB |
  | Refuse chain, D = 0 | 1,447 ms | +9 MiB |
  | Refuse chain, D = 100 | 1,797 ms | +11 MiB |
  | Refuse chain, D = 1,000 | 6,666 ms | +5 MiB |
  | Refuse chain, D = 10,000 | **37,164–37,570 ms** (two runs) | +5–22 MiB |

  - **Attribution:** a mutant that only skips the `constructor` read restores D = 1,000 to
    1,347–1,448 ms, which matches D = 0. Base and the previous H show the same D-dependence (8.2–8.4 s
    and 8.4–8.6 s at D = 1,000, plus their unbounded retention of about 10⁶ records). This review makes no claim that the
    candidate introduced the defect.
- **Before authority (R-P2):** `submitOutcome` from `observer("visible")` with no grant, D = 1,000.
  - One root: 5.0–5.2 s, then `unauthorized_submission`.
  - Eight roots (progress, 6 Emissions, result): **40.6–41.0 s**, then `unauthorized_submission`;
    the exchange is unchanged.
  - The implementer's accepted 8-root P5 measured 3.06 s.
- **Catch path (R-P4):** a constant-time `ownKeys` trap that throws one of 4,096 deep-chain objects
  gives the same D-dependence through `describe(error)`. (D = 0: 2,115 ms; D = 1,000: 6,097 ms; with only the `constructor` read removed, D = 1,000: 1,966 ms; 1,044,480 trap calls in every run.)
- **Impact:**
  - A caller who can see an Execution but holds no submission grant can impose CPU time
    proportional to (about 10⁶ positions per root) × (an unbounded prototype depth) on the
    Kernel's synchronous boundary, before it is refused. Eight roots per Outcome multiply this.
  - The same holds for creation and ingress content (R-P5: `submitInput` and `createExecution`
    take 1.4 s at D = 0 and 5.2–5.3 s at D = 1,000 before their `malformed_value` refusal).
    Logical classification, nondisclosure and memory bounds stay correct.
  - K1.1-correction-02's V-D1 claim, held by invalidation-02, cannot be released.
- **Required outcome:**
  - Refusal time stays within at-limit acceptance cost for every per-root invalid-position path,
    including diagnostic construction. Kernel diagnostic work must not scale with caller-built
    structure the limits do not bound, such as prototype depth.
  - Preserve DEC-7's weights and the first eight details' meaning (a bounded or fixed type label
    is a coherent option), single observation, ambient safety, byte stops and every accepted-value
    guarantee.
  - Add distinguishing evidence that rejects the per-position chain walk: a deterministic
    operation or lookup count, or a cost comparison with a clean control, on both the
    foreign-prototype and the thrown-value paths, and on the Outcome path before authority.
  - Re-audit every other refusal-diagnostic construction site under 006's closure rule.
  - Any coherent approach is acceptable; no single patch shape is required. If the owner
    considers engine prototype lookups excluded from V-D1, like own-key enumeration, that is an
    owner decision to record, and the BASELINE exclusion list and the `values.md` wording must then
    say so.

### K12C1-R6-EVID-01 — P2 — for unrenderable minted IDs, exact receipts, answers and inspection coordinates are still unpinned at #mint, redelivery, the carried Event and the view

- **Provenance:** this review, by single-span ablation against the full kernel suite. The code at
  H is correct: oracle R-P3 passes 14/14. The finding concerns evidence.
- **Why it is in scope:**
  - Review-04's K12C1-R4-EVID-01 required distinguishing evidence that "every retained or returned
    coordinate DEC-4 declares exact stays exact", including "receipt tokens across Executions", and
    a re-audit of the other adjacent sites.
  - Contract revision 4 requires "direct exact-value oracles at all retained/returned sites".
  - 007 requires "whole-result assertions".
  - Implementation-03 and closure-03 claim coverage of the "dispatch/Outcome receipts" and of
    redelivery/takeover.
- **Locations at H** (`packages/kernel/src/coordinator.ts`):
  - `#mint` at `:2114–2118`, which mints the takeover receipt (`:1707`, K1.2), the dispatch
    receipt (`:1187`) and the ingress receipt (`:1071`);
  - the `redeliver` answer at `:1285`, next to the K1.2-added recovery-held refusal DEC-4 names
    (`:1272`);
  - the inspection projection `viewOf`, which gives the view's `executionId`, its `queued` Event
    IDs and each mailbox entry's `inputId`. DEC-6: "Inspection returns retained evidence; it does
    not render caller identity anew."
  - the creation receipt at `:906`;
  - the carried Event `destination` in the delivered Activation, in `toActivationEvent` at `:2249`.
- **Counterexample:** seven single-span mutants each store or return one coordinate through
  `diagnosticIdentity`. Each survives the full kernel suite, 1,248/1,248, against a clean
  1,248/1,248 control:
  - **Z1:** `#mint` builds the receipt token from `diagnosticIdentity(record.executionId)`;
  - **Z2:** the same for the creation receipt;
  - **Z7:** the carried Event's `destination`;
  - **Z8:** the `redeliver` answer's `activationId`;
  - **Z13:** the view's `executionId`;
  - **Z14:** the view's `queued` Event IDs;
  - **Z15:** the mailbox view's `inputId.destination`.
- **Oracle R-P3.** Two Executions under a non-ASCII scope, with 200-unit keys and a non-ASCII
  trusted namespace, go through input, inspection, dispatch, redelivery, takeover and Outcome.
  R-P3 passes 20/20 at H and rejects all seven mutants:
  - under Z1, the input, dispatch and takeover receipt tokens collide across the two Executions at
    equal positions;
  - under Z2, the creation receipts collide;
  - under Z7 and Z15, the delivered Event and the mailbox view name `<identity omitted>` as their
    destination;
  - under Z8, the redelivery answer names a different string from the Activation it resent;
  - under Z13 and Z14, inspection names the Execution and its queued Events by a string that is
    not their identity.
- **Rejected by the suite:** nine other Z mutants (Z3–Z6, Z9–Z12, Z16). They cover the delivered
  Activation's IDs, the takeover copy, the replay key, the dispatch grant, acknowledgments, the
  takeover answer's receipt, the current-Activation view and the hold view. This review also re-ran
  the implementer's runner, which rejects X8–X23.
- **Why the maintained oracle misses these:**
  - `exact-coordinates.test.ts` checks the takeover and dispatch receipts only by reference
    (`strictEqual(final.exchanges[0].dispatchReceipt, taken.receipt)`).
  - It checks cross-Execution token distinctness only for Outcome receipts, which `#accept` mints
    directly rather than through `#mint`.
  - It discards the `redeliver` return value.
  - It compares whole views produced by the same projection code. Before/after equality cannot see
    a lossy projection that both views share.
- **Required outcome:**
  - For minted identities that DEC-4 renders as omitted, add distinguishing evidence that every
    receipt, returned answer and inspection coordinate DEC-4 or DEC-6 declares exact stays exact.
    That covers at least:
    - the receipts minted through `#mint`, with cross-Execution distinctness at equal positions;
    - the redelivery answer;
    - the view's Execution ID, Event IDs and Input ID destinations.
  - Decide explicitly whether the K1.1-produced coordinates carried into K1.2 exchanges (the
    creation receipt, the carried Event destination) fall within DEC-4's exactness evidence. If
    they do, pin them; if not, record the scoping.
  - Show that Z-style mutants (or equivalents) are rejected against a clean control, and correct
    the report's coverage claim. Do not narrow DEC-4 to fit the evidence.

### Non-blocking observations (P3)

- **O-R6-1 (Layer 3).** `mental-model/roadmap.md:100` says "diagnostic compression must preserve
  exact issue counts".
  - That reads as a general rule, and it is stronger than the owner text: `values.md` says
    compression "may retain … exact counts", and its `OPEN(implementation)` marker leaves the
    representation to each binding.
  - The roadmap is a maintenance map, not a rule owner (rewrite-index §5.28).
  - Suggest scoping it to this packet's binding (DEC-7), or linking the owner instead.
- **O-R6-2 (API precision).** `ValueIssue.path` is documented as "`""` is the root itself". Suffix
  entries reuse `""` to mean "no location", and only `occurrences` distinguishes them. A consumer of
  the exported `boundaryValueIssues` or `canonicalize` that ignores `occurrences` would read a
  suffix entry as located at the root. The path doc could say so.
- **O-R6-3 (measurement).** Even without prototype depth, the foreign-prototype refusal family ran
  slightly above the costliest acceptance this review tried.
  - Three repeats at D = 0 took 1,487–1,566 ms, against 1,215–1,299 ms for 85 × 4,096 `[]`: about
    1.2×.
  - With only the `constructor` read removed, D = 1,000 took 1,406–1,448 ms.
  - This review tried only three accepted shapes, so a costlier one may exist. That is why this is
    not a separate finding. Closing K12C1-R6-VALUE-TIME-01 should compare against the costliest
    at-limit acceptance the implementer can construct.
- **O-R6-4 (runner scope).** `ablations-03.mjs` runs only `exact-coordinates` and
  `value-refusal-cost` (35 tests) per mutant. That is sound for its rejection claims, but it cannot
  show that the rest of the suite still discriminates.
- **Carried:** review-04's O-R4-1 is answered in BASELINE. Review 03's O-R3-1 and the stale 007 K1.2
  introduction remain optional.

## Prior findings

- **K12C1-R4-VALUE-COST-01:**
  - **Memory: closed.** Retention is at most 19 records per root; P5 keeps 9 records for 532,480
    issues; W1–W6 and W8 rejected; R-P1 and R-P2 heap flat.
  - **Time: not closed.** Superseded by K12C1-R6-VALUE-TIME-01, which carries the open part of its
    required outcome.
- **K12C1-R4-EVID-01:**
  - **Closed** for the sixteen X8–X23 sites and P4's schedule. The maintained oracle and the
    implementer's runner reject them; the runner was re-run here.
  - **Open** for the adjacent receipt, answer and view sites in K12C1-R6-EVID-01.
- **Implementer-found SELF-R3-PATH-01:** closed. Path construction is bounded before
  concatenation; W5 rejected.
- **Earlier closures stand within their reviewed scopes:** K12-R14-ID-01/EVID-01,
  K12C1-R1-DIAG-01, K12C1-R2-AGG-01/EVID-01 and decisions 01/02. The sealed/adapted A and B series
  and the correction series reject at H.

## Per-criterion verdicts (cumulative candidate B..H)

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope before capture on all four surfaces; hidden ≡ missing; nondisclosure suites and sealed B-series |
| C2 | PASS | Exact-text replay before terminal, currency and grant; same receipt object (Z6 rejected) |
| C3 | **FAIL** | Identity, order, whole-envelope refusal and retention are correct. Outcome-root capture violates `values.md` V-D1 refusal time before authority (K12C1-R6-VALUE-TIME-01) |
| C4 | PASS | `#accept` prebuilds, then applies; Emission IDs exact and unique (maintained oracle; X8/X22) |
| C5 | PASS | continue/complete/fail and the next exchange; engine-allocation qualification stated |
| C6 | PASS | B-5 and live terminal ingress |
| C7 | PASS | Effects, await and obligations refused whole |
| C8 | PASS | Takeover, fencing and revalidation; the takeover receipt is exact at H by R-P3. Its packet evidence is open under K12C1-R6-EVID-01 |
| C9 | PASS | Code hold and clear; exact coordinates pinned (X11, Z16) |
| C10 | PASS | Protocol hold, DEC-6 payload, both clear paths |
| C11 | PASS | Late reports settle their own row |
| C12 | PASS | Receipts, output, dispositions, holds and views exact and immutable at H (R-P3 20/20, maintained oracle). The evidence for receipt tokens, the redelivery answer and the view coordinates is open under K12C1-R6-EVID-01 |
| C13 | PASS | One observation per position (read-count tests); own-only weights (V4, W1) |
| C14 | PASS | No new module, export or dependency; landing-zone conformance passes |
| C15 | PASS | Layer 3, BASELINE and the §4 marker agree; no status; links 1,554/0. P3 O-R6-1 |
| 007: review 14's counterexamples on every surface **with whole-result assertions** | **FAIL** | Behavior holds; the whole-result assertions omit the takeover/dispatch receipt tokens, the redelivery answer and the view coordinates (K12C1-R6-EVID-01) |
| 007: text-malformed identity class pinned | PASS | Unchanged since review 04; rerun |
| 007: both review-04 findings closed with distinguishing evidence | **FAIL** | VALUE-COST time dimension (K12C1-R6-VALUE-TIME-01); EVID adjacent sites (K12C1-R6-EVID-01) |
| 007: K1.1-correction-02 guarantees hold on the corrected tree | **FAIL** | KC2-2–KC2-5 hold (`values.test.ts` unchanged and passing). KC2-1's "refusal work bounded by the limits, not by the caller's input" does not hold (K12C1-R6-VALUE-TIME-01) |
| Contract DEC-4 evidence plan | **FAIL** | K12C1-R6-EVID-01 |
| Contract DEC-7 (storage, weights, order, bounded paths) | PASS | W1–W8; retention ≤ 19 records per root |

No criterion is DEFERRED.

## Verdict, status text and handoff

K1.2-correction-01 H `d5ffd35f4d659ed685449119b8372c2efbde6204` (C
`652e5e73478684651cff697fef2a3ddbe34458e0`, B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, contract
revision 4): independent review 06, owner-requested second review, 2026-09-27 — **CHANGES REQUIRED**.

- C3 fails.
- Open: K12C1-R6-VALUE-TIME-01 (P1) and K12C1-R6-EVID-01 (P2).
- P3: O-R6-1–O-R6-4.
- K12C1-R4-VALUE-COST-01: memory closed; time superseded by R6-VALUE-TIME-01.
- K12C1-R4-EVID-01: closed for X8–X23; adjacent sites open.
- Invalidation-01's integration hold and invalidation-02's claim hold remain.
- No merge, no K1.3 or successor release.

Status text for 007: `CHANGES_REQUESTED — independent review 06 (second review, Claude Code
claude-opus-5-5) of H d5ffd35 over C 652e5e7 / B a20d278, contract revision 4: CHANGES REQUIRED;
open K12C1-R6-VALUE-TIME-01 (P1, C3) and K12C1-R6-EVID-01 (P2).`

Compact correction handoff (008):

```text
Correct the same released packet K1.2-correction-01 on codex/k1.2-correction-01-activation-identity.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H d5ffd35f4d659ed685449119b8372c2efbde6204;
review record work/K1.2-correction-01/review-06.md (+ review-06/).
Open findings K12C1-R6-VALUE-TIME-01 (P1) and K12C1-R6-EVID-01 (P2); required outcomes and
counterexamples (R-P1/R-P2/R-P4/R-P5; Z1/Z2/Z7/Z8/Z13/Z14/Z15 and oracle R-P3) are in that record.
Owner supplemental decisions: work/K1.2/invalidation-02.md (revision-4 scope); none new.
Unresolved authority: none, unless the owner chooses to exclude engine prototype lookups from V-D1.
Apply 006 and 012: reconstruct refusal-diagnostic construction cost and the exact-coordinate
evidence across all mint/answer sites, close their dependencies, then re-review the whole
cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
