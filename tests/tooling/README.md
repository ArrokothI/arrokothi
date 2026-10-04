# Packet evidence tooling

TOOLS-01 uses Python 3, Git, a POSIX host and the repository's existing Node 26.10+ runtime.
Commands read exact Git commits; commit payload before selecting it. They report observations,
never acceptance, owner decisions or released claims.

## Commands

```bash
npm run test:packet-tools
npm run verify:packet -- inventory --revision <full-C-SHA> --spec tests/fixtures/packet-tools/inventory.json
npm run verify:packet -- corpus --revision <full-C-SHA> --spec tests/fixtures/packet-tools/adoption.json
npm run verify:packet -- coverage --revision <full-C-SHA> --spec tests/fixtures/packet-tools/coverage.json
npm run verify:packet -- mutations --revision <full-C-SHA> --spec tests/fixtures/packet-tools/mutations.json
npm run verify:packet -- mutations --revision <full-C-SHA> --spec tests/fixtures/packet-tools/refusal-guards.json
npm run verify:packet -- verify --revision <full-C-SHA> --spec docs/development/work/TOOLS-01/checks.json
npm run verify:packet -- candidate --payload <full-C-SHA> --head <full-H-SHA> --spec docs/development/work/TOOLS-01/verification.json
```

`candidate` reads its specification at C and checks B→C→H, the exact C..H file set,
preserved paths and accessible evidence digests. An administrative allowlist cannot establish
that prose contains no semantic change. Review that content independently. The current B is
main `f62527e8d564a6e2f63b83cbb52e24053f333540`; research, owner decisions 01–02 and
the archive-policy merge are base content. Historical catalog revisions stay pinned.

`inventory` checks 208 artifact/fence origins, 1,333 prose locations and eight final-review
additions against pinned source bytes. These are provenance records, not 1,549 tests.
`corpus` checks the separate adoption manifest. Since design 05 step 4 it is **format 2**
(contract revision 3; design 04's data model with design 05 §4's deltas). Every inventory origin
has one row with a state: `pending`, `pending_revalidation`, `triaged` or `complete`. The tables
`counterexamples`, `suite_targets`, `preserved`, `families`, `holds` and `areas` are present; each
later step defines its own and, until then, must stay empty, and no origin may claim closure. The
migration names the revision-2 (format 1) manifest by revision, path and SHA-256
(`0c1d57dd…`, blob `673b68ec…`). The 154 rows that manifest mapped (116 suite, 8 case,
30 non-executable) keep their old record verbatim under `legacy`, must equal it exactly, are
`pending_revalidation` (P1-R: no grandfathering) and cannot return to `pending`; the other 1,395
stay `pending`. `holds.claims` seeds the held claims with their owners and decision records
(V-D1, Proxy and re-prototyped built-ins with K1.1-correction-03; V-ENV with BINDING-01); a missing
decision file fails. The summary counts origins by state, revalidation by legacy status, and keeps
counterexamples, families, members, targets, preserved members and kills as separate counts.
A format-1 manifest stays readable for history with `target_verification: legacy_unverified`; it
reports `legacy_unverified`, never `mappings_complete`. `verify` requires `mappings_complete`, so
its summary stays `attention_required` while P1 remains open, even if every executed check passes.
No old result is imported as a current result.

The adoption manifest names its verification specification; in both formats its mutation registry
must be scheduled there as a required mutation run. In format 1, a suite command had to resolve to
a declared command with the same execution profile; that checked composition, not whether a command
exercised the assertions attributed to it. Those 154 revision-2 mappings (including the fourteen
delivery-boundary, coordinate, identity and host-member mappings, ten re-prototyped built-in recipes
and 21 historical manifest locators) are now pending revalidation, and a historical count is never
imported as a current result.

Unexecuted profiles use named `checks` with argv and a written reason. Historical memory/timing
commands name their source revision and any required environment: they require a separately
prepared checkout of that revision (`$ROOT` is its absolute path), not invocation against missing
archived paths in this checkout. Their maintained adapters and remaining semantic mappings are
still pending P1. The builder-docs entry records the owner's reported base failure; it is not a
passed check or a permanent waiver of any future packet requirement.

`coverage` uses the explicit domains in coverage.json. It lists full missing combinations,
including combinations that the current fixture cannot exercise. Stage and access form are
separate coordinates; pre-pin declaration currently runs at pre-pin stage and the other forms
at post-pin stage. The resulting absent cross-stage combinations are visible, not inferred away.
Ordinary pinned lexical shadowing is also an untried combination. Fixed dimensions have one value.
This manifest is a bounded model of the adopted families, not universal coverage of realm behavior.
Negative categories, closed-by-reading entries and reasons appear separately from kill counts.

## Declared environments and inputs

Every child process the tool starts gets a declared environment, never the caller's
(design 05 §4, contract F4). `checks.json` declares it once under `environment`: names passed
through when the caller has them (`pass`, default PATH, HOME and TMPDIR), values the tool sets
(`set`, default LANG=C.UTF-8; the tool also sets PYTHONDONTWRITEBYTECODE), and names that are
deliberately absent, each with its effect (`absent`). A registry may declare its own; the default
applies otherwise. Records list names and declared values only; inherited values are never
written. Inherited NODE_OPTIONS, NODE_TEST_CONTEXT, NODE_V8_COVERAGE, KERNEL_POISON_MODE,
PACKET_ORACLE_CHECK and ARROKOTHI_EVIDENCE_ROOT are contamination fixtures in
`test_environment_tools.py`.

`verify` refuses a Node below v26.10.0 under the declared environment and records the version.
Put the floor's `bin` first in PATH to verify on the floor itself.

The environment census (D05-CHK-10) scans every JavaScript or TypeScript file under
`environment.census.roots` at C, a superset of the selected tests and their test-side closures.
Each `process.env.NAME` or `process.env['NAME']` read must be passed, set, provided by an input
or declared absent. Any other `process.env` occurrence (a spread, a default argument, an
`env` import from `node:process`) must match a `computed` entry with its exact line text and a
reason; a stale entry fails. The scan is lexical: an alias of `process.env` that never spells it
is a stated gap.

`inputs` declares pinned inputs. The only kind is `git_snapshot`: `verify` extracts the named
revision outside the checkout with `git archive`, checks every path, entry kind and byte against
the Git tree, provides its directory under the declared environment name only to the steps that
list the input, verifies it again after the step and removes it. The archive tests' evidence root
uses archive.md's pinned fallback `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49` this way.

## Title catalog

A `checks.json` step may declare a `catalog` instead of `argv` (design 05 §4, D04-CHK-02): the package
script name, its exact text, its flags and its globs. `verify` refuses the step unless the text
equals both the rendering `node <flags> <globs>` and the package script at C, expands the globs over
the tree at C (a `*` stays inside one path segment, a dotfile needs a literal dot, `**` and braces
are refused, a glob matching nothing fails), and runs that argv once with two reporters: `spec` (the package script's own default) on stdout for
the step's counts, and `tests/tooling/catalog-reporter.mjs` into a temporary file for the
catalog. The repository and archive test steps are catalogs.

The catalog applies design 05 A1 per file: order and nesting come from `test:start`, kind from the
result's `details.type` (`test` or absent is a test, `suite` a suite, anything else refuses the
file), and each start pairs with exactly one result by file, line, column, nesting and name. A
missing pair, a duplicate key or a missing location refuses that file, not the run. A leaf is a
test pair with no child start; an empty suite and a test with subtests are not leaves. The
zero-match file-level pair is counted but never a leaf. Each pair's kind must also match the source
registration at its location (next section), or the file is refused. The step passes only when
every selected file reports, no file is refused and the summary counts equal the pairs.

## Source facts, reach and suite targets

`tests/tooling/source-facts.mjs` parses files with the digest-pinned TypeScript 5.9.3 subset in a
temporary copy (the same subset `mutations.json` pins); it never executes what it reads. It
recognises `node:test` registrations only through bindings imported from `node:test` (`test`,
`it`, `describe`, `suite`, hooks, their `.skip`/`.only`/`.todo`, a namespace import) and `<p>.test`
where `<p>` is a test callback's first parameter (D05-CHK-12); `pattern.test(line)` is not a
registration, and an alias such as `const register = test` is not recognised. It reports each
registration's kind, title (literal, template or computed), span, callback, parent and the location
Node reports (the callee's last name). Every catalog run now cross-checks each pair's kind against
the registration at its location; a mismatch refuses that file (A1).

A suite target in format 2 (P1-T) names its catalog command, file, full test path, declaration
line and column, one input anchor, its assertion anchors, optional operation anchors (in any file),
its relation (`exact_input`, or `authorized_replacement` with a decision) and its discrimination
(one registered mutation, or one reading trace). Each anchor is one statement, stored as text with
its SHA-256, and must occur exactly once in its file at C. `corpus` then checks, at a clean C:

- the file is in the command's own expanded selection, the declaration is a test registration (a
  `t.test` subtest is refused, A9), a literal title equals the path's last name, and the catalog
  has exactly one passing leaf with that path there;
- the input token at each recorded ordinal has the recorded value (`input_tokens_matched` means
  the token at that position, never input flow), or the input is declared `computed`; an input
  outside every test span is `module` scope, counted separately; one inside another test refuses;
- an anchor starting inside a string, template, regular expression or comment, an assertion inside a
  `try` block within the span, or one inside a function passed to `assert.throws`, `rejects`,
  `doesNotThrow`, `doesNotReject` or `.catch`, is `not_observable` (reading, counted), including
  through a same-file helper called there;
- reach: one run with the full path as `--test-name-pattern` and one no-test baseline
  (`--test-skip-pattern=.`), both under `NODE_V8_COVERAGE`. The reach run is valid only with exactly
  one leaf equal to the target, no failure event and matching summary counts (D05-CHK-02).
  `tests/tooling/reach-coverage.mjs` takes the innermost block range's count at each anchor's
  offset (an assertion at its assertion call's start, a throw guard at its condition), the rule of
  `coverageExecuted`; an anchor is reached when the run's count exceeds the baseline's. Every
  observable assertion anchor and every in-span input anchor must be reached;
- discrimination: a reading trace gives `target_reading`; a mutation must be registered with this
  counterexample as its `obligation` and mutate a file holding a cited operation anchor, and its
  qualifying kill of the target leaf runs with the target-set mutants (step 7) — until then it is
  `target_mutation_pending_execution`, never credit.

A target whose counterexample is held or superseded is refused outright (P1-H). A failed check is
reported with its reason and counted; it never becomes credit. Summaries count anchors bound,
reached and not observable, input tokens matched, computed and module-scoped inputs, and credit by
kind. Reach shows that a statement started, not that it compares the required value; a catch
outside the span or in a deeper helper can still mask a skipped assertion.

## Preserved closure and hold register

Format 2 now checks P1-P and P1-H at a clean C, from scratch, on every `corpus` run, over every
whole-file test origin (71 at the pinned inventory). `adoption.json` stores the results and `corpus`
requires them to equal the recomputation exactly. A stale record fails; it never stands in for one.

- **Hold register (P1-H).** `holds.register.recipes` gives each held claim a title, body and file
  recipe. Each recipe may widen design 05's minimum (an added `|` alternative, more files), never
  narrow it, and every P1-H claim stays in `holds.claims`. A body is the leaf registration's text plus
  the same-file and test-side helpers it references, followed transitively (a namespace import widens
  to every exported helper). The recipes are matched against every leaf registration in the preserved
  and target files, and the matches must equal `holds.register.entries`, each classified `held`,
  `superseded` or `not_held` with a reason. A held or superseded entry names its claim and turns a
  member into a witness record, never credit. A suite target on such a leaf is refused.
- **Run model.** `floor` names the floor record and its SHA-256. Its A10 result decides the run model.
  On v26.10.0 the order model does not hold, so every leaf counts as earlier, and so does every leaf in
  a file with a `concurrency` option. A command that does not run each file in its own process
  preserves nothing.
- **Prefix.** For a changed file, `source-facts.mjs` (`prefix`) aligns the pinned and current files
  as token sequences of load-time statements, registration heads, hooks and leaf callbacks. A
  span-identical member stays preservable only if every difference in its prefix is inert and
  unreferenced by live prefix code (design 05 §2.3 rule 4). Refused members record each blocking kind
  once per side, with its first line and how many more share it.
- **Reads.** One traced run per file, through `NODE_OPTIONS=--import=tests/tooling/read-trace.mjs`,
  must give the catalog run's leaf verdicts. Reads inside the repository, outside `node_modules` and
  outside the static import closure are compared at the pin and at C (bytes, listing or existence). A
  changed fixture (a non-module file under a test directory, or a listing of a `fixtures` directory
  under one) refuses the file. Any other changed read is labelled `repository_read_changed`. The
  record keeps a digest of the compared reads.
- **Helper closure.** Every test-side module the file imports statically, transitively, must be
  byte-identical, or covered by a counted `helper_reviews` record. A record is bound to its origin,
  its module and both blob IDs, covers the whole module, and applies only to literal titles. Changed
  production modules in the closure are labelled `production_changed`. `moves` records a file's
  current path, with its reason.

A preserved member claims the same test-side code, fixtures and assertion at C, not discrimination.
Members are keyed by pinned path, line, column and blob, and origins that share one are merged. The
summary counts members by status, the preserved labels and refusals by reason. Reads outside `fs`, by
native code, or in processes that drop `NODE_OPTIONS` are unseen. Registry cases are not yet in the
register.

## Families and target-set mutants

**Runner (F3, D05-04).** A mutant may list `edits` (two or more, applied atomically): every anchor
must occur exactly once in its file's original bytes and edits in one file must not overlap; otherwise
nothing is written and the mutant is `not_applicable`. A multi-edit key binds the ordered edits, and
single-edit keys are unchanged. A target-set case declares `targets` (node:test flags and files)
instead of `argv`, and runs under the catalog reporter in a temporary copy.
- Its control must pass every leaf, and each mutant's `expected_targets` (file and full test path)
  must be passing leaves there.
- The control also records V8 coverage, and a mutant whose edit sites the control never executed is
  `uncovered`.
- A mutant `killed` only when a leaf in its declared target set fails; `killed_by` names it. Any other
  failure is a `wrong_kill`, never a kill.
- A mutant's `discovery` field (one full-suite run's first failures) is reported as metadata with
  `credit: none`, and never decides a status.

**Families (P1-M, D04-CHK-03, D05-06, D05-CHK-06, D05-CHK-09).** `families` in `adoption.json` lists
each mutation runner and mixed origin (`role`). `corpus` recomputes each member list from the
runner's pinned bytes, never executing it. `source-facts.mjs` reads JS containers (`container`, `loop`)
with the pinned TypeScript subset, and Python's `ast` reads Python ones. The census kinds:
- `structural`: an array-literal container, plus top-level literal pushes, each element labelled by
  its first string or `id`. Every other top-level statement that mentions the container is classified
  `reads`, `modifies` or `adds`. An `adds` statement that is not a literal push must be claimed by a
  `generator`, or the census is refused.
- `generator`: the runner's own regex, carried verbatim in its text, applied to each input file at the
  recorded input revision. Its counts must equal the runner's count literal, and each generated
  member's label must name its site.
- `filter`: the runner's own regex over another family's container or lines. `inherits` takes another
  family's members. Both bind the source by the SHA-256 the runner itself checks.
- `python_ast`, `loop` (an inline `for…of` list) and `bindings` (named constants; the label must occur
  in the runner).
- `census: reading`, with its reason, counted separately.

Each count assertion the runner makes about a container (`.length` compared with a number) must be
declared and must equal the census.

Where the pinned tree holds a complete run output, `observed` names it by revision, path, SHA-256 and
the tree it ran at:
- the runner's bytes at that tree must equal the pinned origin;
- the output must name its command and tree;
- after a declared trailer, it must end with the runner's own summary, whose total must equal the
  census;
- the members named on its verdict lines must equal the census.

A partial output fails.

Members carry a key, an optional `reuses` link to the same member of another family, and a route.
The route is `pending`, `mutation` (a registered mutant whose `obligation` is `family#key`),
`witness`, `no_longer_applicable`, `equivalence`, `survivor` or `limit`. Only a mutation route can
later earn a kill, and that kill comes from the registry run, not from the corpus. The summary
counts, per role, families, census readings, occurrences, inherited, reused and distinct members,
and routes.

## Isolation, inputs and identities

`mutations` copies registered ordinary files into a new temporary directory for every control,
mutant and sampled repeat. It executes argv without a shell and bounds process duration/output.
It never patches the shared checkout. Existing TypeScript 5.9.3 and canonicalize 3.0.0 dependency
subsets are checked against package-lock.json, versions and individual digests before use; their
license/notice files travel with the temporary copies. No dependency is installed or vendored.
The commands are trusted repository fixtures, not physically contained hostile programs.

Cases have semantic names and stored literal values, bytes or explicit construction recipes.
A source-defined literal test is referenced by its file and named assertion. Realm cases store
argv and expected observations. Inputs are not reconstructed from generator seeds. A future seed
may be troubleshooting metadata only, accompanied by generator version and commit.

Identity, work-charge and realm adapters read the registry data directly. The older realm-cases.json
is retained as the provenance snapshot for the first extraction; it is not a second execution input.
Regression tests change stored values, expected bytes, recipes, expected counts and realm argv to
verify that the adapters consume them.

Case content keys bind name, assertion, argv and input. Mutation keys bind file, exact source
anchor, operator and replacement. Line numbers and enumeration order are not identities. A unique
anchor may move without changing its key; an edited or ambiguous anchor reports `not_applicable`
with its match count. One content-identical mutant may run against several separately named cases;
the result's identity is the case/mutation pair. Historical revision/line provenance IDs remain
unchanged, separately from these executable identities.

## Results and negative controls

| Result | Meaning |
|---|---|
| `killed` | Passing control, unique replacement, reached fixture and named independent assertion failure with the declared exit. `killed_by` names the first failing assertion/test. |
| `survived` | Applied and reached; the assertion still passes. |
| `uncovered` | The fixture did not establish reach. |
| `not_applicable` | Zero or multiple anchor matches; explicit stale/ambiguous result. |
| `invalid_baseline` | The control did not produce a passing reached observation, or its sampled repeat changed. All dependent mutants lose kill credit. |
| `setup_error` | Runtime start, import, syntax, compilation, harness or observation-protocol failure. Invalid execution, never a kill. |
| `timeout` / `output_limit` | Declared resource bound exceeded; no kill credit. |
| `nondeterministic` | A sampled fresh-process repeat changed the structured outcome; any earlier kill credit is removed. |

Fixtures emit one JSON observation with case, assertion, boolean reached/passed and optionally
an ordered list of named failures. Passing exit is 0; assertion failure uses failure_exit.
Setup errors must escape the observation adapter. The Node test reporter accepts assertion
failures only. The Python adapter accepts unittest assertion failures only; errors, skips and
wrong test counts invalidate the run. A malformed-input test can assert that a tool boundary
returns its declared CheckError rather than an accidental IndexError/KeyError; that is a named
boundary assertion, not a harness crash promoted to a kill.

The refusal registry pairs every `require` call in packet_tools.py with a malformed input and
removal mutation. check-refusal-registry.py reconciles the whole finite set and refuses stale or
empty registration. registry-check.mjs reconciles all 29 complete-decision comparisons with their
negative controls. Realm observations have deliberate corrupt-observation controls; removing the
comparison makes those tests red. Held witnesses carry a structured claim with owner, decision and
reason. `witnesses` reports reproduction separately with `semantic_credit: none`; assertion kills
validate the observation checker, not the correctness of the behavior it observed. BINDING-01 owns
V-ENV. K1.1-correction-03 owns Proxy and re-prototyped built-in refusal and V-D1. Current Proxy `{}`
acceptance and built-in observations are superseded behavior pending that packet, never passing
policy expectations. The N15 surplus-charge witness checks exactly 4,049 visits for its stored
recipe; it establishes no general cost bound and releases no V-D1 hold.

Determinism samples are declared by case ID in each registry. Both control and mutant are rerun
in fresh processes; compare structured observations, including counts and first named failure.
This detects sampled flakiness, not all nondeterminism. Clean-C verification runs every declared
step again, checks source cleanliness around commands and records versions, argv, exits and counts.
Repeated stale sites keep `not_applicable`; repeated setup/timeout/output failures keep their invalid
execution categories. Agreement between two invalid runs never grants a kill. If a control changes
on repeat, `observed_status` preserves the earlier mutant observation for diagnosis while its counted
status becomes `invalid_baseline` and its `killed_by` field is removed.

CLI exit 0 means the selected facts/checks passed; 1 means attention is required; 2 means invalid
input or failed fact checking. Closed-by-reading/waived entries require reasons and never count as
kills. Live-provider and large-memory/timing profiles remain explicitly not run under owner choice
01. Pending P1/P2 work is in the adoption manifest and the packet's implementation report.
