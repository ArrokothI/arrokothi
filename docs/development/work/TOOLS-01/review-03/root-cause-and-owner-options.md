# TOOLS-01 review 03 — repeated detector failure

Subject: H `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94`, payload C
`28258b282532b36eef8fb1571d79b6343b54427b`. This is review evidence, not permission to implement.

## Why 006's stop-and-redesign rule applies

Reviews 01 and 02 returned CHANGES REQUIRED. This review finds further false preserved credit in
the corrected R1-01 subsystem. Both the repeated-subsystem rule and the third-CHANGES-REQUIRED rule
apply. Choice 08 authorized design 06 and its checked build; it is not a standing waiver for later
failed correction rounds. No further implementation starts before the owner's next recorded choice.

## Mechanism

The new detector still converts failure to recognize a hazardous use into permission for ordinary
credit. Its value classifier and its use classifier do not operate on one normalized expression:
`unwrapTypes` strips wrappers when identifying the value, while `escapes` examines the original
node's immediate parent. Parentheses, casts, non-null assertions and `satisfies` hide the call,
storage or return edge. A second shortcut treats a callee's spelling as proof of a read-only
operation. A helper or method named `keys` can mutate its argument or return the intrinsic itself.
Following that helper's source does not propagate the intrinsic to its parameter.

The register then has no entry. `origin_census` records `register: null`, and `preserved_table`
returns `preserved` with no reasons. The consumers enforce known holds correctly, but absence from
an incomplete producer is still sufficient for credit. No unresolved record exposes these cases.

These inputs explicitly contact `Object.prototype` in the test's run set. They do not use native
code, production-module analysis, fabricated parser output or a value outside the stated domain.
They are small combinations of forms the accepted design already promises to handle. This review
does not require universal JavaScript analysis.

## Why the earlier design/corpus missed them

The new corpus independently exercises a cast on an assignment and an intrinsic passed to a helper,
but not a cast or parentheses around the helper argument. It tests recognized reflection readers,
but not a user helper with the same name. The first design check correctly demanded descriptor-result
taint and fail-closed uncertainty, and the implementation now passes those examples. Neither design
check required an explicit argument for every exemption or preservation of expression-to-use edges
through normalization. That is a gap in the design argument and its search, not evidence that merely
adding the reproduced strings makes the producer complete.

## Owner options and required finish

1. Revise the bounded detector design: define one normalized value/use relation for every promised
   wrapper and sink, and justify read-only/fresh-result exemptions by positively recognized operations.
   Unknown intrinsic-receiving calls must remain visible without ordinary credit. Recheck the current
   register and all downstream consumers after the correction.
2. Refine the finishable claim or split the analysis work, with an explicit owner-recorded no-credit
   disposition for unsupported intrinsic-contact cases. Do not retain the same positive claim while
   merely documenting these known misses as another gap.

The design must answer how wrappers compose with call arguments, returned values and stored values;
how local, imported, aliased and member-call spellings interact with exemptions; and how an
unrecognized operation becomes a visible non-credit result before preservation or target credit.
Keep genuine `Object.keys` and local-object controls. Keep the descriptor-result controls and the
conservative `entries`/`values` behavior. No new semantic hold, transfer, completion definition or
target-set kill is selected here.

Corpus additions are the nine runtime-confirmed misses in [probe_detector.py](probe_detector.py),
including the two that reproduce `preserved` through the actual register/census/table consumers.
Use the attached results, not only the source snippets. The next independent review should exercise
the cross-product of the bounded expression wrappers and declared escape positions rather than
another list of isolated examples.
