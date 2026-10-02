# Implementation 01 — TOOLS-01 foundation

## Identity

- State: **IN_PROGRESS — partial handover**, not WAITING_FOR_REVIEW. Contract revision 1;
  foundation F1–F6 implemented; whole-packet P1/P2 remain mandatory and open.
- Implementer: Codex, GPT-6 per session instructions; exact serving variant unavailable.
  Local repository/history and shell access; reviewed Git write permissions; no independent
  acceptance authority. Date: 2026-10-02.
- Owner authority: [release 01](release-01.md). Prerequisite DESIGN-AUDIT-01 accepted, integrated,
  owner-closed; exact identities are recorded there.
- Base B and governing 006/008/012 policy: `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`.
- Branch: `codex/tools-01`. Payload C: `3c91db1f3dd2cc9110edc271d1b7ddd46bc88c45`.
- H: the commit containing this report; full SHA supplied in the external handover.
  C..H allowlist: this report and `docs/development/007-work-packets.md` only.
- No push, merge, independent acceptance, claim-hold release or successor release performed.

## Changes and coverage

The foundation implements `scripts/packet_tools.py`, exposed as `npm run verify:packet`:

1. Immutable candidate facts from a specification read at C: commit type/ancestry, exact
   administrative file set, historical-path preservation and accessible evidence digests.
2. Pinned historical inventory with stable origin IDs and explicit pending adoption. The audit's
   filename-based recommendations remain recommendations, not semantic mappings or runnable cases.
3. A temporary-source mutation runner with control, unique mutation application, fixture reach and
   named assertion; separate outcomes for survival, uncovered mutation, invalid baseline,
   inapplicable mutation, setup failure, timeout and output overflow.

The initial maintained registry tests injective identity packing against an implementation mutant
that drops length prefixes. The fixture checks fixed literal expected identities independently.
39 Python tests exercise the tooling's wrong-candidate, wrong-evidence and false-kill mechanisms.
No production package, existing test, historical evidence or canonical source was edited.

| Criterion | Implementer assessment and evidence |
|---|---|
| F1 | PASS for declared immutable facts: candidate fixtures cover wrong SHA/object/ancestry, extra payload, changed/missing preserved evidence and missing/wrong-digest attachments. Actual H wrapper is checked after this commit and recorded externally. No authenticity or prose-semantics claim. |
| F2 | PASS for provenance only: 208 artifact/fence digests, 1,333 prose locations and 8 final-review/policy additions verified; 1,549 origins remain pending. Duplicate/bad/missing mappings fail tooling tests. |
| F3 | PASS for the selected runner cases: real identity control passed and mutation killed; false-kill categories distinguished by subprocess fixtures. Structured witness truth remains a reviewed-fixture assumption. |
| F4 | PASS for temporary ordinary-file copies, fresh processes, timeout/output cap and original source preservation. Traversal and symlink fixtures refuse. Runner is POSIX, not physical containment of hostile commands. |
| F5 | PASS: generated results are facts/selected-case results; `full_corpus_complete` remains false. No code path writes acceptance or release. |
| F6 | PASS for scoped docs and validation; external handover supplies full H, wrapper check and final clean-state observation after commit. No Layer-3 maintenance needed because protocol meaning is unchanged. |
| P1 | OPEN, mandatory: semantic extraction/deduplication/current-suite mapping of the historical inventory and complete-decision oracle adoption. Provenance verification does not close it. |
| P2 | OPEN, mandatory: complete per-packet orchestration and full current-profile corpus, oracle negative controls, cumulative completion review and independent exact-candidate acceptance. |

No new Kernel defect was discovered or patched. The pending classification, V-D1 and V-ENV holds
remain in force. No old runner is retired; no audit draft is adopted. The foundation uses the
current identity implementation without treating its historical acceptance as proof of future
coverage. Tools do not infer authorization or acceptance from metadata.

## Validation at clean C

Environment: macOS 26.6.2 arm64, Node v25.2.1, Python 3.14.6.
All commands below exited 0 at clean C:

| Command | Observation |
|---|---|
| `npm run test:packet-tools` | 39 tests passed. |
| `python3 -B scripts/packet_tools.py inventory --revision 3c91db1f3dd2cc9110edc271d1b7ddd46bc88c45 --spec tests/fixtures/packet-tools/inventory.json` | 208 artifacts, 1,333 prose mentions, 8 additions; all 1,549 still pending adoption. |
| `python3 -B scripts/packet_tools.py mutations --revision 3c91db1f3dd2cc9110edc271d1b7ddd46bc88c45 --spec tests/fixtures/packet-tools/mutations.json` | One control passed; one named identity mutant killed. |
| `npm run typecheck` | Passed. |
| `npm test` | 3,774 passed; 447 suites; 0 failed/cancelled/skipped/todo. |
| Local documentation and scope checks | 13 links/anchors valid before this report; 13 payload files all within the declared foundation scope; `git diff --check` clean. |

The outside-repository handover holds command argv, source SHA, environment, exits, raw logs and
SHA-256 digests. These runs are cheaply reproducible; no generated logs or self-referential source
identities are committed as payload. The wrapper check will use [verification.json](verification.json)
at C and the full H supplied externally.

Not run: historical executable probes, the complete standalone Kernel sweep command, new
behavioral evals, remote push checks or an independent review. The new tools were exercised through
controlled fixtures and the selected real identity case; this is not broad mutation coverage.

Third-party review: no third-party source was copied/adapted, no dependency/service added, and no
new license clearance asserted. Code is independently written using the existing Python/Node/Git
runtimes. Historical source is read to verify provenance; its code is not incorporated into the
new runner. Existing project `identity.ts` is executed unchanged except in temporary test copies.

## Handoff

The owner can return to main after this report is committed. Main has not advanced; local branch
`codex/tools-01` retains the release and implementation. Continue Claude's research separately and
save its results outside the repository; do not import them as owner decisions automatically.

The external handover lists P1/P2 tasks, all still-open binding choices, exact B/C/H, verification
results and a copyable research-continuation prompt. Reuse this branch for subsequent TOOLS-01 work.
Before further implementation, reconcile the research with [design 01](design-01.md); before
review-ready, finish P1/P2, create a new completed payload/report candidate and obtain independent
review. No successor starts from this partial handover.
