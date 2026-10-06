# TOOLS-01 — design 06 check

2026-10-05. This Codex session is identified to me as **GPT-6**, the review-01 reviewer.
A finer serving-model identifier and session UUID are not exposed. This is a design check,
not acceptance of a corrected implementation. The design still permits false credit through
unrecognized write receivers, insufficient member identity, and assertion provenance inferred
from incomplete stacks. Four finishable design changes are below.

## Subject, authority and limits

| Item | Exact subject |
|---|---|
| Design 06 / fetched `origin/codex/tools-01` | `56af8c4ea224e985598a880cfe45329769e88ac8` |
| Contract revision 8 | `e39a8b10db014e6798b781e278b2b8e80ed35959` |
| Owner choice 08 | `9e84b587fe349c16702c008c0df9e14897067d7e` |
| Earlier reviewed H | `446dd25820500db4e0eb3d6940ec49e45634f39c` |
| Local review branch, based directly on the design commit | `codex/tools-01-design-06-check` |

I used my separate worktree at
`/Users/rex-shih/.codex/worktrees/tools-01-review-01/arrokothi`, not the shared checkout.
Access covers local source/Git history, shell execution and remote reads subject to sandbox
permissions. I have no access to the uncommitted prototype or another session's private execution
state. The prototype's measurements are claims evaluated for plausibility, not reproduced results.

I read design 06, contract 8, choice 08, review 01 and its root-cause note, and the requested
review 02/brief 02. Review 02 supplies the requested fidelity questions; it does not determine my
soundness judgment. Brief 02's option (a) and Q1–Q4 are superseded. The owner's three answers in
this design-check request are binding: existing category holds retain their owners; unread child
processes match V-ENV; and P1-H witness links can keep the 18 origins closed.

I compared the proposed mechanisms with the existing recipes, target runner and adoption records,
including the two C2-LIMIT extras. I used the architecture and slice-audit guidance proportionately.
I did **not** run composed verify, the full corpus, the prototype, or another cumulative acceptance
review. No candidate implementation, hold, owner record or contract was changed. One small Node
event experiment is attached; all of its source execution occurred in temporary directories.

## Mechanism assessment

| Obligation | Design judgment and remaining boundary |
|---|---|
| R1-01 | The expanded run set and alias/cast analysis address the reproduced family, including helpers, hooks and load-time code. However, the explicitly unsupported descriptor-result writes can still receive ordinary credit. `residual` is another recognition filter, not a complete unknown disposition. Change 1 is required. |
| R1-02 | A shared block parse addresses the extraction mismatch at its cause. Uncertain parses explicitly refuse closure. Finish its closing-delimiter rule and distinguish fence origins from other origin kinds; change 4 specifies the adjacent corpus dimensions. |
| R1-03 | Exact equality with the decision's pinned list replaces mere decision-file existence with positive membership. The proposed extra/missing/swapped/closed/stale-count controls cover my original and adjacent cases. The reviewed decision/list association remains the human authorization boundary; a self-consistent new list and digest cannot independently authorize a 45th transfer. |
| R1-04 | Keeping event kind, cause and frames fixes the lost skip/error distinction. Test-side-only frames do not establish where an assertion originated, and the serialized cause is not a local `AssertionError` instance. Change 3 is required. |
| Choice 08 §2 structural check | Sound with the owner's answers applied: rule-1 matches cannot use an earlier `not_held` reading as an override; category entries keep their existing governing decisions. Missing attribution refuses visibly. The proposed refusal fixtures must exercise each branch, including wrong-category decisions and a V-ENV match left `not_held`. |
| C2-LIMIT | Exact refused/unbound-set equality is the right mechanism, but equal literal titles do not establish that rule 1 caused that member to lose its binding. Change 2 is required. |

## Required design changes

### 1. Give the known unsupported write family a no-credit disposition

**Site:** design 06, R1-01 “Left open.” This independently constructed test-side shape falls directly
in the design's admitted gap:

```ts
const descriptor = Object.getOwnPropertyDescriptor(Object, "prototype")!;
descriptor.value.toJSON = () => 42;
```

It writes the ambient object prototype through a descriptor result. The receiver is not among the
defined intrinsic-like forms; the reflection call is an escape exception; the old regex minimum
does not match; and the source need not spell an intrinsic `.prototype`. No listed match necessarily
holds it, nor does the described `residual` selector necessarily list it. Used in a formerly
preservable test, it would retain the same false-credit route as R1-01. This is a prediction from the
design, not a claim to have run the unavailable detector.

**Finish:** specify a bounded, explicit disposition for unsupported receiver/call-result and unread
code cases relevant to the hold analysis. A recognized match is held under choice 08; a known
uncertain case must refuse credit or remain visibly unresolved. Merely reading the six selected
residuals must not authorize unmatched uncertainty. State which consumers enforce that disposition
(preservation, targets, witnesses/closures and summaries), and how the residual census includes it.
This does not demand a sound analyzer for all JavaScript or authorize new hold scopes.

**Corpus:** retain every original direct/alias/cast/imported-helper/generated-source probe and the
planned adjacent cases. Add the descriptor-result form above, its helper-returned/destructured
variants, and an unread native/helper boundary within the declared analysis domain. Pair these
with the supported local-object and read-only controls. Each uncertain case must demonstrably
produce no suite/preserved credit and a visible reason. Pinning the eight existing leaves alone
would not distinguish the proposed incomplete detector from the required behavior.

### 2. Bind each C2-LIMIT extra to its actual current held leaf

**Site:** design 06, C2-LIMIT's literal-title equality. Construct a refused, target-less member `M`
in one of the four limited origins, titled `same title`. Put an unrelated rule-1 held leaf `L` with
that literal title in another test file, and list `{member: M, held_leaf: L}`. Every stated extra
predicate holds, but rule 1 did not leave `M` unbound. The exemption can conceal unresolved in-scope
work. Another suite in the same file gives the adjacent collision.

**Finish:** define positive cross-revision member-to-leaf identity/provenance and require it for
the extra, in addition to set equality. State what happens for duplicate titles, generated titles,
missing mappings and ambiguous mappings: none may create an exception. Keep the original 24
refused and unbound, and permit extras only for the four authorized origins when rule 1 is actually
the reason for the unbound result. A title alone is insufficient evidence of that reason.

**Corpus:** other-file same title, same-file/different-suite same title, ambiguous/missing leaf,
extra outside the four origins, and a valid unique member/held-leaf link. Include both actual extras
as positive controls. Their existing preserved rows have `current: null`, so the design must explain
the mapping instead of assuming that field supplies it. Historical `dispatch:1426:3@5a8d958ffdab`
currently has a separate target at declaration 1459:3, which is useful positive evidence.

### 3. Establish assertion provenance, not just plausible error metadata

**Site:** design 06, R1-04. The attached [experiment](design-06-check/probe_assertion_frames.py)
and [observations](design-06-check/assertion-frames.json) use a production function that throws
`new AssertionError({actual: 0, expected: 1, operator: 'strictEqual', stackStartFn: value})`.
Its test calls `value()` before `assert.equal`. The target assertion never executes. Nevertheless,
the event has `testCodeFailure`, name `AssertionError`, code `ERR_ASSERTION`, and only the target
file among non-Node frames. Node explicitly permits frame omission through
[`stackStartFn`](https://nodejs.org/api/assert.html#new-assertassertionerroroptions).

Thus a production assertion with an omitted frame meets the stated frame predicate. No string
stack forgery is needed. Conversely, literal `instanceof AssertionError` in the isolated-run
reporter is false even for the ordinary target assertion in this experiment. Choosing name/code
instead must not silently make origin trustworthy. The experiment observes Node events; it does
not assert that the unavailable prototype actually reports a kill.

**Finish:** define the positive evidence that an assertion in the declared target or its qualifying
test-side helper executed and failed, including how that evidence survives process isolation.
Unknown origin, missing/unparsed frames, truncated/omitted frames and non-assertion exceptions
must not become kills. State the trust boundary explicitly; an absence of production frames is
not positive evidence of an assertion site. Keep the existing wrong-leaf and reach controls.

**Corpus:** retain the planned assertion/TypeError/skip/todo/cancellation/timeout/renamed-target/
production-assertion/plain-error/helper-assertion cases. Add the attached trimmed-stack case,
missing/malformed provenance, and a qualifying failure mixed with an invalid expected target;
the invalid evidence must not be masked by finding one qualifying failure. The passing control
and genuine target/helper assertion must remain usable. Clarify that leaf-level invalid outcomes
do not collapse F3's existing runner `timeout`, `output_limit` or malformed-result categories into
`setup_error`.

With v26.10.0 first in PATH, reproduce from the repository root:

```sh
python3 -B docs/development/work/TOOLS-01/design-06-check/probe_assertion_frames.py
```

The retained run's four child commands were each
`node --test --test-reporter=./reporter.mjs target.test.mjs`: passing control exit 0 / 0.216 s;
target assertion exit 1 / 0.082 s; production assertion exit 1 / 0.081 s; trimmed production
assertion exit 1 / 0.082 s. These are diagnostic observations, not mutation kills.

### 4. Complete the shared-parser boundary and its corpus

**Site:** design 06, R1-02. Same delimiter and sufficient length are not the entire closing rule:
after a CommonMark closer only spaces/tabs are permitted. Consider these consecutive lines inside
a valid tilde-fenced JavaScript template literal:

```text
~~~ not-a-close
## still code
```

A parser using only the stated character/length rule closes too early and can omit the subsequent
required record from minimum context. The shared parser would make both consumers consistently
wrong. The [CommonMark fenced-code specification](https://spec.commonmark.org/0.31.2/#fenced-code-blocks)
supplies the missing distinction; the design should state it and maintain the counterexample.

**Finish:** specify the accepted closer suffix/indentation and how unsupported block forms refuse.
Delimiter-looking lines that are valid literal content inside an open fence must not be mistaken
for closers. Qualify “unless the origin is a recognized closed fence”: that predicate applies to
fence origins, not test-file/helper/non-executable origins with other contract routes. Keep each
kind's existing minimum context and CONT-04 reference obligations; whole-file area assignment
for uncertainty is not permission to close an uncertain origin.

**Corpus:** alongside the planned longer/mixed delimiters, HTML, indentation/list/quote, unclosed
fence and mention-inside-fence cases, add a same-character apparent closer with trailing text,
a shorter same-character run containing a heading, a valid closer with trailing whitespace,
and a required record after the true closer. Keep the full-context/backtick controls and
CONT-04 reference-form tests, plus one positive non-fence closure. This is a finite grammar/test
completion, not a request to implement all CommonMark.

## Scope and measured figures

The conservative holds, child-process cases and retained category ownership are authorized by
choice 08 and the owner's answers. They do not release held semantics. Transferring per-test
V-ENV classification to BINDING-01 is distinct from transferring more origins to TOOLS-02.
Only the existing 4 + 40 origins may be transferred; R1-03's reviewed lists must remain exact.
The new choice-04 attachment must restate the committed table, with decision/list identity and
digest recorded for independent review. A digest validates bytes, not owner authorization.

No changed meaning for `revalidation_complete`, a kill, preserved credit or the advisory gate
is authorized. Eighteen valid P1-H relinks can leave all 110 origins closed without weakening
completion; list their routes. Changed mention-section bounds can legitimately change advisory
gate counts while the gate remains unconditional/advisory under choice 07. The stated helper
key named `constructor` repair is an in-scope tooling correction; keep its separate provenance.

| Prototype claim | Plausibility from design and current corpus |
|---|---|
| Members 766/125/74/307 → 714/182/74/302 | Both total 1,272. Net 52 preserved and 5 refused become 57 held; unchanged superseded count fits retained category ownership. Historical members and current register leaves are not one-to-one. Plausible, not verified member by member. |
| Targets 391 → 381 | Ten current targets match the described withdrawals: six at values 893/910 and dispatch 178/615/1459/1529; one each in fault-oracle, fault-sweep and poison-catalog; and creation 516. The other two newly held write leaves need not have targets. |
| Register 226 → 304; 187 V-ENV | Existing 107 V-ENV + 49 new leaves + 29 cases + 2 former `not_held` = 187. Register size adds only 49 + 29 = 78. With 97 existing category entries and 20 remaining `not_held`, 187 + 97 + 20 = 304. |
| 18 relinked, none reopened | Allowed by the owner's P1-H answer. Requires valid witnesses and unchanged minimum-context coverage. Under a literal universal “closed fence” requirement it would not follow; change 4 removes that inconsistency. |
| dispatch:1426:3 newly unbound | Plausible: its current target is the strict-subprocess leaf at 1459:3, which match 4 now holds. It can join the limited set only with the positive mapping required in change 2. |

I find no arithmetically impossible measurement. These are not required output constants: resolving
unknowns may change them. Recompute at the correction's C, preserve the stated distinctions, and
apply the owner's stop condition if any of the 110 loses every contract closing route.

The mechanism gaps in changes 1–3 require a revised design argument before code; the parser
completion in change 4 is bounded. This check supplies no permission to implement a chosen patch
or release a successor. Return the revised design for its mandated check.

CHANGES REQUIRED
