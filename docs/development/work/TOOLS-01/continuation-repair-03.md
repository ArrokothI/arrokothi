# TOOLS-01 continuation repair 03 — V-ENV register classification (TOOLS-CONT-05)

2026-10-05. Claude Code (`claude-opus-5-5`), implementer, taking over item 2 of the owner's
continuation request under [owner choice 04](owner-choice-04.md). Partial start: `d2a27c10`
(Codex, "working"), which widened the V-ENV recipe and added `test_venv_register.py`. Incremental
checkpoint only; no final C/H, independent acceptance or hold release.

## Recipe defect and fix

**Cause.** `d2a27c10` added an alternative made of two unanchored lookaheads (an intrinsic
prototype, and a `defineProperty` call, anywhere in the body). Python's `search` retries it at
every position, so a miss costs time quadratic in the body: 0.66 s for 10 kB, and the
helper-expanded register bodies did not finish within 600 s. The corpus could not compute the
register at all.

**Fix.** The alternative is anchored with `\A`. The language is unchanged: both lookaheads scan to
the end of the body, so if the pair matches at any position it also matches at position 0. The
matching runs in 9 s, as before. A new test bounds a 40 kB miss at 2 s and checks both orders of
distant halves. Ablated (unanchored), the same miss takes 11.0 s.

## Classification and census

The widened recipe finds 161 leaf registrations instead of 140: 21 new keys, and 52 existing
entries that now also match V-ENV. One rule, without per-test review (owner: refuse when unsure):

- a new key is `held` under V-ENV;
- a `not_held` entry that now matches V-ENV becomes `held` under V-ENV, and its reason quotes the
  earlier one (23 entries);
- a `held` or `superseded` entry keeps its classification and claim; only `matched` changes
  (29 entries).

The register now holds 54 V-ENV, 28 V-D1, 10 Proxy and 1 built-in `held`, 46 Proxy `superseded`
and 22 `not_held` entries. A narrower classification remains possible for BINDING-01; it needs a
per-test reading this packet does not make.

The regenerated preserved census keeps 1,272 members. Against the earlier
810/62/74/326 (preserved/held/superseded/refused) it is **766/125/74/307**: 44 preserved and 19
refused members became `held`. `preserved_register_not_held` falls from 46 to 23.

## Recheck of the 398 built targets

All 398 targets pass their P1-T checks at C, with no refusal (505 s). Applying the register:

- **378** stay suite targets, for 282 distinct refused members.
- **19** bind members that are now `held` (values 10, ambient-reads 1, dispatch 8). They route to
  those members' attributed V-ENV witnesses and are not imported. This includes the CONT-05 target
  `target.values.1424.3.fb228bec8c58`; its leaf `values.test.ts:1728:3` is now a V-ENV entry.
- **1**, `target.dispatch.1363.3.5a8d958ffdab` (an authorized replacement), sits on
  `dispatch.test.ts:1390:3`, now `held` under V-ENV, so it cannot earn credit. Its member stays
  `refused` and unbound, in `dispatch.test.ts`, an origin owner choice 04 already keeps open.

The 307 refused members are 282 bound, the 24 limited by owner choice 04, and this one.
One witness per held or superseded member gives 199 witness records: the 136 earlier ones,
reproduced unchanged, plus 63 for the members that moved. They are imported with the targets in
item 3; this checkpoint imports none and closes no origin.

## Ran

Node v26.10.0 first in PATH; long jobs under `caffeinate -i`; the checkout untouched while they ran.

- Register recomputation at `b103e4b2` with the repaired tool: 161 matches, 9 s.
- Census recomputation (`hold_register`, `preserved_census`): 107 s; the table above is its output.
- P1-T recheck of all 398 targets (`check_target`, scratch driver): 505 s.
- The results of the tooling suite, the refusal registry and the corpus run at the commit are in
  its message.

Not run: mutations, composed verify, production suites, the 77 case pairs. No production, Layer-3,
sealed-record or 007 edits; no new dependency or third-party material.
