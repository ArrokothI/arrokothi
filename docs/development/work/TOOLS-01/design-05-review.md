# TOOLS-01 — implementer review of design 05 revision 2

**2026-10-03; Codex, GPT-6 per owner assignment; step 0, before implementation.**
**Disposition: CHANGES REQUIRED. Design not accepted for implementation.** This is the implementer's
design review, not independent packet acceptance. TOOLS-01 remains IN_PROGRESS.

## Identity, access and authority

The matching checkout is `/Users/linzhenglin/Desktop/ArrokothAI/agent-kernel`, branch
`codex/tools-01`. After fetching, the tree was clean and both HEAD and
`origin/codex/tools-01` were `b48e05fe318b82715dfa347c0097dee6c830e957`.
The configured origin still uses `https://github.com/ArrokothI/agent-kernel.git`; it was not changed.
An independent `git ls-remote https://github.com/ArrokothI/arrokothi.git refs/heads/codex/tools-01`
returned the same full SHA. The sibling `arrokothi` checkout is on another branch and was not used
for this review; only its origin was fetched while locating the requested checkout.

Reviewed the complete AGENTS.md, 006, 012, live revision-2 contract, design 04, design-04 check,
design 05 revision 2, design-05 check, tooling README and `scripts/packet_tools.py`.
Read the whole-system model, evidence-attribution owner, 016's root causes, research reading map
and its evidence-tooling/strict-validator-testing/Problem-2 background, owner choice 01, current
checks and verification specifications, assertion reporter, oracle adapter and the existing
coverage helper. Inspected changed historical test sources relevant to residue handling.

The cumulative design and the full
`git diff 08e0890e b48e05fe -- docs/development/work/TOOLS-01/design-05.md`
were reviewed, including every D05-CHK-01 through -12 disposition. The owner's supplied answers
are preserved in [owner-choice-02.md](owner-choice-02.md). The implementation prompt explicitly
requires stopping, rather than patching around a defect that needs a design change; 006's
working principles and planning-defect rule agree.

## D05-REV-01 (P2): changed or removed effectful declarations can earn false preservation

**Locations:** [design 05 §2.2, D05-CHK-07](design-05.md#22-the-design-05-check), line 103, and
the embedded option-C P1-P row, line 163, at the reviewed commit.

The revision-2 tightening disqualifies inserted effectful declaration initializers and inserted
expression statements anywhere in the residue, including hooks. That closes the insertion case
more strictly than the check's top-level-only rule. However, its other branch still permits a
**changed or removed declaration whose bound names neither the member nor its same-file helpers
reference**, without checking what evaluation of that declaration does.

A hook assigned to an unused binding is an ordinary counterexample. Changing its existing numeric
literal inserts no call, assignment, expression statement or hook. Removing the declaration also
inserts nothing. Both edits qualify under the changed/removed-unreferenced branch, although they
change the input seen by an otherwise byte-identical test.

Reproducer, independently written for this review (save as `probe.test.mjs` in a temporary directory):

```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
const input = { length: 1 };
const unusedHook = beforeEach(() => { input.length = 33554432; });
test('same preserved member', () => {
  console.log('OBSERVED_INPUT=' + input.length);
  assert.ok(input.length > 0);
});
```

Run `node --test --test-reporter=tap probe.test.mjs` for each variant:

| Variant | Only source edit | Observed input | Exit / tests / pass / fail |
|---|---|---:|---|
| Original | none | 33554432 | 0 / 1 / 1 / 0 |
| Changed declaration | Replace `33554432` with `16777216` | 16777216 | 0 / 1 / 1 / 0 |
| Removed declaration | Delete the `const unusedHook = …` line | 1 | 0 / 1 / 1 / 0 |

All three were actually run in fresh processes with Node **v26.8.1**, Python **3.13.7**, macOS.
This is not a Node-22.9 floor result. The defect is in the permitted source transformation, not in
V8 coverage offsets or reporter event ordering.

The test registration span and assertion are identical in all three versions; its literal title
passes, no test-side helper is called or changed, and there is no held claim or production module.
`unusedHook` has no reference in the member or any same-file helper. The preservation rule would
therefore report the same test-side input and assertion while the observed input differs.
This is not the stated limit that an already-vacuous historical test stays vacuous: test-side setup
has changed, which is precisely the fact P1-P claims to exclude.

**Mechanism and adjacent cases.** Liveness of a declaration's result binding does not establish
absence of effects from evaluating its initializer. The same issue applies to changed or removed
fixture-registration, shared-fixture mutation, and environment-setup calls. The insertion-only
guard was the missing dimension in the revision delta; its listed negative fixtures do not vary
change/removal of an already-present effectful declaration.

**Required design outcome.** Revise the allowed changed/removed-declaration class and the P1-P
contract text so effectful test-side setup cannot earn preservation just because its result name
is unreferenced. Route such members to structured targets, or specify another bounded mechanism
that establishes the required setup fact. Include both variants above in the maintained negative
corpus, and exercise insert/change/remove for hooks and initializer effects. Recount any resulting
residue-disqualified members and adjust E2 if necessary. This does not require a sound general
JavaScript analyzer; a conservative refusal of uncertain preservation is sufficient.

This is a design change: refusing the two demonstrated edits would narrow an explicitly permitted
P1-P closing route. No such narrowing was silently implemented, no contract patch was modified,
and no free-form residue review was substituted.

## Whole-design and revision-delta coverage

These are assessments of the proposed mechanisms, not implementation PASS results.

| Obligation | Review result |
|---|---|
| F1, F2, P1-G | Exact Git/provenance identities remain separate from semantic coverage. Sealed sources cannot enlarge the origin set; minimum contexts and mixed-origin member links are retained. Existing inventory and corpus were rerun. |
| F3, P1-M | Multi-edit applicability, target-set failure identity, structural/filtered/generated census and complete sealed outputs remain distinct checks. The amended equivalence and attributed-survivor routes resolve the missing V5 destination without promoting either route to a kill. Discovery remains metadata. |
| F4 | The amendment adds declared environments and an environment-read census. This addresses the check's inherited-environment and missing-variable cases at the stated lexical scope. A1–A9 and the Node floor remain execution gates, not design-review evidence. |
| F5, F6, P1-C | Anchor/token/reach/reading/preserved/held/profile counts stay distinct, with no acceptance or hold-release inference. Version-1 mappings cannot supply revision-3 completion. No dependency or third-party source is introduced by this review. |
| P1-T | D05-CHK-01 through -04 are carried into the design and amended row: call-start offsets, non-observable caught regions, full-path leaf/run validity, count versus baseline, module inputs, positional literal tokens, counterexample-bound mutation credit and a counted reading route. The same-file-helper, `if (…) throw`, synthetic-event and catch details in §2.2 remain necessary when implementing the abbreviated contract row. |
| P1-P | **Fails D05-REV-01.** The new inserted-call/hook exclusion is understood as applying anywhere in the residue; `describe`/`suite` text stays in it. The changed/removed-unreferenced class still admits the counterexample. Production-change labels correctly narrow the claim to test-side preservation. |
| P1-H | The widened minimum recipes, transitive same-file/test-side helper search, recomputation and classified `not_held` route address the checker’s missed helper-built Proxies. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. The register remains a guard with stated gaps. |
| P1-R | All 116 suite and eight case rows require revalidation; the 30 non-executable rows require recheck. No grandfathering. The corrected 1,466 and 900 registration counts were independently reproduced. |
| P1-X | Set-valued triage retains a linked member and additional prose variants together. All-path area coverage, unconditional verification and B..H scope are explicit, so omitting a spec entry is not a waiver. The design author, not this implementer, owns the later 007 entry. Sealed-log extraction remains inside TOOLS-01 under the supplied owner choice. |
| P2 and order | Steps 0–12 retain clean-C evidence, exact C/H, cumulative self-review and separate independent acceptance. Step 0 does not pass; steps 1–12 were not started. No local fix was applied. |

**Residue and sizing.** The stricter insertion rule is material: for example, the new
`runOutcomeArm`/`hiddenOutcomeActivity` bodies in `nondisclosure.test.ts` and the added helper/suite
text in `values.test.ts` contain calls outside historical leaf spans. They cannot be waved through
as additive declarations under the stated anywhere-in-residue rule. Their members need explicit
routing in the step-6/8 census, subject to hold attribution.

An independent read-only TypeScript 5.9.3 parse of the 71 pinned test-file origins reproduced
1,466 registrations: 1,399 literal, 57 template, 10 computed; 63 identical origins represent 52
paths and 900 registrations. The eight changed or moved origins have 372 registrations, with
329 exact historical call texts retained and 43 changed. The parser recognised `node:test` import
bindings, not arbitrary `.test()` properties. This supports the corrected D05-CHK-12 figures,
not preservation credit.

The approximately 170 register matches are a planning estimate, not a completed register. The
design's 82 Proxy + 85 built-in + 5 V-ENV matches overlap and also need V-D1 routing. My narrower
read-only direct-call scan found 74/69/5 at one helper level and 138 distinct members including the
V-D1 file/title matches; following identifier calls further found 77/77/5 and 142 distinct members.
That diagnostic scan does not follow callback values or general alias flow, so it neither
reproduces nor disproves the author's broader estimate and is not the required register census.
At the stated 3–5 minutes per match and six-hour days, 170 classifications alone take roughly
1.4–2.4 days. The approved 1.5–2-day classification allowance and E2 8.5–10 days are estimates,
not caps or authorization to omit matches. The full transitive register/classification remains
step-6 work; its exact size was not certified here.

## Checks and limits

- Extracted the first embedded diff (option C), unchanged: 55 lines,
  SHA-256 `43c448d05645689b8af2315582c3328e1b19f83156f82e54f849d0662b647701`.
  `git apply --check` and `patch -p1 --dry-run` both exited 0 against the live contract, without
  offset or fuzz. The live contract was not patched.
- `npm run test:packet-tools`: exit 0; **158 tests, 28.638 seconds, OK** on Node v26.8.1 /
  Python 3.13.7. These are existing-tool baseline results, not revision-3 or floor validation.
- Existing `inventory` and `corpus` functions at the reviewed full SHA: 208 artifacts/fences,
  1,333 mentions, eight additions; 1,549 origins; suite 116, case 8, non-executable 30,
  **pending 1,395**, result `extraction_pending`.
- The three residue variants above ran only in a temporary directory. Their complete source,
  exact transformations, command and observations are preserved here for the next build's corpus.
- No historical runner, mutation registry, full repository suite, typecheck or composed verify
  was run for this documentation/design review. No Node download or installation was attempted.
  Node v22.9.0 assumptions A1–A9 remain unverified.
- No new primary-source research, dependency, copied or adapted third-party source, production,
  Layer-3, sealed-record, 007 or `fault-oracle.ts` change. The earlier check's runtime probes and
  all 83 pending artifact contents were not independently re-executed/re-extracted in this pass.

## Handover

The only repository changes in this batch are this review and `owner-choice-02.md`. Final diff
validation, commit, non-force push and the advertised remote head are reported in the session's
handover; this record does not name its own containing commit.

**Exact remainder:** resolve D05-REV-01 in the design and option-C diff, review that change, then
finish step 0 by accepting and applying the amended contract if sound. Next install and checksum
exact Node v22.9.0 and execute A1–A9 with the required stop behavior, before steps 2–12. All P1/P2
implementation, migration and independent acceptance remain outstanding. Owner answers are already
recorded and need not be requested again for unchanged choices. No hold or successor is released.
