# Round-15 cited-decision independence audit

Reviewer A15: `8dce735fab6012fb562cfe2d73787a74de2c9d17`, [review-15.md](review-15.md).
This is the implementer’s correction record for Round 16, not independent acceptance.
The accepted K0.1 worksheet and all C13 semantics are unchanged.

All ten §11 citation sets and all 51 cited decisions were re-read. The unit is an independently
violable assertion: common wording, a common later packet, or a normative atomicity requirement
cannot make independent writers one observable fact. The C14 inventory remains the starting point;
its 366 references are refined into 455 references to 269 authoritative obligations. Repeated
references are indexes, not duplicated test credit. Assignment reasons remain in coverage.ts;
no scenario was assigned away merely because a schedule was missing.

## Complete decision disposition

This table records the independence judgment for every cited decision, including retained groupings.
Conditions, permitted alternatives and explanatory consequences are not mechanically split into
extra assertions. Concrete independent output coordinates and acceptance writers are split.

| Decision | §11 rows | Reconciliation / retained-fact reason |
|---|---|---|
| ID-1 | 1 | Retain lifetime non-reissue: remapping a recycled storage key is the means of preserving the same logical-ID non-reissue relation, not a second ID allocator requirement. |
| ID-2 | 1 | Split retained Event-reference order from stored envelope content; different producers, destinations and replay/conflict results already have independent owners. Content behind an unchanged ID has no observation surface. |
| ID-6 | 1, 3 | Split boundary namespace from position for dispatch, admission, settlement, child and message receipts. Create/Outcome same/distinct/none receipt relations retain their existing separate scenario owners. Evidence beyond the receipt boundary remains separately assigned. |
| ID-7 | 1 | Reconcile each receipt family to the same ID-6 owners, including separately encoded boundary and position. Do not duplicate scenario evidence for the same receipt. |
| ID-3 | 2 | Split dispatched input from base revision, and authentication from recovery permission and false authority sources. Identity, epoch and batch already have separate redelivery/takeover owners. |
| ID-4 | 2 | Split cross-exchange ordering freedom from token representation freedom. Preserve C13 relational runner and four conforming policies; advancing current authority and refusing old authority remain separate. |
| ID-9 | 2 | Split normal Outcome evaluation after ordinary redelivery from unchanged epoch; add a four-step schedule without takeover. Reconcile lease-role clauses separately from identity/batch and old-exchange rejection. |
| B-1 | 2, 5 | Split accepted membership, positive bound and explicit enumerable representation from pinning. Timeout Event membership references the accepted-Event owner; mandatory inclusion remains a different owner. |
| B-2 | 2, 5, 6 | Split bound enforcement from order, nonempty wait-ended selection from exclusion, union membership from presentation order, ordinary empty permission from missing reservation, and crash mailbox from readiness. Cancellation disposal and readiness suppression have separate owners. |
| B-3 | 5, 8 | Retain whole reserved-set acknowledgment as one set operation; its complement (unreserved exclusion) and reservation timing are already separate. Split lack of an obedience observation from internal progress parsing; Runtime ignore-recording remains assigned. |
| B-4 | 5, 6 | Retain each existing owner: late Event queued, not pinned, not acknowledged, terminal disposition, ordinary selection after readiness consumption. These are separately written facts, not one retention promise. |
| B-5 | 5, 8 | Split replayed rejection from forbidden replay progress installation; add a progress-only replay mutation. Terminal disposition and acknowledgment were already split; references from another row retain their accepted shared links. |
| B-6 | 5 | Split readiness persistence by acceptance writer/path and from mailbox persistence; child route replay identity from destination readiness; destination readiness from permitting a single-transaction implementation. Event/readiness atomicity remains a relational all-or-none boundary claim, not a claim that either writer cannot fail. |
| B-7 | 5 | Split duplicate timeout from duplicate readiness; split durable timeout Event from readiness and Outcome/Event creation paths. Deadline persistence/cleanup, timeout membership and late result retention already have independent owners. |
| B-8 | 5, 6 | Split live-generation/lifecycle equivalence, readiness lifecycle, readiness retirement provenance, consumption and later resurrection. They now have independent corpus checks. A retired generation is a registration identity, not a still-live generation. |
| CL-1 | 5 | Split the three pairwise clock distinctions, expiry-to-cancel mapping from physical-interruption inference, and lease inspection from death/unchecked-authority inferences. Wait/Execution distinction first belongs to K1.3; lease distinctions first belong to K3.2. |
| CL-2 | 5 | Split external failure from non-execution inferences. The retained timeout/result pair is one mailbox coexistence observation; timer retirement cannot erase a later result. |
| CL-3 | 5 | Retain separate registration/current/superseded paths and separate stale wake, generation, timeout and deadline writers. One accepted-time read and equality-at-due remain distinct K1.3 assignments. |
| W-1 | 5 | Split exact identity from kind membership and alternative ANY-OF; coherent selector counterexamples isolate those predicates. Split each forbidden wait-shape feature. Valid inert acceptance is one grammar decision, with its refusal branch explained by the existing atomicity note; field absence and empty-kind-set remain separate. |
| W-2 | 5, 6 | Retain acknowledgment-before-mailbox, dependency/subscription mailbox paths, no spurious timeout, deadline cleanup, due-time read/comparison and future deadline persistence separately. Narrow the future-deadline clause to its existing deadline-only owner; lifecycle is independently indexed under W-3. Crash atomicity is an assigned relational claim. |
| W-3 | 5, 6 | Retain generation identity as one registration namespace allocation; lexical token inequality across namespaces is not required. Index only live-generation equivalence here, not all B-8 readiness facts. Superseded timer writes and authenticated result ingress remain distinct. |
| W-4 | 5 | Separate absence of native work identity from Runtime-local wait arm and resumption privacy from interleave behavior. RUNNING is the lifecycle result of an unresolved Activation; absence of a Kernel wait is already separately observed. |
| W-5 | 5 | Separate forbidden interleave shape from bridge behavior. Re-registration wording describes how a new wait is tested for absence of cached satisfaction, not proof that a Runtime correctly chooses its outstanding work. |
| W-6 | 5 | Each case references the same existing fact as its governing W-3/W-4/B-3 rule: local state vs wait allocation, stale wake vs retirement, accepted result vs readiness, registration lookup vs acknowledgment timing. No additional ownership for scenario narration. |
| W-7 | 5 | ANY-OF, correlation mismatch, subscription gating, retained/unacknowledged backlog, cached satisfaction and batch exclusion stay distinct. Early second-alternative predicate mutation is corrected; no new field or protocol operator. |
| W-8 | 5 | Separate no fabricated dependency from no satisfiability checker. Preserve R5-c2b empty-list shortcut discrimination and R5-c2c no timeout. Split readiness consumption from later resurrection, and terminal acknowledgment from disposition. |
| W-9 | 5 | Split all four timeout envelope fields, trusted minting from Runtime/application forgeries, duplicate timeout from duplicate readiness, union membership from order, and terminal timeout disposal from suppression. Minted identity remains assigned; supplied Event-ID retention R5-f2a is not evidence of minting. |
| OA-1 | 3 | Authentication and access scope were already split; preserve their separate K1.2 assignments. A named destination alone proves no access permission. |
| OA-2 | 3 | Receipt, commit replay, publication replay, Effect replay, changed-policy ordering and cancellation rejection remain separate. Canonical-content conflict is a single comparison outcome; no merge is separately owned. |
| OA-3 | 3, 7 | Epoch, exchange, base revision and cancellation checks stay separate, as do no-progress/no-intent/no-acknowledgment consequences. Same-Outcome resolution/binding denotes one mapping from proposal key to accepted intent, not two independent public values. |
| OA-4 | 3, 7 | Preserve each cancellation-loser writer; split crash-path survival and add explicit all-or-none persistent Outcome boundary assignment. Positive Effect-intent atomicity remains an assigned relation with other accepted facts, not local refusal evidence. |
| OA-5 | 3, 7 | Preserve all no-partial-write owners. Add replay progress protection separately from replay rejection; classified and unclassifiable automatic retry remain distinct K1.2 assignments. |
| OA-6 | 3 | Retain inspectable failure decision separately from infinite silent retry. Hold/end are allowed outcomes of the same failure decision, not a requirement to do both. |
| EF-1 | 4 | Refusal classification, no stripped partial acceptance and no external dispatch remain independent owners. No accepted Effect surface is invented. |
| EF-2 | 4 | Retain empty accepted intent/key-binding record as one observed set (fixture.ts effectIntents); retained records are the observation, not transient allocations inside a rejected transaction. Whole-envelope progress rejection is separate. This does not prove unseen temporary allocation behavior. |
| EF-3 | 4 | Retain one owner per independent action dimension. Values such as required/transferred/abandoned are alternative classifications of the same responsibility record, not a requirement that each simultaneously hold. K0 refusal is not evidence of these classifications. |
| EF-4 | 4 | Denial without attempt, consent without attempt, unknown certainty, acknowledgment vs responsibility and retry cessation remain separately assigned. Unknown is one absence of confirming evidence; guessing either success or failure is the same classification defect. |
| CX-1 | 7 | Retain independent control acceptance, progress fence, admission fence and Driver cancellation request. Out-of-band/no Runtime cooperation describes the same control path; physical interruption is separately outside the logical acceptance proof. |
| CX-2 | 7 | Retain ordering by accepted boundary, terminal non-reopening, cancellation of resulting nonterminal state and partial-progress anti-case separately. No submission-time or native interruption ordering is introduced. |
| CX-3 | 8 | New-Effect completing-envelope refusal and its no-progress/no-acknowledgment/no-intent results remain distinct. Prior Effect and child responsibility have different implementing owners. Settled/transferred/abandoned are permitted discharges of one required-work predicate. |
| CX-4 | 8 | Split retained unknown evidence from refusal to relabel it resolved; completion prohibition and cancellation permission were already separate. |
| CX-5 | 7 | Split Effect identity from physical attempt identity. No reopening and no creation of an unrelated Effect stay separate; retaining one identity does not establish the other. |
| CX-6 | 7, 8 | Split persistent fence, persistent rejection and expiration policy (K5.1). Preserve all losing writer fields and accepted-receipt replay. Add independent replay progress rejection, and retain timeout disposal separately from pending readiness cleanup. |
| PC-1 | 9 | Split storage from returned inline payload, and definition/Runtime/codec compatibility from wrapper-tag selection. Checkpoint-vs-job is one form classification contrast; its actual recovery guarantees are separately owned by PC-2/PC-3. |
| PC-2 | 9 | Split publication-before-proposal from immutability; acceptance pin and rejection non-pin remain distinct. Split codec, codec version and required resource versions into independent reference metadata owners. |
| PC-3 | 9 | Split locator classification from CAS native-mutation claims. Exclusive ownership or reconciliation are permitted alternatives in one Driver capability declaration; absent-declaration refusal is separately owned. |
| PC-4 | 9 | Split Runtime revision from definition revision. Keep missing-code inspectable hold separately from fabricated fresh start; the latter counterexample follows one recovery branch with an existing concrete note. |
| PC-5 | 9 | Split inspectable hold from fabricated restoration for missing checkpoint and required-resource triggers, just as missing code was already split. K3.3 is the first actual resource-recovery implementation. |
| LP-1 | 10 | Retain one just-accepted authority read relation; the stale-epoch current check and cancellation atomicity remain different owners. No borrowing cancellation evidence for freshness. |
| LP-2 | 10 | Retain the negative whole-corpus no-remote-freshness claim, without adding a remote check or provider. |
| LP-3 | 10 | Accepted Outcome, accepted intent and accepted admission remain separately owned. Explicit withdrawal is a different permitted control, not a second action ordinary input must perform. |

## Explicit independent refinements

[clause-refinements.ts](../../../../tests/conformance/k0/clause-refinements.ts) records the old owner,
new owners, a concrete independent failure model, and each resulting source-clause binding. The guard
checks those bindings independently of the inventory seal. Rebinding the positive-bound clause to
accepted-membership ownership, or binding all timeout envelope fields to one owner, fails even if a
caller bypasses the seal. This is an authored review checkpoint; it cannot infer semantics or prevent
a reviewer from approving an incorrect new judgment.

| Prior owner | Independently owned results | Why separable |
|---|---|---|
| R5-j1 | R5-j1, R5-j1-2 | A schedule can use bound zero without forging an Event, or forge an Event under a positive bound. |
| R5-k6 | R5-k6, R5-k6-2, R5-k6-3, R5-k6-4 | The minting writer can compute each envelope field incorrectly while the other three are correct. Supplied laboratory Event identity retention (R5-f2a) is not Kernel identity minting. |
| R2-e1 | R2-e1, R2-e1-2 | Input serialization can drift independently of the dispatched base-revision field. |
| R2-e2 | R2-e2, R2-e2-2, R2-e2-3, R2-e2-4 | Authentication, recovery permission, epoch-as-credential and liveness-as-authority are separate admission predicates. |
| R5-h1 | R5-h1, R5-h1-2, R5-h1-3 | Three roles permit pairwise conflation: distinguishing wait/Execution does not prove either is distinct from lease. |
| R5-h2 | R5-h2, R5-h2-2 | The expiry-to-control mapper can work while its consumer falsely reports physical interruption. |
| R5-h3 | R5-h3, R5-h3-2, R5-h3-3 | Recovery scheduling, death inference and authority admission can fail independently. |
| R5-h4 | R5-h4, R5-h4-2 | A consumer may classify failed execution without asserting non-execution, or assert the latter independently. |
| R5-i4 | R5-i4, R5-i4-2 | Source replay deduplication and destination readiness are different writers. |
| R5-i5 | R5-i5, R5-i5-2 | Correct destination wake ownership does not authorize rejecting a conforming single-transaction implementation. |
| R7-f1 | R7-f1, R7-f1-2 | The Effect association and physical attempt association can each be rebound independently. |
| R7-g1 | R7-g1, R7-g1-2, R7-g1-3 | Fence persistence, rejection persistence and expiration policy are separate operations; first ownership follows those operations. |
| R8-e3 | R8-e3, R8-e3-2 | A cancellation writer can retain a record but relabel its certainty, or delete it without asserting certainty. |
| R9-b1 | R9-b1, R9-b1-2 | Persistence and outbound payload serialization can differ independently. |
| R9-b3 | R9-b3, R9-b3-2, R9-b3-3, R9-b3-4 | Each compatibility lookup dimension can be omitted or substituted independently. |
| R9-c4 | R9-c4, R9-c4-2, R9-c4-3 | Reference metadata serializers can omit codec, version or resources independently. |
| R9-d1 | R9-d1, R9-d1-2 | Form classification and external-fencing capability claims are separate Driver declarations. |
| R9-e | R9-e, R9-e-2 | Runtime and definition loaders can each choose the wrong revision while the other is pinned correctly. |
| R9-f1 | R9-f1, R9-f1-2 | A silent stop and a fabricated fresh start are different failure constructions, just as R9-a1/a2 already distinguish missing code. |
| R9-f2 | R9-f2, R9-f2-2 | A silent stop and a fabricated fresh start are different failure constructions, just as R9-a1/a2 already distinguish missing code. |
| R5-j8 | R5-j8, R5-j8-2, R5-j8-3 | Lifecycle/generation equivalence, readiness lifecycle and readiness provenance have independently writable observations. |
| R5-j9 | R5-j9, R5-j9-2 | A reservation may clear readiness correctly and a later writer may resurrect it. |
| R5-k3 | R5-k3, R5-k3-2, R5-k3-3, R5-k3-4, R5-k3-5 | Adding a callback does not imply adding interleave or native-work state; a shared closed-shape test does not unify the claims. |
| R2-e3 | R2-e3, R2-e3-2 | An oracle can allow resets yet require numeric spelling, or allow opaque tokens while incorrectly requiring global order. |
| R1-g | R1-g, R1-g-2 | Boundary namespace and within-boundary position are separate receipt coordinates. |
| R5-i1 | R5-i1, R5-i1-2, R5-i1-3, R5-i1-4, R5-i1-5, R5-i1-6 | Outcome and Event acceptance are separate durable writers, with distinct Event/deadline paths; surviving readiness is not surviving mailbox data. |
| R4-b1 | R4-b1, R4-b1-2 | Receipt boundary and position are independently encoded coordinates, as at dispatch; neither coordinate proves subsequent work succeeded. |
| R4-b2 | R4-b2, R4-b2-2 | Receipt boundary and position are independently encoded coordinates, as at dispatch; neither coordinate proves subsequent work succeeded. |
| R4-b3 | R4-b3, R4-b3-2 | Receipt boundary and position are independently encoded coordinates, as at dispatch; neither coordinate proves subsequent work succeeded. |
| R4-b4 | R4-b4, R4-b4-2 | Receipt boundary and position are independently encoded coordinates, as at dispatch; neither coordinate proves subsequent work succeeded. |
| R5-j6 | R5-j6, R5-j6-2 | An implementation can omit an obedience field but still parse progress internally; a field-shape scan proves only the former. |
| R9-c1 | R9-c1, R9-c1-2 | Publication order and post-publication mutability are independently controlled by the Driver and resource store. |
| R5-k5 | R5-k5, R5-k5-2 | The bridge can encapsulate resumptions correctly while dropping interleave behavior, or leak resumptions while preserving that behavior. |
| R5-i6 | R5-i6, R5-i6-2, R5-i6-3 | Trust verification and the two independently exposed submitting-principal paths can each admit a forgery without the other doing so. |

Additional owner splits exposed by source reconciliation: R1-b2/e4 now describe retained reference
sequences, with stored content separately assigned to R1-j1/j2 (K1.1); R2-f1 separates finite batch
shape; R5-j10/j11 separate maximum bound and nonempty wait-ended reservation; R2-f2 observes normal
Outcome evaluation after redelivery; R7-h1 observes no progress installation on cancellation replay;
R3-j1 explicitly assigns persistent all-or-none Outcome acceptance to K3.2.

## Counterexample closure and self-found defects

K02-R15-01: `clauses/r5-k1` now ignores only exact Event ID and takes coherent READY/null/event-readiness;
`clauses/r5-k1b` checks only the first kind and takes coherent WAITING/g2/no-readiness. Each still changes
eligibility, each preserves W-3 in both directions, and all unrelated observations remain unchanged.
The isolation tests reconstruct the registration and reject both old C14 constructions before using
any oracle verdict. Candidate discrimination still runs through the normal runner.

Self-found during the required sweep: `clauses/r5-k2` had the analogous partial-readiness shape; it
now consistently takes the no-match WAITING branch. The empty ordinary-batch counterexample now
coherently declines reservation instead of reporting an Activation without a batch. Premature
reservation acknowledgment now moves the Event out of queued as well, preserving disposition
exclusivity while violating B-3 timing. The other nine C14 transcripts retain their intended wrong
writer: destination deduplication, accepted replay classification, two rejected-progress leaks,
ordinary selection order, union inclusion/order, timeout disposal and terminal readiness cleanup.
Partial-write counterexamples remain intentionally partial where that partial write is the asserted
defect; imposing selector isolation on those would erase their purpose.

The two new transcripts cover normal post-redelivery acceptance and cancellation-replay progress.
The former adds one four-step schedule through existing commands and observations. All 14 previous
scenarios and their 133 expected steps are unchanged. No eligibility helper, runner comparison,
epoch relation, port adaptation or protocol grammar behavior changed. The only fixture.ts change
corrects a stale K2.4 assignment comment to the actual K2.3 required-Effect owner.

## 012 semantic closure and limits

Source/producer: accepted decisions unchanged; scripted producers corrected at their actual branch.
Validator: the existing oracle compares every observable field; new isolation checks prevent unrelated
lifecycle failures from carrying selector evidence. Consumers: inventory/coverage and all scenario
attribution/refusal totals agree. Counterexamples and controls: preserved C13 epoch policies,
Activation-ID adaptation, R5-c2/c2b/c2c, and all closed corrections. Tests: separate corpus properties,
refinement-collapse controls and candidate discrimination. Documentation: C9, this audit, public totals,
and the authoritative H15 status/report. Full deterministic clean-C validation is recorded in H15.

C8 is independent: benchmark main `98756f8c10bd806125da8318f1a129bc030aca61`, E0 branch
`0d47ddea1035fd0550281ad76ebecd3749b18a84`, and correction branch
`2c60205ff71a914adb1ab907e40071165fd66424` were inspected. Both branch evidence records retain
`ownerDecision.state: "pending"`. Mechanical PASS is not owner acceptance. C8 stays BLOCKED_EXTERNAL.
No independent acceptance, merge, K0 closure, K1.0 release or successor work is authorized by this audit.
