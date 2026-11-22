# Brief 02 — K1.4-candidate correction after independent review 01

Start from reviewed H `484afd13d7652958f6496afc56d9aa9c098d58b1`, payload C
`61ea8126507506b043ce5ba6515073f62c19c42f`, base B
`c1951226338de6ccd3e4e6289259549551268f61`.
The authoritative findings are [review 01](../review-01.md), K14C-R01-01..03.
Review branch: `codex/k1.4-candidate-review-01`; use its delivered full recording SHA.
Read 006/008/012, brief/release 01, owner choices 01–02, design 01/addendum 01 and the exact
design-check commit `e06984a9573efd1524692ab74332eb7744941bcf`.

## Goal

Preserve identity information across the timeout naming convention, close the required ablation
maintenance contract, and state gate exclusions only within owner-approved scope.
This is adapter/evidence correction; Kernel semantics and fixture behavior remain unchanged.

## Criteria (finishable)

| ID | Required outcome | Closure |
|---|---|---|
| R02-1 / K14C-R01-01 | A conflicting explicit timeout name never enters the Q2b unnamed fallback. Keep original aliases; expose the conflicting identity or fail visibly under an explicit mapping rule. | Maintained reproducer of two generations explicitly named `to-g2`, plus adjacent alias cases; ordinary named/unnamed timeout, later naming, duplicate/stale fire and per-Execution tests pass. Explain how binding provenance survives to projection. |
| R02-2 / K14C-R01-02 | ABL-1..5 use the existing mutation/corpus workflow, or an explicit owner amendment authorizes the maintained-test exception. | Registry entries/required hold records and successful exact-C workflow evidence, or the owner's recorded waiver plus retained five named-step kills. Do not invent semantic credit. |
| R02-3 / K14C-R01-03 | Evidence wording requires owner-approved predeclared exclusions, not automatic exemption for missing subject support. | Bounded text check against owner choice 02, 007 K1/K2/K3.4 gates, both roadmaps, README and 017. The twelve/three K1 decision and later K2 obligation remain exact. |
| R02-4 / preservation | KC-1..KC-6 and all nondeferred D01 checks hold cumulatively; 12 PASS/3 REFUSED remains pinned; fixture and package boundaries stay intact. | New C/H scope binding, appropriate validation, five actual ablation kills, blindness/encoder/convention/control/locator tests, and independent re-review. |

## Known counterexamples

`probes.mjs` and `probes.jsonl` retain the unchanged-Kernel timeout collision. Promote the
counterexample into maintained tests; do not merely special-case `to-g2`. The adjacent public-response
fault injection changes the ID on an otherwise identical duplicate fire and shows that the whole
Observation remains unchanged; retain a control that exposes this drift after the repair.
The latest-grant mutant passes the twelve-schedule matrix but is already caught by ABL-2;
preserve that discrimination and do not count it as an unfixed candidate defect.
Keep the existing 968 candidate/fixture tests and 222 checked boundary/mapping tests.

## Suspect design

`Aliases.bind` loses the distinction between successful binding, already-bound identity and
name collision. The timeout projection then treats absence of a reverse entry as proof that
no command named the Event. Q2b's exception and the general bijection contract were reviewed
separately; their composition needs a visible conflict path.

The Layer-3 prose similarly loses the distinction between a specific authorized exclusion and
a general rule that lack of implementation removes an obligation. The owner chose the former.

## Questions before code

- How will alias binding/projection preserve conflict provenance in both directions without
  changing ordinary replay or later explicit naming of an originally unnamed timeout?
- Will the five ablations be registered, including honest tooling holds, or will the owner
  explicitly authorize the maintained-test exception? Implementation scope alone is no waiver.
- What precise wording keeps predeclaration and refusal attribution while leaving gate scope
  with its owner?

## Bounds and stop conditions

No Kernel changes, no fixture scenario/runner/oracle changes, no benchmark edits, and no
K1.4-gate/E1 release. D01-CHK-04 stays at K2.4/E2. Preserve prior reports and evidence.
Ask the owner if the repair needs a changed naming contract, a policy waiver or a wider gate
decision. Do not self-certify acceptance. Record new C/H and review the cumulative candidate.
