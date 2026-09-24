# PLAN-01 — Pre-K1.2 planning and process amendments

**Owner release:** explicit owner instruction, 2026-09-23, after a pre-K1.2 review of the roadmap, the
role launchers and `docs/research/`. **Governing process baseline for this review:** integrated main
`70467f4cf76896529486499db24fcaa953292491`. The amended 006/009 text below does not govern its own
review, and it relaxes no acceptance condition.

This packet changes planning, process wording and navigation. It changes no Kernel semantics, no
gate, and no acceptance or release fact.

## Owner decisions recorded here

- **OD-1 — Product sequence.** The Kernel/Driver foundation (K1–K5 with R1) comes first. ArrokothI's
  own Agent and Workflow systems are built on it afterwards, as Execution Runtimes behind the same
  boundary, evaluated with the Kernel held fixed. They are optional for Kernel conformance, not as a
  product direction. R2 stays the 1.0 slice.
- **OD-2 — K1.2 start hold.** K1.2 stays released; its implementation starts only after independent
  review of K1.1-correction-02, DOCS-CLEANUP-01 and this packet, the owner's rewrite of
  `mechanisms/creation.md`, and an owner final check.
- **OD-3 — Layer-3 maintenance lives in the candidate.** A semantic candidate carries its Layer-3
  updates as payload, reviewed with its code; delegated cleanup verifies them. The K1.1 experience
  motivates this: its reference maintenance needed a separate packet (K1.1-reference-01) and review.
- **OD-4 — The rewrite index stays.** `mental-model/rewrite-index.md` is the maintained owner of the
  open-choice inventory and marker convention, the dangerous-inference reminders and the editorial
  conventions. This settles DOCS-CLEANUP-01's deferred question about moving those responsibilities.

## Criteria

| ID | Criterion | Where |
|---|---|---|
| PL-1 | OD-1 is recorded where milestone sequence is owned, adds no gate, and Layer 3 points to it without restating a plan or status. | 001 "Sequence and ownership", R2; `concepts/roles.md` intro |
| PL-2 | 001 carries no current-status prose that 007 owns; the removed paragraph's facts all remain in 007 or its linked records. | 001 opening |
| PL-3 | 001's K2 wording matches the concept vocabulary: a human input request is its own Effect shape, not an operation. | 001 K2; `concepts/actions.md#effect` |
| PL-4 | K1.2's seed owns the late delivery-report cases `execution-cycle.md` assigns it, the next-exchange case, and a refusal of any "current Activation" convenience path; its acceptance names distinguishing cases. | 007 K1.2; `mechanisms/execution-cycle.md#delivery-reporting-boundary`, `#retry-versus-takeover` |
| PL-5 | K1.3 requires the five existing distinguishing wait examples and the late-report-after-cancellation case. | 007 K1.3; `mechanisms/waits.md#small-distinguishing-examples` |
| PL-6 | K1.4 gains an E1 readiness check before K1.3 closes and a size assessment with a split path that keeps `K1.4` as the bridge identity cited by sealed records and code. | 007 K1.4 |
| PL-7 | Research findings enter the packet that owns them, as inputs or counterexamples rather than new gates: K2.2 (validator, `OPEN(K2.2)`, dispatcher question, MCP items 8–9), K2.4 (MCP elicitation disposition), R1.1 (retry owners, fidelity changes), K3.1 (substrate questions, history bounds), K5.1 (stream-gap adapter). | 007 |
| PL-8 | OD-3 is stated consistently in 006, 009 (Prompts A, B and C) and `mental-model/roadmap.md`, with no weaker review: documentation remains payload, and missing updates still need a scoped reviewed correction. | 006, 009, `mental-model/roadmap.md` |
| PL-9 | Prompt C and 006 name the cleanup role neutrally (no model-specific name), and every inbound link to the renamed Prompt C anchor is updated. | 006, 009, `mental-model/roadmap.md` |
| PL-10 | OD-2 is recorded in 007's opening summary so no launcher starts K1.2 early. | 007 opening |
| PL-11 | OD-4 is recorded in the rewrite index's header, and the mechanism rewrite schedule it holds names no status. | `mental-model/rewrite-index.md` |
| PL-12 | The reference index routes the 0.8.x authority/action names K1.4 will meet to their closest current owners, stated as not renames. | `mental-model/reference.md#common-search-terms` |
| PL-13 | K1.2's Layer-3 map names lifecycle and core, which its transitions and acknowledgment touch. | `mental-model/roadmap.md#k12` |

## Proof methods (012)

Process/documentation: simulate a K1.2 launch under the amended prompts and ledger (does the hold
stop it; does Prompt A now put Layer-3 edits in C; does Prompt C verify rather than author), check
policy ownership (status only in 007, sequence only in 001), and verify links and anchors. Normative
examination for PL-3–PL-7, whose amended wording must not change what the mechanism pages require.
No runtime suite proves a prose workflow; the full suite is run only to show nothing else moved.

## Exclusions

No mechanism page is rewritten here; the schedule only records when. No research proposal becomes
Kernel semantics. 014 is not updated: Prompt C maintains it after an ACCEPT.

## Third-party material

None. Research notes are cited as analysis, and their license notes are unchanged.
