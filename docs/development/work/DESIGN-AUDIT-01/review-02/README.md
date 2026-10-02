# Evidence for DESIGN-AUDIT-01 independent review 02

Reviewer: Claude Code desktop session (Code tab), model `claude-opus-5-5` (Opus 5.5), 2026-10-01.
Access: local clone with shell, Git history and network fetch; the owner's local Claude Code transcripts on
this machine; no owner–Codex conversation; no external accounts.

Candidate H `4c1b11e115ad61fbcfeebf83f50bb6a35478ea8e`, payload C `0ef728f0b93b7211d7c05795aa9f2cb5e7ce818e`,
base B `66bc041175e6fc191c2e7cf88de198111e7d97c9`.

Environment: macOS (Darwin 25.6.0) arm64; Node v25.2.1; Python 3.13.5; git 2.39.5; `canonicalize@3.0.0`
(Apache-2.0, the repository's existing approved dependency) from the owner's main-checkout `node_modules`,
reached by a symlink placed in the scratch directory *above* the detached worktrees, so the worktrees stayed
clean (`git status --porcelain` empty before and after every run).

Worktrees: `git worktree add --detach <scratch>/wt-H 4c1b11e1…` and `<scratch>/wt-C 0ef728f0…`. Commands below
run from the repository root of a checkout at H unless stated; `E=docs/development/work/DESIGN-AUDIT-01/review-02`.

| File | What it shows | Command |
|---|---|---|
| `coverage-map.md` | Reviewer coverage map and how each row closed | — |
| `rerun/verify-at-C.txt` | Packet verifier at clean C: PASS | at C: `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean` |
| `rerun/verify-at-H.txt` | Packet verifier at clean H, C..H allowlist: PASS | `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean --C 0ef728f0b93b7211d7c05795aa9f2cb5e7ce818e` |
| `rerun/template-check.json` | Review-01 `template_check.py` at H: both conditions False; two parsed rows per family (non-vacuous) | `python3 docs/development/work/DESIGN-AUDIT-01/review-01/da2/template_check.py docs/development/work/DESIGN-AUDIT-01/register.md /tmp/tc.json` |
| `rerun/consistency-extract.txt` | Review-01 `consistency_extract.py` at H: every recommended row tags bytes/text (label-based tagger) | `python3 docs/development/work/DESIGN-AUDIT-01/review-01/da3/consistency_extract.py docs/development/work/DESIGN-AUDIT-01/register.md` |
| `rerun/claims-coverage.txt` | Review-01 `claims_coverage.sh` at H (its values.md excerpt is hard-coded to the old anchor) | `bash docs/development/work/DESIGN-AUDIT-01/review-01/da3/claims_coverage.sh docs/development/work/DESIGN-AUDIT-01` |
| `realm/global-binding-probe.mjs`, `binding-probe-{frozen,unfrozen}.txt` | **Counterexample for DA01-R2-REALM-01.** Under `--frozen-intrinsics` the intrinsics are frozen but `globalThis` is not; replacing `globalThis.JSON` and `globalThis.Object` succeeds and steers `canonicalize@3.0.0` (`{"a":[1,"x"],"b":2}` becomes `{"a":[999,"x"]}`), while `Object.prototype.toJSON =` throws | `node --frozen-intrinsics $E/realm/global-binding-probe.mjs node_modules/canonicalize/lib/canonicalize.js` (and without the flag) |
| `realm/global-bindings-all.mjs`, `{frozen,unfrozen}-all-bindings.txt` | All eight global bindings the Kernel serializer window pins per call (`values.ts:1170–1177`) remain replaceable under the flag | `node --frozen-intrinsics $E/realm/global-bindings-all.mjs` |
| `brand/proxy-exotic-probe.mts`, `proxy-exotic.txt` | **Observation DA01-R2-PROXY-01.** `util.types.isMap/isDate/isTypedArray` are false through a forwarding Proxy; the current Kernel accepts `Proxy(re-prototyped Map)` as `{}` whatever its contents | `node --experimental-strip-types --no-warnings $E/brand/proxy-exotic-probe.mts "$PWD"` |
| `brand/structured-clone-control.mjs`, `structured-clone-control.txt` | Prior-art control for DA01-R2-PROXY-01: structured clone clones a re-prototyped Map as a Map but throws `DataCloneError` for every Proxy | `node $E/brand/structured-clone-control.mjs` |
| `guards/validator_mutants.py`, `validator-mutants.json` | Plausible wrong drafts applied to the candidate's own `family-notes.json` and passed to its checked-in `render-register.validate()`; M1–M3, M5, M6 survive, M7 shows the validator rejects a true statement | `python3 $E/guards/validator_mutants.py docs/development/work/DESIGN-AUDIT-01 /tmp/vm.json` |
| `records/anchor_check.py`, `anchor-check.txt` | All 59 link fragments in the packet's current Markdown resolve | `python3 $E/records/anchor_check.py . docs/development/work/DESIGN-AUDIT-01` |
| `auth/six_checks_compare.py`, `six-checks-compare.txt` | The six extra checks in owner-decisions-02 are byte-identical (2,215 characters) to the prompt at line 1409 of transcript `9d3c2edb-…`; the pre-approval sentence is in the same prompt. The transcript is private and not committed | `python3 $E/auth/six_checks_compare.py ~/.claude/projects/-Users-rex-shih-Documents-ArrokothI-arrokothi/9d3c2edb-f457-407e-b79c-f2b32b5cb4fd.jsonl docs/development/work/DESIGN-AUDIT-01/owner-decisions-02.md` |

External source consulted (not copied): Node.js v25.2.1 CLI documentation, `--frozen-intrinsics` section
(`https://nodejs.org/download/release/v25.2.1/docs/api/cli.md`, lines 1368–1382 when fetched on 2026-10-01). It
states that there is "no guarantee that `globalThis.Array` is indeed the default intrinsic reference".

Not run: the 63-run R8 cost corpus, the N15 runner and the eager-Outcome probes (no derivation changed this
round; review-01 reran N15); the full product test suite; SES (not installed, no dependency added).
