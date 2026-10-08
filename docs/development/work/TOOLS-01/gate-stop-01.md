# TOOLS-01 gate stop 01 — the gate on TOOLS-01's own B..H exceeds the 50-origin limit

2026-10-05. Claude Code (`claude-opus-5-5`), implementer. Owner choice 04 §3: "If that would close
more than 50 of the 1,395 `pending` origins, the implementer stops and reports the count, the areas
and the derivation before closing any." No origin was closed for the gate. TOOLS-01 remains
IN_PROGRESS; item 6 (P2) is not started.

## Run

`packet_tools.py gate --revision 48f3d583… --spec docs/development/work/TOOLS-01/verification.json`
(40 s). The base is `f62527e8`. There are 174 changed paths, administrative files included. The
68-area map and the derivation are [gate-design-01](gate-design-01.md)'s. Result: `gate_blocked`.

**Touched areas (8):** `tooling`, `docs/development/work/TOOLS-01`,
`docs/development/007-work-packets.md`, `AGENTS.md`, `README.md`, `package.json`,
`package-lock.json`, `tests/conformance/effects`.

## Count

The gate blocks **824 of the 1,395 `pending` origins**: 778 mentions, 45 artifacts and 1 addition.
It also blocks 20 of the 44 open revalidation origins (owner choices 04 and 05). TOOLS-01 cannot
close those 20 under those decisions, so the gate cannot pass for TOOLS-01 even at zero pending.

| Why the origin has a touched area | Pending origins |
|---|---:|
| It names no path, so it has every area | 654 |
| It names the 007 work-packets file and no other touched area | 57 |
| It names only Node-floor files (owner choice 03: `AGENTS.md`, `README.md`, `package.json`, `package-lock.json`, `tests/conformance/effects`) | 93 |
| It names only TOOLS-01's tooling or record directory | 4 |
| It names a mix of touched areas | 16 |

The 654 underivable origins are heading sections that name no repository path:
K1.2-correction-01 304, K1.1 172, K1.2 136, K1.1-correction-01 34, K1.1-correction-02 6, other 2.
[blocking-origins.json.gz](gate-stop-01/blocking-origins.json.gz) (SHA-256
`475d3650194e5ff1552ffd4f16ce6c54e805d23e7cebd9f88d3d64301551ea52`) lists all 844 blocked origins,
with path, line, state and touched areas.

## Consequence beyond TOOLS-01

An origin with every area is touched by any change. While these 654 stay open, the gate blocks
**every** packet, including K1.3, K1.1-correction-03 and BINDING-01. In effect, owner choice 04's
"every area when underivable" rule makes TOOLS-02's mention triage a prerequisite of all of them.
The 007 TOOLS-02 text says the opposite: "Not a dependency of K1.3, K1.1-correction-03 or
BINDING-01".

A broader text does not get under 50. When a section names nothing, deriving from the whole record
(measured in scratch) still gates 701 pending origins for TOOLS-01, and 84 remain underivable.

## Decision needed

These are the owner's options, not an implementer choice:

1. Close the 824 in TOOLS-01. This is TOOLS-02's scope moved back.
2. Change the gate rule. For example:
   - a different fallback for underivable origins;
   - exempting paths changed by recorded owner decisions (the floor and 007 edits);
   - excluding the 44 owner-limited or transferred origins from TOOLS-01's own gate.
3. Leave the gate as built, make TOOLS-02 precede every other packet, and record TOOLS-01's
   own failing gate as a known limit.

The mechanism stays committed at `48f3d583` with its tests. The corpus run at that commit is in the
commit message that adds this record.
