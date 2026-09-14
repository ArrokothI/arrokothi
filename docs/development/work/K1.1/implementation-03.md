# Implementation report — K1.1, round 3 (main-merge provenance + owner-approved JCS substrate)

## Identity

- **Packet / parent:** K1.1, parent milestone K1 ([001 K1](../../001-current-status-and-roadmap.md)).
  **Contract:** [work/K1.1/contract.md](contract.md), **revision 3** (OPEN-1 resolved by PR #26 ancestry;
  OPEN-2 closed by owner-approved `canonicalize@3.0.0`; C3/JCS substrate; C7/C10 wording reconciled).
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` — 006, 007, 008, 012 and
  015 exactly as they stand there, untouched by this candidate (015-owned guard/inventory files change
  only as that page's editing rule requires, with reader and document changed together).
- **State:** WAITING_FOR_REVIEW (assessed: no known mandatory defect, unresolved owned semantic case or
  missing result remains; see Handoff).
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through Prompt A, plus
  round-1 independent review [review-01.md](review-01.md) (CHANGES REQUIRED, six findings), plus the
  round-3 owner decision quoted below. Corrections on a released packet need no renewed permission.
- **Owner decision applied this round:** **APPROVE `canonicalize@3.0.0` as the exact unmodified
  JCS/RFC 8785 dependency** (K11-R1-JCS-01). No other supplemental owner decision.
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, independently ACCEPTED
  (correction-02 H `def91fb9f34ade40a65cbde999c0ffe192d18239`, A `4c3c2cf6cb0d4a0c6dd5ecbd97ceccadb8f161b0`),
  cumulatively integrated on `main` as PR #21 / `9baff3a03662720af6eefe1ecfabc41fde99298f`, with formal
  [parent receipt](../K1.0/integration-01.md) and [correction-02 receipt](../K1.0-correction-02/integration-01.md),
  ledger-reconciled by `main` PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`. Both receipts are in
  this candidate's ancestry through the branch main-merge `87ee39c` (ordinary merge commit, two parents,
  no rebase/amend/reset/squash/force-push). K11-R1-PROC-01 closes on that ancestry.
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Configured remote:**
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (governing baseline for review-01).
  **Reviewed payload C:** `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`.
  **Reviewed H:** `0f345b3c9ab49f6c5d9e09b162641cda78f96356`.
  **Review record:** `docs/development/work/K1.1/review-01.md` at
  `1489227b4c80a2d059e8e71f92b233ed76bff8d5` (preserved untouched; historical H and verdict unaltered).
  **Round-2 payload C2:** `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f`.
  **Round-2 candidate H2:** `297cc56ff186638817e0edfba7a3ce9f103d561e` (preserved).
  **Integrated main:** `05f48c204d1eae021b3464c206e5c11e84bb3505` (PR #26).
  **Branch main-merge:** `87ee39c2832f9ebd41aa8e5b084b76af0d14ff8c`.
  **Payload C3:** `615cdf884ac560aec659162353680e55f732804c` (this round's clean payload: JCS substrate
  swap over the merged tree; no K1.1 semantic change besides the approved substrate).
  **Previous reviewed H/review:** H `0f345b3…`, review-01 CHANGES REQUIRED (six findings; round-2
  corrected four in code and recorded two as owner blockers).
- **Candidate H3:** the commit containing this report. Its full SHA and the verified advertised remote
  SHA are supplied in the owner handoff after the push.
- **Exact C3..H3 administrative file allowlist:**
  - `docs/development/work/K1.1/implementation-03.md` (this report)
  - `docs/development/work/K1.1/validation-03/` (11 declared output-only attachments; MANIFEST plus
    ten logs, each naming C3, its command and its SHA-256)
  - `docs/development/007-work-packets.md` (K1.1 status transcription to WAITING_FOR_REVIEW with C3/H3
    and closure identities; no other row touched)
- **Working tree at C3:** clean apart from the validation-03 directory the run itself writes (which is
  `*.log`-ignored; recorded in `01-tree-and-environment.log`). **Push:** pending; performed after H3
  and reported in the handoff.
- **`.gitignore` exception.** As in rounds 1–2, the ten evidence logs are added with `git add -f`.
  `.gitignore` itself is unchanged.
- **Implementer:** Muse Spark, 2026-09-14 correction round. No independent review is claimed by anything
  in this report.

## Changes and coverage

### The main-merge (no payload change)

`87ee39c` merges `origin/main` (`05f48c2`, PR #26) into the K1.1 branch with an ordinary merge commit.
H2..merge diff is exactly three files: the two new owner receipts
(`work/K1.0/integration-01.md`, 47 lines; `work/K1.0-correction-02/integration-01.md`, 42 lines) and
the 007 reconciliation (18 lines changed). Inspected complete merge diff: the main side is
administrative receipt/status text only — corrected K1.0 integration identity (PR #21 /
`9baff3a03662720af6eefe1ecfabc41fde99298f`, demoting PR #24 / `4f02e6c` to a documentation merge),
both receipt links, preserved historical ACCEPT/invalidation provenance, no source, test, fixture,
config or semantic change. 007 conflict resolved semantically (not wholesale): K1.0 rows take main's
corrected identities and receipt links; K1.1 row preserves the round-2 IN_PROGRESS blocked status and
finding state (not PLANNED, not accepted). `review-01.md` and all reviewed K1.1 identities preserved;
no rebase/amend/reset/squash/force-push at any step (verified by the merge commit's two parents and
the linear `--graph` history).

### Change groups and the cumulative diff (main-merge..C3)

| Group | Paths | What it does | Governing source |
|---|---|---|---|
| JCS substrate (JCS-01) | `packages/kernel/src/values.ts`, `packages/kernel/package.json`, `package-lock.json` | Replace the bespoke canonical encoder with unmodified `canonicalize@3.0.0` default export, called only with already-validated plain data; exact pin + lockfile integrity; validation/limits/seal untouched | [values](../../../../mental-model/concepts/values.md) |
| Guard + inventory (015) | `tests/conformance/architecture/boundary-policy.ts`, `tests/conformance/architecture/kernel-landing-zone.test.ts`, `docs/development/work/K1.0/ownership-inventory.md` | Exact-specifier allowance (not a prefix), third-party cell `canonicalize`, local twin, new accept/reject controls; reader and document changed together | [015](../../015-structural-evidence-rules.md) |
| Contract + baseline | `docs/development/work/K1.1/contract.md` (rev 3), `docs/development/002-implemented-kernel-baseline.md` | OPEN-1 resolved / OPEN-2 closed, C3/C7/C10 wording, entry/dependency identities, third-party record | 006/007/008 |
| Structural pin test | `packages/kernel/tests/boundary.test.ts` | Exact-dependency pin assertion plus single-import-site check | C8/C10 |

**Ownership.** The substrate call lives in `packages/kernel/src/values.ts` (K1.0 target zone); nothing in
`packages/core`, `packages/sdk`, providers, `examples/` or `docs/guides/` changes, and
`tests/conformance/k0` is byte-identical to base. No consumer is routed through the target package; it
stays `private`. `package-lock.json` gains exactly the `canonicalize@3.0.0` stanza (plus the workspace
entry); no other dependency moves.

### Selected 012 methods, and what is excluded

Same selection as round 2, plus the substrate swap: **deterministic execution** (all canonical-form
vectors re-run against the dependency; byte-equivalence probed directly before the swap and asserted by
the suite after it), **normative decisions** (unchanged identity/equality/receipt rules), **race and
fault** narrowly (dispatch asynchrony; no persistence claim), **process/documentation** (merge/C/H
identities, receipt provenance, guard/inventory maintenance). A sixth ablation (almost-equivalent
`JSON.stringify` substrate) extends the oracle to the JCS decision itself. Exclusions unchanged: native
Runtime/Driver (R1), external gates (no E claimed), packaging/release (private zone), process-failure
(K3). `test:evals` not run (no Agent behavior).

### Obligation and interaction coverage (implementer assessment, not acceptance)

Round-2 dispositions stand and were re-audited after the substrate swap and the main-merge:

- **C1/C2/C4/C5/C6/C9** — value/lookup/ingress/dispatch/redelivery/receipt/inspection behavior is
  byte-identical under the new substrate (pre-swap probe: ALL MATCH on 20 vectors including key order,
  number spellings, escapes, `__proto__`, null-prototype, nesting; post-swap suites green). VAL-01 seal
  and ID-01 lookup code are untouched by this round; their round-2 oracles re-ran green and two VAL
  ablations re-ran rejected (see `09b`). Terminal-ingress deferral to K1.3 unchanged.
- **C3** — now satisfied as written: canonical bytes from the owner-approved unmodified conforming JCS
  implementation, with ArrokothI validation/limits/seal around it. All canonical-form, limit and
  VAL-01 cases pass against the dependency.
- **C7** — four refusing surfaces unchanged and green (including the SCOPE-01 cancel-refusal oracle).
- **C8** — no new discriminator; the only new vocabulary is the approved specifier. Green.
- **C10** — zone reaches `node:` + exact `canonicalize` only; inventory, guard, local twin and
  export-surface assertions agree on the measured tree (362 architecture tests, no weakening; two new
  controls are additive). `packages/kernel/src` file count still 10.
- **C11** — remains deleted (withdrawn DEC-1 with provenance in contract rev 2/3).

**Interactions re-checked:** validation-before-serialization ordering (walk refuses before the dependency
is ever called, so its `toJSON`/`undefined`-to-`null`/sorting behaviors are unreachable on invalid
input); seal-before-exposure (sealed copy, not caller object, is what the dependency serializes —
actually the dependency serializes the caller's validated object to compute bytes while the retained
copy is the seal; both derive from the same validated input, and re-canonicalization of the seal equals
the bound bytes per VAL-01 tests); per-root measurement (byte limit measured on dependency output per
root, unchanged).

**The oracle rejects wrong implementations.** `09b` (round 3) re-runs five round-2 ablations
(seal-assignment, array-regex, missing-fast-path, includes-early-exit, cancel-accept — each rejected as
in round 2) plus the new almost-equivalent-substrate ablation (`JSON.stringify` swap, rejected by
canonical-form cases). Structural substrate drift is additionally pinned by the package.json exact-pin
test, the single-import-site twin count, and the architecture externals-exactly-`["canonicalize"]`
assertion.

### Tests added, ported and removed (this round)

Added: JCS exact-pin test (`boundary.test.ts`), two architecture specifier controls (similar-name
rejection, approval acceptance), externals-exactly-canonicalize assertion, renamed zone-graph test.
Updated (no weakening): dependency-table anchors to the measured `canonicalize` row (malformed-cell
controls keep their defects; count/genuine-decode twins keep single-defect focus), third-party message
regex, local-twin allowance, inventory prose/cells. Removed: nothing (bespoke encoder deleted from
`values.ts` as the approved replacement, not a test removal). Round-2 suites otherwise intact:
`packages/kernel/tests` 117 (116 + pin), architecture 362 (360 + 2), conformance 1,949 (1,947 + 2),
full 2,175.

**Compatibility and refusal.** No public behavior change outside the target zone. Core/SDK/providers/
examples untouched; `test:sdk` 22/22 unchanged.

### Reference maintenance

- **Accepted semantic sources:** unchanged (creation, execution-cycle, core, identity, state, values,
  lifecycle; evidence structural section). **Layer-3 owners changed: none** — the substrate swap
  implements `values.md`'s stated rule; no definition, mechanism or Status line edited.
- **Layer 1/2:** no change. **Dependencies beyond the map:** waits/output/authority/operations/recovery
  re-inspected; nothing anticipates them.
- **Placeholders:** none. **Superseded prose:** 002 K1.1 note (+JCS substrate sentence), inventory
  import-rule/third-party/DX-2/K1.1-disposition sections, contract rev 3, landing-zone comments.
- **Index/links:** `check:builder-docs` passes (26 files, 286 links/anchors).
- Payload-in-C2/C3 rule (006) respected: all of the above is payload; report/status/evidence ride in H.

### Semantic correction closure (012)

**K11-R1-JCS-01 — CLOSED by owner approval + implementation.**
1. *Invariant/source/counterexample:* `values.md` canonical-form section requires an unmodified
   conforming JCS implementation rather than an almost-equivalent serializer (C3). The round-1/2
   candidate knowingly shipped a bespoke encoder with the divergence parked as OPEN-2 — not permission.
2. *Producers/validators/commit/consumers/replay/read paths/tests:* producer: `encode()` in `values.ts`
   (sole serialization point; one module, no caller touches it); validators: `walk` (validity) + byte
   measurement — both unchanged and still ArrokothI-owned; commit: `canonical` string bound into
   creation/input identity packings; consumers: equality (`sameLogicalValue`), replay/conflict decisions,
   mailbox/Activation/inspection bytes; replay/read: re-canonicalization of seals in VAL-01 tests; tests:
   all C3 canonical-form/limit/VAL suites + new pin/import/externals controls.
3. *Losing/refused paths and forbidden mutations:* invalid inputs never reach the dependency (walk refuses
   first with located codes; verified `undefined`/symbol/accessor/non-enumerable/`01`/exotic-prototype/
   cycle/limit cases still refused with mailbox/receipts unchanged). Forbidden: repaired/coerced bytes
   (ablation `JSON.stringify` swap rejected by key-order/number/escape cases); silently swapped substrate
   (pin + single-import + externals assertions); prefixed-package confusion (`canonicalize-evil`
   rejection control).
4. *Distinguishing oracle:* pre-swap direct probe (20 vectors incl. `__proto__`/null-prototype/nesting →
   ALL MATCH) plus post-swap green suites plus `JSON.stringify`-substrate ablation rejected by
   canonical-form cases plus structural pin controls. Prior output-only suites could not distinguish
   substrates (byte-identical by design); the new controls distinguish by decision, not by bytes.
5. *Re-audit:* whole cumulative packet re-audited after the swap (C1/C2/C4/C5/C6/C8/C9/C10 above; merge
   diff verified receipt/status-only). No weakening found; prior PASSes not treated as immunity. The
   hand-written encoder is gone from the tree (not kept beside the dependency).

**K11-R1-PROC-01 — CLOSED on merged ancestry.**
At C2 both receipt paths were absent (inspected, not fabricated). `origin/main` PR #26 supplied the
authentic owner receipts; the branch main-merge `87ee39c` brings PR #21 / `9baff3a` identities, both
receipt links (47 + 42 lines, administrative text only) and the ledger reconciliation into this
candidate's ancestry (`05f48c2` verified ancestor of C3; both receipt paths present in C3's tree).
007 K1.0 rows take main's corrected identities with historical ACCEPT/invalidation provenance preserved.
No candidate text waives or substitutes for the receipts.

**K11-R1-VAL-01 / ID-01 / SCOPE-01 / DOC-01 — preserved, re-audited, no behavior change this round.**
Value seal/validation, normalized lookup, cancellation refusal and support prose are byte-identical to
C2 except where the substrate swap touches them (serialization only); all round-2 oracles re-ran green
and the five round-2 ablations re-ran rejected. DOC-01 prose extended minimally (JCS substrate sentence
in 002; inventory import rule) without advertising K1.2/K1.3 behavior.

### Prior findings

Round-1 review-01 (CHANGES REQUIRED): VAL-01 reconstructed (C2, preserved here); ID-01 reconstructed
(C2, preserved); SCOPE-01 removed + clarified (C2, preserved); JCS-01 blocked at H2, now closed by owner
approval + implementation (C3); PROC-01 blocked at H2, now closed by PR #26 ancestry (merge `87ee39c`);
DOC-01 corrected (C2, extended here). K0.2 K02-R2-02 family stays closed (seal untouched). Round-1
self-corrections (wrapper-root, caller-reference) re-reviewed within VAL-01.

### Additional self-found defects this round (separate provenance)

- **K11-R3-SELF-01:** first JCS edit attempt added the dependency to the workspace root instead of
  `@arrokothi/kernel` (`npm install` without `-w`); reverted (`checkout -- package.json
  package-lock.json`) and re-installed with `-w @arrokothi/kernel --save-exact`. Caught before C3.
- **K11-R3-SELF-02:** initial guard edit used a prefix allowance (`"canonicalize"` in
  `allowedExternalPrefixes`), which would also admit hypothetical `canonicalize-evil`; replaced with an
  exact-specifier allowance plus a dedicated rejection control. Caught by self-review before C3.
- **K11-R3-SELF-03:** `boundary.test.ts` JCS-pin insertion initially replaced a neighboring test's header
  line instead of inserting; restored the test and kept the insertion. Caught by reading the diff.
- **K11-R3-SELF-04:** inventory-anchor updates initially missed the two `${count}` template-literal rows
  (raw backticks broke parsing); fixed with escaped backticks. Caught by typecheck before C3.
- **K11-R3-SELF-05:** round-3 ablation script's first seal/array patches were too narrow (left
  `defineProperty`/round-trip check intact → 5/0 fail lines instead of 23/11); rewrote both ablations to
  defeat the full mechanism and corrected the log with the re-run outputs. Caught by inspecting fail
  counts before finalizing evidence.

No other in-scope defect found. No silent weakening.

### Unresolved obligations and unblock conditions

None mandatory. K1.1-OPEN-1 (resolved) and OPEN-2 (closed) updated in contract rev 3.
K1.1-OPEN-3…OPEN-7 retained as stated limits (trivial progress, unreachable empty batch, in-memory
expiry, no durability/isolation/fidelity claim, unbounded attempt log) — not defects, not blockers.

## Validation and interpretation

### Commands

All run from `/Users/rex-shih/Documents/ArrokothI/arrokothi` against clean payload C3
`615cdf884ac560aec659162353680e55f732804c`, on Node v25.2.1, npm 11.6.2, TypeScript 5.9.3,
Darwin 25.6.0 arm64. Raw output, per-file SHA-256 digests and exact results in
[validation-03/MANIFEST.md](validation-03/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,175 tests, 324 suites, 0 fail, 0 skipped (base 2,060/302; C2 2,172/324) |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail (base 1,947; +2 guard controls) |
| `npm run test:sdk` | 0 | 22 tests, 0 fail — public host path unchanged |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 117 tests, 23 suites, 0 fail (base 4; C2 116; +1 JCS pin) |
| architecture suite (TAP `tests/conformance/architecture/*.test.ts`) | 0 | 362 tests, 37 suites, 0 fail (C2 360; +2 specifier controls) |
| packet cases TAP (`packages/kernel/tests/*.test.ts`) | 0 | 117 tests, 23 suites, every case named |
| 6 round-3 ablations of C3 in detached worktree | 0 | each rejected by 1–20 named cases; worktree clean after reverts apart from symlinked `node_modules` |

### External fixtures, gates and decisions

**None executed and none claimed** beyond the recorded owner inputs both now in-evidence: (a) the JCS
owner approval quoted in Identity (implemented, not invented); (b) the PR #26 receipt provenance
(inspected, merged, verified ancestor). No E0–E6 gate run. `tests/conformance/k0/` byte-identical to
base; no candidate ported onto it (K1.4 owns that port). No benchmark revision or evaluator relied on.

### Checks not run, and the resulting limits

- **`npm run test:evals`** — not run. 006 requires it for Agent behaviour; this round adds no Agent,
  model path or eval fixture. Limit: no Agent-behaviour claim.
- **No process-kill/restart/persistence run.** Coordinator in memory. Limit: no durability claim.
- **No native Driver.** All Drivers fakes. Limit: no fidelity claim.
- **No packaging/clean-consumer check.** Zone private (now with one runtime dependency). Limit: no
  installability/release claim. (Note: packed-consumer behavior with the new dependency is S1.1's, not
  this packet's.)
- **No multi-worker concurrency.** Asynchrony evidence is single-threaded non-awaiting only.

### Why the evidence supports each criterion — and where it stops (implementer assessment)

C1/C2/C4/C5/C6/C7/C8/C9 as in round 2 (preserved, re-audited, green). C3 now meets its written rule via
the approved substrate with ArrokothI validation/limits/seal around it (probe + suites + substrate
ablation + pin controls). C10 meets its updated rule (exact-specifier guard + agreeing inventory +
local twin + additive controls). C11 stays deleted. What evidence does **not** establish: end-to-end
protocol (no Outcome accepted), any E gate, persistence/concurrency/real-Driver/Effects behavior, or
packed-install behavior with the new dependency. C2 terminal live-exercise and C4 trivial-progress/
empty-batch limits remain honestly deferred/unreachable, not proven.

### Design choices, assumptions and the strongest remaining risk

- **Dependency used unmodified, at one call site, post-validation only** (new): the smallest shape that
  satisfies `values.md` without moving Kernel semantics into the package or the package's choices into
  the Kernel. `toJSON` and lossy array/object behaviors of the dependency are unreachable by
  construction (validated plain data only).
- **Exact-specifier guard, not a prefix** (new): one approved string, subpaths and lookalikes refused.
- **Authority/scope-list model, initial-input Input ID, one-Driver explicit dispatch, terminal rule
  without manufacturing, work-normalized lookup** (unchanged from round 2).
- **Strongest remaining risks:** (1) K1.2 finds dispatch-intent shape insufficient for Outcome
  acceptance (vocabulary-aligned, unprovable until K1.2); (2) a future `canonicalize` release changes
  bytes — mitigated by the exact pin + lockfile integrity + byte-asserting suites, which would fail
  loudly rather than drift.

### Third-party review under AGENTS.md (record)

- **Source/version:** `canonicalize`, exact `3.0.0`, registry tarball
  `https://registry.npmjs.org/canonicalize/-/canonicalize-3.0.0.tgz`, dist integrity
  `sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`
  (matches `npm view` metadata and the installed lockfile stanza), repository
  `git+https://github.com/erdtman/canonicalize.git`, homepage
  `https://github.com/erdtman/canonicalize#readme`, engines `node >= 18` (satisfied: Node v25.2.1),
  contributors Samuel Erdtman and Anders Rundgren.
- **Applicable terms:** `package.json` license field `Apache-2.0`; standard 201-line Apache License 2.0
  text in package-root `LICENSE`; no `NOTICE` file; no per-file headers; 49-line `lib/canonicalize.js`
  (+ `.d.ts`, `bin/`), zero runtime dependencies (dev-only eslint/c8). Apache-2.0 allows commercial use,
  reproduction, distribution and derivative works with no copyleft, non-commercial, source-available,
  hosted-service or multi-tenant restriction. Do not infer permission from the public repository or the
  familiar license name alone — inspected the installed revision's `package.json`, `LICENSE` and module
  headers as above; no conflicting per-module terms found.
- **Reuse method:** use of the published package unmodified via package-manager reference
  (`"canonicalize": "3.0.0"` in `packages/kernel/package.json`, pinned stanza in `package-lock.json`);
  no source copied, adapted, vendored or rewritten; imported once as the default export in
  `packages/kernel/src/values.ts` (`encode()`), called only with already-validated plain data.
  A service boundary or rewrite is not involved; obligations are not evaded by indirection.
- **Required notices/obligations:** preserve the Apache-2.0 license text (ships in
  `node_modules/canonicalize/LICENSE` for development installs; packed-publish attribution, if the
  package ever ships, must carry it — S1.1/S1.2's concern, explicitly not claimed here); state changes
  (none made to the package); no NOTICE contents to reproduce. Recorded here, in the contract's
  Third-party review section and in the ownership inventory.
- **Compatibility:** intended ArrokothI commercial use and distribution are permitted under these terms;
  no unresolved term blocks this use. No other third-party material introduced this round.

## Handoff

- **Ready for independent review.** No known mandatory defect, unresolved owned semantic case or missing
  result remains for a claimed criterion. All six review-01 findings are closed (VAL-01/ID-01/SCOPE-01/
  DOC-01 in code, JCS-01 by owner approval + implementation, PROC-01 by merged receipt ancestry), the
  whole cumulative packet is re-audited above, and limits are stated rather than deferred.
- **Base** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`, **payload C3**
  `615cdf884ac560aec659162353680e55f732804c`, **main-merge** `87ee39c2832f9ebd41aa8e5b084b76af0d14ff8c`
  over **integrated main** `05f48c204d1eae021b3464c206e5c11e84bb3505`, **candidate H3** the commit
  containing this report; its full SHA and the verified advertised remote SHA are supplied in the owner
  handoff after the push. Review `base..H3` and the C3..H3 allowlist named under Identity.
- **No self-acceptance.** This report is the implementer's assessment. Acceptance requires a separate
  reviewer session bound to the exact H3, and the successor packet remains owner-controlled and
  unreleased. Do not merge. Do not release K1.2. Do not claim E1, durability, real Driver fidelity,
  packaging/release support or K1 milestone closure.
