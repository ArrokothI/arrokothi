# Design 01 — K1.1-correction-03

Coding agent: a Claude Code cloud session (`claude-opus-5-5`) on an Anthropic-hosted Ubuntu 24.04 x86_64 VM,
2026-10-08. Branch `claude/k1.1-correction-03`; base B `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`; release commit
`0b340b6f3e73942edc39c76a79063d490d6e2992`. Governing records: [brief 01](brief-01.md), [release 01](release-01.md),
[decision-05](../K1.2/decision-05.md), [DESIGN-AUDIT-01 decision-01](../DESIGN-AUDIT-01/decision-01.md) items 2–3,
[decision-02](../DESIGN-AUDIT-01/decision-02.md), [owner-decisions-02](../DESIGN-AUDIT-01/owner-decisions-02.md)
extra checks b and c. This note is working material for the design check; it is not a candidate and changes
no code. Where it and a linked record disagree, the record governs.

B baseline, Node v26.10.0, npm 11.19.1: `npm run typecheck` exit 0; `npm test` 3,774/3,774, 0 failed or
skipped. An exploratory, uncommitted experiment is disclosed in [§9](#9-exploratory-evidence-not-committed).

**Seven owner questions are in [§8](#8-questions-for-the-owner).** Q1, Q2 and Q4 meet brief stop conditions:
the right fix changes some diagnostics or accepted values for values that are neither Proxies nor
re-prototyped built-ins. I recommend an answer for each.

## 1. Mechanism

### 1.1 One capture module, one meter per root

Capture stays in `values.ts`, which with `own-array.ts` already forms a self-contained module: it imports
the approved `canonicalize`, `node:buffer` and `own-array.ts`, and no coordinator, state or authority code.
That meets decision-02 stage 1 without a new file, so the landing-zone file list and the kernel-ownership
inventory do not change. BINDING-01 can move `values.ts` and `own-array.ts` as a unit (§5 Q6).

Each `accept` call creates one `CaptureState`, so every root has its own meter. Its existing `bytes` count stays
the semantic size limit. A new `units` count is the work meter. One root-local `stopped` flag ends reading
for either stop. The budget is `CAPTURE_WORK_BUDGET = 3 × BOUNDARY_LIMITS.canonicalBytes = 3,145,728`, computed
at load from the frozen limits (§1.2).

### 1.2 Units and the budget B

Units are abstract operations. Each one's engine work is bounded by a constant that depends only on the
limits, for a value with no Proxy (KC3-3, §2).

| Unit | Charged for | Units |
|---|---|---|
| visit | One visit of one value: typeof classification; for an object, the Proxy test, cycle test, depth test, open/close of the cycle set, `IsArray`, prototype observation, the fixed brand predicates and an array's `length` observation; for a scalar, its finite check and spelling | 1 |
| listing | One own-key listing (names or symbols), charged immediately after it returns | 1 + returned length |
| element | One array position: its own descriptor and its one ordinary read | 1 |
| descriptor | One object member's own descriptor (classification loop) | 1 |
| read | One object member's ordinary read (after the descriptor said enumerable data) | 1 |
| string | Scanning one string value or member name of at most 131,072 UTF-16 units, charged before the scan. A longer string is refused by the length preflight inside its visit and costs no string units | its length |
| diagnostic | Recording one issue (bounded path ≤ 128, message ≤ 1,024, suffix search ≤ 11 codes) | 1 |

Value-dependent Kernel bookkeeping rides on these units. Pending-member and snapshot appends are per element
or read. Snapshot allocation is at most 4,096 slots, after a listing that charged at least that many. Freezing
and `defineData` are per member.

**Derivation of B.** The canonical form of an accepted value splits into disjoint per-node parts: brackets,
commas, colons and quoted names for a container, and the spelling for a scalar. Each node's own units are at
most three times its own canonical bytes:

| Accepted node | Own units | Own bytes | Units ≤ 3 × bytes |
|---|---|---|---|
| Array, n ≥ 1 entries | visit 1 + names (1 + n + 1) + symbols 1 + elements n = 2n + 4 | n + 1 | 2n + 4 ≤ 3n + 3 ⇔ n ≥ 1 (equal at n = 1) |
| Empty array | 1 + 2 + 1 = 4 | 2 | 4 ≤ 6 |
| Object, n ≥ 1 members, name lengths ℓᵢ | 1 + (1 + n) + 1 + n + n + Σℓᵢ = 3n + 3 + Σℓᵢ | ≥ 2n + 1 + Σ(ℓᵢ + 2) = 4n + 1 + Σℓᵢ | holds |
| Empty object | 3 | 2 | 3 ≤ 6 |
| String of ℓ units | 1 + ℓ | ≥ ℓ + 2 | holds |
| `null`, boolean, number | 1 | ≥ 1 | holds |

So every accepted value costs at most 3 × its canonical bytes ≤ 3 × 1,048,576 = **B = 3,145,728**. The bound
uses the size limit. The entry, depth and string limits bound the per-unit constants. Units only grow during
a capture, so an accepted value never passes B at any intermediate point, and the meter never refuses a valid
value.

**Costliest acceptance found.** The ratio 3 is reached only by singleton arrays (`[x]`, 6 units for 2 bytes).
Depth 32 forces fan-out and leaves, which cost slack. The costliest acceptance I have constructed is a root
array of mid arrays of 4,096 chains, each chain being 30 singleton wrappers around `0`. It is 1,048,555 bytes
and about 3,094,930 units, 98.4% of B; a model gives that figure and the build will assert it exactly. The
variant with 29 wrappers around `[]` is about 3,094,054. B is a proven upper bound, not an attained maximum.
Q3 asks whether that reading of decision-05 item 2 is acceptable.

**Refusal.** When a charge takes `units` past B, capture stops at once and refuses. A charge that precedes its
work (visit, element, descriptor, read, string, diagnostic) means the work is not done. A listing is charged
after it returns, so one listing may already have run: that is decision-05's "plus one operation". Refusal
therefore costs at most B units plus one operation, on every root consumer.

### 1.3 Order of one visit

```text
stopped? → visit unit → primitive forms (as today; strings: string units, then scan)
         → object/function: Proxy test (util.types.isProxy, captured at load)  → refuse
         → function: unsupported_form (as today)
         → cycle test (O(1), §1.4)                                               → cycle
         → depth test                                                            → too_deep
         → open; try {
             IsArray? array: prototype === Array.prototype else foreign (as today) → length → names …
                      object: prototype plain (Object.prototype/null) else foreign (as today)
                              → brand predicates (§4)                            → refuse
                              → symbols listing → names listing …
           } catch → unstable_representation (as today) } finally close
```

- **The Proxy test is the first observation of every object-typed value.** It precedes `IsArray`, which
  forwards through Proxy targets, and every prototype, descriptor and key observation. `typeof` triggers no
  trap. A callable Proxy is therefore refused as a Proxy, not as a function.
- **Cycle → too_deep → foreign** is unchanged for every non-Proxy value. Review 08 measured a tenfold saving
  from moving the prototype check before `isOpen`, but that would reclassify a foreign container at depth 33
  from `too_deep` to `unsupported_form`. The saving comes instead from O(1) cycle detection (§1.4), so the
  order can stay.
- **Brand predicates run after the plain-prototype check and before any listing.** A built-in with its own
  prototype (an ordinary `Map`, `Date` or typed array) is refused by the prototype check, exactly as today and
  with the same message. Only a built-in whose prototype is plain, meaning re-prototyped (or Q4's natural
  cases), reaches the brand check. Detection never uses prototype identity, constructor name or
  `Symbol.toStringTag`: the plain-prototype check only decides whether the brand check is needed, and the
  internal-slot predicates do the refusing. KC3-8 holds: every witness is refused with zero own-key listings.
- Arrays need no brand check. An Array exotic object carries no other built-in slots, and a re-prototyped array
  is already refused by its prototype check before listing.

### 1.4 O(1) cycle detection

The open stack becomes a Kernel-created `Set`, built with the load-time `Set` constructor and no arguments.
`has`, `add` and `delete` are the load-time methods, called through the load-time `Reflect.apply`. No global or
prototype is consulted at call time, which is the DEC-8 rule. A `Set` constructed without an iterable performs
no adder lookup, and its methods operate on `[[SetData]]` only.

It never holds more than 32 entries: only containers on the current path are open, and depth stops at 33. So
each operation is a constant bounded by the depth limit, and per-visit work no longer depends on nesting
depth. It replaces `isOpen` and `closeContainer`, which scanned the stack through `readAt` and allocated one
descriptor per step: the mechanism of `K12C1-R8-VALUE-DEPTH-01`.

Once Proxies are refused, no caller code runs during capture (§5, suspect 4), so nothing can mutate the
captured methods mid-pass. The methods are captured at load in any case.

### 1.5 Metered helpers and their enforcement

**Helpers.** Every observation of a caller value, and every value-dependent allocation, goes through a small
set of helpers in `values.ts`:

| Helper | What it does | Charge |
|---|---|---|
| `enterVisit` | The visit-unit observations of §1.3; it also opens the cycle set | 1, first statement |
| `leaveVisit` | Closes the cycle set (in `finally`) | Declared as covered by its paired `enterVisit` |
| `listNames`, `listSymbols` | The listing call | `1 + length`, as the statement after the call |
| `observeElement` | One array position | 1 |
| `observeDescriptor` | One object member's descriptor | 1 |
| `readMember` | One object member's ordinary read | 1 |
| `scanText` | The string scan | its length, before scanning |
| `record` | `pushIssue` | 1 |

Snapshot allocation is the one declared covered allocation, behind the names listing.

**Static check** (`packages/kernel/tests/capture-metering.test.ts`). It reuses `zone-analysis.ts`'s `buildZone`
(the repository compiler options and checker), `resolveCallee` and `ownerName`. It adds five syntactic rules,
over `values.ts` only:

- **SC1 confinement.** Every call to an observation primordial occurs inside a helper above, or inside a
  serializer-window function. The primordials are listed in the checker: the descriptor, names, symbols and
  prototype observations, `IsArray`, `isProxy`, the brand predicates, the cycle-set methods, `charCodeAt` and
  `sizedList`. No serializer-window function may be reachable from `capture` in the static call graph; its
  only entry is `encode`.
- **SC2 charge first.** Each helper's first statement is a meter charge, except the listing helpers (call, then
  charge of its length) and the declared covered pair.
- **SC3 no reads in traversal.** The traversal functions (`capture`, `captureArray`, `captureObject` and what
  they call outside the helpers) contain no type assertion other than `as const`, and no `any`. Caller values
  stay `unknown`, so strict TypeScript (`npm run typecheck`) rejects any member read of a caller value there.
- **SC4 loops.** Every loop in a traversal function either starts its body with a helper or charge call, or is
  bounded by `.length` of a listing-helper result in the same function, or by a literal or a
  `BOUNDARY_LIMITS` member.
- **SC5 visit first, Proxy first.** `capture`'s first statement after the `stopped` check is `enterVisit` or a
  visit charge. In `enterVisit`, the first observation-primordial call on an object-typed value is `isProxy`.

It fails on each bypass shape registered as a mutant (§6). It is a regression guard, not a soundness proof
(amendment 03, 012). Stated gaps:

- an alias of a primordial made in a helper and called outside;
- the size of a charge;
- extra work inside a helper;
- caller-sized string building;
- mutual recursion that skips `capture`.

**Runtime oracle covering the gaps** (`packages/kernel/tests/capture-work.test.ts`, child process). It wraps
every observation primordial before `values.ts` and `own-array.ts` capture them, as `work-charge-probe.mjs`
already does. It runs the maintained and generated corpus, and asserts per root:

- engine observation calls ≤ c × units, with c from the per-unit table;
- listed names ≤ listing units;
- `charCodeAt` calls ≤ string units;
- exact equality on the pinned shapes.

An unmetered loop, a weakened charge or extra helper work raises engine calls without raising units, and
fails. Deterministic meter counts per unit kind, read through an internal evidence export (§1.7), pin each
charge site.

### 1.6 The meter stop

A charge that passes B sets `stopped` and records one root-located stop issue, just as the byte stop records
`too_many_bytes`. The proposed code is `too_much_work` (Q2). Its fixed message is "reading this value passed the
work budget of 3145728 units that bounds every acceptable value; the rest of the value was not read".

The stop issue is not charged. It is the "plus one operation". It goes through `pushIssue`, so DEC-7's
eight-detail and suffix rules apply to it. The byte stop and the meter stop are exclusive: whichever comes
first ends reading.

A stop issue is needed because a meter stop can come before any other issue. A single listing can be longer
than B. So can a string scan near the byte limit, which pre-charges its length while the canonical bytes are
still within it.

### 1.7 What does not change

These are unchanged, except for Proxies and branded built-ins under decision-01, and Q1/Q4:

- accepted values and canonical bytes;
- single observation per position;
- the four limits and the byte count with its exact charges, including the refused-string and surplus-name
  charges;
- DEC-7's representation and weights;
- the classification and order of cycles, `too_deep` and foreign forms;
- the serializer window;
- envelope observation (`envelope.ts`).

`encode` runs only on an accepted snapshot, which is Kernel-owned and bounded by the limits. It is outside the
meter: it adds the same work to every acceptance and none to any refusal (Q3). The public exports
(`index.ts`) do not change. `values.ts` gains one internal evidence export, which returns the result with its
per-kind meter counts. Tests read it; `index.ts` does not re-export it. This is the "test-only path"
decision-02 stage 2 anticipates.

### 1.8 Layer 3 and BASELINE payload (KC3-10)

**`values.md`, fixed semantic limits.** The metered meaning is stated once:

- refusal cost is compared in metered Kernel work;
- B is derived from the limits;
- the meter never refuses a valid value;
- refusal costs at most B units plus one operation;
- timing is an observation.

The coherent-Proxy paragraph and the live-Proxy exclusion (decision-04 item 1) are replaced by the rule that
every Proxy is refused before it is observed, so no caller code runs during capture. The own-key exclusion
narrows to its remaining residual: one listing's engine work before its length is known. The
`OPEN(implementation)` marker records this binding's unit table, B and the costliest acceptance, pointing to
BASELINE.

**`values.md`, in-process capture.** "It can answer two reads differently. A getter or a `Proxy` runs code on
every read" becomes accessor-only. The refused list gains every Proxy and built-ins with internal slots,
whatever their prototype.

**BASELINE `#value-refusal-diagnostics`.** It records:

- the unit table, B with its derivation, the costliest acceptance and the meter stop;
- Proxy and brand refusal;
- the residuals of §2 KC3-3.

The held V-D1 sentence and "coherent-Proxy acceptance" are corrected. The status line points to 007, which
says the claim is held until acceptance. The packet releases no hold.

**Other owners.**

- `rewrite-index.md` §4: the marker entry is updated.
- `sources.md`: decision-05 and decision-01 provenance is added, and decisions 03/04 item 5 are marked
  superseded for Proxy refusal.
- `roadmap.md`: its K1.1-correction-03 entry is checked.

The test titles "decision-03 descriptor probe" and "decision-04 handler probe" are renamed or annotated as
superseded. A grep record shows no remaining current claim of coherent-Proxy acceptance or of unmetered V-D1.

### 1.9 Root consumers (declared search of B)

Search: `grep -n "canonicalize(\|boundaryValueIssues(\|isBoundaryValue(\|acceptRoot(\|acceptIdentityText(\|captureTextList(" packages/kernel/src/*.ts`
at B, plus `index.ts` exports. Every path reaches `accept` in `values.ts`, which is the only caller of `capture`.

| Consumer | Site at B | Roots |
|---|---|---|
| Exported `canonicalize`, `boundaryValueIssues`, `isBoundaryValue` | `values.ts:1484–1508` | 1 per call |
| Creation `authorityContext` | `coordinator.ts:793` | 1 |
| Creation initial input payload; ingress payload | `coordinator.ts:724` (`acceptInputContent`, from `:797` and `:1073`) | 1 each |
| Eager Outcome roots: progress, each Emission value, completed result, failed error | `outcome.ts:196` `acceptRoot`, from `captureOutcome` (`coordinator.ts:1447`) | 1 + up to the Emission limit + 1 |
| Recovery availability lists (three) | `outcome.ts:524` `captureTextList` → `acceptRoot` | 3 |
| **Addition:** identity text | `envelope.ts:191` `acceptIdentityText`, used for the creation scope, key, revisions and codec, the input kind and subscription class, the ingress request key and Emission keys | 1 each; the caller checks `typeof === "string"` first, so only a visit and a string scan can be charged |

The brief's list is confirmed, with that addition. Envelope reads (`observeOwn`, `refuseUnknownFields`) are not
capture. They stay under K1.2's envelope rules, outside V-D1's value-root scope (Q7).

## 2. Why each criterion closes

| ID | Closing mechanism and argument |
|---|---|
| KC3-1 | **Structural plus check plus runtime.** Every caller observation and every value-dependent allocation is a helper call that charges first (§1.5). SC1–SC5 fail on each registered bypass shape. The runtime oracle covers the static gaps by asserting engine calls ≤ c × units over the corpus. Length-proportional results (listings) charge their length as the statement after they return. String materialization charges before the scan, which is stricter than "after". Mutants: one per helper (charge removed or weakened) and one per bypass shape, in §6. |
| KC3-2 | **Structural (derivation).** §1.2's per-node inequality gives units ≤ 3 × canonical bytes ≤ B for every accepted value, at every intermediate point. Tests assert the named costliest acceptances (both chain families, an at-limit string family, a wide-`0` family, `85 × 4,096 {}` and `[]`) are accepted with exact unit counts ≤ B. A value one byte over is refused. The meter stop is pinned at B + 1 by a deterministic shape. B is written at the marker and in BASELINE. |
| KC3-3 | **Per-unit table plus declared residuals.** Each unit's engine work is a fixed number of operations with no caller code (no Proxy reaches observation), bounded by the limits: cycle set ≤ 32 entries, ≤ 21 predicates, ≤ 10 index-name reads, ≤ 128/1,024 diagnostic units, ≤ 11 suffix codes. Residuals the argument cannot fix (Q5): **(R1)** one listing's engine work before its length is known, at most one per root since the charge stops the meter; a listing that completes within B also sorts integer keys in O(n log n) with n ≤ B, so its per-unit factor ≤ log₂ B. **(R2)** host objects with interceptors (V8 API objects such as `process.env`), whose internal methods are host-defined; `process.env` is refused by its prototype, so only a re-prototyped one reaches listing. **(R3)** hash-table lookups (descriptor reads on dictionary-mode objects), which are expected constant under V8's seeded hashing. Bounded search (observation only): per-unit time for dictionary objects of 2¹² to 2²² names and for ropes up to 131,072 units. |
| KC3-4 | **Structural plus deterministic.** Per refused position the Kernel performs a fixed set of units (element + listing name + visit + diagnostic) with no depth-dependent step, now that cycle detection is O(1). A maintained test charges the same per-position units, and the same wrapped-primordial counts, for review 08's family at depths 2, 16 and 31. The total stays ≤ B + 1 at every depth. The eight-root Outcome from a visible caller with no grant ends in `unauthorized_submission`, with the exchange unchanged, no delivery, and a whole-result assertion. Under the meter, this family stops at B (Q1). |
| KC3-5 | **Registered mutants.** N15 (surplus charge removed) and N15-weakened (surplus capped), each killed below the overlong threshold (256 and 4,096 extra names) and above it (20,000), by an exact whole result: the byte stop's position and code, with the meter count. One weakening per other byte charge and per unit charge site (§6), each killed by the assertion that names that charge. |
| KC3-6 | **Mapping (§7).** Each transferred item maps to KC3-1 to KC3-4. |
| KC3-7 | **Structural plus deterministic.** The Proxy test is the first operation on an object-typed value (§1.3, enforced by SC5). Each witness Proxy records zero trap calls, through a full-trap counting handler, in every root consumer, at depths 1, 2, 16 and 31. Witnesses: plain, array, revoked, callable, nested, over a re-prototyped `Map`/`Uint8Array`, and blockers 01/02. Registered mutants that move the test after `IsArray`, the cycle test or the prototype observation are killed. |
| KC3-8 | **Declared bounded search (§4) plus deterministic.** Every internal-slot kind in Node v26.10.0 is listed with the predicate that refuses it, or with why none exists (Q4, Q6). Each witness has zero own-key listings, counted by wrapped primordials. Maintained cases: `reverify-exotics`, the O-R8-3 `Uint8Array(2**24)` and String wrapper over a large rope. A `Symbol.toStringTag` spoofing control (a plain object claiming `"Map"`) stays accepted. Whole-result assertions run on creation, ingress and Outcome. |
| KC3-9 | **Existing suite plus listed changes.** The full suite and K1.2-correction-01's complete-decision oracle (fault oracle, poison and fault sweeps) pass. Every changed assertion is listed with its authority (§7.2): decision-01 item 2 or 3, decision-02 stage 1 for one inventory, and Q1/Q4 if approved. |
| KC3-10 | **Payload review (§1.8)** plus `npm run check:builder-docs`, with B's pre-existing failure reported as pre-existing, and a grep record. |
| KC3-11 | **Clean-C `verify`.** `verification.json` combines TOOLS-01's two spec halves in one file, with `candidate` naming itself; `candidate()` and `verify()` read disjoint keys. It runs: tool tests, inventory, adoption, coverage, `mutations.json`, `refusal-guards.json`, the new `value-cost.json`, the refusal and oracle censuses, typecheck, `npm test`, archive tests and `test:kernel-sweeps`. |

## 3. Brief questions before code

1. **Unit table and B.** §1.2. B = 3,145,728 = 3 × the size limit. The costliest acceptance found is about 3,094,930 units.
2. **Enforcement.** §1.5. It reuses `zone-analysis.ts`'s program, checker and callee resolver, not its DEC-8
   inventory. Its gaps are listed there. The runtime ops/units oracle and the per-kind count tests cover them.
   Amendment 03's status applies: a regression guard, not a soundness proof.
3. **Proxy predicate.** `util.types.isProxy` is read once at load from `node:util`. It is the first operation on
   any object or function value, before `Array.isArray`. Proposed refusal: the existing code
   `unsupported_form`, with a fixed message "value is a Proxy; capture refuses every Proxy before observing it"
   (Q2 confirms). No new code is needed for Proxies.
4. **Brand predicates.** §4. Cross-realm: the predicates test the engine object kind, not the realm, so a
   cross-realm `Map`, `Date` or typed array is refused the same way. Cross-realm plain objects and arrays carry
   their own realm's prototypes and stay refused as foreign, unchanged. A null-prototype cross-realm object
   stays accepted, unchanged.

   Errors (`[[ErrorData]]`, via `util.types.isNativeError`, which agrees with `Error.isError` and covers
   `DOMException`) and boxed primitives (`util.types.isBoxedPrimitive`) are built-ins with internal slots, and
   are refused when their prototype is plain. At B a null-prototype `Error` and a String wrapper are refused
   after listing (`unrepresentable_member`), and Number/Boolean wrappers are accepted as `{}`.
5. **Corpus placement.** §6. In brief:
   - Maintained tests go under `packages/kernel/tests/`.
   - Mutants go in a packet-owned registry, `tests/fixtures/packet-tools/value-cost.json`. It has the
     `refusal-guards.json` schema, a probe route and a required `verify` step.
   - The twelve K1.1-correction-03-owned witnesses in `mutations.json` (`capture.current.*`,
     `work-charge.array-surplus`) are updated to the new behavior. They stay held witnesses until acceptance.
   - `adoption.json` keeps every origin state. Its stored preserved census is recomputed with the tool's own
     functions, because changed test files and `values.ts` change it. No tool code changes.
   - Closing origins needs suite targets, which owner choices 04 and 09 assign to TOOLS-02. This packet closes
     none (Q7). The advisory report for the touched areas at B: `packages/kernel` has 326 open origins (296
     pending, 30 pending revalidation); `tooling` has 10.
6. **BINDING-01 seam.** Meter, refusals and traversal live in `values.ts` plus `own-array.ts`, which import
   nothing else from the Kernel. Two things would make the move harder:
   - consumers that read meter internals; only tests do, through the evidence export;
   - Node-only predicates (`node:util`). This is already decision-02's accepted cost.

   Nothing couples the meter to coordinator state.

## 4. Built-in kinds with internal slots in Node v26.10.0 (KC3-8 declared search)

Search scope: ECMAScript objects with internal slots that V8 13.x exposes in Node v26.10.0, plus host kinds that
`util.types` reports. The kinds were enumerated from the global constructors (`Object.getOwnPropertyNames(globalThis)`)
and `util.types` at this Node. A predicate must be non-throwing, constant-time and free of side effects.

| Kind | Slot | Predicate |
|---|---|---|
| Map, Set, WeakMap, WeakSet | `[[MapData]]`… | `isMap`, `isSet`, `isWeakMap`, `isWeakSet` |
| Date, RegExp | `[[DateValue]]`, `[[RegExpMatcher]]` | `isDate`, `isRegExp` |
| ArrayBuffer, SharedArrayBuffer | `[[ArrayBufferData]]` | `isAnyArrayBuffer` |
| DataView, every typed array (incl. Float16Array, Buffer) | `[[ViewedArrayBuffer]]` | `isArrayBufferView` |
| Number, String, Boolean, Symbol, BigInt objects | `[[…Data]]` | `isBoxedPrimitive` |
| Error and subclasses, AggregateError, SuppressedError, DOMException | `[[ErrorData]]` | `isNativeError` |
| Promise | `[[PromiseState]]` | `isPromise` |
| Generator and async generator objects | `[[GeneratorState]]` | `isGeneratorObject` (true for both) |
| Map and Set iterators | internal | `isMapIterator`, `isSetIterator` |
| Arguments objects | `[[ParameterMap]]` | `isArgumentsObject` (Q4) |
| Module namespace objects | `[[Module]]` | `isModuleNamespaceObject` (Q4) |
| Raw JSON objects | `[[IsRawJSON]]` | `JSON.isRawJSON` (Q4) |
| KeyObject, CryptoKey, External | host | `isKeyObject`, `isCryptoKey`, `isExternal` |
| Proxy | `[[ProxyHandler]]` | `isProxy` (refused first, §1.3) |
| Functions, bound functions | `[[Call]]` | `typeof` (refused as today) |
| Arrays | Array exotic | prototype check (refused as today) |
| **No non-throwing, side-effect-free predicate:** WeakRef, FinalizationRegistry, all eight Temporal types, Intl objects (Collator, DateTimeFormat, DisplayNames, DurationFormat, ListFormat, Locale, NumberFormat, PluralRules, RelativeTimeFormat, Segmenter, segments, segment iterators), DisposableStack, AsyncDisposableStack, Array, String and RegExp-string iterators, iterator helpers and wrappers, WebAssembly Module/Instance/Memory/Table/Global/Tag/Exception | various | **none** (Q6) |

The kinds in the last row can be tested only by a throwing brand-check getter, about 2.7 µs per probe per
object here, against 0.3 µs for all 21 predicates together. Iterator kinds cannot be tested even that way,
because `next` has side effects or runs caller code. At B, each of these kinds re-prototyped to `null` is
accepted as `{}`, as observed in §9.

Platform classes with private fields (URL, Blob, Headers, AbortSignal and others) are not internal-slot
built-ins. Re-prototyped, they behave like any class instance re-prototyped to plain. Both rows are
declared limits for Q6.

## 5. Suspect designs

1. **Charging refusals by bytes.** Yes: bytes are the wrong unit for work. They charge accepted output, and many
   refusals produce none (a refused foreign container charges 0 bytes; its parent's comma pays 1). The meter
   replaces the byte count for cost. The byte stop stays as the semantic size limit, with its exact charges
   unchanged so that every stop position and diagnostic that does not reach the meter is unchanged.
2. **The open stack.** It becomes a Kernel-created `Set` reached only through load-time references, with ≤ 32
   entries (§1.4). This keeps DEC-8: no global or prototype is consulted at call time, and no caller code runs
   during capture.
3. **Order of checks.** None of the orders that save work by moving the prototype check earlier preserves the
   `too_deep`/foreign order. O(1) cycle detection gives the same saving with the order unchanged (§1.3). One
   observable fact stays changed by any fix: review 08's family is examined only up to B (Q1).
4. **Exclusions.** The Proxy exclusion (decision-04 item 1) can be retired: no Proxy reaches observation, and
   accessors are refused through descriptors without being invoked, so no caller code runs during capture. The
   own-key exclusion shrinks to R1: one listing per root whose length is not known before it runs. That
   listing is charged as soon as it returns, which stops the root. A listing within B has per-name work ≤ log₂ B.
5. **Diagnostics.** Each `pushIssue` is a diagnostic unit with constant work: paths are bounded before
   concatenation (`child` checks lengths first), messages are bounded, and the suffix search covers ≤ 11 codes.
   The catch path keeps its typeof-only label. After Proxy refusal it is reachable only through host objects or
   engine errors, so its maintained test drives it with a throwing wrapped primordial in a child process.

## 6. Corpus

**Maintained tests** (under `packages/kernel/tests/`, new files `capture-metering.test.ts` (SC1–SC5),
`capture-work.test.ts` (oracle, counts, families), `capture-refusals.test.ts` (Proxy/brand), each with
provenance lines). Every item asserts meter or operation counts and the whole result; timing is never a gate.

| Source (provenance kept) | Maintained form |
|---|---|
| Review 04 P5, `130 × [4,096 × undefined]`, one root and eight roots before authority | Exact units (≤ B, no meter stop), 532,480 occurrences, nine records, `unauthorized_submission`, exchange unchanged |
| Review 06 R-P1/R-P2/R-P4/R-P5: chain depth D ∈ {0, 1,000, 10,000} under diagnostics; thrown-value path; Outcome before authority; creation and ingress | Zero diagnostic reads (terminal getter), units independent of D; the meter stop (Q1). Thrown path: a throwing wrapped primordial |
| Review 08 VALUE-DEPTH-01: 4,096 × 256 foreign objects inside 2, 16 and 31 arrays; eight-root Outcome | Equal per-position units and wrapped counts across depths; stop at B + 1; eight roots end in `unauthorized_submission` with a whole result |
| Review 08 EVID-01 (N15): 256, 4,096 and 20,000 extra names; 4,096 × 4,096 root | Exact byte-stop visit (e.g. 4,049 at 256 names), units, whole result. Killed: N15 and its weakening |
| Review 08 O-R8-1, O-R8-2: rope flattening; a second symbols listing | Heap-growth child assertion plus zero character reads before the preflight; exact listing counts per object visit (N9 killed) |
| Review 08 O-R8-3, O-R8-4, and `reverify-exotics` | Brand refusal, zero listings, for every case; `Uint8Array(2**24)` and a String wrapper over a 2²⁷ rope |
| Blockers 01/02: descriptor-chain and handler-chain Proxies | Refused with zero trap calls |
| DESIGN-AUDIT-01 review 02 PROXY-01: Proxy over a re-prototyped `Map`/`Uint8Array` | Refused with zero trap calls (no longer `{}` or `{"0":1,"1":2}`) |
| Refusal-cost probes 03/04, string preflight probe 04 | Read bounds kept as count assertions |
| `capture.current.*` (11) and `work-charge.array-surplus` in `mutations.json` | Updated to the new behavior; still `held_witness` for K1.1-correction-03 |

**Generated corpus** (decision-05 item 3). This is a declared bounded search over deterministic enumeration
with no randomness. Fixed seeds are used only for the shuffled sibling-order axis: 1, 2, 3.

Dimensions:

- width {1, 8, 9, 4,096};
- depth of the refused position {1, 2, 16, 31, 32, 33};
- aliasing {distinct, shared within a level, shared across levels (doubling DAG)};
- refusal family: undefined element, hole, accessor, non-finite, lone surrogate (value and name), long string
  (value and name), symbol member, non-enumerable, array extra, over-named array and object, too many entries,
  cycle, too deep, foreign object, foreign array, each brand of §4, each Proxy witness;
- prototype shape {Object.prototype, null, foreign 1, foreign chain 1,000};
- diagnostic band {1, 8, 9, many};
- consumer: the 11 single roots of §1.9, plus eight-root eager Outcome.

The full product is about 6 × 10⁵ cases, too many for a maintained suite. The maintained search is:

- the full product of family × depth × aliasing at width 4,096 for `canonicalize`;
- the full product of family × consumer at depth 2 and width 9;
- every width and diagnostic band for three families per consumer.

Each case asserts that the units stay within B + 1, that per-position units do not depend on depth, and the
whole result. The search and its counts are recorded as bounded.

**Registered mutants** (`value-cost.json`, probe route, each with obligation and killing assertion):

- each unit charge removed and weakened, for every helper;
- N15 and its weakening, and every byte charge;
- B raised (×2), and the stop issue not recorded;
- each bypass shape: a direct primordial call in traversal, an unmetered loop, an uncharged listing and an
  aliased primordial (killed by the oracle);
- the Proxy test moved after `IsArray`, after the cycle test and after the prototype observation;
- each brand predicate dropped, and the brand test moved after the symbols listing;
- `Set` cycle detection replaced by the old scan.

## 7. Transferred items and changed assertions

### 7.1 Mapping (KC3-6)

| Transferred item | Closed by |
|---|---|
| Time dimension of `K12C1-R4-VALUE-COST-01` | KC3-1, KC3-2 (refusal ≤ B + 1 on every consumer) and KC3-4 |
| DEC-7's cost claim | KC3-1 (diagnostic unit), KC3-3 (constant diagnostic work) |
| SELF-R4-STRING-01's cost claim | KC3-1 (string unit before scan), KC3-3 (preflight, flattening ≤ 131,072), O-R8-1 test |
| V-D1 claim scope of decisions 03/04 | KC3-7 replaces the Proxy exclusion; KC3-3's residuals replace the rest |
| `K12C1-R8-VALUE-DEPTH-01` | KC3-4 |
| `K12C1-R8-EVID-01` | KC3-5 |

### 7.2 Changed existing assertions (forecast)

The exploratory run (§9) changes 72 existing tests in 9 files. None are SDK or conformance tests.

| File | Count | Kind |
|---|---|---|
| `values.test.ts` | 26 | Proxy witnesses (unstable-read, ghost name, phantom index, throwing trap) now refused as Proxies; Proxy counting and side-effect instruments (visit counts, capture-time pollution, indexed accessor installed mid-pass) |
| `value-diagnostic-work.test.ts` | 17 | Proxy counting instruments around foreign and deep-chain objects; decision-03/04 probe tests |
| `value-refusal-cost.test.ts` | 10 | Proxy issue families; a mid-pass pollution instrument |
| `creation.test.ts` | 7 | Payload Proxies |
| `ingress.test.ts` | 5 | Payload Proxies |
| `dispatch.test.ts` | 2 | Payload Proxies |
| `outcome-hostile.test.ts` | 1 | Payload Proxies |
| `ambient-reads.test.ts`, `control-commits.test.ts` | 1 + 3 | DEC-8/9 inventory of the new primordial calls |

Authority: decision-01 item 2 for the Proxy witnesses; item 3 for the brand cases. For the instrument
conversions, the asserted counts move to wrapped primordials or meter counts.

Where a capture-time vector protected the serializer window or `own-array.ts`, the test keeps a pre-call
pollution twin. Many such twins exist already; a missing one is added. That vector belongs to V-ENV, held for
BINDING-01; this packet does not claim it.

Each conversion is listed in the report with its before and after. The VALUE-DEPTH-01 and R-P1 counts change
only under Q1.

## 8. Questions for the owner

1. **The meter stop shortens examination of refusal-heavy plain values (stop condition).** Review 08's
   family costs about 4 units per refused position: element, listing name, visit and diagnostic. Its
   1,044,481 positions therefore cost about 4.18 M units, against B = 3.15 M. The meter stops it after about
   786,000 positions.

   The examined positions and suffix count change, and the `too_many_bytes` issue becomes the stop issue. The
   same holds for any family that costs more than B before its byte stop. That is exactly the set of values
   whose full examination costs more than every acceptance. Review 08 showed the family examines about twice
   the positions any acceptance can, so under any honest unit table V-D1 cannot be met without stopping it
   earlier. Values that reach their byte stop or finish within B are unchanged; P5, N15 and every existing
   issue-family test are among them.

   **Recommendation:** authorize the change under decision-05 item 2 ("Capture refuses and stops once a root's
   meter exceeds B"), with DEC-7's rule that counts describe the positions examined. KC3-9 currently names only
   decision-01.
2. **Issue codes.** (a) The meter stop needs a root-located issue, because it can precede every other one.
   **Recommendation:** a new code, `too_much_work`, which is an addition to the value issue vocabulary. The
   alternative, reusing `too_many_bytes`, would misstate the reason. (b) Proxy and brand refusals:
   **recommendation:** the existing `unsupported_form`, with fixed messages that name no kind, so the
   typeof-only label rule is unchanged.
3. **B as a proven bound.** B = 3 × 1,048,576 is a derived upper bound. The costliest acceptance found reaches
   98.4% of it, and the exact maximum is a large integer optimization. **Recommendation:** accept the bound,
   which KC3-2's wording ("no value … needs more than B") already fits, and record the gap in BASELINE.
   Please also confirm that `encode`, on an accepted snapshot, stays outside the meter (§1.7).
4. **Built-ins whose natural prototype is plain (stop condition).** None of these is re-prototyped:
   - An arguments object (`Object.prototype`) is refused today as `unrepresentable_member`; under the brand
     check it becomes `unsupported_form`.
   - A module namespace object (`null`) is refused today, after listing, with `unrepresentable_member` and
     member issues; under the brand check it is refused before listing.
   - `JSON.rawJSON("1")` (`null`, frozen, own `rawJSON`) is **accepted today as `{"rawJSON":"1"}`**, which is a
     silent mis-projection of the same mechanism as O-R8-4 (self-found, SELF-K113-RAWJSON-01). It would be
     refused.

   **Recommendation:** refuse all three by their predicates, since each is a built-in with internal slots.
   The alternative is to exclude them and keep today's behavior, including the raw-JSON acceptance.
5. **Residual units (KC3-3).** R1: one listing per root whose length is unknown before it runs. R2: host
   interceptor objects. R3: expected-constant hash lookups. Each is observed by the declared bounded search,
   not gated. **Recommendation:** accept them as the narrowed exclusion in `values.md` and BASELINE.
6. **Kinds with no usable predicate.** §4's last row, plus private-field platform classes, stay accepted as
   their own-data projection when re-prototyped to plain. Testing for them needs a throwing probe on every
   plain object, about 25 probes at about 2.7 µs each, roughly 70 µs per object, and iterators cannot be
   tested at all. **Recommendation:** a declared limit under the cooperative contract (decision-01 item 1),
   stated in `values.md` and BASELINE; the invalidation-01 hold covers the witnessed kinds, all of which are
   detectable.
7. **Scope confirmations.**
   - Envelope objects, including Proxies, stay under the envelope rule. Decision-01 refuses Proxies "at
     capture", and envelopes are not captured.
   - The packet registers its mutants in a new `value-cost.json`, not in `mutations.json`'s hold register.
   - The packet closes no adoption origin; that triage is TOOLS-02's.

## 9. Exploratory evidence (not committed)

These runs informed the design and touch no committed file:

- **Edge kinds at B.** `probe-kinds.mts` in the session scratchpad ran capture at B on edge kinds, with these
  results:
  - accepted as `{}` when re-prototyped to `null`: WeakRef, Temporal.PlainDate, Intl.Locale, an array
    iterator, DisposableStack, URL, Promise, a Number wrapper, WebAssembly.Memory, FinalizationRegistry, a
    generator, and a private-field class;
  - `JSON.rawJSON("1")` accepted as `{"rawJSON":"1"}`;
  - refused: an arguments object (`unrepresentable_member` ×2), a null-prototype Error and a String wrapper
    (`unrepresentable_member`), and a module namespace (mixed codes);
  - `JSON.isRawJSON` and `Error.isError` both exist; `isNativeError` is true for `DOMException`, and
    `isGeneratorObject` is true for async generators.
- **Brand probe cost.** On this VM a throwing brand getter costs 2.6–2.8 µs per object; 21 `util.types`
  predicates together cost 0.30 µs.
- **Proxy and brand refusal in a scratch worktree.** I added Proxy refusal as the first object observation,
  plus brand refusal after the plain-prototype check, to `values.ts` in a scratch `git worktree` of B. Kernel,
  conformance and SDK tests: 3,615/3,687 passed and 72 failed, in the nine files of §7.2. The worktree is
  discarded and nothing from it is committed.
- **Unit model.** `model.py` produced the unit figures in §1.2 and §8 Q1. The build replaces them with asserted
  counts.

No third-party material is used. `util.types` and `JSON.isRawJSON` are Node and ECMAScript built-ins. No
dependency is added.
