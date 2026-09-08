# External validation gates

> **Historical snapshot, retired 2026-09-07.** Its status and next-step language describe the earlier checkpoint. Use the [active development plan](../../001-current-status-and-roadmap.md) and [findings register](../../003-evidence-and-findings.md) for current decisions.

> **Status:** active external-validation checkpoint for the ArrokothI agent-kernel 0.8.x line.
> **Role:** engineering coordination only; canonical runtime semantics remain owned by the documents indexed from [`../README.md`](../../../README.md).
> **Benchmark ownership:** cross-framework task, case, evaluator, provider, subject-build, and campaign execution remain in the standalone `ArrokothI/benchmark` repository.

This document records the framework-side gates needed to turn a reviewed ArrokothI release into trustworthy external evidence without moving benchmark-specific design into the framework repository.

## Current checkpoint

ArrokothI `v0.8.1` is the reviewed current release baseline. The release tag resolves to exact commit
`3dc0ad293b4284f416c10fe2bfd57315b4be6f56` (`fix: enforce idempotency on confirmed capability dispatch`).

The standalone benchmark laboratory has accepted an immutable, contamination-reviewed frozen input derived from this exact release. The freeze preserves the ordinary current builder/developer surface, verifies the release version and exact commit, sanitizes only narrowly identified prior benchmark-derived tokens, materializes the declared Claude skill-discovery aliases into regular files, and leaves the historical accepted framework freeze unchanged.

The exact frozen-input hashes and provenance artifacts are intentionally owned by `ArrokothI/benchmark`, not duplicated here.

No real benchmark subject, benchmark task application, runtime campaign, semantic judge, or scored cross-framework generation follows merely from accepting that freeze.

## External-validation dependency order

```text
A  Reviewed versioned framework release                         DONE for v0.8.1
       ↓
B  Immutable external framework freeze                         DONE for v0.8.1
       ↓
C  Neutral real coding-agent canary                            NEXT
       ↓
D  Strong comparator review + immutable comparator input       external benchmark/comparator work
       ↓
E  Freeze common subject-construction policy                   benchmark-owned
       ↓
F  Finalize public build-validation + runtime contracts        benchmark-owned
       ↓
G  Build, validate, audit, and freeze real subjects            benchmark-owned
       ↓
H  Freeze canonical campaign/suite + sealed infrastructure pilot
       ↓
I  Full generation campaign
       ↓
J  Deterministic + semantic evaluation, integrity checks, aggregation
```

The architecture roadmap in [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) is independent of this sequence. External benchmark evidence can inform later framework engineering, but benchmark progress does not silently redefine kernel architecture or release completeness.

## Next gate — neutral real coding-agent canary

The first real coding-agent use of the accepted `v0.8.1` frozen input must be an ordinary application task that is deliberately unrelated to benchmark task identities, hidden cases, evaluator mappings, or competitor-specific behavior.

The canary should exercise enough of the implemented authoring surface to expose real builder friction:

- discover the current root/public API and builder guidance from the frozen framework tree;
- construct an ordinary Agent and/or Workflow application;
- use structured state or memory;
- perform at least one consequential capability through authority and explicit confirmation;
- wire a provider through the supported integration surface;
- expose a deterministic runtime entrypoint;
- include ordinary public tests or checks that the isolated builder can run and repair against.

The builder side must use the benchmark laboratory's real isolated container backend and gateway-only model path. The coding agent may see only the ordinary task brief, the accepted frozen framework, and its writable application directory. It must not receive benchmark-root access, hidden evaluation material, provider credentials, judge credentials, or prior benchmark outcomes.

### Canary success gate

A canary is accepted only if all of the following are true:

1. the real coding agent completes within the predeclared builder budget;
2. the frozen framework and public task inputs remain byte-identical;
3. all declared ordinary build-validation steps pass without hidden-case feedback;
4. no gateway/provider credential is persisted into generated source;
5. the resulting application is frozen immutably with complete builder provenance;
6. the runtime starts from an out-of-tree frozen-subject materialization;
7. physical isolation checks remain true: no benchmark-root, host-control-socket, unrestricted-host, unrelated-container, or ordinary internet access;
8. cleanup leaves no ambiguous gateway/container/network residue;
9. any observed failure is classified before changing the framework.

A coding-agent mistake is not automatically a framework defect. A documentation/API mismatch, framework correctness defect, or systematic builder-surface problem is framework evidence and should be repaired deliberately.

## Change policy after a frozen release

`v0.8.1` and its accepted external freeze are immutable evidence inputs. If the neutral canary exposes a real framework or builder-guidance defect:

```text
accepted v0.8.1 freeze
        stays unchanged
             ↓
repair agent-kernel on main
             ↓
new versioned release
             ↓
new immutable external framework freeze
             ↓
repeat neutral canary
```

Do not patch the accepted frozen snapshot in place, reuse its identity for changed bytes, or tune the framework against hidden benchmark results.

Ordinary application-level responsibility also remains explicit: runtime duplicate suppression does not replace durable external idempotency, uncertain-outcome reconciliation, or deployment-specific durability.

## After the neutral canary

Once the canary passes, further cross-framework work belongs to the benchmark/comparator repositories rather than this framework tree. The benchmark laboratory should then establish strong comparator inputs, freeze the common subject-construction policy before scored results exist, finalize public build-validation/runtime contracts, build and freeze the real subjects, create the canonical campaign, run a sealed infrastructure pilot, and only then execute the full generation and evaluation campaign.

If those later runs expose a framework concern, bring back the smallest reproducible framework-side evidence. Do not copy hidden cases, evaluator mappings, competitor implementation details, or scored campaign outputs into this repository as implementation guidance.

## Relationship to architecture completion

Passing the external canary or even performing well in a benchmark does **not** mean the architecture-completeness roadmap is done. Portable service contracts, broader interoperability, progressive heterogeneous discovery, hosted containment, durable restart/recovery, and the whole-architecture integration campaign remain separate engineering gates in [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md).
