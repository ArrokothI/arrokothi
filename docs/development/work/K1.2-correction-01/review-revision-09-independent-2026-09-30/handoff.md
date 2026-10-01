# Compact correction handoff

Correct the same released packet K1.2-correction-01 on `codex/k1.2-correction-01-activation-identity`.

Base `a20d278185eaffc7f8b7489345a3624231ff6e6d`; reviewed H `4a917f8caac04e7d9861e0ec3638662d52f9d3ae`; review record `review.md` in this delivered bundle, SHA-256 `9474d1a407150d2c5ae20c3da4a930ed386f97a6c8bb3b670ef197a6fb3c7969`.

Open findings: `K12C1-R9I-ORACLE-01`, `K12C1-R9I-SCOPE-01`. Required outcomes, exact H locations and counterexamples are in that immutable report; probe source, outputs, full pinned source and cumulative diff are included.

Owner supplemental authority: contract revision 9, amendments 01–03 and K1.2 decision-05 at the reviewed H. Unresolved architecture authority: none. V-D1 remains transferred and both invalidation holds remain.

Apply governing 006 and 012: close the affected semantic subsystem and its dependencies, then re-review the whole cumulative packet. Fix additional in-scope defects with separate provenance. The correction mechanism is the implementer's choice within scope.

Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release. The branch has later work; do not reset it to H or treat this review as a verdict on that later candidate.
