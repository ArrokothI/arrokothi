# K1.1-reference-01 — independent review

## Reviewer identity and access

- Date: 2026-09-15.
- Reviewer/session: current ChatGPT session, separate from the owner-delegated final-cleanup session that authored this supplement.
- Model: OpenAI GPT-5.6 Sol, High reasoning.
- Repository: `ArrokothI/arrokothi`.
- Submitted branch: `codex/k1.1-correction-01-review-findings`.
- Access: authenticated GitHub repository access to immutable commits, files, comparisons, branch state, surrounding source/tests and committed raw evidence.
- Access limit: the local execution environment could not reach GitHub, so I did not establish a local checkout and did not rerun arbitrary shell commands or test suites. I independently inspected full pinned source, commit comparisons and committed raw evidence through GitHub. Stored command logs described below were inspected, not rerun by me.

## Exact review identity

This verdict binds only the submitted review head below:

- supplement base A: `519ba002378707a4deccff1ea0a243d21eb694b7`;
- payload C: `2dc3cedb02888d891ec0a6389439b7cfb3b07943`;
- review head H: `d4bd49fd49fb6d70a992635cf2b6bf8317c3af89`;
- contract: `docs/development/work/K1.1-reference-01/contract.md`, revision 1;
- accepted implementation C4: `56164092d128c6767f501962174ac81c6363af9e`;
- accepted implementation H5: `52b1600f3b42e3a360fdc3395178f1d147edf304`;
- authentic implementation ACCEPT record: `b1050133b2b684065251b7b4b7f508e95e771bef`.

The branch had advanced beyond H by the time this review record was pushed. I inspected H to the then-current remote tip `8e5832520644a183e4ee428f8abfae88761fb8a8`: the three intervening commits are administrative correction cleanup/status records and do not alter the K1.1-reference-01 semantic payload, executable/tests, or its validation evidence. This review does not accept or certify those later commits; acceptance remains bound to exact H above.

Prerequisite K1.1-correction-01 H5 is independently accepted. Integration remains pending. This supplement does not release K1.2, does not close K1, and does not invalidate H5. `next_release: none`.

## Governing baseline and method

I read the applicable repository instructions, mental-model front door and canonical Layer-3 owners, development front door, governing `006-development-process.md`, `007-work-packets.md`, `008-implementation-report.md`, `012-review-methods.md`, this packet contract, the accepted correction contract/decision/review records, the cumulative candidate, surrounding implementation/tests and immutable evidence.

The governing policy baseline is supplement base A. The proposed reference edits cannot authorize weaker review of themselves.

Before relying on `implementation-01.md`, I independently derived these obligations from canonical/detail owners and the packet contract:

1. **Identity-domain closure:** creation-key retry identity and post-creation Input-ID identity must remain separate, including the same producer/key-text counterexample and boundary-specific receipts.
2. **Value-capture closure:** accepted in-process values must be based on one coherent snapshot with the accepted own-data/prototype/member restrictions; unsupported or unstable forms refuse rather than being repaired. The prose must not silently become a wire-format or physical-containment rule.
3. **Delivery/status closure:** the reference must describe exact accepted H5 behavior without expanding it into Outcome acceptance, persistence, lifecycle, retention or external-delivery guarantees.
4. **Normative ownership/navigation:** explanatory prose must not steal ownership from waits/batching, lifecycle, authority/actions, output, recovery/integration, resources or evidence.
5. **Git/process closure:** only the declared documentation payload may differ from A; Layer 1/2, executable/test/dependency and sealed historical records must remain untouched; C to H must be report/status/raw-evidence only.

I then inspected the full cumulative candidate and surrounding source/tests before reconciling with the implementation report.

## Cumulative and correction-delta inspection

A to C contains exactly the ten declared paths:

- `docs/development/002-implemented-kernel-baseline.md`
- `docs/development/007-work-packets.md`
- `docs/development/work/K1.1-reference-01/contract.md`
- `mental-model/concepts/identity.md`
- `mental-model/concepts/values.md`
- `mental-model/mechanisms/creation.md`
- `mental-model/mechanisms/execution-cycle.md`
- `mental-model/reference.md`
- `mental-model/roadmap.md`
- `mental-model/sources.md`

The committed clean-C evidence records that same ten-path set, exact C, clean worktree, empty executable/Layer-1/2/sealed-record comparisons, `git diff --check` success and `check:builder-docs` success.

C to H contains only the implementation report, `validation-01/` raw evidence and the packet status update. It introduces no semantic reference payload, executable, test, evaluator, threshold or validation script after C.

I also verified the relevant anchor relationships. The accepted documentation anchor D remains semantically intact for H5; supplement A does not introduce independent mental-model drift relative to that accepted anchor. Accepted H5 to A is review/status administration rather than implementation drift, so the implementation source/tests inspected at A are the accepted H5 bytes.

## Per-criterion review

| Criterion | Independent challenge and result | Verdict |
|---|---|---|
| **REF-1** | Challenged the distinguishing case most likely to expose a false identity model: creation under key text `report-17`, followed by a normal post-creation ingress from the same producer to the same Execution using request-key text `report-17`. The accepted implementation starts post-creation `byInputId` tracking separately from creation identity. Existing ingress regressions explicitly require this submission to be fresh ingress with its own Event and `input_ingress` receipt; retry then replays that ingress receipt, while a creation retry still returns the retained creation receipt. Changed ingress content under that ingress identity conflicts normally. The candidate prose and example match this behavior. | **PASS** |
| **REF-2** | Challenged mutable observation, accessors/descriptors, array holes/extra members, prototype changes, symbol/non-enumerable content, unsupported values and hostile ambient behavior. Accepted source implements the one-observation/refusal boundary and tests cover hostile ambient/prototype conditions and stable replay/conflict. The new prose describes the accepted one-snapshot, own-data representation and refusal boundary, and keeps in-process representation separate from wire decoding and physical containment. It does not claim arbitrary-process or sandbox containment. | **PASS** |
| **REF-3** | Inspected `execution-cycle.md` cumulatively, not only its changed sentence. The candidate replaces obsolete acceptance-pending wording with the exact accepted H5 status while keeping integration pending. Delivery-reporting semantics remain unchanged. The prose does not convert reporting into Outcome acceptance, external output delivery, durable recovery, wait semantics or retention. Those remain with their existing canonical/later-packet owners. | **PASS** |
| **REF-4** | Performed the dependency/owner walk independently. `reference.md` continues to point creation, execution-cycle, waits, lifecycle, authority, actions, output, communication, recovery, integration, resources and evidence to their existing owners. New navigation for value capture and delivery reporting does not redefine those subjects. Wait/batch behavior remains K1.3-owned; authority/actions, recovery/integration, output and physical containment remain with their existing later owners. The added-link evidence checks every newly added local link/anchor, and the repository builder-docs check is green. | **PASS** |
| **REF-5** | Verified declared Git scope and historical preservation. A to C is the ten declared documentation paths only. Executable/tests/scripts/examples/dependency and Layer-1/2 comparisons are empty. Historical implementation/review/decision/evidence records are not rewritten. C to H is report/status/raw evidence only. Acceptance is bound to H, not to later branch administration. | **PASS** |

## Surrounding source/tests and interaction review

The implementation tests provide direct distinguishing coverage for REF-1. `packages/kernel/tests/creation.test.ts` establishes creation-boundary identity, replay and creation receipts. `packages/kernel/tests/ingress.test.ts` contains the dedicated `K11-R15-ID-01` same-text creation/ingress cases: fresh ingress under the creation-key text, a second Event and ingress receipt, ingress replay on that receipt, and creation retry still returning the creation-boundary decision.

For values, the supplement documents the already accepted K1.1 correction rather than selecting a new representation. I found no migration rule, wire schema, provider contract, retention change, persistent-profile promise or new runtime behavior hidden in the prose.

The canonical interaction walk confirms that K1.1 reference maintenance does not absorb K1.3 wait/batch behavior, K2 authority/action behavior, K3/R1 recovery/integration behavior, K4 output behavior, K5 retention behavior or D1 physical containment.

## Report and immutable-evidence reconciliation

Only after the independent coverage above did I reconcile against `implementation-01.md`. Its A/C/H lineage, ten-path payload accounting, semantic source mapping, lack of runtime change, dependency matrix and explicit limits agree with my independent inspection.

I inspected the committed clean-C evidence rather than treating its summary as proof. It records exact C, clean status, the ten-path scope, empty executable/Layer-1/2/sealed-record comparison, `git diff --check`, and builder-docs success.

I also inspected the committed H5-evidence verification. It verifies the accepted validation artifacts by SHA-256 and records the underlying full/conformance/kernel/SDK/architecture/focused and ablation results. Those are historical inspected runs, **not reviewer reruns**. I did not use green runtime counts as a substitute for semantic documentation review; they are relevant only after implementation byte identity is established.

## Prior findings and correction-family reconciliation

I reviewed the accepted correction history relevant to these reference claims, including the identity-domain correction, one-observation value reconstruction, delivery-reporting decision and later process/evidence corrections. A historical PASS or ACCEPT was not treated as immunity.

No previously closed substantive defect is reproduced by this reference supplement:

- creation and later ingress are now documented as distinct identity domains, with the same-text distinguishing example;
- value capture is described as coherent observation plus refusal, not repair or repeated live reads;
- delivery status distinguishes exact H5 acceptance from pending integration;
- the reference-supplement scope exception is prospective and separately reviewed rather than retroactively claimed as part of H5.

## Findings

No blocking findings.

- P0: none.
- P1: none.
- P2: none.
- P3: none required for acceptance.

## Coverage limits

I did not rerun repository commands because the local environment could not obtain a GitHub checkout. This does not leave a required-access blocker: full pinned source, cumulative/correction commit comparisons, surrounding implementation/tests and immutable committed evidence were all independently accessible. All references to stored command output in this review are therefore identified as inspected evidence, not reruns.

This verdict makes no E1, K1 closure, K1.2 release, integration, merge, package publication, persistent-runtime, isolation or external-delivery claim.

## Acceptance binding and handoff

All REF-1 through REF-5 pass for exact review head:

`d4bd49fd49fb6d70a992635cf2b6bf8317c3af89`

over payload:

`2dc3cedb02888d891ec0a6389439b7cfb3b07943`

and base:

`519ba002378707a4deccff1ea0a243d21eb694b7`.

The later administrative branch commits are not certified by this verdict. This review does not merge or release a successor. Status/integration cleanup may transcribe this authentic verdict separately without changing the accepted candidate identity.

ACCEPT
