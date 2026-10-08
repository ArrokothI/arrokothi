# TOOLS-01 — owner decision: no target-set kills in TOOLS-01

Recorded 2026-10-05 by Claude Code (`claude-opus-5-5`), the correction implementer of
[owner choice 08](owner-choice-08.md), from the owner's message in this conversation. It answers
required change 3 of the [design 06 check](design-06-check.md) (GPT-6, `b66688c6`): R1-04's
frame predicate cannot establish where an assertion originated, since a production
`AssertionError` built with `stackStartFn` presents only the target file's frames. The owner's
answer, verbatim:

> Option A: in TOOLS-01, target-set mutations report their observations but never earn a kill; the
> design of assertion provenance moves to TOOLS-02, which needs kills for P1-M.

It binds at the commit that adds it. No hold, credit or acceptance follows from it; TOOLS-01
remains IN_PROGRESS.

## Effect

- **TOOLS-01.** The target-set route never returns `killed`. It reports each mutant's observed
  outcome: an assertion-like failure, an error, skip, todo, cancellation, timeout, output limit,
  malformed result or setup error. F3's runner categories stay distinct, and no observation is
  credit. Design 06 revision 2 states the mechanism.
- **Unchanged.** The probe route and its registry cases: the registered case/mutation pairs of
  `tests/fixtures/packet-tools/mutations.json`, their kills, and the complete-decision oracle's
  controls.
- **Consequences, without text changes.**
  - P1-T discrimination in TOOLS-01 is a reading trace, as it already is for every target. A
    target whose discrimination names a mutation stays `target_mutation_pending_execution`.
  - P1-M stays TOOLS-02's (owner choice 04).
- **TOOLS-02** designs and builds the evidence that a qualifying assertion in the declared target
  set, or its test-side helper, executed and failed. That evidence must survive process isolation
  before any target-set kill counts. P1-M's kills need it.

## Contract diff (revision 8 to 9)

The implementer applied this diff to [contract.md](contract.md) in the commit that adds this record.

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,2 +1,2 @@
-# TOOLS-01 contract — revision 8
+# TOOLS-01 contract — revision 9

@@ -18,2 +18,4 @@ the gate advisory for every packet. [Owner choice 08](owner-choice-08.md) holds
 by record, transfers its per-test classification to BINDING-01, and sets this round's correction route.
+[Owner choice 09](owner-choice-09.md) withholds kills from the target-set route in TOOLS-01 and moves
+the design of its qualifying-assertion evidence to TOOLS-02.

@@ -23,3 +25,3 @@ by record, transfers its per-test classification to BINDING-01, and sets this ro
 | F2 | Preserve the complete pinned origin inventory and stable provenance IDs. Adoption format 2 links origins to distinct counterexample records and family members. Pinned records outside the inventory may be cited as sealed sources, never as origins. Include all final-review additions. | Recompute 208 artifact/fence digests, 1,333 prose locations and eight additions. Exact-set checks reject missing, duplicate, corrupt or dangling origin, member and sealed-source links. Pending, triaged and revalidation states stay visible. Provenance completeness is not executable adoption. |
-| F3 | Provide a versioned case/mutation registry and isolated runner with a passing control, uniquely applicable single- or multi-edit mutations, reached witness and a named qualifying assertion from the member's declared target set. | Existing controls plus multi-edit, wrong-kill and target-set controls. Survived, uncovered, invalid baseline, not applicable, setup error, timeout, output-limit and malformed-result categories stay. No process exit, reading argument, census or family count earns a kill. |
+| F3 | Provide a versioned case/mutation registry and isolated runner with a passing control, uniquely applicable single- or multi-edit mutations, reached witness and a named qualifying assertion. Under owner choice 09 the target-set route earns no kill in TOOLS-01: it reports each mutant's observed outcome, and TOOLS-02 designs the evidence that a qualifying assertion in the declared target set executed and failed. Probe-route registry cases are unchanged. | Existing controls plus multi-edit, wrong-kill and target-set controls; the target-set controls show that no observed outcome, an assertion failure in a declared target included, becomes a kill. Survived, uncovered, invalid baseline, not applicable, setup error, timeout, output-limit and malformed-result categories stay distinct. No process exit, reading argument, census, family count or target-set observation earns a kill. |
 | F4 | Keep runner changes in temporary source copies; preserve candidate files; run each process under a declared environment. Bound execution duration and retained output. | Candidate hash checks; deliberate hanging, noisy, failed and contaminating-environment fixtures; every `process.env` name that selected tests read is declared; interrupted or failed mutation cannot patch the shared checkout. Supported host: POSIX with Python 3 and Node 26.10+ (owner choice 03); the floor's test-event, coverage and type-stripping assumptions are checked before use. |
```

## Proposed 007 text (the design author applies; the implementer does not edit 007)

In the TOOLS-02 scope, after "the 40 revalidation origins transferred by owner choice 05.", add:

> It also designs the evidence that a target-set mutation's qualifying assertion executed and failed,
> which P1-M's kills need; until then target-set mutations earn no kill
> ([owner choice 09](work/TOOLS-01/owner-choice-09.md)).

The TOOLS-01 implementation report repeats this proposal.

## What it does not decide

- Design 06's other required changes (1, 2 and 4), which the design 06 check reviews.
- How TOOLS-02 establishes assertion provenance.
- Any hold, the split, the 44 transferred origins, or acceptance.
