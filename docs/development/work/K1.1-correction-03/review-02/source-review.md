# Independent source trace at C

This records source inspection, not execution results. Execution logs and the final review determine the verdict.

## Ownership and stop paths

The change belongs to the Kernel's in-process value boundary and its evidence tooling. No Runtime cognition or provider semantics are introduced. Production changes are confined to `values.ts` and Proxy-first identity classification in `envelope.ts`.

`spend` and `charge` are the two stop writers. Both return false when they cross, and also when called on an already stopped state. `record` propagates the boolean; `refuse` translates it to the distinct `STOPPED` sentinel. The traversal's current call sites distinguish that sentinel from an ordinary refusal and from accepted false.

| Operation class | Current-C continuation traced |
|---|---|
| Visit and scalar byte charges | Visit failure returns before classification. Every scalar charge's false branch returns `STOPPED`. |
| Listing | Both helpers gate before the native operation, charge immediately afterward, and return `STOPPED` on crossing. Both container callers test immediately. |
| Element/descriptor/member read | Each charges before the observation. Its caller tests the sentinel before using the result or constructing the next member path. |
| String scan | The length preflight is bounded; a scanning charge crosses before character access. Both key and value callers immediately propagate the sentinel. |
| Diagnostics | Terminal refusals return `refuse`; nonterminal sites check `record` before the next loop, listing, byte charge, or sibling. This includes symbol/name aggregation and defensive missing/inconsistent descriptors. |
| Array continuation | Extra-name and symbol diagnostics return before index classification; structural byte charge returns before allocation; nested capture returns before `defineAt`, the next sibling, and freezing. |
| Object continuation | Symbol diagnostic returns before names; member diagnostics return before scratch growth, key scan/read, the next sibling, and snapshot construction. |
| Visit-covered and per-name helpers | They are reached between a successful preceding charge and the next possible stop. No current helper class hides another stop writer. |
| Unwind and root | A stopped nested frame returns immediately through the parents. The `finally` cycle-set delete is permitted; root count/result construction is bounded finalization. No refused snapshot reaches `encode`. |

The current source has no call-through-alias or class-method forwarding route in this stop graph. SC10's protection of future edits is a separate evidence claim, tested by the attached mutation probe. In particular its common `isStopValue` accepts both `false` and `STOPPED` without distinguishing a boolean-returning helper from a traversal returning `BoundaryValue`.

## Budget and work per unit

For accepted nodes, disjoint canonical spelling pays for each node's own work. An array of n>=1 has 2n+4 units and n+1 own bytes; an empty array has 4 units and 2 bytes. An object has 3n+3+sum(name UTF-16 lengths) units and at least 4n+1+sum(name lengths) own bytes. A string has 1+length units and at least length+2 bytes; other scalars have one unit and at least one byte. Thus total units <=3*canonical bytes, and monotonic charging cannot prematurely reject an otherwise valid root.

Cycle membership uses captured Set operations on at most 32 active containers. Foreign prototype chains are inspected at their immediate prototype only. Character scans preflight at 131,072 UTF-16 units; index classification reads at most ten units. Paths are bounded before concatenation and the collector retains eight details plus one suffix per code. The two stop codes are exclusive, so the new code does not require twelve simultaneous suffix kinds.

R1 returned listings, R2 host interceptors, R3 expected hash costs, and R4 hidden/deleted own storage remain the explicit owner-accepted residuals. Nothing in this review interprets the meter as CPU preemption, isolation, or a wall-time bound. Serialization is outside the meter and runs only on an accepted owned snapshot.

## Consumers and preservation

All value roots still converge on `accept(value)` with zero work/byte head start. Eager Outcome roots have independent state. Recovery list capture still uses the common value boundary before its schema-level array/member checks. The identity classifier newly refuses Proxy identity fields before `Array.isArray`; non-Proxy classifications retain their prior order.

The head-start seam differs from design 02's proposed configurable thresholds, but reaches the same crossing comparisons without changing production constants. Its reported counts subtract the head start; its byte-stop message includes it, as documented. It is range-checked and not exported by the package index. This is an evidence-only deviation, not a new accepted-value rule.

The unchanged `harness.ts` deviation is materially different: the witness infers that an exception came from a helper's assertion by re-reading its input's condition after catching. Likewise the assert wrapper records any AssertionError exiting an imported assertion function. Neither fact alone establishes which code created or threw the error. The negative controls test callbacks, comparison getters, and helper diagnostic/value reads as well as the existing argument-evaluation case.

## Documentation search

Reviewed current value claims in the canonical values page, roadmap, sources provenance, baseline, 007, source module/type/helper comments, and the changed fixture descriptions. The roadmap/baseline/007/source summaries qualify refusal by detectable kind; the canonical page and provenance paragraph state Q6's undetectable kinds. Historical decisions and old reports retain their historical claims. The owner-pinned 014 planned-scope sentence is excluded under the supplied 2026-10-14 decision, not interpreted as current implementation behavior.

The search covered `refus*`, `built-in`, `internal-slot`, `exotic`, and `re-prototyped` descriptions, followed by reading their surrounding scope/qualification. Q6 acceptance is tested separately using the prior WeakRef/FinalizationRegistry witnesses. No new current DOC-03 instance was identified by this search.

## Evidence and third-party scope

The additive C2-LIMIT change retains pinned decision/list digests, origin membership, uniqueness, old-list exclusion, and the requirement that a listed member remain unbound. Current lists and the 15 reopened origins reconcile with owner choice 01; the two helper-only origins remain complete by explicit owner supplement. The sweep timeout and TOOLS-02 scope edit are authorized.

No implementation, dependency, or third-party asset was added by this review. The temporary probes are reviewer-authored or explicitly adapted from this repository's prior review probes. Existing locked dependencies are used to execute the pinned candidate; that use is not a new license-clearance claim. The candidate's dependency manifests and lockfile are unchanged from B.
