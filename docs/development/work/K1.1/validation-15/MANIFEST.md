# Validation manifest — K1.1 round 15 (scoped candidate after K11-R14-PROC-01)

**Payload C11:** `f117e6b47c4930af6735aaa3668b8b4c242fd76d` (unchanged semantic payload: K11-R12-ID-01
ownership correction; contract revision 5 unchanged).
**Candidate lineage:** new scoped branch `codex/k1.1-create-reserve-async-dispatch-scoped`, cut at
review-12 `9d5256ebabf218a5ba11552326d0ec93bce10858`; the round-15 H commit on that branch is the
candidate. The contaminated branch `codex/k1.1-create-reserve-async-dispatch` (through review-13
`45402e0837b303a5724314f5d5f2721a6da6f257`) is preserved untouched and is NOT this candidate's
lineage.
**What this round corrects:** exclusively K11-R14-PROC-01 (P1, exact-candidate contamination of H14
by the merged `doc-improve` mental-model payload). K11-R10-EVID-01 stays closed on the retained
round-14 evidence mechanism; K11-R12-ID-01 stays closed; no Kernel source, test, fixture,
evaluator, threshold, configuration or contract change was made.

## Provenance (fresh rerun, nothing carried over)

Every log below was **regenerated in a detached worktree `/tmp/k11-c15-validation` at exactly C11**
(`git rev-parse HEAD` = `f117e6b47c4930af6735aaa3668b8b4c242fd76d`, `git status --short` = only
`?? node_modules`, a symlink to the main checkout's install), on Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3 / Darwin 25.6.0 arm64. Generation ran under `set -euo pipefail` via
`/tmp/k11-c15-gen.sh`, so any red control, unrejected ablation, moved HEAD, dirty tree or
lineage-exclusion failure aborts before any candidate exists. Prior `validation-01/.../14` logs
are inspected history, never this candidate's reruns. The sealed round-14 logs remain committed
on the preserved branch as that round's record; the ablation rejecting case-name sets below were
mechanically compared against them (identical modulo timing suffixes).

**Lineage timing honesty:** `01` records the scoped branch tip as review-12 `9d5256e` because the
round-15 H commit is cut only after staging; it proves the four contamination commits
(`ddf24de`, merge `620954d`, H14 `6eaccb4`, review-13 `45402e0`) are NOT ancestors of the scoped
lineage, that review-12 IS, that `C11..scoped` is exactly the 14 known admin files, and that no
`mental-model/` delta exists there. `00` (scope guard) then verifies the staged H15 attachments
against the allowlist before the commit; the handoff re-verifies `C11..H15` after the push.

## Contamination guard (new in round 15)

`00-candidate-scope-guard.log` captures `/tmp/k11-c15-scope-guard.sh` run after `git add` of the
H15 attachments and before the commit. The guard asserts against live Git state: (a) worktree tip
is review-12; (b) committed `C11..HEAD` equals exactly the 14 known H13/review-12 admin files
(byte-exact sorted comparison, not a subset); (c) every staged path is inside the 14-path H15
attachment allowlist (007 row, implementation-15, MANIFEST-15, ten rerun logs, this guard log);
(d) no `mental-model/`, `packages/`, `tests/`, `src/`, `scripts/` or `benchmarks/` prefix appears
in either set; (e) the worktree holds only staged entries plus the `node_modules` symlink and the
guard's own pending log. Any violation aborts nonzero with no PASS line. Staging the guard log
after its own PASS adds exactly one allowlisted path, so compliance is preserved by construction.

## Results

| Log | Command | Exit | Result |
|---|---|---|---|
| `00-candidate-scope-guard.log` | scope guard (above) | 0 | PASS: 14 known admin files; staged is attachments only |
| `01-tree-and-environment.log` | lineage + environment + zone inventory | 0 | HEAD=C11; B ancestor; full C/H ancestry to C11; scoped tip=review-12; 4 contamination commits excluded; 11 files / 17 exports; `observed count: 11` + PASS |
| `02-typecheck.log` | `npm run typecheck` | 0 | clean |
| `03-test-full.log` | `npm test` | 0 | 2,279 tests, 346 suites, 0 fail, 0 skipped |
| `04-test-conformance.log` | `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `05-check-builder-docs.log` | `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| `06-test-kernel.log` | `npm run test:kernel` | 0 | 221 tests, 45 suites, 0 fail |
| `07-test-sdk.log` | `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `08-architecture-suite.log` | architecture TAP | 0 | 362 tests, 37 suites, 0 fail |
| `09-k1.1-case-inventory.log` | packet TAP inventory | 0 | 221 tests, 45 suites, 0 fail, every case named |
| `09b-distinguishing-ablations.log` | control + 8 one-behaviour ablations | 0 | control green (221/0); **8 of 8 rejected** |

**Ablation rejection sets** (parsed `ℹ fail` per ablation; rejecting `✖` case-name sets verified
identical to the sealed round-14 record modulo `(Nms)` timing suffixes): XA 11, XB 6, X1 15,
X7 14, X3 3, X4 2, X8 9, **X9 26** — X9 still rejects the reintroduced coordinator-global
sequence, preserving the K11-R12-ID-01 closure. Each ablation reverted (`git checkout -- .`,
HEAD still C11, status back to `?? node_modules`) before the next.

**Implementer-only auxiliary probes (mechanism verification, not candidate evidence):** the
retained inventory gate re-probed in `/tmp` against the same C11 worktree — true gate exits 0
with `observed count: 11`; expectation altered to 10 exits 1 with no PASS; count assertion
against a 12-line list exits 1 with `observed count: 12`. No repository mutation; disclosed so
the reviewer need not trust the gate unexercised.

**Checks not run, and the resulting limits:** `npm run test:evals` was not run (006 requires it
for Agent behaviour; C11 and this administrative round touch no Agent, model path or eval
fixture). No process-kill run (no persistence/process-failure claim). No native Driver,
packaging or release check. Nothing here supports a durability, isolation, native-fidelity,
release or E-gate claim. External fixture / gate / decision: none prepared, none executed, none
claimed; E0–E6 are the benchmark repository's.

## Digests (SHA-256 over the exact staged bytes)

- `00-candidate-scope-guard.log`: `bc66b4f8455ad80f5a663f4f3e26d3c59ff4ef08dfddcebde5e3e8392b2a0fa7`
- `01-tree-and-environment.log`: `d2029a1e3d59b85ec52c88eac2a4edcd42dd3d7be056fab36855f439aeedba82`
- `02-typecheck.log`: `5ee874308ff351a4f0c91877e58af37aa6af314ee6b2e0c6772de50a272b3d44`
- `03-test-full.log`: `28ae65c3551b45e737ff096b3b30c39f71c1f1a7710590e08af93b48feabdf3c`
- `04-test-conformance.log`: `ce4c651dd87d72806694cd84e7c9f2645b59f15fccace1eeafc868da4b70cbf3`
- `05-check-builder-docs.log`: `67c7d355007cbd5dcd262043220cdf27751b14050a38930a1a00de7d4fae34b6`
- `06-test-kernel.log`: `85f1430d723928882f3f7c77fd2e2f95212002bc4e144e90a1011859bd281904`
- `07-test-sdk.log`: `986b918674163ed032eb14ba68b1ab87df8de34742db046b3c13f2bea8399ec3`
- `08-architecture-suite.log`: `501522d78f6e41f629ca50fc8bfac223eeb8408bc85234ebaf9669a0a30b58c6`
- `09-k1.1-case-inventory.log`: `8a9741f29c43f99bfbc8d2345407ae6dddf627f8097c6c6f6acf2debcde93820`
- `09b-distinguishing-ablations.log`: `c9e3cd3e00c0bc52e5d545543dd3bd730750f0a071179cc34ea50d82c8a01feb`

Every token above was programmatically compared against a fresh SHA-256 recomputation over the
exact staged file (64-hex length-checked) before the H commit; the procedure is re-runnable by
the reviewer rather than trusted. `02`/`05` reproduce their round-14 digests bit-for-bit, as
unchanged tooling on an unchanged tree requires.
