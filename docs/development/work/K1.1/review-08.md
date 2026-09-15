# Independent review — K1.1 round 10 (H10)

## Reviewer, session and access

- **Reviewer/session:** OpenAI ChatGPT, **GPT-5.6 Sol**, High reasoning, independent reviewer in this chat. I did not implement K1.1 and made no candidate source/test/config changes.
- **Review date:** 2026-09-15, America/New_York.
- **Repository access:** authenticated GitHub commit/file/history access. I inspected the pinned governing material, candidate ancestry, cumulative source, correction delta, tests, exact third-party serializer source and committed raw validation evidence.
- **Execution access:** the local shell did not have a usable repository checkout and outbound GitHub access from that shell was unavailable, so I did **not** independently rerun the repository npm commands. Validation-10 logs are implementer executions on clean C10 that I inspected, not reviewer reruns.

## Exact candidate binding

This review binds only to:

- **B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **C10:** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`
- **H10:** `2cdb1e22f0391079619e97a0fe49bf09c7855ca6`
- **Prior reviewed H9:** `5dddc2ad3cfd616b38c062380e450873cbc4c132`
- **Contract:** `docs/development/work/K1.1/contract.md`, revision 5
- **Report:** `docs/development/work/K1.1/implementation-10.md`
- **Evidence:** `docs/development/work/K1.1/validation-10/`

H10 is a single administrative child of C10. C10→H10 contains the report, status transcription and raw validation attachments, not another production payload. The round-10 payload commit itself changes nine `packages/kernel` source/test files, but the review treated the full cumulative B→C10 surface as the candidate. The committed tree/environment record reports 145 changed files cumulatively.

The owner-side `fa5cba36a2a0ebcde2659f8a01dc85864b06b2ff` edit to `mental-model/kernel.md` is in C10 ancestry even though it is not coding-agent payload. I inspected it as cumulative candidate material and found it consistent with the Layer-3 owners. The separately mentioned uncommitted `mental-model/concepts/roles.md` and `mental-model/runtime.md` edits are absent from C10/H10 and receive no review here.

K1.0 with corrections 01–02 is integrated in the candidate ancestry, and the later explicit owner release of K1.1 is recorded. I found no prerequisite/release blocker.

## Governing material and independent coverage

At the governing baseline I read the repository instructions, mental-model front door, development front door, 006 process, 007 scope/status, 008 review records and 012 review methods, then the applicable Layer-3 creation, values, identity, core, lifecycle, execution-cycle and evidence owners before reconciling with the report.

Independent coverage was derived around:

1. caller observation → boundary validity → immutable retained value → canonical bytes → replay/conflict identity;
2. caller observation → atomic creation/input mutation → retained receipt/refusal → inspection;
3. dispatch envelope → one bound observation → acceptance-order selection → reservation → immutable Activation → non-blocking Driver send;
4. ordinary redelivery of the exact unresolved exchange;
5. persistent ambient mutation → later projection/listing/redelivery;
6. exact `canonicalize@3.0.0` execution and every ambient operation it performs;
7. unsupported successor surfaces and the K1.0 structural/import/export boundary;
8. the H9→C10 correction of K11-R7-STATE-03 in both property-definition and descriptor-restoration directions.

I inspected all eleven target-kernel source modules at C10, the surrounding packet tests, architecture/inventory enforcement, the exact published `canonicalize@3.0.0` implementation and the H9→C10 correction delta.

## Semantic assessment

### K11-R7-STATE-03 — CLOSED

Round 10 materially closes the H9 defect.

`own-array.ts` now creates property-definition inputs with a null prototype before calling the captured `Object.defineProperty`, so `ToPropertyDescriptor` cannot obtain inherited `get`/`set`/`value`/`writable` fields from caller-mutated `Object.prototype`. `restoreDescriptor` independently reconstructs only the saved descriptor's owned fields onto another null-prototype descriptor instead of passing the ordinary descriptor object through.

The dependent snapshot, serialization-safe clone, serializer-window installation/restoration, Kernel-owned list, accepted-state commit and fresh-projection sites route through the hardened primitive. `boundary.test.ts` additionally enforces that raw `defineProperty` calls do not reappear elsewhere in the target zone.

The correction is backed by distinguishing evidence rather than only a green suite:

- **XA** restores H9's ordinary descriptor-literal installation and is rejected by 11 packet cases.
- **XB** restores direct saved-descriptor restoration and is rejected by 6 packet cases.
- **X1/X7** continue to reject ordinary indexed assignment and captured primordial `Array.prototype.push`.
- **X3/X8** continue to reject loss of the serializer's inherited-index neutralization/restoration behavior.

The new cases cross creation, ingress, dispatch, canonicalization and projection. The Proxy-handler sibling is also correctly separated: if a caller's ordinary Proxy handler breaks its own later trap lookup after its own prototype pollution, the representation's observation throws and the boundary refuses it; accepted-content witnesses use a null-prototype handler so successful observation cannot be confused with a Kernel-side descriptor failure.

I found no successor P1 in this defect family during the independent adversarial pass.

### Cumulative behavior

Creation retains one detached accepted value and atomically publishes the READY Execution plus initial Event. Exact scoped key/content retry returns the recorded decision; changed content conflicts.

Post-creation ingress validates/binds the Input-ID triple, handles exact replay/conflict before terminal/capacity decisions, retains accepted input and evidence, and acknowledges nothing.

Dispatch observes `options.bound` once, selects the acceptance-order prefix, records the Activation/receipt and transitions to RUNNING before Driver delivery. Driver throws/rejections are operational delivery failures and do not unwind accepted intent. Ordinary redelivery reuses the exact unresolved Activation identity, writer epoch, base progress revision and reserved batch without reselection.

Inspection/listing are scoped and reconstruct retained truth without acknowledgment or mutation, including under residual descriptor-field/index pollution.

The exact upstream `canonicalize@3.0.0` source was inspected against the candidate sandbox inventory; I found no omitted ambient dependency read material to the accepted-value path.

## Evidence assessment

The committed clean-C10 evidence reports:

- `npm run typecheck`: clean;
- `npm test`: 2,265 tests / 345 suites / 0 failures / 0 skipped;
- `npm run test:conformance`: 1,949 / 283 / 0 / 0;
- `npm run test:kernel`: 207 / 44 / 0 / 0;
- SDK: 22 / 0;
- architecture: 362 / 37 / 0;
- control + 7 distinguishing ablations: control clean, 7/7 rejected.

These are implementer reruns on clean C10 that I inspected. `npm run test:evals` was not run; that exclusion is appropriate because this correction changes no Agent/model/eval path.

## Mandatory findings

### K11-R10-EVID-01 — P2 — validation record integrity

`validation-10/MANIFEST.md` labels the attachment digest column `SHA-256`, but the recorded token for `09b-distinguishing-ablations.log` is:

`4594c1a0b44091ddd510f9716991054e788b639c4f6cd40aad8`

That token is 51 hexadecimal characters and therefore cannot be a SHA-256 digest. Governing 006 requires raw evidence attachments to carry truthful command/environment/digest provenance. The raw log itself is present and inspectable, so this is not BLOCKED_EXTERNAL and does not erase the semantic information in that log, but exact H10's evidence record is not conforming.

There is a related provenance inconsistency in `validation-10/01-tree-and-environment.log`: its final `zone inventory` output is `11` and `15`, while the manifest/report say that log establishes 11 source files and 17 runtime exports. The source barrel and architecture guard independently establish the actual runtime export surface as 17, so I do not infer a payload defect from `15`; the defect is that the raw attachment does not substantiate the summary it is claimed to substantiate.

**Required outcome:** recompute and record the real SHA-256 for the exact committed `09b` artifact and make the zone-inventory command/output/description agree on what is being measured and its actual result. Do not invent a digest or relabel an unexplained number. Evidence altered after H10 requires a new candidate identity and review under 006.

### K11-R10-DOC-01 — P2 — stale current-state prose in 007

The authoritative K1.1 row in `docs/development/007-work-packets.md` reaches round 10 and names C10/H10, but earlier present-tense prose in that same status owner still says K1.1 has been through three independent-review rounds and is at its fourth candidate C4 under contract revision 4.

The table is explicitly authoritative, so this does not make the current H ambiguous. But 007 owns scope/status, and its live explanatory prose materially contradicts the authoritative current state.

**Required outcome:** reconcile or remove the stale current-state prose so 007 does not simultaneously describe C4/revision 4 and C10/revision 5 as the current K1.1 state. Do not change process policy or weaken review conditions.

## Prior-finding reconciliation

- **K11-R7-STATE-03:** CLOSED at the semantic-class level by null-prototype definition descriptors plus owned-field descriptor reconstruction, with directional XA/XB ablations.
- **K11-R6-STATE-02 / K11-R6-VAL-04 / K11-R6-VAL-05:** remain closed on their specific witnesses; round-10 ablations re-prove the relevant own-data and serializer-window guards.
- Previously closed identity, value, evidence, dispatch and primordial-state findings remain closed on the inspected cumulative paths.
- No architecture decision is unresolved.

## Per-criterion verdict

| Criterion | Verdict | Assessment |
|---|---|---|
| **K1.1-C1** | **PASS** | Atomic creation, scoped replay/conflict, READY/no CREATED and retained initial input remain correct. |
| **K1.1-C2** | **PASS** | Input-ID triple, replay/conflict, capacity/order and retained ingress behavior remain correct. |
| **K1.1-C3** | **PASS** | One capture, retained/canonical agreement, exact JCS substrate, refusal semantics and limits remain correct; descriptor conversion is closed in install and restore directions. |
| **K1.1-C4** | **PASS** | Single bound observation, exact reservation, intent-before-send, pinned fields, one unresolved Activation and asynchronous delivery remain correct. |
| **K1.1-C5** | **PASS** | Ordinary redelivery preserves the exact unresolved exchange and excludes later arrivals. |
| **K1.1-C6** | **PASS** | Per-boundary immutable evidence and scoped reads remain correct. |
| **K1.1-C7** | **PASS** | Later-packet surfaces explicitly refuse without accepted-state mutation. |
| **K1.1-C8** | **PASS** | No Agent/Workflow discriminator; exact dependency/import boundary retained. |
| **K1.1-C9** | **PASS** | Scoped inert projection/listing/redelivery report retained truth, including under residual descriptor pollution. |
| **K1.1-C10** | **PASS** | Eleven-file private target zone, 17-name runtime surface, exact `canonicalize` reach and architecture/inventory semantics remain correct. |
| **006/008 evidence integrity** | **FAIL** | H10 carries an impossible SHA-256 token and a raw inventory output that does not substantiate its stated 17-export summary. |
| **007 status/document coherence** | **FAIL** | Authoritative table is current; earlier live current-state prose remains at C4/revision 4. |

## Coverage gaps and access limits

I did not independently rerun the repository suites. The committed validation-10 logs are implementer evidence that I inspected. Full pinned source, cumulative history, contract, third-party source and raw committed evidence were available through authenticated GitHub access, so 006's external-blocker path does not apply.

## Verdict and compact correction handoff

C10 is semantically acceptable on the reviewed K1.1 criteria, and K11-R7-STATE-03 is closed. Exact H10 is nevertheless not acceptable because the review binds to H, including its mandatory evidence/status record.

Correct the same released K1.1 packet on `codex/k1.1-create-reserve-async-dispatch`. Keep B `777b9955fb3a443f700b4f3d1f4f2aef1869345b` fixed. Preserve C10's implementation and all closed semantic findings unless correction work independently discovers a real payload defect. Close **K11-R10-EVID-01** and **K11-R10-DOC-01**, produce a new exact candidate H under 006/008, and request independent review. Do not begin or release K1.2.

## Owner note — outside the reviewer report

Round 10 shows substantial progress rather than persistence in the prior conceptual local minimum. The agent changed the complete descriptor representation/operation, covered both conversion directions and supplied distinguishing ablations; I found no successor P1 in the ambient-operation family. The two remaining findings are evidence/status-record quality defects. I would not switch implementation agents solely because of this round.

CHANGES REQUIRED
