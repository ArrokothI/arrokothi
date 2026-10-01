# Round 7 pre-implementation reconstruction and obligation map

Claude Code desktop, model `claude-opus-5-5`, 2026-09-29. Implementer work written before the test and
production changes; it is not independent acceptance. It answers [review 10](review-10.md)
(`K12C1-R10-READ-01`, `K12C1-R10-COMMIT-01`). Both findings concern the enforcement that
[coverage-06](coverage-06.md) introduced for correction DEC-8 and DEC-9, so this is a second
reconstruction of that enforcement under 006, not a patch of the two probe spellings.

## Start identity

- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Reviewed H: `35c6ba0277542236f21f95d695154fa0164feb96` (payload C `602ea3b3955f1aea935849e993ebfb66b64ebd5b`),
  [review 10](review-10.md), CHANGES REQUIRED; recorded at `0efe0ba2ebb3fdde71ac8ab5b7a3ae048f5f5ac1`.
- Start: `0efe0ba`, the clean local checkout already on this branch. Forward commits only.
- Owner decisions in force: [amendment 01](amendment-01.md), [amendment 02](amendment-02.md),
  [decision-05](../K1.2/decision-05.md), decisions 01–04. V-D1 stays with K1.1-correction-03.
- [Owner note 10](owner-note-10.md) is advice to the owner, not a finding; its concern (selected
  counterexamples treated as closure of a mechanism) shapes the method below.

## Why the round-6 enforcement missed these cases

Both round-6 rules were **denylists over syntax the author had in mind**:

- The read scanner recognised three access shapes (dot/element access, a `BindingElement` read through
  `getText()`, `in`). Any other shape that performs `[[Get]]` was invisible: quoted and computed
  binding names, assignment destructuring (review 10), and more that this reconstruction found below.
- Its model also assumed that a *required* declared member is owned. That is true for Kernel records
  built by literals, but not for members TypeScript's `lib` declares on built-in types (they live on
  built-in prototypes), not for members a type assertion makes required, and not for caller
  envelopes, whose declared types describe what a caller claims rather than what it owns.
- The commit rule located the "first mutation" with four callee names plus property assignment.
  Every mutation it did not recognise (`this.#mint`, `++`, any other mutating helper) was treated as
  a non-mutation, so the rule then checked the wrong window.

Round 6 validated each rule with a probe containing the forms it recognised and with mutants of the
forms it recognised; neither could fail for an unrecognised form. The correction is to make both
rules **closed-world**: what is permitted is enumerated, and everything else fails.

## Census of the zone (TypeScript checker, 13 sources, repository `tsconfig.json`)

- **Syntax actually used:** no binding or assignment patterns, `for…of`/`for…in`, spread elements,
  `in`, `instanceof`, `==`/`!=`, `++`/`--`, `await`/`async`/generators, labels, `switch`, tagged
  templates or `super` member access. Binary operators used: `&& || ?? === !== < <= > >= + - * = += -=`;
  prefix `!` and `-`.
- **Built-in members inside functions** (lib-declared, therefore inherited from a built-in prototype
  or an own member of a global): only `length` of arrays/strings, engine-descriptor fields, one
  `PrimordialSymbol.iterator`, and **`unsupported.ts:25` `this.name = …`**, a `[[Set]]` of a member
  `Error.prototype` supplies. All other built-in members are read at module load (primordial capture).
- **Global bindings inside functions:** none.
- **Type assertions:** 5 of 132 change member information: four introduce members from
  `unknown`/`any`/`object` (two null-prototype descriptor builders, the array-iterator prototype at
  load, `initialInput` as `InputContent`), and **`values.ts:415`** makes the optional `occurrences`
  required, so its read-and-write was never listed. Only `pushIssue` appends to those arrays and every
  entry at index ≥ 8 is built with an own `occurrences`, so the access is safe at runtime; the
  scanner simply could not see it.
- **Envelope-typed receivers:** 12 reads, all of Kernel-built copies that reuse an envelope interface
  (`CapturedRecovery.available`, captured Input/Creation IDs, views).
- **Implicit coercion of non-primitive operands:** none once `Buffer` resolves (it was `any` under the
  scanner's `types: []`).

## Design

### DEC-8 enforcement (READ-01)

One module, `tests/zone-analysis.ts`, builds a checker program from the repository `tsconfig.json`
restricted to the zone, and classifies every node:

1. **Permitted syntax (closed world).** Every executable node kind, binary operator, unary operator and
   assignment target shape must be in an explicit allowlist. Destructuring of any form, iteration
   protocol, `in`, `instanceof`, coercing equality, `++`/`--`, `await`/`yield`/`async`, `with`, labels,
   `super.x` and assignment patterns are therefore failures by absence, not by a list of known evasions.
2. **Named member access** (dot, `?.`, literal element key): resolved by the checker. Listed when the
   member is declared optional, resolves to no declaration (index signature, `any`), or is declared by
   the TypeScript `lib` inside a function (built-in prototype member; `length` of arrays/strings is
   own and exempt). Private `#names` are brand-checked and never inherited.
3. **Computed keys:** dynamic reads, writes and deletes on non-lists; index reads on arrays/strings.
4. **Object spread** (own-member copy), **type assertions and predicates** that introduce members or
   make an optional member required, **implicit coercion** of a non-primitive operand (template spans,
   arithmetic, relational operators, keys), and **global bindings** read inside functions.
5. **Caller envelopes.** Every non-`caller` parameter of a public coordinator method may only be
   compared, tested with `typeof`, or passed to a call; a call into zone code carries the rule into the
   callee's parameter; the only member access permitted on it is the inventoried observation read. A
   receiver whose static type is an envelope type is listed as well.
6. Every listed site must match an inventory entry (file, kind, mode, spelling, count, reason); guarded
   descriptor reads keep their `hasOwnValue` precondition; each `hostMember` key must name an optional
   member of the holder's declared type.

### DEC-9 enforcement (COMMIT-01)

1. **Effect analysis** over every function in the zone (fixpoint, conservative): which parameters,
   receiver or other pre-existing objects a function's own code may mutate (all assignment operators,
   `delete`, mutating primordials such as `defineProperty`, `freeze`, `Map.prototype.set`, and calls
   to zone functions that mutate an argument), with an object counted as fresh only when it is a
   `const` initialised by a literal or constructor in the same function. Every callee must resolve to
   zone code or a classified primordial; any other call is a failure unless inventoried as foreign
   (host/Driver callbacks, host accessors, the serializer dependency). The serializer environment's
   install-and-restore window is the one inventoried net-zero override.
2. **Control commits.** In `recoverExecution`, `reportProtocolFailure` and `requestTakeover`, the
   method body must end in an *apply suffix* of a fixed grammar: appends of prebuilt locals, then plain
   writes of prebuilt locals (or `null`, or a local plus one), then the post-commit delivery, then
   `return` of a prebuilt local. Before the suffix, no node may mutate a pre-existing object except the
   refusal exits (`return err(this.#refusal(…))`, and the two refusal helpers in their exact
   call-then-exit form, whose own bodies mutate only inside such exits). Every foreign call precedes
   the first value the suffix commits or returns. `applyControlCommit` must be appends then writes of
   commit fields, calling nothing else.
3. **Write sites.** Hold fields (by name, any access form or define call), recovery history, receipts
   and the acceptance index (by name after `const`-alias resolution, and by static element type) are
   mutated only by their owners.
4. **Distinguishing evidence:** in-memory mutants of the real `coordinator.ts` analysed by the same
   code (review 10's two regressions and every other write/helper/ordering equivalent), plus a
   full-suite ablation runner.

### Production changes (amendment 02, same mechanism, separate provenance)

- `unsupported.ts`: `name` becomes a class field, defined as own data rather than assigned through
  `[[Set]]` past a possibly polluted `Error.prototype.name`. No other production change is planned:
  the control code already has the grammar above, so every sealed ablation anchor stays valid.

## Obligation map

| Obligation / source | Distinguishing inputs and negative controls | Expected facts / forbidden changes | Planned evidence |
|---|---|---|---|
| READ-01; DEC-8, C13 | Review 10's six forms; nested, rest, default, parameter, catch and loop destructuring; assignment patterns; `in`; for-in/of; spread arguments; `instanceof`; `await`; `super.x`; casts that hide optionality or introduce members; index signatures and `any`; built-in prototype members and globals inside functions; coercion of objects; envelope parameter aliased, spread or read | every form fails the protection; clean zone passes with a reasoned inventory | `ambient-reads.test.ts` probes and inventory; rebound review-10 probe |
| COMMIT-01; DEC-9, C8–C10, C12 | Review 10's early `#mint` and `++`; `+=`, `??=`, compound via alias, closure, callback, `mapSet`, `freeze` of a record, `#refusal` outside exit form, build inside the suffix, hold write before append, foreign call after builds, answer built after mutation | each mutant yields a violation; clean source yields none | `control-commits.test.ts` in-memory mutants; `ablations-07.mjs` full suite |
| No-op, refusal, reentry and fault paths of the three controls | duplicate protocol report, no-change recovery, every refusal exit, Driver callback reentry | no mutation before exits; revalidation after the last foreign call | same rules; existing takeover-reentrancy and recovery suites |
| Same-mechanism self-found | `unsupported.ts` `name`; `values.ts:415` cast | fixed / inventoried with verified precondition | tests above; ablation |
| Cumulative C1–C15, DEC-1–9 | full suites and every existing runner | unchanged | validation-07 |
