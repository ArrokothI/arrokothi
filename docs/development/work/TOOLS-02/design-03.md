# Design 03 — TOOLS-02, T2-4 only (under owner choice 02)

- **Author:** Claude Code desktop session (`claude-opus-5-5`), the implementer, 2026-10-23 (America/New_York).
- **Inputs:**
  - [owner choice 02](owner-choice-02.md);
  - [design check 02](design-check-02.md), D02-CHK-05;
  - [design 01](design-01.md) §4.1, for the measured register.
- **Replaces:** design 01 §4.2–§4.3 and design 02 §4. Every other part of designs 01 and 02 stands.
- **Next:** a short design check before range 3; no range-3 code before it.
- **Addendum:** §6 answers [design check 03](design-check-03.md) (`d0b18b0d`): D03-CHK-01 and its §5
  recommendation. Under 006 it is a routine correction inside an approved design, so it needs no new design
  check; the range-3 review checks it.

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

## 6. Addendum after design check 03

### 6.1 D03-CHK-01: the unread cascade through C2-LIMIT

`limited_origins` is the fifth consumer of the cascade. Both of its V-ENV routes bind to the released claim
instead of the owner choice 08 hold:

- **Listed members.** `rule_1_held` becomes `released_venv_unread`. A listed member counts when:
  - its status is `unread`;
  - its register entry is classified `unread` with claim V-ENV;
  - that entry's `decision` is the V-ENV claim's fixed release record, BINDING-01
    [hold release 01](../BINDING-01/hold-release-01.md);
  - the claims table marks V-ENV `released`.
- **Extra targets.** The guard requires the same entry: classification `unread`, claim V-ENV and the release
  record as its decision. The target's refusal must be exactly `[P1H_TARGET_REFUSAL.format('unread')]`.

Everything else in `limited_origins` stays as it is:
- the pinned-list and digest checks, and the origin checks;
- the one-target mapping;
- the literal-title requirement;
- the exact P1-H-only refusal;
- the set equality `unbound == listed | extras`.

An unread member counts only when it is listed. So the 32 listed members and 21 extra-target routes that
design check 03 counted keep their identities and counts, and no other unread member becomes an exception.
Every one of them stays uncredited: `unread` members earn nothing, and their targets stay refused by P1-H.

The old form, `held` with `VENV_RECORD`, no longer counts on either route. Check 1 already refuses it in
`corpus`, so no owner choice 08 hold becomes active again.

**Controls.** GPT-6's two probes become maintained tests in `test_transfer_limits.py`, and range 3's
self-check repeats the figures on the real manifest.

| Control | Expected |
|---|---|
| A listed member `unread` under V-ENV with the release record | accepted; `{'listed': 1, 'extras': ['m.extra']}` |
| An extra target at an `unread` V-ENV leaf, refused by P1-H `unread` only | accepted; same result |
| Either route with another claim (Proxy) or with another release record (K1.1-correction-03's, or `VENV_RECORD`) | refused |
| Either route in the old form (`held`, `VENV_RECORD`) | refused |
| An extra with no target, or with two targets | refused |
| An extra whose target also has a P1-T refusal, or has a template title | refused |
| Real manifest at range 3's C | 32 listed members and 21 extras in the same four origins; zero credit |

The existing tests that accept the old form (`test_a_listed_member_held_by_rule_1_stays_in_the_limit` and the
extra-target baseline) change to the released form; the old form moves into the refused rows.

### 6.2 Design check 03 §5: no executable `limit` class

Range 3 builds no `limit` class. This addendum replaces the `limit` row in §1's class table, corpus check 3,
and the `limit` control in §4:
- an entry classified `limit` is refused as an unknown class;
- §4's `limit` control changes to: "An entry classified `limit` → refused".

The rule is recorded only. A later packet that classifies an entry as a semantic limit must:
- record a per-entry reading;
- map it to a current 017 limit;
- design the member and witness cascade for that class (`preserved_table`, `witness_records`,
  `origin_closure`) together with its controls.

L-01 and the owner's permission to classify an entry after reading it are unchanged. `not_held` through a
reading stays as §1 states it.
