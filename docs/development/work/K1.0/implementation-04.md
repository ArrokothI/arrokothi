# Implementation report — K1.0, round 4 (correction)

## Identity

- **Packet:** K1.0 — target boundary and legacy quarantine. **Parent milestone:** K1.
  **Contract:** [`contract.md`](contract.md), revision 4.
- **Governing process baseline:** this repository's integrated `docs/development/` documents at the
  base commit — [006](../../006-development-process.md), [007](../../007-work-packets.md),
  [008](../../008-implementation-report.md), [012](../../012-review-methods.md),
  [013](../../013-structure-and-evidence-sequencing.md). This candidate changes none of them.
- **State:** CHANGES_REQUESTED → IN_PROGRESS → WAITING_FOR_REVIEW. No verdict is entered here and
  none is claimed.
- **Correction handoff acted on:** [review-03.md](review-03.md), recorded by
  `d0694071ae41de1c13fc526a63e96c3f5ccfb7ee`, which is exactly one administrative commit containing
  only that record. Open finding **K10-R3-01** (P2). No owner supplemental decision; no unresolved
  authority. Corrections on a released packet need no renewed permission, and none is claimed.
- **Owner release and its provenance:** unchanged from round 1 — the owner's verbatim 2026-09-13
  instruction releasing K1.0 and directing that the benchmark E1 dependency be treated as the
  already-built but unaccepted fixture preparation, quoted in the contract's *Release provenance*.
- **Prerequisite ACCEPT and integration identities:** unchanged. K0.2 accepted at H16
  `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`, integrated as
  `0535160e677231da41b06d9f822e62e2f0364dd1`. The benchmark E1 preparation is still built and
  **accepted by nobody**: branch `codex/e1-kernel-acceptance-capture`, payload
  `d8f17549c31f9ee5d995e773c2f211faed2785fb`, candidate `8de04779d279dba82cf834d419e465d2b677ef46`,
  `BLOCKED_EXTERNAL`, not merged.
- **Branch and configured remote:** `codex/k1.0-target-boundary-legacy-quarantine` on `origin`
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, unchanged across all four rounds.
- **Previous reviewed H and its review record:** H3 `bddbbc6ee8bc3ce1198c431efedcf9227d8d5cba`,
  reviewed `CHANGES REQUIRED` by [review-03.md](review-03.md). Rounds 1–2 (H
  `40bb07a54cd5ba78aed386cb03cd0fb47579b6f6` / H2 `d4347837699b80e5cbffa83d48dd7a8c9e53f7e6`,
  [review-01.md](review-01.md) / [review-02.md](review-02.md)) are preserved.
- **Payload C:** `0f012d4eed6ccc905236ccdafc25148d399619d6` — one correction payload commit after the
  round-3 review record. `A3 → C` touches three files: the relational oracle, its agreement tests,
  and the contract. History is preserved, not rewritten.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, since a commit cannot name itself.
- **Exact C..H administrative file allowlist:**
  - `docs/development/work/K1.0/implementation-04.md` (this report)
  - `docs/development/work/K1.0/validation-04/MANIFEST.md` and its eight `[01-08]*.log` attachments
  - the K1.0 status-row transcription in `docs/development/007-work-packets.md`
  - the matching live-summary sentences in `docs/development/README.md` and
    `docs/development/001-current-status-and-roadmap.md`

  Nothing else. No script, fixture, schema, test, threshold or configuration is in that interval.
- **Working-tree state:** clean at C when every command in `validation-04/` ran.
- **Push status:** pending at the time of writing. The verified advertised remote SHA is supplied in
  the external handoff after the push; this report certifies no future push.

## Changes and coverage

### What changed, and why this shape

K10-R3-01 is an ordinary same-packet evidence defect in a subsystem round 3 reconstructed, not a
second invariant-level reopening: the relational tuple comparisons the review accepted are correct;
only key uniqueness was missing from the relations they compare. The fix therefore completes the
reconstruction rather than rebuilding it again, and preserves every round-3 control and comparison.

| Group | Paths | Finding |
|---|---|---|
| Uniqueness in the relational oracle | `tests/conformance/architecture/inventory-oracle.ts` | K10-R3-01 |
| Duplicate-key controls; duplicate-aware dependency-table parser | `tests/conformance/architecture/kernel-landing-zone.test.ts` | K10-R3-01 |
| Contract revision 4 (uniqueness wording, evidence counts) | `docs/development/work/K1.0/contract.md` | K10-R3-01 |

### Selected 012 methods

Unchanged in kind: **deterministic execution** carries the guards, **process/documentation** carries
the record criteria, **packaging/release** is used only negatively for C6. The emphasis this round
is again 012's distinguishing-evidence rule — the review's exact counterexample (false zone row
immediately before the correct row) was reproduced first and shown to report zero disagreements
before the fix, then re-run after it. Exclusions are unchanged: race and fault, native
Runtime/Driver, and external evidence/gate all remain out of scope for a structural packet.

### K10-R3-01 — duplicate keys fail closed

**Governing invariant.** C4 requires an accurate ownership/export/dependency inventory, and revision
3 claims relational agreement with strict parsing such that a wrong row cannot go quiet. A document
containing two contradictory rows for the same declared identity does not agree with the policy
merely because the parser keeps the last one.

**Defect as found.** Each parsed ownership relation was stored with a bare `Map.set`, with no
duplicate-key check. A later readable row overwrote an earlier readable row with the same key; the
overwritten row never reached `unreadable` and `inventoryDisagreements` could not see it. The
separately parsed cross-boundary dependency table had the same `parsed.set(zoneId, …)` shape.
Reproduced before the fix: the review's false-`target-kernel` → `packages/core/src` row before the
correct row yields `zones.get("target-kernel") == ["packages/kernel/src"]`, `unreadable == []`,
`disagreements == []`; the same silence held for duplicate DX and package rows.

**Fix.** Uniqueness is now part of every keyed relation the C4 evidence claims:

- `parseInventory` keeps the first row for a zone id, DX id or package name and records any further
  row for the same key as an explicit disagreement
  (`duplicate Zones/Deferred/Export row for …`), which `inventoryDisagreements` surfaces through the
  existing `unreadable` channel. Keeping the first row means the false-before-correct order reports
  both the duplicate and the concrete relation mismatch; the false-after-correct order reports the
  duplicate. Both orders fail; the result no longer depends on row order.
- The cross-boundary table is parsed by a shared `parseDependencyTable` helper that keeps the first
  row per zone and returns `duplicates`; the agreement test asserts the list is empty, and a new
  `duplicate cross-boundary dependency rows fail closed (K10-R3-01)` test requires the duplicate to
  be reported in both orders.
- An exact-duplicate key (identical content) is also a disagreement: the document is internally
  inconsistent about how many rows assert the identity, and uniqueness is the stated rule.

**Controls.** Six order-paired mutated-document controls join the existing ten: duplicate zone, DX
and package rows inserted immediately before and immediately after the correct row, each expecting
its `duplicate …` message; plus the cross-boundary duplicate test in both orders. C4 evidence grows
5 cases plus 10 controls → 6 cases plus 16 controls. The real document parses exactly as before
(zero disagreements), so no current row changed meaning.

**Contract reconciliation.** Revision 4 states the uniqueness guarantee, its first-row-kept rule,
and the updated evidence counts in C4; the forbidden column gains "a contradictory duplicate row
for the same key in either order". C3's suite count moves 1885 → 1892. No semantic requirement
changed.

### Cumulative re-review (006)

The whole cumulative packet was re-examined after the correction, not only the touched files: the
round-3 scanner reconstruction is byte-untouched and all of its controls still pass (23
forbidden-edge controls, 61 extractor cases, K0.2-SELF-01 prose controls, the 326-source
two-extractor comparison re-verified by the green suite); the ten round-3 mutated-document controls
still pass unchanged; `tests/conformance/k0` is byte-identical to the base; no legacy source moved;
no public export changed; the target package still exposes only the throwing refusal and stays
private. No additional in-scope defect was found; 007's ledger and the release provenance are
unchanged apart from the round-4 candidate identity.

### Why the previous closure pass missed it

006 requires this. Round 3 built its falsifying artifacts from the finding it was closing: the ten
mutations vary associations *within* single rows (swaps, reassignments, redispositions,
publishability flips, dropped subpaths, deleted/invented rows). Every mutation keeps the key set
intact, so a parser that keys relations by `Map.set` answers all ten correctly by construction. The
pass never asked "what wrong document keeps every row readable and every association present?" —
a second row for an existing key. Key uniqueness was assumed from the document's one-row-per-key
layout rather than enforced as the relation the oracle claims. The method correction is the same one
round 3 adopted: the duplicate shape is now a committed control in both orders, not a one-off
check.

### Prior findings

| Id | Round | Disposition |
|---|---|---|
| **K10-R3-01** | 3 | **Closed here.** Uniqueness enforced in all four keyed relations; order-paired controls in both orders; contract reconciled. Evidence `08` and the committed tests. |
| K10-R2-01 | 2 | Closed by reconstruction in round 3; preserved. Scanner untouched this round; all controls green. |
| K10-R2-02 | 2 | Closed by reconstruction in round 3; completed here by the uniqueness rule above. Tuple comparisons unchanged. |
| K10-R1-01, K10-R1-02 | 1 | Closed in round 2; see [implementation-02.md](implementation-02.md). |
| K1.0-SELF-01 … -07 | 1–3 | Closed in their rounds; preserved. |
| K0.2-SELF-01 | K0.2 | Remains closed; prose controls re-pass in this suite run. |

### Additional self-found defects (separate provenance)

None this round. The DX after-order control initially anchored on a row prefix whose remainder
attached to the duplicate's last line; it was corrected to a full-row anchor before handoff so the
control tests duplication rather than truncation. That correction is part of K10-R3-01's own
provenance, not a separate defect.

### Unresolved obligations and their unblock conditions

Unchanged from round 3:

1. **`tests/conformance/k0` remains frozen.** Its comment at `controls.test.ts:67` still names the
   pre-rename guard path. Its bytes are pinned by benchmark E1 at `0535160e…`. Assigned to K1.4.
2. **The allowed-leaf list is empty**, so the real tree never exercises a non-empty allowlist; two
   fixture controls do, including one proving approval is not transitive. Unblocked by K1.1.
3. **Three deliberate extractor exclusions**, recorded in the contract's limits: `/// <reference
   lib="..." />`, JSDoc `import(...)` types, and bare `require("...")`. A later packet that makes
   any of these load-bearing owns extending the extractor and its controls.
4. **Static guarantees only.** These guards constrain dependency direction in source. They establish
   nothing about durability, isolation, Driver fidelity or protocol correctness.

## Validation and interpretation

Exact commands, environment, exit codes, counts and digests are in
[`validation-04/MANIFEST.md`](validation-04/MANIFEST.md). All ran from
`/Users/rex-shih/Documents/ArrokothI/arrokothi` against the clean payload tree at C, on
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1892 tests, 284 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1779 tests, 265 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |

Suite 1885 → 1892 (six order-paired duplicate controls plus the cross-boundary duplicate test);
architecture controls otherwise unchanged. Nothing was removed, skipped or weakened;
`legacy-core-boundaries.test.ts` still reports the same 13 assertions it had at base, and
`tests/conformance/k0` is byte-identical to the base.

**Checks not run.** `npm run test:evals` — this packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. The limit is that this candidate offers no evidence
about Agent behaviour and claims none.

**External fixture, gate and decision, stated separately.** Unchanged: the benchmark E1 preparation
was inspected, not executed, and is accepted by nobody. No E1 schedule ran here, no E1 criterion is
closed, and the structural pass earns no evidence credit.

**Why the evidence supports the reopened criterion** (implementer assessment, not acceptance). C4
previously passed its ten mutations while silent on an eleventh shape. The review's exact
counterexample reported zero disagreements before this fix and now reports the duplicate (plus the
relation mismatch in the false-first order); the symmetric five variants each report their
duplicate; the real document still reports zero. The cross-boundary duplicate is caught in both
orders through the same parser the agreement test uses. The round-3 scanner and tuple evidence is
untouched and re-verified green.

**Design choices.** First-row-kept was chosen over last-write-wins so no contradictory content is
erased before comparison; the duplicate message quotes the rejected row so the report names which
row intruded. Duplicates ride the existing `unreadable` → disagreement channel rather than a new
result shape, so every consumer of the oracle fails closed without a protocol change.

**Owner amendments.** None this round. The round-1 E1 dependency amendment stands.

**Strongest remaining risk.** Unchanged: these are static guarantees about source. A future packet
could satisfy every rule here and still reproduce the legacy execution model in new files inside the
zone. Structure does not prevent that; K1.4's behavioural recheck is where it would surface.

**Third-party review under AGENTS.md.** None. No dependency was added, no third-party source was
copied, adapted or vendored, and `package-lock.json` is unchanged this round.

## Handoff

- **Ready for independent review.** The single open finding is closed, with distinguishing evidence
  that is red against the previous implementation and green only where the document is actually
  consistent. No additional defect was found in the cumulative re-review; no self-found defect with
  separate provenance is reported. Four obligations are recorded unresolved with named unblock
  conditions; none of them passes because the suite is green.
- Base, previous reviewed H3, C and H, and the verified push SHA are supplied in the external owner
  handoff.
- No self-acceptance; successor release remains owner-controlled.
