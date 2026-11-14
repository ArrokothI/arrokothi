# K1.4 owner choice 07 — the brief 06 correction's route and scope

Recorded 2026-11-14 by the K1.4 coding agent (Claude Code desktop, `claude-opus-5-5`), which also did the
delegated cleanup. The owner answered in the session's next-step box and question dialog. Answers are
quoted as selected.

## Context

[Cleanup 01](cleanup-01.md) left K1.4 ACCEPTED at H `e307943d6b315e724e49107c3b26a1100ef4916c` and cleanup
BLOCKED on CLEANUP-K14-01, the cleanup agent's own finding in [reference check 01](reference-check-01.md):
`execution-cycle.md` says that wait and Execution deadlines take effect only when the host fires them, which
is wrong for a wait already due when its Outcome is accepted. [Brief 06](cleanup-01/brief-06.md) scopes the
correction to Layer-3 prose and leaves two choices to the owner: observation O-2, and a waiver of the Packet
verify run for a prose-only diff.

## Choices

1. **Route.** Question: "Run the brief 06 correction (new C/H plus a bounded review) before you merge?"
   Answer: **"Prepare correction now"**. The correction runs on `claude/k1.4` before the manual merge.
2. **O-2.** Question: should the same C also take observation O-2, the one-clause fix to `values.md:323`?
   Answer: **"Include O-2 (Recommended)"**.
3. **Scope beyond Layer 3.** Brief 06's question 1 grep found the same omission outside Layer 3:
   `docs/guides/deployment/quick-start.md:155` ("Deadlines take effect at the next host call") and the
   `packages/sdk/src/host.ts:77` doc comment ("deadlines take effect at host calls"). A pause whose stored
   deadline passes while a native step runs expires when its Outcome is accepted, not at a host call. Brief
   06's R6-SCOPE allowed only Layer-3 prose. Answer: **"Fix guide and comment (Recommended)"**, described as
   "Same family, one review. The host.ts change is comment-only, checked by printing the file without
   comments at H and C."
4. **Packet verify.** Answer: **"Run Packet verify (Recommended)"**: the full run at the new C, as in rounds
   1–5.

## Consequences

- R6-SCOPE widens to the quick start sentence and to SDK doc comments in the same family. Each changed
  TypeScript file must print identically without comments at H `e307943d` and at C. Kernel and core source
  stay equal to B, and no test, fixture, mutation registry or executable line changes.
- **Disclosed extension.** After choice 3, a follow-up grep found a third copy of the same sentence in the
  `humanWaitDeadlineMs` doc comment, `packages/sdk/src/types.ts:59` ("Deadlines take effect at the next host
  call."). The question named only two places. The coding agent corrects it under choice 3, as the same
  family and comment-only, and reports this as a deviation for the owner and the reviewer.
- R6-EVIDENCE: Packet verify runs at the new C; the waiver is not used.
- K1.4 stays ACCEPTED at H. This correction is a documentation dependency of cleanup, not a reopening.
  Independent review is bounded by brief 06 as amended here. No self-acceptance, and K14-G stays K1.4-gate's.
