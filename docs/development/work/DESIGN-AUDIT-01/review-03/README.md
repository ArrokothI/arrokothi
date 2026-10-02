# Evidence for DESIGN-AUDIT-01 independent review 03

Reviewer: Claude Code desktop session (Code tab), model `claude-opus-5-5` (Opus 5.5), 2026-10-02.
Access: local clone with shell, full Git history and network fetch (`git ls-remote`, the Node v25.2.1 `cli.md`); the
owner's local Claude Code transcripts on this machine, used only for the six-check comparison; no owner–Codex
conversation; no external accounts.

Candidate H `ce0b5a7098a9f65cf16dc55ce6eb013946564508`, payload C `c3e9c521c5ddbe93cc09ae880063a13f4e563d83`,
base B `66bc041175e6fc191c2e7cf88de198111e7d97c9`.

Environment: macOS (Darwin 25.6.0) arm64; Node v25.2.1; Python 3.13.5; git 2.39.5; `canonicalize@3.0.0`
(Apache-2.0, the repository's existing approved dependency) from the owner's main-checkout `node_modules`.
The verifier ran in detached worktrees at C and H in my session scratchpad. Each worktree had an ignored
`node_modules/` directory holding one symlink to that package, so `git status --porcelain` stayed empty before and
after every run. The hop probes and mutants below ran from the owner's main checkout at H; they read the checkout
and write only their outputs here.

Commands run from the repository root of a checkout at H, with `E=docs/development/work/DESIGN-AUDIT-01/review-03`
and `C=node_modules/canonicalize/lib/canonicalize.js`. Every probe runs in a fresh process: the classic-script
probes leave a global lexical binding behind for the life of that process.

| File | What it shows | Command |
|---|---|---|
| `coverage-map.md` | Reviewer coverage map and how each row closed | — |
| `rerun/verify-at-C.txt` | Packet verifier at clean C: exit 0, PASS (its session lines are printed by the candidate's scripts) | at C: `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean` |
| `rerun/verify-at-H.txt` | Packet verifier at clean H with the C..H allowlist: exit 0, PASS | `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean --C c3e9c521c5ddbe93cc09ae880063a13f4e563d83` |
| `rerun/template-check.txt`, `rerun/consistency-extract.txt` | Review-01 scripts at H: no identical claims, no suffix-only closures; every recommended row of A/B/C/F02/F09/F10 tags bytes/text | review-01 `da2/template_check.py` and `da3/consistency_extract.py` on `register.md` |
| `rerun/validator-mutants.json` | Review-02 mutants at H: M1–M3, M5, M6 survive, M4 rejected, **M7 now survives (accepted)** | `python3 docs/development/work/DESIGN-AUDIT-01/review-02/guards/validator_mutants.py docs/development/work/DESIGN-AUDIT-01 <out>` |
| `rerun/anchor-check-at-H.txt` | 266 fragment links at H, 0 bad | review-02 `records/anchor_check.py . docs/development/work/DESIGN-AUDIT-01` |
| `rerun/six-checks-compare.txt` | Six extra checks still byte-identical to transcript `9d3c2edb-…` line 1409 (2,215 characters); the transcript is private and not committed | review-02 `auth/six_checks_compare.py <transcript> docs/development/work/DESIGN-AUDIT-01/owner-decisions-02.md` |
| — | Review-02 realm, brand and clone probes rerun at H; outputs equal review-02's recorded files apart from the Node warning lines | commands in [review-02/README.md](../review-02/README.md) |
| `hop/lexical-shadow-probe.mjs`, `hop/lexical-shadow.jsonl` | **New hop.** A coherent Proxy trap mid-capture runs a classic script declaring `let JSON` (global declarative record). Unfrozen and flag-only runs give steered bytes while `globalThis.JSON` is unchanged; the full pin throws SyntaxError | `node [--frozen-intrinsics] $E/hop/lexical-shadow-probe.mjs $C [pinned]` |
| `hop/kernel-lexical-shadow.mts`, `hop/kernel-lexical-shadow.jsonl` | **Same hop against the current Kernel's `canonicalize` (`values.ts`).** It accepts the coherent Proxy and returns steered bytes for JSON/Object/Array; later plain calls stay steered; the serializer window does not detect it | `node --experimental-strip-types --no-warnings $E/hop/kernel-lexical-shadow.mts "$PWD" <control\|JSON\|Object\|Array>` |
| `hop/kernel-lexical-creation.mts`, `hop/kernel-lexical-creation.jsonl` | **Whole decision.** After the hop, `createExecution` with the same key and a different payload is accepted as a replay of the first Execution; the control run refuses it as a key conflict | `node --experimental-strip-types --no-warnings $E/hop/kernel-lexical-creation.mts "$PWD" <control\|hop>` |
| `hop/pin-forms-probe.mjs`, `hop/pin-forms.jsonl` | Replacement form × pin style under the flag. The full pin blocks assign, `defineProperty` and `let`. A writable-only pin passes assignment and is steered by the other two. A `let` declared before pinning steers bytes with a passing globalThis-descriptor check | `node --frozen-intrinsics $E/hop/pin-forms-probe.mjs $C <JSON\|Object\|Array> <assign\|define\|declare\|preexisting> <full\|writableOnly>` |
| `hop/object-freeze-witness.mjs`, `hop/object-freeze-witness.jsonl` | K11-R5-STATE-01's second recorded witness. First hop (`Object.freeze =`) blocked by the flag; binding hop (`globalThis.Object =`) succeeds under the flag alone; both blocked by the eight pins | `node [--frozen-intrinsics] $E/hop/object-freeze-witness.mjs [pinned]` |
| `hop/frozen-graph.mjs`, `hop/frozen-graph.txt` | Which serializer-relevant objects the flag freezes, and which other global bindings stay writable; `Iterator` (constructor) is not frozen on v25.2.1 | `node [--frozen-intrinsics] $E/hop/frozen-graph.mjs` |
| `guards/round3_mutants.py`, `guards/round3-mutants.json` | Plausible wrong drafts passed to the candidate's `render-register.validate()` and `corpus.validate()`. RM1 (round-2 REALM-01 text restored), RM2, RM3 and RM5 survive; RM4 (label dropped) is rejected | `python3 $E/guards/round3_mutants.py docs/development/work/DESIGN-AUDIT-01 4c1b11e115ad61fbcfeebf83f50bb6a35478ea8e $E/guards/round3-mutants.json` |

External source consulted (not copied): Node.js v25.2.1 `doc/api/cli.md`, `--frozen-intrinsics` section, lines
1368–1383, fetched 2026-10-02 from `raw.githubusercontent.com/nodejs/node/v25.2.1`. Language rule relied on:
ECMA-262 GlobalDeclarationInstantiation refuses a lexical declaration whose name is a non-configurable own
property of the global object (HasRestrictedGlobalProperty), and identifier resolution consults the global
declarative record before the global object. The probes check both behaviours on the printed engine.

Not run: the R8 cost corpus, N15 and eager-Outcome probes; the full product test suite; SES (not installed; no
dependency added); engines other than Node v25.2.1.
