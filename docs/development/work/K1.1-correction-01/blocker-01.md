# K1.1-correction-01 architecture blocker — K11-R16-DISP-01 cannot close within the current Driver boundary

**Packet:** K1.1-correction-01 (parent K1). **Status:** `BLOCKED_ARCHITECTURE` (006).
**Branch:** `codex/k1.1-correction-01-review-findings`.
**Original base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
**Prior payload C (H1 payload):** `b898ae12f51917c48fef92496ca179773c7744d9`.
**Prior candidate H1:** `1fd6cd05454ea66eff61b277b7328eedb5dd0a7f`.
**Review commit (round-1 review):** `9374c13fc2604075ea2e44e5cbd230663ed0cc62` (`review-01.md`, CHANGES REQUIRED, `K11-R16-DISP-01` P1 NOT CLOSED).
**Correction contract:** revision 1 unchanged (no weakening, no new exception).
**No fresh payload C2. No candidate H2. No closure claimed. `next_release: none`. K1.2 not begun.**

This record stops the semantic implementation per the round-2 instruction rather than
encoding a known unhandled rejection as a green regression. It does not amend, squash,
delete, or reinterpret H17, reviews 14/15/16, correction H1, or correction review-01.
It introduces no code, test, fixture, contract, threshold, configuration, or script change.

## 1. Required outcome that cannot be met as stated

The correction contract inherits K1.1-C1…C10 unchanged and requires (item 4) that
dispatch and redelivery remain safe under Promise machinery, including species
construction before rejection-handler installation, with **no rejected Driver promise
escaping as unhandled**. `ExecutionDriver.deliver` (`packages/kernel/src/driver.ts:76-79`)
currently accepts `void | Promise<void>` with no exact-native-Promise restriction.
Review-01 §4 establishes that a subclass instance is a `Promise<void>` at this boundary,
and H1's R4-F4 test asserts `unhandled.length === 1` for such a value. That test is not
an acceptable oracle, but replacing it with a zero-escape oracle for the configurable
subclass alone does not make the absolute requirement implementable.

## 2. Reconstruction performed (semantic family, not one probe string)

Traced the complete path on exact H1:

Driver invocation (`coordinator.ts` `#deliver`, inside `withDeliveryEnvironment`)
→ returned-value classification (`isThenable`, descriptor-only walk)
→ Promise/thenable observation (`Promise.resolve(settled)` then `then` on observed)
→ constructor/species lookup (`Get(O,"constructor")`, `Get(C,Symbol.species)` per
ECMAScript `Promise.prototype.then` / `SpeciesConstructor` / `NewPromiseCapability`)
→ rejection-continuation installation (`PerformPromiseThen`)
→ delivery-attempt bookkeeping (`pending` → `delivered`/`failed`)
→ process-level rejection behavior (`--unhandled-rejections=strict`, `unhandledRejection`)
→ redelivery through the same `#deliver` path.

Audited own and inherited construction state and the actual constructor/species chain.
Preserved H1's ambient sanitization (`Promise[Symbol.species]`,
`Promise.prototype.constructor`, `Object.prototype[Symbol.species]`) and instance
sanitization (own `constructor`/`Symbol.species` deletion) as useful; the defect is what
they do not reach.

## 3. Configurable hostile subclass: fixable, so H1's "fundamental limit" was premature

Minimum counterexample (configurable `static get [Symbol.species]`, armed after
construction, already-rejected subclass instance returned from `deliver`, initial dispatch
and redelivery):

- H1's `Promise.resolve(settled)` + `then`-on-observed path escapes even with constructor
  sanitization, because thenable assimilation enqueues a job that runs after the synchronous
  window restores the throwing species. Observed locally: `observed rejected: sub species
  boom`, `UNHANDLED: native submit lost`, `unhandled: 1`.
- A stronger restore-exact strategy fixes this family: save the subclass constructor's
  `Symbol.species` descriptor (configurable `true` for class `static get` syntax), replace it
  with `{ value: Promise }` for the synchronous attach, observe with direct
  `Promise.prototype.then.call(settled, onFulfilled, onRejected)` (synchronous
  `SpeciesConstructor` + `PerformPromiseThen`, no assimilation job), then restore the saved
  descriptor exactly. Observed locally: `attach ok`, `handled: native submit lost`,
  `unhandled: 0`, strict exit 0. Prototype swap (`setPrototypeOf` to `Promise.prototype`
  while extensible) is an equivalent bypass for non-configurable constructor species when the
  instance remains extensible.

Therefore the R4-F4 configurable-subclass escape is not a JavaScript limit. H1 and
KC1-DEC-5 misclassified a fixable family as fundamental. No contract change is needed to fix
that family, and no code change is made here to do so because the absolute requirement below
still fails.

## 4. Exact permitted value that makes the absolute requirement impossible

```ts
const hostile: Promise<void> = Promise.reject(new Error("own ctor reject"));
Object.defineProperty(hostile, "constructor", {
  get(): never { throw new Error("own ctor boom"); },
  configurable: false, // unsanitizable: delete/redefine throws before any handler exists
});
// Driver returns `hostile` from `deliver` (already rejected at return).
```

This is a native `Promise` (from `Promise.reject`), hence a `Promise<void>` admitted by the
declared `void | Promise<void>` boundary. It carries no subclass, no Proxy, and no ambient
pollution; the hostile slot is own, non-configurable, and throwing.

Every legal in-process observation throws before a rejection continuation exists:

- `Promise.prototype.then.call(hostile, …)` → `SpeciesConstructor` does
  `Get(hostile,"constructor")` → throws `own ctor boom` before `PerformPromiseThen`.
- `hostile.catch(…)` / `finally` → same `then` path, same synchronous throw.
- `Promise.resolve(hostile)` → `Get(hostile,"constructor")` throws before any
  same-constructor fast path or capability assimilation.
- `await hostile` → `PromiseResolve(%Promise%, hostile)` → same `Get` throw; the `await`
  itself does not throw synchronously but the assimilation job rejects with the attach
  error while the original `own ctor reject` remains unhandled.
- `Promise.all([hostile])` / `race` / `allSettled` / `any` → same `Get`/`then` assimilation,
  same pre-handler throw.

Observed locally under `--unhandled-rejections=strict`: `direct then threw sync: own ctor
boom`, `catch threw sync: own ctor boom`, `resolve+then threw sync: own ctor boom`,
followed by strict crash on the original `own ctor reject` (exit 1). Prototype swap does not
help because the own slot shadows the prototype. `delete`/`defineProperty` sanitization
throws (`TypeError`, non-configurable) before any handler exists. A second variant with the
same consequence is a subclass with non-configurable throwing static `Symbol.species` plus a
non-extensible instance (`Object.preventExtensions` defeats the prototype-swap bypass).

No JS mechanism adds a reaction without `SpeciesConstructor`; `process.on('unhandledRejection')`
does not prevent the strict crash (verified: handler installed yet exit 1). The escape is
therefore not an implementation gap but a property of the value combined with the spec.

## 5. Conflicting requirements

- (a) Correction contract required item 4 + inherited K1.1-C4/C5: dispatch and redelivery must
  satisfy "no rejected Driver promise escapes as unhandled" for results admitted by the Driver
  boundary.
- (b) `ExecutionDriver.deliver: (activation) => void | Promise<void>` admits the §4 value
  (native rejected promise with unsanitizable throwing construction slot).
- (c) ECMAScript `Promise.prototype.then` unconditionally runs `SpeciesConstructor`
  (`Get(O,"constructor")` → `Get(C,Symbol.species)`) before `PerformPromiseThen`; a throwing,
  non-configurable own slot makes every legal attachment throw before handling.

(a) and (b)+(c) are jointly unsatisfiable after return. This packet may not silently narrow
(b), redefine `Promise<void>`, weaken C4/C5, or add a "fundamental limit" exception to (a).

## 6. Smallest owner decision needed

Decide the Driver return contract before any further semantic implementation:

**Must `ExecutionDriver.deliver` return only safely observable settlements, or must the Kernel
guarantee zero unhandled escape even for unsanitizable Driver-authored promises?**

If the former, narrow/change the return contract explicitly (see options). If the latter, a
different architecture is required (e.g. no promise observation across the boundary at all),
because no in-process code can observe §4 after return.

## 7. Concrete options and consequences

- **A. Narrow to exact native promises.** Require `deliver` to return `void` or an exact
  `Promise` (primordial constructor, no subclass, no own `constructor`/`Symbol.species`/`then`
  tampering, extensible or irrelevant). Add a descriptor-only pre-check; treat violations as
  driver-contract misuse (operational failure without observation attempt, so no new promise is
  created to escape — but an already-rejected violating promise still escapes; hence the
  precondition must bind Driver authors, not just post-return checks). Consequence: subclass
  Drivers (including current R4-F4 fakes) must change; needs conformance exactness check and
  contract revision increment; closes the minimum oracle with the §3 strategy.
- **B. Observability precondition.** Keep `Promise<void>` spelling but add: returned promises
  must have configurable, non-throwing constructor/species chains observable through
  primordials (i.e. sanitizable via restore-exact + direct-then). Consequence: same author
  obligation as A but expressed as observability rather than exactness; still needs owner-approved
  contract text and a mechanical check; violating already-rejected returns still escape, so the
  guarantee becomes "no escape for conforming returns" rather than absolute.
- **C. Void-only delivery.** Change `deliver` to return `void`; Drivers handle their own
  settlement internally and never hand the Kernel a promise to observe. Consequence: removes
  C4's rejected-promise operational-failure path; needs K1.1-C4/contract revision and fake-Driver
  rewrites; simplest Kernel, but loses Kernel-visible delivery-failure evidence.
- **D. Authorize a documented exception.** Weaken "no escape" to permit counted unhandled for
  proven-unsanitizable returns (essentially H1's R4-F4 as an allowed exception). Consequence:
  contradicts the current absolute wording; requires explicit contract revision and owner
  acceptance of strict-mode crash for those inputs; not recommended as a silent correction —
  presented here only to name the alternative this blocker refuses to take unilaterally.

Recommended smallest: A or B (explicit observable-return contract) plus the §3 restore-exact +
direct-native-then strategy for the configurable family. Either requires an owner-approved
correction-contract revision increment; this record does not make that change itself.

## 8. What is preserved and what is not claimed

- Seven round-1 closed families (`K11-R15-ID-01`, `K11-R15-DOC-01`, `K11-R15-DOC-02`,
  `K11-R15-PROC-01`, `K11-R16-VAL-01`, `K11-R16-ID-01`, `K11-R16-DOC-01`) are untouched: no
  code, test, contract, or `mental-model/**` change is made here, so no regression is
  introduced. Their distinguishing regressions/ablations from H1/validation-01 stand as
  committed.
- `K11-R16-DISP-01` is **NOT CLOSED** (P1, open). K1.1-C4/C5 remain FAIL for the absolute
  requirement for the §4 reason; they PASS for the configurable family under the §3 strategy
  once the owner authorizes the contract basis for it.
- `mental-model/**` remains byte-identical to B (verified empty B→HEAD diff). Exact unmodified
  `canonicalize@3.0.0` is untouched. No K1.2 work is begun. No preserved history
  (H17, reviews 14/15/16, correction H1 `1fd6cd0`, review-01 `9374c13`) is rewritten.

## 9. Evidence and working state

- No fresh payload C2 and no rerun validation-02: there is no executable/test payload change to
  validate. Committed implementer evidence remains validation-01 for H1; this blocker adds no
  fake green oracle.
- Local strict-mode probes summarized in §§3–4 were run with Node v25.2.1 from the repository
  root (transient `-e` probes, not committed): configurable + H1 resolve-path → `unhandled: 1`;
  configurable + direct-then + ctor sanitization → `unhandled: 0`, exit 0; own-NC-throwing-ctor
  + all legal attaches → sync throws + strict crash on original (exit 1), including with a
  global `unhandledRejection` listener installed.
- Remote check before recording: `origin/codex/k1.1-correction-01-review-findings` resolved to
  `9374c13fc2604075ea2e44e5cbd230663ed0cc62` with no trailing commit; working tree clean except
  this blocker record and the 007 status transcription (committed together, non-force).
- Third-party reuse: none. No new dependency, no copied/adapted source.

## 10. Handoff

`BLOCKED_ARCHITECTURE` for `K1.1-correction-01`. Owner decision required per §6 before any C2.
No independent-review acceptance is requested for a closure; the next step is an owner ruling
(contract narrowing/change or alternative architecture), after which correction resumes as a new
payload with fresh validation. `next_release: none`.
