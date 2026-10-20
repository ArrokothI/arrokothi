# Migration question 01 — wrapper refusals and N1

Owner ruling, 2026-10-20: **approved** ("yes" to the proposed split). Build resumes.
The implementer stopped under design-check N1 before changing any test or oracle.
The approved design moves wrapper refusals to SDK tests with no core call; the maintained
consumer corpus also treats these refusals as complete Kernel decisions.

Concrete case: `packages/kernel/tests/capture-corpus.ts:57` generates a cycle. Its ingress
consumer (lines 149–159) expects `malformed_value`, the located `cycle` code, and calls
`assertOnlyRefusal`. That oracle (`refusal-diagnostics-fixture.ts:18`) requires exactly one
retained Kernel refusal, reference-identical to the returned refusal, with the whole remaining
view unchanged. Outcome consumers impose the same record requirement (lines 178–197).
Accessor/symbol/non-enumerable members similarly require `unrepresentable_member`.

There is no JSON byte representation of a cycle or symbol/non-enumerable member. A wrapper
refusal with no core call cannot append that Kernel record. Throwing from a facade accessor
would instead produce `unstable_representation`; passing malformed bytes would produce a
byte-validator issue. Fabricating the old decision/record in the facade is forbidden by the
design. The whole-decision assertion therefore cannot follow these particular cases unchanged.

**Requested ruling:** authorize splitting these wrapper-only rejection cases into (1) SDK
capture assertions retaining their existing issue/meter/stop expectations and proving no core
call, and (2) explicit malformed-byte consumer witnesses checked by the unchanged whole-state
oracle, with byte-domain issue expectations. Preserve `sweep/fault-oracle.ts` and
`assertOnlyRefusal` themselves, all byte-representable decision expectations, authority order,
accepted-value equality and replay. Otherwise specify the desired wrapper-refusal reporting
contract; no such core adapter contract is currently approved.

WIP: initial owned-byte validator/encoder/transport and identity correction compile in isolation;
SDK capture and own-data helper are exact copies of the old modules. Capture dependency moved
without a version/integrity change. No test migration, AST guard, maintained witnesses, Layer-3
payload or CI has been completed. Targeted smoke checks pass for byte ownership/deep freeze,
strict spellings/duplicate/Unicode refusal, transport conversion and unchanged wrapper cycle code.
This is not C or review-ready; legacy consumers still need the authorized migration.

Third-party reuse: unchanged `canonicalize@3.0.0`, dependency use only; installed LICENSE,
package metadata and lib/bin headers inspected (Apache-2.0, no shipped NOTICE, no runtime deps).
Lock integrity remains `sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`.
Core implementation is original; no third-party source copied/adapted. Existing notices retained.
