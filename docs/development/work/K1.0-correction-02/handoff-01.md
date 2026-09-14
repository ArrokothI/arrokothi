# K1.0-correction-02 — collection identity in inventory comparison

State: CHANGES_REQUESTED. Created under the owner's 2026-09-13 final-cleanup delegation and 006's invalidated-acceptance rule. This is correction of released K1.0, not a successor release. The authoritative finding is [K10-CORR1-CLEANUP-01](../K1.0-correction-01/cleanup-01.md#cleanup-finding-k10-corr1-cleanup-01--p2-c4), with [raw reproduction](../K1.0-correction-01/cleanup-evidence-01/relation-counterexamples.log). Historical independent ACCEPT of correction-01 at H `1295c68b03ae5d8eb0bbb86e974353402ff9a518`, recorded at A `41728edfc3cfc5c745e4293c511a740942f7b631`, is preserved; C4 claims and integration are held.

Scope: repair the collision-prone comparison of complete inventory relations under existing K1.0-C4, trace all four table consumers, preserve the decoder/schema/structural/scanner corrections and revalidate cumulative C1–C9. The coding session records its bounded contract and new C/H under 006/008/012. No criteria are added or weakened, no production semantics are changed by this handoff, no E1 result is claimed, and no successor is released. `next_release: none`.

## Fixing prompt — paste into a fresh coding session

```text
Correct released K1.0 through K1.0-correction-02 on branch codex/k1.0-target-boundary-legacy-quarantine. Inspect current local/remote state and preserve other agents' work. Pin the pushed cleanup head supplied with this handoff before editing.

Original base: c9a9ed7e6e538ab0542fc6a999426264abb6212a. Reviewed correction-01 H: 1295c68b03ae5d8eb0bbb86e974353402ff9a518; C: 36460438e95e968beec0b354b07a616b53981256; authentic review record: docs/development/work/K1.0-correction-01/review-02.md at A 41728edfc3cfc5c745e4293c511a740942f7b631. Preserve that ACCEPT and its subsequent invalidation notice.

Open finding: K10-CORR1-CLEANUP-01 in docs/development/work/K1.0-correction-01/cleanup-01.md at the supplied cleanup head. Read its required outcome and raw reproduction. Owner supplemental authority is the explicit cleanup/reopening delegation recorded there; no unresolved architecture decision is identified. The existing K1.0 release and unaccepted E1-preparation exception still apply.

Reconstruct collection identity through the full inventory evidence path. Whole-cell decoding preserves elements, but inventoryDisagreements joins them with commas before comparison, so one comma-containing token can pass as several distinct roots or export subpaths. Fix the equality invariant and every affected consumer, not only the reported strings. Derive distinguishing collection/cardinality cases and permitted reorderings independently; inspect Dependency and Deferred consumers too. Explain why previous correction coverage missed the downstream loss. Keep earlier regressions and record additional in-scope defects separately.

Apply AGENTS.md and 006/012 correction closure, then re-review the whole original-base-to-candidate K1.0 packet against C1–C9. Use 008 for a new report and 006 for clean C, required validation, H and verified push/evidence handoff. Obtain a fresh separate independent review. Do not self-accept, merge, release K1.1 or claim an E1 result.
```

Use this at the start of a fresh coding session for the correction. When continuing the same correction in another session or model, prepend only: “Continue the same released correction. Re-establish the latest pinned head, open finding outcomes and semantic coverage from the linked records; preserve completed work and recheck its dependent paths.” Then include the latest reviewer fixing handoff. There is no periodic five-turn reset or fixed 15–20-turn cutoff.

## Owner note — progress and repeated failure family

The decoder and schema corrections are substantive progress. The recurring problem is loss of asserted meaning at another stage of the same pipeline: discovery/accounting, then whole-cell decoding, then schema ownership, and now relation comparison. Judge the next correction by whether it preserves collection identity end to end and produces distinguishing evidence, not by turn count. A fresh implementation session or model can help challenge inherited assumptions; a regex for each reported string would leave the governing equality defect unresolved. This is a cleanup observation for the owner, not a statement attributed to the independent reviewer or a mandatory agent switch.
