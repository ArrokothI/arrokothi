# K1.0 final cleanup 01 — REOPENED; integration on hold

## Authority and identities

Owner instruction: the 2026-09-13 message in this task explicitly delegates final verification,
faithful transcription, administrative closure or evidence-based reopening, scoped commits and a
non-force branch push; manual merge remains the owner's action. It specifically requires preserving
historical ACCEPT and creating a linked corrective packet when new evidence invalidates accepted work.
Actual actor: Codex, owner-delegated final-cleanup agent in this task, not the independent reviewer.
Date: 2026-09-13, America/New_York. Governing policy: [006](../../006-development-process.md) at
`c9a9ed7e6e538ab0542fc6a999426264abb6212a`; [008](../../008-implementation-report.md) records and
[012](../../012-review-methods.md) methods. Repository slice-audit skill applied.

- Packet: K1.0; parent K1; branch `codex/k1.0-target-boundary-legacy-quarantine`.
- Configured remote: `origin`, `https://github.com/ArrokothI/arrokothi.git` (unchanged).
- Full base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
- Clean payload C: `d693d59aefe5335c8950d57cec6d6b57e375cadc`.
- Historically accepted H: `f3aa29d7ecba2a23aa85788b7efdebdd383cab24`.
- Authentic acceptance-record A and inspected pre-cleanup head:
  `36595f57d1f8cec8c4bf8a6293e888ca27750fab`.
- Contract: [revision 16](contract.md), SHA-256
  `ba4096effcfd70cb87d5c39bc2ad84294d434c520f2bc0ad1df609bf1bdc3e8f`.
- Independent [review-17](review-17.md): OpenAI GPT-5.6 Sol (High), separate reviewer role,
  2026-09-13, session identifier not exposed. ACCEPT names H above, C1–C9 PASS. It records
  pinned GitHub source/evidence access, inspected logs, no shell reruns or digest recomputation.
  This cleanup preserves that record verbatim; it does not invent a new review identity or ACCEPT.
- Owner release and E1 exception: [contract release provenance](contract.md#release-provenance-and-the-e1-dependency-decision).
  K0.2 accepted H `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`, integrated as
  `0535160e677231da41b06d9f822e62e2f0364dd1`; [receipt](../K0.2/integration-01.md).

## Identity, remote and cumulative disposition

The initial checkout/index was clean on the scoped non-main branch. A fresh fetch and advertised-ref
check found remote main exactly equal to base and remote packet head exactly A. Base, C, H and K0.2's
integration are ancestors of A. Thus there are no intervening main changes or merge conflicts to
resolve; no branch switch, rebase, merge or force push was performed.

C..H matches implementation-16's declared allowlist: implementation-16, ten validation-16 logs and
MANIFEST, and status transcriptions in 001/007/development README. H..A adds only review-17. There is
no post-review source, test, fixture, contract, evaluator, configuration or evidence modification.
A already supplies the authentic ACCEPT naming H; no replacement acceptance commit is needed.
The ledger transcription in this cleanup records that historical acceptance and its new hold together.

The cumulative base-to-head change adds the private refusal-only target package, workspace wiring,
shared module scanner/policy, inventory oracle/controls, legacy guard rename, documentation and
preserved packet records. No legacy production/provider/SDK/example paths changed; the frozen
`tests/conformance/k0` is byte-identical to base. The new finding concerns the C4 guard's value
interpretation, not a legacy Runtime defect or a newly implemented protocol. Prior finding
dispositions are preserved in [implementation-16](implementation-16.md#prior-findings) and review-17;
K10-R14-01/K10-R15-01 remain historically closed for their demonstrated heading cases.

Read-only advertised benchmark refs still match the entry identities: E1 H2
`8de04779d279dba82cf834d419e465d2b677ef46`, C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, main
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`. Preparation is built, unaccepted and NO_RESULT;
no new benchmark run or decision is claimed. No benchmark files were edited. GitHub PR search for
the exact branch returned no matching PR; no PR was created or commented on.

## Cleanup finding K10-CLEANUP-01 — P2 — C4 whole-cell meaning is lost

**Provenance:** newly found and reproduced by the delegated cleanup agent, not attributed to Sol.
**Affected revision:** H above (also identical code in C and A).
**Location:** `tests/conformance/architecture/inventory-oracle.ts:1438–1445`,
`parseDependencyTable` value decoder; consumer at `kernel-landing-zone.test.ts:696–751`.
**Governing obligation:** K1.0-C4's total parsing, malformed-row rejection, and measured file-count /
workspace / third-party relation comparison; 012 requires checking the whole observable result.

Starting with the real inventory's unique target row, replace only that row in memory:

| Cell change | Actual accepted-H interpretation | Required outcome |
|---|---|---|
| Count `2` → `2.5` | `files: 2`, no unreadable row | Reject a fractional file count; never equate it with 2 |
| Count `2` → `2oops` | `files: 2`, no unreadable row | Report malformed whole-cell value |
| Workspace reaches `nothing` → "nothing, `@arrokothi/core`" | Empty set, no unreadable row | Preserve the named edge for disagreement or reject the contradictory cell |
| Third-party reaches `nothing` → "nothing, `evil-package`" | Empty set, no unreadable row | Preserve the named edge for disagreement or reject the contradictory cell |

The [raw demonstration](cleanup-evidence-01/cell-decoding-counterexamples.log) quotes its complete
program and output. All four mutated documents produce a dependency parse deeply equal to the valid
baseline, and zero ownership disagreements. Therefore the existing downstream measured-tree
assertions cannot distinguish these false/malformed document claims from the baseline they accept.
The baseline passes the fresh full suite. These are ordinary existing GFM table rows; no disputed
heading grammar, exotic whitespace or unsupported renderer feature is involved.

Root cause: `Number.parseInt` accepts a prefix instead of validating the full count; substring
`includes("nothing")` discards the rest of a dependency cell. Structural row accounting does not
establish faithful cell accounting. Shared key-before-value ordering catches duplicates but does not
repair this loss for a single row. Earlier malformed-count controls use `not-a-count` alongside a
correct duplicate; they do not distinguish partial count acceptance or mixed empty/nonempty values.
This explains the coverage gap without guessing the reviewer's private reasoning.

**Required correction:** derive a coherent complete-cell grammar for the governed inventory values,
preserve every asserted relation or report an unreadable cell, and trace decoded values through all
four keyed tables and their comparison consumers. Audit other prefix/subset/sentinel normalizers for
the same loss; retain permitted formatting and current baseline acceptance. Do not fix this merely
by blacklisting these four strings. The implementer decides the mechanism within the existing C4
contract; a scope/normative change uses 006's amendment/blocker path.

**Validation:** distinguishing tests through real inventory parsing and downstream comparisons for
the four cases, positive valid-count and valid empty/nonempty dependency twins, and the adjacent
whole-cell decoder family. Preserve earlier row/duplicate/section/whitespace and scanner controls.
Recheck cumulative C1–C9, clean new C and report/evidence H under 006/008, followed by a fresh separate
independent review. Cleanup supplies no substantive fix and cannot self-accept a correction.

## Remaining coverage and evidence

| Obligation / interaction | Cleanup observation |
|---|---|
| C1/C2/C9: target graph, scanner, forbidden and permitted controls | Source inspection covers AST/preprocessor extraction, sentinel, resolution, traversal and policy; meaningful existing controls remain. Fresh full suite passes. No new blocker found here. |
| C3/C6/C7: compatibility, refusal and preserved legacy assertions | Base diff leaves legacy/public code unchanged, target has only two refusal exports and is private. Renamed guard retains original comparisons and explicit scanner changes. Fresh suite/typecheck pass. |
| C4/C5: inventory relations and assigned owners | Read policy, inventory, block/section/table/cell pipeline and comparison consumers. Twelve assignments remain; new whole-cell counterexamples invalidate C4, despite correct actual inventory and existing green controls. |
| C8: release/prerequisite | Pinned owner exception, K0.2 receipt/ancestry and benchmark refs checked. No E1 credit. |
| Administrative identity and raw evidence | C/H/A intervals checked; all ten validation-16 SHA-256 digests recomputed and matched. Historical reviews and log identities preserved. |

Fresh reruns at pre-cleanup A, identical to H for all executable inputs: `npm test` (2030 tests,
299 suites, zero fail/skip), `npm run typecheck` (clean), `npm run check:builder-docs`
(26 files / 284 links+anchors / 38 imports), all exit 0. Accessible raw outputs/digests are in
[cleanup evidence](cleanup-evidence-01/README.md). The counterexample command also exits 0, meaning
it successfully demonstrates the defect, not that the mutant is correct.

After the reopening status/summary edits, the architecture suite was rerun on the administrative
working tree: 330 tests, 34 suites, zero failures/skips, exit 0; raw output is linked above.
Final staged local reference/anchor checks passed for 106 references, and every original packet heading was preserved. Raw typecheck output retains npm's trailing blank line (the sole `git diff --check` warning); administrative prose has no whitespace errors. The final
staged scope check requires only administrative docs and observation outputs, with no changed
accepted source/test/contract/raw evidence.

Inspected pinned validation-16 logs: conformance 1917 tests, kernel 4, SDK 22, focused C4 186;
these aliases were not rerun separately because the fresh full suite contains their tests. Inspected
round-16 demonstration/audit evidence supports its prior whitespace correction only; it does not
cover the new cell-value issue. Evals, native Drivers, durability, containment, packaging and E1 gate
were not run and remain outside this structural packet. No claim of exhaustive Markdown equivalence
or independent re-acceptance is made. Historical raw logs were not all rerun; their retained checks
and identities are not a substitute for the new distinguishing cases.

No third-party implementation/dependency was incorporated during cleanup. Original code/dependency
provenance remains in the implementation reports; this cleanup adds administrative prose and quoted
original observation commands only.

## Invalidation, correction handoff and owner action

**Historical ACCEPT at H remains recorded. Its use for C4 claims, integration and dependent release
is now ON HOLD due to K10-CLEANUP-01.** Cleanup is REOPENED, not complete or merge-ready.
The linked corrective packet is [K1.0-correction-01](../K1.0-correction-01/handoff-01.md), recorded as
CHANGES_REQUESTED under the owner's explicit reopening delegation. It corrects the accepted packet;
it does not release K1.1 or replace any K1 milestone obligation. No implementation occurs in cleanup.

Owner action: give that copy-ready fixing handoff to a coding session; obtain new C/H validation and
fresh independent review, then repeat cleanup before manual merge. K1 stays open; no integration
receipt exists for this work. `next_release: none`.

The owner's conditional request to revise universal Prompts B/C (paragraph formatting, explicit
fixing-prompt deliverable, progress-based escalation rather than a turn cap, and an optional brief
continuation preamble) remains pending because this packet failed cleanup. 009 and governing policy
are unchanged; the corrective handoff already supplies the concrete fixing prompt needed now. 014
is updated with this hold so its earlier planning snapshot cannot be mistaken for current status.

Only the new cleanup/correction evidence and administrative status/summary changes are committed.
The external handoff will supply the actual pushed head and advertised remote SHA after verification;
this record does not predict its own commit or a successful future push.
