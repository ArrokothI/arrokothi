# Compact correction handoff — review 12

Correct the same released packet K1.2-correction-01 on `codex/k1.2-correction-01-activation-identity`.

Base `a20d278185eaffc7f8b7489345a3624231ff6e6d`; reviewed payload C `81dca4575ea56cfdde5b5f8ed72c439c7ec31821`; reviewed H `4a917f8caac04e7d9861e0ec3638662d52f9d3ae`.

Authoritative review: [review-12.md](review-12.md), SHA-256 `8c8dbfc71e6b1424a4f3f1a4d7914838ac1857623101285ebf21709779810165`. The [evidence bundle](review-12-evidence/README.md) includes the full pinned source, cumulative and correction patches, raw reruns and reviewer probes; preserve it with this handoff.

Open findings: **K12C1-R12-ORACLE-01** and **K12C1-R12-SCOPE-01**. Required outcomes and counterexamples are in that immutable review: check complete allowed observations and reconcile actual fault-sweep reach with its declared scope. No sole patch is prescribed.

Owner supplemental decisions: amendment 01 / decision-05 at `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`; amendment 02 at `60eebc24113eb834e5d88015ca2a196c95c60493`; amendment 03 at `b93ed1df6b70569ada060481523e5b37c206e324`. No new supplement. Unresolved authority: none. V-D1 remains transferred and both invalidation holds remain.

Apply 006 and 012: close the affected semantic subsystem and its dependencies, then re-review the whole cumulative packet. Fix additional in-scope defects with separate provenance. Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release or merge is authorized.
