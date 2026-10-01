# Implementation report — K1.2, round 1

## Identity

- Packet: K1.2 — Outcome acceptance and receipts; parent milestone K1. [Contract](contract.md) revision 1.
  Governing process baseline: `a20d278185eaffc7f8b7489345a3624231ff6e6d` (006/007/008/012 as they stand
  there).
- State: WAITING_FOR_REVIEW (this report). Owner release: 2026-09-16, start hold lifted 2026-09-24 with
  the B-5 scope amendment (007 status row), and the owner's Prompt A instruction of 2026-09-24.
  Prerequisites: K1.1 (with correction-01 and reference-01) accepted at H
  `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`;
  K1.1-correction-02 accepted at H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. Both integrations are ancestors of the base.
- Author: Claude Code session (Claude Opus 5.5), 2026-09-24, at the owner's instruction.
- Branch `claude/k1.2-outcome-acceptance-receipts` on remote `origin`
  (`https://github.com/ArrokothI/arrokothi.git`). Base = `a20d278185eaffc7f8b7489345a3624231ff6e6d`
  (`origin/main` when the branch was created). Payload C = `4babb6ee9550479c09e75d80cb8c17e8fc042b18`.
  No previous reviewed H: this is the first round.
- Candidate H: the commit containing this report; its full SHA is supplied in the owner handoff.
- C..H allowlist: this report, `validation-01/*.txt` (raw command output about clean C only), and in
  `docs/development/007-work-packets.md` the K1.2 status row plus the opening sentence that said K1.2
  had no candidate yet.
- Working tree clean at C (`validation-01/01-tree-and-environment.txt`). Push: pending at the time this
  report was written; the verified remote SHA is supplied in the handoff, not claimed here.

Departures from the default workflow: the branch uses the `claude/` prefix that earlier Claude
sessions used rather than 006's usual `codex/<packet-id>-<topic>`; 006 says "normally", and no owner
instruction names a branch. While measuring base test counts I created and removed a detached
worktree under the session scratchpad; the `git worktree prune` that followed also removed four stale
administrative entries (`…/h17`, `/private/tmp/k11-c6-validation`, `/private/tmp/k11-c7-validation`,
`/private/tmp/k11c01-validation`) whose directories no longer existed. No checkout, branch or file of
another session was touched.

## Changes and coverage

**Change groups.** Full cumulative diff: `git diff a20d278 4babb6e` (32 files, +4,465/−331).

| Group | Files | Governing sources |
|---|---|---|
| Outcome acceptance | `packages/kernel/src/coordinator.ts` (`submitOutcome`, `#accept`), `outcome.ts` (new: one reading of the envelope), `refusal.ts`, `identity.ts` (`outcome_acceptance` receipt), `inspection.ts` | `execution-cycle.md#outcome-acceptance`, `core.md`, `identity.md`, `values.md`, `lifecycle.md`, `output.md`; WS OA-1–OA-6, EF-1/EF-2, B-3, CX-3, E-6 |
| Takeover | `coordinator.ts` (`requestTakeover`) | `execution-cycle.md#retry-versus-takeover`, `identity.md#writer-epoch`; WS ID-3/ID-4/ID-9 |
| Recovery holds | `coordinator.ts` (`recoverExecution`, `reportProtocolFailure`, redelivery hold check), `outcome.ts` (request capture) | `state.md#recovery-and-re-execution`, `recovery.md#compatibility-and-migration`; WS PC-4/PC-5, OA-6 |
| B-5 and terminal ingress | `coordinator.ts` (`#accept`), `inspection.ts` (`MailboxDisposition`) | `core.md#batch-reservation-and-acknowledgment`, `creation.md#when-the-destination-cannot-take-the-input`; WS B-5; owner amendment 2026-09-24 |
| Shared envelope rule | `envelope.ts` (new; helpers moved unchanged from `coordinator.ts`, issue type widened, `boundDiagnostic` shared by delivery and protocol-failure diagnostics) | KC1-DEC-6, K11-R16-ID-01, KC1-ARCH-1 |
| Surface and comments | `index.ts` (type exports only), `driver.ts`, `lifecycle.ts`, `unsupported.ts`, `package.json` description | — |
| Tests | 8 new suites plus `nondisclosure.test.ts` extension; `harness.ts` builder; updates to `refusals`, `dispatch`, `ingress`, `unsupported` and the landing-zone guard | see coverage below |
| Structural records | `docs/development/kernel-ownership.md` (13 files, K1.2 disposition of DX-4), `tests/conformance/architecture/kernel-landing-zone.test.ts` | K1.0 contract, 015 |
| Reference and baseline | `002-implemented-kernel-baseline.md` (`#outcome-acceptance-api`), `mental-model/concepts/identity.md` (writer-epoch marker pointer), `mental-model/rewrite-index.md` §4 | 006 §Maintaining the mental-model reference; rewrite-index §4 marker convention |
| Packet records | `work/K1.2/contract.md`, `work/K1.2/ablations.mjs` | 006, 007, 012 |

**Selected 012 methods.** Deterministic execution (primary), normative examination of the acceptance
order and every rejection path, narrow race/fault ordering on one in-memory coordinator, and
process/documentation for the inventory, baseline and markers. Excluded, as the contract states:
native Driver fidelity (no real Driver; R1), external E gates (K1.4), packaging (private zone).

**Obligation/interaction coverage.** The contract's coverage map is the authoritative list; every row
has a test at C. Summary by criterion, with the strongest counterexample each rejects:

| Criterion | Evidence (`packages/kernel/tests/`) | Distinguishing counterexample |
|---|---|---|
| C1 scope first | `outcome-acceptance` C1 block, `nondisclosure` K1.2 block | read-counting envelope from an outsider: zero reads past `executionId`; hidden ≡ missing for all four surfaces |
| C2 replay before validation | `outcome-acceptance` C2 block, `terminal`, `late-reports` | replay after the next exchange and after `complete`; invalid content and a changed epoch under an accepted ID conflict (ablation A2) |
| C3 whole-envelope validation | `outcome-acceptance` C3 block, `outcome-limits` (21 cases) | 17 content defects each refused whole with an unchanged snapshot; E-6 at-limit/one-past for every root; epoch never issued; no Kernel retry (A6, A11, A14) |
| C4 atomic acceptance | `outcome-acceptance` C4 blocks | batch acknowledged exactly, outside Event untouched; progress claiming refusal changes nothing (A1); capacity freed only by acknowledgment; synchronous in-process Runtime |
| C5 transitions and next exchange | `outcome-acceptance` C5, `terminal` | new Activation ID, empty batch after `continue`, carried progress is the same frozen capture (A16) |
| C6 B-5 and terminal ingress | `terminal` | Events queued outside the batch receive terminal dispositions, never acknowledgment (A7, A8); refusal, replay and conflict after the end |
| C7 Effects, obligations, waits | `outcome-acceptance` C7 | no key resembling an Effect, admission, denial or settlement record anywhere in inspection; Effect list and wait never read (A6, A15) |
| C8 takeover | `takeover` | same Activation ID, epoch+1, stale epoch fenced, repeat refused, reentrant takeover (A3, A4, A5) |
| C9 code hold | `recovery` C9 | RUNNING with progress/revision intact, redelivery/takeover refused, cleared without a new revision (A9, A10) |
| C10 protocol failure | `recovery` C10 | bounded diagnostic, hostile diagnostic never read, stale report refused, takeover and valid Outcome end it |
| C11 late reports and Outcomes | `late-reports` | settled capability after resolution, next dispatch, takeover and terminal changes only its own attempt |
| C12 receipts and evidence | `outcome-acceptance` C12, `outcome-evidence`, `nondisclosure` | contiguous per-Execution positions; returned records immutable; hidden-scope K1.2 activity invisible (A12) |
| C13 one observation | `outcome-hostile` | inherited field reads as missing; each field read once (A13); throwing and revoked fields are located refusals; inherited indexed accessors, descriptor-field pollution and replaced builtins installed mid-observation change nothing; reentrant takeover and Outcomes are ordered before the decision |
| C14 structure | `tests/conformance/architecture/kernel-landing-zone.test.ts` | exact 13-file reachable set; inventory agreement |
| C15 records | this report; link/anchor check below | — |

The K0.2 obligations the fixture assigned here map as follows: R3-e1/R3-e2 → C1; R3-f1 → C2 (see
K1.2-OPEN-1); R3-h1/R3-h2 → C10; R3-i2 → C3 ("never redelivers or retries"); R5-j6-2 → C4. The E-6
matrix K1.1's contract assigned here → `outcome-limits.test.ts`. The K0.2 fixture files themselves are
unchanged; porting a candidate onto them is K1.4's.

**Tests added, changed and removed.** Kernel suite 274 → 382 tests (+108); full suite 2,328 → 2,436;
conformance and SDK counts unchanged (1,945 and 22), measured at the base in a temporary worktree.
Changed pre-existing tests, each because it pinned K1.1's refusal of a surface K1.2 now implements or
mirrored a document K1.2 changed: `refusals.test.ts` keeps only `cancelExecution` (K1.3) in its
refusal list; `dispatch.test.ts` "ordinary redelivery never advances a writer epoch" drops its
`requestTakeover()` refusal assertion (the positive takeover behavior is in `takeover.test.ts`);
`unsupported.test.ts` and the landing-zone guard use `registerWait`/K1.3 as the refusal example and
the export-name guard names unbuilt boundaries (`effect|wait|deadline|cancel|child|message`); the
landing-zone guard's reachable-file list, six Zones-row anchors, eleven dependency-row strings and
three decoded-count assertions (11 → 13) follow the inventory text; three comments in `ingress`/`dispatch` that said live-terminal evidence awaited K1.3
now point at `terminal.test.ts`. No assertion was weakened; the exported runtime-name list is
unchanged.

**Compatibility and refusal.** The supported SDK and `@arrokothi/core` are untouched. The private
package gains four coordinator methods and types; `cancelExecution` still refuses naming K1.3; an
Outcome proposing an Effect or `await` is refused whole.

**Legacy retirement.** None. DX-4 (`schema/value-schema.ts`) is disposed of in writing — not extracted,
not needed — and stays open for K2.2 (`kernel-ownership.md`).

**Semantic correction closure.** Not a correction round; no reviewer finding exists yet. The one
invariant this packet changed in existing code is that an unresolved exchange's current attempt is now
mutable (takeover). Its dependents were walked: `dispatch` (answers from locals — unaffected),
`redeliver` (defect found, below), `inspect`/`toActivationView` (reads current attempt — intended),
`#deliver` (captures the attempt object per capability — late reports still land on their own record),
and the resolved-exchange record (shares the delivery list so late reports survive resolution).

**Additional self-found defects (separate provenance).**
- *Redelivery answer read back after the Driver ran.* With a mutable current attempt, a Driver that
  reenters with a takeover during `redeliver` made the answer report epoch 2 and the takeover's receipt
  for a redelivery that sent epoch 1. Fixed by reading the attempt before invoking the Driver;
  regression "a redelivery answer describes the attempt it resent…" in `takeover.test.ts`.
- *Ablation runner that could not fail.* The first version of `ablations.mjs` passed a bare directory
  to `node --test`, so every "rejection" was a runner error. Corrected before any result was used: a
  glob, a mandatory clean control run, and REJECTED only when the suite ran. The recorded output is from
  the corrected script.

**Unresolved obligations** (they do not pass because tests pass): K1.2-OPEN-1 (no mutable policy
surface for R3-f1's policy-change variant; ordering evidenced through state changes instead),
K1.2-OPEN-2 (whole-message capture cost of about (2 + 256) MiB per maximal in-process Outcome;
transport bounds belong to a remote binding), K1.2-OPEN-3 (unbounded logs; K4.4/K5.1), K1.2-OPEN-4 (no
durability, isolation or Driver-fidelity claim). All are in the contract.

## Reference maintenance evidence

- Accepted semantic sources implemented: the Layer-3 owners in the contract's Governing sources table;
  no Layer-3 rule changed.
- Changed Layer-3 text: only the writer-epoch `OPEN(implementation)` marker in
  `concepts/identity.md#writer-epoch` (an HTML comment), which now points at BASELINE
  `#outcome-acceptance-api` for the in-process binding's choice and stays in place. `rewrite-index.md` §4
  records the binding's answers for the writer epoch, the Outcome-acceptance transaction mechanism and
  per-entry disposition storage, each pointing at BASELINE.
- Why no other Layer-3 change: K1.2 implements existing rules. Its other choices (takeover receipted at
  the dispatch-intent boundary, holds not fencing acceptance, unknown-field refusal, the Emission limit,
  the protocol-failure surface) are this binding's, recorded in the contract's decisions and BASELINE;
  none settles an architectural open choice or needs a new term.
- Dependencies inspected: `execution-cycle.md`, `lifecycle.md`, `waits.md` (registration and B-rules,
  unchanged by K1.2), `creation.md`, `output.md`, `recovery.md`, `concepts/core.md`, `identity.md`,
  `state.md`, `values.md`, `actions.md` (Emission, Effect), `roadmap.md#k12` (no owner or scope change,
  so unchanged), `README.md`/`kernel.md` (gate ownership only, still accurate).
- Status rule: no page under `concepts/` or `mechanisms/` gains build or acceptance status; the marker
  change is inside an HTML comment, as the existing receipt marker is.
- Link/anchor validation: `npm run check:builder-docs` (72 files, 1,761 links/anchors) and a
  file-and-anchor check over the contract, 002, `kernel-ownership.md`, `identity.md`, `rewrite-index.md`
  and 007 (258 links, 0 broken; GitHub slug rules).

## Validation and interpretation

Environment: macOS 26.6.2 (arm64), Node v25.2.1, npm 11.6.2; clean tree at C; run 2026-09-24 from the
repository root. Raw output is attached; each file names its command and ends with its exit code.

| Command | Result | Attachment (SHA-256) |
|---|---|---|
| tree/environment | C `4babb6e…`, clean | `validation-01/01-tree-and-environment.txt` `0e1f9bdb58ccdbb4245e14b76e4027ea99c53f8214c160e5409758d2ce2ccdbb` |
| `npm run typecheck` | exit 0 | `validation-01/02-typecheck.txt` `a2c9b592ac2f8c65cb1b0eaad413a8355809a0a4a504700880707c207dd1a0a9` |
| `npm test` | exit 0; 2,436 tests / 381 suites, 0 fail/cancelled/skipped/todo | `validation-01/03-test-full.txt` `62a60747408c42c59be3e33098a153c2cde897b4377ac2788f26271b8690837c` |
| `npm run test:kernel` | exit 0; 382 / 81, 0 fail | `validation-01/04-test-kernel.txt` `d7b340277178115ebd0d0ec16f9ddc84dc4d4538bde8037c3cb529469caddd1a` |
| `npm run test:conformance` | exit 0; 1,945 / 282, 0 fail | `validation-01/05-test-conformance.txt` `1a6e03b75575d782640612d7200c931d431193f6add1ed7d7f5d8d18061d69ff` |
| `npm run test:sdk` | exit 0; 22, 0 fail | `validation-01/06-test-sdk.txt` `12080ac44c5960fa4924e8d0f658caaa9bcf81a20b5ff9ec57298933a6c7b236` |
| `npm run check:builder-docs` | exit 0; 72 files, 1,761 links/anchors, 38 imports | `validation-01/07-check-builder-docs.txt` `3cae7d5c5c942241006325fc3b14819eba42bd64894b726b395b643a22723d78` |
| `node docs/development/work/K1.2/ablations.mjs` | exit 0; clean control 382/382; 16/16 plausible broken implementations rejected | `validation-01/08-ablations.txt` `906a31f2709b0ad2988f88bede08113adfad1ef0ecf599e2fc701b6f3cfb95b8` |

Not run: `npm run test:evals` (no Agent behavior or model path). No external fixture was prepared or
gate executed; no E1 result is claimed. The ablation script is payload in C; its output is the only
ablation evidence.

Why the evidence supports each criterion (implementer assessment, not acceptance): every criterion's
row names the observable fact and the forbidden mutations, the refusal cases compare full inspection
snapshots rather than headline states, and each of the sixteen plausible wrong implementations — one
per load-bearing rule — is rejected by at least one test while the unablated copy passes all 382.

Strongest remaining risks: the hold/acceptance interaction (K1.2-DEC-7) and the takeover receipt
(K1.2-DEC-6) are binding choices a reviewer may rule on; hostile-caller hardening is demonstrated for
the envelope paths tested, not proven exhaustive, since no finite matrix proves absence of an ambient
dependency.

Third-party review under AGENTS.md: none. No code, test, script, asset or dependency was copied,
adapted or added; `canonicalize@3.0.0` remains the only third-party specifier in the zone. The K0.2
fixture vocabulary and WS decisions are repository material.

## Handoff

Ready for independent review. Base, C and H, and the verified pushed SHA, are supplied in the owner
handoff. No self-acceptance; K1.3 and every other successor remain held until the owner releases them.
