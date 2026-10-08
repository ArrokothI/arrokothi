# TOOLS-01 — floor prerequisite correction and resumed checks

2026-10-03, Codex implementer (GPT-6 by owner assignment). **A1–A7 pass; A8 stops at the
archive test's missing declared input. A9–A11 are not run.** This is incremental floor evidence, not clean-C packet
verification, independent acceptance, conformance credit or hold release. TOOLS-01 remains
IN_PROGRESS. Earlier floor records are unchanged.

## Identity and owner decision

Fetched origin first in `/Users/linzhenglin/Desktop/ArrokothAI/agent-kernel`; the sandbox's
DNS failure was resolved by the approved fetch retry. Local and advertised tracking head were
clean and equal at `5b0a3572f7f0c9dadb05c8f4a9e7f92c82d96fa4` on `codex/tools-01`.
The configured remote is `https://github.com/ArrokothI/agent-kernel.git`; it was not changed.
Read AGENTS.md, 006, 012, contract revision 3, design 05 revision 3 including corrected A1,
design-05-review-02, owner-choice-02, all three earlier floor records and the floor sources.

The owner's continuation instruction supplies this verbatim intent for FLOOR-03-01:

> fix the existing test inside TOOLS-01 as a recorded floor prerequisite. Do not change
> production, and add no keepalive to the tooling.

Reviewed the complete `89b49e53fa9780e762e3daf8e7cbcaee38fdb012` patch. It changes only
`tests/conformance/effects/fast-slow-equivalence.test.ts`: a referenced interval represents
host handles around the inline-wait budget loop, and `finally` clears it. All original
assertions and outstanding-work resolution remain. `packages/core/src/reference/inline-wait.ts`
is unchanged. Neither the runner nor the minimal reproduction has a keepalive.

The file is absent from the adoption manifest, and resolving every pinned catalog plus the
additional-source list yields **1,549 origins, zero with that path**. This prerequisite does
not edit a mapped corpus origin or justify changing a mapping.

## Runtimes and prerequisite revalidation

Reused `/Users/linzhenglin/.local/share/arrokothi/node-v22.9.0-darwin-arm64/bin/node`, the
checksum-verified installation in [node-floor-01](node-floor-01.md). No download, reinstall,
dependency change or shell configuration change. The existing `/opt/homebrew/bin/node` is
v26.8.1. Both runs use inherited PATH/HOME/TMPDIR when present, the selected Node bin prepended
to PATH and `LANG=C.UTF-8`; inherited values are not serialized.
Host: macOS 15.6.1 arm64, Python 3.13.7.

| Fresh local run | Node v22.9.0 | Node v26.8.1 |
|---|---|---|
| Corrected `fast-slow-equivalence.test.ts` | exit 0; 7 pass, 0 cancelled | exit 0; 7 pass, 0 cancelled |
| Unchanged `unref-budget.ts` reproduction | exit 1; 0 pass, 1 cancelled | exit 0; 1 pass, 0 cancelled |

The reproduction preserves the floor runtime's event-loop observation; its cancellation is
expected diagnostic evidence, not a passing test or kill. The other machine's Node v25.2.1
results remain historical observations in [node-floor-03](node-floor-03.md), not new local runs.

## A8 review and scope

Reviewed the never-run A8 implementation at `5b0a3572` against design 05 §6. Corrected the
following probe issues before relying on the affected paths:

- The floor's environment object serialized passed values. Records now describe passed names
  and declared settings. A8 retains selected structured facts, statuses and exits; it does not
  retain arbitrary child stdout/stderr, raw operation runs or exception messages that might
  contain inherited values.
- The helper's generic `passed` mixed an admissible pending-adoption observation with final
  verification. It now reports `observation_valid`, `known_pending_adoption` and
  `meets_final_spec` separately. A8 only checks environment equivalence. The exact existing
  pending state remains a failed adoption gate; `all_final_gates_passed` stays false.
- Sweep summaries must be present exactly once, with all eight RUN/MODE entries and integer
  counts. Missing summaries cannot compare equal and pass. Test comparisons also include
  pass and suite counts. Timing is deliberately excluded.

`check-step-controls.py` distinguishes the pending observation from final success, rejects
changes to its result/origin/pending/disposition counts, rejects empty sweep output, and
checks that a synthetic environment-value marker in successful, failing or timed-out command
output is not serialized. These controls pass. No final `checks.json` verdict was relaxed.

## Floor observations

The ordered A1–A7 run used:

```sh
python3 -B tests/tooling/check-node-floor.py \
  --node /Users/linzhenglin/.local/share/arrokothi/node-v22.9.0-darwin-arm64/bin/node --through 7
```

It exited 0 and reports `complete: false`. A8 was invoked from the same maintained `Floor`
class, selecting the same runtime and `5b0a3572` for its pinned operations. The default command
without `--through` runs the implemented assumptions and stops at the first failure. The A8
invocation exited 1. These are two ordered run segments, not a claimed all-eleven passing run.

| Assumption | Result |
|---|---|
| A1 | PASS: nine paired registrations, five leaves, ordered parents and eight malformed-event refusals; kind comes only from results. |
| A2 | PASS: original UTF-16 TypeScript range `[130,270)` with count 1, including the astral-character discriminator. |
| A3 | PASS: loop count 2, untaken throw 0, caught throwing-call assertion range 1, direct-throw control 0, short-circuit start/call 1/0, template text 1. Source guards remain necessary. |
| A4 | PASS: exact full-path leaf, zero-test baseline, synthetic-event refusal, sibling zero counts, multiple-leaf and failing-parent refusals. |
| A5 | PASS: separate TAP/event destinations agree: 5 tests, 1 suite, 5 pass, zero fail/cancel/skip/todo. |
| A6 | PASS: existing TypeScript 5.9.3 subset, lock/version/four digests, parser and scanner; no extension. |
| A7 | PASS: exact script rendering; 173 selected/reported files; 3,774 tests, 447 suites, 3,774 pass, zero fail/cancel/skip/todo. |
| A8 | **FAIL / STOP** at `archive-tests`: exit 1; 1 file-level failure, 0 pass, 0 cancelled/skipped/todo. Prior step comparisons match; pending adoption remains a failed final gate. Kernel sweeps not run. |
| A9 | NOT RUN / pending after the stop: exact-path subtest selection or explicit target refusal. No selection capability is claimed. |
| A10 | NOT RUN / pending after the stop: per-file isolation and load/leaf/hook order. Neither isolation nor the ordering fallback was exercised. |
| A11 | NOT RUN / pending after the stop: child preload and fs wrapping. No wrapping capability is claimed. |

A8 compared these earlier steps successfully under both environments:

| Step | Matching observation |
|---|---|
| Tooling tests | 158 tests; exit 0 |
| Inventory | 208 artifacts, 1,333 mentions, 8 additions; provenance verified |
| Adoption | 1,549 origins; 116 suite, 8 case, 30 non-executable, 1,395 pending; **final gate false** |
| Dimensions | Identical `coverage_reported` facts and gaps |
| Registered mutations | Existing tool reports 98 killed case/mutation pairs and passing controls |
| Refusal mutations | Existing tool reports 99 killed case/mutation pairs and passing controls |
| Refusal census | 99 checks, 99 registered mutations |
| Oracle census | 29 comparisons, 29 registered mutants |
| Typecheck | exit 0 |
| Repository tests | 3,774 tests, 447 suites, 3,774 pass; zero fail/cancel/skip/todo; exit 0 |

The mutation rows describe the existing runner's observations, including its witness attribution;
they grant no new semantic credit or hold release. The live-provider, large-memory/timing and
known-base-failure profiles remain not run, as specified by `checks.json`.

## FLOOR-04-01: archive input absent from the declared floor setup

`checks.json` requires `npm run test:archive-evidence`. Its test at
`tests/archive/evidence-records.test.ts:30–31` reads `ARROKOTHI_EVIDENCE_ROOT` and throws before
registration when it is absent:

> Set ARROKOTHI_EVIDENCE_ROOT to an extracted archive snapshot directory; see docs/development/archive.md

The floor's declared environment passes only PATH, HOME and TMPDIR and sets LANG. The inherited
comparison environment on this host also lacks the archive variable. A focused inherited-profile
rerun of just this failing step returns the same 1 failure / 0 pass result. Direct runs of the
archive file under the declared environment on **both v22.9.0 and v26.8.1** reproduce the same
module-load error. This is a setup failure, not a demonstrated runtime incompatibility or a
count-preserving successful archive run. Equal failures cannot pass A8.

[Archive retention](../../archive.md) already documents the explicit root and the byte-identical
Git fallback at `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`. The pinned K1.0 validation manifest
is locally available (`git cat-file -e` succeeded). Design 05 itself mentions the changed root
in §5.1, but its floor setup does not specify preparing that snapshot or declaring this input;
the current `checks.json` archive step has no environment binding. Merely exporting a root to
the parent would still not put it in the floor's declared allowlist.

**Required continuation clarification:** specify the pinned archive preparation/verification and
its explicit environment binding for A8 and subsequent command execution. The existing Git
fallback is a concrete available option; an owner-held verified extraction is another. This
does not require a Kernel change. Do not drop the archive step, tolerate its failure as pending
adoption, serialize an inherited root value, or fabricate success from a digest alone. After that
setup is resolved, rerun A8 through its archive and Kernel-sweep steps, then A9–A11 before step 2.

Design 05 §6 says: “On any failure stop and report; never adapt a mechanism silently.” The
dependent floor and migration work stops here. No archive input was substituted, no archive
source/test or verification threshold was changed, and no new design rule was implemented.

## Evidence, validation and limits

[manifest.json](node-floor-04/manifest.json) identifies the starting revision, delivered probe
digests and accessible attachment hashes:

- [floor-a1-a7.json.gz](node-floor-04/floor-a1-a7.json.gz): ordered partial run, raw Node events,
  coverage and argv; exit 0, incomplete.
- [floor-a8.json.gz](node-floor-04/floor-a8.json.gz): A8 failure, selected per-step facts and
  profile/exit records; no inherited values or arbitrary child output.
- [runtime-comparison.json.gz](node-floor-04/runtime-comparison.json.gz): corrected conformance
  file and unchanged cancellation reproduction on both local runtimes.
- [archive-failure.json.gz](node-floor-04/archive-failure.json.gz): archive failure on both local
  runtimes under the declared environment, plus the inherited-profile step's selected facts.
- [probe-controls.json](node-floor-04/probe-controls.json): A8's narrow observation and output
  retention controls.

Read compressed JSON with Python's stdlib `gzip.open(path, 'rt')`. The manifest distinguishes
delivered sources from incremental run segments: A1–A7's executed functions stayed unchanged;
A9–A11 remain pending and unrun. Their drafts, written while A8 ran, were removed from this
increment to preserve the required implementation order. A8's sweep non-vacuity correction was
written before that step could run; only its negative control ran because A8 stopped earlier.
No clean-C or complete packet verification is claimed.

All floor Python files parse; every floor `.mjs` passes Node v22.9.0 `--check`; the A8 controls,
local record links, evidence digests and `git diff --check` pass. A8 ran typecheck and the full
repository tests in both environments. No redundant full test run is presented as additional
proof, and the unrun Kernel sweeps are not credited.

## Scope and remainder

Only prerequisite tooling fixtures and this new record/evidence are changed in this continuation.
No production, Layer-3, earlier/sealed record, 007, adoption mapping or `fault-oracle.ts` edit.
No dependency or copied/adapted third-party source. The parser probe continues the existing
digest-pinned TypeScript subset with its license/notice files.

Steps 2–12 remain unstarted pending the floor. V-D1, Proxy and re-prototyped built-ins stay
with K1.1-correction-03, V-ENV with BINDING-01. The design author owns the 007 entry.
No review-ready state or acceptance is claimed.
