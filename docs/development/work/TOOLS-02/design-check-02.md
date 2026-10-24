# TOOLS-02 — design check 02

- Reviewer: Codex GPT-6 session, independently checking the implementer's delta at the owner's request, 2026-10-23 (America/New_York).
- Checked revision: `fbd40fe85c03a7e17ce92c5b4ae5c0e5d7a650fb`, supplied as `origin/claude/tools-02`. Local HEAD and that tracking ref both resolved to this commit; the checkout had no tracked or untracked changes before review.
- Inputs: [design check 01](design-check-01.md), [owner choice 01](owner-choice-01.md), [design 02](design-02.md), and [brief 01](brief-01.md). Design 01 was consulted only for the definitions and audit rules that the delta explicitly inherits.
- Scope: closure of D01-CHK-01 through D01-CHK-06 under the owner's amendment. Accepted parts of design 01 are not reopened. This is a design check, not implementation acceptance, a hold release or a packet release.

The change belongs to repository evidence tooling. It changes no Kernel, Runtime or deployment contract. The architecture and development front doors, evidence/values owners, 006, 017 and the research reading map supplied context; the findings below rest on the scoped documents and source. No full verify, corpus, mutation registry, package suite or production test suite was run. The only executions were small read-only partition and Node v26.10.0 probes described below.

## Findings

### D02-CHK-01 — D01-CHK-01: the owner settled the semantic objection; the replacement record needs an explicit walk-root rule

**Owner settlement: PASS. Record completion: required change.** The old demand to invalidate on enumerated non-fixture content changes is withdrawn by owner choice 01. Design 02 §1.1 correctly states that a code-named path beneath a listed ancestor is enumerated, and that removing an inner non-fixture listing need not change the record. This check does not restore the superseded criterion.

Identity at C also fixes the subsequent-edit problem for the reads that enter the digest: a named bytes read or an enumerated fixture bytes read changes again on its second content edit. The new controls require both edits to be distinguished.

However, the record's partition is not internally consistent. Design 01 §1.2 has **three** classes: enumerated reads, walk-root listings, and named reads. Design 02 lines 56–60 restate only two: an ancestor-listed read is enumerated and “Every other read is named.” Under that wording, `readdirSync('tests')` is a named listing, so lines 33–46 hash its current entry names. Adding `tests/new-suite/unrelated.test.ts` changes that identity even though all new descendant reads are non-fixture and enumerated. The new-directory control at line 105 cannot pass.

Keeping the inherited third class resolves that counterexample, but exposes the other missing case in the displayed formula: a run that lists only `tests/fixtures` has a **fixture walk-root listing**, which is neither named nor enumerated. The formula includes only named reads, enumerated fixtures and root names. It therefore omits that fixture listing's entry identity. After the first pin-relative fixture difference, another entry addition can leave both the digest and the refusal reason unchanged. This conflicts with amended T2-1's “any fixture read” requirement. The existing `FIXTURE_LISTING` in `tests/tooling/test_preserved_tools.py:65` is this direct-listing shape, rather than a recursive walk of `tests`.

**Required completion:** retain a separate class for non-fixture walk-root listings and record only their roots; include the identity of **every** fixture read, including fixture walk-root listings. State how duplicate membership is handled. Add a control that lists `tests/fixtures` directly and changes its entries twice, alongside the declared unrelated-new-directory control. No further owner amendment is needed: this implements the current one.

### D02-CHK-02 — D01-CHK-02: directory discovery is distinguished from fixture input

**PASS for the directory-existence correction**, subject to the record completion in D02-CHK-01 for T2-1 as a whole.

Design 02 §1.2 uses the path's directory kind at C, or at the pin when absent at C, before applying the listing rule. Thus a recursive scanner's `statSync('tests/new-suite')` no longer becomes a fixture merely because the path is extensionless. File reads and absent-at-both paths retain their existing rule. Listings and directory-existence reads under `tests/fixtures` remain fixture inputs, so this is not a blanket suppression of directory changes.

This directly changes the cause in `scripts/packet_tools.py:2037–2045`, where only `listing` receives the directory-specific treatment today. Section 1.4 now specifies both existing-directory and new-directory additions, starts the scanner with no fixture reason, and preserves a fixture-addition refusal. Those controls close the masking problem identified in check 01. Section 1.3 also reports members whose status legitimately changes rather than requiring unchanged counts to conceal the correction. These are design obligations, not executed results.

### D02-CHK-03 — D01-CHK-03: the omitted operation routes are now guarded

**PASS at design level.** Section 2.1 explicitly includes standalone `inventory` output, every digest-producing CLI operation identified in check 01, the direct `preserved_census` snippet route, and `requalify-value-cost.py`. The dispatch and callable-census guards close the two concrete omissions: `inventory` currently returns `source_sha256` from `scripts/packet_tools.py:361–400` through unguarded CLI dispatch, and `preserved_census` currently runs without its own pristine check at line 2493.

The proposed pristine predicate includes revision/HEAD identity, ordinary dirt, ignored entries and Git-invisible directories. Section 2.3 requires refusal controls for all three kinds of extra entry on each supported route and registered guard ablations. The bounded writer vocabulary and its exclusions are explicit; a file hit is no longer claimed to prove that every operation is guarded. `candidate` and `gate` have stated non-fixture roles.

The build must demonstrate each declared guard's ablation, including guards behind another guarded entry point; an ordinary outer-route refusal alone cannot demonstrate that an inner guard is necessary. Also, the present `check-refusal-registry.py` scans `require` calls only in `scripts/packet_tools.py`, so the promised requalification guard must have a registered check in that scanned source or corresponding explicit registry support. These are verification obligations of §2.2, not reasons to reopen the accepted clean-tree predicate or broaden the writer vocabulary.

### D02-CHK-04 — D01-CHK-04: target-invocation binding and the checked source set are specified

**PASS at design level.** Section 3 adds the missing datum: the assertion witness's `{file, fullName}` from the executing callback's `TestContext`, propagated through `AsyncLocalStorage` to helper assertions and compared with the named target. The caught witness retains A's identity when production rethrows it in B. The control-run uniqueness check refuses ambiguous joined names, and M-cross-leaf directly exercises the earlier counterexample. The fresh-error forgery control and real assertion control remain required.

The proposed fields were independently checked on Node v26.10.0 with two wrapped callbacks: the saved assertion error recorded `fullName: "A"`, B's current store recorded `"B"`, and the equality predicate was false. This validates the binding premise, not a future load-hook implementation. The existing witness at `value-cost-witness.mjs:119–137` still records only assertion origin; the design correctly limits the new invocation mode to target runs.

Section 3.2 also supplies the requested source inventory: every JavaScript/TypeScript file in the copied tree outside the stated test-side, dependency and Git exclusions, with an empty set refused. `src/value.mjs`, used by `test_runner_targets.py:68–79`, is included. This replaces the present policy's `packages/**/src` restriction (`value-cost-source-policy.mjs:9–23`) for target runs. The positive and forged-constructor controls must run on that non-`packages` tree. Existing value-cost qualification is not re-reviewed here.

### D02-CHK-05 — D01-CHK-05: execution observations still do not establish each entry's released claim

**FAIL; revise §4 before building its classifier.** The new `unread` class, explicit pre-initialization observation, and incidental-import control are improvements. They do not finish the required per-entry interpretation and attribution.

**Required result remains missing.** Section 4.2 records environment state at core initialization and wrapper entry. Rules 2–3 turn any unclean matching entry into L-01. Those records do not say what the leaf asserts. A leaf can initialize the core cleanly, disturb `JSON.stringify`, make a wrapper call whose result it discards, and assert only `validateCanonicalBytes` on separately constructed bytes. That is still the released post-initialization core result, but rule 3 labels it L-01. Another leaf can make the same calls and assert wrapper fidelity instead; L-01 is appropriate there. The environment records alone cannot distinguish the two required results. This is the remaining part of check 01's requirement to identify the **required result and affected component**, not a demand for a universal dynamic analyzer. BINDING-01's hold release narrows claims by behavior, not merely by whether execution touched the wrapper.

**The proposed invocation attribution also merges hooks with file load and does not bind children.** Section 3.1 deliberately gives hooks no invocation store. Section 4.2 reuses that binding and assigns every record outside a callback to `load`, which applies to every leaf. A `beforeEach` in wrapper suite A can call the wrapper under replacement, restore the environment, and finish successfully. Its unclean wrapper observation becomes `load`, so a separate core-only leaf in suite B is also labeled L-01 even though its own execution stays inside the released claim. This reproduces the file-level overclassification D01-CHK-05 required the delta to remove.

The Node v26.10.0 probe below returned `"load"` for the hook, `"wrapper suite > A"` for A, and `"core suite > B"` for B; both tests passed. The probe models the proposed callback binding and record fallback, not an implemented environment witness:

```js
import { test, describe, beforeEach } from 'node:test';
import { AsyncLocalStorage } from 'node:async_hooks';
const invocations = new AsyncLocalStorage();
const wrap = callback => function (t) {
  return invocations.run({ file: t.filePath, fullName: t.fullName }, () => callback(t));
};
const record = label => console.log({ label, invocation: invocations.getStore() ?? 'load' });
describe('wrapper suite', () => {
  beforeEach(() => record('wrapper call in hook'));
  test('A', wrap(() => record('A body')));
});
describe('core suite', () => {
  test('B', wrap(() => record('B body')));
});
```

Run with Node v26.10.0 and `--input-type=module` on stdin. Separately, a child launched by `execFileSync` inside a wrapped callback had no parent `AsyncLocalStorage` store. `NODE_OPTIONS` loads a preload; it does not carry the parent invocation identity. The reused reads mechanism records a PID and preload marker (`read-trace.mjs:31–35,65–66`) and counts child preloads (`packet_tools.py:2027–2029`), not a leaf-to-child relation. Design 02 defines no replacement relation. One observed child therefore cannot resolve another child's missing observation, and a child's `load` record must not be applied to unrelated parent leaves.

**Required completion:** use the runtime observations as evidence for a recorded interpretation of the leaf's required result, component and relevant initialization, or specify a narrower sound classification rule that leaves ambiguous cases `unread`. Manual readings may be limited to cases the mechanism cannot settle; this check does not require reading every leaf manually. Distinguish genuine file-load observations from hook execution and bind child observations to their launching invocation, with completeness per relevant child. If attribution cannot be established, retain `unread` without an L-01 claim.

Keep the declared controls and add: an incidental executed wrapper call beside a core assertion; a dirty wrapper hook confined to one suite beside a clean core suite; and two child launches where only one loads the preload, including launches from distinct leaves. The observed-surface bound at lines 264–266 does not cover these errors: they arise on executed paths and listed intrinsics. A 017 entry may record remaining observation incompleteness, but cannot itself make these unsupported `limit`/`not_held` classifications satisfy T2-4.

### D02-CHK-06 — D01-CHK-06: the audit sample is independent of the frozen dispositions

**PASS at design level.** Section 5 freezes all dispositions and rationales at H's C before the independent reviewer chooses and records a seed bound to full H. The deterministic sampler prints both the sample and population digest. The implementer can no longer choose the retired population with knowledge of the acceptance sample.

The rate bound is explicit for a smaller population: `floor(0.02 * n)`, with a census when fewer than 150 origins are retired. The re-audit rule requires re-triage of the failed class × source-packet strata, a fresh reviewer-selected sample at the next candidate, correctness of every previously sampled origin, and stopping after the second failed audit. The implementer's fixed-seed self-audit supplies no acceptance-bound evidence. Relevance samples also use reviewer-selected seeds. This closes the seed/population dependence, repair-loop and denominator findings; it does not change the owner's authority to judge T2-5's reported error rate.

## Disposition and validation

| Earlier finding | Closure under owner choice 01 |
|---|---|
| D01-CHK-01 | Semantic objection settled by the owner; D02-CHK-01 identifies a required completion of the amended record, without restoring the old criterion. |
| D01-CHK-02 | Directory-existence cause closed; overall T2-1 still needs the walk-root completion. |
| D01-CHK-03 | Closed at design level by explicit operation routes and refusal controls. |
| D01-CHK-04 | Closed at design level by invocation binding and the generalized source inventory. |
| D01-CHK-05 | Not closed: required-result interpretation and per-leaf attribution remain unsound. |
| D01-CHK-06 | Closed at design level by the frozen candidate, reviewer seed and re-audit rules. |

The remaining classification defect has the same cause as check 01: metadata about execution is being promoted into the semantic scope of a required result. Replace that inference for ambiguous entries instead of extending the list of conditions that automatically mean L-01. The walk-root record correction is bounded and separate. Nothing here reopens the owner's `recorded_limit`, L-16 or range-1 integration choices, or decides the unrelated carried questions from design 01.

Validation: pinned-source inspection; a read-only Python model of the two written partitions, including a direct fixture walk root; the Node v26.10.0 invocation, hook and child-store probes; Markdown local-link and diff checks. No implementation or fixture was changed, no third-party source or dependency was incorporated, and no full verify was run. The report itself is the reproducible review evidence for the new counterexamples; the next design/build must carry them into its controls.

REDESIGN
