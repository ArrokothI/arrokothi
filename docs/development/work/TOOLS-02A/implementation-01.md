# Implementation report — TOOLS-02A, round 1

## Identity

- **Implementer:** the owner's Claude Code desktop session (`claude-opus-5-5`), 2026-10-19/20. The same session
  diagnosed the defect and wrote [release 01](release-01.md). Access: local checkout, shell, Node v26.10.0,
  Python 3.13, and `gh` with the owner's fine-grained token. No subagents.
- **Base B:** `e391ceba26164d2b461dc4c374db65058903b23e` (main).
- **Payload C:** `504fa5fb23b681e2715fcba97b98bcb456e778ee`.
- **Candidate H:** the commit that contains this report. C..H changes only 007 and this report.

## Changes (B..C)

| Change | Files |
|---|---|
| Verify and the census refuse entries not tracked at C, including ignored files and git-invisible directories. Only `node_modules` and `.DS_Store` are allowed, and a linked worktree's `.git` file is accepted. | `scripts/packet_tools.py` (`untracked_entries`, `clean_payload`); 4 tool tests in `test_corpus_tools.py` |
| The new check is registered as refusal guard `guard.clean_payload.c88434fec112f9e4` | `tests/fixtures/packet-tools/refusal-guards.json` (+1 case) |
| 21 preserved-table `reads` digests recomputed in a clean worktree. Exactly 21 lines change, all `reads` values. | `tests/fixtures/packet-tools/adoption.json` |
| Three tooling files used the system temporary directory instead of a hard-coded macOS `/private/tmp` | `capture-continuations.mjs`, `capture-trace-controls.mjs`, `requalify-value-cost.py` |
| Packet records | `release-01.md`, `verification.json`, 007 |

No production code, Layer 3 or other registry changed. The verification spec preserves `packages`, `mental-model`
and `.github` at B.

## Criteria

| ID | State | Evidence |
|---|---|---|
| T2A-1 | Met | Tool tests cover a git-invisible directory, an ignored file, the allowed names and a linked worktree. The guard's control passes, and its ablation is killed: locally (exit 17) and in CI's `refusal-mutants`. |
| T2A-2 | Met | The diff of `adoption.json` is the 21 `reads` values. Adding the owner's former `examples/strands-gemini` directory to a clean run's read list reproduces both old digests exactly (diagnosis in the release record). The clean census at C returns `revalidation_complete`. |
| T2A-3 | Met | Packet verify CI run `39349102418` at C (below) |

## Verification at C

- **Workflow:** GitHub Actions Packet verify, run `39349102418`. Clean checkout at C with full history, ubuntu
  x86_64 with 4 CPUs, Node v26.10.0, npm 11.19.1, Python 3.13.16. It ran from 2026-10-20 00:41:36Z to
  01:45:20Z.
- **Result:** exit 0, `checks_passed`. `verify.json` SHA-256:
  `b99ee6352a500f67c3ddd33c8e40d454f4231d337270fbb4c912af3dd068bdd5`. The artifact is
  `packet-verify-504fa5fb23b681e2715fcba97b98bcb456e778ee` on that run.
- **All 15 checks pass:**
  - tool tests: 613;
  - inventory: `provenance_verified`; adoption: `revalidation_complete`; dimensions;
  - general, refusal-guard and value-cost mutation registries;
  - refusal and oracle censuses;
  - typecheck;
  - repository tests: 4,123 run, 0 failed, cancelled, skipped or todo;
  - archive tests: 4;
  - kernel sweeps; value-cost dimensions and continuations;
  - the advisory area gate: reported.
- **Earlier run, kept as evidence:** run `39340063198` at the earlier C `4e26f354` passed adoption and found the
  `/private/tmp` and guard-registration defects fixed in C.

This is the first composed verify of the current tree to pass in a clean checkout. Earlier passes (TOOLS-01 and
K1.1-correction-03 implementers) ran in the owner's main checkout, whose untracked directory the stored digests
had absorbed.

## Limits

- This closes only KC3-R3-CENSUS-01. KC3-R3-RAW-02, KC3-R3-CREDIT-03 and the rest of TOOLS-02 stay open.
- Local verify now needs a fresh clone or worktree. The owner's main checkout holds ignored `.env` and
  `docs/development/work/K1.1/` content and is refused, by design.
- No third-party code was added.

## Handoff

Ready for one independent review by a session other than this one. No pull request, merge, self-acceptance or
successor release.
