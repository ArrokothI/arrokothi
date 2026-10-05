# TOOLS-01 review 01 — root cause and owner options

Subject: H `446dd25820500db4e0eb3d6940ec49e45634f39c`, payload C
`b104bab192f57c5ecf5b7eccebcfbda412a17b5d`. This is review evidence, not permission to implement.

## Why stop and redesign applies

I apply the pinned 006 rule: “a second CHANGES REQUIRED whose findings lie in a subsystem already
corrected in this packet.” `design-05-review.md` explicitly recorded CHANGES REQUIRED for false
preservation (D05-REV-01); design 05 §2.3 corrected it. This review records another CHANGES REQUIRED
affecting preservation and closure. CONT-01/02/04/05 additionally document repeated correction of
the closure/hold subsystem. The earlier design review was an implementer design check, not packet
acceptance; I am counting its explicitly recorded disposition under 006's wording “within one
packet,” not inventing an earlier independent ACCEPT. I do not claim a candidate-acceptance flip.

The owner's choice is therefore required before another patch round. This note replaces a ready-to-
implement correction brief. The substantive findings remain coding/evidence defects under the
existing contract; the overall verdict is CHANGES REQUIRED, not an architecture ambiguity.

## Recurring mechanism

The tool validates a reduced representation, then treats the reduction as complete enough to grant
positive credit. Missing distinctions become success:

- R1-01: a regex non-match becomes permission for ordinary credit, although casts, aliases and
  generated source still perform held ambient writes. Helper expansion does not repair the matcher.
- R1-02: inventory accepts one fence language; context extraction uses a smaller one. Required
  source and references disappear before the strict closure checks run.
- R1-03: the presence of a decision file substitutes for membership in its authorized transfer set.
  A negative set difference then reports scope completion.
- R1-04: a non-passing leaf substitutes for a qualifying assertion failure. The projection loses
  precisely the distinction the kill decision needs.

These are related evidence losses, not evidence that one shared regex patch can repair all four.
Each credit route needs its own argument about the information it retains and the unknown cases
it refuses or reports without credit. Human judgment still owns semantic equivalence and authentic
authorization; the tool must state where it relies on that judgment.

## Why preceding passes missed them

The maintained controls cover discovered examples and removal of existing guards. The 281 guard
ablations show that registered refusals are exercised; they cannot detect a missing guard or a
wrong definition of a success condition. Context tests vary reference spelling after extraction,
but not the fence language that determines which text is extracted. V-ENV tests vary direct writes
and defineProperty-style aliases, but not ordinary assignment through a TypeScript cast or alias.
Transfer tests check state, duplicates and the existence of a decision, but no unauthorized extra
member. Target-set tests cover ordinary assertion failure, wrong leaf, equivalent and unreached
mutants, but not a skipped leaf or an exception before its assertion.

The approved design already allows bounded lexical hold detection and human readings. Those limits
are legitimate, but they do not authorize continuing to credit the concrete held tests now found.
The current all-reading target population is also why the generic target-set kill defect can remain
latent while all actual target observations pass.

## Owner options

1. **Redesign the evidence-to-credit boundaries.** Request a new design note and independent design
   check. It should define which observations are sufficient for each positive result, what remains
   unknown, and how the maintained corpus independently distinguishes the boundary. This preserves
   the present contract, with a broader review of the same mechanisms.
2. **Refine finishable claims.** Explicitly distinguish mechanically checked facts from owner-reviewed
   assertions where automatic checking is intentionally bounded. Any refined claim must still refuse
   the four known false-credit cases and keep held behavior out of ordinary credit. An unchanged
   generic `revalidation_complete` cannot silently acquire a weaker meaning.
3. **Split the affected adoption work.** Keep independently sound mechanisms and transfer additional
   unresolved adoption only through an exact, recorded owner scope decision. Do not infer this option
   from the existing 44-row transfer.
4. **Record a bounded limit.** Name precisely what cannot receive credit and its correction owner.
   Merely documenting that skipped tests count as kills or that known held tests remain preserved
   would weaken the mandatory contract, rather than satisfy it.

## Questions the selected design must answer

- How are cast/alias/helper/generated ambient writes found or conservatively routed without claiming
  a sound whole-JavaScript analysis? What bounded reread prevents a batch recipe change from leaving
  known held results credited?
- What single source of fence identity and bounds makes inventory and minimum context agree,
  including delimiter character/length and heading-like code? What happens when parsing is uncertain?
- What independently reviewed set establishes transfer membership and decision identity? How does an
  in-scope open origin prevent completion even when its row cites a real but unrelated decision?
- What runtime evidence identifies an assertion failure, distinguishes skips/todos/cancellations and
  pre-assertion errors, and ties the failure to the declared target? Which distinctions must survive
  reporter/catalog projection?
- Which producers, consumers, summaries and negative controls must be rechecked after each change?

## Corpus to carry forward

Keep every existing CONT and D05 counterexample. Add the four actual ambient-toJSON tests and the
direct/alias/cast/imported-helper/generated-source variants in `probe_review.py`; the shortened tilde
fence plus full-context/backtick controls; the extra transfer and full-corpus unrelated-decision
fixture; and assertion-failure, pre-assertion TypeError and skipped-target mutations. Extend adjacent
dimensions (longer/nested fence delimiters; transfer decision swaps/omissions; todo/cancelled leaves)
according to the new design. The last adjacent cases are design questions, not claimed reproductions.

No Kernel fix, hold release, production change, successor release, or sole allowed implementation is
prescribed here. The owner should resolve the remote H mismatch separately when handing over any new
C/H. After the selected design is checked, the same packet needs fresh cumulative review.
