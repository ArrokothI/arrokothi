# Independent review — K1.2-correction-01, review of candidate H 9248e56

Proposed record path: `work/K1.2-correction-01/review-08.md`, with evidence in `review-08/`.
The last recorded review is 06. Another session drafted a review of this same H that is not
recorded yet (see the correlation disclosure). This record assumes that draft becomes review 07.
If the owner numbers this record differently, the finding and observation IDs (`K12C1-R8-*`,
`O-R8-*`) follow the record number.

## Identity and provenance

- **Reviewer:** Claude Code desktop (Code tab), model `claude-opus-5-5`, 2026-09-28 UTC. Session
  scratchpad `0a1ca599-4930-4cb0-9368-969f6540ae92`.
- **Selection and remit:** the owner's task message selected this reviewer. It asked for an
  independent review and named no specific concern, so this is a full, accountable cumulative
  review under 006, not a partial one.
- **Independence:** this session wrote no K1.2 or K1.2-correction-01 payload, report, contract,
  decision or earlier review. It did not read or reuse another session's draft, worktree, runner or
  probe outside the repository.
- **Correlation disclosure:**
  - Reviews 14, 01–04 and 06 came from Claude Code sessions of the same model.
  - The reviewer's auto-memory held a one-paragraph summary of an unrecorded draft review of this
    same H by another session of this model. That summary gave the verdict as ACCEPT and mentioned
    one P3 about own-key enumeration of no-Proxy exotic objects. The draft itself was not read.
  - To offset the correlation, this review derived its coverage from the governing sources before
    reading implementation-04's coverage notes. It reran every check on an extracted H tree and
    wrote fresh probes and 20 new single-span mutants (N1–N16, F1–F4).
- **Repository and branch:** `ArrokothI/arrokothi`, `codex/k1.2-correction-01-activation-identity`.
  `git ls-remote origin` advertises `9248e56705b962bfbce4699536c200fe007be942` for the branch and
  `a20d278185eaffc7f8b7489345a3624231ff6e6d` for `main`.
- **Commits:**
  - base / process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`;
  - release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`;
  - previous reviewed H: `d5ffd35f4d659ed685449119b8372c2efbde6204` (C
    `652e5e73478684651cff697fef2a3ddbe34458e0`), [review 06](review-06.md) CHANGES REQUIRED;
  - owner-directed start: `3287640f045cf2e6adeefcd32f21d897480a6a7d`;
  - intermediate payloads `a09223b0c27cd9831b2a85c948a57c8b347c3547` and
    `7249a64ce98ccebb9bd082909cdbbcced14fdb5c`, which are not candidates;
  - payload C: `2b8a50297ebe83cb0922bb239aa834a2ecebc1ac`;
  - candidate H: `9248e56705b962bfbce4699536c200fe007be942`, whose sole parent is C.
  - B..H is linear: 63 commits, no merges. B is an ancestor of H.
- **Contract:** [correction contract revision 5](contract.md) at C. It carries K1.2 revision 9
  (C1–C15, DEC-1–20), [decisions 01–04](../K1.2/decision-04.md),
  [invalidation-02](../K1.2/invalidation-02.md) and correction DEC-1–7.

## Access and limits

- **Source and trees:**
  - Full local clone.
  - `git archive` trees of H, B and the previous H were extracted into the scratchpad. Each has
    its own `node_modules` view, and its workspace links resolve inside that tree.
  - The main checkout stayed clean at H. No checkout was switched, and nothing was committed or
    pushed.
- **Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64. This is also
  the implementer's recorded environment, which is a correlated-environment limit on every
  engine-cost observation. No Node 22 run.
- **Read in full:**
  - `values.ts` at H, plus its B..H and previous-H..C diffs;
  - `envelope.ts` and `outcome.ts` at H;
  - in `coordinator.ts`: `submitOutcome`, `#visible`, `#requireControl`, `#refusal` and every
    template interpolation in the file;
  - the new `value-diagnostic-work.test.ts`, the rewritten `exact-coordinates.test.ts`, and every
    changed or removed assertion in the previous-H..C test delta;
  - the Layer-3 diff: `values.md`, `rewrite-index.md`, `roadmap.md`, `sources.md`;
  - records: BASELINE, 007, contract revision 5, decisions 03/04, blockers 01/02, invalidation-02,
    review 04's VALUE-COST-01, review 06, implementation-04, string-closure-04 and the implementer's
    cumulative audit;
  - the runners `validate.mjs`, `ablations-03.mjs`, `ablations-04.mjs` and
    `diagnostic-ablations-04.mjs`.
- **Not re-read line by line:** the K1.2 coordinator paths. The only production file the
  correction delta touches is `values.ts`, so those paths are byte-identical to the previous
  reviewed H. The sealed, adapted, correction, revision-4 and review-06 runners rerun below
  exercised them.
- **Out of contract:** native Driver fidelity, persistence and process death, packaging, E gates.

## Candidate identity, ranges and evidence

- **C..H:** exactly the report's 45-path allowlist:
  - `implementation-04.md`;
  - 42 `validation-04/` outputs plus the manifest;
  - the correction's 007 row, one changed line (CHANGES_REQUESTED → WAITING_FOR_REVIEW).
  There is no script, fixture or evaluator, and no other 007 row changes.
- **Manifest:** all 41 `validation-04/MANIFEST.sha256` digests recompute and match. The manifest's
  own SHA-256 is `f4576cefb4f2c838031d20833fd250e01add53a24003507b0710cadc8914b1af`, as the report
  states. Every attachment names C.
- **Process baseline:** 006, 008, 009, 012, AGENTS.md and CLAUDE.md are byte-identical at B and H.
- **Sealed records:** B..H adds files under `docs/development/work/` and deletes or modifies none.
  `check-records.mjs`, rerun from the main checkout at H, exits 0: 20 files, 649 links/anchors.
- **Correction delta (previous H..C):**
  - The only production file is `values.ts`. It changes four things: the type-only `describe`, the
    UTF-16 preflight in `scanBoundaryString`, two `string_too_long` messages and the
    `ValueIssue.path` doc comment.
  - Tests: `value-diagnostic-work.test.ts` is new and `exact-coordinates.test.ts` is rewritten.
    `values`, `aggregate-refusal` and `value-refusal-cost` each change one message assertion.
  - Also: Layer 3, BASELINE, records and runners.
  - `git diff --check 3287640..C` exits 0.

## Reruns at exact H (this review)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 3,322/3,322; 0 failed, cancelled, skipped or todo |
| `npm run test:sdk` / `check:builder-docs` / `test:evals` | exit 0 each; 22/22; 72 files, 1,825 links, 38 imports; 12/12 |
| review-11 probe | exit 0; 8/8 `stale_exchange`; accepted state unchanged |
| sealed `work/K1.2/ablations.mjs` | exit 1; control 1,268/1,268; 32/36; B6/B12/B13/B14 NOT APPLICABLE (the disclosed anchor drift) |
| `original-ablations-02.mjs` (adapter) | exit 0; control 1,268/1,268; **36/36** |
| correction `ablations.mjs` | exit 0; control 571/571; **67/67** |
| `ablations-03.mjs` (X8–X23, V1–V5) | exit 1; control 35/35; 20/21. V5 is an equivalent survivor: this review traced every message producer to fixed text or numbers |
| `ablations-04.mjs` (review-06 Z1–Z16, full suite) | exit 0; control 1,268/1,268; **16/16** |
| `diagnostic-ablations-04.mjs` (T1–T4) | from the main checkout, because the runner needs Git: control 20/20; **4/4** rejected. The first attempt, in the non-Git extracted tree, failed at `git show`, which is an environment limit |
| reviewer mutants N1–N16, F1–F4 (full kernel suite each) | control 1,268/1,268; 17 rejected, **3 survived (N7, N9, N15)** |
| reviewer cost probes | see K12C1-R8-VALUE-DEPTH-01 and K12C1-R8-EVID-01 |
| `check-records.mjs`; `git diff --check 3287640..C` | exit 0; exit 0 |

N12 note: one test file (`ingress.test.ts`) hung at 0% CPU under that mutant. This review
terminated the file. The verdict rests on 11 assertion failures in other files.

`test:kernel` and `test:conformance` were not run separately, because `npm test` is their superset.
The engine-maximum and 50,000,000-unit probes were not rerun: their renderer paths are unchanged
since review 06, and their pinned logs 15–18 were inspected.

## Independent obligation and interaction coverage

The map was derived from:
- 007's correction row and its amendment;
- contract revision 5, DEC-1–7;
- decisions 03/04 and invalidation-02;
- review 04's VALUE-COST-01 required outcome and review 06's two findings;
- `values.md` at H (fixed semantic limits; in-process capture);
- KC2-1–KC2-6;
- K1.2 C1–C15.

| # | Obligation / source | Strongest schedule examined | Expected / forbidden | Evidence and result |
|---|---|---|---|---|
| V1 | R6-VALUE-TIME-01: no diagnostic lookup walks a caller chain (foreign and thrown paths; eager Outcome; creation/ingress/recovery) | Deep getter chains at D = 0/1,000/10,000; N1–N4 each reinsert one lookup; T1–T3 | Zero diagnostic reads; weights unchanged | Source: `describe` is `null`/`typeof`. N1–N4 and T1–T3 rejected. **Holds** |
| V2 | V-D1 time for plain data (no Proxy), every per-root invalid path, against the costliest at-limit acceptance | 15 refusal and 10 acceptance shapes, 3 fresh-process runs each, plus eager Outcome | Refusal ≤ at-limit acceptance | **Violated at depth**: foreign-prototype containers nested 31 deep take 4.31–4.34 s, against ≤ 2.98 s for the costliest acceptance found. K12C1-R8-VALUE-DEPTH-01 |
| V3 | V-D1 memory | Same shapes | Refusal heap ≤ acceptance | Refusal +3–20 MiB; acceptance +89–144 MiB. **Holds** |
| V4 | KC2 traversal charges bound repeated listings | Shared array carrying 4,096 extra own names, visited up to the byte stop; N15 removes the surplus charge | Refusal about 0.1 s | At H 119 ms. Under N15, 138,445 ms, and the full suite passes. K12C1-R8-EVID-01 |
| V5 | Decisions 03/04: Kernel-selected counts pinned; coherent Proxies accepted; Proxy engine work outside the time claim | Descriptor and handler fixtures; N8 and N13 (extra array-half observation); N9–N12 (object half) | Exact per-container and per-position counts | N8, N10–N13 rejected. N9 (a second symbols listing on the object half) survives; it is inside the stated bound. O-R8-2 |
| V6 | SELF-R4-STRING-01: preflight exact, accepted values unchanged, full charges kept | 131,072 / 131,073 units; mixed malformed; N5/N6 edges; N7 adds a flattening index read | Zero oversized materialization | N5, N6 and T4 rejected. The code at H reads only `length` first. N7 survives: the oracle counts only `charCodeAt`. O-R8-1 |
| V7 | DEC-7 storage, weights and order | V1–V4, W series (review 06), N14 | ≤ 19 records per root; exact weights | Rejected. **Holds** |
| V8 | R6-EVID-01 and DEC-4: exact mint, answer and view coordinates for unrenderable IDs | Z1–Z16 rerun; F1–F4 new: refusal-record `executionId`, `visibleExecutions`, view `creationKey`, creation `initialEventId` | Every lossy store or return rejected | 16/16 and 4/4. **Holds** |
| V9 | C1–C15 cumulative | Sealed/adapted 36, correction 67, revision-4 X series, R11 probe; production delta limited to `values.ts` | All reject; probe 8/8 | **Holds**, apart from C3 through V2 |
| V10 | Layer 3 as normative payload | values/rewrite-index/roadmap/sources diff; owner, status and open-choice checks; §5 #3, #22, #26, #28, #30 | One owner; no status; nothing settled silently | **Holds** (see below) |
| V11 | Accepted values unchanged | Preflight affects only strings over 131,072 units, which were always refused, and charges them the same. `describe` affects messages only | No accepted byte changes | Source trace and the unchanged KC2 tests. **Holds** |
| V12 | Process | Git ranges, allowlist, manifest, 007 row, remote | Exact | **Holds** |

**Reconciliation with the implementer's map** (coverage-05, cumulative-audit-04, string-closure-04,
implementation-04):
- **Agreement:** V1, V3, V5–V9, V11 and V12.
- **V2:** the implementer's comparative runs (R-P1/R-P2/R-P5 and P5) vary prototype-chain depth D,
  but always place the refused positions at nesting depth 2. The costliest acceptance they built is
  the depth-32 chain at 2.6 s. No refused family was placed at nesting depth. The per-container
  bookkeeping that dominates at depth is Kernel code, not diagnostics, not Proxy work and not
  own-key enumeration, so none of the closure notes inventories it. Review 06 (O-R6-3) flagged the
  same family at 1.2× above acceptance while shallow, and review 06 also measured only shallow
  shapes. That is why the earlier passes missed it.
- **V4:** KC2-1's evidence list names "an array listing more names…". That test bounds
  classification reads within one visit. It does not pin the surplus charge that bounds repeated
  visits.

## Layer-3 changes (reviewed as normative payload)

- **`values.md` (fixed semantic limits):**
  - **Proxy boundary:** states decision-04's boundary once, at its owner. It keeps Kernel-selected
    lookups and non-Proxy values bound and defines the count obligation.
  - **Materialization:** adds the string-materialization sentence, which interprets the existing
    V-D1 "time or memory" and adds no new limit.
  - **Marker:** the `OPEN(implementation)` marker now records the type-label choice and points to
    BASELINE `#value-refusal-diagnostics`, and rewrite-index §4 matches it.
- **Existing exclusions:** own-key enumeration and caller-trap execution appear in values.md for
  the first time. They previously lived in KC2-1 and BASELINE. Decision-04 item 4 refers to them as
  existing exclusions, so this relocates accepted text rather than settling a new choice.
- **Status and wording:**
  - No status, commit or packet identity appears in values.md.
  - "No time bound is claimed for values containing live Proxies" is the owner-mandated scope
    sentence (decision-04 item 4), not build status.
  - `sources.md` records provenance only.
- **Roadmap:** `roadmap.md` now scopes the eight-detail count to this binding, which answers O-R6-1.
- **§5 checks:**
  - #22 is respected: protection against hostile in-process code is assigned to isolation or
    transport containment.
  - #26 is respected.
  - #28: no open choice is settled silently.
  - #30: no comparison goes through a rendered identity, as V8 shows.
- **Consistency with code:** the new text matches the code at H. The canonical bound is exactly the
  one K12C1-R8-VALUE-DEPTH-01 shows the implementation exceeding. **Layer 3 PASS.**

## Findings

### K12C1-R8-VALUE-DEPTH-01 — P1 — plain-data refusal at nesting depth costs about 1.5× the costliest at-limit acceptance, before authority

- **Provenance:** this review. The defect is pre-existing, not introduced by this candidate:
  - B: 6,153 ms, +271 MiB;
  - previous H: 4,337 ms;
  - H: 4,307–4,340 ms.
- **Location:** `packages/kernel/src/values.ts`, in `capture` at H:
  - `isOpen` → `openContainer` → `captureObject`/`captureArray` → `closeContainer`;
  - the prototype refusal in `captureObject` (`unsupported_form`, "expected a plain object") and
    the same refusal in `captureArray`, both of which record no byte charge;
  - `isOpen` and `closeContainer` each scan `state.open` through `readAt`, which is one
    own-descriptor allocation per step.
  It is reached eagerly by Outcome roots before authority (`outcome.ts` `acceptRoot`), by
  creation/ingress content and by recovery lists.
- **Governing sources:**
  - `values.md` (fixed semantic limits) at H: "no value may cost more time or memory to refuse than
    a value at the limits costs to accept". Also: "The refusal-cost requirement remains unchanged for
    values containing no Proxy, including ordinary objects and arrays with any prototype chain."
    Also: "The same cost obligation applies when several roots are captured eagerly".
  - Decision-04 item 2: "V-D1 in full for values with no Proxy in them".
  - Review 04, VALUE-COST-01, required outcome: "Close V-D1 for every per-root invalid-position
    path, so that refusal time and memory stay within what at-limit acceptance costs".
  - Review 06, VALUE-TIME-01, required outcome, first bullet.
  - Invalidation-02 and 007: both review-04 findings closed, and the KC2 guarantees re-established.
- **Counterexample (plain data, no Proxy anywhere):**
  - Let `p = Object.create(null)`. The root is `Array(256).fill(row)` wrapped in 29 single-element
    arrays. `row` holds 4,096 distinct `Object.create(p)`.
  - Each refused object sits inside 31 enclosing arrays and is charged nothing; only its parent's
    comma is charged. So 1,044,481 positions are refused before the byte stop, and each pays two
    depth-proportional scans of the open stack.
  - Direct `canonicalize` measurements, three fresh processes each:

    | Shape | Time | Heap |
    |---|---|---|
    | Refusal, objects inside 31 enclosing arrays | **4,307–4,337 ms** | +16–20 MiB |
    | Same refusal inside 16 enclosing arrays | 2,753–2,775 ms | |
    | Same refusal inside 2 enclosing arrays (the implementer's R-P1 placement) | 1,281–1,296 ms | |
    | Costliest acceptance found: 15 × 4,096 eight-level chains under 22 wrappers, 1,044,555 B | 2,854–2,977 ms | +144 MiB |
    | Other acceptances (chains W0-L30, W14-L16, W26-L4, W28-L2; empty arrays or objects at depth 32) | 1,931–2,791 ms | |
    | The implementer's exact-limit depth-32 acceptance (its log) | 2,604–2,695 ms | |

  - A structural bound says why no acceptance catches up. An accepted container costs at least 2
    bytes, so at most about 524,000 containers fit in a root. A refused foreign container costs
    about 1 byte. So refusal performs about twice the maximum open-stack work any acceptance can,
    before counting the heavier per-container acceptance work.
  - Attribution (experiments only, not prescribed fixes):
    - popping the last `state.open` entry in `closeContainer` gives 2,324 ms for this refusal,
      against 2,000 ms for the costliest acceptance under the same variant;
    - checking the prototype before `isOpen`/`openContainer` gives 232 ms, against 2,861 ms for
      that acceptance.
  - The work is Kernel JavaScript over Kernel-owned data. It is not diagnostics, a Proxy, or
    own-key enumeration.
- **Before authority:** a visible caller with no grant calls `submitOutcome` with this root.
  - One root: 4,340 ms, then `unauthorized_submission`.
  - Eight roots (progress, 6 Emissions, result): **34,415 ms**, then `unauthorized_submission`.
  - The exchange is unchanged, and no delivery is made.
- **Impact:**
  - The V-D1 claim held by invalidation-02 cannot be released.
  - The report's claim that "the exact-limit depth-32 acceptance is more costly" than refusal does
    not hold for the same refusal family placed at depth.
  - Logical classification, nondisclosure and memory stay correct.
- **Required outcome:**
  - Refusal time within at-limit acceptance cost for every per-root invalid-position path,
    including uncharged refusals of containers at any permitted depth, on the direct,
    creation/ingress, recovery and eager-Outcome consumers.
  - Deterministic distinguishing evidence that rejects the depth-proportional variant. This could
    be a Kernel operation/allocation count per refused position independent of nesting depth, or a
    comparison against the costliest at-limit acceptance with the refused family placed at depth.
  - Reconstruct the refusal-cost subsystem under 006, as the third time-and-memory defect in it,
    and record why earlier passes missed it: every uncharged refusal family, at every depth, against
    the costliest acceptance the implementer can construct.
  - Preserve:
    - accepted values and canonical bytes;
    - single observation and the decision-03/04 Kernel-selected counts;
    - byte stops and DEC-7 weights;
    - the observable classification of cycles, `too_deep` and foreign forms, including their
      ordering relative to each other, unless the owner authorizes a change.
  - Any coherent mechanism is acceptable, whether charging, ordering or bookkeeping. No patch shape
    is required.

### K12C1-R8-EVID-01 — P2 — the array surplus-name charge that keeps repeated listings bounded has no distinguishing test

- **Provenance:** this review, from mutant N15. The code at H is correct. The gap is pre-existing
  KC2 evidence.
- **Location:** `values.ts` `captureArray`:
  `charge(state, containerStructureBytes(length, false) + (surplus > 0 ? surplus : 0) + symbolCount)`.
- **Governing sources:**
  - KC2-1: "Refusal work is bounded by the limits, not by the caller's input, both across visits
    and within one visit".
  - `values.md` V-D1 for plain data.
  - Review 04's required outcome: distinguishing evidence that "must reject the unbounded variant";
    re-establish the KC2 guarantees.
  - 006 P2: a missing meaningful test for an in-scope claim.
- **Counterexample:** N15 removes only the surplus term, and the full kernel suite still passes
  1,268/1,268.
  - The input is a shared ordinary array with 4,096 extra own names (`a["x"+i] = 0`), referenced
    from a 4,096 × 4,096 root.
  - At H it is refused in 119 ms: 255 issues, and the byte stop fires quickly.
  - Under N15 it is refused in **138,445 ms**: 348,119 issues, and the engine re-lists 4,097
    names at every visit. That is about 1,160 times slower.
  - With 20,000 extra names the N15 run was stopped. H takes 135 ms.
- **Required outcome:**
  - Add distinguishing evidence that rejects removing or weakening the array surplus charge. The
    evidence covers a shared over-named array, both below and above the overlong threshold.
  - Re-check that every other V-D1 charge in `capture` is pinned the same way. N16, the object
    analogue, is already rejected by "an oversized own-names listing…".

### Non-blocking observations (P3)

- **O-R8-1 (string oracle scope):** N7 adds `void input[0]` before the preflight and survives.
  - Indexing, `.at()` and `.codePointAt()` flatten a rope just as `charCodeAt` does: +128 MiB for
    a 2^27-unit rope. `.length`, `===` and `Map.get` do not.
  - The maintained zero-read oracle instruments only the captured `charCodeAt`, so the
    "no hidden full-string character read" row in string-closure-04 is proved only for that
    primitive.
  - The code at H is correct by source trace. A heap-growth assertion in the existing child process
    would pin it directly.
- **O-R8-2 (object-half counts):** N9, a second `getOwnPropertySymbols` per object, survives.
  - It stays within the canonical bound: a fixed per-container count.
  - Exact array-half counts are pinned by the decision-03/04 fixtures; the object half has no
    equivalent count fixture.
- **O-R8-3 (own-key enumeration of no-Proxy exotic objects):**
  - `Object.setPrototypeOf(new Uint8Array(2**24), null)` makes the engine enumerate 16,777,216 keys
    before any Kernel check: 3.7 s and about 1 GiB RSS.
  - Larger typed arrays and String wrappers over large ropes throw `RangeError` after about 2.5–3 s
    and about 0.75 GiB, and capture contains that as a refusal.
  - This is inside the canonical "engine own-key enumeration" exclusion, which is accepted since
    KC2-1 and acknowledged in decision-04 item 4. So it is not a finding against this candidate.
  - Eager Outcome roots reach it before authority. The owner may want to revisit that exclusion
    for no-Proxy exotic objects together with O-R8-4.
- **O-R8-4 (outside this packet, pre-existing K1.1 behavior):** re-prototyped built-ins are
  accepted as plain objects, and their internal-slot content is silently dropped.
  - `Object.setPrototypeOf(new Map([["k",1]]), null)` is accepted as `{}`, and so are
    null-prototype Date, WeakMap, ArrayBuffer and Boolean objects.
  - A Set with `Object.prototype` is accepted as `{}`.
  - A null-prototype `Uint8Array` is accepted as `{"0":7,"1":8,"2":9}`.
  - B behaves the same way.
  - `values.md` (in-process capture) lists "Maps, Dates and typed arrays" among the forms "refused
    rather than silently dropped". Two different Maps would canonicalize as the same `{}`.
  - Invalidation-02 keeps accepted values binding and brings only refusal cost into this packet.
    This is therefore an owner triage item under 006's invalidation and corrective-packet path. It
    is not a criterion of this review.

## Prior findings

- **K12C1-R6-VALUE-TIME-01:** **closed** for its mechanism.
  - The mechanism was diagnostic `constructor`/`name` reads on the foreign-prototype and thrown
    paths, through every consumer and before authority. `describe` is now type-only.
  - Zero-lookup tests at D = 10,000 cover it, and T1–T3 and N1–N4 are rejected.
  - Refusal time is now independent of the prototype-chain length D.
  - The broader "every per-root path within acceptance cost" outcome remains open under the new,
    distinct mechanism in K12C1-R8-VALUE-DEPTH-01.
- **K12C1-R6-EVID-01:** **closed.**
  - Z1–Z16 are all rejected on the full suite, and new F1–F4 are rejected.
  - The K1.1-produced creation receipt and the carried Event destination are explicitly pinned.
- **O-R6-1 and O-R6-2:** addressed.
- **O-R6-3:** reproduced at depth and escalated in K12C1-R8-VALUE-DEPTH-01.
- **O-R6-4:** the Z runner now uses the full suite. `ablations-03.mjs` keeps its 35-test scope, and
  its claims remain sound.
- **Implementer findings:**
  - SELF-R4-STRING-01: correct. T4, N5 and N6 are rejected; O-R8-1 remains.
  - SELF-R4-DESCRIPTOR-01 and SELF-R4-HANDLER-01: resolved by owner decisions 03/04. The counts are
    pinned, and N8 and N13 are rejected.
- **Earlier closures stand within their reviewed scopes:**
  - review-04 EVID-01: X8–X23 rejected;
  - review-04 VALUE-COST-01 **memory**: V1–V4 rejected, refusal heap flat;
  - SELF-R3-PATH-01, R1-DIAG-01, R2-AGG-01/EVID-01;
  - parent R14 ID-01/EVID-01;
  - decisions 01/02;
  - R11-ORDER-01: probe 8/8.
- **Review-04 VALUE-COST-01 time dimension:** not closed. The open part is carried by
  K12C1-R8-VALUE-DEPTH-01.

## Per-criterion verdicts (cumulative candidate B..H)

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope precedes every root observation. The hidden arm observes nothing (`value-diagnostic-work`, `nondisclosure`), and the sealed A/B series is rejected |
| C2 | PASS | Exact replay needs no grant; conflict adds one refusal (Z6; exact-coordinates replay block) |
| C3 | **FAIL** | Identity, order, whole refusal and retention are correct. Outcome-root refusal before authority exceeds at-limit acceptance time for plain data (K12C1-R8-VALUE-DEPTH-01) |
| C4 | PASS | Atomic acceptance; A-series and X8/X22 rejected |
| C5 | PASS | Next exchange and terminal; engine-allocation qualification stated |
| C6 | PASS | B-5 dispositions and live terminal ingress (exact-coordinates terminal blocks) |
| C7 | PASS | Effects, await and obligations refused whole (A6/A15) |
| C8 | PASS | Takeover, grants and revalidation (B6/B8/B10/B11; exact takeover receipts pinned) |
| C9 | PASS | Code hold and clear; exact hold coordinates (X11, Z16) |
| C10 | PASS | Protocol hold, DEC-6 payload, both clear paths |
| C11 | PASS | Late reports settle only their own row (exact-coordinates late-report block, B4) |
| C12 | PASS | Receipts, answers, views and records are exact and immutable (Z1–Z16, F1–F4) |
| C13 | PASS | Single observation per position (N11, N12 rejected); P3 O-R8-2 |
| C14 | PASS | No new module, export or dependency; landing-zone conformance inside `npm test` |
| C15 | PASS | Layer 3, BASELINE, §4 marker and decision provenance agree; no status on spec pages |
| 007: review-14 counterexamples on every surface, with whole-result assertions | PASS | Exact-coordinate oracle strengthened; Z/F rejected; logs 15–17 inspected |
| 007: text-malformed identity class pinned | PASS | Correction series 67/67 |
| 007: both review-04 findings closed with distinguishing evidence | **FAIL** | EVID-01 is closed. VALUE-COST-01's "refusal time … within at-limit acceptance for every per-root invalid-position path" is not met (K12C1-R8-VALUE-DEPTH-01) |
| 007: K1.1-correction-02 guarantees hold on the corrected tree | **FAIL** | Read bounds and the other KC2 guarantees hold. The held V-D1 claim is not re-established (K12C1-R8-VALUE-DEPTH-01), and a load-bearing KC2 charge is unpinned (K12C1-R8-EVID-01) |
| Contract DEC-4 evidence plan | PASS | Review-06 EVID-01 closed |
| Contract DEC-7 storage, weights, labels and preflight | PASS | V1–V4, W series, N14, N5/N6, T1–T4 |
| Contract DEC-7 / decisions 03–04 V-D1 cost claim for plain data | **FAIL** | K12C1-R8-VALUE-DEPTH-01; evidence gap K12C1-R8-EVID-01 |
| Decisions 03/04 count, acceptance and statement obligations | PASS | Descriptor/handler fixtures exact; coherent acceptance; boundary stated once |

No criterion is DEFERRED.

**Unexamined or limited:** Node 22 was not run. All timing comes from one machine and engine,
the same as the implementer's. The structural two-to-one bound for VALUE-DEPTH-01 does not depend
on timing.

## Verdict, status text and handoff

K1.2-correction-01 H `9248e56705b962bfbce4699536c200fe007be942` (C
`2b8a50297ebe83cb0922bb239aa834a2ecebc1ac`, B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, contract
revision 5): independent review, 2026-09-28 — **CHANGES REQUIRED**.

- C3 fails.
- Open: K12C1-R8-VALUE-DEPTH-01 (P1) and K12C1-R8-EVID-01 (P2).
- P3: O-R8-1 to O-R8-3. O-R8-4 is an out-of-packet owner triage item.
- K12C1-R6-VALUE-TIME-01 and K12C1-R6-EVID-01 are closed.
- Invalidation-01's integration hold and invalidation-02's claim hold remain.
- No merge, no K1.3 or successor release.

Status text for 007:

> CHANGES_REQUESTED — independent review 08 (Claude Code claude-opus-5-5) of H 9248e56 over
> C 2b8a502 / B a20d278, contract revision 5: CHANGES REQUIRED. K12C1-R6-VALUE-TIME-01 and
> K12C1-R6-EVID-01 closed. Open: K12C1-R8-VALUE-DEPTH-01 (P1, C3: plain-data refusal at nesting
> depth exceeds at-limit acceptance, before authority) and K12C1-R8-EVID-01 (P2: array surplus
> charge unpinned).

Compact correction handoff (008):

```text
Correct the same released packet K1.2-correction-01 on codex/k1.2-correction-01-activation-identity.
Base a20d278185eaffc7f8b7489345a3624231ff6e6d; reviewed H 9248e56705b962bfbce4699536c200fe007be942;
review record work/K1.2-correction-01/review-08.md (+ review-08/).
Open findings K12C1-R8-VALUE-DEPTH-01 (P1) and K12C1-R8-EVID-01 (P2); required outcomes and
counterexamples (deep foreign-prototype root; eight-root pre-authority schedule; N15) are in that record.
Owner supplemental decisions: decisions 03/04 and invalidation-02 (unchanged); O-R8-4 awaits owner triage.
Unresolved authority: none.
Apply 006 and 012: this is the third defect in the refusal-cost subsystem, so reconstruct it
(every uncharged refusal family, at every permitted depth, against the costliest at-limit acceptance,
across every root consumer), close its dependencies, then re-review the whole cumulative packet.
Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

## Evidence

`review-08/` is this session's scratchpad `review/evidence/`: 35 files plus a `MANIFEST.sha256`
whose own SHA-256 is `ba7f5df73b2d1817df2349487f60275593b3fec7ddd4134a9fea3d219587d62d`. It contains:
- rerun logs 01–12b;
- reviewer mutants: `mutants.mjs` and results, logs 13–14;
- cost probes: `cost-probe.mjs`, `run-cost.sh`, logs 15–16;
- the eager-Outcome probe `deep-outcome.ts`, log 17;
- provenance at B and the previous H, log 18;
- the N15 impact probe, log 19;
- exotic, re-prototype and rope probes, logs 20–22.

CHANGES REQUIRED
