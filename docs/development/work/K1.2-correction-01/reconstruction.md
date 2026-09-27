# Activation identity, diagnostic retention and cumulative audit

Implementer: Codex (GPT-6), 2026-09-26. Round 2 self-review, not independent acceptance.
Governing B `a20d278185eaffc7f8b7489345a3624231ff6e6d`; reviewed H
`6541115e2e5389a7e5cff86f87d857b4eb486d7d`; review record
[review-01](review-01.md), recorded at `449b243cd31d5596c457e091233dfc4d77a4eff4`.
The correction contract revision 2 carries forward K1.2 revision 9. The
[coverage map](coverage-02.md) predates code changes. Final candidate identities, command results,
probe observations and ablation results belong in implementation-02; this note does not certify
checks that have not yet run. The previous report and review remain unchanged historical evidence.

## Reconstructed invariant

An Activation coordinate and its diagnostic spelling serve different purposes. The coordinate is
an opaque primitive string compared unchanged by exact UTF-16 equality. That domain admits every
representable minted ID without reinstating the old value-string/Unicode validator. Diagnostic
rendering must return a bounded explanation without retaining an arbitrary caller string or
concatenating it past the engine's string maximum. Equality with accepted Kernel state proves which
record is named, not that its spelling is short or printable.

The producers remain unchanged: creation validates caller scope/key independently and injectively
packs them with the trusted host namespace; dispatch adds the per-Execution exchange suffix.
The namespace is only type-checked. The binding adds no semantic identity-length maximum, but the
engine does: a trusted namespace above half its string maximum can permit creation, dispatch and
`continue` while Emission/result composition fails before acceptance changes state. Review-01 O1
is qualified in the contract, BASELINE and Layer-3 identity owner; this round does not change
creation, receipts or derived-ID composition.

## Renderer and retainer inventory

Locations below identify the inspected pre-correction source at `449b243`; function names remain
navigation points after edits. All coordinator locations are in `packages/kernel/src/coordinator.ts`.
C = caller-supplied or caller-selected text; K = Kernel-minted or exact Kernel-retained identity;
H = trusted host authentication context. K identities can contain both C and H text.

| Producer, renderer or retainer | Source at inspected head | Provenance and dependency | Round-2 treatment |
|---|---|---|---|
| Creation → Execution → Activation | coordinator 903, 1184; identity.ts `packIdentity` | K composed from H namespace and bounded C scope/key; exchange suffix K | Semantic spelling unchanged; allocation qualification only. |
| Scope and single identity capture | coordinator 1365–1383; envelope.ts `acceptActivationIdentity` | C destination first, then C primitive Activation text; capture may reenter before classification | No additional observation, normalization, validity rule or classification change. |
| Wrong ID with an open exchange; usable ID without an exchange | coordinator 1421, 1438 | C with no equality proof; before submission authority | Render bounded identity and Execution fragments before concatenation. |
| Outcome conflict | coordinator 1397 | C proved equal to accepted K map key; no grant required | Same bounded fragment policy; exact replay still returns its original receipt and mutates nothing. |
| Matched epoch/base/grant/capacity/content refusal | coordinator 1463–1464, 1485, 1509, 1527, 1550 | C equals current K ID, possibly containing H surrogate/large namespace | Bound diagnostic fragment even after equality; currency, authority and combined content remain in decision-02 order. |
| Terminal, absent exchange, unauthorized control | coordinator 1408, 1429, 1657, 1913, 1918, 2158 | K Execution ID includes C/H text | Bound prose fragment; exact structured refusal.executionId is retained. |
| Shared control exchange lookup | coordinator `#openExchange`, 1924 | C Activation text before equality, visible K Execution | Same renderer on takeover, recovery and protocol reporting; scope → control → capture → terminal/open/currency remains. |
| Takeover initial and callback revalidation refusals | coordinator 1618, 1627, 1642, 1667, 1675, 1684, 1698 | C matched to K before Driver callback; callback may resolve, replace, terminalize or hold exchange | Bound every named Activation/Execution fragment; revalidation and mutation ordering unchanged. |
| Protocol stale-epoch refusal | coordinator 1867 | C matched to current K | Same fragment policy. Accepted hold coordinate remains exact. |
| Missing Definition/Runtime/codec reason | coordinator 1781–1787 | C code identifiers validated and retained at creation; comparisons use exact pinned strings | Bound only the rendered identifier. Type labels still identify which pin is unavailable; all three pins remain exact in inspection. |
| Code-hold aliases | coordinator 1627, 1698, 1800, 1810, 1820, 2058; `holdsOf` | K retained reason built from rendered C pins | Reuse bounded reason in refusal, enter/update/clear/end history and inspection; no new raw identity interpolation. |
| Explicit protocol diagnostic and its aliases | coordinator 1854–1855, 1875–1887, 1725, 2073 | C operational diagnostic, already bounded by DEC-8; K attempt fields separate | Keep the existing first-1,024-UTF-16-unit payload rule, including non-ASCII/surrogate behavior. History adds fixed text. |
| Delivery failure and late report | coordinator 503, 2201–2217, 2256–2262 | Driver diagnostic under existing delivery rule; K delivery/Activation coordinates | Existing diagnostic rule unchanged; settlement closes over only its own attempt row. |
| Value-issue path → located → explain | values.ts 307, 875, 914–929; envelope.ts 51–74; outcome.ts `acceptRoot`, `captureTextList`, `explainOutcomeIssues` | C member names can appear in paths before length/Unicode rejection; root/code labels K | Project each captured issue before adding Outcome/control root label; preserve every issue/code, omit overlong/non-printable path detail. Integrated values.ts and K1.1 creation/ingress rendering remain unchanged. |
| Value diagnostic constructor-name alias | values.ts 285–302, 627, 659, 841; outcome.ts 461–469 | C constructor.name can enter a captured message | Bound projected message before Outcome rendering; no new caller observation or value repair. |
| Unknown envelope/next/Emission field | outcome.ts 223–267 | C field name; existing eight-reports-per-holder rule | Existing 128-printable-ASCII omission policy remains; unknown value unread. |
| Duplicate Emission key | outcome.ts 326 | C key already passed value-text checks, so finite but potentially large | Bound displayed key, retain exact comparison/key and all issue codes. |
| Refusal retention | coordinator 2170–2179; refusal.ts 139–144 | Frozen K record containing rendered reason plus exact K executionId | Same object returned and retained, one per-Execution refusal position; no late renderer or extra caller read. |
| Accepted hold/history attribution | coordinator 583–618, 1711–1737, 1811–1826, 1879–1892, 2050–2078 | K exact activationId and epoch; H actorNamespace; C accepted scope | Exact structured coordinates/actor attribution are semantic evidence, exempt from lossy diagnostic rendering. |
| Grants, receipts, replay, acknowledgments, outputs, resolved exchanges | coordinator 572–573, 1963–2096; identity.ts `mintReceipt` | K semantic identities; output IDs also contain accepted C Emission key | Never use diagnostic fragments as map keys, equality inputs or retained IDs. O1 engine limits remain explicit. |
| Inspection projections and aliases | coordinator 2256–2390; inspection.ts | K records/copies; raw structured IDs and already-rendered reasons | `viewOf`, `holdsOf`, delivery/exchange/Activation views do not render C identity anew; inspection adds no grant or mutation. |

Related K1.1 creation/input/dispatch/redelivery prose was read as a dependency: creation conflict
and input conflict render keys/IDs; dispatch and redelivery render retained IDs and hold reasons.
Their integrated code, identity composition and general diagnostic policy are unchanged in this
packet. The code-hold reason they may quote is produced by corrected recovery. A bounded claim in
this report is about the four Outcome/control boundaries and their retained diagnostic aliases,
not a new global K1.1 refusal limit.

Names and conceptual aliases followed: identity, Activation, attempt, exchange, Execution,
namespace, scope, key, pin, revision, claim, currency, replay/conflict, refusal, reason, issue,
path/message, hold/history, delivery, inspection, receipt/output/disposition. Text search located
these paths; branch and dataflow inspection established their provenance.

## Why the previous pass missed DIAG-01

This account follows retained source, tests and reports; it is not a claim about private reasoning.
Round 1 correctly removed the inappropriate caller-value check from the Activation coordinate.
Its reconstruction then followed usable identities through classification and accepted records,
but treated diagnostic references as legitimate minted IDs. Wrong caller strings reach stale
reasons before equality or submission authority, and equality does not bound a minted spelling
either. The tests stopped around the old 65,536 boundary and asserted the refusal classification
and append, without bounding returned/retained reason size or reaching a concatenation failure.
Thus removing the validator removed the accidental renderer bound without assigning that duty.
The old report's no-leak/legitimate-large-ID sentences were too broad; the current map supersedes
those claims without editing the sealed report.

The earlier ID-01 miss was different: the reused K1.1 text helper was appropriate to caller keys,
but not closed under Kernel composition or trusted namespace text. Review-14's large-key and
exchange-10 schedules, plus the implementer's namespace/surrogate witnesses, still govern the
coordinate tests. Diagnostic lossiness must not recreate that original defect.

## Bounded policy and finding provenance

- **DIAG-01, reviewer-found:** every identity interpolation on the four boundaries uses at most
  128 printable ASCII UTF-16 units, else `<identity omitted>`, before concatenation. Include
  wrong, replay-matched, current-matched, post-callback and Execution identity sites. Ordinary
  identity-only reasons are at most 1,024 units; missing-code reasons at most 600. The returned
  refusal equals the frozen retained record; refusal-only state changes remain one append/index.
- **SELF-DIAG-01, implementer-found:** malformed value member names and constructor names bypassed
  the unknown-Outcome-field policy through captured issue paths/messages. Direct probes on the
  inspected head produced rendered reasons of 1,000,092 and 1,000,071 units respectively, and
  an unpaired surrogate survived a control-root path. Project captured paths/messages before
  root-prefix composition on Outcome/control capture. Keep every issue/code and the outer root.
- **SELF-DIAG-02, implementer-found dependency:** duplicate Emission keys and accepted pinned-code
  names were finite under value limits but still rendered large C identity fragments. Use the same
  diagnostic identity rule, while keeping exact duplicate/code-availability comparisons and all
  structured pins. History/hold explanations quote the resulting bounded reason.
- **O1, reviewer P3:** qualify the engine limit and derived Emission/result allocation case, without
  implying it was fixed or changing creation behavior. Original ID-01/EVID-01 closures remain
  subject to this explicit limit; they are not reaccepted by this implementer.

Content diagnostics use a per-fragment/per-issue bound, explicitly instead of a 1,024-unit whole
reason cap. Paths keep at most 128 printable ASCII units or `<omitted>`; messages at most
1,024 or `<message omitted>`. The existing fixed root labels and codes make each rendered issue
less than 2,048 units; a reason with N issues is bounded by 1,024 + 2,050N units. Preserve order
and every captured issue: aggregate truncation would contradict DEC-2's combined diagnostics.
The rule does not promise all arbitrary input defects are scanned: existing per-root work limits,
unknown-field report limits and configured Emission capacity still govern capture.

Explicit protocol/delivery diagnostic payloads retain their established raw first-1,024-unit rule.
They are not identity fragments, and their fixed hold/history prefixes can make a complete reason
longer than 1,024. Exact structured IDs and H actor namespace are also deliberately not sanitized:
they are retained semantic identity/provenance, not interpolated diagnostic text.

## Whole cumulative B-to-candidate source audit

This is a source-level implementer audit of the cumulative packet, including unchanged paths
reached by the corrected assumption. The table names the validation obligations; it is not a
claim that their final executions have already passed. Implementation-02 binds results to C/H.

| Criterion | Cumulative source trace and required distinguishing evidence |
|---|---|
| C1 | `#visible` precedes other observation on all four surfaces; hidden/missing yield the same null refusal with position 0. Preserve scope/read-count and unauthorized-control unread-request cases. |
| C2 | accepted Map lookup precedes terminal/currency/grant; captured identity decides replay/conflict. Bound conflict prose while retaining original receipt reference and zero replay mutation after takeover, later dispatch and terminalization. |
| C3 | capture keeps independent epoch/base; terminal → Activation/epoch/base → grant → capacity → combined issues. Project diagnostic fragments only; preserve whole-refusal state and a later valid answer. Include huge/surrogate/engine-edge wrong IDs and every matched refusal group. |
| C4 | `#accept` builds receipt, output, acknowledgment/disposition lists, resolved exchange, history and replay wrapper before mutation. Lossy diagnostic helpers never reach accepted keys/data; batch membership remains independent of opaque progress. O1 allocation failure remains pre-apply. |
| C5 | accepted next alone sets lifecycle; next dispatch uses accepted progress/new exchange/epoch 1. Terminal fresh submissions and controls remain fenced; qualified engine constraint is separate from ordinary representable-ID answerability. |
| C6 | batch acknowledgment precedes non-batch terminal disposition; terminal ingress replay/conflict precedes fresh-input refusal. Integrated input handling is unchanged; complete/fail and queued-outside-batch schedules remain required. |
| C7 | Effects inspect only length, await does not read wait, unknown obligations refuse whole. No Effect ID or admission/settlement record is created; issue projection does not change the unsupported classification. |
| C8 | current attempt/code hold/Driver safety checks precede callback revalidation of terminal/exchange/epoch/hold. All prose sites bound IDs; accepted takeover keeps exact ID/input, replaces grant once and delivers only after commit. Reentrant callback schedules remain required. |
| C9 | availability roots captured once, exact pins compared, missing reason rendered before hold/history. Changed/unchanged declarations preserve history semantics and permitted actions; inspect retains exact pins and hold coordinate even if reason fragment is omitted. |
| C10 | scope/control precede capture; current epoch precedes hold; repeated report inert. DEC-8 explicit diagnostic rule unchanged. Takeover/Outcome clearing still records control/attempt_submission provenance respectively. |
| C11 | delivery settlement closes over its retained row; late report never touches newer exchange/epoch. Accepted-Outcome lookup addresses old exchange; diagnostic formatting adds no delivery or replay effect. |
| C12 | frozen refusal is both answer and retained evidence; per-Execution refusal/acceptance counters remain separate. Inspection copies lists and shares immutable records, including exact IDs and already-rendered reasons; no grant exposed. |
| C13 | own fields remain single-observed; renderer uses only primitive indexing/length and Kernel issue records after capture. No live string method, coercion, callback or normalization is added. Hostile, revoked-proxy and ambient-pollution suites remain required. |
| C14 | internal helpers stay in the existing private zone; no public export or dependency added. Source inventory/import graph and conformance guard remain an explicit final gate, not inferred from test names. |
| C15 | identity.md owns coordinate closure/engine qualification; cycle owns order; contract/BASELINE own binding diagnostic policy. Creation, values, recovery, evidence, lifecycle, output and authority dependencies checked; no Layer-1/2 change, spec build status, or silent OPEN closure. |

The governing sources reviewed are AGENTS, the mental-model overview/major abstractions/reference,
identity, execution-cycle, recovery and evidence owners, K1.2 revision 9 and decisions 01/02,
correction contract/review-01, and B's 006/008/012 process. Selected production paths and related
test assertions inform the table; it does not claim every historical test body was independently
read. Final mandatory suites, original and new ablations, retained probes, immutable-record checks,
and C/H evidence/handoff checks are required before review-ready.

Native Driver fidelity, physical isolation, persistence/process death, public package release and
external benchmark gates remain outside this in-memory Kernel packet. No third-party material or
dependency is added. Historical 007 narrative/OPEN-5 observations remain preserved and do not
supersede decision-02 or release control. No acceptance, integration or successor release is claimed.
