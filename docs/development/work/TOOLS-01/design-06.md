# Design 06 — TOOLS-01 correction after reviews 01 and 02 (revision 5)

Claude Code (`claude-opus-5-5`), implementer under [owner choice 08](owner-choice-08.md),
2026-10-05, for the design check; contract revision 9 ([owner choice 09](owner-choice-09.md)).
Credit needs positive recognition. "Measured" means a scratch prototype on `9e84b587`'s tree; the
build recomputes every figure.

## R1-01 — V-ENV reads what a leaf runs in its process

**Mechanism.** A syntactic detector in `source-facts.mjs` (pinned TypeScript 5.9.3), fixed in the
tool: an entry matches V-ENV if the unchanged regex minimum matches its body or the detector finds a
match in its *run set*. The run set is the registration; its transitive same-file and test-side
helpers, now with module-scope constants and re-exports; its enclosing hooks; and the load-time code
of its file and test-side import closure. A case's run set is the source files it names or runs,
with their closures.

*Intrinsic objects* (parentheses, `as`, `satisfies`, `!`, `<T>` stripped): a `VENV_INTRINSICS` name,
`globalThis` or `global`; `.prototype`, `__proto__` or `.constructor` and member chains on them;
`getPrototypeOf(…)`; their aliases (scope-blind fixpoint, over-including). *Unclassified values*
(change 1): results of calls and `new` that receive an intrinsic object as an argument, such as
`Object.getOwnPropertyDescriptor(Object, "prototype")`, with their member chains and aliases,
destructuring included; readers returning fresh or primitive results (`keys`, `entries`,
`getOwnPropertyNames`, `create`, `is*`, `hasOwn`, `stringify`) are exempt. Matches:

1. an assignment, `++`/`--` or `delete` on a member of an intrinsic object;
2. a writer call on one (`defineProperty`, `assign`, `setPrototypeOf`, `freeze`, `Reflect` forms);
3. an escape: an intrinsic object passed to a call other than `assert.*` or read-only reflection,
   returned or stored;
4. unread code: `eval`/`Function` as values, a non-literal or `data:` `import()`, a Worker with
   `eval: true`, any `node:child_process` call;
5. parse diagnostics;
6. a referenced test-side binding with no resolvable text;
7. a write, writer call or `return` whose receiver or value is unclassified, recorded as kind
   `unclassified`.

**Disposition.** Every match is held by rule 1 and earns no credit. `hold_register` refuses a match
left `not_held`; the preserved table makes the member a witness; `check_target` refuses a target on
the leaf; `witness_records` and `origin_closure` accept it only through a held witness; the summary
lists `unclassified` entries. `residual` (unmatched leaves whose run set names an intrinsic
prototype; measured 6, in `ambient-reads.test.ts`) grants and waives nothing: uncertain cases are
matches, so never residual, and its reading is a report note. Stated gap: values that never meet an
intrinsic object in the run set, and native code.

**Measured.** No unclassified case. 49 new leaf entries: 8 by matches 1 and 4 (review 01's four,
`creation:1009`, `dispatch:178,1459,1529`), 39 `fault-oracle`/`fault-sweep` child-process leaves and
2 `poison-catalog` leaves (load-time `HOLDERS` escape); 29 `oracle.*` cases; `creation:516:3` and
`ingress:459:3` leave `not_held`. Members 766/125/74/307 → 714/182/74/302; register 226 → 304 (187
under rule 1); 18 closed origins move a link to a held witness; none reopens.

**Recheck.** Register functions, preserved status, the P1-H target refusal, witnesses, closures,
`mutations.json` attributions, summaries. Self-found, fixed separately: `helpers` keys a plain
object, so a helper named `constructor` crashes it.

**Corpus.** Review 01's direct, alias, cast, imported-helper and `new Function` variants; a
destructured alias, `getPrototypeOf` chain, `delete`, prototype passed to a helper, hook and
load-time writes, unresolvable import, parse error, indirect `eval`, `-e` child. Change 1: the
descriptor-result write, its helper-return, destructured `{ value }` and `Reflect.get(Object,
"prototype")` variants, and an unreadable helper called with `Object`. Negatives: local-object
write, `Object.keys` result, local descriptor, `Number.NaN` argument, `assert.equal(proto, X)`. Each
uncertain case shows no credit and a visible reason.

## §2 — rule 1, the structural check and C2-LIMIT

**Structural check.** Each held or superseded entry carries exactly one of `decision` (a path) or
`reading` (the asserted facts and the claim each bears on). `hold_register` refuses a V-ENV match
left `not_held`; a V-ENV-claimed match not naming `owner-choice-08.md`, or that file elsewhere; a
Proxy or re-prototyped entry not naming decision-01; a V-D1 entry naming neither decision-05 nor
invalidation-02. Category entries keep their owners. The report lists rule-1 entries against review
02's 44.

**C2-LIMIT (change 2).** Choice 04's four transferred rows carry `limited`: the 24 of
`continuation-stop-01/unbound-members.json` (digest-pinned) plus extras `{member, target}`. An extra
is admitted only through its target record: the only suite target whose `member` is the extra,
declared at a rule-1 held leaf, and passing every P1-T check at C except the P1-H refusal (anchors
exactly once in that leaf's span, valid reach, exactly one literal-titled catalog leaf there).
Titles are never compared. A duplicate, missing or otherwise-refused target, a generated title or an
ambiguous declaration creates no exception: the member stays unlisted and C2-LIMIT refuses. Per
origin, the refused members without a credited target must equal the 24 plus the admitted extras;
only the four origins carry `limited`. Targets on newly held leaves leave the table, except mapping
targets, which stay refused by P1-H. `dispatch:1426:3@5a8d958ffdab` maps through its existing target
at 1459:3; `dispatch:1363:3@5a8d958ffdab` through its item-2 target at 1390:3, whose P1-T check
record is in `continuation-repair-01/targets.json.gz`. The build restores and re-checks it; if it
fails, there is no exception and the build stops. Measured: 391 target rows → 383, 381 credited
readings.

**Corpus.** Review 02's items 1–3 and 5; the same title in another file and in another suite of the
same file; a missing, duplicate, ambiguous or generated mapping; an extra outside the four origins;
a valid link, with both real extras as positive controls.

## R1-02 — one Markdown block parser

**Mechanism.** `markdown_blocks(lines)` scans LF lines once: a subset of [CommonMark
0.31.2](https://spec.commonmark.org/0.31.2/) §§4.2, 4.5, 4.6, learned from the spec, not copied. An
opener is 0–3 spaces and ≥3 backticks or tildes, with no backtick in a backtick info string. A
closer (change 4) is 0–3 spaces, the opener's character at least as many times, then only spaces or
tabs; every other line in an open fence is content (`~~~ not-a-close`, a shorter run, a heading).
Sections are bounded by column-0 `#{1,6} ` headings outside fences and HTML blocks. Uncertain: a
fence-like line that is not a top-level opener or closer (indented, tab, `>` or list); a heading- or
fence-like line in an HTML block (types 1–7); an unclosed fence. `fenced_bytes` and
`markdown_section` share the parse, which also ends the old reset of fence state at the origin line.

**Disposition.** A *fence origin* closes only as a recognized closed fence ending inside its
section. For any section minimum, an uncertain line at or before its end refuses closure. Whole-file
origins (test files, helpers, cases, non-executable records) keep their own minimum; CONT-04
obligations are unchanged. An uncertain origin's areas come from its whole file, which never permits
closure.

**Measured.** All 29 fences and 1,333 mentions certain; the 14 closed sections unchanged; 36 mention
sections shrink to their true extent. **Corpus.** Review 01's tilde probe with its backtick and
full-context controls; a same-character closer with trailing text; a shorter run holding `## x`; a
closer with trailing whitespace; a required record after the true closer; a four-backtick fence
holding ```` ``` ````; indented, list and blockquote fences; `## x` in an HTML comment; an unclosed
fence; a mention inside a fence; the CONT-04 reference forms; one positive non-fence closure.

## R1-03 — a transfer must be in its decision's list

**Mechanism.** Each `{decision, list, sha256}` is pinned, and the list lies in the decision's
attachment directory: `owner-choice-05/transferred-origins.json`, and the new
`owner-choice-04/limited-origins.json` restating §1's table exactly. `transferred_origins` refuses a
missing list or digest mismatch, any extra, missing or swapped origin between a list and its rows,
and §1 counts that differ from the preserved table. Only the existing 4 + 40 transfer; the
decision–list association stays a human review boundary. **Corpus.** Review 01's 45th-origin and
unrelated-decision fixtures; a choice-04 origin cited under 05; a listed origin missing or closed; a
stale count.

## R1-04 — target-set mutations report observations, never kills (change 3, owner choice 09)

**Mechanism.** The catalog reporter forwards each `test:fail`'s `failureType` and its cause's name
and code. `target_outcome` never returns `killed`: `survived` (every expected target passed, nothing
failed), `wrong_kill` (only non-target leaves failed), or `observed`, with one outcome per expected
target: `passed`, `assertion` (name and code; origin not established), `error`, `skipped`, `todo`,
`cancelled`, `timeout`, `hook` or `absent`. Run-level `timeout`, `output_limit`, `malformed`
(missing or invalid catalog events), `setup_error`, `not_applicable`, `uncovered`,
`invalid_baseline` and `nondeterministic` stay distinct. None of them, and no observation, is
credit; the probe route is unchanged. **Corpus**, each showing no kill: an assertion failure in the
target; a `TypeError` before it; `test.skip`, todo, `t.skip()`; cancellation; timeout; a renamed
target; a production `AssertionError` and GPT-6's trimmed-stack case; a plain `Error` with that
code; a helper assertion; missing provenance; a qualifying-looking failure beside an invalid target.

## Order and stop

One commit each, with refusal tests and ablations: R1-02; R1-03 with C2-LIMIT; R1-04; R1-01 with §2;
then `adoption.json`. The build stops if any of the 110 would lose every contract route (§2.5). The
report cites node-floor-04 and uses real hunk headers and SHA-bound approvals.

## Revision 2

Answers the [first check](design-06-check.md) (`b66688c6`): (1) unclassified call results are match
7, with enforcing consumers named; `residual` grants nothing; (2) extras map through a target
record, never a title; (3) R1-04 follows owner choice 09; (4) the complete closer rule, and "closed
fence" only for fence origins. Owner answers: category entries keep their owners, child processes
match, the 18 relinked origins stay closed.

## Revision 3

Answers the [second check](design-06-check-02.md) (`9b2aafcd`) with two corpus items. **R1-04:**
malformed provenance, distinct from missing provenance and from a malformed catalog event: a valid
`test:fail` whose assertion-origin metadata is unusable (an empty, non-string or frameless stack);
expected `observed` with a visible outcome and reason, no kill. **R1-02:** a `~~~` fence holding a
line of three backticks and then `## x`, a later true `~~~` closer and the required record after it;
both lines stay content and the section keeps its true minimum.

## Revision 4: the safe-position rule (owner choice 10)

Answers [review 03](review-03.md) under [owner choice 10](owner-choice-10.md) and replaces R1-01's
matches 1–3 and 7. Everything else in R1-01 and §2 stays. The prototype, probe and figures are in
[design-06-r4](design-06-r4/README.md).

**Rule.** From each reference to an intrinsic value (design 06's recognition, plus a class's
`extends`) the detector climbs to its use on the tree as written. It is safe only as the receiver or
callee of a listed call or `new`, an argument in a position its row admits, or the object of a
member read whose result is a listed constant or is itself used only safely. Anything else is a
rule-1 match whose kind is its reason:
- `wrapper`: parentheses, `as`, `satisfies`, `!`, `<T>`;
- `write`: assignment, update, `delete`, a loop target;
- `call`: an unlisted or unresolved call, `new` or tag;
- `storage`: an initializer, property, element, spread, assigned value, default, `export` or `yield`;
- `return`;
- `operator`: everything else, including `===`, `typeof` and `instanceof`.

A listed call's result is untainted.

**Identity.** A row's path is plain `.name` reads from a root. Spelling never counts: local,
imported, namespace, member and shadowed functions have no path. The root resolves only if the file
never declares it and never reassigns it. Reassigning means assigning it or one of its members, or
passing it on, storing, wrapping or returning it bare when it has listed members. `globalThis.<root>`
counts as the root; a computed or bare use of `globalThis`/`global` breaks every root. The record
says "in the run set", where every such use is already a match. Revision 4 applies the rule
file-wide, because a file's tests share a process.

**Table**: the rows the corpus uses. Each writes nothing reachable from its receiver or arguments
and returns a fresh object or a primitive. An intrinsic argument is admitted only where the result
holds nothing from it.

| Rows | Intrinsic args | Why |
|---|---|---|
| `Object.keys`, `.getOwnPropertyNames`, `.isFrozen`, `.hasOwn`; `Reflect.ownKeys`; `Array.isArray` | any | reads keys or a slot; keys or boolean |
| `JSON.stringify` | first | reads; string |
| `Object.entries`, `.values`, `.fromEntries`, `.create`; `Array.from`, `Array` | none | fresh, holding the argument's values or prototype |
| `JSON.parse`; `String`, `.fromCharCode`; `Number`, `.isInteger`, `.isSafeInteger`, `.parseInt`; `Symbol`, `.for`; `Math.random`, `.round`, `.min`, `.max`, `.ceil`; `Date`, `.now`; `RegExp`; `Error` | none | primitive or fresh |
| `new` `Array`, `Date`, `RegExp`, `Error`, `TypeError`, `RangeError`, `SyntaxError`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Uint32Array`, `Promise`; `Promise.all`, `.resolve`, `.reject` | none | fresh (`resolve` may return its own argument) |
| `Number.NaN`, `.POSITIVE_INFINITY`, `.NEGATIVE_INFINITY`; `Symbol.iterator`, `.asyncIterator`, `.hasInstance`, `.isConcatSpreadable`, `.species`, `.toPrimitive`, `.toStringTag` | — | non-writable, non-configurable primitives (ECMA-262 §20.4.2, §21.1.2) |

`node:assert` is not a row: an intrinsic passed to it is unsafe (76 references, 12 files).

**Recheck.** The producer is `ambientMatches`. Every register, census, target, witness, closure and
C2-LIMIT consumer is recomputed, and the ablations and tests naming old kinds are updated.

**Measured** (prototype on `60af5db9`'s tree, regenerated, then `corpus`): `revalidation_complete`.
- All 110 closed origins still close. 32 change their links, and 53 now include a held or superseded
  witness (39 at C).
- Members 713/183/74/302 → 616/314/74/268.
- Register 305 → 393. Rule-1 entries 188 → 295, including 19 former `not_held` readings.
- Targets 383 → 315: 306 credited, and 9 refused by P1-H only. Those 9 are the two mapping targets
  and seven new C2-LIMIT extras (`dispatch:369,1173,1211,1256,1283,1401` and `values:115`).
- Under the record's run-set wording the figures would be 641/272/74/285 and 330 targets.
- Nine members are held only for `operator` positions.

**Owner question.** `dispatch:1527:3` and `values:735:3`, two of choice 04's 24, now match V-ENV.
Choice 04 keeps the 24 `refused`; choice 08 rule 1 holds every match. The prototype holds them and
still counts them among the 24. Neither reading grants credit.

**Corpus** (81 cases): review 03's 19; six wrappers (none, parentheses, `as`, `satisfies`, `!`,
`<any>`) × seven positions (argument, method receiver, listed receiver, array and object storage,
return, alias); seven same-named functions; five rebinding cases in another test. Every hazard
matches. Eight controls do not, including `Object.keys` of an intrinsic and a local-object write.
Through the real register and census, review 03's two preservation cases become `held`.

**Review 03's questions.**
1. No edge crosses a wrapper, because a wrapper is unsafe.
2. Exemptions follow identity, not spelling.
3. An unrecognized form is a visible match, held before `preserved_table` or `check_target` reads it.
4. The cause was a list of hazards with credit by default; that default is now inverted.

**Stated gaps** (unchanged): production modules, native code, inherited members of ordinary values
(`[].push`), and state another test leaves in an ordinary container.

## Revision 5: owner choice 10 §2's exit (coarse rule)

[Design check 03](design-06-check-03.md) (`b7598918`) found five leaves that revision 4's prototype
credits although they reach an intrinsic outside the table. Three rebind a listed callee by
destructuring in a sibling test; one uses `globalThis.__defineGetter__`; in the fifth, a
`JSON.stringify` replacer receives `Object.prototype` and writes it. That triggers [owner choice
10](owner-choice-10.md) §2. The implementer applies the exit directly; no design check follows.

**Rule.** Every member whose run set references any intrinsic value is a rule-1 match, held under
V-ENV by owner choice 08. No safe-position table exempts anything: revision 4's table, identity rule
and unsafe-reason kinds are withdrawn, and so are design 06's exemptions for `assert.*`, read-only
reflection and fresh results. Every intrinsic reference is a match of kind `intrinsic`. The kinds
`generated`, `child-process`, `parse` and `unresolved` are unchanged.

**Kept.** The following stay as they are:
- the run set;
- intrinsic recognition and taint: names, `.prototype`/`__proto__`/`.constructor` reads,
  `getPrototypeOf` results, a class's `extends`, and scope-blind aliases of intrinsic,
  prototype-like and tainted values;
- file-wide scope;
- child processes as unread code;
- owner choice 08 §2.3 category precedence;
- C2-LIMIT, and owner choice 09's no-target-kills rule.

A structural trace in `corpus` requires that every key with a detector site is held, and that no
member or target at such a leaf earns credit.

**Owner answers to revision 4**, verbatim:

> 1. dispatch:1527:3 and values:735:3 are held under owner choice 08 rule 1 and stay among owner
>    choice 04's 24 limited members. Neither earns credit.
> 2. The identity rule applies file-wide, not only to the run set, because a file's tests share a
>    process. This is stricter than owner choice 10's wording and is adopted.
> 3. No `node:assert` or comparison-operator rows are added to the safe-position table. Those
>    references stay unsafe.

**Corpus.** Design check 03's five false-preserved leaves earn no credit. Review 03's 19 cases and
the wrapper × position cross-product stay, and every hazard in them matches. Under the coarse rule
the controls match too, including `Object.keys` and `new Map()`. Only a local-object write with no
intrinsic reference stays unmatched. The build reports every changed figure against 713/183/74/302
(H `7f3a2af4`) and 616/314/74/268 (revision 4's prototype). It stops under owner choice 08 §2.5 if
any of the 110 closed origins loses every route.
