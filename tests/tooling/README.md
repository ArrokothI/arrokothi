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
`corpus` checks the separate adoption manifest. Every origin has a disposition and reason;
unresolved entries stay pending. A complete mapping alone would still establish no execution.
The current manifest is partial, and `verify` deliberately requires `mappings_complete`:
its summary stays `attention_required` while P1 extraction remains open, even if all executed
checks pass. No old result is imported as a current result.

The adoption manifest now names its verification specification. A suite command must resolve to
a declared argv command in that specification, with the same execution profile; the corpus's
mutation registry must be scheduled as a required mutation run. The summary reports each suite's
command, profile and required/not-run status. This checks composition, not whether a command's
implementation actually exercises every assertion attributed to it; reviewers still inspect the
source mappings. The current intake has 154 mapped origins and 1,395 pending origins. This includes
the remote session's fourteen inspected delivery-boundary, coordinate, identity and host-member
mappings, ten re-prototyped built-in recipes from one historical script, and 21 individually
inspected historical manifest locators. Distinct battery definitions in those manifests remain
pending; a historical count is never imported as a current result.

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
