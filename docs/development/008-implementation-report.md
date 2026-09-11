# Standard implementation report

Use one versioned report per candidate under `work/<packet-id>/implementation-<round>.md`.
Do not omit a field silently: use “none” or “not run” with a reason. Keep prose brief; link evidence.
Follow the commit identity convention in [006](006-development-process.md).

```markdown
# Implementation report — <packet>, round <n>

## Identity and status
- Packet / parent milestone / contract path and revision:
- State: WAITING_FOR_REVIEW | IN_PROGRESS | BLOCKED_ARCHITECTURE | BLOCKED_EXTERNAL
- Owner release / prerequisite acceptances and integrated SHAs:
- Base commit (full SHA):
- Payload commit C (full SHA):
- Candidate H: commit containing this report; full SHA supplied in handoff
- Previous review/candidate, if correcting:
- Branch / configured remote / push result (verified remote SHA or failure):
- Working-tree state / patch or bundle path and SHA-256 if offline:

## Facts
- Summary and changed files (link full diff; explain each logical group):
- Canonical/detail references and ownership (Kernel, Runtime/Driver, deployment):
- Tests added/ported/removed; justification for removed legacy assertions:
- Compatibility/migration/refusal; baseline/guides/skills updates or why not applicable:

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| ... | ... | pinned log / trace and digest | PASS / FAIL / unavailable |

| Command (exact cwd/arguments) | Payload/environment/config | Exit, counts, skips | Raw evidence |
|---|---|---|---|
| ... | Node/OS/tool versions | actual result | path/hash |

- External gate: fixture prepared / gate executed / decision, each separately stated.
- Benchmark/Driver/provider revisions, native vs lab owners, fault schedule and repeats:
- Tests/live calls/benchmarks NOT performed and their claim limits:

## Interpretation and decisions
- Why the implementation satisfies the contract (agent interpretation, not acceptance):
- Routine design choices and alternatives considered:
- Roadmap deviations and owner-approved amendments; none if unchanged:
- Reviewer focus: riskiest race, counterexample or boundary:
- Known limitations / unresolved questions / blocked actor and unblock condition:
- Third-party source/dependency/service: version, exact terms inspected, reuse method,
  required notices/obligations and unresolved compatibility; “none” where applicable:
- Prior review findings: each ID → correction evidence or explicit unresolved status:

## Handoff
- Ready for independent review, or exact remaining work/blocker:
- No self-acceptance; no successor implementation.
```

Raw logs may be stored outside Git when large, but must be available to the reviewer through a
pinned artifact with digest and retention owner. Never include credentials/private prompts to make
a report appear complete. Missing required evidence remains missing after redaction; supply an
authorized reproducible alternative or block that claim.

An independent review record must include reviewer identity/session/model as actually used, date,
base/H/contract/evidence identities, access limits, inspected vs rerun checks, criterion verdicts,
severity findings with file/line/contract references, and one final outcome. ACCEPT records why the
gate passed and an exact status edit; CHANGES REQUIRED includes a complete corrective prompt.
