# Design 06 — TOOLS-01 correction after reviews 01 and 02 (revision 2)

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

Answers the [design 06 check](design-06-check.md) (`b66688c6`): (1) unclassified call results are
match 7, with their enforcing consumers named, and `residual` grants nothing; (2) C2-LIMIT maps an
extra through its target record, never a title; (3) R1-04 follows owner choice 09; (4) the closer
rule is complete, and "closed fence" applies to fence origins only. The owner answered revision 1's
questions: category entries keep their owners, child processes match, and the 18 relinked origins
stay closed.
