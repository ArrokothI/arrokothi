# Packet evidence tooling

Research-independent TOOLS-01 foundation. Python 3, Git and a POSIX host are required; the
registered identity fixture also uses the repository's existing Node 22.9+ runtime. No additional
dependency is installed. Commands operate on exact Git commits, so commit payload before selecting
it. They do not inspect uncommitted source as though it were that commit.

## Commands

```bash
npm run test:packet-tools
npm run verify:packet -- inventory --revision <full-commit-SHA> --spec tests/fixtures/packet-tools/inventory.json
npm run verify:packet -- mutations --revision <full-commit-SHA> --spec tests/fixtures/packet-tools/mutations.json
npm run verify:packet -- candidate --payload <full-C-SHA> --head <full-H-SHA> --spec docs/development/work/TOOLS-01/verification.json
```

`candidate` reads the specification from C and checks B→C→H, exact C..H files, declared preserved
paths and accessible evidence digests. An administrative file extension/allowlist does not prove
that its content contains no semantic change. Review that content independently. This command
verifies no owner message, independent verdict, command execution or remote push.

`inventory` verifies the pinned historical source bytes/fences and prose locators. It assigns
stable origin IDs and reports every origin's pending adoption. The initial input has 208 artifact
entries, 1,333 prose locations, seven final-review executable sources and one policy-only intake
record. These 1,549 origins are not 1,549 runnable tests. A `provenance_verified` result never
means complete corpus adoption; `full_corpus_complete` is explicitly false in this foundation.

`mutations` copies only the registered ordinary source files from the selected commit into a new
temporary directory for each control/mutant. It runs the argv without a shell, with process-group
timeout and output limits. The identity fixture needs no node_modules. A later fixture requiring
dependencies needs an explicit reproducible adapter; this runner does not install or silently use
an unpinned node_modules tree.

The runner executes trusted reviewed repository code. Temporary copies protect source artifacts;
they do not prevent a malicious command from accessing ambient host files or network. No physical
containment is claimed. Each fixture runs in a fresh process, including its control.

## Mutation results

| Result | Meaning |
|---|---|
| `killed` | Control passed, source replacement applied once, fixture reached the tested code and its named independent assertion failed with the declared failure exit. |
| `survived` | Applied and reached; assertion still passes. |
| `uncovered` | Fixture says the mutated case was not reached; no kill credit. |
| `not_applicable` | Mutation matched zero or multiple sites. |
| `invalid_baseline` | The original control did not establish a passing, reached observation. |
| `setup_error` | Runtime start or result protocol failed, including unrelated module/compiler errors. |
| `timeout` / `output_limit` | Execution exceeded a declared limit. Neither automatically counts as a kill. |

Fixtures print exactly one JSON object with `case`, `assertion`, boolean `reached` and boolean
`passed`. Passing exit is 0; failing exit is the case's `failure_exit`. Reach/assertion witnesses
come from reviewed fixture code; the format itself cannot prove their truth. The first fixture
uses literal expected identity strings rather than asking the mutated implementation for expected
answers. Registry mutations of test or oracle code require their own independent observer.

CLI exit 0 means the requested facts checked or all selected mutations killed. Exit 1 means a
mutation result needs attention. Exit 2 means an invalid specification/source or a failed fact
check. None of these codes is packet acceptance.

## Remaining TOOLS-01 work

See [contract P1/P2](../../docs/development/work/TOOLS-01/contract.md). Semantically map the
historical origins into maintained cases/current suites, preserve held witnesses, adopt the
complete-decision oracle and its negative controls, and compose full packet verification. Do not
retire hostile cases or the analyzer before their separately accepted replacement. The current
one-case registry validates the runner foundation; it does not stand in for that corpus.
