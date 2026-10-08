# Final cleanup 01 — TOOLS-01

## Authority and exact subject

Recorded 2026-10-08 by the owner's delegated final-cleanup agent, Codex (GPT-6 per session
instructions; exact serving build unavailable). The owner's current message invokes Prompt C in
[009](../../009-universal-prompts.md), supplies the identities below, authorizes administrative
commits and a non-force push of `codex/tools-01`, and requests a PR to `main`. The owner retains
the manual merge. This is cleanup, not a new independent acceptance or an integration receipt.

All checks and edits used a fresh, private clone at
`/Users/linzhenglin/Desktop/ArrokothAI/tools-01-final-cleanup`, cloned from
`https://github.com/ArrokothI/arrokothi.git`. No shared checkout was switched or modified.
The existing local worktrees were read only for initial discovery and policy reading; those
policy bytes were checked equal to the pinned branch before relying on them. Reruns below ran
serially in the fresh clone, with outputs outside it. Historical attachments were not overwritten.

| Identity | Checked revision |
|---|---|
| Base B; fetched remote `main` | `f62527e8d564a6e2f63b83cbb52e24053f333540` |
| Payload C | `83094969e591dba5c4f25d19c572522b78a7a396` |
| Independently accepted H | `a50c38867c93c63094f271d099cec71624382577` |
| Independent review 06 recording commit | `82b09e1f9ddbfe60e86a64f4adbdb8feab67e9c4` |
| Acceptance transcription A; inspected local/remote pre-cleanup head | `c411391019b4c7961439057f0a23b30b310faed7` |
| Governing 006/008/012 baseline | `b759d0abc01915ea5abc94b4607c6f9101bbbcc7` |

The subject is [contract revision 11](contract.md), SHA-256
`fc0453fe93392d8721b41cf29a0b203650f1ba2d2f9bd2bc9ae2069a1cf5ebe3`, owner choices 01–11,
and [implementation 04](implementation-04.md). The release is [release 01](release-01.md).
DESIGN-AUDIT-01's accepted H `ce0b5a7098a9f65cf16dc55ce6eb013946564508` and integration
`c65894e7b907fd8ce6a4f8b4dd13b8646c84d955` are ancestors of B; its
[discussion](../DESIGN-AUDIT-01/discussion-01.md) records owner closure. Prerequisites are met.

## Acceptance, cumulative scope and post-review changes

[Review 06](review-06.md) is the authentic independent ACCEPT: a fresh Codex/GPT-6 session,
2026-10-07, session `01a1186b-ede4-7ef2-b760-24697adf9eae`, with its independence, access and
bounded search stated there. It accepts only H. The current owner handoff identifies this record;
the committed report and accessible raw evidence agree. Cleanup does not claim access to the
reviewer's original private transcript or independently authenticate its recorded owner-message
provenance beyond the retained evidence and the present owner's authority.

- B..C has 344 changed paths; B..H has 345. The cumulative source/evidence inventory, changed
  pre-existing files, contract/owner decisions, tooling entry points, fixtures and connected
  recognition → register → member/target → witness/closure/limit paths were inspected. This is
  a final compatibility/evidence check, not a replacement soundness review of every unchanged helper.
- The cumulative payload adds the packet verifier, provenance/adoption inventories, isolated
  mutation runners, negative controls, coarse intrinsic-contact rule and advisory area report.
  No `packages/` or `mental-model/` path changes. The lockfile changes only the root Node engine
  floor, not a dependency. Root instructions/README/package metadata adopt Node 26.10+ under
  choice 03; the supported SDK's runtime declaration is unchanged.
- The sole existing conformance-test edit is the host-handle floor fix in
  `fast-slow-equivalence.test.ts`, authorized in [node-floor-04](node-floor-04.md). Its assertions
  remain; the added interval keeps the host alive and is cleared in `finally`. It changes no
  production timer, Effect or Activation semantics.
- C is H's direct parent. C..H is exactly `implementation-04.md` and 007. H..A adds only review 06
  and its 16 directory entries (README, manifest, raw outputs and reproduction scripts), then
  the TOOLS-01 ACCEPTED row. The review scripts are review evidence, not altered verifier inputs.
  A's row faithfully names H, C, B, review identity, optional P3 and successor hold. **A already
  exists and is not duplicated.**
- Earlier sealed-record exceptions were checked against review 06's audit: the disclosed
  `28258b28` change removes trailing whitespace from 13 review-01 excerpts and choice 09, updating
  only the corresponding manifest sizes/digests. This cleanup changes none of those bytes.
- Fetched `origin/main` equals B and is an ancestor of H and A. There is no base-to-main delta,
  conflict or intervening change to invalidate acceptance; no merge or rebase is needed.

Cleanup changes only this record, the cleanup link/status in 007, and the in-place owner account
in [014](../../014-owner-progress-summary.md). Historical reports, reviews, decisions, contract,
executable source and fixtures retain their pre-cleanup bytes. No unreviewed reference payload is
being included, and no substantive finding requires reopening or a documentation correction.

## Checks and evidence reuse

Fresh checks used Python 3.13.7 and Git 2.39.5 (Apple Git-154) in the private clone. Node is v26.8.1, below
the packet floor; no Node suite or claim of a floor-qualified runtime rerun is made here.

| Check | Result and provenance |
|---|---|
| Exact `candidate --payload C --head H --spec .../verification.json` | Rerun: `facts_verified`; ancestry, direct parent, exact C..H allowlist, preserved paths and B..H whitespace checks pass. |
| Review-06 `audit_records.py` | Rerun with only its output directory redirected outside the clone: 363 checks pass, none fail. Includes six plain patch applications, decision bytes, all lists, members, targets, witnesses, closed routes and numerical reconciliation. |
| Review-06 attachments | All 15 manifest entries have the recorded size and SHA-256. The complete gzip decompresses to 2,508,880 bytes; SHA-256 `83463d5f8272f22e2f11d45e109cb749a3fccdee77bb79e08f31e9e5ab63c65c`. Regenerating the summary outside the clone reproduces its committed bytes exactly. |
| Inventory at A | Rerun: `provenance_verified`, all 208 artifact/fence, 1,333 mention and eight additional origins. |
| Advisory area report at A | Rerun: same 69 behaviour paths, 69 distinct open origins (64 pending, five pending revalidation) and 664 ungated origins as the accepted evidence. Additional review/administrative paths touch no area. |
| Administrative closure | Exact three-file scope, historical-byte conservation, 238 local links/anchors checked with no errors, and `git diff --check` for the cleanup delta and staged changes. |

The **full verification is inspected pinned evidence, not a cleanup rerun**. Review 06's
[run record](review-06/verify-run.json), [raw output](review-06/verify.json.gz), stderr and
[summary](review-06/verify-summary.json) bind the solo fresh-clone run to clean C before and after,
Node v26.10.0, Python 3.14.6, 2026-10-07 22:13:32–22:48:38 UTC. All 13 steps pass:
573 tooling tests; provenance and adoption reconciliation; dimension reporting; 109 registered
probe-route kills; 314 refusal mutants; 314/314 refusal and 29/29 oracle census checks; typecheck;
3,774 repository tests and four archive tests with no failure/cancellation/skip/todo; kernel sweeps;
and the advisory area report. The independently captured 136/136 coarse-rule probes also remain
available and digest-verified, not rerun here.

Reuse is valid because C's code, tests, fixtures, command specifications and dependency identities
are unchanged through H, A and this administrative cleanup; remote main adds nothing. Neither the
old command output nor its candidate identity is relabeled as a run on the cleanup commit. The
new status prose is checked as administrative prose. The full composition's live-provider,
large-memory-timing and known-base-failure/builder-docs profiles remain explicitly **not run**.
Registered probe kills are not adoption kills: adoption still claims zero kills and 15 readings.

## Optional P3 disposition

**TOOLS01-R6-PRECISION-01: addressed in this explanatory record; no candidate edit.**
Implementation 04 remains historical. Use these precise labels for its two reported quantities:

1. **Relinks and transfers:** `coarse-rule/relinked-origins.json` has 80 rows: the union of 18 prior
   and 70 current relinks is 78 distinct origins, plus two other choice-11 transfers. The attachment
   contains 77 currently closed origins and all three transfers; two transferred rows have no
   `relinked_by` label. It is not a list of 80 distinct relinked closures.
2. **B..C plus declared administrative paths:** literal B..C has 344 changed paths. The accepted
   area report has 345 because it includes the declared implementation-report path. Its counts,
   credit decisions and 107 closed / 47 transferred totals are correct.

Review 04's LIST-01 and OVERLAP-01 were already closed by review 06. Its committed lists reconcile:
853 rule-1 V-ENV entries are BINDING-01's to classify; 96 V-ENV-matching category entries retain
K1.1-correction-03 ownership under the existing category decisions. No category hold is reassigned.

## Reference maintenance and dependent claims

Started with [the roadmap map](../../../../mental-model/roadmap.md) and 007's TOOLS-01
“Layer-3 maintenance: none” entry, then compared the actual accepted delta with its governing
decisions. **No Layer-3 update is required.** The changes govern development evidence and when it
earns credit; they define no new Kernel/Runtime/deployment concept or protocol mechanism. The
existing [evidence owner](../../../../mental-model/mechanisms/evidence.md) already separates
observations, enforcement and gate acceptance. The tooling keeps those distinctions.

The reference index, roadmap and rewrite-index open-choice/inference rules were checked, along
with the dependent ownership boundaries: values/canonical equality and identity; creation and
Outcome acceptance/receipts; waits and batch accounting; actions and authority; native recovery;
resources/isolation; output/routing; and evidence attribution. Production and these owners are
unchanged. A development mutation observation does not become a Kernel receipt or a semantic
hold release; a temporary source copy does not promise physical isolation; the host-handle test
fix changes no wait or native-recovery contract. V-D1, Proxy/exotic classification and V-ENV remain
with their recorded correction owners. No placeholder is newly settled, current definition
superseded, vocabulary entry added, or incoming reference redirected. Layers 1/2 need no change.
Existing refusal/compatibility examples remain applicable; changed administrative links resolve.

## Process retro

The accessible sequence has **three submitted candidate cycles**: reviews 01/02 at H `446dd258…`
(both CHANGES REQUIRED), reviews 03/04 at H `7f3a2af4…` (soundness CHANGES REQUIRED / fidelity
ACCEPT), then review 06 at this H (ACCEPT). Thus the review number is not a six-round count.
There is no `review-05.md` in the pinned tree or that path's fetched Git history; no fifth verdict
is inferred. This is a retrieval/numbering limit, not missing evidence for review 06's exact-H ACCEPT.

Design-06 checks 01–03 are separate from implementation acceptance: check 01 required four
mechanism/corpus changes; check 02 approved with two required corpus restorations (malformed
assertion provenance and mixed fence delimiters); check 03 found five falsely preserved leaves
and triggered choice 10 §2. Earlier design-04/05 checks and continuation/floor/gate stops explain
why these were recurring families, not six unrelated patches.

| Family | Finding pattern and resulting change |
|---|---|
| Design | Non-recognition became positive credit: casts/aliases, descriptor results, expression wrappers, same-named readers, destructuring/getter rebinding and callback escape bypassed successive detector rules. Member-title equality also failed to establish the limited member's identity. Choice 08 required positive evidence; choice 10 tried a finite safe-position table, then its pre-agreed exit removed every exemption. The final trace checks all credit consumers. |
| Evidence | Inventory/context fence grammars disagreed; decision-file existence stood in for transfer membership; skips or pre-assertion errors stood in for kills; trimmed stacks could not prove assertion origin. Shared parsing, pinned exact sets and choice 09's observation-only target route replaced those inferences. Missing cross-products and corpus items were retained. Overlapping verify jobs made a timeout inconclusive; solo clean-clone runs separate reproducible failure from interference, and avoid checkout-dependent read traces. |
| Records | Unrecorded blanket attribution shifted classification to BINDING-01; unpublished/replaced H, weak approval/diff identities, a wrong floor-fix citation, undisclosed category overlap/relinks and imprecise count labels impeded review. Explicit owner decisions, applicable revision diffs, committed lists, exact identities and this P3 note make the scope reviewable without rewriting historical reports. |

Owner choices 04–11 redirected scope explicitly: 04 split extraction and limited 24 members;
05 transferred 40 more origins; 06 measured a narrower area gate and set the K1.4 backstop;
07 chose advisory reporting after the 64/324 measurements exceeded the 50/200 stops;
08 adopted conservative holds and BINDING-01 classification with stop-and-redesign;
09 transferred target assertion-provenance design to TOOLS-02; 10 set the safe-position experiment
and automatic coarse exit; 11 transferred three newly unclosable origins and listed the generated
landing-zone member without weakening general admission. These are owner limits/splits, not fixes
to the held Kernel semantics.

**Verdict flips:** reviews 03 and 04 disagree on the same H under different remits; the fidelity
ACCEPT did not erase soundness findings. The owner continued through choice 10 rather than merging
that candidate. Design approval also failed to predict later composed detector counterexamples.
Review 01 invoked stop-and-redesign (review 02 counted rounds differently); choice 08 explicitly
resolved that disagreement. Review 03 invoked it again; check 03 then triggered the already
authorized coarse exit. No review-06 acceptance has been invalidated by this cleanup.

**One change to try:** before the next risky build, require a compact positive-credit boundary
table whose rows name the evidence, unknown/no-credit outcome, every consumer and a composed
counterexample dimension. Exercise that table in the design check, including the real downstream
credit path, before growing the parser or corpus. Judge it by whether these families appear
before implementation, not by a lower review count. This is a process experiment proposal, not
a policy amendment.

## Disposition and owner handoff boundary

- Independent acceptance: retained at H; existing A verified.
- Pre-merge implementation/review/cleanup obligations: complete. Integration and owner discussion
  remain pending; no parent milestone or E1 gate is closed.
- Push: the external handoff supplies the final local and advertised remote SHA after a non-force
  push. This record names no future commit or successful future push.
- Next owner action: manually review and merge the scoped PR, then have the actual merge ancestry
  and content verified before an integration receipt and discussion/release decision.
- `next_release: none`. K1.1-correction-03 needs integrated TOOLS-01; BINDING-01 needs both that
  packet and TOOLS-01 integrated; TOOLS-02 needs TOOLS-01 and must be accepted/integrated before
  K1.4 acceptance. The successor context and external E1 fixture dependency are in 014 and 007.
- The owner's current context identifies runtime evidence such as Node's `--frozen-intrinsics`
  as a candidate for BINDING-01's brief, **not a selected design**. No such runtime experiment or
  successor implementation is performed here. TOOLS-02 retains choice 11's three origins and
  `kernel-landing-zone.test.ts:1200:9@deedd7950724`.
- Third-party source, dependency or asset incorporated by cleanup: none.
