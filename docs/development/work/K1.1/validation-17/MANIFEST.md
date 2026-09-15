# Validation manifest — K1.1 round 17 (single branch, one retained doc file, fresh C13)

**Payload C13:** `98d6cebcd5861e42c843fab65516829c8818bff8` (merge of H16 records `41dd2fb`
and owner imp `e94ee6b`; contract revision 5 unchanged). C13 differs from C11
`f117e6b47c4930af6735aaa3668b8b4c242fd76d` by exactly 54 paths: 53 packet-admin records
plus the single declared retained file `mental-model/driver.md` (owner-directed frozen docs
iteration, byte-identical to the imp blob `28d24710e76a6232ddbd8371362a57f782170ef1`).
Nothing differs outside `docs/` and `mental-model/`; the `mental-model/` delta is exactly
that file; zero `packages`/`tests`/`scripts` bytes differ. No Kernel source, test, fixture,
evaluator, threshold, configuration or contract change exists in this round.
**Candidate:** H17, the commit on the single packet branch
`codex/k1.1-create-reserve-async-dispatch` containing the round-17 report.
**What this round corrects:** convergence of the owner's mid-round `imp` push with the
unification line, retaining the docs at the tip by explicit owner direction ("make sure that
it survive in the branch") under review-13's retained-payload path (named, justified, fresh
C, validated on the exact tree). K11-R10-EVID-01 stays closed on the retained round-14
mechanism; K11-R12-ID-01 stays closed; review-13's C1–C10 semantic PASS on the
code-identical tree stands as history but is explicitly not claimed as binding until fresh
independent review of H17.

## Provenance (fresh rerun on the exact new payload, nothing carried over)

Every log below was **regenerated in a detached worktree `/tmp/k11-c17-validation` at exactly
C13** (`git rev-parse HEAD` = `98d6cebcd5861e42c843fab65516829c8818bff8`,
`git status --short` = only `?? node_modules`, a symlink to the main checkout's install), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64. Generation ran under
`set -euo pipefail` via `/tmp/k11-c17-gen.sh`: any red control, unrejected ablation, moved HEAD,
dirty tree, lineage failure, parentage failure or retention-shape failure aborts before any
candidate exists. Prior `validation-01/.../16` logs are inspected history, never this
candidate's reruns. The ablation rejecting case-name sets below were mechanically compared
against the sealed round-14 record (identical modulo timing suffixes).

**Lineage timing honesty:** `01` records C13's two parents (H16 `41dd2fb`, imp `e94ee6b`),
proves both are ancestors of the validation checkout, proves the effective `C11..C13` range
names exactly the 54 known paths with nothing outside `docs/`+`mental-model/`, proves the
`mental-model/` delta is exactly `driver.md` byte-identical to the imp blob, proves zero
`packages`/`tests`/`scripts` bytes differ, and lists `C11..HEAD` commits. At log time the
round-17 H commit is not yet cut; `00` (scope guard) verifies the staged H17 attachments
against the allowlist before the commit, and the handoff re-verifies `C13..H17` and `C11..H17`
after the push.

## Contamination guard (round-17 form)

`00-candidate-scope-guard.log` captures `/tmp/k11-c17-scope-guard.sh` run after `git add` of the
H17 attachments and before the commit. The guard asserts against live Git state: (a) worktree
tip is exactly C13 with exactly the H16+imp parents; (b) committed `C11..C13` equals exactly
the 54 known paths (byte-exact sorted comparison against the embedded list reproduced in
`01`); (c) nothing differs outside `docs/` and `mental-model/`; (d) the `mental-model/` delta
is exactly the retained `driver.md`, byte-identical to the imp blob; (e) zero
`packages`/`tests`/`scripts` bytes differ; (f) every staged path is inside the 14-path H17
attachment allowlist (007 row, implementation-17, MANIFEST-17, eleven logs); (g) the worktree
holds only staged entries plus the `node_modules` symlink and the guard's own pending log. Any
violation aborts nonzero with no PASS line. Staging the guard log after its own PASS adds
exactly one allowlisted path, so compliance is preserved by construction.

## Results

| Log | Command | Exit | Result |
|---|---|---|---|
| `00-candidate-scope-guard.log` | scope guard (above) | 0 | PASS: 54 known paths; sole delta is retained driver.md; staged is attachments only |
| `01-tree-and-environment.log` | lineage + environment + zone inventory | 0 | HEAD=C13; B ancestor; H16+imp parents proven; 54 paths; 11 files / 17 exports; `observed count: 11` + PASS |
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
HEAD still C13, status back to `?? node_modules`) before the next.

**Implementer-only auxiliary probes (mechanism verification, not candidate evidence):** the
retained inventory gate re-probed in `/tmp` against the same C13 worktree — true gate exits 0
with `observed count: 11`; expectation altered to 10 exits 1 with no PASS; count assertion
against a 12-line list exits 1 with `observed count: 12`. No repository mutation; disclosed so
the reviewer need not trust the gate unexercised.

**Checks not run, and the resulting limits:** `npm run test:evals` was not run (006 requires it
for Agent behaviour; no round-17 tree operation touches any Agent, model path or eval
fixture). No process-kill run (no persistence/process-failure claim). No native Driver,
packaging or release check. Nothing here supports a durability, isolation, native-fidelity,
release or E-gate claim. External fixture / gate / decision: none prepared, none executed, none
claimed; E0–E6 are the benchmark repository's.

## Digests (SHA-256 over the exact staged bytes)

- `00-candidate-scope-guard.log`: `3950b219f41c50e4a3b3252f5d214d4549bee4ee42fdffcd24b4f6d5783053d9`
- `01-tree-and-environment.log`: `be849e0360b496b3aa377040ef8821fad61e71c1ba958eefd8e47e4bc6e53a51`
- `02-typecheck.log`: `5ee874308ff351a4f0c91877e58af37aa6af314ee6b2e0c6772de50a272b3d44`
- `03-test-full.log`: `01550c6058117cc5a680728c24ea2ae88d58c05ac0b8c84a75aeb44c73a89a5e`
- `04-test-conformance.log`: `393766fc01813cebb03c69be66c464ba189d74e8d8834d08ed94476e4a41595f`
- `05-check-builder-docs.log`: `67c7d355007cbd5dcd262043220cdf27751b14050a38930a1a00de7d4fae34b6`
- `06-test-kernel.log`: `8acb062c6622b1109d7cf7000d45b339c03f54eb807eee6b6531071ed44b9104`
- `07-test-sdk.log`: `4c330e8fea8e127fd733a2e048ff53afeb84e2905084c795960811f535e0a988`
- `08-architecture-suite.log`: `8cb95eeab046876508838ef455bd71034415663749d1a9eca9a3062ec343d435`
- `09-k1.1-case-inventory.log`: `b895f10b0662a7444159e037d6e8267299a1c67262c3d7fe13e31d3c7808e01f`
- `09b-distinguishing-ablations.log`: `d387335decae81aa6cdec937a3635b89539694a1e6c3f34442f16340436b9727`

Every token above was programmatically compared against a fresh SHA-256 recomputation over the
exact staged file (64-hex length-checked) before the H commit; the procedure is re-runnable by
the reviewer rather than trusted.
