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

| ID | Not guaranteed | Why acceptable now | Fix when | Expected fix | Source |
|---|---|---|---|---|---|
| L-01 | Integrity against same-process code that replaces global bindings (for example a global `let JSON`) before or during a call into the in-process binding (V-ENV) | The CORE direction moves the Kernel core to canonical bytes; hostile same-process code needs isolation ([AGENTS.md](../../AGENTS.md) trust modes) | BINDING-01 | BINDING-01 | [invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md), [decision-01](work/DESIGN-AUDIT-01/decision-01.md) |
| L-02 | Protection of the in-process binding against a hostile caller in the same process, in general | The in-process binding has a cooperative contract; hostile code needs Isolated Execution | A deployment needs an untrusted in-process caller | Isolation or transport containment, not the binding | [decision-01](work/DESIGN-AUDIT-01/decision-01.md) item 1; [values](../../mental-model/concepts/values.md#in-process-value-capture) |
| L-03 | A wall-clock bound on refusal cost. V-D1 is metered work, and timing is an observation, not a gate | A universal wall-clock claim cannot be finished | A measured real-world stall | Re-plan the unit table | [decision-05](work/K1.2/decision-05.md) |
| L-04 | (R1) The cost of the own-key listings, one object per root, whose length is known only after they return | The charge right after each listing stops the root; the rest is engine work | A measured stall from one huge object | BINDING-01 (bytes core) | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits); [design-01 check](work/K1.1-correction-03/design-01-check.md) Q5 |
| L-05 | (R2) Host objects whose internal methods the host defines (interceptor-backed objects) | Rare in cooperative use | A real host object reaches capture | BINDING-01 wrapper | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits); [design-01 check](work/K1.1-correction-03/design-01-check.md) Q5 |
| L-06 | (R3) Hash-table lookups cost a constant only in expectation | Engine behaviour | Never expected | None planned | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits) |
| L-07 | (R4) Own entries a listing walks but does not return (private names, deleted-element storage), which can repeat per shared occurrence | Needs deliberately built objects; the cooperative contract | BINDING-01 | BINDING-01 (the core never observes caller objects) | [values residuals](../../mental-model/concepts/values.md#fixed-semantic-limits); [owner choice 01](work/K1.1-correction-03/owner-choice-01.md) |
| L-08 | Refusal of re-prototyped built-ins that have no cheap, side-effect-free detector (WeakRef, FinalizationRegistry, Temporal, Intl, iterators, DisposableStack, WebAssembly, KeyObject/CryptoKey, private-field platform classes). They are accepted as their own-data projection, unspecified and possibly refused later | Re-prototyping them is unusual; the detectable kinds are refused ([hold release](work/K1.1-correction-03/hold-release-01.md)) | A real caller is affected, or Node adds a predicate | BINDING-01 wrapper or later | [values in-process capture](../../mental-model/concepts/values.md#in-process-value-capture); [design-01 check](work/K1.1-correction-03/design-01-check.md) Q6 |
| L-09 | The request envelope's own accessors, or a Proxy envelope, can run caller code between root captures | The envelope rule predates this packet; Proxy refusal covers captured roots only | BINDING-01 | BINDING-01 wrapper | [values in-process capture](../../mental-model/concepts/values.md#in-process-value-capture); [design-01 check](work/K1.1-correction-03/design-01-check.md) Q7 |
| L-10 | The work budget B is a proven upper bound, at most about 1.6% above the costliest acceptance found, not the exact maximum | Finding the exact maximum is a large optimisation for a small gap | Never expected | None planned | [design-01 check](work/K1.1-correction-03/design-01-check.md) Q3; [BASELINE](002-implemented-kernel-baseline.md) |
| L-11 | The static metering and stop checks are bounded syntactic guards. Aliases, `.call`/`.apply`, computed or dynamic calls and evasive code are declared gaps | A soundness proof for arbitrary future code is not finishable; runtime traces cover the maintained shapes | A real bypass found in code review | TOOLS-02 or the packet that hits it | [design 03](work/K1.1-correction-03/design-03.md); [its check](work/K1.1-correction-03/design-03-check.md) |
| L-12 | Automatic mutation-kill credit comes only from the declared assertion vocabulary. Other kills are uncredited, and evidence-tooling gaps go to TOOLS-02 | Evidence completeness is not product behaviour | TOOLS-02 | TOOLS-02 | [owner choice 02](work/K1.1-correction-03/owner-choice-02.md); [owner choice 03](work/K1.1-correction-03/owner-choice-03.md) |
| L-13 | A request-wide work budget. Each captured root has its own budget B and no aggregate cap applies, so one request's refusal work is up to B per root, bounded by each consumer's root count (for example `emissionsPerOutcome`) | Decision-05 item 5 chose per-root budgets; every root count is already bounded | A measured stall from a request with many roots | BINDING-01, or a consumer limit | [decision-05](work/K1.2/decision-05.md) item 5; [implementation 04](work/K1.1-correction-03/implementation-04.md); owner-approved in the [review 03](work/K1.1-correction-03/review-03.md) supplement |
