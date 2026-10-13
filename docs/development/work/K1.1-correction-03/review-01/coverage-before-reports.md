# Independent coverage, recorded before reading implementation reports

Reviewer: Codex Desktop session 01a131fe-f3aa-77c0-940b-6d5d3963afef, gpt-6-astra, xhigh. Governing policy B b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b; review subject H 5f586b176089987fa3667e4c03f26b3dac0a5bfb. Read brief/design/check/owner-choice, decision-05, DESIGN-AUDIT decisions 01/02, baseline value owner and 006/007/008/012 before this map. Reports and C1 explanation not yet read. This is a coverage plan, not findings.

| Criteria / source | Distinguishing examination | Required observation |
|---|---|---|
| KC3-1, decision-05 1/3/4 | Trace caller observations, all work-sized loops, allocations and diagnostic construction from each entry; inspect helper confinement and static-check omissions; remove/duplicate operations and compare runtime oracle coverage | Every cost attributed, no capture-reachable serializer exemption, plausible bypass rejected; declared gaps are honestly bounded |
| KC3-2, decision-05 2, design check Q3 | Re-derive per-node byte inequalities; nested singleton arrays, wide compact leaves, strings/keys incl. escaping/surrogates, shared subtrees; at/over limits; exact named witness | Valid snapshots keep units <= 3*canonical bytes <= B, monotone meter cannot prematurely stop; count witness exactly; refusal stops on first over-budget charge |
| KC3-3/6, design check Q5/Q6, owner choice R4 | Trace engine costs vs abstract charges; distinguish length discovered only after enumeration, hidden entries, host interceptors and hash assumptions; inspect all residual wording | Limits R1-R4 and undetectable families explicit; no universal engine-time or no-caller-code guarantee; hold request restricted to approved scope |
| KC3-4, review-08 depth family | Fixed refused work at depths 2/16/31; O(1) cycle-set operations; eager 8-root caller lacking grant | Same per-position work, separate root meters; unauthorized submission and complete state/receipt unchanged |
| KC3-5, review-08 N15 | Inspect and rerun each charge-site deletion/weakening mutant, array extra names below/above cap | Fails for the intended count/position assertion, not syntax or unrelated failure |
| KC3-7/8, decision-01 2/3, Q4/Q6 | Every root consumer incl. identity and recovery; revoked/callable/array/exotic proxies, built-in brands at both plain prototypes and foreign realm, tag spoof control | Proxy first before IsArray, no traps; supported internal-slot refusal before listing; declared undetectable limit preserved |
| KC3-9, amended authority Q1/Q4 | Cumulative code+test changes, complete-decision oracle, poison/fault runs, allowances by exact read, C1 before/after distinguishing mutants | No unauthorized changed behavior or weakened regression oracle; capture meter does not mask downstream tests; ambient read and commit guards retain purpose |
| KC3-10, values owner / BASELINE | Normative diff + dependents, ownership, status/hold language, new issue vocabulary, unchanged open decisions | Single owner per rule; current spec says actual new contract, no implementation status or inflated claim; migration explicitly scoped |
| KC3-11, TOOLS-01 / supplemental owner decision | Fresh clean C under exact Node 26.10.0, single validation job; full verify, corpus then three mutation registries; identity and preserve/adoption transfer checks | Required results independently reproduced, logs retained, no acceptance inferred from report assertions |

Beyond corpus: vary width, depth, aliasing, refusal family, prototype, diagnostic mode, consumer, and single/eager roots. Include valid values (budget derivation) and mixed accepted/refused siblings (byte/meter interaction). Declare exact implemented search dimensions, seeds and exclusions after running. No finite search is universal proof.

Methods: structural trace, deterministic execution, normative/document review, process/evidence review; maintained fault/poison schedules for affected behavior. No live providers, durable storage or isolation benchmark: this packet claims none. No subagents; independent reviewer is a separate session from the named implementer.

Owner supplemental decision, 2026-10-12, relayed directly in this review prompt, verbatim:

> The owner choice 01 standing rule covers a changed witnessed test, not a changed helper module.
> artifact-21fb34d9 (ambient-reads.test.ts) and artifact-ada9f66c (control-commits.test.ts) stay
> complete, because only zone-analysis.ts and zone-inventory.ts changed. The owner also accepts the
> coding agent's 007 TOOLS-02 scope edit and the kernel-sweep timeout of 2,400 s in verification.json.
