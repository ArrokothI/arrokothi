/**
 * The public value wrapper (K14-5; K1.4 design 01 §9): canonical bytes for a value, or the value's
 * issues. Its contract is cooperative (L-02), and the L-01 check refuses a serializer environment whose
 * free identifiers no longer resolve to the intrinsics captured when the SDK loaded. The capture itself
 * stays in `internal/`, so the public entry never names its evidence seam.
 */
export { WrapperEnvironmentError, checkSerializerEnvironment, toCanonicalBytes } from "./internal/value-capture.ts";
export type { ValueIssue } from "./internal/value-capture.ts";
