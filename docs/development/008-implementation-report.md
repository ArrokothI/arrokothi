# Candidate, review and handoff records

[006](006-development-process.md) owns policy and C/H/A identity; [012](012-review-methods.md)
owns coverage methods. Use versioned records under `work/<packet-id>/`. Keep current facts concise,
link raw evidence and historical findings, and say “none”, “not run” or “unknown” with a reason rather
than silently omitting a field. Never fabricate a session/model, command result or external decision.

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
- Semantic correction closure: changed invariant, dependent paths, counterexamples and evidence:
- Prior findings: open IDs → disposition/evidence; closed findings → prior disposition links:
- Additional self-found defects (separate provenance); unresolved obligations and unblock conditions:

## Validation and interpretation
- Exact commands/cwd, C, environment/config/tool versions, exit/counts/skips, raw paths and digests:
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
- Per-criterion PASS/FAIL and rationale; only explicitly assigned out-of-packet work may be DEFERRED.
- Findings: stable ID, severity, exact candidate path/line or section, governing criterion/source,
  concrete counterexample/impact and required outcome/validation. Separate reviewer findings from
  owner-supplied supplements. Carry prior finding dispositions by reference.
- Exact verdict/status text for transcription, acceptance rationale or correction/blocker handoff.
  End with the one outcome line required by 006/009. An ACCEPT names H, not its own recording commit.

## Compact correction handoff

The review's findings are authoritative. Supply this small standalone locator instead of duplicating
all policy, old findings, raw logs and prior prompts. The referenced material must actually be
available to a fresh session; when offline, include it in the source/evidence bundle.

```text
Correct the same released packet <id> on <branch>.
Base <full SHA>; reviewed H <full SHA>; review record <pinned path/revision>.
Open findings <IDs>; required outcomes and counterexamples are in that record.
Owner supplemental decisions <pinned record/IDs or none>; unresolved authority <none or blocker>.
Apply 006 and 012: close the affected semantic subsystem and its dependencies, then re-review the
whole cumulative packet. Fix additional in-scope defects with separate provenance.
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
