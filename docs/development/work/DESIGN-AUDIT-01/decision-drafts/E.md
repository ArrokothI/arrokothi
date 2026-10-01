# DRAFT owner decision — Evidence infrastructure (brief e; F05, F06, F14, F15, F16)

Not adopted. No hold is lifted and no packet is released by this draft.

## Proposed adoption

Assign evidence consolidation to TOOLS-01, preserving sealed source records, indexing existing-suite coverage and retiring duplicate runner plumbing only after extraction. Retain profile-specific corpus and independent complete-decision oracle controls.

## Options, evidence, claims and closure


[Catalog](../evidence-inventory.md) inventories every checked-in executable artifact and executable Markdown fence in the requested packet records, including K1.1 corrections/reference, and indexes their supporting test/gate snapshots. [Prose locators](../evidence-mentions.json) preserve probe/mutant/oracle references without standalone source. Some records disclose a test but not runnable source; that is historical evidence to extract, not an invented script. The catalog assigns TOOLS-01, existing-suite or retired-runner disposition per row. Identical hashes and same test snapshots should be consolidated, not counted as new evidence.

The zone analyzer protects a restricted syntax/effect inventory and catches regressions. Known type-assertion/default/shadowed-name gaps remain; its current documentation already denies completeness. The zone inventory gives reasoned access/call/write ownership. Poison sweeps observe accessor-reaching reads on their enumerated prototypes and reached paths; they do not detect all `in` checks or all prototypes. Fault sweeps intercept selected built-in calls in specified scenarios, with known allocation/property/safety-callback exclusions. The complete-decision oracle compares returns, whole views, positions and grant behavior and needs its own negative controls. None proves universal containment or arbitrary-fault atomicity.

| Option | Benefit and cost | Claims affected | Finishable follow-up |
|---|---|---|---|
| Keep packet-local runners | Preserves exact historical reproduction; cheap initially but duplicates pin logic, fixtures and partial oracles. | Claims remain pinned to the source, candidate and observation scope of each runner. | Every runner records input/source identity, attributable failure, whole expected result and exclusions; no stale runner certifies a new candidate. |
| **Recommend TOOLS-01 corpus and mutation registry** | One maintained case identity links original record, current fixture, profile, mutant site, expected kill and independent oracle. Preserve historical bytes. Costs extraction, deduplication and registry maintenance; not a new all-purpose analyzer. | No behavior change; evidence claims become explicit profile/scenario claims. Keep current suite ownership where already covered; retire only duplicate execution plumbing. | Every catalog row resolves to maintained case/registry ID, existing suite or explicit retired artifact; every live mutant has control + causal kill/survival; every oracle comparison has a negative control; missing/dead mappings fail a registry check. |
| Replace broad analyzer with narrow structural checks after D | Smaller proof surface; generated owned-record/apply boundaries need less TypeScript interpretation. Costs D's redesign first; finite runtime searches remain. | Retire analyzer-as-proof expectations already withdrawn; retain complete-decision evidence and actual boundary invariants. | Dependency/ownership rules checked against deliberate escapes; profile-specific runtime corpus preserved; analyzer retirement accompanied by coverage mapping, not just file deletion. |

The owner may retain the keep option or select the listed alternative. A future acceptance is independent of this recommendation.
