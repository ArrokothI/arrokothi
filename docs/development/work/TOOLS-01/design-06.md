# Design 06 — TOOLS-01 correction after reviews 01 and 02

Claude Code (`claude-opus-5-5`), implementer under [owner choice 08](owner-choice-08.md), 2026-10-05,
for the design check; contract revision 8 (`e39a8b10`). Credit needs positive recognition. "Measured"
means a scratch prototype on `9e84b587`'s tree; the build recomputes every figure.

## R1-01 — V-ENV reads what a leaf runs in its process

**Mechanism.** A syntactic detector in `source-facts.mjs` (pinned TypeScript 5.9.3), fixed in the tool:
an entry matches V-ENV if the unchanged regex minimum matches its body or the detector finds a match in
its *run set*.

*Run set:* the registration; its transitive same-file and test-side helpers, now including
module-scope constants and re-exports; its enclosing hooks; and the load-time code of its file and
test-side import closure. A case's run set is the source files it names or runs, with their closures.

*Intrinsic-like*, after stripping parentheses, `as`, `satisfies`, `!` and `<T>`: a `VENV_INTRINSICS`
name, `globalThis` or `global`; `.prototype`, `__proto__` or `.constructor`, and member chains on these;
`getPrototypeOf(…)`; and aliases, found by a scope-blind fixpoint that only over-includes.

*Matches:*
1. an assignment, `++`/`--` or `delete` on a member of an intrinsic-like expression;
2. a writer call on one (`defineProperty`, `assign`, `setPrototypeOf`, `freeze`, the `Reflect` forms);
3. an escape: a prototype or intrinsic constructor passed to a call other than `assert.*` or read-only
   reflection, returned, or stored;
4. unread code: `eval` or `Function` used as values, a non-literal or `data:` `import()`, a Worker with
   `eval: true`, any `node:child_process` call;
5. parse diagnostics;
6. a referenced test-side binding with no resolvable text.

**Left open.** Stated gaps: writes through other call results (a descriptor's `value`) and native
code. Bounded reread: the summary lists `residual`, unmatched leaves whose run set names an intrinsic
prototype (measured 6, all inventory text in `ambient-reads.test.ts`), and the report records a
reading of each. A tooling test pins the 8 write leaves below as held. Match 4 covers child processes
because their code is unread. Reading `fault-child.ts` gives the same result, since it names
`globalThis`.

**Measured.**
- 49 new leaf entries: 8 by matches 1 and 4 (review 01's four plus `creation:1009`,
  `dispatch:178,1459,1529`), 39 `fault-oracle`/`fault-sweep` child-process leaves, and 2
  `poison-catalog` leaves (a load-time `HOLDERS` escape).
- 29 `oracle.*` cases; `creation:516:3` and `ingress:459:3` leave `not_held`.
- Members 766/125/74/307 → 714/182/74/302; targets 391 → 381; register 226 → 304.
- 18 closed origins move a link to a held witness. None reopens (Q3).

**Recheck.** Register functions, preserved status, the P1-H target refusal, witnesses, closures,
`mutations.json` case attributions, summaries. Self-found, fixed separately: `helpers` keys a plain
object, so a helper named `constructor` crashes it.

**Corpus.** Review 01's direct, alias, cast, imported-helper and `new Function` variants. Adjacent
cases: a destructured alias, a `getPrototypeOf` chain, `delete`, a prototype passed to a helper, hook
and load-time writes, an unresolvable import, a parse error, indirect `eval` and a `-e` child.
Negative controls: a local-object write, a `Number.NaN` argument, `assert.equal(proto, X)`.

## §2 — rule 1, the structural check and C2-LIMIT

**Mechanism.** Each held or superseded entry carries exactly one of `decision` (a path) or `reading`
(the asserted facts and the claim each bears on). `hold_register` refuses:
- a V-ENV match left `not_held`;
- a V-ENV-claimed match not naming `owner-choice-08.md`, or that file on any other entry;
- a Proxy or re-prototyped entry not naming decision-01;
- a V-D1 entry not naming decision-05 or invalidation-02.

Old reasons stay notes (§2.2). The report lists rule-1 entries (measured 187) against review 02's 44.

**C2-LIMIT.** Choice 04's four transferred rows carry `limited`: the 24 of
`continuation-stop-01/unbound-members.json` (digest-pinned), plus extras `{member, held_leaf}` under
choice 08. Each origin's refused, target-less members must equal its list. An extra must be outside
the 24, its leaf a rule-1 entry, and its pinned literal title equal to the leaf's title at C.
Measured extras: `dispatch:1363:3@5a8d958ffdab` (leaf 1390:3) and `dispatch:1426:3@5a8d958ffdab`
(leaf 1459:3, new).

**Corpus.** Review 02's items 1 (`host-members:166:3` held, note kept), 2 (`dispatch:1390:3`), 3 (an
unlisted unbound member) and 5 (`values:1728:3`, `:1498:3` stay held); one fixture per refusal.
**Recheck.** `hold_register`, every held entry, `witness_records`, `transferred_origins`.

## R1-02 — one Markdown block parser

**Mechanism.** `markdown_blocks(lines)` scans LF lines once. It is a subset of
[CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/) §§4.2, 4.5 and 4.6, learned from the spec,
not copied.
- **Fence:** opens with 0–3 spaces and ≥3 backticks or tildes, with no backtick in a backtick info
  string; closes with the same character, at least as long.
- **Section:** bounded by column-0 `#{1,6} ` headings outside fences and HTML blocks.
- **Uncertain:** a fence-like line that is not a top-level opener or closer (indented, tab, `>` or
  list); a heading- or fence-like line inside an HTML block (types 1–7); an unclosed fence.

`fenced_bytes` and `markdown_section` share the parse. That fixes a second instance too: the old
reader reset fence state at the origin line, so a mention inside a fence got a section running to end
of file. `context_check` refuses a closure unless the origin is a recognized closed fence ending in
its section, with no uncertain line at or before that end. An uncertain origin's areas come from its
whole file.

**Measured.** All 29 fence origins and 1,333 mentions are certain. Fence bodies and the 14 closed
sections are unchanged. 36 mention sections shrink to their true extent, so the gate counts change.

**Corpus.** Review 01's tilde probe with its backtick and full-context controls. A four-backtick fence
holding ```` ``` ```` and `## x`; a tilde fence holding ```` ``` ````; indented, list and blockquote
fence lines; `## x` in an HTML comment; an unclosed fence; a mention inside a fence.

**Recheck.** Inventory (208/1,333/8), `context_check`, `origin_areas`, gate counts.

## R1-03 — a transfer must be in its decision's list

**Mechanism.** Each `{decision, list, sha256}` is pinned, and the list lies in the decision's
attachment directory: `owner-choice-05/transferred-origins.json`, and a new
`owner-choice-04/limited-origins.json` restating §1's table exactly (origins, files, counts), as
choice 08 permits. `transferred_origins` refuses a missing list or digest mismatch, any extra,
missing or swapped origin between a list and the rows citing it, and §1 counts that differ from the
preserved table. So an open origin completes only through its own decision's list.

**Corpus.** Review 01's 45th-origin and unrelated-decision fixtures; a choice-04 origin cited under
choice 05; a listed origin missing or closed; a stale count.

**Recheck.** The corpus result, the `transferred` summary, C2-LIMIT.

## R1-04 — a kill is an observed assertion failure in the target

**Mechanism.** For each `test:fail`, the catalog reporter forwards `failureType`, whether the cause is
an `AssertionError` with `ERR_ASSERTION`, and the cause's non-`node:` stack frames after its message;
`file_tree` keeps them. An expected target qualifies only when it `failed` with `testCodeFailure`, an
assertion cause, and frames that reach its file through test-side files only.

**Refuses.** If an expected target is skipped, todo, absent, cancelled, timed out or hook-failed, or
errored or asserted from production code, the mutant is `setup_error`, never killed or survived.
Wrong-kill and reach controls and the probe route are unchanged. Measured on v26.10.0: a skip is
`test:pass` with `skip`, a failing todo is `test:fail` with `todo`, and the cause's name, code and
stack survive process isolation.

**Corpus.** Review 01's assertion kill, pre-assertion `TypeError` and `test.skip`; todo; `t.skip()`;
cancellation; timeout; a renamed target; a production `AssertionError`; a plain `Error` with that
code; a helper-module assertion (which kills).

**Recheck.** The reporter, `file_tree`, `target_outcome`, determinism comparisons, catalog runs.

## Order and stop

One commit each, with refusal tests and ablations: R1-02; R1-03 with C2-LIMIT; R1-04; R1-01 with §2;
then `adoption.json`. Before any origin changes state, the build recomputes at C and stops if any of
the 110 would reopen (§2.5). The report cites node-floor-04 (REC-01) and uses real hunk headers and
SHA-bound approvals (REC-02).

## Questions for the design check

1. **§2.1 and §2.3.** 26 entries (45 after widening) match V-ENV but are held or superseded under a
   K1.1-correction-03 claim. Read literally, §2.1 moves them to BINDING-01. This design keeps their
   category decision (§2.3), because choice 08 changes no hold's scope. None earns credit.
2. **Match 4** makes 39 leaves and the oracle's 29 negative controls V-ENV witnesses. The alternative
   is a counted gap.
3. **"Reopen"** here means no contract route closes the origin. A held-witness link is P1-H's route,
   so the 18 stay closed and are listed.
