# Implementation report — K1.1, round 4

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 4**.
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** `WAITING_FOR_REVIEW`. **Owner release:** explicit instruction on 2026-09-14
  ("Let's release K1.1") through [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent);
  the correction rounds need no renewed permission under 006.
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`, brought into this branch by the ordinary merge
  `87ee39c2832f9ebd41aa8e5b084b76af0d14ff8c`.
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Round-4 payload C4:** `1d4e4867b748f9e0b2f4041e17ded836ebc25a75`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C4:**
  C `8cd9e269b1c08f166dec1b567aedf7d1b4810b34` / H `0f345b3c9ab49f6c5d9e09b162641cda78f96356` /
  [review-01](review-01.md) at `1489227b4c80a2d059e8e71f92b233ed76bff8d5`;
  C2 `6b7e5fb0eb3cb323788f97889b84db845a7b3f9f` / H2 `297cc56ff186638817e0edfba7a3ce9f103d561e`;
  C3 `615cdf884ac560aec659162353680e55f732804c` / H3 `b3cdf33732df1f0645e0d773917b4f82444208c5` /
  [review-02](review-02.md) at `3012b3c3328c49cfa15b2d4330f1bb871f53162a` (CHANGES REQUIRED).
  Nothing was amended, rebased, squashed or force-pushed;
  [`01-tree-and-environment.log`](validation-04/01-tree-and-environment.log) proves the ancestry.
- **Candidate H4:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C4..H4 administrative file allowlist:**
  `docs/development/work/K1.1/implementation-04.md`,
  `docs/development/work/K1.1/validation-04/` (MANIFEST plus ten declared output-only logs), and the
  K1.1 status transcription in `docs/development/007-work-packets.md`. No production source, test,
  script, fixture, evaluator rule, threshold or configuration is in that interval; all of those are
  payload in C4.
- **Working-tree state:** clean at C4 apart from `validation-04/`, which the validation run itself
  writes and which H4 commits.

## Changes and coverage

### Change groups

| Group | Files | Ownership and governing source |
|---|---|---|
| Value acceptance reconstructed around one capture | `packages/kernel/src/values.ts`, `packages/kernel/src/index.ts` | Kernel; [values](../../../../mental-model/concepts/values.md) |
| Retained evidence immutable at its single mint | `packages/kernel/src/identity.ts`, `packages/kernel/src/refusal.ts`, `packages/kernel/src/coordinator.ts` | Kernel; [identity](../../../../mental-model/concepts/identity.md), [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md) |
| Identity fields required to be text (self-found) | `packages/kernel/src/coordinator.ts`, `packages/kernel/src/identity.ts` | Kernel; [identity](../../../../mental-model/concepts/identity.md) |
| Distinguishing regressions | `packages/kernel/tests/{values,creation,ingress,dispatch,inspection,receipts,unsupported}.test.ts`, new `packages/kernel/tests/evidence.test.ts` | this packet |
| Export-surface control and inventory maintenance | `tests/conformance/architecture/kernel-landing-zone.test.ts`, `docs/development/work/K1.0/ownership-inventory.md` | [015](../../015-structural-evidence-rules.md), K1.1-C10 |
| Contract revision 4 | `docs/development/work/K1.1/contract.md` | 006/012 |

Cumulative `B..C4` and the round-4 delta `H3..C4` are in
[`01-tree-and-environment.log`](validation-04/01-tree-and-environment.log).

### Selected 012 methods, and material exclusions

Unchanged from the contract: **deterministic execution** (primary), **normative decisions** for the
identity/equality/receipt rules, **race and fault** narrowly for dispatch asynchrony and
ingress-versus-reservation ordering, and **process/documentation** for the K1.0 inventory and guard.
This round leans hardest on deterministic execution with adversarial fixtures and on
**semantic-correction closure**. Materially excluded, as before: native Runtime/Driver fidelity (no
real Driver exists; R1 owns it), external evidence/gate methods (no E gate is claimed), and
packaging/release (the zone stays private). No persistence or process-death claim is made or implied.

### Semantic correction closure — K11-R2-VAL-02

**Invariant changed.** *One observation, one value.* For every accepted boundary-value root, the
structure whose canonical bytes decide identity **is** the structure retained, projected into an
Activation and exposed by inspection. `values.md` supplies both halves: equality is canonical-byte
equality, and unsupported values are rejected rather than repaired.

**What was actually wrong.** `values.ts` read the caller's object three separate times — `walk` to
validate, `canonicalize@3.0.0` to serialize, `sealBoundaryValue` to copy — and nothing forced the
three readings to agree. Arrays were validated by indexed read and sealed from the own descriptor;
the JCS implementation used its own member access. Review-02's counterexample is the minimal witness:
an array whose own descriptor at `0` says `1` and whose indexed read says `2` was accepted with
canonical `[2]` and retained `[1]`. I reproduced it and two more before touching anything
(`canonical [2]` / retained `[1]`; `canonical []` / retained `[7]` for an unowned position; and the
object form `{"a":2}` / `{"a":1}`).

**Producers, validators, commit point, consumers, replay and read paths traced.**

| Role | Where | Disposition |
|---|---|---|
| Producer | the caller's request envelope | read once per position, then never again |
| Validator | `capture` (was `walk`) | now also produces the snapshot, so validation and content cannot diverge |
| Canonical form | `encode` | now called on the snapshot, never on caller-owned state |
| Byte limit | `accept` | measured from the snapshot's bytes |
| Commit point | `createExecution` / `submitInput` | store `CanonicalValue.value`, which *is* the snapshot |
| Content identity | `packIdentity` over `CanonicalValue.canonical` | those bytes now describe what was stored |
| Replay / conflict | `creationIdentity`, `contentIdentity` comparison | decided by bytes taken from the retained structure |
| Driver projection | `toActivationEvent`, `Activation.executionView` | the retained structure, frozen |
| Inspection | `viewOf`, `toMailboxView` | the retained structure, frozen |

**Forbidden mutations, now structural rather than conventional.** Nothing after capture reads the
caller's object; there is no exported way to snapshot an unvalidated value (`sealBoundaryValue` is
removed — K1.1-DEC-3); and `canonicalize` is a single pass, where it previously encoded twice.

**Refusal rather than normalization.** Coherence alone would have silently turned an exotic value
into a plain snapshot, which `values.md` forbids. Capture therefore refuses any position that does
not present one structure to read, stated structurally with no exotic object kind named: an own data
descriptor disagreeing with an ordinary read, and an array `length` disagreeing with itself, are
`unstable_representation`; an array position below `length` that owns nothing is `undefined_member`;
an own-name listing with no property behind it is refused; and an observation that throws is refused
rather than escaping a Kernel boundary as an exception.

**Distinguishing oracle.** Nine new `values.test.ts` cases including the exact descriptor-versus-read
counterexample, its object and nested forms, the unowned-position form, the self-disagreeing
`length`, the throwing observation, the lying own-name listing, a prototype-supplied member, and an
invariant sweep that re-canonicalizes every accepted root in the packet's shape vocabulary. Plus
end-to-end cases at creation, ingress, Activation/redelivery and inspection. Every prior regression
is retained: `__proto__` at root, nested and array-embedded and under a null prototype; `"01"`,
`"00"` and `4294967295`; accessors; exotic array prototypes; mutation-after-acceptance; the four
limits at and one over; and all of rules 1–6.

### Semantic correction closure — K11-R2-EVID-01

**Invariant changed.** A receipt and a refusal record are *retained evidence*. `identity.md` defines
a receipt that way and C1/C6 require exact replay to return the original decision; `execution-cycle`
requires a refusal to be recorded, and C9 reports recorded refusals. So neither may be editable
through any reference the Kernel hands out.

**What was actually wrong.** `readonly` is erased at run time. `mintReceipt` returned a plain object
that `createExecution` simultaneously stored as `record.creationReceipt`, as the initial mailbox
entry's receipt, as an element of `record.receipts`, and returned to the caller. `#refusal` did the
same for refusals. Casting away `readonly` and assigning edited the Kernel's retained decision, and
its own later replay and inspection reported the forged value.

**Ownership rule rather than copies at call sites.** There is exactly one place each kind of evidence
is created. `mintReceipt` freezes, and the new `mintRefusal` in `refusal.ts` freezes. Sharing one
object between what is retained and what is returned then becomes *sound*, and it is what lets an
exact replay return the original receipt (`===`) rather than an equal-looking reconstruction. The
rejected alternative — detaching a copy at each exit — would place the invariant in every present and
future exit path instead of in two constructors, and would weaken replay identity. The retained
`queued` disposition is one shared frozen value for the same reason; K1.2 and K1.3 will *replace* an
entry's disposition rather than mutate it, which is why `MailboxEntry.disposition` stays a writable
field naming an immutable value.

**Paths audited together:** creation receipt (returned, replayed, in `receipts`, on the initial
mailbox entry), ingress receipt (returned, replayed, on its entry), dispatch receipt (returned,
returned again by redelivery, on the `ActivationView`), every receipt and refusal reached through
inspection, refusal records returned directly with and without an Execution, and the dispositions in
both ingress answers and the mailbox view.

**Distinguishing oracle.** The new `evidence.test.ts` (11 cases) casts away `readonly`, mutates every
exposed receipt and refusal, and then replays and inspects to check the retained token, boundary,
position, classification, reason and Execution are unchanged. One case enumerates every evidence
object this packet exposes and asserts each is frozen, so a later packet adding a boundary has to
extend it rather than quietly ship a mutable receipt. A mutation attempt is wrapped rather than
asserted to throw: what is under test is the Kernel's retained answer, not which way the assignment
failed.

### Additional self-found defect — K11-R3-ID-02 (separate provenance)

Not a reviewer finding. It surfaced while re-auditing C1/C2 against `identity.md`'s injectivity
requirement, as 012 asks after a semantic correction.

`packIdentity` is injective **over text** — the length prefix is what makes it so. Nothing required
its parts to be text. `canonicalize` accepts any boundary value, so an input `kind`, creation key or
request key that was an object passed validation and then packed as `undefined:[object Object]`.
Observed before the fix, on the real coordinator:

- two different creation keys `{a:1}` and `{b:2}` collided: the first created an Execution, the
  second was refused as *its* conflict, having named nothing of the sort;
- **two different `kind` values under one creation key were answered as an exact replay of each
  other** — `replayed: true`, the first Execution returned. That is the direct inverse of C1's
  "different content under one key is a conflict";
- two different request keys collided the same way at ingress.

Corrected by one rule at the request boundary: every field that names a request — creation key,
scope, both revisions, progress codec, input kind, declared subscription class, producer request key
— must be text, and is refused as `malformed_value` naming the field when it is not. Text is still
held to the ordinary boundary-value rules, so a lone surrogate in a creation key is still refused.
`destination` deliberately needs no such check: a non-text destination matches no minted Execution ID
and is already answered as an unknown destination, which discloses nothing — asserted as a case.
`packIdentity` itself now raises a `TypeError` on a non-text part, because its remaining non-request
parts (the authenticated namespace, the authority scope) come from the host's authentication
boundary, where a non-text value is a programming error rather than a bad request — the same
treatment as an invalid `mailboxCapacity` (K1.1-DEC-5).

### Tests added, changed and retired

| Change | Reason |
|---|---|
| **+ `evidence.test.ts`** (11 cases) | K11-R2-EVID-01 across every exposed evidence path |
| **+ 9 cases** in `values.test.ts` under `K11-R2-VAL-02` | the capture invariant and its refusals |
| **+ 2 cases** each in `creation.test.ts`, `ingress.test.ts`, `dispatch.test.ts`; **+1** in `inspection.test.ts` | the same invariant carried through creation, ingress, Activation/redelivery and inspection |
| **+ 2 cases** in `creation.test.ts`, **+2** in `ingress.test.ts`, **+2** in `receipts.test.ts` | K11-R3-ID-02 |
| **~ 1 case** in `values.test.ts` | "sealBoundaryValue detaches and freezes" became "acceptance detaches and freezes without invoking any accessor": the entry point it named is gone, the behaviour it asserted is not, and it now additionally proves an accessor is refused rather than invoked |
| **~ export lists** in `unsupported.test.ts` and `kernel-landing-zone.test.ts` | one name removed; both lists stay exact so the change is deliberate rather than drift |

**No regression was retired.** Every K11-R1-VAL-01, ID-01, SCOPE-01, JCS-01 and limits case is intact
and is re-proved discriminating by the ablation table in
[`validation-04/MANIFEST.md`](validation-04/MANIFEST.md). Kernel cases went 117 → 151.

**Compatibility, refusal and baseline impact.** The zone stays private and unadvertised; no existing
consumer is routed through it; `npm run test:sdk` shows the public host path unchanged. Baseline
`002` needs no edit: it describes the implemented 0.8.x architecture, which this does not touch. The
only support-surface change is the removed `sealBoundaryValue` export, recorded in the K1.0 ownership
inventory and in K1.1-DEC-3.

### Prior findings

| Finding | Disposition at C4 | Evidence |
|---|---|---|
| **K11-R2-VAL-02** (P1, open) | **Corrected.** Acceptance reconstructed around one capture; incoherent representations refused, not normalized. | `values.test.ts`, `creation/ingress/dispatch/inspection.test.ts`; ablations 1–4 |
| **K11-R2-EVID-01** (P1, open) | **Corrected.** Evidence frozen at its two mints; every exposed path re-audited. | `evidence.test.ts`; ablations 5–7 |
| K11-R1-VAL-01 | Closed round 2/3, **re-proved after the rewrite** rather than assumed: the `__proto__` and `"01"` families are retained and still reject their ablations. | ablations 10–11 |
| K11-R1-ID-01 | Closed round 2, untouched, re-proved. | ablations 12–13 |
| K11-R1-SCOPE-01 | Closed round 2, untouched, re-proved. | ablation 14 |
| K11-R1-JCS-01 | Closed round 3; the owner-approved exact `canonicalize@3.0.0` decision, pin, lockfile integrity and guard are **not reopened**. What changed is only *what it is called with*: the captured snapshot instead of caller-owned state. | ablation 15; `01-tree-and-environment.log` |
| K11-R1-PROC-01 | Closed round 3 on ancestry, re-verified at C4. | `01-tree-and-environment.log` |
| K11-R1-DOC-01 | Closed round 3, untouched. | — |

### Unresolved obligations

`K1.1-OPEN-3` (accepted progress is trivially absent until K1.2), `OPEN-4` (an empty batch is
unreachable), `OPEN-5` (the published never-expires key policy for this in-memory profile), `OPEN-6`
(no durability, isolation or Driver-fidelity claim) and `OPEN-7` (the delivery-attempt log is
unbounded) stand exactly as contract revision 3 states them. None is a defect in this packet's claim;
each names the packet that owns the behaviour. `OPEN-1` and `OPEN-2` remain closed. **No owner
blocker is open, and no owned semantic case is left for the reviewer to decide.**

## Validation and interpretation

Every command ran from `/Users/rex-shih/Documents/ArrokothI/arrokothi` against the clean payload tree
C4 on Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64. Exit codes, counts, raw
paths and SHA-256 digests are in [`validation-04/MANIFEST.md`](validation-04/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,209 tests, 329 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 151 tests, 28 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 151 tests, 28 suites, 0 fail, every case named |
| 15 one-behaviour ablations | 0 | control clean; **15 of 15 rejected** by named cases |

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and this correction adds no Agent, no model path and no eval fixture. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver or packaging check.
So nothing here supports a durability, isolation, native-fidelity, release or E-gate claim.

### Why the evidence supports each criterion — implementer assessment, not acceptance

Every criterion was re-derived from its governing source this round; a prior PASS was not carried
forward. C5, C7, C8 and C10 were re-checked rather than assumed, because the rewrite and the export
change reach them.

| Criterion | Assessment | Why, and what would have failed |
|---|---|---|
| **C1** | met | Atomic bind, `READY`, the three lost-response rows, conflict, fresh key, cross-caller key text and payload-cannot-supply-the-principal all hold. Creation now binds identity to the structure it retains (VAL-02), its receipt cannot be edited (EVID-01), and a non-text identity field is refused instead of packed (ID-02) — where two different `kind` values were previously answered as one replay. |
| **C2** | met | Triple identity, replay, conflict, cross-producer and cross-destination, unknown-versus-invisible, capacity-before-acknowledgment and per-root limits hold. Accepted payloads are now retained as the structure that decided replay; recorded conflicts are immutable; a non-text request key names nothing. |
| **C3** | met | Rules 1–6 byte-for-byte, all four limits at and one over, per-root measurement, and no repair. The new half — one observation, one value, with incoherent representations refused — is asserted directly, swept over the accepted shape vocabulary, and carried through every consumer. The approved JCS substrate is unchanged and still rejects its `JSON.stringify` ablation. |
| **C4** | met | Intent before send, pinned fields, reservation that acknowledges nothing, bound behaviour, survival of a throwing/rejecting/never-settling Driver, non-blocking dispatch, one unresolved Activation. The Activation now demonstrably carries the one accepted structure, and a value with two readings never reaches a Driver at all. |
| **C5** | met | Redelivery preserves Activation ID, epoch, base revision, batch and receipt, and re-sends the same frozen Activation object; later arrivals stay queued and out of the batch. Re-checked because the receipt it returns is now frozen and shared. |
| **C6** | met | Three boundaries, three receipts, none equal to another, replay returns the original token, refusals mint none, reads authenticate and scope first with hidden and missing answering identically. The retained-evidence half is now structural. |
| **C7** | met | `submitOutcome`, `requestTakeover`, `recoverExecution` and `cancelExecution` refuse by name (K1.2/K1.2/K1.2/K1.3) and change nothing; the accepting ablation is rejected. Untouched this round. |
| **C8** | met | No Agent/Workflow discriminator in executable zone text or the exported surface; the one occurrence is a comment in `driver.ts` explaining its absence. Re-scanned after the rewrite. |
| **C9** | met | The snapshot carries every accepted fact, reading acknowledges and mutates nothing, it is scoped identically to C6, and it now exposes the retained structure itself with immutable evidence rather than an independently derived copy. |
| **C10** | met | The zone still imports only in-zone modules, `node:` builtins and exact `canonicalize`; the portable-leaf list is still empty; the package is still private. The export surface changed by one removed name, updated in both controls and in the K1.0 inventory under 015's editing rule. No agreement check was weakened and no schema relaxed. |

C11 remains withdrawn and is not an acceptance criterion in contract revision 4.

### Design choices, assumptions and the strongest remaining risk

Three decisions are recorded in the contract as K1.1-DEC-3, DEC-4 and DEC-5: removing the separate
seal entry point, freezing evidence at its mint rather than copying at exits, and refusing non-text
identity fields while raising on non-text trusted packing parts. Each is a routine implementation
choice under 007, recorded so a reviewer can rule on it rather than infer it.

One assumption is worth stating plainly. Capture observes a container's own-name listing **once**,
and the structure it observed is definitionally the value that was accepted. A representation that
could report a different set of own names on a second listing would be accepted as whatever the
single listing said. That is not an incoherence — identity, retained content and every projection
still describe that one observed structure, which is the invariant under review — but it is the
reason the module's claim is "one observation, one value" rather than "the implementation can detect
every dishonest object". No finite check can establish the latter, and a second listing would only
move the question to a third.

**Strongest remaining risk:** the value subsystem has now been corrected twice, and 006 is explicit
that a repeat defect in an already-corrected subsystem means reconstructing it rather than patching
further. That is what this round did — the three-pass shape is gone, not adjusted — but the honest
statement is that the reconstruction is new code, and its most likely residual defect is a shape in
the accepted vocabulary whose snapshot differs from the original in a way no current case names. The
sweep that re-canonicalizes every accepted root exists to catch that class; it is not a proof of
absence.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
and `package-lock.json` still pins the same registry tarball and integrity
`sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`;
neither file is in the C3..C4 delta. The Apache-2.0 record and the round-3 owner approval in the
contract's Third-party review section stand unchanged and are not reopened. The dependency is still
used unmodified via its default export and only to serialize already-validated plain data; what
changed is only that it is now handed the captured snapshot rather than caller-owned state, which
narrows its input and adds no obligation. No legal-clearance claim beyond that record is made.

## Handoff

- **Ready for independent review.** No known mandatory defect, no unresolved owned semantic case, no
  owner blocker and no missing required evidence. `WAITING_FOR_REVIEW` is claimed on that basis.
- Base B, payload C4 and candidate H4 with the verified advertised remote SHA are supplied in the
  external owner handoff after the push.
- The review should bind to the cumulative `B..H4` diff and the exact `C4..H4` administrative
  allowlist above, and re-check C1–C10 cumulatively. `review-01.md` and `review-02.md` are preserved
  and unmodified.
- **No self-acceptance.** No criterion is accepted here. Nothing is merged. Successor release stays
  owner-controlled; `next_release: none`.
