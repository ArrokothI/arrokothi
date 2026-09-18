Remaining finding
R1 — Recycling store needs a separate logical ID
Candidate passage / location: core.rewrite.md L52: “A store that recycles primary keys therefore needs a separate logical ID that it never recycles.”
Classification: UNDECIDED PRESENTED AS DECIDED
Why problematic: Logical never-reuse is decided. How a store implements it is not. The sentence assumes store primary key equals Execution ID and then mandates one implementation — a separate logical ID — excluding equivalents such as non-recycled surrogate keys with tombstoned retention. Reasonable engineering, but storage schema is implementation-owned within fixed semantics, not selected here.
Governing evidence:
mental-model/concepts/core.md#execution ID never reused, WS ID-1 — decides logical rule only;
mental-model/rewrite-index.md §4 and mental-model/sources.md#intentionally-unselected-choices — storage schema implementation-owned;
mental-model/concepts/state.md#retention-pin-and-tombstone — tombstone is a distinct retention pattern, not a mandated separate logical ID.
Narrowest safe correction: Keep only the decided consequence: a store must still uphold logical never-reuse. Delete the “therefore needs a separate logical ID” mandate, or explicitly mark it as one non-normative example.
Confidence: MEDIUM
Required corrections
R1 only. Trivial deletion/softening. No other correction required before adoption.

Questions requiring owner judgment
Is any store-guidance sentence needed on this page at all, or should storage consequences live entirely with retention/evidence owners? If kept, owner should confirm the softened “must still uphold never-reuse” wording without selecting schema.
No other owner decision required. Driver cardinality, Definition form, contract-vs-codec, batch emptiness, WAITING exits, and delivery reporting now correctly leave undecided choices open with TODOs or accurate deferrals.

Original-content coverage
Preserved: All canonical core definitions and load-bearing rules verified present with correct owners and links, including added epoch/intent pins, two-disposition rule, mandatory wait-ended member, deadline as WAITING exit, duplicate-receipt semantics, and delivery-reporting limits.
Intentionally unnecessary: Nothing from core.md requires restoration. Added narrative, counterexamples, and distinguishing cases remain valuable and need no shortening.
Moved/delegated appropriately: Grammar/selection to waits.md, pins/acceptance/reporting to execution-cycle.md, cancellation/completion to lifecycle.md, creation/conflict to creation.md, codec/limits to values.md, progress/checkpoint to state.md, view/roles to roles.md, worker/host/clocks to operations.md. No normative duplication introduced.
Genuinely missing: Nothing after R1 is softened. F3 hole from the first pass is closed.
Overall result
CORRECTIONS REQUIRED


---Judgement--
R1 is F9 again, and I'm rejecting the classification a second time. Accepted K0.1 ID-1 reads verbatim:

an Execution ID is never reissued to a new logical Execution even after the original is deleted/GC'd. A store that recycles primary keys must remap through a separate never-reused logical ID.

That is a decided rule with "must", not an implementation preference. Muse's three pieces of evidence don't overturn it:

"WS ID-1 decides logical rule only" — it doesn't; the store clause is the second sentence of ID-1.
"storage schema is implementation-owned" — true as a general statement, but the worksheet's own "Left open" note for the identity section lists exactly three implementation-owned items (receipt serialization, epoch representation, request-key hashing) and this isn't among them. A general permission doesn't repeal a specific mandate.
"tombstoned surrogate keys are an excluded equivalent" — a non-recycled surrogate key is a separate never-reused logical ID, so that's the same pattern, not an alternative. Tombstones are a retention mechanism for deleted payloads, a different concern.

---another advice---
Judgment call, not a defect: the Driver section's delivery-reporting stretch. Four paragraphs of it (promise rejected, first report wins, reports touch no state) is the one stretch closest to mechanism territory, with its owner at execution-cycle.md#delivery-reporting-boundary. I think it's worth it — the Driver definition implies the reporting capability, and the old silence was exactly what bred confusion — but if this page ever needs trimming, that's the first candidate.