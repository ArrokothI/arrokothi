# Independent review 05 — K1.4

**Verdict: ACCEPT**, bound to **H `e307943d6b315e724e49107c3b26a1100ef4916c`**.
K14-R4-01 is closed: current descriptions distinguish cancellation requests, stopped Driver steps and
native termination, and confine cleanup-rejection holds to `terminate` and an eligible unresolved
exchange. The production executable delta is empty. L-36/L-37 remain recorded limits; K14-G remains
K1.4-gate's. This is the bounded brief-05 continuation, not a reopening of reviews 03/04.

## Identity, authority and scope

- **Reviewer/operator:** this independent Codex desktop session, GPT-6, **2026-11-13 (Europe/Berlin)**.
  I did not implement or previously work on K1.4. No subagents or delegated reviewers were used.
  Local OS operator: `linzhenglin`; authenticated GitHub operator: `chrizeroxtwo` (`gh auth status`, exit 0).
- **Machine:** hostname `localhost`, Mac16,8, Apple M4 Pro, 48 GiB RAM, arm64.
  **OS:** macOS 15.6.1, build 24G90; Darwin 24.6.0.
- **Environment/access:** fresh clone of `https://github.com/ArrokothI/arrokothi.git` at
  `/Users/linzhenglin/Desktop/ArrokothAI/k1.4-review-05-fresh`; full Git objects, source, shell and downloaded
  raw CI evidence. Node **v26.10.0**, npm **11.19.1**, `npm ci` exit 0; TypeScript **5.9.3** from the lockfile;
  GitHub CLI **2.104.0**, authenticated with the existing GitHub credential. No dependency edits.
- **B:** `608f9ece44dbe42b78974bdac9e7ddcd33697705`.
- **C:** `72d452bb39e0ae0f846d85e273441d06a9cd22fb`.
- **H:** `e307943d6b315e724e49107c3b26a1100ef4916c`, subject branch `claude/k1.4`.
- **Prior reviewed H:** `1b98a76e625ef187ba179fdad2e823ac4dabd521`.
  C's parent is that prior H; H's parent is C. B is an ancestor. Review branch
  `codex/k1.4-review-05` was created directly from H. Remote `claude/k1.4` advertised exact H;
  `codex/k1.4-review-04` advertised the pinned commit below; the review-05 branch did not yet exist.
- **Governing brief:** [brief 05](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04/brief-05.md),
  R4-CLAIMS, R4-PRESERVE and R4-EVIDENCE; only **K14-R4-01**, over prior H..C.
  [Brief 01](brief-01.md) supplies the K14-1..K14-6 map.
- **Read by commit, no merge:** [review 04](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04.md),
  brief 05, `review-04/probes.mjs` and its trace at **`8ca7288b041d376dad7a8c12f083e43427bbb101`**;
  owner choices [05](owner-choice-05.md)/[06](owner-choice-06.md), [implementation 05](implementation-05.md),
  its evidence script and all four attached logs at H. Closed R1/R2 and review-03/04 dispositions are
  carried by their pinned review references, not reopened.
- **Policy baseline:** AGENTS.md, [006](../../006-development-process.md),
  [008](../../008-implementation-report.md) and [012](../../012-review-methods.md) at B, byte-identical at H.
  Repository architecture and slice-audit skills used. Canonical ownership was located through the
  mental-model overview/reference and Driver/Runtime pages, then integration, execution-cycle, lifecycle
  and evidence. The cancellation/evidence prior-art reading-map sections were background only; no external
  technical claim supplies acceptance evidence. This correction changes Driver documentation, not Kernel
  semantics, Runtime behavior or deployment guarantees; no Layer-1/2/3 semantic change is required.

### Owner statements

The owner supplied these **2026-11-11** statements verbatim with this review:

> Deviation 1: "Confirm both cases".

> Deviation 3: "Review as is".

These are owner supplements. They retain the FAILED and CANCELLED variants and the authorized prose-only
correction route; they are not reviewer inventions or a waiver of truthful claims.

## Candidate and evidence binding

The independently run [candidate check](review-05/candidate.json) returns `facts_verified`.
C..H contains **exactly** C's `verification.json` `administrative_files`:

1. `docs/development/007-work-packets.md`
2. `docs/development/work/K1.4/implementation-05.md`
3. `docs/development/work/K1.4/progress.md`

Their hunks are report/status updates; no payload is hidden there. `verification.json` is identical
at C and H. Its prior-H..C changes are solely the report allowlist and limits prose; checks, inputs,
commands, thresholds, preservation entries and profiles are unchanged. Documentation is treated as
payload at C, not as administrative evidence.

I independently downloaded [Packet verify run 43131441604](https://github.com/ArrokothI/arrokothi/actions/runs/43131441604),
job **130896285058**, artifact **13912370616**. Workflow metadata identifies `main` at B; it is not
the tested revision. The [job-log excerpt](review-05/ci-revision.log) records:

```text
2026-11-12T01:00:41.8491196Z   REVISION: 72d452bb39e0ae0f846d85e273441d06a9cd22fb
2026-11-12T01:00:49.3789948Z HEAD is now at 72d452bb K1.4 round 5: cleanup-claim closure for review 04 (K14-R4-01)
```

The artifact's `run.txt` and raw `verify.json` also bind revision/head to C, Node v26.10.0, exit 0.
I counted [summary.json](review-05/ci-summary.json)'s **`checks` array: 19 entries, 19 `passed: true`,
`checks_passed`**. Repository tests **5,054**, archive **4**, examples **18**, all with zero failures,
cancellations, skips or TODOs; tooling tests **777**. Raw mutation records recount to **339 + 358 + 238**
killed, none invalid. Typecheck, inventory/adoption, censuses, sweeps, race search, value-cost checks and
builder docs pass. `area-gate: reported` does not accept E1.

The retained [original ZIP](review-05/ci-artifact.zip) matches GitHub's digest:
`bb0c66324851f55cf0fb2548084f01d3e052adb04c37e2fe3f18351e4d17eda1`.
[CI inspection](review-05/ci-inspection.json) and the [evidence README](review-05/README.md) give reproduction,
identity and retention. **No CI was started or retried.** Full verification and registered mutations are
independently inspected evidence at C, not claimed as local reruns at H. Prior-round evidence retains
its original C; implementation 05's early working-tree logs are not substituted for the exact-C CI.

## Independent coverage and results

The independent coverage map starts from brief 05's distinctions: requested cancellation versus an ended
member; fulfilled-pending versus rejected requests; terminal cancellation versus an unresolved exchange;
and source comments versus executable changes. These obligations were derived before adopting the
implementation report's explanations. The report covers the same boundaries, and its three disclosed
deviations are accounted for below.

| Criterion / method | Distinguishing check, result and evidence | Disposition |
|---|---|---|
| R4-CLAIMS / bounded claim and path review | Driver header and `endLineage`/`cascade`/`terminate`, application/types comments, L-36, baseline including its limits index, both current cleanup guides and dependent summaries match the three B-TERM-LIMIT traces and review 04's F1 no-hold trace. Rejection reporting traced through `terminate` to the Kernel's unresolved/nonterminal guards. | **PASS** |
| R4-PRESERVE / deterministic Git, AST and corpus checks | All three changed source files have identical AST structure and exact token text excluding JSDoc, plus identical comment-free emitted JavaScript. Other production source, tests/fixtures/configuration and closed evidence mechanisms preserved; Kernel/core and registries match B. Historical changes are dated insertions only. Bridge corpus and unchanged review-04 probe pass. | **PASS** |
| R4-EVIDENCE / deterministic identity and artifact checks | Exact B/prior-H/C/H ancestry, exact C..H allowlist, independently downloaded CI REVISION and raw checks, own candidate and preservation checks. Existing evidence attributed to its actual revision; no CI dispatch. | **PASS** |

### Claims versus observed behavior

1. **Fulfilled cancellation is a request, not native termination.** `cascade` awaits `cancelExecution`
   without inspecting its receipt (`driver.ts:302–308`). Native `Harness.cancelExecution` returns
   `cancellation_pending` for RUNNING (`harness.ts:1656–1659`). The Driver's sticky flag prevents a later
   `runOnce` (`driver.ts:413–421`); it cannot finish the failed native step. The rewritten comments at
   `driver.ts:19–40`, `:223–225`, `:275–300`, `:664–669`, `application.ts:379–381` and `types.ts:56–59`
   describe those separate facts.

   In the [local bridge log](review-05/bridge-suites.log), B-TERM-LIMIT's failed `applyOutcome` and failed
   definition lookup each show **Kernel FAILED, native RUNNING, pending cancellation, zero holds, one
   acknowledged input, zero later steps**. The confirmed mid-step variant shows **Kernel CANCELLED,
   native RUNNING, pending cancellation, zero holds, zero later steps**, with `app.cancel` resolved.
   These remain L-36 counterexamples to guaranteed native cleanup, not new cleanup guarantees.

2. **Cleanup rejection reporting has an exchange boundary.** `requestCancellation` catches its request's
   rejection (`driver.ts:283`); `app.cancel` awaits settlement and requests again (`application.ts:378–382`).
   The byte-identical [review-04 probe](review-05/prior-probe.mjs) passes **1/1**, observing exactly:

   ```text
   faults=1; cleanup=[cancel.request: rejected, cancel.application: fulfilled]
   Kernel=CANCELLED; native=[CANCELLED,CANCELLED]; recoveryHolds=[]; laterSteps=0
   ```

   `terminate` catches its own cleanup rejection and calls the Kernel-only report before ledger closure
   or Outcome (`driver.ts:674–687`). `reportProtocolFailure` checks the named current epoch and uses
   `#openExchange`, which refuses terminal or absent/stale exchanges (`coordinator.ts:2077–2104`,
   `:2313–2332`). B-FAULT-CLEANUP and B-UNSCHEDULABLE-CLEANUP pass their opposite case: an eligible
   unresolved exchange holds with no result or acknowledged batch. The revised L-36 and baseline
   now name this boundary. The header also correctly distinguishes native-terminal `submit` from
   other ending exits through `terminate`; neither an application fallback rejection nor a creation
   rejection independently installs a hold.

3. **Current dependencies agree.** Baseline `:1038–1050` includes FAILED and earlier CANCELLED, requests,
   the swallow/fallback and conditional hold; its limits index `:1069` extends through **L-37**.
   Quick-start `executionDeadline`, cancellation and Harness migration rows say requests/L-36;
   capabilities guide `:86–88` carries the failed-step limit. SDK README and builder skill add no
   contrary cleanup guarantee. The legacy-mapping cleanup entries were inspected in their file-specific
   scope: `bridge-progress` describes the actual held-failure tests; `bridge-terminate` limits native-end
   assertions to its rows and explicitly separates L-36/L-37. They are not general guarantees for every
   cleanup. No fixture edit or reopening of their prior disposition is needed.

4. **History remains evidence.** `design-04.md`, `implementation-03.md` and `implementation-04.md` retain
   every pre-existing line in order. Each inserted correction is dated **2026-11-11**, explicitly cites
   review 04/brief 05 and scopes the old statement. Other earlier records are unchanged in this delta.
   L-37 and owner choices 05/06 are byte-identical to prior H. The live verification limits are current
   payload; their prose correction is not a rewrite of a sealed report.

### Preservation and local executions

The independent [preservation probe](review-05/preserve.mjs), with [output](review-05/preserve.jsonl),
checks every changed source file, rather than trusting the implementer's printer:

| Changed source | Exact AST tokens compared (JSDoc excluded) | Result |
|---|---:|---|
| `packages/sdk/src/application.ts` | 3,788 | Identical AST/token tree and emitted JavaScript |
| `packages/sdk/src/legacy-bridge/driver.ts` | 5,741 | Identical AST/token tree and emitted JavaScript |
| `packages/sdk/src/types.ts` | 790 | Identical AST/token tree and emitted JavaScript |

All **196** production `src` files are enumerated; the other **193** are byte-identical to prior H.
No executable production change, compiler directive, test, fixture, package/lockfile, runtime/build
configuration or maintained script changed. The sole new executable file in C is the inspected
`implementation-05/comment-only.mjs` evidence helper under documentation; it does not run in production
or alter the verification checks. `verification.json` changes only `administrative_files` and limits
prose, as disclosed above. `packages/kernel/src`, `packages/core/src` and all three mutation registries
are byte-identical to B. The 15-file correction inventory and the cumulative B..H inventory were checked;
earlier substantive work is carried under the pinned closed dispositions, not freshly recertified.

Local executions on H's product tree, after `npm ci`:

| Execution | Result |
|---|---|
| Candidate binding and independent preservation checks | Both exit 0; exact allowlist and no executable delta. Comparator controls detect a changed literal and a changed ASI parse, while ignoring a comment-only change. |
| All `packages/sdk/tests/bridge-*.test.ts` | **259/259**, 19 suites, zero failures/cancellations/skips/TODOs; includes 90 termination tests, L-36/L-37, F1–F3 and maintained in-test ablations. |
| Exact review-04 probe | **1/1**, no failures/cancellations/skips/TODOs; trace above, [log](review-05/prior-probe.log). |
| `npm run check:builder-docs` | Exit 0: 75 Markdown files, 2,290 links/anchors, 58 public imports; [log](review-05/builder-docs.log). |

Implementation 05's printer/control, probe and bridge logs were inspected separately. Its unchanged
`cancellationSettled` anchor is truthful: the promise settles after a rejected request is swallowed;
the adjacent new comment explains that fact. Correcting dependent comments beyond the originally named
lines stays in the same claim family. The verification metadata adjustment changes neither executable
commands nor evidence thresholds. All three disclosed deviations are acceptable within brief 05.

After the corpus/evidence, further search was bounded to cleanup descriptions in the named source,
baseline/index/register, current guides, mapping, SDK README, builder skill, verification limits and
affected historical records. Both literal names and conceptual aliases (end/cancel/stop/cleanup,
request/fulfilment/rejection, hold/terminal/unresolved) were inspected against their consumers. Cases
covered: READY/WAITING versus RUNNING, FAILED versus earlier CANCELLED, request swallow versus
`terminate` rejection, native-terminal `submit` versus other exits, and application/root-creation
fallbacks. No new counterexample, surviving mutant or unresolved brief-05 obligation was found.
No arbitrary topology/fault-combination search, stronger census soundness claim, live provider,
large-memory timing, durable recovery, isolation, packaging/release or E1 acceptance is claimed.

## Finding disposition, acceptance map and handoff

| Item | Review-05 disposition |
|---|---|
| K14-R4-01 (P2) | **CLOSED.** Required current prose and dependent descriptions now agree with L-36 and the actual rejection-reporting boundary; executable behavior preserved. |
| K14-R3-01 | Retained as **L-36**, both owner-confirmed FAILED/CANCELLED cases. No native termination/recovery guarantee inferred. |
| K14-R3-02 | Remains **closed** by F1–F3; their maintained tests and ablations still pass. No changed fault schedule or equivalence disposition. |
| K14-R3-03 | Remains **closed as L-37**: static template element access, quoted destructuring aliases and runtime-computed names remain excluded. |
| R1/R2 findings and D03/D04 conditions closed by reviews 03/04 | Carried by pinned prior review; no reopening or changed disposition. |

| Criterion | Disposition at exact H |
|---|---|
| K14-1 | **PASS with recorded L-36.** Prior accepted asynchronous exchange/cancellation mechanics preserved; local corpus and C's full verification pass. |
| K14-2 | **PASS.** Private Runtime/Driver boundary unchanged; bridge corpus passes. |
| K14-3 | **PASS.** Protected source/import mechanisms unchanged; Kernel/core bytes equal B; C's structural checks pass. |
| K14-4 | **PASS.** R4-01's current cleanup claims corrected. Feature inventory/mechanisms remain unchanged and tested. |
| K14-5 | **PASS.** Wrapper/L-01 exports, startup mechanism and checks unchanged; C's repository verification passes. |
| K14-6 | **PASS with recorded L-37.** Mapping/corpus/F1–F3/row-specific ablations preserved. No stronger census coverage inferred. |
| K14-G | **DEFERRED to K1.4-gate.** No E1 gate executed or accepted here. |

**Closure/root cause:** review 04 identified the promotion of a fulfilled cancellation request to a
stronger native-end fact, and the promotion of one rejection handler to a universal hold guarantee.
This correction removes those current claims without changing the owner's chosen behavioral limits.
Owner choices 05/06 and brief 05 already provide the recorded-limit/prose route; no new redesign or
patch round is proposed. There are no new findings and no correction brief is required.

Third-party reuse: none added; the review uses existing repository fixtures, Node/TypeScript and Python
standard-library APIs. This branch adds only the review and review evidence. It does not edit the candidate,
transcribe the ledger, merge, integrate or release a successor. Push/remote SHA are reported separately
after publication; this record does not claim its own recording SHA or a future push.

**Transcription:** K1.4 `ACCEPTED` for K14-1..K14-6 at exact H below; K14-R4-01 closed;
L-36/L-37 retained; integration and successor release remain owner-controlled; K14-G stays K1.4-gate's.

ACCEPT — H `e307943d6b315e724e49107c3b26a1100ef4916c` — K1.4 (K14-1..K14-6).
