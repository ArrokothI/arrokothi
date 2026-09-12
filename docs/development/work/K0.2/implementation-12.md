# Implementation report — K0.2, round 12

Fix forward from C11/H11 under [review-11.md](review-11.md). This report supersedes round 11's
closure claims for K02-R10-01/-03; historical reports and reviews are unchanged.

## Identity

- Packet/parent: K0.2 / K0. Contract: [contract.md](contract.md), revision 12.
- Governing process and base: `c079237ee7aff428481426f93e87a68b79f170d4`.
- Prerequisite accepted K0.1 H12: `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`;
  acceptance record: `679734a1777ce087c62305d7665071687d8f1cb6`.
- Prerequisite K0.1 integration: `42731300266eea00a9a24d867d5e82d9887c280d`,
  [integration receipt](../K0.1/integration-01.md). Owner release of 2026-09-11 continues;
  this user instruction explicitly authorizes correction, not successor release.
- State: **BLOCKED_EXTERNAL**. C1–C7 and C9 are offered for independent review; C8 remains blocked.
- Branch: `codex/k0.2-public-controls-e0-gate`.
- Observed configured remote: `origin`, `https://github.com/ArrokothI/agent-kernel.git`.
  This records the current remote, correcting the older report's Agent_SDK URL forward.
- Preserved C11: `faac6a1813b7956a286cec3325c6391bfed579f0`.
- Previously reviewed H11: `0bcea0c08943c355d53541b54f3def8c91b1a237`, CHANGES REQUIRED.
- Reviewer record / fetched starting HEAD: `01324a7da962bd5d044e54d79db8a611a70a5d6c`.
- Clean payload C12: `05855f446e52e542e3e6fd52f58d7cfaa105253a`.
- Candidate H12: the commit containing this report; full SHA and observed push identity in the external handoff.
- Exact C12..H12 administrative allowlist: this report, the K0.2 row of
  `docs/development/007-work-packets.md`, and the six output-only `.log` files linked below under
  `docs/development/work/K0.2/validation-12/`. No scripts, evaluators or payload in H12.
- Working tree clean at C12 during validation. Push pending when this report was written.
- Reviewer-record → C12 correction: 10 files, +351/−42. Cumulative base → C12: 41 files,
  +15059/−6, including prior administrative history. No historical report/review was edited.

## Changes and coverage

These are Kernel conformance-fixture corrections under the accepted K0.1 worksheet, not an
implementation of the target Kernel. Runtime/Driver and deployment ownership are unchanged.
The architecture skill, canonical Kernel/execution-protocol owners and process 006/008/012 govern
this work. No new architecture decision or owner amendment was needed.

### K02-R11-01 — implemented; independent closure requested

The finding is correct: a structurally valid subscription-only wait with no eligible Event would
persist WAITING. C11's readiness-only mutation therefore needed a second bug to invent readiness.
The prior regression checked grammar but omitted W-2's actual eligibility precondition.

`control-whole-envelope-validation` now accepts `cont-1` at step 7 after `[in-1]` was reserved.
At step 8 the otherwise-valid `g-good` subscription would find `cont-1` after hypothetical W-2
step-1 acknowledgment and end under W-2 step 2 / B-6 path A. Duplicate emission key `em-1` is an
independent whole-envelope error, so the correct result remains `malformed_envelope`.

R3-c7's transcript changes only `waitEndedReadiness` to Event-triggered `g-good`. Rejection, RUNNING,
Activation ID/epoch, pinned `[in-1]`, queued `[in-1, cont-1]`, no progress/emissions/acknowledgment,
no Effect intent, no live wait, no accepted deadline and retained opaque receipt remain correct.
The regression derives eligibility from the actual accepted Event, checks it is outside the pinned
batch, and checks actual duplicate emission identity. No CX-6 reuse or readiness/lifecycle/deadline
bundling. The later valid Outcome and R2-b2 move to step 9, acknowledge `[in-1]`, and retain `cont-1`.

### K02-R11-02 — implemented; independent closure requested

The finding is correct: changing producer and destination together did not distinguish a
`(destination, requestKey)` dedup index. The original three create/replay steps and R1-c1/c2 remain.

Application `FixtureEvent` now requires authenticated producer namespace and producer request key;
`accept_event` carries that identity at actual ingress. Kernel Event/timeout provenance remains
separate. All existing application fixtures supply identities; create and initial-input metadata
agree. This is an authenticated fixture boundary, not an added authentication test claim.

Nine appended steps in `identity-producer-scope` dispatch the initial batch and then send
`(prod-a, exec-pa, k)` / `input-a` and `(prod-b, exec-pa, k)` / `input-b`. Both append in acceptance
order, with destination and raw key fixed. The schedule then replays A exactly and submits different
content under A's same full identity. The conflict is recorded as `duplicate_conflict`, with no edit.

| Owner | Wrong candidate | Only changed field |
|---|---|---|
| R1-e1 | Index omits producer and silently absorbs B as A's replay | queued |
| R1-e2 | Exact replay appends A a second time | queued |
| R1-e3 | Content comparison skipped, conflict silently answered as replay | rejection |
| R1-e4 | Mailbox append runs before conflict validation, beside correct conflict | queued |

Each is a separate single-field transcript. The full-identity test pins producer-only variation,
exact replay, different content and field isolation. Acceptance evidence remains relational:
per-Execution accepted Event order is the input acceptance-position representation allowed by
ID-6. No new opaque ingress receipt or wire spelling is invented. Creation/Outcome opaque receipt
relations and Activation-ID normalization remain unchanged. `rejection` now explicitly documents
create/input/Outcome conflicts; `ingressRefused` documents terminal refusal, as used by its existing
schedules.

### Dependent assertion and interaction sweep

The sweep was rerun after the identity change, not inferred from compilation. Existing boundary
owners were checked against the changed commands and their full observations:

| Boundary family | Assertions rechecked and evidence |
|---|---|
| Row 1 | Create scope/replay/conflict and receipt same/distinct/none remain; four actual-input identity owners added. |
| Row 5 | Application identity is not an eligibility selector. Existing subscription-only, ineligible-input, deadline, W-2, B-6 A/B, generation and mandatory-batch paths retain their accepted behavior. R3-c7 now derives its positive eligibility precondition. |
| Row 6 | Input acceptance preserves Activation/batch, acknowledgment and progress; no live wait means no new readiness. New same-destination inputs arrive while RUNNING outside the original batch. |
| Rows 2/3 and receipts | Accepted Outcome acknowledges only its pinned batch. Rejected/replayed ingress neither mints an opaque receipt nor resolves the exchange. Existing create/Outcome same/distinct/none transcripts and per-family normalization rerun. |
| Rows 7/8 and terminal inputs | Existing cancellation/disposition and completion/refusal paths rerun with explicit input identities. The new schedule acknowledges A through bound-1 dispatch, disposes B at completion, and refuses a fresh terminal input without adding an acceptance position. |

The new corpus-wide ingress test tracks full identities, independently checks fresh append versus
replay/conflict/refusal, retained receipt and exchange, and eligibility-dependent wait/deadline
retirement. Non-vacuity requires fresh, replay, conflict, terminal, RUNNING and WAITING cases.
The two-producer downstream test checks W-2 readiness, B-6 bound 1, B-3 acknowledgment and B-5 disposal.
These downstream steps are interaction evidence, not duplicate row attribution. Existing corpus
readiness/deadline/sink/terminal invariants and assertion-granular reuse/field-set guards all pass.

012 methods: deterministic complete observations; plausible violating transcripts and their
oracle rejection; assertion-level inventory and interaction sweep; live-document/provenance checks.
No stochastic model/provider evaluation is relevant to this dependency-free fixture correction.

### Preserved work and finding dispositions

- R11-03 implemented: scenario header says thirteen; live contract correctly says revision 11
  corrected revision 10 after round-10 review. Current contract is revision 12.
- R10-01/-03 residuals are addressed by R11-01/-02 above; independent closure is requested, not granted.
- R10-02 stays closed per review-11: `redeliver_dispatch`, late `in-2`, R2-c3/d1/d2/d3/c4 and the
  retained-input/takeover schedule remain intact.
- R3-c5/c6, cross-producer create evidence, receipt normalization and R4-b1/b2/b3 assignments remain.
- R9-01 / R8-01 stay closed per review-11: R3-c4, `g3`/`res-3`, R5-d6, R5-d4 path-A narrowing,
  all six accepted-deadline lifecycle transcripts and logical-deadline/physical-timer distinction remain.
- Prior accepted splits, refusal behavior and all earlier review/report records remain unchanged.
- K0.2-SELF-01 remains assigned to a separate corrective packet, as recorded in implementation-11:
  raw-text import scanning can read prose as an import. Architecture guards pass; no scanner change here.
- During this correction, the test suite caught the moved final-Outcome transcript still at its old
  index; that reference was repaired before C12. No additional unresolved in-scope defect was found.

Computed totals: **118 obligations = 108 scenario + 4 shared + 1 corpus + 5 assigned; 108 violating
transcripts; 20 atomicity notes; 13 scenarios / 108 steps**. Row counts: 13, 11, 16, 7, 34, 5, 17, 9,
2, 4. The four new violations add twelve generated evidence/discrimination tests; one new identity
regression and two interaction tests add three more. K0 tests rise 536 → 551; none removed or skipped.
Contract/specification current claims and counts agree. Guides, baseline, public controls and skills
remain unchanged; all 13 real-entry scenarios still REFUSE rather than claiming target behavior.

## Validation and interpretation

All payload checks ran on clean committed C12 in `/Users/linzhenglin/Desktop/ArrokothAI/agent-kernel`,
2026-09-12 (Asia/Taipei), with Node v26.8.1, npm 11.19.0, TypeScript 5.9.3 and the existing installed
lockfile dependencies. No dependency installation/change. Commands use the repository package scripts;
raw stdout/stderr is attached, not left only in temporary local paths.

| Command | Exit / result |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 0; 1516 tests, 263 suites, 1516 pass, 0 fail/skipped |
| `npm run test:conformance` | 0; 1407 tests, 245 suites, 1407 pass, 0 fail/skipped |
| `npm run test:sdk` | 0; 22 tests, 22 pass, 0 fail/skipped |
| `node --test --experimental-strip-types tests/conformance/k0/*.test.ts` | 0; 551 tests, 52 suites, 551 pass, 0 fail/skipped |
| `npm run check:builder-docs` | 0; 26 Markdown files, 280 local links/anchors, 38 imports |
| `git diff --check` and `git status --porcelain` | 0; no output on C12 |

1516 − 551 = 965 pre-existing tests, unchanged. Architecture boundary guards pass in the full suite.
The raw logs are output-only attachments retained by this repository at H12. The typecheck log
includes its recorded exit status after stdout/stderr:

| Raw output | SHA-256 |
|---|---|
| [typecheck.log](validation-12/typecheck.log) | `ce5b818a215dc366812b4c108fb1ba0722a478408cc3b62110e92ab9aacbf16c` |
| [npm-test.log](validation-12/npm-test.log) | `845c550e26df956cdd81cc3bd5ddf03d7eb22a3e0f8bc9b9942167ced24aed6e` |
| [conformance.log](validation-12/conformance.log) | `9063b11b5d754817d482cc53aca055deab59bafee96eb9eb4075d6bc73aca4c2` |
| [sdk.log](validation-12/sdk.log) | `62219605ba2dd38397fca447d5b66985b3920d22cddd659a975a11385f47c5f0` |
| [k0.log](validation-12/k0.log) | `dc531b7d59a8c6aed039f56d1b4b579ad1b1c198817feebda368fa594769a1d9` |
| [builder-docs.log](validation-12/builder-docs.log) | `58177978157b75991d6e958fd6b9714579faf6d02f2a733536acf2f47434f94a` |

`npm run test:evals` not run: provider credentials/network are unnecessary to these deterministic
fixture changes, and no eval was added. No external E0 run or decision was performed or fabricated.
Third-party review: no third-party source, dependency, asset or service was added/copied/adapted.

Implementer assessment, not acceptance: C1–C6 retain their deterministic trace, delayed Runtime,
independent ledger, baseline/application shapes and controls; C7/C9 now carry the corrected readiness
and input-identity discrimination plus passing structural/interaction evidence. They are offered for
independent review. All PASS results describe hand-authored transcripts proving the oracle's behavior,
not a functioning target Kernel. The strongest residual risk remains an unenumerated decision-level
assertion; no amount of fixture self-testing supplies independent acceptance.

## External blocker and handoff

C8 is **BLOCKED_EXTERNAL**. Responsible actor: benchmark repository owner. Unavailable input:
accepted E0 fixture/config identities, raw observations, evaluator version and actual E0 decision
at a pinned benchmark revision. Unblock condition: that deliverable is produced and accepted there,
with artifact identities recordable here and independently inspectable. The standing record is
review-11 at benchmark revision `98756f8c10bd806125da8318f1a129bc030aca61` (E0 planned, not
implemented); no new benchmark inspection or write is claimed.

Base `c079237ee7aff428481426f93e87a68b79f170d4`; clean C12
`05855f446e52e542e3e6fd52f58d7cfaa105253a`; H12 is this report's containing commit. The external
handoff will provide full H12 and observed remote identity. Review C1–C7/C9 independently against
review-11 and specification §18. C8 is not offered for acceptance and the packet is not review-ready
as a whole. **No self-acceptance, merge, K0 closure or K1.0 release.**
