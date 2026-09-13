# K1.0-correction-01 — whole-cell inventory fidelity

State: CHANGES_REQUESTED. Created administratively under the owner's 2026-09-13 explicit final-cleanup
reopening delegation and 006's invalidated-acceptance rule. This is correction of K1.0, not a
successor release. Governing policy/base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
The prior K1.0 acceptance and its new integration hold are recorded in [cleanup-01](../K1.0/cleanup-01.md).
No new implementation, C/H, independent acceptance or integration is supplied here.

Scope: resolve K10-CLEANUP-01 under existing K1.0-C4 and revalidate cumulative C1–C9. Preserve
existing K1.0 code, all historical reports/reviews/evidence, and the frozen K0 fixture. K1.0's
unaccepted E1-preparation exception still applies; no protocol, benchmark result or successor work.
The coding session records the bounded corrective contract/report using 006/007/008/012. Correction
closure requires fresh independent review of the cumulative original base to new H, not only a
review of the new delta. Any wider contract amendment follows 006; this handoff weakens no criterion.

## Fixing prompt — paste into the coding session

```text
Correct K1.0 through corrective packet K1.0-correction-01 on branch codex/k1.0-target-boundary-legacy-quarantine. Preserve other agents' work and inspect current local/remote head before editing.

Original base: c9a9ed7e6e538ab0542fc6a999426264abb6212a. Historically accepted H: f3aa29d7ecba2a23aa85788b7efdebdd383cab24; payload C: d693d59aefe5335c8950d57cec6d6b57e375cadc; acceptance-record A: 36595f57d1f8cec8c4bf8a6293e888ca27750fab. The new cleanup/correction records are in the pushed descendant supplied by the owner handoff. Pin that full head before starting and preserve it.

Read docs/development/work/K1.0/cleanup-01.md, finding K10-CLEANUP-01, and its cleanup-evidence-01/cell-decoding-counterexamples.log. These are delegated cleanup findings, not reviewer-17 findings. Historical ACCEPT is preserved, but C4 claims and integration are held. Owner supplemental authority is the explicit cleanup/reopening instruction recorded there; no unresolved architecture decision is identified.

The existing parser silently equates counts 2.5 and 2oops with 2, and discards named dependencies when a cell also contains nothing. Reconstruct complete-cell decoding and its downstream relation checks across the four inventory tables. Every asserted value must be preserved or rejected as unreadable. Derive valid forms and contradictory/malformed forms from the existing contract; do not blacklist only these examples. Keep positive formatting controls and earlier structural/duplicate/scanner regressions. Record additional in-scope findings separately.

Apply AGENTS.md and 006/012 correction closure, then review the whole cumulative K1.0 packet against C1–C9. Use 008 for the corrective report and 006 for new clean C, validation, H and push/evidence identities. Hand off for a fresh separate independent review. Do not self-accept, merge, release K1.1 or claim an E1 result.
```

This prompt uses ordinary paragraph breaks without hard wrapping inside paragraphs. Use it when
starting a fresh coding session for this corrective packet; carry the latest pinned correction
report/open findings when continuing, rather than pasting the entire prior conversation. No turn
limit or agent-switch requirement is introduced by this administrative handoff.
