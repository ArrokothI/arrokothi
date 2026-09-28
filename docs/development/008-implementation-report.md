# Candidate, review and handoff records

[006](006-development-process.md) owns policy and C/H/A identity; [012](012-review-methods.md)
owns coverage methods. Use versioned records under `work/<packet-id>/`. Keep current facts concise,
link raw evidence and historical findings, and say “none”, “not run” or “unknown” with a reason rather
than silently omitting a field. Never fabricate a session/model, command result or external decision.

## Packet brief

The brief is the packet-specific prompt. The planner writes it for a new packet, and the reviewer
writes it for a correction. It is read together with a short launcher from
[009](009-universal-prompts.md). Keep it readable in five minutes, and link canonical owners instead
of copying their rules.

```markdown
# Brief <n> — <packet>

## Goal
Two sentences: the problem this packet solves, and for whom.

## Criteria (finishable)
| ID | Criterion (link its governing source) | Closes by: check / mechanism / declared search | Evidence expected |

## Known counterexamples
Corpus files the build must keep passing, and new items to add, with provenance.

## Suspect design
Accepted designs this work relies on that the evidence questions. Give the evidence, and the
question the design note must answer about each one.

## Questions before code
Design questions the coding agent must answer, or put to the owner, before implementing.

## Bounds
Non-goals, forbidden shortcuts, owner decisions in force, and branch instructions.

## Stop conditions
When the coding agent must stop and ask instead of continuing.
```

## Design note

Written by the coding agent before code. It is checked by the owner or a delegated design reviewer.

```markdown
# Design <n> — <packet>

## Mechanism
What will change, in a few paragraphs, with the key data structures and boundaries.

## Why each criterion closes
Per criterion: the mechanism, and the argument that it covers every case (or the declared scope of
the search). Tests confirm the argument; they do not replace it.

## Accepted designs relied on
For each: whether it is fit for this purpose, and if not, the proposed root fix and who must approve it.

## Corpus
Counterexamples to maintain, including every item from the brief and any attack record.

## Questions
Open questions for the owner. The design check answers them before code.
```

## Attack record

Written by a separate adversary session, before or during design, for risky packets.

```markdown
# Attack <n> — <packet>

| Item | Criterion | Input or schedule | Expected result (derived from governing sources) | Why it is hard | Probe file |

Expected results that the sources do not decide are listed as questions for the owner.
```

## Implementation report

```markdown
# Implementation report — <packet>, round <n>

## Identity
- Packet/parent; contract path and revision; governing process baseline:
- State; owner release; prerequisite ACCEPT and integration identities:
- Branch/configured remote; full base and payload C; previous reviewed H/review:
- Candidate H: commit containing this report (full SHA in external handoff).
- Exact C..H administrative file allowlist, including any raw-output attachments:
- Working-tree state; push status as observed, or pending external handoff:

## Changes and coverage
- Change groups and full cumulative diff; ownership and governing sources:
- Selected 012 methods; material exclusions and why:
- Obligation/interaction coverage with expected facts, forbidden changes, source/test/trace and result:
- Tests added/ported/removed and reasons; compatibility/refusal; baseline/guides/skills impact:
- Legacy code/docs/dependencies retired, or retained with consumer and retirement owner/trigger:
- Semantic correction closure: changed invariant, dependent paths, counterexamples and evidence:
- Design note and design-check outcome; corpus items added, with provenance:
- Accepted design found unfit (if any): evidence, proposed root fix, owner question or decision:
- Prior findings: open IDs → disposition/evidence; closed findings → prior disposition links:
- Additional self-found defects (separate provenance); unresolved obligations and unblock conditions:

## Validation and interpretation
- Verification command and its summary at clean C (tool versions, commands, exits, counts/skips);
  raw paths and digests only for runs that cannot be reproduced cheaply (006):
- External fixture prepared / gate executed / external decision, separately; pinned owners/revisions:
- Checks not run and resulting claim limits:
- Why evidence supports each criterion (implementer assessment, not acceptance):
- Design choices, owner amendments, assumptions, strongest remaining risk:
- Third-party review under AGENTS.md, or none:

## Handoff
- Ready for independent review, or exact remaining work:
- Base/C/H and verified push SHA supplied externally; offline artifact identities when applicable.
- No self-acceptance; successor release remains owner-controlled.
```

A report written before H is pushed cannot certify that future push. Supply H and verified advertised
remote SHA in the external owner handoff after pushing; a second report commit solely to describe
its own push is unnecessary. Raw evidence may be inline, declared output-only attachments under 006,
or an accessible pinned external artifact with digest and retention owner. A temporary local path or
hash of an inaccessible payload is insufficient. Keep secrets/private evaluation material out of records.
Scripts, fixtures, configuration and evaluators are payload, never administrative attachments.

## Reference maintenance evidence

For accepted-work documentation maintenance, record the accepted semantic sources, changed Layer-3
owners (or why none changed), additional dependencies inspected, resolved placeholders, replaced
current descriptions, index/link/example validation, and any justified Layer-1/2 change. Use the
[roadmap mapping](../../mental-model/roadmap.md) as a starting point, not a whitelist. Preserve sealed
historical records. If reference payload was not reviewed in H, identify its separate C/H and review
dependency under 006; do not attach it as output-only evidence or extend an old ACCEPT silently.

## Independent review record

Record actual reviewer/session/model/date; full base/C/H, contract and evidence identities; policy
baseline; source access and limits; independently inspected versus rerun checks. Include:

- Independent obligation/interaction coverage and strongest counterexamples examined, with evidence;
  reconcile missing or weaker implementation coverage and state any unexamined obligation.
- Corpus, mutation registry and verification command results. Then the declared search: families,
  shapes, depths and mutation sites tried beyond the corpus. Then new counterexamples, with probe
  files that make them reproducible.
- Root-cause note when 006's stop-and-redesign rule fires: the recurring mechanism, why earlier
  passes missed it, and the options for the owner.
- Per-criterion PASS/FAIL and rationale; only explicitly assigned out-of-packet work may be DEFERRED.
- Findings: stable ID, severity, exact candidate path/line or section, governing criterion/source,
  concrete counterexample/impact and required outcome/validation. Separate reviewer findings from
  owner-supplied supplements. Carry prior finding dispositions by reference.
- Exact verdict/status text for transcription, acceptance rationale or correction/blocker handoff.
  End with the one outcome line required by 006/009. An ACCEPT names H, not its own recording commit.

## Correction brief

On CHANGES REQUIRED the reviewer writes the next brief, using the template above, as
`brief-<n>.md` in its review evidence. It is the customized prompt for the next round.
- **Goal:** state the problem behind the findings, not only the findings.
- **Suspect design:** name the suspected common mechanism, including any root in accepted design.
- **Questions before code:** list the design questions the correction must answer.
- **Known counterexamples:** list every counterexample to add to the corpus.
The owner may edit the brief before forwarding it. The review's findings remain authoritative.

The brief starts with this standalone locator. Do not duplicate all policy, old findings, raw logs
and prior prompts. The referenced material must actually be available to a fresh session; when
offline, include it in the source/evidence bundle.

```text
Correct the same released packet <id> on <branch>.
Base <full SHA>; reviewed H <full SHA>; review record <pinned path/revision>.
Open findings <IDs>; required outcomes and counterexamples are in that record.
Owner supplemental decisions <pinned record/IDs or none>; unresolved authority <none or blocker>.
Read the brief below first. Answer its design questions in design-<n>.md; get the design check when
006 requires it. Apply 006 and 012: fix the mechanism, not only the listed counterexamples; add every
counterexample to the corpus; then re-audit the whole cumulative packet. Fix additional in-scope
defects with separate provenance. If the fix belongs in accepted earlier design, say so and ask.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

Preserve a delivered handoff once in its review record or a linked immutable `handoff-<n>.md`.
Owner supplements are appended separately with source and scope, without pretending the reviewer
supplied them. Do not paste the full accumulated conversation into each new report or live contract.
Old records remain untouched; corrections to provenance are new explicitly superseding notes.

## Integration receipt

Append `integration-<n>.md` with full accepted H, acceptance-record A, integration commit, observed
remote main and date, ancestry checks, H..A administrative scope, tree/content comparison and any
substantive differences. Record owner's discussion provenance, understood result, remaining concern,
merged/closed decision and `next_release`. Link it from 007; do not change the old ACCEPT. The receipt
names already-existing commits and never needs its own SHA. A later owner decision is another dated
record, not a silent rewrite of an earlier hold or release.

## Final cleanup record

Append `work/<packet-id>/cleanup-<n>.md` under 006's owner-delegated cleanup policy. Record the owner
instruction, actual cleanup role/date, full base/C/H and A if present, inspected pre-cleanup head,
remote main, authentic review or its absence, post-review diff disposition, checks/evidence and limits.
Record cleanup separately from packet acceptance and integration: complete with integration pending,
reopened with finding IDs and corrective-packet link where required, or blocked with an exact unblock
condition. State the next owner action and `next_release`. Link the record from 007; update live
summaries without rewriting historical evidence. New findings use the review finding fields above
and honest provenance.

The external handoff supplies the final pushed head and verified remote SHA after the push. The
record never names its own containing commit or claims a future push. A later verified manual merge
gets the separate integration receipt above; cleanup is not that receipt or a fresh independent ACCEPT.

Closed records may move to a verified archive under [retention](archive.md). Preserve their exact
bytes and identities; do not copy historical logs into each new report or maintain a second status log.
