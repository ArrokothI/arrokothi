# Design check — design 01, K1.1-correction-03

**Record type:** owner decision (design check of [design 01](design-01.md)), relayed by the owner in the
implementing Claude Code cloud session (`claude-opus-5-5`) on 2026-10-09 and recorded verbatim by that session
in the packet's first build commit, as the owner instructed. It is not a review, an implementation or an
acceptance. It releases no hold and no other packet.

The owner's message, verbatim:

```text
Design check for design-01 (owner, 2026-10-09): APPROVED with conditions. Proceed to build.

Answers to §8:
1. Q1: authorized under decision-05 item 2. Refused values past B stop at the meter. DEC-7 counts
   describe the positions examined. No accepted value may change.
2. Q2: accepted. New code `too_much_work`, plus `unsupported_form` with fixed messages for Proxy and
   built-in refusals. State whether the issue-code type is publicly exported, and record the addition
   in values.md and BASELINE.
3. Q3: accepted. B = 3 × canonicalBytes is a proven upper bound. Record the derivation, the costliest
   witness (asserted exactly) and the gap in BASELINE. `encode` stays outside the meter.
4. Q4: refuse all three (arguments objects, module namespaces, raw JSON). SELF-K113-RAWJSON-01 is in
   scope and closed by this packet.
5. Q5: accepted as the narrowed exclusion. Retire the live-Proxy exclusion. State R1–R3 explicitly in
   values.md and BASELINE.
6. Q6: accepted as a declared limit (not a guarantee) under decision-01's cooperative contract. List
   the undetectable kinds in values.md and BASELINE. The report must state that the invalidation-01
   release requested is against this narrowed claim.
7. Q7: confirmed: envelopes stay under the envelope rule, a new value-cost.json registry, and no
   adoption origins closed. Layer-3 text must not claim that no caller code runs in the Kernel, since
   Proxy envelopes still run traps. Name that gap as BINDING-01's.

Conditions:
- C1: For every converted Proxy-instrument test (§7.2), show by ablation that the mutants it killed
  before are still killed after conversion. List each group, its mutants and the results in the report.
- C2: Amend KC3-9's authority line in your report to name decision-05 item 2 (Q1) and this design
  check (Q4), as well as decision-01 items 2–3.

Record this check verbatim as docs/development/work/K1.1-correction-03/design-01-check.md (owner
decision, relayed in the session) in your first build commit. Then continue as the brief says: clean C,
detached verify, H with implementation-01.md, push, hand off B/C/H.
```
