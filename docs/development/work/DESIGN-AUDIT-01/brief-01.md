# Brief 01 — DESIGN-AUDIT-01, root-cause audit of accepted design

Prepared on 2026-09-28 by the Claude Code session (`claude-opus-5-5`) that wrote K1.2-correction-01
review 08, at the owner's request. It is ready for release. The packet stays PLANNED until the owner
releases it explicitly. The owner directed this audit when adopting K1.2 decision-05: the
in-process capture threat model is settled here before K1.1-correction-03 writes code.

## Goal

Find the accepted design choices in K0.1–K1.2 that keep producing defect families, rework or
complexity. Give the owner evidence-backed options for each, so later packets fix causes rather
than findings.

## Criteria (finishable)

| ID | Criterion | Closes by | Evidence expected |
|---|---|---|---|
| DA-1 | Every finding ID in the review records of K0.1, K0.2, K1.0, K1.1 (all corrections and reference) and K1.2 (and correction-01) is enumerated and classified as design, evidence or records, and by subsystem. Closed packets are read at the pinned archive `9fd2faa`; open ones at the audit's base | Deterministic check: a script lists the IDs from the pinned records and a table classifies each one | Script, output and table |
| DA-2 | Every family with at least three findings, or findings in at least two rounds, has a register entry that contains: the design choice that allowed it (code sites and rule links); why reviews found it one instance at a time; at least two options, one of them "keep", each with its cost, its benefit and the accepted claims it affects | Declared search: the families come from DA-1 | `register.md` |
| DA-3 | The register covers these starting items, whether or not DA-2 selects them: (a) the in-process capture threat model (b) the own-array and serializer-sandbox discipline (c) exotic-object classification (d) the shape of `coordinator.ts` (e) any design the DA-1 evidence implicates. Details are under **Suspect design** | Declared scope: items (a)–(e) | Register entries (a)–(e) |
| DA-4 | Each option names the finishable criteria its follow-up packet would use, so no follow-up packet inherits a claim that cannot be finished | Structural: every option row has a criteria column | Register |
| DA-5 | Every quantitative statement (cost, size, count) is backed by a small reproducible probe | Deterministic check: the probes rerun | `probes/` plus outputs |
| DA-6 | Each item ends in a draft owner decision: a recommended option with its alternatives. The audit decides nothing itself | Structural | `decision-drafts/` |
| DA-7 | No production code, test, Layer-3 page or implemented-baseline claim changes | Deterministic check: `git diff` of the audit's base against H touches only `work/DESIGN-AUDIT-01/` and 007's row | Diff |

## Known counterexamples and evidence to start from

- **Reviews and blockers:** K1.2-correction-01 review 08 and its `review-08/` probes (deep refusal,
  N15, exotic enumeration, re-prototyped built-ins); blockers 01 and 02; review 06's R-P probes.
- **Hostile-JS findings in K1.1:** the `VAL`, `STATE`, `LIMIT` and `JCS` findings, which review 08's
  analysis and [016](../../016-process-reset.md) summarize.
- **Owner decisions:** K1.2 decisions 02–05.

## Suspect design

- **(a) Threat model.**
  - **Observed:** the binding defends against hostile code in the same process. That code includes
    Proxies, prototype pollution during capture and serializer hooks.
  - **The mismatch:** `values.md` ("they do not contain code that shares the process") and
    decision-04 say that only isolation contains such code.
  - **Options to evaluate:**
    - keep the adversarial model;
    - a cooperative-caller model: defend against accidents such as getters, mutation after submit,
      cycles and `undefined`, and route hostile callers to an isolated or bytes binding;
    - bytes or text intake at the Kernel boundary, with an in-process convenience wrapper.
  - **For each option, state:** the code, tests, Layer-3 rules and claims that would change; the
    K1.1 findings that become moot; SDK compatibility; the effect on V-D1 and decision-05's meter.
- **(b) Own-array and serializer-sandbox discipline.**
  - `own-array.ts` reads a property descriptor on every internal list step.
  - The JCS window restores primordials and prototype shapes on every call.
  - Assess their cost (review 08's depth defect comes from this), their complexity, and what each
    option in (a) would remove.
- **(c) Exotic-object classification (O-R8-4).** Re-prototyped Map, Set, Date, ArrayBuffer and typed
  arrays are accepted as plain objects, which silently drops their content, although `values.md`
  refuses those forms.
- **(d) Coordinator shape.** `coordinator.ts` is 2,382 lines in one class. Assess whether its
  structure scales to waits (K1.3), Effects (K2) and persistence (K3), or will produce the same
  ordering and authority families again. The authority/grant family took five rounds in K1.2.
- **(e) Anything else DA-1 surfaces**, for example repeated records defects that point to a
  process design problem. Hand those to the process owner rather than solving them here.

## Questions before starting

None are required. The auditor may ask the owner to rank items when time is short.

## Bounds

- **Read-only on product code.** Probes live under `work/DESIGN-AUDIT-01/probes/`.
- **Nothing is decided here.** Accepted behavior and claims change only through owner decisions and
  later packets.
- **Out of scope:** process-document changes, which belong to 006/016. Put process observations in
  the register for the owner.

## Stop conditions

Stop and ask the owner in these cases:
- an item cannot be evaluated without a semantic decision;
- the evidence suggests an accepted claim is false in a way that needs an invalidation notice under
  006.
