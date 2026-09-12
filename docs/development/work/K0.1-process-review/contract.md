# Post-K0.1 process-review scope

Owner release: the explicit 2026-09-11 request to investigate all K0.1 history, revise process/prompts
where justified, close merged K0.1 and deliver a scoped branch/commit/push without merging.
This is process maintenance, not a new K0 implementation packet or K0.2 release.

Governing integrated policy/base: `42731300266eea00a9a24d867d5e82d9887c280d`.
Owner scope extension: hosted rename to `ArrokothI/arrokothi`, read-only benchmark interlock
assessment and a justified structural-sequencing proposal. No structural migration implementation
or K0.2 release is authorized.
The proposed changes cannot weaken the conditions of their own review. Candidate C/H will use the
old convention: payload including this script/contract, clean validation, then report only as H.
Each attempt's clean-payload validation evidence belongs in that attempt's own numbered
implementation report. A numbered report already submitted for independent review is sealed: a later
correction adds the next numbered report and never overwrites, re-targets or appends evidence to an
earlier reviewed one. **Current attempt report: `implementation-04.md`.**
Independent acceptance of the process redesign is not claimed by its author.

Attempt history below is an as-of record, not a current instruction. Attempt 1 was recorded as
interim after the owner update, and the preserved implementation-01 holds only that first payload's
as-of results. Attempt 2 clean-validated the expanded payload C2
`6f5e43d62e308026af5d0f4c89ecb498ca33d5db` anew and reported it in implementation-02 as candidate H2
`bf2a3057272aa8749a8ce9d36ec8239f4e2411a9`. Attempt 3 corrected H2 under independent finding
PRC-7-01, adding payload C3 `0d884fcfa1a014f7195903ecef8b2e2bf0e47db5` and report-only H3
`f7fddcc661e2e2f579d2da5259a274fae9124693` as implementation-03. Attempt 4 corrects H3 under
independent finding PRC-6-01, which closed PRC-7-01, PRC-7-02 and PRC-7a. H2, H3 and
implementation-01 through implementation-03 are immutable reviewed history.

| ID | Owner-requested result | Observable verification |
|---|---|---|
| PRC-1 | Inspect all K0.1 attempts, reviews, evidence and connecting Git history before design | Retrospective groups mechanisms with source links and complete C/H/A index; separates facts from causal inference |
| PRC-2 | Decide the universal-prompt abstraction from evidence; make justified changes | 006/007/008/009/012 have distinct responsibilities; cover whole-packet self-review, independent adversarial coverage and corrections with selected methods |
| PRC-3 | Preserve independence, identity, architecture precedence, honest evidence and owner release | Manual transition/edge-case audit plus scope checks; no self-ACCEPT or automatic successor release |
| PRC-4 | Close actual merged K0.1 separately from H12 acceptance | Integration receipt with verified main, parents, ancestry, H/A delta and tree identity; current ledger no longer pending integration |
| PRC-5 | Preserve historical/canonical/runtime material; no K0.2 | Exact Git equality of all pre-existing K0.1 artifacts and protected paths; no K0.2 directory/release |
| PRC-6 | Validate and deliver without merging | Link/anchor/scope/identity checks and diff check on clean C; report C/H; verified remote branch push, main unchanged |
| PRC-6a | Keep the live contract's own instructions current, with sealed reports immutable | Declared current attempt report is never a sealed report; validation instructions name only it; implementation-01 through the latest reviewed report stay byte-identical to their reviewed commits; attempt records read as history, not as active requirements |
| PRC-7 | Evaluate both roadmaps, rename and structure without implementing migration | Pinned read-only benchmark evidence; 013 alternatives and bounded K1.0 planning; 007 dependency/aggregate gate consistency; SDK change only repository URL |
| PRC-7a | Keep local sequencing compatible with the pinned benchmark roadmap's E1 build timing | 001/007/013/READMEs state one rule: benchmark-owned E1 fixture preparation precedes K1 implementation including K1.0; no document weakens fixtures to specifications or K1 implementation to K1 behavior; K1.0 earns no E1 credit and K1.4 retains the full K1/E1 gate |

Selected 012 method: process/documentation. Normative examination concerns development policy only;
no Kernel semantics change. Runtime, race/fault, native, benchmark and packaging runs cannot prove
this prose change and are excluded. Link and Git checks support navigation/identity, not proof that
future agents will discover every defect. Use a manual scenario audit for policy coherence.

Planned validation from repository root: `python3 docs/development/work/K0.1-process-review/validate.py`
and `git diff --check <base> HEAD`; inspect the cumulative diff and policy scenarios manually.
Run on the current attempt's clean payload C; pin its raw output in the current numbered
implementation report declared above, as allowed by integrated 006.
No external live/evaluation run or new third-party reuse. Current README navigation and SDK repository
metadata may reflect the rename; package names, exports and behavior are unchanged. Acceptance, integration and later release
of this process change remain separate owner/independent-review actions.
