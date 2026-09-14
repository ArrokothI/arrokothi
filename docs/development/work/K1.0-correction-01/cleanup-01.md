# Final cleanup — K1.0-correction-01, attempt 1

## Authority and identity

Owner instruction: on 2026-09-13 the owner designated this Codex session as the delegated final-cleanup agent for reopened K1.0, specifically `K1.0-correction-01`, and authorized verification, administrative closure or evidence-based reopening, scoped commits and a non-force branch push. The owner reserves manual GitHub merge. The subsequent “continue” preserves that scope. Actual role: Codex owner-delegated cleanup, not the independent accepting reviewer; session/model identifier is not independently exposed. Governing policy: 006/007/008/012 at the integrated base below. No subagents or implementation fixes were used.

| Identity | Full value |
|---|---|
| Packet / parent | K1.0-correction-01 / K1.0, milestone K1 |
| Branch | `codex/k1.0-target-boundary-legacy-quarantine` |
| Checkout | `/Users/rex-shih/Documents/ArrokothI/arrokothi`; packet records under `docs/development/work/K1.0-correction-01`; no separate checkout was selected or switched |
| Configured origin | `https://github.com/ArrokothI/arrokothi.git` |
| Governing/original base | `c9a9ed7e6e538ab0542fc6a999426264abb6212a` |
| Clean payload C | `36460438e95e968beec0b354b07a616b53981256` |
| Independently accepted H | `1295c68b03ae5d8eb0bbb86e974353402ff9a518` |
| Existing acceptance record A / inspected pre-cleanup head | `41728edfc3cfc5c745e4293c511a740942f7b631` |
| Freshly fetched and advertised remote main | `c9a9ed7e6e538ab0542fc6a999426264abb6212a` |
| Advertised packet branch before cleanup | `41728edfc3cfc5c745e4293c511a740942f7b631` |
| Contract binding | K1.0 revision 18; K1.0-correction-01 revision 2, both at C/H |

Authentic independent record: [review-02](review-02.md), OpenAI GPT-5.6 Sol (High), 2026-09-13, explicitly separate from implementation; session identifier unavailable to that reviewer. It inspected pinned GitHub source and raw evidence, did not rerun shell commands, and ACCEPTED C1–C9 at H. The owner-authored recording commit A adds that review alone. H..A is exactly `docs/development/work/K1.0-correction-01/review-02.md`; no payload changed after review. The missing live-ledger transcription is repaired with the historical ACCEPT and the new hold together, without inventing another review identity or extending acceptance to cleanup edits. Historical reviews and evidence remain byte-unchanged.

C..H matches the report's 15-file allowlist: implementation-02, validation-02 MANIFEST and ten output logs, plus status-only changes in 001, 007 and the development README. C/H, the four-file round-2 payload delta and the cumulative original-base candidate were inspected, including the production oracle, dependency policy/scanner, package/refusal surface, inventory, relevant regression/control paths and surrounding migration/status records. Unchanged legacy sources, public manifests and the frozen K0 fixture were checked by cumulative diff, not assumed from the report.

K0.2's accepted H `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2` and integration `0535160e677231da41b06d9f822e62e2f0364dd1` are recorded in its [receipt](../K0.2/integration-01.md); the integration is an ancestor of freshly fetched main. K1.0's explicit owner release and exception for already-built, unaccepted E1 preparation remain in its [contract](../K1.0/contract.md#release-provenance-and-the-e1-dependency-decision). Benchmark advertised H2 is still `8de04779d279dba82cf834d419e465d2b677ef46`, C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb`, main `5a3f1ba525f68244701b1f73a1d29c4902ffe589`; the local pinned preparation is accessible. No E1 acceptance/result is inferred. Main equals the original base, so there are no incoming main changes or merge conflicts to reconcile. Initial sandbox DNS failure was resolved by the authorized network fetch; it is not a content invalidation or outstanding transport blocker. GitHub PR search returned no matching PR; `gh` is unavailable.

## Cleanup finding K10-CORR1-CLEANUP-01 — P2, C4

**Affected revision:** accepted H above, and identical oracle bytes at C and A. **Locations:** `tests/conformance/architecture/inventory-oracle.ts`, `inventoryDisagreements`, lines 1695 and 1732 at H. **Provenance:** newly found and reproduced by delegated cleanup, not attributed to reviewer-02.

**Defect:** both zone-root and export-subpath comparisons serialize arrays with `join(",")` and compare those strings. This representation discards element boundaries. The whole-cell decoder correctly distinguishes several code spans from one span containing commas, but the downstream comparator equates their different relations.

Concrete counterexample: replace the core export cell `` `.`, `./execution`, `./ports`, `./reference`, `./testing` `` with the single span `` `.,./execution,./ports,./reference,./testing` ``. The parsed array has one invented subpath rather than the five declared subpaths. Nevertheless, `parsed.unreadable` and `inventoryDisagreements(...)` are both empty. Likewise, replace the runtime-integrations root list with one code span containing its four sorted roots joined by commas: the asserted single root does not exist in the policy, yet the comparator reports agreement.

This violates K1.0-C4's bidirectional, whole-row relational agreement, its explicit forbidden dropped-subpath/wrong-root cases, and correction-01's required tracing into downstream relation consumers. It is an evidence-oracle defect, not a new Kernel protocol or production-runtime defect. The actual inventory remains correct. A passing guard cannot support its advertised rejection guarantee for false inventories.

**Required outcome:** preserve element identity and cardinality throughout relation comparison; unequal collections cannot agree merely because a display serialization collides. Trace the invariant from governed text through decoded collections into every comparison consumer and diagnostic. Do not solve only the two strings with a blacklist or regex restriction: the obligation is equality of the complete asserted relation. Correct additional in-scope occurrences with separate provenance; do not weaken accepted formatting, schema, duplicate or scanner obligations.

**Required validation:** the quoted read-only [probe](cleanup-evidence-01/relation-counterexamples.log) establishes 22 false accepted relations: all nontrivial contiguous partitions of the sorted five-export and four-root lists. New end-to-end controls must distinguish these or an equivalently derived family from permitted reorderings, retain exact membership/cardinality, and recheck dependency sets and Deferred scalar tuples. The probe verifies source bytes against H before importing them. Its exit 0 means successful reproduction, not successful packet validation. New clean C/H, contract-required checks and fresh independent review over original base..new H are required.

**Why the prior closure missed it:** round 2 reconstructed schema authority upstream of decoding. Its audit compared parsed relations to a reference, but challenged the final comparator only with real-document agreement and a changed scalar Deferred owner. That cannot expose a collision in list comparison. Review-02 rechecked header/arity ownership and scalar downstream behavior but recorded no distinguishing list-boundary comparison. K10-CLEANUP-01's decoder fixes and K10-CORR1-R1-01's schema fixes remain real progress; neither establishes downstream equality.

## Coverage, checks and limits

The [raw evidence index](cleanup-evidence-01/README.md) pins new logs/digests and source identities. Fresh reruns at clean A: `npm test` 2051/2051, 301 suites, zero failures/skips; `npm run typecheck` clean; `npm run check:builder-docs` 26 files, 287 links/anchors, 38 imports. The full suite includes scanner/architecture, evidence-record, Kernel and SDK tests; duplicate alias runs were unnecessary. All 18 existing validation manifests' raw log digests were independently recomputed. Pinned validation-02 outputs and the quoted schema-audit program were inspected, not represented as independent reruns of those original commands.

| Obligation / method | Cleanup observation |
|---|---|
| C1/C2/C9 — deterministic dependency guard | Inspected extraction/resolution/policy and permitted/forbidden/transitive controls; the two-file target graph is nonvacuous, nonliteral targets are rejected, and the fresh suite passes. No additional defect established here. |
| C3/C6/C7 — preserved public behavior/private surface | Cumulative diff leaves legacy/provider/SDK/example production and frozen K0 paths unchanged; new package is private and exports refusal only; legacy regressions remain, fresh full suite/typecheck pass. No shipped protocol or release claim. |
| C4/C5 — relational evidence and ownership | All four schema/decoder/consumer paths examined. C4 FAIL under the reproduced collection collision. Deferred scalar comparison and dependency array comparison still distinguish the adjacent mutations; twelve extraction owners stay assigned. |
| C8 — prerequisite provenance | Release exception and exact available preparation identities verified; no gate executed or credited. |
| Process/evidence | Authentic H-bound ACCEPT and review-only H..A verified; no post-review payload; all existing raw digests accessible. Reopening adds a separate finding and corrective handoff rather than cleanup self-acceptance. |

After writing the administrative records, all 118 relative links/anchors in the seven changed/new Markdown documents resolved, cleanup log digests matched their index, and `git diff --check` passed. A final `npm run check:builder-docs` passed with 26 files, 286 links/anchors and 38 imports; the lower link count reflects the condensed live status text, not a changed checker. Staged scope is limited to live status summaries, this finding/invalidation record, output-only evidence and the corrective scope/handoff. No code, test, fixture, contract, evaluator or policy fix is included. Final staging explicitly includes the five raw logs despite the repository ignore rule. The staged whitespace check reports only the typecheck command's original blank line at EOF in `cleanup-evidence-01/typecheck.log`; that raw byte is preserved, and the non-log administrative diff passes the check.

This is a cleanup check with selected counterexamples, not exhaustive parser verification or a new independent ACCEPT. No Agent eval/live-model, E1, packed consumer, crash, durability, isolation or native-Driver run was performed; none is a gate for this structural packet. Full cumulative independent review remains required after correction, including the unchanged parser layers and their interactions. No new third-party source, asset or dependency was copied/adapted/added in cleanup; the probe is original, read-only evidence.

Administrative clarifications from review-02: its exact binding is K1.0 contract revision 18 / correction contract revision 2, despite the older revision labels in the live contract/status prose. The schema-audit program hard-codes four header strings and uniqueness-checks them against the inventory; it does not independently derive those literals at runtime. This notice supersedes that provenance description without altering the pinned log/report/contract bytes. Those clerical issues are not the cause of reopening.

## Invalidation notice and disposition

**REOPENED.** Preserve independent ACCEPT at H and all earlier K1.0 ACCEPT/invalidation records. The new evidence invalidates use of the correction's C4 PASS for current claims, integration and dependent release. Those claims remain **ON HOLD**. Create [K1.0-correction-02](../K1.0-correction-02/handoff-01.md) as CHANGES_REQUESTED under 006's invalidated-accepted-work rule; it corrects released K1.0 and releases no successor. There is no unresolved normative decision or unavailable required input identified for this finding.

Cleanup is not complete; work is not merge-ready. Integration remains pending and held, K1 remains open, `next_release: none`. Next owner action: send the linked fixing prompt and the final pushed head to a coding session, obtain new C/H and fresh independent review, then repeat cleanup before manual merge. Universal Prompt B/C edits requested conditionally on successful cleanup remain pending; the immediate fixing handoff uses ordinary paragraph breaks and targets semantic progress rather than a turn limit. The external handoff will supply the final pushed head and verified advertised SHA; this record does not claim its own future push or a merge.
