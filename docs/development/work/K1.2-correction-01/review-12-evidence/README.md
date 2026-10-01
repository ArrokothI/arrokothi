# Review 12 evidence

Subject: K1.2-correction-01, contract revision 9, candidate H `4a917f8caac04e7d9861e0ec3638662d52f9d3ae`.

Reviewer: independent Codex desktop session, GPT-6 family according to session instructions; exact serving version unavailable. Date: 2026-09-29 UTC. Environment: Darwin arm64, Node v25.2.1, npm 11.6.2, TypeScript 5.9.3.

## Contents and provenance

- `source-H.tar.gz`: complete tracked source tree exported with `git archive` at exact H. Includes submitted reports, contracts, prior findings, scripts and immutable raw evidence. No dependencies or working-tree modifications are included.
- `base-to-H.patch.gz`: full `git diff --binary B H`, without hosted-output truncation.
- `correction-delta.patch.gz`: full previous-reviewed-H to H binary diff.
- `identity-integrity.json`, `prerequisite-ancestry.json`: local Git identity/scope/manifest checks, including all 551 manifest entries and seven compressed historical outputs.
- `independent-coverage.md`: coverage derived before the full implementation explanation was read, with the discovery-excerpt limitation stated.
- `reviewer-*.log`, `reviewer-fault-sweep.json`, `reviewer-fault-sweep.err`, `reviewer-poison/`: independent rerun output on exact H. Poison reports retain window/call digests, liveness and attribution counts for all four modes.
- `validation08-audit.txt`: inspection summary of submitted logs; this is not a claim to have rerun those commands.
- `*-search.txt`, `changed-files.txt`, `layer3.diff`, `latest-source.diff`: search and diff navigation artifacts. Search results are not semantic proof.
- `build-oracle-probe.py`, `oracle-probe.json`: exact candidate-classifier challenge described below.
- `scope-probe.mjs`, `scope-probe.json`: actual clean-runtime reachability and whole-view comparisons for 16 omitted fault-sweep paths.
- `verification.json`: final source archive, checksum, Git cleanliness and report checks.
- `MANIFEST.sha256`: SHA-256 of every evidence file except the manifest itself, relative to this directory. The outer deliverable manifest also hashes this manifest and all three review documents.

## Independent commands

The review clone was a full, separate clone at detached H with a copied dependency directory. Cwd for repository commands:

```text
/Users/rex-shih/Documents/Codex/2026-09-29/independently-review-the-submitted-arrokothi-candidate/work/review-source
```

Commands and exit status:

```text
npm run typecheck                                                    exit 0
npm test                                                             exit 0
node --experimental-strip-types --no-warnings packages/kernel/tests/sweep/fault-child.ts --summary
                                                                     exit 0
node --experimental-strip-types --no-warnings packages/kernel/tests/sweep/run-poison-sweep.ts --out <reviewer-poison directory>
                                                                     exit 0
npm run check:builder-docs                                            exit 0
node docs/development/work/K1.2-correction-01/check-records.mjs         exit 0
```

The full suite records 3,507 passes, no failures/cancellations/skips/todos. The fault JSON records 43,446 classified runs: 43,409 injected points and 37 no-fault repeats. It reports zero violations but has the limitations in ORACLE-01 and SCOPE-01. The poison suite records 1,445 passes in each of off/count/throw/reenter with no zone firings in the poisoned runs. See the review for the limits of these observations.

The read-only remote query observed:

```text
4a917f8caac04e7d9861e0ec3638662d52f9d3ae refs/heads/codex/k1.2-correction-01-activation-identity
a20d278185eaffc7f8b7489345a3624231ff6e6d refs/heads/main
```

This observation is recorded from the tool response, not a guarantee about future remote state. Normal sandbox DNS initially failed; an approved read-only query succeeded. No required access remained blocked.

## Reproduce the reviewer probes

Use a checkout or extracted archive at exact H with its declared TypeScript/canonicalize dependencies available. Let `/path/to/H` denote that source and `/path/to/evidence` this directory. Generate the oracle probe in a scratch directory:

```sh
python3 /path/to/evidence/build-oracle-probe.py /path/to/H /path/to/scratch/oracle-probe.ts
node --experimental-strip-types --no-warnings /path/to/scratch/oracle-probe.ts
node --experimental-strip-types --no-warnings /path/to/evidence/scope-probe.mjs /path/to/H
```

Both commands exited 0 in this review. The generated oracle probe uses candidate source unchanged, copies its exact classification branches and feeds altered observations to them. Its successful exit means the evaluator falsely accepts all three negative observations. It does not execute a mutated Kernel or demonstrate analyzer evasion. The reachability probe runs unchanged production code, asserts expected classifications and full views including exactly the expected refusal append, and injects no faults.

The full negative-control mutation collections were inspected in submitted logs and source, not rerun by this reviewer. Native Driver, live external E1, process death, public packaging and transferred V-D1 proofs were not run or claimed.

## Preservation

Keep this directory with `review-12.md`, `handoff-12.md`, `owner-note-12.md` and the outer manifest. The candidate's original records remain sealed inside the source archive and at the pinned repository revision. Corrections should create new records rather than edit these delivered findings.
