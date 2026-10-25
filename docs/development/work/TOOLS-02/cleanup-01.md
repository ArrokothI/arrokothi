# Cleanup 01 — TOOLS-02 range 1 (T2-1, T2-2)

- **Owner instruction (2026-10-25):** "Use Prompt C in docs/development/009-universal-prompts.md, adapted to a
  partial integration: TOOLS-02 range 1 (T2-1, T2-2) only. Owner choice 01 gives range 1 its own review and
  integration." The same message supplies the identities below. It asks for this cleanup on a new branch
  `claude/tools-02-range1` from A, a non-force push and a PR to main. It also says the owner releases K1.3
  separately after this merges. The owner merges manually.
- **Role:** a fresh Claude Code desktop session (`claude-opus-5-5`). It is neither the implementer's session nor
  the reviewer's, and it worked in its own worktree. It transcribes nothing new: review 04 was already recorded at
  A. This record is cleanup only. It is neither an independent acceptance nor an integration receipt.
- **Identities:**

  | Item | Commit |
  |---|---|
  | B | `b5daf35aeee37305c1ee41bb626c97d26db94ab2` |
  | C (C6) | `5d0f1cc49eb9cb534ad2818a8f8d38253438418d` |
  | Accepted H | `34ab91a5de23beb4997cdd2ae209a3b67aac50a0` |
  | A (review 04 recorded, ACCEPT of H); inspected pre-cleanup head of `origin/claude/tools-02` | `3634d945ce0de5322d1cf5b81462d5ec9b2fc819` |
  | Remote main | `b5daf35aeee37305c1ee41bb626c97d26db94ab2` (PR #58, equal to B) |

- **Review:** [review 04](review-04.md) (Codex desktop session, GPT-6) is the authentic independent ACCEPT. Its
  verdict line: "ACCEPT — H `34ab91a5de23beb4997cdd2ae209a3b67aac50a0` — TOOLS-02 range 1 (T2-1, T2-2)." It raises
  no new findings and closes T2-R3-PATH-01, T2-R3-OPTIONS-01 and T2-R3-ADMIN-01. It defers T2-3, T2-4 and T2-5 by
  owner scope. All 12 files and 8 sources in its [evidence manifest](review-04/evidence.json) match their SHA-256.
  The CI artifact ZIP's SHA-256 is `ed26505a36c13ece5ebdc5591f39064ded29ce5e9c4ee1b8b3f95bb924dc0d79`.
- **Range, not packet.** Range 1 is accepted at exact H. TOOLS-02 stays IN_PROGRESS for ranges 2–4 (T2-3 to T2-5).
  Branch `claude/tools-02-design-03` holds design 03 and owner choice 02 for range 3. It is not part of this
  integration, and none of its files are on this branch.

## Post-review changes and payload

- B → C → H → A is a single ancestry chain. C..H is three commits touching exactly the candidate's administrative
  allowlist: 007, [implementation 04](implementation-04.md) and progress.
- H..A is one commit: review 04 and its 13 evidence entries, the 007 transcription and progress's phase line. The
  review's probe scripts are review evidence, not inputs of any check.
- B..A changes no `packages/` or `mental-model/` path. The payload is B..C, which review 04 reviewed cumulatively.
  It consists of `scripts/packet_tools.py`, `tests/tooling/`, `tests/fixtures/packet-tools/`, 017 (L-16, L-18),
  the brief's owner-choice note and the TOOLS-02 records.
- No unreviewed payload was found. Remote main equals B, so no merge is needed and nothing on main could
  invalidate the review.
- This cleanup changes only this record, the 007 TOOLS-02 row and [014](../../014-owner-progress-summary.md).
  Historical records, the brief, designs, reviews and progress keep their bytes. Progress stays the implementer's
  resume point on `claude/tools-02`.

## Checks

- **CI evidence reused at C.** Packet verify CI run
  [40181329943](https://github.com/ArrokothI/arrokothi/actions/runs/40181329943) tested revision C (`run.txt`:
  `revision` and `head` both C, exit 0). It returned `checks_passed` on all 18 checks: 671 tool tests; 4,412
  repository tests; 140 registered, 330 refusal and 238 value-cost mutations killed. Review 04 inspected it, and
  its artifact is retained in [review-04](review-04/packet-verify-40181329943.zip).
  - The evidence still applies: C's code, tests, fixtures and spec are unchanged through H, A and this cleanup,
    which touches only `docs/development/`.
  - The provenance inventory reads catalogs pinned at fixed revisions, so new prose adds no origin.
  - The run was not repeated.
- **Candidate check rerun** in this worktree with H's tooling (Python 3.13.5, Git 2.39.5):
  `python3 -B scripts/packet_tools.py candidate --payload 5d0f1cc4… --head 34ab91a5… --spec docs/development/work/TOOLS-02/verification.json`.
  - Result: exit 0 and `facts_verified`, under the recorded accommodation, which exempts only `design-04.md`
    (preserved at `c10eb149`) from `git diff --check`.
  - The command checks C..H by design: its allowlist rejects any head past H.
- **`npm run check:builder-docs`** (Node v26.10.0) was rerun on this cleanup tree. It passes: 74 Markdown files and
  2,126 local links and anchors.
- **Diff checks:** `git diff --check` is clean over the cleanup delta.

## Current claims at H

- **017 L-16** matches H. The `value-cost.bookkeeping-trace` case still has `timeout_seconds: 900`, and
  `value-cost.json` is unchanged from B to C. Run 40181329943 passed the value-cost registry at C. 007 records range
  1's three earlier CI runs as passed. L-16's evidence column cites three earlier runs and remains true.
- **017 L-18** matches H:
  - rule P is the first check of each step in `walk_path`;
  - rule O is in `admit`, fed by `read-trace.mjs`'s prototype capture;
  - `tests/tooling/README.md` states both rules and the cooperative threat model.
- **No L-17 on this branch.** Design 03 reserves L-17 for range 3 on `claude/tools-02-design-03`. Until range 3
  lands, 017 on main goes from L-16 to L-18.
- **BASELINE (002)** makes no range-1 claim. Range 1 is evidence tooling and changes no implemented Kernel
  statement. One BASELINE sentence has a stale count: "The 853 rule-1 held entries remain TOOLS-02 bookkeeping".
  - At B and at C, the hold register holds 966 entries, 891 of them V-ENV, and range 1 leaves `holds` byte-identical.
  - The count was already stale before range 1: [design 01](design-01.md) §4.1 measured 891 at `a34d99da`.
  - Design 01 §10 question 10 assigns the correction to range 3, where T2-4 replaces the sentence.
  - This cleanup leaves 002 unchanged.

## Layer 3

None is needed. Range 1 is repository evidence tooling: it changes no Kernel, Runtime, Driver or deployment
semantics, and no `mental-model/` path. `mental-model/roadmap.md` maps no Layer-3 owner to TOOLS-02. Review 04
reached the same conclusion.

## Process retro (range 1)

- **Rounds:** four Codex GPT-6 reviews to ACCEPT. Reviews 01–03 returned CHANGES REQUIRED, and review 04 ACCEPTed
  a bounded scope. Before the build, design checks 01 and 02 returned REDESIGN. For range 1, check 02 required only
  the D02-CHK-01 completion; its remaining redesign was T2-4's, settled outside range 1 by owner choice 02. Design
  check 05 returned APPROVED WITH REQUIRED CHANGES. Design 04 and design 05 §8 were built without a check, by owner
  direction.
- **Owner choices:**
  - [01](owner-choice-01.md): amends T2-1 (option A), adopts `recorded_limit` and L-16, and gives range 1 its own
    review and early integration;
  - [03](owner-choice-03.md): moves the two `mcp-boundaries` origins to range 4 as `pending_revalidation`;
  - [04](owner-choice-04.md): a refined claim, with an explicit read matrix and refusal of symlink-crossing
    listings;
  - [05](owner-choice-05.md): adopts the cooperative threat model, rules P and O, L-18, the candidate
    accommodation and a bounded review 04.
- **Two stop-and-redesigns** fired, at reviews 02 and 03. Both were resolved by refined finishable claims (owner
  choices 04 and 05), not by a redesign, a split or a held claim. Choice 05 records the forms it leaves out as L-18.
- **Findings by family:**
  - *Design (read identity), five P2:* recursive listings (T2-R1-READ-01), symlinks (T2-R2-READ-01), glob arrays
    (T2-R2-PATTERN-01), path spelling (T2-R3-PATH-01) and inherited options (T2-R3-OPTIONS-01). Reviews 02 and 03
    name one mechanism: the census admitted a lossy stand-in for the effective input.
  - *Records, one P3:* design 04's trailing blank line failed the candidate's whitespace check (T2-R3-ADMIN-01).
  - *Evidence:* none from review.
- **Verdict flips:** none. T2-2 passed in all four reviews. T2-1 failed in reviews 01–03 and passed in review 04,
  and no closed finding reopened.
- **Change to try:** state each criterion's threat model in the brief, before the design: cooperative or
  adversarial input. Range 1 took three reviews of ever more contrived forms (depth, aliasing, argument shape,
  spelling, prototype) before owner choice 05 named it.

## Disposition

Cleanup complete. Range 1 is accepted at H `34ab91a5de23beb4997cdd2ae209a3b67aac50a0`. Integration is pending the
owner's merge, and the receipt follows it. TOOLS-02 stays IN_PROGRESS for ranges 2–4.
`next_release: none` from this cleanup; the owner decides K1.3's release separately.
