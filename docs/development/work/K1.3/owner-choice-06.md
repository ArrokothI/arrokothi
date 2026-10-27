# K1.3 — owner choice 06: the fault oracle follows L-28

**Record type:** owner decision during the design 03 build, under the build instruction's "if an item needs
something larger, stop and ask". Recorded on 2026-10-27 by the K1.3 implementer's Claude Code desktop session
(`claude-opus-5-5`). The implementer wrote the question and its options; the owner selected one. Both are
quoted verbatim.

The question:

```text
Full evaluation conflicts with the accepted Outcome-apply-window fault semantics. A host fault mid-commit can
leave a record that breaks P: a RUNNING record holding a complete's terminal dispositions (P5), or a timeout
appended before its retirement (P7). The fault sweep then probes with a new continue Outcome. The old owner
accepted it, leaving the inconsistency in place. The new owner refuses it, and the refusal escapes
submitOutcome as a thrown error, which crashes 3 of the 72 sweep scenarios. How should this be resolved?
```

The owner's selection:

```text
Oracle follows L-28 (Recommended)

Keep full evaluation and the Kernel code as built. The fault sweep records an owner refusal during its probe
as an observation, and the Outcome-window ladder expects that refusal exactly for the prefix states that
break P. After such a fault, a governed call throws until a decision repairs P (a cancellation, or the same
terminal Outcome retried). L-28 already says this. Only evidence tooling changes: fault-scenarios,
fault-oracle, its tests and oracle mutant anchors.
```

The two options not chosen were to turn the owner's refusal into a new recorded public refusal, and to refuse
only violations the decision introduces.

## Effect

- **Kernel unchanged.** Full evaluation (owner choice 05) stands. A Kernel call on an Execution whose record an
  interrupted commit left outside P throws the owner's refusal if it would commit a successor that still
  breaks P. A decision whose successor satisfies P is admitted.
- **Fault sweep.** `fault-scenarios.ts` observes a probe the owner refuses as `owner refused (P<n>)`. Both
  probes can be refused: the next accepted input, and the setup grant's Outcome until the accepted-Outcome
  index holds the Activation. `fault-oracle.ts` expects that observation in exactly the Outcome apply-window
  prefixes that break P, which it finds with `ownerRefusalIn` over the prefix's view. Every other permitted
  decision is unchanged.
- **Controls.** `fault-oracle.test.ts` adds the `outcome: fail` example and two L-28 controls. The oracle
  controls' test count is updated.
- **Records.** 017 L-28 and design 03's revision describe this behaviour. Accepted K1.2 commit order and fault
  policy are not changed.
