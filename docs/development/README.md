# Development

This is the front door for current kernel development. Planning documents do not own architecture
semantics; start with the [canonical map](../README.md) for those. Application builders should use
the [builder guide](../guides/agent-workflow-composition/README.md).

| Question | Current owner |
|---|---|
| What is implemented today? | [Implemented baseline](002-implemented-kernel-baseline.md) |
| What does 1.0 mean, what is next, and what gates it? | [Active roadmap](001-current-status-and-roadmap.md) |
| Which bugs, evidence gaps and decisions remain? | [Evidence and findings](003-evidence-and-findings.md) |
| Where are the old plans and detailed implementation reviews? | [Legacy index](legacy/README.md) |
| Where are architecture hypotheses and longer-term directions? | [Strategy study](../architecture-strategy-study/README.md), [research](../research/README.md), [future questions](../future-plan.md) |

**Next: P1 — close the concrete action contract.** Begin with the current concrete dispatch paths,
known schema/allow-list findings and public acceptance fixtures. Its exit gate is consistent
validation, authority and exact consent across supported callers, with an explicit compatibility
decision. Do not start broad portable descriptors or protocol expansion first.

The SDK bootstrap and local conformance are implemented. Durable restart, typed computed composition,
final distribution and attributable comparative evidence are not. The package number is not a release
readiness verdict. The roadmap integrates benchmark work as B1–B3; this repository owns framework
changes, while the standalone benchmark repository owns private cases, construction and scoring.
Benchmark details are in the evidence register, outside the application-builder reading path.

There are three current planning/evidence documents above. Completed slice reports belong in legacy;
new findings go in the live register, and accepted semantic changes must update their canonical owner,
implementation and conformance together. Neither the archived H–N sequence nor the study's proposed
stages is a second active roadmap.
