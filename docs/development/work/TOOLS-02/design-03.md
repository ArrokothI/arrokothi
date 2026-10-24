# Design 03 — TOOLS-02, T2-4 only (under owner choice 02)

- **Author:** Claude Code desktop session (`claude-opus-5-5`), the implementer, 2026-10-23 (America/New_York).
- **Inputs:**
  - [owner choice 02](owner-choice-02.md);
  - [design check 02](design-check-02.md), D02-CHK-05;
  - [design 01](design-01.md) §4.1, for the measured register.
- **Replaces:** design 01 §4.2–§4.3 and design 02 §4. Every other part of designs 01 and 02 stands.
- **Next:** a short design check before range 3; no range-3 code before it.

## 1. Mechanism

**Claims table.** Each of the four claims in `holds.claims` gains three fields:

| Claim | `status` | `release` | `limits` |
|---|---|---|---|
| V-ENV (scope `core`) | `released` | BINDING-01 [hold release 01](../BINDING-01/hold-release-01.md) | L-01 |
| V-D1 | `released` | K1.1-correction-03 [hold release 01](../K1.1-correction-03/hold-release-01.md) | L-03–L-07, L-13 |
| Proxy | `released` | K1.1-correction-03 hold release 01 | L-09 |
| re-prototyped-built-in | `released` | K1.1-correction-03 hold release 01 | L-08 |

The tool fixes each claim's release record, as it already fixes category decisions (`CATEGORY_DECISIONS`), so a
manifest cannot name another file. `status: held` stays available for future holds.

**Register classes:**

| Class | Requires | Credit |
|---|---|---|
| `held` | a claim with `status: held`; a decision or reading (as today) | none |
| `superseded` | as today (the one Proxy entry under decision-01 keeps it) | none |
| `unread` (new) | a released claim; `decision` equal to that claim's `release` record | none; names no limit |
| `limit` | a released claim; a `reading` (`{facts, claim}`); `limit`, one of the claim's limits and a current 017 ID | none |
| `not_held` | no match under a released claim, or a `reading` for an entry whose match is under one | through P1-P or P1-T at C only |

**Checks in `corpus`**, and so in every verify:
1. A `held` entry under a released claim is refused. This is T2-4's "no entry cites a released hold as active".
2. An `unread` entry needs a released claim and that claim's release record as its `decision`.
3. A `limit` entry needs a reading and one of its claim's limits that exists in 017's current register.
4. A match under a released claim may be `not_held` only with a reading.
5. Owner choice 08 rule 1 and owner choice 10 §2 keep their effect for V-ENV matches: a match is never
   `not_held` without a reading. `intrinsic_trace` requires every key with a detector site to be `held`,
   `superseded`, `unread` or `limit`, or `not_held` with a reading. A member or target at such a leaf earns
   credit only when its entry is `not_held`.

**Cascade:**
- Members of `unread` entries take status `unread`.
- Their `held_witness` records become `unread_witness`, with the same claim and members. `witness_records` and
  `origin_closure` accept `unread_witness` where they accepted `held_witness`.
- Complete origins closed through those witnesses stay closed through the same P1-H route, with no credit, so no
  origin reopens.
- Registry cases follow the same rule. Their attributions in `mutations.json` (`held_witness` or
  `mechanism_witness`) stay as they are, and the case register accepts an attributed case that is `unread`.

**Range-3 edits to current claims:**
- **017:** a new entry, L-17. Not guaranteed: credit from the N `unread` hold-register entries, which observe a
  released claim and have no per-entry reading. Acceptable now: they carried no credit while held, and no
  release depends on them. Fix when: a packet needs credit from these entries. Expected fix: per-entry readings in
  that packet. Source: owner choice 02.
- **BASELINE:** its sentence "The 853 rule-1 held entries remain TOOLS-02 bookkeeping; no historical evidence is
  promoted by this relocation" is replaced by one that states the released claims and the N `unread` entries
  (017 L-17), which have no credit and no limit until a per-entry reading.

## 2. Why T2-4 closes

- **No entry cites a released hold as active.** Check 1 runs on every `corpus` run. After range 3 the register
  holds no `held` entry, because all four claims are released.
- **Core and wrapper entries.** Owner choice 02 settles them as `unread` unless a reading classes them, so the
  brief's split becomes a per-entry reading that TOOLS-02 does not require. L-01 is cited only through a recorded
  reading, which answers D02-CHK-05.
- **No new credit without a passing check.** `unread` and `limit` are never credit, and `not_held` needs a reading
  plus the P1-P or P1-T check at C. The status of the 1,013 affected members changes from `held` to `unread`;
  `preserved` and `refused` counts and suite credit are unchanged, which §4's self-check asserts.

## 3. Volume, measured at B

| Entries | Count |
|---|---:|
| Held entries becoming `unread` | 965 |
| — V-ENV | 891 (804 registrations, 87 cases) |
| — Proxy | 41 |
| — V-D1 | 21 |
| — re-prototyped-built-in | 12 |
| Superseded, unchanged | 1 |

That gives 965 `unread` entries, 1,013 `unread` members and 542 witness records converted. Range 3 recounts at
its C; any new matches K1.3 adds before then are classed the same way.

## 4. Controls

| Control | Expected |
|---|---|
| A `held` entry under a released claim | refused |
| An `unread` entry naming another decision | refused |
| A `limit` entry with no reading, or with an unknown limit ID | refused |
| A `not_held` entry for a match under a released claim, with no reading | refused |
| The same entry with a reading | accepted; its member is checked by P1-P |
| An `unread` member's `held_witness` | refused ("another status"); `unread_witness` accepted |
| A detector key `not_held` without a reading | `intrinsic_trace` refuses it |

The figures count `unread` separately. Status self-check: `held` becomes `unread` one-for-one; every other status
count and suite credit are unchanged. Each new `require` gets a registered refusal ablation.

## 5. Question for the design check

Is §1's `limit` (reading-only) worth keeping in TOOLS-02 when no entry uses it, or should range 3 omit the class
until a packet first needs it? I recommend keeping it: it costs one check and documents the only route to L-01.
