# Revision 3 coverage before implementation

Codex (GPT-6), 2026-09-27. Same released packet, implementation round 2 continued from
`b18a729d989dea334a86ec08bdf8773ee77de4db`. Governing process B and C1–C15 remain as
[contract](contract.md). This map supersedes coverage-02's aggregate premise; its schedules remain.

## Reconstruction before patching

Trace: values.ts creates one issue per refused position until each root's byte budget stops it.
acceptRoot copies those issues through diagnosticIssues, located and appendIssues; captureOutcome
combines roots, and submitOutcome combines identity issues with content issues after currency and
grant. explainOutcomeIssues concatenates every message. Controls captureAttempt/captureRecovery
feed explain, omitting messages but concatenating every path. #refusal freezes the reason and
returns the same record it appends; inspection reuses it. There is no later size check or renderer.

A root can contain about a million issues; configured Emission capacity multiplies roots. A finite
per-fragment bound therefore cannot establish total rendering. The first eight details plus an
omitted-code histogram will have a fixed reason bound. Keep raw paths with a separate root label
until rendering; project only detailed issues, after the coordinator has selected the content
refusal. This preserves eager capture and removes eager message scanning. Integrated values.ts
capture cost and whole-message budgets remain outside this repair's authority.

Round 2 missed AGG-01 by considering each fragment but not issue multiplicity; its tests had at most
three issues per root. It missed EVID-01 by pairing omitted text with printable text, so the oracle
could not reject equality on rendered text. DEC-2 already coexists with eight unknown fields per
holder and byte-limited capture; it requires one combined content refusal, not unbounded prose.

## Obligations and inverse witnesses

| Source | Schedule | Required observation | Test / inverse ablation |
|---|---|---|---|
| AGG-01, C3/C12 | progress, two Emissions, result/error each with thousands of issues; reviewer 130×4096 constructor case separately | returned = retained, one append, whole view otherwise equal, <=16,384 units, later valid answer accepted | aggregate-refusal tests; unbounded detail loop mutant |
| AGG-01, C8–C10 | malformed takeover/report and all three recovery roots | malformed_value returned and recorded; combined summary preserves remaining code counts | controls and histogram tests; drop histogram/count mutants |
| DEC-5 bounds | 0/8/9 details; root path 128/129; message 1024/1025; late code after eight details | detail order, separate root label, exact limits; remaining codes counted in first-seen order | edges tests; limit ±1, reorder/drop/count mutants |
| EVID-01, C3 | valid grant, wrong/current strings both >128; separately non-ASCII/high/low surrogate | stale_exchange, only refusal; exact current answer accepted | equality tests; reviewer R4 equivalent |
| EVID-01, C8–C10 | same identities on each control | stale_exchange, no hold/epoch/delivery mutation | equality tests; reviewer R5 equivalent |
| EVID-01, C3/C4 | two distinct >128 keys; separately non-ASCII keys in one Outcome | both accepted with exact keys and distinct IDs | equality tests; reviewer R7 equivalent |
| O-R2-1, C1–C3/C13 | same malformed aggregate before grant / stale currency / replay conflict; counting fields | existing eager single capture, first failing group, no disclosed content | existing partial-claim suites + aggregate pre-authority cases; original B12–B20 and added ordering mutants |
| O-R2-2, C9/C10 | redelivery with code and protocol hold under long/surrogate minted ID | bounded ID fragment, unchanged explicit diagnostic, only refusal | redelivery tests; raw renderer mutant |
| C2/C4–C7/C11–C15 | cumulative packet acceptance/replay/transaction/terminal/late report/hostile paths | original outcomes and ordering | original suites and all 36 ablations; check-records |
| O-R2-3/process | sealed/adapted runners; B..C and correction diff checks | disclose exit 1/32 of 36 and exit 2 on sealed logs; adapter is substitute evidence | sequential clean-C validate.mjs, raw outputs and manifest |

Selected 012 methods: normative, deterministic, in-process race/fault, process/documentation.
Native Driver fidelity, physical isolation, persistence, packaging and external gates retain their
existing exclusions. No new dependency or third-party source. Layer 3 semantics do not change:
identity owns exact coordinates, execution-cycle owns ordering, values owns capture. The binding's
diagnostic policy belongs to correction DEC-4/5, with BASELINE describing it.
