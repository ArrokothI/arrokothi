# Implementation guides

Choose the side you are implementing or using. [Architecture](../README.md) defines the target;
these guides explain available APIs and operating procedures.

| Guide | Scope | Current status |
|---|---|---|
| [Kernel](kernel/README.md) | Execution control, governed actions, authority and recovery | Existing 0.8.x action guide; new protocol walkthroughs pending K1–K5 |
| [Execution](execution/README.md) | ArrokothI-native Agents, Workflows and composition; external Runtime integration | Current native SDK guides and provider wiring; full Driver tutorials pending R1/R2 |
| [Deployment](deployment/README.md) | Bootstrap, hosting, resources, persistence and isolation | Offline SDK bootstrap and current hosting limits; durable/isolated procedures pending K3/K5/D1 |

For a runnable application, start with [SDK quick start](deployment/quick-start.md) and the
[native authoring map](execution/native/README.md). Use `@arrokothi/sdk` for ordinary application code.

Pages describing current behavior explicitly refer to 0.8.x. An empty planned topic is intentional:
write its procedure with the implementation and executable example, rather than inventing target APIs.
Keep guides here, semantic contracts in [detail design](../detail-design/README.md), and implementation
sequence in [development](../development/README.md).
