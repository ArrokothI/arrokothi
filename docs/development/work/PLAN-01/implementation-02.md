# Implementation report — PLAN-01, round 2

## Identity

- Packet: PLAN-01. [Contract](contract.md) unchanged. Governing process baseline for its review:
  `70467f4cf76896529486499db24fcaa953292491`; the amended 006/009 still do not govern it.
- State: WAITING_FOR_REVIEW. Correction after [review 01](review-01.md) (Codex, GPT-6, 2026-09-23),
  which reviewed H `a6481c3b85811adb94f35d5309e04b9f3d9fc2ac` and returned CHANGES REQUIRED with
  finding PLAN-R1-01; every other criterion passed.
- Author: Claude Code session (Claude Opus 5.5), 2026-09-23, at the owner's instruction.
- Branch `claude/pre-k1.2-reviews`. Review transcribed in administrative commit
  `6f2d51de81c802d6a9967a721be602d15115727c`.
- C = `fabc641b3105b5b9905f2a403519bc411c036774`, a single-file correction:
  `git diff 6f2d51d fabc641` (only `docs/development/001-current-status-and-roadmap.md`).
  Cumulative PLAN-01 payload: `git diff 0c82b2f 7719424` plus `git diff 6f2d51d fabc641`. Later
  commits on the branch belong to K1.1-correction-02.
- Candidate H: the commit containing this report, supplied in the owner handoff. C..H allowlist
  relative to this packet: this report, `validation-02/builder.txt` and the PLAN-01 status row in 007.
  The K1.1-correction-02 commits `12bb29c` and `806bae2` between C and H belong to that packet.

## Finding disposition

**PLAN-R1-01 (P2) — fixed.** 001's opening no longer states that K0.1, the process review and K0.2
"are accepted, integrated and owner-closed", or that the K0.2 receipt "records K0 closure". It now
says that current packet and milestone status, meaning acceptance, integration, closure and release,
is owned by the ledger and its linked records and is not repeated in 001. The K0.2 receipt stays
linked, for navigation only: it is where the K0 gate's decision and E0 evidence are recorded, and
that gate is a contract/fixture gate, not a working target Kernel. No fact is lost: 007's opening
("K0 is closed") and its K0.1-process-review, K0.1 and K0.2 rows still carry every identity.

**Closure check across 001 (PL-2 re-check).** I searched 001 for acceptance, integration, closure and
release wording. The opening was the only current-status statement. The remaining hits are:

- protocol vocabulary ("accepted input", "accepted Outcome");
- a sequencing rule ("from the accepted K0 contract onward");
- the general rule that a packet can be accepted before its parent gate passes.

None records the current state of a packet. The file's name ("001-current-status-and-roadmap") is
historical navigation and is left unchanged, so that inbound links keep working.

## Validation

Environment: macOS 26.6.2, Node v25.2.1, npm 11.6.2.

| Check | Result | Attachment |
|---|---|---|
| `npm run check:builder-docs` at C | exit 0; 72 Markdown files, 1,718 links/anchors, 38 imports | `validation-02/builder.txt` (SHA-256 `938217e0eb868e859f909d59f651b7ebc602654b3ee96e1dcbc3445af8cdbf93`; the same output text as K1.1-correction-02's run at its C, which has the same documentation link inventory) |
| `git diff --check` on the correction | clean | — |

No runtime check applies to a one-paragraph prose change. The full suite passes at the later branch
head (see K1.1-correction-02 round 2). Implementer assessment, not acceptance: PL-2 is now met, and
PL-1 and PL-3–PL-13 are unaffected.

Third-party review: none.

## Handoff

Ready for independent review. No self-acceptance or successor release; K1.2 stays held.
