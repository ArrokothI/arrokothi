# Cumulative implementer audit — correction round 4

Codex subagent source audit, 2026-09-27. This is part of the implementation team's self-review,
not independent acceptance. No Git operation, status transition or production-code edit was made
by this audit. The root implementer owns the final payload, validation and handoff identities.

## Identity and scope

- Integrated base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Owner-directed start: `3287640f045cf2e6adeefcd32f21d897480a6a7d`, containing
  [review 06](review-06.md), which reviewed H `d5ffd35f4d659ed685449119b8372c2efbde6204`.
- Same released packet and branch: `K1.2-correction-01`,
  `codex/k1.2-correction-01-activation-identity`.
- Governing requirements: parent [revision-9 contract](../K1.2/contract.md), C1–C15 and DEC-1–20;
  correction [revision-4 contract](contract.md), DEC-1–7; owner
  [decisions 01](../K1.2/decision-01.md) and [02](../K1.2/decision-02.md); and
  [invalidation-02](../K1.2/invalidation-02.md).
- Source examined: cumulative Kernel modules and affected tests at the start, plus the round-4
  working changes to `values.ts`, its diagnostic tests and `exact-coordinates.test.ts`.
  This note does not identify an immutable candidate by itself.

Read the development front door, 006/007/008/012, implemented baseline, both contracts and current
report/review, then the architecture README, Kernel/Runtime/Driver pages and reference index.
Relevant Layer-3 owners were identity, values, execution cycle, lifecycle, recovery, output and
evidence, with creation and the concept reading path for prerequisites. Rewrite-index §4/§5 and
the roadmap supplied the open-choice and maintenance checks. Historical findings supplied
counterexamples; their verdicts were not treated as authority for a changed tree.

The examined production logic is Kernel boundary work. Native Runtime quality, real Driver
takeover fidelity, physical containment, persistent restart, external E1 and public packaging
remain the contract's explicit exclusions. No test or source trace below earns those claims.

## Obligation and interaction map

These are source assessments and named distinguishing oracles, not a substitute for the final
clean-tree command evidence. **C3 remains unresolved under V-D1**, as described below. No other
additional in-scope runtime defect was established by this audit.

| Obligation / governing owner | Boundary and strongest examined counterexample | Required facts and forbidden mutations | Source assessment and evidence to retain |
|---|---|---|---|
| C1; execution-cycle scope and evidence disclosure | Hidden versus missing Execution; revoked visibility; controls without control scope; read-counting fields | Zero content observations after failed scope; identical unrecorded refusal; no hidden record mutation | `submitOutcome` scopes after only its destination read; controls scope and check control power before capture. Preserve `nondisclosure`, `control-authority`, `submission-authority` and hostile-field tests. |
| C2; identity and execution-cycle replay | Accepted identity after takeover, later exchange and terminal state; no grant; changed or invalid content; malformed identity | Original decision/receipt on exact replay, no mutation; one conflict refusal for changed content; unusable identity addresses no accepted row | `acceptedOutcomes` lookup precedes terminal/currency/grant; comparison uses captured content identity. Preserve partial-claim, late-report, terminal, activation-identity and exact-coordinate cases. |
| C3; values V-D1, E-6 and decision-02 | Individually stale coordinates mixed with malformed ones; eager invalid roots without a grant; 1 MiB edge and sibling roots | Correct first failing group; no content disclosure before authority; refusal changes only its refusal record; every root bounded | Currency and authority order remain source-consistent. The descriptor-conversion counterexample below leaves refusal time unresolved despite the diagnostic-label repair. Keep all limit, partial-claim, diagnostic-work and value-cost evidence; do not mark C3 complete. |
| C4; execution-cycle atomic acceptance and core batch accounting | Getter submits a competing Outcome; ambient pollution; progress names outside-batch Events; both holds end | One accepted writer; entire reserved batch only; progress, outputs, receipt, dispositions and hold-ending history together | `#accept` builds retained records before applying them and does not interpret progress. `transaction`, `outcome-hostile`, `outcome-acceptance` and original ablations distinguish lost records, receipt gaps and split decisions. |
| C5; lifecycle and retry-versus-takeover | Continue then empty/nonempty next batch; complete/fail; terminal controls and late Outcome | New exchange only after resolution; accepted progress/base carried exactly; terminal lifetime never reopens | Dispatch, accepted next state and terminal fences agree. Terminal redelivery intentionally reports no unresolved exchange; it still mutates nothing beyond refusal. Preserve terminal and next-exchange tests. |
| C6; core B-5 and creation terminal ingress | Input before and after reservation, then complete/fail; new input and exact/changed old input retry | Batch acknowledged; every remaining Event terminally disposed in the same decision; no deletion or false acknowledgment | `#accept` selects queued entries against the pinned batch; `submitInput` replay lookup precedes terminal refusal. `terminal.test.ts` covers both terminal forms and retained dispositions. |
| C7; execution-cycle Effects and lifecycle completion | Nonempty Effects with continue/complete; unsupported wait and obligation field | Whole refusal; no Effect, denial, admission or settlement record; no wait read and no retry | `refuseEffects` observes length only, `captureNext(await)` does not read the wait, unknown fields refuse whole. Preserve output/refusal assertions and A6/A15 distinguishing mutations. |
| C8; identity writer epoch, recovery permission, decisions 01 and DEC-19/20 | Safe/unsafe/throwing Driver; nested takeover, resolving Outcome or code hold in safety callback; redelivery before/after takeover | Same exchange/input; epoch advanced once; fresh grant only on takeover; no orphan receipt/delivery; retired grant cannot commit | Post-callback checks re-establish terminal/open/epoch/code-hold state before mutation. `takeover-reentrancy`, `submission-lifetime`, `control-authority` and takeover tests retain both operation orders. |
| C9; recovery compatibility and evidence permitted actions | Missing pins, changed missing category, clear declaration; protocol/code holds together | Remain RUNNING, unchanged progress/epoch/batch/receipts; exact held exchange; truthful permitted actions and retained history | `recoverExecution` compares exact captured lists; diagnostic projection does not decide membership. Repeated unchanged declaration records nothing. Preserve recovery, permitted-action, history and exact-coordinate oracles. |
| C10; execution-cycle protocol failure and evidence history | Current/stale report; bounded explicit payload; repeat; takeover clear and valid Outcome clear | One protocol hold, no retry, no progress/receipt mutation; control attribution distinct from attempt submission | `reportProtocolFailure` scopes/authorizes before reads; explicit payload keeps its separate 1,024-unit rule. Both clear paths and both-hold Outcome history are covered by recovery/transaction/history tests. |
| C11; delivery reporting boundary | Original pending report settles after redelivery, takeover, acceptance or next exchange | Only its own delivery row changes; no receipt, lifecycle, acknowledgment, epoch or newer-row mutation | Each settlement closure retains one private delivery row, claimed before its diagnostic. Resolved exchanges retain that same list. Preserve late-report, attribution and saved-first-grant schedules. |
| C12; identity receipts and evidence retained facts | Equal-position receipts in distinct unrenderable Executions; mutated answers/views; late report and replay | Exact token/coordinate spelling, same retained receipt references, immutable retained data, per-Execution positions, no hidden activity | New oracle derives creation/input/dispatch/takeover/Outcome receipts and coordinates from chosen inputs, then checks answers, Driver calls and views. It removes the common-mode reference-only gap. R6 Z mutants and full validation are still required before declaring EVID-01 closed. |
| C13; values one snapshot and envelope one observation | Own versus inherited fields; throwing/revoked Proxies; reentrant getter; ambient globals/descriptors/index pollution | One captured field/root; no coercion or ordinary indexed write can alter accepted records | `observeOwn`, capture, primordials and own-array operations remain on the same acceptance paths. Type-only diagnostics remove extra caller observations without changing accepted data or issue codes. Engine descriptor conversion is the unresolved cost dependency below. |
| C14; evidence structure and 015 | Cumulative import/export inventory, no new provider dependency | Private target zone, no portable leaf or unapproved import; inventory agrees with measured code | No new production module or dependency in this correction. Run architecture conformance and preserve the existing inventory/DX-4 disposition. |
| C15; canonical owners, markers and baseline | Representation presented as universal rule; build status in Layer 3; diagnostic work exclusions presented as settled | One normative owner; implemented choice identified; exact target/implementation gap; no authority inferred from historical acceptance | Current reference/marker maintenance is within the packet. The descriptor question needs the owner blocker before any new V-D1 exclusion or accepted-value restriction can be written as a rule. |

## Additional self-found dependency: descriptor conversion cost

**SELF-R4-DESCRIPTOR-01.** The cumulative implementer audit identified the `ToPropertyDescriptor`
dependency; the root implementer reproduced it and recorded the owner decision needed in
[blocker-01](blocker-01.md). This is not attributed to review 06. The maintained
[descriptor-chain probe](probe-descriptor-chain-04.mjs) covers direct capture and the Outcome
path before authority.

The probe uses one Proxy over a 4,096-element array of `undefined`, repeated eight times in a
root. Its `getOwnPropertyDescriptor` trap does constant work and returns a prebuilt object with
own `value`, `writable`, `enumerable` and `configurable` fields. That descriptor object's prototype
is a chain of D empty objects. The engine looks for absent `get` and `set` while converting the
trap result into the descriptor returned to `values.ts`.

The root implementer reported 32,768 descriptor calls and 32,776 ordinary reads in every arm,
with 32,768 `undefined_member` issues represented by the same bounded records. At D=0, 1,000 and
10,000, observed time grew from about 28 ms to 793 ms to 5,451 ms. These exploratory observations
identify the mechanism, not a final benchmark result. Clean-C reruns and raw outputs belong to
the root implementer's report under 008. The maintained Outcome probe also checks that the sole
mutation is its recorded `unauthorized_submission` refusal and that the exchange remains answerable.

The call chain is `captureArray` → the captured `Object.getOwnPropertyDescriptor` → Proxy
`[[GetOwnProperty]]` → `ToPropertyDescriptor`. The work happens before Kernel JavaScript receives
the normalized descriptor. `captureObject` and `observeOwn` use the same intrinsic, so this must
be resolved across root and envelope observation, not only the array witness. Creation/ingress,
Outcome capture before authority and recovery availability all consume the affected value reader.

The current source repair correctly removes every property/structure observation from `describe`.
It cannot remove this distinct dependency. Nor does bounded diagnostic storage bound that engine
work. KC2-1's accepted wording names **own-key enumeration** as the one engine step outside Kernel
control; it does not authorize a prototype-lookup exclusion. The owner's current instruction
explicitly reserves that exclusion decision.

Several apparent local fixes would change preserved guarantees: rejecting otherwise acceptable
Proxies changes the accepted input domain; caching a shared Proxy's descriptor changes observation
at each position; stopping at the first invalid member changes required traversal and weighted
evidence. Those are not authorized by invalidation-02. This note therefore leaves the cost case
open for the owner's smallest explicit decision. It neither chooses an exclusion nor concludes
that all possible implementation remedies have been exhausted.

## Correction delta and historical dependencies

- The type-only `describe` is a bounded diagnostic mechanism: `null` or `typeof`, with no
  `constructor`, `name`, array classification, coercion or thrown-object property observation.
  Its four call families retain their original issue codes and paths. No accepted value byte or
  canonical comparison is changed.
- Updated old assertions replace class-name detail with the fixed generic label. The direct
  renderer still tests the 1,024/1,025 message edge. Weighted suffix counts, authority ordering,
  whole-view refusal assertions and later valid acceptance remain present; the removed constructor
  detail was the uncontrolled-work mechanism, not an acceptance oracle.
- `value-diagnostic-work.test.ts` checks all description families, zero diagnostic property reads
  at depths 0/1,000/10,000, detail positions 1/8/9/4,096, hostile thrown values, eight eager roots,
  creation/ingress and recovery. It distinguishes the repaired diagnostic path, not a universal
  bound on all engine work. Its result cannot settle the descriptor dependency.
- `exact-coordinates.test.ts` now independently derives expected values for every receipt mint
  family and checks both redelivery answers, carried Event destination, mailbox Input IDs, visible
  Execution IDs and receipt tokens across two Executions. Existing exact grant/output/hold/history
  assertions and late-report/refusal-only comparisons remain. Mutation results must still establish
  that Z1/Z2/Z7/Z8/Z13/Z14/Z15 are rejected on the final payload.
- Review 06's earlier closures remain historical evidence: review-04 bounded storage and X8–X23;
  SELF-R3-PATH-01 bounded construction; R1-DIAG; R2-AGG/EVID; parent R14 identity; decision-02 and
  R11 currency order. This audit traced their shared replay, authority, hold, receipt and traversal
  dependencies rather than assuming their prior PASS applies to a new tree. Preserve the original
  and adapted ablations, correction series and retained review-11 probe in the final evidence plan.

## Limits and next evidence

This subagent did source/oracle inspection and did not run the final validation commands. The root
implementer must distinguish final clean-C execution from this working-tree audit. Required suites,
the sealed original runner's actual nonzero result, substitute adapted evidence, new diagnostic and
coordinate mutations, comparative probes, links/inventory, exact C/H allowance and push/offline
verification remain the contract and 006/008 handoff obligations. An owner blocker does not become
review readiness because unaffected tests pass.

No third-party source, asset, dependency or service was incorporated by this audit. Existing
`canonicalize@3.0.0` reuse is unchanged. No self-acceptance, integration or successor release follows
from this note.

## Owner resolution and adjacent engine entry case — 2026-09-28

The preceding audit records the pre-decision state. [Owner decision-03](../K1.2/decision-03.md)
resolves SELF-R4-DESCRIPTOR-01 and is applied by contract revision 5 and the canonical values
owner. Four additional diagnostic tests retain the required count, byte-stop, coherent-Proxy,
ordinary-data and Outcome-before-authority evidence; see the dated addition to
[diagnostic closure](diagnostic-closure-04.md#owner-resolution-and-additional-evidence--2026-09-28).

The same dependency trace found **SELF-R4-HANDLER-01**, separately attributed to this implementer
audit. [Blocker-02](blocker-02.md) reconstructs required engine work before a caller result exists:
trap-method discovery, absent-trap forwarding, Proxy-target classification and induced target or
handler operations. [The maintained probe](probe-handler-chain-04.mjs) confirms method-discovery
cost on both direct capture and a visible unauthorized Outcome, with identical observations and
only the permitted refusal mutation. Decision-03 is not interpreted as authorizing this additional
exclusion. The root implementer requested the owner's boundary clarification under 006.

This supersedes the earlier descriptor-specific reason for leaving C3 unresolved. C3 and its
C13/C15 cost-scope dependencies remain unresolved for the new engine-entry case until the owner
decides it. The source and oracle assessments of the other rows stand; final clean-C validation
and independent review are still required. No additional production-code defect was established
by this follow-up audit.
