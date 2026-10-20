# TOOLS-02A — independent review 01

**Verdict: ACCEPT**, bound only to H `6e0a9b3d901d46b921e5c6243c65df3bbac386e4`.
No P0–P2 finding under the owner's specified gate; no additional P3 finding is raised.

## Identity, authority and scope

Reviewer: this Codex desktop session, GPT-6 per session instructions; the exact serving model variant
is not exposed. Review date: 2026-10-19, America/New_York. This is independent of the named implementer,
the Claude Code desktop session using `claude-opus-5-5`. No subagents were used.

Access: local repository objects and filesystem, shell, sandboxed writes, and authenticated `gh` artifact
download. The initial network-restricted download failed; the escalated download succeeded. No private
owner/implementer conversation was available. Recorded owner quotations and historical diagnoses were
not independently authenticated. This review does not claim access to the implementer's session.

- Repository/branch: `ArrokothI/arrokothi`, `claude/tools-02a-census`.
- B: `e391ceba26164d2b461dc4c374db65058903b23e`.
- C: `504fa5fb23b681e2715fcba97b98bcb456e778ee`.
- H: `6e0a9b3d901d46b921e5c6243c65df3bbac386e4`.

Applied the slice-audit skill, narrowed by the owner's explicit reading and execution scope. Read this
packet's release/brief/design, implementation report and verification spec; 006's “Evidence and
validation”; 017; and the permitted B..H changes, including this packet's 007 additions. No other
packet's history was opened. This changes development tooling, not Kernel, Runtime/Driver or deployment
semantics. No architecture expansion was needed.

The blocking gate was limited to concrete changed-tooling failures of pristine-checkout handling or
clean census values, and false current claims in the packet records or 007. Broader evidence-tooling
completeness was not an acceptance condition. The historical two-row diagnosis was not rerun.

## Candidate and diff checks

The supplied checkout was clean at H. H's parent is exactly C. C..H changes only
`docs/development/007-work-packets.md` and this packet's `implementation-01.md`.

The code diff adds `untracked_entries` and its `clean_payload` requirement. It derives tracked paths
and their parent directories from the requested Git tree, walks filesystem entries, prunes the declared
allowed names and Git metadata, and reports untracked entries including ignored content and otherwise
invisible directories. The existing HEAD/status checks remain. The tests cover the removed-example
directory, an ignored `.env`, the two allowed names, and a linked worktree's `.git` file.

The registry diff adds exactly `guard.clean_payload.c88434fec112f9e4`. A parsed comparison of the adoption
JSON finds exactly 21 changes, all `/preserved/<index>/reads`: 11 ambient-reads members and 10
control-commits members. No other field changes. The three temporary-directory changes use the system
temporary directory resolved through `realpath`; they introduce no dependency or production change.
See [diff evidence](review-01/diff-check.json).

## Validation

**Existing composed verify, independently retrieved.** Downloaded with
`gh run download 39349102418 -R ArrokothI/arrokothi --dir /private/tmp/tools02a-review-01-ci`.
The artifact's [run.txt](review-01/ci/run.txt) names C as both revision and HEAD, the requested packet
spec, and exit 0. The raw `verify.json` names C and says `checks_passed`. Its SHA-256 is
`b99ee6352a500f67c3ddd33c8e40d454f4231d337270fbb4c912af3dd068bdd5`, matching the report.
All 15 declared checks pass, as does the additional advisory area gate. Adoption reports
`revalidation_complete`; the new refusal mutant is killed with exit 17. The tool-test count is 613;
repository tests are 4,123 with zero failures, cancellations, skips or todo; archive tests are 4.
The recorded versions and start/end times agree with the implementation report.

The full verify was **not rerun**. Its downloaded bytes are preserved in
[verify.json.gz](review-01/ci/verify.json.gz), with [summary](review-01/ci/summary.json), stderr and
[reviewer extraction](review-01/ci-inspection.json). This is the permitted CI evidence for clean-C census
values, not a claim of a separate local census recomputation.

**Local checks.** Created a fresh local clone with `git clone --no-hardlinks --no-checkout`, then detached
it at C in `/private/tmp/tools02a-review-01-c`. Logs stayed outside that clone. Environment: Darwin arm64,
Python 3.14.6, Git 2.39.5 (Apple Git-154), and Node v26.10.0 for the final test/control/ablation runs.

| Check | Result | Evidence |
|---|---|---|
| `python3 -B -m unittest discover -s tests/tooling -p test_corpus_tools.py -v` | Exit 0; 34 tests, no skips; 14.211 seconds | [Test log](review-01/tool-tests.txt) |
| `python3 -B tests/tooling/check-refusal-registry.py` | Exit 0; 322 refusal checks, 322 registered mutations | [Registry log](review-01/refusal-registry.txt) |
| New guard's registered `python-probe.py` command | Exit 0; one test, reached and passed | [Guard runs](review-01/guard-runs.json) |
| Same command after exactly the registered single-check ablation | Exit 17; one test, reached and failed; expected kill | [Guard runs](review-01/guard-runs.json) |

The first test-file run inherited Node v25.2.1 and failed at the existing v26.10.0 floor: four errors and
two failures. Its [raw log](review-01/tool-tests-node25.txt) is retained. The compatible installed Node
was then selected via PATH and the same test file passed. This was an environment failure, not a
candidate finding. The first guard control also passed under Node 25; the final control and ablation
were both run under Node 26.10.0. The ablation runner restored the source in `finally`; the clone's
final Git status was empty. No other test suite or full mutation registry was executed locally.

## Criteria and disposition

| Criterion | Review result | Basis |
|---|---|---|
| T2A-1: reject non-pristine checkout entries, with the declared exceptions and useful error | PASS | Changed traversal/require inspected; relevant local tests pass; guard control passes and its exact ablation is killed; clean-C CI completes |
| T2A-2: exactly 21 clean-checkout `reads` values, no other fields | PASS | Structural JSON comparison plus the downloaded clean-C adoption result `revalidation_complete` |
| T2A-3: composed verify passes at clean C in Packet verify | PASS | Retrieved artifact identity, raw result, report digest, counts and environment agree |

No false current claim was established in the scoped packet records or 007 additions. Their review-ready
status does not self-certify acceptance. Broader TOOLS-02 work and the expressly excluded raw-evidence
and mutation-credit concerns remain DEFERRED to their existing owner-directed scope.

Third-party reuse by this review: none. No third-party source, tests or dependency were incorporated;
the evidence comprises this repository's CI output, local test output and reviewer-authored inspection
records. No implementation changes were made. This acceptance authorizes no merge, release, successor
packet or hold release. No commit was created.

Evidence inventory and reproduction notes: [README](review-01/README.md).
The [SHA-256 manifest](review-01/SHA256SUMS) covers this review and every preserved evidence file except
the manifest itself.

ACCEPT
