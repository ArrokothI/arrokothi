# Coverage methods for implementation and independent review

[006](006-development-process.md) owns when these methods are required and who may accept work.
These are proof methods, not additional Kernel semantics or a fixed inventory of packet features.
The [K0.1 retrospective](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/011-k0.1-process-retrospective.md) explains their origin.

## Derive coverage from the obligation

Before implementation, map each contract criterion to its governing source, observable boundary,
strongest plausible failure and required evidence. Include connections between criteria: a collection
of individually correct sections or unit tests does not establish a coherent packet. Select the
methods below by the claim being made, combining them when needed. Record a reason for excluding a
material method; do not fill a universal list with trivial N/A rows.

A compact coverage row contains:

| Obligation/source | Input or schedule, including negative case | Expected observable facts and forbidden changes | Source/test/trace location and result |
|---|---|---|---|
| One independently assessable claim | Concrete distinguishing example | State, data, identity, receipt and external effects as applicable | Evidence, or unresolved gap |

The implementer derives this map before writing the solution, then checks the finished cumulative
packet against it before handoff. The independent reviewer derives its own map from governing sources
before using the implementation report's explanations, then compares both maps. These are concise
review notes with evidence, not a request to disclose private reasoning or duplicate every test case.
The reviewer must inspect the report, prior findings and evidence before deciding; the ordering is
intended to avoid inheriting the implementer's coverage assumptions.

## Methods by kind of claim

| Method | Use when | Examination and evidence |
|---|---|---|
| Normative decisions | Protocol/documentation decisions or changed behavioral contracts | Derive the identities, states, input categories, preconditions and acceptance boundaries. Walk both orders of interacting operations, absence/empty/inert cases, exact limit edges, duplicate/conflicting/stale submissions and rejection. For every path account for the whole result, not only its headline state. Trace normative rules into examples, mappings and compatibility claims. Links/lints establish navigation, not semantic correctness. |
| Deterministic execution | Executable Kernel, SDK or other mechanically decidable behavior | Drive the supported entry through observable transitions with controlled fakes and explicit barriers/clocks. Derive assertions independently of the implementation. Include a plausible broken behavior that the oracle would reject; inspect coverage beyond test names and counts. Trace writes, calls and return values on failure as well as success, and retained/removed regressions. |
| Race and fault | Ordering, persistence or recovery claims | Enumerate relevant acceptance/commit/receipt/notification windows and both competing orders; pin schedules and identity preservation. Assert zero forbidden mutations as well as eventual results. Use actual process death and surviving independent observations for process-failure claims; exception injection only proves its narrower case. Include retry, takeover, missing resources and terminal paths where the claim depends on them. |
| Native Runtime/Driver | Foreign Runtime behavior and integration fidelity | Follow native submit/pause/result/cancel and resource ownership at the exact revision. Compare native-only with Driver-mediated observations. Separate Kernel fencing from native writer exclusion; prove safe continuation or explicit refusal. Interface conformance alone cannot prove native fidelity or live quality. |
| External evidence/gate | E0–E6, quality, benchmark or comparison decisions | Pin subject, fixture, configuration, evaluator, controls and raw observations. Verify evidence ownership, attribution, margins/repeats and actual external decision. Distinguish preparation from execution and execution from gate acceptance. Challenge leakage, unfair comparator powers and unsupported generalization. |
| Packaging/release | Installability, public support or release claims | Inspect packed artifacts and imports in a clean consumer, dependency/license obligations, supported/refused matrix, migration, frozen evidence and publication identity. Workspace success cannot stand in for a shipped consumer or release gate. |
| Process/documentation | Workflow, prompts, status or administrative records | Simulate role transitions and handoffs against concrete histories. Check policy ownership, actor permissions, exact identity, inaccessible evidence, amendments, corrections and successor holds. Verify references, provenance and Git scope. Do not run Runtime suites as proof of a prose workflow. |

These methods do not replace repository-required validation or a packet's evidence gates. Use the
packet's declared profile and explicit exclusions; do not demand durable storage for an in-memory
packet or live model calls for a deterministic Kernel claim.

## Semantic correction closure

For each semantic correction, record a short closure note alongside its finding disposition:

1. Name the invariant changed or previously misunderstood, its authoritative source and the original
   counterexample. Separate normative obligation from one possible mechanism and from legacy behavior.
2. Identify its dependent rules and paths, including ones outside the edited section: who creates the
   fact, who validates it, where it commits, who consumes it, how it survives/replays or is refused,
   and which examples/migration rows/test oracles describe it. Search names **and conceptual aliases**;
   a text search is a navigation aid, not proof of closure.
3. Walk the affected paths together. For a losing proposal, enumerate every affected field, receipt,
   acknowledgment and side effect. For a bounded value, specify the measured root, empty forms,
   exactly-at-limit and one-over cases. For alternate paths to one state, inspect every entry boundary
   and the next consumer of that state. Explain material exclusions.
4. Correct all in-scope dependent occurrences, add distinguishing evidence, then re-audit the whole
   packet. Record additional self-found defects separately from reviewer findings. Unchanged content
   must still be assessed where changed assumptions reach it. Prior PASS is not proof of independence.

One semantic rule should have one normative home at its applicable layer. Cross-references identify
that home; examples state observable consequences and must agree with it. A migration classification
must distinguish reusable mechanics from the full target behavior. Do not make live documents carry
all superseded reasoning: retain it in immutable attempts and link it. This rule is prospective; it
is not permission to rewrite accepted K0.1 evidence.

## Review completion and proportionality

A completed pass covers every obligation and relevant interaction in the contract, checks both the
cumulative candidate and correction delta, and reconciles source, evidence and prior dispositions.
List the scope of checks, the strongest additional counterexamples examined, the assumptions still
needed and any unexamined obligation. Finding one blocker does not finish the remaining review.
No finite matrix proves absence of all bugs; explain why the selected cases exercise the claim and
where they do not. Do not count checklist ticks as a measure of review quality.

If a packet cannot be explained and challenged coherently in this form, propose a scope amendment
under 006. Split by independently observable claims, with explicit cross-packet obligations and a
combined gate. Do not split an interacting state machine into files and assume its integration is
someone else's problem. A large correction may be justified when it restores one coherent model.

Before releasing K0.2, the owner reviews this workflow change. At K0.2 handoff and its independent
review, use the deterministic and external-evidence methods for its actual controls/E0 obligations;
use normative examination only where it specifies behavior. Record self-found versus reviewer-found
defects, adjacent defects after correction, evidence/identity handoff failures, remaining coverage gaps
and administrative burden. At the next executable packet, repeat that assessment against real tests.
Judge whether defects surface earlier without weakened evidence or acceptance, not whether round count
falls. These are evaluation points for the proposed workflow, not releases or implementations.
