# Independent review — K1.2-correction-01, review 04 (second review of candidate H 312f258)

Consolidated record. The owner requested a second independent review of the H that
[review 03](review-03.md) accepted. This record combines the full cumulative review by
Claude Code with a finding the owner supplied from a separate ChatGPT/Arena second review; each
finding keeps its own provenance. Review 03's ACCEPT stays the historical verdict for its exact H.

## Identity and provenance

- **Accountable full cumulative review (source A):** Claude Code desktop (Code tab), model
  `claude-opus-5-5`, 2026-09-27 UTC. This session wrote no K1.2 or K1.2-correction-01 payload,
  report, contract, decision or earlier review.
- **Correlated-assumption disclosure for source A:** reviews 14, 01, 02 and 03 came from Claude Code
  sessions of the same model. Source A reused none of their worktrees, runners or probes as its own
  evidence. It derived coverage from the contract and governing sources before reading
  implementation-02 or review 03, reran every check, and wrote new mutants (X1–X23) and probes
  (P1–P5).
- **Owner-supplied supplement (sources B and C):** the owner pasted a consolidated second-review
  draft on 2026-09-27. It came from two sources:
  - B: ChatGPT, GPT-5.6 Sol; read-only GitHub access, no shell.
  - C: Arena.ai Agent Mode; model and session not exposed; full local source; `npm ci` failed,
    so no fresh test runs.
  - Their finding K12C1-R4-VALUE-COST-01 appears below as owner-supplied. Source A verified it
    independently, as recorded there. Source A cannot verify B's or C's sessions. It did confirm
    C's reported cumulative binary-diff digest: `git diff --binary B H` is 12,774,908 bytes with
    SHA-256 `393ab1aec2b99376d657fb9b19bf8d391b823079b51beacadda2eeaa6219a2ce`, 320 files.
- Repository `ArrokothI/arrokothi`, branch `codex/k1.2-correction-01-activation-identity`.
  Before this record, `git ls-remote` advertised `9b496bfc388b0216d30b9483feda650055c6cdfc` for the
  branch (review 03's record A, child of H) and `a20d278185eaffc7f8b7489345a3624231ff6e6d` for
  `main`. This review does not certify A.
- Commits:
  - base / process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`;
  - release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`;
  - payload C: `6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`;
  - candidate H: `312f2584d14b0c168c2152c373a4f07d4a292d74` (sole parent C).
  - B..H is linear: 54 commits, no merges.
- Contract: [correction contract revision 3](contract.md), which carries K1.2 revision 9 (C1–C15,
  DEC-1–20, decisions 01/02). 006, 008 and 012 are read at B.

## Access and limits (source A)

- Full local clone. `git archive` trees of H and B were extracted into this session's scratchpad,
  with the lockfile's installed `node_modules`. No checkout was switched and no existing worktree
  was used.
- Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64, 8 GiB RAM. No
  Node 22 run.
- Read in full at H:
  - source: `coordinator.ts` (K1.2 paths line by line; K1.1 creation/ingress/dispatch where the
    correction's identities reach them), `outcome.ts`, `envelope.ts`, `driver.ts`, `refusal.ts`,
    `identity.ts`, the `inspection.ts` diff, the smaller source diffs, and the `values.ts`
    array/charge paths;
  - the correction payload delta (release..C);
  - tests: `activation-identity.test.ts`, the refusal-diagnostics tests, `harness.ts`, and every
    deleted line in pre-existing test files (B..H);
  - Layer 3: the full `mental-model/` diff, plus the owner text in `identity.md`,
    `execution-cycle.md`, `recovery.md`, `state.md`, `evidence.md` and `values.md` (fixed semantic
    limits); rewrite-index §4 and §5;
  - records: BASELINE `#outcome-acceptance-api`, the K1.2 contract, decisions 01/02, review 14
    ID-01/EVID-01, review 02 EVID-01, contract revision 3, coverage-03, implementation-02,
    review 03, and the K1.1-correction-02 decision-01, contract and implementation-02.
- Sampled rather than read line by line: the remaining pre-correction K1.2 test bodies.
  `terminal.test.ts` and `late-reports.test.ts` were read. The distinguishing power of the rest comes
  from the rerun sealed/adapted 36, correction 67 and reviewer X1–X23.
- Not rerun: the heap-heavy engine-maximum probe and review 01's namespace probe. Their pinned logs
  were inspected. The suite's 50,000,000-unit DIAG-01 case, which covers the same renderer path, was
  rerun.
- Out of contract: native Driver fidelity, persistence and process death, packaging, E gates.

## Candidate identity, ranges and evidence

- `C..H` is exactly the report's 30-path allowlist: 29 added output-only files plus the correction's
  007 row. It contains no scripts. All 27 `validation-02/MANIFEST.sha256` digests recompute.
- `git diff --check`: B..H exits 2, and every warning lies inside sealed evidence logs, as
  disclosed. `b18a729..C` and release..C (records excluded) both exit 0.

## Reruns at exact H (source A)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 3,267/3,267, 0 failed/cancelled/skipped |
| `npm run test:sdk` | exit 0; 22/22 |
| `npm run check:builder-docs` | exit 0; 72 files, 1,806 links, 38 imports |
| `npm run test:evals` | exit 0; 12/12 |
| sealed `work/K1.2/ablations.mjs` | exit 1; control 1,213/1,213; 32/36; B6/B12/B13/B14 NOT APPLICABLE (disclosed anchor drift) |
| `original-ablations-02.mjs` (adapter; verifies sealed SHA-256, respells 4 anchors only) | exit 0; control 1,213/1,213; **36/36** |
| correction `ablations.mjs` | exit 0; control 571/571; **67/67** |
| reviewer `reviewer-ablations.mjs`, full kernel suite per mutant (X1–X23) | control 1,213/1,213; see K12C1-R4-EVID-01 |
| reviewer link/anchor check (41 files: all of `mental-model/`, BASELINE, 007, both contracts, decision-02, implementation-02) | 1,552 links, 0 broken |

Raw logs, runners, probes and a SHA-256 manifest are in [`review-04/`](review-04/). The probes and
runners expect a `probes/` directory at the root of an extracted H tree.

## Independent obligation and interaction coverage (source A)

Derived from 007's correction row, contract revision 3 (DEC-1–6), K1.2 revision 9, decisions 01/02,
`identity.md#runtime-attempt`, `execution-cycle.md#outcome-acceptance` and `values.md`, before
reading the report's explanations.

| # | Obligation / source | Strongest schedule examined | Expected / forbidden | Evidence and result |
|---|---|---|---|---|
| V1 | Producer→consumer closure (007; DEC-1/3) | Producers: `dispatch` and takeover. Consumers: replay map, currency, content, three controls, inspection, history, delivery rows, derived IDs. Probe P2 runs review 14's counterexamples (exchange 9 = 65,536 and exchange 10 = 65,537 scalars) | Every surface accepts; replay without a grant returns the same receipt; conflict adds one refusal | Source trace; P2 as expected (refusals ≤146 units); I1–I6, X2, X3 rejected. **Holds** |
| V2 | Malformed class pinned | number, object, boxed, revoked, missing, throwing getter; empty and lone surrogates are well formed | Content group after authority (Outcome), `malformed_value` (controls); wrong well-formed text → stale | Tests; I6, X2. **Holds** |
| V3 | Decision-02 total order | Source `coordinator.ts:1367–1568` | Scope → replay (usable IDs) → terminal → per-coordinate currency → grant → capacity → content | B12–B20 rejected under the adapter. **Holds** |
| V4 | Controls keep scope → control → capture → terminal/open/currency | P3: control request getter reenters (resolve / takeover / complete) | Classified against post-reentry state; only the inner operation mutates | P3 as expected. **Holds** |
| V5 | DEC-4 fragment bound at every K1.2 renderer | Interpolation inventory from `coordinator.ts:1100` | Every K1.2 reason is bounded; K1.1 dispatch/redelivery reasons unchanged since B | D1–D35 rejected. **Holds** |
| V6 | DEC-4 retained/returned coordinates "remain exact" | X8–X23 plus oracle P4 with unrenderable minted IDs | Exact values; Emission IDs unique across exchanges; receipt tokens unique across Executions | Code at H correct (P4 13/13); **11 of 19 mutants survive the suite**. K12C1-R4-EVID-01 |
| V7 | DEC-5 aggregate rendering bound | 8 details × (<64 + ≤128 + ≤32 + ≤1,024 + punctuation) plus a 17-code summary | ≤ about 11k < 16,384 | G1–G14 rejected. **Holds** |
| V8 | DEC-6 explicit payloads | 2,000 × `é` protocol diagnostic, both clear paths | First 1,024 units kept | R12 rejected. **Holds** |
| V9 | `values.md` V-D1 on the Outcome path | P5: 130 × 4,096-`undefined` root vs a 1,040,261-byte accepted root; the same root via `submitOutcome` with no grant, with 1 and 8 roots | Refusal no costlier than acceptance at the limits | **Violated.** K12C1-R4-VALUE-COST-01 |
| V10 | Held permitted actions (DEC-17; `evidence.md`) | P1: protocol hold with `isSafeToReplace` absent or returning `false` | — | Lists `request_takeover`; takeover refused. P3 O-R4-1 |
| V11 | Engine-allocation qualification | Source: derived strings built before mutation | Throws occur before mutation | `#accept` builds every derived ID before line 2090. `submitInput` also throws above half the engine maximum (source-derived). Carried P3 |
| V12 | Layer 3 as payload | Full diff; bolded owners; status scan; §4 markers; §5 inferences 1/3/26/28/30; links | One owner, no status, open choices marked | **Holds** |
| V13 | Ingress consumes Kernel-minted Execution IDs | `submitInput` destination | No text validation | Exact map lookup (`coordinator.ts:997–1000`). **Holds** |

Reconciliation with the implementer's map (coverage-03, reconstruction) and with review 03 (W1–W11):
- They agree on V1–V5, V7, V8 and V12.
- V6 is new. Earlier sets ablated comparisons (R4/R5/R7) and renderers (D/N), but not storage or
  return sites.
- V9 had been observed as review 03's O-R3-2 and the implementer's O-R2-1, but was routed as out
  of scope. This review makes it blocking (see the finding).
- V10 and V13 are new.

## Layer-3 changes (reviewed as normative payload)

- **identity.md `#runtime-attempt`.** A producer/consumer closure rule with an explicit engine
  qualification. The binding's choice is stated as the binding's, with one new
  `OPEN(implementation)` marker that §4 matches.
- **identity.md `#writer-epoch`.** A cross-reference plus the marker's recorded binding choice.
- **execution-cycle.md.** Sole owner of submission authority (the only bolded definition) and of
  the decision-02 order. The `OPEN(K3.2)` marker is present.
- **core, integration, reference, rewrite-index §3/§4, sources, roadmap.** Links, provenance and
  navigation.
- **Checks run:**
  - No specification page carries status.
  - The per-coordinate rule appears only in its owner, BASELINE and sources.
  - §5.3 and §5.28 are respected.
  - §5.30: the code-hold `updated` comparison uses rendered text, but the pins are fixed per
    exchange (R11 rejected).
- No Layer-3 defect found. `values.md` is unchanged, and its V-D1 sentence is the governing text for
  the P1.

## Findings

### K12C1-R4-VALUE-COST-01 — P1 — issue allocation is uncharged, so refusing a root costs more than accepting one at the limits

- **Provenance:** owner-supplied from sources B and C (ChatGPT GPT-5.6 Sol; Arena.ai Agent Mode).
  It reclassifies review 03's O-R3-2 and implementation-02's O-R2-1 residual, which review 03 routed
  to the owner as P3.
- **Source A verification:** source trace and an independent rerun (P5).
- **Location:**
  - `packages/kernel/src/values.ts:436–449` (`charge`);
  - `:780–830`, where `values.ts:813` pushes one `undefined_member` issue with a freshly built path
    per `undefined` element, without a charge;
  - the analogous uncharged issue sites at `:552–566` and `:597`;
  - consumed eagerly before authority by `outcome.ts` `acceptRoot`/`captureOutcome`, from
    `coordinator.ts:1384`.
- **Governing sources:**
  - `mental-model/concepts/values.md` (fixed semantic limits): "no value may cost more time or
    memory to refuse than a value at the limits costs to accept".
  - K1.1-correction-02 decision-01 V-D1.
  - K1.2 C3, whose governing owner for per-root limits is `values.md`.
  - 006: an earlier acceptance does not immunize a subsystem against later evidence.
- **Mechanism:** a 4,096-element array of `undefined` charges about 4 KiB of structure but creates
  4,096 issue objects. The byte budget therefore bounds issues only at about one per charged byte, a
  constant factor far above what an accepted byte costs. DEC-5 bounds only the rendered reason,
  after capture.
- **Counterexample (P5, source A, `review-04/probe-p5-cost.txt`)**, with the root
  `130 × [4,096 × undefined]` (532,480 issues):

  | Case | Time | Heap growth | Other |
  |---|---|---|---|
  | `canonicalize`, refused | ≈650 ms | +84–97 MiB | peak RSS about 2.3× |
  | `canonicalize`, accepted 1,040,261-byte root | ≈640 ms | +14–23 MiB | — |
  | `submitOutcome`, visible caller, **no grant**, 1 root | 1.1–1.2 s | +150 MiB | `unauthorized_submission` |
  | same, 8 roots | 10–12 s | about 540–635 MiB | max RSS 0.75–0.91 GB |

  - The pinned validation-02 logs (23–25) and review 03's reruns show the same direction.
  - The time ratio for the capture call alone is close to 1. The memory excess, and the cost that
    eager pre-authority capture multiplies per root, are what violate V-D1.
- **Impact:** a caller that can see the Execution, but holds no submission grant, can force several
  times the memory of an at-limit acceptance per root before it is refused. That amplification
  multiplies across up to 258 roots per Outcome and contradicts V-D1. Logical classification and
  nondisclosure stay correct.
- **Required outcome:**
  - Close V-D1 for every per-root invalid-position path, so that refusal time and memory stay within
    what at-limit acceptance costs.
  - Preserve accepted-value exactness, single observation, the ambient-safety discipline, identity
    semantics, decision-02 authority ordering, whole-envelope refusal and DEC-5 semantics. Change
    any of these only with separate authorization.
  - Add distinguishing evidence for the high-cardinality invalid-position family, including the
    Outcome path and a practical multi-root schedule. The evidence must reject the unbounded
    variant.
  - Re-establish K1.1-correction-02's guarantees and every cumulative K1.2 criterion on the
    corrected tree.
  - No single patch shape is required. An issue cap is enough only if it actually establishes V-D1
    without breaking the required capture or diagnostic semantics.
- **Scope route (owner, 2026-09-27):** amend this packet. See
  [invalidation-02](../K1.2/invalidation-02.md).

### K12C1-R4-EVID-01 — P2 — DEC-4's "retained coordinates remain exact" is unpinned for the unrenderable IDs this correction made reachable

- **Provenance:** source A, by single-span ablation. The code at H is correct; the finding concerns
  evidence.
- **Why it is new:** before this correction, long or non-ASCII minted IDs were refused, so no
  retained coordinate was built from one. The correction makes them answerable and places
  `diagnosticIdentity` at 31 sites in the same functions that build retained records. Review 02's
  EVID-01 pinned only DEC-4's *equality* half.
- **Locations at H** (`packages/kernel/src/coordinator.ts`):
  - Outcome receipt, 1967;
  - Emission ID and record, 1977 and 1981;
  - result ID and record, 1988–1991;
  - acknowledgment disposition, 2020;
  - decision answer `activationId`, 2036–2038;
  - code-hold coordinate, 1813;
  - protocol-hold coordinate, 1881;
  - protocol answer, 1894;
  - delivery row, 2203.
- **Governing sources:**
  - Contract revision 3 DEC-4: "accepted IDs, grants, lookup keys, receipts, output, dispositions,
    hold/history coordinates and trusted actor attribution remain exact".
  - Its coverage row "exact structured identities … unchanged".
  - 007's correction acceptance: "with whole-result assertions".
  - K1.2-DEC-4, DEC-11, DEC-16 and DEC-17/18.
  - K11-R12-ID-01.
  - 012 deterministic execution.
- **Counterexample.** Each mutant stores or returns one coordinate through `diagnosticIdentity` and
  runs against the full 1,213-test kernel suite with a clean 1,213/1,213 control:
  - **Survive (11):**
    - X8: Emission ID;
    - X9: result ID;
    - X10: acknowledgment disposition;
    - X11: code-hold coordinate;
    - X13: delivery row;
    - X15: Outcome receipt token;
    - X17: `OutcomeAccepted.activationId`;
    - X20: protocol answer;
    - X21: protocol-hold coordinate;
    - X22: Emission record;
    - X23: result record.
  - **Rejected (8):** X1, X2, X3, X12 (history), X14 (resolved exchange), X16 (actor),
    X18 (takeover answer), X19 (recovery answer).
  - **Oracle P4:** two Executions under a non-ASCII scope with 200-unit keys, taken through hold,
    protocol hold, takeover, an Emission-bearing `continue`, and a completing second exchange with
    the same key. P4 passes 13/13 at H and rejects all 11 survivors. Under them:
    - Emission IDs collide across exchanges (X8);
    - two Executions' Outcome receipts share one token (X15);
    - acknowledgments, holds and delivery rows name `<identity omitted>` (X10, X11/X21, X13);
    - answers return a different string from the one the caller named (X17/X20).
- **Why the suite misses them:**
  - The long-ID lifecycle tests compare before/after views produced by the same code.
  - The accepted-path assertions check counts, causes and revisions, not these values.
  - The exact-coordinate tests use short printable IDs, for which the helper is the identity
    function.
- **Required outcome:**
  - For Kernel-minted identities that DEC-4 renders as omitted, provide distinguishing evidence that
    every retained or returned coordinate DEC-4 declares exact stays exact. That includes uniqueness
    for Emission IDs across exchanges and for receipt tokens across Executions.
  - Show the evidence rejects X8–X23-style mutants (or equivalents) against a clean control.
  - Any coherent approach is acceptable. Re-audit the other `diagnosticIdentity`-adjacent sites
    under 006's closure rule.
  - Do not narrow DEC-4 to fit the evidence.

### Non-blocking observations (P3)

- **O-R4-1 (source A) — held permitted actions and Driver safety.**
  - With `isSafeToReplace` absent or returning `false`, a protocol-held exchange lists
    `request_takeover`, but every takeover is refused as `unsafe_replacement` (P1).
  - This conforms to DEC-17's "not refused for the hold". When the callback is absent, though, the
    Kernel knows statically that takeover cannot succeed.
  - For the owner: reflect static Driver capability, or state the scoping in BASELINE.
- **Carried precision note (source A):** under the engine-allocation qualification (review 01 O1),
  `submitInput` also throws for a trusted namespace above half the engine maximum (`inputIdKey`
  packs it twice). This is integrated K1.1 behavior and it throws before mutation. BASELINE could
  say so.
- **Carried from review 03:** O-R3-1 (N3/N5 presentation mutants). Also carried: the stale 007 K1.2
  introduction and review 13's OPEN-5 paragraph note.
- **Superseded:** O-R3-2's disposition, by K12C1-R4-VALUE-COST-01.

## Prior findings

- **Closures that stand within their reviewed scopes:**
  - K12-R14-ID-01 (V1; I1–I5; X3);
  - K12-R14-EVID-01 (V2);
  - K12C1-R1-DIAG-01 (V5);
  - K12C1-R2-AGG-01 (V7). It bounds rendering only; the capture-time cost is
    K12C1-R4-VALUE-COST-01.
- **K12C1-R2-EVID-01:** stands for comparisons. K12C1-R4-EVID-01 is its retained-coordinate
  counterpart.
- **O-R2-2 and O-R2-3:** stand.
- **Decisions 01/02 and earlier K1.2 closures:** stand; A1–A16 and B1–B20 are rejected under the
  adapter.

## Per-criterion verdicts (cumulative candidate B..H)

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | `#visible` before any other field on all four surfaces; control power before capture; hidden ≡ missing |
| C2 | PASS | Exact-text replay before terminal/currency/grant, for usable IDs only; same receipt object; no grant (P2, X3, B17) |
| C3 | **FAIL** | Identity, ordering and whole-envelope refusal are correct (B12–B20, D, G). The Outcome roots' capture violates `values.md` V-D1 (K12C1-R4-VALUE-COST-01) |
| C4 | PASS | Trace and P4: batch acknowledged whole; Emission IDs exact and unique at H. Extended-domain evidence is open under K12C1-R4-EVID-01 |
| C5 | PASS | continue/complete/fail and the next exchange; engine limit qualified |
| C6 | PASS | B-5 and live terminal ingress (`terminal.test.ts` read; A7/A8) |
| C7 | PASS | Effects, await and obligations refused whole (A6/A15) |
| C8 | PASS | Takeover, fencing, reentrancy, revalidation (B6 adapted; P3; R5) |
| C9 | PASS | Code hold/clear exact on pins (R2/R11). The hold coordinate rests on P4 only (X11) |
| C10 | PASS | Protocol hold, DEC-8 payload, both clear paths (R12). Coordinate and answer rest on P4 only (X20/X21) |
| C11 | PASS | Late reports settle their own row. Delivery-row exactness for unrenderable IDs rests on P4 only (X13) |
| C12 | PASS | Frozen; retained ≡ returned; contiguous positions. Receipt and disposition exactness rest on P4 only (X10/X15) |
| C13 | PASS | One observation, own-only; reentrancy ordered before checks |
| C14 | PASS | 13-file inventory; imports internal, `canonicalize` and `node:` only; DX-4 recorded |
| C15 | PASS | Layer 3, BASELINE and §4 agree with the code; no status; links 1,552/0 |
| 007: review 14's counterexamples on every surface **with whole-result assertions** | **FAIL** | Behavior holds (P2, P4); assertions omit the coordinates in K12C1-R4-EVID-01 |
| 007: text-malformed identity class pinned | PASS | V2 |
| Contract DEC-4 evidence plan | **FAIL** | K12C1-R4-EVID-01 |

C4 and C9–C12 pass on source A's trace and observation, which 006 permits. Their packet evidence in
the extended identity domain is the open P2. No criterion is DEFERRED.

## Verdict, status text and handoff

K1.2-correction-01 H `312f2584d14b0c168c2152c373a4f07d4a292d74` (C
`6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`, B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, contract
revision 3): consolidated independent review 04, owner-requested second review, 2026-09-27 —
**CHANGES REQUIRED**.

- C3 fails.
- Open: K12C1-R4-VALUE-COST-01 (P1, owner-supplied, verified by source A) and K12C1-R4-EVID-01
  (P2, source A).
- P3: O-R4-1, plus the carried notes.
- Review 03's ACCEPT stays historical for exact H.
- Consequences are recorded in [invalidation-02](../K1.2/invalidation-02.md).
- No merge, no K1.3 or successor release. A `9b496bf` is not certified.

Compact correction handoff (008):

```text
Correct the same released packet K1.2-correction-01 on codex/k1.2-correction-01-activation-identity.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H 312f2584d14b0c168c2152c373a4f07d4a292d74;
review record work/K1.2-correction-01/review-04.md (+ review-04/).
Open findings K12C1-R4-VALUE-COST-01 (P1) and K12C1-R4-EVID-01 (P2); required outcomes and
counterexamples (P5; X8–X23 and oracle P4) are in that record.
Owner supplemental decisions: work/K1.2/invalidation-02.md (scope amendment: contract revision 4
brings values.ts V-D1 refusal cost into this packet). Unresolved authority: none.
Apply 006 and 012: reconstruct value capture and the diagnostic-helper retained-coordinate side,
close their dependencies, then re-review the whole cumulative packet. Fix additional in-scope
defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
