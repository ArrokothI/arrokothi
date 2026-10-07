# TOOLS-01 design 06 revision 4 — independent design check 03

**CHANGES REQUIRED. Owner choice 10 §2's pre-agreed coarse-rule exit is triggered.**
The prototype gives ordinary `preserved` credit to five independently executed leaves that use
intrinsics outside the permitted table. This is a design check, not an implementation or packet
acceptance. The next implementer applies the already-authorized coarse rule; this report does not
request another detector/table correction round.

**Reviewer and access, 2026-10-07:** Codex desktop coding-agent session, GPT-6 as identified by
the session instructions. An exact serving variant/build identifier is not exposed, so none is
claimed. I have a working zsh shell, Git, Python and executable Node, repository/history access,
sandboxed writes and restricted network with approved escalation for cloning and dependency
installation. I have the owner's request and committed records, not private earlier conversations
or independent authority to change the owner's choices. No subagent participated.

All substantive inspection and experiments used my private clones under `/private/tmp`:
`arrokothi-tools01-check03-20261007` for the review and
`arrokothi-tools01-check03-prototype` for the supplied prototype. The former was cloned directly
from `https://github.com/ArrokothI/arrokothi.git`, branch `codex/tools-01`, then branched at the
requested subject. The latter was cloned without hardlinks from my own clone. No shared checkout
was used for subject inspection, experiments or edits. Initial environment/skill discovery read
the supplied workspace's status and skill files before cloning; it changed nothing there.

Node **v26.10.0**, Darwin ARM64, was already installed at
`/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node`; its directory was first
in PATH for every Node/probe/measurement command. I verified `process.version` and `process.execPath`.
No Node installation was needed. I additionally checked an existing darwin-arm64 archive against
the owner's SHA-256 `751fdf7439f115d87ee2a8f3f18c065b6151852068e3e666ac60ac2996f75ac9`.

**Exact subject and mandate:**

- Design 06 revision 4 and its attachments: `2690166797e80c6446be3308e736fbd363406f16`.
- Contract revision 10: `297375d5d947a6a9bbb132d52a6d489246a65c05`; its bytes are unchanged at the subject.
- Owner choice 10: `60af5db9368f12451a3fe8a108511419316a5828`, especially §§1–2 and the bounded §4 check.
- Review 03, its root-cause note, owner choices 08 §2 and 09, and all three owner answers supplied
  with this check govern. File-wide identity is adopted; neither assert nor comparison operators
  are exempt; the two newly held limited members remain in the original 24 and receive no credit.

This concerns evidence tooling. It changes no Kernel, Runtime/Driver or deployment semantics.
Architecture navigation/evidence ownership, development front door/baseline/process and the
research map's realm-integrity/evidence-tooling sections were read for context. The findings below
come from source inspection and fresh probes, not an earlier review's verdict.

**1. TOOLS01-D06C3-01 (P1): destructuring and global getters defeat file-wide callee identity.**

```ts
test('poison', () => {
  ({ method: Object.keys } = { method: replacement });
});
test('victim', () => {
  Object.keys(Object.prototype);
});
```

The complete runnable fixture captures the original method inside `poison`; `replacement`
writes and deletes a marker on its argument and delegates to that original method. The victim
asserts the replacement ran. It passes on Node v26.10.0. The poison leaf is correctly held;
the victim has no register entry and is **preserved** by `hold_register` → `preserved_census`
→ `preserved_table` with identical pinned/current test source. Array destructuring
`[Object.keys] = [replacement]` and object destructuring into `global.Object.keys` reproduce
the same result. All three victim leaves earn false credit.

The prototype's `isWriteTarget` only recognizes an immediate assignment/update/delete/loop
parent. A member nested in a destructuring assignment is classified as `storage` at depth 1.
The file-wide invalidation loop breaks a root only at depth 0, so it leaves `Object.keys`
listed in another test. The call there is actually a local replacement, excluded by the
identity rule. Its intrinsic argument is therefore outside the safe-position table. This
finding alone meets owner choice 10 §2; it does not depend on interpreting callback taint.

The requested getter search found a fourth identity variant:
`globalThis.__defineGetter__('JSON', () => ({stringify: replacement, parse}))` in `poison`
leaves `JSON.stringify(Object.prototype)` in `victim` credited. That complete fixture also
runs and proves the replacement executes. Unlike the direct `defineProperty(globalThis, ...)`
form, this call reaches the global scan's non-intrinsic property-name `continue`, without
breaking the affected root. The poison leaf is held but the victim is preserved. Both
mechanisms substitute spelling for proof after a real file-wide identity change.

Evidence: [runtime and real credit probe](design-06-check-03/probe_credit.py),
[all five executions and preserved tables](design-06-check-03/credit.json), and the
`sibling-destructure-member`, `sibling-array-destructure-member`,
`sibling-global-destructure-member` cases in [extended.json](design-06-check-03/extended.json).

**2. TOOLS01-D06C3-02 (P1): a listed primitive-returning call can expose the intrinsic to user code.**

```ts
test('victim', () => {
  const escaped = [];
  JSON.stringify(Object.prototype, function(key, value) {
    escaped.push(value);
    return value;
  });
  escaped[0].__check03 = 42;
  assert.equal(escaped[0].__check03, 42);
  delete escaped[0].__check03;
});
```

The prototype marks only `JSON`, `Object.prototype` and `Object` as safe references. It never
classifies the callback parameter as the intrinsic, so the call argument/storage/return/write
uses escape its recognition. The real register is empty for this leaf and the real preserved
table credits it. The exact test above executes successfully in an isolated process.

The cause is the table's assumption that a primitive result proves a non-escaping, read-only
operation. The intrinsic's direct argument position is admitted, but the callback's intrinsic
uses are not table positions. The
[ECMAScript callback step](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty)
explicitly passes the value to the replacer. This is not production/native-code analysis or
state left in an ordinary container by a different test: the escape is created in this leaf by
a listed call. It is another §2 credited miss. The runtime and credit outputs are in the same
attachments as finding 1; `table-runtime.json` also independently observes direct mutation of
the intrinsic during serialization.

**Table check: FAIL on the justification, PASS on the tested explicit argument restrictions.**
[The row-by-row audit](design-06-check-03/table-audit.md) covers every named function/constructor
and all ten constants. All 47 prototype call/new rows were exercised with a direct intrinsic
at argument positions 0, 1 and 2: 141/141 agree with their explicit admission. No row admitting
an intrinsic argument was found to return that argument in its result. That property is
insufficient: finding 2 is an escape through a callback. `Promise.resolve` really admits no
intrinsic arguments; `Promise.resolve(Object.prototype)` matches. Its possible identity return
was executed and is acknowledged by the design. Independently executed justification defects
include `RegExp(r) === r`, a `JSON.parse` reviver returning an existing object, and `hasOwn`
key coercion / `Promise.all` callbacks mutating their arguments. These ordinary-object examples
are not separately counted as credited intrinsic misses.

**Identity and cross-product checks: mixed; the required universal identity claim fails.**

The supplied 81-case script ran unchanged: 81 expected results, exit 0. The independent extension
uses the actual register as well as `survey`/`helpers`, and records parser diagnostics. Its
216-case core is six wrappers (bare, parentheses, `as`, `satisfies`, non-null, angle assertion)
× 18 positions × intrinsic/local value. Positions include the requested argument, receiver,
storage, return, alias, spread, default parameter, template expression, optional chaining,
comma, both conditional arms and all three logical operators. All 108 intrinsic hazards
matched; all 108 local controls stayed unmatched. None had a parse diagnostic.

Local/imported/namespace/member/shadowed functions, destructured globals, direct root/member
reassignment, dynamic computed global assignment, getters installed with `defineProperty`,
and direct `Object.defineProperty(globalThis, ...)` matched in the tested forms. Bare
`globalThis` and `global` aliases in a sibling test invalidate every listed callee across the
94 row/alias combinations. Other gaps found in the bounded identity extension:

- `with ({Object: {keys(p) { p.x = 1; }}}) { Object.keys(Array.prototype); }` produces no
  match and no TypeScript parse diagnostic: a dynamic binding is accepted as a built-in.
  This ESM-shaped fixture is parse/register evidence only; strict-mode runtime rejection
  means I do not claim preserved credit from this example.
- A sibling `globalThis['unrelated'] = 0` leaves the victim's root safe, and
  `globalThis['Object'] = {}` leaves the victim's `JSON.stringify(Array.prototype)` safe.
  The design says computed global access breaks **every** root; the implementation special-cases
  literal keys instead. These are identity-policy counterexamples, without a separate mutation
  or preserved-credit claim.
- The three destructuring misses in finding 1 are actual preserved-credit failures, not just
  survey omissions. Ordinary direct reassignments alone did not expose them.

The full extension contains 515 cases, including the explicit-argument and all-root checks;
nine deviate from the required expectations: four credited identity shapes, two callback
shapes, `with`, and the two computed-global policy examples. The extended table controls retain
genuine `Object.keys`, local-object writes, primitive
constants and listed optional calls. Intrinsic arguments to assert/comparison operations remain
unsafe. The original probe's special unrelated **dot** global write remains a match for its
own leaf without invalidating unrelated roots. No assert/comparison exemption is proposed.

**Measured figures:** the supplied scratch regeneration was run against `60af5db9` plus the exact
prototype, followed by independent reconciliation. It reproduces 616/314/74/268, 393 register
entries including 295 rule-1 entries, 315 target rows, 110 closed origin records, 32 closure
relinks, 53 closed origins with a held/superseded witness and nine operator-only held members.
The original and current origin-state sets and the 44 transferred-origin set are unchanged.
Both `dispatch:1527:3` and `values:735:3` are held and remain limited. The fresh full `corpus`
execution returns `revalidation_complete`, **306 credited target readings and nine targets
refused by P1-H only**. Its result/states/closures/targets/credit/preserved/register/transfers
summary is exactly equal to the design attachment's summary, including every detector count.
The outputs and the two mapping targets plus seven new extras are recorded in the evidence index.
These are the safe-position prototype's figures, not the coarse rule's future figures and not
evidence of soundness.

| Requested check | Assessment | Closing evidence / limit |
|---|---|---|
| 1. Every table row and argument/result premise | FAIL | Row-by-row audit; 141 explicit-admission probes pass, but callback/no-write and freshness premises fail. |
| 2. Identity, including missing forms and file-wide reassignment | FAIL | Four executed false-preserved identity variants; `with` and literal-computed-global gaps; remaining named forms and 94 alias/root checks pass. |
| 3. Original corpus and wrapper/position cross-product | PASS for the declared finite matrix | Unchanged 81-case corpus plus 216 independent combinations; the wider 515-case search separately exposes the reported gaps. This is not whole-language soundness. |
| 4. Measured figures | PASS as prototype reproduction | Fresh regeneration, full `corpus`, independent operator-only/relink reconciliation; exact equality of the supplied corpus summary. |
| 5. Owner choices and supplied answers | PASS for review scope and reproduced bookkeeping | Two answered limited members held/no credit; no assert/operator exemptions, transfers or target-kill changes. §2 exit invoked as pre-authorized. |

**Required finish under the already-adopted exit (not implemented here):**

1. Apply owner choice 10 §2 directly: every member whose run set references any intrinsic value
   is rule-1 held, with no safe-table exemption. Close this by a structural trace from intrinsic
   recognition to the register and every credit consumer, plus regression checks showing that
   all five attached false-preserved leaves receive no ordinary credit. Do not repair individual
   safe rows or add another syntax exception round.
2. Recompute the register, census, targets, witnesses, closure links and C2-LIMIT under that
   coarse rule. Publish exact lists/counts, retain the two owner-answered limited members,
   category precedence and all 44 transfers. Close by fresh deterministic reconciliation at
   the build's exact revision; if any of the 110 closed origins loses every route, stop under
   owner choice 08 §2.5 and report the affected origins before changing their states.
3. Update the active design/contract/report to cite the triggered §2 rule and replace obsolete
   safe-table credit claims/figures. Keep owner choice 09's no-target-kills rule and BINDING-01's
   classification ownership. Close by a bounded consistency search of the affected producers,
   consumers, tests and active descriptions. The next review checks the coarse rule and its
   figures, as owner choice 10 requires.

**Scope and limits:** no implementation, active manifest, owner record, 007 status or architecture
file is changed on the review branch. Prototype application and manifest regeneration occurred
only in the disposable scratch clone. No whole-language soundness, full packet acceptance,
production/native-code analysis, live-provider run, typecheck or full repository suite is
claimed. Runtime credit fixtures use the repository's synthetic floor record with
`order_model_holds=false`; this does not certify a production Node-floor run. The new review
scripts are independently authored, using repository-owned test helpers. Existing locked
dependencies were installed with scripts disabled; no dependency/source/asset is added,
adapted or redistributed. TypeScript 5.9.3's pinned files and installed Apache-2.0 license,
source header and third-party notices were inspected. Specification links are references,
not copied implementation material.

The [evidence index](design-06-check-03/README.md) gives exact commands, outputs and scratch
identities. The verdict applies to the requested revision 4 only. No acceptance, merge, hold
release or successor release follows.

CHANGES REQUIRED
