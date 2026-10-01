# Round 4 pre-implementation obligation map

Codex implementation work, 2026-09-27; not independent acceptance. Same revision-4 contract,
integrated base `a20d278185eaffc7f8b7489345a3624231ff6e6d`, owner-directed start
`3287640f045cf2e6adeefcd32f21d897480a6a7d`, reviewed H
`d5ffd35f4d659ed685449119b8372c2efbde6204`. The clean existing checkout is already on
`codex/k1.2-correction-01-activation-identity`; only fast-forward commits on that branch are
authorized. No checkout is switched. Remote branch and main were verified at those start/base
identities. Release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb` and invalidation-02 still govern.

## Sources and methods

Read 006/007/008/012, the parent and correction contracts, review 06 and its raw probes, the prior
report/closure and invalidation-02. Architecture starts with README and Kernel/Runtime/Driver;
reference.md leads to values, identity, execution-cycle, creation, recovery, lifecycle, output and
evidence. Rewrite-index §4 leaves diagnostic representation to the binding; §5.3, 26, 28 and 30
forbid turning a representation, status, convenient exclusion or common renderer into proof.
This is Kernel boundary implementation work; no Runtime/native or deployment semantics change.

Use deterministic execution, normative source/interaction examination, the existing in-process
race/fault schedules and process/documentation checks. Comparative time/memory probes supplement
deterministic lookup counts. Native fidelity, process death, external gates and public packaging
remain with R1, K3, K1.4 and S1 respectively. The command profile remains the contract's full one.

## Reconstruction before coding

| Obligation / source | Distinguishing inputs and negative control | Expected facts and forbidden changes | Planned evidence |
|---|---|---|---|
| R6-VALUE-TIME-01; values V-D1 / DEC-7 | All four describe callers: unsupported scalar/function, foreign object, foreign array, thrown structural observation; deep chains, huge constructor names, own/inherited getters, revoked throws | Fixed diagnostic labels; no diagnostic property reads, prototype walks or caller-sized concatenation; unchanged code/path and first eight details plus exact suffix counts | New diagnostic-work tests; restore raw describe mutant; R-P1/R-P4 and broad acceptance/refusal comparisons |
| Every other value diagnostic construction site | Literal messages; numeric size/entry/depth limits; key/path construction before validation; serializer failure | Only bounded Kernel primitives enter messages; path bounds precede concatenation; no error.message/constructor.name read anywhere; accepted snapshot and canonical bytes unchanged | Site inventory in closure; existing value and cost tests; source trace |
| Eager Outcome roots before authority / decision-02 | Progress + six Emissions + result/error; visible caller with absent and valid grant; both diagnostic families | Every root still captured once; unauthorized caller learns no content; one refusal only; no receipt, progress, batch, output, epoch, hold or delivery mutation; later valid answer works | Counted eight-root tests; R-P2; full-view assertions |
| Creation / ingress and controls consume the same capture | Creation authorityContext + initial payload; input payload; recovery availability roots | Same bounded work and exact weights; refusal does not create or admit input, change holds or consume acceptance positions | Consumer tests; R-P5; creation/ingress/recovery suites |
| R6-EVID-01; DEC-4/6, identity/evidence owners | Two Executions with omitted diagnostic IDs at equal acceptance positions; creation → ingress → dispatch → redeliver → hold/clear → takeover → Outcome → terminal | Direct exact tokens and coordinates at every mint, answer and view site, independently derived; cross-Execution token distinctness; redelivery returns the sent Activation ID; exact carried Event/Input ID | Extended exact-coordinate oracle and full-suite Z1–Z16 ablations |
| Adjacent K1.1 coordinates carried into K1.2 | Creation receipt, ingress receipt, delivered Event destination, queued Event IDs and mailbox Input IDs | Included in exactness evidence: K1.2 consumes these unchanged; no scoping exclusion | Direct checks at creation/ingress/inspection/delivery and Z2/Z7/Z15 |
| C1–C15 cumulative, unchanged value guarantees | Scope/replay/currency/authority/content order, atomic commit, continue/terminal, holds, takeover, late reports, hostile observations | All original criteria and forbidden mutations remain; prior passes supply counterexamples, not exemption | Whole source audit, required suites, sealed/adapted and correction ablations, review-11 probe |
| C15 and 006 identities | Marker/baseline/contract agree; roadmap remains navigation; exact clean C plus administrative H | No status in Layer 3, narrowed V-D1, rewritten sealed evidence, self-acceptance or successor | Record/link/diff checks, manifest, verified push |

The prior pass bounded retained issue objects but omitted the work used to build them. Its
coordinate tests compared shared projections/receipt references without independently checking
their spelling. Both assumptions must be replaced. Preserve earlier evidence; disclose any mutant
made equivalent by removing its input producer, and replace it with a mutant of the live obligation.
