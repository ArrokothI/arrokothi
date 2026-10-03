# Design 05 — TOOLS-01 revision 3 after the design-04 check

**Date:** 2026-10-02. **Role:** design author by owner assignment: Claude Code, `claude-opus-5-5`,
session `5eb143d3-0a5f-4f89-adae-02be27f55403`. Not the implementer and not a reviewer.
**Status:** note revision 2, answering the [design-05 check](design-05-check.md) (commit `03ad191a`,
APPROVED WITH REQUIRED CHANGES). The checked revision 1 is commit `08e0890e`, blob `623a7e11`; the
check's line references point there. **Nothing here is implemented**; no contract, mapping, check,
script, fixture or hold changed; nothing is review-ready or accepted.

## 1. Identity, authority, scope and owner direction

Revision 1 started from a clean `codex/tools-01` at `0c1d57dd10612e54188c77a1697fd88c017badb3`.
This revision starts from `03ad191ac790328f0404c8723d531063b7ee334d`, local and origin equal and clean.
The live [contract](contract.md) is revision 2 (blob `96c8f6342993f963a10beea8e6131aec715db737`).
[Design 04](design-04.md) (`6b77416b`, GPT-6) proposed revision 3 and adoption format 2; the
[design-04 check](design-04-check.md) made D04-CHK-01 to -06, which the owner turned into proposals.
Design 04 governs everything this note does not change.

**Owner direction.** Provenance: owner messages of 2026-10-02 in the design-04 check session,
delivered through this session's prompt.

> "can I let a new Claude session to do this design part? ... I want to save the GPT6 quota for
> actual implementation."

Sequence: a separate Claude session checks this design (done: D05-CHK-01 to -12, all answered in
§2.2); the owner answers the owner questions; GPT-6 reviews this design and, if it accepts,
implements it in the same session. Under [006](../../006-development-process.md#packet-lifecycle)
the coding agent normally writes the design note; the owner reassigned it.

**Scope.** Development evidence tooling. The canonical owner is
[evidence attribution](../../../../mental-model/mechanisms/evidence.md). No Kernel, Runtime/Driver or
deployment semantics; no production, Layer-3, sealed-record or 007 edit; no dependency or copied
source. V-D1, Proxy and re-prototyped built-ins stay held by K1.1-correction-03, V-ENV by
BINDING-01. Only this file is committed.

**Read:** AGENTS.md; 006; 012; 016 root causes 5, 6, 9; the TOOLS-01 contract, designs 01–04,
owner choice 01, continuation 01, pilot 01, pilot review 01, the design-04 check and the design-05
check in full; the tooling README, `packet_tools.py`, `assertion-reporter.mjs`, `oracle-probe.mjs`;
the research map's evidence-tooling entry and
[§8](../../research/2026-10-02-canonical-bytes-kernel.md#8-evidence-tooling-corpus-mutation-registry-simulation-coverage)
as background. Primary source: Node v22.9.0
[`doc/api/test.md`](https://github.com/nodejs/node/blob/v22.9.0/doc/api/test.md). Also the pinned
source of all 83 pending artifact origins and 128 sampled mentions.

**Independence.** Both checkers and I are the same model family. I reproduced every D05-CHK probe
and recount before adopting it (§2.2), and differ from the check on one sizing.

## 2. Dispositions

### 2.1 The design-04 check (revision 1, as amended by §2.2)

Costs: focused implementer days (6 hours) of tooling added to design 04's own 3–5 days; §5.6.

| ID | Decision | Mechanism | Contract rows | Planned negative fixtures | Cost |
|---|---|---|---|---|---|
| D04-CHK-01 | **Adapt** | Reach: raw `NODE_V8_COVERAGE` ranges, innermost-range **count** from a new helper in `tests/tooling/` (the rule of `coverageExecuted`, [fault-oracle.ts:783](../../../../packages/kernel/tests/sweep/fault-oracle.ts); that file is a preserved origin and is not edited), from a valid run filtered to the target's full path, compared with a no-test baseline. Guards D05-02, D05-CHK-01/-02. `exact_input`: positional token values (D05-CHK-03). Discrimination: D05-CHK-04. Credit counted by kind. | P1-T, F5 | early return; sibling anchor; eval template; comment; module-load helper; 16,777,216 for 33,554,432; equal value in another argument; computed input; foreign-counterexample mutation; kind counts | 2 |
| D04-CHK-02 | **Adopt** | Catalog commands declare script text, globs and flags; the tool checks `package.json` and expands the globs over the C copy. `repository-tests` runs that argv with a second reporter, so one run feeds verify and catalog. One declared environment for every command the tool runs, with an environment census (D05-CHK-10). Leaf tree from `test:start` order and `nesting`; target identity is full path plus declaration location. | P1-T, F4, F5 | file under `tests/evals` or `examples`; helper as target; script drift; inherited `NODE_OPTIONS`, `KERNEL_POISON_MODE`, `NODE_TEST_CONTEXT`, `NODE_V8_COVERAGE`, `PACKET_ORACLE_CHECK`; parent with subtests; duplicate path; missing location; unlisted env read | 1.5 |
| D04-CHK-03 | **Adapt** | Census kinds, parsed, never executed: `structural` (container elements and top-level pushes; each element labelled; each top-level statement mentioning the container classified `reads` or `adds`), `filter` (the runner's own regex over a named sealed dependency), `generator` (runner regex at a recorded input revision), `inherits`, `python_ast`, `product`. Cross-checks: the runner's own count assertions and complete sealed run outputs (D05-CHK-09). No mapper-written label pattern is a census. Else `census: reading`, counted. | P1-M | member dropped from list and count; wrong container; unclassified mention; filter regex absent from runner; unlabelled element; generator count mismatch; partial output used | 1 |
| D04-CHK-04 | **Adapt** | Register recomputed at C from recipes over registration spans and the helpers they call (D05-CHK-05), plus entries; each match `held`, `superseded` or `not_held` with a reason. Credit into a registered member needs its hold or a counted `not_held`. | P1-H, P1-P | `:541` without hold; `:269`; `values.test.ts:1225`, `:1239`, `creation.test.ts:742`; a harness `revokedProxy` user; new match; `not_held` without reason | 0.5 |
| D04-CHK-05 | **Adapt** | `preserved` closure, P1-P: whole-file identity, or span identity under the residue rule (D05-CHK-07); selection; passing title or generated site; unchanged test-side helpers (literal titles may cite a counted review). Production-change label (D05-CHK-11). Register routing applies. | P1-P, P1-R | changed byte; not selected; title absent; zero leaves; skipped leaf; helper changed; generated member with reviewed helper; held member; disallowed residue change | 1 |
| D04-CHK-06 | **Adapt** | Tool-checked minimum contexts: artifact = whole file plus sealed records it names by path or revision, transitively (production files it reads are targets, not context); fence = fence plus its heading section; prose = paragraph or table row, links one hop, member labels resolved in the same packet's pinned directory. Lexical path and SHA candidates covered or reasoned. Test-side depth through reach. | P1 preamble, P1-G | fence-only context; missing T1 dependency `3287640f`; unresolved label; short range | 0.75 |
| D05-01 | **New: adopt** | Counterexamples may cite `sealed_sources` (revision, path, sha256, lines), verified, never origins. Triage resolves member labels in the same packet's pinned records. | F2, P1-X | digest mismatch; sealed source as origin; label from another packet | 0.25 |
| D05-02 | **New: adopt** | An anchor starting inside a string or template literal or a comment is `not_observable`, needs a reached helper-status anchor, and counts as reading. Extended by D05-CHK-01. | P1-T | covered under D04-CHK-01 | in 01 |
| D05-03 | **New: adopt** | 22.9 name patterns match ancestor-prefixed names; run validity per D05-CHK-02. | P1-T | 0 or 2 leaves; synthetic file-level pass | in 01 |
| D05-04 | **New: adopt** | Mutants run against declared target files; one full-suite discovery run per member records first failures as metadata, never credit. | F3, P1-M | kill outside target set; discovery imported as credit | 0.5 |
| D05-05 | **New: adopt (C)** | Area gate as amended by D05-CHK-08; areas `tooling` and `records` are TOOLS-01's and cannot stay `prose_pending`. | P1-X | see D05-CHK-08 | 0.75 |
| D05-06 | **New: adopt** | Generator families record the input revision of the run they describe, from a complete sealed output where one exists (D05-CHK-09); otherwise count from the runner's literal, site identity by reading. | P1-M | generator count mismatch | in 03 |

**What revision 1 got wrong, corrected here.** (a) It said a textual literal guard fails on "another
argument" and a token-value guard does not; a value-only guard also passes it (D05-CHK-03).
(b) It implied a qualifying kill shows the assertion compares the required value; a kill shows
sensitivity to a registered mutation of this counterexample, and relevance stays reading
(D05-CHK-04). (c) It said preservation proves "the same input and assertion"; it proves the same
*test-side* input and assertion (D05-CHK-11). (d) Its registration census counted `RegExp#test`
calls as subtests (D05-CHK-12). (e) Its residue rule contradicted its plan (D05-CHK-07). (f) Its P1-M
dropped design 04's survivor route (D05-CHK-06).

**Limits that remain, stated.** Reach shows an assertion statement started, not that it compares
the required value; such relations are `target_reading` unless discriminated. An exception caught
outside the span or in a deeper helper can still mask a skipped assertion. Held behaviour matching no
recipe stays unregistered. A vacuous historical test stays vacuous under `preserved`. Computed import
specifiers escape the helper closure. A wrong container or an adding statement classed `reads` is one
named fact, cross-checked by sealed outputs where they exist.

**D05-01 evidence.** In my sample 19 of 128 mentions named members defined only outside the
inventory: 21 `09b-distinguishing-ablations.log` records (16 K1.1, 5 K1.1-correction-01; K1.1
`validation-17` holds diffs for X1, X3, X4, X7, X8, X9, XA and XB) and review evidence such as
`review-revision-09-independent-2026-09-30/probes`. The check's sample found 3 of 60 (§5.4).

### 2.2 The design-05 check

I reran the check's four probes on Node 25.2.1 and its registration recount over the same blobs;
all reproduce. Every item is adopted; D05-CHK-05 and -07 are slightly tightened.

| ID | Decision | Change | Contract rows | Planned negative fixtures |
|---|---|---|---|---|
| D05-CHK-01 | **Adopt** | An assertion anchor is one statement; reach is taken at the start of its assertion call (`assert.*`, `t.assert.*`, or a same-file helper call), or at the condition of an `if (…) throw` guard. It is `not_observable` (reading, counted) when it, or the call to the same-file helper holding it, lies lexically inside a `try` block within the span, or inside a function passed to `assert.throws`, `rejects`, `doesNotThrow`, `doesNotReject` or a promise `.catch`. Gap: catches outside the span or in deeper helpers. | P1-T | caught throw before the assertion (reproduced: count 1); `r.ok \|\| assert…` (start 1, call 0); `try { assert… } catch {}` |
| D05-CHK-02 | **Adopt** | A reach run is valid only with exactly one leaf event whose full path is the target, the synthetic file-level event excluded, no `test:fail` anywhere, and matching summary counts. The helper returns counts; reached means target count above baseline count, for assertion, operation and input anchors inside the span. Inputs outside every span are `input_scope: module`: token-checked, counted separately, flow by reading. | P1-T | failing parent with passing child (reproduced); zero-match synthetic pass (reproduced); module-scope table input |
| D05-CHK-03 | **Adopt** | An input anchor is one statement; each `literals[]` entry records its token ordinal and value; the tool checks that token. `input_tokens_matched` means "the token at the cited position", never input flow. | P1-T | equal value in another argument fails |
| D05-CHK-04 | **Adopt** | `target_mutation_discriminated` needs a registry mutation whose `obligation` names this counterexample or a member of its family, a cited operation anchor in the mutated file, and a qualifying named failure of the target leaf. Summary text: "sensitive to a registered mutation of this counterexample; relevance by reading". A target without an operation anchor is `target_reading`. | P1-T | mutation registered to another counterexample |
| D05-CHK-05 | **Adopt, sized** | Recipes recorded in `holds.register` and the report before classification; body matching over the span and the same-file and test-side helpers it calls, transitively. Minimum: Proxy `new Proxy\|Proxy\.revocable`; built-ins `setPrototypeOf\|__proto__\|Object\.create\(`; V-ENV `\bvm\b\|createContext\|runInContext\|frozen-intrinsics\|globalThis`; V-D1 titles plus `value-diagnostic-work.test.ts` and `value-refusal-cost.test.ts`. Widen only. My one-level sizing over the 900 identical-file registrations: Proxy 82, built-ins 85, V-ENV 5; so classification is 1.5–2 days, not 1–1.5. | P1-H | the three cited tests and a `revokedProxy` user registered |
| D05-CHK-06 | **Adopt** | P1-M adds an equivalence argument (reading, counted) and a non-equivalent survivor recorded as a finding for its owner or an owner-recorded limit (counted). Neither is a kill. V5 (20/21 in `validation-09/38-…-rebound.txt`) takes the equivalence route. | P1-M | equivalence closure and survivor record do not count as kills |
| D05-CHK-07 | **Adopt, tightened** | Residue = file bytes minus leaf-test spans (`test`, `it`, `t.test`); `describe` and `suite` text stays. A span-identical member stays preservable only if each residue change is an inserted declaration binding only new names, or a changed or removed declaration that the member and its same-file helpers never reference. *Tightened:* an inserted declaration whose initializer contains a call, `new`, assignment or `await` counts as an expression statement, and an inserted expression statement anywhere in the residue (including a hook) disqualifies every member of the file. Counts `preserved_residue_additive`, `preserved_residue_unreferenced`. No free-form residue review. | P1-P | inserted top-level call; inserted `beforeEach`; changed referenced constant (`kernel-landing-zone`'s `REAL_DEPENDENCY_ROW`); `describe` text kept in residue |
| D05-CHK-08 | **Adopt** | `triage` is `none` with a reason, or a non-empty **set** of links to members, records and `prose_pending` records. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths; no spec can disable it. The area map covers every path in the tree. | P1-X | mixed origin (`review-08.md:303`); spec omitting the gate; unmapped test or doc path |
| D05-CHK-09 | **Adopt** | Where the pinned tree holds a complete run output (command and tree named, runner bytes equal at that tree, the runner's own summary at the end), the census also equals the member names on its verdict lines, parsed with the runner's print format. That tree is the D05-06 input revision; `census.observed` records path, digest and tree. | P1-M | partial `validation-08/27` output refused; member dropped against the output |
| D05-CHK-10 | **Adopt** | Census every `process.env.<NAME>` read in selected test files and their test-side closures at C; each is passed, set, or listed as deliberately absent with its effect. | F4 | unlisted read fails |
| D05-CHK-11 | **Adopt** | For each preserved member, list production modules its test-side closure imports that changed between its pin and C; count `preserved_production_changed`. Kernel source is unchanged since `66bc0411`, changed since `9fd2faa7` (11 identical origins). | P1-P | member importing a changed module is labelled |
| D05-CHK-12 | **Adopt** | Registrations are recognised only through bindings imported from `node:test` (`test`, `it`, `describe`, `suite` and their `.skip`, `.only`, `.todo`) and `<p>.test` where `<p>` is a registration callback's first parameter. Corrected figures in §5.1. | — | `pattern.test(line)`, `expect.test(message)` are not registrations |

## 3. Contract diff from revision 2 to revision 3 (option C)

Apply-checked against the live `contract.md` (blob `96c8f634…`): `git apply --check` and
`patch --dry-run` pass. Not applied. It includes the check's amendments to F4, P1-T, P1-P, P1-H,
P1-M and P1-X. `owner-choice-02.md` is created at implementation step 0 with the owner's verbatim
answers. Under option C the 007 entry check is the owner's (§7).

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
+| F4 | Keep runner changes in temporary source copies; preserve candidate files; run each process under a declared environment. Bound execution duration and retained output. | Candidate hash checks; deliberate hanging, noisy, failed and contaminating-environment fixtures; every `process.env` name that selected tests read is declared; interrupted or failed mutation cannot patch the shared checkout. Supported host: POSIX with Python 3 and Node 22.9+; the floor's test-event, coverage and type-stripping assumptions are checked before use. |
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
+| P1-T | A suite target names its command, file, full test path, declaration location, one-statement input, assertion and optional operation anchors, and its relation: `exact_input`, or `authorized_replacement` with its decision. For an unchanged contract it tests the corrected required result. | Fresh runs at C. The file is in the command's own selection under the declared environment. A reach run is valid only with exactly one leaf event equal to the target path, no failure event and matching summary counts. An anchor inside the target's span is reached when its innermost-range count, taken at an assertion call's start, exceeds a no-test baseline; anchors in literals, comments, `try` blocks or functions passed to `assert.throws`-style calls are not observable, and inputs outside every test span are module-scoped. `exact_input` values equal the literal tokens at their recorded positions. Discrimination is a qualifying kill of the target by a mutation registered to this counterexample in a file with a cited operation anchor, or a recorded reading trace. Each fact is reported by kind. |
+| P1-P | A historical test member closes as `preserved` when, at C, its whole file is byte-identical, or its own span is and every residue change (bytes outside leaf-test spans) is an inserted declaration binding only new names with no call, `new`, assignment or `await` in its initializer, or a changed or removed declaration that neither the member nor its same-file helpers reference; its command selects the file; its title, or for a generated title its declaration site, yields at least one leaf and only passing leaves; and its test-side helper closure is unchanged. For a literal title a recorded helper review may replace "unchanged" and is counted. | Deterministic identity, residue, selection, catalog and closure checks, fresh at every C. Preservation claims the same test-side input and assertion, not discrimination; members whose imported production modules changed since their pin are counted separately. Passes through P1-H. |
+| P1-H | Held or superseded required results become attributed witness records, never suite or preserved credit. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. A register of current tests and cases that observe each held claim is fully classified. Its title, body and file recipes match registration spans and the same-file and test-side helpers they call; they may widen, never narrow below design 05's minimum. | Structural destination checks; register recomputed at C; credit into a registered member needs its hold or a counted `not_held` reason. Reproducing a witness earns no conformance, correction or release credit. Unregistered held behaviour is a stated gap. |
+| P1-M | Each mutation-runner family lists its members from a census recomputed over pinned bytes, or is marked `census: reading` and counted. Each member maps to a registered mutation with a qualifying named kill, an attributed witness, a reasoned no-longer-applicable disposition, an equivalence argument, or a non-equivalent survivor recorded as a finding for its owner or as an owner-recorded limit; otherwise it stays pending. | Census equality with the member list, with the runner's own count assertions and with any complete sealed run output; fresh control, applicability, reach and qualifying named failure for each kill. Distinct mutations, case/mutation pairs and family links are counted separately. Reading closures, equivalence arguments, survivor records and invalid runs never count as kills. |
+| P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`. |
+| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Triage completeness; the area map covers every path in the tree. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths, and fails while a `prose_pending` record in a touched area remains. The owner records this entry check in 007. |
+| P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary, composition and gate controls for pending origins and members, missing targets, stale results, held or profiled credit and `prose_pending` records. |
+
 Foundation F1–F6 is an incremental delivery within TOOLS-01, not a new acceptance gate or a split
 that silently defers P1/P2. The full packet stays IN_PROGRESS. No semantic benchmark credit or
 hold release follows from tool verification. Human review still judges authorization, prose
```

**Option A delta.** Applies on top of the option-C text; apply-checked in sequence. It removes the
successor gate and requires adoption of every prose-only counterexample. The owner chose C (§7); the
delta stays as the costed alternative.

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
-| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Triage completeness; the area map covers every path in the tree. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths, and fails while a `prose_pending` record in a touched area remains. The owner records this entry check in 007. |
-| P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary, composition and gate controls for pending origins and members, missing targets, stale results, held or profiled credit and `prose_pending` records. |
+| P1-X | Every prose origin closes as no counterexample (with a reason), or as a non-empty set of links to members and to new executable or attributed records. Counterexamples defined only in sealed sources are extracted. | Triage and adoption completeness under P1-T, P1-P, P1-H and P1-M. No `prose_pending` record remains, so no successor gate is needed. |
+| P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary and composition controls for pending origins and members, missing targets, stale results, and held or profiled credit. |

```

## 4. Deltas to design 04's data model and tool plan

**Data model** (adoption format 2; design 04's tables otherwise unchanged):

| Table | Change |
|---|---|
| `origins` | Add `context` (recorded ranges, checked against the D04-CHK-06 minimum) and, for prose, `triage`: `none` with reason, or a non-empty set of links (C may link `prose_pending` records). States: `pending`, `pending_revalidation`, `triaged` (C), `complete`. |
| `counterexamples` | Add `sealed_sources[]` (revision, path, sha256, lines). Kind `prose_pending` (C) stores the input description, provenance and areas. |
| `suite_targets` | `test_title` becomes `test_path[]` and `declaration {line, column}`; one-statement anchors: `input_anchors[]` (anchor, sha256, `literals[]` of ordinal and value, or `computed`; `input_scope`), `assertion_anchors[]`, `operation_anchors[]`; `discrimination` (`mutation` key, or `reading` trace). |
| `preserved` (new) | Member, origins, file, revision, scope (`whole_file`, or `span` with span digest and residue-change classes), title or generated site, `helper_closure` (`unchanged`, or `reviewed` with reference), `production_changed[]`. |
| `families` | `census` per D04-CHK-03 plus `observed` (sealed output path, digest, tree), or `census: reading` with reason. |
| registry mutations | Literal edits; `obligation` (counterexample or member); `target_files[]`; `expected_targets[]`; `discovery` metadata, never credit. Survivors: `equivalence` argument or `survivor` record. |
| `holds` | Add `register`: recipes (title, body, file; widen only), entries, classifications. |
| `catalog_commands` (new) | ID, package script, script text, globs, flags, environment (`pass[]`, `set{}`, `absent[]` with effect), timeout, output limit. |
| `areas` (new, C) | Area to globs, covering every path in the tree. |

**Summary fields.** `source_bindings_verified` becomes `anchors_bound`; add `anchors_reached`,
`anchors_not_observable`, `input_tokens_matched` (positional), `input_computed`, `input_module_scope`,
and credit kinds `preserved` (with `_helper_reviewed`, `_residue_additive`, `_residue_unreferenced`,
`_production_changed`), `target_mutation_discriminated`, `target_reading`, `held`, `superseded`,
`prose_pending` by area (C); survivor counts by route. P1 completion lists reading-only relations.

**Tool plan** (adds to design 04's table):

| Path | Change |
|---|---|
| `scripts/packet_tools.py` | `command()` builds every environment from a declared allowlist (default `PATH`, `HOME`, `TMPDIR`, `LANG=C.UTF-8`) and records it. Corpus phases: catalog, env census, reach, preserved, census (Python through stdlib `ast`), register, gate (C; in `verify`, unconditional). Mutants run against target files. |
| `tests/tooling/catalog-reporter.mjs` (new) | Emits `test:start`, `test:pass`, `test:fail` with name, nesting, file, line, column, `details.type`, skip, todo, `testNumber`; flags the synthetic file-level event. `assertion-reporter.mjs` gains location fields for kills. |
| `tests/tooling/source-facts.mjs` (new) | Parses or scans bytes with the pinned TypeScript 5.9.3 subset: `node:test` registrations, spans, token kinds and ordinals, `try`/`assert.throws` containment, residue statements, container elements, helper calls. Never executes what it reads. |
| `tests/tooling/reach-coverage.mjs` (new) | Reads raw coverage files; innermost-range **counts** for target and baseline per anchor. |
| `checks.json` | `repository-tests` uses the expanded argv with the catalog reporter; new corpus result values. |
| tooling tests, `refusal-guards.json` | The §2 negative fixtures; every new `require` registered and ablated. |

## 5. Census, probes and re-estimate

Recomputed at `0c1d57dd` by read-only scratch scripts; corrections from the design-05 check were
reproduced at the same blobs. Nothing historical ran; current tests ran only in temporary copies.

### 5.1 The 116 suite origins

| Set | Count | Detail |
|---|---:|---|
| Suite origins | 116 | 96 identical at the same path, 10 changed, 10 absent |
| Whole-file (line 1) | 102 | 71 test files, 31 other files |
| Fences | 14 | 9 at `9fd2faa7` (archived since), 5 in K1.2-correction-01 reviews 10–11 (identical) |
| Test-file origins | 71 | 53 paths; 52 pinned at `66bc0411`, 19 at `9fd2faa7`; 63 identical, 7 changed, 1 moved to `tests/archive` |
| Their registrations | **1,466** | 1,399 literal titles, 57 templates, 10 computed; no `t.test` subtests (plus 275 `describe`). Revision 1's 1,590 counted 124 `RegExp#test` calls. |
| Literal titles kept | 1,396 | In the mapped targets; 1,392 at the same path (four moved) |
| Identical origins | 63 | 52 paths, **900** distinct registrations (840 literal, 54 template, 6 computed). Helper closure unchanged for 59; for 4 only `harness.ts` changed. |
| Changed or moved | 8 | **372** registrations: 329 span-identical, 43 not |
| Other whole-file | 31 | 6 live canaries, 2 builder-docs, 11 helper or fixture modules (7 files), 7 sweep modules, 5 K1.2-correction-01 probes mapped to tests |

Changed or moved test files (residue: bytes outside leaf-test spans):

| File | Registrations | Not span-identical | Titles gone | Residue |
|---|---:|---:|---:|---|
| `dispatch.test.ts` | 50 | 19 | 1 | unchanged |
| `ingress.test.ts` | 34 | 1 | 1 | unchanged |
| `nondisclosure.test.ts` | 14 | 0 | 0 | one import changed; 113 lines inserted |
| `refusals.test.ts` | 3 | 2 | 0 | unchanged |
| `unsupported.test.ts` | 4 | 4 | 1 | comment changed |
| `values.test.ts` | 74 | 2 | 0 | 80 lines inserted |
| `evidence-records.test.ts` (moved) | 4 | 0 | 0 | root becomes `ARROKOTHI_EVIDENCE_ROOT` |
| `kernel-landing-zone.test.ts` | 189 | 15 | 0 | six constants replaced; `INVENTORY` and `REAL_DEPENDENCY_ROW` are test inputs |

Gone: "nothing in this packet advances a writer epoch", the K11-R1-SCOPE-01 terminal-ingress test,
"the package exports exactly the K1.1 surface…". Templates: 2 in `kernel-landing-zone.test.ts`, none
elsewhere. Residue details are the check's; my residue equality results agree.

### 5.2 The 82 pending artifacts and one addition, by kind

| Kind | Origins | Members |
|---|---:|---|
| Mutation runner or battery | 20 | Structural census of 19: K1.2-correction-01 `ablations` 67, `ablations-07` 28, `ablations-06` 22, `ablations-03` 21, rebound-06 21 (inherits), `ablations-04` 16, `original-ablations-02` 36 (inherits K1.2), `diagnostic-ablations-04` 4, `sweeps-08` 34, `sweeps-09` 5, reviews 02/03/04 12/10/19, review-06 `mutants.py` 24, review-08 `mutants.mjs` 20, review-11 2 and 1; K1.2 `ablations` 36, review-09 12. **390** occurrences; less 117 explicit inheritances and reuses, about **273** distinct keys before equivalence review. Review-04 `oracle-vs-mutants.mjs` selects by argv: `census: reading`. Complete sealed outputs exist for most (D05-CHK-09); V5 is an equivalent survivor. |
| Mixed | 6 | Review-10 enforcement probe and rebound (6 forms, 2 regressions each); `probe-reviewed-h-07`/`-08`; review-11 `run-faults`; review-12 `build-oracle-probe.py` (3 observations) |
| Behavioural probe | 39 | 15 held (14 V-D1, four also using a Proxy; 1 V-ENV); 4 large-memory profile; 3 engine observations; 17 others, 2 of them path-only copies. About 200–250 scenario rows by reading: low confidence. |
| Historical command or record | 18 | 16 gates, command lists, wrappers; 2 excerpts of finding K12-R1-DOC-01, a prose counterexample |

The check classified 20 of these 83 independently and agreed with all 20.

### 5.3 The K1.1-correction-03 area

86 pending origins in its named sources (19 artifacts, 67 mentions) and 41 in K1.1-correction-02
(2 and 39). Recomputed by me; agrees with the design-04 check.

### 5.4 Mention samples

Mine: stratified by source packet, proportional with at least six per stratum, sorted by origin ID,
`random.Random(20261003)`, n = 128. The check's: simple random, `random.Random(20261004)`, n = 60.
**N** no counterexample; **A** names a member, probe or test in an inventoried artifact or
maintained test; **A\*** names a member defined only in an un-inventoried sealed record; **P**
prose-only counterexample.

| Sample | N | A | A\* | P |
|---|---:|---:|---:|---:|
| Mine (n = 128; weighted 32/40/16/11%) | 46 (36%) | 49 (38%) | 19 (15%) | 14 (11%) |
| Check (n = 60) | 26 (43%) | 23 (38%) | 3 (5%) | 8 (13%) |

The check also found two A lines carrying a prose-only variant (`review-08.md:303`, `review-02.md:297`),
so prose-bearing mentions are 8–17%, about 110–220 (hence set-valued triage), and that three P lines
cite K1.2 review-14 probes absent from the pinned tree. A\* lies between 5% and 16%.

### 5.5 Feasibility probes

Node v25.2.1, Python 3.13.5, macOS arm64. **No Node 22.x is present**: the 22.9 floor is unverified
and is implementation step 1. Probes ran in a `git archive` copy of `0c1d57dd` in the scratchpad.

1. **Census.** A TypeScript 5.9.3 parse (no execution) of pinned `ablations-07.mjs`: 28 elements,
   R1–R12 and C1–C16, no residue. `ablations.mjs`: 7 elements, 29 pushed, and the
   `rendererInventory` loop reported as an unclassified mention. Its regex finds 30 + 1 at
   `66bc0411` and the head, but 29 + 1 at `67555e3d` (D05-06); the sealed `review-03/abl-corr.txt`
   at tree `312f2584` lists all 67 (the check). Total 7 + 29 + 31 = 67.
2. **Applicability.** Literal edits from 12 runner containers (203 labels): 182 apply exactly once
   at the head, 18 are stale (including those later adapters rebound), 3 are computed.
3. **Per-test reach.** `NODE_V8_COVERAGE=<dir> node --experimental-strip-types --test
   --test-name-pattern='^<title>$' --test-reporter=<events> value-diagnostic-work.test.ts`: 0.69 s.
   `:269`: assertions count 2, the same-line `throw` 0, sibling anchors 0. `:541`: an assertion in
   the eval template counts 1 (D05-02). Rerun of the check's probes: an assertion after a caught
   throw counts 1; `r.ok || assert…` counts 1 at the line start and 0 at the call; `^parent$` runs a
   passing child and a failing parent; a zero-match pattern emits one synthetic file-level pass.
4. **Preserved closure.** Catalog events for `value-diagnostic-work` and `exact-coordinates`: 13 of
   13 historical literal titles matched at their lines; generated sites gave 3 + 2 + 2 and 4 passing
   leaves. Events carried the fields the 22.9 document lists.
5. **Cost.** The Kernel suite (1,720 tests) took 16.3 s wall, so discovery for 273 mutants is about
   75 machine minutes; targeted verification runs take seconds.

### 5.6 Re-estimate

Rates: triage 1–1.5 minutes per mention; structured target with reach 15–20 minutes; mutation member
5–10 minutes (20 if rebound); probe row 10–15 minutes (5 if held); register match 3–5 minutes.

| Phase | Work | A | C |
|---|---|---:|---:|
| E0 | Install Node v22.9.0; floor checks A1–A9 | 0.5 | 0.5 |
| E1 | Tooling: design 04's 3–5 days plus §2.1's increments (7.5 A, 8.25 C, less about 1 of overlap) plus the check's changes (1.5–2.25) | 11–14 | 12–14.5 |
| E2 | Revalidation of 154: preserved run and residue classes (0.5); register classification (1.5–2); 43 changed members plus residue-disqualified members (2.5–3.5); 14 fences and 5 probes (2); 31 other whole-file origins (0.5); 77 case pairs (1); 30 non-executable (0.5) | 8.5–10 | 8.5–10 |
| E3 | 83 artifact origins: families with sealed-output cross-checks (4–6), survivor routes (1), probes (4–8), mixed and records (1), held and profiled witnesses (0.5–1) | 10.5–17 | 10.5–17 |
| E4 | Mentions. A: triage (4–6), sealed-log extraction (1–3), adoption of 70–150 records (6–19). C: set-valued triage with areas (4.5–6.5), `prose_pending` records (1), sealed-log extraction per the owner's answer (1–3). | 11–28 | 6.5–10.5 |
| E5 | P2 composition, clean-C verification, cumulative self-review, report | 2–3 | 2–3 |
| | **Total** | **44–73** | **40–56** |

Under C, adopting the remaining prose-pending items moves to successors: about 8–18 days, first in
the K1.1-correction-03 area. The check's C figure, 37–54, excludes the sealed-log extraction the
owner chose. **Unestimated:** survivors beyond the routes' day; semantic blockers; independent review
and its rounds; E0 incompatibilities; successor adoption under C beyond the first-order figure.
Confidence is low for E3's probe rows and E4 under A.

## 6. Implementation order for GPT-6

0. Review this design and the design-05 check. If accepted, record the owner's answers (§7)
   verbatim with provenance in `owner-choice-02.md`, apply the option-C diff, commit.
1. Install Node v22.9.0 at user level from nodejs.org, verifying its `SHASUMS256.txt` checksum;
   keep the existing Node. Verify A1–A9, turning §5.5's probes into fixtures. On any failure stop
   and report; never adapt a mechanism silently.
2. Declared environment and environment census in `command()`; rerun the 158 tooling tests and the
   composed verify; add the contamination fixtures.
3. Catalog commands, catalog reporter, leaf tree, run validity and selection binding, with fixtures.
4. Format-2 schema and migration: all 1,549 origins unchanged; 116 + 8 rows `pending_revalidation`;
   30 non-executable kept for recheck; 1,395 pending. Summaries and fixtures. Commit.
5. `source-facts.mjs` (with `node:test` registration recognition), `reach-coverage.mjs`, target
   validation, the D05-02/03 and D05-CHK-01 to -04 fixtures. Commit.
6. Hold register with the minimum recipes, then preserved closure with the residue rule and the
   production-change label, over the 71 test-file origins; classify register matches. Assert the
   §5.1 figures (1,466; 900; 372). Commit.
7. Census kinds, sealed-output cross-checks, target-set mutants, discovery runs and survivor routes;
   census the 20 families and 6 mixed origins and assert §5.2. Commit.
8. Remaining P1-R: the 43 changed and any residue-disqualified members, 14 fences and 5 probes, 31
   other whole-file origins, 77 case pairs and 30 non-executable rows. Commit.
9. The K1.1-correction-03 area first (§5.3), including the Proxy and built-in witnesses. Commit.
10. Remaining artifact origins in family batches, then the K1.1 and K1.1-correction-01 sealed-log
    batteries. Commit each.
11. Mentions: set-valued triage, `prose_pending` records, area map and the unconditional gate.
12. P2: composition, clean-C verification, cumulative 012 self-review, report, C/H, then stop.

**Assumptions to verify before code:**

- A1. On 22.9, `test:start`, `test:pass` and `test:fail` carry name, nesting, file, line and column,
  pass and fail carry `details.type`, and `test:start` follows definition order.
- A2. `--experimental-strip-types` keeps offsets: V8 ranges index the original `.ts` text.
- A3. `NODE_V8_COVERAGE` writes block ranges with counts for the `--test` child; the same-line
  `throw` of probe 3 counts 0 and the caught-throw case counts 1 (so D05-CHK-01's rule is needed).
- A4. A full-path name pattern selects exactly one leaf; `--test-skip-pattern=.` gives a no-test
  baseline; the synthetic file-level event is recognisable.
- A5. Two reporters with separate destinations work for the `repository-tests` step.
- A6. The pinned TypeScript subset in `mutations.json` suffices for `createSourceFile` and
  `createScanner`, or is extended with digests. That is not a new dependency.
- A7. The `test` script equals the declared rendering, and the expanded file set equals the files the
  run reports.
- A8. The declared environment runs every `checks.json` step with unchanged counts.
- A9. Whether a `t.test` subtest can be selected by its full path on 22.9 (not on 25.2.1). The mapped
  origins contain none, so a failure only refuses such targets.

## 7. Owner answers and what still needs the owner

Answers given in this design session on 2026-10-02, before the design-05 check (verbatim):
"title catalog agree. I agreed to staging C. I authorize you to modified 007 for me."; earlier,
"3. Approve", "6. Yes, unless you've other recomendation.", "7. authorize installing one." For
question 1 the owner accepted the option-C diff; for question 5, the gate.

| # | Question | Answer | After the check |
|---|---|---|---|
| 1 | Revision-3 diff | Option C | **Confirm** the amended C diff of §3 (F4, P1-T, P1-P, P1-H, P1-M, P1-X changed). |
| 2 | Title catalog | Approved | Unchanged in substance; D05-CHK-02 and -10 add run validity and the environment census. |
| 3 | Revalidation scope and budget | Approved | **Confirm** D05-CHK-07's residue rule (stricter than free-form review; rejecting it means about 10 more days for about 260 members) and E2 at 8.5–10 days. |
| 4 | Staging | C | C: 40–56 days plus about 8–18 in successors; A: 44–73. |
| 5 | Area map and gate | Approved; design author authorized to edit 007 | The gate is now unconditional (D05-CHK-08). I will add the 007 entry check once the gate exists, worded to match what was built. |
| 6 | Sealed logs | Extract, unless advised otherwise | The check advises keeping them as `prose_pending` under C. I still recommend extracting in TOOLS-01 (1–3 days): it is mechanical with TOOLS-01's census tooling, and it keeps K1.1-correction-03, which carries the live holds, focused on them. Answer stands unless the owner changes it. |
| 7 | Node 22.9 | Install authorized | Exactly v22.9.0 from nodejs.org with a verified checksum, at implementation step 1. |

## 8. Stop

Validation and the pushed head are in the session's final response; a note cannot name its own
commit. This note maps nothing, applies nothing, releases no hold and marks nothing review-ready.
TOOLS-01 stays IN_PROGRESS.
