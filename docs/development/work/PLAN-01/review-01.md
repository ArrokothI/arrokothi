# Independent review — PLAN-01

## Identity and authority

- Reviewer: Codex, GPT-6, independent review session, 2026-09-23; local Git, source, shell and evidence access. This session did not implement the candidate.
- Governing process: **`70467f4cf76896529486499db24fcaa953292491`**, 006/008/012 at that revision. The amended 006/009 are reviewed payload and do not govern their own acceptance.
- Base: `0c82b2ffdf65b733c4e67b089e45b2529499b74f`.
- C: `77194248b73664a7fdf9dffcd8c356099af55fd5`.
- Reviewed H: **`a6481c3b85811adb94f35d5309e04b9f3d9fc2ac`**.
- Contract at H: `contract.md`, Git blob `73612cb1b6dc8cf1a0a08bcf72234ea0393a5d47`.
- Reviewed the entire base..C payload and C..H administrative diff. The latter is only the report, four raw-output attachments and PLAN-01 ledger row. Earlier packets on this branch are independently reviewed and are not implicitly accepted here.

## Independent coverage and checks

The obligation map covers single ownership of plan/status/semantics, existing versus proposed gate obligations, exact-attempt late submissions and operational reports, wait selection counterexamples, fixture readiness and bridge identity, research-to-packet routing, and implementation/review/cleanup authority through a held successor launch.

Compared packet seeds with execution-cycle's acceptance ordering, delivery-report boundary and retry/takeover table; waits' five distinguishing examples and cancellation interaction; actions' Effect families and open markers; the relevant research P4/P6/P7, substrate questions, and MCP backlog items 8–9. These are checks of how this candidate routes research, not fresh verification of third-party products or adoption of their source.

Launch simulation: Prompt A reads 007, whose explicit opening hold stops K1.2 despite its historical released/ready row. Review completion alone cannot lift it: the owner's creation-page rewrite and recorded final check are also required. Once lifted, semantic changes go into C together with Layer-3 maintenance. Prompt B checks normative changes; Prompt C verifies them and still requires a separately reviewed correction for missing substantive content. Implementation choices retain their marker and are recorded as implementation choices; a gate-owned resolution states its rule and removes its marker. The acceptance/integration/release distinction and independent review requirement remain intact.

Independent validation on clean H, Node v25.2.1: `npm run check:builder-docs` exited 0 (72 Markdown files, 1,715 links/anchors, 38 imports); payload `git diff --check` exited 0. Full-SHA historical Git targets referenced by current documents are locally resolvable. Compared the renamed Prompt C inbound link and the new research/owner anchors with their destinations. Recomputed all four candidate attachment digests and inspected their outputs. `npm test` also passed 2,323/2,323 with no cancellations/skips and typecheck passed during the combined review; those runtime results do not prove the prose obligations.

## Criteria

| Criterion | Result | Reason |
|---|---|---|
| PL-1 | PASS | 001 owns the product sequence and preserves R2's bounded 1.0 role; roles.md links that plan while preserving Runtime optionality for Kernel conformance. No new Kernel type or evidence gate follows. |
| PL-2 | FAIL | The K1.0 paragraph is removed and its facts remain retrievable, but 001's opening still independently states current K0 acceptance/integration/closure facts. See PLAN-R1-01. |
| PL-3 | PASS | Human input is explicitly its own Effect shape, consistent with actions.md; no operation-schema requirement is introduced for it. |
| PL-4 | PASS | Seeds distinguish new exchanges from retries/takeover, require old exact receipt replay versus conflicting refusal, prohibit current-attempt inference, and keep late operational reports from mutating logical state. These follow the canonical acceptance ordering and delivery boundary. |
| PL-5 | PASS | All five wait examples are required separately, including spare-capacity exclusion and arrivals between wake and reservation; cancellation's late report cannot reopen logical state. |
| PL-6 | PASS | E1 readiness is checked before K1.3 closure; unavailable evidence blocks the gate rather than weakening it. A size-driven split preserves K1.4's bridge identity and requires the normal amendment path. |
| PL-7 | PASS | K2.2 owns schema/validator choice and preserves the unassigned dispatcher question; MCP error/schema cases are inputs. K2.4 may map or refuse elicitation. R1.1 records retry/fidelity ownership, K3.1 proposes owner-approved substrate/history criteria, K5.1 requires an explicit stream gap. No native design is imported as a portable Kernel contract. |
| PL-8 | PASS | 006, all three prompts and the map consistently place required Layer-3 edits in the reviewed payload; missing edits still require new C/H and independent review. Cleanup cannot silently extend acceptance. |
| PL-9 | PASS | Cleanup role is model-neutral and the live inbound Prompt C anchor is repaired. Historical model names in sealed records are not rewritten. |
| PL-10 | PASS | The opening hold explicitly overrides early launch and requires an owner record of all conditions. |
| PL-11 | PASS | Rewrite index retains open-choice/editorial ownership below canonical owners; mechanism schedule is prospective timing, not a parallel status ledger. |
| PL-12 | PASS | Seven legacy names route to current concept owners as closest concepts, expressly not renames; baseline remains the implemented API owner. |
| PL-13 | PASS | K1.2's map adds lifecycle transitions and core's Outcome/batch acknowledgment owners without treating the map as a whitelist. |

No required criterion is deferred or left unexamined. Runtime implementation, rewriting mechanism pages, updating 014 after acceptance and executing research/benchmark experiments remain outside this packet. No new third-party material or dependency is incorporated.

## PLAN-R1-01 — P2: finish removing current status from the roadmap opening

Location at H: `docs/development/001-current-status-and-roadmap.md:9–11`; contract PL-2.

Immediately after saying current packet status is read in 007, 001 still says K0.1, the post-K0.1 process review and K0.2 **are accepted, integrated and owner-closed**, then states K0 closure with accepted E0 evidence. These are the very acceptance/closure facts PL-2 assigns exclusively to 007. Deleting the K1.0 paragraph alone leaves another current-status copy to drift independently. Their present correctness does not satisfy the ownership criterion.

Required outcome: remove or recast these sentences as historical provenance/navigation without maintaining current acceptance/closure status in 001. Keep exact current facts in 007 and its linked records, and recheck the opening against PL-2. No semantic decision, new gate or runtime change is required. This is the packet's own explicit requirement, not a request to expand it into a general documentation rewrite.

## Correction handoff and verdict

Correct PLAN-01 on `claude/pre-k1.2-reviews`, base `0c82b2ffdf65b733c4e67b089e45b2529499b74f`, reviewed H `a6481c3b85811adb94f35d5309e04b9f3d9fc2ac`. Open finding: **PLAN-R1-01**. Preserve the governing review baseline `70467f4cf76896529486499db24fcaa953292491`; prepare new C/H with relevant documentation checks and cumulative review. Recommended packet state: **CHANGES_REQUESTED**. K1.2 remains held; this review releases nothing.

CHANGES REQUIRED
