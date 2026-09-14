# Deployment guide

Deployment owns application assembly, process/resource lifetime and physical enforcement.
[Deployment architecture](../../../mental-model/deployment.md) defines the target profiles.

## Available in 0.8.x

- [SDK quick start](quick-start.md): install, imports, composition root, preflight and bounded driving.
- [Current hosting limits](current-hosting.md): in-memory state, authenticated application boundaries,
  and responsibility for external business records.
- [Provider wiring](../execution/providers/current-wiring.md): inject models, credentials and adapters.

## Planned

Durable worker/host setup, recovery/upgrade procedures and resource cleanup will be documented with
K3/K5. Isolated hosting procedures will be documented with D1 if that profile is implemented.
These placeholders are not production runbooks or promises that durable storage/isolation ships today.
See [resource design](../../../mental-model/mechanisms/resources.md) and the
[active roadmap](../../development/001-current-status-and-roadmap.md).
