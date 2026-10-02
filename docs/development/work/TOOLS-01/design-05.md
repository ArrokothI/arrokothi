# Design 05 — TOOLS-01 revision 3 after the design-04 check

**Date:** 2026-10-02. **Role:** design author by owner assignment: Claude Code, `claude-opus-5-5`,
session `5eb143d3-0a5f-4f89-adae-02be27f55403`. Not the implementer and not a reviewer.
**Status:** proposal for a design check and owner answers. **Nothing here is implemented**; no
contract, mapping, check, script, fixture or hold changed; nothing is review-ready or accepted.

## 1. Identity, authority, scope and owner direction

Fetch confirmed a clean `codex/tools-01`, local and origin both at
`0c1d57dd10612e54188c77a1697fd88c017badb3`, this note's parent. The live [contract](contract.md) is
revision 2 (blob `96c8f6342993f963a10beea8e6131aec715db737`). [Design 04](design-04.md)
(`6b77416b293ec923c99f4b423707351b04bcf97e`, GPT-6) proposes revision 3 and adoption format 2,
unapplied. The [design-04 check](design-04-check.md) (in `0c1d57dd`, Claude Code, session
`68a98635`) returned APPROVED WITH REQUIRED CHANGES. The owner has since made D04-CHK-01 to -06
proposals; each gets a disposition below. Design 04 governs everything this note does not change.

**Owner direction.** Provenance: owner messages of 2026-10-02 in the design-04 check session,
delivered through this session's prompt.

> "can I let a new Claude session to do this design part? ... I want to save the GPT6 quota for
> actual implementation."

The sequence after this note: (1) a separate Claude session checks this design; (2) the owner
answers the owner questions, including staging; (3) GPT-6 reviews this design and, if it accepts,
implements it directly in the same session. So this note gives concrete mechanisms, an exact
contract diff and an implementation order. Under [006](../../006-development-process.md#packet-lifecycle)
the coding agent normally writes the design note; the owner reassigned it; the design check applies.

**Scope.** Development evidence tooling. The canonical owner is
[evidence attribution](../../../../mental-model/mechanisms/evidence.md). No Kernel, Runtime/Driver or
deployment semantics; no production, Layer-3, sealed-record or 007 edit; no dependency or copied
source. V-D1, Proxy and re-prototyped built-ins stay held by K1.1-correction-03, V-ENV by
BINDING-01. Only this file is committed.

**Read:** AGENTS.md; 006; 012; 016 root causes 5, 6, 9; the TOOLS-01 contract, designs 01–04,
owner choice 01, continuation 01, pilot 01, pilot review 01 and the design-04 check in full; the
tooling README, `packet_tools.py`, `assertion-reporter.mjs`, `oracle-probe.mjs`; the research map's
evidence-tooling entry and
[§8](../../research/2026-10-02-canonical-bytes-kernel.md#8-evidence-tooling-corpus-mutation-registry-simulation-coverage)
as background. Primary source: Node v22.9.0
[`doc/api/test.md`](https://github.com/nodejs/node/blob/v22.9.0/doc/api/test.md). Also the pinned
source of all 83 pending artifact origins and 128 sampled mentions.

**Independence.** The check came from this model family. For each proposal I asked whether it
closes its counterexample and what it newly allows, probed rather than reused the check's results,
and recomputed every figure (§5). A probe and the 22.9 docs exposed holes (D05-02, D05-03).

## 2. Dispositions

Costs: focused implementer days (6 hours) of tooling added to design 04's own 3–5 days; §5.6.

| ID | Decision | Mechanism | Contract rows | Planned negative fixtures | Cost |
|---|---|---|---|---|---|
| D04-CHK-01 | **Adapt** | Reach: raw `NODE_V8_COVERAGE` ranges, innermost-range rule (reuse `coverageExecuted`, [fault-oracle.ts:783](../../../../packages/kernel/tests/sweep/fault-oracle.ts)), from a run filtered to the target's full path, compared with a no-test baseline run. Token guard (D05-02). `exact_input` values must equal literal tokens in the reached input anchor. Discrimination: a qualifying kill naming the target, by a mutation in a cited operation file, else a reading trace. Credit counted by kind (§4). | P1-T, F5 | early return; anchor copied from a sibling; anchor inside the eval template; anchor in a comment; helper run only at module load; 16,777,216 for 33,554,432; literal only in a comment; computed input; kill by an unrelated mutation; kind counts | 2 |
| D04-CHK-02 | **Adopt** | Catalog commands declare script text, globs and flags; the tool checks `package.json` and expands the globs over the C copy. `repository-tests` runs that argv with a second reporter, so one run feeds verify and catalog. One declared environment for every command the tool runs. Leaf tree from `test:start` order and `nesting`; target identity is full path plus declaration location. Node version recorded; 22.9 fields checked first (A1). | P1-T, F4, F5 | file under `tests/evals` or `examples`; helper module as target; script drift; inherited `NODE_OPTIONS`, `KERNEL_POISON_MODE`, `NODE_TEST_CONTEXT`, `NODE_V8_COVERAGE`, `PACKET_ORACLE_CHECK`; parent with subtests; duplicate full path; missing location | 1.5 |
| D04-CHK-03 | **Adapt** | Census kinds, parsed, never executed: `structural` (the runner's container elements and top-level pushes; each element labelled; each top-level statement mentioning the container classified `reads` or `adds`), `filter` (the runner's own regex, verbatim, over a named sealed dependency), `generator` (runner regex at a recorded input revision, D05-06), `inherits` (family plus rebinds), `python_ast`, `product` (literal loop domains). Runner count assertions cross-check. No mapper-written label pattern is a census. Else `census: reading`, counted. | P1-M | member dropped from list and count; wrong container against a self-check count; unclassified mention; filter regex absent from runner bytes; unlabelled element; generator at a revision whose count differs | 1 |
| D04-CHK-04 | **Adapt** | A `holds` register recomputed at C from title, body (over registration spans) and file recipes plus entries; each match classified `held`, `superseded` or `not_held` with a reason. Credit into a registered member needs its hold or a counted `not_held`; an unclassified match needs attention. | P1-H, P1-P | target `value-diagnostic-work.test.ts:541` without hold; target `:269`; unclassified preserved member in a hold-bearing file; new recipe match; `not_held` without reason; `not_held` count | 0.5 |
| D04-CHK-05 | **Adapt** | `preserved` closure, P1-P: file or span identity (span needs unchanged residue), selection, passing title or generated site, unchanged test-side helpers. Literal titles may cite a helper review, counted; generated titles may not. Register routing applies. Census in §5. | P1-P, P1-R | one byte changed; file not selected; title absent; generated site with zero leaves; one skipped leaf; helper changed without review; generated member with reviewed helper; held member; residue changed | 1 |
| D04-CHK-06 | **Adapt** | Tool-checked minimum contexts: artifact = whole file plus sealed records it names by path or revision, transitively (production files it reads are targets, not context); fence = fence plus its heading section; prose = paragraph or table row, links one hop, member labels resolved in the same packet's pinned directory (D05-01). Lexical path and SHA candidates covered or reasoned. Test-side depth through reach, not a call graph. | P1 preamble, P1-G | fence-only context; missing T1 dependency `3287640f`; unresolved unlinked label; range short of its paragraph | 0.75 |
| D05-01 | **New: adopt** | Counterexamples may cite `sealed_sources` (revision, path, sha256, lines), verified but never origins. Triage resolves member labels in the same packet's pinned records and records the definition or `not_found`. | F2, P1 preamble, P1-X | digest mismatch; sealed source used as an origin; label resolved in another packet | 0.25 |
| D05-02 | **New: adopt** | Anchor text is not executed code. An anchor starting inside a string or template literal or a comment is `not_observable`, needs a reached helper-status anchor, and counts as reading. `exact_input` compares token values, not text. | P1-T | covered under D04-CHK-01 | in 01 |
| D05-03 | **New: adopt** | 22.9 name patterns match ancestor-prefixed names. A reach run is valid only if its events show exactly one executed leaf, the target path; otherwise invalid, never "unreached". | P1-T | pattern that selects 0 or 2 leaves | in 01 |
| D05-04 | **New: adopt** | Mutants run against their declared target files. One full-suite discovery run per member at extraction records first failures as metadata, never credit (cost: §5.5). | F3, P1-M | kill outside the target set; discovery result imported as credit | 0.5 |
| D05-05 | **New: adopt (C)** | The gate derives touched areas from a successor's changed paths through an area map covering every production source path; an unmapped path fails. Areas `tooling` and `records` are TOOLS-01's and cannot stay `prose_pending`. | P1-X | unmapped path; under-declared area; record whose only area is `records` | 0.75 |
| D05-06 | **New: adopt** | Generator families record the input revision of the run they describe; label-to-site identity is fixed there; at C the census is checked against the runner's own inventory literal. Unknown revision: count from the literal, site identity by reading. | P1-M | generator census at a revision with another count | in 03 |

### What each decision closes, newly allows and leaves open

**D04-CHK-01.** *Closes* (probe 3, §5.5, a real Kernel test): in `if (!result.ok) throw …` the
`throw` counts 0 although its line ran; a sibling test's anchors count 0 under the name filter.
*Newly allows:* (a) an assertion in the `stringWorkChild` eval body counts 1, because the parent
evaluates the template literal; comments in executed blocks likewise (D05-02); (b) module-load code
counts in every filtered run, hence the baseline; (c) Node's line report counts a partly run line,
hence raw offsets; (d) a pattern can select 0 or 2 leaves (D05-03); (e) a mutant that breaks shared
code can "kill" any test, hence the control, target-leaf assertion failure and operation-file rule.
A comment or another argument satisfies a textual literal guard, not the token-value guard.
*Leaves open:* reach shows that an assertion ran, not that it compares the required value. Such
relations count as `target_reading` without a qualifying kill and are listed in every summary.

**D04-CHK-02.** *Closes* A7, A9 and A10; the seven helper modules mapped under `repository-tests`
reach credit only through consuming tests. *Newly allows:* equal leaf names in different suites,
which design 04 refused; safe only with D05-03. A too-narrow environment fails visibly (A8).
*Leaves open:* `npm test` discovery parity with the tool's glob expansion, checked at A7.

**D04-CHK-03.** *Closes:* a list and count that agree but miss a member fail a structural census
(probe 1: 28 elements, no unlabelled residue). *Can a recipe be wrong the same way?* A label regex
can; the pilot's "60+" and the D35 label show what readers miss. So label patterns are no census.
Structure, the runner's own filter and generator, and its own count assertions (`ablations-03` 16;
rebound 4 and 21; `original-ablations-02` 4 and 36; `ablations.mjs` 30 and 1) do not depend on the
mapper. *Leaves open:* a wrong container, or an adding statement classed `reads`; each is one named
fact. Probe 1 shows why mentions are classified: the loop adding 31 members surfaces only there.

**D04-CHK-04.** *Closes* the two named targets and the revision-2 whole-file credits
(`artifact-22eb3398…`, `artifact-f468517a…`). *Correction:* title seeding is too narrow. Titles name
V-D1 in 20 registrations and Proxy in 7, but 40 registrations in eight Kernel test files build a
Proxy (19 in `values.test.ts`); body recipes close that. *Newly allows:* `not_held`, counted and
listed. *Leaves open:* held behaviour matching no title, body or file recipe (P1-H).

**D04-CHK-05.** *Closes:* the historical test is the counterexample, so identity, selection and a
passing exact title prove the same input and assertion for 63 of 71 test-file origins. *Newly
allows:* (a) held or superseded credit, routed through the register; (b) a vacuous historical test
stays vacuous, so `preserved` claims maintenance, never discrimination; (c) a reviewed helper can
change a generated title set, so generated members need unchanged helpers; (d) the helper closure
(static imports and `new URL(<literal>, import.meta.url)` in test directories, transitively;
production excluded) misses computed specifiers. *Leaves open:* (b) and (d), stated. Identity is
rechecked at every C, so this is not grandfathering.

**D04-CHK-06.** *Adapted:* artifacts read their own run's production tree, so those files are
mutation targets, not definitions; a test-side call graph would be a custom analyzer (012), so reach
of cited anchors stands in. *Leaves open:* paths computed at run time; the lexical scan is a guard.

**D05-01.** In §5.4, 19 of 128 mentions name members defined only outside the inventory: 21
`09b-distinguishing-ablations.log` records (16 K1.1, 5 K1.1-correction-01; K1.1 `validation-17`
holds diffs for X1, X3, X4, X7, X8, X9, XA and XB) and review evidence such as
`review-revision-09-independent-2026-09-30/probes`. F2's origin set stays fixed.

## 3. Contract diff from revision 2 to revision 3 (option C)

Apply-checked against the live `contract.md` (blob `96c8f634…`): `git apply --check` and
`patch --dry-run` pass. Not applied. `owner-choice-02.md` is created at implementation step 0 with
the owner's verbatim answers. Under option C the owner, not TOOLS-01, writes the 007 entry check.

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,4 +1,4 @@
-# TOOLS-01 contract — revision 2
+# TOOLS-01 contract — revision 3

 [Release](release-01.md) authorizes the research-independent foundation first. Governing policy:
 006/008/012 at `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`; proposed tools cannot weaken their
@@ -7,18 +7,40 @@
 [Owner choice 01](owner-choice-01.md) resolves design 02 D02-Q1: deterministic corpus runs by
 default; live-provider and large-memory/timing experiments retain their mappings and commands in
 separate profiles and are explicitly reported as not run. No inventory origin is removed.
+[Owner choice 02](owner-choice-02.md) approves this revision and staging option C. Mechanisms are in
+[design 05](design-05.md), and in [design 04](design-04.md) where design 05 does not change them.

 | ID | Requirement | Closing evidence |
 |---|---|---|
 | F1 | Validate exact Git commit identities, B→C→H ancestry and C..H's exact declared file set; preserve declared historical paths; verify accessible attachment bytes/digests. Read the verification specification from C. | Temporary Git fixtures for valid and wrong identity, ancestry, scope, sealed bytes and evidence; real candidate run at handover. Report structural facts only, never ACCEPT or release. |
-| F2 | Index every pinned audit artifact/fence and prose locator; verify source bytes and retain stable provenance IDs, proposed dispositions and extraction status. Include final-review executable intake and its policy-only item. | Recompute 208 source digests and 1,333 prose locations; missing/duplicate/corrupt mappings fail. Pending records remain counted as pending. This is provenance coverage, not executable adoption. |
-| F3 | Provide a versioned case/mutation registry and isolated runner with a passing control, unique mutation-site check, reached witness and named assertion. | Real injective-identity mutant plus controls for survived, uncovered, invalid baseline, not applicable, setup error, timeout and malformed result. No process exit alone earns a kill. |
-| F4 | Keep runner changes in temporary source copies; preserve candidate files and isolate each process. Bound execution duration and retained output. | Candidate hash checks and deliberate hanging/noisy/failed fixtures; interrupted or failed mutation cannot patch the shared checkout. Supported host: POSIX with Python 3 and Node 22.9+. |
-| F5 | Keep release/status/results distinct; one CLI reports facts, explicit limits and unresolved work. | JSON summaries; pending-extraction inventory cannot produce full-corpus completion. Tests assert the distinction. |
-| F6 | Document use, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
-| P1 | Reconcile the whole historical inventory into maintained runnable cases, existing-suite mappings, justified duplicates/retired runners, or explicit non-executable evidence; preserve the complete-decision oracle and its controls. | Per-entry semantic mapping, runnable fixtures and causal mutations; every still-pending entry closes. Held semantic defects stay attributed to their correction owners. Mandatory remainder after this build. |
+| F2 | Preserve the complete pinned origin inventory and stable provenance IDs. Adoption format 2 links origins to distinct counterexample records and family members. Pinned records outside the inventory may be cited as sealed sources, never as origins. Include all final-review additions. | Recompute 208 artifact/fence digests, 1,333 prose locations and eight additions. Exact-set checks reject missing, duplicate, corrupt or dangling origin, member and sealed-source links. Pending, triaged and revalidation states stay visible. Provenance completeness is not executable adoption. |
+| F3 | Provide a versioned case/mutation registry and isolated runner with a passing control, uniquely applicable single- or multi-edit mutations, reached witness and a named qualifying assertion from the member's declared target set. | Existing controls plus multi-edit, wrong-kill and target-set controls. Survived, uncovered, invalid baseline, not applicable, setup error, timeout, output-limit and malformed-result categories stay. No process exit, reading argument, census or family count earns a kill. |
+| F4 | Keep runner changes in temporary source copies; preserve candidate files; run each process under a declared environment. Bound execution duration and retained output. | Candidate hash checks; deliberate hanging, noisy, failed and contaminating-environment fixtures; interrupted or failed mutation cannot patch the shared checkout. Supported host: POSIX with Python 3 and Node 22.9+; the floor's test-event, coverage and type-stripping assumptions are checked before use. |
+| F5 | Keep provenance, triage, mappings, target facts, execution, held claims and acceptance distinct; report facts, limits and unresolved work. | JSON summaries count origins, counterexamples, families, members, targets and kills separately, and suite credit by kind. No count or check releases a hold or establishes acceptance. Tests assert the distinctions. |
+| F6 | Document use, adoption format 2, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
+| P1 | Reconcile every historical origin under P1-G to P1-C below; preserve the complete-decision oracle and its controls. | Each rule closes as stated. No origin, family member or revalidation stays pending; prose-only counterexamples may stay as tagged records only under P1-X. Held semantic defects stay attributed to their correction owners. Mandatory remainder after this build. |
 | P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |

+## P1 closing rules
+
+Each rule closes by a deterministic check, a structural mechanism or a declared bounded search (012).
+The bounded search reads design 05's minimum context for each origin: an artifact's whole file and
+the sealed records it names, at their pinned revisions; a fence and its enclosing section; a prose
+line's paragraph or table row, its links one hop, and the member labels it names, resolved in the
+same packet's pinned records. The tool checks that recorded ranges cover this minimum. Claims are
+made only for that scope.
+
+| ID | Rule | Closing mechanism |
+|---|---|---|
+| P1-G | Group repeated mentions of the same input, environment, operation and required result into one counterexample; keep distinct variants and all provenance. | Exact origin/member/link reconciliation plus the bounded search. An origin naming several members closes only when all are accounted for. |
+| P1-T | A suite target names its command, file, full test path, declaration location, input, assertion and optional operation anchors, and its relation: `exact_input`, or `authorized_replacement` with its decision. For an unchanged contract it tests the corrected required result. | Fresh runs at C: the file is in the command's own selection under the declared environment; the path is exactly one passing leaf; each cited anchor is reached by that test alone (offset coverage against a no-test baseline; anchors inside literals or comments are not observable); `exact_input` values equal literal tokens of the reached input anchor. Discrimination is a qualifying kill naming that test, or a recorded reading trace counted as reading. |
+| P1-P | A historical test member closes as `preserved` when, at C, its whole file, or its own span with an unchanged same-file residue, is byte-identical; its command selects the file; its title, or for a generated title its declaration site, yields at least one leaf and only passing leaves; and its test-side helper closure is unchanged. For a literal title a recorded helper review may replace "unchanged" and is counted. | Deterministic identity, selection, catalog and closure checks, fresh at every C. Preservation claims maintenance, not discrimination, and passes through P1-H. |
+| P1-H | Held or superseded required results become attributed witness records, never suite or preserved credit. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. A register of current tests and cases that observe each held claim is fully classified. | Structural destination checks; the register's title, body and file recipes are recomputed at C; credit into a registered member needs its hold or a counted `not_held` reason. Reproducing a witness earns no conformance, correction or release credit. Unregistered held behaviour is a stated gap. |
+| P1-M | Each mutation-runner family lists its members from a census recomputed over pinned bytes, or is marked `census: reading` and counted. Each member maps to a registered mutation with a qualifying named kill, an attributed witness, a reasoned no-longer-applicable disposition, or stays pending. | Census equality with the member list and with the runner's own count assertions; fresh control, applicability, reach and qualifying named failure for each kill. Distinct mutations, case/mutation pairs and family links are counted separately. Reading closures and invalid runs never count as kills. |
+| P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`. |
+| P1-X | Every prose origin is triaged: no counterexample (with a reason), a link to a member or record, or a `prose_pending` record with its input description, provenance and areas from a finite area map. | Triage completeness; the area map covers every production source path. A successor's verification derives its touched areas from its changed paths and fails while a `prose_pending` record in a touched area remains. The owner records this entry check in 007. |
+| P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary, composition and gate controls for pending origins and members, missing targets, stale results, held or profiled credit and `prose_pending` records. |
+
 Foundation F1–F6 is an incremental delivery within TOOLS-01, not a new acceptance gate or a split
 that silently defers P1/P2. The full packet stays IN_PROGRESS. No semantic benchmark credit or
 hold release follows from tool verification. Human review still judges authorization, prose
```

**Option A delta.** Applies on top of the option-C text; apply-checked in sequence after the diff
above. It removes the successor gate and requires adoption of every prose-only counterexample.

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -9,3 +9,3 @@
 separate profiles and are explicitly reported as not run. No inventory origin is removed.
-[Owner choice 02](owner-choice-02.md) approves this revision and staging option C. Mechanisms are in
+[Owner choice 02](owner-choice-02.md) approves this revision and staging option A. Mechanisms are in
 [design 05](design-05.md), and in [design 04](design-04.md) where design 05 does not change them.
@@ -20,3 +20,3 @@
 | F6 | Document use, adoption format 2, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
-| P1 | Reconcile every historical origin under P1-G to P1-C below; preserve the complete-decision oracle and its controls. | Each rule closes as stated. No origin, family member or revalidation stays pending; prose-only counterexamples may stay as tagged records only under P1-X. Held semantic defects stay attributed to their correction owners. Mandatory remainder after this build. |
+| P1 | Reconcile every historical origin under P1-G to P1-C below; preserve the complete-decision oracle and its controls. | Each rule closes as stated. No origin, family member, revalidation or prose-only counterexample stays pending or unadopted. Held semantic defects stay attributed to their correction owners. Mandatory remainder after this build. |
 | P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |
@@ -40,4 +40,4 @@
 | P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`. |
-| P1-X | Every prose origin is triaged: no counterexample (with a reason), a link to a member or record, or a `prose_pending` record with its input description, provenance and areas from a finite area map. | Triage completeness; the area map covers every production source path. A successor's verification derives its touched areas from its changed paths and fails while a `prose_pending` record in a touched area remains. The owner records this entry check in 007. |
-| P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary, composition and gate controls for pending origins and members, missing targets, stale results, held or profiled credit and `prose_pending` records. |
+| P1-X | Every prose origin closes as no counterexample (with a reason), a link to a member or record, or a new executable or attributed record. Counterexamples defined only in sealed sources are extracted. | Triage and adoption completeness under P1-T, P1-P, P1-H and P1-M. No `prose_pending` record remains, so no successor gate is needed. |
+| P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary and composition controls for pending origins and members, missing targets, stale results, and held or profiled credit. |

```

## 4. Deltas to design 04's data model and tool plan

**Data model** (adoption format 2; design 04's tables otherwise unchanged):

| Table | Change |
|---|---|
| `origins` | Add `context` (recorded ranges, checked against the D04-CHK-06 minimum) and, for prose, `triage`: `none` with reason, `link`, or `prose_pending` (C). States: `pending`, `pending_revalidation`, `triaged` (C), `complete`. |
| `counterexamples` | Add `sealed_sources[]` (revision, path, sha256, lines). Kind `prose_pending` (C) stores the input description, provenance and areas. |
| `suite_targets` | `test_title` becomes `test_path[]` and `declaration {line, column}`; anchors split into `input_anchors[]` (anchor, sha256, `literals[]` or `computed`), `assertion_anchors[]`, `operation_anchors[]`; add `discrimination` (`mutation` key or `reading` trace); `command` names a catalog command. |
| `preserved` (new) | Member, origins, file, revision, scope (`whole_file`, or `span` with span and residue digests), title or generated site, `helper_closure` (modules; `unchanged`, or `reviewed` with reference). |
| `families` | `census` per D04-CHK-03 (kind, container, classified mentions, filters with runner anchors, generator with input revision, inherits with rebinds, self-checks), or `census: reading` with reason. |
| registry mutations | Literal edits; `target_files[]`; `expected_targets[]`; `discovery` metadata (first failures, Node version, revision), never credit. |
| `holds` | Add `register`: recipes (title, body, file), entries, classifications. |
| `catalog_commands` (new) | ID, package script, script text, globs, flags, environment (`pass[]`, `set{}`), timeout, output limit. |
| `areas` (new, C) | Area to globs, covering every production source path (D05-05). |

**Summary fields.** `source_bindings_verified` becomes `anchors_bound`; add `anchors_reached`,
`anchors_not_observable`, `input_tokens_matched`, `input_computed`, and credit kinds `preserved`,
`preserved_helper_reviewed`, `target_mutation_discriminated`, `target_reading`, `held`, `superseded`,
`prose_pending` by area (C). P1 completion lists reading-only relations.

**Tool plan** (adds to design 04's table):

| Path | Change |
|---|---|
| `scripts/packet_tools.py` | `command()` builds every environment from a declared allowlist (default `PATH`, `HOME`, `TMPDIR`, `LANG=C.UTF-8`) and records it. Corpus phases: catalog, reach, preserved, census (Python through stdlib `ast`), register, gate (C). Mutants run against target files. |
| `tests/tooling/catalog-reporter.mjs` (new) | Emits `test:start`, `test:pass`, `test:fail` with name, nesting, file, line, column, `details.type`, skip, todo, `testNumber`. `assertion-reporter.mjs` gains the location fields for kills. |
| `tests/tooling/source-facts.mjs` (new) | Parses or scans bytes with the pinned TypeScript 5.9.3 subset: registration spans, token kinds, literal values, container elements. Never executes what it reads. |
| `tests/tooling/reach-coverage.mjs` (new) | Reads raw coverage files; imports `coverageExecuted` for the innermost rule; returns target and baseline counts per anchor. |
| `checks.json` | `repository-tests` uses the expanded argv with the catalog reporter; new corpus result values; the gate check (C). |
| tooling tests, `refusal-guards.json` | The §2 negative fixtures; every new `require` registered and ablated. |

## 5. Census, probes and re-estimate

Recomputed at `0c1d57dd` by read-only scratch scripts. Nothing historical ran; current tests ran
only in a temporary copy outside the repository.

### 5.1 The 116 suite origins

| Set | Count | Detail |
|---|---:|---|
| Suite origins | 116 | 96 identical at the same path, 10 changed, 10 absent. Agrees with the check. |
| Whole-file (line 1) | 102 | 71 test files, 31 other files |
| Fences | 14 | 9 at `9fd2faa7` (K1.1 and K1.1-correction-01 records, archived since), 5 in K1.2-correction-01 reviews 10–11 (identical) |
| Test-file origins | 71 | 53 paths; 52 pinned at `66bc0411`, 19 at `9fd2faa7`; 63 identical, 7 changed, 1 moved to `tests/archive` |
| Their registrations | 1,590 | TypeScript AST: 1,399 literal titles, 57 templates, 134 computed expressions; 124 are `t.test` subtests |
| Literal titles kept | 1,396 | In the mapped targets; 1,392 at the same path (the check's figure; four moved). |
| Identical origins | 63 | 52 paths, 962 distinct registrations (840 literal, 54 template, 68 computed). Helper closure unchanged for 59; for 4 only `harness.ts` changed. |
| Changed or moved | 8 | 433 registrations: 390 span-identical, 43 not |
| Other whole-file | 31 | 6 live canaries, 2 builder-docs, 11 helper or fixture modules (7 files), 7 sweep modules, 5 K1.2-correction-01 probes mapped to tests |

Changed or moved test files (residue: file text outside top-level registrations):

| File | Registrations | Not span-identical | Titles gone | Residue |
|---|---:|---:|---:|---|
| `dispatch.test.ts` | 50 | 19 | 1 | unchanged |
| `ingress.test.ts` | 34 | 1 | 1 | unchanged |
| `nondisclosure.test.ts` | 14 | 0 | 0 | changed |
| `refusals.test.ts` | 3 | 2 | 0 | unchanged |
| `unsupported.test.ts` | 4 | 4 | 1 | changed |
| `values.test.ts` | 74 | 2 | 0 | changed |
| `evidence-records.test.ts` (moved) | 4 | 0 | 0 | changed |
| `kernel-landing-zone.test.ts` | 250 | 15 | 0 | changed |

Gone: "nothing in this packet advances a writer epoch", the K11-R1-SCOPE-01 terminal-ingress test,
"the package exports exactly the K1.1 surface…". Templates: 2 in `kernel-landing-zone.test.ts`
(plus 62 computed titles), none elsewhere.

### 5.2 The 82 pending artifacts and one addition, by kind

| Kind | Origins | Members |
|---|---:|---|
| Mutation runner or battery | 20 | Structural census of 19: K1.2-correction-01 `ablations` 67, `ablations-07` 28, `ablations-06` 22, `ablations-03` 21, rebound-06 21 (inherits), `ablations-04` 16, `original-ablations-02` 36 (inherits K1.2), `diagnostic-ablations-04` 4, `sweeps-08` 34, `sweeps-09` 5, reviews 02/03/04 12/10/19, review-06 `mutants.py` 24, review-08 `mutants.mjs` 20, review-11 2 and 1; K1.2 `ablations` 36, review-09 12. **390** occurrences; less 117 explicit inheritances and reuses, about **273** distinct mutation keys before equivalence review. Review-04 `oracle-vs-mutants.mjs` selects by argv: `census: reading`. |
| Mixed | 6 | Review-10 enforcement probe and rebound (6 forms, 2 regressions each); `probe-reviewed-h-07`/`-08` (old-H expectations plus a probe); review-11 `run-faults`; review-12 `build-oracle-probe.py` (3 observations) |
| Behavioural probe | 39 | 15 held (14 V-D1, four also using a Proxy; 1 V-ENV); 4 large-memory profile; 3 engine observations; 17 others, of which 2 are path-only copies of review-09/10 probes. About 200–250 scenario rows by reading: low confidence. |
| Historical command or record | 18 | 16 gates, command lists, wrappers (link, `historical_command` or `record`); 2 excerpts of finding K12-R1-DOC-01, a prose counterexample |

### 5.3 The K1.1-correction-03 area

86 pending origins in its named sources (19 artifacts, 67 mentions) and 41 in K1.1-correction-02
(2 and 39). Agrees with the check.

### 5.4 Mention sample

1,312 pending mentions stratified by source packet, proportional with at least six per stratum,
sorted by origin ID and drawn with Python `random.Random(20261003)`; n = 128, each read in context.
**N** no counterexample; **A** names a member, probe or test held in an inventoried artifact or
maintained test; **A\*** names a member defined only in an un-inventoried sealed record (D05-01);
**P** prose-only counterexample.

| Stratum (population) | n | N | A | A\* | P |
|---|---:|---:|---:|---:|---:|
| K1.2-correction-01 (652) | 60 | 16 | 33 | 2 | 9 |
| K1.1 (286) | 26 | 10 | 1 | 12 | 3 |
| K1.2 (252) | 23 | 9 | 13 | 0 | 1 |
| K1.1-correction-01 (77) | 7 | 1 | 1 | 5 | 0 |
| K1.1-correction-02 (39) | 6 | 4 | 1 | 0 | 1 |
| K1.1-reference-01 (6) | 6 | 6 | 0 | 0 | 0 |
| **Total** | **128** | **46 (36%)** | **49 (38%)** | **19 (15%)** | **14 (11%)** |

Weighted: N ≈ 425, A ≈ 530, A\* ≈ 210, P ≈ 150. *Disagreement with the check* (40 sampled: 21 N,
11 A, 8 P): it counted run results naming a member as N, I count them as links; it had no A\*.

### 5.5 Feasibility probes

Node v25.2.1, Python 3.13.5, macOS arm64. **No Node 22.x is present**: the 22.9 floor is unverified
and is implementation step 1. Probes 3–5 ran in a `git archive` copy of `0c1d57dd` in the scratchpad.

1. **Census.** A TypeScript 5.9.3 parse (no execution) of pinned `ablations-07.mjs`: 28 elements,
   R1–R12 and C1–C16, no residue, other mentions all reads. `ablations.mjs`: 7 elements, 29 pushed,
   and the `rendererInventory` loop reported as an unclassified mention. Its regex finds 30 + 1 at
   `66bc0411` and at the head (production source identical), matching the runner's literal, but
   29 + 1 at `67555e3d` (D05-06). Total 7 + 29 + 31 = 67.
2. **Applicability.** Literal edits from 12 runner containers (203 labels): 182 apply exactly once
   at the head, 18 are stale (including those later adapters rebound), 3 are computed.
3. **Per-test reach.** `NODE_V8_COVERAGE=<dir> node --experimental-strip-types --test
   --test-name-pattern='^<title>$' --test-reporter=<events> value-diagnostic-work.test.ts`: 0.69 s.
   `:269`: its assertions count 2 (two loop rounds), the same-line `throw` 0, sibling anchors 0.
   `:541`: an assertion inside the eval template counts **1**, a false reach (D05-02). V8 offsets
   indexed the `.ts` text.
4. **Preserved closure.** Catalog events for `value-diagnostic-work` and `exact-coordinates`: 13 of
   13 historical literal titles matched at their lines; generated sites gave 3 + 2 + 2 and 4 passing
   leaves; no target had children. Events carried the fields the 22.9 document lists.
5. **Cost.** The Kernel suite (1,720 tests) took 16.3 s wall, so discovery for 273 mutants is about
   75 machine minutes; targeted verification runs take seconds.

### 5.6 Re-estimate

Rates: triage 1–1.5 minutes per mention; structured target with reach 15–20 minutes; mutation member
5–10 minutes (20 if rebound); probe row 10–15 minutes (5 if held). Design 04's 11–21 days (option A)
omitted the whole-file census, probe rows and prose adoption.

| Phase | Work | A | C |
|---|---|---:|---:|
| E0 | Node 22.9 floor checks A1–A8 | 0.5 | 0.5 |
| E1 | Tooling: design 04's 3–5 days plus §2's increments (7.5 for A, 8.25 for C, less about 1 of overlap with design 04's catalog) | 9.5–12 | 10–13 |
| E2 | Revalidation of 154: preserved run plus `harness.ts` and 5 residue reviews (0.5); hold classification of about 60–80 register matches (0.5); 43 changed members (2.5); 14 fences and 5 probes (2); 31 other whole-file origins (0.5); 77 case pairs (1); 30 non-executable (0.5) | 6–9 | 6–9 |
| E3 | 83 artifact origins: families and registration (4–6), survivor triage (1, floor), probes (4–8), mixed and records (1), held and profiled witnesses (0.5–1) | 10.5–17 | 10.5–17 |
| E4 | Mentions. A: triage (4–6), sealed-log extraction (2–3), adoption of about 150 prose-only mentions, grouped to 80–120 records (7–15). C: triage with areas and links (4–6), `prose_pending` records (1). | 13–24 | 5–7 |
| E5 | P2 composition, clean-C verification, cumulative self-review, report | 2–3 | 2–3 |
| | **Total** | **42–66** | **34–50** |

Under C, adopting the prose-pending items moves to successors: about 9–18 days spread across them.
Its first slice is the K1.1-correction-03 area (§5.3), roughly 1–2 days inside that packet.

**Unestimated:** non-equivalent survivors beyond one day; semantic blockers needing owner decisions;
independent review and its rounds; E0 incompatibilities; K1.1 log recovery beyond its budget under A;
successor adoption under C beyond the first-order figure; rework after the design check. Confidence
is low for E3's probe rows and E4 under A.

## 6. Implementation order for GPT-6

0. Review this design. If accepted, record the owner's answers verbatim with provenance in
   `owner-choice-02.md`, apply the approved diff, commit.
1. Verify A1–A8 on Node 22.9, turning §5.5's probes into fixtures. On any failure stop and report;
   never adapt a mechanism silently.
2. Declared environment in `command()`; rerun the 158 tooling tests and the composed verify; add the
   contamination fixtures.
3. Catalog commands, catalog reporter, leaf tree and selection binding, with fixtures.
4. Format-2 schema and migration: all 1,549 origins unchanged; 116 + 8 rows `pending_revalidation`;
   30 non-executable kept for recheck; 1,395 pending. Summaries and fixtures. Commit.
5. `source-facts.mjs`, `reach-coverage.mjs`, target validation, D05-02/03 fixtures. Commit.
6. Hold register and preserved closure; run over the 71 test-file origins; classify register matches;
   review `harness.ts` and the five residues. Commit.
7. Census kinds, target-set mutants and discovery runs; census the 20 families and 6 mixed origins
   and assert the §5.2 figures. Commit.
8. Remaining P1-R: the 43 changed members, 14 fences and 5 probes, 31 other whole-file origins, 77 case
   pairs and 30 non-executable rows. Commit.
9. The K1.1-correction-03 area first (§5.3), including the Proxy and built-in witnesses. Commit.
10. Remaining artifact origins in family batches. Commit each.
11. Mentions: under C triage, `prose_pending` records, area map and gate; under A full adoption,
    including sealed-source extraction.
12. P2: composition, clean-C verification, cumulative 012 self-review, report, C/H, then stop.

**Assumptions to verify before code:**

- A1. On 22.9, `test:start`, `test:pass` and `test:fail` carry name, nesting, file, line and column,
  pass and fail carry `details.type`, and `test:start` follows definition order.
- A2. `--experimental-strip-types` keeps offsets: V8 ranges index the original `.ts` text.
- A3. `NODE_V8_COVERAGE` writes block ranges with counts for the `--test` child; the same-line `throw`
  of probe 3 counts 0.
- A4. A full-path name pattern selects exactly one leaf; `--test-skip-pattern=.` gives a no-test
  baseline.
- A5. Two reporters with separate destinations work for the `repository-tests` step.
- A6. The pinned TypeScript subset in `mutations.json` suffices for `createSourceFile` and
  `createScanner`, or is extended with digests. That is not a new dependency.
- A7. The `test` script equals the declared rendering, and the expanded file set equals the files the
  run reports.
- A8. The declared environment runs every `checks.json` step with unchanged counts.

## 7. Owner questions

1. **Revision-3 diff.** Approve the option-C diff, or the C diff plus the A delta?
2. **Title catalog.** Approve catalog runs bound to the named command's selection, under a declared
   environment, with path-qualified leaves, run fresh by `corpus` and shared with `repository-tests`?
3. **Revalidation scope and budget.** Approve the preserved closure (span-level included, helper
   reviews counted), reach-checked targets, revalidation of all 154 rows and E2 at 6–9 days?
4. **Staging.** Choose A (42–66 days) or C (34–50 days, plus 9–18 days of adoption in successors).
5. **If C.** Approve the area map and successor gate, and record its entry check in 007 yourself?
6. **Sealed logs.** Extract the K1.1 and K1.1-correction-01 log batteries inside TOOLS-01 (2–3 days),
   or, under C, keep them as `prose_pending` records with sealed-source pointers?
7. **Node 22.9.** None is installed here. Provide one, or authorize installing one?

## 8. Stop

Validation and the pushed head are in the session's final response; a note cannot name its own
commit. This note maps nothing, applies nothing, releases no hold and marks nothing review-ready.
TOOLS-01 stays IN_PROGRESS.
