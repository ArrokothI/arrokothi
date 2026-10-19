# Owner choice 01 — K1.1-correction-03

**Record type:** owner decision on the two questions of [implementation 01](implementation-01.md), and the
owner's choice on one follow-up question. The owner relayed both in the implementing Claude Code cloud session
(`claude-opus-5-5`) on 2026-10-12, and that session recorded them, as the owner instructed. It is not a review, an implementation or an acceptance. It
releases no hold and no other packet.

The owner's message, verbatim:

```text
Owner decisions on implementation-01's questions (owner, 2026-10-12):

1. R4 (hidden own entries): option 1. Declare R4 as the fourth residual, no code change. In values.md
   and BASELINE, name BINDING-01 as the packet whose bytes core removes it. The invalidation-02 release
   requested on acceptance is under the metered meaning with residuals R1–R4 named.

2. Adoption corpus: option 2. Reopen the complete origins whose witnesses or members this packet
   changed, and remove or re-link their stale witness rows. Transfer those origins to TOOLS-02 with a
   pinned list (transferred / transfer_lists), as owner choices 04 and 05 did. Standing rule from now
   on: a packet that changes a witnessed test reopens the affected origins and transfers them to
   TOOLS-02 mechanically. It lists them in its report and does not need an owner question for this.

Record this message verbatim as docs/development/work/K1.1-correction-03/owner-choice-01.md, with the
pinned origin list beside it. Then make a new clean C, run the full verify detached until it returns
checks_passed with its advisory area report, write H with implementation-02.md, push, move 007 to
WAITING_FOR_REVIEW and hand off B/C/H.
```

## Follow-up question (implementer) and the owner's choice (2026-10-12)

Applying item 2 left verify short of `checks_passed` at one more check. The implementing session wrote the
question and its options below and put them to the owner in the same session. The owner selected the first
option. The question and the selected option's text, both written by the implementing session, are reproduced
verbatim:

```text
Question: Verify cannot reach checks_passed until C2-LIMIT stops failing. 24 converted members of owner
choice 04's two limited origins (artifact-73555fe6…, 3 in dispatch.test.ts; artifact-ea5444a6…, 21 in
values.test.ts) are now refused, but they are not in TOOLS-01's pinned unbound lists, and the tool
hard-codes those lists' paths. How should this packet resolve it?

Answer: Additive tool change (Recommended)
Extend scripts/packet_tools.py so that a later owner decision's pinned list can add unbound members to a
limited origin. The 24 members are pinned beside owner-choice-01. This adds tool tests and refusal-guard
registrations for the new checks. TOOLS-01's records stay untouched, and the scripts entry leaves this
packet's preserve list. Reviewable, about one day of work.
```

## Pinned origin list (implementer attachment, not owner text)

[transferred-origins.json](owner-choice-01/transferred-origins.json) is the pinned list that
`tests/fixtures/packet-tools/adoption.json` cites under `transfer_lists` for this decision. It names the 15
complete origins this packet reopens to `pending_revalidation` and transfers to TOOLS-02. Each entry gives:

- the origin's path, line and pinned revision, and its revision-2 status;
- the members this packet changed, and the stale witnesses its closure linked;
- the closure it held, kept here because `adoption.json` drops it on reopening.

The selection rule: a complete origin is listed when a member of the origin changed preserved status
between B and C, or when its closure linked a held or superseded witness whose member's status changed.

`adoption.json` drops 96 stale witness rows, every held or superseded witness whose member is now refused:
- 76 are linked by the closures of the 15 reopened origins, and the pinned list names them;
- 20 belong to origins that were already open and transferred, so no closure links them. They are 17 rows of
  `artifact-ea5444a6…` and 1 row of `artifact-73555fe6…` (owner choice 04's limited origins, whose members
  are named in `limited-members.json`), and 2 rows of `artifact-ecb10ef9…` (owner choice 11):
  `witness.ingress.537.3.61e8bde54da2` and `witness.ingress.821.3.61e8bde54da2`. They are removed because
  `witness_records` refuses a witness whose member's status no longer matches its kind.

[limited-members.json](owner-choice-01/limited-members.json) is the second pinned list (implementer
attachment). It names the 24 members whose tests this packet changed in two of owner choice 04's four limited
origins (`artifact-73555fe6…` and `artifact-ea5444a6…`), each with its origin, its title and the cause. Those two origins cite it under `limited.added` in
`adoption.json`, and `limited_origins` counts each named member as listed.
