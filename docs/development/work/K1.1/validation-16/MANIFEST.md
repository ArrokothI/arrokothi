# Validation manifest — K1.1 round 16 (single-branch unification, fresh C12)

**Payload C12:** `37ee8c39ebfcce797bafb67faecae01e55fab89f` (merge of the doc-improve revert
`2f931c1` and scoped H15 `7851595`; contract revision 5 unchanged). C12's substantive
(non-docs) tree is byte-identical to C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d`:
`C11..C12 -- . ':!docs'` names nothing and `mental-model`/`packages` differ by zero content
bytes. No Kernel source, test, fixture, evaluator, threshold, configuration or contract change
exists anywhere in this round; the only tree operations are the revert, the records merge and
this round's attachments.
**Candidate:** H16, the commit on `codex/k1.1-create-reserve-async-dispatch` containing the
round-16 report. The scoped branch's content is merged into that single branch; no second
branch remains afterwards.
**What this round corrects:** the owner's single-branch direction under the still-open
K11-R14-PROC-01 lineage. K11-R10-EVID-01 stays closed on the retained round-14 mechanism;
K11-R12-ID-01 stays closed; review-13's C1–C10 semantic PASS on the C11-equivalent tree stands
as history but is explicitly not claimed as binding until fresh independent review of H16.

## Provenance (fresh rerun on the exact new payload, nothing carried over)

Every log below was **regenerated in a detached worktree `/tmp/k11-c16-validation` at exactly
C12** (`git rev-parse HEAD` = `37ee8c39ebfcce797bafb67faecae01e55fab89f`,
`git status --short` = only `?? node_modules`, a symlink to the main checkout's install), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64. Generation ran under
`set -euo pipefail` via `/tmp/k11-c16-gen.sh`: any red control, unrejected ablation, moved HEAD,
dirty tree, lineage failure or substantive-delta failure aborts before any candidate exists.
Prior `validation-01/.../15` logs are inspected history, never this candidate's reruns. The
ablation rejecting case-name sets below were mechanically compared against the sealed round-14
record (identical modulo timing suffixes).

**Lineage timing honesty:** `01` records C12's two parents (revert `2f931c1`, scoped H15
`7851595`), proves both are ancestors of the validation checkout, proves the effective
`C11..C12` range names exactly the 40 known admin paths with zero non-docs entries and zero
differing content bytes in `mental-model`/`packages`, and lists `C11..HEAD` commits. At log
time the round-16 H commit is not yet cut; `00` (scope guard) verifies the staged H16
attachments against the allowlist before the commit, and the handoff re-verifies `C12..H16`
and `C11..H16` after the push.

## Contamination guard (round-16 form)

`00-candidate-scope-guard.log` captures `/tmp/k11-c16-scope-guard.sh` run after `git add` of the
H16 attachments and before the commit. The guard asserts against live Git state: (a) worktree
tip is exactly C12 with exactly the revert+H15 parents; (b) committed `C11..C12` equals exactly
the 40 known admin paths (byte-exact sorted comparison against the embedded list reproduced in
`01`); (c) no non-docs path differs between C11 and C12 and zero content bytes differ in
`mental-model`/`packages`; (d) every staged path is inside the 14-path H16 attachment allowlist
(007 row, implementation-16, MANIFEST-16, eleven logs); (e) no substantive prefix appears in
either set; (f) the worktree holds only staged entries plus the `node_modules` symlink and the
guard's own pending log. Any violation aborts nonzero with no PASS line. Staging the guard log
after its own PASS adds exactly one allowlisted path, so compliance is preserved by
construction. Note the deliberate inversion from round 15: `ddf24de`/merge/H14/review-13 are
now ancestors (history preserved, not destroyed) — the guard binds the effective tree instead.

## Results

| Log | Command | Exit | Result |
|---|---|---|---|
| `00-candidate-scope-guard.log` | scope guard (above) | 0 | PASS: 40 known admin paths; zero substantive delta; staged is attachments only |
| `01-tree-and-environment.log` | lineage + environment + zone inventory | 0 | HEAD=C12; B ancestor; revert+H15 parents proven; 40 admin paths; 11 files / 17 exports; `observed count: 11` + PASS |
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
HEAD still C12, status back to `?? node_modules`) before the next.

**Implementer-only auxiliary probes (mechanism verification, not candidate evidence):** the
retained inventory gate re-probed in `/tmp` against the same C12 worktree — true gate exits 0
with `observed count: 11`; expectation altered to 10 exits 1 with no PASS; count assertion
against a 12-line list exits 1 with `observed count: 12`. No repository mutation; disclosed so
the reviewer need not trust the gate unexercised.

**Checks not run, and the resulting limits:** `npm run test:evals` was not run (006 requires it
for Agent behaviour; no round-16 tree operation touches any Agent, model path or eval
fixture). No process-kill run (no persistence/process-failure claim). No native Driver,
packaging or release check. Nothing here supports a durability, isolation, native-fidelity,
release or E-gate claim. External fixture / gate / decision: none prepared, none executed, none
claimed; E0–E6 are the benchmark repository's.

## Digests (SHA-256 over the exact staged bytes)

- `00-candidate-scope-guard.log`: `5be04ebcae3b1b24797748f59ca43c5c5a7176d09b73ec67f735203f6bcf73bf`
- `01-tree-and-environment.log`: `e3e3178139e51460089ba40fb15251797409750b1075ec8847b7011da929aa51`
- `02-typecheck.log`: `5ee874308ff351a4f0c91877e58af37aa6af314ee6b2e0c6772de50a272b3d44`
- `03-test-full.log`: `7347e91189d65a0936e635c40585d6f8c016e565157785d5ba23a01477b3ec26`
- `04-test-conformance.log`: `f9ebc7787b79a232fa76046749b7771cbad3361e246820fbc9d44e80e37e4f12`
- `05-check-builder-docs.log`: `67c7d355007cbd5dcd262043220cdf27751b14050a38930a1a00de7d4fae34b6`
- `06-test-kernel.log`: `d2bbdeb7d4cd20166d2da0b9a33b1d8482713575cf61dcf1a11d9c470a1cec71`
- `07-test-sdk.log`: `78cee74958904cb7981b7760e90905f890d3658833e573ba8515597ebd0f5edb`
- `08-architecture-suite.log`: `35e47f3d1dcadd1ae99227cded84537ceab53d2491b0564f1f2719ca2eff35a0`
- `09-k1.1-case-inventory.log`: `801929aa5d9a5448c6981aa40e2563711a153b1d6a770e78b3b7083f284f156b`
- `09b-distinguishing-ablations.log`: `8041c297ead5ead7e79e8d97e9b2ba29e4ad3be9a2e995556840f2cfe613cfc6`

Every token above was programmatically compared against a fresh SHA-256 recomputation over the
exact staged file (64-hex length-checked) before the H commit; the procedure is re-runnable by
the reviewer rather than trusted.
