# TOOLS-01 contract — revision 2

[Release](release-01.md) authorizes the research-independent foundation first. Governing policy:
006/008/012 at `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`; proposed tools cannot weaken their
own review. This contract changes evidence tooling, not Kernel meaning.

[Owner choice 01](owner-choice-01.md) resolves design 02 D02-Q1: deterministic corpus runs by
default; live-provider and large-memory/timing experiments retain their mappings and commands in
separate profiles and are explicitly reported as not run. No inventory origin is removed.

| ID | Requirement | Closing evidence |
|---|---|---|
| F1 | Validate exact Git commit identities, B→C→H ancestry and C..H's exact declared file set; preserve declared historical paths; verify accessible attachment bytes/digests. Read the verification specification from C. | Temporary Git fixtures for valid and wrong identity, ancestry, scope, sealed bytes and evidence; real candidate run at handover. Report structural facts only, never ACCEPT or release. |
| F2 | Index every pinned audit artifact/fence and prose locator; verify source bytes and retain stable provenance IDs, proposed dispositions and extraction status. Include final-review executable intake and its policy-only item. | Recompute 208 source digests and 1,333 prose locations; missing/duplicate/corrupt mappings fail. Pending records remain counted as pending. This is provenance coverage, not executable adoption. |
| F3 | Provide a versioned case/mutation registry and isolated runner with a passing control, unique mutation-site check, reached witness and named assertion. | Real injective-identity mutant plus controls for survived, uncovered, invalid baseline, not applicable, setup error, timeout and malformed result. No process exit alone earns a kill. |
| F4 | Keep runner changes in temporary source copies; preserve candidate files and isolate each process. Bound execution duration and retained output. | Candidate hash checks and deliberate hanging/noisy/failed fixtures; interrupted or failed mutation cannot patch the shared checkout. Supported host: POSIX with Python 3 and Node 22.9+. |
| F5 | Keep release/status/results distinct; one CLI reports facts, explicit limits and unresolved work. | JSON summaries; pending-extraction inventory cannot produce full-corpus completion. Tests assert the distinction. |
| F6 | Document use, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
| P1 | Reconcile the whole historical inventory into maintained runnable cases, existing-suite mappings, justified duplicates/retired runners, or explicit non-executable evidence; preserve the complete-decision oracle and its controls. | Per-entry semantic mapping, runnable fixtures and causal mutations; every still-pending entry closes. Held semantic defects stay attributed to their correction owners. Mandatory remainder after this build. |
| P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |

Foundation F1–F6 is an incremental delivery within TOOLS-01, not a new acceptance gate or a split
that silently defers P1/P2. The full packet stays IN_PROGRESS. No semantic benchmark credit or
hold release follows from tool verification. Human review still judges authorization, prose
semantics, claim coverage and acceptance; a hash or allowlist cannot establish those judgments.
