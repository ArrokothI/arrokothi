# Prior-art research

These are dated reports on how other projects handle problem families this repository has met. They
cover canonical encodings, live-object validation, realm integrity, Proxies, idempotent creation,
fencing, timers and evidence tooling. Use them as background for briefs, design notes and reviews.

## How to use a report

A report records what agent-run web research found on its date. It is not:

- **Architecture.** Canonical owners stay in `mental-model/`; reach them through
  [reference.md](../../../mental-model/reference.md). A report never defines Kernel semantics.
- **An owner decision.** Phrases like "favours", "recommend" or "application to ArrokothI" are inputs.
  Owner decisions live in packet records, and [007](../007-work-packets.md) owns status and release.
- **Acceptance evidence.** A review cites the primary source a report names, or a maintained test, not
  the report.
- **Licence clearance.** Licence columns record what the researcher read. Before copying, adapting,
  vendoring or adding anything, follow the third-party review in
  [AGENTS.md](../../../AGENTS.md#third-party-code-and-license-review). Several studied projects are
  copyleft (LGPL-3.0, MPL-2.0, AGPL-3.0) or source-available (Restate is BUSL-1.1).

Every claim carries a read-status tag:

| Tag | Meaning | How to treat it |
|---|---|---|
| **[P]** | The primary text was read: spec, source at a named commit, issue data, full paper | Usable as a lead; re-read the primary source before relying on it |
| **[P~]** | A primary source, but read only through a summarising fetch | Verify against the primary text first |
| **[S]** | Search-result snippet only | A lead, not evidence |
| **[R]** | Reproduced locally by a research agent's own throwaway script | Our evidence, not prior art; rerun before citing |
| **[I]** | The report's own inference | A hypothesis to test or argue in a design note |

Tiers [T1]–[T4] grade the source itself: primary, curated secondary, community, unverifiable.

**Facts that move.** Open issues, drafts, package versions, proposal stages and the packet or decision
states named in a report are as of its date. Re-check them before use.

## Reports

| Report | Date | Scope | Covers |
|---|---|---|---|
| [Live-object validation](2026-10-01-live-object-validation.md) | 2026-10-01 | standard | Refusal cost and work metering; surviving work-charge mutants; exotic key listing; re-prototyped built-ins; live objects versus bytes at boundaries; same-process isolation |
| [Canonical-bytes kernel](2026-10-02-canonical-bytes-kernel.md) | 2026-10-02 | thorough | Canonical-bytes cores and strict validators; realm integrity and global shadowing; Proxy policy; idempotent creation; fencing and takeover; timers and cancellation; plan/apply structure; evidence tooling; a reliability audit of recent issue reports |

The 2026-10-02 report extends the earlier one and skips its topics. The earlier report's header lists
the later findings that update it.

## Reading map

| Work in this area | Read first |
|---|---|
| Moving the core to canonical bytes; a transport decoder or size cap | [Canonical-bytes core](2026-10-02-canonical-bytes-kernel.md#1-canonical-bytes-core-refuse-or-normalise), then the decision table's bytes-core and transport-cap rows ([§10](2026-10-02-canonical-bytes-kernel.md#10-findings--pending-owner-decisions)); [live objects versus bytes](2026-10-01-live-object-validation.md#a-live-objects-vs-bytes-at-the-boundary) |
| Value refusal, unsupported built-ins, work metering, surviving meter mutants | [Problem tables 1–4](2026-10-01-live-object-validation.md#1-problem-tables) |
| Proxy acceptance or refusal; the object-to-bytes wrapper | [Proxy policy](2026-10-02-canonical-bytes-kernel.md#3-proxy-policy); [single-read snapshots and TOCTOU](2026-10-01-live-object-validation.md#b-hostile-code-in-the-same-process) |
| Realm hardening, global shadowing, frozen intrinsics, ShadowRealm | [Realm integrity](2026-10-02-canonical-bytes-kernel.md#2-realm-integrity); [same-process isolation](2026-10-01-live-object-validation.md#b-hostile-code-in-the-same-process) |
| Creation idempotency: replay versus conflict, key scope | [Idempotent creation](2026-10-02-canonical-bytes-kernel.md#4-idempotent-creation) |
| Activation fencing, takeover, recovery | [Single writer, fencing and takeover](2026-10-02-canonical-bytes-kernel.md#5-single-writer-fencing-and-takeover) |
| Waits, timers, deadlines, cancellation | [Waits, timers and cancellation](2026-10-02-canonical-bytes-kernel.md#6-waits-timers-and-cancellation-k13) |
| Plan/apply structure, sole-writer state, module-boundary checks | [Plan/apply decomposition](2026-10-02-canonical-bytes-kernel.md#7-planapply-decomposition-and-structural-single-writer) |
| Counterexample corpus, mutation registry, verification commands, coverage of varied dimensions | [Evidence tooling](2026-10-02-canonical-bytes-kernel.md#8-evidence-tooling-corpus-mutation-registry-simulation-coverage); [how strict validators are tested](2026-10-02-canonical-bytes-kernel.md#how-strict-validators-are-tested); [Problem 2](2026-10-01-live-object-validation.md#problem-2-deleting-a-work-charge-leaves-the-tests-green) |
| Citing a recent GitHub issue, small repository or preprint about canonical encodings | [Reliability audit](2026-10-02-canonical-bytes-kernel.md#9-reliability-of-the-julyoctober-2026-issue-cluster) |

Each report closes with its research gaps. Check them before treating an absence as evidence.

## Adding research

Add a new report as `YYYY-MM-DD-<topic>.md` with the same header and tags, and list it in the two
tables above. Keep earlier reports as written. When a later report corrects one, add a short note to
the earlier report's header rather than rewriting its findings. Do not copy a report's conclusions
into an architecture page, brief or decision record without that page's own review.
