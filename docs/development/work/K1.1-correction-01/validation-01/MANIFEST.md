# Validation manifest — K1.1-correction-01, round 1

**Payload C:** `b898ae12f51917c48fef92496ca179773c7744d9` (correction branch `codex/k1.1-correction-01-review-findings`; contract revision 1). All logs regenerated in detached worktree /tmp/k11c01-validation at exactly C (`git rev-parse HEAD` = C, tree clean except node_modules symlink), Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3, under `set -euo pipefail` (/tmp/k11c01-gen.sh) plus the ablation battery (/tmp/k11c01-abl.sh). Prior validation-01..17 under work/K1.1 are inspected history, never this candidate's reruns.

## Results

| Log | Command | Exit | Result |
| `00-scope-guard.log` | B-anchored scope guard | 0 | PASS: HEAD=C, B+H17 ancestors, mental-model empty, no K1.2 |
| `01-tree-and-environment.log` | lineage+env+zone | 0 | Node v25.2.1, npm 11.6.2, tsc 5.9.3; 11 zone files; canonicalize 3.0.0; evals diff 0 |
| `02-typecheck.log` | `npm run typecheck` | 0 | clean |
| `03-test-full.log` | `npm test` | 0 | 2318 tests / 356 suites / 0 fail / 0 skipped |
| `04-test-conformance.log` | `npm run test:conformance` | 0 | 1949 / 283 / 0 fail / 0 skipped |
| `05-check-builder-docs.log` | `npm run check:builder-docs` | 0 | 57 Markdown files, 785 local links/anchors, 38 public package imports |
| `06-test-kernel.log` | `npm run test:kernel` | 0 | 260 / 55 / 0 fail / 0 skipped |
| `07-test-sdk.log` | `npm run test:sdk` | 0 | 22 / 0 fail / 0 skipped |
| `08-architecture-suite.log` | arch TAP suite | 0 | 362 / 37 / 0 fail |
| `09-k1.1-case-inventory.log` | kernel TAP inventory | 0 | 260 / 55 / 0 fail |
| `09b-distinguishing-ablations.log` | see log header | 0 | PASS: all 8 ablations distinguishing; candidate restored (HEAD=b898ae12f51917c48fef92496ca179773c7744d9, tree clean) |
| `10-doc-scope.log` | doc scope | 0 | mental-model empty; link resolves; durability prose absent; evals 0 |

## Digests (sha256 over committed bytes)

- `00-scope-guard.log`: `92f8e22a608e7abdeaab25b89cbf3b84ae42f89301bbfe58864773f9693a83fd`
- `01-tree-and-environment.log`: `afe668957276f40a68b1336ec59b26005fa60034e3534dc9a3d4dbb20092ff4a`
- `02-typecheck.log`: `59105722c1014ec9a8444b1fb5dcec90db82b1f6ac4aa30cab35da85813169c7`
- `03-test-full.log`: `f6259f2db321fbebac75b4865e7c29ce05671881e197cd4c2f909a6ca8abe56f`
- `04-test-conformance.log`: `7adbcbb76f84b7ac67478b744e21741d5a581646dd76ea943849b4c7923e447b`
- `05-check-builder-docs.log`: `afabb5d6e09c4a879cdd83de4db2fb141cd1e31331351adc4c37babcf5d1fdf2`
- `06-test-kernel.log`: `229e7e7a1bfefef16f19eabaffbed786096c51d1e525ee23ce24099022736499`
- `07-test-sdk.log`: `ae1735df8a5777cf3fb851f3393e2996ad5afb28a6356d37a419b375a67698a1`
- `08-architecture-suite.log`: `0a68e2fa54e5216c5823d90aba4255efff7016befb79c73d87a4974e3b474030`
- `09-k1.1-case-inventory.log`: `c8c156cb4f95caa39d2cd7fe65b23a369849611f1ebce9ef5448736dee19279f`
- `09b-distinguishing-ablations.log`: `9920043d68f87c80bb61d761f8583a4938ef4d3984ac06ab15099ea508c406f8`
- `10-doc-scope.log`: `52900ffa8c12848bf9e0be6b5b886e2d2d55d1c7b7e6758331776efd7af5d2e1`
