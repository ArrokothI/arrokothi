# Kernel guide

The Kernel manages Executions and mediated work. Target semantics live in [Kernel](../../kernel.md)
and [Execution protocol detail](../../detail-design/execution-protocol.md).

## Available in 0.8.x

- [Capabilities, Effects and authority](capabilities-effects-and-authority.md): catalogs, ceilings,
  concrete authorization, confirmation and observed outcomes.
- [SDK bootstrap and driving](../deployment/quick-start.md): existing application/Harness entrypoints.
- [Current API map](../execution/native/current-authoring-surface.md): implemented ports and limitations.
- [Diagnosis](../execution/native/evaluation-and-diagnosis.md): evidence and conformance commands.

## Planned

Implementation walkthroughs for the asynchronous Activation/Outcome boundary, Events/waits,
accepted history, durable recovery and independent child management will be added with K1–K5.
The current Harness/controller APIs do not establish those target guarantees. See the
[roadmap](../../development/001-current-status-and-roadmap.md); no target API tutorial ships yet.
