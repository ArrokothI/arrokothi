# Round 2 coverage before implementation

Derived 2026-09-26 by the implementer under B's 006/008/012, before code changes.
Correction contract revision 2 carries forward C1–C15 and DEC-1–20. This is implementation
planning and self-review, not independent acceptance. Final observations belong in implementation-02.

## Invariant and selected mechanism

Primitive Activation strings remain exact opaque coordinates. Classification is not permission to
copy that text into diagnostics. Render identity/name fragments only when they contain at most 128
printable ASCII UTF-16 units; otherwise use a fixed omission marker, before concatenation. Apply
the same rule to matched Kernel identities and pinned-code names: provenance does not bound their
spelling. Preserve all captured content issues; use bounded path/message rendering, not aggregate
truncation that would drop later issues. Explicit delivery/protocol diagnostic payloads keep their
existing 1,024-unit rule. Structured accepted identities remain exact, including host namespace
surrogates; lossy diagnostic rendering must never affect lookup, replay, receipt or output identity.

## Required schedules

| Obligation/source | Distinguishing schedule | Required observations / forbidden mutation | Evidence |
|---|---|---|---|
| DIAG-01 / C3 | visibility-only submitter, wrong 50,000,000-unit ID, lone high/low surrogate, engine-max ID; open, resolved/no-exchange, terminal | returned Result; same frozen returned/retained refusal; exactly one append; other whole-view fields unchanged; identity-only reason <=1,024 ASCII units; later valid live answer accepted | diagnostic refusal tests; dedicated memory-heavy probe; reviewer identity/maxlen probes before/after |
| DIAG-01 / C8–C10 | all three controls with control power and same wrong text/schedules; visibility-only controls | scope then power then capture; correct terminal/open/stale refusal; no hold/history/delivery/epoch change; later current answer accepted | same boundary matrix; one read per identity |
| R3 / C1–C3,C13 | hidden/missing; wrong vs exact long/surrogate ID; malformed/boxed/revoked/unobservable; replay without grant | exact classification/order and eager capture unchanged; replay receipt reference unchanged; no normalization/prefix/coercion | all 495 original identity tests plus prior hostile/partial-claim suites; I1–I7 and original 36 ablations |
| R4 / C2–C3 | accepted-ID conflict, matched-ID epoch/base/authority/capacity/content refusals, terminal Execution ID | bounded identity rendering on every branch, all content issues retained, no accepted-state mutation | matched-identity diagnostic matrix and renderer-specific mutants |
| R4 / C8–C10 | stale control epoch, code hold, unsafe replacement, callback changing exchange/epoch/terminal/hold | post-equality/revalidation renderers bounded; comparisons and permitted actions unchanged | control diagnostic matrix and existing reentrancy tests; mutants |
| R4 / C9,C12 | large/non-ASCII pinned code labels; hold enter/update/clear/Outcome end; protocol hold/clear | reason aliases bounded; structured identity/actor attribution exact; explicit diagnostic payload rule unchanged | pin/history tests; existing hold/history tests |
| SELF diagnostic paths / C3,C9,C13 | malformed root member names and constructor names, duplicate Emission key; control availability root | bound rendered path/message before prefix composition; root label and every issue code survive; no key/content repaired and accepted | additional diagnostics tests and mutants |
| O1 / C15 | trusted namespace >half engine maximum; complete/Emission vs continue | document actual engine allocation limit; do not alter creation, derived IDs, receipts or replay | unchanged reviewer namespace probe, qualified contract/BASELINE/identity owner |
| C4–C7,C11–C14 | atomic acceptance, B-5, unsupported Effect/await, late delivery, mutation/ambient attacks, zone inventory | original whole-result oracles and architecture guard unchanged | full Kernel/conformance/SDK/typecheck plus all original ablations |
| C15/process | B..C cumulative trace, sealed history, C..H allowlist, remote identity | one owner/rule, no spec status, no silent OPEN decision, no self-acceptance or successor | reconstruction, check-records, clean-C logs, SHA-256 manifest, final remote SHA |

## Renderer and retainer inventory (before patch)

| Path / conceptual alias | Classification and dependency | Duty |
|---|---|---|
| submitOutcome wrong/no exchange; #openExchange wrong ID | caller-supplied primitive, no equality | bound before concatenation; no identity validity check |
| duplicate_conflict; matched currency/grant/capacity/content; named control/revalidation IDs | caller string proved equal to Kernel-minted accepted/current ID; namespace is trusted-host, scope/key caller-selected | same renderer; equality is not a text bound |
| terminal/no-exchange/unauthorized-control Execution ID | Kernel-minted from trusted namespace and accepted caller scope/key | same renderer; structured refusal.executionId stays canonical |
| recovery missing pins; code-hold refusal; clear/history/ended_by_outcome | caller-selected accepted bounded code identity, propagated through Kernel hold | render before forming missing reason; aliases reuse bounded reason |
| protocol hold diagnostic; takeover/Outcome ending history; delivery failure | explicitly supplied operational diagnostic; identity fields separately Kernel-minted; actor namespace trusted-host | preserve existing boundDiagnostic 1,024 rule; no identity text enters reason |
| explain / explainOutcomeIssues / located; unknown fields; duplicate Emission key | issue paths/messages can contain caller field/member/key/constructor text; codes/root labels Kernel-owned | bounded projection before root prefix and message composition; every issue retained |
| mintRefusal / viewOf / holdsOf / recovery-history projections | retain/share frozen Kernel record; no extra caller observation or text rendering | verify same refusal object and no additional identity alias |
| #accept replay Map, disposition, Emission/result IDs, grant, receipt, dispatch/delivery | semantic Kernel identity, sometimes accepted caller key; trusted host actor attribution | exact identity retained, never feed diagnostic projection back into semantics; O1 qualification only |

Names and aliases: identity, activation, attempt, exchange, Execution, namespace, scope, key, pin,
revision, claim, currency, replay/conflict, refusal, reason, issue/path/message, hold/history,
delivery, inspection, receipt/output/disposition. Search navigates; branch/dataflow reading establishes
provenance. The live reconstruction will replace its inaccurate no-leak/large-identity statements.

Methods: normative, deterministic, in-process race/fault and process/documentation. Native Driver
fidelity, persistence/death, public packaging and external benchmark gates remain outside this packet.
