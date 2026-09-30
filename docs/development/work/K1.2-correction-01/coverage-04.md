# Revision 4 pre-implementation coverage and reconstruction

Prepared before source changes, 2026-09-27, from fetched owner head
`8a418d408f715e999a403a3e84b73a9db1b43712`; integrated base
`a20d278185eaffc7f8b7489345a3624231ff6e6d`. The contract's DEC-7 is an implementation
choice restoring values.md V-D1 under invalidation-02, not a new semantic limit.
Methods: normative, deterministic execution, in-process race/fault, process/documentation.
No native fidelity, process durability, external E gate or public release is claimed.

## Value producers and consumers

Every issue producer in values.ts is reconstructed, not just undefined elements:

| Producer | Strongest negative schedule | Required observable / forbidden change |
|---|---|---|
| charge | shared graph crosses canonical-byte budget | one too_many_bytes; stop remains; no further reads |
| describedValue | absent property, accessor, descriptor/read disagreement | own descriptor once; no accessor invocation; exact code multiplicity |
| capture scalars | non-finite, lone surrogate, overlong string, unsupported primitive | bounded scanning; no coercion; all siblings within budget observed |
| capture containers | cycle, depth overflow, prototype rejection, throwing structure | stack cleanup; bounded diagnostic storage; no accepted partial snapshot |
| captureArray structure | unstable length, overlength, excess names/symbols, phantom/out-of-range indices | existing enumeration/read limits and classifications; no large diagnostic path |
| captureArray members | holes, undefined, invalid descendants | P5 130 × 4,096; eight details + exact counts, no per-position retention |
| captureObject structure | foreign prototype, symbols, ghost own names, nonenumerables, excess enumerable names | same bounded descriptor scan; bounded paths even before key validation |
| captureObject members | bad key Unicode/length, accessor, undefined, invalid descendant | names charged as before; child path cannot expand caller-sized names |
| accept after capture | disturbed serializer / final byte check | one refusal, no accepted identity; existing JCS environment restoration |

Consumers: canonicalize → boundaryValueIssues / isBoundaryValue; envelope.acceptIdentityText;
coordinator.acceptInputContent (creation initial payload and input ingress), acceptCreationContent
(authority root and pinned text); outcome.acceptRoot (progress, every Emission, complete result,
fail error); captureRecovery's three availability roots. located/appendIssues and appendRootIssues
must preserve counts; explain and explainDiagnosticIssues must consume them without expansion.
No value diagnostics become a lookup key or accepted payload.

Outcome interaction: scope precedes capture; capture still eagerly visits progress, all in-capacity
Emissions and next result/error even with no grant. Test eight roots with read counters; authority
refusal appends only one refusal, no content disclosure, receipt, ack, revision, output, hold or
delivery mutation. Repeat with current grant for exact aggregate counts, stale coordinates, replay
conflict, and a valid follow-up. Hidden scope reads nothing. Root budgets never sum.

Evidence: new refusal-cost tests covering producer families, bounded detail sizes, exact weighted
counts/order, late codes, ambient inherited metadata, and single reads; existing values.test.ts
KC2 read-count/exact-byte cases unchanged; P5 accept/refuse one/eight-root measurements; an unbounded
collector mutant must fail deterministic storage bounds against a clean control. Measurements are
supporting evidence, not a timing threshold substituted for the invariant.

## Exact coordinates next to diagnostic rendering

Reconstruct dispatch/redelivery → controls → acceptance → replay → inspection/late delivery:

| Coordinate owner / consumers | Distinguishing assertion |
|---|---|
| dispatch and takeover Activation; grants, lookup, replay | exact minted ID survives both epochs, next exchange and terminal replay; wrong omitted-looking ID stays stale |
| code/protocol holds and returned answers, recovery history | each answer, stored hold and start/end history directly equals minted ID and exact actor namespace/scope |
| receipt and dispatch receipt | exact boundary/position/token; equal-position Outcomes across two Executions have distinct tokens |
| Emission IDs and records | independent derivation from Execution + Activation + key; same key across exchanges stays distinct; exact values/keys/receipt |
| result ID and record | independent derivation; complete and fail retain exact Activation and typed value |
| ack and terminal dispositions | each batch ack names exact Activation; outside-batch terminal disposition never becomes ack |
| Outcome answer, accepted lookup, resolved exchange | exact Activation, receipt replay identity, no replay mutation |
| delivery rows and late reports | original exact ID/epoch across redelivery/takeover/resolution; late report touches only its own row |
| refusal.executionId / authority attribution | exact Execution and trusted actor coordinates despite bounded prose |

Use non-ASCII scope, >128-unit keys, and trusted lone-surrogate namespaces so diagnosticIdentity
actually omits. Compare to independent expected source coordinates, not another projection of the
same stored object. Port P4 into maintained tests, extend it for adjacent sites, and run X8–X23
single-span mutants with clean controls; preserve sealed reviewer records.

## Cumulative map

C1 scope/nondisclosure; C2 exact replay/conflict; C3 four limits/whole refusal; C4 atomic ack,
progress/output/receipt; C5 next exchange and terminal; C6 B-5 and ingress replay; C7 unsupported
Effects/waits; C8 takeover/fencing; C9 code holds; C10 protocol holds; C11 late reports;
C12 immutable evidence; C13 single observation/ambient safety; C14 private inventory; C15 Layer-3
and baseline. Each retains contract revision 9's full map and coverage-03, with the interactions
above added. Re-audit coordinator mutation ordering, consumers, prior findings and full cumulative
base diff after the correction. Run every contract command on clean C, preserve sealed exits,
attach accessible logs with hashes in H, and leave independent acceptance/integration to the owner.

Prior pass missed VALUE-COST because it bounded rendered output after an unbounded internal list;
it missed EVID because before/after views could agree on the same corrupted coordinate. Both
subsystems now have source-derived producer/consumer maps and distinguishing broken controls.
