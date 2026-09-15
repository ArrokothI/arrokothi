# K1.1-correction-01 independent review — round 2 architecture blocker

**Reviewer/session:** OpenAI ChatGPT, **GPT-5.6 Sol**, High reasoning.  
**Date:** 2026-09-15, America/New_York.  
**Role:** independent reviewer of the round-2 blocker. I did not implement H1 or author blocker-01.  
**Session identifier:** not exposed to me.

## 1. Review binding and access

This review binds to:

- original K1.1 base B `777b9955fb3a443f700b4f3d1f4f2aef1869345b`;
- correction payload C1 `b898ae12f51917c48fef92496ca179773c7744d9`;
- correction candidate H1 `1fd6cd05454ea66eff61b277b7328eedb5dd0a7f`;
- round-1 independent review commit `9374c13fc2604075ea2e44e5cbd230663ed0cc62` (`review-01.md`, CHANGES REQUIRED);
- round-2 blocker commit `bfa4cb4f606525cf93f7d4543f7ebab8604a57b2`;
- correction contract revision 1, unchanged;
- `docs/development/work/K1.1-correction-01/blocker-01.md`.

At review start the remote correction branch resolved exactly to `bfa4cb4f606525cf93f7d4543f7ebab8604a57b2`.
The round-2 delta from `9374c13...` to `bfa4cb4...` is one administrative commit changing only:

- `docs/development/007-work-packets.md` (status transcription); and
- `docs/development/work/K1.1-correction-01/blocker-01.md`.

There is no C2, H2, code, test, fixture, contract, threshold, configuration, script, package or mental-model payload change. I inspected the pinned repository source and records through authenticated GitHub access. I also checked the current ECMAScript Promise algorithms for `Promise.prototype.then`, `SpeciesConstructor`, `PerformPromiseThen` and `PromiseResolve`. I did not independently rerun the implementer's transient Node probes; they are therefore supporting observations, not the sole basis for this verdict.

## 2. Progress assessment

Round 2 is a **substantial improvement in diagnosis and process correctness**, even though it intentionally makes no semantic payload change.

Round 1 had already reduced the reopened correction to one family, `K11-R16-DISP-01`, but H1 overgeneralized its remaining Promise-subclass counterexample as a fundamental JavaScript limit. The round-2 reconstruction separates two cases correctly:

1. a configurable hostile subclass species is still fixable by a stronger synchronous observation strategy; and
2. an admitted already-rejected Promise with an own non-configurable throwing construction slot is not safely observable after return by ordinary ECMAScript Promise APIs.

Stopping at the second case instead of encoding another known unhandled rejection as a green test is the correct 006 behavior.

The seven round-1 closed families remain untouched by the administrative-only delta. Nothing in this round supplies contrary evidence for them.

## 3. `K11-R16-DISP-01` remains open

**Severity:** P1  
**Affected criteria:** K1.1-C4, K1.1-C5  
**Disposition:** **NOT CLOSED — BLOCKED_ARCHITECTURE**

The correction contract inherits K1.1-C1…C10 unchanged and its required correction states that dispatch/redelivery Promise observation must leave **no rejected Driver promise escaping as unhandled**.

The current Driver interface still admits:

```ts
deliver(activation: Activation): void | Promise<void>;
```

with no normative restriction excluding Promise subclasses or a native Promise instance carrying hostile own construction properties.

The blocker's smallest counterexample is sufficient:

```ts
const hostile: Promise<void> = Promise.reject(new Error("own ctor reject"));
Object.defineProperty(hostile, "constructor", {
  get(): never { throw new Error("own ctor boom"); },
  configurable: false,
});
```

This is a genuine native Promise and therefore belongs to the currently declared `Promise<void>` return domain.

## 4. Why the blocker is real

The relevant language ordering is decisive, not an implementation guess.

For `Promise.prototype.then`, ECMAScript performs `SpeciesConstructor(promise, %Promise%)`, then creates the result capability, and only afterwards reaches `PerformPromiseThen`, where the fulfillment/rejection reactions are actually installed and the original promise becomes handled.

`SpeciesConstructor` first gets the promise's `constructor`. Therefore an own throwing `constructor` accessor aborts the operation before any rejection reaction can be attached.

`PromiseResolve(%Promise%, x)` does not bypass this case. If `x` is already a Promise, the algorithm first gets `x.constructor` before it can use the same-constructor fast path. The same hostile own accessor therefore aborts that observation too.

The blocker's other listed ordinary observation paths (`catch`, `finally`, `await`, combinators) reduce to the same constructor/species machinery or Promise resolution and do not expose a separate primitive for directly appending a reaction to the internal Promise slots.

A non-configurable own property cannot be deleted or redefined to make the construction lookup benign. Prototype replacement cannot hide an own property. JavaScript exposes no standard operation that directly sets the Promise's internal handled flag or appends a rejection reaction while bypassing this ordering.

Consequently, once an already-rejected value of this shape has been returned, the Kernel cannot simultaneously satisfy all three current assumptions:

1. the return is admitted by `void | Promise<void>`;
2. the Kernel must observe its rejection; and
3. no rejection may escape unhandled.

This confirms the blocker's core claim. `K11-R16-DISP-01` cannot be closed by another local implementation patch without an owner-authorized change to the Driver boundary or to the guarantee.

## 5. H1's configurable-subclass conclusion was too broad

The blocker also correctly retracts one part of H1 rather than treating every hostile species as impossible.

For a configurable subclass `Symbol.species`, the construction descriptor can be saved, temporarily replaced with a safe constructor, a direct primordial `Promise.prototype.then` subscription can be installed synchronously, and the descriptor restored exactly afterwards. This avoids H1's asynchronous `Promise.resolve` assimilation window.

That family therefore remains an implementation obligation after the owner resolves the architecture question. The future correction must not retain H1's test that treats an unhandled rejection from the configurable subclass as the expected passing outcome.

## 6. Architecture decision required

The coding agent is correct not to choose among the semantic options itself.

The owner must decide what the Driver boundary promises. At minimum the decision must answer whether settlement safety is a precondition on a trusted Driver or a property the Kernel guarantees for every runtime value assignable to `Promise<void>`.

### Reviewer recommendation

I do **not** recommend authorizing H1's counted-unhandled exception.

I also do not prefer merely spelling a post-return runtime check as “exact native Promise” or “observable Promise”: an already-rejected nonconforming return can escape before the Kernel can safely attach, so such a check is useful only if it is explicitly a **trusted Driver authoring precondition**. That can be a valid design, but the resulting guarantee is necessarily scoped to conforming Driver returns.

The cleanest long-term boundary is to avoid observing Driver-authored Promise objects altogether while preserving delivery-failure evidence: make settlement an explicit Kernel-owned callback/capability passed to the Driver, and have `deliver` itself return `void`. For example, conceptually:

```ts
deliver(activation, settlement): void
```

where `settlement.delivered()` / `settlement.failed(reason)` are Kernel-provided operational reporting hooks with exactly-once/late-call behavior specified by the contract. The Driver may use promises internally, but handling those promises becomes the Driver adapter's responsibility rather than a hostile object crossing into Kernel observation. This preserves nonblocking dispatch and Kernel-visible operational failure without requiring the Kernel to subscribe to arbitrary Promise instances.

That is a semantic interface change and therefore requires explicit owner approval plus a contract revision; this review does not make that decision.

If the owner wants the smallest textual/API change instead, the alternative is an explicit trusted-Driver observability precondition (blocker option B), together with the configurable-subclass direct-`then` correction and a precise statement that zero-unhandled is guaranteed for conforming Driver returns. That is smaller but makes the trust boundary more load-bearing.

## 7. New record finding — `KC1-R2-PROC-01`

**Severity:** P2  
**Class:** status-record consistency  
**Affected path:** `docs/development/007-work-packets.md`

The correction row correctly has status `BLOCKED_ARCHITECTURE` and later states that `K11-R16-DISP-01` is P1 NOT CLOSED. However the same row still contains the inherited H1 sentence:

> “All eight findings closed with distinguishing + ablation evidence, independently adversarially reviewed.”

Those statements cannot both describe current correction status.

### Required outcome

When the owner decision is recorded / the packet resumes, repair the row so it says seven round-1 families are closed and `K11-R16-DISP-01` remains open pending the architecture decision. Preserve the H1 implementer claim only if it is explicitly labeled as the historical H1 assessment, not current truth.

This P2 does not undermine the architecture blocker itself and requires no semantic C2.

## 8. Criteria and finding state

- K1.1-C1, C2, C3, C6, C7, C8, C9, C10: no new contrary evidence in the round-2 administrative delta; round-1 closure evidence remains the current semantic evidence.
- K1.1-C4, C5: **FAIL / blocked** on `K11-R16-DISP-01` until the owner defines the Driver settlement boundary consistently with the required guarantee.
- `K11-R15-ID-01`: remains closed on H1 evidence.
- `K11-R15-DOC-01`: remains closed on H1 evidence.
- `K11-R15-DOC-02`: remains closed on H1 evidence.
- `K11-R15-PROC-01`: remains closed on H1 evidence.
- `K11-R16-VAL-01`: remains closed on H1 evidence.
- `K11-R16-ID-01`: remains closed on H1 evidence.
- `K11-R16-DOC-01`: remains closed on H1 evidence.
- `K11-R16-DISP-01`: **OPEN, P1, BLOCKED_ARCHITECTURE**.
- `KC1-R2-PROC-01`: **OPEN, P2**, administrative contradiction in 007.

No C2/H2 validation is expected because there is no payload change to validate. H1's validation-01 remains historical evidence for H1 and the seven untouched families; it does not prove closure of the blocked Promise requirement.

## 9. Compact handoff

| Field | Value |
|---|---|
| Packet | K1.1-correction-01 |
| Original base | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` |
| Prior payload/candidate | C1 `b898ae12f51917c48fef92496ca179773c7744d9`; H1 `1fd6cd05454ea66eff61b277b7328eedb5dd0a7f` |
| Prior review | `9374c13fc2604075ea2e44e5cbd230663ed0cc62` / `review-01.md` |
| Reviewed blocker | `bfa4cb4f606525cf93f7d4543f7ebab8604a57b2` / `blocker-01.md` |
| Fresh C2/H2 | none |
| Semantic blocker | `K11-R16-DISP-01` P1; C4/C5 blocked |
| Administrative finding | `KC1-R2-PROC-01` P2; contradictory current 007 sentence |
| Required next action | explicit owner Driver-settlement decision, then new payload and fresh validation/review |
| Successor | K1.2 remains held; `next_release: none` |
| Overall outcome | **BLOCKED — ARCHITECTURE DECISION** |

The packet is not accepted, merged or released by this review.

**BLOCKED — ARCHITECTURE DECISION**
