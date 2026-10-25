# Design 01 — TOOLS-02

- **Author:** Claude Code desktop session (`claude-opus-5-5`), the implementer, 2026-10-23 (America/New_York).
  Not the design checker or the reviewer (Codex GPT-6 sessions, [release 01](release-01.md)).
- **Base B:** `b5daf35aeee37305c1ee41bb626c97d26db94ab2` (main after PR #58, which merged
  [release 01](release-01.md) and [brief 01](brief-01.md), scope B). Branch `claude/tools-02`.
- **Measurements:** a fresh clone of B (`git clone --no-local`, `npm ci`, nothing untracked), Node v26.10.0,
  Python 3.13.5, macOS arm64. `npm run typecheck` exit 0; `npm test` 4,412/4,412 pass.
- **Status:** working material for the design check. No code is written before the check answers §10.
  The brief and this note serve as the contract, as for BINDING-01 and COORD-REFACTOR-01.

| Brief item | Answer | Where |
|---|---|---|
| Question 1, T2-1 comparison form | A *walk form* derived per member from its own trace | §1 |
| Question 2, T2-3 provenance | K1.1-correction-03's test-side assertion witness, on the target route | §3 |
| Question 3, T2-5 rule, classes, sample, seed, bound | Declared in §5.3–§5.5, before any triage | §5 |
| Question 4, volume and time | Estimates with a re-estimate checkpoint | §5.6 |
| Suspect design 1, P1 closure as the only route | Yes, triage can replace it for the retired class, under four conditions | §5.1 |
| Suspect design 2, whole-repository digests | Neither option as stated: the trace classes each read | §1.1 |

## 1. T2-1 — the census stays valid under unrelated additions

### 1.1 Cause, measured at B

Each preserved-table record stores `reads`, a digest of every `(path, kind)` its file's traced run reads
outside its import closure. It also stores `repository_read_changed`, the paths among those that differ from
the pin. A changed test-fixture read adds a refusal reason. `corpus` recomputes the table and refuses any
difference. Scanner tests list directories and read every file they find, so each new file adds a read.

Traced at B (compared reads, after the import closure is set aside):

| File | Members | Reads | Walk roots (§1.2) | Named reads |
|---|---:|---:|---|---:|
| `import-scanner.test.ts` | 30 | 445 | `examples`, `packages`, `scripts`, `tests` | 4 |
| `kernel-landing-zone.test.ts` | 378 | 548 | the same four | 6 |
| `mcp-boundaries.test.ts` | 10 | 453 | the same four | 1 |
| `legacy-core-boundaries.test.ts` | 13 | 367 | `packages/core/src`, `tests/conformance` | 2 |
| `ambient-reads.test.ts`, `control-commits.test.ts` | 11, 10 | 190, 189 | `.` (TypeScript lists every directory) | 0 |
| `boundary`, `fault-oracle`, `fault-sweep`, `poison-catalog` | 9, 38, 2, 3 | 6–50 | `packages/kernel/src` (and `packages/sdk/src/internal`) | 0–12 |

**Simulation.** One commit on top of B adds two trivial passing test files, one under `packages/kernel/tests`
and one under `tests/conformance/architecture`, and one fixture, `tests/fixtures/zz/case.json`. The stored
digest changes for six of these files, which hold 452 rows. The walk form below changes for none of them. This
is the churn that BINDING-01 [cleanup 01](../BINDING-01/cleanup-01.md) item 1 and COORD-REFACTOR-01
[cleanup 01](../COORD-REFACTOR-01/cleanup-01.md) item 3 record.

**Suspect design 2.** I propose neither a hand-kept list of "whole-repository readers" nor a per-member list of
the paths its analysis consumes.
- A hand list goes stale silently.
- A consumed-path list asks each scanner to declare what the trace already observes.

Instead, every member's own trace classes each read, fresh at every C. No list is kept.

### 1.2 Mechanism: the walk form

For one traced run, `L` is the set of directories the run lists, the repository root included, inside the
repository and outside `node_modules`. Each compared read `(p, k)` is classified:

1. **Enumerated** under `d` when `d ∈ L` is a proper ancestor of `p`. Its *walk root* is the outermost such `d`.
2. **Walk root**: a listing of `p ∈ L` that has no listed proper ancestor.
3. **Named**: everything else.

The record changes as follows:

| Field | At B | Walk form |
|---|---|---|
| `reads` | digest of all compared reads | digest of `{named: sorted (path, kind), walks: sorted roots}` |
| `walks` | — | the sorted walk roots (new, readable) |
| `repository_read_changed` | every non-fixture read changed since the pin | named non-fixture reads changed since the pin (as today) |
| fixture reason | `changed test fixture read: <paths>` | named fixture paths, plus `changed test fixture read under walk: <root>` per root with any enumerated fixture read changed since the pin |

Enumerated non-fixture reads are not compared. `walks` states that the member reads its roots' content at C,
and is counted as changed by assumption: a superset label that needs no update. Fixture reads keep design 05's
`fixture_read` rule, which is unchanged. Enumerated fixture reads are still compared at the pin and at C.

### 1.3 Status is unchanged by construction

A member's status depends on its reads only through "some fixture read differs from the pin". Under the walk
form that set is non-empty exactly when it was non-empty before: named fixture differences are listed as
before, and enumerated ones raise their root's flag. `production_changed`, the closure and prefix checks, the
register and every other reason are untouched.

**Build self-check:** regenerate the table at B in both forms. The `by_status` counts and every non-read reason
must be identical. Only `reads`, `walks`, `repository_read_changed` and the wording of fixture reasons may differ.

### 1.4 Why T2-1 closes

**Addition.** Take a new path `X` that no member names.
- For each member, `X` is either not read, or enumerated under an existing root, or under `.`.
- New directories nest under existing roots. A walker that lists fixed roots does not list a new top-level
  directory. A walker that lists `.` already has root `.`.
- So `named` and `walks` are unchanged, and the digest with them.

**Fixture addition.** `X` can raise its walk's fixture flag only if it is a test fixture, and only if nothing
under that root had changed before. That is a real change to that member's fixture input, so the refusal is
correct. It happens once per (member, root), not on every addition.
- A `.test.ts` file is never a fixture.
- At B, every walker that enumerates fixtures (`ambient-reads`, `control-commits`) already carries the flag.

**Dependency change.** The census still reacts:
- the first change of a named read since the pin adds a label;
- the first change of a fixture read, named or enumerated, refuses the member;
- a run that starts or stops listing a directory changes `walks`;
- import-closure changes keep their existing rules.

Enumerated non-fixture reads are already labelled in full by `walks`, so no edit can make the stored record
understate them. This is my reading of "a real change to a path a member depends on still invalidates it";
§10 Q3 asks the check to confirm it.

**Trace limits** are unchanged and stay stated: reads outside `fs`, by native code, or in processes that drop
`NODE_OPTIONS` are not seen.

**Tool tests** (synthetic repository, as `test_preserved_tools.py` builds):
- adding an unrelated test file under a walk returns `revalidation_complete`;
- editing a named read returns `invalid` (preserved table differs);
- a first fixture change under a walk returns `invalid` with the walk reason;
- a removed listing returns `invalid`;
- two partition variants (everything named, everything enumerated) each fail one of the above.

The regenerated table at C must pass §1.3's self-check.

## 2. T2-2 — no fixture is written from an unclean tree

### 2.1 Today

- **`verify`** calls TOOLS-02A's `clean_payload` before and after every step.
- **`corpus` run on its own** does not. That is BINDING-01 cleanup item 2.
- **No supported writer exists.** BINDING-01 and COORD-REFACTOR-01 regenerated `adoption.json` with
  uncommitted ad hoc snippets that called `preserved_census`.
- **Git objects only:** `inventory`, `coverage`, `candidate`, `gate` and `mutations`/`cases` read only Git
  objects at their revision. The last two copy blobs into temporary trees, with digest-pinned `node_modules`
  files.
- **`requalify-value-cost.py`** archives its trees from Git, but reads registry and ledger files from the
  working tree. It writes K1.1-correction-03 evidence.

### 2.2 Mechanism

1. **`corpus` refuses** an unclean checkout at entry, with `clean_payload`. That is TOOLS-02A's definition of
   clean: HEAD is C, `git status` is empty, and no entry is untracked at C, ignored files and git-invisible
   directories included. Only `node_modules` and `.DS_Store` are allowed.
2. **New operation `regenerate --revision <C> --spec <adoption.json> [--write]`.** It is the only writer of
   derived adoption fields.
   - **Before computing, it refuses** an unclean tree.
   - **It computes** the census at C and writes three things:
     - the preserved table;
     - register entries carried across pure line moves (same file, same title, same `matched` claims,
       exactly one candidate), with their classification unchanged;
     - suite-target `declaration` positions whose full test path names exactly one leaf at C.
   - **It never writes** a classification, claim, credit, closure, origin state or reason text. It reports
     every other register or target difference for a human, and checks that no other byte of the manifest
     changed.
   - The operator then commits, and `corpus` revalidates the result.
3. **`requalify-value-cost.py` gets the same preflight** at HEAD.
4. **Writer census** (structural). A tool test lists every file under `scripts/` and `tests/tooling/` that
   calls a file-writing API (Python `write_text`, `write_bytes`, `open(…, 'w'|'a')`, `json.dump`; Node
   `writeFileSync`, `appendFileSync`, `createWriteStream`; test files excluded).
   - Each must appear in a declared table, either as a `fixture_writer`, which calls `clean_payload` before its
     first write, or as `temporary_only`, with a reason.
   - A new writing file fails the census until it is classed.

### 2.3 Why T2-2 closes

- **Every writer is caught.** The census forces every writing file into the table, and every fixture writer
  shares `verify`'s check.
- **Tool tests:** per fixture writer (`verify`, `corpus`, `regenerate`, `requalify-value-cost.py`), an untracked
  file, an ignored file and a git-invisible directory are each refused. TOOLS-02A's fixtures are reused.
  `regenerate` carries a pure move, refuses an ambiguous one, and leaves semantic fields byte-identical.
- **Registered refusal guards:** each new `require` gets one in `refusal-guards.json`, killed by the test that
  names it, so the refusal census passes.

## 3. T2-3 — target-set kills have provenance

### 3.1 Why frames cannot decide it

Owner choice 09 records that a production `AssertionError` built with `stackStartFn` shows only the target
file's frames. `name`, `code` and `message` can be set on any object. A reporter-side rule sees only the
serialized error, after process isolation. So no frame, name or field test can establish where an assertion
came from.

### 3.2 Mechanism: K1.1-correction-03 design 03's witness on the target route

The accepted value-cost evidence contract already establishes provenance by object identity. It consists of
`value-cost-witness.mjs`, `value-cost-source-policy.mjs`, and an in-process reporter.

- **Redirection.** A resolve hook sends `node:assert` and `node:assert/strict` to wrapper modules, but only
  when the importer is test-side.
- **Instrumentation.** A load hook tags each assertion call in test-side source with its site (module, line,
  column, expression). The site is taken from the AST, not from a stack.
- **Recording.** When an admitted call's real assertion throws, the witness records that object in a `WeakMap`.
  A call is admitted when it is not nested, its operands are plain data, and the intrinsics are clean.
- **Lookup.** The reporter runs in the same process, so it looks up the failing leaf's cause by identity.
- **Source policy.** Production sources import no assert module, name no `AssertionError`, and generate no code.

The target route changes in four ways:

1. **Process model.** `run_targets` runs each declared file in its own Node process, with
   `--import <target witness>` and the catalog reporter in that process. It no longer uses one `node --test`
   parent. Each file still runs in its own process, and the error object never crosses a process boundary.
   That is owner choice 09's requirement that the evidence survive isolation.
2. **Reporter.** `catalog-reporter.mjs` adds `witnessed` (the site) to a failing leaf only when the witness is
   loaded. Catalog and census runs therefore emit unchanged events.
3. **Kill.** A target-set mutant is `killed` only when every condition holds:
   - the control passes and reaches the edit sites, as today;
   - every expected target leaf fails with `testCodeFailure`;
   - its cause is witnessed;
   - the witnessed module is the target file or a test-side module;
   - the run's tree passes the source policy.

   The result records `killed_by: {target, site}`. Anything less stays `observed`, with today's categories
   (`survived`, `wrong_kill`, `uncovered`, `timeout`, `malformed`, `setup_error`, …) unchanged.
4. **Test-side rule.** The witness's test-side roots are hard-coded to `packages/{kernel,sdk}/tests`. For target
   runs, they generalize to any module under a `tests` path segment, which is `packet_tools.test_side`'s rule.
   The witness becomes a shared module parameterized by that predicate. `value-cost-witness.mjs` keeps its roots
   and behaviour, and the value-cost registry runs fresh at C and must pass unchanged.

### 3.3 How a production `AssertionError` fails it

1. **No witness entry.** It never passes through an instrumented test-side call, so it has no entry in the map.
   Whatever its frames, name, code or message, `witnessed` is null and there is no kill.
2. **Refused tree.** The source policy refuses a tree whose production code imports an assert module or names
   `AssertionError`. The run is then `setup_error`, even if a real test assertion also failed.
3. **Not admitted.** Nested assertions such as `assert.throws(() => assert.equal(…))`, async `rejects`, and
   non-plain operands, whose getters could run production code, are never admitted.

**Controls.** Synthetic tree, `test_runner_targets.py`:

| Control | Expected |
|---|---|
| M-real: a production value changes; the test's `assert.equal` fails | `killed`, with `killed_by` at the test line |
| M-helper: a test-side helper module's assertion fails | `killed` |
| M-forge-shape: production throws a plain `Error` with name `'Assertion'+'Error'`, code `ERR_ASSERTION` and the test's frames | `observed`, no kill. Today's classifier reports it as `assertion` |
| M-forge-frames: production throws a real `AssertionError` with `stackStartFn` | `setup_error` (source policy), no kill |
| M-policy: a real test assertion fails in a tree whose production names `AssertionError` | no kill |
| M-nested: an assertion failure caught by `assert.throws`, then a non-assertion failure | no kill |
| M-other-leaf: a real assertion fails in a non-target leaf | `wrong_kill` |
| Skip, todo, cancellation, timeout, malformed (existing) | no kill |

Variants of the kill predicate are each caught by one control: accepting an unwitnessed assertion-like cause,
skipping the source policy, and ignoring the target leaf.

**Scope.** `mutations.json` has no target-set case at B. T2-3 ships the mechanism and its controls; later packets
register target-set cases for P1-M. The witness's assertion vocabulary is design 03's, so 017 L-12 is unchanged.

## 4. T2-4 — the hold register matches current claims

### 4.1 At B

The register has 966 entries, and every one but one is `held`:

| Claim | Entries |
|---|---|
| V-ENV under owner choice 08 rule 1 | 891: 804 registrations and 87 cases |
| Proxy | 41 held, 1 superseded |
| V-D1 | 21 |
| re-prototyped-built-in | 12 |

Yet all four claims are released:
- **V-D1**, in its metered meaning with R1–R4, and **classification**, for the detectable kinds with every
  Proxy refused, by K1.1-correction-03 [hold release 01](../K1.1-correction-03/hold-release-01.md);
- **V-ENV, for the core only**, by BINDING-01 [hold release 01](../BINDING-01/hold-release-01.md). The wrapper
  is under L-01.

"853", in release 01 and 002 (BASELINE), is BINDING-01-era: at `a34d99da` and at B the count is 891.

**Scope, measured.** For 39 of the 53 register files, the production import closure contains
`packages/sdk/src/internal/value-capture.ts`, most of them through `harness.ts`. That gives this split of the
V-ENV registrations:

| Scope | Registrations |
|---|---:|
| Wrapper | 460 |
| Core | 304 |
| Unread (a child process in the run set) | 40 |

### 4.2 Mechanism

**Claims table.** Each claim gains a `status` (`held` or `released`), a `release` record and its `limits` (017
IDs). The tool fixes the release records, as `CATEGORY_DECISIONS` already fixes the category decisions:

| Claim | Release | Limits |
|---|---|---|
| V-ENV | BINDING-01 hold release 01, scope core | L-01 |
| V-D1 | K1.1-correction-03 hold release 01 | L-03–L-07, L-13 |
| Proxy | K1.1-correction-03 hold release 01 | L-09 |
| re-prototyped-built-in | K1.1-correction-03 hold release 01 | L-08 |

**New register class `limit`.** An entry observes behaviour that a 017 entry excludes from a released claim. It
names the claim, the limit and the release record. It is never credit.

**Classification.** This replaces owner choice 08 rule 1, and narrows owner choice 10 §2's coarse rule to the
scope that V-ENV still lacks.

1. **Scope**, mechanical and fresh at C:
   - `wrapper` when the key's production closure holds a module from the claims table's `wrapper` set. For a
     case, that is the closure of the JavaScript and TypeScript files it names or runs.
   - `unread` when its detector sites include `child-process`, `unresolved` or `parse`.
   - `core` otherwise.
2. **A V-ENV match in wrapper or unread scope** is `limit`: V-ENV, L-01, BINDING-01 hold release 01. This
   takes precedence over the entry's other claims.
3. **A V-ENV match in core scope** is `not_held`, with a reason naming hold release 01. A recorded reading may
   instead class it `limit` (L-01's pre-import precondition). I expect none.
4. **The remaining V-D1, Proxy and re-prototyped entries** get a per-entry reading: `not_held` when they observe
   the released claim, or `limit` for R1–R4, the L-08 kinds or wall-clock behaviour. Most fall under rule 2; at
   most 75 readings remain.
5. **`held`** needs a claim whose status is `held`. None remains, and the class stays for future holds.

**Checks**, in `corpus`, so at every `verify`:
- a `held` entry under a released claim is refused;
- a `limit` entry needs a released claim, one of its limits, that claim's release record, and an ID present in
  017's current register;
- a V-ENV match in wrapper or unread scope that is not `limit`, `held` or `superseded` is refused;
- `intrinsic_trace` keeps refusing credit at any detector key outside core scope.

**Cascade.**
- Preserved members of `limit` entries take status `limit`. `not_held` members are recomputed as `preserved` or
  `refused` by P1-P.
- `held_witness` records become `limit_witness` (limit members) or `behavior` (core members), keeping their
  required result.
- A complete origin whose closure then fails is moved to `pending_revalidation`, with a transfer record naming
  this design, and joins T2-5. That is the standing rule of K1.1-correction-03 owner choice 01.

**Expected volume.**
- About 304 core registrations become `not_held`. 81 currently held members have no other refusal reason and
  become `preserved`, each through a fresh P1-P check.
- About 500 entries become `limit`.
- 99 cases are classed by their closures.

**Current-claim edits** in the same commit:
- BASELINE's sentence "The 853 rule-1 held entries remain TOOLS-02 bookkeeping" becomes the result;
- 017 L-01's source cell gains this record.

**Why it closes:**
- No entry cites a released hold as active, by the first check.
- Core and wrapper are split by a mechanical scope.
- Credit still comes only from P1-P or P1-T at C, never from `limit`.
- All of it runs in `verify`.

## 5. T2-5 — origin triage

### 5.1 Suspect design 1

**Yes**, for the retired class, under four conditions:
1. Retirement earns no credit and closes no claim.
2. Every retired record carries a pointer the tool checks (§5.3). The audit therefore judges only whether the
   reading was right.
3. A declared sample audit with a declared bound (§5.5).
4. A retired origin later shown to hide a live counterexample reopens and becomes a corpus item (006 working
   principle 4).

The samples justify this. In design 05 §5.4, 36–43% of mentions carry no counterexample and 38% name existing
evidence. P1 closure spends anchors, targets and kills on each of them. Closed and extracted dispositions stay
under P1; scope B amends owner choices 04–06 for the retired class only.

### 5.2 Population at B

There are 1,516 open origins in 318 source files:

| Origins | State |
|---:|---|
| 1,312 mentions | `pending` |
| 82 artifacts and 1 addition | `pending` |
| 121 (98 artifacts, 17 mentions, 6 additions) | `pending_revalidation`, all transferred |

The 121 transfers come from TOOLS-01 owner choices 04, 05 and 11 (4, 40 and 3), K1.1-correction-03 owner
choices 01 and 02 (15 and 46), BINDING-01 (12) and COORD-REFACTOR-01 (1).

To these add any origin that §4's cascade reopens. The 26 families, with 415 member occurrences, belong to
pending artifact origins. By packet: K1.2-correction-01 733, K1.1 309, K1.2 262, K1.1-correction-01 80,
K1.1-correction-02 41, others 91. The 33 complete origins are not re-triaged.

### 5.3 Dispositions, classes and checks

| Disposition | State | Record | Checked by the tool |
|---|---|---|---|
| closed | `complete` | P1 closure links and context (existing `origin_closure`) | Existing checks. **New:** a linked counterexample must reach executable evidence: an unrefused target, a preserved member, a registry case, or a family with no pending member |
| extracted | `complete` | as closed, linking the new maintained test or case | As closed. The new test passes in `verify` |
| retired | `triaged` | `triage: {class, rationale, …}` | One class; non-empty rationale; class pointer resolves |

The retired classes are:

| Class | Meaning | Pointer, and its check |
|---|---|---|
| `not_a_counterexample` | No checkable input, operation and required result | none |
| `covered_elsewhere` | A maintained test or case at C asserts the same required result, with no P1 link recorded | `covered_by`: a leaf (file and full test path) that the catalog runs and passes at C, a registry case ID, or an origin closed or extracted here |
| `superseded` | The subject was replaced by an accepted later design | `decision`: a row of the superseding table, which is a path at C |
| `recorded_limit` (proposed, §10 Q2) | The required result is one a current 017 entry does not guarantee | `limit`: an ID in 017's current register |

**Superseding table.** Its initial rows:

| Decision | What it replaced |
|---|---|
| DESIGN-AUDIT-01 [decision-01](../DESIGN-AUDIT-01/decision-01.md) | Proxy acceptance, re-prototyped projection, the hostile in-process threat model |
| DESIGN-AUDIT-01 [decision-02](../DESIGN-AUDIT-01/decision-02.md) | Kernel live-object capture, replaced by a bytes core and an SDK-owned wrapper |
| BINDING-01 [design 01](../BINDING-01/design-01.md) with its [hold release](../BINDING-01/hold-release-01.md) | Core admission over live objects; the core serializer window |
| COORD-REFACTOR-01 [design 01](../COORD-REFACTOR-01/design-01.md) | Coordinator-local commit sites; the retired `control-commits` shape |
| K1.2 [decision-05](../K1.2/decision-05.md) | The wall-clock refusal-cost claim, replaced by the metered meaning |

A further row needs an accepted owner decision or accepted design at B. It is added in the commit of its first
use and is reviewed in the audit.

Retirement adds records only. No pinned file is moved, edited or deleted; `verification.json`'s preserve list
enforces it at C.

### 5.4 The triage rule, declared before any triage

Read the origin's **minimum context**, which is design 05's and TOOLS-01 P1's:
- an artifact: its whole file at its pin, and the sealed records it names;
- a fence: the fence and its enclosing section;
- a prose line: its paragraph or table row, its links one hop, and the member labels it names, resolved in the
  same packet's pinned records.

Then apply the **first** step that matches.

1. **S1 `not_a_counterexample`.** The context states no checkable behaviour, meaning no input or schedule,
   operation and required result of the system or of the evidence tooling. Examples: status, verdicts, policy,
   process, plans, counts, citations, command lists and their results, descriptions of a change. A line that
   only names a test or probe as evidence for a claim stated elsewhere is S4 or S5, not S1.
2. **S2 `superseded`.** The counterexample's operation or subject no longer exists, replaced by a row of the
   superseding table. Behaviour that moved but still exists is not superseded. For example, live-object capture
   now lives in the SDK wrapper, and is current there for V-D1 and classification.
3. **S3 `recorded_limit`.** A current 017 entry says the required result is not guaranteed: wrapper V-ENV (L-01),
   a hostile same-process caller (L-02), wall clock (L-03), R1–R4 (L-04–L-07), the L-08 kinds, and so on.
4. **S4 closed.** The required result is already bound by P1 evidence. Either:
   - an existing counterexample record that reaches executable evidence and matches its input, operation and
     required result (P1-G); or
   - for a transferred origin, its revision-2 mapping, which revalidates under P1-R at C.

   No new test code is written.
5. **S5 `covered_elsewhere`.** A maintained test or case at C asserts the same required result for the same
   input class, but no P1 link exists.
6. **S6 extracted.** Anything else: a counterexample to a current claim with no maintained test. Write the test
   or registry case in the owning suite, link it under P1 (a behaviour counterexample and a suite target, or a
   case), and close it as S4. A new test that fails at C means a product defect, and the work stops.

Three further rules apply:
- **Grouping.** Origins with the same counterexample (P1-G) share their disposition and pointer.
- **Mixed origins.** An origin carrying several counterexamples (D05-CHK-08) takes the most demanding of their
  dispositions, in the order S6 > S4 > S5 > S2/S3 > S1, and its rationale lists the others. For example, an A
  line that carries a prose-only variant, such as `review-08.md:303`, is triaged on the variant.
- **Families.** A family origin is triaged over its runner and members, with the same steps:
  - superseded, when its edit sites target removed code (the tool's applicability check at C is the evidence);
  - `covered_elsewhere`, when current registries or the complete-decision oracle mutate the same decision;
  - closed, only when every member has a P1-M route.

### 5.5 The audit: sample, seed and bound

**Independent audit**, by the reviewer at H:
- **Sample.** `random.Random(20261023).sample(sorted(retired IDs at C), 150)`. When fewer than 150 are retired,
  all of them.
- **Sampler.** A committed `tests/tooling/triage-sample.py` prints the sample. The reviewer may add a
  supplementary sample of its own, reported separately: the seed is public.
- **Unsafe error.** A retired origin that carries a counterexample to a current claim with no maintained test at
  C asserting its required result. The claim is current when it is neither superseded by a table row nor
  inside a current 017 entry. An unsafe error includes a `covered_by` that does not assert the result when
  nothing else does.
- **Bound: at most 3 unsafe errors in 150 (2.0%).**
  - With 3 errors, the one-sided 95% Clopper–Pearson upper bound on the true rate is 5.1%.
  - A true rate of 5% passes with probability 5.5%; random retirement, near 12%, essentially never passes.
  - With 4 or more errors, the brief's stop condition applies, and the owner chooses: re-triage the worst
    class, widen the sample, or accept.
- **Minor errors** are reported and the owner judges them. A minor error is a safe retirement with the wrong
  class or pointer.
- **Closed and extracted.** The reviewer also reads 10 closed origins (seed 20261024) and 10 extracted ones
  (seed 20261025) for relevance, all of them when fewer exist. The tool checks binding; reading checks
  relevance.

**Self-audit** by the implementer, before H, with seed 20261026 and n = 50. More than 1 unsafe error stops the
build before handoff and goes to the owner.

### 5.6 Volume and time (question 4)

These are estimates from design 05 §5.4's rates. I re-measure after the first 300 origins, triaged in source-file
order and not in sample order.

| Disposition | Mentions (1,329) | Artifacts and additions (187) |
|---|---|---|
| `not_a_counterexample` | 480–570 | 20–30 (records, command lists, policy) |
| `covered_elsewhere` | 450–600 | 50–90 (suite-mapped artifacts, families the registries cover) |
| `superseded` | 60–150 | 20–40 |
| `recorded_limit` | 30–80 | 5–15 |
| closed | 10–40 | 30–60 (transferred mappings that revalidate once §4 lifts core holds) |
| extracted | 20–60 | 5–15 |

**Time.**
- **Triage:** 1,516 origins read by source file, at 1–1.5 minutes each, is 3–5 days.
- **Closing:** 0.5–1 day, since S4 needs no new test.
- **Extracting:** 25–75 origins at 30–45 minutes each (test, target and anchors) is 1.5–5.5 days. If the
  projection exceeds 60, I stop and ask (§10 Q6).

**T2-1 to T2-4:** 4–6 days with CI. **The whole packet:** 10–18 days. Confidence is low for the extracted
class.

## 6. Transferred P3 items

| Item | Disposition |
|---|---|
| KC3-R3-CENSUS-01 | Closed by TOOLS-02A, integrated `af9e3b0e` |
| KC3-R3-RAW-02 | Build: the candidate checker runs `git diff --check` only over editable payload, excluding declared preserved and evidence paths. Tool test with a historical whitespace log |
| KC3-R3-CREDIT-03: eleven uncredited registrations and five C1 meanings | Unchanged under L-12. They assert while the test's own intrinsic replacement is live, which design 03's `clean()` refuses by design. Recorded in the report |
| BINDING-01 cleanup items 1 and 2; COORD-REFACTOR-01 cleanup item 3 | T2-1 and T2-2 |
| BINDING-01 cleanup item 3: the local bookkeeping-trace timeout | Proposed 017 entry L-16 (never in CI), §10 Q9 |
| CR1-R1-TOOLS-01 | Build: run the four dropped-field mutants over the behavioural suites, and record the named resulting-state killers in `state-owner-controls.json` |
| `design-01.md:488` wording (COORD-REFACTOR-01 review 02) | A sealed design note; no edit. The report records review 02 item 3 as its correction; no current claim rests on it |
| `kernel-landing-zone.test.ts:1200:9@deedd7950724` (owner choice 11) | After §4 its leaves are core scope, so its target can earn credit normally. Bound in T2-5, S4 |
| The 24 + 10 limited members | Resolved with their origins in T2-5 |

## 7. Accepted designs relied on

| Design | Fit | Note |
|---|---|---|
| TOOLS-01 P1-P census (design 05 §2.3) | Fit, except its read comparison form | T2-1 changes the form; status semantics are unchanged (§1.3) |
| TOOLS-02A `clean_payload` | Fit | Reused by every writer |
| K1.1-correction-03 design 03 witness and source policy | Fit | Reused; the test-side predicate is generalized for target runs only |
| Owner choice 09 | — | T2-3 is the design it asks for |
| Owner choice 08 rule 1; owner choice 10 §2 coarse rule | Fit only while V-ENV was held | §4 narrows them to wrapper and unread scope under hold release 01. I read brief T2-4 as authorizing this (§10 Q1) |
| Owner choices 04–06, per-origin P1 | Amended by scope B for the retired class | Closed and extracted stay P1 |
| `origin_closure` | Gap | A counterexample link needs no executable evidence. §5.3 adds that check. The 33 complete origins are checked against it at the first C, and any that fail are listed |
| `fixture_read` (a directory under `tests` counts as a fixture) | Over-inclusive, conservative | Unchanged |

**Research.** I read [Evidence tooling](../../research/2026-10-02-canonical-bytes-kernel.md#8-evidence-tooling-corpus-mutation-registry-simulation-coverage),
which is background only. It informs two choices:
- full fresh recomputation at every C, with no incremental reuse, which addresses the drift that Stryker and PIT
  report;
- a recorded `killed_by`.

**Third-party material:** none. TypeScript is already a pinned dependency.

## 8. Corpus to maintain

**Kept:**
- all 18 checks of the BINDING-01 and COORD-REFACTOR-01 composed verify;
- TOOLS-02A's clean-payload guard and tests;
- `mutations.json`, `refusal-guards.json` and `value-cost.json`, each `selected_cases_passed`.

**Added:**

| Criterion | New items |
|---|---|
| T2-1 | §1.4's five tests, and §1.3's status invariance on real data |
| T2-2 | Per-writer refusals, the writer census, `regenerate`'s move and semantic-field tests, refusal guards |
| T2-3 | The eight controls in §3.3, and the predicate variants |
| T2-4 | Refusals: a held entry under a released claim; an unknown limit ID; a wrapper match marked `not_held`; a wrapper detector key outside `limit`. Acceptance: a core match marked `not_held` |
| T2-5 | Refusals: unknown class; empty rationale; an unlisted decision; an unknown limit; a `covered_by` naming an absent or failing leaf or a retired origin; a hollow counterexample closure. Also sampler determinism |

## 9. Build, commits and verification

1. **Range 1, T2-1 and T2-2, ending at C1:**
   - tooling, tool tests and guards;
   - the preserved table, regenerated by `regenerate` in a fresh clone;
   - `verification.json`, modelled on COORD-REFACTOR-01's: base B; preserve every packet directory at B, plus
     this note and its check; `adoption` expects `revalidation_complete`.

   Before dispatch, in a fresh clone (`git clone --no-local`, `npm ci`, nothing untracked): `tool-tests`, both
   mutation registries (`mutations.json`, `value-cost.json`), and the full verify. Then
   `gh workflow run packet-verify.yml -f revision=<C1> -f spec=docs/development/work/TOOLS-02/verification.json`;
   record the run ID in progress and end the turn, without polling. The range is self-contained, so the owner
   may have it reviewed and integrated before the rest, for K1.3 (§10 Q7).
2. **Range 2, T2-3.**
3. **Range 3, T2-4,** with the cascade and the current-claim edits.
4. **Range 4, T2-5:**
   - the `triaged` checks and the sampler;
   - triage in batches by source packet (K1.1, K1.1-correction-01/02, K1.2, K1.2-correction-01, the rest),
     with progress after each batch;
   - extraction;
   - the P3 builds;
   - the self-audit.

   At the end, `adoption` expects `mappings_complete`.
5. **Final C:** fresh-clone verify, then one CI run. H then holds the 008 report and the sampler output;
   GPT-6 reviews it, including the audit.

**Layer 3:** none. This is evidence tooling with no protocol semantics, as in TOOLS-01. The only current-claim
edits are BASELINE's register sentence, 017 (L-01's source; L-16 if approved) and the 007 row.

**Stop and ask** in these cases:
- a product file would change: `packages/*/src` or a package manifest;
- a retirement would edit or delete historical evidence;
- the self-audit finds more than 1 unsafe error in 50, or the independent audit more than 3 in 150;
- the extracted projection exceeds 60;
- a new test exposes a product defect.

## 10. Questions for the design check

1. **T2-4's amendment.** §4 narrows owner choice 08 rule 1 and owner choice 10 §2 to wrapper and unread scope,
   because V-ENV is released for the core. Does brief T2-4 ("core entries are revalidated") authorize this, or
   does it need its own owner choice?
2. **A fourth class.** Should `recorded_limit` be a fourth retired class? The fallback is to fold it into
   `superseded`, citing the 017 entry's source decision. I recommend the class.
3. **T2-1's meaning of "invalidates".** As §1.4 states it: named and fixture reads react to their first change
   since the pin, and enumerated non-fixture reads are labelled by their walk as read and assumed changed.
   Accept?
4. **Moves in `regenerate`.** Should `regenerate` also carry register entries and suite-target declarations
   across pure line moves (§2.2)? I recommend yes: K1.3 will move held lines.
5. **Audit parameters.** Independent sample: n = 150, seed 20261023, at most 3 unsafe errors. Relevance samples:
   10 + 10, seeds 20261024 and 20261025. Self-audit: n = 50, seed 20261026, at most 1. Is that size acceptable
   for the reviewer's cost?
6. **Extraction cap.** Should I stop and ask when the extracted projection exceeds 60 origins?
7. **For the owner: early integration.** Should range 1 get an early review and integration so that K1.3 can
   start from it?
8. **Process model.** T2-3 runs each target-set file in its own in-process run, not under one `node --test`
   parent. No target-set case is registered at B. Accept?
9. **L-16.** Approve 017 L-16: "Local bookkeeping-trace case may exceed its 900 s child timeout under machine
   load. Acceptable: never seen in CI. Fix when: it appears in CI. Expected fix: raise the timeout or split the
   case (packet that hits it)."
10. **Count.** Note only: the register's rule-1 count is 891, not 853. BASELINE is corrected in range 3.
