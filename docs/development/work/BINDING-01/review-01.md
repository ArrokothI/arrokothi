# Independent review 01 — BINDING-01

2026-10-22. Reviewer: this independent Codex desktop session (GPT-6 per session
instructions; exact serving variant unavailable). This session did not implement the candidate.

**Verdict: ACCEPT** of exact H `b7a24c79d547958c419b01e615e859f94ca3132b`.

- B: `af9e3b0ece4786ec41940f1dfa5f0468d83ddd08`.
- C: `da945d3f8ba42f6d1ec6d5e3bcd74ae6a604502f`.
- Gate: brief 01, owner choice 03: concrete production defects against B1-1–B1-5,
  or false current claims in Layer 3, BASELINE or 007. Evidence-tooling gaps are
  non-blocking P3, assigned to TOOLS-02.

## Findings

None under that gate in the requested read scope. No new severity-rated finding.

## Criterion assessment

Paths and lines below refer to H. Review stayed within the named repository files;
coordinator/outcome and current-document review used B..H diffs.

| Criterion | Result | Evidence checked |
|---|---|---|
| B1-1 | PASS | Root types change to bytes in the coordinator/outcome diffs. `packages/kernel/src/values.ts:10` copies before parsing; `packages/kernel/src/canonical-bytes.ts:57` uses captured native brand/accessor/copy operations, rejects shared storage and avoids caller methods. Admission freezes parsed containers; the entry at `packages/kernel/src/index.ts:81` exposes validation, not live-root capture or owned buffers. Consumer diffs retain private records and project their parsed values. |
| B1-2 | PASS | Comparing B's `values.ts` with SDK `value-capture.ts` shows unchanged capture code plus only the byte bridge at `packages/sdk/src/internal/value-capture.ts:1979`. The core encoder at `packages/kernel/src/canonical-bytes.ts:279` uses binary64 number printing and UTF-16 key sorting. Corpus/replay verification is supplied by the cited C run. |
| B1-3 | PASS | `packages/kernel/src/canonical-bytes.ts:73` rejects invalid UTF-8; string/number/container parsing enforces Unicode and semantic limits; `:239` rejects decoded duplicate keys before insertion; `:311` requires exact re-encoding equality, rejecting alternate spellings and whitespace. `packages/kernel/tests/byte-aggregation.test.ts:27` checks whole-refusal aggregation and preserved state. |
| B1-4 | PASS | `packages/kernel/src/canonical-bytes.ts:9` captures validation/encoding intrinsics, including number conversion and printing. No call-time global lookup found in the scoped validator/encoder. Identity checking uses the same captured string operations. The cited CI includes the maintained shadow/pin verification. |
| D01-CHK-01 | PASS | `packages/kernel/src/envelope.ts:177` requires a primitive string, then calls `identityTextIssue`; `packages/kernel/src/canonical-bytes.ts:40` checks UTF-16 well-formedness and the scalar limit without canonicalize. |
| B1-5 | PASS | SDK entry is unchanged from B (`packages/sdk/src/index.ts:1`); it does not export the wrapper. Wrapper imports at `packages/sdk/src/internal/value-capture.ts:103` are JCS, Node builtins and SDK-local own-array helpers; neither internal module imports the Kernel. |

The facade's `assert.fail` at `packages/kernel/tests/binding-facade.ts:50` is the
consumer fixture's assertion failure, not a harness error. It is saved and rethrown
at `:99` even if core field observation catches it. The direct snapshot witness at
`packages/sdk/tests/wrapper-snapshot.test.ts:6` checks wrapper ownership and freezing.

The requested Layer-3, BASELINE, 017 and 007 changes consistently distinguish the
bytes core, cooperative wrapper, retained envelope behavior and owner-held V-ENV
release. No false current claim found in those diffs. Existing evidence bookkeeping
limitations remain **DEFERRED (P3), TOOLS-02**, as the owner directed.

## Verification and scope

User-supplied verification: [Packet verify CI run 39868378094](https://github.com/ArrokothI/arrokothi/actions/runs/39868378094)
at C, **checks_passed, 18/18**. The composed verify was not rerun. Independently
checked C..H changes only the implementation report, 007 and progress, with no
production/test payload change. This review adds no production changes or third-party
material. Acceptance is exact-H only; owner integration and hold release remain separate.
