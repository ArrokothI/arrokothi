# Brief 06 — K1.4 Layer-3 timer-path correction

Correct the same accepted packet K1.4 on `claude/k1.4`, as a scoped documentation correction under
006's Layer-3 maintenance rule. It does not reopen or invalidate the accepted implementation.
Base `608f9ece44dbe42b78974bdac9e7ddcd33697705`; accepted H `e307943d6b315e724e49107c3b26a1100ef4916c`
over C `72d452bb39e0ae0f846d85e273441d06a9cd22fb`; independent [review 05](../review-05.md) recorded at
`7bf80555c9549b980b47f60592fc049b9da7e175`.
Finding record: [reference check 01](../reference-check-01.md), **CLEANUP-K14-01**. The owner-delegated
cleanup agent raised it; it is not a reviewer finding. Optional in the same scope: observation **O-2**.
Owner decisions in force: owner choices 01–06 and the 2026-11-11 supplements. Unresolved authority:
the owner chooses whether this correction runs before the manual merge ([cleanup 01](../cleanup-01.md)).

## Goal

`mental-model/mechanisms/execution-cycle.md` says deadlines take effect only when the host fires
them. That is false for a wait already due at registration, which `waits.md` owns. Make the
execution-cycle page agree with its owner, for readers of the target mechanism.

## Criteria (finishable)

| ID | Criterion | Closes by | Evidence expected |
|---|---|---|---|
| R6-TIMERS | `execution-cycle.md`'s host paragraph distinguishes the three paths: due at registration (inside the accepting decision, no host fire, owned by [waits § Registering a wait](../../../../../mental-model/mechanisms/waits.md#registering-a-wait)); live wait (host fire); Execution deadline (host fire) | Deterministic text comparison with `waits.md` step 3, the K1.3 binding note at `operations.md:126` and BASELINE timer paths 1–3 | Diff of the paragraph; a grep for "never pumps" and "take(s) effect only when" with no unqualified copy left |
| R6-SCOPE | Only Layer-3 prose changes, plus O-2's clause if taken. No code, test, fixture, configuration, Kernel or core byte changes. Historical records unchanged | `git diff --name-only` over prior H..C; Kernel/core trees equal B | The changed-file list; the candidate check over the C..H allowlist |
| R6-EVIDENCE | The correction has its own C/H and proportionate validation | 006 C/H; local Markdown path/anchor check over `mental-model/`; architecture tests; builder docs | Logs at C. A Packet verify run at C follows the round-5 precedent unless the owner waives it for a prose-only diff |

## Known counterexamples

- `packages/kernel/tests/owner-guards.test.ts:362`: due at registration, the Outcome's own clock
  reading expires the wait with no host fire and no pending timer.
- `packages/kernel/tests/waits-registration.test.ts`: one case for each W-2 branch, including the due
  deadline with no eligible Event.

Both already pass; the correction makes the prose match them.

## Suspect design

None in the code. The defect is a rule restated outside its owner. Suggested text for
`execution-cycle.md`, with links relative to that page, for the coding agent to adjust:

```markdown
The Kernel has no scheduler of its own. The host that owns an in-process coordinator decides when to
dispatch a `READY` Execution and when to fire the timers the Kernel reports due. A wait whose deadline
is already due when it registers expires inside the decision that registers it
([waits](waits.md#registering-a-wait)). A live wait's deadline and an Execution deadline take effect
only when the host fires them, so a host that never pumps timers never expires either.
```

For O-2, the last sentence of `values.md:323` could read (link relative to `values.md`):

```markdown
The capture module stays internal; the SDK's public entry re-exports its `toCanonicalBytes` (see the
[implemented baseline](../../docs/development/002-implemented-kernel-baseline.md)).
```

Keep status out of the concept page apart from that link.

## Questions before code

1. Does any other current page restate the timer rule? Grep `mental-model/`, `docs/guides/` and BASELINE.
2. Take O-2 in the same correction, or leave it? The owner's choice; default: take it if the owner agrees.

## Bounds

No design note or design check is needed: this is prose agreeing with accepted K1.3 behaviour. Do not
change `waits.md`, `operations.md` or BASELINE, which are already correct. Do not merge review branches,
rewrite earlier records or self-accept. No successor or K14-G release.

## Stop conditions

Stop and ask the owner if the correction would change a Kernel rule, a K1.3 binding choice or code, or
if another Layer-3 page turns out to own a conflicting rule.
