# Values at the boundary

[Deployment guide](README.md). Every value that crosses into the Kernel, such as an initial input, a
conversation input, a confirmation decision, an authority context or a native result, crosses as
**canonical bytes**. [Values](../../../mental-model/concepts/values.md) defines the encoding. The SDK
produces those bytes with one wrapper, which applications can also call directly:

```ts
import { toCanonicalBytes } from "@arrokothi/sdk";
import type { ValueIssue } from "@arrokothi/sdk";

const captured = toCanonicalBytes({ title: "Draft", tags: ["a", "b"] });
if (captured.ok) send(captured.value); // a Uint8Array of canonical JSON
else report(captured.issues);          // ValueIssue[]: path, code, message, occurrences
```

`createApplication` calls the same wrapper for every value it hands the Kernel. An input the wrapper
refuses is refused synchronously with `ApplicationInputError` (`value_unrepresentable`, with the
`issues`), before any Kernel or native record exists.

## Limits

| Limit | Value |
|---|---|
| Unicode scalar values in one string or member name | 65,536 |
| Direct entries of one array or object | 4,096 |
| Depth of one root | 32 |
| Canonical UTF-8 bytes of one root | 1,048,576 |

A value is plain JSON data: `null`, booleans, finite numbers, strings, arrays and plain objects. A member
that is present with no value (`undefined`), a non-finite number, a function, a symbol, a cycle, a Proxy,
an accessor and an exotic built-in are refused with a located issue.

Native output is held to the same limits. When a native result, an Emission or a failure detail is over
them, the native work has already run, and the Execution fails with
`arrokothi.bridge.value_unrepresentable` ([017](../../development/017-known-limitations.md) L-33). A native
failure always keeps its code: an over-limit `details` is dropped and recorded as `detailsOmitted: true`,
and a long message is cut to 4,096 characters.

## The cooperative contract

The wrapper reads a caller's value once, through own property descriptors, and the bytes it returns are
the only thing a consumer should hand on. It is an in-process binding with a **cooperative** contract: it
protects a well-meaning caller from accidents, not from hostile code in the same process (L-02). Hostile
code needs Isolated Execution. The known residuals are recorded in 017:

- **L-04:** an own-key listing's length is known only after the listing returns, so one huge object can
  cost one listing before the work meter stops it;
- **L-05:** interceptor-backed host objects can run host-defined internal methods;
- **L-06:** hash-table lookups cost constant time only in expectation;
- **L-07:** own entries the engine walks but does not return (private names, deleted-element storage)
  are not metered;
- **L-08:** re-prototyped built-ins with no cheap detector (WeakRef, Temporal, Intl and others) are
  accepted as their own-data projection;
- **L-09:** an envelope's own accessors and Proxy envelopes may run caller code between roots.

## The environment check (L-01)

The serializer reads eight free identifiers: `isNaN`, `isFinite`, `Object`, `Array`, `JSON`, `Set`,
`Error` and `Symbol`. A script-level `let JSON = ...`, for example through `vm.runInThisContext`, shadows
the global property for every later lookup, and no code can remove it. So `createApplication`, every
`toCanonicalBytes` call and every serializer call check each identifier: its free reference, its own
`globalThis` property and the intrinsic captured when the SDK loaded must be the same object.
- At `createApplication` and `toCanonicalBytes`, a mismatch throws `WrapperEnvironmentError`, whose
  `identifier` names the first identifier that failed.
- During a capture, for example a shadow installed by a side effect of reading the caller's value, the
  check refuses that call with `unstable_representation`. Every later call then throws.

A shadow bound to the genuine intrinsic (`let JSON = globalThis.JSON`) passes. The residual
precondition is genuine intrinsics when the SDK module loads: a host that replaced both the property and
the binding before the SDK loaded cannot be detected (L-01).
