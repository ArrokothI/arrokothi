# Implementation report — K1.0-correction-02, round 1

## Identity

- **Packet / parent:** K1.0-correction-02, a bounded correction of the released packet
  [K1.0](../K1.0/contract.md); parent milestone K1. Contract:
  [K1.0-correction-02/contract.md](contract.md), **revision 1**, over
  [K1.0's contract](../K1.0/contract.md) **revision 19**. Governing process baseline
  `c9a9ed7e6e538ab0542fc6a999426264abb6212a` (006/007/008/009/012 as integrated on `main`).
- **State:** WAITING_FOR_REVIEW. Entered from CHANGES_REQUESTED, which the owner-delegated cleanup
  agent recorded under 006's invalidated-accepted-work rule. **No successor release is requested or
  implied**; corrections on a released packet need no renewed owner permission, and the K1.0 release
  and its E1-preparation amendment are unchanged.
- **Prerequisite ACCEPT and integration:** K0.2, independently ACCEPTED at H16
  `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2` and integrated as
  `0535160e677231da41b06d9f822e62e2f0364dd1` ([receipt](../K0.2/integration-01.md)); the integration
  is an ancestor of remote `main`, which is still exactly the original base.
- **Branch / configured remote:** `codex/k1.0-target-boundary-legacy-quarantine` on
  `https://github.com/ArrokothI/arrokothi.git`. No remote URL was changed and `main` was not pushed.
- **Base commit:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a` — K1.0's own base. Correction closure
  is reviewed over the **cumulative base-to-H interval**, not over the correction delta alone.
- **Previous reviewed H / review:** correction-01 round 2, H
  `1295c68b03ae5d8eb0bbb86e974353402ff9a518` over clean payload C
  `36460438e95e968beec0b354b07a616b53981256`, ACCEPTED by
  [review-02](../K1.0-correction-01/review-02.md), recorded at A
  `41728edfc3cfc5c745e4293c511a740942f7b631`. That ACCEPT and its
  [invalidation notice](../K1.0-correction-01/cleanup-01.md) are both preserved byte-unchanged; the
  notice's C4 hold still stands and this round does not lift it.
- **Pinned starting head:** `968d74605cd34b30541bfd868b30bb1d0868cc41`, the pushed cleanup and
  invalidation record supplied with the handoff. It was pinned before any edit and is the parent
  of C.
- **Payload C:** `95d74530f37c7af8706ef92d29574425a39afcf1`. All final validation ran against that
  committed tree.
- **Candidate H:** the commit containing this report; its full SHA is supplied in the external
  owner handoff after the push.
- **Exact C..H administrative file allowlist (16 paths):**
  `docs/development/work/K1.0-correction-02/implementation-01.md`;
  `docs/development/work/K1.0-correction-02/validation-01/MANIFEST.md` and its ten output-only
  `.log` attachments (`01-tree-and-environment`, `02-typecheck`, `03-test-full`,
  `04-test-conformance`, `05-check-builder-docs`, `06-test-kernel`, `07-test-sdk`,
  `08-corr2-demonstration`, `09-distinguishing-ablation`, `10-c4-control-inventory`); and
  status-only changes in `docs/development/001-current-status-and-roadmap.md`,
  `docs/development/007-work-packets.md`, `docs/development/014-owner-progress-summary.md` and
  `docs/development/README.md`. No payload changes after C.
- **Working-tree state at C:** clean apart from `validation-01/`, which the validation run itself
  writes. The ten raw `.log` files are staged explicitly despite the repository ignore rule, as in
  every prior round.
- **Push status:** pending at the time of writing. A report written before the push cannot certify
  it; the verified advertised remote SHA is supplied in the external handoff.

## Changes and coverage

### Change groups and full cumulative diff

The correction delta (`968d746..C`) is six files, 695 insertions and 69 deletions. The cumulative
candidate (`base..C`) is the whole K1.0 packet.

| Group | Files | Ownership | Governing source |
|---|---|---|---|
| The equality itself | `tests/conformance/architecture/inventory-oracle.ts` | C4 evidence oracle | [K1.0-C4](../K1.0/contract.md#acceptance-criteria); correction-02 contract *Required correction* 1–4 |
| Its consumers and controls | `tests/conformance/architecture/kernel-landing-zone.test.ts` | C4 evidence | same, plus *Required correction* 5 |
| Evidence-guard roots | `tests/conformance/architecture/evidence-records.test.ts` | evidence records | 006 *Evidence and validation* |
| Contract and ledger | `docs/development/work/K1.0/contract.md` (revision 19), `docs/development/work/K1.0-correction-02/contract.md` (new), `docs/development/007-work-packets.md` (seed link) | development contract | 006/007 |

Nothing in Kernel, Execution, legacy production, provider, SDK or example code changed. The
ownership inventory document is **unchanged**: the document was correct and the oracle that checked
it was not. `tests/conformance/k0` is byte-identical to the base. The only production paths that
differ from the base at all are `packages/kernel` and its two manifest entries, created by K1.0
itself (01-tree-and-environment).

### The correction

`inventoryDisagreements` compared both collection-valued ownership relations by rendering each side
with `join(",")` and comparing the two strings. A joined string is not an injective rendering of a
collection: any collection whose members are joined by the separator renders exactly like the one
collection holding that whole rendering as a single member. The whole-cell decoder closed in
correction-01 round 1 (K10-CLEANUP-01) already kept `` `a`, `b` `` and `` `a,b` `` apart as two
members and one; this comparison put them back together one stage later.

Three things changed, all in service of one rule:

1. **One shared equality.** `collectionDisagreement(subject, enforced, documented)` compares
   cardinality and then member against member over a common order. Sorting is what keeps reordering
   a permitted spelling — the policy and the document genuinely write `runtime-integrations`' four
   roots in different orders — and nothing is rendered before comparison. It is exported and used by
   the Zones roots, the Export subpaths **and both cross-boundary dependency columns**, the last two
   of which previously compared with a second hand-written loop inside the test. That is the same
   reason `readKeyedTable` owns row accounting for all four tables: the defect was two hand-written
   comparisons that had drifted from what the relation means, and a third one elsewhere is how it
   would return.
2. **No lossy stage in between.** `decodeEdgeCell` returns its decoded members rather than a `Set`,
   and `DependencyRow.reaches`/`thirdParty` are `readonly string[]`. See *Additional self-found
   observations* for the honest status of this one.
3. **A diagnostic that shows what was compared.** The old message rendered `[a, b]` for both a
   two-member collection and the one-member collection holding `a, b`, so a report could name the
   right relation and still not show what was wrong with it — the defect reproduced where the result
   is read. Each member is now quoted with its own escaping and each size is stated.

To support the controls, the per-zone measurement in the dependency guard was lifted into a
`measuredZoneEdges` helper so the controls compare against the same measurement the guard is held
to, rather than a second copy of the rule. The guard's own behaviour is unchanged: the same loop,
resolution order and sentinel handling, with every assertion still in the caller.

### Selected 012 methods; material exclusions

- **Deterministic execution** (dominant). The oracle is mechanically decidable over repository
  files. Every new control drives the production entry points on the real document, each family is
  derived from what a collection is rather than transcribed from the reported strings, and each is
  paired with the permitted spelling it must not break. Six one-behaviour ablations
  (09-distinguishing-ablation) record which controls can distinguish which implementation,
  including the separator-blacklist "fix" the finding explicitly rules out.
- **Process/documentation** for C5, C6, C8 and the records: reference resolution, policy/document
  agreement asserted in code, ancestry and byte-identity checks on every preserved record.
- **Packaging/release** negatively for C6 only: the target package is `private`.
- **Materially excluded, unchanged from K1.0's contract:** race and fault (this packet commits no
  state and makes no ordering or recovery claim); native Runtime/Driver (no Driver exists);
  external evidence/gate (E1 is a recorded prerequisite, not a gate this packet executes).
  `npm run test:evals` is not run because the correction reaches no Agent or model-facing
  behaviour.

### Obligation and interaction coverage

Derived from the contract before the solution was written, then re-checked against the finished
cumulative packet. Every row's result is an implementer observation, not an acceptance.

| Obligation / source | Input, including the negative case | Expected facts and forbidden changes | Location and result |
|---|---|---|---|
| **K1.0-C1** — target zone reaches nothing outside itself | Transitive walk from `packages/kernel/src/index.ts` over the real tree | Zero violations; every reached file in-zone; every external `node:`; a non-literal dynamic import is a violation, not silence | `kernel-landing-zone.test.ts` "the target zone's real import graph…", "that result is not vacuous…" — pass, unchanged by this round |
| **K1.0-C2** — rejection is demonstrated, not assumed | 23 fixture repositories, 18 planting one forbidden edge each | Each forbidden fixture yields exactly one attributed violation; each permitted fixture none | "K1.0 forbidden-edge controls", 23 tests — pass, unchanged |
| **K1.0-C3** — consumers and existing tests keep working | Full suite, typecheck, export map and sorted-name digests, reverse-quarantine scan | 2060 pass / 0 fail; typecheck clean; the five legacy subpaths keep their export map and their 227/227/44/33/21 names by digest | 03-test-full, 02-typecheck, "K1.0 legacy quarantine" — pass. Count 2051 → 2060 is this round's nine new controls; no test was removed, skipped or weakened |
| **K1.0-C4** — per-row relational agreement | The four zones, the DX rows, the export table, the measured dependency tree, and every derived false-collection family | Relations compared in both directions by whole row; collections compared by cardinality and member identity, never a rendering; reordering permitted; the real inventory still agrees | `inventory-oracle.ts`, `kernel-landing-zone.test.ts` "K1.0 policy and inventory agree" (170 cases plus 16 controls) — pass; 08 and 09 carry the distinguishing evidence |
| **K1.0-C5** — every deferred extraction is assigned | The twelve DX rows in policy and document | Each names an existing path, a disposition and an owning packet the ledger declares | "every deferred owner names a packet the ledger declares"; the four Deferred scalar re-assertions in the new block — pass, relation unchanged by this round |
| **K1.0-C6** — no protocol, no no-op API, no release claim | The target package's whole source and manifest | Exactly `UnsupportedKernelSurfaceError` and `refuseUnsupportedSurface`; refusal throws; manifest `private: true` | `packages/kernel/tests/unsupported.test.ts` (4), "the target zone exists…cannot be published" — pass, unchanged |
| **K1.0-C7** — preserved regressions and truthful attribution | `legacy-core-boundaries.test.ts` against its predecessor; the architecture suite progression | All thirteen original assertions retained one-to-one; suite 351 → 360, none removed | `legacy-core-boundaries.test.ts` 13 tests; architecture suite 360 — pass |
| **K1.0-C8** — E1 provenance recorded, no result claimed | K1.0's *Release provenance* section | Seven E1 identities with their unaccepted status and the explicit no-credit statement | K1.0 contract, unchanged this round; no E1 schedule executed — pass |
| **K1.0-C9** — the guard mechanism is meaningful both ways | Prose/needle corpus, every module-naming form, 326 repository sources | No prose yields a specifier; every naming form yields its target; unrecoverable targets yield the fail-closed sentinel | `import-scanner.test.ts` 61 tests — pass, unchanged |
| **C4 ↔ C5 interaction** | The Deferred tuple beside the corrected collections | Three scalars still compared exactly, including a value that spells the separator | New "the Deferred tuple still distinguishes every scalar field", and 08 — pass; this relation has no collection to lose and was deliberately left unchanged |
| **C4 ↔ C1/C2 interaction** | The dependency columns, which are both an inventory relation and a statement about the measured import tree | The controls and the real guard share one measurement and one comparison | `measuredZoneEdges` used by both — pass |

### Tests added, ported or removed

Nine tests added, all inside `describe("collection identity in relation comparison (K10-CORR2-01)")`.
**None removed, skipped or weakened.** Three pre-existing mutated-document controls had their
expected message text updated to the unambiguous rendering (two zone-root controls and the
dropped-subpath control); the mutations and required outcomes are identical and the regexes are
strictly more specific than before, since they now also pin both cardinalities. Three assertions
that named the old `Set` shape were updated to the decoded-member shape (`new Set<string>()` → `[]`,
`.size` → `.length`), with the same asserted values.

The two dependency comparisons in the real guard moved from `assert.deepEqual(sorted, sorted)` to
`assert.equal(collectionDisagreement(...), undefined)`. These are equal in strength: deep-equality
of two sorted arrays *is* multiset equality, which is exactly what the shared rule computes. The
change buys shared ownership of the rule, not a different verdict — which is why the equality
ablation in 09 newly breaks the dependency control, and why nothing in the real document changed
status.

Compatibility and refusal surfaces are untouched. No guide, skill or baseline document describes
this oracle, so none needed updating; `npm run check:builder-docs` passes at its unchanged inventory.

### Semantic correction closure (012 §Semantic correction closure)

1. **Invariant changed.** *Two asserted collections agree only when they are the same collection:
   same cardinality, same members.* Authoritative source: K1.0-C4's "Agreement is checked per row
   relation… compared in both directions against the executable policy and the actual manifests".
   Original counterexample: the core export cell rewritten as one span
   `` `.,./execution,./ports,./reference,./testing` `` — one invented subpath in place of five
   declared ones, with `parsed.unreadable` and `inventoryDisagreements` both empty
   ([raw reproduction](../K1.0-correction-01/cleanup-evidence-01/relation-counterexamples.log)).
   The *normative obligation* is relation equality; comma-joined string comparison was one
   mechanism for it, and a rule about which bytes a member may contain is neither.
2. **Dependent rules and paths, including outside the edited lines.** Who creates the fact:
   `decodeCodeSpanList` (members), `decodeEdgeCell` (dependency members), `readKeyedTable`
   (row → relation), `parseInventory` / `parseDependencyTable` (relation maps). Who validates it:
   `inventoryDisagreements` for zones, deferred and packages; the dependency guard for the measured
   tree. Who consumes the result: the mutated-document controls, the whole-cell controls, the
   schema-arity controls, and every test that asserts a specific message. Conceptual aliases
   searched as well as names: `join(`, `Set`, `sorted`, `deepEqual`, `includes`, "relation",
   "collection", "list", "set", "tokens", "members". The repo-wide search for any other
   join-based equality (`01-tree-and-environment`, and a `grep` over every `.ts`/`.mjs` outside
   `node_modules`) returns nothing else; the remaining `join` uses are message formatting, fixture
   construction, digest inputs whose cardinality is separately asserted, or `path.join`.
3. **Paths walked together.** For the *bounded collection*: the empty form (`nothing` / the em dash
   → `[]`, still accepted only in the column whose grammar names it), the one-member form, the
   exactly-declared form, one member fewer at both ends of sorted order, one member more, and the
   same size with different members. For *alternate entries to the same state*: all four keyed
   tables reach the comparison through the same reader, and both dependency columns now enter the
   same rule. For the *losing proposal*: a rewritten cell must still be readable — the row is well
   formed and what it asserts is simply false — so the correction adds a disagreement, never an
   unreadable row, and that is asserted rather than assumed.
4. **All in-scope occurrences corrected; distinguishing evidence added; packet re-audited.** Both
   defective comparisons, both hand-written dependency comparisons, the lossy `Set` stage and the
   ambiguous diagnostic. Evidence in 08 (22 of 22 false collections accepted by the reviewed parser,
   0 by C) and 09 (six ablations). The whole cumulative packet was re-checked against C1–C9 above.

**Why the previous passes missed it.** Correction-01 round 1 audited *cell by cell*: it compared
each decoded cell against a per-cell reference. Round 2 reconstructed table-schema authority, one
structural level *above* decoding, and its audit compared parsed relations to a reference. Neither
oracle can observe this defect, because the collision does not exist in any cell or in any parsed
relation — both sides are decoded and stored correctly — it exists only in the comparison *between*
two whole collections, and only when their renderings coincide. Round 2's downstream challenges
were real-document agreement and a changed **scalar** Deferred owner; a scalar has no collection
identity to lose, so that check could not expose it either. Review-02 independently rechecked
header and arity ownership and the scalar downstream behaviour, and recorded no distinguishing
list-boundary comparison. The recurring shape across
[K10-CLEANUP-01](../K1.0/cleanup-01.md), K10-CORR1-R1-01 and this finding is the same: each round
reconstructed one stage and inherited the next stage's assumption that the meaning arriving from
upstream would be preserved. The structural answer taken here is to give the surviving stage one
owner — as `readKeyedTable` already is for accounting — rather than to correct one more call site.

### Prior findings

| ID | Origin | Disposition at this C |
|---|---|---|
| **K10-CORR1-CLEANUP-01** | Owner-delegated cleanup, the open finding this packet exists for | **Closed at this candidate, pending independent review.** All 22 reproduced relations reported; the two-sided direction closed as well; evidence in 08 and 09 |
| K10-CLEANUP-01 | K1.0 cleanup-01 | Closed in correction-01 round 1; re-asserted here — the whole-cell decoders are unchanged and their controls all pass |
| K10-CORR1-R1-01 | [review-01](../K1.0-correction-01/review-01.md) | Closed in correction-01 round 2; re-asserted — the schema-arity block passes unchanged |
| K10-R1-01 … K10-R15-01, K1.0-SELF-08/11/20/24/27/28/29 | K1.0 rounds 1–16 | Historical dispositions carried by reference; every control preserved and green at this C (10-c4-control-inventory lists all 216 by name) |

### Additional self-found observations (separate provenance)

- **CORR2-SELF-01 — the two-sided direction of the same defect.** Derived while reconstructing the
  equality, independently of the finding's text. The reported family is the document merging
  members; the mirror is the **enforced** side declaring one member that spells the separator, which
  a document could then split into several. Both directions were silent under the old comparison
  (08, *family C*). This is recorded as part of K10-CORR1-CLEANUP-01's subject rather than as a
  separate defect, because it is the same equality — but it is the case that distinguishes a real
  correction from a separator blacklist, and 09's `blacklist` ablation shows exactly that.
- **CORR2-SELF-02 — the ambiguous diagnostic.** Also self-found. Not a false-agreement defect: the
  comparison's verdict was right in the cases it got right, but its message could not distinguish
  the two shapes, which is how a reader or a message-matching control could confirm the wrong
  relation. Corrected with the comparison.
- **CORR2-SELF-03 — the `Set` stage, recorded honestly as defence in depth, not a defect.** The
  dependency edge decoder built a `Set` from the decoded members. A `Set` can drop a member, and
  its not doing so here depended on a rule stated in a different function (`decodeCodeSpanList`
  rejects a token repeated inside one cell). I could not construct an input that loses a member
  through it, and 09 records the ablation that proves the point against me: a *de-duplicating array*
  passes every control in the suite. The representation is now the decoded members, and the
  coupling is gone; the claim is that a lossy stage was removed, **not** that a reachable defect was
  fixed.

### Unresolved obligations

None within this packet's scope. No normative conflict was found, so no `BLOCKED_ARCHITECTURE`
applies; no required input was unavailable, so no `BLOCKED_EXTERNAL` applies. The obligations K1.0's
own contract already records as out of scope — E1 execution, K1 closure, durability, isolation,
Driver fidelity, packed-artifact evidence — remain out of scope and unclaimed.

## Validation and interpretation

All commands ran in `/Users/rex-shih/Documents/ArrokothI/arrokothi` against the committed payload
tree C `95d74530f37c7af8706ef92d29574425a39afcf1`. Environment: Node v25.2.1, npm 11.6.2,
TypeScript 5.9.3, Darwin 25.6.0 arm64. Raw paths and SHA-256 digests are in
[validation-01/MANIFEST.md](validation-01/MANIFEST.md) and are re-checked mechanically by
`tests/conformance/architecture/evidence-records.test.ts`, whose work roots this packet widens to
cover its own directory.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2060 tests, 302 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1947 tests, 283 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| demonstration probe (08) | 0 | reviewed parser accepts 22/22 false collections; C accepts 0 |
| ablation matrix (09) | 0 | six one-behaviour ablations, each rejected by a named set of controls |
| TAP control inventory (10) | 0 | 216 C4-group tests named in order; evidence guard 4 tests |

**External fixture, gate execution and external decision — separately.** No E1 schedule was
prepared, executed or credited by this packet. The identities K1.0 relies on are unchanged:
benchmark `ArrokothI/benchmark`, candidate branch `codex/e1-kernel-acceptance-capture`, payload C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, candidate H2
`8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main`
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`, all `BLOCKED_EXTERNAL` and **accepted by nobody**.

**Checks not run, and the resulting claim limits.** `npm run test:evals` — no Agent or model-facing
behaviour is in scope, so this packet supports no claim about Agent quality. No live model,
packaging, crash, durability, isolation or native-Driver run — none is a gate for a structural
packet, and no claim depending on them is made. The guards remain static: they constrain dependency
direction and record agreement in source, and establish nothing about protocol correctness.

**Why the evidence supports each criterion (implementer assessment, not acceptance).** C1, C2, C7
and C9 are unchanged by this round and their suites pass at the same case counts, with the
architecture progression extended by exactly this round's nine tests. C3 is the preservation claim
and is the strongest signal that the correction adds no false report: the full suite grew by nine
and lost nothing, and the real inventory still agrees under both the reviewed parser and C (08).
C4 is the criterion at issue, and the claim rests on the ablations rather than on green tests: the
reported family is rejected 22/22 where it was accepted 22/22, the two-sided direction is rejected,
the forbidden blacklist fix is rejected by the controls, and neither half of the rule is sufficient
alone. C5, C6 and C8 are records checked by reference and by code, unchanged here and re-asserted.

**Design choices and assumptions.** Sorting both sides before elementwise comparison is a
deliberate choice that keeps reordering permitted; the alternative — comparing sequences — would
fail the real document, and that is asserted, not assumed. The comparison is exported and shared
rather than inlined per table, on the same reasoning that put row accounting in one reader. The
diagnostic format change is a deliberate strengthening: it makes three pre-existing controls
strictly more specific, and it is the reason those three expected strings changed. **The strongest
remaining risk** is that this is once again one stage of a pipeline: the collection equality is now
owned in one place, but the *scalar* comparisons (`!==` on three Deferred fields and on
publishability) are still written per field, and a future column with a compound value would have
to decide where its equality lives. Nothing about the current document exercises that, and I have
not invented a mechanism for it.

**No owner amendment was needed or requested** beyond the standing K1.0 release and its E1
preparation exception.

**Third-party review under AGENTS.md: none.** No third-party code, test, script, asset, dependency
or service was copied, adapted, vendored or added. `package.json` and `package-lock.json` are
byte-identical to the base. The two probes are original, read-only, and live outside the repository.

## Handoff

- **Ready for independent review.** The candidate is the whole cumulative interval from base
  `c9a9ed7e6e538ab0542fc6a999426264abb6212a` to H, judged against K1.0-C1 … C9 at contract revision
  19, with correction-02 contract revision 1 recording scope and preserved identities.
- Base, C and the verified advertised remote SHA for H are supplied in the external owner handoff
  after the push; this report cannot certify its own future push.
- **No self-acceptance.** This report marks review-ready only. Acceptance requires a fresh, separate
  independent review session; integration, K1 closure, any E1 claim and any successor release remain
  owner-controlled and held. `next_release: none`.
