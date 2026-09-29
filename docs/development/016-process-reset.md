# Process reset, September 2026 — evidence and rationale

This page explains why the development process changed on 2026-09-28 and how to judge whether the
change works. It records evidence and reasoning; it owns no policy. [006](006-development-process.md)
owns the rules, [009](009-universal-prompts.md) the launchers, [008](008-implementation-report.md)
the record templates and [012](012-review-methods.md) the proof methods.

## What the record shows

The owner has used the strongest coding agents available on both sides of review: Claude Opus 5.5,
GPT-6 at the highest effort, and others. The number of rounds did not fall, which points at the
process rather than the agents.

**Rounds per packet.** Each implementation packet needed 12–17 independent review rounds:

| Packet | Reviews | Implementation rounds |
|---|---:|---:|
| K0.1 | 12 | 12 |
| K0.2 | 17 | 16 |
| K1.0 | 17 | 16 |
| K1.1 | 16 | 17 |
| K1.1-correction-01 | 8 | 5 |
| K1.2 | 15 | 14 |
| K1.2-correction-01 (to review 08) | 8 | 4 |

Counts come from the pinned archive `9fd2faa` for closed packets and from `work/` for open ones.

**Verdict flips on identical candidates.** Four times, a later review found a defect in exactly the
H an earlier review had accepted or found acceptable: K1.2 reviews 13 → 14, K1.2-correction-01
reviews 03 → 04, the draft preceding review 06, and the draft preceding review 08. Two of these
pairs were the same model. The later reviews were right, and so were the earlier ones about what
they searched. The acceptance question, "can you find a counterexample?", has no end.

**Finding families.** Of 36 distinct K1.1 findings:
- 12 concern in-process value capture against hostile same-process JavaScript (`VAL`, `STATE`,
  `LIMIT`, `JCS`): Proxy traps, prototype pollution mid-capture, serializer iterator hooks.
- 11 concern the process records themselves (`PROC`, `DOC`).
- The rest are identity, disposition and evidence findings.

Of 25 K1.2 findings, 9 concern records (`PROC`, `DOC`, `REC`) and 4 concern evidence that did not
distinguish a wrong implementation (`EVID`). Of 9 K1.2-correction-01 findings, 5 concern value
refusal cost and diagnostics, and 4 are `EVID`.

**Record weight.** The K1.2 contract is 51 KB and the correction contract 22 KB at revision 5.
Reports are about 27 KB and reviews 21–35 KB each. The K1.2 and correction folders hold 7.8 MB and
8.4 MB. The correction round 4 attached 42 raw logs. The packet used six separate ablation runners,
each written for one round.

**The same pattern, one level up (added 2026-09-29).** K1.2-correction-01 was narrowed to fix
review 09's inherited-read defect. The runtime fix was correct, but its contract then required
*mechanical enforcement* of the rule. Two Opus 5.5 rounds built a syntactic scan, and then a
1,634-line TypeScript analyzer. GPT-6 reviews 10 and 11 each produced new evasive mutants that pass
all 1,411 Kernel tests: a member introduced through a cast, a default parameter, a local named
`undefined`. The runtime passed every check. The claim was a sound static analysis of future code,
which no round can finish. The prompt that asked for mechanical enforcement came from the drafter of
this page. Amendment 03 moves the proof to runtime sweeps.

## Root causes

1. **Claims that cannot be finished.** V-D1 compares refusal time with the costliest acceptance of
   any value. Each round found a new shape; none could prove there were no more. Owner
   [decision-05](https://github.com/ArrokothI/arrokothi/blob/13a73ad9ad0662fe585d1453280c5ac3da4f79bb/docs/development/work/K1.2/decision-05.md) replaced it with a metered bound. The general lesson: a
   universal claim needs a mechanism that makes it checkable, decided before implementation.
2. **Patching findings instead of mechanisms.** Corrections closed the counterexample they were
   given. The authority/grant family took five rounds and the refusal-cost family four; each fix
   left a sibling open. 006 already asked for subsystem reconstruction, but it had no stop.
3. **Accepted design treated as fixed.** Contracts required owner amendments to touch accepted
   behavior, so agents defaulted to building around it. An example is the capture discipline:
   `own-array.ts` reads a property descriptor on every stack step to resist prototype pollution,
   and that cost produced review 08's depth defect. Several defects trace to K1.1 design that no
   packet was allowed to question.
4. **A threat model the architecture itself disclaims.** The in-process binding defends against
   hostile code in the same process, while `values.md` and decision-04 state that such code is
   contained only by isolation. A large share of K1.1's P1 findings and code exists for this. The
   owner routed this question to DESIGN-AUDIT-01.
5. **Counterexamples were not kept.** Probes and mutants lived in review folders. The next
   implementer could not run the last reviewer's search before handoff, and the next reviewer
   searched again from scratch.
6. **Records generated their own defects.** Long contracts with dense revision prose, many
   attachments and exact allowlists produced about a third of all findings, and consumed agent
   effort that the design needed.
7. **Enforcement demanded where proof was needed.** Requiring a static tool to be sound against any
   future code turns a correct fix into an open-ended research task. Rules about future code are
   proved at runtime or by construction; linters are guards.
8. **Generic prompts, specific packets.** The launchers carried policy, while the packet-specific
   knowledge (where the traps are, which design looks suspect, which questions to answer first) was
   left for each agent to rediscover.

## What changes

| Root cause | Change | Owner of the rule |
|---|---|---|
| 1 | Every criterion states how it closes: deterministic check, structural mechanism, or declared bounded search | 006 principles; 012 finishable criteria |
| 2 | Stop and redesign after a repeated failure in one subsystem, a verdict flip, or a third CHANGES REQUIRED | 006 |
| 3 | "Accepted is not correct" and "ask early" principles; a design note before code | 006; AGENTS.md; 009 Prompt A |
| 4 | DESIGN-AUDIT-01 brings evidence-backed options to the owner | 007 seed; [brief](work/DESIGN-AUDIT-01/brief-01.md) |
| 5 | Maintained counterexample corpus and one mutation registry; reviews start by running them | 006; 012 |
| 6 | Short contracts; one verification command; raw logs only when not cheaply reproducible | 006; 008 |
| 7 | Runtime or by-construction proof for rules about future code; analyzers are guards | 012 finishable criteria |
| 8 | Packet briefs written by the planner or the reviewer; short universal launchers | 008 templates; 009 Prompts D and E |

Independence, exact C/H identity, owner release, no self-acceptance, Layer-3 ownership rules and
the E-gate rules are unchanged.

## Sequence

1. **K1.2-correction-01, revision 6.** Narrowed by [amendment 01](https://github.com/ArrokothI/arrokothi/blob/13a73ad9ad0662fe585d1453280c5ac3da4f79bb/docs/development/work/K1.2-correction-01/amendment-01.md),
   with no production-code change. It is reviewed under the policy baseline it started under, then
   integrated with K1.2 if accepted.
2. **Adopt this reset.** It applies to work that starts after adoption.
3. **DESIGN-AUDIT-01.** The first packet under the new process. It changes no code and delivers a
   design-debt register with options. It can run in parallel with step 4.
4. **TOOLS-01, proposed.**
   - One `verify` command per packet.
   - One maintained mutation registry and runner, replacing the per-round ablation scripts.
   - A corpus directory that ingests every recorded refusal-cost, identity and authority
     counterexample.
   - The existing sealed runners stay as historical evidence.
5. **K1.1-correction-03.** The metered V-D1 bound, after the audit's threat-model decision.
6. **K1.3**, under the new process.

## How to tell whether it works

Each integration receipt records:
- rounds to ACCEPT;
- findings by family, where the families are design, evidence and records;
- verdict flips;
- one process change to try.

After three packets under this process, compare against the baseline above. It works if:
- rounds fall to about three or fewer;
- records findings become rare;
- no flip happens without a new corpus entry explaining it.

If rounds do not fall while findings stay semantic, the design check is too weak. If flips recur,
criteria are still not finishable.
