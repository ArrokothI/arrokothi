# Implementation report — K1.0, round 3 (correction)

## Identity

- **Packet:** K1.0 — target boundary and legacy quarantine. **Parent milestone:** K1.
  **Contract:** [`contract.md`](contract.md), revision 3.
- **Governing process baseline:** this repository's integrated `docs/development/` documents at the
  base commit — [006](../../006-development-process.md), [007](../../007-work-packets.md),
  [008](../../008-implementation-report.md), [012](../../012-review-methods.md),
  [013](../../013-structure-and-evidence-sequencing.md). This candidate changes none of them.
- **State:** CHANGES_REQUESTED → IN_PROGRESS → WAITING_FOR_REVIEW. No verdict is entered here and
  none is claimed.
- **Correction handoff acted on:** [review-02.md](review-02.md), recorded by
  `eef87cc3dcfc577992dca2d67704ee11cdc12245`, which is exactly one administrative commit containing
  only that record. Open findings **K10-R2-01** (P1) and **K10-R2-02** (P2). No owner supplemental
  decision; no unresolved authority. Corrections on a released packet need no renewed permission, and
  none is claimed.
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
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, unchanged across all three rounds.
- **Previous reviewed H and its review record:** H2 `d4347837699b80e5cbffa83d48dd7a8c9e53f7e6`,
  reviewed `CHANGES REQUIRED` by [review-02.md](review-02.md). Round 1's H
  `40bb07a54cd5ba78aed386cb03cd0fb47579b6f6` and [review-01.md](review-01.md) are preserved.
- **Payload C:** `839b32d085306b96358295edf86fec85836ce462` — one correction payload commit after the
  round-2 review record. `H2 → C` touches eight files: the two rebuilt subsystems, their tests, the
  policy, the inventory and the contract. History is preserved, not rewritten.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, since a commit cannot name itself.
- **Exact C..H administrative file allowlist:**
  - `docs/development/work/K1.0/implementation-03.md` (this report)
  - `docs/development/work/K1.0/validation-03/MANIFEST.md` and its ten `[01-10]*.log` attachments
  - the K1.0 status-row transcription in `docs/development/007-work-packets.md`
  - the matching live-summary sentences in `docs/development/README.md` and
    `docs/development/001-current-status-and-roadmap.md`

  Nothing else. No script, fixture, schema, test, threshold or configuration is in that interval.
- **Working-tree state:** clean at C when every command in `validation-03/` ran.
- **Push status:** pending at the time of writing. The verified advertised remote SHA is supplied in
  the external handoff after the push; this report certifies no future push.

## Changes and coverage

### What was rebuilt, and why rebuilt rather than patched

Both findings reopen a family inside a subsystem an earlier round had already corrected. 006 is
explicit that this triggers reconstruction of the subsystem rather than another example-by-example
patch, so neither fix starts from the reported example.

| Group | Paths | Finding |
|---|---|---|
| Dependency extraction | `tests/conformance/architecture/module-graph.ts` | K10-R2-01 |
| Fail-closed rule and violation reason | `tests/conformance/architecture/boundary-policy.ts` | K10-R2-01 |
| Extractor controls and provenance | `tests/conformance/architecture/import-scanner.test.ts` | K10-R2-01, K0.2-SELF-01 |
| Guard-path controls; agreement tests and mutated-document controls | `tests/conformance/architecture/kernel-landing-zone.test.ts` | K10-R2-01, K10-R2-02 |
| Relational agreement oracle (new) | `tests/conformance/architecture/inventory-oracle.ts` | K10-R2-02 |
| Sentinel rename at the second consumer | `tests/conformance/architecture/legacy-core-boundaries.test.ts` | K10-R2-01 |
| Export table restructured to one row per package | `docs/development/work/K1.0/ownership-inventory.md` | K10-R2-02 |
| Contract revision 3 | `docs/development/work/K1.0/contract.md` | both |

### Selected 012 methods

Unchanged in kind from round 2: **deterministic execution** carries the guards, **process/
documentation** carries the record criteria, **packaging/release** is used only negatively for C6.
The emphasis this round is 012's distinguishing-evidence rule — for each rebuilt subsystem the
artifact that *would* fail a plausible wrong implementation was constructed first, and the design
was driven from it. Exclusions are unchanged: race and fault, native Runtime/Driver, and external
evidence/gate all remain out of scope for a structural packet.

### K10-R2-01 — dependency extraction, reconstructed

**Governing invariant.** 007 requires that target-zone code cannot reach legacy or native Runtime
internals "through direct, type-only or barrel imports". The extractor's obligation is therefore to
see *every* syntax that names another module, not a list of the ones previously noticed.

**What the enumeration actually cost.** The review named `ImportTypeNode`. Re-deriving the category
from the language rather than from the finding showed the round-2 visitor was blind to **three**
families, not one:

| Family | Example | Round 2 |
|---|---|---|
| Import types | `type T = import("@arrokothi/core").X`, `typeof import(...)`, in a parameter, inside a generic | no edge |
| Triple-slash references | `/// <reference path="../../core/src/runtime/harness.ts" />`, `/// <reference types="@arrokothi/core" />` | no edge |
| Ambient module declarations | `declare module "@arrokothi/core" { ... }` | no edge |

The two extra families are recorded below as self-found, with their own provenance.

**The rebuild.** `module-graph.ts` now states the rule over the whole category, with the table in the
source, and covers `ImportDeclaration`, `ExportDeclaration`, `ImportEqualsDeclaration`, value-position
`import()`, `ImportTypeNode`, string-named `ModuleDeclaration`, `SourceFile.referencedFiles` and
`SourceFile.typeReferenceDirectives`. A reference path resolves relative to the referring file, as
TypeScript resolves it, so a reference *into* the zone is not mistaken for an unknown external
package. Type-only forms are deliberately not a separate case: they reach the same resolver, graph
and boundary decision as any other dependency, which is why no rule in `boundary-policy.ts` needed a
type-only clause once the extractor emitted the edge. Every position whose target cannot be recovered
statically fails closed under one general sentinel, `UNRESOLVABLE_MODULE_TARGET`, replacing the
dynamic-import-specific one.

**Against a correlated assumption.** Completeness now does not rest on one author's enumeration: the
TypeScript compiler's own `preProcessFile` runs as a second, independently written extractor and the
union is what the guards consume, so a form missing from the table is still reported. Provenance is
kept per dependency and asserted — over the synthetic matrix and all 326 repository sources the AST
pass alone already finds everything the pre-processor finds
([`08`](validation-03/08-two-extractor-comparison.log)), so the union is a safety net and not a
crutch hiding a hole.

**Distinguishing evidence.** Eight new full-guard-path controls, including the review's exact
counterexample, and 23 new extractor cases. [`09`](validation-03/09-r201-demonstration.log) drives
nine sources through the real `loadWorkspace` → `walkModuleGraph` → `boundaryViolations` path with
the round-2 extractor and with the committed one:

| Counterexample | Round 2 | Committed |
|---|---|---|
| `import("@arrokothi/core").ExecutionContext` (the review's) | 0 violations | **1** |
| `typeof import("@arrokothi/core")` | 0 | **1** |
| import type in a parameter | 0 | **1** |
| import type nested in a generic | 0 | **1** |
| `/// <reference path>` into legacy | 0 | **1** |
| `/// <reference types="@arrokothi/core" />` | 0 | **1** |
| `declare module "@arrokothi/core"` | 0 | **1** |
| ordinary `import type { A } from` | 1 | 1 |
| ordinary `export { a } from` | 1 | 1 |

**Both shared-scanner consumers re-audited, and K0.2-SELF-01 re-asserted.** Across all 326 repository
sources the rebuilt extractor extracts exactly what round 2 extracted — 326 identical, 0 changed —
so no pre-existing guard result moves and `legacy-core-boundaries.test.ts` still reports its own 13
assertions. Prose soundness is re-asserted rather than assumed to have survived the rebuild: a new
block covers prose in comments, search-needle strings, word lists, and an import statement, a
reference directive and an import type each carried as fixture text. That last case is load-bearing,
because the forbidden-edge controls carry exactly those constructs as fixture text.

### K10-R2-02 — inventory agreement, reconstructed

**Governing invariant.** 007 requires an accurate ownership, export and dependency inventory. The
executable claim is that document and policy agree; agreement is a statement about *associations*,
not about which tokens appear on the page.

**The rebuild.** `inventory-oracle.ts` parses the document's three ownership tables into the relations
they assert — zone id → roots, DX id → (path, disposition, owner), package → (subpaths,
publishability) — and compares each relation in both directions against the executable policy and the
actual manifests. Parsing is strict: a row the parser cannot read is itself reported as a
disagreement, so the oracle cannot go quiet by failing to find its rows. The oracle is a pure
function of the document text, which is what lets the tests feed it a deliberately mutated copy. The
export table is restructured to one row per package with a normalised `Published?` cell so the
relation is parseable at all.

**Distinguishing evidence.** Ten mutated-document controls, each a plausible wrong association.
[`10`](validation-03/10-r202-demonstration.log) runs each against the round-2 checks and the rebuilt
oracle:

| Mutation | Round 2 | Committed |
|---|---|---|
| two zones' roots swapped with each other (the review's own case) | **0** | 2 |
| a deferred row's owner reassigned | **0** | 1 |
| a deferred row's disposition changed | **0** | 1 |
| a private package claimed published | **0** | 1 |
| a published package claimed private | **0** | 1 |
| one zone's root replaced | 1 | 1 |
| a deferred row's path moved | 1 | 1 |
| an exported subpath dropped | 1 | 1 |
| a package row deleted | 1 | 1 |
| an undeclared zone added | 1 | 1 |

**Stated precisely:** the round-2 checks missed five of ten, not all ten. They catch the other five
only incidentally, because those mutations happen to remove a token from the page. The finding is
about the claim of exact bidirectional agreement, and the five misses — which include every
publishability claim and the review's own swap — are what refute it. The contract's C4 row is
rewritten to describe the relation comparison it now performs rather than the set comparison it
previously described.

### Why the previous closure pass missed both

006 requires this, and the honest answer is the same root cause twice: **round 2 validated each
correction against the reported example and its obvious inverse, instead of against a constructed
wrong implementation.**

- **K10-R2-01.** K10-R1-01 was read as "the lexical regex/division heuristic is unsound", and
  switching to a parser made that specific unsoundness disappear. But the new mechanism inherited its
  *coverage model* from the patterns it replaced — the four node kinds correspond one-to-one to the
  three old regexes plus `import-equals`. The pass asked "does every form the old scanner handled
  still work?" and never asked the independent question, "what else can name a module in this
  language?" Changing mechanism while carrying the old mechanism's completeness assumption is exactly
  the correlated assumption 012 warns about.
- **K10-R2-02.** K10-R1-02 was read as two halves, provenance and bidirectionality. The provenance
  half was closed correctly. The bidirectional half was satisfied by adding reverse *set* comparisons,
  which felt like the missing direction — so "bidirectional" was implemented as both directions of
  membership rather than as the relation holding. The pass never asked "what wrong document would
  still pass this?"

The method changed accordingly this round: for each subsystem the falsifying artifact — the
counterexample matrix, the mutated documents — was built first and the design driven from it, and
both are now committed controls rather than one-off checks.

### Prior findings

| Id | Round | Disposition |
|---|---|---|
| **K10-R2-01** | 2 | **Closed by reconstruction.** Extractor rebuilt over the whole category; two further families found and closed; 8 guard-path and 23 extractor controls added; both consumers re-audited; K0.2-SELF-01 re-asserted. Evidence `08`, `09`. |
| **K10-R2-02** | 2 | **Closed by reconstruction.** Relational oracle with strict parsing; ten mutated-document controls; export table restructured; C4 wording reconciled to what is mechanically verified. Evidence `10`. |
| K10-R1-01, K10-R1-02 | 1 | Closed in round 2; see [implementation-02.md](implementation-02.md). Both reopened at the invariant level by round 2's review and are now closed by the reconstructions above rather than by their round-2 patches, which are preserved. |
| K1.0-SELF-01 … -04 | 1, 2 | Closed in their rounds; preserved in [implementation-01.md](implementation-01.md) and [implementation-02.md](implementation-02.md). The K1.0-SELF-01 traversal rule and its two controls are unchanged and still pass. |
| K0.2-SELF-01 | K0.2 | Remains closed; re-asserted after this rebuild rather than assumed. |

### Additional self-found defects (separate provenance)

| Id | Defect | Disposition |
|---|---|---|
| **K1.0-SELF-05** | Triple-slash `/// <reference path="..." />` and `/// <reference types="..." />` directives carry a dependency that no round of this packet extracted. The review found `ImportTypeNode`; this family was found by re-deriving the category from the language rather than from the finding. | **Fixed** in C. Both directives are extracted, reference paths resolve relative to the referring file, and two guard-path controls plus one extractor control cover them. |
| **K1.0-SELF-06** | An ambient `declare module "x" { ... }` names a module and was likewise never extracted. | **Fixed** in C, with a guard-path control and an extractor control. Treated conservatively as a dependency; the reasoning is recorded in the source. |
| **K1.0-SELF-07** | The first version of this round's zone-swap control replaced one root rather than swapping two, which the round-2 checks would have caught — it was weaker than the counterexample in the review. | **Fixed** before handoff. The control now performs the review's true two-sided swap, which round 2 does not catch, and the one-sided case is retained separately. |

### Unresolved obligations and their unblock conditions

1. **`tests/conformance/k0` remains frozen.** Its comment at `controls.test.ts:67` still names the
   pre-rename guard path. Its bytes are pinned by benchmark E1 at `0535160e…`. Assigned to K1.4.
2. **The allowed-leaf list is empty**, so the real tree never exercises a non-empty allowlist; two
   fixture controls do, including one proving approval is not transitive. Unblocked by K1.1.
3. **Three deliberate extractor exclusions**, now recorded in the contract's limits rather than left
   to be discovered: `/// <reference lib="..." />` names a TypeScript library, not a module; JSDoc
   `import(...)` types are not analysed because this workspace compiles `.ts` with `checkJs` off; and
   bare `require("...")` is out of scope because `require` is not a global in this ESM workspace and
   flagging the identifier would trade prose soundness for false positives. A later packet that makes
   any of these load-bearing owns extending the extractor and its controls.
4. **Static guarantees only.** These guards constrain dependency direction in source. They establish
   nothing about durability, isolation, Driver fidelity or protocol correctness.

## Validation and interpretation

Exact commands, environment, exit codes, counts and digests are in
[`validation-03/MANIFEST.md`](validation-03/MANIFEST.md). All ran from
`/Users/rex-shih/Documents/ArrokothI/arrokothi` against the clean payload tree at C, on
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1885 tests, 284 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1772 tests, 265 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |

Suite 1846 → 1885; architecture 146 → 185; forbidden-edge controls 15 → 23; extractor cases 38 → 61;
ten mutated-document controls added. Nothing was removed, skipped or weakened;
`legacy-core-boundaries.test.ts` still reports the same 13 assertions it had at base.

**Checks not run.** `npm run test:evals` — this packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. The limit is that this candidate offers no evidence
about Agent behaviour and claims none.

**External fixture, gate and decision, stated separately.** Unchanged from rounds 1 and 2: the
benchmark E1 preparation was inspected, not executed, and is accepted by nobody. No E1 schedule ran
here, no E1 criterion is closed, and the structural pass earns no evidence credit.

**Why the evidence supports the reopened criteria** (implementer assessment, not acceptance). C2 and
C9 previously failed because a legal dependency produced no edge. The committed extractor is now
stated over the category rather than a list, a second independently written extractor is run against
it with the disagreement count asserted at zero, and the review's exact counterexample plus six more
produce a violation through the real guard path where round 2 produced none. C4 previously failed
because the oracle could not fail on a wrong row. It is now relational per dimension, and ten wrong
documents are rejected with the specific relation named — including the five the round-2 checks let
through. The strongest thing that would still get past all of this is a dependency form that neither
the category table nor the TypeScript pre-processor recognises; the three exclusions above are the
known members of that set and are recorded rather than implied.

**Design choices.** The union of two extractors was chosen over trusting either alone, because the
defect twice over was a completeness assumption nobody could falsify. One general
`UNRESOLVABLE_MODULE_TARGET` replaced the dynamic-import-specific sentinel so fail-closed is a
property of the rule rather than of one syntax. The inventory oracle was made a pure function of
document text specifically so mutated copies could be fed to it.

**Owner amendments.** None this round. The round-1 E1 dependency amendment stands.

**Strongest remaining risk.** Unchanged and worth repeating: these are static guarantees about
source. A future packet could satisfy every rule here and still reproduce the legacy execution model
in new files inside the zone. Structure does not prevent that; K1.4's behavioural recheck is where it
would surface.

**Third-party review under AGENTS.md.** None. No dependency was added: `typescript` was already a
root devDependency and was first used by the guard in round 2, under that round's review. No
third-party source was copied, adapted or vendored, and `package-lock.json` is unchanged this round.

## Handoff

- **Ready for independent review.** Both open findings are closed by reconstruction, with
  distinguishing evidence that fails against the previous implementation. Three additional defects
  were self-found this round and are reported with separate provenance. Four obligations are recorded
  unresolved with named unblock conditions; none of them passes because the suite is green.
- Base, previous reviewed H2, C and H, and the verified push SHA are supplied in the external owner
  handoff.
- No self-acceptance is claimed, nothing is merged, and no successor is started or released.
