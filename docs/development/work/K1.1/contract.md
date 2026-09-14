# K1.1 contract — create, reserve and asynchronous dispatch

**Packet:** K1.1. **Parent milestone:** K1 ([001 K1](../../001-current-status-and-roadmap.md)).
**Packet seed:** [007 K1.1](../../007-work-packets.md#k11--create-reserve-and-asynchronous-dispatch).
**Layer-3 maintenance:** [roadmap mapping K1.1](../../../../mental-model/roadmap.md#k11).
**Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (integrated `main`,
including 006/007/008/012 as they stand there).
**Dependency:** K1.0 with corrections 01–02, integrated on `main` as PR #21 /
`9baff3a03662720af6eefe1ecfabc41fde99298f`, with formal integration receipts
[work/K1.0/integration-01.md](../K1.0/integration-01.md) and
[work/K1.0-correction-02/integration-01.md](../K1.0-correction-02/integration-01.md), ledger-reconciled
by `main` PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`. See
[Entry and owner release](#entry-and-owner-release).
**Base commit:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
**Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Contract revision 4 (round-4: value acceptance
reconstructed around one capture (K11-R2-VAL-02); retained evidence immutable at its single mint
(K11-R2-EVID-01); identity fields required to be text (self-found K11-R3-ID-02). Revision 3 closed
OPEN-1 by the 05f48c2/87ee39c main-merge ancestry and OPEN-2 by the owner-approved canonicalize@3.0.0
substrate; both stand unchanged.)**
**Implementer:** Muse Spark, 2026-09-14 correction round. The `codex/` branch
prefix is 006's naming convention for a packet branch, not a claim about which agent wrote it.

## Entry and owner release

The owner released K1.1 by explicit instruction on 2026-09-14 ("Let's release K1.1"), delivered
through [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent). The prerequisite
acceptances are integrated as stated above; the substantive entry condition 006 states — "all
prerequisite acceptances integrated" — is satisfied, and the formerly outstanding formal integration
receipts (round-2 [K1.1-OPEN-1](#unresolved-obligations-and-open-decisions)) are now owner-supplied
and in this branch's ancestry through the `87ee39c` main-merge. This packet does not write owner
receipts and never treated the release as having written them; it records their arrival.

This packet is K1 implementation. K1.0's accepted structural pass is preparation, not an E1 result;
nothing here closes an E1 criterion or the K1 milestone, which [K1.4](../../007-work-packets.md#k14--legacy-bridge-and-k1e1-gate)
owns.

## Scope, and what stays with siblings

In scope, exactly as 007 states it: atomic create with initial input, scoped identity, opaque pinned
progress, batch reservation and Driver dispatch, minimum inspection, post-creation input ingress
under the Input ID triple, and explicit refusal of forms whose packet has not landed.

Out of scope and assigned: Outcome acceptance, receipts for that boundary, authorized takeover, the
writer-epoch advance, the recovery hold for unavailable pinned code and the E-6 at-limit/one-past
boundary matrix (K1.2, which [K0.2's own vocabulary](../../../../tests/conformance/k0/protocol-vocabulary.ts)
also names as that matrix's owner); wait registration, wait matching, wait-ended readiness,
deadlines and cancellation (K1.3); the legacy bridge, the SDK host entry and the E1 gate (K1.4);
Effects, admission and settlement (K2); children, messages and output replay (K4); persistence,
schedulers and leases (K3); real Drivers (R1).

## Governing sources

| Obligation area | Canonical owner |
|---|---|
| Creation, creation-key retry, input ingress | [creation](../../../../mental-model/mechanisms/creation.md) |
| Dispatch intent, reservation, retry versus takeover | [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md) |
| Execution, Activation, Event, mailbox, batch, reservation, acknowledgment | [core](../../../../mental-model/concepts/core.md) |
| Request key, Input ID, attempt, writer epoch, dispatch, revision, receipt | [identity](../../../../mental-model/concepts/identity.md) |
| Progress forms and pinned codec | [state](../../../../mental-model/concepts/state.md) |
| Boundary values, canonical form, semantic limits | [values](../../../../mental-model/concepts/values.md) |
| Lifecycle states reachable in this packet | [lifecycle](../../../../mental-model/mechanisms/lifecycle.md) |
| What a structural pass proves | [evidence](../../../../mental-model/mechanisms/evidence.md#structural-evidence) |

Accepted K0.1 decisions restated by those owners and relied on here: E-1–E-7 (values), ID-1–ID-4,
ID-6–ID-9 (identity and receipts), B-1–B-5 (batches, reservation, acknowledgment, retention,
terminal disposition), PC-1 and PC-4 (progress forms and pinned codec). The worksheet is sealed
evidence; the Layer-3 owners above are the authority this packet implements against.

## Selected proof methods ([012](../../012-review-methods.md))

- **Deterministic execution** — the primary method. Every criterion below is driven through the
  supported entry (`ExecutionCoordinator`) with controlled fake Drivers and explicit barriers, and
  each assertion accounts for the whole observable result, not only the headline state.
- **Normative decisions** — for the identity, equality and receipt rules, whose content is a
  contract rather than a code path: both orders of interacting operations, absent/empty/inert cases,
  exact limit edges, and duplicate/conflicting/stale submissions.
- **Race and fault** — narrowly: dispatch asynchrony and the ordering of ingress against reservation.
  This packet makes **no** persistence or process-failure claim, so no process-kill evidence is
  offered or implied; K3 owns that method for its own claims.
- **Process/documentation** — for the K1.0 inventory/guard maintenance in K1.1-C10.

Materially excluded: native Runtime/Driver fidelity (no real Driver exists; R1 owns it), external
evidence/gate methods (no E gate is claimed), and packaging/release (the zone stays private).

## Acceptance criteria

Each criterion names its governing source, its observable boundary and the counterexample a passing
implementation must reject. Evidence locations are given in the [coverage map](#obligationinteraction-coverage-map).

**K1.1-C1 — atomic creation under a caller-scoped creation key.** Creation binds Execution ID,
Runtime contract revision, Definition revision, progress codec, authority scope and context, and the
initial input, in one accepted decision, and the Execution is `READY` with no externally visible
`CREATED` state. The three [lost-response rows](../../../../mental-model/mechanisms/creation.md#the-lost-response-cases)
hold: nothing committed commits now; a committed-then-lost response returns the already-created
Execution and its retained decision; a caller repeating a seen response gets the same Execution and
no second one. Same scope and key with different content is a conflict that creates nothing and is
recorded. A fresh key with identical content creates a second Execution. Another authenticated
caller may use the same key text without colliding. The principal comes from the authenticated
caller parameter only; no field of the request payload can supply or change it. Every field that
names a request — the creation key, the authority scope, the pinned revisions and codec, the input
kind and any declared subscription class — must be text before it is packed into an identity, because
the packing is injective over text only; a non-text field is refused as a malformed value naming that
field, never packed into a key two different requests could share.

**K1.1-C2 — post-creation input ingress under the Input ID triple.** Input identity is the triple
(authenticated producer namespace, destination Execution ID, producer request key). Acceptance
records immutable content, trusted provenance and a mailbox entry together. Exact replay — same
triple, same [logical value](../../../../mental-model/concepts/values.md#canonical-form) — returns
the recorded disposition and creates no second Event. Different content under the same triple is
recorded as a conflict and refused, and mutates nothing. The same key text from two producers, and
the same producer's key text to two Executions, name different inputs. Ordinary input to a terminal
destination is refused with an inspectable reason, is not queued and is not a terminal disposition.
Input to an unknown destination, and input to an Execution outside the caller's authority scope, are
refused identically, so the refusal cannot be used to discover another principal's Execution.
Capacity limits refuse ingress before any acknowledgment. All of this holds whether or not a wait
exists, which at this packet is always "not": wait matching is K1.3.

**K1.1-C3 — canonical boundary values, equality and semantic limits, from one observation.** The
target zone produces one canonical value encoding through the owner-approved unmodified conforming JCS
implementation `canonicalize@3.0.0` (round-3 owner decision closing K1.1-OPEN-2; AGENTS.md record in
[implementation-03](implementation-03.md)), behind `packages/kernel/src/values.ts`, and enforces
[values](../../../../mental-model/concepts/values.md)' RFC 8785/JCS rules 1–6 and its four fixed
semantic limits around it. Non-finite numbers, `undefined`, symbols,
functions, non-plain objects, lone surrogates and cycles are rejected before identity or equality is
computed, never repaired. Equality is canonical-byte equality: key order is not semantic, array order
is, and an absent member differs from an explicit `null`. Each boundary-value root is measured
independently; sibling roots are not summed. Values exactly at a limit pass and one unit over is
rejected, for all four limits.

**Acceptance reads a caller's value once.** Validation, canonical bytes, retained content, Activation
projection and inspection are all derived from one immutable snapshot taken during that single pass;
the caller's object is never consulted again. For every accepted root, the structure whose canonical
bytes decide identity *is* the structure retained and later exposed, so re-canonicalizing what was
retained reproduces the bytes that accepted it. A representation that does not present one structure
to read — an own data descriptor and an ordinary property read that disagree, an array position
`length` claims but the value does not own, an own-name listing with no property behind it, or a
structure whose observation throws — is **refused**, not normalized into whichever reading won and
not repaired. No exotic object kind is named by the rule or by its implementation.

**K1.1-C4 — dispatch intent, reservation and asynchrony.** Before sending, one atomic decision
reserves the exact Event batch and records dispatch intent, writer epoch, accepted progress and base
revision, progress codec, pinned Runtime and Definition revisions and the supplied authorized
execution view; the Execution becomes `RUNNING`. The batch is a finite enumerable set of accepted
Event references selected in per-Execution acceptance order under an implementation-owned bound of at
least one; a bound below one is refused. Reservation acknowledges nothing: reserved Events remain
unacknowledged and keep their own dispositions. The recorded intent survives a Driver that throws,
never returns, or is never observed again, and dispatching a delayed Execution does not prevent
another Execution from being dispatched on the same coordinator. At most one Activation is
unresolved per Execution.

**K1.1-C5 — ordinary redelivery preserves the exchange.** Re-sending an unresolved dispatch preserves
the Activation ID, the writer epoch, the pinned progress revision and the reserved batch exactly, and
never re-selects: Events accepted after reservation stay out of that batch and stay queued. Redelivery
of a resolved or never-dispatched exchange is refused. Nothing in this packet advances a writer epoch.

**K1.1-C6 — per-boundary receipts, principal-scoped, and not caller-mutable.** Creation, input
ingress and dispatch intent each mint their own receipt naming that boundary and its position; there
is no single receipt per Execution and no receipt from one boundary is returned for another. Exact
replay returns the original token; every refusal mints none. Receipt reads authenticate and scope
before revealing anything, and a caller outside the scope gets the same answer as for an Execution
that does not exist.

**Retained evidence is immutable.** A receipt and a refusal record are retained evidence, and the
Kernel deliberately returns the same object it retains, so each is immutable from the single point
where it is created. No mutation a caller performs on a receipt returned by creation, ingress,
dispatch, redelivery or inspection, or on a refusal record returned directly or read through
inspection, can change the Kernel's retained decision or what a later replay or inspection reports.
`readonly` alone does not satisfy this: it is erased at run time.

**K1.1-C7 — explicit refusal of unlanded surfaces.** Outcome submission, authorized takeover,
the recovery hold for unavailable pinned code, and out-of-band cancellation exist as refusing
surfaces naming the packet that owns them (K1.2, K1.2, K1.2, K1.3), never as silent no-ops, and
change no accepted state when called. The refusal is the K1.0 mechanism, reused rather than
duplicated. Cancellation acceptance and `B-5` terminal disposition are K1.3's under governing 007;
K1.1 implements neither (K11-R1-SCOPE-01 correction of K1.1-DEC-1).

**K1.1-C8 — no Agent/Workflow discriminator in the new boundary.** No executable text in the target
zone contains an Agent or Workflow discriminator, and no exported type carries one. The legacy
closed `DefinitionKind` controller port ([DX-12](../K1.0/ownership-inventory.md#deferred-extraction-and-bridge-owners))
is refused, not carried forward: which code can interpret an Execution's progress is answered by the
pinned Definition/Runtime-contract revision and progress codec alone.

**K1.1-C9 — minimum inspection that acknowledges nothing and leaks nothing.** Inspection reports
lifecycle state, accepted progress and its revision, the unresolved Activation with its writer epoch
and reserved batch, queued Events in acceptance order with their dispositions, recorded refusals with
their reasons, and the receipts above. Reading acknowledges no Event and mutates nothing. What it
exposes is the retained structure itself — the same value C3's acceptance bound identity to, and
evidence C6 holds immutable — not a separately derived copy that could describe something else. Inspection
is authenticated and scoped on the same terms as K1.1-C6. `B-5` terminal dispositions and
acknowledgments are always empty here (K1.3 and K1.2 own them); the fields exist so later packets
have a place to record them.

**K1.1-C10 — the K1.0 structural boundary still holds, and its inventory matches the tree.** The
target zone still imports nothing outside itself except `node:` builtins and the single
owner-approved third-party specifier `canonicalize` (exact `canonicalize@3.0.0`), approves no
portable leaf, and stays private. K1.0's guard and its
[ownership inventory](../K1.0/ownership-inventory.md) are updated to the measured candidate tree —
file count, export surface, third-party reach, and the K1.1 disposition of its assigned deferred
rows — under [015](../../015-structural-evidence-rules.md)'s editing rule, with no agreement check
weakened and no schema relaxed.

## Obligation/interaction coverage map

| Obligation and source | Input or schedule, including the negative case | Expected observable facts and forbidden changes | Evidence |
|---|---|---|---|
| C1 atomic bind; no `CREATED` (creation.md, lifecycle.md) | create once | one accepted decision; `READY`; every bound field readable; **forbidden:** any intermediate state observable to the caller | `creation.test.ts` |
| C1 lost-response rows (creation.md table) | create; create again same scope+key+content; again | rows 2 and 3 return the same Execution ID **and the same creation receipt**; **forbidden:** a second Execution, a second initial Event, a new receipt | `creation.test.ts` |
| C1 content conflict (creation.md) | create `week 37`; retry `week 38` under one key | refusal classified `duplicate_conflict`, recorded and readable; **forbidden:** any mutation of the original, a new Execution, a minted receipt | `creation.test.ts` |
| C1 fresh key, identical content (creation.md) | two keys, one payload | two distinct Execution IDs | `creation.test.ts` |
| C1 cross-caller key text (identity.md ID-2) | callers A and B, key `report-17` | two Executions; each caller reaches only its own | `creation.test.ts` |
| C1 principal is not payload-supplied (creation.md) | payload carrying `producer`/`namespace` fields | scoping ignores them entirely; a second caller with the same payload still collides with nothing | `creation.test.ts` |
| C2 triple identity and replay (creation.md, identity.md) | submit; submit identical; submit different content | replay returns the recorded disposition and the original receipt; conflict refuses and records; **forbidden:** second Event, edited payload, changed acceptance position | `ingress.test.ts` |
| C2 cross-producer and cross-destination (identity.md ID-2) | key `17` from two producers; one producer's `17` to two Executions | four distinct Events, no collision | `ingress.test.ts` |
| C2 terminal destination (creation.md, B-5) | input to a terminal Execution | refused with an inspectable reason; **forbidden:** queueing it, acknowledging it, recording it as a terminal disposition | `ingress.test.ts` |
| C2 unknown versus invisible (identity.md) | input to a missing ID; input to another scope's ID | byte-identical refusal classification and reason | `ingress.test.ts` |
| C2 capacity (creation.md) | fill the mailbox, submit one more | refused before acknowledgment; mailbox unchanged | `ingress.test.ts` |
| C3 validity (values.md, E-1) | `NaN`, `Infinity`, `-0` in a number field, `undefined`, symbol, function, class instance, lone surrogate, cycle | each rejected with a path; **forbidden:** coercion to `null`, `"NaN"` or U+FFFD | `values.test.ts` |
| C3 canonical form (values.md rules 1–6) | key-order twins, array-order twins, `{}` vs `{"answer":null}`, the six number spellings, C0 controls, `/`, non-ASCII | equality exactly on canonical bytes; the spellings the page names, byte for byte | `values.test.ts` |
| C3 limits at the edge (values.md) | at-limit and one-over for string scalars, container entries, depth and canonical bytes; two 700 KiB siblings | at-limit passes, one over is rejected, siblings both pass | `values.test.ts` |
| C4 intent contents (execution-cycle.md) | dispatch a created Execution | every pinned field present and equal to the creation-bound values; `RUNNING`; **forbidden:** inferring the codec or revisions from anything else | `dispatch.test.ts` |
| C4 reservation acknowledges nothing (core.md, B-3) | dispatch with a non-empty mailbox | batch pinned; the same Events still unacknowledged and still queued | `dispatch.test.ts` |
| C4 bound (B-1, B-2) | three queued Events at bounds 1, 2, 3 and 0 | acceptance-order prefix; bound 0 refused | `dispatch.test.ts` |
| C4 intent survives the Driver (execution-cycle.md) | Driver throws synchronously; Driver returns a rejected promise; Driver never settles | intent and `RUNNING` stand in all three; the failure is recorded as operational, not as a state change | `dispatch.test.ts` |
| C4 asynchrony (execution-cycle.md, 007 acceptance) | delayed fake A, then dispatch B on the same coordinator | B's dispatch completes while A is unresolved; ordering is not serialized behind A | `dispatch.test.ts` |
| C4 one unresolved Activation (core.md) | dispatch twice without resolution | the second is refused; the first exchange is unchanged | `dispatch.test.ts` |
| C5 redelivery (execution-cycle.md retry/takeover table, ID-3/ID-9 case 1) | dispatch; accept a new Event; redeliver | identical Activation ID, epoch, base revision and batch; the new Event stays queued and out of the batch | `dispatch.test.ts` |
| C5 redelivery of nothing | redeliver before dispatch; redeliver a refused exchange | refused, nothing created | `dispatch.test.ts` |
| C6 per-boundary receipts (identity.md ID-6/ID-7) | one Execution through create → input → dispatch | three receipts, each naming its own boundary; none equal to another; replay returns the original | `receipts.test.ts` |
| C6 refusals mint none (identity.md) | every refusal path in C1, C2, C4 | receipt set unchanged after each | `receipts.test.ts` |
| C6 scoped lookup (identity.md ID-8) | read a receipt as the wrong scope; read a missing one | identical answers | `receipts.test.ts` |
| C7 unlanded surfaces (007, K1.0 refusal mechanism) | call Outcome submission, takeover, recovery hold, cancellation | each throws naming its owner packet (K1.2, K1.2, K1.2, K1.3); full inspection snapshot unchanged before and after | `refusals.test.ts` |
| C8 no discriminator (007 acceptance, PC-1, DX-12) | scan the zone's executable text; read the exported surface | zero occurrences outside comments; no exported union over Agent/Workflow | `boundary.test.ts` |
| C9 inspection is inert (core.md) | full snapshot, read twice around every read-only call | deep-equal snapshots; no acknowledgment, no position change | `inspection.test.ts` |
| C9 inspection is scoped (identity.md) | inspect another scope's Execution | same refusal as unknown | `inspection.test.ts` |
| C10 zone rules (K1.0 contract, 015) | the real import graph and the inventory | no violation; document and policy agree on the measured tree | `tests/conformance/architecture/kernel-landing-zone.test.ts` |
| C10 deferred rows this packet owns (K1.0 inventory) | DX-1, DX-2, DX-3, DX-12 | each disposed in writing by its owner; the approved-leaf list is still empty | `work/K1.0/ownership-inventory.md`, `boundary.test.ts` |
| C2 terminal-destination rule, K1.3-evidence route (creation.md, lifecycle.md) | new input while READY/RUNNING; `isTerminal` over the terminal vocabulary | new input to non-terminal is never `terminal_destination`; the `isTerminal` + Input-ID-before-terminal ordering is asserted without manufacturing K1.3 terminal state; live-terminal ingress/replay/conflict exercise awaits K1.3 | `ingress.test.ts` |
| C3/C2 root independence (values.md) | a payload at exactly the depth limit, and one over, at both boundaries | the at-limit payload is accepted; the envelope adds no level and no bytes | `ingress.test.ts` |
| C1/C2/C9 accepted content is immutable (creation.md, core.md) | edit the caller's own object after acceptance; edit a returned view | the recorded content is unchanged; the frozen copy throws | `inspection.test.ts` |
| C4 the intent precedes the send (execution-cycle.md) | a Driver that reads the Kernel back from inside `deliver` | it already sees `RUNNING`, the Activation and the reserved batch; input it submits from there is queued and does not join that batch | `dispatch.test.ts` |
| C4 the exchange is immutable (core.md) | a Driver that edits the Activation it was handed | the write throws; redelivery still carries the content captured before it | `dispatch.test.ts` |
| C3 one observation, one value (values.md) | a value whose own data descriptor and property read disagree; an array position `length` claims but nothing owns; an own-name listing with nothing behind it; a length that disagrees with itself; an observation that throws | each refused with a located code (`unstable_representation`, `undefined_member`); **forbidden:** accepting either reading, normalizing the value, or letting the exception leave the boundary | `values.test.ts` |
| C3 accepted content re-canonicalizes to its own identity (values.md) | every accepted shape in the packet's vocabulary, including own `__proto__`, at-limit depth and nesting | re-canonicalizing the retained structure reproduces the accepting bytes exactly | `values.test.ts` |
| C1/C2/C4/C9 the one value reaches every projection (values.md, core.md) | accept a payload and an authority context, dispatch, redeliver, inspect twice | Activation payload, redelivered payload and both inspection reads are the same retained structure, and it canonicalizes to the bytes that decided replay; **forbidden:** a projection derived again from the caller's object | `creation.test.ts`, `ingress.test.ts`, `dispatch.test.ts`, `inspection.test.ts` |
| C1/C2 a value with no single reading is refused at both ingress points (values.md) | such a payload and such an authority context at create and at submit | `malformed_value` locating the position; **forbidden:** an Execution, a queued Event, or any Activation reaching a Driver | `creation.test.ts`, `ingress.test.ts`, `dispatch.test.ts` |
| C1/C2/C6/C9 retained evidence is immutable (identity.md) | cast away `readonly` and mutate every returned receipt and refusal, then replay and inspect | the retained token, boundary, position, classification, reason and Execution are unchanged; every exposed evidence object is frozen; **forbidden:** a replay or inspection reporting an edited value | `evidence.test.ts` |
| C1/C2 identity fields are text (identity.md) | non-text creation key, scope, revisions, codec, input kind, subscription class, request key; a non-text destination | each refused as `malformed_value` naming the field; a non-text destination answers as an unknown destination; `packIdentity` raises on a non-text part; **forbidden:** two different requests packing to one identity, or a different request answered as a replay | `creation.test.ts`, `ingress.test.ts`, `receipts.test.ts` |
| C2 capacity is a declared limit (creation.md) | construct a coordinator with capacity 0 or 2.5 | refused as a configuration error, not discovered as a runtime refusal | `ingress.test.ts` |

## Command plan

Run on the payload commit C, from the repository root, Node 22.9+:

```bash
npm run typecheck
npm test
npm run test:conformance
npm run test:kernel
npm run test:sdk
npm run check:builder-docs
node --test --test-reporter=tap "tests/conformance/architecture/*.test.ts"
```

`npm test` is the superset that includes the new `packages/kernel/tests/*.test.ts` files and the
architecture conformance suite; `test:conformance` and `test:sdk` are run separately because this
packet touches the architecture guard and must show the public host path unchanged.
`check:builder-docs` is run because the inventory document and package documentation change.
`test:kernel` and the architecture suite are run and recorded separately as well: the packet's own
case inventory and the K1.0 structural guard are where a change to this zone shows up first, and the
round-4 export-surface change (K1.1-DEC-3) is enforced in both the packet suite and the guard.
`npm run test:evals` is **not** run: this packet adds no Agent behaviour and no model path, and 006
requires it only for Agent behaviour.

## Third-party review ([AGENTS.md](../../../../AGENTS.md))

One third-party dependency is added under the round-3 owner approval closing K11-R1-JCS-01:
exact `canonicalize@3.0.0` (Apache-2.0, `git+https://github.com/erdtman/canonicalize.git`,
homepage `https://github.com/erdtman/canonicalize#readme`, engines `node >= 18`, zero runtime
dependencies), used unmodified via its default export and only to serialize already-validated plain
data in `packages/kernel/src/values.ts`. Inspected at the installed revision: `package.json` license
field `Apache-2.0`, standard 201-line Apache-2.0 `LICENSE` at the package root, no `NOTICE` file, no
per-file license headers, 49-line dependency-free `lib/canonicalize.js` plus its `.d.ts` and `bin/`.
No code, test vector or corpus is copied, adapted or vendored: reuse is by package-manager reference
to the exact published version (`"canonicalize": "3.0.0"` in `packages/kernel/package.json`, pinned in
`package-lock.json` with dist integrity
`sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`).
Apache-2.0 permits commercial use and distribution with no copyleft, non-commercial,
source-available, hosted-service or multi-tenant restriction; obligations are preserving the license
and stating changes — satisfied: the package is used unmodified, no ArrokothI change is folded into
it, and the approval, version and license are recorded here, in the ownership inventory and in
[implementation-03](implementation-03.md). No other third-party code, test, script, asset or
dependency is copied, adapted, vendored or added. The target zone's portable-leaf list stays empty;
its external rule is now `node:` builtins plus exactly this specifier (exact match, not a prefix).

RFC 8785 is the normative reference the repository already adopts; the dependency is the conforming
implementation of it, not a new reference. No RFC text, test vector or corpus is copied into the
repository.

## Decisions taken within this contract

Routine implementation choices are the agent's under 007. These are recorded because a reviewer
should be able to rule on them rather than infer them.

- **K1.1-DEC-1 — WITHDRAWN by K11-R1-SCOPE-01 correction (round 2).** The round-1 contract judged
  that K1.1 should implement cancellation acceptance to evidence C2's terminal case. Governing 007
  assigns out-of-band cancellation and terminal disposition to K1.3, and the round-1 independent
  review required removal: K1.1 must not accept the K1.3 cancellation boundary. The correction
  removes `cancelExecution` acceptance, `CancellationAccepted`, the `fenced` exchange field and
  `cancellation.test.ts`; `cancelExecution` now refuses naming K1.3 under C7. K1.1 retains the rule
  that *new* ordinary input to a terminal destination is refused, with the `isTerminal` check and
  Input-ID-before-terminal ordering in `submitInput`/`dispatch`, but no terminal state is reachable
  here — live-terminal ingress/replay/conflict evidence awaits K1.3. Preserved here so the
  withdrawal has provenance; do not reintroduce acceptance without a governing 007 amendment.
- **K1.1-DEC-2 — one epoch per exchange, starting at 1.** `identity.md` leaves "whether it resets
  for a later Activation" to the implementation and constrains only advances within one unresolved
  exchange. Nothing in this packet advances an epoch, and the takeover that does is K1.2's.
- **K1.1-DEC-3 — there is no supported way to seal a value the zone has not validated.** The
  round-4 correction of K11-R2-VAL-02 makes the immutable snapshot the product of the capture pass
  that accepted the value, and removes the separately callable `sealBoundaryValue` from the zone's
  export surface. A second entry point that snapshots caller-owned state is exactly the second
  reading that let identity and retained content describe different structures, so it is removed
  rather than documented as dangerous. `canonicalize` is the whole supported path; C10's measured
  export surface and the two export-surface controls are updated to the tree this produces.
- **K1.1-DEC-4 — retained evidence is frozen where it is minted, not copied where it is
  returned.** `mintReceipt` and `mintRefusal` are the only places a receipt or refusal record comes
  into existence, and both freeze. The Kernel then shares one object between what it retains and what
  it returns, which is what lets an exact replay return *the original* receipt rather than an
  equal-looking reconstruction. The rejected alternative — detaching a copy at each exit — would put
  the invariant in every current and future exit path instead of in the two constructors.
- **K1.1-DEC-5 — a non-text identity field is a refusal; a non-text `packIdentity` part is a
  raised error.** Caller-supplied request fields are data crossing a boundary, so a non-text creation
  key, scope, revision, codec, kind, subscription class or request key is refused as
  `malformed_value` naming the field. `packIdentity`'s parts also include the authenticated caller's
  namespace and the authority scope, which arrive from the host's authentication boundary rather than
  from the request; a non-text part there is a programming error at that boundary and raises a
  `TypeError`, the same way an invalid `mailboxCapacity` raises rather than inventing a protocol
  refusal. A non-text `destination` needs neither: it matches no minted Execution ID and is already
  answered as an unknown destination, which discloses nothing.

## Unresolved obligations and open decisions

These do not pass because tests pass. They are stated so a reviewer can weigh them.

- **K1.1-OPEN-1 — prerequisite integration receipts: RESOLVED by main PR #26.** 007 formerly
  recorded the formal integration receipts for K1.0 and K1.0-correction-02 as owed before K1.1
  release. Owner-supplied receipts now exist: [parent receipt](../K1.0/integration-01.md) and
  [correction-02 receipt](../K1.0-correction-02/integration-01.md), integrated on `main` as PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f` with `main` PR #26 / `05f48c204d1eae021b3464c206e5c11e84bb3505`
  reconciling the ledger. Both are ancestors of this correction's merge (`87ee39c`) and of C3.
  K11-R1-PROC-01 closes on that ancestry; see [implementation-03](implementation-03.md).
- **K1.1-OPEN-2 — CLOSED by round-3 owner approval (K11-R1-JCS-01).** [values.md](../../../../mental-model/concepts/values.md#canonical-form)
  requires an unmodified conforming JCS implementation rather than an almost-equivalent serializer.
  The owner approved exact `canonicalize@3.0.0` for this packet; `packages/kernel/src/values.ts` now
  calls that dependency unmodified to serialize already-validated plain data, keeping ArrokothI's own
  boundary validation, limits and seal. AGENTS.md record is in the Third-party review section above
  and in [implementation-03](implementation-03.md).
- **K1.1-OPEN-3 — accepted progress is unavoidably trivial here.** Progress is Runtime-owned and is
  installed only by Outcome acceptance, which is K1.2. Every Activation this packet dispatches
  therefore pins base revision 0 and absent progress. What K1.1 can and does prove is the *pinning*:
  the codec and the Definition/Runtime-contract revisions are recorded at creation, carried in the
  intent, and never inferred. The "returned to the Runtime unchanged" half of
  [progress](../../../../mental-model/concepts/state.md#progress) is not exercised and is K1.2's.
- **K1.1-OPEN-4 — an empty batch is unreachable.** [B-2](../K0.1/protocol-worksheet.md) permits an
  ordinary continuation to carry an empty batch, but nothing in this packet acknowledges an Event, so
  no mailbox can drain. The empty-batch case belongs to K1.2's first accepted `continue`.
- **K1.1-OPEN-5 — the expired-key policy, published.** [creation.md](../../../../mental-model/mechanisms/creation.md)
  requires the exact expired-key policy to be published. This packet's profile is in-memory and
  process-scoped: **no creation key and no Input ID ever expires while the coordinator lives, and
  nothing survives it.** There is therefore no expired-key case to test here, and no bounded-retention
  profile may be claimed from this packet. A profile that does expire keys must publish its own
  policy before enabling expiry; that belongs with persistence (K3) and retention windows (K5).
- **K1.1-OPEN-6 — no durability, isolation or Driver-fidelity claim.** The coordinator is in-memory.
  Nothing here survives process loss, contains a Runtime, or says anything about native fidelity.
- **K1.1-OPEN-7 — the delivery-attempt log is unbounded.** Every ordinary redelivery appends one
  operational attempt record, and nothing trims them. That is operational traffic rather than
  accepted state, and retention windows belong to K5; a long-lived exchange redelivered many times
  would grow that list without limit in this profile.

## Interacting boundaries

- **K1.2** consumes this packet's dispatch intent, writer epoch, base revision and reserved batch as
  the fence its Outcome acceptance validates against, and owns the first epoch advance.
- **K1.3** consumes the mailbox and its per-entry dispositions; it adds no second ingress rule.
- **K1.4** re-checks K1.0's structural obligations against actual behaviour and drives this boundary
  from the SDK host for E1.
- **K0.2's public fixture** (`tests/conformance/k0/`) is the pinned E1 kernel fixture. This packet
  does not port a candidate onto it — that is K1.4's — but deliberately uses its vocabulary
  (`READY`/`RUNNING`, `duplicate_conflict`, batch, acceptance order) so the later port is a wiring
  exercise rather than a translation.
