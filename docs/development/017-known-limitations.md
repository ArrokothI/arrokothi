# Known limitations

This register lists what the implementation deliberately does **not** guarantee yet. Each entry says
why that is acceptable now, what would make us fix it, and which packet would fix it.

Two neighbouring documents do different jobs:
- [Findings](003-evidence-and-findings.md) holds gaps whose fix is already planned work.
- An entry here is fixed only when its trigger happens.

The normative wording of each limit stays with its canonical owner, linked from the entry. This page
does not restate those rules.

## Owner direction

Recorded 2026-10-17 by the owner's Claude Code session (`claude-opus-5-5`). Verbatim:

```text
My thought is (including for the next possible BINDING-01), make a new file that mention the limitation. We don't need to be 100% precise/secure for everything. List the limitation, when things actually happen, we can fix. Focus on the stuff that must built right now; otherwise the future fix will be super difficult.
```

## The rule

**Build right now, with full evidence**, anything that later work builds on and that is expensive to
change afterwards:
- public API shapes and wire formats;
- persisted data and identity, such as canonical bytes, IDs, receipts and request equality;
- Kernel state-machine semantics, such as commit, fencing, authority ordering and terminal disposition;
- module and package boundaries that later packets depend on;
- anything that would silently lose or corrupt a cooperative caller's data.

**May stop at a recorded limitation:** anything whose later fix will not force a redesign of what is
built on it. Examples:
- defences against hostile or unusual same-process callers;
- cost bounds beyond the declared ones;
- engine-specific behaviour;
- completeness of evidence tooling, such as static guards against hypothetical future code or
  mutation-credit bookkeeping.

Each such limit must:
1. be written here;
2. have a fix that stays reachable without redesigning what is built on it;
3. not silently corrupt data for cooperative use.

**Reviews.** These findings are non-blocking (P3):
- a finding that falls inside a registered limitation;
- an evidence-tooling gap that demonstrates neither a production defect nor a false current claim.

Such a finding gets a new or widened entry here, or it moves to TOOLS-02 for evidence tooling. Two
kinds of finding still block as usual:
- one showing that a limitation is wider than its entry says;
- one touching a build-right-now item.

This is the "accepted, recorded limit" that [006](006-development-process.md#stop-and-redesign)
offers. It does not weaken a gate for build-right-now items.

**Adding an entry.** The owner approves every entry, through a design check, an owner choice or a
review disposition. Fields:
- ID;
- what is not guaranteed;
- why it is acceptable now;
- the trigger that makes us fix it;
- the packet expected to fix it;
- the source decision and the canonical owner.

Remove an entry when its fix is integrated.

## Register

### Current

BINDING-01 narrows the entries below under its [approved design/check](work/BINDING-01/design-01-check.md). These dispositions do not release a hold or certify acceptance.

| ID | Not guaranteed | Why acceptable now | Fix when | Expected fix | Source |
|---|---|---|---|---|---|
| L-01 | SDK wrapper fidelity under same-process global replacement or lexical shadowing; genuine intrinsics at core module initialization remain a host precondition | Core validation/encoding captures intrinsics at load; wrapper remains cooperative | A deployment needs untrusted same-process wrapper use | Realm hardening or isolation; before a public bridge ships, K1.4 adds a startup check that resolves the serializer's free identifiers and refuses on mismatch, or states this limit in the bridge contract | [invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md); [core release](work/BINDING-01/hold-release-01.md); [core binding](../../mental-model/concepts/values.md#canonical-bytes-core); [BINDING-01 check](work/BINDING-01/design-01-check.md) |
| L-02 | Protection of the in-process binding against a hostile caller in the same process, in general | The in-process binding has a cooperative contract; hostile code needs Isolated Execution | A deployment needs an untrusted in-process caller | Isolation or transport containment, not the binding | [decision-01](work/DESIGN-AUDIT-01/decision-01.md) item 1; [values](../../mental-model/concepts/values.md#in-process-value-capture) |
| L-03 | Wall-clock refusal cost. V-D1 meters SDK capture work; the core makes no wall-clock promise | Timing is an observation, not a finishable universal gate | A measured real-world stall | Re-plan the affected unit table or decoder | [decision-05](work/K1.2/decision-05.md); [values](../../mental-model/concepts/values.md#fixed-semantic-limits); [BINDING-01 design](work/BINDING-01/design-01.md) |
| L-04 | SDK wrapper R1: own-key listings whose lengths are known only after return, one crossing object per root | Immediate returned-length charge stops the root; the core never lists caller value objects | A measured stall from one huge object | Wrapper capture revision | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits); [BINDING-01 design](work/BINDING-01/design-01.md) |
| L-05 | SDK wrapper R2: interceptor-backed host objects can execute host-defined internal methods | Rare in cooperative use; core byte roots do not traverse those objects | A real host object reaches capture | Wrapper capture revision | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits); [BINDING-01 design](work/BINDING-01/design-01.md) |
| L-06 | Wrapper capture R3 and ordinary core maps: hash-table lookup cost is constant only in expectation | Engine behavior; no core metering claim is made | Never expected | None planned | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits); [BINDING-01 design](work/BINDING-01/design-01.md) |
| L-07 | SDK wrapper R4: own entries walked but not returned (private names, deleted-element storage), repeated per shared occurrence | Cooperative contract; core never observes caller value objects | A measured stall from such an object | Wrapper capture revision | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits); [owner choice 01](work/K1.1-correction-03/owner-choice-01.md); [BINDING-01 design](work/BINDING-01/design-01.md) |
| L-08 | SDK wrapper refusal of re-prototyped built-ins that have no cheap, side-effect-free detector (WeakRef, FinalizationRegistry, Temporal, Intl, iterators, DisposableStack, WebAssembly, KeyObject/CryptoKey, private-field platform classes). They are accepted as their own-data projection, unspecified and possibly refused later | Re-prototyping them is unusual; the detectable kinds are refused ([hold release](work/K1.1-correction-03/hold-release-01.md)) | A real caller is affected, or Node adds a predicate | Wrapper capture revision | [values in-process capture](../../mental-model/concepts/values.md#in-process-value-capture); [design-01 check](work/K1.1-correction-03/design-01-check.md) Q6 |
| L-09 | Both core and wrapper envelopes: own accessors and Proxy envelopes may execute caller code between roots | Existing observeField behavior retained by owner choice; core copies and validates each byte root as observed | A real consumer needs an envelope with no caller code | Separately designed envelope hardening | [BINDING-01 check](work/BINDING-01/design-01-check.md); [values](../../mental-model/concepts/values.md#in-process-value-capture) |
| L-10 | The SDK capture work budget B is a proven upper bound, at most about 1.6% above the costliest acceptance found, not the exact maximum | Finding the exact maximum is a large optimisation for a small gap | Never expected | None planned | [design-01 check](work/K1.1-correction-03/design-01-check.md) Q3; [BASELINE](002-implemented-kernel-baseline.md) |
| L-11 | The wrapper metering/stop checks and core intrinsic guard are bounded syntactic guards. They do not prove arbitrary future code safe; metering aliases/dynamic calls and semantic escapes need review | A soundness proof for arbitrary future code is not finishable; runtime traces cover the maintained shapes | A real bypass found in code review | TOOLS-02 or the packet that hits it | [design 03](work/K1.1-correction-03/design-03.md); [its check](work/K1.1-correction-03/design-03-check.md) |
| L-12 | Automatic mutation-kill credit comes only from the declared assertion vocabulary. Other kills are uncredited, and evidence-tooling gaps go to TOOLS-02 | Evidence completeness is not product behaviour | TOOLS-02 | TOOLS-02 | [owner choice 02](work/K1.1-correction-03/owner-choice-02.md); [owner choice 03](work/K1.1-correction-03/owner-choice-03.md) |
| L-13 | Request-wide work/size cap: wrapper roots each have budget B; core byte roots each have the four semantic limits, with no aggregate cap | Existing root-count bounds remain; the byte move adds no new request-wide rule | A measured stall from many roots | A consumer/transport limit | [decision-05](work/K1.2/decision-05.md) item 5; [BINDING-01 design](work/BINDING-01/design-01.md); [values](../../mental-model/concepts/values.md#fixed-semantic-limits) |
| L-14 | A metered cost bound for the internal JSON transport decoder | No remote transport exists; input is capped at 8 MiB before adapter copying/decoding and semantic limits still apply | A measured decoder stall or the first remote transport | Transport binding packet | [BINDING-01 approved design](work/BINDING-01/design-01.md); [values](../../mental-model/concepts/values.md#canonical-bytes-core) |
