# Implementation report — K1.2-correction-01, round 5 (contract revision 6)

Claude Code desktop, model `claude-opus-5-5`, session `0a1ca599`, 2026-09-28. The owner directed
this session to prepare the revision-6 candidate (see the adoption record in
[amendment 01](amendment-01.md)). This session also wrote [review 08](review-08.md) of the previous
H, so it cannot review this candidate. The owner selects a different session for that. This report
records implementer work, not acceptance.

## Identity

- **Packet and contract:** K1.2-correction-01, parent K1.2. [Contract revision 6](contract.md) applies
  [amendment 01](amendment-01.md) under [decision-05](../K1.2/decision-05.md).
- **Governing process baseline B:** `a20d278185eaffc7f8b7489345a3624231ff6e6d`. 006, 008 and 012
  are unchanged since B on this branch.
- **State:** WAITING_FOR_REVIEW, as an implementer assessment only.
- **Owner release:** `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, plus the owner decisions of
  2026-09-28 recorded at `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`. The invalidation-01 and
  invalidation-02 holds remain.
- **Prerequisites:** unchanged from implementation 04 (K1.1 and K1.1-correction-02 are integrated
  and ancestors of B).
- **Branch:** `codex/k1.2-correction-01-activation-identity`; origin
  `https://github.com/ArrokothI/arrokothi.git`. Forward commits only, as the owner's branch
  instruction requires.
- **Commits since the previous candidate:**
  - previous reviewed H: `9248e56705b962bfbce4699536c200fe007be942` (C
    `2b8a50297ebe83cb0922bb239aa834a2ecebc1ac`), [review 08](review-08.md) CHANGES REQUIRED,
    recorded at `d7ac122f015b0272db7af1f89413b538192c072a`;
  - owner records `13a73ad`;
  - intermediate payload `0875902b5c6ad0e7b7fbf9d969e95b1d9dd427f1`, not a candidate: its clean
    validation stopped when `check-records.mjs` rejected the new owner record in `work/K1.2/`;
  - **payload C: `2613f2b8dee37c934743d9b730e925705086c4c9`**;
  - **candidate H:** the commit containing this report. The external handoff gives its full SHA.
- **C..H:** only the allowlist at the end of this report.

## Changes and coverage

**Payload, from the previous H to C.** No production source, test, fixture or package file changes;
`git diff 9248e56 C -- packages tests scripts examples` is empty. The changes are:
- **Contract revision 6** ([contract](contract.md)). It narrows the packet as amendment 01 requires:
  - value refusal cost (V-D1) moves to K1.1-correction-03, together with the DEC-7 cost claim, the
    SELF-R4-STRING-01 cost claim, the V-D1 scope of decisions 03/04, `K12C1-R8-VALUE-DEPTH-01`,
    `K12C1-R8-EVID-01` and the time dimension of `K12C1-R4-VALUE-COST-01`;
  - DEC-7 stays as diagnostic semantics only;
  - revision 6 adds an explicit criteria mapping and states that cost probes are no longer
    acceptance evidence for this packet.
- **BASELINE** (`#value-refusal-diagnostics`). The sentence that claimed KC2-1/V-D1 for plain data
  now records the claim as **held**. It cites review 08's `K12C1-R8-VALUE-DEPTH-01` and
  decision-05. No other BASELINE sentence claims V-D1, as a search of BASELINE, 007, Layer 3,
  `packages/kernel/src` and the guides confirms.
- **`check-records.mjs`.** It pins owner decision-05 by digest, as it already did for decisions
  03/04, and adds decision-05 and amendment 01 to the local link check. This was required because
  the check rejected `0875902`.

**Layer 3.** No page changes. `values.md` keeps V-D1 as a normative rule, which is not an
implementation claim. Decision-05's metered wording enters `values.md` in K1.1-correction-03.

**Coverage under revision 6:**
- **Identity, diagnostic and exact-coordinate obligations.** The production source is
  byte-identical to `9248e56`. Review 08 recorded PASS at that source for:
  - C1, C2, C4–C15;
  - the review-14 counterexamples on every surface, with whole-result assertions;
  - the text-malformed identity class;
  - the DEC-4 evidence plan;
  - DEC-7 diagnostic storage, weights and labels.
  That review includes its own reruns and 20 new mutants. The clean-C validation below reruns the
  same checks on this C.
- **C3.** Its identity, order, whole-refusal and retention parts are unchanged. Its value-cost part
  is transferred.
- **"Both review-04 findings closed"** becomes: `K12C1-R4-EVID-01` closed (the X8–X23 and Z1–Z16
  runners reject) and `K12C1-R4-VALUE-COST-01` transferred.
- **"K1.1-correction-02 guarantees hold"** becomes: the KC2 read bounds and accepted values are
  unchanged (`values.test.ts` KC2 cases pass), and the V-D1 claim is held.

**Prior findings:**
- Review 06's `K12C1-R6-VALUE-TIME-01` and `K12C1-R6-EVID-01`: closed by review 08.
- Review 08's `K12C1-R8-VALUE-DEPTH-01` and `K12C1-R8-EVID-01`: transferred to K1.1-correction-03
  by amendment 01. They stay open there, and nothing here claims them fixed.
- Observations O-R8-1 to O-R8-3: transferred with the cost work.
- O-R8-4: awaits owner triage.
- Earlier closures: as review 08 records.

**No additional self-found defect.** This round changes no behavior.

## Validation and interpretation

The validation ran sequentially on clean C:
`node docs/development/work/K1.2-correction-01/validate.mjs <scratch dir>`, from the repository
root. `36-payload-diff-check` is the one manual addition. The outputs are attached under
`validation-05/`.

The environment is Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64
([00-environment.json](validation-05/00-environment.json)).
[13-results.json](validation-05/13-results.json) records every command, exit code and timestamp,
and the tree was clean after the run. [MANIFEST.sha256](validation-05/MANIFEST.sha256) covers the
42 other attachments; its own SHA-256 is
`baedc9a600f3105f2f8f7d91f3d05439e2c766b08ef8b9ac5de1b8b0d1ed4478`.

| Command / raw output | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-05/01-typecheck.txt) | 0 | TypeScript passed |
| [02-full](validation-05/02-full.txt) | 0 | 3,322/3,322; 0 failed/cancelled/skipped/todo |
| [03-kernel](validation-05/03-kernel.txt) | 0 | 1,268/1,268 |
| [04-conformance](validation-05/04-conformance.txt) | 0 | 1,945/1,945 |
| [05-sdk](validation-05/05-sdk.txt) | 0 | 22/22 |
| [06-builder-docs](validation-05/06-builder-docs.txt) | 0 | 72 files; 1,837 links/anchors; 38 imports |
| [07-original-ablations](validation-05/07-original-ablations.txt) | 1 | Control 1,268/1,268; 32/36; B6/B12/B13/B14 NOT APPLICABLE (disclosed anchor drift) |
| [08-correction-ablations](validation-05/08-correction-ablations.txt) | 0 | Control 571/571; 67/67 rejected |
| [09-r11-probe](validation-05/09-r11-probe.txt) | 0 | 8/8 `stale_exchange`; accepted state unchanged |
| [10-records-links](validation-05/10-records-links.txt) | 0 | Ancestry and sealed records, with decision-05 pinned; 22 files, 682 links/anchors |
| [11-evals](validation-05/11-evals.txt) | 0 | 12/12 |
| [14-original-ablations-adapted](validation-05/14-original-ablations-adapted.txt) | 0 | Control 1,268/1,268; 36/36 rejected |
| [15](validation-05/15-review-identity.txt)–[18](validation-05/18-diagnostics-maxlen.txt) review-01/02 identity and max-length probes | 0 | As in implementation 04 |
| [20](validation-05/20-review-aggregate.txt), [21](validation-05/21-review-equality.txt), [26](validation-05/26-review-aggregate-pre-authority.txt) aggregate/equality probes | 0 | As in implementation 04 |
| [23](validation-05/23-review-cost-accept.txt)–[25](validation-05/25-review-cost-refuse-ctor.txt), [28](validation-05/28-review4-p4-p5.txt), [32](validation-05/32-review6-cost-and-blocker.txt), [34](validation-05/34-handler-direct-10000.txt), [35](validation-05/35-string-work.txt) cost, count and string probes | 0 | Observations only under revision 6 (the cost claim was transferred). Their count and logical assertions pass; P4 13/13 |
| [27-revision4-ablations](validation-05/27-revision4-ablations.txt) | 1 | Control 35/35; X8–X23 and V1–V4 rejected (20/21); V5 is the disclosed equivalent survivor |
| [30-review6-exact-ablations](validation-05/30-review6-exact-ablations.txt) | 0 | Control 1,268/1,268; Z1–Z16 all rejected |
| [31-diagnostic-work-ablations](validation-05/31-diagnostic-work-ablations.txt) | 0 | Control 20/20; T1–T4 rejected |
| [36-payload-diff-check](validation-05/36-payload-diff-check.txt) | 0 | `9248e56..C` whitespace-clean: the whole payload delta of this round |
| [33](validation-05/33-round4-diff-check.txt), [29](validation-05/29-round3-diff-check.txt), [22](validation-05/22-correction-diff-check.txt), [19](validation-05/19-round2-diff-check.txt), [12](validation-05/12-diff-check.txt) historical-range diff checks | 2 | Only whitespace quoted inside sealed earlier validation attachments. `3287640..C` now includes validation-04's quoted diff-check lines |

The collector itself exits non-zero because it retains these disclosed exits. No command timed out,
received a signal or failed to load.

Checks not run, and limits:
- Node 22 was not run.
- Cost and timing probes ran as the collector requires. They are observations only, and no
  acceptance claim rests on them in revision 6.
- The four historical diff-check exits and the original runner's four NOT APPLICABLE anchors are
  the same disclosed exceptions as in implementation 04.

Third-party use: none new.

**Strongest remaining risk.** A reviewer might disagree that revision 6's narrowing leaves nothing in
this tree that claims V-D1. The reviewer should search BASELINE, 007, Layer 3, the guides and the
source comments.

## Exact C..H administrative allowlist

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-05.md
docs/development/work/K1.2-correction-01/validation-05/00-environment.json
docs/development/work/K1.2-correction-01/validation-05/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-05/02-full.txt
docs/development/work/K1.2-correction-01/validation-05/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-05/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-05/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-05/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-05/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-05/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-05/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-05/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-05/11-evals.txt
docs/development/work/K1.2-correction-01/validation-05/12-diff-check.txt
docs/development/work/K1.2-correction-01/validation-05/13-results.json
docs/development/work/K1.2-correction-01/validation-05/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-05/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-05/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-05/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-05/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-05/19-round2-diff-check.txt
docs/development/work/K1.2-correction-01/validation-05/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-05/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-05/22-correction-diff-check.txt
docs/development/work/K1.2-correction-01/validation-05/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-05/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-05/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-05/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-05/27-revision4-ablations.txt
docs/development/work/K1.2-correction-01/validation-05/28-review4-p4-p5.txt
docs/development/work/K1.2-correction-01/validation-05/29-round3-diff-check.txt
docs/development/work/K1.2-correction-01/validation-05/30-review6-exact-ablations.txt
docs/development/work/K1.2-correction-01/validation-05/31-diagnostic-work-ablations.txt
docs/development/work/K1.2-correction-01/validation-05/32-review6-cost-and-blocker.txt
docs/development/work/K1.2-correction-01/validation-05/33-round4-diff-check.txt
docs/development/work/K1.2-correction-01/validation-05/34-handler-direct-0.txt
docs/development/work/K1.2-correction-01/validation-05/34-handler-direct-1000.txt
docs/development/work/K1.2-correction-01/validation-05/34-handler-direct-10000.txt
docs/development/work/K1.2-correction-01/validation-05/34-handler-outcome-0.txt
docs/development/work/K1.2-correction-01/validation-05/34-handler-outcome-1000.txt
docs/development/work/K1.2-correction-01/validation-05/34-handler-outcome-10000.txt
docs/development/work/K1.2-correction-01/validation-05/35-string-work.txt
docs/development/work/K1.2-correction-01/validation-05/36-payload-diff-check.txt
docs/development/work/K1.2-correction-01/validation-05/MANIFEST.sha256
```

## Handoff

- **Ready for independent cumulative review** of B..H under contract revision 6, by a session other
  than this one.
- The external handoff supplies B, C, H and the verified remote SHA.
- No self-acceptance, integration, merge or successor release. Both invalidation holds stay under
  owner control.
