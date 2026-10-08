# TOOLS-01 continuation repair 02 — required reference normalization

2026-10-05. Codex implementer; numbered item 1 of the owner's continuation request, after
[owner choice 04](owner-choice-04.md). Parent `ea9bc7b4f698abb79398ab86b6d076d35f77bd24`.
Incremental checkpoint only; no final C/H, independent acceptance or hold release.

**Cause and fix (TOOLS-CONT-04):** discovery discarded relative Markdown destinations and
commit-qualified links before required-record classification. `context_references` now resolves the
three authorized forms before classification. Traversal retains revision/path pairs, including
through relative links at another revision, and detects cycles using those pairs. Required missing
files, unsupported forms and symlinks refuse. Generic reasons cannot substitute for required ranges.
The accepted language is documented in `tests/tooling/README.md`; this is not a general Markdown
resolver. A bare concept filename absent from the referring directory is not guessed to name a
sealed record. Twelve new full-corpus fixtures cover supported forms, fragments, omissions,
wrong-directory/revision substitutions, transitive revision retention, cycles and unsupported forms.

The two pinned ownership inventories in continuation-stop-02 now discover implementation-03 and
implementation-04 at `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`, matching its six recorded occurrences.
This checks discovery, not their complete transitive reading closure or adoption.

**Validation:** Node v26.10.0 first in PATH; long jobs under `caffeinate -i`.

- `python3 -B -m unittest discover -s tests/tooling -p 'test_context_references.py'`: 12 tests,
  OK, 22.409 s; existing closure/LF suites: 20 + 6 tests, OK, 3.861 + 2.546 s.
- `python3 -B .../continuation-stop-02/probe_relative_context.py .`: all three omission controls
  refused, exit 0, 3.263 s.
- `python3 -B /tmp/tools-01-step1-ablate.py`: isolated temporary Git fixture passed both selected
  registry controls and killed both ablations (`guard.context_check.557d3f1c1daa356e` and
  `guard.context_references.15f230d04083c872`), 16.248 s. The maintained registry contains their
  exact inputs and mutations; the temporary selection script is not evidence.
- `python3 -B -m unittest discover -s tests/tooling -p 'test_*.py'`: final 465 tests, OK,
  353.041 s. An initial 464-test run passed in 334.335 s; the final run supersedes it after the
  bare-concept regression was added.
- `python3 -B tests/tooling/check-refusal-registry.py`: 271 checks / 271 mutations, 0.372 s;
  `git diff --check`: clean.

Not run: full ablation execution, census regeneration, target rechecks, composed verify, production
suites or independent review. Those belong to the following numbered items/final composition.
No new dependency or copied third-party material; the existing pinned toolchain is unchanged.
