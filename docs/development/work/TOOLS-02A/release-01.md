# TOOLS-02A — reproducible adoption census (release, brief and design)

A small tooling packet. Under 006, "a small documentation packet may combine all of [the lifecycle stages]",
so this one record holds the release, the brief and the design. Working principle 6 applies: the fix is
sized to the defect.

## Release

Recorded 2026-10-19 by the owner's Claude Code desktop session (`claude-opus-5-5`), which is also the
implementer. The owner's words, verbatim:

```text
deleted the folder, draft the census fix here
```

This followed that session's diagnosis of the first Packet verify CI run (run `39312381700`). It releases this
packet from main `e391ceba26164d2b461dc4c374db65058903b23e` on `claude/tools-02a-census`. It is carved out of
TOOLS-02's scope: K1.1-correction-03 review 03's P3 KC3-R3-CENSUS-01. The rest of TOOLS-02 stays unreleased.
Independent review is required, by a session other than this one.

## Problem

The composed verify fails in every clean checkout at its `adoption` step:

```text
preserved table differs from the census at C: 21 members differ
```

This failure appeared in review 03, in the CI run and in a clean local worktree. The implementer of
K1.1-correction-03, working in the owner's main checkout, got `checks_passed` at the same C.

**Cause.** The 21 members are tests in `ambient-reads.test.ts` and `control-commits.test.ts`.
- They run TypeScript over the whole repository, which lists every directory.
- Their preserved-table `reads` digest hashes the repository paths those runs touch.
- The owner's main checkout held `examples/strands-gemini/`, left from an example removed in `4cc89416`. It
  contained only an ignored `node_modules`.
- Git does not track a directory, so `git status` was empty and `clean_payload` accepted the checkout. The
  TypeScript walk still listed the directory.
- Every census computed there since TOOLS-01 step 6 recorded two extra reads,
  `examples/strands-gemini` `exists` and `listing`.

Adding exactly those two rows to a clean run's read list reproduces both stored digests, `2bc88040…` and
`3078db03…`, byte for byte. The owner has deleted the directory.

**Mechanism.** "Clean" meant "git status is empty". That definition ignores two kinds of content that a test
walking or reading the tree can still observe:
- ignored files and directories, such as `.env` or ignored record directories;
- directories git cannot see.

## Criteria

| ID | Criterion | Closes by |
|---|---|---|
| T2A-1 | Verify and the corpus census refuse a checkout that holds any filesystem entry not tracked at C, including ignored files and git-invisible directories. Only `node_modules` and `.DS_Store` are allowed. The error names the first entries and points to a fresh clone or the Packet verify workflow. | `clean_payload` calls `untracked_entries`; three tool tests cover a git-invisible directory, an ignored file and the allowed names |
| T2A-2 | The 21 preserved-table `reads` digests are the values a clean checkout computes. No other field changes. | Regenerated from a clean worktree at the payload; the diff of `adoption.json` touches only those 21 values |
| T2A-3 | The composed verify returns `checks_passed` at clean C in the Packet verify workflow. | CI run on C, with this packet's `verification.json` |

## Design

- **Choice.** The checkout must be pristine; the fingerprints are not filtered. Filtering untracked paths out
  of the read digests would hide the symptom. A stray file could still change what a test does: a `.env` the
  test reads, or a `.ts` file that TypeScript compiles. A pristine checkout removes the cause, and CI checkouts
  are always pristine.
- **Cost.** Local verify runs need a fresh clone or worktree. The owner's main checkout holds ignored `.env`
  and `docs/development/work/K1.1/` files, and would be refused, correctly.
- **Allowed names.** `node_modules` (installed dependencies, never part of the census) and `.DS_Store` (macOS
  folder metadata, which the census never reads).
- **Not changed.** The census algorithm, every other recorded digest, production code, Layer 3 and every
  other registry.

## Limits

- This packet closes only KC3-R3-CENSUS-01. KC3-R3-RAW-02, KC3-R3-CREDIT-03 and the rest of TOOLS-02 stay
  with TOOLS-02.
- A path that is tracked but locally modified is still caught by `git status`, as before.
