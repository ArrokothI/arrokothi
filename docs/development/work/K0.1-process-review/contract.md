# Post-K0.1 process-review scope

Owner release: the explicit 2026-09-11 request to investigate all K0.1 history, revise process/prompts
where justified, close merged K0.1 and deliver a scoped branch/commit/push without merging.
This is process maintenance, not a new K0 implementation packet or K0.2 release.

Governing integrated policy/base: `42731300266eea00a9a24d867d5e82d9887c280d`.
The proposed changes cannot weaken the conditions of their own review. Candidate C/H will use the
old convention: payload including this script/contract, clean validation, then report only as H.
Independent acceptance of the process redesign is not claimed by its author.

| ID | Owner-requested result | Observable verification |
|---|---|---|
| PRC-1 | Inspect all K0.1 attempts, reviews, evidence and connecting Git history before design | Retrospective groups mechanisms with source links and complete C/H/A index; separates facts from causal inference |
| PRC-2 | Decide the universal-prompt abstraction from evidence; make justified changes | 006/007/008/009/012 have distinct responsibilities; cover whole-packet self-review, independent adversarial coverage and corrections with selected methods |
| PRC-3 | Preserve independence, identity, architecture precedence, honest evidence and owner release | Manual transition/edge-case audit plus scope checks; no self-ACCEPT or automatic successor release |
| PRC-4 | Close actual merged K0.1 separately from H12 acceptance | Integration receipt with verified main, parents, ancestry, H/A delta and tree identity; current ledger no longer pending integration |
| PRC-5 | Preserve historical/canonical/runtime material; no K0.2 | Exact Git equality of all pre-existing K0.1 artifacts and protected paths; no K0.2 directory/release |
| PRC-6 | Validate and deliver without merging | Link/anchor/scope/identity checks and diff check on clean C; report C/H; verified remote branch push, main unchanged |

Selected 012 method: process/documentation. Normative examination concerns development policy only;
no Kernel semantics change. Runtime, race/fault, native, benchmark and packaging runs cannot prove
this prose change and are excluded. Link and Git checks support navigation/identity, not proof that
future agents will discover every defect. Use a manual scenario audit for policy coherence.

Planned validation from repository root: `python3 docs/development/work/K0.1-process-review/validate.py`
and `git diff --check <base> HEAD`; inspect the cumulative diff and policy scenarios manually.
Run on clean payload C; pin raw output in implementation-01 as allowed by integrated 006.
No external live/evaluation run or new third-party reuse. Acceptance, integration and later release
of this process change remain separate owner/independent-review actions.
